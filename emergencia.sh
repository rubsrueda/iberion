#!/bin/bash
# emergencia.sh - Script de rescate para cuando el navegador está atascado

echo "🚨 MODO DE RESCATE - IBERION 🚨"
echo "================================"
echo ""
echo "⚠️  Tu navegador está atrapado en un loop de Service Worker"
echo ""
echo "SOLUCIONES DISPONIBLES:"
echo ""
echo "1️⃣  SOLUCIÓN RÁPIDA (Modo Incógnito)"
echo "    - Cierra TODAS las pestañas del juego"
echo "    - Abre navegador en modo incógnito:"
echo "      Chrome: Ctrl+Shift+N"
echo "      Firefox: Ctrl+Shift+P"
echo "    - Abre: file://$(pwd)/emergencia.html"
echo "    - Click 'LIMPIEZA DE EMERGENCIA TOTAL'"
echo ""
echo "2️⃣  SOLUCIÓN MANUAL (DevTools)"
echo "    - F12 para abrir DevTools"
echo "    - Ve a Application (Chrome) o Storage (Firefox)"
echo "    - Service Workers → Unregister todos"
echo "    - Storage → Clear site data"
echo "    - Cache Storage → Delete all"
echo "    - Cierra DevTools y navegador"
echo ""
echo "3️⃣  SOLUCIÓN NUCLEAR (Reiniciar navegador)"
echo "    - Cierra COMPLETAMENTE el navegador"
echo "    - En Linux/Mac:"
echo "      killall chrome"
echo "      killall firefox"
echo "    - Abre de nuevo"
echo "    - Abre emergencia.html"
echo ""
echo "================================"
echo ""
echo "📋 DESPUÉS DE LIMPIAR:"
echo ""
echo "1. Abre modo incógnito"
echo "2. Abre: file://$(pwd)/index.html"
echo "3. Si funciona → cierra incógnito"
echo "4. Abre normal: file://$(pwd)/index.html"
echo ""
echo "================================"
echo ""
read -p "¿Abrir emergencia.html en navegador? (s/n): " respuesta

if [[ "$respuesta" == "s" || "$respuesta" == "S" ]]; then
    # Detectar navegador disponible
    if command -v xdg-open &> /dev/null; then
        xdg-open "file://$(pwd)/emergencia.html"
    elif command -v open &> /dev/null; then
        open "file://$(pwd)/emergencia.html"
    elif [[ -n "$BROWSER" ]]; then
        "$BROWSER" "file://$(pwd)/emergencia.html"
    else
        echo "❌ No se pudo detectar el navegador"
        echo "Abre manualmente: file://$(pwd)/emergencia.html"
    fi
    echo "✅ Página de emergencia abierta"
else
    echo "Abre manualmente en tu navegador:"
    echo "file://$(pwd)/emergencia.html"
fi

echo ""
echo "🎯 RECUERDA: Después de limpiar, usa Ctrl+Shift+R"
echo ""
