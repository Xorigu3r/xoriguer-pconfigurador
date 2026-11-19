#!/bin/bash
# Fa l'AppImage de Linux a partir de dist/linux-unpacked (fet per `npm run linux` a Windows).
# Des de Windows:  wsl -d Ubuntu-22.04 -u root -- bash scripts/appimage_wsl.sh
# Fa servir el runtime d'AppImage de la memòria cau d'electron-builder i el mksquashfs d'Ubuntu.
set -e
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ARREL="$(cd "$(dirname "$0")/.." && pwd)"
VERSIO="$(grep -m1 '"version"' "$ARREL/package.json" | sed 's/.*: *"\(.*\)".*/\1/')"
RUNTIME="$ARREL/eines/appimage/runtime-x64"   # còpia del runtime de la memòria cau d'electron-builder
[ -f "$RUNTIME" ] || { echo "No trobo el runtime d'AppImage (fes abans npm run linux)"; exit 1; }
command -v mksquashfs >/dev/null || apt-get install -y squashfs-tools

DIR=/root/pconf-appdir
rm -rf "$DIR" && mkdir -p "$DIR"
cp -a "$ARREL/dist/linux-unpacked/." "$DIR/"
cp "$ARREL/build/icon.png" "$DIR/xoriguer-pconfigurador.png"
cat > "$DIR/xoriguer-pconfigurador.desktop" <<EOF
[Desktop Entry]
Name=Xoriguer PConfigurador
Comment=Configurador de PC per pressupost
Exec=AppRun %U
Icon=xoriguer-pconfigurador
Type=Application
Categories=Utility;
Terminal=false
EOF
cat > "$DIR/AppRun" <<'EOF'
#!/bin/sh
AQUI="$(dirname "$(readlink -f "$0")")"
exec "$AQUI/XoriguerPConfigurador" "$@"
EOF
chmod +x "$DIR/AppRun" "$DIR/XoriguerPConfigurador" "$DIR/chrome-sandbox" 2>/dev/null || true
[ -f "$DIR/chrome_crashpad_handler" ] && chmod +x "$DIR/chrome_crashpad_handler"

SORTIDA="/root/XoriguerPConfigurador-$VERSIO-x86_64.AppImage"
rm -f /root/pconf.squashfs
mksquashfs "$DIR" /root/pconf.squashfs -root-owned -noappend -comp gzip -quiet
cat "$RUNTIME" /root/pconf.squashfs > "$SORTIDA"
chmod +x "$SORTIDA"
cp "$SORTIDA" "$ARREL/dist/"
ls -la "$ARREL/dist/$(basename "$SORTIDA")"
echo FET
