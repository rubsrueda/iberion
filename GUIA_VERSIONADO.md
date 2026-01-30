# 🎯 Guía Rápida - Sistema de Versionado Iberion

## ✨ Lo que se ha implementado

### 1️⃣ Archivos Creados
- ✅ `version.js` - Control de versión actual
- ✅ `CHANGELOG.md` - Historial de cambios
- ✅ `update-version.sh` - Script principal de actualización
- ✅ `update-version.js` - Alternativa Node.js
- ✅ `version` - Atajo rápido
- ✅ `VERSION_SYSTEM.md` - Documentación completa

### 2️⃣ Archivos Modificados
- ✅ `index.html` - Marca de agua actualizada (v1.000 → v1.001)
  - Se cambió de `v1.0` a formato `v1.XXX`
  - Se añadió ID para actualización dinámica
  - Se integró script version.js

### 3️⃣ Versión Actual
**V1.001** - Sistema de versionado automático implementado

---

## 🚀 Uso Diario

### Opción 1: Comando Corto (Recomendado)
```bash
./version "Descripción del cambio"
```

### Opción 2: Script Completo
```bash
./update-version.sh "Descripción del cambio"
```

---

## 📝 Ejemplos Prácticos

```bash
# Ejemplo 1: Bug fix
./version "Se resuelve problema de intercambio con la banca 4:1"
# Resultado: V1.002

# Ejemplo 2: Nueva funcionalidad
./version "Se añade botón de comercio rápido con IA"
# Resultado: V1.003

# Ejemplo 3: Optimización
./version "Se optimiza renderizado de hexágonos en mapas grandes"
# Resultado: V1.004

# Ejemplo 4: Balance
./version "Se ajusta coste de reclutamiento de caballería"
# Resultado: V1.005
```

---

## 🔍 Ver Cambios Recientes

```bash
# Ver últimos 10 cambios
head -n 30 CHANGELOG.md

# Buscar cambios específicos
grep -i "banca" CHANGELOG.md
grep -i "comercio" CHANGELOG.md

# Ver versión actual
cat version.js | grep current
```

---

## ✅ Checklist por Cambio

1. [ ] Haces tus modificaciones al código
2. [ ] Pruebas que funcione correctamente
3. [ ] Ejecutas: `./version "Descripción clara del cambio"`
4. [ ] Verificas que aparece en CHANGELOG.md
5. [ ] (Opcional) Commit a Git:
   ```bash
   git add .
   git commit -m "VXXX - Descripción"
   git push
   ```

---

## 🎨 Dónde se Ve la Versión

La marca de agua aparece en:
- **Esquina del juego**: Elemento visual con clase `.version-watermark`
- **CHANGELOG.md**: Historial completo
- **version.js**: Variable `current`

---

## 🔧 Troubleshooting

### Error: "Permission denied"
```bash
chmod +x version
chmod +x update-version.sh
```

### La versión no se actualiza visualmente
1. Refresca el navegador (Ctrl+F5)
2. Verifica que `version.js` se cargue antes que otros scripts

### CHANGELOG.md no se actualiza
Verifica que existe el separador `---` en el archivo

---

## 📊 Formato del CHANGELOG

```markdown
## V1.XXX - YYYY-MM-DD
Descripción del cambio realizado

## V1.002 - 2026-01-30
Se resuelve problema de intercambio con la banca 4:1

## V1.001 - 2026-01-30
Implementado sistema de versionado automático con CHANGELOG.md
```

---

## 🎯 Próximos Pasos

Cada vez que hagas UN cambio significativo:
1. Usa `./version "descripción"`
2. El sistema incrementa automáticamente (1.001 → 1.002 → 1.003...)
3. Se documenta en CHANGELOG.md con fecha
4. La marca de agua se actualiza automáticamente

---

**Sistema creado**: 30 enero 2026  
**Versión inicial**: V1.000  
**Versión actual**: V1.001  
**Próxima versión**: V1.002 (cuando ejecutes el comando)

