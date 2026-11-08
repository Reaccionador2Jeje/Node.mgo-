'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { formatFile, formatSource } = require('../src/formatter');

test('indentation handles nested blocks', () => {
  const source = [
    'ritual f(n) {',
    'when n <= 1 {',
    'drop 1',
    '}',
    'drop n * f(n - 1)',
    '}',
    '',
  ].join('\n');
  assert.equal(
    formatSource(source),
    [
      'ritual f(n) {',
      '    when n <= 1 {',
      '        drop 1',
      '    }',
      '    drop n * f(n - 1)',
      '}',
      '',
    ].join('\n'),
  );
});

test('multiline collections and trailing commas', () => {
  const source = [
    'vibe world = {',
    'name: "MemeCraft",',
    'size: 30',
    '}',
    'vibe items = [',
    'item,',
    ']',
    '',
  ].join('\n');
  assert.equal(
    formatSource(source),
    [
      'vibe world = {',
      '    name: "MemeCraft",',
      '    size: 30',
      '}',
      'vibe items = [',
      '    item,',
      ']',
      '',
    ].join('\n'),
  );
});

test('strings and comments do not change depth', () => {
  const source = 'spill "brace } in string" # comment {\nvibe x = 1\n';
  assert.equal(formatSource(source), source);
});

test('formatting is idempotent', () => {
  const source = 'vibe items = [\n{name: "grass"},\n{name: "stone"},\n]\n';
  const once = formatSource(source);
  assert.equal(formatSource(once), once);
});

test('format file write', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'node-mgo-fmt-'));
  const file = path.join(directory, 'main.mgo');
  fs.writeFileSync(file, 'vibe x = 1\nvibe y = 2\n');
  const formatted = formatFile(file);
  assert.equal(formatted, 'vibe x = 1\nvibe y = 2\n');
  formatFile(file, { write: true });
  assert.equal(fs.readFileSync(file, 'utf8'), formatted);
});
