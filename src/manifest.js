'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANIFEST = 'memingo.toml';
const LOCKFILE = 'memingo.lock.json';
const DEFAULT_ENTRY = 'main.mgo';

const DEFAULT_ENV = '# Local Memingo environment variables\n# CONFIG_JSON={"mode":"dev"}\n';
const DEFAULT_GITIGNORE = '.memingo/\ndist/\n__pycache__/\n.env\n';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripComment(line) {
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\' && quote === '"') {
        escaped = true;
      } else if (character === quote) {
        inString = false;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      inString = true;
      quote = character;
    } else if (character === '#') {
      return line.slice(0, index);
    }
  }
  return line;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (const character of text) {
    if (inString) {
      current += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\' && quote === '"') {
        escaped = true;
      } else if (character === quote) {
        inString = false;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      inString = true;
      quote = character;
      current += character;
    } else if (character === '[' || character === '{' || character === '(') {
      depth += 1;
      current += character;
    } else if (character === ']' || character === '}' || character === ')') {
      depth -= 1;
      current += character;
    } else if (character === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts;
}

function parseString(text) {
  const quote = text[0];
  const body = text.slice(1, -1);
  if (quote === "'") return body;
  let result = '';
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character !== '\\') {
      result += character;
      continue;
    }
    index += 1;
    const escaped = body[index];
    const table = {
      b: '\b',
      t: '\t',
      n: '\n',
      f: '\f',
      r: '\r',
      '"': '"',
      '\\': '\\',
      '/': '/',
    };
    if (escaped === 'u') {
      const code = body.slice(index + 1, index + 5);
      result += String.fromCodePoint(Number.parseInt(code, 16));
      index += 4;
    } else {
      result += table[escaped] ?? escaped;
    }
  }
  return result;
}

function parseValue(text) {
  const value = text.trim();
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value.startsWith('"') && value.endsWith('"')) return parseString(value);
  if (value.startsWith("'") && value.endsWith("'")) return parseString(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner, ',').map((item) => parseValue(item));
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    const result = {};
    if (!inner) return result;
    for (const entry of splitTopLevel(inner, ',')) {
      const index = entry.indexOf('=');
      if (index === -1) continue;
      const key = entry.slice(0, index).trim().replace(/^["']|["']$/g, '');
      result[key] = parseValue(entry.slice(index + 1));
    }
    return result;
  }
  if (/^[+-]?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^[+-]?\d+\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

function setSection(root, sectionPath, value) {
  let target = root;
  for (const part of sectionPath) {
    if (!isPlainObject(target[part])) {
      target[part] = {};
    }
    target = target[part];
  }
  return target;
}

function bracketDepth(text) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (const character of text) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\' && quote === '"') {
        escaped = true;
      } else if (character === quote) {
        inString = false;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      inString = true;
      quote = character;
    } else if (character === '[' || character === '{') {
      depth += 1;
    } else if (character === ']' || character === '}') {
      depth -= 1;
    }
  }
  return depth;
}

function parseToml(source) {
  const root = {};
  let current = root;
  const lines = source.split(/\r?\n/);
  let pending = '';
  for (const rawLine of lines) {
    const cleaned = stripComment(rawLine);
    const line = (pending ? `${pending}\n${cleaned}` : cleaned).trim();
    if (!line) {
      pending = '';
      continue;
    }
    if (bracketDepth(line) > 0) {
      pending = line;
      continue;
    }
    pending = '';
    if (line.startsWith('[') && line.endsWith(']')) {
      const name = line.slice(1, -1).trim();
      const parts = splitTopLevel(name, '.').map((part) => part.trim().replace(/^["']|["']$/g, ''));
      current = setSection(root, parts, {});
      continue;
    }
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim().replace(/^["']|["']$/g, '');
    current[key] = parseValue(line.slice(index + 1));
  }
  return root;
}

function serializeValue(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (value === null) return '""';
  if (Array.isArray(value)) return `[${value.map(serializeValue).join(', ')}]`;
  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(
      ([key, item]) => `${key} = ${serializeValue(item)}`,
    );
    return `{ ${entries.join(', ')} }`;
  }
  return JSON.stringify(String(value));
}

function serializeToml(data) {
  const lines = [];
  const writeSection = (name, section) => {
    if (name.length) lines.push(`[${name.join('.')}]`);
    for (const [key, value] of Object.entries(section)) {
      if (isPlainObject(value)) continue;
      lines.push(`${key} = ${serializeValue(value)}`);
    }
    for (const [key, value] of Object.entries(section)) {
      if (isPlainObject(value)) {
        if (lines.length) lines.push('');
        writeSection([...name, key], value);
      }
    }
  };
  writeSection([], data);
  return `${lines.join('\n').replace(/\s+$/, '')}\n`;
}

function projectName(directory) {
  const raw = path.basename(path.resolve(directory)) || 'memingo-app';
  let name = raw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-_]+|[.-_]+$/g, '');
  if (!name) name = 'memingo-app';
  if (!/^[A-Za-z0-9]/.test(name)) name = `memingo-${name}`;
  return name;
}

function validateProjectName(name) {
  const value = String(name ?? '').trim();
  if (!value || /["\\\n\r]/.test(value)) {
    throw new Error('Project name cannot be empty and must not contain quotes or line breaks');
  }
  return value;
}

function initProject(directory = '.', name = 'my-memingo-app', version = '0.2.0') {
  const root = path.resolve(directory);
  const project = validateProjectName(name);
  fs.mkdirSync(root, { recursive: true });
  const manifestPath = path.join(root, MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(
      manifestPath,
      `[package]\nname = ${JSON.stringify(project)}\nversion = ${JSON.stringify(version)}\nentry = "main.mgo"\n\n[dependencies]\n`,
      'utf8',
    );
  }
  const mainFile = path.join(root, DEFAULT_ENTRY);
  if (!fs.existsSync(mainFile)) {
    fs.writeFileSync(mainFile, 'vibe app = "Memingo"\nspill "Welcome to " + app + "!"\n', 'utf8');
  }
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(envFile, DEFAULT_ENV, 'utf8');
  }
  const gitignore = path.join(root, '.gitignore');
  if (!fs.existsSync(gitignore)) {
    fs.writeFileSync(gitignore, DEFAULT_GITIGNORE, 'utf8');
  }
  return manifestPath;
}

function ensureProject(directory = '.', name = undefined) {
  const root = path.resolve(directory);
  const manifestPath = path.join(root, MANIFEST);
  if (fs.existsSync(manifestPath)) return manifestPath;
  return initProject(root, name || projectName(root));
}

function readManifest(directory = '.') {
  const root = path.resolve(directory);
  const manifestPath = path.join(root, MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    initProject(root, projectName(root));
  }
  return parseToml(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(directory, data) {
  const root = path.resolve(directory);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, MANIFEST), serializeToml(data), 'utf8');
}

function resolveEntry(directory = '.') {
  const root = path.resolve(directory);
  const manifest = readManifest(root);
  const packageSection = manifest.package;
  if (!isPlainObject(packageSection)) {
    throw new Error(`Manifest is missing a [package] section: ${path.join(root, MANIFEST)}`);
  }
  const entry = packageSection.entry ?? DEFAULT_ENTRY;
  if (typeof entry !== 'string' || !entry.trim()) {
    throw new Error('[package].entry must be a non-empty string');
  }
  const entryPath = path.resolve(root, entry.trim());
  if (entryPath !== root && !entryPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('[package].entry must stay inside the project directory');
  }
  return { manifest, entry: entry.trim(), entryPath };
}

function readLock(directory = '.') {
  const lockPath = path.join(path.resolve(directory), LOCKFILE);
  if (!fs.existsSync(lockPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read package lockfile: ${error.message}`);
  }
}

function writeLock(directory, lock) {
  const lockPath = path.join(path.resolve(directory), LOCKFILE);
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

module.exports = {
  DEFAULT_ENTRY,
  LOCKFILE,
  MANIFEST,
  ensureProject,
  initProject,
  isPlainObject,
  parseToml,
  projectName,
  readLock,
  readManifest,
  resolveEntry,
  serializeToml,
  validateProjectName,
  writeLock,
  writeManifest,
};
