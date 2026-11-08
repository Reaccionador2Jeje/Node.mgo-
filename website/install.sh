#!/bin/sh
# Node.mgo installer for Linux.
# Usage: curl -fsSL https://reaccionador2jeje.github.io/Node.mgo-/install.sh | sh
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
  Linux) ;;
  *) fail "This installer is for Linux. Use install-macos.sh on macOS or install.ps1 on Windows." ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) fail "Unsupported architecture: $(uname -m). Node.mgo provides x64 and arm64 builds." ;;
esac

ASSET="node_mgo-linux-${ARCH}"
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

say "Downloading Node.mgo for Linux ${ARCH}..."
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

add_to_path() {
  profile="$1"
  [ -d "$(dirname "$profile")" ] || return 0
  touch "$profile" 2>/dev/null || return 0
  if grep -F "$BIN_DIR" "$profile" >/dev/null 2>&1; then
    return 0
  fi
  printf '\n# Node.mgo\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$profile"
}

add_to_path "$HOME/.profile"
add_to_path "$HOME/.bashrc"
add_to_path "$HOME/.zshrc"

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
