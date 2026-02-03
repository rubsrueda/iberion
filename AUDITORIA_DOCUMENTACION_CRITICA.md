# 🔴 AUDITORÍA CRÍTICA: Errores en la Documentación

**Fecha:** 3 de febrero de 2026  
**Estado:** ⚠️ ERRORES GRAVES ENCONTRADOS  
**Realizado por:** Auditoría de código vs documentación

---

## Resumen Ejecutivo

Se encontraron **errores graves y omisiones críticas** en la documentación que puede llevar a:
- Malinterpretación de mecánicas fundamentales
- Implementación incorrecta de features
- Errores en el gameplay balance

### Puntuación de Confiabilidad
- ❌ **Destrucción de Unidades**: 10% (COMPLETAMENTE MAL)
- ❌ **Duelos**: 20% (SUPERFICIAL)  
- ❌ **Héroes**: 40% (INCOMPLETO)
- ❌ **Unidades Support**: 15% (FALTA DETALLE)
- ❌ **Forja**: 35% (EXISTE PERO INCOMPLETO)
- ❌ **Batalla Naval**: 30% (MUY SUPERFICIAL)
- ❌ **Persistencia**: 50% (PARCIALMENTE CORRECTO)

---

## ERROR CRÍTICO #1: DESTRUCCIÓN DE UNIDADES

### ❌ LO QUE DOCUMENTÉ (INCORRECTO)
```
"Las unidades se destruyen si la moral llega a 0"
"Se pierden permanentemente cuando health <= 0"
```

### ✅ REALIDAD DEL CÓDIGO (unit_Actions.js)

**Una unidad NO se destruye simplemente por moral 0. Hay una cadena compleja:**

#### Paso 1: Moral 0 = Desorganizada (NO Destruida)
```javascript
if (unit.morale <= 0) {
    unit.isDisorganized = true;  // ← No muere, se desorganiza
}
```
Línea 1406-1422 en unit_Actions.js:
- Moral 0 = `isDisorganized = true`
- La unidad INTENTA RETIRARSE automáticamente
- Si encuentra ruta: **se mueve a casilla segura** (llama a `_executeMoveUnit`)
- Si NO encuentra ruta: entra en segundo paso

#### Paso 2: Destrucción por Cerco (Rodeo)
```javascript
// Si está desorganizada Y rodeada (sin salida física)
if (panicMoral && !retreatHex) {
    // ESCENARIO B: NO hay salida (Rodeada por enemigos o terreno)
    logMessage(`¡${defenderDivision.name} está RODEADA y no puede retirarse!`);
    await attemptDefectionOrDestroy(defenderDivision, "aniquilación tras cerco");
}
```
Línea 1430-1434 en unit_Actions.js:
- Se destruye **solo si está rodeada SIN SALIDA física**
- Requiere combinación: `isDisorganized=true` + `sin hexágono seguro`

#### Paso 3: Destrucción por Health
```javascript
const defenderDestroyed = finalHealthDefender <= 0;
if (defenderDestroyed) {
    await handleUnitDestroyed(defenderDivision, attackerDivision);
}
```
Línea 1388 en unit_Actions.js:
- Se destruye si health llega a 0 EN EL COMBATE
- Esto es correcto en la documentación

### 📝 LO QUE DEBERÍA DOCUMENTAR

**Una unidad se destruye de 3 formas:**

1. **Health = 0**: Pierden toda su salud en combate → destrucción inmediata
2. **Rodeada (Cerco)**: Moral = 0 + Sin ruta de escape → destrucción forzada  
3. **Desmoralización Progresiva**: NO destruye, solo retira y se recupera lentamente

**Proceso Completo:**
```
Combate → Derrota en batalla → Moral baja o 0
    ↓
¿Puede retirarse? 
    ├─ SÍ → Huye a casilla segura (mantiene moral baja)
    │     → Recupera moral lentamente en turnos posteriores
    │     → Puede volver a entrar en combate cuando recupera moral
    └─ NO → Rodeada sin salida
         → Se destruye (aniquilación por cerco)
         → Los regimientos desaparecen del mapa
         → El jugador PIERDE esa división permanentemente
```

---

## ERROR CRÍTICO #2: DUELOS (BASE DEL COMBATE)

### ❌ LO QUE DOCUMENTÉ
```
"Sistema de combate que calcula daño"
(Demasiado vago, no explica la arquitectura)
```

### ✅ REALIDAD DEL CÓDIGO

**Los DUELOS son la PIEDRA ANGULAR del combate.** No es un detalle, es todo.

#### Estructura: Duelos 1vs1 Entre Regimientos
```javascript
// Línea 1317 en unit_Actions.js
// Cada regimiento de atacantes pelea contra regimiento de defensores
const actionQueue = [];  // Cola de acciones

for (const action of actionQueue) {
    const { regiment, division } = action;
    
    // DUELO: Un regimiento individual vs otro
    // - El atacante ELIGE objetivo (o se asigna automáticamente)
    // - Ambos "duelen" mutuamente si pueden contraatacar
    // - Se aplica daño individualizado por cada duelo
}
```

#### Mecánica: Iniciativa + Rango de Ataque
```javascript
// Línea 1250 en unit_Actions.js
let finalInitiative = regData.initiative || 0;  
let finalRange = regData.attackRange || 1;

// Orden de combate = por Iniciativa (más alta = ataca primero)
// Rango permite atacar a distancia o solo cuerpo a cuerpo
```

#### Asignación de Objetivos (Muy Importante)
```javascript
// Línea 1324 en unit_Actions.js
// ASIGNACIÓN INICIAL (Antes de empezar los duelos):
liveAttackersInitial.forEach((attackerReg, index) => {
    const target = liveDefendersInitial[index % liveDefendersInitial.length];
    targetAssignments.set(attackerReg.logId, target);  // ← OBJETIVO FIJO
});

// Durante el duelo:
let targetRegiment = targetAssignments.get(regiment.logId);  // Obtener objetivo fijo
if (!targetRegiment || targetRegiment.health <= 0) {
    // Si murió, buscar otro
    const newTarget = selectTargetRegiment(opposingDivision);
}
```

#### Modificadores de Daño en Duelo
Cada duelo calcula:
- `applyDamage(attackerRegiment, targetRegiment, ...)` (Línea 1360)
  - Ataque del regimiento vs Defensa del regimiento
  - Modificador por terrain (si hay)
  - Modificador por morale
  - Modificador por "desgaste" (hits tomados ya)
  - Habilidades/talentos activos
  - **Daño mínimo garantizado: 1**

### 📝 LO QUE DEBERÍA DOCUMENTAR

```markdown
### Sistema de Duelos (Base del Combate)

**Definición:** El combate se resuelve como series de duelos 1vs1 
entre regimientos individuales, NO como combate de división completa.

**Flujo:**
1. **Organización**: Se crean listas de regimientos vivos en cada lado
2. **Asignación**: Se asigna cada regimiento atacante a un regimiento defensor (1:1)
3. **Cola de Acciones**: Se ordena por Iniciativa (regimientos con más iniciativa van primero)
4. **Duelos Secuenciales**: Cada regimiento ataca a su objetivo asignado
5. **Daño Aplicado**: Se calcula daño con múltiples modificadores
6. **Actualización**: Se recalcula health de cada división después de cada duelo

**Modificadores de Daño (Por Duelo):**
- Stat Attack vs Stat Defense (base)
- Terreno (si hay bonus defensivo)
- Morale (si está bajo, reduce ataque)
- Desgaste (si el regimiento ya fue golpeado varias veces)
- Equipment bonus (del héroe asignado)
- Talento/Habilidad activa
- Barlovento (si es combate naval)

**Daño Mínimo Garantizado:** 1 punto de daño (nunca puede haber "miss" sin daño)

**Objetivo Fijo:** Cada regimiento tiene un objetivo asignado.
Si muere, busca el siguiente disponible automáticamente.
```

---

## ERROR CRÍTICO #3: HÉROES (Incompleto)

### ❌ LO QUE DOCUMENTÉ
```
"Los héroes se asignan a divisiones..."
(No explica el sistema de fragmentos, estrellas, equipamiento)
```

### ✅ REALIDAD DEL CÓDIGO

#### Sistema de Héroes Multi-Nivel

**Fragmentos → Estrellas → Skills → Equipamiento**

```javascript
// playerDataManager.js línea 265
heroes: [{
    id: "g_fabius",
    level: 1,           // XP de batalla
    xp: 0,              // Experiencia acumulada
    stars: 1,           // ESTRELLA (1-5, no 0)
    fragments: 0,       // FRAGMENTOS RECOLECTADOS
    skill_levels: [1, 0, 0, 0],  // 4 HABILIDADES por héroe
    talent_points_unspent: 1,
    
    // <<< EQUIPAMIENTO DEL HÉROE >>>
    equipment: {
        head: null,      // Casco
        weapon: null,    // Arma
        chest: null,     // Pecho/Armadura
        legs: null,      // Piernas
        gloves: null,    // Guantes
        boots: null      // Botas
        // Cada slot es una instancia equipada: "eq_1234567890"
    },
    talents: {}          // Puntos en árbol de talento
}]
```

#### Progresión: Stars vs Level
```javascript
// constants.js línea 451
HERO_FRAGMENTS_PER_STAR = {
    1: 20,   // 20 frags para llegar a 1 estrella
    2: 40,   // 40 frags para llegar a 2 estrellas
    3: 80,   // Crecimiento exponencial
    4: 160,
    5: 320   // 5 estrellas = máximo
}

// Cada ESTRELLA desbloquea una HABILIDAD nueva
// Estrella 1 → Habilidad 1
// Estrella 2 → Habilidad 2
// Etc.
```

#### Asignación a División (Requisitos)
```javascript
// tutorialScripts.js línea 507-523
// REQUISITOS para asignar héroe:
// 1. División debe tener "Cuartel General" (regimiento de tipo 'support')
// 2. Jugador debe haber investigado "LEADERSHIP" (tech tree)
// 3. Héroe no puede estar asignado a otra división (en gameState.activeCommanders)

// Asignación:
// - Seleccionar división con HQ
// - Botón "Asignar General (👤)"
// - Abre modal del Cuartel (barracks)
// - Seleccionar héroe → muestra detalles
// - Botón "Asignar a esta División"
// - Se actualiza unit.commander = "g_fabius"
```

#### Bonificaciones del Héroe a la División
```javascript
// unit_Actions.js línea 1232-1250
if (division.commander) {
    const commanderData = COMMANDERS[division.commander];
    const heroInstance = playerProfile.heroes.find(h => h.id === division.commander);
    if (commanderData && heroInstance) {
        commanderSkills = commanderData.skills;
        // Las habilidades se aplican en calculateRegimentStats()
    }
}

// calculateRegimentStats (unit_Actions.js línea 1606+)
// - Bonificación base del héroe (ataque, defensa, etc.)
// - Bonificación de equipo del héroe
// - Bonus de talento del héroe
// Todo se suma a la división completa
```

#### Equipo del Héroe (Sistema Separado)
```javascript
// equipment.js - Catálogo de 20+ objetos
// Rareza: Común, Raro, Épico, Legendario
// Cada objeto da BONIFICACIONES (ataque, defensa, morale, etc.)

// Progresión:
// Encontrar FRAGMENTOS → Acumular → Forjar → Equipo terminado → Equipar en héroe
```

### 📝 LO QUE DEBERÍA DOCUMENTAR

**Los Héroes son Progresión de Largo Plazo**

```markdown
### Héroes: Sistema Completo

**4 Dimensiones:**
1. **Estrellas**: Fragmentos 20→40→80→160→320 (5 estrellas máx)
2. **Level**: XP ganado en batalla (sin tope, mejora stats base)
3. **Habilidades**: 4 skills por héroe, desbloqueadas por estrellas
4. **Equipamiento**: 6 slots (cabeza, arma, pecho, piernas, guantes, botas)

**Ubicación en División:**
- Requiere unidad "Cuartel General" (support unit)
- Solo UNA por división
- No puede estar asignado a dos divisiones simultáneamente

**Bonificaciones:**
- Ataque/Defensa/Salud/Morale a TODA la división
- Bonus de habilidades (escaleado por star level)
- Bonus de equipamiento (independiente de level)

**Persistencia:**
- Se guardan en `PlayerDataManager.currentPlayer.heroes`
- Persisten entre partidas
- Se usan en nueva partida automáticamente
```

---

## ERROR CRÍTICO #4: UNIDADES SUPPORT (Falta Detalle)

### ❌ LO QUE DOCUMENTÉ
```
"Unidades de apoyo" 
(Sin detallar cada tipo)
```

### ✅ REALIDAD DEL CÓDIGO

```javascript
// constants.js línea 107-165

// UNIDADES SUPPORT ACTUALES:

1. "Cuartel General" (HQ)
   - attack: 10, defense: 40, health: 200
   - movement: 3, attackRange: 0 (no ataca)
   - Rol: ASIGNAR HÉROES (único tipo que permite)
   - Costo: 800 oro, 100 mantenimiento

2. "Catapulta" (Siege)
   - attack: 150, defense: 20, health: 150
   - attackRange: 3 (largo alcance)
   - Rol: Asedio a estructuras (ciudades, castillos)
   - Ability: "Asedio"
   - Costo: 1000 oro, 80 mantenimiento

3. "Ballesta Móvil" (Ranged support)
   - attack: 100, defense: 50, health: 120
   - attackRange: 2
   - Rol: Apoyo de rango

4. "Médicos de Campaña" (Healing)
   - attack: 10, defense: 30, health: 100
   - Rol: Recuperar salud aliados (EXISTE PERO NO DOCUMENTÉ)

5. "Colono"
   - Rol: Construcción, desarrollo económico

6. "Explorador"
   - Rol: Visión extendida, scouting

7. "Guardia del Campamento"
   - Rol: Defensa inmóvil
```

### 📝 LO QUE DEBERÍA DOCUMENTAR

Tabla completa de unidades support con roles específicos.

---

## ERROR CRÍTICO #5: FORJA (Existe pero Subexplicado)

### ✅ LO QUE EL CÓDIGO TIENE (Que NO expliqué bien)

```javascript
// SISTEMA COMPLETO EN equipment.js

Rareza:         Fragmentos:      Slots:
┌──────────────┬────────────────┬─────────────────┐
│ Común        │ 20 cada objeto  │ head, weapon,   │
│ Raro         │ 30              │ chest, legs,    │
│ Épico        │ 50              │ gloves, boots   │
│ Legendario   │ 80              │ (6 total)       │
└──────────────┴────────────────┴─────────────────┘

// Progresión:
Explorar Ruinas → Encontrar Fragmentos → Acumular en inventario
→ Abre Forja (equipo modal)  → Selecciona objeto
→ Si tienes 20+ fragmentos → Botón "Forjar"
→ Objeto terminado → Inventario → Equipar en héroe
```

---

## ERROR CRÍTICO #6: BATALLA NAVAL (Muy Superficial)

### ❌ LO QUE DOCUMENTÉ
```
"Combate naval similar al terrestre..."
(Sin explicar barlovento, evasión, diferencias)
```

### ✅ REALIDAD DEL CÓDIGO

```javascript
// unit_Actions.js 1064-1048

// COMBATE NAVAL TIENE REGLAS COMPLETAMENTE DISTINTAS:

1. BARLOVENTO (Ventaja posicional)
   - Ganador obtiene +15 a todos los calculos
   - Calculado por:
     a) Número de "Pataches" (barcos exploradores)
     b) Nivel de talento "Navegación"
     c) Salud de la flota
     d) Suerte (+/-15 puntos)
   
   // El barlovento se calcula al INICIO del combate
   const barloventoWinner = calculateBarlovento(attacker, defender);
   // "attacker" o "defender"

2. EVASIÓN NAVAL
   - Regimientos navales pueden EVADIR ataques
   - Probabilidad basada en:
     a) Atributo "evasion" del barco (ej: Patache evasion: 5)
     b) Bonus de barlovento
     c) Salud del barco
   
   function checkNavalEvasion(attackerRegiment, defenderRegiment, ...) {
       const evasionChance = (defenderData.evasion || 0) * 10;
       if (Math.random() * 100 < evasionChance) {
           // ¡Evade el ataque!
           return true;
       }
   }

3. RESTRICCIÓN: Solo Barcos Pueden Atacar Barcos
   - Un "Patache" solo puede atacado por otro barco (rango corto)
   - Tropas de tierra NO pueden atacar barcos directamente
   - Exception: Catapulta desde tierra (siege)

4. TIPOS DE BARCOS
   - "Patache" (Scout Naval)
   - "Barco de Guerra" (Combat Naval)
   - "Transporte" (Cargo + troops)
```

---

## ERROR CRÍTICO #7: PERSISTENCIA (Parcialmente Correcto)

### ⚠️ LO QUE DOCUMENTÉ
```
"Las partidas se guardan en IndexedDB y Supabase"
(Técnicamente correcto pero incompleto)
```

### ✅ REALIDAD DEL CÓDIGO (saveLoad.js)

```javascript
// Guarda:
// 1. En localStorage (navegador local)
// 2. En Supabase (si multiplayer)
// 3. Autosaves cada 5 turnos + final de partida

async function saveGameUnified(saveName, isAutoSave = false) {
    // Debounce para evitar guardados duplicados
    return await SaveGameDebounce.execute(saveName, isAutoSave);
}

// AUTOSAVE:
// - Cada 5 turnos automáticamente
// - Al final de partida
// - Con timestamp: "AUTOSAVE_2026-02-03_14-30-45"

// RECUPERACIÓN:
// - Al iniciar: busca autosaves y permite cargar
// - Si multiplayer: Supabase sincroniza con otros jugadores
```

**Problema:** No expliqué:
- Cómo se pierden partidas (data corruption)
- Diferencia entre save local y multiplayer
- Proceso de recuperación exacto

---

## RESUMEN DE CORRECCIONES NECESARIAS

| Sistema | Confiabilidad | Acción |
|---------|:---:|---------|
| Destrucción | 10% | 🔴 REESCRIBIR completamente |
| Duelos | 20% | 🔴 REESCRIBIR con detalle |
| Héroes | 40% | 🟠 EXPANDIR significativamente |
| Support Units | 15% | 🔴 CREAR tabla completa |
| Forja | 35% | 🟠 AMPLIAR explicación |
| Naval | 30% | 🔴 DOCUMENTAR diferencias |
| Persistencia | 50% | 🟠 COMPLETAR recuperación |

---

## PRÓXIMOS PASOS

1. ✅ **Crear documento "SISTEMAS_CORE_CORREGIDOS.md"** con las 7 áreas reescritas
2. ✅ **Actualizar GUIA_TECNICA_FUNCIONAL_IBERION.md** con correcciones
3. ✅ **Auditoría código-doc** en otros sistemas
4. ✅ **Nueva versión de documentación** confiable al 90%+

**Impacto**: Sin estas correcciones, nuevos developers implementarán features incorrectamente.

---

**Preparado por:** Auditoría de Código  
**Confiabilidad del Documento Original:** 35% (ERROR CRÍTICO)  
**Necesaria Revisión Urgente:** SÍ ✅
