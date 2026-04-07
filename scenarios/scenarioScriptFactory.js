// scenarios/scenarioScriptFactory.js
// DSL simple para crear mapas + escenarios de forma rápida y legible.
console.log("scenarioScriptFactory.js CARGADO");

(function () {
    if (typeof window === 'undefined') return;

    const DEFAULT_PLAYER_RESOURCES = { oro: 600, comida: 300, madera: 120, piedra: 80, hierro: 60 };
    const DEFAULT_ENEMY_RESOURCES = { oro: 600, comida: 300, madera: 120, piedra: 80, hierro: 60 };

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function ensureRegistry() {
        if (typeof GAME_DATA_REGISTRY === 'undefined') {
            throw new Error('GAME_DATA_REGISTRY no esta definido. Carga state.js antes de scenarioScriptFactory.js');
        }
        if (!GAME_DATA_REGISTRY.maps) GAME_DATA_REGISTRY.maps = {};
        if (!GAME_DATA_REGISTRY.scenarios) GAME_DATA_REGISTRY.scenarios = {};
    }

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    function isInt(n) {
        return Number.isInteger(n);
    }

    function validateHex(rows, cols, hex, label) {
        assert(hex && isInt(hex.r) && isInt(hex.c), `${label}: coordenadas invalidas`);
        assert(hex.r >= 0 && hex.r < rows, `${label}: r fuera de rango (${hex.r})`);
        assert(hex.c >= 0 && hex.c < cols, `${label}: c fuera de rango (${hex.c})`);
    }

    function getValidTerrains() {
        if (typeof TERRAIN_TYPES !== 'undefined' && TERRAIN_TYPES && typeof TERRAIN_TYPES === 'object') {
            return new Set(Object.keys(TERRAIN_TYPES));
        }
        return new Set(['plains', 'forest', 'hills', 'water']);
    }

    function getValidStructures() {
        if (typeof STRUCTURE_DEFINITIONS !== 'undefined' && STRUCTURE_DEFINITIONS && typeof STRUCTURE_DEFINITIONS === 'object') {
            return new Set(Object.keys(STRUCTURE_DEFINITIONS));
        }
        return new Set(['Camino', 'Fortaleza', 'Aldea', 'Ciudad', 'Metrópoli', 'Atalaya']);
    }

    function isValidCityOwner(owner) {
        if (owner === null || owner === undefined) return true;
        if (['player', 'enemy', 'neutral', 'bank', 'barbarian'].includes(owner)) return true;
        if (isInt(Number(owner))) return true;
        return false;
    }

    function normalizeSpecificHexes(rows, cols, mapDef) {
        const specificHexes = [];
        const validTerrains = getValidTerrains();
        const validStructures = getValidStructures();

        (mapDef.terrains || []).forEach((h, idx) => {
            validateHex(rows, cols, h, `map.terrains[${idx}]`);
            const terrain = h.terrain || 'plains';
            assert(validTerrains.has(terrain), `map.terrains[${idx}]: terreno no valido (${terrain})`);
            specificHexes.push({ r: h.r, c: h.c, terrain });
        });

        (mapDef.structures || []).forEach((h, idx) => {
            validateHex(rows, cols, h, `map.structures[${idx}]`);
            const terrain = h.terrain || mapDef.defaultTerrain || 'plains';
            assert(validTerrains.has(terrain), `map.structures[${idx}]: terreno no valido (${terrain})`);
            assert(typeof h.structure === 'string' && h.structure.trim(), `map.structures[${idx}]: structure es obligatorio`);
            assert(validStructures.has(h.structure), `map.structures[${idx}]: estructura no valida (${h.structure})`);
            specificHexes.push({ r: h.r, c: h.c, terrain, structure: h.structure });
        });

        return specificHexes;
    }

    function expandRegimentsFromUnitDef(unit, label) {
        const validRegimentTypes = typeof REGIMENT_TYPES !== 'undefined' ? new Set(Object.keys(REGIMENT_TYPES)) : null;

        // A) Lista explicita
        if (Array.isArray(unit.regiments) && unit.regiments.length > 0) {
            return unit.regiments.map((reg, idx) => {
                const type = typeof reg === 'string' ? reg : reg?.type;
                assert(typeof type === 'string' && type.trim(), `${label}.regiments[${idx}]: type invalido`);
                if (validRegimentTypes) assert(validRegimentTypes.has(type), `${label}.regiments[${idx}]: tipo no existe (${type})`);
                return reg;
            });
        }

        // B) Composición compacta por conteo
        if (unit.regimentComposition && typeof unit.regimentComposition === 'object') {
            const expanded = [];
            Object.entries(unit.regimentComposition).forEach(([type, count]) => {
                const safeCount = Math.max(0, parseInt(count, 10) || 0);
                if (validRegimentTypes) assert(validRegimentTypes.has(type), `${label}.regimentComposition: tipo no existe (${type})`);
                for (let i = 0; i < safeCount; i++) expanded.push(type);
            });
            if (expanded.length > 0) return expanded;
        }

        // C) type + regimentCount
        if (unit.type && Number.isInteger(unit.regimentCount) && unit.regimentCount > 1) {
            if (validRegimentTypes) assert(validRegimentTypes.has(unit.type), `${label}: tipo no existe (${unit.type})`);
            return Array(unit.regimentCount).fill(unit.type);
        }

        // D) fallback histórico (1 regimiento)
        assert(typeof unit.type === 'string' && unit.type.trim(), `${label}: se requiere type o regiments/regimentComposition`);
        if (validRegimentTypes) assert(validRegimentTypes.has(unit.type), `${label}: tipo no existe (${unit.type})`);
        return [unit.type];
    }

    function normalizeUnits(rows, cols, units, label) {
        return (units || []).map((u, idx) => {
            validateHex(rows, cols, u, `${label}[${idx}]`);
            const regiments = expandRegimentsFromUnitDef(u, `${label}[${idx}]`);
            assert(regiments.length > 0, `${label}[${idx}]: unidad sin regimientos`);
            assert(regiments.length <= 20, `${label}[${idx}]: maximo 20 regimientos por division`);

            const primaryType = typeof regiments[0] === 'string' ? regiments[0] : regiments[0].type;
            return {
                type: primaryType,
                r: u.r,
                c: u.c,
                name: u.name || primaryType,
                regiments
            };
        });
    }

    const ScenarioScriptFactory = {
        register(definition) {
            ensureRegistry();
            assert(definition && typeof definition === 'object', 'definition es obligatorio');

            const mapDef = definition.map || {};
            const meta = definition.meta || {};
            const setup = definition.setup || {};
            const rules = definition.rules || {};

            const rows = mapDef.rows;
            const cols = mapDef.cols;
            assert(isInt(rows) && rows > 0, 'map.rows debe ser un entero positivo');
            assert(isInt(cols) && cols > 0, 'map.cols debe ser un entero positivo');

            const mapKey = definition.mapKey || mapDef.registryKey || mapDef.mapId;
            const scenarioKey = definition.scenarioKey || meta.scenarioId;

            assert(typeof mapKey === 'string' && mapKey.trim(), 'mapKey es obligatorio');
            assert(typeof scenarioKey === 'string' && scenarioKey.trim(), 'scenarioKey es obligatorio');

            if (mapDef.playerCapital) validateHex(rows, cols, mapDef.playerCapital, 'map.playerCapital');
            if (mapDef.enemyCapital) validateHex(rows, cols, mapDef.enemyCapital, 'map.enemyCapital');

            const cities = (mapDef.cities || []).map((city, idx) => {
                validateHex(rows, cols, city, `map.cities[${idx}]`);
                assert(isValidCityOwner(city.owner), `map.cities[${idx}]: owner no valido (${city.owner})`);
                return {
                    r: city.r,
                    c: city.c,
                    name: city.name || `Ciudad ${idx + 1}`,
                    owner: city.owner ?? 'neutral'
                };
            });

            const resourceNodes = (mapDef.resourceNodes || []).map((node, idx) => {
                validateHex(rows, cols, node, `map.resourceNodes[${idx}]`);
                assert(typeof node.type === 'string' && node.type.trim(), `map.resourceNodes[${idx}]: type es obligatorio`);
                return { r: node.r, c: node.c, type: node.type };
            });

            const playerUnits = normalizeUnits(rows, cols, setup.playerUnits, 'setup.playerUnits');
            const enemyUnits = normalizeUnits(rows, cols, setup.enemyUnits, 'setup.enemyUnits');

            const mapData = {
                mapId: mapDef.mapId || mapKey,
                displayName: mapDef.displayName || meta.displayName || scenarioKey,
                rows,
                cols,
                hexesConfig: {
                    defaultTerrain: mapDef.defaultTerrain || 'plains',
                    specificHexes: normalizeSpecificHexes(rows, cols, mapDef)
                },
                playerCapital: mapDef.playerCapital || { r: rows - 2, c: 1, name: 'Capital Jugador' },
                enemyCapital: mapDef.enemyCapital || { r: 1, c: cols - 2, name: 'Capital Enemiga' },
                cities,
                resourceNodes,
                ambientSound: mapDef.ambientSound || ''
            };

            const scenarioData = {
                scenarioId: meta.scenarioId || scenarioKey,
                displayName: meta.displayName || scenarioKey,
                description: meta.description || '',
                briefingImage: meta.briefingImage || '',
                mapFile: mapKey,
                meta: {
                    historicalTitle: meta.historicalTitle || '',
                    historicalPeriod: meta.historicalPeriod || '',
                    historicalDate: meta.historicalDate || '',
                    historicalLocation: meta.historicalLocation || '',
                    historicalSides: meta.historicalSides || '',
                    historicalContext: meta.historicalContext || '',
                    historicalObjectives: meta.historicalObjectives || '',
                    historicalSources: meta.historicalSources || ''
                },
                playerSetup: {
                    initialResources: clone(setup.playerResources || DEFAULT_PLAYER_RESOURCES),
                    initialUnits: playerUnits,
                    startHexes: setup.playerStartHexes || []
                },
                enemySetup: {
                    ownerId: setup.enemyOwnerId || 'ai_1',
                    initialResources: clone(setup.enemyResources || DEFAULT_ENEMY_RESOURCES),
                    initialUnits: enemyUnits,
                    startHexes: setup.enemyStartHexes || [],
                    aiProfile: setup.enemyAiProfile || 'ai_normal'
                },
                victoryConditions: rules.victoryConditions || [{ type: 'eliminate_all_enemies' }],
                lossConditions: rules.lossConditions || [{ type: 'player_capital_lost' }],
                resourceLevelOverride: rules.resourceLevelOverride || 'med'
            };

            GAME_DATA_REGISTRY.maps[mapKey] = mapData;
            GAME_DATA_REGISTRY.scenarios[scenarioKey] = scenarioData;

            console.log(`[ScenarioScriptFactory] Registrado: ${scenarioKey} (mapa: ${mapKey})`);
            return { mapKey, scenarioKey, mapData, scenarioData };
        },

        utils: {
            // Genera una franja horizontal de hexes del mismo terreno
            lineH(r, cStart, cEnd, terrain) {
                const out = [];
                const from = Math.min(cStart, cEnd);
                const to = Math.max(cStart, cEnd);
                for (let c = from; c <= to; c++) out.push({ r, c, terrain });
                return out;
            },

            // Genera una franja vertical de hexes del mismo terreno
            lineV(c, rStart, rEnd, terrain) {
                const out = [];
                const from = Math.min(rStart, rEnd);
                const to = Math.max(rStart, rEnd);
                for (let r = from; r <= to; r++) out.push({ r, c, terrain });
                return out;
            },

            // Genera un rectangulo lleno de un terreno
            rect(r1, c1, r2, c2, terrain) {
                const out = [];
                const rFrom = Math.min(r1, r2);
                const rTo = Math.max(r1, r2);
                const cFrom = Math.min(c1, c2);
                const cTo = Math.max(c1, c2);
                for (let r = rFrom; r <= rTo; r++) {
                    for (let c = cFrom; c <= cTo; c++) {
                        out.push({ r, c, terrain });
                    }
                }
                return out;
            }
        }
    };

    window.ScenarioScriptFactory = ScenarioScriptFactory;
})();
