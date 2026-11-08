'use strict';

const KEYWORDS = new Set([
  'vibe', 'ritual', 'drop', 'when', 'nah', 'grind', 'spill', 'borrow',
  'based', 'cringe', 'ghost',
]);

const TWO_CHARACTER = new Set(['==', '!=', '<=', '>=', '&&', '||']);

const SINGLE_KIND = {
  '+': 'PLUS',
  '-': 'MINUS',
  '*': 'STAR',
  '/': 'SLASH',
  '%': 'PERCENT',
  '=': 'EQUAL',
  '<': 'OP',
  '>': 'OP',
  '!': 'OP',
  '?': 'OP',
  '(': 'LPAREN',
  ')': 'RPAREN',
  '{': 'LBRACE',
  '}': 'RBRACE',
  '[': 'LBRACKET',
  ']': 'RBRACKET',
  ',': 'COMMA',
  ';': 'SEMICOLON',
  ':': 'COLON',
  '.': 'DOT',
};

const ESCAPES = { n: '\n', t: '\t', '"': '"', '\\': '\\' };

const LETTER = /\p{L}/u;
const ALNUM = /[\p{L}\p{N}]/u;
const DIGIT = /[0-9]/;

class LexerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LexerError';
  }
}

class Token {
  constructor(kind, value, line, column) {
    this.kind = kind;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

class Lexer {
  constructor(source) {
    this.source = source;
    this.index = 0;
    this.line = 1;
    this.column = 1;
  }

  tokenize() {
    const tokens = [];
    while (this.index < this.source.length) {
      const char = this.source[this.index];

      if (char === ' ' || char === '\t' || char === '\r') {
        this._advance();
      } else if (char === '\n') {
        tokens.push(new Token('NEWLINE', '\n', this.line, this.column));
        this._advance();
      } else if (char === '#') {
        while (this.index < this.source.length && this.source[this.index] !== '\n') {
          this._advance();
        }
      } else if (char === '"') {
        tokens.push(this._string());
      } else if (DIGIT.test(char)) {
        tokens.push(this._number());
      } else if (LETTER.test(char) || char === '_') {
        tokens.push(this._identifier());
      } else {
        const pair = this.source.slice(this.index, this.index + 2);
        if (TWO_CHARACTER.has(pair)) {
          tokens.push(new Token('OP', pair, this.line, this.column));
          this._advance();
          this._advance();
        } else if (Object.prototype.hasOwnProperty.call(SINGLE_KIND, char)) {
          tokens.push(new Token(SINGLE_KIND[char], char, this.line, this.column));
          this._advance();
        } else {
          throw new LexerError(
            `Unexpected character ${JSON.stringify(char)} at line ${this.line}, column ${this.column}`,
          );
        }
      }
    }

    tokens.push(new Token('EOF', null, this.line, this.column));
    return tokens;
  }

  _advance() {
    const char = this.source[this.index];
    this.index += 1;
    if (char === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return char;
  }

  _string() {
    const line = this.line;
    const column = this.column;
    this._advance();
    const result = [];
    while (this.index < this.source.length && this.source[this.index] !== '"') {
      const char = this._advance();
      if (char === '\\') {
        if (this.index >= this.source.length) {
          throw new LexerError(
            `Unfinished escape sequence at line ${line}, column ${column}`,
          );
        }
        const escaped = this._advance();
        if (!Object.prototype.hasOwnProperty.call(ESCAPES, escaped)) {
          throw new LexerError(
            `Unknown escape \\${escaped} at line ${line}, column ${column}`,
          );
        }
        result.push(ESCAPES[escaped]);
      } else if (char === '\n') {
        throw new LexerError(
          `Unterminated string at line ${line}, column ${column}`,
        );
      } else {
        result.push(char);
      }
    }
    if (this.index >= this.source.length) {
      throw new LexerError(
        `Unterminated string at line ${line}, column ${column}`,
      );
    }
    this._advance();
    return new Token('STRING', result.join(''), line, column);
  }

  _number() {
    const line = this.line;
    const column = this.column;
    const start = this.index;
    let dots = 0;
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (DIGIT.test(char)) {
        this._advance();
      } else if (char === '.' && dots === 0) {
        dots += 1;
        this._advance();
      } else {
        break;
      }
    }
    const text = this.source.slice(start, this.index);
    const value = Number(text);
    return new Token('NUMBER', value, line, column);
  }

  _identifier() {
    const line = this.line;
    const column = this.column;
    const start = this.index;
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (ALNUM.test(char) || char === '_') {
        this._advance();
      } else {
        break;
      }
    }
    const text = this.source.slice(start, this.index);
    const kind = KEYWORDS.has(text) ? text.toUpperCase() : 'IDENTIFIER';
    return new Token(kind, text, line, column);
  }
}

function tokenize(source) {
  return new Lexer(source).tokenize();
}

module.exports = {
  KEYWORDS,
  Lexer,
  LexerError,
  Token,
  tokenize,
};
