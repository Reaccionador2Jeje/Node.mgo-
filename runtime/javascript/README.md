# JavaScript engine implemented in Memingo

The JavaScript engine is a core part of Node.mgo. It must ultimately implement the complete ECMAScript edition selected by the project, rather than a permanent small language subset.

JavaScript source must be interpreted by the engine implemented in Memingo. It must not be forwarded to Node.js, V8, Python, or another JavaScript engine as a hidden execution dependency.

## Required engine layers
- Lexer and parser, including correct source locations.
- Complete syntax tree and language grammar for the target edition.
- Runtime values, objects, property descriptors and coercion.
- Lexical environments, closures, functions and `this`.
- Prototypes, classes and inheritance.
- Expressions, statements, control flow and exceptions.
- Iterators, generators, promises and async/await.
- ECMAScript built-ins and standard objects.
- CommonJS and ECMAScript module support as required by Node.js compatibility.

## Relationship to Node.js

This engine implements JavaScript language semantics. Node.js compatibility is a second layer that supplies host globals, built-in modules, process behavior, event loop, timers, files, streams, networking and other Node APIs.

Do not confuse ECMAScript compatibility with Node.js API compatibility: both are required for the project's full Node.js goal.

## Suggested source modules

The following are proposed module boundaries, not existing implementation files:
- `lexer.mgo`
- `parser.mgo`
- `ast.mgo`
- `values.mgo`
- `objects.mgo`
- `environment.mgo`
- `evaluator.mgo`
- `builtins.mgo`
- `promises.mgo`
- `modules.mgo`

## Quality requirements
- Follow the selected ECMAScript specification.
- Test evaluation order, coercion, scope and error behavior.
- Preserve source locations in syntax and runtime errors.
- Run conformance tests continuously.
- Document every known deviation; never mark a feature complete based on a placeholder.
