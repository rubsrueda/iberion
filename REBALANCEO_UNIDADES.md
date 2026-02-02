# REBALANCEO DE UNIDADES Y NUEVAS MECÁNICAS
## Cambios Implementados - Febrero 2026

---

## 1️⃣ REWORK: EXPLORADORES CON MECÁNICA DUAL

### Cambios en `constants.js`
- **Explorador** ahora incluye:
  - ✅ `isScout: true` - Marcador especial
  - ✅ `spyMode: false` - Estado inicial (Exploración)
  - ✅ `spyVisionRange: 3` - Rango de revelación en modo espía
  - ✅ `canOnlyFightScouts: true` - **Solo combate contra otros exploradores**
  - ✅ `spyCounterDetection: true` - Dos espías enemigos se anulan
  - ✅ `abilities: ["enhanced_vision", "reveal_details", "espionage_mode"]`

### Comportamiento Dual
```
MODO EXPLORACIÓN (por defecto):
├─ Revelan niebla de guerra
├─ Ganan XP por casilla descubierta
├─ Visión rango 3
└─ Pueden combatir normalmente vs otros exploradores

MODO ESPÍA (togglable):
├─ Invisibles a enemigos (rango 3)
├─ Revelan detalles exactos de tropas
├─ No pueden ser visto por unidades normales
└─ Caza de Espías: dos espías enemigos en mismo hex se detectan mutuamente
```

### Validaciones de Combate
- ✅ Función `canScoutAttackTarget()` en `specialUnitsLogic.js`
- ✅ Las unidades normales NO pueden atacar exploradores en modo espía
- ✅ Los exploradores SOLO pueden combatir con otros exploradores
- ✅ Detección mutua: `checkScoutCounterDetection()` anula dos espías enemigos

---

## 2️⃣ NUEVA UNIDAD: PUEBLO

### Definición en `constants.js`
```javascript
"Pueblo": {
    category: "support",
    cost: { oro: 80, upkeep: 5 },          // MÁS BARATA que cualquier infantería
    attack: 15, defense: 60, health: 150,  // Defensa de Milicia, poco ataque
    movement: 1,                            // Lentísimo
    abilities: ["garrison", "food_production"],
    isVillager: true,                       // Marcador especial
    canOnlyMoveInOwnTerritory: true,       // RESTRICCIÓN CRÍTICA
    doublesUnitCap: true,                   // Suma en PARALELO al Unit Cap
    defensiveOnly: true                     // No puede atacar primero
}
```

### Características Especiales
1. **Coste Muy Bajo**: 80 oro (vs 200-600 de otras unidades)
2. **Movimiento Restringido**: Solo se mueve en hexágonos propios
3. **Defensa Fuerte**: 60 defensa (igual que Milicia pesada)
4. **Ataque Débil**: 15 ataque (defensivo solamente)
5. **Unit Cap Paralelo**: 
   - Límite NORMAL: Metrópoli 40, Ciudad 20, etc.
   - Límite PUEBLOS: Suma en paralelo (ej: 40 regimientos + 40 pueblos = 80 total)

### Validaciones en `specialUnitsLogic.js`
- ✅ `canVillagerMove()` - Rechaza movimiento fuera de territorio propio
- ✅ `canVillagerAttack()` - Rechaza combate iniciado (solo defiende)
- ✅ `calculateTotalUnitCap()` - Calcula capacidad incluyendo pueblos

---

## 3️⃣ CONSTANTES DE UNIT CAP (NUEVA)

### Archivo: `constants.js`
```javascript
const UNIT_CAP_BY_INFRASTRUCTURE = {
    "Metrópoli": 40,      // 8,000 población
    "Ciudad": 20,         // 4,000 población
    "Aldea": 10,          // 2,000 población
    "Fortaleza": 5,       // 1,000 población
    "Hexágono Libre": 1   // 200 población
};
```

### Cambios en `ledgerManager.js`
- ✅ `_calculateSupplyLimit()` ahora usa constantes `UNIT_CAP_BY_INFRASTRUCTURE`
- ✅ Refactorizado para claridad y mantenibilidad
- ✅ Detecta infraestructura por `hex.structure` (más confiable)

---

## 4️⃣ NUEVO ARCHIVO: `specialUnitsLogic.js`

### Funciones Principales
```javascript
SpecialUnitsLogic = {
    // EXPLORADORES
    toggleScoutMode(unit)                    // Cambiar Exploración ↔ Espionaje
    checkScoutCounterDetection(r, c)        // Detectar espías mutuamente
    canScoutAttackTarget(attacker, defender)// Validar combate de exploradores
    
    // PUEBLOS
    calculateTotalUnitCap(playerId)         // Cap normal + Pueblos en paralelo
    canVillagerMove(unit, fr, fc, tr, tc)  // Solo en territorio propio
    canVillagerAttack(unit, isInitiator)   // Solo defiende
}
```

---

## 5️⃣ INTEGRACIÓN EN `index.html`

```html
<script src="specialUnitsLogic.js"></script>
```
Cargado entre `modalLogic.js` y `unit_Actions.js`

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Constantes ✅
- [x] Agregar `isScout: true` a Explorador
- [x] Agregar `spyMode` y mecánicas a Explorador  
- [x] Crear unidad "Pueblo" con restricciones
- [x] Agregar `UNIT_CAP_BY_INFRASTRUCTURE` en constants
- [x] Refactorizar `_calculateSupplyLimit()` en ledgerManager

### Fase 2: Lógica ✅
- [x] Crear `specialUnitsLogic.js` con todas las validaciones
- [x] Funciones de combate para exploradores
- [x] Funciones de movimiento para pueblos
- [x] Cálculo de Unit Cap paralelo

### Fase 3: Integración (PENDIENTE)
- [ ] Validar combate en `simulateBattle()` (gameFlow.js)
- [ ] Validar movimiento en `RequestMoveUnit()` (unit_Actions.js)
- [ ] Actualizar UI para mostrar Unit Cap separado (Cuaderno de Estado)
- [ ] Agregar sprites para nuevas unidades
- [ ] Testear con IA

### Fase 4: Testing
- [ ] Probar Explorador en modo Exploración
- [ ] Probar Explorador en modo Espionaje
- [ ] Probar caza de espías (two spies detect each other)
- [ ] Probar Pueblo solo se mueve en territorio propio
- [ ] Probar Pueblo solo puede defender
- [ ] Probar Unit Cap paralelo (40 regimientos + 40 pueblos)

---

## 🎮 CASOS DE USO

### Explorador - Modo Exploración
1. Jugador recluta Explorador en ciudad
2. Explorador revela hexágonos ocultos (ganando XP)
3. Enemigo ve explorador pero no sus detalles exactos

### Explorador - Modo Espía
1. Jugador cambia modo a Espionaje
2. Explorador se vuelve invisible (rango 3)
3. Revelan cantidad EXACTA de tropas enemigas
4. Si dos espías se encuentran → Se detectan mutuamente

### Pueblo - Defensa Rápida
1. Jugador recluta 10 Pueblos (costo 800 oro total)
2. Los posiciona en defensa de capital
3. No pueden atacar, pero defienden territorio
4. Duplican capacidad: además de 40 regimientos normales, +40 pueblos

---

## ⚠️ NOTAS TÉCNICAS

1. **Verificación de Booleanos**: Usar `unit.spyMode === true` no `unit.spyMode`
2. **Detección de Exploradores**: Chequear `REGIMENT_TYPES[regType].isScout`
3. **Detección de Pueblos**: Chequear `REGIMENT_TYPES[regType].isVillager`
4. **Unit Cap Separado**: 
   - `standard` = Regimientos normales
   - `villagers` = Pueblos
   - `total` = Suma
5. **Combate**: Pasar por `specialUnitsLogic` ANTES de `simulateBattle()`

---

## 📝 PRÓXIMOS PASOS

1. Integrar validaciones en `unit_Actions.js` (movimiento)
2. Integrar validaciones en `gameFlow.js` (combate)
3. Actualizar UI del Cuaderno de Estado para mostrar "Regimientos / Pueblos"
4. Agregar sprites PNG para Explorador y Pueblo
5. Testear con escenarios y IA

---

**Última Actualización**: 2026-02-02
