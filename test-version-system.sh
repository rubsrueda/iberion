#!/bin/bash
# test-version-system.sh - Script para probar el sistema de versionado

echo "🧪 Probando Sistema de Versionado Iberion"
echo "=========================================="
echo ""

# Guardar versión actual
CURRENT_VERSION=$(grep -oP 'current:\s*"\K[\d.]+' version.js)
echo "📦 Versión actual: V${CURRENT_VERSION}"
echo ""

# Test 1: Verificar que los scripts existen
echo "✓ Test 1: Verificando scripts..."
if [ -f "version" ] && [ -x "version" ]; then
    echo "  ✅ Script 'version' existe y es ejecutable"
else
    echo "  ❌ Error: Script 'version' no encontrado o no es ejecutable"
fi

if [ -f "update-version.sh" ] && [ -x "update-version.sh" ]; then
    echo "  ✅ Script 'update-version.sh' existe y es ejecutable"
else
    echo "  ❌ Error: Script 'update-version.sh' no encontrado"
fi

echo ""

# Test 2: Verificar archivos de documentación
echo "✓ Test 2: Verificando documentación..."
for file in "CHANGELOG.md" "GUIA_VERSIONADO.md" "VERSION_SYSTEM.md" "RESUMEN_VERSIONADO.md" "EJEMPLOS_VERSIONADO.md" "INDICE_VERSIONADO.md"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file existe"
    else
        echo "  ❌ Error: $file no encontrado"
    fi
done

echo ""

# Test 3: Verificar version.js
echo "✓ Test 3: Verificando version.js..."
if [ -f "version.js" ]; then
    echo "  ✅ version.js existe"
    if grep -q "current:" version.js; then
        echo "  ✅ Contiene propiedad 'current'"
    else
        echo "  ❌ Error: No se encuentra 'current' en version.js"
    fi
else
    echo "  ❌ Error: version.js no encontrado"
fi

echo ""

# Test 4: Verificar marca de agua en index.html
echo "✓ Test 4: Verificando marca de agua en index.html..."
if grep -q "version-watermark" index.html; then
    echo "  ✅ Marca de agua encontrada en index.html"
    WATERMARK=$(grep -oP 'version-watermark[^>]*>v\K[\d.]+' index.html)
    if [ "$WATERMARK" == "$CURRENT_VERSION" ]; then
        echo "  ✅ Versión coincide: v${WATERMARK}"
    else
        echo "  ⚠️  Advertencia: Versión en HTML (v${WATERMARK}) difiere de version.js (v${CURRENT_VERSION})"
    fi
else
    echo "  ❌ Error: Marca de agua no encontrada en index.html"
fi

echo ""

# Test 5: Verificar estructura del CHANGELOG
echo "✓ Test 5: Verificando CHANGELOG.md..."
if [ -f "CHANGELOG.md" ]; then
    if grep -q "## V${CURRENT_VERSION}" CHANGELOG.md; then
        echo "  ✅ Versión actual registrada en CHANGELOG"
    else
        echo "  ⚠️  Advertencia: Versión actual no encontrada en CHANGELOG"
    fi
    
    CHANGELOG_ENTRIES=$(grep -c "## V" CHANGELOG.md)
    echo "  📊 Total de versiones en CHANGELOG: $CHANGELOG_ENTRIES"
else
    echo "  ❌ Error: CHANGELOG.md no encontrado"
fi

echo ""
echo "=========================================="
echo "🎯 Pruebas completadas"
echo ""
echo "Para probar el sistema en acción, ejecuta:"
echo "  ./version \"Prueba del sistema de versionado\""
echo ""
