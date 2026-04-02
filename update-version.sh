#!/bin/bash
# update-version.sh - Script para actualizar la versión del juego (Sistema Híbrido)
# 
# Uso: 
#   ./update-version.sh "Descripción"          → Feature completo (V1.001 → V1.002)
#   ./update-version.sh --hotfix "Descripción" → Bugfix (V1.001 → V1.001a)
#   ./update-version.sh --patch "Descripción"  → Bugfix secuencial (V1.001a → V1.001b)
# 
# Ejemplo: ./update-version.sh "Nueva funcionalidad de batalla"
# Ejemplo: ./update-version.sh --hotfix "Corregido crash en red"

set -e

# Detectar modo
MODE="feature"
if [ "$1" == "--hotfix" ] || [ "$1" == "--patch" ]; then
    MODE="hotfix"
    shift
fi

# Verificar que se proporcionó una descripción
if [ $# -eq 0 ]; then
    echo "❌ Error: Debes proporcionar una descripción del cambio"
    echo "Uso: ./update-version.sh [--hotfix] \"Descripción del cambio\""
    exit 1
fi

CHANGE_DESC="$*"

# Leer versión actual desde version.js
CURRENT_VERSION=$(grep -oP 'current:\s*"\K[^"]+' version.js)

if [ -z "$CURRENT_VERSION" ]; then
    echo "❌ Error: No se pudo encontrar la versión actual"
    exit 1
fi

# Calcular nueva versión según el modo
if [ "$MODE" == "feature" ]; then
    # Modo feature: V1.001 → V1.002 (ignora letras si las hay)
    BASE_VERSION=$(echo "$CURRENT_VERSION" | grep -oP '[\d.]+')
    IFS='.' read -ra VERSION_PARTS <<< "$BASE_VERSION"
    MAJOR="${VERSION_PARTS[0]}"
    MINOR="${VERSION_PARTS[1]}"
    
    NEW_MINOR=$(printf "%03d" $((10#$MINOR + 1)))
    NEW_VERSION="${MAJOR}.${NEW_MINOR}"
else
    # Modo hotfix: V1.001 → V1.001a, V1.001a → V1.001b
    if [[ "$CURRENT_VERSION" =~ ([0-9.]+)([a-z]?)$ ]]; then
        BASE="${BASH_REMATCH[1]}"
        LETTER="${BASH_REMATCH[2]}"
        
        if [ -z "$LETTER" ]; then
            NEW_VERSION="${BASE}a"
        else
            NEXT_LETTER=$(echo "$LETTER" | tr "a-z" "b-za")
            NEW_VERSION="${BASE}${NEXT_LETTER}"
        fi
    else
        NEW_VERSION="${CURRENT_VERSION}a"
    fi
fi

echo "📦 Versión actual: V${CURRENT_VERSION}"
echo "📦 Nueva versión: V${NEW_VERSION}"

# Actualizar version.js
sed -i "s/current: \"${CURRENT_VERSION}\"/current: \"${NEW_VERSION}\"/" version.js
echo "✅ version.js actualizado"

# Actualizar index.html
sed -i "s/<div class=\"version-watermark\" id=\"version-display\">v[^<]*<\/div>/<div class=\"version-watermark\" id=\"version-display\">v${NEW_VERSION}<\/div>/" index.html
sed -i "s/<script src=\"version.js?v=[^\"]*\"><\/script>/<script src=\"version.js?v=${NEW_VERSION}\"><\/script>/" index.html
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

# Actualizar Service Worker con nueva versión
if [ -f "sw.js" ]; then
    sed -i "s/const CACHE_VERSION = 'iberion-v[^']*'/const CACHE_VERSION = 'iberion-v${NEW_VERSION}'/" sw.js
    echo "✅ sw.js actualizado (caché invalidado)"
fi

echo ""
echo "🎉 ¡Versión actualizada exitosamente a V${NEW_VERSION}!"
echo "📝 Cambio registrado: ${CHANGE_DESC}"
echo ""
echo "⚠️  IMPORTANTE: Para ver los cambios en el navegador:"
echo "   - Recarga forzada: Ctrl+Shift+R (Chrome/Firefox)"
echo "   - O ejecuta: ./clear-cache.sh para más opciones"
