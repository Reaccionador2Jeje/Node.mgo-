# Native packaging

The current host runtime is the preserved Python-based Memingo interpreter. PyInstaller bundles that host dependency into a standalone executable; end users do not need to install Python or Node.js separately.

## Build locally

Use Python 3.10+ and install the pinned build tool:

    python -m pip install -r requirements-build.txt
    python -m PyInstaller --noconfirm --clean --onefile --name node-mgo --paths vendor/memingo --collect-submodules memingo node_mgo/__main__.py
    dist/node-mgo --version

On Windows the executable is `dist/node-mgo.exe`.

## Release packages

A version tag such as `v0.1.0` triggers the cross-platform GitHub Actions release workflow:
- Windows x64: Inno Setup `.exe` installer.
- macOS runner architecture: unsigned `.pkg` installer (not notarized).
- Ubuntu x64: `.deb` package and portable `.tar.gz`.

These are early development builds and provide the currently implemented Memingo CLI only. JavaScript execution and full Node.js 24 compatibility are not included.

## Security and trust

Packages are built from tagged source in GitHub Actions. macOS packages are not code-signed or notarized in this initial pipeline, so macOS may display its standard warning. Signing, notarization and reproducible-build verification remain future release requirements.
