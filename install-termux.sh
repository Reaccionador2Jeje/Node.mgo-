#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO="https://github.com/Reaccionador2Jeje/Node.mgo-.git"
BRANCH="bootstrap/runtime-structure"
INSTALL_DIR="$HOME/.local/share/node-mgo"
VENV="$INSTALL_DIR/venv"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# Detecta Termux por sus herramientas, no por una ruta PREFIX fija.
PKG_BIN="$(command -v pkg || true)"
if [ -z "$PKG_BIN" ]; then
  echo "Error: no encuentro el comando 'pkg'."
  echo "Abre la aplicación Termux y ejecuta este instalador allí."
  echo "Diagnóstico: PREFIX=${PREFIX:-<vacío>}, PATH=$PATH"
  exit 1
fi

# En algunas instalaciones PREFIX puede no estar exportado o variar.
if [ -z "${PREFIX:-}" ]; then
  PREFIX="$(dirname "$(dirname "$PKG_BIN")")"
  export PREFIX
fi

if [ ! -x "$PREFIX/bin/pkg" ] && [ ! -x "$PKG_BIN" ]; then
  echo "Error: se encontró pkg, pero no se pudo determinar el entorno de Termux."
  echo "Diagnóstico: PREFIX=$PREFIX, pkg=$PKG_BIN"
  exit 1
fi

echo "==> Termux detectado en: $PREFIX"
echo "==> Instalando dependencias..."
pkg update -y
pkg install -y python git

echo "==> Descargando Node.mgo..."
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP_DIR/source"

echo "==> Preparando entorno Python aislado..."
mkdir -p "$INSTALL_DIR"
python -m venv "$VENV"

echo "==> Instalando Node.mgo..."
"$VENV/bin/python" -m pip install --upgrade pip setuptools wheel
"$VENV/bin/python" -m pip install "$TMP_DIR/source"

echo "==> Creando comandos..."
mkdir -p "$PREFIX/bin"

for command_name in node_mgo node-mgo; do
  cat > "$PREFIX/bin/$command_name" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
exec "$VENV/bin/python" -m node_mgo "\$@"
EOF
  chmod +x "$PREFIX/bin/$command_name"
done

echo
echo "Node.mgo se instaló correctamente."
echo "Prueba con: node_mgo --help"
echo "También puedes ejecutar: node-mgo --version"
