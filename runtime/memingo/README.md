# Native Memingo runtime

Node.mgo's initial upstream compatibility baseline is **Memingo 0.2** from `Reaccionador2Jeje/Memingo`. The `.mgo` path is not a reduced compatibility mode.

The original Memingo interpreter remains the source of truth. Node.mgo should integrate it through a stable runtime interface and retain its semantics, standard library, tools and package workflows.

See [the complete Memingo feature inventory](../../docs/MEMINGO_INVENTORY.md), derived from the upstream `README.md`, `LANGUAGE.md` and `TODO.md`.

## Preservation requirements
- All Memingo syntax, values, operators, functions, objects and collections.
- Every documented built-in and standard-library function.
- JSON, environment, HTTP and project-scoped file helpers.
- Project configuration, CLI, REPL, formatter, diagnostics and tests.
- mgoa package manager, registry, lockfile and package workflows.
- MemeCraft, website, installers, shell completions and VS Code integration.
- Existing Memingo examples and packages.

## Example

```mgo
vibe name = "Node.mgo"
spill "Hello from " + name
```

## Integration checklist
- [ ] Pin the exact upstream Memingo commit/release used for the baseline.
- [ ] Identify the stable Memingo runtime entry point.
- [ ] Invoke it without unsafe shell-string interpolation.
- [ ] Preserve source file paths and diagnostic information.
- [ ] Run the complete upstream Memingo test suite.
- [ ] Add integration tests for existing Memingo projects and packages.
- [ ] Verify no built-in, command or package workflow was lost.

A Node.mgo release must not claim Memingo compatibility unless its Memingo regression suite passes.
