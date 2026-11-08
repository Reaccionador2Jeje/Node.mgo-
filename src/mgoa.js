'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ensureProject,
  isPlainObject,
  parseToml,
  readLock,
  readManifest,
  writeLock,
  writeManifest,
} = require('./manifest');
const { createZip, extractZip } = require('./zip');

const VERSION = require('../package.json').version;
const OFFICIAL_REGISTRY = 'https://reaccionador2jeje.github.io/Memingo/mgoa/index.json';
const FALLBACK_REGISTRY =
  'https://raw.githubusercontent.com/Reaccionador2Jeje/Memingo/main/site/mgoa/index.json';
const DEFAULT_REGISTRY = process.env.MGOA_REGISTRY || OFFICIAL_REGISTRY;
const IGNORED_PARTS = new Set(['.git', '.memingo', 'dist', 'node_modules', '__pycache__']);

class PackageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PackageError';
  }
}

function out(message = '') {
  process.stdout.write(`${message}\n`);
}

function err(message = '') {
  process.stderr.write(`${message}\n`);
}

function validatePackageName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new PackageError(`Invalid package name '${name}'`);
  }
  return name;
}

function validateVersion(version) {
  if (version === '*') return version;
  if (typeof version !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(version)) {
    throw new PackageError(`Invalid version '${version}'`);
  }
  return version;
}

function parseSpec(spec) {
  const value = String(spec ?? '').trim();
  if (!value) throw new PackageError('Package name cannot be empty');
  if (/^https?:\/\//i.test(value)) return { kind: 'url', spec: value, name: value, version: '*' };
  if (
    value.endsWith('.zip') ||
    value.startsWith('.') ||
    value.startsWith('/') ||
    value.startsWith('~') ||
    path.isAbsolute(value) ||
    /^[A-Za-z]:[\\/]/.test(value)
  ) {
    return { kind: 'local', spec: value, name: value, version: '*' };
  }
  const at = value.lastIndexOf('@');
  if (at > 0) {
    const name = validatePackageName(value.slice(0, at));
    const version = validateVersion(value.slice(at + 1) || '*');
    return { kind: 'registry', name, version, spec: value };
  }
  return { kind: 'registry', name: validatePackageName(value), version: '*', spec: value };
}

function splitUrlChecksum(url) {
  const index = url.indexOf('#');
  if (index === -1) return { url, checksum: null };
  const base = url.slice(0, index);
  const fragment = url.slice(index + 1);
  if (fragment.toLowerCase().startsWith('sha256=')) {
    return { url: base, checksum: fragment.slice('sha256='.length) };
  }
  return { url, checksum: null };
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function copyDirectory(source, destination) {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  const visit = (current, target) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (IGNORED_PARTS.has(entry.name)) continue;
      const from = path.join(current, entry.name);
      const to = path.join(target, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        visit(from, to);
      } else if (entry.isFile()) {
        fs.copyFileSync(from, to);
      }
    }
  };
  visit(source, destination);
}

function findPackageRoot(directory, packageName = null) {
  const candidates = [directory];
  const manifests = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORED_PARTS.has(entry.name)) continue;
        walk(path.join(current, entry.name));
      } else if (entry.name === 'memingo.toml' || entry.name === 'package.toml') {
        manifests.push(path.dirname(path.join(current, entry.name)));
      }
    }
  };
  walk(directory);
  for (const candidate of [...new Set([...candidates, ...manifests])]) {
    const manifestPath = path.join(candidate, 'memingo.toml');
    const fallback = path.join(candidate, 'package.toml');
    const selected = fs.existsSync(manifestPath) ? manifestPath : fs.existsSync(fallback) ? fallback : null;
    if (!selected) continue;
    if (!packageName) return candidate;
    const metadata = parseToml(fs.readFileSync(selected, 'utf8'));
    if (metadata.package && metadata.package.name === packageName) return candidate;
  }
  throw new PackageError('Package source does not contain memingo.toml or package.toml');
}

function packageMetadata(root) {
  const manifestPath = path.join(root, 'memingo.toml');
  const fallback = path.join(root, 'package.toml');
  const selected = fs.existsSync(manifestPath) ? manifestPath : fallback;
  if (!fs.existsSync(selected)) {
    throw new PackageError('Package is missing memingo.toml or package.toml');
  }
  const metadata = parseToml(fs.readFileSync(selected, 'utf8'));
  const section = metadata.package;
  if (!isPlainObject(section)) {
    throw new PackageError('Package manifest is missing a [package] section');
  }
  const name = validatePackageName(section.name);
  const version = validateVersion(String(section.version ?? '0.0.0'));
  const entry = typeof section.entry === 'string' && section.entry ? section.entry : 'main.mgo';
  return { metadata, name, version, entry };
}

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mgoa-'));
}

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': `mgoa/${VERSION}` } });
  if (!response.ok) {
    throw new PackageError(`Could not download package archive ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchRegistry(url) {
  let response;
  try {
    response = await fetch(url, { headers: { 'User-Agent': `mgoa/${VERSION}` } });
  } catch (error) {
    throw new PackageError(`Could not access package registry ${url}: ${error.message}`);
  }
  if (!response.ok) {
    throw new PackageError(`Could not access package registry ${url}: HTTP ${response.status}`);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new PackageError(`Package registry returned an invalid document: ${url}`);
  }
  if (!isPlainObject(data)) {
    throw new PackageError(`Package registry returned an invalid document: ${url}`);
  }
  return data;
}

async function loadRegistry(registryUrl = DEFAULT_REGISTRY) {
  try {
    return await fetchRegistry(registryUrl);
  } catch (error) {
    if (registryUrl !== DEFAULT_REGISTRY || process.env.MGOA_REGISTRY) throw error;
    try {
      return await fetchRegistry(FALLBACK_REGISTRY);
    } catch {
      throw error;
    }
  }
}

function resolveArchiveUrl(archive, registryUrl) {
  let url = new URL(archive, registryUrl).href;
  if (url.startsWith('https://reaccionador2jeje.github.io/Memingo/')) {
    url = `https://raw.githubusercontent.com/Reaccionador2Jeje/Memingo/main/site/${url.slice(
      'https://reaccionador2jeje.github.io/Memingo/'.length,
    )}`;
  }
  return url;
}

function registryPackages(registry) {
  if (isPlainObject(registry.approved) && isPlainObject(registry.approved.packages)) {
    return { packages: registry.approved.packages, approved: true };
  }
  if (isPlainObject(registry.packages)) {
    return { packages: registry.packages, approved: false };
  }
  throw new PackageError("Registry must contain an 'approved.packages' or 'packages' table");
}

async function resolvePackage(spec, registryUrl = DEFAULT_REGISTRY) {
  const parsed = parseSpec(spec);
  if (parsed.kind === 'local') {
    const local = path.resolve(parsed.spec.replace(/^~(?=$|\/)/, os.homedir()));
    if (!fs.existsSync(local)) {
      throw new PackageError(`Package source does not exist: ${local}`);
    }
    if (fs.statSync(local).isFile() && local.toLowerCase().endsWith('.zip')) {
      const buffer = fs.readFileSync(local);
      const root = extractPackage(buffer);
      return {
        root,
        sha256: sha256(buffer),
        source: { source: 'local', path: local },
        release: {},
      };
    }
    return {
      root: findPackageRoot(local),
      sha256: packageDigest(findPackageRoot(local)),
      source: { source: 'local', path: local },
      release: {},
    };
  }
  if (parsed.kind === 'url') {
    const { url, checksum } = splitUrlChecksum(parsed.spec);
    const buffer = await download(url);
    const digest = sha256(buffer);
    if (checksum && checksum.toLowerCase() !== digest) {
      throw new PackageError(`Checksum mismatch for ${url}: expected ${checksum}, got ${digest}`);
    }
    return {
      root: extractPackage(buffer),
      sha256: digest,
      source: { source: 'url', url: parsed.spec },
      release: { archive: url },
    };
  }

  const registry = await loadRegistry(registryUrl);
  const { packages, approved } = registryPackages(registry);
  const record = packages[parsed.name];
  if (!isPlainObject(record)) {
    throw new PackageError(`Package '${parsed.name}' is not available in ${registryUrl}`);
  }
  const versions = isPlainObject(record.versions) ? record.versions : {};
  let version = parsed.version;
  if (version === '*') version = record.latest;
  if (!version) throw new PackageError(`Package '${parsed.name}' has no latest version`);
  validateVersion(version);
  const release = versions[version];
  if (!isPlainObject(release)) {
    throw new PackageError(`Version '${version}' is not available for package '${parsed.name}'`);
  }
  const archive = release.archive;
  if (typeof archive !== 'string' || !archive) {
    throw new PackageError(`Package '${parsed.name}@${version}' has no archive URL`);
  }
  const archiveUrl = resolveArchiveUrl(archive, registryUrl);
  const buffer = await download(archiveUrl);
  const digest = sha256(buffer);
  const expected = release.sha256 || release.integrity;
  if (expected) {
    const normalized = String(expected).toLowerCase().replace(/^sha256:/, '');
    if (normalized !== digest) {
      throw new PackageError(
        `Checksum mismatch for ${parsed.name}@${version}: expected ${normalized}, got ${digest}`,
      );
    }
  }
  return {
    root: extractPackage(buffer, parsed.name),
    sha256: digest,
    source: { source: 'registry', registry: registryUrl },
    release,
    approved: release.approved ?? record.approved ?? approved,
    version,
  };
}

function extractPackage(buffer, packageName = null) {
  const directory = temporaryDirectory();
  const entries = extractZip(buffer);
  for (const entry of entries) {
    const target = path.resolve(directory, entry.name);
    if (target !== directory && !target.startsWith(`${directory}${path.sep}`)) {
      throw new PackageError(`Unsafe package path: ${entry.name}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.data);
  }
  return findPackageRoot(directory, packageName);
}

function packageDigest(root) {
  const hash = crypto.createHash('sha256');
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (IGNORED_PARTS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        hash.update(path.relative(root, full).split(path.sep).join('/'));
        hash.update('\0');
        hash.update(fs.readFileSync(full));
      }
    }
  };
  visit(root);
  return hash.digest('hex');
}

function installResolved(project, resolved, requestedVersion = '*') {
  const metadata = packageMetadata(resolved.root);
  const packagesDir = path.join(project, '.memingo', 'packages');
  const destination = path.join(packagesDir, metadata.name);
  fs.mkdirSync(packagesDir, { recursive: true });
  copyDirectory(resolved.root, destination);

  const manifest = readManifest(project);
  if (!isPlainObject(manifest.dependencies)) manifest.dependencies = {};
  manifest.dependencies[metadata.name] = requestedVersion === '*' ? metadata.version : requestedVersion;
  writeManifest(project, manifest);

  const lock = readLock(project);
  if (!isPlainObject(lock.dependencies)) lock.dependencies = {};
  lock.dependencies[metadata.name] = {
    version: metadata.version,
    entry: metadata.entry,
    source: resolved.source,
    archive: resolved.release?.archive ?? null,
    sha256: resolved.sha256,
    approved: resolved.approved ?? false,
  };
  writeLock(project, lock);
  return metadata;
}

async function installSpec(project, spec, registryUrl = DEFAULT_REGISTRY) {
  const parsed = parseSpec(spec);
  const resolved = await resolvePackage(spec, registryUrl);
  const metadata = installResolved(project, resolved, parsed.version);
  out(`Installed ${metadata.name}@${metadata.version}`);
  return metadata;
}

async function commandSearch(registryUrl = DEFAULT_REGISTRY) {
  const registry = await loadRegistry(registryUrl);
  const { packages } = registryPackages(registry);
  const names = Object.keys(packages).sort();
  if (!names.length) {
    out('No packages in the registry.');
    return 0;
  }
  for (const name of names) {
    const record = packages[name];
    const description = isPlainObject(record) ? record.description ?? '' : '';
    const latest = isPlainObject(record) ? record.latest ?? '' : '';
    out(`${name.padEnd(18)} ${String(latest).padEnd(10)} ${description}`);
  }
  return 0;
}

async function commandInfo(name, registryUrl = DEFAULT_REGISTRY) {
  const registry = await loadRegistry(registryUrl);
  const { packages } = registryPackages(registry);
  const record = packages[name];
  if (!isPlainObject(record)) {
    throw new PackageError(`Package '${name}' is not available in ${registryUrl}`);
  }
  out(`Package: ${name}`);
  if (record.description) out(`About:   ${record.description}`);
  if (record.license) out(`License: ${record.license}`);
  if (record.homepage) out(`Home:    ${record.homepage}`);
  if (record.latest) out(`Latest:  ${record.latest}`);
  const versions = isPlainObject(record.versions) ? record.versions : {};
  for (const [version, release] of Object.entries(versions)) {
    const archive = isPlainObject(release) ? release.archive ?? '' : '';
    out(`  ${version}  ${archive}`);
  }
  return 0;
}

function commandList(project) {
  const manifest = readManifest(project);
  const dependencies = manifest.dependencies || {};
  const lock = readLock(project);
  const records = lock.dependencies || {};
  if (!Object.keys(dependencies).length && !Object.keys(records).length) {
    out('No packages recorded.');
    return 0;
  }
  for (const [name, version] of Object.entries(dependencies)) {
    const record = isPlainObject(records[name]) ? records[name] : {};
    const source = isPlainObject(record.source) ? record.source.source ?? 'unknown' : 'unknown';
    const installed = fs.existsSync(path.join(project, '.memingo', 'packages', name));
    out(`${name} ${version}  source=${source}  installed=${installed ? 'yes' : 'no'}`);
  }
  for (const name of Object.keys(records)) {
    if (!(name in dependencies)) {
      out(`${name} (lockfile only)`);
    }
  }
  return 0;
}

async function commandInstall(project, registryUrl) {
  const manifest = readManifest(project);
  const dependencies = manifest.dependencies;
  if (dependencies !== undefined && !isPlainObject(dependencies)) {
    throw new PackageError('[dependencies] must be a table in memingo.toml');
  }
  const lock = readLock(project);
  const records = isPlainObject(lock.dependencies) ? lock.dependencies : {};
  let count = 0;
  for (const [name, requested] of Object.entries(dependencies || {})) {
    const record = isPlainObject(records[name]) ? records[name] : null;
    const version = record?.version ?? requested;
    let spec = `${name}@${version}`;
    if (record && isPlainObject(record.source)) {
      if (record.source.source === 'local' && record.source.path) spec = record.source.path;
      else if (record.source.source === 'url' && record.source.url) spec = record.source.url;
    }
    await installSpec(project, spec, registryUrl);
    count += 1;
  }
  out(`Installed ${count} package(s).`);
  return 0;
}

async function commandUpdate(project, registryUrl) {
  return commandInstall(project, registryUrl);
}

function commandRemove(project, name) {
  const manifest = readManifest(project);
  if (!isPlainObject(manifest.dependencies) || !(name in manifest.dependencies)) {
    throw new PackageError(`Dependency '${name}' is not installed`);
  }
  delete manifest.dependencies[name];
  writeManifest(project, manifest);
  const lock = readLock(project);
  if (isPlainObject(lock.dependencies)) {
    delete lock.dependencies[name];
    writeLock(project, lock);
  }
  fs.rmSync(path.join(project, '.memingo', 'packages', name), { recursive: true, force: true });
  out(`Removed ${name}`);
  return 0;
}

function commandPublish(directory) {
  const root = findPackageRoot(path.resolve(directory || '.'));
  const metadata = packageMetadata(root);
  const entries = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (IGNORED_PARTS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) {
        entries.push({
          name: path.relative(root, full).split(path.sep).join('/'),
          data: fs.readFileSync(full),
        });
      }
    }
  };
  visit(root);
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const archive = path.join(dist, `${metadata.name}-${metadata.version}.zip`);
  const buffer = createZip(entries);
  fs.writeFileSync(archive, buffer);
  fs.writeFileSync(`${archive}.sha256`, `${sha256(buffer)}\n`, 'utf8');
  out(`Published ${archive}`);
  out(`SHA-256 ${sha256(buffer)}`);
  return 0;
}

function printHelp() {
  out(`mgoa ${VERSION} — Memingo package manager`);
  out('');
  out('Usage:');
  out('  mgoa search                      Search the registry');
  out('  mgoa info <package>              Show package metadata');
  out('  mgoa list                        List recorded packages');
  out('  mgoa add <name|dir|zip|url>      Install a package');
  out('  mgoa install                     Install manifest dependencies');
  out('  mgoa update                      Reinstall manifest dependencies');
  out('  mgoa remove <name>               Remove a package');
  out('  mgoa publish [dir]               Build a package archive');
  out('  mgoa completion <shell>          Print shell completions');
  out('');
  out(`Registry: ${DEFAULT_REGISTRY}`);
}

async function main(argv) {
  const [command, ...rest] = argv;
  const project = process.cwd();
  const registryUrl = process.env.MGOA_REGISTRY || DEFAULT_REGISTRY;
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') {
      printHelp();
      return 0;
    }
    if (command === '--version' || command === '-v' || command === 'version') {
      out(`mgoa ${VERSION}`);
      return 0;
    }
    if (command === 'search') {
      return await commandSearch(registryUrl);
    }
    if (command === 'info') {
      if (!rest[0]) throw new PackageError('Usage: mgoa info <package>');
      return await commandInfo(rest[0], registryUrl);
    }
    if (command === 'list') {
      ensureProject(project);
      return commandList(project);
    }
    if (command === 'add') {
      if (!rest[0]) throw new PackageError('Usage: mgoa add <name|dir|zip|url>');
      ensureProject(project);
      await installSpec(project, rest[0], registryUrl);
      return 0;
    }
    if (command === 'install') {
      ensureProject(project);
      return await commandInstall(project, registryUrl);
    }
    if (command === 'update') {
      ensureProject(project);
      return await commandUpdate(project, registryUrl);
    }
    if (command === 'remove') {
      if (!rest[0]) throw new PackageError('Usage: mgoa remove <name>');
      ensureProject(project);
      return commandRemove(project, rest[0]);
    }
    if (command === 'publish') {
      return commandPublish(rest[0] || '.');
    }
    if (command === 'completion') {
      return require('./cli').main(['completion', ...rest]);
    }
    err(`Unknown command: ${command}`);
    err('Run "mgoa help" for the command list.');
    return 1;
  } catch (error) {
    err(`Error: ${error.message}`);
    return 1;
  }
}

module.exports = {
  DEFAULT_REGISTRY,
  PackageError,
  main,
  parseSpec,
  resolvePackage,
};
