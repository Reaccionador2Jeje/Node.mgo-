# Node.mgo roadmap

This roadmap separates project structure from working runtime features.

## Stage 0 — Repository foundation

- [x] Define runtime boundaries.
- [x] Define extension dispatch goals.
- [x] Document compatibility policy.
- [ ] Add implementation and test harness.

## Stage 1 — Memingo launcher

- [ ] Add the `node-mgo` command.
- [ ] Resolve input paths and file extensions.
- [ ] Route `.mgo` files to the native Memingo runtime.
- [ ] Report clear errors for missing files and unknown extensions.

## Stage 2 — JavaScript language core

- [ ] Tokenizer.
- [ ] Parser and syntax tree.
- [ ] Primitive values and variables.
- [ ] Arithmetic, comparisons, and logical expressions.
- [ ] Blocks, conditionals, and loops.
- [ ] Functions and lexical scope.
- [ ] Exceptions.

## Stage 3 — Runtime APIs

- [ ] Console output.
- [ ] Process arguments and environment.
- [ ] Timers and events.
- [ ] Path and URL utilities.
- [ ] File-system API with explicit safety boundaries.

## Stage 4 — Networking and streams

- [ ] HTTP client/server subset.
- [ ] Stream primitives.
- [ ] Buffer-like byte data.

## Stage 5 — Compatibility and releases

- [ ] Automated language tests.
- [ ] Node-inspired API compatibility tests.
- [ ] Document unsupported features.
- [ ] Versioned releases and migration notes.

## Scope rule

A checked item means the feature has working code and tests. Documentation or a placeholder does not count as implementation.
