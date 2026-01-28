# Sistema de Recompensas de Puntos de Investigación

## Descripción General

Sistema automático que otorga puntos de investigación (💡) a los jugadores por realizar acciones clave durante el juego. Los puntos de investigación son necesarios para desbloquear tecnologías en el árbol tecnológico.

## Acciones que Otorgan Puntos

| Acción | Puntos | Descripción |
|--------|--------|-------------|
| **Casilla Explorada** | +1 💡 | Cada vez que se revela una casilla en la niebla de guerra (fog of war) por primera vez |
| **Ruina Explorada** | +10 💡 | Al explorar y saquear una ruina con un regimiento de Exploradores |
| **División Creada** | +3 💡 | Cada vez que se divide una unidad (split) en dos |
| **Infraestructura Creada** | +5 💡 | Al construir cualquier estructura (caminos, fuertes, aldeas, etc.) |
| **Batalla Ocurrida** | +8 💡 | Cada batalla entre unidades. **Ambos jugadores** (atacante y defensor) reciben puntos |
| **Transacción con la Banca** | +2 💡 | Cada compra/venta de recursos en el mercado de La Banca |
| **Intercambios de Caravana** | +5 💡 | **Cada 5 intercambios** completados por caravanas comerciales |

## Implementación Técnica

### Archivos del Sistema

- **`researchRewardsManager.js`** - Manager principal que gestiona las recompensas
- Integrado en:
  - `gameFlow.js` - Fog of war y caravanas
  - `unit_Actions.js` - Splits, ruinas, estructuras, batallas
  - `modalLogic.js` - Transacciones bancarias
  - `networkManager.js` - Serialización para juego en red
  - `main.js` - Inicialización

### Funciones Principales

```javascript
// Otorgar puntos a un jugador
ResearchRewardsManager.grantResearchPoints(playerId, amount, reason);

// Hooks de acciones (llamadas automáticas)
ResearchRewardsManager.onHexExplored(playerId, r, c);
ResearchRewardsManager.onRuinExplored(playerId);
ResearchRewardsManager.onUnitSplit(playerId);
ResearchRewardsManager.onStructureBuilt(playerId, structureType);
ResearchRewardsManager.onBattleOccurred(attackerId, defenderId);
ResearchRewardsManager.onBankTransaction(playerId);
ResearchRewardsManager.onCaravanTrade(playerId);
```

### Persistencia de Datos

El sistema almacena:
- **Casillas exploradas** por cada jugador (Set → Array para serialización)
- **Contador de intercambios** de caravana por jugador
- Los datos se guardan en `gameState.researchRewards`

Para juego en red:
- `prepareForSerialization()` - Convierte Sets a Arrays antes de JSON.stringify
- `restoreAfterDeserialization()` - Restaura Arrays a Sets después de JSON.parse

## Equilibrio del Sistema

### Progresión Estimada (Partida Normal)

- **Fase Temprana (Turnos 1-10)**
  - Exploración: ~15-20 pts (15-20 casillas)
  - Construcción inicial: ~10 pts (2-3 estructuras)
  - Primeras divisiones: ~6 pts (2 splits)
  - **Total: ~31-36 pts**

- **Fase Media (Turnos 11-30)**
  - Exploración continua: ~10 pts
  - Infraestructura: ~15-20 pts (3-4 estructuras)
  - Batallas: ~16-24 pts (2-3 batallas)
  - Transacciones: ~4-6 pts
  - **Total adicional: ~45-60 pts**

- **Fase Tardía (Turnos 31+)**
  - Batallas intensas: ~32-40 pts (4-5 batallas)
  - Caravanas: ~5-10 pts
  - Construcción avanzada: ~10 pts
  - **Total adicional: ~47-60 pts**

**Total estimado por partida: 120-160 puntos de investigación** 💡

## Configuración y Balance

Para ajustar las cantidades, edita `RESEARCH_REWARDS` en `researchRewardsManager.js`:

```javascript
const RESEARCH_REWARDS = {
    hexExplored: 1,          // Ajustar si quieres fomentar/desincentivar exploración
    ruinExplored: 10,        // Alto valor por riesgo y esfuerzo
    unitSplit: 3,            // Fomenta gestión táctica de divisiones
    structureBuilt: 5,       // Incentiva desarrollo territorial
    battleOccurred: 8,       // Recompensa agresión y defensa
    bankTransaction: 2,      // Bajo para evitar farming
    caravanTradeInterval: 5, // Cada 5 intercambios (no por cada uno)
};
```

## Mensajes al Jugador

Cada acción muestra un mensaje en el log:
- `+1 💡 Puntos de Investigación (Casilla explorada)`
- `+10 💡 Puntos de Investigación (Ruina explorada)`
- `+3 💡 Puntos de Investigación (División creada)`
- `+5 💡 Puntos de Investigación (Estructura: Camino)`
- `+8 💡 Puntos de Investigación (Batalla)`
- `+2 💡 Puntos de Investigación (Transacción bancaria)`
- `+5 💡 Puntos de Investigación (5 intercambios de caravana)`

## Características Especiales

### Prevención de Exploits

1. **Casillas exploradas**: Solo otorga puntos la **primera vez** que un jugador ve una casilla. No se puede "farmear" volviendo a explorar.

2. **Caravanas**: Otorga puntos cada **5 intercambios**, no por cada uno, evitando farming excesivo.

3. **Ruinas**: Solo se puede explorar una vez por ruina (desaparecen tras el saqueo).

### Compatibilidad Multijugador

- ✅ Compatible con partidas en red (Supabase)
- ✅ Los Sets se convierten automáticamente a Arrays para JSON
- ✅ Sincronización automática entre host y cliente
- ✅ Los contadores persisten en `gameState`

### Integración con Auto-Investigación

El sistema funciona perfectamente con el **Auto-Research Manager**:
1. Jugador gana puntos por acciones
2. Auto-Research consume puntos automáticamente según el plan activo
3. Se muestra en UI cuántos puntos se tienen disponibles

## Debugging

Comandos útiles en la consola del navegador:

```javascript
// Ver estado actual del sistema
gameState.researchRewards

// Ver puntos de investigación de un jugador
gameState.playerResources[1].researchPoints

// Forzar otorgamiento de puntos (testing)
ResearchRewardsManager.grantResearchPoints(1, 100, "Test");

// Ver casillas exploradas por J1
gameState.researchRewards.hexesExploredByPlayer.player1

// Ver contador de caravanas de J2
gameState.researchRewards.caravanTradeCountByPlayer.player2
```

## Notas de Desarrollo

- El sistema se inicializa automáticamente al cargar `researchRewardsManager.js`
- No requiere configuración manual por parte del desarrollador
- Los hooks se llaman automáticamente desde los archivos de lógica del juego
- Compatible con el sistema de tutorial (no interfiere con el flujo del tutorial)

---

**Fecha de Implementación**: Enero 2026  
**Versión**: 1.0  
**Estado**: ✅ Operacional
