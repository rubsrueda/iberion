// equipment.js

const EQUIPMENT_DEFINITIONS = {

    // =======================================================
    // === EQUIPO COMÚN (NIVEL 1) ===
    // =======================================================
    "common_weapon_1": {
        id: "common_weapon_1", name: "Espada Corta de Hierro", slot: "weapon", rarity: "Común", icon: "🗡️",
        fragments_needed: 20,
        bonuses: [{ stat: 'attack', value: 10, is_percentage: false, scope: 'combat' }]
    },
    "common_chest_1": {
        id: "common_chest_1", name: "Jubón de Cuero", slot: "chest", rarity: "Común", icon: "🧥",
        fragments_needed: 20,
        bonuses: [{ stat: 'defense', value: 10, is_percentage: false, scope: 'combat' }]
    },
    "common_helmet_1": {
        id: "common_helmet_1", name: "Gorro de Cuero", slot: "head", rarity: "Común", 
        icon: "images/forja/casco_base.svg", // RUTA REAL
        fragments_needed: 20,
        bonuses: [{ stat: 'health', value: 20, is_percentage: false, scope: 'combat' }]
    },
    "common_legs_1": {
        id: "common_legs_1", name: "Pantalones de Tela", slot: "legs", rarity: "Común", icon: "👖",
        fragments_needed: 20,
        bonuses: [{ stat: 'health', value: 15, is_percentage: false, scope: 'combat' }]
    },
    "common_gloves_1": {
        id: "common_gloves_1", name: "Guantes de Trabajo", slot: "gloves", rarity: "Común", icon: "🧤",
        fragments_needed: 20,
        bonuses: [{ stat: 'attack', value: 5, is_percentage: false, scope: 'combat' }]
    },
    "common_boots_1": {
        id: "common_boots_1", name: "Botas de Viaje", slot: "boots", rarity: "Común", icon: "👢",
        fragments_needed: 20,
        bonuses: [{ stat: 'movement', value: 3, is_percentage: true, scope: 'movimiento' }]
    },

    // =======================================================
    // === EQUIPO RARO (NIVEL 2) ===
    // =======================================================
    "rare_weapon_1": {
        id: "rare_weapon_1", name: "Hacha de Guerra de Acero", slot: "weapon", rarity: "Raro", icon: "🪓",
        fragments_needed: 30,
        bonuses: [
            { stat: 'attack', value: 25, is_percentage: false, scope: 'combat' },
            { stat: 'initiative', value: 5, is_percentage: false, scope: 'ataque' }
        ]
    },
    "rare_chest_1": {
        id: "rare_chest_1", name: "Cota de Malla", slot: "chest", rarity: "Raro", icon: "🛡️",
        fragments_needed: 30,
        bonuses: [
            { stat: 'defense', value: 5, is_percentage: true, scope: 'combat' },
            { stat: 'health', value: 30, is_percentage: false, scope: 'combat' }
        ]
    },
    "rare_helmet_1": {
        id: "rare_helmet_1", name: "Yelmo Boeotio", slot: "head", rarity: "Raro", 
        icon: "images/forja/casco_avanzado.svg", // RUTA REAL
        fragments_needed: 30,
        bonuses: [
            { stat: 'health', value: 50, is_percentage: false, scope: 'combat' },
            { stat: 'defense', value: 5, is_percentage: false, scope: 'combat' }
        ]
    },
    "rare_legs_1": {
        id: "rare_legs_1", name: "Quijotes de Malla", slot: "legs", rarity: "Raro", icon: "🦵",
        fragments_needed: 30,
        bonuses: [
            { stat: 'defense', value: 3, is_percentage: true, scope: 'combat' },
            { stat: 'health', value: 3, is_percentage: true, scope: 'combat' }
        ]
    },
    "rare_gloves_1": {
        id: "rare_gloves_1", name: "Guanteletes de Precisión", slot: "gloves", rarity: "Raro", icon: "🧤",
        fragments_needed: 30,
        bonuses: [
            { stat: 'attack', value: 10, is_percentage: false, scope: 'combat' },
            { stat: 'skill_damage', value: 3, is_percentage: true, scope: 'ataque' }
        ]
    },
    "rare_boots_1": {
        id: "rare_boots_1", name: "Botas de Guerra Reforzadas", slot: "boots", rarity: "Raro", icon: "👢",
        fragments_needed: 30,
        bonuses: [
            { stat: 'movement', value: 5, is_percentage: true, scope: 'movimiento' },
            { stat: 'defense', value: 10, is_percentage: false, scope: 'combat' }
        ]
    },

    // =======================================================
    // === EQUIPO ÉPICO (NIVEL 3) ===
    // =======================================================
    "epic_weapon_1": {
        id: "epic_weapon_1", name: "Mandoble del Capitán", slot: "weapon", rarity: "Épico", icon: "⚔️",
        fragments_needed: 50,
        bonuses: [
            { stat: 'attack', value: 8, is_percentage: true, scope: 'combat', filters: { category: ['all'] } },
            { stat: 'morale', value: 10, is_percentage: false, scope: 'turno' }
        ]
    },
    "epic_chest_1": {
        id: "epic_chest_1", name: "Coraza de Placas del Guardián", slot: "chest", rarity: "Épico", icon: "🏯",
        fragments_needed: 50,
        bonuses: [
            { stat: 'defense', value: 8, is_percentage: true, scope: 'combat' },
            { stat: 'health', value: 5, is_percentage: true, scope: 'combat' },
            { stat: 'control_reduction', value: 15, is_percentage: true, scope: 'combat' }
        ]
    },
    "epic_helmet_1": {
        id: "epic_helmet_1", name: "Yelmo de Montefortino", slot: "head", rarity: "Épico", 
        icon: "images/forja/casco_ibero.svg", // RUTA REAL
        fragments_needed: 50,
        bonuses: [
            { stat: 'defense', value: 5, is_percentage: true, scope: 'combat' },
            { stat: 'xp_gain', value: 10, is_percentage: true, scope: 'fin' }
        ]
    },
    "epic_legs_1": {
        id: "epic_legs_1", name: "Quijotes de Comandante", slot: "legs", rarity: "Épico", icon: "🦵",
        fragments_needed: 50,
        bonuses: [
            { stat: 'defense', value: 5, is_percentage: true, scope: 'combat' },
            { stat: 'defense_vs_ranged', value: 10, is_percentage: true, scope: 'combat' }
        ]
    },
    "epic_gloves_1": {
        id: "epic_gloves_1", name: "Manoplas del Conquistador", slot: "gloves", rarity: "Épico", icon: "🧤",
        fragments_needed: 50,
        bonuses: [
            { stat: 'attack', value: 5, is_percentage: true, scope: 'combat' },
            { stat: 'skill_damage', value: 5, is_percentage: true, scope: 'ataque' }
        ]
    },
    "epic_boots_1": {
        id: "epic_boots_1", name: "Grebas de Carga", slot: "boots", rarity: "Épico", icon: "👢",
        fragments_needed: 50,
        bonuses: [
            { stat: 'movement', value: 8, is_percentage: true, scope: 'movimiento' },
            { stat: 'attack', value: 15, is_percentage: false, scope: 'combat', filters: { category: ['light_cavalry', 'heavy_cavalry'] } }
        ]
    },

    // =======================================================
    // === EQUIPO LEGENDARIO (NIVEL 4) ===
    // =======================================================
    "legendary_weapon_1": {
        id: "legendary_weapon_1", name: "Martillo del Rey Conquistador", slot: "weapon", rarity: "Legendario", icon: "🔨",
        fragments_needed: 80,
        bonuses: [
            { stat: 'attack', value: 12, is_percentage: true, scope: 'combat' },
            { stat: 'damage_vs_structure', value: 25, is_percentage: true, scope: 'ataque' },
            { stat: 'chance_to_stun', value: 1, is_percentage: false, scope: 'ataque', chance: 5 }
        ]
    },
     "legendary_chest_1": {
        id: "legendary_chest_1", name: "Égida de la Voluntad Férrea", slot: "chest", rarity: "Legendario", icon: "⚜️",
        fragments_needed: 80,
        bonuses: [
            { stat: 'defense', value: 12, is_percentage: true, scope: 'combat' },
            { stat: 'skill_damage_reduction', value: 15, is_percentage: true, scope: 'combat' },
            { stat: 'morale_reduction_immunity', value: 1, is_percentage: false, scope: 'turno' }
        ]
    },

    "legendary_helmet_1": {
        id: "legendary_helmet_1", name: "Yelmo Corintio", slot: "head", rarity: "Legendario", 
        icon: "images/forja/casco_romano.svg", // RUTA REAL
        bonuses: [
            { stat: 'health', value: 10, is_percentage: true, scope: 'combat' },
            { stat: 'initiative', value: 10, is_percentage: false, scope: 'ataque' },
            { stat: 'nearby_ally_attack_buff', value: 2, is_percentage: true, scope: 'combat' }
        ]
    },
    "legendary_legs_1": {
        id: "legendary_legs_1", name: "Quijotes del Viajero Incansable", slot: "legs", rarity: "Legendario", icon: "🦵",
        fragments_needed: 80,
        bonuses: [
            { stat: 'health', value: 8, is_percentage: true, scope: 'combat' },
            { stat: 'movement', value: 10, is_percentage: true, scope: 'movimiento' },
            { stat: 'terrain_cost_negation', value: 1, is_percentage: false, scope: 'movimiento', terrains: ['forest'] }
        ]
    },
    "legendary_gloves_1": {
        id: "legendary_gloves_1", name: "Guantes de la Parca", slot: "gloves", rarity: "Legendario", icon: "🧤",
        fragments_needed: 80,
        bonuses: [
            { stat: 'attack', value: 8, is_percentage: true, scope: 'combat' },
            { stat: 'damage_vs_low_hp', value: 15, is_percentage: true, scope: 'ataque' }
        ]
    },
    "legendary_boots_1": {
        id: "legendary_boots_1", name: "Botas de Siete Leguas", slot: "boots", rarity: "Legendario", icon: "👢",
        fragments_needed: 80,
        bonuses: [
            { stat: 'movement', value: 20, is_percentage: true, scope: 'movimiento' },
            { stat: 'out_of_combat_speed', value: 15, is_percentage: true, scope: 'movimiento' }
        ]
    }
};
