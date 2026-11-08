# Native Memingo runtime

Node.mgo must preserve the complete Memingo language and ecosystem for the selected baseline version. The `.mgo` path is not a reduced compatibility mode.

The existing Memingo interpreter remains the source of truth. Node.mgo should integrate it through a stable runtime interface and retain its semantics, standard library, tools and package workflows.

## Preservation requirements
- All Memingo syntax, values, operators, functions, objects and collections.
- All built-in functions and standard-library functions.
- JSON, environment, HTTP, file and other runtime helpers.
- Project configuration, CLI, REPL, formatter, diagnostics and tests.
- mgoa package manager and its package workflows.
- Existing editor integrations and supported tooling.

## Example

```mgo
vibe name = "Node.mgo"
spill "Hello from " + name
```

## Integration checklist
- [ ] Identify the stable Memingo runtime entry point.
- [ ] Invoke it without unsafe shell-string interpolation.
- [ ] Preserve source file paths and diagnostic information.
- [ ] Run the complete upstream Memingo test suite.
- [ ] Add integration tests for existing Memingo projects and packages.
- [ ] Verify no built-in, command or package workflow was lost.

A Node.mgo release must not claim Memingo compatibility unless its Memingo regression suite passes.
