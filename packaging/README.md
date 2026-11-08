# Native packaging

The current host runtime is the preserved Python-based Memingo interpreter. PyInstaller bundles that host dependency into a standalone executable; end users do not need to install Python or Node.js separately.

## Build locally

Use Python 3.10+ and install the pinned build tool:

    python -m pip install -r requirements-build.txt
    python -m PyInstaller --noconfirm --clean --onefile --name node_mgo --paths vendor/memingo --collect-all memingo packaging/entrypoint.py
    dist/node_mgo --version

On Windows the executable is `dist/node_mgo.exe`. After installation, run `node_mgo` directly from the terminal (without `python -m`).

## Release packages

A version tag such as `v0.1.0` triggers the cross-platform GitHub Actions release workflow:
- Windows x64: Inno Setup `.exe` installer; command `node_mgo`.
- macOS runner architecture: unsigned `.pkg` installer; command `node_mgo`.
- Ubuntu x64: `.deb` package and portable `.tar.gz`; command `node_mgo`.

These are early development builds and provide the currently implemented Memingo CLI only. JavaScript execution and full Node.js 24 compatibility are not included.

## Security and trust

Packages are built from tagged source in GitHub Actions. macOS packages are not code-signed or notarized in this initial pipeline, so macOS may display its standard warning. Signing, notarization and reproducible-build verification remain future release requirements.
