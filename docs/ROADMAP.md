# Node.mgo roadmap

The final goal is **full Memingo ecosystem preservation plus full Node.js 24 LTS runtime functionality**. The work is delivered in stages; stages are an implementation order, not a decision to omit features permanently.

## Stage 0 — Define and protect compatibility
- [x] Select Node.js 24 LTS as the compatibility target.
- [x] Record Memingo 0.2 as the initial compatibility baseline.
- [x] Pin the initial Node.js API reference to v24.22.2.
- [x] Create a Memingo language, standard-library, CLI and package-manager inventory from the upstream documentation.
- [x] Create a top-level Node.js 24 API inventory from the official documentation.
- [ ] Expand the Node.js API inventory into every documented symbol, overload, option, event, error and stability label.
- [ ] Establish automated baseline tests before changing or integrating either runtime.

## Stage 1 — Preserve the Memingo ecosystem
- [ ] Integrate the existing Memingo interpreter without changing its language semantics.
- [ ] Preserve all built-ins, standard-library functions and runtime helpers.
- [ ] Preserve projects, CLI, REPL, formatter, diagnostics and test commands.
- [ ] Preserve mgoa package management and package workflows.
- [ ] Preserve MemeCraft, website, installers, shell completions and VS Code support.
- [ ] Add regression tests proving existing Memingo projects still work.

## Stage 2 — JavaScript language engine in Memingo
- [ ] Lexer and complete tokenizer behavior for the selected ECMAScript target.
- [ ] Parser and syntax tree.
- [ ] JavaScript values, coercion, equality and property semantics.
- [ ] Scope, closures, functions and `this`.
- [ ] Complete target-edition statements and expressions.
- [ ] Classes, prototypes, modules and exceptions.
- [ ] Promises, async functions, generators and iteration protocols.
- [ ] ECMAScript built-ins and conformance tests.

## Stage 3 — Node.js 24 core runtime
- [ ] Globals and process lifecycle.
- [ ] Event loop, timers, events and asynchronous I/O.
- [ ] CommonJS and ECMAScript module loading.
- [ ] File system, paths, URLs and byte buffers.
- [ ] Streams and child-process APIs.
- [ ] Networking, HTTP, TLS and DNS.
- [ ] Diagnostics, errors, inspector/debugging and CLI behavior.
- [ ] Remaining public built-in modules in the Node.js 24 API documentation.

## Stage 4 — Unified developer ecosystem
- [ ] One CLI with reliable `.mgo` and `.js` dispatch.
- [ ] Shared project configuration without breaking either ecosystem.
- [ ] Package workflows that preserve mgoa and define npm interoperability.
- [ ] Documentation, editor support, formatting and debugging for both languages.
- [ ] Cross-language interoperability with explicit conversion rules.

## Stage 5 — Easy installation and compatibility verification
- [ ] Provide a simple installer for each supported operating system.
- [ ] Avoid requiring users to install upstream Node.js separately.
- [ ] Keep dependencies minimal and document them clearly.
- [ ] Run Memingo's full existing test suite as a release gate.
- [ ] Run JavaScript language conformance tests for the selected Node.js 24 target.
- [ ] Run Node.js 24 API tests.
- [ ] Publish a complete compatibility matrix and known limitations.
- [ ] Evaluate third-party npm package compatibility separately.
- [ ] Release versioned builds for supported platforms.

## Non-negotiable rules
- No Memingo feature is removed or silently changed for Node.js compatibility.
- No Node.js API is marked complete without implementation and tests.
- A staged release may have gaps, but the published compatibility matrix must show them.
- "Full compatibility" may be claimed only after the relevant conformance and regression suites pass.
