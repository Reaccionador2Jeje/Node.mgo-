# Node.js 24 API inventory for Node.mgo

Compatibility baseline: the Node.js 24 LTS documentation, specifically the official v24.22.2 API reference. Node.mgo uses this as a compatibility target; upstream Node.js is not intended to be a required runtime dependency.

Official reference: https://nodejs.org/download/release/latest-v24.x/docs/api/

This is an API-area inventory from the official documentation index. Each area must be expanded into individual exported symbols, overloads, options, events, errors, stability levels and platform-specific behavior during implementation. A matching module name or placeholder is not API compatibility.

## 1. JavaScript language and module system
- ECMAScript language features supported by the selected Node.js 24 release.
- CommonJS modules.
- ECMAScript modules.
- `node:module` API.
- Package metadata, package resolution, package entry points and conditional exports/imports.
- Node.js TypeScript support as documented for v24.
- Module interoperation and loader behavior.

## 2. Globals and web-compatible APIs
- Global objects and runtime globals.
- `fetch`, `Headers`, `Request`, `Response`, `FormData`, `File`, `Blob`.
- URL and URLSearchParams.
- WebSocket.
- Web Crypto and SubtleCrypto.
- Web Streams.
- WebAssembly.
- structuredClone.
- MessageChannel, MessagePort and MessageEvent.
- Timers exposed globally.
- Other globals listed by the v24 globals reference, including their flags and stability levels.

## 3. Core built-in modules
The complete documented Node.js 24 module surface must be covered, including:
- `assert`
- `async_hooks`
- `buffer`
- `child_process`
- `cluster`
- `console`
- `crypto`
- `diagnostics_channel`
- `dns`
- `domain` (deprecated)
- `events`
- `fs` and `fs/promises`
- `http`
- `http2`
- `https`
- `inspector`
- `module`
- `net`
- `os`
- `path`
- `perf_hooks`
- `process`
- `punycode` (deprecated)
- `querystring`
- `readline`
- `repl`
- `sqlite` (check v24 stability status and flags)
- `stream` and documented stream variants
- `string_decoder`
- `timers` and `timers/promises`
- `tls`
- `trace_events`
- `tty`
- `dgram`
- `url`
- `util`
- `v8`
- `vm`
- `wasi`
- `worker_threads`
- `zlib`

## 4. Additional API documentation areas
These are also part of the official v24 API index and must not be forgotten:
- Asynchronous context tracking.
- C++ addons, Node-API (C/C++ addons) and C++ embedder API.
- Command-line options and environment variables.
- Debugger and inspector.
- Errors and diagnostic reports.
- Internationalization.
- Iterable Streams API (respect its v24 stability/flag status).
- Permissions model.
- Single executable applications.
- Test runner.
- UDP/datagram sockets.
- Performance measurement APIs.
- WebAssembly System Interface (WASI).
- Zlib iterable compression APIs.

## 5. Runtime behavior and compatibility dimensions
API parity includes more than exported function names:
- Event loop and asynchronous execution order.
- Promise jobs, timers, I/O callbacks and process lifecycle.
- Buffer and typed-array interoperability.
- EventEmitter semantics and error events.
- Stream backpressure, destruction, piping and async iteration.
- File descriptor, path, permission and filesystem behavior.
- Process arguments, environment, signals, exit codes and standard streams.
- HTTP parsing, headers, agents, upgrades and server/client lifecycle.
- TLS certificates, sockets and protocol behavior.
- Worker lifecycle, messaging and shared memory.
- Module resolution, caching, cycles and package exports.
- CLI flags, diagnostics, error codes and platform differences.

## 6. Compatibility policy
- Include stable APIs.
- Track experimental, release-candidate, active-development and deprecated APIs with the exact v24 stability labels and enabling flags.
- Do not silently omit deprecated APIs: document their status and behavior.
- Separate Node.js API compatibility from third-party npm package compatibility.
- Native addons and C++ embedder interfaces require a separately documented ABI/compatibility strategy.
- Record unsupported APIs and platform differences in a machine-readable compatibility matrix.
- Every implemented API needs tests for normal behavior, edge cases, errors and asynchronous behavior.

## 7. Verification sources
- Official v24 API index and all-in-one reference: https://nodejs.org/download/release/latest-v24.x/docs/api/all.html
- Official v24 globals reference: https://nodejs.org/download/release/latest-v24.x/docs/api/globals.html

This inventory is the top-level coverage map. It is not a claim that Node.mgo currently implements these APIs. The implementation plan must expand each documented area into a symbol-level checklist and tests against the pinned Node.js 24 release.
