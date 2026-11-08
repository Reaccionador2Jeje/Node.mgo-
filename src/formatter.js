'use strict';

const fs = require('node:fs');

const OPENING = new Set(['(', '[', '{']);
const CLOSING = new Set([')', ']', '}']);

function expandTabs(line, tabSize = 4) {
  let result = '';
  let column = 0;
  for (const character of line) {
    if (character === '\t') {
      const spaces = tabSize - (column % tabSize);
      result += ' '.repeat(spaces);
      column += spaces;
    } else {
      result += character;
      column += 1;
    }
  }
  return result;
}

function splitLines(text) {
  if (text === '') return [];
  const parts = text.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/u);
  if (parts.length && parts[parts.length - 1] === '') {
    parts.pop();
  }
  return parts;
}

function delimiterDelta(line) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const character of line) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '#') break;
    if (character === '"') {
      inString = true;
    } else if (OPENING.has(character)) {
      depth += 1;
    } else if (CLOSING.has(character)) {
      depth -= 1;
    }
  }
  return depth;
}

function leadingClosers(line) {
  let count = 0;
  for (const character of line.trim()) {
    if (/\s/.test(character)) continue;
    if (CLOSING.has(character)) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function formatSource(source) {
  const expanded = splitLines(source).map((line) => expandTabs(line, 4));
  let depth = 0;
  const formatted = [];
  for (const rawLine of expanded) {
    const line = rawLine.trim();
    if (!line) {
      formatted.push('');
      continue;
    }
    const indentDepth = Math.max(0, depth - leadingClosers(line));
    formatted.push('    '.repeat(indentDepth) + line);
    depth = Math.max(0, depth + delimiterDelta(line));
  }
  return `${formatted.join('\n').replace(/\s+$/, '')}\n`;
}

function formatFile(filePath, { write = false } = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const formatted = formatSource(source);
  if (write) {
    fs.writeFileSync(filePath, formatted, 'utf8');
  }
  return formatted;
}

module.exports = {
  delimiterDelta,
  expandTabs,
  formatFile,
  formatSource,
  leadingClosers,
  splitLines,
};
