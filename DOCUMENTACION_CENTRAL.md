# 📚 IBERION: Centro de Documentación Completo

**Última actualización:** 2 de febrero de 2026  
**Versión del juego:** 1.0.0

---

## 🎯 Comienza Aquí (Selecciona tu Rol)

### 👨‍💻 Eres Programador Nuevo

1. **Primero (15 min):** [Quick Start para Developers](./QUICK_START_DEVELOPERS.md)
   - Qué es IBERION en 5 minutos
   - Ciclo de turno simplificado
   - Tu primer bug fix
   - Ruta de aprendizaje de 5 días

2. **Segundo (30 min):** [Guía Técnica-Funcional](./GUIA_TECNICA_FUNCIONAL_IBERION.md)
   - Arquitectura completa
   - Estado del juego en detalle
   - Cada sistema explicado
   - Cómo agregar features

3. **Tercero (20 min):** [Patrones de Código](./PATRONES_CODIGO.md)
   - Patrón Request (para acciones)
   - Patrón Manager (para subsistemas)
   - Patrón Modal (para UI)
   - Patrón de Red (sincronización)

4. **Cuando necesites:** Documentos específicos (ver abajo)

---

### 🎮 Eres Game Designer

1. **Primero (20 min):** [Guía Gameplay y Mecánicas](./GUIA_GAMEPLAY_MECANICAS.md)
   - Cómo ganar (3 formas)
   - Recursos y economía
   - Mecánicas de combate
   - Todas las civilizaciones
   - Estrategia avanzada
   - Balance y tunning

2. **Segundo (15 min):** Secciones relevantes de [Guía Técnica-Funcional](./GUIA_TECNICA_FUNCIONAL_IBERION.md)
   - Sistema de Unidades
   - Sistema de Recursos
   - Sistema de Civilizaciones
   - Cómo agregar nuevas civilizaciones

3. **Para trashtalk:** [Glossario de Términos](./GUIA_GAMEPLAY_MECANICAS.md#glossario)

---

### 👥 Eres QA / Tester

1. **Primero (10 min):** [Guía Gameplay y Mecánicas - Modos de Juego](./GUIA_GAMEPLAY_MECANICAS.md#modos-de-juego)
   - Qué es cada modo
   - Cómo probar cada uno

2. **Segundo (15 min):** [Quick Start - Testing](./QUICK_START_DEVELOPERS.md#-cómo-probar-tu-código)
   - Test local
   - Test multijugador local
   - Test en red

3. **Para bugs específicos:** Busca en [Checklist de Implementación](./PATRONES_CODIGO.md#checklist-de-implementación)

---

### 🎬 Eres Community Manager / Productor

1. **Primero (20 min):** [Guía Gameplay - Conceptos](./GUIA_GAMEPLAY_MECANICAS.md#cómo-ganar)
   - Mecánicas principales
   - Modos de juego
   - Balance esperado

2. **Luego:** [Patrones de Balance y Tunning](./GUIA_GAMEPLAY_MECANICAS.md#balance-y-tunning)
   - Cómo se mide balance
   - Cómo se hacen cambios
   - Cómo rotan contenidos

---

## 📖 Documentos Disponibles

### Documentación Principal

| Documento | Contenido | Tiempo | Para |
|-----------|-----------|--------|------|
| 📘 [Quick Start Developers](./QUICK_START_DEVELOPERS.md) | Primer día, aprendizaje acelerado | 15 min | Programmers |
| 📗 [Guía Técnica-Funcional](./GUIA_TECNICA_FUNCIONAL_IBERION.md) | Arquitectura completa, todos los sistemas | 1-2 horas | Programmers |
| 📙 [Patrones de Código](./PATRONES_CODIGO.md) | Cómo escribir código consistente | 30 min | Programmers |
| 📕 [Guía Gameplay y Mecánicas](./GUIA_GAMEPLAY_MECANICAS.md) | Cómo jugar, balance, estrategia | 45 min | Designers, Players |
| � [FAQ Extendido](./FAQ_EXTENDIDO.md) | Respuestas rápidas a preguntas comunes | 20 min | All |
| 📓 [Cheat Sheet](./CHEAT_SHEET_QUICK_REFERENCE.md) | Referencia rápida (imprimible) | 5 min | Programmers |
| 📖 [Solución Partidas/Persistencia](./SOLUCION_SISTEMA_PARTIDAS_PERSISTENCIA.md) | Fix de bugs de save/load | 15 min | Programmers (específico) |

### Documentación Copilot Instructions

- 📄 [Copilot Instructions](/.github/copilot-instructions.md) - Arquitectura del proyecto para IA

---

## 🔍 Busca por Tema

### Arquitectura y Estructura

- **Estado del juego:** [Guía Técnica § Estructura de Estado](./GUIA_TECNICA_FUNCIONAL_IBERION.md#estructura-de-estado)
- **Capas de arquitectura:** [Guía Técnica § Arquitectura](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura)
- **Flujo de datos:** [Guía Técnica § Flujo Principal de Datos](./GUIA_TECNICA_FUNCIONAL_IBERION.md#flujo-principal-de-datos)
- **Mapa mental de archivos:** [Quick Start § Archivos Clave](./QUICK_START_DEVELOPERS.md#-archivos-clave-mapa-mental)

### Sistemas del Juego

- **Sistema de Unidades:** [Guía Técnica § Sistema de Unidades](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-unidades)
- **Sistema de Recursos:** [Guía Técnica § Sistema de Recursos](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-recursos)
- **Sistema de Turnos:** [Guía Técnica § Sistema de Turnos](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-turnos)
- **Sistema de Morale:** [Guía Técnica § Sistema de Morale](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-morale)
- **Sistema de Supply:** [Guía Técnica § Sistema de Supply](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-supply)
- **Civilizaciones:** [Guía Técnica § Civilizaciones](./GUIA_TECNICA_FUNCIONAL_IBERION.md#civilizaciones)

### Gameplay

- **Cómo ganar:** [Gameplay § Cómo Ganar](./GUIA_GAMEPLAY_MECANICAS.md#cómo-ganar)
- **Recursos:** [Gameplay § Recursos y Economía](./GUIA_GAMEPLAY_MECANICAS.md#recursos-y-economía)
- **Combate:** [Gameplay § Mecánicas de Combate](./GUIA_GAMEPLAY_MECANICAS.md#mecánicas-de-combate)
- **Unidades:** [Gameplay § Sistema de Unidades](./GUIA_GAMEPLAY_MECANICAS.md#sistema-de-unidades)
- **Modos:** [Gameplay § Modos de Juego](./GUIA_GAMEPLAY_MECANICAS.md#modos-de-juego)
- **Estrategia:** [Gameplay § Estrategia Avanzada](./GUIA_GAMEPLAY_MECANICAS.md#estrategia-avanzada)
- **Balance:** [Gameplay § Balance y Tunning](./GUIA_GAMEPLAY_MECANICAS.md#balance-y-tunning)

### Patrones de Código

- **Validación de Estado:** [Patrones § Validación](./PATRONES_CODIGO.md#1-validación-de-estado)
- **Patrón Request:** [Patrones § Patrón Request](./PATRONES_CODIGO.md#patrón-estándar-de-request)
- **Deduplicación de Acciones:** [Patrones § Deduplicación](./PATRONES_CODIGO.md#deduplicación-de-acciones)
- **Manager Pattern:** [Patrones § Patrones de Manager](./PATRONES_CODIGO.md#patrones-de-manager)
- **UI Pattern:** [Patrones § Patrones de UI](./PATRONES_CODIGO.md#patrones-de-ui)
- **Network Pattern:** [Patrones § Patrones de Red](./PATRONES_CODIGO.md#patrones-de-red)
- **Save/Load:** [Patrones § Persistencia](./PATRONES_CODIGO.md#patrones-de-persistencia)

### Implementación

- **Tu primer bug fix:** [Quick Start § Ejemplo Real](./QUICK_START_DEVELOPERS.md#-tu-primer-bug-fix-ejemplo-real)
- **Agregar unidad:** [Guía Técnica § Agregar Unidad](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-una-unidad-nueva)
- **Agregar civilización:** [Guía Técnica § Agregar Civilización](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-una-nueva-civilización)
- **Checklist implementación:** [Patrones § Checklist](./PATRONES_CODIGO.md#checklist-de-implementación)

### Debugging

- **Debug Console:** [Quick Start § Debug Console](./QUICK_START_DEVELOPERS.md#-debug-console-tu-mejor-amigo)
- **Guía de testing:** [Quick Start § Testing](./QUICK_START_DEVELOPERS.md#-cómo-probar-tu-código)
- **Troubleshooting:** [Guía Técnica § Troubleshooting](./GUIA_TECNICA_FUNCIONAL_IBERION.md#troubleshooting-común)
- **Convenciones de nombres:** [Patrones § Convenciones](./PATRONES_CODIGO.md#convenciones-de-nombres)

---

## 📚 Ruta de Aprendizaje Recomendada

### Para Programadores Nuevos (5 días)

**Día 1 (45 min):**
1. Lee [Quick Start](./QUICK_START_DEVELOPERS.md) (15 min)
2. Abre `state.js` y `main.js` (15 min)
3. Prueba comandos en debug console (15 min)

**Día 2 (1 hora):**
1. Lee [Guía Técnica § Arquitectura](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura) (20 min)
2. Lee [Guía Técnica § Estructura de Estado](./GUIA_TECNICA_FUNCIONAL_IBERION.md#estructura-de-estado) (20 min)
3. Explora archivos clave mencionados (20 min)

**Día 3 (1.5 horas):**
1. Lee [Patrones § Request](./PATRONES_CODIGO.md#patrón-estándar-de-request) (20 min)
2. Lee ejemplo real en [unit_Actions.js](./unit_Actions.js) (40 min)
3. Copia template e intenta escribir función dummy (30 min)

**Día 4 (1 hora):**
1. Elige un bug fácil
2. Reproducelouen debug console (30 min)
3. Encuentra archivo y causa (15 min)
4. Implementa fix (15 min)

**Día 5 (1 hora):**
1. Elige una feature pequeña (botón, stat display)
2. Implementa siguiendo patrones (45 min)
3. Prueba local, local multijugador, red (15 min)

---

## 🔗 Vínculos Cruzados Importantes

### Si voy a...

#### ...Agregar una acción del jugador
1. Leer [Quick Start § Plantilla de función](./QUICK_START_DEVELOPERS.md#-estructura-de-una-función-plantilla)
2. Leer [Patrones § Patrón Request](./PATRONES_CODIGO.md#patrón-estándar-de-request)
3. Mirar ejemplo en [unit_Actions.js](./unit_Actions.js#L100) (reemplazar linea 100 con número real)
4. Copiar, modificar, probar

#### ...Equilibrar unidades
1. Leer [Gameplay § Sistema de Unidades](./GUIA_GAMEPLAY_MECANICAS.md#sistema-de-unidades)
2. Leer [Gameplay § Balance](./GUIA_GAMEPLAY_MECANICAS.md#balance-y-tunning)
3. Ir a [constants.js](./constants.js) y cambiar stats
4. Probar contra IA y otros jugadores
5. Revisar winrate

#### ...Investigar un bug de sincronización
1. Leer [Patrones § Red](./PATRONES_CODIGO.md#patrones-de-red)
2. Revisar el Request function involucrado
3. Buscar `NetworkManager._prepararEstadoParaNube`
4. Revisar [Guía Técnica § Network](./GUIA_TECNICA_FUNCIONAL_IBERION.md#red-y-sincronización)

#### ...Entender morale/supply
1. Leer [Gameplay § Economía](./GUIA_GAMEPLAY_MECANICAS.md#recursos-y-economía)
2. Leer [Guía Técnica § Sistema de Morale](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-morale)
3. Leer [Guía Técnica § Sistema de Supply](./GUIA_TECNICA_FUNCIONAL_IBERION.md#sistema-de-supply)
4. Buscar en código: `calculateMorale()`, `isHexSupplied()`

#### ...Hacer un PR
1. Revisar [Patrones § Checklist](./PATRONES_CODIGO.md#checklist-de-implementación)
2. Probar local, local multijugador, red
3. Asegurar logs apropiados
4. Escribir descripción clara

---

## ❓ Preguntas Frecuentes

**P: Me asignan un bug, ¿por dónde empiezo?**  
A: [Quick Start § Tu Primer Bug Fix](./QUICK_START_DEVELOPERS.md#-tu-primer-bug-fix-ejemplo-real) te guía paso a paso.

**P: No entiendo la arquitectura**  
A: Lee [Guía Técnica § Arquitectura](./GUIA_TECNICA_FUNCIONAL_IBERION.md#arquitectura), es visual.

**P: ¿Cómo funciona el savegame?**  
A: [Guía Técnica § Persistencia](./GUIA_TECNICA_FUNCIONAL_IBERION.md#persistencia-y-storage) lo explica todo.

**P: ¿Cuál es la diferencia entre gameState local vs red?**  
A: [Patrones § Red](./PATRONES_CODIGO.md#patrones-de-red) lo cubre.

**P: ¿Qué validaciones necesito?**  
A: [Patrones § Validación](./PATRONES_CODIGO.md#1-validación-de-estado) y [Checklist](./PATRONES_CODIGO.md#checklist-de-implementación).

**P: ¿Cómo agrego X feature?**  
A: Ve a [Guía Técnica § Agregar Features](./GUIA_TECNICA_FUNCIONAL_IBERION.md#agregar-features) (3 ejemplos detallados).

---

## 🎓 Vocabulario Clave

- **gameState:** El "cerebro" - dónde vive toda la información de la partida
- **board[][]:** El mapa - qué hay en cada hexágono
- **units[]:** Las tropas - lista de todas las unidades
- **Request function:** Acción del jugador que valida antes de ejecutar
- **Manager:** Subsistema (NetworkManager, UIManager, etc.)
- **actionId:** ID única para evitar duplicados en red
- **autoSave:** Guardado automático cada turno
- **Morale:** "Ánimo" de unidad (0-100, afecta combate)
- **Supply:** Suministro (conectada a ciudad amiga)
- **Upkeep:** Costo de mantenimiento

Ver [Glossario completo](./GUIA_GAMEPLAY_MECANICAS.md#glossario).

---

## 🔧 Herramientas útiles en el Repo

```bash
# Buscar en archivos
grep -r "RequestMoveUnit" .         # Encontrar dónde se usa

# Debug console (F12 o Ctrl+Shift+D)
gameState.currentPlayer = 2         # Cambiar jugador
units[0].health = 1                 # Dañar unidad
handleEndTurn()                     # Simular turno

# Ver estructura de estado
JSON.stringify(gameState, null, 2)  # Pretty print
```

---

## 📞 Contacto / Escalación

Si necesitas aclaración sobre un documento:
1. Revisa el índice de contenidos (H2/H3)
2. Busca palabra clave con Ctrl+F
3. Lee la sección completa (no solo el párrafo)
4. Si sigue sin estar claro → documentación mejorable

---

## 📋 Checklist de Onboarding Completo

- [ ] Leí Quick Start (15 min)
- [ ] Abrí los archivos clave mencionados (15 min)
- [ ] Probé debug console (10 min)
- [ ] Entiendo ciclo de turno (10 min)
- [ ] Leí Guía Técnica § Arquitectura (20 min)
- [ ] Entiendo patrón Request (20 min)
- [ ] Hice mi primer bug fix (30 min)
- [ ] Hice mi primera feature pequeña (45 min)
- [ ] Hice mi primer PR (30 min)

**Tiempo total:** ~4 horas

---

## 📊 Estadísticas de Documentación

| Documento | Líneas | Temas | Para |
|-----------|--------|-------|------|
| Quick Start | 400+ | 8 | Developers |
| Guía Técnica | 1200+ | 15 | Developers |
| Patrones | 500+ | 7 | Developers |
| Gameplay | 800+ | 10 | Designers |
| FAQ Extendido | 600+ | 30+ | All |
| Cheat Sheet | 300+ | 50+ | Developers |
| **TOTAL** | **3800+** | **120+** | **All** |

---

## 📚 Documentación Completamente Creada

✅ **6 Documentos Principales**
✅ **3800+ líneas de documentación**
✅ **120+ temas cubiertos**
✅ **Para todas las audiencias** (Developers, Designers, QA, Community)
✅ **Multiformato** (Guías, Patrones, FAQ, Cheat Sheet, Soluciones)
✅ **Listas para onboarding** (5 días con guía clara)

---

**Última actualización:** 2 de febrero de 2026  
**Versión de IBERION:** 1.0.0  
**Estado:** ✅ Completa y Lista para Onboarding
