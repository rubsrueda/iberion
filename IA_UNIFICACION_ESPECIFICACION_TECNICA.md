# IA Unificación — Especificación Técnica

**Estado**: ACTIVO — REVISIÓN v1.1 (2026-03-26)  
**Versión**: 1.0  
**Fecha de cierre**: 2026-03-25  
**Documento base**: `IA_INVASION_UNIFICACION_BASE.md`  
**Árbitro de conflictos**: este documento prevalece sobre cualquier otro en caso de contradicción salvo que contradiga el Principio de No-Regresión (§0).

---

## 0. Principio de No-Regresión

> **La unificación NO sustituye comportamiento que ya funciona. Lo sistematiza, lo hace visible y abre la puerta a mejorarlo.**

### 0.1 Qué significa en la práctica

La IA Invasión (`AiGameplayManager`) ya funciona razonablemente: gestiona economía, construye infraestructura, combate, fusiona divisiones y puede ejecutar operaciones navales con efecto sorpresa en cualquier mapa con costa (pasos estrechos, flanqueos, desembarcos). Ningún paso del refactor puede dejar el juego en un estado peor que el actual.

Regla operativa: **en toda fase del refactor, si la partida IA vs IA que servía de referencia deja de funcionar o empeora visiblemente, el cambio se revierte**.

### 0.2 Línea base protegida

El siguiente comportamiento es línea base que NO puede romperse:

| Comportamiento | Origen en código | Estado |
|---|---|---|
| Gran Apertura: expansión territorial en turno 1 | `_executeGrandOpening_v20()` | ✅ Sólido |
| Construcción de Fortalezas + red de caminos | `_handle_BOA_Construction()` + `executeRoadProjects()` | ✅ Sólido |
| Producción de refuerzos según frente | `handleStrategicReinforcements()` | ✅ Sólido |
| Protocolo defensa capital | `_executeCapitalDefenseProtocol()` | ✅ Sólido |
| Ejes estratégicos de expansión | `planStrategicObjectives()` + `assignUnitsToAxes()` | ✅ Sólido |
| Operaciones navales con efecto sorpresa (desembarcos flanqueantes en **cualquier mapa con costa**, no solo archipiélago) | `IAArchipielago.ejecutarTurno()` + `_ensureNavalPresence()` + `_executeNavalCombat()` | ✅ Sólido — ampliar escenarios en §13 |
| Conquista de ciudades bárbaras (expediciones) | `IAArchipielago.conquistarCiudadesBarbaras()` | ⚠️ **Deficiente** — la IA raramente avanza en expediciones; mejora obligatoria en v1.0 |
| Construcción y movimiento de caravanas | `crearCaravanas()` + `_ejecutarRutaLarga()` | ✅ Sólido |

### 0.3 Relación con el resto del documento

Las secciones 1–10 definen la **capa estratégica nueva** que se añade _sobre_ el comportamiento existente. Cuando un punto del documento entre en conflicto con preservar el §0.2, prevalece §0.2 hasta que la funcionalidad equivalente esté implementada y probada en la nueva capa.

---

## 1. Alcance de Fusión

### 1.1 Qué se fusiona

| Archivo origen | Rol actual | Destino |
|---|---|---|
| `aiLogic.js` — `AiManager` | Despliegue estratégico | Se mantiene **solo** para la fase `deployment`. No ejecuta turno. |
| `ai_gameplayLogic.js` — `AiGameplayManager` | Motor de turno principal | **Se convierte en el único motor** de decisión durante `play`. |
| `ai_enhanced_functions.js` | Extensiones parcheadas sobre `AiGameplayManager` | Se absorben dentro de `AiGameplayManager` como métodos propios. |
| `a.js`, `b.js` | Fragmentos heredados | Se auditan (Fase 4) para confirmar que todo su contenido tiene equivalente en `AiGameplayManager`. Solo se archivan cuando los tests de aceptación confirman paridad. |
| `ia_archipielago/IA_ARCHIPIELAGO.js` — `IAArchipielago` | Motor especializado para mapas navales | **Se mantiene como submódulo**. El motor unificado lo invoca cuando `gameState.setupTempSettings.navalMap === true`. No se fusiona en `AiGameplayManager` hasta que la capa de nodos cubra toda su funcionalidad (v2.0+). |

### 1.2 Qué queda fuera del alcance

- `aiLogic.js` — `deployUnitsAI()` no se toca. La fase de despliegue tiene su propio flujo.
- `aiLogic.js` — `analyzeEnvironment()`, `determineDeploymentStrategy()`, `generateMissionList()` no se migran; son exclusivos de despliegue.
- `allianceManager.js`, `diplomaticManager.js` — fuera de alcance.
- Lógica multijugador de `NetworkManager` — no se modifica.
- UI de marcador y puntuación — no se modifica en esta fase.

### 1.3 Condición de completitud

La fusión se considera completa cuando:

1. `AiGameplayManager.executeTurn(playerNumber)` es el único punto de entrada para el turno de la IA en fase `play` en mapas terrestres.
2. `IAArchipielago.ejecutarTurno(playerNumber)` sigue siendo el punto de entrada para mapas navales, y es invocado desde `AiGameplayManager.executeTurn()` cuando corresponde.
3. Todos los tests T-01 a T-11 pasan sin regresión respecto a la línea base de §0.2.
4. `a.js` y `b.js` han sido eliminados físicamente.

---

## 2. Contrato del Motor Unificado

### 2.1 Firma de entrada

```javascript
AiGameplayManager.executeTurn(playerNumber: number): Promise<void>
```

- `playerNumber`: entero 1–8 que coincide con `gameState.currentPlayer`.
- Solo se llama cuando `gameState.currentPhase === "play"`.
- Solo se llama cuando `gameState.playerTypes[playerNumber] === "ai"`.
- Es `async`. La llamada debe `await`earse antes de avanzar turno.

### 2.2 Invariantes que el motor **nunca** puede violar

| # | Invariante |
|---|---|
| I-1 | El motor no modifica `gameState.currentPlayer` ni `gameState.currentPhase`. |
| I-2 | El motor puede llamar a `handleEndTurn()` via `setTimeout` al final de `executeTurn()` (comportamiento actual preservado por §0). No puede llamar a la transición de turno desde ningún otro punto del flujo interno. |
| I-3 | El motor no ejecuta acciones sobre unidades con `hasMoved === true`. |
| I-4 | El motor no ejecuta acciones sobre unidades de otro jugador. |
| I-5 | Toda acción de unidad pasa por `RequestMoveUnit()`, `RequestAttack()` o equivalente. Nunca mutación directa. |
| I-6 | Toda decisión emite al menos una entrada de log con el formato de la sección 7. |
| I-7 | Todo **peso nuevo** añadido al motor a partir de la Fase 1 debe leer de `ia_config.json`. Los pesos existentes hardcoded (ej. puntuaciones en `handleStrategicReinforcements`, umbrales en `_executeCapitalDefenseProtocol`) se migran progresivamente en Fases 2–3 y se documentan en §10.2 como decisiones abiertas hasta que se migren. |

### 2.3 Fases internas del motor (orden fijo)

```
FASE A — Lectura de estado
  A1. Cargar configuración desde ia_config.json (sección 5)
  A2. Obtener snapshot de board, units, gameState

FASE B — Evaluación estratégica
  B1. Detectar amenaza a ciudad natal propia
  B2. Evaluar salud económica (oro vs umbral_economia_critica)
  B3. Identificar nodos de valor activos (sección 4)
  B4. Puntuar cada nodo con calcularPesoNodo()

FASE C — Planificación
  C1. Ordenar nodos por peso descendente
  C2. Generar lista de misiones desde nodos top-N (N = max_misiones_por_turno)
  C3. Asignar unidades disponibles a misiones por afinidad

FASE D — Ejecución
  D1. Gestión de imperio (construir, investigar, producir)
  D2. Mover y atacar según misiones asignadas
  D3. Emitir log de razón por cada acción (sección 7)

FASE E — Cierre
  E1. Marcar hasMoved en todas las unidades propias
  E2. Resolver promesa
```

### 2.4 Contrato de `calcularPesoNodo(nodo, estado, config)`

```javascript
/**
 * @param {NodoValor} nodo   — Objeto del catálogo (sección 4)
 * @param {object}    estado — snapshot del gameState relevante
 * @param {object}    config — contenido parseado de ia_config.json
 * @returns {number}         — Peso final ≥ 0. Mayor = más prioritario.
 */
function calcularPesoNodo(nodo, estado, config) {
  const base   = config.nodos[nodo.tipo]?.peso_base ?? 0;
  const econ   = nodo.valor_economico   * config.multiplicadores.economia;
  const surv   = nodo.valor_supervivencia * config.multiplicadores.supervivencia;
  const sab    = nodo.valor_sabotaje    * config.multiplicadores.sabotaje;
  const ctrl   = nodo.valor_control     * config.multiplicadores.control;
  const dist   = 1 / (1 + nodo.distancia * config.penalizacion_distancia);
  const riesgo = 1 - (nodo.riesgo       * config.penalizacion_riesgo);
  return (base + econ + surv + sab + ctrl) * dist * riesgo;
}
```

Ninguna otra función puede alterar el orden resultante de nodos salvo mediante las claves de `ia_config.json`.

---

## 3. Matriz de Decisiones y Desempates

### 3.1 Jerarquía primaria (orden estricto, no ponderado)

Cuando dos nodos tienen el mismo peso calculado, o cuando una condición crítica está activa, la jerarquía siguiente prevalece **sin excepción**:

| Nivel | Condición de activación | Acción forzada | Suspende |
|---|---|---|---|
| **0 — CRÍTICO** | Ciudad natal con enemigo en rango ≤ 2 | Protocolo defensa capital (ver 3.2) | Todo lo demás |
| **1 — EMERGENCIA** | Única unidad propia con salud < 30 % | Protocolo preservación última unidad | Niveles 2–4 |
| **2 — CRISIS ECONÓMICA** | `oro < config.umbral_economia_critica` | Ruta a Banca o ciudad libre más cercana | Niveles 3–4 |
| **3 — SABOTAJE** | Ruta comercial enemiga activa detectada | Atacar eslabón rompible más cercano | Nivel 4 |
| **4 — NORMAL** | Ninguna condición anterior activa | Nodo de mayor peso según `calcularPesoNodo` | — |

### 3.2 Protocolo defensa capital (Nivel 0)

```
1. Buscar ciudad propia alternativa menos amenazada 
→ si existe y capital_movible, cambiar capital.
→ si no existe y puedo crearla, crear, camino, fortaleza, fortaleza amurallada, colono, ciudad --> cambiar capital.
2. Buscar divisiones propias con capacidad de fusión 
→ si la fusión produce fuerza > fuerza_atacante * 1.2, ejecutar fusión y defender.
3. Si recursos >= coste_division_emergencia → producir división de emergencia en ciudad natal.
4. Mover TODAS las unidades no comprometidas hacia ciudad natal.
→ si la fusión no produce fuerza > fuerza_atacante * 1.2, tratar de bloquear al enemigo y destruir su suministro mientras acerco unidades para que en un siguiente turno, logre la fuerza suficiente.
5. Atacar mientras nivel 0 esté activo a las divisiones atacantes si fuerza > fuerza_atacante * 1.2. 
```

### 3.3 Desempate entre nodos de igual peso

Orden de desempate estricto:

1. `valor_supervivencia` mayor gana.
2. `distancia` menor gana.
3. `valor_economico` mayor gana.
4. `conectividad` mayor gana.
5. Si todo es igual: prioridad de tipo según tabla:

| Prioridad | Tipo de nodo |
|---|---|
| 1 | `ciudad_natal_propia` |
| 2 | `ultima_unidad_propia` |
| 3 | `banca` |
| 4 | `ciudad_propia_desconectada` |
| 5 | `camino_propio_critico` |
| 6 | `fortaleza_a_construir` |
| 7 | `sitio_aldea` |
| 8 | `caravana_propia` |
| 9 | `ciudad_libre` |
| 10 | `ciudad_barbara` |
| 11 | `camino_enemigo_critico` |
| 12 | `caravana_enemiga` |
| 13 | `ciudad_enemiga` |
| 14 | `recurso_estrategico` |
| 15 | `cuello_botella` |
| 16 | `sitio_desembarco` |

### 3.4 Regla de no-ataque prematuro

El motor **no puede** priorizar ataque a ciudad enemiga si todas las condiciones siguientes son verdaderas:

- `oro < config.umbral_ataque_ofensivo`
- No hay ruta comercial propia activa hacia al menos Otro Punto (ciudad o Banca)
- El Jugador Humano está amenazando mi capital.

### 3.5 Regla de suministro.

Toda división tendrá un peso negativo si el movimiento que va a hacer la deja sin suministro. 

---

## 4. Catálogo Formal de Nodos de Valor

Cada instancia de nodo es un objeto con los campos exactos siguientes. Todos son requeridos.

```typescript
interface NodoValor {
  id:                       string;   // UUID generado por crypto.randomUUID()
  tipo:                     TipoNodo; // Enum — ver tabla 4.1
  propietario:              number;   // playerNumber | 0 = neutral
  valor_base:               number;   // ≥ 0, extraído de ia_config.json
  valor_economico:          number;   // ≥ 0
  valor_supervivencia:      number;   // ≥ 0
  valor_sabotaje:           number;   // ≥ 0, aplica solo si propietario ≠ este jugador
  valor_control:            number;   // ≥ 0
  distancia:                number;   // hexágonos desde unidad más cercana del jugador activo
  riesgo:                   number;   // 0.0–1.0, probabilidad de pérdida al intentar tomar el nodo
  conectividad:             number;   // 0–10, nodos propios conectados accesibles desde este
  turnos_estimados:         number;   // entero ≥ 1
  r:                        number;   // fila en board[][]
  c:                        number;   // columna en board[][]
  razon_texto:              string;   // frase legible para log/tutorial, ej: "Banca conectada a 2 ciudades"
}
```

### Tabla 4.1 — Tipos de nodo válidos (`TipoNodo`)

| Clave (`tipo`) | Descripción | `valor_supervivencia` mínimo | `valor_economico` mínimo |
|---|---|---|---|
| `ciudad_natal_propia` | Ciudad natal del jugador activo | 500 | 100 |
| `ultima_unidad_propia` | Única unidad viva propia | 400 | 0 |
| `ciudad_propia_conectada` | Ciudad propia con ruta activa | 0 | 80 |
| `ciudad_propia_desconectada` | Ciudad propia sin ruta activa | 50 | 20 |
| `banca` | Hexágono de Banca | 0 | 200 |
| `ciudad_libre` | Ciudad neutral sin propietario | 0 | 60 |
| `camino_propio_critico` | Casilla de camino que si cae corta la red propia | 30 | 90 |
| `camino_enemigo_critico` | Casilla de camino enemigo que si cae corta su red | 0 | 0 (sabotaje: 80) |
| `caravana_propia` | Caravana propia activa | 20 | 100 |
| `caravana_enemiga` | Caravana enemiga activa | 0 | 0 (sabotaje: 90) |
| `recurso_estrategico` | Nodo de recurso (hierro, oro, comida, etc.) | 0 | 50–150 |
| `ciudad_enemiga` | Ciudad de otro jugador | 0 | 30 |
| `cuello_botella` | Hexágono geográfico con ≤1 alternativa de paso | 10 | 40 |
| `sitio_aldea` | Hexágono candidato para fundar Aldea con Colono | 0 | 70 |
| `sitio_desembarco` | Hexágono costero enemigo o neutro para operación anfibia | 0 | 50 |
| `fortaleza_a_construir` | Hexágono propio candidato para construir Fortaleza o Fortaleza Amurallada | 20 | 50 |
| `ciudad_barbara` | Ciudad neutral con guarnición bárbara, objetivo de expedición ⚠️ | 0 | 70 |

### 4.2 Funciones de detección — contratos mínimos

```javascript
// Devuelve NodoValor[] ordenados por calcularPesoNodo() descendente
function detectarNodosDeValor(playerNumber, estado, config): NodoValor[]

// Devuelve true si la ciudad natal tiene enemigo en rango ≤ 2
function esCiudadNatalAmenazada(playerNumber): boolean

// Devuelve true si existe ruta de caminos ininterrumpida entre ciudad y Banca
function existeRutaActivaABanca(playerNumber): boolean

// Devuelve el camino enemigo de mayor valor_economico cortable en 1 acción
function encontrarEslabon Rompible(playerNumber): NodoValor | null
```

---

## 5. Especificación JSON Externa

### 5.1 Ruta del archivo

```
/workspaces/iberion/ia_config.json
```

No existe todavía. Se crea durante la Fase 1 del refactor (sección 6).

### 5.2 Schema completo (JSON Schema Draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "ia_config",
  "title": "Configuración del Motor IA Unificado",
  "type": "object",
  "required": [
    "version",
    "multiplicadores",
    "penalizacion_distancia",
    "penalizacion_riesgo",
    "umbrales",
    "nodos",
    "victoria_puntos",
    "max_misiones_por_turno"
  ],
  "additionalProperties": false,
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "max_misiones_por_turno": { "type": "integer", "minimum": 1, "maximum": 20 },
    "penalizacion_distancia": { "type": "number", "minimum": 0, "maximum": 1 },
    "penalizacion_riesgo":    { "type": "number", "minimum": 0, "maximum": 1 },
    "multiplicadores": {
      "type": "object",
      "required": ["economia","supervivencia","sabotaje","control"],
      "properties": {
        "economia":      { "type": "number", "minimum": 0 },
        "supervivencia": { "type": "number", "minimum": 0 },
        "sabotaje":      { "type": "number", "minimum": 0 },
        "control":       { "type": "number", "minimum": 0 }
      },
      "additionalProperties": false
    },
    "umbrales": {
      "type": "object",
      "required": ["economia_critica","ataque_ofensivo","salud_critica_unidad"],
      "properties": {
        "economia_critica":     { "type": "number", "minimum": 0 },
        "ataque_ofensivo":      { "type": "number", "minimum": 0 },
        "salud_critica_unidad": { "type": "number", "minimum": 0, "maximum": 100 }
      },
      "additionalProperties": false
    },
    "nodos": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ciudad_natal_propia":        { "$ref": "#/definitions/nodo_config" },
        "ultima_unidad_propia":       { "$ref": "#/definitions/nodo_config" },
        "ciudad_propia_conectada":    { "$ref": "#/definitions/nodo_config" },
        "ciudad_propia_desconectada": { "$ref": "#/definitions/nodo_config" },
        "banca":                      { "$ref": "#/definitions/nodo_config" },
        "ciudad_libre":               { "$ref": "#/definitions/nodo_config" },
        "camino_propio_critico":      { "$ref": "#/definitions/nodo_config" },
        "camino_enemigo_critico":     { "$ref": "#/definitions/nodo_config" },
        "caravana_propia":            { "$ref": "#/definitions/nodo_config" },
        "caravana_enemiga":           { "$ref": "#/definitions/nodo_config" },
        "recurso_estrategico":        { "$ref": "#/definitions/nodo_config" },
        "ciudad_enemiga":             { "$ref": "#/definitions/nodo_config" },
        "cuello_botella":             { "$ref": "#/definitions/nodo_config" }
      }
    },
    "victoria_puntos": {
      "type": "object",
      "required": [
        "puntos_por_ciudad",
        "puntos_por_unidad_destruida",
        "puntos_por_tecnologia",
        "multiplicador_recurso_comida",
        "multiplicador_recurso_hierro",
        "multiplicador_recurso_oro"
      ],
      "properties": {
        "puntos_por_ciudad":            { "type": "number", "minimum": 0 },
        "puntos_por_unidad_destruida":  { "type": "number", "minimum": 0 },
        "puntos_por_tecnologia":        { "type": "number", "minimum": 0 },
        "multiplicador_recurso_comida": { "type": "number", "minimum": 0 },
        "multiplicador_recurso_hierro": { "type": "number", "minimum": 0 },
        "multiplicador_recurso_oro":    { "type": "number", "minimum": 0 }
      },
      "additionalProperties": false
    }
  },
  "definitions": {
    "nodo_config": {
      "type": "object",
      "required": ["peso_base","peso_economico","peso_supervivencia","peso_sabotaje","peso_control"],
      "properties": {
        "peso_base":          { "type": "number", "minimum": 0 },
        "peso_economico":     { "type": "number", "minimum": 0 },
        "peso_supervivencia": { "type": "number", "minimum": 0 },
        "peso_sabotaje":      { "type": "number", "minimum": 0 },
        "peso_control":       { "type": "number", "minimum": 0 }
      },
      "additionalProperties": false
    }
  }
}
```

### 5.3 Archivo de ejemplo completo (valores de partida)

```json
{
  "version": "1.0",
  "max_misiones_por_turno": 6,
  "penalizacion_distancia": 0.1,
  "penalizacion_riesgo": 0.5,
  "multiplicadores": {
    "economia":      1.2,
    "supervivencia": 2.0,
    "sabotaje":      0.9,
    "control":       0.7
  },
  "umbrales": {
    "economia_critica":             400,
    "ataque_ofensivo":              1000,
    "salud_critica_unidad":         30,
    "ratio_asedio_sin_artilleria":  2.5
  },
  "nodos": {
    "ciudad_natal_propia":        { "peso_base": 500, "peso_economico": 100, "peso_supervivencia": 500, "peso_sabotaje": 0,   "peso_control": 80  },
    "ultima_unidad_propia":       { "peso_base": 400, "peso_economico": 0,   "peso_supervivencia": 400, "peso_sabotaje": 0,   "peso_control": 0   },
    "ciudad_propia_conectada":    { "peso_base": 120, "peso_economico": 80,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 60  },
    "ciudad_propia_desconectada": { "peso_base": 80,  "peso_economico": 20,  "peso_supervivencia": 50,  "peso_sabotaje": 0,   "peso_control": 40  },
    "banca":                      { "peso_base": 200, "peso_economico": 200, "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 50  },
    "ciudad_libre":               { "peso_base": 60,  "peso_economico": 60,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 80  },
    "camino_propio_critico":      { "peso_base": 90,  "peso_economico": 90,  "peso_supervivencia": 30,  "peso_sabotaje": 0,   "peso_control": 20  },
    "camino_enemigo_critico":     { "peso_base": 0,   "peso_economico": 0,   "peso_supervivencia": 0,   "peso_sabotaje": 80,  "peso_control": 0   },
    "caravana_propia":            { "peso_base": 100, "peso_economico": 100, "peso_supervivencia": 20,  "peso_sabotaje": 0,   "peso_control": 0   },
    "caravana_enemiga":           { "peso_base": 0,   "peso_economico": 0,   "peso_supervivencia": 0,   "peso_sabotaje": 90,  "peso_control": 0   },
    "recurso_estrategico":        { "peso_base": 60,  "peso_economico": 100, "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 40  },
    "ciudad_enemiga":             { "peso_base": 30,  "peso_economico": 30,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 100 },
    "cuello_botella":             { "peso_base": 40,  "peso_economico": 40,  "peso_supervivencia": 10,  "peso_sabotaje": 20,  "peso_control": 50  }
    ,
    "sitio_aldea":                { "peso_base": 60,  "peso_economico": 70,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 60  },
    "sitio_desembarco":           { "peso_base": 50,  "peso_economico": 50,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 80  },
    "fortaleza_a_construir":      { "peso_base": 50,  "peso_economico": 50,  "peso_supervivencia": 20,  "peso_sabotaje": 0,   "peso_control": 60  },
    "ciudad_barbara":             { "peso_base": 70,  "peso_economico": 70,  "peso_supervivencia": 0,   "peso_sabotaje": 0,   "peso_control": 80  }
  },
  "victoria_puntos": {
    "puntos_por_ciudad":            100,
    "puntos_por_unidad_destruida":  20,
    "puntos_por_tecnologia":        35,
    "multiplicador_recurso_comida": 0.5,
    "multiplicador_recurso_hierro": 0.8,
    "multiplicador_recurso_oro":    1.2
  }
}
```

### 5.4 Carga en tiempo de ejecución

```javascript
// En AiGameplayManager, ejecutar una sola vez por sesión y cachear.
// Si el archivo no existe, lanzar error explícito (nunca caer a hardcoded).
async function cargarConfigIA() {
  const res = await fetch('./ia_config.json');
  if (!res.ok) throw new Error('[IA] ia_config.json no encontrado. Abortar.');
  const config = await res.json();
  // Validación mínima
  if (!config.version || !config.nodos) throw new Error('[IA] ia_config.json malformado.');
  return config;
}
```

---

## 6. Mapa de Refactor por Archivo y Fases

### Fase 1 — Fundaciones (prerequisito de todo lo demás)

**Duración estimada:** 1 sprint  
**Bloqueante para:** Fases 2, 3, 4

| Tarea | Archivo | Acción | Criterio "hecho" |
|---|---|---|---|
| F1-1 | `ia_config.json` | CREAR con los valores del ejemplo §5.3 | Archivo existe y pasa validación del schema §5.2 |
| F1-2 | `ai_gameplayLogic.js` | Añadir `cargarConfigIA()` y cachear en `AiGameplayManager._config` | `executeTurn()` lee `_config` sin lanzar error |
| F1-3 | `ai_gameplayLogic.js` | Añadir `NodoValor` como clase/factory y `calcularPesoNodo()` | Tests de aceptación T-01 y T-02 pasan |
| F1-4 | `ai_gameplayLogic.js` | Añadir `detectarNodosDeValor()` | Devuelve lista no vacía en cualquier estado de juego válido |

### Fase 2 — Protocolo de prioridades

**Bloqueante para:** Fase 3

| Tarea | Archivo | Acción | Criterio "hecho" |
|---|---|---|---|
| F2-1 | `ai_gameplayLogic.js` | Implementar comprobaciones de nivel 0 y 1 antes de `planStrategicObjectives()` | Test de aceptación T-03 pasa |
| F2-2 | `ai_gameplayLogic.js` | Implementar `esCiudadNatalAmenazada()` | Devuelve true/false correcto según board[][] |
| F2-3 | `ai_gameplayLogic.js` | Implementar crisis económica (nivel 2) desviando misiones a ruta Banca | Test T-04 pasa |
| F2-4 | `ai_gameplayLogic.js` | Implementar sabotaje (nivel 3) con `encontrarEslabonRompible()` | Test T-05 pasa |

### Fase 3 — Absorber `ai_enhanced_functions.js`

| Tarea | Archivo | Acción | Criterio "hecho" |
|---|---|---|---|
| F3-1 | `ai_gameplayLogic.js` | Mover `executeRetreat()` como método propio | Llamadas desde `executeTurn()` funcionan |
| F3-2 | `ai_gameplayLogic.js` | Mover `_executeNavalCombat()` como método propio | Sin referencia a `ai_enhanced_functions.js` |
| F3-3 | `ai_enhanced_functions.js` | ELIMINAR el archivo tras confirmar absorción | Tests T-01 a T-05 pasan sin el archivo |

### Fase 4 — Eliminar legado

### Fase 4 — Verificar y archivar legado

**Objetivo**: confirmar paridad, no eliminar inmediatamente. La eliminación física de archivos es resultado de esta fase, no su premisa.

| Tarea | Archivo | Acción | Criterio "hecho" |
|---|---|---|---|
| F4-1 | `a.js` | Auditar: mapear cada función a su equivalente en `AiGameplayManager`. Documentar diferencias. | Tabla de mapa función→equivalente completada y en §10.2 |
| F4-2 | `b.js` | Igual que F4-1 | Tabla de mapa función→equivalente completada |
| F4-3 | `a.js`, `b.js` | **Opcional en v1.0**: si F4-1/F4-2 confirman paridad completa y T-01 a T-11 pasan, marcar archivos como `legado/` (mover o comentar encabezado) | Tests pasan. Ninguna función exclusiva sin equivalente confirmado. |
| F4-4 | `index.html` | Quitar `<script>` tags solo tras completar F4-3 | Juego arranca sin errores de consola. Ejecutar T-08 como validación. |

### Restricciones de orden

```
F1 → F2 → F3 → F4
No hacer F4 sin pruebas de F3.
No hacer F3 sin pruebas de F2.
```

---

## 7. Trazabilidad, Logs y Debug

### 7.1 Formato de log obligatorio

Toda decisión del motor emite exactamente un log con esta estructura:

```javascript
// Prefijo canónico: [IA-MOTOR]
// Nivel INFO para decisiones normales, WARN para nivel 0/1, ERROR para invariante violado

console.log(
  `[IA-MOTOR] J${playerNumber} T${gameState.turnNumber} | ` +
  `NIVEL:${nivelJerarquia} | NODO:${nodo.tipo} (${nodo.r},${nodo.c}) | ` +
  `PESO:${peso.toFixed(1)} | ACCION:${accion} | RAZON:"${nodo.razon_texto}"`
);
```

Ejemplo de salida real esperada:

```
[IA-MOTOR] J2 T4 | NIVEL:2 | NODO:banca (8,12) | PESO:340.5 | ACCION:mover_hacia | RAZON:"Banca sin ruta activa — restaurar economía"
[IA-MOTOR] J2 T4 | NIVEL:4 | NODO:caravana_enemiga (5,9) | PESO:210.0 | ACCION:atacar | RAZON:"Caravana enemiga corta flujo de oro rival"
```

### 7.2 Campos requeridos en cada entrada

| Campo | Tipo | Descripción |
|---|---|---|
| `J{n}` | entero | número de jugador |
| `T{n}` | entero | número de turno |
| `NIVEL` | 0–4 | jerarquía activa según §3.1 |
| `NODO` | string | `tipo` del nodo y coordenadas |
| `PESO` | float 1 decimal | resultado de `calcularPesoNodo()` |
| `ACCION` | string | acción ejecutada (ver tabla 7.3) |
| `RAZON` | string | `razon_texto` del nodo |

### 7.3 Vocabulario de acciones aceptado para el campo `ACCION`

| Valor | Significa |
|---|---|
| `mover_hacia` | Movimiento de unidad hacia nodo |
| `atacar` | Ataque a unidad o estructura |
| `construir_camino` | Construcción de casilla de camino |
| `construir_Fortaleza` | Construcción de casilla de Castillo |
| `construir_Fortaleza_amurallada` | Construcción de casilla de Fortaleza Amurallada |
| `producir_colono` | Producción de unidad militar |
| `construir_Aldea` | Construcción de casilla de Aldea |
| `crear_caravana` | Producción de caravana |
| `producir_division` | Producción de unidad militar |
| `producir_emergencia` | Producción de emergencia en capital |
| `investigar` | Avance tecnológico |
| `fusionar` | Merge de divisiones |
| `retroceder` | Retirada táctica |
| `esperar` | Unidad sin acción útil este turno |
| `cambiar_capital` | Traslado de ciudad natal |
| `embarcar` | Cargar unidades terrestres en transporte naval |
| `desembarcar` | Descargar tropas de transporte en hexágono costero |
| `fundar_aldea` | Usar Colono para fundar Aldea en hexágono objetivo |
| `producir_naval` | Producir unidad naval (Patache, Barco de Guerra) |

### 7.4 Debug console — comandos de inspección

Los siguientes comandos deben funcionar desde `debugConsole.js` (Ctrl+Shift+D) tras implementar la Fase 1:

```javascript
// Ver nodos activos del jugador 2
AiGameplayManager._lastNodeList[2]

// Ver config cargada
AiGameplayManager._config

// Recalcular peso de un nodo manualmente
calcularPesoNodo(AiGameplayManager._lastNodeList[2][0], gameState, AiGameplayManager._config)

// Ver log de la última decisión de cada jugador IA
AiGameplayManager._lastDecisionLog
```

`_lastNodeList`, `_config` y `_lastDecisionLog` son propiedades internas que el motor debe escribir en cada turno.

### 7.5 Integración con Crónica

Las acciones de nivel 0 y nivel 1 deben generar también un evento en `chronicle.js` con etiqueta `"ia_decision"` y el campo `razon_texto` del nodo como descripción. Esto es suficiente para que el tutorial pueda mostrar la razón estratégica en la interfaz.

---

## 8. Plan de Pruebas de Aceptación

Cada test tiene un id, precondición, acción del sistema bajo prueba, resultado esperado medible y criterio de fallo.

### T-01 — Carga de configuración

**Precondición**: `ia_config.json` existe con schema válido.  
**Acción**: llamar `AiGameplayManager.executeTurn(2)` con turno 1.  
**Esperado**: `AiGameplayManager._config.version === "1.0"` sin excepción.  
**Fallo si**: consola muestra error o `_config` es undefined.

---

### T-02 — Cálculo de peso de nodo

**Precondición**: `ia_config.json` cargado. Nodo tipo `banca` con `valor_economico=200`, `distancia=3`.  
**Acción**: llamar `calcularPesoNodo(nodo, estado, config)`.  
**Esperado**: resultado numérico > 0, consistente con la fórmula de §2.4.  
**Fallo si**: resultado es NaN, negativo, o no coincide con cálculo manual.

---

### T-03 — Protocolo defensa capital (Nivel 0)

**Precondición**: unidad enemiga a distancia 2 de ciudad natal del jugador 2. Jugador 2 tiene unidades en otros sectores.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: al menos una unidad del jugador 2 se mueve hacia la ciudad natal. Log emite entrada con `NIVEL:0`.  
**Fallo si**: motor sigue expandiéndose o atacando ciudad enemiga lejana.

---

### T-04 — Crisis económica (Nivel 2)

**Precondición**: `gameState.playerResources[2].oro = 300` (< umbral de 400). No hay amenaza Nivel 0 ni 1.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: misión de mayor prioridad apunta a nodo `banca` o `camino_propio_critico`. Log emite `NIVEL:2`.  
**Fallo si**: motor produce unidad militar o ataca ciudad enemiga.

---

### T-05 — Sabotaje de ruta enemiga (Nivel 3)

**Precondición**: jugador 1 tiene caravana activa con ruta a Banca. Jugador 2 tiene unidad a distancia ≤ 4 del eslabón más débil. Oro J2 > umbral. Sin amenaza Nivel 0/1/2.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: unidad del J2 se mueve hacia o ataca el eslabón identificado. Log emite `NIVEL:3 NODO:caravana_enemiga` o `NODO:camino_enemigo_critico`.  
**Fallo si**: motor ignora ruta enemiga y ataca frontal.

---

### T-06 — No-ataque prematuro

**Precondición**: J2 sin ruta activa a Banca, `oro < umbral_ataque_ofensivo`, ciudad enemiga a distancia 6.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: ninguna unidad del J2 se mueve hacia la ciudad enemiga. La misión más prioritaria es logística o económica.  
**Fallo si**: alguna unidad avanza hacia la ciudad enemiga.

---

### T-07 — Formato de log

**Precondición**: cualquier partida con J2 IA activo.  
**Acción**: ejecutar 3 turnos completos del J2.  
**Esperado**: todos los logs del motor comienzan con `[IA-MOTOR]` y contienen los 6 campos de §7.2.  
**Fallo si**: algún log no tiene el prefijo o falta algún campo requerido.

---

### T-08 — Eliminación de legado

**Precondición**: Fases 3 y 4 completadas. `a.js`, `b.js`, `ai_enhanced_functions.js` eliminados.  
**Acción**: abrir juego en navegador, ejecutar partida completa de 10 turnos (J1 humano vs J2 IA).  
**Esperado**: T-01 a T-07 siguen pasando. Consola sin errores de referencia.  
**Fallo si**: cualquier `ReferenceError` o `TypeError` relacionado con funciones de los archivos eliminados.

---

### T-09 — Recarga de config en vivo (regresión)

**Precondición**: partida activa. Se modifica `ia_config.json` cambiando `penalizacion_distancia` a 0.5.  
**Acción**: recargar config (llamar `cargarConfigIA()` manualmente desde debug console). Ejecutar turno.  
**Esperado**: `AiGameplayManager._config.penalizacion_distancia === 0.5`. Motor usa el nuevo valor.  
**Fallo si**: motor usa valor anterior o lanza excepción.

---

### T-10 — Evaluación táctica de asedio sin artillería (regla R-C1)

Este test cubre los 3 sub-casos de la regla R-C1.

**T-10a — Fortaleza desguarnecida: debe ocuparse**  
**Precondición**: J1 tiene `Fortaleza` sin unidad defensora. J2 tiene unidad adyacente sin `Artillería`.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: J2 ocupa la Fortaleza. Log contiene `ACCION:atacar` o `ACCION:mover_hacia` con el nodo de fortaleza.  
**Fallo si**: la IA ignora la fortaleza vacía y manda la unidad a otro objetivo.

---

**T-10b — Fortaleza defendida, sin artillería, ratio bajo: debe vetarse**  
**Precondición**: J1 tiene `Fortaleza` con unidad defensora de poder 80. J2 tiene unidad de poder 100 (ratio 1.25, bajo el umbral 2.5). Sin artillería en J2.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: la IA NO ataca la Fortaleza. Asigna misión logística, o Fusiona para cumplir el ratio, o produce `Artillería`. Log no contiene `ACCION:atacar` hacia ese hexágono.  
**Fallo si**: la unidad ataca pese al ratio insuficiente.

---

**T-10c — Fortaleza defendida, sin artillería, ratio dominante y posición estratégica: debe atacar**  
**Precondición**: J1 tiene `Fortaleza` con unidad defensora de poder 30. J2 tiene unidad de poder 90 (ratio 3.0, supera umbral 2.5). El peso del nodo supera `ataque_ofensivo`. Sin artillería en J2.  
**Acción**: `AiGameplayManager.executeTurn(2)`.  
**Esperado**: la IA ataca aunque haya bajas. Log contiene `ACCION:atacar RAZON:` con mención a posición estratégica.  
**Fallo si**: la IA veta el ataque pese al ratio dominante.

---

### T-11 — No-regresión IAArchipielago en mapa naval

**Precondición**: partida en mapa naval (`navalMap === true`). J2 IA sin unidades navales.  
**Acción**: ejecutar 5 turnos con J2 IA.  
**Esperado**: J2 produce al menos 1 Patache o Barco de Guerra. Al menos 1 movimiento de unidad terrestre hacia posición costera. Sin errores de consola relacionados con `IAArchipielago`.  
**Fallo si**: J2 nunca produce unidad naval o lanza `ReferenceError` en `IAArchipielago`.

---

## 9. Glosario Canónico de Nombres y Claves

Este glosario es la única fuente de verdad para nombres de variables, propiedades y claves JSON empleadas en el motor unificado. Cualquier nombre no listado aquí debe añadirse antes de usarse.

| Término canónico | Tipo | Ubicación | Descripción |
|---|---|---|---|
| `AiGameplayManager` | object | `ai_gameplayLogic.js` | Único motor de turno IA para fase `play` |
| `AiManager` | object | `aiLogic.js` | Motor exclusivo de despliegue (`deployment`) |
| `IAArchipielago` | object | `ia_archipielago/IA_ARCHIPIELAGO.js` | Motor especializado para mapas navales; invocado por `AiGameplayManager` cuando `navalMap === true` |
| `executeTurn(playerNumber)` | method | `AiGameplayManager` | Punto de entrada único del turno IA |
| `calcularPesoNodo(nodo, estado, config)` | function | `ai_gameplayLogic.js` | Fórmula canónica de evaluación de nodo |
| `detectarNodosDeValor(playerNumber, estado, config)` | function | `ai_gameplayLogic.js` | Genera lista de `NodoValor[]` |
| `NodoValor` | interface/object | `ai_gameplayLogic.js` | Estructura estándar de nodo (§4) |
| `ia_config.json` | file | raíz del proyecto | Única fuente de pesos y umbrales |
| `_config` | property | `AiGameplayManager` | Config cargada y cacheada del JSON |
| `_lastNodeList` | property | `AiGameplayManager` | Último `NodoValor[]` evaluado, indexado por playerNumber |
| `_lastDecisionLog` | property | `AiGameplayManager` | Último log de decisión por playerNumber |
| `tipo` | field | `NodoValor` | Clave de tipo de nodo; ver tabla 4.1 |
| `valor_economico` | field | `NodoValor` | Aporte económico del nodo ≥ 0 |
| `valor_supervivencia` | field | `NodoValor` | Aporte de supervivencia ≥ 0 |
| `valor_sabotaje` | field | `NodoValor` | Aporte de sabotaje ≥ 0 |
| `valor_control` | field | `NodoValor` | Aporte de control territorial ≥ 0 |
| `distancia` | field | `NodoValor` | Hexágonos a la unidad propia más cercana |
| `riesgo` | field | `NodoValor` | 0.0–1.0 probabilidad de pérdida |
| `conectividad` | field | `NodoValor` | Nodos propios accesibles desde este |
| `turnos_estimados` | field | `NodoValor` | Turnos para afectar el nodo |
| `razon_texto` | field | `NodoValor` | Frase legible para log y tutorial |
| `penalizacion_distancia` | key | `ia_config.json` | Factor de penalización por distancia (0-1) |
| `penalizacion_riesgo` | key | `ia_config.json` | Factor de penalización por riesgo (0-1) |
| `multiplicadores` | key | `ia_config.json` | Objeto con factores globales por eje |
| `umbrales` | key | `ia_config.json` | Objeto con límites numéricos de comportamiento |
| `umbral_economia_critica` | key | `ia_config.json → umbrales` | Oro mínimo antes de activar Nivel 2 |
| `umbral_ataque_ofensivo` | key | `ia_config.json → umbrales` | Oro mínimo para autorizar ataque ofensivo |
| `salud_critica_unidad` | key | `ia_config.json → umbrales` | % salud bajo el que activar Nivel 1 |
| `max_misiones_por_turno` | key | `ia_config.json` | Límite de nodos que generan misión por turno |
| `peso_base` | key | `ia_config.json → nodos → {tipo}` | Valor fijo independiente de estado |
| `missionAssignments` | property | `AiGameplayManager` | Map<unitId, missionDetails> del turno actual |
| `NIVEL:0` | log tag | consola | Defensa capital activa |
| `NIVEL:1` | log tag | consola | Preservación última unidad |
| `NIVEL:2` | log tag | consola | Crisis económica |
| `NIVEL:3` | log tag | consola | Sabotaje ruta enemiga |
| `NIVEL:4` | log tag | consola | Decisión normal por peso |
| `[IA-MOTOR]` | log prefix | consola | Prefijo obligatorio de todo log del motor |

### Nombres prohibidos (no usar en código nuevo)

| Nombre prohibido | Motivo | Alternativa |
|---|---|---|
| `IA_básica` como variable o comentario activo | Marca legado | `AiManager` (solo despliegue) |
| `peso` sin prefijo (ej. `peso = 50`) | Ambiguo | `peso_base`, `peso_economico`, etc. |
| `HARDCODED_*` o constante numérica de balance directa en código | Viola §2.2 invariante I-7 | Leer de `_config` |
| `aiLogic` para fase `play` | Pertenece solo a `deployment` | `AiGameplayManager` |

---

## 10. Riesgos y Decisiones Abiertas

### 10.1 Riesgos activos

| ID | Descripción | Probabilidad | Impacto | Mitigación | Owner | Fecha límite |
|---|---|---|---|---|---|---|
| R-01 | `a.js` o `b.js` contienen funciones no equivalentes en `AiGameplayManager` que se descubren tarde | Media | Alto | Auditoría explícita como tarea F4-1/F4-2 antes de borrar | Dev encargado de Fase 4 | Antes de iniciar F4 |
| R-02 | `ia_config.json` no está disponible en entorno de desarrollo (CORS, path incorrecto) | Baja | Alto | Implementar fallback que lanza error explícito, nunca silencioso | Dev Fase 1 | En F1-2 |
| R-03 | Las métricas de `distancia` son costosas de calcular para boards grandes (8 jugadores) | Media | Medio | Cachear distancias por turno en `_lastNodeList`; recalcular solo si la posición cambia | Dev Fase 1 | En F1-4 |
| R-04 | Tutorial depende de etiquetas de `razon_texto` que pueden cambiar si se refactorizan nodos | Baja | Medio | `razon_texto` está en el nodo (datos), no en código; cambio es seguro si se actualiza config | Diseño | Apertura |
| R-05 | La recarga de config en vivo puede romper una partida en curso si los pesos cambian drásticamente | Baja | Alto | `cargarConfigIA()` solo se llama al inicio de partida salvo invocación explícita desde debug | Dev Fase 1 | En F1-2 |
| R-06 | Partidas multijugador: ambos clientes deben usar la misma `ia_config.json` | Media | Alto | Incluir `ia_config.json` en el payload de serialización de `NetworkManager._prepararEstadoParaNube()` | Dev Fase 2 | Antes de pruebas multijugador |
| R-07 | La IA puede producir un Colono y perderlo antes de fundar la Aldea si hay amenaza no detectada | Media | Medio | Regla §11.2: no producir Colono con amenaza Nivel 0 activa. Colono tiene misión de evasión si aparece enemigo en ruta | Dev Fase 2 | En F2-1 |
| R-08 | Sin artillería, la IA ataca Fortalezas mal defendidas que podía ocupar, o veta ataques légitimos por ratio alto | Baja | Medio | Implementar lógica de 3 pasos en `divisionPuedeAtacarObjetivo()` (§12.4). Tests T-10a/b/c cubren los 3 casos. | Dev Fase 2 | En F2-2 |
| R-09 | Tropas embarcadas en Patache cuentan como "unidad en movimiento" para `hasMoved`; la IA puede bloquear el desembarco | Baja | Medio | `IAArchipielago` ya maneja esto con `buildAutomaticSplitPlan()`. No cambiar esa lógica hasta v2.0 | Dev Fase 3 | Antes de F3-1 |

### 10.2 Gobernanza de cambios de decisión

Una decisión se cierra cuando:

1. El owner redacta la resolución en este documento bajo el campo "Decisión actual".
2. Se actualiza `ia_config.json` si la resolución afecta al schema.
3. Se añade o modifica el test de aceptación correspondiente en §8.

Todo cambio de decisión debe tener owner asignado.

---


---

## 11. Mecánica de Colonos y Fundación de Aldeas

### 11.1 Por qué la IA debe fundar Aldeas

Una Aldea proporciona:
- Punto de producción adicional desvinculado de la capital.
- Aumento de conectividad para rutas comerciales.
- Posición defensiva avanzada y núcleo de expansión territorial.

Fundar Aldeas es una extensión natural de la economía de red (red → Banca → caravanas → Aldeas → nuevas rutas). Sin ella, la IA queda bloqueada en un solo núcleo productivo.

### 11.2 Cuándo la IA debe producir un Colono

Condiciones que deben cumplirse **todas**:

| Condición | Valor mínimo |
|---|---|
| `oro >= config.umbrales.coste_colono_minimo` | (default: 1600 — costo de producción del Colono) |
| Ninguna amenaza de Nivel 0 activa | — |
| El jugador tiene ≥ 1 ruta comercial activa a Banca | existeRutaActivaABanca() === true |
| Existe al menos un `sitio_aldea` con `calcularPesoNodo() > config.umbrales.sitio_aldea_minimo` | (default: 80) |
| No existe ya una unidad Colono en movimiento hacia ese sitio | `unit.regiments.some(r => r.type === 'Colono')` |

La producción del Colono tiene prioridad igual a `ciudad_propia_desconectada` en la jerarquía. No compite con supervivencia ni economía crítica.

### 11.3 Cómo identificar un `sitio_aldea`

```javascript
function detectarSitiosAldea(playerNumber, config) {
  // Un sitio es válido si:
  // 1. Es hexágono propio (owner === playerNumber) o adyacente a territorio propio
  // 2. No tiene estructura actualmente (hex.structure === null)
  // 3. El terreno es construible para Aldea (STRUCTURE_TYPES['Aldea'].buildableOn)
  // 4. La distancia a la capital supera un mínimo (evitar apilar estructuras)
  // 5. Conectividad esperada tras fundar: ≥ 1 ciudad propia a distancia ≤ 8
  const buildableTerrains = STRUCTURE_TYPES['Aldea']?.buildableOn || [];
  const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
  return board.flat().filter(hex => {
    if (!hex || hex.structure) return false;
    if (buildableTerrains.length && !buildableTerrains.includes(hex.terrain)) return false;
    if (hex.owner !== playerNumber) return false; // Solo en territorio propio
    const distCapital = capital ? hexDistance(hex.r, hex.c, capital.r, capital.c) : 0;
    if (distCapital < 3) return false; // No fundar pegado a la capital
    return true;
  }).map(hex => ({
    ...crearNodoValor('sitio_aldea', hex.r, hex.c, playerNumber, config),
    razon_texto: `Sitio candidato para Aldea en (${hex.r},${hex.c})`
  }));
}
```

### 11.4 Flujo de acción con Colono

```
1. Identificar sitio_aldea de mayor peso (detectarSitiosAldea → calcularPesoNodo).
2. Producir unidad Colono en la ciudad con `Fortaleza Amurallada` asociada al `sitio_aldea` objetivo.
  Validar antes que, tras construir la `Fortaleza Amurallada`, permanecen recursos suficientes para producir y emplear el Colono.
3. Asignar misión AXIS_ADVANCE con objetivo = sitio_aldea al Colono.
4. En cada turno: Colono se mueve hacia el sitio. Motor NO reasigna el Colono a otra misión.
5. Cuando Colono está en el sitio: emitir acción `fundar_aldea` vía handleConfirmBuildStructure con structureType='Aldea'.
6. Log: [IA-MOTOR] ACCION:fundar_aldea NODO:sitio_aldea RAZON:"Expandir red económica"
```

### 11.5 Claves de configuración adicionales en `ia_config.json`

```json
"umbrales": {
  "coste_colono_minimo": 1600,
  "sitio_aldea_minimo": 80
}
```

Añadir estas dos claves al schema §5.2 en el objeto `umbrales`.

---

## 12. Matriz de Efectividad en Combate

### 12.1 Por qué importa para la IA

La suma bruta de regimientos (`poderNuestro / poderEnemigo`) ya se usa en `IAArchipielago._evaluarYActuarContraEnemigoAislado()`. Sin embargo, la composición importa: artillería es necesaria para asediar una Fortaleza, la caballería es vulnerable a arqueros, y los exploradores no deben atacar unidades pesadas. La IA no debe mandar artillería a campo abierto ni infantería pesada a asaltar posiciones donde caballería ligera llega primero.

### 12.2 Tabla de referencia canónica

Esta tabla describe las ventajas **relativas** en combate. No reemplaza `simulateBattle()` — ese sistema ya maneja el cálculo real. Esta tabla guía la **selección de misión** de la IA (qué unidad mando contra qué objetivo).

| Tipo de regimiento | Fuerte contra | Débil contra | Requiere para asedio | Notas IA |
|---|---|---|---|---|
| Infantería Pesada | Infantería Ligera, Caballería Ligera | Artillería | No | Unidad de línea por defecto |
| Infantería Ligera | Explorador, Pueblo | Infantería Pesada, Caballería Pesada | No | Expansión territorial, economía |
| Caballería Pesada | Infantería Pesada, Arqueros | Artillería, terreno bosque/montaña | No | Flanqueo y ruptura de línea |
| Caballería Ligera | Colono, Caravana, Camino | Arqueros a Caballo, Infantería Pesada | No | Sabotaje y raid económico |
| Arqueros | Caballería Ligera, Infantería Ligera | Caballería Pesada (cuerpo a cuerpo) | No | Defensa de posición elevada |
| Arqueros a Caballo | Caballería Ligera, Infantería Ligera | Caballería Pesada | No | Hostigamiento y kiting |
| Artillería | Fortaleza, Fortaleza Amurallada | Caballería Ligera (flanqueo) | **Sí, para fuertes** | Sin artillería no asediar fortalezas |
| Ingeniero | — | Todo (no combate) | **Sí, para abrir brechas** | Producir para asediar |
| Colono | — | Todo (no combate) | No | Solo fundar Aldeas; proteger |
| Pueblo | — | Todo (solo defiende) | No | No mover fuera de territorio propio |
| Patache | Caravana enemiga, Patache | Barco de Guerra | No (naval) | Transporte y control de costas |
| Barco de Guerra | Patache, flota enemiga | — | No (naval) | Combate naval y bombardeo |

### 12.3 Reglas de composición para la IA

La IA **no debe** asignar una misión de ataque a una unidad si se cumple alguna de estas reglas de veto:

| Regla | Condición de veto |
|---|---|
| R-C1 | Objetivo es `Fortaleza` o `Fortaleza Amurallada` y la división **no tiene** `Artillería` ni `Ingeniero` **y** la fortaleza está defendida **y** el ratio de poder no es dominante. Ver lógica de 3 pasos en §12.4. |
| R-C2 | Objetivo es unidad naval y la división no tiene regimientos `is_naval === true` |
| R-C3 | División es solo `Colono` o `Pueblo` — no puede recibir misión de ataque |
| R-C4 | División tiene `Artillería` y no hay infantería de escolta (≥ 1 regimiento no-artillería) — artillería sin escolta no avanza sola |

### 12.4 Función de evaluación de composición

```javascript
/**
 * Devuelve true si la división puede atacar el objetivo dado.
 * @param {object} unit    — división del jugador IA
 * @param {object} objetivo — NodoValor con tipo y posibles estructuras
 * @param {object} config  — AiGameplayManager._config
 */
function divisionPuedeAtacarObjetivo(unit, objetivo, config) {
  const tipos = unit.regiments.map(r => r.type);
  const hexData = board[objetivo.r]?.[objetivo.c];
  const estructura = hexData?.structure;

  // R-C1: fortaleza — evaluación en 3 pasos
  if (estructura === 'Fortaleza' || estructura === 'Fortaleza con Muralla') {
    const tieneAsedio = tipos.some(t => t === 'Artillería' || t === 'Ingeniero');
    if (!tieneAsedio) {
      // Paso 1: ¿está desguarnecida? Si no hay unidad enemiga en el hexágono, ocupar es válido.
      const unidadDefensora = units.find(
        u => u.r === objetivo.r && u.c === objetivo.c && u.player !== unit.player
      );
      if (!unidadDefensora) return true; // Fortaleza vacía: ocupar siempre es correcto

      // Paso 2: ¿el atacante tiene ratio de poder dominante?
      const poderAtacante = unit.regiments.reduce((s, r) => s + (REGIMENT_TYPES[r.type]?.attack ?? 10), 0);
      const poderDefensor = unidadDefensora.regiments.reduce((s, r) => s + (REGIMENT_TYPES[r.type]?.defense ?? 10), 0);
      const umbral = config.umbrales?.ratio_asedio_sin_artilleria ?? 2.5;
      if (poderAtacante / poderDefensor >= umbral) {
        // Paso 3: ¿es una posición estratégica que vale la pérdida?
        // Solo forzar si el peso del nodo supera el umbral ofensivo.
        return objetivo.peso >= (config.umbrales?.ataque_ofensivo ?? 1000);
      }
      // Ni desguarnecida ni ratio dominante → veto
      return false;
    }
  }

  // R-C2: naval
  const objetivoNaval = objetivo.tipo === 'sitio_desembarco' ||
    (hexData?.terrain === 'water');
  if (objetivoNaval && !tipos.some(t => REGIMENT_TYPES[t]?.is_naval)) return false;

  // R-C3: no combatientes
  if (tipos.every(t => REGIMENT_TYPES[t]?.isSettler || REGIMENT_TYPES[t]?.isVillager)) return false;

  // R-C4: artillería sin escolta
  if (tipos.some(t => t === 'Artillería') && tipos.filter(t => t !== 'Artillería').length === 0) return false;

  return true;
}
```

**Los 3 pasos de R-C1 en lenguaje natural:**
1. **¿Está desguarnecida?** → Sí: ocupar siempre (no importa si hay artillería o no). La fortaleza vacía es solo una estructura.
2. **¿Ratio de poder ≥ `ratio_asedio_sin_artilleria` (default 2.5)?** → Sí: continuar al paso 3.
3. **¿El peso del nodo supera `ataque_ofensivo`?** → Sí: atacar aunque cueste bajas (posición estratégica que compensa). No: veto.

Cuando el veto se activa, el motor debe produce `Artillería` o `Ingeniero` antes de reintentar la misión de asedio.

### 12.5 Integración con el flujo de misiones

En la Fase C del motor (§2.3), antes de asignar una misión de tipo `atacar` a una unidad, llamar `divisionPuedeAtacarObjetivo(unit, nodo)`. Si devuelve false:
1. Buscar el siguiente nodo en la lista ordenada por peso.
2. Si el nodo de ataque es la prioridad más alta, la IA debe primero producir los regimientos necesarios (artillería, ingeniero) antes de asignar la misión de asedio.

---

## 13. Operaciones Navales (Transporte y Desembarco)

### 13.1 Alcance en v1.0

El subsistema naval está implementado y en producción en `IAArchipielago`. Esta sección **formaliza** las reglas que ya funcionan para que sean trasladables a la capa de nodos en versiones futuras, y define qué contratos no deben romperse.

> **Ampliación v1.1**: Las operaciones navales **no son exclusivas de mapas de archipiélago**. En cualquier mapa con hexes de agua entre territorios, un desembarco flanqueante puede romper la lógica defensiva esperada por el oponente (paso estrecho bloqueado → desembarco en el otro lado). El motor debe evaluar nodos `sitio_desembarco` en todos los mapas donde existan hexes de agua navegables, independientemente de `navalMap`.

### 13.2 Cuándo la IA construye unidades navales

`IAArchipielago._ensureNavalPresence(myPlayer, economia)` ya implementa este criterio. El contrato que no puede cambiar:

| Condición | Acción |
|---|---|
| `gameState.setupTempSettings.navalMap === true` | Activar lógica naval completa (`IAArchipielago`) |
| Mapa **no naval** pero existen hexes de agua y objetivo estratégico al otro lado | Evaluar nodos `sitio_desembarco`; producir Patache si necesario para flanqueo sorpresa |
| Tecnología `NAVIGATION` no investigada | Investigar antes de producir |
| `navalUnits.length === 0` | Producir Patache mínimo |
| Enemigo tiene flota activa y yo no | Producir Barco de Guerra |
| Objetivo está en isla separada y no tengo transporte | Producir Patache con capacidad de transporte |

### 13.3 Ciclo de transporte anfibio

```
1. DETECTAR objetivo en isla separada (hexes de agua entre mi capital y el objetivo).
2. EVALUAR: ¿Tengo Patache con capacidad de transporte disponible?
   → Si NO: producir Patache. Asignar misión producir_naval.
3. EMBARQUE: cuando unidad terrestre adyacente al Patache:
   → Asignar misión embarcar: _requestMoveUnit(unidad_terrestre, patache.r, patache.c)
   → El juego detecta fusión naval+tierra y crea unidad mixta automáticamente.
4. TRAVESÍA: el Patache (con tropas embarcadas) navega hacia sitio_desembarco.
   → La IA evalúa el sitio con calcularPesoNodo(nodo sitio_desembarco).
5. DESEMBARCO: cuando Patache está adjacente a tierra enemiga/neutral:
   → Activar `buildAutomaticSplitPlan(unit)` — split naval/terrestre automático.
   → Las tropas desembarcan. Log ACCION:desembarcar.
6. ATAQUE: las tropas terrestres desembarcadas actúan normalmente.
```

### 13.4 Función de detección de islas separadas

```javascript
/**
 * Devuelve true si el objetivo está en una isla que no conecta con el territorio propio por tierra.
 */
function objetivoEnIslaSeperada(playerNumber, objetivoR, objetivoC) {
  const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
  if (!capital) return false;
  // BFS terrestre desde capital
  const visited = new Set();
  const queue = [{ r: capital.r, c: capital.c }];
  while (queue.length) {
    const curr = queue.shift();
    const key = `${curr.r},${curr.c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (curr.r === objetivoR && curr.c === objetivoC) return false; // conectados por tierra
    for (const n of getHexNeighbors(curr.r, curr.c)) {
      if (!visited.has(`${n.r},${n.c}`) && board[n.r]?.[n.c]?.terrain !== 'water') {
        queue.push(n);
      }
    }
  }
  return true; // no se alcanzó por tierra → isla separada
}
```

### 13.5 Nodo `sitio_desembarco` — cómo se calcula su peso

Atributos adicionales específicos de este nodo:

| Campo | Cómo se calcula |
|---|---|
| `valor_control` | 80 si el hexágono es costero de isla enemiga; 50 si neutro |
| `riesgo` | 0.8 si hay unidad enemiga adyacente; 0.2 si hexágono vacío |
| `conectividad` | Número de rutas navales alternativas al mismo destino |
| `distancia` | Hexágonos de agua desde el Patache más cercano |

### 13.6 Lo que NO cambia en v1.0

- `IAArchipielago._ensureNavalPresence()` — interfaz intacta.
- `IAArchipielago._pressEnemyHomeIsland()` — interfaz intacta.
- `buildAutomaticSplitPlan()` en `unit_Actions.js` — lógica de desembarco intacta.
- `getNavalTransportCapacity()` en `unit_Actions.js` — cálculo de capacidad intacto.

La capa de nodos en esta sección es un **mapa conceptual** de lo que ya ocurre, no una reescritura. La reescritura es trabajo de v2.0.

---

---

## 14. Sprint Técnico v1.0

**Objetivo**: entregar Fase 1 + Fase 2 del motor unificado con no-regresión garantizada y tests T-01…T-11 en verde.  
**Duración**: 10 días hábiles.  
**Criterio de cierre del sprint**: T-01 a T-07 + T-10a/b/c + T-11 en verde. Sin regresión en partida IA vs IA de referencia. Logs `[IA-MOTOR]` presentes en todas las decisiones. Sin cambios destructivos al flujo naval existente.

---

### 14.1 Backlog priorizado por archivo

#### `ia_config.json` — CREAR

| # | Tarea | DoD |
|---|---|---|
| 1 | Crear archivo con estructura y valores base (§5.3) | Archivo existe y pasa validación de schema §5.2 |
| 2 | Incluir nodos extendidos: `sitio_aldea`, `sitio_desembarco`, `fortaleza_a_construir`, `ciudad_barbara` | Nodos presentes con todos los campos requeridos |
| 3 | Incluir umbral `ratio_asedio_sin_artilleria` en `umbrales` | Valor presente y leído por `divisionPuedeAtacarObjetivo()` |
| 4 | Incluir umbrales de colono: `coste_colono_minimo`, `sitio_aldea_minimo` | Valores presentes y leídos por lógica de §11 |

#### `ai_gameplayLogic.js` — MODIFICAR

| # | Tarea | DoD | Test |
|---|---|---|---|
| 5 | Implementar `cargarConfigIA()` con error explícito si falta archivo | Error claro en consola; nunca fallback silencioso | T-01 |
| 6 | Cachear config en `AiGameplayManager._config` | `executeTurn()` lee `_config` sin excepción | T-01 |
| 7 | Implementar factory/estructura `NodoValor` con todos los campos de §4 | Instancia válida creada para cualquier tipo de nodo | — |
| 8 | Implementar `calcularPesoNodo(nodo, estado, config)` | Resultado numérico ≥ 0, consistente con fórmula §2.4 | T-02 |
| 9 | Implementar `detectarNodosDeValor(playerNumber, estado, config)` | Lista no vacía en cualquier estado de juego válido; escrita en `_lastNodeList` | T-02 |
| 10 | Integrar jerarquía de niveles 0..4 antes del plan normal | Niveles 0/1 suspenden niveles inferiores correctamente | T-03 |
| 11 | Implementar `esCiudadNatalAmenazada(playerNumber)` | Devuelve true/false correcto según board[][] | T-03 |
| 12 | Implementar crisis económica nivel 2 | Misión prioriza banca/camino crítico cuando `oro < umbral` | T-04 |
| 13 | Implementar sabotaje nivel 3 con `encontrarEslabonRompible()` | Unidad se mueve hacia eslabón identificado | T-05 |
| 14 | Implementar regla de no-ataque prematuro (§3.4) | No avanza a ciudad enemiga bajo condiciones de veto | T-06 |
| 15 | Asegurar logging obligatorio `[IA-MOTOR]` en cada decisión | Todos los logs tienen los 6 campos de §7.2 | T-07 |
| 16 | Escribir `_lastDecisionLog` por turno | Accesible desde debug console | T-07 |
| 17 | Implementar `divisionPuedeAtacarObjetivo()` con R-C1 de 3 pasos (§12.4) | T-10a/b/c pasan de forma determinista | T-10a/b/c |

#### `unit_Actions.js` — VERIFICAR (no reescribir)

| # | Tarea | DoD |
|---|---|---|
| 18 | Verificar compatibilidad de `buildAutomaticSplitPlan()` con llamadas del motor | Sin errores en secuencia embarque-travesía-desembarco |
| 19 | Verificar compatibilidad de `getNavalTransportCapacity()` con llamadas del motor | Capacidad de transporte correcta en prueba T-11 |

#### `networkManager.js` — MODIFICAR

| # | Tarea | DoD |
|---|---|---|
| 20 | Añadir versión/hash de `ia_config.json` en payload de `_prepararEstadoParaNube()` | Mismatch de config detectado antes de sincronizar turno |

#### `chronicle.js` / `chronicleIntegration.js` — MODIFICAR

| # | Tarea | DoD |
|---|---|---|
| 21 | Emitir evento `ia_decision` para nivel 0 y nivel 1 con `razon_texto` | Evento aparece en crónica de partida en los turnos de emergencia |

---

### 14.2 Plan de ejecución día a día

| Días | Tareas | Tests que se validan |
|---|---|---|
| 1–2 | Tareas 1–4 (config) + Tareas 5–6 (carga y cache) | T-01 |
| 3–4 | Tareas 7–9 (NodoValor + detección) | T-02 |
| 5–6 | Tareas 10–13 (jerarquía + crisis + sabotaje) | T-03, T-04, T-05 |
| 7 | Tarea 14 (no-ataque) + Tareas 15–16 (logging) | T-06, T-07 |
| 8 | Tarea 17 (R-C1 completo) | T-10a, T-10b, T-10c |
| 9 | Tareas 18–21 (naval, multijugador, crónica) | T-11, smoke test multijugador |
| 10 | Corrida completa T-01…T-11 + hardening + cierre de sprint | Todos |

---

### 14.3 Riesgos del sprint y mitigación

| Riesgo | Mitigación |
|---|---|
| Config inconsistente entre clientes | Abortar con error explícito; no empezar turno IA sin config válida |
| Coste de cálculo en tableros 8J | Cache `distanceCache` por turno; clave `turn-player-r-c` |
| Falsos positivos/negativos en asedio | T-10a/b/c deben pasar antes de merge a main |
| Regresión naval | No tocar internals de `IAArchipielago` en v1.0 |

---

*Fin del documento. Versión 1.0 — Cerrado para implementación el 2026-03-25.*
*Versión 1.1 — Revisión 2026-03-26: §0 No-regresión, §1 IAArchipielago, §11 Colonos/Aldeas, §12 Combate, §13 Naval.*  
*Versión 1.2 — Revisión 2026-03-26: §0 naval en todos los mapas/conquista bárbara deficiente; §3.3 nuevos nodos en desempate; §4/§5 nodos fortaleza_a_construir y ciudad_barbara; §12 R-C1 lógica de 3 pasos; T-10 dividido en T-10a/b/c.*  
*Versión 1.3 — Revisión 2026-03-26: §10.1 R-01 eliminado, R-05 y R-07 reformulados; §10.2 decisiones cerradas eliminadas e integradas en documento; §14 Sprint Técnico v1.0 añadido.*
