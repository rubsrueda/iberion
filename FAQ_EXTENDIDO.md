# IBERION: FAQ Extendido - Respuestas Rápidas

**Última actualización:** 2 de febrero de 2026

---

## 🎮 Gameplay - Preguntas de Jugadores

### "¿Cómo funciona exactamente el morale?"

**Respuesta corta:**
Morale es 0-100. Afecta dos cosas:
- **Combate:** A menos morale, haces menos daño (-30% a los 20 morale)
- **Movimiento:** A menos morale, te mueves más lento (-50% movimiento a los 0 morale)

**Respuesta técnica:**
```
MORALE ACTUAL: 75
DAÑO MODIFICADOR: (75 / 100) = 0.75x
ATQ 100 → ATQ 75
VELOCIDAD MODIFICADOR: (75 / 100) = 0.75x
MOV 2 → MOV 1.5
```

**Sube morale:**
- Estar en ciudad amiga (+15)
- Aliados cercanos +5 cada uno
- Victoria reciente (+10)
- Hospital (+10)

**Baja morale:**
- Derrota (-10)
- Rodeado enemigos (-30)
- Sin suministro (-20)
- Nivel bajo (-5 por nivel que le falta)

---

### "¿Por qué mi unidad dice 'Sin suministro'?"

**Respuesta corta:**
Una unidad necesita estar conectada a una ciudad tuya para funcionar bien.

**Cómo funciona:**
```
TU CIUDAD (Capital) ← Camino recto/diagonal ← TU UNIDAD
                     (sin enemigos bloqueando)
                     
SI HAY: ✓ SUMINISTRADA (morale normal, movimiento normal)
SI NO:  ✗ SIN SUMINISTRO (morale -20, movimiento 50%, ataque -30%)
```

**Cómo arreglarlo:**
1. Crear más ciudades (para expandir "línea de suministro")
2. Limpiar enemigos del camino
3. Retroceder hacia tu ciudad

---

### "¿Cómo se calcula exactamente el daño en combate?"

**La fórmula:**
```
ATAQUE BASE = Attack_Stat + Talent_Bonus + Equipment_Bonus + Terrain_Bonus
DEFENSA BASE = Defense_Stat + Terrain_Bonus + Morale_Bonus + Equipment_Bonus

DAÑO = ATAQUE BASE - DEFENSA BASE (mínimo 1)

CRÍTICO:
    roll = random(1-100)
    if (roll <= INITIATIVE):
        DAÑO *= 1.5
```

**Ejemplo:**
```
ATACANTE: Caballería (Atq 100, Talento +30, Equipo +15, Morale 75%)
ATAQUE = 100 + 30 + 15 + (75% de 10 moral bonus) = 152.5

DEFENSOR: Infantería en Montaña (Def 100, Terreno +30, Morale 50%)
DEFENSA = 100 + 30 + (50% de 5 moral bonus) = 132.5

DAÑO = 152.5 - 132.5 = 20

CRÍTICO: 20% de chance (Initiative 20)
    roll = 15 ≤ 20 → ¡CRÍTICO!
    DAÑO = 20 × 1.5 = 30
```

---

### "¿Cuántos turnos tarda en ganar?"

**Depende del modo:**

| Modo | Tiempo | Turnos |
|------|--------|--------|
| Escaramuza 2 jugadores | 10-20 min | 15-25 |
| Escaramuza 4 jugadores | 20-40 min | 30-50 |
| Campaña (8 territos) | 2-3 horas | 200+ |
| Tronos (8 jugadores) | 1-2 horas | 50-100 |

---

### "¿Es posible empatar?"

**SÍ.** Si después de 500 turnos nadie ganó:
- Se declara empate
- Se reparten premios por %territorio controlado
- Todos ganan Battle Pass XP igual

---

## 💻 Código - Preguntas de Developers

### "¿Por qué mi cambio no aparece en la pantalla?"

**Checklist:**
1. ¿Cambié `gameState`?
2. ¿Llamé `UIManager.updateAllUIDisplays()`?
3. ¿Recargué la página (F5)?
4. ¿Está en la rama correcta?

**Debugging:**
```javascript
// En console (F12):
console.log("Antes:", units[0].health);
RequestAttack(units[0], enemyUnit);
console.log("Después:", units[0].health);
UIManager.updateAllUIDisplays();
// ¿Apareció visualmente? Si no, es UI problem
```

---

### "¿Cómo sé si mi código está en gameState o es solo local?"

**Regla simple:**
```javascript
// ❌ LOCAL (solo este cliente)
let selectedUnit = null;
let isModalOpen = false;

// ✅ GLOBAL (en gameState)
gameState.currentPlayer = 1;
gameState.turnNumber = 23;
board[5][3].owner = 1;
units[0].health = 150;
```

**Pregunta clave:** "¿Si otro jugador hace esto, debería verlo?"
- SÍ → Va en gameState
- NO → Es variable local

---

### "¿Mi Request function debe ser async?"

**Respuesta:**
SÍ, si llamás a Supabase (red). NO, si es solo local.

**Pattern:**
```javascript
// ✅ CON RED (async)
async function RequestMoveUnit(unit, r, c) {
    if (isNetworkGame()) {
        await NetworkManager._prepararEstadoParaNube({...});
    }
    // ... resto
}

// ✅ SIN RED (sync)
function RequestAttack(attacker, defender) {
    // No espera nada
    // ... resto
}
```

---

### "¿Qué pasa si olvido generar actionId?"

**Problema:**
El usuario hace doble-click → la acción se ejecuta 2 veces.
- Daño se aplica 2 veces
- Movimiento se ejecuta 2 veces
- Bug grave en red

**Solución:**
```javascript
// SIEMPRE generar
const actionId = crypto.randomUUID();

// En red, verificar en servidor
if (actionAlreadyProcessed(actionId)) {
    return "Action already executed";
}
```

---

### "¿Cómo debugg un bug de red?"

**Steps:**
1. Abre **DevTools en ambos navegadores** (F12)
2. Pestaña **Network** para ver requests
3. Pestaña **Console** para logs
4. Executa acción en Jugador 1
5. Verifica que llegue a Jugador 2

**Checklist:**
```javascript
console.log("1. Validando entrada...");       // Paso 1
console.log("2. Enviando a red...", action); // Paso 7
await NetworkManager._prepararEstadoParaNube(action);
console.log("3. Ejecutando localmente...");   // Paso 8
executeAction(action);
console.log("4. Actualizando UI...");         // Paso 9
UIManager.updateAllUIDisplays();
```

---

### "¿Por qué gameHistoryModal no aparece?"

**Checklist (ya fue arreglado):**
1. ¿`z-index: 10100`? ✓
2. ¿`position: fixed; top: 0; left: 0; width: 100%; height: 100%;`? ✓
3. ¿`pointer-events: auto` en modal y contenido? ✓
4. ¿`display: flex` con `justify-content: center`? ✓

**Si sigue sin funcionar:**
```javascript
// En console (F12):
const modal = document.getElementById("gameHistoryModal");
modal.style.display = "flex";
modal.style.zIndex = "10100";
console.log("Modal debería ser visible ahora");
```

---

### "¿Por qué no se guarda mi partida?"

**Checklist:**
1. ¿Llamé `saveGameUnified("name", true)`?
2. ¿Terminó sin error? Revisa console (F12)
3. ¿Está en localStorage?
   ```javascript
   localStorage.getItem("save_1_autosave")  // Debería retornar JSON
   ```
4. ¿Es juego en red? Revisa Supabase:
   ```javascript
   const { data } = await supabase
       .from('game_saves')
       .select('*')
       .eq('match_id', currentMatchId);
   console.log("Saves en nube:", data);
   ```

---

### "¿Cómo pruebo multijugador local sin 2 navegadores?"

**Opción 1: Dos pestañas del mismo navegador**
```
Pestaña 1: localhost:3000
Pestaña 2: localhost:3000
Comparten localStorage → cambios se ven en ambas
```

**Opción 2: Dos PCs en red local**
```
PC1: http://[IP_PC1]:3000
PC2: http://[IP_PC2]:3000
Via PeerJS (requiere Internet para señal)
```

**Opción 3: Docker**
```bash
docker run -p 3000:3000 iberion:latest
# Accede desde otro navegador
```

---

### "¿Cómo agrego un nuevo tipo de unidad?"

**5 pasos:**

1. **Abrir constants.js:**
```javascript
const UNIT_DEFINITIONS = {
    "Infantry": { ... },
    "Cavalry": { ... },
    "MyNewUnit": {  // ← NUEVO
        name: "Dragón",
        attack: 200,
        defense: 150,
        health: 250,
        movement: 3,
        cost: 1500,
        // ... resto de stats
    }
}
```

2. **En uiUpdates.js, agrega sprite:**
```javascript
const unitSprites = {
    "Infantry": "url('images/infantry.png')",
    "Cavalry": "url('images/cavalry.png')",
    "MyNewUnit": "url('images/dragon.png')"  // ← NUEVO
};
```

3. **Crea imagen:**
```
images/dragon.png (64×64px)
```

4. **En unit_Actions.js, agrega lógica especial (si la hay):**
```javascript
if (unit.type === "MyNewUnit") {
    // Aplicar bonificación especial
    unit.attack *= 1.2;  // 20% ataque extra
}
```

5. **Prueba:**
```javascript
// En console:
const dragón = createUnit("MyNewUnit", 1, 5, 3);
console.log(dragón);  // Debería existir
```

---

### "¿Cómo cargo una partida guardada?"

**Código:**
```javascript
const loaded = await loadGameUnified("autosave");
if (loaded) {
    console.log("Partida cargada:", gameState);
    renderBoardToDOM();
    UIManager.updateAllUIDisplays();
} else {
    console.warn("No hay guardados disponibles");
}
```

**Automático:**
```javascript
// Al iniciar el juego:
if (localStorage.getItem("save_1_autosave")) {
    // Mostrar opción "Continuar" en menú
}
```

---

### "¿Cuál es la diferencia entre autoSave y manual save?"

| Tipo | Cuándo | Automático | Sobrescribe |
|------|--------|-----------|------------|
| autoSave | Cada turno | SÍ | SÍ (siempre igual) |
| manual | Usuario lo hace | NO | NO (acumula) |

**Uso:**
```javascript
// Auto (sobrescribe)
saveGameUnified("autosave", true);

// Manual (acumula)
saveGameUnified("save_1", false);
saveGameUnified("save_2", false);
```

---

### "¿Cómo limpio la consola de logs?"

**En console (F12):**
```
console.clear()
```

**Para específicos:**
```javascript
// Condicional logging
if (DEBUG_MODE) {
    console.log("Detalles de debug...");
}
```

---

## 🎨 UI/UX - Preguntas de Designers

### "¿Cómo cambio los colores del juego?"

**En style.css:**
```css
:root {
    --color-player-1: #FF6B6B;  /* Rojo */
    --color-player-2: #4ECDC4;  /* Teal */
    --color-player-3: #FFE66D;  /* Amarillo */
    --color-player-4: #95E1D3;  /* Menta */
}
```

**Uso:**
```css
.unit-player-1 {
    background: var(--color-player-1);
}
```

---

### "¿Dónde agrego un nuevo botón?"

**En index.html:**
```html
<button id="myButton" class="btn btn-primary">
    Mi Botón
</button>
```

**En main.js:**
```javascript
document.getElementById("myButton").addEventListener("click", () => {
    console.log("Botón clickeado!");
    // Tu lógica aquí
});
```

**En style.css:**
```css
#myButton {
    padding: 10px 20px;
    background: var(--color-primary);
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 4px;
}

#myButton:hover {
    background: var(--color-primary-hover);
}
```

---

### "¿Cómo agrego un modal nuevo?"

**Patrón:**
```html
<!-- HTML -->
<div id="myModal" class="modal">
    <div class="modal-content">
        <span class="close-button">&times;</span>
        <h2>Mi Modal</h2>
        <p>Contenido aquí</p>
        <button class="btn-confirm">Aceptar</button>
    </div>
</div>
```

```css
/* CSS - automático por .modal */
#myModal {
    z-index: 10090;  /* Entre otros modales */
}
```

```javascript
// JS
const MyModal = {
    open() {
        document.getElementById("myModal").style.display = "flex";
    },
    close() {
        document.getElementById("myModal").style.display = "none";
    }
};

// Listeners
document.getElementById("myModal")
    .querySelector(".close-button")
    .addEventListener("click", () => MyModal.close());
```

---

## ⚙️ DevOps - Preguntas de Ops

### "¿Cómo depliego a producción?"

**Asumiendo que uses Vercel/Netlify:**

1. Push a `main` branch
2. CI/CD automáticamente desplega
3. URL actualizada

**Manual:**
```bash
git push origin main
# Esperar ~2 minutos
# Visitar https://iberion.vercel.app
```

---

### "¿Cómo reviso logs de Supabase?"

```javascript
// En la aplicación:
const { data, error } = await supabase
    .from('game_saves')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

if (error) console.error("Error:", error);
else console.log("Últimos 10 saves:", data);
```

**Via dashboard:**
1. Abre supabase.com
2. Selecciona tu proyecto
3. SQL Editor
4. `SELECT * FROM game_saves LIMIT 100;`

---

### "¿Cuánta data usan las partidas?"

**Por partida:**
- gameState: ~5KB
- board[][]: ~10KB (depende tamaño mapa)
- units[]: ~50KB (depende # unidades)
- **Total:** ~65KB por partida
- **Con historial (100 turnos):** ~6.5MB

**Límite Supabase FREE:** 500MB → ~7700 partidas
**Recomendación:** Limpiar autosaves >7 días

---

## 🔍 Troubleshooting - Cuando Algo Está Mal

### "La UI flickea constantemente"

**Causa:** `UIManager.updateAllUIDisplays()` se llama múltiples veces por acción.

**Fix:**
```javascript
// ❌ MALO
RequestMove(...);
UIManager.updateAllUIDisplays();
UIManager.updateAllUIDisplays();  // Duplicado
UIManager.updateAllUIDisplays();  // Duplicado

// ✅ BUENO
RequestMove(...);
UIManager.updateAllUIDisplays();  // Solo una vez
```

---

### "El juego se desincroniza con otro jugador"

**Causa:** Uno cambió estado sin sincronizar.

**Debug:**
```javascript
// Ambos jugadores ejecutan esto:
console.log(JSON.stringify(gameState, null, 2));
// Si son diferentes → desincronización

// Encontrar diferencia:
console.log("Mis unidades:", units.length);
console.log("Mi oro:", gameState.playerResources[playerNumber].oro);
// Comparar con el otro jugador
```

---

### "Mi Request function no funciona"

**Checklist:**
```javascript
// 1. ¿Se ejecuta?
console.log("RequestAttack llamado");

// 2. ¿Pasa validaciones?
console.log("Validaciones:", {
    esMyTurno: gameState.currentPlayer === playerNumber,
    unidadValida: !!attacker,
    defensorValido: !!defender,
    enFasePlay: gameState.currentPhase === "play"
});

// 3. ¿Se mutó el estado?
console.log("Antes:", defender.health);
// ... tu código ...
console.log("Después:", defender.health);

// 4. ¿Se actualizó UI?
console.log("UI actualizada:", document.querySelector("#unitInfo"));
```

---

**Last Updated:** 2 de febrero de 2026
