# Node.mgo architecture

Node.mgo aims to be a unified runtime that preserves the complete Memingo ecosystem while providing the full functionality of a defined Node.js release. It is not intended to be a small JavaScript runner or a launcher with only a handful of Node-inspired APIs.

## Compatibility targets

- **Node.js API baseline:** Node.js 24 LTS; API reference pinned initially to v24.22.2.
- **JavaScript language baseline:** the ECMAScript features supported by the selected Node.js 24 release, verified against conformance tests.
- **Memingo baseline:** Memingo 0.2, based on the original `Reaccionador2Jeje/Memingo` README and language reference.

Node.js 24 is the compatibility reference, not a runtime dependency. The intended Node.mgo installer should install Node.mgo and its Memingo-hosted JavaScript engine without requiring users to install upstream Node.js separately.

## Compatibility inventories

- [Memingo 0.2 feature inventory](MEMINGO_INVENTORY.md) — derived from the original Memingo `README.md`, `LANGUAGE.md` and `TODO.md`.
- [Node.js 24 API inventory](NODEJS_24_INVENTORY.md) — top-level API coverage map based on the official v24.22.2 documentation.

The inventories distinguish shipped features from roadmap work and compatibility targets. They are coverage maps, not claims that Node.mgo has already implemented the listed functionality.

## Two complete compatibility goals

### Memingo compatibility

Node.mgo must preserve Memingo's existing language and ecosystem rather than replacing or reducing them. This includes, according to Memingo 0.2:
- all syntax, values, operators, control flow, functions, objects and collections;
- every built-in and standard-library function;
- JSON, environment, HTTP and project-scoped file helpers;
- project management, CLI, REPL, formatter, diagnostics and test tooling;
- the `mgoa` package manager, registry, lockfile and package workflows;
- MemeCraft, the website, installer, shell completions and editor integration.

The Memingo implementation remains the source of truth. Node.mgo should integrate it and keep its behavior covered by regression tests. Features marked incomplete in Memingo's own `TODO.md` must not be represented as shipped Memingo functionality.

### Node.js 24 compatibility

Node.mgo also aims to support the complete public Node.js 24 runtime surface, including:
- JavaScript language semantics for the ECMAScript features supported by Node.js 24;
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

## Simple installation goal

Provide a straightforward installer for supported operating systems, plus a package-manager or standalone option where practical. Installation should not require a preinstalled Node.js 24, npm, or a manually configured JavaScript engine. The final dependency list must be documented and minimized.

## Compatibility contract

"Full compatibility" is the end goal, not a claim about the current scaffold. Every release must publish:
- the exact Memingo version and Node.js 24 target;
- a feature-by-feature compatibility matrix;
- automated conformance and regression test results;
- known gaps and platform differences.

No existing Memingo feature may be removed to make room for Node.js features. No Node.js feature may be called supported merely because a similarly named placeholder exists.

## Implementation principles

1. Preserve first: run Memingo's existing tests and behavior unchanged.
2. Implement language semantics before high-level Node APIs.
3. Build reusable host services with explicit, documented contracts.
4. Test parity continuously against Node.js 24 documentation and relevant test suites.
5. Ship in stages, but keep complete parity as the project target.
