# Tests

Tests should be divided by runtime boundary.

## Suggested groups

- `cli/`: argument parsing, extension dispatch, and error messages.
- `memingo/`: execution of native `.mgo` examples.
- `javascript/`: tokenizer, parser, evaluator, and language semantics.
- `apis/`: Node-inspired API behavior.

Every supported feature should have automated tests. Keep expected unsupported behavior explicit so partial compatibility is not mistaken for full compatibility.
