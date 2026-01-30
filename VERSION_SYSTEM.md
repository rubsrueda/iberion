# 📦 Sistema de Control de Versiones - Iberion

## Descripción
Este sistema automatiza el versionado del juego Iberion, incrementando automáticamente la versión y documentando cada cambio en el historial.

## Formato de Versión
- **Formato**: V1.XXX (ejemplo: V1.000, V1.001, V1.234)
- **Major**: Cambios importantes (1.xxx)
- **Minor**: Incrementos automáticos por cada cambio (x.001, x.002, etc.)

## Archivos del Sistema

### 1. `version.js`
Contiene la versión actual y funciones para manipularla.

### 2. `CHANGELOG.md`
Historial completo de cambios con formato:
```
## V1.XXX - YYYY-MM-DD
Descripción del cambio
```

### 3. Scripts de Actualización
- `update-version.sh` (Bash) - Recomendado para Linux/Mac
- `update-version.js` (Node.js) - Alternativa multiplataforma

## 🚀 Cómo Actualizar la Versión

### Opción 1: Script Bash (Recomendado)
```bash
./update-version.sh "Descripción del cambio"
```

**Ejemplo:**
```bash
./update-version.sh "Se resuelve problema de intercambio con la banca 4:1"
```

### Opción 2: Script Node.js
```bash
node update-version.js "Descripción del cambio"
```

## ✅ Qué Hace el Script

1. **Lee la versión actual** desde `version.js`
2. **Incrementa automáticamente** el número de versión (1.000 → 1.001)
3. **Actualiza 3 archivos**:
   - `version.js` - Nueva versión
   - `index.html` - Marca de agua visible
   - `CHANGELOG.md` - Añade entrada con fecha y descripción

## 📋 Ejemplo de Flujo de Trabajo

```bash
# 1. Haces cambios en el código
nano bank_logic.js

# 2. Ejecutas el script de versionado
./update-version.sh "Corregido intercambio con banca 4:1"

# 3. El sistema actualiza automáticamente:
# ✅ version.js: "1.001"
# ✅ index.html: <div class="version-watermark">v1.001</div>
# ✅ CHANGELOG.md: ## V1.001 - 2026-01-30
#                 Corregido intercambio con banca 4:1

# 4. Commitea los cambios
git add .
git commit -m "V1.001 - Corregido intercambio con banca 4:1"
git push
```

## 📝 Buenas Prácticas

### Descripciones de Cambios
- **Específicas**: "Se corrige bug de morale en unidades aisladas"
- **Accionables**: "Se añade botón de auto-investigación"
- **Evitar**: "Varios cambios", "Actualización", "Fix"

### Ejemplos de Descripciones
✅ **Buenas**:
- "Se resuelve problema de intercambio con la banca 4:1"
- "Se añade validación de suministro para movimiento de unidades"
- "Se optimiza renderizado del tablero hexagonal"
- "Se corrige desincronización en partidas multijugador"

❌ **Malas**:
- "Fix"
- "Cambios varios"
- "Update"

## 🔍 Ver Historial de Versiones

```bash
# Ver el CHANGELOG completo
cat CHANGELOG.md

# Ver últimos 20 cambios
head -n 50 CHANGELOG.md

# Buscar cambios específicos
grep -i "banca" CHANGELOG.md
```

## 🎯 Integración con Git

### Commit Automático (Opcional)
Puedes modificar `update-version.sh` para hacer commit automático:

```bash
# Al final del script, añadir:
git add version.js index.html CHANGELOG.md
git commit -m "V${NEW_VERSION} - ${CHANGE_DESC}"
echo "✅ Cambios commiteados a Git"
```

## 🛠️ Troubleshooting

### "No se pudo encontrar la versión actual"
- Verifica que `version.js` exista
- Verifica el formato: `current: "1.000"`

### "Permission denied"
```bash
chmod +x update-version.sh
```

### Script no encuentra archivos
- Ejecuta desde la raíz del proyecto: `/workspaces/iberion/`

## 📊 Estadísticas del Proyecto

Ver número total de versiones:
```bash
grep -c "^## V" CHANGELOG.md
```

Ver fecha del primer y último cambio:
```bash
grep "## V" CHANGELOG.md | head -n 1
grep "## V" CHANGELOG.md | tail -n 1
```

---

**Última actualización**: Enero 2026
