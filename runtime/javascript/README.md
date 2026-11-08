# JavaScript interpreter (implemented in Memingo)

The `.js` runtime is intended to be an interpreter written in Memingo. It is not a wrapper that forwards source code to Node.js or V8.

## Suggested module boundaries

- `lexer.mgo`: source text to tokens.
- `parser.mgo`: tokens to syntax tree.
- `values.mgo`: JavaScript runtime values.
- `environment.mgo`: lexical environments and bindings.
- `evaluator.mgo`: expressions and statements.
- `builtins.mgo`: language-level built-ins.
- `modules.mgo`: module loading, once designed.

These are proposed boundaries. Files should be added as each component becomes implementable.

## First language subset

Start with a deliberately small subset:

- numeric, string, boolean, and null-like literals;
- variable declarations;
- arithmetic and comparison expressions;
- blocks and conditional statements;
- function declarations and calls;
- console output supplied by the host runtime.

Add arrays, objects, loops, exceptions, and modules in later increments.

## Correctness requirements

- Track source locations for syntax and runtime errors.
- Keep lexical scope separate from object properties.
- Test operator precedence and evaluation order.
- Do not label a feature supported until tests pass.
