# Node.mgo roadmap

The final goal is **full Memingo ecosystem preservation plus full Node.js 24 LTS runtime functionality**. Work is delivered in verifiable stages; stages define implementation order, not permanent omissions.

## Stage 0 — Define and protect compatibility
- [x] Select Node.js 24 LTS as the compatibility target.
- [x] Record Memingo 0.2.0 as the initial compatibility baseline.
- [x] Pin the initial Node.js API reference to v24.22.2.
- [x] Pin the exact Memingo upstream commit used for the vendored source.
- [x] Create Memingo and Node.js feature inventories.
- [x] Write the implementation blueprint and architectural boundaries.
- [x] Add CI configuration for Memingo regression and Node.mgo integration tests.
- [ ] Expand Node.js coverage into every documented symbol, overload, option, event, error and stability label.
- [ ] Confirm green CI baseline across all supported platforms.

## Stage 1 — Preserve and execute Memingo
- [x] Vendor the original Memingo interpreter package without rewriting its language implementation.
- [x] Preserve lexer, parser, interpreter, built-ins, formatter, project tools, REPL and CLI modules.
- [x] Preserve the mgoa package-manager implementation and its command entry point.
- [x] Add a Node.mgo CLI bridge for .mgo files, Memingo commands and mgoa commands.
- [x] Vendor the upstream Memingo regression test suite.
- [x] Add Node.mgo CLI integration tests.
- [x] Preserve upstream Memingo documentation and BSD 3-Clause license.
- [ ] Run and confirm the upstream regression suite in CI.
- [ ] Vendor or otherwise pin the curated package catalog, examples and remaining Memingo distribution assets.
- [ ] Integrate MemeCraft, website, installers, shell completions and VS Code support into the unified distribution.
- [ ] Add regression tests proving real existing Memingo projects and package workflows work unchanged.

## Stage 2 — JavaScript language engine in Memingo
- [ ] Implement source positions, lexer and complete tokenizer behavior for the selected ECMAScript target.
- [ ] Implement parser, AST, precedence and automatic semicolon insertion.
- [ ] Implement JavaScript values, coercion, equality, objects and property descriptors.
- [ ] Implement lexical environments, closures, functions and this.
- [ ] Implement target-edition expressions, statements and control flow.
- [ ] Implement prototypes, classes, private fields and exceptions.
- [ ] Implement ECMAScript built-ins, collections, typed arrays and regular expressions.
- [ ] Implement iterators, generators, promises, async functions and job queues.
- [ ] Implement ECMAScript modules and CommonJS interoperability.
- [ ] Run language conformance tests and document deviations.

## Stage 3 — Node.js 24 core runtime
- [ ] Implement globals and process lifecycle.
- [ ] Implement event loop, timers, events and asynchronous I/O.
- [ ] Implement CommonJS and ECMAScript module resolution/loading.
- [ ] Implement filesystem, paths, URLs and byte buffers.
- [ ] Implement streams, backpressure, pipelines and async iteration.
- [ ] Implement child-process and worker APIs.
- [ ] Implement networking, HTTP, HTTP/2, TLS and DNS.
- [ ] Implement crypto, compression, diagnostics, inspector and test runner.
- [ ] Implement remaining public built-in modules and documented CLI behavior.
- [ ] Maintain a symbol-level API ledger with tests and stability labels.

## Stage 4 — Unified developer ecosystem
- [ ] Provide reliable .mgo, .js, .mjs and .cjs dispatch.
- [ ] Preserve mgoa and Memingo project manifests/lockfiles.
- [ ] Add Node-style package.json, package-lock.json, node_modules and npm-compatible workflows.
- [ ] Support pure-JavaScript package resolution and conditional exports.
- [ ] Define explicit cross-language interoperability and value conversions.
- [ ] Provide editor support, formatting, diagnostics and debugging for both languages.

## Stage 5 — Platform host and security
- [ ] Define narrow platform adapters for files, sockets, process, clocks, terminal, crypto and threads.
- [ ] Document each host primitive's contract and platform support.
- [ ] Add explicit permissions for filesystem, network, process and environment access.
- [ ] Test archive extraction, integrity checks and package lifecycle behavior.
- [ ] Define a separate strategy for native addons and ABI compatibility.

## Stage 6 — Installation and compatibility verification
- [ ] Provide simple installers for supported operating systems.
- [ ] Avoid requiring upstream Node.js separately.
- [ ] Minimize and document host dependencies; Python 3.10+ is required by the current Memingo bridge.
- [ ] Run Memingo's complete existing test suite as a release gate.
- [ ] Run JavaScript language conformance tests for the selected target.
- [ ] Run Node.js 24 API tests and CLI behavior tests.
- [ ] Test installation, upgrade and uninstall on supported platforms.
- [ ] Publish a compatibility matrix and known limitations.
- [ ] Evaluate third-party npm package compatibility separately.

## Non-negotiable rules
- No Memingo feature is removed or silently changed for Node.js compatibility.
- No Node.js API is marked complete without implementation and tests.
- Deprecated and experimental APIs retain their documented status labels.
- A staged release may have gaps, but the published compatibility matrix must show them.
- Native addon and third-party package compatibility must be measured, not assumed.
- "Full compatibility" may be claimed only after the relevant conformance and regression suites pass.
