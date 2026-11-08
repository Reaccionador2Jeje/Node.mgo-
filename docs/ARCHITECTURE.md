# Node.mgo architecture

Node.mgo is a Node.js-inspired runtime project built around Memingo. The long-term goal is to run native Memingo programs and JavaScript programs through language implementations hosted by Memingo itself.

## Runtime goals

- `.mgo`: execute with the Memingo runtime.
- `.js`: execute with a JavaScript interpreter implemented in Memingo.
- `node-mgo`: provide a familiar command-line entry point.
- Node-inspired APIs: introduce compatible subsets gradually and document differences.

## Runtime boundaries

```text
node-mgo CLI
    |
    +-- file resolver
    |
    +-- extension dispatch
          |
          +-- .mgo -> Memingo runtime
          |
          +-- .js  -> JavaScript-in-Memingo interpreter
```

The JavaScript interpreter must not silently delegate JavaScript execution to Node.js, V8, or Python. Memingo may be used as the implementation language and host environment.

## Proposed JavaScript implementation layers

1. Source reader and tokenizer.
2. Parser and syntax tree.
3. Runtime values and lexical environments.
4. Expression and statement evaluator.
5. Functions, control flow, and exceptions.
6. Modules and selected host APIs.

This is a staged design, not a claim that these features already exist.

## Compatibility strategy

Implement small, testable subsets. Publish a compatibility table that distinguishes:

- implemented behavior;
- partial behavior;
- planned behavior;
- unsupported behavior.

Do not describe Node.mgo as fully Node.js-compatible until conformance tests support that claim.

## Initial API direction

The following are design targets, not implemented APIs:

- `console`
- `process`
- timers and events
- `path`, `url`, and `fs`
- HTTP and streams
- `Buffer`

Each API should have documented semantics and tests before being marked supported.
