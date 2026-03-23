// constants.js

const BOARD_ROWS = 12;
const BOARD_COLS = 15;
const BOARD_SIZES = {
    'small': { rows: 12, cols: 15 },
    'medium': { rows: 18, cols: 25 },
    'large': { rows: 24, cols: 35 },
    'iberia_magna': { rows: 75, cols: 120 }
};


// --- CONSTANTES DE MISIONES DIARIAS ---
const DAILY_MISSIONS_POOL = [
    { id: 'win_1', desc: "Gana 1 Batalla", target: 1, xp_reward: 300, type: 'match_win' },
    { id: 'kill_10', desc: "Elimina 10 Regimientos Enemigos", target: 10, xp_reward: 200, type: 'unit_kill' },
    { id: 'play_3', desc: "Juega 3 Turnos completos", target: 3, xp_reward: 150, type: 'turn_played' },
    { id: 'forge_1', desc: "Forja un objeto de equipo", target: 1, xp_reward: 500, type: 'forge_item' },
    { id: 'earn_500g', desc: "Gana 500 de Oro en batallas", target: 500, xp_reward: 250, type: 'gold_earned' }
];

// --- CONFIGURACIÓN DE INCURSIÓN (RAID) ---

const RAID_CONFIG = {
    DURATION_PER_STAGE_HOURS: 12,
    MAP_ROWS: 12,
    MAP_COLS: 25,
    CARAVAN_SPEED: 3, // Casillas por hora (aprox, para cubrir 25 en <12h si no hay bloqueos)
    CARAVAN_PATH_ROWS: [4, 5, 6, 7, 8], // Carriles centrales permitidos para la caravana
    ENTRY_COST: 500, // Oro
    
    // Definición de las 4 Etapas
    STAGES: {
        1: { 
            name: "Mar de las Antillas (Cuba -> Cádiz)", 
            type: "naval", 
            mapType: "water", 
            caravan: "Galeón del Tesoro",
            // PARAMETRIZACIÓN DE LA DIVISIÓN:
            regimentType: "Barco de Guerra", 
            regimentCount: 30 // 50 Barcos x 2000 HP = 100k HP reales
        },
        2: { 
            name: "Camino de Andalucía (Cádiz -> Madrid)", 
            type: "land", 
            mapType: "plains", 
            caravan: "Caravana Real",
            // En tierra usamos Caballería
            regimentType: "Caballería Pesada", 
            regimentCount: 30 
        },
        3: { 
            name: "Paso de Aragón (Madrid -> Barcelona)", 
            type: "land", 
            mapType: "hills", 
            caravan: "Caravana Real",
            regimentType: "Caballería Pesada",
            regimentCount: 40 // Más difícil
        },
        4: { 
            name: "Mediterráneo (Barcelona -> Génova)", 
            type: "naval", 
            mapType: "water", 
            caravan: "Galeón del Tesoro",
            regimentType: "Barco de Guerra",
            regimentCount: 40
        }
    }
};

// CONFIGURACIÓN DE MARKETING Y TEMPORADAS para el pase de batalla
const SEASON_CONFIG = {
    ACTIVE_SEASON_KEY: 'SEASON_1', // Cambia esto a 'SEASON_2', 'HALLOWEEN', etc.
    LEVEL_COST_GEMS: 200,          // Precio para comprar 1 nivel
    SEASON_DURATION_DAYS: 28       // Duración estándar (28 días)
};

const HEX_WIDTH = 50;
const HEX_HEIGHT = 57.73; // HEX_WIDTH * sqrt(3) / 2 * 2 (simplificado a HEX_WIDTH * 1.1547)
const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;
const TRADE_INCOME_PER_ROUTE = 50;
const MAX_REGIMENTS_PER_DIVISION = 20;
const GAME_ID_PREFIX = 'hge-';

const TURN_TIME_OPTIONS = {
    'none': { seconds: Infinity, label: 'Sin límite' },
    '90':   { seconds: 90,   label: '90 segundos (Rápido)' },
    '180':  { seconds: 180,  label: '3 minutos (Estándar)' },
    '300':  { seconds: 300,  label: '5 minutos (Relajado)' },
    '600':  { seconds: 600,  label: '10 minutos (Estratégico)' }
};

const REGIMENT_TYPES = {
    // Escala base: Stats y Costos x20. Salud = 200. Tácticos (mov, rango) sin cambios.
//    "Infantería Ligera": { category: "light_infantry", cost: { oro: 200, upkeep: 20 }, attack: 40, defense: 60, health: 200, movement: 2, sprite: '🚶', visionRange: 2, attackRange: 1, initiative: 8, goldValueOnDestroy: 140, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
//    "Infantería Pesada": { category: "heavy_infantry", cost: { oro: 300, upkeep: 40 }, attack: 60, defense: 100, health: 200, movement: 1, sprite: '🛡️', visionRange: 1, attackRange: 1, initiative: 5, goldValueOnDestroy: 220, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },

    "Infantería Ligera": { category: "light_infantry", cost: { oro: 200, upkeep: 20 }, attack: 40, defense: 60, health: 200, movement: 2, sprite: 'images/sprites/Infanteria_128x128.png', visionRange: 2, attackRange: 1, initiative: 8, goldValueOnDestroy: 140, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Infantería Pesada": { category: "heavy_infantry", cost: { oro: 350, upkeep: 40 }, attack: 60, defense: 100, health: 200, movement: 1, sprite:'images/sprites/Legionario.png', visionRange: 1, attackRange: 1, initiative: 5, goldValueOnDestroy: 220, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Caballería Ligera": { category: "light_cavalry", cost: { oro: 400, upkeep: 40 }, attack: 80, defense: 60, health: 200, movement: 4, sprite: 'images/sprites/cab_ligera_128x128.png', visionRange: 3, attackRange: 0, initiative: 15, goldValueOnDestroy: 280, foodConsumption: 2, puntosReclutamiento: 200, abilities: ["Jump"] },
    "Caballería Pesada": { category: "heavy_cavalry", cost: { oro: 600, upkeep: 60 }, attack: 100, defense: 100, health: 200, movement: 3, sprite: 'images/sprites/cab_pesada128.png', visionRange: 2, attackRange: 0, initiative: 12, goldValueOnDestroy: 400, foodConsumption: 2, puntosReclutamiento: 200, abilities: [] }, 
    "Arqueros a Caballo": { category: "light_cavalry", cost: { oro: 720, upkeep: 60 }, attack: 80, defense: 60, health: 200, movement: 4, sprite: 'images/sprites/arquero_caballo128.png', visionRange: 3, attackRange: 2, initiative: 16, goldValueOnDestroy: 480, foodConsumption: 1, puntosReclutamiento: 200, abilities: ["Jump"] },
    "Arqueros": { category: "light_infantry", cost: { oro: 360, upkeep: 20 }, attack: 70, defense: 20, health: 150, movement: 2, sprite: 'images/sprites/archer_128.png', visionRange: 2, attackRange: 2, initiative: 11, goldValueOnDestroy: 240, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },    
    "Arcabuceros": { category: "light_infantry", cost: { oro: 480, upkeep: 40 }, attack: 100, defense: 40, health: 200, movement: 1, sprite: 'images/sprites/arcabucero128.png', visionRange: 2, attackRange: 2, initiative: 11, goldValueOnDestroy: 360, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Artillería": { category: "artillery", cost: { oro: 1000, upkeep: 80 }, attack: 250, defense: 20, health: 150, movement: 1, sprite: 'images/sprites/cannon128.png', visionRange: 1, attackRange: 3, initiative: 20, goldValueOnDestroy: 800, foodConsumption: 2, puntosReclutamiento: 200, abilities: ["Asedio"] },

    // Unidades de Apoyo - Stats ajustados para equilibrio. Ataques bajos se escalan menos.
    "Cuartel General": { category: "support", cost: { oro: 800, upkeep: 100 },
        attack: 10, defense: 40, health: 200, movement: 3,
        sprite:  'images/sprites/cuartel128.png', visionRange: 3, attackRange: 0, initiative: 10,
        goldValueOnDestroy: 600, foodConsumption: 2, puntosReclutamiento: 50,
        abilities: ["Jump","morale_boost"], provides_morale_boost: true
    },
    "Ingenieros": {
        category: "support", cost: { oro: 500, upkeep: 40 },
        attack: 10, defense: 80, health: 200, movement: 2,
        sprite: '👷', visionRange: 1, attackRange: 0, initiative: 6,
        goldValueOnDestroy: 400, foodConsumption: 1, puntosReclutamiento: 50,
        abilities: ["build_road", "build_fortifications"]
    },
    "Hospital de Campaña": {
        category: "support", cost: { oro: 600, upkeep: 60 },
        attack: 0, defense: 40, health: 200, movement: 2,
        sprite: '⚕️', visionRange: 1, attackRange: 0, initiative: 4,
        goldValueOnDestroy: 500, foodConsumption: 1, puntosReclutamiento: 50,
        abilities: ["heal_turn_end"], is_healer: true,
        heal_power: 60 // Heal Power x20 (3 * 20) para ser relevante
    },
    // Unidad de transporte
    "Columna de Suministro": {
        category: "support", cost: { oro: 300, upkeep: 20 },
        attack: 0, defense: 20, health: 200, movement: 3,
        sprite:  'images/sprites/onlycaraban128.png', visionRange: 2, attackRange: 0, initiative: 3,
        goldValueOnDestroy: 400, foodConsumption: -5,
        abilities: ["provide_supply"], cargoCapacity: 400
    },
    
    // Unidades Navales
    "Patache": {category: "naval", is_naval: true,
        cost: { oro: 1000, upkeep: 100, madera: 500 },
        attack: 80, defense: 50, health: 100, movement: 5,
        sprite: 'images/sprites/barco256.png', visionRange: 4, attackRange: 3, initiative: 10,
        goldValueOnDestroy: 200, foodConsumption: 1, puntosReclutamiento: 50, evasion: 5,
        abilities: ["enhanced_vision", "reveal_details", "jump", "barlovento"],
        canOnlyBeAttackedByRanged: true, transportCapacity: 1, cargoCapacity: 200
    },
    "Barco de Guerra": {category: "naval", is_naval: true,
        cost: { oro: 2000, upkeep: 100, madera: 1000 },
        attack: 180, defense: 120, health: 200, movement: 4,
        sprite: 'images/sprites/barco256.png', visionRange: 3, attackRange: 3, initiative: 9,
        goldValueOnDestroy: 2200, foodConsumption: 1, puntosReclutamiento: 50, evasion: 1,
        abilities: ["provide_supply", "transport", "coastal_bombardment"],
        canOnlyBeAttackedByRanged: true, transportCapacity: 1, cargoCapacity: 2200
    }, 

    //Unidades Especiales
    "Colono": {category: "support",
        cost: { oro: 4000, comida: 50, puntosReclutamiento: 200 },
        attack: 0, defense: 20, health: 200, movement: 2, sprite: 'images/sprites/colono128.png',
        visionRange: 1, attackRange: 0, initiative: 5, foodConsumption: 1,
        isSettler: true, abilities: ["build_road"]
    },
    "Explorador": {
        category: "support", // Lo clasificamos como apoyo
        cost: { oro: 150, upkeep: 10 }, // Barato y de bajo mantenimiento
        attack: 5, defense: 10, health: 150, // Muy débil en combate
        movement: 3, // Rápido
        sprite: 'images/sprites/explorador.png',
        visionRange: 3, // Su visión base
        attackRange: 0,
        initiative: 12, // Alta iniciativa para actuar rápido
        goldValueOnDestroy: 50,
        foodConsumption: 1,
        puntosReclutamiento: 40,
        abilities: ["enhanced_vision", "reveal_details", "espionage_mode"], // Dual: Exploración + Espionaje
        isScout: true, // Marcador especial
        spyMode: false, // Estado actual (falso = modo exploración, true = modo espía)
        spyVisionRange: 3, // Rango de revelación en modo espía
        canOnlyFightScouts: true, // Solo combate contra otros exploradores
        spyCounterDetection: true // Dos espías enemigos se anulan
    },

    "Pueblo": {
        category: "support", // Unidad defensiva/de apoyo
        cost: { oro: 80, upkeep: 5 }, // Muy barata
        attack: 15, defense: 60, health: 150, // Misma defensa que Milicia, poco ataque
        movement: 1, // Muy lento (solo se mueve en casillas propias)
        sprite: 'images/sprites/pueblo.png',
        visionRange: 1, // Visión limitada
        attackRange: 0,
        initiative: 4, // Baja iniciativa
        goldValueOnDestroy: 40,
        foodConsumption: 0, // No consume comida (autosuficiente)
        puntosReclutamiento: 20,
        abilities: ["garrison", "food_production"], // Guarnición + Producción de comida
        isVillager: true, // Marcador especial
        canOnlyMoveInOwnTerritory: true, // Solo se mueve en hexágonos propios
        doublesUnitCap: true, // Suma en paralelo al Unit Cap normal
        defensiveOnly: true // No puede atacar primero, solo defender
    },
};

// Iberia Magna

// Define el número máximo de jugadores para esta modalidad
const MAX_PLAYERS_MAGNA = 8;
const BARBARIAN_PLAYER_ID = 9;

// (MODIFICADO) Expande los recursos iniciales
const INITIAL_PLAYER_RESOURCES_MAGNA = [
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 1
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
];

// Define las facciones del mapa Iberia
const CIVILIZATIONS_IBERIA = {
    "Castilla": { name: "Corona de Castilla", bonuses: { /* ... */ } },
    "Aragon": { name: "Corona de Aragón", bonuses: { /* ... */ } },
    "Portugal": { name: "Reino de Portugal", bonuses: { /* ... */ } },
    "Navarra": { name: "Reino de Navarra", bonuses: { /* ... */ } },
    "Granada": { name: "Emirato de Granada", bonuses: { /* ... */ } },
};

const XP_LEVELS = [
    // Nivel 0
    { currentLevelName: "Recluta", nextLevelXp: 50, attackBonus: 0, defenseBonus: 0, disciplineBonus: 0 },
    // Nivel 1
    { currentLevelName: "Regular", nextLevelXp: 150, attackBonus: 10, defenseBonus: 0, disciplineBonus: 5 },
    // Nivel 2
    { currentLevelName: "Veterano", nextLevelXp: 400, attackBonus: 10, defenseBonus: 10, disciplineBonus: 10 },
    // Nivel 3
    { currentLevelName: "Élite", nextLevelXp: 800, attackBonus: 20, defenseBonus: 10, disciplineBonus: 15 },
    // Nivel 4
    { currentLevelName: "Héroe", nextLevelXp: 'Max', attackBonus: 20, defenseBonus: 20, disciplineBonus: 20 }
];

const CIVILIZATIONS = {
    // Nota: Bonus de +1 original se escala a +20. Bonus tácticos sin cambios.
    "Roma": {
        name: "Roma",
        description: "Su infantería y movimiento táctico son superiores.",
        factionImage: "images/nacion/roma.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Pesada": { defenseBonus: 20, movementBonus: 1 } // +20 Defensa (antes +1), movimiento sin cambios
            }
        }
    },
    "Grecia": {
        name: "Grecia",
        description: "La infantería ligera griega es más resistente y ágil.",
        factionImage: "images/nacion/grecia.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { defenseBonus: 20, movementBonus: 1 } // +20 Defensa (antes +1)
            }
        }
    },
    "Cartago": {
        name: "Cartago",
        description: "Potencia naval por excelencia.",
        factionImage: "images/nacion/cartago.png",
        bonuses: {
            unitTypeBonus: {
                "Artillería": { attackBonus: 20 }, // +20 Ataque (antes +1)
                "Patache": { defenseBonus: 10, movementBonus: 1 }, // Barcos exploradores más rápidos y resistentes
                "Barco de Guerra": { defenseBonus: 20, attackRange: 1 } // +20 Defensa (antes +1), rango sin cambios
            }
        }
    },
    "Egipto": {
        name: "Egipto",
        description: "Sus arqueros son célebres por su letalidad y alcance.",
        factionImage: "images/nacion/egipto.png",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20, attackRange: 1 } // +20 Ataque (antes +1)
            }
        }
    },
    "Galia": {
        name: "Galia",
        description: "Famosos por su caballería e infantería de choque.",
        factionImage: "images/nacion/galia.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 20 }, // +20 Ataque
                "Caballería Pesada": { attackBonus: 20 } // +20 Ataque
            }
        }
    },
    "Germania": {
        name: "Germania",
        description: "Una infantería ligera muy resistente.",
        factionImage: "images/nacion/germania.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { defenseBonus: 20 } // +20 Defensa
            }
        }
    },
    "Britania": {
        name: "Britania",
        description: "Sus arqueros son más resistentes y sus barcos ganan experiencia más rápido.",
        factionImage: "images/nacion/britania.png",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { defenseBonus: 20 }, // +20 Defensa
                "Barco de Guerra": { xpGainModifier: 1 } // Lógica futura sin cambios
            }
        }
    },
    "Iberia": {
        name: "Iberia",
        description: "Guerreros versátiles, letales en varios frentes.",
        factionImage: "images/nacion/iberia.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 40 }, // +40 Ataque (antes +2)
                "Caballería Ligera": { attackBonus: 20 }, // +20 Ataque
                "Artillería": { attackBonus: 20 } // +20 Ataque
            }
        }
    },
    "Persia": {
        name: "Persia",
        description: "Un imperio con unidades de élite y habilidades de regeneración únicas.",
        factionImage: "images/nacion/persia.png",
        bonuses: {
            unitTypeBonus: {
                "Arcabuceros": { attackBonus: 20 }, // +20 Ataque
                "Barco de Guerra": { passiveHeal: 0.25 } // Bonus porcentual sin cambios
            },
            globalBonus: { noGoldUpkeep: true } // Bonus global sin cambios
        }
    },
    "China": {
        name: "China",
        description: "Maestros de las armas de pólvora y la organización militar.",
        factionImage: "images/nacion/china.png",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20 },
                "Arcabuceros": { attackBonus: 20 },
                "Barco de Guerra": { xpGainModifier: 1 }
            }
        }
    },
    "Vikingos": {
        name: "Vikingos",
        description: "Guerreros ágiles y rápidos en sus incursiones.",
        factionImage: "images/nacion/vikingos.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 20, movementBonus: 1 }
            }
        }
    },
    "Mongol": {
        name: "Mongolia",
        description: "La horda imparable, maestros de la caballería y el movimiento.",
        factionImage: "images/nacion/mongol.png",
        bonuses: {
            unitTypeBonus: {
                "Caballería Ligera": { movementBonus: 1 },
                "Arqueros a Caballo": { movementBonus: 1 }
            }
        }
    },
    "Arábiga": {
        name: "Arabia",
        description: "Jinetes del desierto rápidos y mortales.",
        factionImage: "images/nacion/arabiga.png",
        bonuses: {
            unitTypeBonus: {
                "Caballería Ligera": { attackBonus: 20 }
            }
        }
    },
    "Mameluca": {
        name: "Sultanato Mameluco",
        description: "Tropas de élite que no cuestan mantenimiento de oro ni comida.",
        factionImage: "images/nacion/mameluca.png",
        bonuses: {
            globalBonus: { noGoldUpkeep: true, noFoodUpkeep: true }
        }
    },
    "Otomana": {
        name: "Imperio Otomano",
        description: "Una potencia de asedio con una artillería y unidades de pólvora temibles.",
        factionImage: "images/nacion/otomana.png",
        bonuses: {
            unitTypeBonus: {
                "Arcabuceros": { attackBonus: 20 },
                "Artillería": { attackBonus: 20 }
            }
        }
    },
    "Maya": {
        name: "Civilización Maya",
        description: "Grandes arqueros que ganan experiencia rápidamente.",
        factionImage: "images/nacion/maya.png",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20 },
                "Barco de Guerra": { xpGainModifier: 1 }
            }
        }
    },
    "ninguna": {
        name: "Ninguna",
        description: "Estándar, sin bonus especiales.",
        factionImage: "", // Puedes poner una imagen por defecto o dejarla vacía
        bonuses: {}
    },
    "Asiria": {
        name: "Asiria",
        description: "Pioneros del asedio y el terror. Su maquinaria de guerra y su infantería pesada son formidables.",
        factionImage: "images/nacion/asiria.png",
        bonuses: {
            unitTypeBonus: {
                "Artillería": { attackBonus: 40, buildCostModifier: -0.1 }, // +40 Ataque (antes +2)
                "Infantería Pesada": { moraleDamageBonus: 2 }
            }
        }
    },
    "Babilonia": {
        name: "Babilonia",
        description: "Cuna de la ley y la ciencia. Progresan tecnológicamente más rápido que nadie.",
        factionImage: "images/nacion/babilonia.png",
        bonuses: {
            economyBonus: { researchPointBonus: 0.25 },
            unitTypeBonus: { "Arqueros": { defenseBonus: 20 } }
        }
    },
    "Japón": {
        name: "Japón",
        description: "Guerreros samurái cuyo código de honor los hace luchar hasta el final sin perder la moral.",
        factionImage: "images/nacion/japon.png",
        bonuses: {
            unitTypeBonus: {
                "Infantería Pesada": { initiativeBonus: 5 }, // Iniciativa es táctica, no se escala
                "Arqueros": { attackBonus: 20 }
            },
            globalBonus: { moraleLossModifier: -0.25 }
        }
    },
    "Bárbaros": {
        name: "Reinos Independientes",
        description: "Ciudades libres que se resisten a la conquista.",
        factionImage: "", // Dejar vacío o poner ruta a una imagen genérica
        bonuses: {}
    },
};

const HERO_PROGRESSION_CONFIG = {
    MAX_LEVEL: 50,
    BASE_XP: 1000,
    POWER: 1.2,
    XP_PER_BOOK: 500
};

const HERO_FRAGMENTS_PER_STAR = {
    // Para evolucionar A esta estrella
    1: 20,
    2: 40,
    3: 80,
    4: 160,
    5: 320
};

const SKIRMISH_VICTORY_GOLD_BONUS = 200;

// Sistema de Victoria por Puntos
const VICTORY_POINTS_TO_WIN = 8; // Puntos necesarios para ganar la partida

// Sistema de Modo Invasión (Asimetría Atacante/Defensor)
const INVASION_MODE_CONFIG = {
    // Distribución de territorio inicial
    ATTACKER_TERRITORY_PERCENT: 0.05,  // Atacante controla 5% del mapa (zona de invasión)
    DEFENDER_TERRITORY_PERCENT: 0.95,  // Defensor controla 95% del mapa
    
    // Recursos iniciales
    ATTACKER_RESOURCES: {
        oro: 40000,     // Ejército invasor viene con oro acumulado (suficiente para 10 divisiones)
        comida: 2000,
        madera: 1000,
        piedra: 500,
        hierro: 500,
        researchPoints: 100
    },
    DEFENDER_RESOURCES: {
        oro: 1000,      // Defensor tiene menos oro pero más territorio
        comida: 1000,
        madera: 800,
        piedra: 400,
        hierro: 300,
        researchPoints: 100
    },
    
    // Ciudades iniciales
    ATTACKER_CITIES: 1,     // Solo ciudad base (punto de invasión)
    DEFENDER_CITIES: 3,     // Múltiples ciudades en territorio
    
    // Restricciones de deployment
    DEPLOYMENT_RADIUS: 1,   // Radio de despliegue desde ciudad base (atacante)
    ATTACKER_DEPLOYMENT_UNIT_LIMIT: 7, // Regimientos máximos del atacante en fase de despliegue
    DEFENDER_DEPLOYMENT_RADIUS: 20,   // Puede desplegar en cualquier ciudad propia
}
const VICTORY_BY_POINTS_ENABLED_DEFAULT = true; // Si la victoria por puntos está activa por defecto

const STRUCTURE_TYPES = {
    // Nota: Costos de recursos y upkeep escalados x20. Bonus y otras propiedades sin cambios, salvo tradeValue.
    "Camino": { 
        name: "Camino", cost: { piedra: 100, madera: 100 }, sprite: '🟰', defenseBonus: 0, movementBonus: 1, integrity: 50,
        movementCost: 0.5, // <<== AÑADIDO: Moverse por un camino es muy rápido
        buildableOn: ['plains', 'hills'], upkeep: {}, requiredTech: "ENGINEERING",
        canBeUpgraded: true, 
        nextUpgrade: "Fortaleza",
        buildOrder: 1
    },

    "Fortaleza": { 
        name: "Fortaleza", cost: { piedra: 1000, hierro: 400, oro: 600 }, sprite: '🏰', defenseBonus: 3, 
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, integrity: 100,  upkeep: { comida: 40, oro: 20 },  buildableOn: ['plains', 'hills'],
        requiredTech: "FORTIFICATIONS", isFortification: true,
        canBeUpgraded: true,
        nextUpgrade: "Fortaleza con Muralla",
        buildOrder: 2
    },
    
     "Fortaleza con Muralla": {
        name: "Fortaleza con Muralla", cost: { piedra: 2000, oro: 1000 }, sprite: '🧱', defenseBonus: 5,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
          allowsRecruitment: true, integrity: 150, defenseBonus: 1, upkeep: { oro: 40 }, buildableOn: ['plains', 'hills'],
        requiredTech: "SIEGE_CRAFT", isFortification: true, unlocksArtillery: true,
        canBeUpgraded: true, 
        nextUpgrade: "Aldea",
        buildOrder: 3
    },
    "Aldea": {
        name: "Aldea", 
        cost: { 'Colono': 1, oro: 2000 },
        sprite: '🏡', defenseBonus: 1, integrity: 200,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 60 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 5,
        canBeUpgraded: true, 
        isCity: true, 
        nextUpgrade: "Ciudad",
        buildOrder: 4
    },
    "Ciudad": {
        name: "Ciudad", 
        cost: { 'Colono': 1, oro: 5000 },
        sprite: '🏘️', defenseBonus: 2, integrity: 250,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 100 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 10,
        canBeUpgraded: true, 
        isCity: true, 
        nextUpgrade: "Metrópoli",
        buildOrder: 5
    },
    "Metrópoli": {
        name: "Metrópoli", 
        cost: { 'Colono': 1, oro: 10000 },
        sprite: '🏙️', defenseBonus: 3, integrity: 300,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 200 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 20,
        canBeUpgraded: false,
        isCity: true, 
        nextUpgrade: null,
        buildOrder: 6
    },
    
    "Atalaya": {
        name: "Atalaya", 
        cost: { madera: 300, oro: 100 }, // Barata
        sprite: '🔭', 
        defenseBonus: 0, // No protege
        integrity: 50,   // Fácil de destruir
        movementCost: 1.0, 
        allowsRecruitment: false, 
        upkeep: { oro: 5 }, 
        buildableOn: ['plains', 'hills', 'forest'], // Se puede construir en casi cualquier lado
        requiredTech: "RECONNAISSANCE", // Requiere tecnología de Reconocimiento
        visionBonus: 4, // <--- PROPIEDAD CLAVE: RANGO DE VISIÓN
        canBeUpgraded: false,
        isCity: false,
        nextUpgrade: null,
        buildOrder: 99
    },
};

const IBERIAN_CITY_NAMES = [
    "Hispalis", "Gadir", "Tarraco", "Olisipo", "Numancia", "Carthago Nova", 
    "Toletum", "Lucentum", "Malaca", "Asturica", "Emérita Augusta", "Corduba",
    "Arriaca", "Ilerda", "Iuliobriga", "Baelo Claudia", "Bilbilis", "Itálica", "Iliberis"
];

const VICTORY_TITLE_NAMES = {
    mostCities: "Gran Arquitecto",
    largestArmy: "Señor de la Guerra",
    mostRoutes: "Red Comercial",    
    mostKills: "Carnicero",
    mostTechs: "Mente Suprema",
    mostHeroes: "Líder de Leyendas",
    mostResources: "Acaudalado",    
    mostTrades: "Socio Preferente",
    mostRuins: "Gran Arqueólogo",
    mostBarbaraCities: "Conquistador Bárbaro",
    mostNavalVictories: "Almirante Supremo"
};

// Define qué terrenos son intransitables para cada categoría de unidad
const IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY = {
    "all_land": ["water"],
    "heavy_infantry": ["forest", "hills"],
    "heavy_cavalry": ["forest", "hills"],
    "artillery": ["forest", "hills"],
    "light_cavalry": ["hills"],
    "light_infantry": [],
    "naval": ["plains", "forest", "hills"]
};

const UPGRADE_TO_CITY_COST = { oro: 3000, piedra: 1000, madera: 1000, comida: 400 };

const RESOURCE_NODES_DATA = { 
    'hierro': { sprite: '⛏️', income: 100, name: 'Hierro' },
    'madera': { sprite: '🌲', income: 100, name: 'Madera' },
    'piedra': { sprite: '⛰️', income: 100, name: 'Piedra' },
    'comida': { sprite: '🌾', income: 100, name: 'Comida' },
    'oro_mina': { sprite: '💰', income: 100, name: 'Oro' }, 
    'Puerto': {sprite: "⚓", income: 100, name: 'Oro',  buildableOn: ["coast"]}
};

const INITIAL_PLAYER_RESOURCES = [ 
    { oro: 1200, hierro: 500, piedra: 1000, madera: 1000, comida: 500, researchPoints: 100, puntosReclutamiento: 1000 },
    { oro: 1200, hierro: 500, piedra: 1000, madera: 1000, comida: 500, researchPoints: 100, puntosReclutamiento: 1000 }
];

// --- INGRESOS BASE POR TURNO ---
const BASE_INCOME = {
    RESEARCH_POINTS_PER_TURN: 8
};

// Habilidades de los héroes
// En constants.js

const SKILL_DEFINITIONS = {
    // === HABILIDADES DE ATAQUE ===
    'attack_percentage_all':      { name: "Ataque % (Todas)",       description_template: "Aumenta el Ataque de todas las tropas en un {X}%.", scope: 'combat', effect: { stat: 'attack', is_percentage: true }, filters: { category: ['all'] } },
    'attack_flat_all':            { name: "Ataque + (Todas)",       description_template: "Aumenta el Ataque de cada regimiento en +{X}.", scope: 'combat', effect: { stat: 'attack', is_percentage: false }, filters: { category: ['all'] } },
    'attack_percentage_infantry': { name: "Ataque % (Infantería)",  description_template: "Aumenta el Ataque de la Infantería en un {X}%.", scope: 'combat', effect: { stat: 'attack', is_percentage: true }, filters: { category: ['light_infantry', 'heavy_infantry'] } },
    'attack_flat_infantry':       { name: "Ataque + (Infantería)",  description_template: "Aumenta el Ataque de cada regimiento de Infantería en +{X}.", scope: 'combat', effect: { stat: 'attack', is_percentage: false }, filters: { category: ['light_infantry', 'heavy_infantry'] } },
    'attack_percentage_cavalry':  { name: "Ataque % (Caballería)",  description_template: "Aumenta el Ataque de la Caballería en un {X}%.", scope: 'combat', effect: { stat: 'attack', is_percentage: true }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },
    'attack_flat_cavalry':        { name: "Ataque + (Caballería)",  description_template: "Aumenta el Ataque de cada regimiento de Caballería en +{X}.", scope: 'combat', effect: { stat: 'attack', is_percentage: false }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },
    'attack_percentage_ranged':   { name: "Ataque % (A Distancia)",description_template: "Aumenta el Ataque de las tropas a distancia en un {X}%.", scope: 'combat', effect: { stat: 'attack', is_percentage: true }, filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería'] } },
    'attack_flat_ranged':         { name: "Ataque + (A Distancia)", description_template: "Aumenta el Ataque de cada regimiento a distancia en +{X}.", scope: 'combat', effect: { stat: 'attack', is_percentage: false }, filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería'] } },
    'attack_percentage_naval':    { name: "Ataque % (Naval)",       description_template: "Aumenta el Ataque de las unidades Navales en un {X}%.", scope: 'combat', effect: { stat: 'attack', is_percentage: true }, filters: { category: ['naval'] } },
    'attack_flat_naval':          { name: "Ataque + (Naval)",       description_template: "Aumenta el Ataque de cada regimiento Naval en +{X}.", scope: 'combat', effect: { stat: 'attack', is_percentage: false }, filters: { category: ['naval'] } },

    // === HABILIDADES DE DEFENSA ===
    'defense_percentage_all':      { name: "Defensa % (Todas)",       description_template: "Aumenta la Defensa de todas las tropas en un {X}%.", scope: 'combat', effect: { stat: 'defense', is_percentage: true }, filters: { category: ['all'] } },
    'defense_flat_all':            { name: "Defensa + (Todas)",       description_template: "Aumenta la Defensa de cada regimiento en +{X}.", scope: 'combat', effect: { stat: 'defense', is_percentage: false }, filters: { category: ['all'] } },
    'defense_percentage_infantry': { name: "Defensa % (Infantería)",  description_template: "Aumenta la Defensa de la Infantería en un {X}%.", scope: 'combat', effect: { stat: 'defense', is_percentage: true }, filters: { category: ['light_infantry', 'heavy_infantry'] } },
    'defense_flat_infantry':       { name: "Defensa + (Infantería)",  description_template: "Aumenta la Defensa de cada regimiento de Infantería en +{X}.", scope: 'combat', effect: { stat: 'defense', is_percentage: false }, filters: { category: ['light_infantry', 'heavy_infantry'] } },
    'defense_percentage_cavalry':  { name: "Defensa % (Caballería)",  description_template: "Aumenta la Defensa de la Caballería en un {X}%.", scope: 'combat', effect: { stat: 'defense', is_percentage: true }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },
    'defense_flat_cavalry':        { name: "Defensa + (Caballería)",  description_template: "Aumenta la Defensa de cada regimiento de Caballería en +{X}.", scope: 'combat', effect: { stat: 'defense', is_percentage: false }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },
    'defense_percentage_ranged':   { name: "Defensa % (A Distancia)",description_template: "Aumenta la Defensa de las tropas a distancia en un {X}%.", scope: 'combat', effect: { stat: 'defense', is_percentage: true }, filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería'] } },
    'defense_flat_ranged':         { name: "Defensa + (A Distancia)", description_template: "Aumenta la Defensa de cada regimiento a distancia en +{X}.", scope: 'combat', effect: { stat: 'defense', is_percentage: false }, filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería'] } },
    'defense_percentage_naval':    { name: "Defensa % (Naval)",       description_template: "Aumenta la Defensa de las unidades Navales en un {X}%.", scope: 'combat' , effect: { stat: 'defense', is_percentage: true }, filters: { category: ['naval'] }},
    'defense_flat_naval':          { name: "Defensa + (Naval)",       description_template: "Aumenta la Defensa de cada regimiento Naval en +{X}." , scope: 'combat', effect: { stat: 'defense', is_percentage: false }, filters: { category: ['naval'] }},

    // === HABILIDADES DE SALUD ===
    'health_percentage_all':      { name: "Salud % (Todas)",      description_template: "Aumenta la Salud máxima de todas las tropas en un {X}%." , scope: 'combat', effect: { stat: 'health', is_percentage: true }, filters: { category: ['all'] }},
    'health_flat_all':            { name: "Salud + (Todas)",      description_template: "Aumenta la Salud máxima de cada regimiento en +{X}." , scope: 'combat', effect: { stat: 'health', is_percentage: false }, filters: { category: ['all'] }},
    'health_percentage_infantry': { name: "Salud % (Infantería)", description_template: "Aumenta la Salud máxima de la Infantería en un {X}%." , scope: 'combat', effect: { stat: 'health', is_percentage: true }, filters: { category: ['light_infantry', 'heavy_infantry'] }},
    'health_flat_infantry':       { name: "Salud + (Infantería)", description_template: "Aumenta la Salud máxima de cada regimiento de Infantería en +{X}." , scope: 'combat', effect: { stat: 'health', is_percentage: false }, filters: { category: ['light_infantry', 'heavy_infantry'] }},

    // === HABILIDADES DE MOVILIDAD ===
    'movement_flat_all':      { name: "Movimiento + (Todas)",      description_template: "Aumenta el Movimiento de todas las tropas en +{X}.", scope: 'movimiento', effect: { stat: 'movement', is_percentage: false }, filters: { category: ['all'] } },
    'movement_flat_infantry': { name: "Movimiento + (Infantería)", description_template: "Aumenta el Movimiento de la Infantería en +{X}.", scope: 'movimiento', effect: { stat: 'movement', is_percentage: false }, filters: { category: ['light_infantry', 'heavy_infantry'] } },
    'movement_flat_cavalry':  { name: "Movimiento + (Caballería)", description_template: "Aumenta el Movimiento de la Caballería en +{X}.", scope: 'movimiento', effect: { stat: 'movement', is_percentage: false }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },
    'movement_flat_naval':    { name: "Movimiento + (Naval)",    description_template: "Aumenta el Movimiento de las unidades Navales en +{X}.", scope: 'movimiento' , effect: { stat: 'movement', is_percentage: false }, filters: { category: ['naval'] }},
    
    // === HABILIDADES TÁCTICAS ===
    'range_flat_ranged':   { name: "Alcance + (A Distancia)", description_template: "Aumenta el Alcance de las tropas a distancia en +{X}.", scope : 'ataque', effect: { stat: 'attackRange', is_percentage: false }, filters: { type: ['Arqueros', 'Arqueros a Caballo', 'Artillería','Arcabuceros'] } },
    'initiative_flat_all': { name: "Iniciativa + (Todas)",      description_template: "Aumenta la Iniciativa de todas las tropas en +{X}." , scope : 'ataque', effect: { stat: 'initiative', is_percentage: false }, filters: { category: ['all'] }},
    'initiative_flat_cavalry': { name: "Iniciativa + (Caballería)", description_template: "Aumenta la Iniciativa de la Caballería en +{X}.", scope : 'ataque', effect: { stat: 'initiative', is_percentage: false }, filters: { category: ['light_cavalry', 'heavy_cavalry'] } },

    // === HABILIDADES DE SOPORTE Y ECONOMÍA ===
    'morale_flat_all': { name: "Moral + (Todas)", description_template: "Aumenta la Moral máxima de la división en +{X}.", scope : 'turno', effect: { stat: 'morale', is_percentage: false }, filters: { category: ['all'] } },
    'upkeep_reduction_percentage_all': { name: "Reducción de Consumo %", description_template: "Reduce el coste de mantenimiento (oro y comida) de esta división en un {X}%." ,scope : 'turno', effect: { stat: 'upkeep', is_percentage: true }, filters: { category: ['all'] }},
    
    'xp_gain_percentage_all': { name: "Ganancia de XP %", description_template: "Aumenta la ganancia de Experiencia de esta división en un {X}%.", scope : 'fin', effect: { stat: 'xp_gain', is_percentage: true }, filters: { category: ['all'] } },
    'book_drop_chance_percentage': { name: "Estudio Marcial", description_template: "Aumenta la probabilidad de obtener Libros de XP de batallas en un {X}%." , scope : 'fin', effect: { stat: 'book_drop', is_percentage: true }, filters: { category: ['all'] }},
    'fragment_drop_chance_percentage': { name: "Conocimiento del Héroe", description_template: "Aumenta la probabilidad de obtener Fragmentos de Héroe de batallas en un {X}%." , scope: 'fin', effect: { stat: 'fragment_drop', is_percentage: true }, filters: { category: ['all'] }},

};
// --- INGRESOS BASE DE ORO POR CONTROL TERRITORIAL ---
const GOLD_INCOME = {
    PER_HEX: 10,
    PER_ROAD: 20,
    PER_FORT: 40,
    PER_CITY: 80,
    PER_CAPITAL: 160
};

const RESOURCE_MULTIPLIERS_V2 = { // Renombrado para no confundir, puedes eliminar el antiguo
    BASE: 10,      
    CAMINO: 20,    
    FORTALEZA: 40, 
    ALDEA: 80, 
    CIUDAD: 160, 
    METROPOLI: 320 // Corregido acento   
};

const RESOURCE_MULTIPLIERS = {
    BASE: 10,      
    CAMINO: 20,    
    FORTALEZA: 40, 
    ALDEA: 80, 
    CIUDAD: 160, 
    METRóPOLI: 320     
};

const TERRAIN_TYPES = {
    plains: {
        name: "Llanura",
        movementCostMultiplier: 1.0,
        defenseBonus: 0,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 0
    },
    forest: {
        name: "Bosque",
        movementCostMultiplier: 2.0,
        defenseBonus: 1.25,
        rangedDefenseBonus: 2,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0.5,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 1
    },
    hills: {
        name: "Colinas",
        movementCostMultiplier: 2.0,
        defenseBonus: 1.5,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 1,
        resourceYieldMultiplier: 1.1,
        visionPenalty: 0,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 1
    },
    water: {
        name: "Agua", 
        movementCostMultiplier: 1.0,
        defenseBonus: 0,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 0,
        visionPenalty: 0,
        isImpassableForLand: true,
        isImpassableForNaval: false,
        minMovement: 0
    },
};

const AI_RESOURCE_PRIORITY = {
    'oro': 100,
    'comida': 80,
    'hierro': 30,
    'piedra': 20,
    'madera': 10
};

const REINFORCE_COST_PER_HP_PERCENT = 2.4

const ATTRITION_DAMAGE_PER_TURN = 1; 
const ATTRITION_FOOD_SHORTAGE_THRESHOLD = 0;

const TUTORIAL_MESSAGES = {
    title: "Bienvenido a Hex General Evolved",
    sections: [
        {
            heading: "Tu Misión",
            content: "El Juego tiene 2 fases, una de Despliegue y otra de Juego, en la de Despliegue puedes poner unas pocas unidades, en la de juego solo podrás construir en fortalezas y ciudades. Tu misión es acabar y conquistar las ciudades del enemigo. <br>Para alcanzar la victoria, deberás gestionar tus recursos, expandir tu territorio, investigar nuevas tecnologías y comandar tus divisiones en el campo de batalla con astucia.<br><b>¡La victoria te espera!</b>"
        },
        {
            heading: "Antes de iniciar el Juego puedes decidir",
            content: "El Nivel de Recursos que encontrarás en el mapa (Mínimos, Medios, Muchos), El tamaño del mapa, la cantidad de unidades a desplegar (Fase Inicial) donde quieras."
        },
        {
            heading: "El Tablero de Juego",
            content: "El campo de batalla es un tablero de celdas hexagonales. Cada hexágono tiene un terreno (Llanuras, Bosque, etc.) y puede contener recursos (Oro, Comida, etc.)."
        },
        {
            heading: "Fases del Juego",
            content: "El juego tiene fases principales: <br>• <b>Despliegue:</b> Coloca tus unidades iniciales estratégicamente. Protege tu ciudad siempre! <br>• <b>Juego:</b> Mueve tus unidades, combate, investiga y construye. <br>• <b>Fin de Partida:</b> Cuando un jugador conquista la capital enemiga o elimina todas sus unidades."
        },
        {
            heading: "Unidades (Divisiones)",
            content: "Tus unidades se llaman Divisiones, compuestas por Regimientos. Cada tipo de Regimiento (Infantería, Caballería, Arqueros) tiene valores únicos de Ataque, Defensa, Salud y Movimiento. Ganan experiencia con la batalla."
        },
        {
            heading: "Recursos y Economía",
            content: "Domina hexágonos con recursos para aumentar tus ingresos. El Oro te permite crear nuevas unidades. La Comida es vital para mantener a tus tropas. También necesitarás Hierro, Piedra y Madera para construir estructuras."
        },
        {
            heading: "Árbol de Tecnología",
            content: "Investiga nuevas tecnologías para desbloquear unidades más avanzadas, estructuras defensivas y mejoras económicas. Accede desde el botón 💡."
        },
        {
            heading: "Controles Básicos",
            content: "• <b>Clic en hexágono/unidad:</b> Selecciona o interactúa. <br>• <b>Arrastrar tablero:</b> Panorámica del mapa. <br>• <b>Botón ►:</b> Terminar turno. <br>• <b>Botón ➕:</b> Crear nueva unidad (en fase de despliegue). <br>• <b>Botón Crear Unidad:</b> Crear nueva unidad (en ciudad o Fortaleza). <br>• <b>Botón Reforzar:</b> Refuerza unidad dañada (en ciudad o Fortaleza)."
        },
        {
            heading: "¿Necesitas ayuda?",
            content: "Si te pierdes, el panel contextual inferior te dará información y acciones disponibles. Puedes acceder al menú flotante (⋮) para opciones de guardar/cargar."
        }
    ],
    footer: "¡Mucha suerte, General! La historia espera tu legado."
};

const GACHA_CONFIG = {
    COST_PER_WISH: 1,
    COST_PER_TEN_WISHES: 10,
    
    COMMON_BANNER_ODDS: {
        COMUN: 75.0,      // Aumentada la probabilidad de común
        RARO: 20.0,       // Reducida
        EPICO: 4.5,       // Se mantiene
        LEGENDARIO: 0.5   // Se mantiene
    },

   HERO_POOLS_BY_RARITY: {},

    // FRAGMENTOS ==>>
    FRAGMENTS_PER_PULL: {
        COMUN: [1, 2, 3],         // Antes [8, 10, 12]
        RARO: [1,1, 2],             // Antes [5, 6, 8]
        EPICO: [1,1,1],               // Antes [3, 4, 5]
        LEGENDARIO: [1,1,1]           // Antes [1, 2, 3]
    },
    // Contadores del sistema de Pity (Misericordia)
    PITY_EPIC: 10,          // Un épico garantizado cada 10 deseos en un multi-pull
    PITY_LEGENDARY: 50      // Un legendario garantizado cada 50 deseos

    /**
 * Inicializa los pools de héroes del Gacha. 
 * Debe ser llamada al inicio de la aplicación, después de que todos los scripts se hayan cargado.
 */

};

// =======================================================
// ===           CONFIGURACIÓN DE RUINAS               ===
// =======================================================

const RUIN_GENERATION_CHANCE = {
    ON_UNIT_DESTROYED: 50, // Probabilidad (en %) de que una unidad deje ruinas al morir
    INITIAL_MAP_RUINS: 8   // Número de ruinas que se generan al inicio de una partida normal
};
const RUIN_EVENTS = [
    // === EVENTOS BUENOS ===
    {
        id: 'small_gold',
        description: "Tus exploradores desentierran un pequeño zurrón con monedas de oro.",
        weight: 20,
        type: 'good',
        effect: { type: 'add_resource', resource: 'oro', amount: [150, 300] },
        toastMessage: "¡Oro encontrado!",
        toastIcon: '💰'
    },
    {
        id: 'mixed_resources',
        description: "Encuentras los restos de un antiguo convoy de suministros, ¡todavía hay materiales útiles!",
        weight: 15,
        type: 'good',
        effect: { type: 'add_multiple_resources', resources: { 'piedra': [100, 200], 'madera': [100, 200] } },
        toastMessage: "¡Recursos hallados!",
        toastIcon: '🧱'
    },
    {
        id: 'war_seal',
        description: "Entre viejos estandartes, brilla un Sello de Guerra intacto. ¡Un objeto de gran poder!",
        weight: 8,
        type: 'good',
        effect: { type: 'add_item', item: 'sellos_guerra', amount: 1 },
        toastMessage: "¡Sello de Guerra!",
        toastIcon: '💎'
    },
    {
        id: 'equipment_fragments_common',
        description: "Rebuscando entre los escombros, encuentras fragmentos de equipo de batalla común.",
        weight: 7,
        type: 'good',
        effect: { type: 'add_equipment_fragments', rarity: 'Común', amount: [2, 5] },
        toastMessage: "¡Fragmentos de Equipo!",
        toastIcon: '🛡️'
    },
    {
        id: 'equipment_fragments_rare',
        description: "¡Un hallazgo afortunado! Fragmentos de lo que parece ser un equipo de gran calidad.",
        weight: 4,
        type: 'good',
        effect: { type: 'add_equipment_fragments', rarity: 'Raro', amount: [1, 3] },
        toastMessage: "¡Fragmentos Raros!",
        toastIcon: '✨'
    },
    {
        id: 'hero_fragments',
        description: "Una estela erosionada narra las hazañas de un antiguo héroe, su leyenda te inspira.",
        weight: 3,
        type: 'good',
        effect: { type: 'add_hero_fragments', rarity: ['Común', 'Raro'], amount: [1, 5] },
        toastMessage: "¡Fragmentos de Héroe!",
        toastIcon: '🎖️'
    },

    // === EVENTOS NEUTRALES/RAROS ===
    {
        id: 'ancient_knowledge',
        description: "Descifras un viejo pergamino con conocimientos olvidados, revelando los secretos de una nueva tecnología.",
        weight: 2,
        type: 'neutral',
        effect: { type: 'grant_random_tech', tier: 1 },
        toastMessage: "¡Tecnología Descubierta!",
        toastIcon: '💡'
    },
    {
        id: 'lost_regiment',
        description: "Un pequeño grupo de guerreros perdidos, impresionados por tu estandarte, deciden unirse a tu causa.",
        weight: 1,
        type: 'good',
        effect: { type: 'add_regiment', regimentType: 'Infantería Ligera' },
        toastMessage: "¡Refuerzos inesperados!",
        toastIcon: '🤝'
    },

    {
        id: 'victory_point',
        description: "En el corazón de la ruina, encuentras un antiguo artefacto de poder que consolida tu legado. ¡Obtienes un Punto de Victoria!",
        weight: 1, // Muy raro
        type: 'special',
        effect: { type: 'grant_victory_point' },
        toastMessage: "¡Punto de Victoria!",
        toastIcon: '👑'
    },

    // === EVENTOS MALOS ===
    {
        id: 'ambush',
        description: "¡Una emboscada! Bandidos ocultos atacan a tus exploradores y huyen antes de que puedas reaccionar.",
        weight: 8,
        type: 'bad',
        effect: { type: 'damage_division_percent', amount: [10, 25] },
        toastMessage: "¡Emboscada!",
        toastIcon: '💀'
    },
    {
        id: 'trap',
        description: "¡Es una trampa! Uno de tus regimientos cae en un foso oculto con estacas.",
        weight: 4,
        type: 'bad',
        effect: { type: 'damage_random_regiment', amount: [50, 80] },
        toastMessage: "¡Trampa!",
        toastIcon: '🕸️'
    },
    {
        id: 'nothing',
        description: "Tras una búsqueda exhaustiva, tus tropas confirman que el lugar ya fue completamente saqueado hace tiempo.",
        weight: 15,
        type: 'neutral',
        effect: { type: 'nothing' },
        toastMessage: "No has encontrado nada",
        toastIcon: '💨'
    }
];

// ==================================================
// CONSTANTES DE CAPACIDAD MILITAR (UNIT CAP)
// ==================================================
const UNIT_CAP_BY_INFRASTRUCTURE = {
    "Metrópoli": 40,      // 8,000 población = 40 regimientos
    "Ciudad": 20,         // 4,000 población = 20 regimientos
    "Aldea": 10,          // 2,000 población = 10 regimientos
    "Fortaleza": 5,       // 1,000 población = 5 regimientos
    "Hexágono Libre": 1   // 200 población = 1 regimiento
};

// ==================================================