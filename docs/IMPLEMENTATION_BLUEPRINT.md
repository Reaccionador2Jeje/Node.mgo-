# Node.mgo implementation blueprint

This document turns the compatibility goal into an implementable design. It is a plan, not a claim that these components already exist.

## 1. Product definition

Node.mgo is one installable developer runtime with two first-class languages:

- **Memingo**: preserve the complete Memingo 0.2 language and shipped ecosystem.
- **JavaScript**: implement the ECMAScript language behavior targeted by Node.js 24, then provide the Node.js 24 host API surface.

The command name is **node-mgo**. The runtime must not require a separate upstream Node.js installation. The selected Node.js release is a behavior and API compatibility reference, not code that Node.mgo secretly launches.

## 2. Architecture: language engine vs platform host

A practical implementation needs three layers:

1. **Memingo engine layer** — the Memingo interpreter and its standard library remain intact. The JavaScript lexer, parser, AST, values, evaluator, built-ins and module semantics are implemented as Memingo source modules.
2. **Small platform host layer** — narrowly scoped operating-system adapters provide primitive operations that a language interpreter cannot perform by itself: file descriptors, sockets, process creation, clocks, terminal access, threads, cryptographic primitives and native library loading where supported. These adapters are not a second JavaScript engine and must not evaluate JavaScript.
3. **Node compatibility layer** — Node.js globals, built-in modules, module resolution, process behavior, timers, streams, diagnostics and CLI semantics are implemented on top of the JavaScript engine and documented host primitives.

This avoids two unrealistic extremes: pretending pure Memingo source can access every operating-system facility without a host boundary, or hiding a bundled V8/Node runtime behind a wrapper. Every host primitive must have a narrow contract, tests, platform notes and a documented security boundary.

## 3. Proposed repository layout

These are target directories; create them as implementation begins.

    cmd/
      node-mgo/
    runtime/
      memingo/
      javascript/
        lexer.mgo
        parser.mgo
        ast.mgo
        values.mgo
        objects.mgo
        environment.mgo
        evaluator.mgo
        builtins/
        promises.mgo
        iterators.mgo
        modules.mgo
      host/
        filesystem/
        networking/
        process/
        clock/
        terminal/
        crypto/
        threads/
    compat/
      node24/
      memingo/
    packages/
      node-core/
    tests/
      memingo/
      ecmascript/
      node-api/
      cli/
      interop/
      fixtures/
    docs/
      compatibility/
    installers/
    examples/

The layout is a proposal. Do not move or duplicate upstream Memingo files until its repository structure and licensing are checked and an integration strategy is chosen.

## 4. JavaScript engine implementation order

Implement the language in dependency order, not by collecting disconnected syntax examples:

1. Source positions, tokenizer, comments, strings, numeric literals, template literals and regular-expression literal handling.
2. Parser, AST, precedence, automatic semicolon insertion and syntax errors.
3. Primitive values, objects, property descriptors, prototypes, coercion, equality and property-key rules.
4. Lexical environments, scope chains, closures, function calls, this, constructors and strict mode.
5. Expressions, statements, control flow, exceptions, classes, private fields and static initialization.
6. Arrays, strings, numbers, dates, regexps, maps, sets, symbols, typed arrays, iterators and other ECMAScript built-ins.
7. Promises, jobs/microtasks, async functions, generators, async generators and cancellation-related web primitives.
8. ECMAScript modules, import attributes, dynamic import, top-level await and CommonJS interoperation.
9. Conformance testing against the selected ECMAScript edition and Node.js 24 behavior.

Do not mark a language feature complete because a parser accepts its syntax. Its runtime semantics and edge cases must also pass tests.

## 5. Runtime execution model

- Use one explicit runtime instance per process, with isolated execution contexts where the API requires them.
- Define a deterministic task queue for promise jobs and runtime callbacks; integrate timers and I/O readiness without blocking the JavaScript execution thread.
- Preserve observable ordering between synchronous code, promise jobs, timers, I/O callbacks and process shutdown.
- Model errors with names, messages, codes, causes and stack/source locations.
- Give every open handle a lifecycle and cleanup path. Unhandled errors and pending handles must affect exit behavior consistently with the compatibility target.
- Avoid implicit cross-language conversions. Define conversion rules for numbers, strings, booleans, lists/arrays, objects, null-like values, errors, byte buffers and functions.

## 6. Node.js API implementation strategy

Implement APIs in dependency layers:

- Runtime globals and process state.
- Events, errors, console, timers and performance.
- Buffers, encodings, URL and path.
- Filesystem and file handles.
- Streams, backpressure, pipelines and async iteration.
- DNS, sockets, HTTP, HTTPS, HTTP/2 and TLS.
- Child processes, workers and messaging.
- Crypto, compression, diagnostics, inspector and test runner.
- Remaining built-in modules and documented CLI flags.

For each module, maintain an API ledger with one row per exported symbol and fields for: v24 documentation URL, stability label, signature, options, events, errors, platform conditions, implementation status, tests and known deviations.

Deprecated and experimental APIs must remain visible in the ledger with their exact v24 status. They must not be silently presented as stable.

## 7. Two package ecosystems, not one destructive replacement

Keep Memingo's mgoa, memingo.toml and memingo.lock.json workflows working.

Add a separate Node-compatible package workflow for package.json, package-lock.json, node_modules, npm scripts, package lifecycle behavior, scoped packages, semver ranges, package exports/imports and registry configuration. Do not overwrite mgoa's manifest or lockfile formats.

The initial package goal should be:
- install and resolve pure JavaScript packages;
- honor package entry points and conditional exports;
- run package scripts through the Node.mgo CLI with explicit permissions and clear output;
- keep integrity hashes and reproducible lockfiles;
- identify packages that require unsupported native addons or unsupported Node APIs.

Native addon compatibility is a separate ABI and platform project. Do not claim all npm packages work merely because pure-JavaScript examples pass.

## 8. Cross-language interoperability

Support both languages in one project without confusing their semantics:

- .mgo is Memingo.
- .js follows package/module rules.
- .mjs is always an ECMAScript module.
- .cjs is always CommonJS.
- A project may contain both languages.
- Cross-language imports use an explicit bridge API and documented value conversion.
- A failure in one language reports the source language, file, line and column.
- Do not silently treat Memingo syntax as JavaScript or JavaScript syntax as Memingo.

A later release may define a shared project manifest, but it must not break existing memingo.toml projects or Node-style package.json projects.

## 9. CLI design

The unified command should eventually support:

- node-mgo file.mgo and node-mgo file.js
- node-mgo --version, --help, --eval and stdin execution
- Node-compatible script arguments and environment variables
- REPL modes for both languages
- project-aware run, test, build, format, check and dev commands
- Memingo commands and mgoa workflows without removing their existing names
- documented Node.js 24 flags, including explicit unsupported-flag diagnostics

CLI parity is behavioral: exit codes, stdout/stderr, option precedence, argument forwarding, signals and error formatting all need tests.

## 10. Security and permissions

- Treat project code and packages as untrusted input.
- Make filesystem access, process spawning, network access and environment access explicit capabilities.
- Prevent path traversal when resolving project-scoped operations.
- Verify package archive integrity and safely extract archives.
- Never execute package lifecycle scripts silently; show what will run and provide a clear opt-in policy.
- Keep secrets out of logs and diagnostic reports.
- Make permission restrictions visible and test both allowed and denied operations.

Security controls must not be advertised as a full sandbox unless isolation has been independently tested.

## 11. Test and release gates

Every implementation pull request should include:
- unit tests for new parser/runtime/API behavior;
- regression tests for any affected Memingo behavior;
- success, failure, boundary and asynchronous-order tests;
- platform tests where behavior differs;
- an update to the API ledger and compatibility matrix.

Release gates:
1. All upstream Memingo tests and existing examples pass unchanged.
2. JavaScript conformance tests for the selected language target pass to the declared level.
3. Each claimed Node API symbol has tests and a recorded status.
4. CLI and package-manager behavior has integration tests.
5. Install/uninstall/upgrade tests pass on every supported platform.
6. Known gaps and third-party package limitations are published.

## 12. First implementation milestones

### Milestone A — Baseline and integration
Pin an exact Memingo commit, run its tests in CI, document the source layout, and integrate its interpreter without changing behavior.

### Milestone B — Minimal JavaScript vertical slice
Implement a small but complete path through tokenizer → parser → evaluator → console output, then add variables, functions, objects, arrays and errors. This is a learning/engineering slice, not a compatibility claim.

### Milestone C — Language semantics
Complete ECMAScript values, coercion, prototypes, classes, exceptions, built-ins, promises and modules in testable increments.

### Milestone D — First Node APIs
Implement process/console/events/timers, then filesystem, buffers, paths, streams and networking.

### Milestone E — Projects and packages
Preserve mgoa and add Node package resolution and npm-compatible workflows.

### Milestone F — Installation and compatibility
Build installers, run full regression/conformance suites, publish the matrix and ship only the level of compatibility demonstrated by tests.

## 13. Explicit non-goals for early versions

- Claiming complete Node.js compatibility before the API ledger and tests are complete.
- Requiring users to install upstream Node.js, npm or V8 separately.
- Replacing Memingo's syntax or package manager with JavaScript/npm.
- Promising that every native npm addon or every third-party npm package will work from the first release.
- Building a GUI IDE before the command-line runtime and test infrastructure are reliable.
