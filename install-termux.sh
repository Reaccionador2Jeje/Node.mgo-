#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

REPO="https://github.com/Reaccionador2Jeje/Node.mgo-.git"
BRANCH="bootstrap/runtime-structure"
INSTALL_DIR="$HOME/.local/share/node-mgo"
VENV="$INSTALL_DIR/venv"
TMP_DIR="$(mktemp -d)"
PKG_BIN=""

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# Termux puede ejecutar bash con un PATH incompleto al usar curl | bash.
# Primero localizamos PREFIX y pkg sin depender de command -v.
if [ -n "${PREFIX:-}" ] && [ -x "$PREFIX/bin/pkg" ]; then
  PKG_BIN="$PREFIX/bin/pkg"
else
  for candidate in \
    /data/data/com.termux/files/usr \
    /data/user/0/com.termux/files/usr \
    "$(dirname "$HOME")/usr"; do
    if [ -x "$candidate/bin/pkg" ]; then
      PREFIX="$candidate"
      PKG_BIN="$PREFIX/bin/pkg"
      break
    fi
  done
fi

if [ -z "$PKG_BIN" ]; then
  echo "ERROR: no pude localizar el gestor de paquetes de Termux."
  echo "Este instalador debe ejecutarse en la terminal principal de Termux."
  echo "Diagnóstico:"
  echo "  HOME=${HOME:-<vacío>}"
  echo "  PREFIX=${PREFIX:-<vacío>}"
  echo "  PATH=$PATH"
  echo "  ANDROID_ROOT=${ANDROID_ROOT:-<vacío>}"
  exit 1
fi

export PREFIX
export PATH="$PREFIX/bin:$PATH"

echo "==> Termux detectado: $PREFIX"
echo "==> Instalando dependencias..."
"$PKG_BIN" update -y
"$PKG_BIN" install -y python git

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
echo "Ejecuta: node_mgo --help"
echo "Alias disponible: node-mgo --version"
