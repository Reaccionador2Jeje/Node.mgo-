# Node.mgo

A unified runtime by Atdev Dev. The goal is to preserve the Memingo programming ecosystem and implement the Node.js 24 runtime API, with the JavaScript engine written in Memingo.

## Compatibility targets
- Memingo 0.2.0, vendored from upstream commit 77b6f0a7028bc5b3422c6d5a10e51d7b235639e9.
- Node.js 24 LTS API reference, initially pinned to v24.22.2.
- Upstream Node.js is a compatibility reference, not a required runtime dependency.

## Current executable functionality
- The original Memingo 0.2 Python runtime is vendored under vendor/memingo/memingo/.
- The original Memingo CLI, REPL, formatter, interpreter, standard library, project tooling and mgoa package-manager code are preserved.
- python -m node_mgo file.mgo runs a Memingo source file through the original interpreter.
- python -m node_mgo memingo <command> forwards to the original Memingo CLI.
- python -m node_mgo mgoa <command> forwards to the original package manager.
- The original upstream regression tests are vendored under vendor/memingo/tests/.
- Node.mgo integration tests and a cross-platform GitHub Actions workflow have been added.

JavaScript files (.js, .mjs, .cjs) are **not executable yet**. The CLI reports this explicitly and does not secretly invoke Node.js, V8 or another JavaScript runtime.

## Official website

The static multi-page website is in `website/` and includes:
- Landing page and project status.
- Download information for Windows, macOS and Linux.
- Documentation for installation, commands, Memingo integration and the planned JavaScript engine.
- Beginner tutorials.
- Responsive layout for mobile and desktop.

Preview locally (Python 3):

    python -m http.server 8000 --directory website

Then visit http://localhost:8000.

A GitHub Actions workflow in `.github/workflows/pages.yml` publishes the website through GitHub Pages when the `bootstrap/runtime-structure` branch is updated. GitHub Pages must be enabled with GitHub Actions as its deployment source in repository settings.

The download page links to GitHub Releases but does not claim that native installers exist. Windows, macOS and Linux installers must be built, tested and attached to a release before direct download links are added.

## Native installers

A PyInstaller-based packaging pipeline is defined in `.github/workflows/release.yml`. It bundles the current Python-based Memingo runtime so end users do not need to install Python separately. The workflow builds a Windows x64 Inno Setup installer, an unsigned macOS ARM64 `.pkg`, and Linux x64 `.deb` plus `.tar.gz` packages. Push a `v*` tag to build and attach release assets; branch builds are uploaded as temporary Actions artifacts for smoke testing. See [packaging/README.md](packaging/README.md) for build and trust details. These packages do not add JavaScript support or Node.js 24 API compatibility.

## Requirements for this development snapshot
- Python 3.10 or newer is currently required because the preserved Memingo 0.2 interpreter is Python-based.
- Node.js and npm are not required to run the current Memingo milestone.
- The long-term goal is a simpler standalone installation with a minimal documented host dependency set.

## Run from source
    python -m node_mgo --help
    python -m node_mgo --version
    python -m node_mgo examples/hello.mgo
    python -m node_mgo memingo --version
    python -m node_mgo mgoa --help

Install the Python package locally:
    python -m pip install .
    node-mgo --help
    node-mgo examples/hello.mgo

## Tests
Run Node.mgo bridge tests:
    python -m unittest discover -s tests -p "test_node_mgo*.py" -v

Run the original Memingo regression suite:
    PYTHONPATH=vendor/memingo python -m unittest discover -s vendor/memingo/tests -v

The CI workflow runs both suites across Python 3.10–3.13 on Linux, Windows and macOS. A workflow being configured is not the same as a green test result; check the Actions tab for the latest run.

## Project documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation blueprint](docs/IMPLEMENTATION_BLUEPRINT.md)
- [Memingo feature inventory](docs/MEMINGO_INVENTORY.md)
- [Node.js 24 API inventory](docs/NODEJS_24_INVENTORY.md)
- [API ledger template](docs/API_LEDGER_TEMPLATE.md)
- [Roadmap](docs/ROADMAP.md)
- [Memingo integration details](runtime/memingo/README.md)
- [JavaScript engine plan](runtime/javascript/README.md)
- [Test strategy](tests/README.md)
- [Website source and preview instructions](website/README.md)

## Licensing
Node.mgo is distributed under GPL-3.0. The vendored Memingo 0.2 source retains its upstream BSD 3-Clause license and copyright notice in vendor/memingo/LICENSE.

**Compatibility honesty:** the repository currently contains a working Memingo bridge and the design for the JavaScript engine. It does not yet implement JavaScript or full Node.js 24 compatibility.
