// scenarios/scripted_navas_tolosa_1212.js
// Ejemplo de escenario historico usando ScenarioScriptFactory.

(function () {
    if (typeof ScenarioScriptFactory === 'undefined') {
        console.warn('[scripted_navas_tolosa_1212] ScenarioScriptFactory no disponible.');
        return;
    }

    const U = ScenarioScriptFactory.utils;

    const mountainRidge = [
        ...U.lineH(3, 4, 13, 'mountain'),
        ...U.lineH(4, 5, 12, 'hills'),
        ...U.lineH(5, 6, 11, 'hills')
    ];

    const woods = [
        ...U.rect(7, 2, 9, 4, 'forest'),
        ...U.rect(7, 14, 9, 16, 'forest')
    ];

    const riverArea = [
        ...U.lineV(9, 10, 13, 'water'),
        ...U.lineV(10, 10, 13, 'water')
    ];

    ScenarioScriptFactory.register({
        scenarioKey: 'SCRIPT_NAVAS_TOLOSA_1212_SCENARIO',
        mapKey: 'SCRIPT_NAVAS_TOLOSA_1212_MAP',

        meta: {
            scenarioId: 'SCRIPT_NAVAS_TOLOSA_1212',
            displayName: 'Las Navas de Tolosa (1212) - Guion Base',
            description: 'Escenario base para recrear la batalla de Las Navas de Tolosa. Ajusta despliegue y detalles finos con el editor.',
            historicalTitle: 'Batalla de Las Navas de Tolosa',
            historicalPeriod: 'Reconquista',
            historicalDate: '16 de julio de 1212',
            historicalLocation: 'Sierra Morena, Al-Andalus',
            historicalSides: 'Coalicion cristiana (Castilla, Aragon, Navarra) vs Imperio almohade',
            historicalContext: 'La coalicion cristiana penetro Sierra Morena para forzar una batalla decisiva contra el califato almohade.',
            historicalObjectives: 'Romper la linea central enemiga y capturar el campamento fortificado almohade.',
            historicalSources: 'Cronica Latina de los Reyes de Castilla; estudios modernos de Garcia Fitz y O Callaghan.'
        },

        map: {
            mapId: 'navas_tolosa_1212_map_v1',
            displayName: 'Sierra Morena - Campo de Batalla',
            rows: 16,
            cols: 20,
            defaultTerrain: 'plains',
            terrains: [
                ...mountainRidge,
                ...woods,
                ...riverArea
            ],
            structures: [
                { r: 2, c: 9, structure: 'Fortaleza', terrain: 'hills' },
                { r: 2, c: 10, structure: 'Fortaleza', terrain: 'hills' },
                { r: 12, c: 8, structure: 'Camino', terrain: 'plains' },
                { r: 12, c: 9, structure: 'Camino', terrain: 'plains' },
                { r: 12, c: 10, structure: 'Camino', terrain: 'plains' }
            ],
            playerCapital: { r: 14, c: 9, name: 'Cuartel Cristiano' },
            enemyCapital: { r: 1, c: 9, name: 'Campamento Almohade' },
            cities: [
                { r: 6, c: 5, name: 'Aldea del Paso', owner: 'neutral' },
                { r: 6, c: 14, name: 'Aldea de la Sierra', owner: 'neutral' }
            ],
            resourceNodes: [
                { r: 8, c: 6, type: 'comida' },
                { r: 8, c: 13, type: 'comida' },
                { r: 10, c: 4, type: 'madera' },
                { r: 10, c: 15, type: 'madera' },
                { r: 5, c: 9, type: 'hierro' }
            ]
        },

        setup: {
            enemyAiProfile: 'aggressive_attacker',
            playerResources: { oro: 850, comida: 700, madera: 220, piedra: 140, hierro: 120 },
            enemyResources: { oro: 900, comida: 650, madera: 210, piedra: 180, hierro: 140 },
            playerUnits: [
                { type: 'Infantería Pesada', r: 13, c: 8, name: 'Linea Castellana I' },
                { type: 'Infantería Pesada', r: 13, c: 9, name: 'Linea Castellana II' },
                { type: 'Caballería Ligera', r: 13, c: 10, name: 'Caballeria de Choque' },
                { type: 'Arqueros', r: 12, c: 9, name: 'Arqueros de Vanguardia' }
            ],
            enemyUnits: [
                { type: 'Infantería Pesada', r: 3, c: 8, name: 'Guardia Almohade I' },
                { type: 'Infantería Pesada', r: 3, c: 9, name: 'Guardia Almohade II' },
                { type: 'Infantería Pesada', r: 3, c: 10, name: 'Guardia Almohade III' },
                { type: 'Caballería Ligera', r: 4, c: 9, name: 'Caballeria Bereber' },
                { type: 'Arqueros', r: 4, c: 8, name: 'Hostigadores' }
            ]
        },

        rules: {
            victoryConditions: [
                { type: 'control_hex', r: 2, c: 9 },
                { type: 'control_hex', r: 2, c: 10 }
            ],
            lossConditions: [
                { type: 'player_capital_lost' }
            ],
            resourceLevelOverride: 'med'
        }
    });
})();
