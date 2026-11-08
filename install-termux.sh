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

if [ -z "\${PREFIX:-}" ] || [ "\${PREFIX}" != "/data/data/com.termux/files/usr" ]; then
  echo "Error: este instalador debe ejecutarse dentro de Termux en Android."
  exit 1
fi

echo "==> Instalando dependencias de Termux..."
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
