# Node.mgo — Ecosystem Integration

Status: planning document. Node.js API compatibility is a target, not a blanket compatibility claim.

## Compatibility discipline
- Pin the Memingo source revision vendored by this repository.
- Record every Node.js API implemented, partially implemented or unsupported.
- Add conformance tests per API before marking it supported.
- Keep the upstream Node.js reference version explicit.
- Preserve Memingo CLI behavior and test it separately from Node.js compatibility.

## Next tasks
1. Create a machine-readable API support table.
2. Add a small test suite for each claimed API.
3. Document unsupported asynchronous and runtime behaviors.
4. Automate checks that the vendored Memingo revision matches the recorded upstream revision.