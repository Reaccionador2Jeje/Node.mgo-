#!/bin/sh
# Node.mgo installer for macOS.
# Usage: curl -fsSL https://reaccionador2jeje.github.io/Node.mgo-/install-macos.sh | sh
set -eu

REPO="${NODE_MGO_REPO:-Reaccionador2Jeje/Node.mgo-}"
VERSION="${NODE_MGO_VERSION:-latest}"
BIN_DIR="${NODE_MGO_BIN_DIR:-$HOME/.local/bin}"

say() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

case "$(uname -s)" in
  Darwin) ;;
  *) fail "This installer is for macOS. Use install.sh on Linux or install.ps1 on Windows." ;;
esac

case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64) ARCH="x64" ;;
  *) fail "Unsupported architecture: $(uname -m). Node.mgo provides arm64 and x64 builds." ;;
esac

ASSET="node_mgo-macos-${ARCH}"
if [ "$VERSION" = "latest" ]; then
  URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"
else
  case "$VERSION" in
    v*) TAG="$VERSION" ;;
    *) TAG="v${VERSION}" ;;
  esac
  URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
fi

TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/node-mgo.XXXXXX")"
trap 'rm -f "$TMP_FILE"' EXIT HUP INT TERM

say "Downloading Node.mgo for macOS ${ARCH}..."
if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 --retry-delay 2 -o "$TMP_FILE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$TMP_FILE" "$URL"
else
  fail "curl or wget is required to download Node.mgo."
fi

mkdir -p "$BIN_DIR"
install -m 755 "$TMP_FILE" "$BIN_DIR/node_mgo"
ln -sf node_mgo "$BIN_DIR/memingo"

cat > "$BIN_DIR/mgoa" <<WRAPPER
#!/bin/sh
exec "$BIN_DIR/node_mgo" mgoa "\$@"
WRAPPER
chmod 755 "$BIN_DIR/mgoa"

# The release binary is not notarized, so remove the quarantine flag if present.
if command -v xattr >/dev/null 2>&1; then
  xattr -d com.apple.quarantine "$BIN_DIR/node_mgo" 2>/dev/null || true
fi

add_to_path() {
  profile="$1"
  touch "$profile"
  if grep -F "$BIN_DIR" "$profile" >/dev/null 2>&1; then
    return 0
  fi
  printf '\n# Node.mgo\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$profile"
}

add_to_path "$HOME/.zshrc"
add_to_path "$HOME/.profile"

say ""
say "Installed node_mgo, memingo and mgoa in ${BIN_DIR}"
"$BIN_DIR/node_mgo" --version
say ""
case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *)
    say "Add this line to your shell profile, or open a new terminal:"
    say "  export PATH=\"${BIN_DIR}:\$PATH\""
    ;;
esac
say "Run 'node_mgo --help' to get started."
