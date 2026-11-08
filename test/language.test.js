'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { execute, RuntimeErrorMemingo } = require('../src/interpreter');
const { ParseError } = require('../src/parser');

function temporaryProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'node-mgo-test-'));
}

test('variables and output', () => {
  const output = execute('vibe name = "Memingo"\nspill "Hola " + name');
  assert.deepEqual(output, ['Hola Memingo']);
});

test('condition', () => {
  const output = execute('when 8 > 3 { spill "based" } nah { spill "cringe" }');
  assert.deepEqual(output, ['based']);
});

test('while loop and assignment', () => {
  const output = execute('vibe i = 0\ngrind i < 3 { spill i\ni = i + 1 }');
  assert.deepEqual(output, ['0', '1', '2']);
});

test('function and recursion', () => {
  const output = execute(
    'ritual factorial(n) { when n <= 1 { drop 1 } drop n * factorial(n - 1) }\nspill factorial(5)',
  );
  assert.deepEqual(output, ['120']);
});

test('lists and builtin', () => {
  const output = execute('vibe values = [1, 2, 3]\nspill headcount(values)');
  assert.deepEqual(output, ['3']);
});

test('division by zero', () => {
  assert.throws(() => execute('spill 10 / 0'), RuntimeErrorMemingo);
});

test('invalid syntax', () => {
  assert.throws(() => execute('vibe = 4'), ParseError);
});

test('objects, lists and JSON', () => {
  const output = execute(
    'vibe user = {name: "Ana", role: "dev"}\nvibe users = [user]\nspill user.name\nspill json_stringify(users)',
  );
  assert.deepEqual(output, ['Ana', '[{"name":"Ana","role":"dev"}]']);
});

test('mutable collections', () => {
  const output = execute(
    'vibe values = []\npush(values, "based")\nset_value(values, 0, "cringe")\nspill values[0]',
  );
  assert.deepEqual(output, ['cringe']);
});

test('multiline lists and objects', () => {
  const source = [
    'vibe world = {',
    '  name: "MemeCraft",',
    '  day: based,',
    '  size: 30',
    '}',
    'vibe materials = [',
    '  {name: "grass", solid: based},',
    '  {name: "stone", solid: cringe},',
    ']',
    'spill world.name',
    'spill headcount(materials)',
    'spill materials[1].name',
  ].join('\n');
  assert.deepEqual(execute(source), ['MemeCraft', '2', 'stone']);
});

test('multiline parameters', () => {
  const source = [
    'ritual add(',
    '  a,',
    '  b,',
    ') {',
    '  drop a + b',
    '}',
    'spill add(',
    '  1,',
    '  2,',
    ')',
  ].join('\n');
  assert.deepEqual(execute(source), ['3']);
});

test('builtin errors are wrapped', () => {
  assert.throws(
    () => execute('spill headcount(1)'),
    (error) => error instanceof RuntimeErrorMemingo && /headcount/.test(error.message),
  );
});

test('whatkind and borrow validation', () => {
  const output = execute(
    'spill whatkind(based)\nspill whatkind(1)\nspill whatkind("x")\nspill whatkind(ghost)',
  );
  assert.deepEqual(output, ['based-or-cringe', 'whole', 'caption', 'ghost']);
  assert.throws(() => execute('borrow "../escape"'), RuntimeErrorMemingo);
});

test('JSON round trip', () => {
  const output = execute(
    'vibe value = json_parse("{\\"meme\\":\\"based\\"}")\nspill value["meme"]',
  );
  assert.deepEqual(output, ['based']);
});

test('string builtins', () => {
  const source = [
    'vibe text = "  Memingo Rocks  "',
    'spill trim(text)',
    'spill upper("meme")',
    'spill lower("MEME")',
    'spill replace("meme life", "meme", "based")',
    'spill join(split("a,b,c", ","), "-")',
    'spill contains("memingo", "ming")',
    'spill starts_with("memingo", "mem")',
    'spill ends_with("memingo", "go")',
    'spill slice([1, 2, 3, 4], 1, 3)',
  ].join('\n');
  assert.deepEqual(execute(source), [
    'Memingo Rocks',
    'MEME',
    'meme',
    'based life',
    'a-b-c',
    'based',
    'based',
    'based',
    '[2, 3]',
  ]);
});

test('collection builtins', () => {
  const source = [
    'vibe values = [3, 1, 2]',
    'spill sort(values)',
    'spill reverse(values)',
    'spill sum(values)',
    'spill min(values)',
    'spill max(values)',
    'spill values',
  ].join('\n');
  assert.deepEqual(execute(source), [
    '[1, 2, 3]',
    '[2, 1, 3]',
    '6',
    '1',
    '3',
    '[3, 1, 2]',
  ]);
});

test('higher order builtins', () => {
  const source = [
    'ritual double(n) { drop n * 2 }',
    'ritual even(n) { drop n % 2 == 0 }',
    'ritual combine(a, b) { drop a + b }',
    'spill map([1, 2, 3], double)',
    'spill filter([1, 2, 3, 4], even)',
    'spill reduce([1, 2, 3, 4], combine, 0)',
  ].join('\n');
  assert.deepEqual(execute(source), ['[2, 4, 6]', '[2, 4]', '10']);
});

test('math and range builtins', () => {
  const source = [
    'spill abs(-7)',
    'spill floor(2.9)',
    'spill ceil(2.1)',
    'spill round(2.6)',
    'spill clamp(12, 0, 10)',
    'spill parse_int("42")',
    'spill parse_float("2.5")',
    'spill range(2, 8, 2)',
    'spill values({a: 1, b: 2})',
  ].join('\n');
  assert.deepEqual(execute(source), ['7', '2', '3', '3', '10', '42', '2.5', '[2, 4, 6]', '[1, 2]']);
});

test('playful builtins', () => {
  const output = execute(
    'spill meme_case("hello memingo")\nvibe cards = ["a", "b", "c"]\nspill shuffle(cards)\nvibe id = uuid()\nspill headcount(id)',
  );
  assert.equal(output[0], 'HeLlO MeMiNgO');
  assert.deepEqual(
    output[1].slice(1, -1).replace(/"/g, '').split(', ').sort(),
    ['a', 'b', 'c'],
  );
  assert.equal(output[2], '36');
});

test('builtin argument validation', () => {
  assert.throws(
    () => execute('spill upper(3)'),
    (error) => error instanceof RuntimeErrorMemingo && /upper/.test(error.message),
  );
  assert.throws(() => execute('spill map("nope", upper)'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill reduce([], upper)'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill parse_int("not-a-number")'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill meme_case(42)'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill shuffle("not-a-list")'), RuntimeErrorMemingo);
});

test('text helpers repeat lines and unique', () => {
  const source = [
    'spill repeat("ab", 3)',
    'spill lines("uno\\ndos\\ntres")',
    'spill unique([1, 2, 2, 3, 1])',
  ].join('\n');
  assert.deepEqual(execute(source), ['ababab', '["uno", "dos", "tres"]', '[1, 2, 3]']);
});

test('text helpers validate arguments', () => {
  assert.throws(() => execute('spill repeat("ab", -1)'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill repeat(1, 2)'), RuntimeErrorMemingo);
  assert.throws(() => execute('spill unique("nope")'), RuntimeErrorMemingo);
});

test('file builtins stay inside project', () => {
  const root = temporaryProject();
  const written = execute('spill write_file("notes/hello.txt", "hola")', {
    projectDirectory: root,
  });
  assert.deepEqual(written, ['4']);
  assert.ok(fs.existsSync(path.join(root, 'notes', 'hello.txt')));

  const output = execute(
    'spill read_file("notes/hello.txt")\nspill file_exists("notes/hello.txt")\nspill file_exists("notes/missing.txt")\nspill list_files("notes")',
    { projectDirectory: root },
  );
  assert.deepEqual(output, ['hola', 'based', 'cringe', '["hello.txt"]']);
});

test('file builtins reject escaping paths', () => {
  const root = temporaryProject();
  assert.throws(
    () => execute('spill write_file("../escape.txt", "nope")', { projectDirectory: root }),
    RuntimeErrorMemingo,
  );
  assert.throws(
    () => execute('spill read_file("/etc/passwd")', { projectDirectory: root }),
    RuntimeErrorMemingo,
  );
  assert.equal(fs.existsSync(path.join(path.dirname(root), 'escape.txt')), false);
});
