'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'node_mgo.js');
const MGOA = path.join(ROOT, 'bin', 'mgoa.js');

function run(executable, args, options = {}) {
  return spawnSync(process.execPath, [executable, ...args], {
    cwd: options.cwd || ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
}

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('eval prints a value', () => {
  const result = run(CLI, ['eval', 'spill 2 + 2']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '4');
});

test('run executes a Memingo file', () => {
  const result = run(CLI, ['run', 'examples/hello.mgo']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Hola desde Memingo!/);
  assert.match(result.stdout, /Esto es based/);
});

test('check validates examples', () => {
  const result = run(CLI, ['check', 'examples']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /4\/4 file\(s\) passed/);
});

test('init, run and build a project', () => {
  const directory = temporaryDirectory('node-mgo-cli-');
  const init = run(CLI, ['init', directory, '--name', 'demo']);
  assert.equal(init.status, 0, init.stderr);
  assert.ok(fs.existsSync(path.join(directory, 'memingo.toml')));
  assert.ok(fs.existsSync(path.join(directory, 'main.mgo')));

  const projectRun = run(CLI, ['run'], { cwd: directory });
  assert.equal(projectRun.status, 0, projectRun.stderr);
  assert.match(projectRun.stdout, /Welcome to Memingo!/);

  const build = run(CLI, ['build'], { cwd: directory });
  assert.equal(build.status, 0, build.stderr);
  const archive = path.join(directory, 'dist', 'demo-0.2.0.zip');
  assert.ok(fs.existsSync(archive));
  assert.ok(fs.statSync(archive).size > 0);
});

test('invalid UTF-8 is a clean error', () => {
  const directory = temporaryDirectory('node-mgo-binary-');
  const file = path.join(directory, 'binary.mgo');
  fs.writeFileSync(file, Buffer.from([0xff, 0xfe, 0x00, 0x00]));
  const result = run(CLI, ['run', file]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UTF-8/);
  assert.doesNotMatch(result.stderr, /at Object\.<anonymous>/);
});

test('fmt --check reports formatted files', () => {
  const result = run(CLI, ['fmt', 'examples', '--check']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /All files are formatted/);
});

test('completion prints a shell script', () => {
  const result = run(CLI, ['completion', 'bash']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /complete -F _node_mgo_completions/);
});

test('javascript files still run through Node', () => {
  const directory = temporaryDirectory('node-mgo-js-');
  const file = path.join(directory, 'hello.js');
  fs.writeFileSync(file, 'console.log("from node");\n');
  const result = run(CLI, [file]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'from node');
});

test('mgoa installs a local package and borrow loads it', () => {
  const workspace = temporaryDirectory('node-mgo-mgoa-');
  const packageDirectory = path.join(workspace, 'greetpkg');
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(packageDirectory, 'memingo.toml'),
    '[package]\nname = "greetpkg"\nversion = "1.0.0"\nentry = "main.mgo"\n\n[dependencies]\n',
  );
  fs.writeFileSync(
    path.join(packageDirectory, 'main.mgo'),
    'ritual greet(name) {\n    drop "Hola " + name\n}\n',
  );

  const project = path.join(workspace, 'app');
  const init = run(CLI, ['init', project, '--name', 'app']);
  assert.equal(init.status, 0, init.stderr);

  const add = run(MGOA, ['add', packageDirectory], { cwd: project });
  assert.equal(add.status, 0, add.stderr);
  assert.match(add.stdout, /Installed greetpkg@1\.0\.0/);

  fs.writeFileSync(
    path.join(project, 'main.mgo'),
    'borrow "greetpkg"\nspill greet("Team")\n',
  );
  const execute = run(CLI, ['run'], { cwd: project });
  assert.equal(execute.status, 0, execute.stderr);
  assert.equal(execute.stdout.trim(), 'Hola Team');
});
