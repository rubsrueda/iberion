// scenarios/scripted_navas_tolosa_realista.js
// Recreacion historica avanzada de la Batalla de las Navas de Tolosa (1212)

(function () {
    if (typeof ScenarioScriptFactory === 'undefined') {
        console.warn('[navas_tolosa_realista] ScenarioScriptFactory no disponible.');
        return;
    }

    const U = ScenarioScriptFactory.utils;

    // Geografia: Sierra Morena y paso del Puerto del Rey.
    const sierraMorenaNorte = [
        ...U.rect(0, 0, 5, 25, 'hills'),
        ...U.lineH(6, 0, 10, 'hills'),
        ...U.lineH(6, 16, 25, 'hills')
    ];

    const pasoPuertoDelRey = [
        ...U.lineV(12, 1, 5, 'plains'),
        ...U.lineV(11, 6, 8, 'plains')
    ];

    const dehesas = [
        ...U.rect(10, 2, 12, 5, 'forest'),
        ...U.rect(14, 20, 16, 23, 'forest'),
        ...U.rect(8, 18, 10, 21, 'forest')
    ];

    const arroyos = [
        ...U.lineH(18, 5, 20, 'water'),
        { r: 17, c: 10, terrain: 'water' },
        { r: 16, c: 11, terrain: 'water' }
    ];

    ScenarioScriptFactory.register({
        scenarioKey: 'SCRIPT_NAVAS_TOLOSA_ULTIMATE_SCENARIO',
        mapKey: 'SCRIPT_NAVAS_TOLOSA_ULTIMATE_MAP',

        meta: {
            scenarioId: 'SCRIPT_NAVAS_TOLOSA_ULTIMATE',
            displayName: 'Las Navas de Tolosa: El Triunfo de la Cruz',
            description: '1212. Batalla decisiva de la Reconquista. Cruza Sierra Morena y rompe el campamento fortificado de Al-Nasir.',
            historicalTitle: 'Batalla de Las Navas de Tolosa',
            historicalPeriod: 'Edad Media - Siglo XIII',
            historicalDate: '16 de julio de 1212',
            historicalLocation: 'Santa Elena, Jaen (Navas de Tolosa)',
            historicalSides: 'Reinos de Castilla, Aragon y Navarra vs Califato Almohade',
            historicalContext: 'Tras la derrota de Alarcos, la cristiandad se une y cruza por un paso secundario para evitar la emboscada en los desfiladeros.',
            historicalObjectives: '1) Superar la vanguardia bereber. 2) Romper el centro almohade. 3) Capturar el palenque de Al-Nasir.',
            historicalSources: 'Carta de Alfonso VIII al Papa Inocencio III; cronicas de Rodrigo Jimenez de Rada.'
        },

        map: {
            mapId: 'navas_tolosa_realista_v1',
            displayName: 'Navas de Tolosa - El Ferral',
            rows: 22,
            cols: 26,
            defaultTerrain: 'plains',
            terrains: [
                ...sierraMorenaNorte,
                ...pasoPuertoDelRey,
                ...dehesas,
                ...arroyos
            ],
            structures: [
                // Para maxima compatibilidad, se usa Fortaleza (evita fallos en builds antiguas).
                { r: 2, c: 12, structure: 'Fortaleza', terrain: 'hills' },
                { r: 3, c: 12, structure: 'Fortaleza', terrain: 'hills' },
                { r: 7, c: 11, structure: 'Atalaya', terrain: 'hills' },
                { r: 19, c: 13, structure: 'Aldea', terrain: 'plains' }
            ],
            playerCapital: { r: 20, c: 13, name: 'Campamento Cristiano (El Ferral)' },
            enemyCapital: { r: 2, c: 12, name: 'Palenque de Al-Nasir' },
            cities: [
                { r: 11, c: 4, name: 'Banos de la Encina', owner: 'neutral' },
                { r: 8, c: 22, name: 'Vilches', owner: 'enemy' }
            ],
            resourceNodes: [
                { r: 15, c: 13, type: 'comida' },
                { r: 4, c: 18, type: 'hierro' },
                { r: 2, c: 5, type: 'madera' }
            ]
        },

        setup: {
            enemyAiProfile: 'defensive_fortress',
            playerResources: { oro: 1200, comida: 1000, madera: 300, piedra: 100, hierro: 500 },
            enemyResources: { oro: 1500, comida: 1200, madera: 300, piedra: 400, hierro: 400 },

            playerUnits: [
                {
                    r: 18,
                    c: 13,
                    name: 'Vanguardia (Diego Lopez de Haro)',
                    regimentComposition: {
                        'Infantería Pesada': 8,
                        'Infantería Ligera': 6,
                        'Caballería Ligera': 4,
                        'Ingenieros': 2
                    }
                },
                {
                    r: 20,
                    c: 11,
                    name: 'Ala Izquierda (Aragon - Pedro II)',
                    regimentComposition: {
                        'Caballería Pesada': 6,
                        'Infantería Pesada': 7,
                        'Arqueros': 4,
                        'Caballería Ligera': 3
                    }
                },
                {
                    r: 20,
                    c: 15,
                    name: 'Ala Derecha (Navarra - Sancho VII)',
                    regimentComposition: {
                        'Caballería Pesada': 5,
                        'Infantería Pesada': 8,
                        'Infantería Ligera': 5,
                        'Caballería Ligera': 2
                    }
                },
                {
                    r: 21,
                    c: 13,
                    name: 'Retaguardia (Castilla - Alfonso VIII)',
                    regimentComposition: {
                        'Caballería Pesada': 10,
                        'Infantería Pesada': 5,
                        'Cuartel General': 1,
                        'Hospital de Campaña': 2,
                        'Columna de Suministro': 2
                    }
                }
            ],

            enemyUnits: [
                {
                    r: 12,
                    c: 13,
                    name: 'Vanguardia Bereber (Voluntarios)',
                    regimentComposition: {
                        'Infantería Ligera': 15,
                        'Arqueros': 5
                    }
                },
                {
                    r: 8,
                    c: 13,
                    name: 'Linea Central (Tropas Almohades)',
                    regimentComposition: {
                        'Infantería Pesada': 10,
                        'Arqueros a Caballo': 6,
                        'Arqueros': 4
                    }
                },
                {
                    r: 3,
                    c: 12,
                    name: 'La Guardia Negra (Encadenados)',
                    regimentComposition: {
                        'Infantería Pesada': 12,
                        'Arqueros': 6,
                        'Cuartel General': 1,
                        'Artillería': 1
                    }
                },
                {
                    r: 6,
                    c: 18,
                    name: 'Caballeria de Hostigamiento',
                    regimentComposition: {
                        'Caballería Ligera': 10,
                        'Arqueros a Caballo': 8
                    }
                }
            ]
        },

        rules: {
            victoryConditions: [
                { type: 'control_hex', r: 2, c: 12 },
                { type: 'eliminate_all_enemies' }
            ],
            lossConditions: [
                { type: 'player_capital_lost' }
            ],
            resourceLevelOverride: 'high'
        }
    });
})();
