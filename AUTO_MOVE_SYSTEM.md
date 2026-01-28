# Sistema de Movimiento Automático - Documentación

## Descripción General

El sistema de movimiento automático permite a los jugadores "pintar" rutas que las unidades seguirán automáticamente durante múltiples turnos. Es especialmente útil para movimientos largos que atraviesan varias casillas.

## Características

### 1. Modo Paint (Pintar Ruta)
- **Activación**: Selecciona una unidad y haz clic en el botón "🎨 Ruta Auto" del menú radial
- **Uso**: 
  - Mantén presionado el mouse/dedo sobre la unidad
  - Arrastra por los hexágonos para dibujar la ruta
  - Suelta para confirmar la ruta
- **Visualización en tiempo real**: La ruta se dibuja mientras arrastras, mostrando:
  - 🎯 Punto de inicio
  - Números para pasos intermedios
  - 🏁 Punto final

### 2. Validación de Ruta
El sistema valida automáticamente que:
- Los hexágonos son adyacentes
- El terreno es transitable para la unidad
- No hay unidades bloqueando el camino
- La ruta no contiene loops

### 3. Ejecución Automática
- **Al inicio de cada turno**: La unidad se moverá automáticamente un paso por la ruta
- **Límite de acciones**: Solo se ejecuta si la unidad no ha actuado ese turno
- **Bloqueos**: Si la ruta se bloquea (unidad enemiga, terreno cambiado), se cancela automáticamente

### 4. Visualización de Ruta Confirmada
Una vez confirmada, la ruta se muestra con:
- 📍 Posición actual
- → Flechas para pasos siguientes
- ⭐ Destino final

### 5. Cancelación de Ruta
- **Desde el menú radial**: Selecciona la unidad y haz clic en "🚫 Cancelar Ruta"
- **Automática**: Si la ruta se bloquea o la unidad es atacada

## Arquitectura Técnica

### Archivos Principales

#### autoMoveManager.js
Gestor principal del sistema con las siguientes responsabilidades:
- Detección de eventos de arrastre (mouse/touch)
- Validación de rutas
- Visualización de rutas
- Ejecución automática de movimientos

#### Integraciones

**gameFlow.js**
```javascript
function resetUnitsForNewTurn(playerNumber) {
    // Al inicio del turno, procesar movimientos automáticos
    if (typeof AutoMoveManager !== 'undefined') {
        AutoMoveManager.processAutoMovesForCurrentPlayer();
    }
    // ... resto del código
}
```

**uiUpdates.js**
```javascript
// Botón en menú radial
if (!unit.autoMoveActive) {
    actions.push({ 
        icon: '🎨', 
        title: 'Ruta Auto', 
        onClick: () => AutoMoveManager.activatePaintMode(unit)
    });
}
```

**main.js**
```javascript
function initApp() {
    // Inicialización del sistema
    if (typeof AutoMoveManager !== 'undefined') {
        AutoMoveManager.init();
    }
}
```

### Estructura de Datos

#### En la unidad (unit)
```javascript
unit = {
    // ... propiedades existentes
    autoMovePath: [{r: 5, c: 7}, {r: 5, c: 8}, ...],  // Array de coordenadas
    autoMoveCurrentStep: 0,                             // Índice del paso actual
    autoMoveActive: true,                               // Flag de ruta activa
    autoMoveVisuals: [...]                              // Elementos DOM de visualización
}
```

### API Pública

#### AutoMoveManager.activatePaintMode(unit)
Activa el modo de pintar ruta para una unidad específica.

#### AutoMoveManager.deactivatePaintMode()
Desactiva el modo paint.

#### AutoMoveManager.cancelAutoMove(unit)
Cancela la ruta automática de una unidad.

#### AutoMoveManager.processAutoMovesForCurrentPlayer()
Procesa todos los movimientos automáticos del jugador actual (llamado al inicio del turno).

#### AutoMoveManager.executeAutoMoveStep(unit)
Ejecuta un paso individual de movimiento automático para una unidad.

### Eventos

El sistema escucha los siguientes eventos:
- `mousedown`, `mousemove`, `mouseup`, `mouseleave` (Desktop)
- `touchstart`, `touchmove`, `touchend`, `touchcancel` (Mobile)

### Estilos CSS

Se inyectan automáticamente estilos para:
- `.auto-path-marker` - Marcadores de ruta durante el pintado
- `.auto-path-highlight` - Resaltado de hexágonos en la ruta
- `.auto-path-confirmed` - Marcadores de ruta confirmada
- Animaciones `pulse` y `float`

## Flujo de Trabajo

### Fase 1: Pintar Ruta
```
Usuario selecciona unidad
  ↓
Clic en botón "Ruta Auto"
  ↓
Modo paint activado
  ↓
Usuario arrastra por hexágonos
  ↓
Sistema valida cada paso
  ↓
Visualización en tiempo real
  ↓
Usuario suelta → Ruta confirmada
```

### Fase 2: Ejecución Automática
```
Inicio del turno del jugador
  ↓
AutoMoveManager.processAutoMovesForCurrentPlayer()
  ↓
Para cada unidad con ruta activa:
  ↓
  Verificar que no ha actuado
  ↓
  Obtener siguiente paso
  ↓
  Validar movimiento
  ↓
  Ejecutar movimiento
  ↓
  Actualizar visualización
  ↓
  Incrementar paso actual
  ↓
  ¿Ruta completada? → Limpiar ruta
  ↓
  ¿Ruta bloqueada? → Cancelar ruta
```

## Casos de Uso

### 1. Movimiento de Exploración
Envía una unidad de caballería a explorar territorio lejano sin tener que moverla manualmente cada turno.

### 2. Refuerzos
Mueve refuerzos desde la capital al frente automáticamente.

### 3. Reposicionamiento Táctico
Mueve unidades a posiciones defensivas mientras te concentras en el combate.

### 4. Comercio (Rutas de Caravana)
Establece rutas de comercio automáticas para unidades de comercio.

## Limitaciones y Consideraciones

### Limitaciones
- La ruta se cancela si:
  - La unidad es atacada
  - El camino se bloquea
  - La unidad se une con otra
  - La unidad es destruida
- Una unidad solo puede tener una ruta activa a la vez
- La ruta no recalcula automáticamente si hay bloqueos temporales

### Consideraciones de Red
- En partidas multijugador, las rutas se sincronizan via gameState
- Los movimientos automáticos usan el mismo sistema de Request que los movimientos manuales
- La validación se hace tanto en cliente como en servidor

### Performance
- Las rutas muy largas (>20 hexágonos) pueden causar lag visual
- El sistema actualiza la visualización cada 50ms durante el arrastre
- Se recomienda limitar rutas a 10-15 hexágonos

## Depuración

### Logs
El sistema genera logs con prefijo `[AutoMove]`:
```
[AutoMove] Modo paint activado para unidad u123
[AutoMove] Ruta extendida a (5, 7)
[AutoMove] Ruta confirmada: [{r:5,c:7}, {r:5,c:8}]
[AutoMove] Ejecutando paso 1/3 para Infantry Division
```

### Comandos de Consola
```javascript
// Activar modo paint manualmente
AutoMoveManager.activatePaintMode(selectedUnit);

// Cancelar todas las rutas
units.forEach(u => AutoMoveManager.cancelAutoMove(u));

// Ver unidades con rutas activas
units.filter(u => u.autoMoveActive);
```

## Futuras Mejoras

### Planeadas
1. **Rutas Condicionales**: "Ir a X, si hay enemigo ir a Y"
2. **Rutas de Patrulla**: Movimiento circular automático
3. **Recálculo Inteligente**: Re-calcular ruta si hay bloqueo temporal
4. **Rutas por Objetivos**: "Ir a la ciudad más cercana"
5. **Templates de Rutas**: Guardar y reutilizar rutas comunes

### En Consideración
- Integración con sistema de IA para unidades controladas por IA
- Rutas para grupos de unidades
- Sincronización de rutas (varias unidades llegan al mismo tiempo)
- Prioridades de movimiento

## Changelog

### v1.0.0 (2026-01-28)
- ✅ Implementación inicial
- ✅ Modo paint con arrastre
- ✅ Visualización en tiempo real
- ✅ Ejecución automática por turnos
- ✅ Integración con menú radial
- ✅ Soporte touch para móviles
- ✅ Validación de rutas
- ✅ Sistema de cancelación

---

**Autor**: Rubén Rueda
**Fecha**: 28 de Enero de 2026
**Versión**: 1.0.0
