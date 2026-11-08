"""Node.mgo command-line entry point.

The Memingo runtime is vendored unchanged. JavaScript execution is deliberately
reported as unavailable until the in-Memingo JavaScript engine is implemented.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Sequence

from . import __version__


ROOT = Path(__file__).resolve().parents[1]
VENDORED_MEMINGO = ROOT / "vendor" / "memingo"
if VENDORED_MEMINGO.is_dir() and str(VENDORED_MEMINGO) not in sys.path:
    sys.path.insert(0, str(VENDORED_MEMINGO))


def _run_memingo(path: str) -> int:
    try:
        from memingo.__main__ import run_file
    except ImportError as exc:
        print(f"Node.mgo: Memingo runtime could not be loaded: {exc}", file=sys.stderr)
        return 1
    return run_file(path)


def _run_memingo_command(arguments: list[str]) -> int:
    try:
        from memingo.__main__ import main as memingo_main
    except ImportError as exc:
        print(f"Node.mgo: Memingo runtime could not be loaded: {exc}", file=sys.stderr)
        return 1
    return memingo_main(arguments)


def _run_mgoa_command(arguments: list[str]) -> int:
    try:
        from memingo.mgoa_cli import main as mgoa_main
    except ImportError as exc:
        print(f"Node.mgo: mgoa could not be loaded: {exc}", file=sys.stderr)
        return 1
    return mgoa_main(arguments)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="node-mgo",
        description="Node.mgo — unified Memingo and JavaScript runtime",
        epilog=(
            "Memingo: node-mgo file.mgo | node-mgo memingo <command>\n"
            "Packages: node-mgo mgoa <command>\n"
            "JavaScript: .js/.mjs/.cjs execution is not available yet."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"Node.mgo {__version__}")
    parser.add_argument("target", nargs="?", help="A .mgo file or a runtime command")
    parser.add_argument("arguments", nargs=argparse.REMAINDER, help="Arguments passed to the selected command")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    values = list(sys.argv[1:] if argv is None else argv)
    if not values:
        build_parser().print_help()
        return 0

    target, *arguments = values
    if target in {"-h", "--help"}:
        build_parser().print_help()
        return 0
    if target == "memingo":
        return _run_memingo_command(arguments)
    if target == "mgoa":
        return _run_mgoa_command(arguments)
    if target == "run":
        if not arguments:
            print("Node.mgo: 'run' requires a source file.", file=sys.stderr)
            return 2
        target, *arguments = arguments

    suffix = Path(target).suffix.lower()
    if suffix == ".mgo":
        return _run_memingo(target)
    if suffix in {".js", ".mjs", ".cjs"}:
        print(
            "Node.mgo: JavaScript execution is not implemented yet. "
            "This file was not passed to Node.js or another JavaScript engine.",
            file=sys.stderr,
        )
        return 2
    if target.startswith("-"):
        print(f"Node.mgo: unsupported option: {target}", file=sys.stderr)
        print("Run 'node-mgo --help' for available commands.", file=sys.stderr)
        return 2

    print(f"Node.mgo: unknown target '{target}'. Expected a .mgo file, 'memingo', or 'mgoa'.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
