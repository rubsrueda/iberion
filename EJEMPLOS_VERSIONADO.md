# 📖 Ejemplos del Sistema de Versionado en Acción

Este documento muestra ejemplos visuales de cómo se verá el CHANGELOG.md después de varios cambios.

---

## 📊 Ejemplo 1: Primeras 5 Versiones

Así se verá CHANGELOG.md después de 5 cambios:

```markdown
# Historial de Cambios - Iberion (Hex General Evolved)

## V1.000 - Versión Inicial
- Sistema base del juego implementado
- Mecánicas de combate táctico hexagonal
- Sistema multijugador con Supabase
- Modo campaña con 8 jugadores
- Sistema de progresión de héroes
- Battle Pass estacional
- Tutorial para nuevos jugadores

## V1.001 - 2026-01-30
Implementado sistema de versionado automático con CHANGELOG.md

## V1.002 - 2026-01-30
Se resuelve problema de intercambio con la banca 4:1

## V1.003 - 2026-01-31
Se corrige bug de morale en unidades aisladas

## V1.004 - 2026-01-31
Se añade botón de auto-investigación en panel de tecnologías

## V1.005 - 2026-01-31
Se optimiza renderizado de hexágonos en mapas grandes (mejora 40%)

---
**Nota**: A partir de ahora, cada cambio incrementará automáticamente la versión.
```

---

## 📊 Ejemplo 2: Después de 20 Versiones

```markdown
# Historial de Cambios - Iberion (Hex General Evolved)

## V1.000 - Versión Inicial
[...]

## V1.020 - 2026-02-15
Se implementa sistema de alianzas entre jugadores

## V1.019 - 2026-02-14
Se añade chat en tiempo real para partidas multijugador

## V1.018 - 2026-02-14
Se corrige desincronización en turnos simultáneos

## V1.017 - 2026-02-13
Se ajusta balance: coste de caballería reducido a 70 oro

## V1.016 - 2026-02-13
Se añade animación de combate mejorada

## V1.015 - 2026-02-12
Se implementa sistema de replay de batallas

[...]
```

---

## 🎮 Ejemplo 3: Cambios de Diferentes Tipos

### Bug Fixes
```bash
$ ./version "Se corrige crash al dividir unidades con 1 regimiento"
📦 Nueva versión: V1.015
```

### Nuevas Funcionalidades
```bash
$ ./version "Se añade mercado para intercambio de recursos entre jugadores"
📦 Nueva versión: V1.016
```

### Optimizaciones
```bash
$ ./version "Se reduce tiempo de carga inicial en 50%"
📦 Nueva versión: V1.017
```

### Balanceo
```bash
$ ./version "Se incrementa daño de arqueros en bosques (+20%)"
📦 Nueva versión: V1.018
```

### Contenido
```bash
$ ./version "Se añaden 5 nuevos escenarios de campaña"
📦 Nueva versión: V1.019
```

---

## 📈 Ejemplo 4: Evolución de la Marca de Agua

### En index.html (Evolución)

**Versión 1.000** (Inicial)
```html
<div class="version-watermark" id="version-display">v1.000</div>
```

**Versión 1.050** (Después de 50 cambios)
```html
<div class="version-watermark" id="version-display">v1.050</div>
```

**Versión 1.100** (Después de 100 cambios)
```html
<div class="version-watermark" id="version-display">v1.100</div>
```

**Versión 1.234** (Después de 234 cambios)
```html
<div class="version-watermark" id="version-display">v1.234</div>
```

---

## 🔄 Ejemplo 5: Flujo Completo de Trabajo

### Día 1: Bug Fix
```bash
# Detectas un bug en el sistema de comercio
$ ./version "Se resuelve problema de intercambio con la banca 4:1"

📦 Versión actual: V1.001
📦 Nueva versión: V1.002
✅ version.js actualizado
✅ index.html actualizado
✅ CHANGELOG.md actualizado

🎉 ¡Versión actualizada exitosamente a V1.002!
```

**CHANGELOG.md actualizado:**
```markdown
## V1.002 - 2026-01-30
Se resuelve problema de intercambio con la banca 4:1
```

### Día 2: Nueva Funcionalidad
```bash
$ ./version "Se añade sistema de alianzas diplomáticas"

📦 Versión actual: V1.002
📦 Nueva versión: V1.003
[...]
```

**CHANGELOG.md actualizado:**
```markdown
## V1.003 - 2026-01-31
Se añade sistema de alianzas diplomáticas

## V1.002 - 2026-01-30
Se resuelve problema de intercambio con la banca 4:1
```

### Día 3: Optimización
```bash
$ ./version "Se optimiza algoritmo de pathfinding (60% más rápido)"

📦 Versión actual: V1.003
📦 Nueva versión: V1.004
[...]
```

---

## 📊 Ejemplo 6: Estadísticas del Proyecto

Después de 3 meses de desarrollo:

```bash
# Ver total de versiones
$ grep -c "## V" CHANGELOG.md
125

# Buscar todos los bug fixes
$ grep -i "bug\|fix\|corrige" CHANGELOG.md | wc -l
42

# Buscar nuevas funcionalidades
$ grep -i "añade\|implementa\|nuevo" CHANGELOG.md | wc -l
58

# Ver primer y último cambio
$ grep "## V" CHANGELOG.md | head -n 1
## V1.000 - Versión Inicial

$ grep "## V" CHANGELOG.md | tail -n 1
## V1.125 - 2026-04-30
```

---

## 🎯 Ejemplo 7: Git Integration

### Commit Manual con Versión
```bash
# Haces cambios
$ ./version "Se añade tutorial interactivo para nuevos jugadores"

# Commiteas con la versión en el mensaje
$ git add .
$ git commit -m "V1.010 - Se añade tutorial interactivo para nuevos jugadores"
$ git push
```

### Ver Historial Git + Versiones
```bash
$ git log --oneline -5
a1b2c3d V1.010 - Se añade tutorial interactivo
e4f5g6h V1.009 - Se optimiza IA en mapas grandes
i7j8k9l V1.008 - Se corrige bug de morale
m0n1o2p V1.007 - Se añade sistema de logros
q3r4s5t V1.006 - Se mejora interfaz móvil
```

---

## 📝 Ejemplo 8: CHANGELOG Completo Real

Así se vería después de un mes de desarrollo intenso:

```markdown
# Historial de Cambios - Iberion (Hex General Evolved)

## V1.000 - Versión Inicial
- Sistema base del juego implementado
- Mecánicas de combate táctico hexagonal
[...]

## V1.035 - 2026-02-28
Se implementa sistema de torneos automáticos semanales

## V1.034 - 2026-02-27
Se añade leaderboard global con ranking ELO

## V1.033 - 2026-02-27
Se corrige desincronización en partidas de más de 4 jugadores

## V1.032 - 2026-02-26
Se optimiza consumo de batería en dispositivos móviles

## V1.031 - 2026-02-25
Se añaden 3 nuevas civilizaciones: Vikingos, Bizantinos, Mongoles

## V1.030 - 2026-02-24
Se implementa sistema de clanes con chat privado

## V1.029 - 2026-02-23
Se ajusta balance: infantería +15% HP, caballería -10% coste

## V1.028 - 2026-02-22
Se corrige bug crítico en cálculo de suministros

## V1.027 - 2026-02-21
Se añade modo espectador para partidas en curso

## V1.026 - 2026-02-20
Se implementa sistema de repeticiones guardadas

[... continúa hasta V1.001]

---
**Nota**: Cada cambio incrementa automáticamente la versión.
```

---

## 🚀 Ejemplo 9: Cambios Múltiples en Un Día

```bash
# Sesión de desarrollo intensivo

$ ./version "Se corrige bug de división de unidades"
# V1.015

$ ./version "Se añade sonido de combate mejorado"
# V1.016

$ ./version "Se optimiza carga de sprites"
# V1.017

$ ./version "Se ajusta balance de tecnologías tier 3"
# V1.018

$ ./version "Se añade indicador visual de rango de ataque"
# V1.019

$ ./version "Se implementa sistema de notificaciones push"
# V1.020
```

**Resultado en CHANGELOG.md:**
```markdown
## V1.020 - 2026-01-30
Se implementa sistema de notificaciones push

## V1.019 - 2026-01-30
Se añade indicador visual de rango de ataque

## V1.018 - 2026-01-30
Se ajusta balance de tecnologías tier 3

## V1.017 - 2026-01-30
Se optimiza carga de sprites

## V1.016 - 2026-01-30
Se añade sonido de combate mejorado

## V1.015 - 2026-01-30
Se corrige bug de división de unidades
```

---

## 🎨 Ejemplo 10: Marca de Agua Visual

La versión aparece en la esquina del juego:

```
┌─────────────────────────────────────────┐
│                                 [v1.020]│ ← Marca de agua
│                                         │
│   ⬢ ⬢ ⬢ ⬢ ⬢                          │
│  ⬢ ⬢ ⬢ ⬢ ⬢ ⬢                         │
│   🏰 ⬢ 🗡️ ⬢ ⬢                          │
│  ⬢ ⬢ ⬢ ⬢ ⬢ ⬢                         │
│   ⬢ ⬢ ⬢ ⬢ ⬢                          │
│                                         │
│  🪙 500 | 🌾 300 | 🪵 200              │
└─────────────────────────────────────────┘
```

---

## 📈 Ejemplo 11: Crecimiento del Proyecto

### Mes 1: Estabilización (V1.001 - V1.030)
- 30 cambios
- Enfoque: Bug fixes y optimización

### Mes 2: Nuevas Funcionalidades (V1.031 - V1.080)
- 50 cambios
- Enfoque: Sistemas nuevos y contenido

### Mes 3: Balanceo y Polish (V1.081 - V1.120)
- 40 cambios
- Enfoque: Balance y mejora de UX

### Mes 4: Expansión (V1.121 - V1.180)
- 60 cambios
- Enfoque: Nuevas civilizaciones y modos

---

**Creado**: 30 enero 2026  
**Propósito**: Ejemplos visuales del sistema de versionado  
**Versión Actual del Juego**: V1.001

