# Node.mgo architecture

Node.mgo aims to be a unified runtime that preserves the complete Memingo ecosystem while providing the full functionality of a defined Node.js release. It is not intended to be a small JavaScript runner or a launcher with only a handful of Node-inspired APIs.

## Two complete compatibility goals

### Memingo compatibility

Node.mgo must preserve Memingo's existing language and ecosystem rather than replacing or reducing them. This includes, according to the supported Memingo release:
- all Memingo syntax, values, operators, control flow, functions, objects, and collections;
- the complete built-in and standard-library function set;
- JSON, environment, HTTP, file and other runtime helpers;
- project management, CLI, REPL, formatter, diagnostics and test tooling;
- the `mgoa` package manager, package workflows, and editor/tooling integrations.

The Memingo implementation remains the source of truth. Node.mgo should integrate it and keep its behavior covered by regression tests.

### Node.js compatibility

Node.mgo also aims to support the complete public Node.js runtime surface for a clearly named target release, including:
- JavaScript language semantics for the selected ECMAScript edition;
- Node.js globals and built-in modules;
- module loading and package resolution;
- process, environment, command-line arguments and signals;
- events, timers, promises and asynchronous execution;
- files, paths, URLs, streams and byte buffers;
- networking, HTTP, TLS and other documented runtime APIs;
- diagnostics, errors, CLI behavior and developer tooling.

Compatibility with third-party npm packages is a separate milestone: it depends on module resolution, native extensions, platform behavior and the APIs those packages use. It must be measured rather than assumed.

## Unified runtime model

```text
                  node-mgo CLI
                       |
             project and module resolver
                       |
                runtime coordinator
                  /           \\
                 /             \\
       Memingo environment   JavaScript environment
          .mgo files              .js files
                 \\             /
                  \\           /
             shared host services
       filesystem / timers / events / network
                       |
              platform abstraction
```

The runtime may share safe host services, but it must preserve each language's semantics and standard library. A JavaScript program must not be silently delegated to Node.js or V8. The JavaScript engine is to be implemented in Memingo; platform-specific native bindings may be considered only when explicitly documented and tested.

## Compatibility contract

"Full compatibility" is the end goal, not a claim about the current scaffold. Every release must publish:
- the exact Memingo version and Node.js/ECMAScript target;
- a feature-by-feature compatibility matrix;
- automated conformance and regression test results;
- known gaps and platform differences.

No existing Memingo feature may be removed to make room for Node.js features. No Node.js feature may be called supported merely because a similarly named placeholder exists.

## Implementation principles

1. Preserve first: run Memingo's existing tests and behavior unchanged.
2. Implement language semantics before high-level Node APIs.
3. Build reusable host services with explicit, documented contracts.
4. Test parity continuously against the selected upstream specifications and test suites.
5. Ship in stages, but keep complete parity as the project target.
