'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');

const { Interpreter } = require('./interpreter');
const { parse } = require('./parser');
const { formatSource } = require('./formatter');
const {
  DEFAULT_ENTRY,
  LOCKFILE,
  MANIFEST,
  ensureProject,
  initProject,
  parseToml,
  readLock,
  readManifest,
  resolveEntry,
  writeLock,
  writeManifest,
} = require('./manifest');
const { createZip } = require('./zip');

const VERSION = require('../package.json').version;

const EXCLUDED_DIRECTORIES = new Set(['.git', '.memingo', 'dist', 'node_modules', '__pycache__']);
const COMMANDS = [
  'run', 'eval', 'repl', 'check', 'dev', 'test', 'build', 'serve',
  'install', 'add', 'remove', 'info', 'deps', 'clean', 'manifest',
  'doctor', 'status', 'fmt', 'init', 'completion', 'update-self', 'mgoa',
  'version', 'help',
];

function out(message = '') {
  process.stdout.write(`${message}\n`);
}

function err(message = '') {
  process.stderr.write(`${message}\n`);
}

function errorLine(error) {
  const message = error && error.message ? error.message : String(error);
  return `Memingo error: ${message}`;
}

function decodeUtf8(buffer, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new Error(`${label} is not valid UTF-8`);
  }
}

function readSource(filePath) {
  return decodeUtf8(fs.readFileSync(filePath), filePath);
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function walkMgoFiles(root) {
  const results = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        visit(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.mgo')) {
        results.push(path.join(directory, entry.name));
      }
    }
  };
  visit(root);
  return results.sort();
}

function collectMgoFiles(target) {
  const resolved = path.resolve(target);
  if (isFile(resolved)) return resolved.endsWith('.mgo') ? [resolved] : [];
  if (isDirectory(resolved)) return walkMgoFiles(resolved);
  throw new Error(`Path does not exist: ${target}`);
}

function walkProjectFiles(root) {
  const results = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        visit(path.join(directory, entry.name));
      } else if (entry.isFile()) {
        if (entry.name === '.env') continue;
        results.push(path.join(directory, entry.name));
      }
    }
  };
  visit(root);
  return results.sort();
}

function runSource(source, projectDirectory = process.cwd()) {
  const interpreter = new Interpreter({ projectDirectory });
  try {
    interpreter.run(parse(source));
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  for (const line of interpreter.output) {
    out(line);
  }
  return 0;
}

function runFile(filePath, projectDirectory = null) {
  const resolved = path.resolve(filePath);
  let source;
  try {
    source = readSource(resolved);
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  return runSource(source, projectDirectory || path.dirname(resolved));
}

function runProject(directory = '.') {
  try {
    ensureProject(directory);
    const { entryPath } = resolveEntry(directory);
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry point not found: ${entryPath}`);
    }
    return runFile(entryPath, path.resolve(directory));
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

async function runNodeScript(filePath, args) {
  if (process.pkg) {
    err('This standalone Node.mgo build runs Memingo (.mgo) only.');
    err('Install Node.js or use the npm package to run JavaScript files.');
    return 1;
  }
  const resolved = path.resolve(filePath);
  process.argv = [process.execPath, resolved, ...args];
  if (resolved.endsWith('.mjs')) {
    await import(pathToFileURL(resolved).href);
  } else {
    require(resolved);
  }
  return 0;
}

async function commandRepl() {
  const interpreter = new Interpreter({ projectDirectory: process.cwd() });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'mgo> ',
    terminal: process.stdin.isTTY,
  });
  let buffer = '';
  let depth = 0;
  rl.prompt();
  for await (const line of rl) {
    buffer += `${line}\n`;
    depth += bracketDelta(line);
    if (depth > 0) {
      rl.setPrompt('...> ');
      rl.prompt();
      continue;
    }
    depth = 0;
    const chunk = buffer.trim();
    buffer = '';
    if (chunk) {
      const previousLength = interpreter.output.length;
      try {
        interpreter.run(parse(chunk));
        for (const item of interpreter.output.slice(previousLength)) {
          out(item);
        }
      } catch (error) {
        err(errorLine(error));
      }
    }
    rl.setPrompt('mgo> ');
    rl.prompt();
  }
  return 0;
}

function bracketDelta(line) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of line) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '#' ) break;
    else if (character === '{' || character === '[' || character === '(') depth += 1;
    else if (character === '}' || character === ']' || character === ')') depth -= 1;
  }
  return depth;
}

function commandCheck(target) {
  let files;
  try {
    files = collectMgoFiles(target);
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  if (!files.length) {
    out('No .mgo files found.');
    return 0;
  }
  let failures = 0;
  for (const file of files) {
    try {
      parse(readSource(file));
      out(`ok  ${path.relative(process.cwd(), file) || file}`);
    } catch (error) {
      failures += 1;
      err(`fail ${path.relative(process.cwd(), file) || file}: ${error.message}`);
    }
  }
  out(`${files.length - failures}/${files.length} file(s) passed.`);
  return failures ? 1 : 0;
}

function commandFmt(target, options) {
  let files;
  try {
    files = collectMgoFiles(target);
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  let changed = 0;
  for (const file of files) {
    try {
      const source = readSource(file);
      const formatted = formatSource(source);
      if (formatted !== source) {
        changed += 1;
        if (options.check) {
          out(`needs formatting: ${path.relative(process.cwd(), file) || file}`);
        } else {
          fs.writeFileSync(file, formatted, 'utf8');
          out(`formatted ${path.relative(process.cwd(), file) || file}`);
        }
      }
    } catch (error) {
      err(`fmt failed for ${file}: ${error.message}`);
      return 1;
    }
  }
  if (options.check) {
    out(changed ? `${changed} file(s) need formatting.` : 'All files are formatted.');
    return changed ? 1 : 0;
  }
  out(`${changed} file(s) formatted.`);
  return 0;
}

function commandInit(directory, name) {
  try {
    const target = path.resolve(directory || '.');
    initProject(target, name || path.basename(target) || 'my-memingo-app', VERSION);
    out(`Initialized Memingo project in ${target}`);
    out(`  ${MANIFEST}`);
    out(`  ${DEFAULT_ENTRY}`);
    out('  .env');
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function discoverTests(target) {
  if (target) return collectMgoFiles(target);
  const root = process.cwd();
  const files = new Set();
  const testsDir = path.join(root, 'tests');
  if (isDirectory(testsDir)) {
    for (const file of walkMgoFiles(testsDir)) files.add(file);
  }
  for (const file of walkMgoFiles(root)) {
    const name = path.basename(file);
    if (name.endsWith('.test.mgo') || name.endsWith('_test.mgo')) files.add(file);
  }
  return [...files].sort();
}

function commandTest(target) {
  let files;
  try {
    files = discoverTests(target);
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  if (!files.length) {
    out('No Memingo tests found.');
    return 0;
  }
  let failures = 0;
  for (const file of files) {
    const name = path.relative(process.cwd(), file) || file;
    try {
      const interpreter = new Interpreter({ projectDirectory: process.cwd() });
      interpreter.run(parse(readSource(file)));
      out(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      err(`FAIL ${name}: ${error.message}`);
    }
  }
  out(`${files.length - failures}/${files.length} test file(s) passed.`);
  return failures ? 1 : 0;
}

function commandBuild(directory) {
  const root = path.resolve(directory || '.');
  try {
    ensureProject(root);
    const { manifest, entry } = resolveEntry(root);
    const packageSection = manifest.package || {};
    const name = String(packageSection.name || path.basename(root) || 'memingo-app');
    const version = String(packageSection.version || VERSION);
    const files = walkProjectFiles(root);
    const entries = files.map((file) => ({
      name: path.relative(root, file).split(path.sep).join('/'),
      data: fs.readFileSync(file),
    }));
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    const output = path.join(dist, `${name}-${version}.zip`);
    fs.writeFileSync(output, createZip(entries));
    out(`Built ${output}`);
    out(`Entry: ${entry}`);
    out(`Files: ${entries.length}`);
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mgo': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

function commandServe(target, port) {
  const root = path.resolve(target || 'public');
  const directory = isDirectory(root) ? root : process.cwd();
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }
    const candidate = path.resolve(directory, `.${pathname}`);
    if (candidate !== directory && !candidate.startsWith(`${directory}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    let filePath = candidate;
    if (isDirectory(filePath)) filePath = path.join(filePath, 'index.html');
    if (!isFile(filePath)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(response);
  });
  server.listen(port, () => {
    out(`Serving ${directory} at http://localhost:${port}`);
  });
  return 0;
}

function commandInstall(directory) {
  const root = path.resolve(directory || '.');
  try {
    ensureProject(root);
    const manifest = readManifest(root);
    const dependencies = manifest.dependencies;
    if (dependencies !== undefined && (typeof dependencies !== 'object' || Array.isArray(dependencies))) {
      throw new Error('[dependencies] must be a table in memingo.toml');
    }
    const packagesDir = path.join(root, '.memingo', 'packages');
    fs.mkdirSync(packagesDir, { recursive: true });
    const lock = readLock(root);
    if (!lock.dependencies || typeof lock.dependencies !== 'object') lock.dependencies = {};
    for (const [name, version] of Object.entries(dependencies || {})) {
      const packageDir = path.join(packagesDir, name);
      fs.mkdirSync(packageDir, { recursive: true });
      const recordPath = path.join(packageDir, 'PACKAGE.json');
      if (!fs.existsSync(recordPath)) {
        fs.writeFileSync(
          recordPath,
          `${JSON.stringify({ name, version }, null, 2)}\n`,
          'utf8',
        );
      }
      const existing = lock.dependencies[name];
      if (existing && typeof existing === 'object') {
        existing.version ??= version;
      } else {
        lock.dependencies[name] = { version };
      }
    }
    writeLock(root, lock);
    out(`Installed ${Object.keys(dependencies || {}).length} dependency record(s).`);
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandAdd(spec, directory) {
  const root = path.resolve(directory || '.');
  try {
    ensureProject(root);
    const value = String(spec || '').trim();
    if (!value) throw new Error('Usage: node_mgo add <name>[=<version>]');
    const manifest = readManifest(root);
    if (!manifest.dependencies || typeof manifest.dependencies !== 'object') {
      manifest.dependencies = {};
    }
    const index = value.indexOf('=');
    const name = index === -1 ? value : value.slice(0, index).trim();
    const version = index === -1 ? '*' : value.slice(index + 1).trim();
    if (!name) throw new Error('Dependency name cannot be empty');
    manifest.dependencies[name] = version;
    writeManifest(root, manifest);
    commandInstall(root);
    out(`Added ${name}`);
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandRemove(name, directory) {
  const root = path.resolve(directory || '.');
  try {
    ensureProject(root);
    const manifest = readManifest(root);
    const dependencies = manifest.dependencies;
    if (!dependencies || typeof dependencies !== 'object') {
      throw new Error('[dependencies] must be a table in memingo.toml');
    }
    if (!(name in dependencies)) {
      throw new Error(`Dependency '${name}' is not installed`);
    }
    delete dependencies[name];
    writeManifest(root, manifest);
    const lock = readLock(root);
    if (lock.dependencies && typeof lock.dependencies === 'object') {
      delete lock.dependencies[name];
      writeLock(root, lock);
    }
    const packageDir = path.join(root, '.memingo', 'packages', name);
    fs.rmSync(packageDir, { recursive: true, force: true });
    out(`Removed ${name}`);
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandInfo(directory) {
  const root = path.resolve(directory || '.');
  try {
    const manifest = readManifest(root);
    const packageSection = manifest.package || {};
    out(`Project: ${packageSection.name ?? path.basename(root)}`);
    out(`Version: ${packageSection.version ?? '0.0.0'}`);
    out(`Entry:   ${packageSection.entry ?? DEFAULT_ENTRY}`);
    const dependencies = manifest.dependencies || {};
    out(`Deps:    ${Object.keys(dependencies).length}`);
    for (const [name, version] of Object.entries(dependencies)) {
      out(`  ${name} ${version}`);
    }
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandDeps(directory) {
  const root = path.resolve(directory || '.');
  try {
    const manifest = readManifest(root);
    const dependencies = manifest.dependencies || {};
    if (!Object.keys(dependencies).length) {
      out('No dependencies.');
      return 0;
    }
    for (const [name, version] of Object.entries(dependencies)) {
      out(`${name} ${version}`);
    }
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandClean(directory) {
  const root = path.resolve(directory || '.');
  for (const name of ['dist', '.memingo']) {
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
  }
  out('Cleaned dist/ and .memingo/.');
  return 0;
}

function commandManifest(directory) {
  const root = path.resolve(directory || '.');
  try {
    const manifestPath = path.join(root, MANIFEST);
    if (fs.existsSync(manifestPath)) {
      out(`${manifestPath} already exists.`);
      return 0;
    }
    const name = path.basename(root) || 'my-memingo-app';
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(
      manifestPath,
      `[package]\nname = ${JSON.stringify(name)}\nversion = ${JSON.stringify(VERSION)}\nentry = "main.mgo"\n\n[dependencies]\n`,
      'utf8',
    );
    out(`Created ${manifestPath}`);
    return 0;
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
}

function commandDoctor(directory) {
  const root = path.resolve(directory || '.');
  const problems = [];
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major < 18) problems.push(`Node.js 18+ is required (found ${process.version})`);
  if (!fs.existsSync(path.join(root, MANIFEST))) problems.push(`${MANIFEST} is missing`);
  try {
    const { entryPath } = resolveEntry(root);
    if (!fs.existsSync(entryPath)) problems.push(`entry point is missing: ${entryPath}`);
  } catch (error) {
    problems.push(error.message);
  }
  if (fs.existsSync(path.join(root, LOCKFILE))) {
    try {
      readLock(root);
    } catch (error) {
      problems.push(error.message);
    }
  }
  if (problems.length) {
    for (const problem of problems) err(`! ${problem}`);
    return 1;
  }
  out('Everything looks good.');
  out(`Node.js ${process.version}`);
  out(`Project ${root}`);
  return 0;
}

function commandStatus(directory) {
  const root = path.resolve(directory || '.');
  const hasManifest = fs.existsSync(path.join(root, MANIFEST));
  out('NODE.MGO / STATUS');
  out(`  version   ${VERSION}`);
  out(`  node      ${process.version}`);
  out(`  project   ${root}`);
  out(`  manifest  ${hasManifest ? 'yes' : 'no'}`);
  if (hasManifest) {
    try {
      const manifest = readManifest(root);
      out(`  package   ${manifest.package?.name ?? 'unknown'}`);
      out(`  entry     ${manifest.package?.entry ?? DEFAULT_ENTRY}`);
      out(`  deps      ${Object.keys(manifest.dependencies || {}).length}`);
    } catch (error) {
      out(`  error     ${error.message}`);
    }
  }
  return 0;
}

function commandCompletion(shell) {
  const commands = COMMANDS.join(' ');
  if (shell === 'bash') {
    out('_node_mgo_completions() {');
    out('  local cur="${COMP_WORDS[COMP_CWORD]}"');
    out(`  COMPREPLY=( $(compgen -W "${commands}" -- "$cur") )`);
    out('}');
    out('complete -F _node_mgo_completions node_mgo memingo mgoa');
  } else if (shell === 'zsh') {
    out('#compdef node_mgo memingo mgoa');
    out(`_arguments '1:command:(${commands})' '*::arg:->args'`);
  } else if (shell === 'fish') {
    for (const command of COMMANDS) {
      out(`complete -c node_mgo -n "__fish_use_subcommand" -a "${command}"`);
      out(`complete -c memingo -n "__fish_use_subcommand" -a "${command}"`);
    }
  } else {
    err('Usage: node_mgo completion <bash|zsh|fish>');
    return 1;
  }
  return 0;
}

function commandDev(target) {
  const root = path.resolve(target || '.');
  const watchTarget = isDirectory(root) ? root : path.dirname(root);
  let timer = null;
  const run = () => {
    if (isDirectory(root)) runProject(root);
    else runFile(root);
  };
  out(`Watching ${watchTarget} for changes...`);
  run();
  try {
    fs.watch(watchTarget, { recursive: false }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        out('');
        out(`[${new Date().toLocaleTimeString()}] change detected`);
        run();
      }, 120);
    });
  } catch (error) {
    err(errorLine(error));
    return 1;
  }
  return 0;
}

function printHelp() {
  out(`Node.mgo ${VERSION} — Node.js with the Memingo programming language`);
  out('');
  out('Usage:');
  out('  node_mgo <file.mgo>              Run a Memingo file');
  out('  node_mgo <file.js>               Run a JavaScript file with Node');
  out('  node_mgo run [file|project]      Run a file or a project entry point');
  out('  node_mgo eval "<code>"           Evaluate Memingo code');
  out('  node_mgo repl                    Start the Memingo REPL');
  out('  node_mgo check [path]            Validate Memingo syntax');
  out('  node_mgo fmt [path] [--check]    Format Memingo source');
  out('  node_mgo init [dir] [--name N]   Create a project');
  out('  node_mgo dev [file|project]      Re-run on file changes');
  out('  node_mgo test [path]             Run Memingo test files');
  out('  node_mgo build [dir]             Build a distributable ZIP');
  out('  node_mgo serve [dir] [--port N]  Serve static files');
  out('  node_mgo install [dir]           Create dependency records');
  out('  node_mgo add <name>[=version]    Add a dependency');
  out('  node_mgo remove <name>           Remove a dependency');
  out('  node_mgo info [dir]              Show project information');
  out('  node_mgo deps [dir]              List dependencies');
  out('  node_mgo clean [dir]             Remove dist/ and .memingo/');
  out('  node_mgo manifest [dir]          Create memingo.toml');
  out('  node_mgo doctor [dir]            Diagnose the project');
  out('  node_mgo status [dir]            Show runtime status');
  out('  node_mgo completion <shell>      Print shell completions');
  out('  node_mgo mgoa <command>          Run the package manager');
  out('  node_mgo --version               Show the version');
  out('');
  out('Language keywords: vibe, ritual, drop, when, nah, grind, spill, borrow');
  out('Values: whole, caption, party, based, cringe, ghost');
}

function parseFlags(args) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--check') {
      flags.check = true;
    } else if (arg === '--write') {
      flags.write = true;
    } else if (arg === '--port') {
      flags.port = Number.parseInt(args[index + 1], 10);
      index += 1;
    } else if (arg.startsWith('--port=')) {
      flags.port = Number.parseInt(arg.slice('--port='.length), 10);
    } else if (arg === '--name') {
      flags.name = args[index + 1];
      index += 1;
    } else if (arg.startsWith('--name=')) {
      flags.name = arg.slice('--name='.length);
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function main(argv) {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    out(`node_mgo ${VERSION} (Memingo ${VERSION})`);
    return 0;
  }
  if (command.endsWith('.mgo')) {
    return runFile(command);
  }
  if (command.endsWith('.js') || command.endsWith('.cjs') || command.endsWith('.mjs')) {
    return runNodeScript(command, rest);
  }

  const { positional, flags } = parseFlags(rest);

  switch (command) {
    case 'run': {
      const target = positional[0];
      if (!target) return runProject(process.cwd());
      const resolved = path.resolve(target);
      if (isDirectory(resolved)) return runProject(resolved);
      if (isFile(resolved)) return runFile(resolved);
      err(`Error: path does not exist: ${target}`);
      return 1;
    }
    case 'eval': {
      const code = rest.join(' ');
      if (!code.trim()) {
        err('Usage: node_mgo eval "<code>"');
        return 1;
      }
      return runSource(code, process.cwd());
    }
    case 'repl':
      return commandRepl();
    case 'check':
      return commandCheck(positional[0] || '.');
    case 'fmt':
      return commandFmt(positional[0] || '.', { check: Boolean(flags.check) });
    case 'init':
      return commandInit(positional[0] || '.', flags.name);
    case 'dev':
      return commandDev(positional[0] || '.');
    case 'test':
      return commandTest(positional[0]);
    case 'build':
      return commandBuild(positional[0] || '.');
    case 'serve':
      return commandServe(positional[0], flags.port || 8000);
    case 'install':
      return commandInstall(positional[0] || '.');
    case 'add':
      return commandAdd(positional[0], positional[1] || '.');
    case 'remove':
      if (!positional[0]) {
        err('Usage: node_mgo remove <name>');
        return 1;
      }
      return commandRemove(positional[0], positional[1] || '.');
    case 'info':
      return commandInfo(positional[0] || '.');
    case 'deps':
      return commandDeps(positional[0] || '.');
    case 'clean':
      return commandClean(positional[0] || '.');
    case 'manifest':
      return commandManifest(positional[0] || '.');
    case 'doctor':
      return commandDoctor(positional[0] || '.');
    case 'status':
      return commandStatus(positional[0] || '.');
    case 'completion':
      return commandCompletion(positional[0]);
    case 'update-self':
      out('node_mgo is distributed with the Node.mgo repository. Update it with git pull.');
      return 0;
    case 'mgoa':
      return require('./mgoa').main(positional);
    default:
      err(`Unknown command: ${command}`);
      err('Run "node_mgo help" for the command list.');
      return 1;
  }
}

module.exports = {
  COMMANDS,
  VERSION,
  main,
  runFile,
  runProject,
  runSource,
};
