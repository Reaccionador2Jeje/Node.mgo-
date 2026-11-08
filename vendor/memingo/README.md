# Vendored Memingo runtime

This directory contains the Memingo 0.2.0 Python runtime copied from:

- Upstream repository: https://github.com/Reaccionador2Jeje/Memingo
- Pinned upstream commit: 77b6f0a7028bc5b3422c6d5a10e51d7b235639e9
- Upstream license: BSD 3-Clause (see LICENSE)

The upstream package is retained as a separate `memingo` Python package. Node.mgo imports and delegates to its public CLI and interpreter entry points; it does not rewrite Memingo syntax or replace its built-ins.

## Local development

From the repository root:

```bash
python -m node_mgo --version
python -m node_mgo examples/hello.mgo
python -m node_mgo memingo --version
python -m node_mgo mgoa --help
```

Run the upstream Memingo regression suite:

```bash
PYTHONPATH=vendor/memingo python -m unittest discover -s vendor/memingo/tests -v
```

Run Node.mgo's integration tests:

```bash
python -m unittest discover -s tests -p 'test_node_mgo*.py' -v
```

The vendored upstream tests are kept separate from Node.mgo-specific tests so changes to the bridge cannot hide regressions in Memingo.

## Updating the vendored copy

Do not edit vendored files casually. To update, pin a reviewed upstream commit, copy the complete runtime package and its license, run all upstream tests, then run Node.mgo integration tests. Update the pinned source commit in `node-mgo.toml` and this document together.
