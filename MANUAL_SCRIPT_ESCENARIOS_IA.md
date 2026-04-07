# Manual rapido: crear escenarios con IA mediante script

Este manual esta pensado para pegarlo en otra IA y pedirle un guion base de batalla historica (Navas de Tolosa, Poitiers, etc.).

## 1) Regla principal
Usa `ScenarioScriptFactory.register({...})`.

- Registra el mapa en `GAME_DATA_REGISTRY.maps`.
- Registra el escenario en `GAME_DATA_REGISTRY.scenarios`.
- Ya queda listo para editor/campana (si lo conectas a `worldMapData`).

## 2) Estructura minima

```javascript
ScenarioScriptFactory.register({
  scenarioKey: 'SCRIPT_MI_BATALLA_SCENARIO',
  mapKey: 'SCRIPT_MI_BATALLA_MAP',

  meta: {
    scenarioId: 'SCRIPT_MI_BATALLA',
    displayName: 'Mi Batalla',
    description: 'Resumen tactico',

    historicalTitle: 'Nombre historico',
    historicalPeriod: 'Periodo',
    historicalDate: 'Fecha',
    historicalLocation: 'Lugar',
    historicalSides: 'Bandos',
    historicalContext: 'Contexto',
    historicalObjectives: 'Objetivos',
    historicalSources: 'Fuentes'
  },

  map: {
    mapId: 'mi_batalla_map_v1',
    displayName: 'Mapa de Mi Batalla',
    rows: 16,
    cols: 20,
    defaultTerrain: 'plains',

    terrains: [
      { r: 3, c: 6, terrain: 'hills' },
      { r: 3, c: 7, terrain: 'hills' },
      { r: 10, c: 10, terrain: 'water' }
    ],

    structures: [
      { r: 2, c: 9, structure: 'Fortaleza', terrain: 'hills' },
      { r: 12, c: 9, structure: 'Camino', terrain: 'plains' }
    ],

    playerCapital: { r: 14, c: 9, name: 'Cuartel Jugador' },
    enemyCapital: { r: 1, c: 9, name: 'Cuartel Enemigo' },

    cities: [
      { r: 6, c: 5, name: 'Aldea A', owner: 'neutral' }
    ],

    resourceNodes: [
      { r: 8, c: 6, type: 'comida' },
      { r: 10, c: 4, type: 'madera' }
    ]
  },

  setup: {
    enemyAiProfile: 'ai_normal',
    playerResources: { oro: 800, comida: 600, madera: 200, piedra: 100, hierro: 100 },
    enemyResources: { oro: 800, comida: 600, madera: 200, piedra: 100, hierro: 100 },

    playerUnits: [
      { type: 'Infantería Pesada', r: 13, c: 9, name: 'Linea 1' },
      { type: 'Arqueros', r: 12, c: 9, name: 'Hostigadores' }
    ],

    enemyUnits: [
      { type: 'Infantería Pesada', r: 3, c: 9, name: 'Guardia 1' },
      { type: 'Caballería Ligera', r: 4, c: 9, name: 'Caballeria' }
    ]
  },

  rules: {
    victoryConditions: [{ type: 'eliminate_all_enemies' }],
    lossConditions: [{ type: 'player_capital_lost' }],
    resourceLevelOverride: 'med'
  }
});
```

## 3) Terrenos recomendados
- `plains`, `forest`, `hills`, `mountain`, `water`, `desert`, `swamp`, `beach`.

## 4) Estructuras recomendadas
- `Fortaleza`, `Ciudad`, `Aldea`, `Metrópoli`, `Camino`, `Puerto`, `Atalaya`.

## 4.1) Owners validos para ciudades
En `map.cities[].owner` usa solo estos valores:
- `player`
- `enemy`
- `neutral`

Si usas otro valor, el comportamiento puede ser ambiguo.

## 5) Tipos de unidad
Usa tipos existentes del juego (claves de `REGIMENT_TYPES`), por ejemplo:
- `Infantería Pesada`
- `Infantería Ligera`
- `Caballería Ligera`
- `Arqueros`

Si un tipo no existe, no se podra colocar.

## 5.1) Condiciones de victoria/derrota recomendadas
Para maxima compatibilidad, prioriza estas:

- Victoria:
  - `{ type: 'eliminate_all_enemies' }`
  - `{ type: 'control_hex', r: X, c: Y }`

- Derrota:
  - `{ type: 'player_capital_lost' }`

Nota: puedes combinar varias condiciones de victoria en el array.

## 6) Prompt recomendado para otra IA

```text
Quiero un archivo JavaScript para Iberion usando ScenarioScriptFactory.register.
Objetivo: crear un escenario historico base de [BATALLA].

Requisitos:
1) mapa de [filas]x[columnas]
2) relieve coherente (colinas, bosque, rio si aplica)
3) capitals, ciudades neutrales y recursos
4) despliegue inicial de ambos bandos con unidades realistas
5) metadatos historicos completos (titulo, fecha, bandos, contexto, objetivos, fuentes)
6) condiciones de victoria centradas en la batalla
7) usar claves scenarioKey/mapKey en mayusculas con prefijo SCRIPT_

Devuelve solo el contenido del archivo .js, listo para pegar en /scenarios/.
```

## 7) Flujo de trabajo rapido
1. Pides a la IA un guion base con este manual.
2. Pegas el archivo en `scenarios/`.
3. Añades el `<script src="scenarios/tu_archivo.js"></script>` en `index.html`.
4. Entras al editor y afinas a mano.

## 7.1) Checklist de validacion rapida (antes de pegar)
- `scenarioKey` y `mapKey` son unicos y empiezan por `SCRIPT_`.
- `rows` y `cols` son enteros positivos.
- Todas las coordenadas `r,c` estan dentro del mapa.
- Las unidades usan tipos existentes en `REGIMENT_TYPES`.
- `map.cities[].owner` solo usa `player|enemy|neutral`.
- Hay al menos una condicion de victoria y una de derrota.
- El script llama exactamente a `ScenarioScriptFactory.register(definition)`.

## 8) Ejemplo ya incluido en el repo
- `scenarios/scripted_navas_tolosa_1212.js`
