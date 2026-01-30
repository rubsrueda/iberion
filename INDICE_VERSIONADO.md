# 📚 Índice - Sistema de Versionado Iberion

## 🎯 Acceso Rápido

### Para Usuarios Nuevos
1. 📖 [GUIA_VERSIONADO.md](GUIA_VERSIONADO.md) - **EMPIEZA AQUÍ** - Guía rápida de uso
2. 📊 [EJEMPLOS_VERSIONADO.md](EJEMPLOS_VERSIONADO.md) - Ver ejemplos visuales
3. 📝 [CHANGELOG.md](CHANGELOG.md) - Ver historial de cambios

### Para Desarrollo Diario
```bash
# Comando único que necesitas
./version "Descripción del cambio"
```

### Para Referencia Técnica
1. 🔧 [VERSION_SYSTEM.md](VERSION_SYSTEM.md) - Documentación técnica completa
2. 📋 [RESUMEN_VERSIONADO.md](RESUMEN_VERSIONADO.md) - Resumen de implementación

---

## 📂 Estructura de Archivos

```
Sistema de Versionado/
│
├── 🚀 Scripts Ejecutables
│   ├── version                    # Atajo rápido (recomendado)
│   ├── update-version.sh         # Script principal Bash
│   └── update-version.js         # Alternativa Node.js
│
├── 🎮 Archivos del Juego
│   ├── version.js                # Control de versión actual
│   └── index.html                # Marca de agua visible
│
├── 📚 Documentación
│   ├── GUIA_VERSIONADO.md       # Guía rápida ⭐ EMPIEZA AQUÍ
│   ├── EJEMPLOS_VERSIONADO.md   # Ejemplos visuales
│   ├── VERSION_SYSTEM.md        # Documentación técnica
│   ├── RESUMEN_VERSIONADO.md    # Resumen de implementación
│   └── INDICE_VERSIONADO.md     # Este archivo
│
└── 📝 Historial
    └── CHANGELOG.md              # Registro de todos los cambios
```

---

## 🎯 Casos de Uso

### "Quiero actualizar la versión ahora mismo"
```bash
./version "Tu cambio aquí"
```
Ver: [GUIA_VERSIONADO.md](GUIA_VERSIONADO.md)

### "Quiero ver ejemplos de cómo usar esto"
Ver: [EJEMPLOS_VERSIONADO.md](EJEMPLOS_VERSIONADO.md)

### "Quiero ver todos los cambios hasta ahora"
```bash
cat CHANGELOG.md
```
Ver: [CHANGELOG.md](CHANGELOG.md)

### "Quiero entender cómo funciona técnicamente"
Ver: [VERSION_SYSTEM.md](VERSION_SYSTEM.md)

### "Quiero ver qué se implementó"
Ver: [RESUMEN_VERSIONADO.md](RESUMEN_VERSIONADO.md)

---

## 📖 Documentos por Audiencia

### 👤 Desarrollador Nuevo
1. [GUIA_VERSIONADO.md](GUIA_VERSIONADO.md) - Aprende lo básico
2. [EJEMPLOS_VERSIONADO.md](EJEMPLOS_VERSIONADO.md) - Ve ejemplos
3. Practica: `./version "Mi primer cambio"`

### 💻 Desarrollador Activo
- **Uso diario**: `./version "cambio"`
- **Ver cambios**: `cat CHANGELOG.md`
- **Búsqueda**: `grep -i "palabra" CHANGELOG.md`

### 🔧 Mantenedor/DevOps
- [VERSION_SYSTEM.md](VERSION_SYSTEM.md) - Arquitectura completa
- [RESUMEN_VERSIONADO.md](RESUMEN_VERSIONADO.md) - Estado actual
- Scripts: `update-version.sh` y `update-version.js`

---

## 🔍 Búsqueda Rápida

### ¿Cómo actualizo la versión?
[GUIA_VERSIONADO.md#uso-diario](GUIA_VERSIONADO.md)

### ¿Qué formato tiene el CHANGELOG?
[EJEMPLOS_VERSIONADO.md#formato-del-changelog](EJEMPLOS_VERSIONADO.md)

### ¿Cómo funciona técnicamente?
[VERSION_SYSTEM.md#arquitectura](VERSION_SYSTEM.md)

### ¿Qué archivos se modifican?
[RESUMEN_VERSIONADO.md#archivos-modificados](RESUMEN_VERSIONADO.md)

### ¿Ejemplos de uso?
[EJEMPLOS_VERSIONADO.md](EJEMPLOS_VERSIONADO.md)

---

## 🎨 Diagrama Visual

```
      TÚ HACES CAMBIOS
             │
             ▼
      ./version "cambio"
             │
             ▼
    ┌────────────────────┐
    │  Sistema Actualiza │
    └────────┬───────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
version.js      index.html
  1.001    →    1.002      (Marca de agua)
    │                 │
    └────────┬────────┘
             ▼
       CHANGELOG.md
    (Nueva entrada con fecha)
             │
             ▼
         ¡LISTO!
```

---

## 📊 Estado Actual

| Concepto | Valor |
|----------|-------|
| **Versión Actual** | V1.001 |
| **Última Actualización** | 30 enero 2026 |
| **Próxima Versión** | V1.002 |
| **Total Cambios** | 1 |
| **Scripts Disponibles** | 3 (version, .sh, .js) |
| **Archivos de Docs** | 6 |

---

## 🚀 Quick Start (30 segundos)

```bash
# 1. Haces cambios en tu código
nano bank_logic.js

# 2. Actualizas la versión
./version "Se resuelve problema de intercambio con la banca 4:1"

# 3. ¡Listo! Todo actualizado automáticamente
# ✅ version.js
# ✅ index.html  
# ✅ CHANGELOG.md
```

---

## 📞 Soporte

### Problemas Comunes
Ver: [VERSION_SYSTEM.md#troubleshooting](VERSION_SYSTEM.md)

### Ejemplos Paso a Paso
Ver: [EJEMPLOS_VERSIONADO.md](EJEMPLOS_VERSIONADO.md)

### Flujo de Trabajo
Ver: [GUIA_VERSIONADO.md#checklist-por-cambio](GUIA_VERSIONADO.md)

---

## 🎯 Próximos Pasos

1. ✅ Lee [GUIA_VERSIONADO.md](GUIA_VERSIONADO.md)
2. ✅ Prueba: `./version "Mi primer cambio de prueba"`
3. ✅ Verifica `CHANGELOG.md` y la marca de agua en `index.html`
4. ✅ Usa en tu desarrollo diario

---

**Creado**: 30 enero 2026  
**Sistema**: Versionado Automático Iberion  
**Versión del Sistema**: V1.0  
**Versión del Juego**: V1.001

