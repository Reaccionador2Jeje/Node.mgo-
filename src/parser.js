'use strict';

const { tokenize } = require('./lexer');

class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
  }
}

class Program {
  constructor(statements) {
    this.type = 'Program';
    this.statements = statements;
  }
}

class Borrow {
  constructor(packageName) {
    this.type = 'Borrow';
    this.package = packageName;
  }
}

class Let {
  constructor(name, value) {
    this.type = 'Let';
    this.name = name;
    this.value = value;
  }
}

class Assign {
  constructor(name, value) {
    this.type = 'Assign';
    this.name = name;
    this.value = value;
  }
}

class Say {
  constructor(value) {
    this.type = 'Say';
    this.value = value;
  }
}

class Return {
  constructor(value) {
    this.type = 'Return';
    this.value = value;
  }
}

class If {
  constructor(condition, thenBranch, elseBranch) {
    this.type = 'If';
    this.condition = condition;
    this.then_branch = thenBranch;
    this.else_branch = elseBranch;
  }
}

class While {
  constructor(condition, body) {
    this.type = 'While';
    this.condition = condition;
    this.body = body;
  }
}

class FunctionDecl {
  constructor(name, params, body) {
    this.type = 'Function';
    this.name = name;
    this.params = params;
    this.body = body;
  }
}

class Literal {
  constructor(value) {
    this.type = 'Literal';
    this.value = value;
  }
}

class Variable {
  constructor(name) {
    this.type = 'Variable';
    this.name = name;
  }
}

class ListExpression {
  constructor(items) {
    this.type = 'ListExpression';
    this.items = items;
  }
}

class MapExpression {
  constructor(entries) {
    this.type = 'MapExpression';
    this.entries = entries;
  }
}

class Get {
  constructor(target, key) {
    this.type = 'Get';
    this.target = target;
    this.key = key;
  }
}

class Binary {
  constructor(operator, left, right) {
    this.type = 'Binary';
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

class Unary {
  constructor(operator, operand) {
    this.type = 'Unary';
    this.operator = operator;
    this.operand = operand;
  }
}

class Call {
  constructor(callee, args) {
    this.type = 'Call';
    this.callee = callee;
    this.arguments = args;
  }
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  parse() {
    const statements = [];
    this._skipSeparators();
    while (!this._check('EOF')) {
      statements.push(this._statement());
      this._skipSeparators();
    }
    return new Program(statements);
  }

  _statement() {
    const token = this._peek();
    const node = this._statementImpl();
    if (node && typeof node === 'object') {
      node.line = token.line;
      node.column = token.column;
    }
    return node;
  }

  _statementImpl() {
    if (this._match('VIBE')) return this._letStatement();
    if (this._match('RITUAL')) return this._functionStatement();
    if (this._match('WHEN')) return this._ifStatement();
    if (this._match('GRIND')) return this._whileStatement();
    if (this._match('DROP')) return new Return(this._expression());
    if (this._match('SPILL')) return new Say(this._expression());
    if (this._match('BORROW')) return new Borrow(this._expression());
    if (this._check('IDENTIFIER')) {
      const name = this._advance().value;
      if (this._match('EQUAL')) {
        return new Assign(name, this._expression());
      }
      this.index -= 1;
    }
    return this._expression();
  }

  _letStatement() {
    const name = this._consume('IDENTIFIER', "Expected variable name after 'vibe'").value;
    this._consume('EQUAL', "Expected '=' after variable name");
    return new Let(name, this._expression());
  }

  _functionStatement() {
    const name = this._consume('IDENTIFIER', 'Expected function name').value;
    this._consume('LPAREN', "Expected '(' after function name");
    this._skipSeparators();
    const params = [];
    if (!this._check('RPAREN')) {
      params.push(this._consume('IDENTIFIER', 'Expected parameter name').value);
      while (true) {
        this._skipSeparators();
        if (!this._match('COMMA')) break;
        this._skipSeparators();
        if (this._check('RPAREN')) break;
        params.push(this._consume('IDENTIFIER', 'Expected parameter name').value);
      }
    }
    this._skipSeparators();
    this._consume('RPAREN', "Expected ')' after parameters");
    return new FunctionDecl(name, params, this._block());
  }

  _ifStatement() {
    const condition = this._expression();
    const thenBranch = this._block();
    let elseBranch = [];
    if (this._match('NAH')) {
      elseBranch = this._block();
    }
    return new If(condition, thenBranch, elseBranch);
  }

  _whileStatement() {
    const condition = this._expression();
    return new While(condition, this._block());
  }

  _block() {
    this._consume('LBRACE', "Expected '{' to start a block");
    const statements = [];
    this._skipSeparators();
    while (!this._check('RBRACE') && !this._check('EOF')) {
      statements.push(this._statement());
      this._skipSeparators();
    }
    this._consume('RBRACE', "Expected '}' after block");
    return statements;
  }

  _expression() {
    return this._or();
  }

  _or() {
    let expr = this._and();
    while (this._match('OP', '||')) {
      expr = new Binary('||', expr, this._and());
    }
    return expr;
  }

  _and() {
    let expr = this._equality();
    while (this._match('OP', '&&')) {
      expr = new Binary('&&', expr, this._equality());
    }
    return expr;
  }

  _equality() {
    let expr = this._comparison();
    while (this._check('OP') && ['==', '!='].includes(this._peek().value)) {
      const operator = this._advance().value;
      expr = new Binary(operator, expr, this._comparison());
    }
    return expr;
  }

  _comparison() {
    let expr = this._term();
    while (this._check('OP') && ['<', '>', '<=', '>='].includes(this._peek().value)) {
      const operator = this._advance().value;
      expr = new Binary(operator, expr, this._term());
    }
    return expr;
  }

  _term() {
    let expr = this._factor();
    while (this._check('PLUS') || this._check('MINUS')) {
      const operator = this._advance().value;
      expr = new Binary(operator, expr, this._factor());
    }
    return expr;
  }

  _factor() {
    let expr = this._unary();
    while (this._check('STAR') || this._check('SLASH') || this._check('PERCENT')) {
      const operator = this._advance().value;
      expr = new Binary(operator, expr, this._unary());
    }
    return expr;
  }

  _unary() {
    if (this._check('OP') && ['!', '-'].includes(this._peek().value)) {
      const operator = this._advance().value;
      return new Unary(operator, this._unary());
    }
    if (this._match('MINUS')) {
      return new Unary('-', this._unary());
    }
    return this._call();
  }

  _call() {
    let expr = this._primary();
    while (true) {
      if (this._match('LPAREN')) {
        const args = [];
        this._skipSeparators();
        if (!this._check('RPAREN')) {
          args.push(this._expression());
          while (true) {
            this._skipSeparators();
            if (!this._match('COMMA')) break;
            this._skipSeparators();
            if (this._check('RPAREN')) break;
            args.push(this._expression());
          }
        }
        this._skipSeparators();
        this._consume('RPAREN', "Expected ')' after arguments");
        expr = new Call(expr, args);
      } else if (this._match('DOT')) {
        const key = this._consume('IDENTIFIER', "Expected property name after '.'").value;
        expr = new Get(expr, new Literal(key));
      } else if (this._match('LBRACKET')) {
        this._skipSeparators();
        const key = this._expression();
        this._skipSeparators();
        this._consume('RBRACKET', "Expected ']' after index");
        expr = new Get(expr, key);
      } else {
        break;
      }
    }
    return expr;
  }

  _primary() {
    if (this._match('NUMBER')) return new Literal(this._previous().value);
    if (this._match('STRING')) return new Literal(this._previous().value);
    if (this._match('BASED')) return new Literal(true);
    if (this._match('CRINGE')) return new Literal(false);
    if (this._match('GHOST')) return new Literal(null);
    if (this._match('IDENTIFIER')) return new Variable(this._previous().value);
    if (this._match('LPAREN')) {
      const expr = this._expression();
      this._consume('RPAREN', "Expected ')' after expression");
      return expr;
    }
    if (this._match('LBRACKET')) {
      const items = [];
      this._skipSeparators();
      if (!this._check('RBRACKET')) {
        items.push(this._expression());
        while (true) {
          this._skipSeparators();
          if (!this._match('COMMA')) break;
          this._skipSeparators();
          if (this._check('RBRACKET')) break;
          items.push(this._expression());
        }
      }
      this._skipSeparators();
      this._consume('RBRACKET', "Expected ']' after list");
      return new ListExpression(items);
    }
    if (this._match('LBRACE')) {
      const entries = [];
      this._skipSeparators();
      if (!this._check('RBRACE')) {
        while (true) {
          const key = this._consume('IDENTIFIER', 'Expected object key').value;
          this._consume('COLON', "Expected ':' after object key");
          entries.push([key, this._expression()]);
          this._skipSeparators();
          if (!this._match('COMMA')) break;
          this._skipSeparators();
          if (this._check('RBRACE')) break;
        }
      }
      this._skipSeparators();
      this._consume('RBRACE', "Expected '}' after object");
      return new MapExpression(entries);
    }
    const token = this._peek();
    throw new ParseError(
      `Unexpected token ${JSON.stringify(token.value)} at line ${token.line}, column ${token.column}`,
    );
  }

  _skipSeparators() {
    while (this._match('NEWLINE') || this._match('SEMICOLON')) {
      // Keep skipping blank lines and semicolons.
    }
  }

  _match(kind, value = undefined) {
    if (this._check(kind) && (value === undefined || this._peek().value === value)) {
      this._advance();
      return true;
    }
    return false;
  }

  _check(kind) {
    return this._peek().kind === kind;
  }

  _advance() {
    if (!this._check('EOF')) {
      this.index += 1;
    }
    return this.tokens[this.index - 1];
  }

  _previous() {
    return this.tokens[this.index - 1];
  }

  _peek() {
    return this.tokens[this.index];
  }

  _consume(kind, message) {
    if (this._check(kind)) {
      return this._advance();
    }
    const token = this._peek();
    throw new ParseError(`${message} at line ${token.line}, column ${token.column}`);
  }
}

function parse(source) {
  const tokens = tokenize(source);
  return new Parser(tokens).parse();
}

module.exports = {
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
  ParseError,
  Parser,
  Program,
  Return,
  Say,
  Unary,
  Variable,
  While,
  parse,
};
