# Node.mgo

A unified runtime project by Atdev Dev: preserve the Memingo programming ecosystem and target the full Node.js 24 runtime API, with the JavaScript engine implemented in Memingo. Licensed under GNU GPL 3.0.

## Compatibility baselines

- Memingo 0.2, documented in the original Memingo repository.
- Node.js 24 LTS API reference, initially pinned to v24.22.2.
- The upstream Node.js installation is a compatibility reference, not a required runtime dependency.

## Project documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Memingo feature inventory](docs/MEMINGO_INVENTORY.md)
- [Node.js 24 API inventory](docs/NODEJS_24_INVENTORY.md)
- [Roadmap](docs/ROADMAP.md)
- [Native Memingo runtime](runtime/memingo/README.md)
- [JavaScript interpreter plan](runtime/javascript/README.md)
- [Test strategy](tests/README.md)

## Current status

This repository currently contains the initial design and documentation scaffold. The inventories define what must be preserved or implemented; they do **not** mean the runtime or full compatibility is already implemented. See the roadmap for the implementation stages.

Example programs are available in `examples/`. The JavaScript example is a target for the planned interpreter; it is not yet executable by Node.mgo.
