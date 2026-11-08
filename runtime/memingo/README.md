# Memingo runtime integration

Node.mgo preserves the original Memingo 0.2.0 implementation from Reaccionador2Jeje/Memingo, pinned to commit 77b6f0a7028bc5b3422c6d5a10e51d7b235639e9.

## Vendored source
- Runtime package: vendor/memingo/memingo/
- Upstream regression tests: vendor/memingo/tests/
- Upstream documentation: vendor/memingo/UPSTREAM_README.md, LANGUAGE.md, UPSTREAM_TODO.md
- Upstream license: vendor/memingo/LICENSE (BSD 3-Clause)

The Memingo source files are retained as upstream source. The Node.mgo bridge imports the original memingo.__main__.run_file, memingo.__main__.main and memingo.mgoa_cli.main entry points. No shell-string interpolation is used for dispatch.

## Current commands
    python -m node_mgo examples/hello.mgo
    python -m node_mgo memingo --version
    python -m node_mgo memingo repl
    python -m node_mgo mgoa --help

The source distribution currently requires Python 3.10 or newer. Node.js is not required for this Memingo milestone.

## Verification
    PYTHONPATH=vendor/memingo python -m unittest discover -s vendor/memingo/tests -v
    python -m unittest discover -s tests -p 'test_node_mgo*.py' -v

The CI workflow is configured to run both suites on Linux, macOS and Windows with Python 3.10–3.13. Do not describe the suite as passing until a green workflow run is observed.

## Remaining preservation work

The vendored interpreter, CLI, formatter, project tooling and mgoa implementation are present. The curated package catalog, full website/game assets, installers and VS Code extension still need to be incorporated or deliberately consumed from a pinned upstream release. See docs/ROADMAP.md.

## License

The vendored Memingo source remains under BSD 3-Clause; see vendor/memingo/LICENSE. The surrounding Node.mgo project remains GPL-3.0.
