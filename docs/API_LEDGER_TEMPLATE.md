# Node.js 24 API compatibility ledger

Use one entry per public export or behavior. Do not mark a whole module complete because its filename exists.

## Required fields

| Field | Meaning |
|---|---|
| Module / symbol | Exact documented public name |
| Reference | Link to the pinned Node.js v24.22.2 documentation |
| Stability | Exact stability label in v24 |
| Signature | Parameters, overloads and return behavior |
| Options | Option names, defaults and validation |
| Events | Emitted event names and ordering |
| Errors | Error classes, codes and conditions |
| Platform | OS/architecture restrictions |
| Status | Not started / design / implemented / tested / partial / unsupported |
| Tests | Unit and integration test identifiers |
| Deviations | Exact known differences |

## Status definitions

- **Not started** — no design or implementation exists.
- **Design** — behavior and interfaces are specified, no implementation exists.
- **Implemented** — code exists, but compatibility tests are incomplete.
- **Tested** — documented tests pass for the stated behavior and platform.
- **Partial** — only a documented subset is implemented; list every missing part.
- **Unsupported** — intentionally unavailable; explain why and whether this is platform-specific.

## Entry template

| Module / symbol | Reference | Stability | Signature / options | Events / errors | Platform | Status | Tests | Deviations |
|---|---|---|---|---|---|---|---|---|
| Example only — replace this row | v24 docs URL | Stable / other exact label | Exact documented contract | Exact documented behavior | All / named platforms | Not started | Test IDs | None recorded yet |

## Completion rule

A symbol can be marked **Tested** only when its normal behavior, edge cases, error behavior, asynchronous ordering (if applicable), and supported-platform behavior are covered. Record the exact Node.js 24 patch version used as the comparison oracle. Experimental, release-candidate and deprecated APIs must keep their original status labels.
