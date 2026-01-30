#!/bin/bash
# update-version.sh - Script para actualizar la versión del juego
# 
# Uso: ./update-version.sh "Descripción del cambio"
# Ejemplo: ./update-version.sh "Se resuelve problema de intercambio con la banca 4:1"

set -e

# Verificar que se proporcionó una descripción
if [ $# -eq 0 ]; then
    echo "❌ Error: Debes proporcionar una descripción del cambio"
    echo "Uso: ./update-version.sh \"Descripción del cambio\""
    exit 1
fi

CHANGE_DESC="$*"

# Leer versión actual desde version.js
CURRENT_VERSION=$(grep -oP 'current:\s*"\K[\d.]+' version.js)

if [ -z "$CURRENT_VERSION" ]; then
    echo "❌ Error: No se pudo encontrar la versión actual"
    exit 1
fi

# Calcular nueva versión
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"

NEW_MINOR=$(printf "%03d" $((10#$MINOR + 1)))
NEW_VERSION="${MAJOR}.${NEW_MINOR}"

echo "📦 Versión actual: V${CURRENT_VERSION}"
echo "📦 Nueva versión: V${NEW_VERSION}"

# Actualizar version.js
sed -i "s/current: \"${CURRENT_VERSION}\"/current: \"${NEW_VERSION}\"/" version.js
echo "✅ version.js actualizado"

# Actualizar index.html
sed -i "s/<div class=\"version-watermark\" id=\"version-display\">v[^<]*<\/div>/<div class=\"version-watermark\" id=\"version-display\">v${NEW_VERSION}<\/div>/" index.html
echo "✅ index.html actualizado"

# Actualizar CHANGELOG.md
DATE=$(date +%Y-%m-%d)
NEW_ENTRY="\n## V${NEW_VERSION} - ${DATE}\n${CHANGE_DESC}\n"

# Insertar después del primer separador ---
awk -v entry="$NEW_ENTRY" '
    /^---$/ && !found {
        print entry
        found=1
    }
    {print}
' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md

echo "✅ CHANGELOG.md actualizado"

echo ""
echo "🎉 ¡Versión actualizada exitosamente a V${NEW_VERSION}!"
echo "📝 Cambio registrado: ${CHANGE_DESC}"
