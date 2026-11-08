'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  Assign,
  Binary,
  Borrow,
  Call,
  FunctionDecl,
  Get,
  If,
  Let,
  ListExpression,
  Literal,
  MapExpression,
  Program,
  Return,
  Say,
  Unary,
  Variable,
  While,
  parse,
} = require('./parser');

class RuntimeErrorMemingo extends Error {
  constructor(message) {
    super(message);
    this.name = 'RuntimeErrorMemingo';
  }
}

class ReturnSignal extends Error {
  constructor(value) {
    super('drop');
    this.name = 'ReturnSignal';
    this.value = value;
  }
}

const MISSING = Symbol('missing');

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isList(value) {
  return Array.isArray(value);
}

function isNumeric(value) {
  return typeof value === 'number' || typeof value === 'boolean';
}

function isWhole(value) {
  return typeof value === 'number' && Number.isInteger(value);
}

function isWholeArgument(value) {
  return isWhole(value) || typeof value === 'boolean';
}

function toNumber(value) {
  return typeof value === 'boolean' ? (value ? 1 : 0) : value;
}

function pyTruthy(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function pyStr(value) {
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return displayValue(value);
}

function pyEquals(left, right) {
  if (left === right) return true;
  if (left === null || right === null) return left === right;
  if (isNumeric(left) && isNumeric(right)) {
    return toNumber(left) === toNumber(right);
  }
  if (typeof left === 'string' && typeof right === 'string') {
    return left === right;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => pyEquals(item, right[index]));
  }
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(right, key) && pyEquals(left[key], right[key]),
    );
  }
  return false;
}

function compareValues(operator, left, right) {
  let a;
  let b;
  if (isNumeric(left) && isNumeric(right)) {
    a = toNumber(left);
    b = toNumber(right);
  } else if (typeof left === 'string' && typeof right === 'string') {
    a = left;
    b = right;
  } else {
    throw new RuntimeErrorMemingo(`Operator '${operator}' requires comparable values`);
  }
  switch (operator) {
    case '<':
      return a < b;
    case '>':
      return a > b;
    case '<=':
      return a <= b;
    case '>=':
      return a >= b;
    default:
      throw new RuntimeErrorMemingo(`Unknown operator '${operator}'`);
  }
}

function pyModulo(left, right) {
  return left - Math.floor(left / right) * right;
}

function jsonCompact(value) {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(jsonCompact).join(',')}]`;
  }
  if (isObject(value)) {
    const entries = Object.keys(value).map(
      (key) => `${JSON.stringify(key)}:${jsonCompact(value[key])}`,
    );
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(String(value));
}

function displayValue(value) {
  if (value === null || value === undefined) return 'ghost';
  if (value === true) return 'based';
  if (value === false) return 'cringe';
  if (Array.isArray(value) || isObject(value)) {
    return displayJson(value);
  }
  if (typeof value === 'function' || value instanceof MemingoFunction) {
    const name = value.displayName || value.declaration?.name || 'anonymous';
    return `<ritual ${name}>`;
  }
  return String(value);
}

function displayJson(value) {
  if (value === null || value === undefined) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(displayJson).join(', ')}]`;
  }
  if (isObject(value)) {
    const entries = Object.keys(value).map(
      (key) => `${JSON.stringify(key)}: ${displayJson(value[key])}`,
    );
    return `{${entries.join(', ')}}`;
  }
  return JSON.stringify(String(value));
}

function codePointLength(text) {
  return Array.from(text).length;
}

function codePointSlice(text, start, end) {
  const chars = Array.from(text);
  return chars.slice(start, end).join('');
}

function normalizeSliceIndex(value, length, fallback) {
  if (value === undefined || value === null) return fallback;
  let index = toNumber(value);
  if (index < 0) index = Math.max(length + index, 0);
  else index = Math.min(index, length);
  return index;
}

class Environment {
  constructor(parent = null) {
    this.values = new Map();
    this.parent = parent;
  }

  define(name, value) {
    this.values.set(name, value);
  }

  get(name) {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.parent !== null) {
      return this.parent.get(name);
    }
    throw new RuntimeErrorMemingo(`Undefined variable '${name}'`);
  }

  assign(name, value) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent !== null) {
      this.parent.assign(name, value);
      return;
    }
    throw new RuntimeErrorMemingo(`Undefined variable '${name}'`);
  }
}

class MemingoFunction {
  constructor(declaration, closure) {
    this.declaration = declaration;
    this.closure = closure;
    this.displayName = declaration.name;
  }

  call(interpreter, args) {
    const expected = this.declaration.params.length;
    if (args.length !== expected) {
      throw new RuntimeErrorMemingo(
        `Function '${this.declaration.name}' expects ${expected} arguments, got ${args.length}`,
      );
    }
    const environment = new Environment(this.closure);
    this.declaration.params.forEach((name, index) => {
      environment.define(name, args[index]);
    });
    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
    return null;
  }
}

class Interpreter {
  constructor({ projectDirectory = '.', captureOutput = true } = {}) {
    this.projectDirectory = this._resolveProjectRoot(projectDirectory);
    this.output = [];
    this.captureOutput = captureOutput;
    this.globalEnvironment = new Environment();
    this.environment = this.globalEnvironment;
    this._loadDotEnv();
    this._installBuiltins();
  }

  _resolveProjectRoot(directory) {
    const resolved = path.resolve(directory);
    try {
      return fs.realpathSync(resolved);
    } catch {
      return resolved;
    }
  }

  _loadDotEnv() {
    const envPath = path.join(this.projectDirectory, '.env');
    if (!fs.existsSync(envPath)) return;
    let contents;
    try {
      contents = fs.readFileSync(envPath, 'utf8');
    } catch {
      return;
    }
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const index = line.indexOf('=');
      const name = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (!(name in process.env)) {
        process.env[name] = value;
      }
    }
  }

  _installBuiltins() {
    const define = (name, fn) => {
      fn.displayName = name;
      this.globalEnvironment.define(name, fn);
    };

    define('headcount', (value) => this._headcount(value));
    define('whatkind', (value) => this._whatkind(value));
    define('json_parse', (text) => this._jsonParse(text));
    define('json_stringify', (value) => jsonCompact(value));
    define('env', (name, fallback = null) => this._env(name, fallback));
    define('random', () => Math.random());
    define('random_int', (low, high) => this._randomInt(low, high));
    define('shuffle', (items) => this._shuffle(items));
    define('uuid', () => crypto.randomUUID());
    define('range', (...args) => this._range(...args));
    define('keys', (value) => (isObject(value) ? Object.keys(value) : []));
    define('values', (value) => (isObject(value) ? Object.values(value) : []));
    define('push', (items, value) => this._push(items, value));
    define('append', (items, value) => this._append(items, value));
    define('set_value', (container, key, value) => this._setValue(container, key, value));
    define('delete_key', (container, key) => this._deleteKey(container, key));
    define('upper', (text) => this._stringArgument('upper', text).toUpperCase());
    define('lower', (text) => this._stringArgument('lower', text).toLowerCase());
    define('trim', (text) => this._stringArgument('trim', text).trim());
    define('split', (text, separator = null) => this._split(text, separator));
    define('join', (items, separator = '') => this._join(items, separator));
    define('replace', (text, oldText, newText) => this._replace(text, oldText, newText));
    define('contains', (container, value) => this._contains(container, value));
    define('starts_with', (text, prefix) => this._startsWith(text, prefix));
    define('ends_with', (text, suffix) => this._endsWith(text, suffix));
    define('meme_case', (text) => this._memeCase(text));
    define('slice', (value, start, end = MISSING) => this._slice(value, start, end));
    define('repeat', (text, count) => this._repeat(text, count));
    define('lines', (text) => this._lines(text));
    define('sort', (items, descending = false) => this._sort(items, descending));
    define('reverse', (items) => this._reverse(items));
    define('unique', (items) => this._unique(items));
    define('sum', (items) => this._sum(items));
    define('min', (...args) => this._min(...args));
    define('max', (...args) => this._max(...args));
    define('abs', (value) => Math.abs(this._numberArgument('abs', value)));
    define('floor', (value) => Math.floor(this._numberArgument('floor', value)));
    define('ceil', (value) => Math.ceil(this._numberArgument('ceil', value)));
    define('round', (value) => this._round(this._numberArgument('round', value)));
    define('clamp', (value, low, high) => this._clamp(value, low, high));
    define('parse_int', (text) => this._parseInt(text));
    define('parse_float', (text) => this._parseFloat(text));
    define('map', (items, fn) => this._map(items, fn));
    define('filter', (items, fn) => this._filter(items, fn));
    define('reduce', (items, fn, initial = MISSING) => this._reduce(items, fn, initial));
    define('now', () => Date.now() / 1000);
    define('sleep', (seconds) => this._sleep(seconds));
    define('http_get', (url) => this._httpGet(url));
    define('http_post', (url, payload = null) => this._httpPost(url, payload));
    define('read_file', (filePath) => this._readFile(filePath));
    define('write_file', (filePath, contents) => this._writeFile(filePath, contents));
    define('file_exists', (filePath) => this._fileExists(filePath));
    define('list_files', (filePath = '.') => this._listFiles(filePath));
  }

  run(program) {
    try {
      return this.executeBlock(program.statements, this.globalEnvironment);
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
  }

  executeBlock(statements, environment) {
    const previous = this.environment;
    this.environment = environment;
    try {
      let result = null;
      for (const statement of statements) {
        result = this.execute(statement);
      }
      return result;
    } finally {
      this.environment = previous;
    }
  }

  execute(node) {
    if (node instanceof Let) {
      const value = this.evaluate(node.value);
      this.environment.define(node.name, value);
      return value;
    }
    if (node instanceof Assign) {
      const value = this.evaluate(node.value);
      this.environment.assign(node.name, value);
      return value;
    }
    if (node instanceof Say) {
      const value = this.evaluate(node.value);
      const text = displayValue(value);
      this.output.push(text);
      if (!this.captureOutput) {
        process.stdout.write(`${text}\n`);
      }
      return value;
    }
    if (node instanceof Return) {
      throw new ReturnSignal(this.evaluate(node.value));
    }
    if (node instanceof Borrow) {
      return this._borrow(node);
    }
    if (node instanceof FunctionDecl) {
      const fn = new MemingoFunction(node, this.environment);
      this.environment.define(node.name, fn);
      return fn;
    }
    if (node instanceof If) {
      if (pyTruthy(this.evaluate(node.condition))) {
        return this.executeBlock(node.then_branch, new Environment(this.environment));
      }
      return node.else_branch.length
        ? this.executeBlock(node.else_branch, new Environment(this.environment))
        : null;
    }
    if (node instanceof While) {
      let result = null;
      while (pyTruthy(this.evaluate(node.condition))) {
        result = this.executeBlock(node.body, new Environment(this.environment));
      }
      return result;
    }
    return this.evaluate(node);
  }

  evaluate(node) {
    if (node instanceof Literal) return node.value;
    if (node instanceof Variable) return this.environment.get(node.name);
    if (node instanceof ListExpression) {
      return node.items.map((item) => this.evaluate(item));
    }
    if (node instanceof MapExpression) {
      const result = Object.create(null);
      for (const [key, valueNode] of node.entries) {
        result[key] = this.evaluate(valueNode);
      }
      return result;
    }
    if (node instanceof Get) {
      const target = this.evaluate(node.target);
      const key = this.evaluate(node.key);
      return this._getMember(target, key);
    }
    if (node instanceof Unary) {
      const value = this.evaluate(node.operand);
      if (node.operator === '!') return !pyTruthy(value);
      if (node.operator === '-') {
        if (!isNumeric(value)) {
          throw new RuntimeErrorMemingo("Unary '-' requires a number");
        }
        return -toNumber(value);
      }
      throw new RuntimeErrorMemingo(`Unknown operator '${node.operator}'`);
    }
    if (node instanceof Binary) {
      const left = this.evaluate(node.left);
      if (node.operator === '&&') {
        return pyTruthy(left) ? this.evaluate(node.right) : false;
      }
      if (node.operator === '||') {
        return pyTruthy(left) ? left : this.evaluate(node.right);
      }
      const right = this.evaluate(node.right);
      return this._binary(node.operator, left, right);
    }
    if (node instanceof Call) {
      const callee = this.evaluate(node.callee);
      const args = node.arguments.map((argument) => this.evaluate(argument));
      const name = node.callee instanceof Variable ? node.callee.name : 'built-in';
      return this._callValue(callee, args, name);
    }
    throw new RuntimeErrorMemingo(`Unknown expression: ${node.type}`);
  }

  _callValue(callee, args, name) {
    if (callee instanceof MemingoFunction) {
      return callee.call(this, args);
    }
    if (typeof callee === 'function') {
      try {
        return callee(...args);
      } catch (error) {
        if (error instanceof RuntimeErrorMemingo) throw error;
        const label = callee.displayName || name || 'built-in';
        throw new RuntimeErrorMemingo(`${label}() failed: ${error.message}`);
      }
    }
    throw new RuntimeErrorMemingo('Attempted to call a non-function value');
  }

  _binary(operator, left, right) {
    if (operator === '+') {
      if (isNumeric(left) && isNumeric(right)) {
        return toNumber(left) + toNumber(right);
      }
      if (typeof left === 'string' || typeof right === 'string') {
        return pyStr(left) + pyStr(right);
      }
      throw new RuntimeErrorMemingo("Operator '+' requires numbers or strings");
    }
    if (operator === '-') {
      this._requireNumbers(operator, left, right);
      return toNumber(left) - toNumber(right);
    }
    if (operator === '*') {
      this._requireNumbers(operator, left, right);
      return toNumber(left) * toNumber(right);
    }
    if (operator === '/') {
      this._requireNumbers(operator, left, right);
      const divisor = toNumber(right);
      if (divisor === 0) {
        throw new RuntimeErrorMemingo('Division by zero');
      }
      return toNumber(left) / divisor;
    }
    if (operator === '%') {
      this._requireNumbers(operator, left, right);
      const divisor = toNumber(right);
      if (divisor === 0) {
        throw new RuntimeErrorMemingo('Division by zero');
      }
      return pyModulo(toNumber(left), divisor);
    }
    if (operator === '==') return pyEquals(left, right);
    if (operator === '!=') return !pyEquals(left, right);
    if (['<', '>', '<=', '>='].includes(operator)) {
      return compareValues(operator, left, right);
    }
    throw new RuntimeErrorMemingo(`Unknown operator '${operator}'`);
  }

  _requireNumbers(operator, left, right) {
    if (!isNumeric(left) || !isNumeric(right)) {
      throw new RuntimeErrorMemingo(`Operator '${operator}' requires numbers`);
    }
  }

  _getMember(target, key) {
    if (Array.isArray(target)) {
      if (!isWholeArgument(key)) {
        throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
      }
      let index = toNumber(key);
      if (index < 0) index += target.length;
      if (index < 0 || index >= target.length) {
        throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
      }
      return target[index];
    }
    if (typeof target === 'string') {
      if (!isWholeArgument(key)) {
        throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
      }
      const chars = Array.from(target);
      let index = toNumber(key);
      if (index < 0) index += chars.length;
      if (index < 0 || index >= chars.length) {
        throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
      }
      return chars[index];
    }
    if (isObject(target)) {
      const property = String(key);
      if (!Object.prototype.hasOwnProperty.call(target, property)) {
        throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
      }
      return target[property];
    }
    throw new RuntimeErrorMemingo(`Cannot access ${this._repr(key)} on value`);
  }

  _repr(value) {
    if (typeof value === 'string') return JSON.stringify(value);
    if (value === null) return 'ghost';
    if (value === true) return 'based';
    if (value === false) return 'cringe';
    if (Array.isArray(value) || isObject(value)) return displayJson(value);
    return String(value);
  }

  _borrow(node) {
    const packageName = this.evaluate(node.package);
    if (typeof packageName !== 'string') {
      throw new RuntimeErrorMemingo('borrow requires a package name');
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(packageName)) {
      throw new RuntimeErrorMemingo(`Invalid package name '${packageName}'`);
    }
    const packageDir = path.join(this.projectDirectory, '.memingo', 'packages', packageName);
    const lockPath = path.join(this.projectDirectory, 'memingo.lock.json');
    let lock = {};
    if (fs.existsSync(lockPath)) {
      try {
        lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch (error) {
        throw new RuntimeErrorMemingo(`Could not read package lockfile: ${error.message}`);
      }
    }
    if (!isObject(lock)) {
      throw new RuntimeErrorMemingo('Package lockfile is invalid');
    }
    const dependencies = lock.dependencies ?? {};
    if (!isObject(dependencies)) {
      throw new RuntimeErrorMemingo('Package lockfile is invalid');
    }
    const record = dependencies[packageName];
    const entry = isObject(record) && record.entry !== undefined ? record.entry : 'main.mgo';
    if (typeof entry !== 'string' || !entry) {
      throw new RuntimeErrorMemingo(`Borrowed package '${packageName}' has an invalid entry point`);
    }
    const packageRoot = this._resolveProjectRoot(packageDir);
    const entryPath = path.resolve(packageDir, entry);
    if (entryPath !== packageRoot && !entryPath.startsWith(packageRoot + path.sep)) {
      throw new RuntimeErrorMemingo(`Borrowed package '${packageName}' has an unsafe entry point`);
    }
    if (!fs.existsSync(entryPath)) {
      throw new RuntimeErrorMemingo(`Borrowed package '${packageName}' is not installed`);
    }
    const moduleEnvironment = new Environment(this.environment);
    const previous = this.environment;
    this.environment = moduleEnvironment;
    try {
      let source;
      try {
        source = this._decodeUtf8(fs.readFileSync(entryPath));
      } catch (error) {
        if (error instanceof RuntimeErrorMemingo) throw error;
        throw new RuntimeErrorMemingo(`Borrowed package '${packageName}' is not valid UTF-8`);
      }
      const moduleProgram = parse(source);
      this.executeBlock(moduleProgram.statements, moduleEnvironment);
    } finally {
      this.environment = previous;
    }
    for (const [name, value] of moduleEnvironment.values.entries()) {
      this.environment.define(name, value);
    }
    return null;
  }

  _decodeUtf8(buffer) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch (error) {
      throw new RuntimeErrorMemingo(`Invalid UTF-8: ${error.message}`);
    }
  }

  _headcount(value) {
    if (typeof value === 'string') return codePointLength(value);
    if (Array.isArray(value)) return value.length;
    if (isObject(value)) return Object.keys(value).length;
    throw new RuntimeErrorMemingo('headcount() requires a list, object, or string');
  }

  _whatkind(value) {
    if (value === null || value === undefined) return 'ghost';
    if (typeof value === 'boolean') return 'based-or-cringe';
    if (typeof value === 'number') return 'whole';
    if (typeof value === 'string') return 'caption';
    if (Array.isArray(value) || isObject(value)) return 'party';
    if (value instanceof MemingoFunction) return 'ritual';
    return typeof value;
  }

  _jsonParse(text) {
    this._stringArgument('json_parse', text);
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new RuntimeErrorMemingo(`json_parse() failed: ${error.message}`);
    }
  }

  _env(name, fallback) {
    this._stringArgument('env', name, 'name');
    if (Object.prototype.hasOwnProperty.call(process.env, name)) {
      return process.env[name];
    }
    return fallback === undefined ? null : fallback;
  }

  _randomInt(low, high) {
    if (!isWholeArgument(low) || !isWholeArgument(high)) {
      throw new RuntimeErrorMemingo('random_int() expects whole numbers');
    }
    const minimum = toNumber(low);
    const maximum = toNumber(high);
    if (minimum > maximum) {
      throw new RuntimeErrorMemingo('random_int() requires low <= high');
    }
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  _shuffle(items) {
    this._listArgument('shuffle', items);
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  _range(...args) {
    if (args.length < 1 || args.length > 3) {
      throw new RuntimeErrorMemingo('range() expects 1 to 3 whole numbers');
    }
    if (args.some((value) => !isWhole(value))) {
      throw new RuntimeErrorMemingo('range() expects whole numbers');
    }
    let start = 0;
    let end;
    let step = 1;
    if (args.length === 1) {
      [end] = args;
    } else {
      [start, end] = args;
      if (args.length === 3) step = args[2];
    }
    if (step === 0) {
      throw new RuntimeErrorMemingo('range() step cannot be zero');
    }
    const result = [];
    if (step > 0) {
      for (let value = start; value < end; value += step) result.push(value);
    } else {
      for (let value = start; value > end; value += step) result.push(value);
    }
    return result;
  }

  _push(items, value) {
    if (!Array.isArray(items)) return null;
    items.push(value);
    return value;
  }

  _append(items, value) {
    if (!Array.isArray(items)) return null;
    items.push(value);
    return items.length;
  }

  _setValue(container, key, value) {
    if (Array.isArray(container)) {
      if (!isWholeArgument(key)) {
        throw new RuntimeErrorMemingo('set_value() list index must be a whole number');
      }
      let index = toNumber(key);
      if (index < 0) index += container.length;
      if (index < 0 || index >= container.length) {
        throw new RuntimeErrorMemingo(`set_value() list index ${index} is out of range`);
      }
      container[index] = value;
      return value;
    }
    if (isObject(container)) {
      container[String(key)] = value;
      return value;
    }
    return null;
  }

  _deleteKey(container, key) {
    if (!isObject(container)) return null;
    const property = String(key);
    if (!Object.prototype.hasOwnProperty.call(container, property)) return null;
    const value = container[property];
    delete container[property];
    return value;
  }

  _stringArgument(functionName, value, label = 'value') {
    if (typeof value !== 'string') {
      throw new RuntimeErrorMemingo(`${functionName}() requires a string ${label}`);
    }
    return value;
  }

  _numberArgument(functionName, value) {
    if (typeof value !== 'number') {
      throw new RuntimeErrorMemingo(`${functionName}() requires a number`);
    }
    return value;
  }

  _listArgument(functionName, value) {
    if (!Array.isArray(value)) {
      throw new RuntimeErrorMemingo(`${functionName}() requires a list`);
    }
    return value;
  }

  _split(text, separator) {
    text = this._stringArgument('split', text);
    if (separator === null || separator === undefined) {
      const trimmed = text.trim();
      return trimmed === '' ? [] : trimmed.split(/\s+/);
    }
    separator = this._stringArgument('split', separator, 'separator');
    if (separator === '') {
      throw new RuntimeErrorMemingo('split() separator cannot be empty');
    }
    return text.split(separator);
  }

  _join(items, separator) {
    items = this._listArgument('join', items);
    separator = this._stringArgument('join', separator, 'separator');
    return items.map((item) => displayValue(item)).join(separator);
  }

  _replace(text, oldText, newText) {
    text = this._stringArgument('replace', text);
    oldText = this._stringArgument('replace', oldText, 'old text');
    newText = this._stringArgument('replace', newText, 'new text');
    if (oldText === '') {
      return newText + Array.from(text).join(newText) + newText;
    }
    return text.split(oldText).join(newText);
  }

  _contains(container, value) {
    if (typeof container === 'string') {
      if (typeof value !== 'string') {
        throw new RuntimeErrorMemingo('contains() failed: a string container requires a string value');
      }
      return container.includes(value);
    }
    if (Array.isArray(container)) {
      return container.some((item) => pyEquals(item, value));
    }
    if (isObject(container)) {
      return Object.prototype.hasOwnProperty.call(container, String(value));
    }
    throw new RuntimeErrorMemingo('contains() requires a string, list, or object');
  }

  _startsWith(text, prefix) {
    text = this._stringArgument('starts_with', text);
    prefix = this._stringArgument('starts_with', prefix, 'prefix');
    return text.startsWith(prefix);
  }

  _endsWith(text, suffix) {
    text = this._stringArgument('ends_with', text);
    suffix = this._stringArgument('ends_with', suffix, 'suffix');
    return text.endsWith(suffix);
  }

  _memeCase(text) {
    text = this._stringArgument('meme_case', text);
    const result = [];
    let capital = true;
    for (const character of text) {
      if (/\p{L}/u.test(character)) {
        result.push(capital ? character.toUpperCase() : character.toLowerCase());
      } else {
        result.push(character);
      }
      capital = !capital;
    }
    return result.join('');
  }

  _slice(value, start, end) {
    if (typeof value !== 'string' && !Array.isArray(value)) {
      throw new RuntimeErrorMemingo('slice() requires a string or list');
    }
    if (!isWhole(start)) {
      throw new RuntimeErrorMemingo('slice() start must be a whole number');
    }
    if (end !== MISSING && !isWhole(end)) {
      throw new RuntimeErrorMemingo('slice() end must be a whole number');
    }
    const length = typeof value === 'string' ? codePointLength(value) : value.length;
    const from = normalizeSliceIndex(start, length, 0);
    const to = end === MISSING ? length : normalizeSliceIndex(end, length, length);
    if (typeof value === 'string') {
      return codePointSlice(value, from, to);
    }
    return value.slice(from, to);
  }

  _repeat(text, count) {
    text = this._stringArgument('repeat', text);
    if (!isWhole(count)) {
      throw new RuntimeErrorMemingo('repeat() count must be a whole number');
    }
    if (count < 0) {
      throw new RuntimeErrorMemingo('repeat() count must be zero or greater');
    }
    return text.repeat(count);
  }

  _lines(text) {
    text = this._stringArgument('lines', text);
    if (text === '') return [];
    const parts = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u);
    if (parts.length && parts[parts.length - 1] === '') {
      parts.pop();
    }
    return parts;
  }

  _sort(items, descending) {
    items = this._listArgument('sort', items);
    if (typeof descending !== 'boolean') {
      throw new RuntimeErrorMemingo('sort() descending must be based or cringe');
    }
    const copy = items.slice();
    const allNumeric = copy.every((value) => isNumeric(value));
    const allStrings = copy.every((value) => typeof value === 'string');
    if (!allNumeric && !allStrings && copy.length > 1) {
      throw new RuntimeErrorMemingo('sort() failed: values are not comparable');
    }
    copy.sort((left, right) => {
      let comparison;
      if (allNumeric) {
        const a = toNumber(left);
        const b = toNumber(right);
        comparison = a < b ? -1 : a > b ? 1 : 0;
      } else {
        comparison = left < right ? -1 : left > right ? 1 : 0;
      }
      return descending ? -comparison : comparison;
    });
    return copy;
  }

  _reverse(items) {
    if (typeof items === 'string') {
      return Array.from(items).reverse().join('');
    }
    return this._listArgument('reverse', items).slice().reverse();
  }

  _unique(items) {
    items = this._listArgument('unique', items);
    const result = [];
    for (const item of items) {
      if (!result.some((existing) => pyEquals(existing, item))) {
        result.push(item);
      }
    }
    return result;
  }

  _sum(items) {
    items = this._listArgument('sum', items);
    if (items.some((value) => typeof value !== 'number')) {
      throw new RuntimeErrorMemingo('sum() requires a list of numbers');
    }
    return items.reduce((total, value) => total + value, 0);
  }

  _numericArguments(functionName, values) {
    let candidates;
    if (values.length === 1 && Array.isArray(values[0])) {
      candidates = values[0];
    } else {
      candidates = values;
    }
    if (!candidates.length) {
      throw new RuntimeErrorMemingo(`${functionName}() requires at least one number`);
    }
    if (candidates.some((value) => typeof value !== 'number')) {
      throw new RuntimeErrorMemingo(`${functionName}() requires numbers`);
    }
    return candidates;
  }

  _min(...values) {
    return Math.min(...this._numericArguments('min', values));
  }

  _max(...values) {
    return Math.max(...this._numericArguments('max', values));
  }

  _round(value) {
    const floor = Math.floor(value);
    const difference = value - floor;
    if (difference < 0.5) return floor;
    if (difference > 0.5) return floor + 1;
    return floor % 2 === 0 ? floor : floor + 1;
  }

  _clamp(value, low, high) {
    value = this._numberArgument('clamp', value);
    low = this._numberArgument('clamp', low);
    high = this._numberArgument('clamp', high);
    if (low > high) {
      throw new RuntimeErrorMemingo('clamp() requires low <= high');
    }
    return Math.max(low, Math.min(value, high));
  }

  _parseInt(text) {
    text = this._stringArgument('parse_int', text).trim();
    if (!/^[+-]?\d+$/.test(text)) {
      throw new RuntimeErrorMemingo(`parse_int() failed: invalid literal for int(): '${text}'`);
    }
    return Number.parseInt(text, 10);
  }

  _parseFloat(text) {
    text = this._stringArgument('parse_float', text).trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
      if (!/^[+-]?(?:inf|infinity|nan)$/i.test(text)) {
        throw new RuntimeErrorMemingo(`parse_float() failed: could not convert string to float: '${text}'`);
      }
    }
    return Number(text);
  }

  _invoke(functionValue, args, label) {
    if (functionValue instanceof MemingoFunction) {
      return functionValue.call(this, args);
    }
    if (typeof functionValue === 'function') {
      try {
        return functionValue(...args);
      } catch (error) {
        if (error instanceof RuntimeErrorMemingo) throw error;
        throw new RuntimeErrorMemingo(`${label}() failed: ${error.message}`);
      }
    }
    throw new RuntimeErrorMemingo(`${label}() requires a function`);
  }

  _map(items, functionValue) {
    items = this._listArgument('map', items);
    return items.map((item) => this._invoke(functionValue, [item], 'map'));
  }

  _filter(items, functionValue) {
    items = this._listArgument('filter', items);
    return items.filter((item) => pyTruthy(this._invoke(functionValue, [item], 'filter')));
  }

  _reduce(items, functionValue, initial) {
    items = this._listArgument('reduce', items);
    if (!(functionValue instanceof MemingoFunction) && typeof functionValue !== 'function') {
      throw new RuntimeErrorMemingo('reduce() requires a function');
    }
    let accumulator;
    let remaining;
    if (initial === MISSING) {
      if (!items.length) {
        throw new RuntimeErrorMemingo('reduce() requires an initial value for an empty list');
      }
      [accumulator, ...remaining] = items;
    } else {
      accumulator = initial;
      remaining = items;
    }
    for (const item of remaining) {
      accumulator = this._invoke(functionValue, [accumulator, item], 'reduce');
    }
    return accumulator;
  }

  _sleep(seconds) {
    seconds = this._numberArgument('sleep', seconds);
    if (seconds < 0) {
      throw new RuntimeErrorMemingo('sleep() requires a non-negative number');
    }
    if (seconds > 0) {
      const buffer = new SharedArrayBuffer(4);
      Atomics.wait(new Int32Array(buffer), 0, 0, Math.floor(seconds * 1000));
    }
    return null;
  }

  _httpGet(url) {
    return this._httpRequest('GET', url, null);
  }

  _httpPost(url, payload) {
    return this._httpRequest('POST', url, pyTruthy(payload) ? payload : {});
  }

  _httpRequest(method, url, payload) {
    url = this._stringArgument(method === 'GET' ? 'http_get' : 'http_post', String(url), 'URL');
    const script = `
      const [method, url, payload] = process.argv.slice(1);
      (async () => {
        try {
          const options = {
            method,
            headers: { 'User-Agent': 'Memingo/0.2' },
          };
          if (method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = payload;
          }
          const response = await fetch(url, options);
          const body = await response.text();
          process.stdout.write(JSON.stringify({
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type') || '',
            body,
          }));
        } catch (error) {
          process.stdout.write(JSON.stringify({ error: String(error && error.message || error) }));
        }
      })();
    `;
    const requestArgs = process.pkg
      ? []
      : ['-e', script, method, url, JSON.stringify(payload ?? null)];
    const requestOptions = {
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    };
    if (process.pkg) {
      requestOptions.env = {
        ...process.env,
        MGO_HTTP_HELPER: '1',
        MGO_HTTP_METHOD: method,
        MGO_HTTP_URL: url,
        MGO_HTTP_PAYLOAD: JSON.stringify(payload ?? null),
      };
    }
    let result;
    try {
      const stdout = execFileSync(process.execPath, requestArgs, requestOptions);
      result = JSON.parse(stdout);
    } catch (error) {
      throw new RuntimeErrorMemingo(`${method === 'GET' ? 'http_get' : 'http_post'}() failed: ${error.message}`);
    }
    if (result.error) {
      throw new RuntimeErrorMemingo(`${method === 'GET' ? 'http_get' : 'http_post'}() failed: ${result.error}`);
    }
    if (!result.ok) {
      throw new RuntimeErrorMemingo(
        `${method === 'GET' ? 'http_get' : 'http_post'}() failed: HTTP ${result.status}`,
      );
    }
    if (result.contentType.includes('application/json')) {
      try {
        return JSON.parse(result.body);
      } catch (error) {
        throw new RuntimeErrorMemingo(
          `${method === 'GET' ? 'http_get' : 'http_post'}() failed: ${error.message}`,
        );
      }
    }
    return result.body;
  }

  _projectPath(functionName, filePath) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new RuntimeErrorMemingo(`${functionName}() requires a non-empty relative path`);
    }
    if (path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath)) {
      throw new RuntimeErrorMemingo(`${functionName}() requires a path inside the project`);
    }
    const resolved = path.resolve(this.projectDirectory, filePath);
    if (resolved !== this.projectDirectory && !resolved.startsWith(this.projectDirectory + path.sep)) {
      throw new RuntimeErrorMemingo(`${functionName}() cannot leave the project directory`);
    }
    let real = resolved;
    try {
      real = fs.realpathSync(resolved);
    } catch {
      try {
        real = path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved));
      } catch {
        real = resolved;
      }
    }
    if (real !== this.projectDirectory && !real.startsWith(this.projectDirectory + path.sep)) {
      throw new RuntimeErrorMemingo(`${functionName}() cannot leave the project directory`);
    }
    return resolved;
  }

  _readFile(filePath) {
    const target = this._projectPath('read_file', filePath);
    let stats;
    try {
      stats = fs.statSync(target);
    } catch {
      throw new RuntimeErrorMemingo(`read_file() could not find '${filePath}'`);
    }
    if (!stats.isFile()) {
      throw new RuntimeErrorMemingo(`read_file() could not find '${filePath}'`);
    }
    try {
      return this._decodeUtf8(fs.readFileSync(target));
    } catch (error) {
      if (error instanceof RuntimeErrorMemingo) {
        throw new RuntimeErrorMemingo(`read_file() requires a UTF-8 file: ${error.message}`);
      }
      throw new RuntimeErrorMemingo(`read_file() failed: ${error.message}`);
    }
  }

  _writeFile(filePath, contents) {
    const target = this._projectPath('write_file', filePath);
    if (typeof contents !== 'string') {
      throw new RuntimeErrorMemingo('write_file() requires string contents');
    }
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents, 'utf8');
    } catch (error) {
      throw new RuntimeErrorMemingo(`write_file() failed: ${error.message}`);
    }
    return codePointLength(contents);
  }

  _fileExists(filePath) {
    return fs.existsSync(this._projectPath('file_exists', filePath));
  }

  _listFiles(filePath) {
    const target = this._projectPath('list_files', filePath);
    let stats;
    try {
      stats = fs.statSync(target);
    } catch {
      throw new RuntimeErrorMemingo(`list_files() could not find directory '${filePath}'`);
    }
    if (!stats.isDirectory()) {
      throw new RuntimeErrorMemingo(`list_files() could not find directory '${filePath}'`);
    }
    return fs.readdirSync(target).sort();
  }
}

function execute(source, { projectDirectory = '.', captureOutput = true } = {}) {
  const interpreter = new Interpreter({ projectDirectory, captureOutput });
  interpreter.run(parse(source));
  return interpreter.output;
}

module.exports = {
  Environment,
  Interpreter,
  MemingoFunction,
  ReturnSignal,
  RuntimeErrorMemingo,
  displayValue,
  execute,
  jsonCompact,
  pyEquals,
  pyTruthy,
};
