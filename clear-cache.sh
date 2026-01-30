#!/bin/bash
# clear-cache.sh - Limpia caché del navegador y Service Worker

echo "🧹 Limpiando Sistema de Caché de Iberion"
echo "========================================="
echo ""

# Obtener versión actual
CURRENT_VERSION=$(grep -oP 'current:\s*"\K[\d.]+' version.js)

# Actualizar versión en sw.js
if [ -f "sw.js" ]; then
    sed -i "s/const CACHE_VERSION = 'iberion-v[^']*'/const CACHE_VERSION = 'iberion-v${CURRENT_VERSION}'/" sw.js
    echo "✅ sw.js actualizado a versión ${CURRENT_VERSION}"
else
    echo "❌ Error: sw.js no encontrado"
fi

# Añadir timestamp a los scripts en index.html para forzar recarga
TIMESTAMP=$(date +%s)
echo "✅ Timestamp generado: ${TIMESTAMP}"

echo ""
echo "========================================="
echo "🎯 Caché preparado para limpieza"
echo ""
echo "Para completar la limpieza en tu navegador:"
echo ""
echo "OPCIÓN 1: Recarga Forzada (Recomendado)"
echo "  - Chrome/Edge: Ctrl+Shift+R o Ctrl+F5"
echo "  - Firefox: Ctrl+Shift+R"
echo "  - Safari: Cmd+Shift+R"
echo ""
echo "OPCIÓN 2: Limpieza Manual Completa"
echo "  1. Abre DevTools (F12)"
echo "  2. Ve a Application/Aplicación"
echo "  3. En 'Service Workers' → Click 'Unregister'"
echo "  4. En 'Storage' → Click 'Clear site data'"
echo "  5. Recarga la página (F5)"
echo ""
echo "OPCIÓN 3: Modo Incógnito"
echo "  - Abre el juego en una ventana de incógnito"
echo ""
echo "========================================="
