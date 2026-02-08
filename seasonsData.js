// seasonsData.js

const BATTLE_PASS_SEASONS = {
  
    // ==========================================
    // === TEMPORADA 1: EL AMANECER DE IBERIA ===
    // ==========================================
    "SEASON_1": {
        id: 1,
        name: "T1: EL AMANECER",
        description: "Los primeros pasos hacia la conquista total.",
        startDate: "2026-01-01T00:00:00Z",
        endDate: "2026-01-29T23:59:59Z", // 28 días de duración estándar
        
        // Estructura: 
        // lvl: Nivel del pase
        // req_xp: Experiencia total acumulada necesaria
        // free: Premio Pista Gratuita
        // prem: Premio Pista Dorada (Requiere compra)
        
        levels: [
            // --- ETAPA 1: EL GANCHO (Niveles 1-5) ---
            { lvl: 1,  req_xp: 0,     free: {type:'oro', qty:500, icon:'💰'},      prem: {type:'sellos', qty:1, icon:'🎟️'} },
            { lvl: 2,  req_xp: 500,   free: {type:'xp_books', qty:2, icon:'📘'},   prem: {type:'xp_books', qty:5, icon:'📖'} },
            { lvl: 3,  req_xp: 1000,  free: {type:'oro', qty:600, icon:'💰'},      prem: {type:'fragmentos', id:'g_el_cid', qty:5, icon:'🧩'} }, // Héroe
            { lvl: 4,  req_xp: 1500,  free: {type:'oro', qty:800, icon:'💰'},      prem: {type:'oro', qty:5000, icon:'💰'} },
            { lvl: 5,  req_xp: 2000,  free: {type:'sellos', qty:1, icon:'🎟️'},     prem: {type:'equipo', id:'rare_weapon_1', qty:1, icon:'⚔️'} }, // Arma Rara

            // --- ETAPA 2: CONSOLIDACIÓN (Niveles 6-10) ---
            { lvl: 6,  req_xp: 2500,  free: {type:'xp_books', qty:3, icon:'📘'},   prem: {type:'gemas', qty:50, icon:'💎'} },
            { lvl: 7,  req_xp: 3000,  free: {type:'oro', qty:1000, icon:'💰'},     prem: {type:'sellos', qty:5, icon:'🎟️'} },
            { lvl: 8,  req_xp: 3500,  free: {type:'xp_books', qty:5, icon:'📘'},   prem: {type:'fragmentos', id:'g_viriato', qty:10, icon:'🧩'} }, // Héroe
            { lvl: 9,  req_xp: 4000,  free: {type:'oro', qty:1500, icon:'💰'},     prem: {type:'gemas', qty:100, icon:'💎'} },
            { lvl: 10, req_xp: 4500,  free: {type:'sellos', qty:2, icon:'🎟️'},     prem: {type:'equipo', id:'rare_chest_1', qty:1, icon:'🛡️'} }, // Armadura Rara

            // --- ETAPA 3: EXPANSIÓN (Niveles 11-15) ---
            { lvl: 11, req_xp: 5000,  free: {type:'oro', qty:2000, icon:'💰'},     prem: {type:'xp_books', qty:15, icon:'📖'} },
            { lvl: 12, req_xp: 5500,  free: {type:'xp_books', qty:8, icon:'📘'},   prem: {type:'oro', qty:10000, icon:'💰'} },
            { lvl: 13, req_xp: 6000,  free: {type:'gemas', qty:25, icon:'💎'},     prem: {type:'fragmentos', id:'g_amilcar_barca', qty:10, icon:'🧩'} }, // Héroe Épico
            { lvl: 14, req_xp: 6500,  free: {type:'oro', qty:2500, icon:'💰'},     prem: {type:'gemas', qty:200, icon:'💎'} },
            { lvl: 15, req_xp: 7000,  free: {type:'sellos', qty:2, icon:'🎟️'},     prem: {type:'equipo', id:'rare_helmet_1', qty:1, icon:'🪖'} }, // Casco Raro

            // --- ETAPA 4: RECURSOS MEDIOS (Niveles 16-20) ---
            { lvl: 16, req_xp: 7500,  free: {type:'xp_books', qty:10, icon:'📘'},  prem: {type:'oro', qty:15000, icon:'💰'} },
            { lvl: 17, req_xp: 8000,  free: {type:'oro', qty:3000, icon:'💰'},     prem: {type:'sellos', qty:8, icon:'🎟️'} },
            { lvl: 18, req_xp: 8500,  free: {type:'gemas', qty:50, icon:'💎'},     prem: {type:'fragmentos', id:'g_lucius_velox', qty:15, icon:'🧩'} },
            { lvl: 19, req_xp: 9000,  free: {type:'xp_books', qty:12, icon:'📘'},  prem: {type:'gemas', qty:300, icon:'💎'} },
            { lvl: 20, req_xp: 9500,  free: {type:'sellos', qty:3, icon:'🎟️'},     prem: {type:'equipo', id:'epic_boots_1', qty:1, icon:'👢'} }, // Botas ÉPICAS

            // --- ETAPA 5: VETERANÍA (Niveles 21-25) ---
            { lvl: 21, req_xp: 10000, free: {type:'oro', qty:4000, icon:'💰'},     prem: {type:'oro', qty:20000, icon:'💰'} },
            { lvl: 22, req_xp: 10500, free: {type:'xp_books', qty:15, icon:'📘'},  prem: {type:'xp_books', qty:30, icon:'📖'} },
            { lvl: 23, req_xp: 11000, free: {type:'gemas', qty:75, icon:'💎'},     prem: {type:'fragmentos', id:'g_el_cid', qty:20, icon:'🧩'} }, // Push fuerte
            { lvl: 24, req_xp: 11500, free: {type:'oro', qty:5000, icon:'💰'},     prem: {type:'sellos', qty:10, icon:'🎟️'} },
            { lvl: 25, req_xp: 12000, free: {type:'sellos', qty:3, icon:'🎟️'},     prem: {type:'equipo', id:'epic_weapon_1', qty:1, icon:'⚔️'} }, // Arma ÉPICA

            // --- ETAPA 6: PREPARACIÓN DE ÉLITE (Niveles 26-30) ---
            { lvl: 26, req_xp: 12500, free: {type:'xp_books', qty:20, icon:'📘'},  prem: {type:'gemas', qty:500, icon:'💎'} },
            { lvl: 27, req_xp: 13000, free: {type:'oro', qty:6000, icon:'💰'},     prem: {type:'sellos', qty:12, icon:'🎟️'} },
            { lvl: 28, req_xp: 13500, free: {type:'gemas', qty:100, icon:'💎'},    prem: {type:'fragmentos', id:'g_escipion_africano', qty:10, icon:'🧩'} }, // Héroe Legendario
            { lvl: 29, req_xp: 14000, free: {type:'oro', qty:7000, icon:'💰'},     prem: {type:'oro', qty:50000, icon:'💰'} },
            { lvl: 30, req_xp: 14500, free: {type:'sellos', qty:4, icon:'🎟️'},     prem: {type:'equipo', id:'epic_chest_1', qty:1, icon:'🛡️'} }, // Armadura ÉPICA

            // --- ETAPA 7: TESOROS REALES (Niveles 31-35) ---
            { lvl: 31, req_xp: 15000, free: {type:'xp_books', qty:25, icon:'📘'},  prem: {type:'gemas', qty:800, icon:'💎'} },
            { lvl: 32, req_xp: 15500, free: {type:'oro', qty:8000, icon:'💰'},     prem: {type:'xp_books', qty:50, icon:'📖'} },
            { lvl: 33, req_xp: 16000, free: {type:'gemas', qty:150, icon:'💎'},    prem: {type:'fragmentos', id:'g_almanzor', qty:15, icon:'🧩'} },
            { lvl: 34, req_xp: 16500, free: {type:'xp_books', qty:30, icon:'📘'},  prem: {type:'sellos', qty:15, icon:'🎟️'} },
            { lvl: 35, req_xp: 17000, free: {type:'sellos', qty:5, icon:'🎟️'},     prem: {type:'equipo', id:'epic_helmet_1', qty:1, icon:'🪖'} },

            // --- ETAPA 8: EL FINAL (Niveles 36-40) ---
            { lvl: 36, req_xp: 17500, free: {type:'oro', qty:10000, icon:'💰'},    prem: {type:'oro', qty:100000, icon:'💰'} },
            { lvl: 37, req_xp: 18000, free: {type:'sellos', qty:5, icon:'🎟️'},     prem: {type:'gemas', qty:1000, icon:'💎'} },
            { lvl: 38, req_xp: 18500, free: {type:'xp_books', qty:50, icon:'📘'},  prem: {type:'fragmentos', id:'g_el_cid', qty:30, icon:'🧩'} },
            { lvl: 39, req_xp: 19000, free: {type:'gemas', qty:200, icon:'💎'},    prem: {type:'sellos', qty:25, icon:'🎟️'} },
            { lvl: 40, req_xp: 20000, free: {type:'fragmentos', id:'g_el_cid', qty:10, icon:'🧩'}, prem: {type:'equipo', id:'legendary_weapon_1', qty:1, icon:'⚔️'} } // ARMA LEGENDARIA
        ]
    },

    // --- EJEMPLO FUTURO: HALLOWEEN ---
    "HALLOWEEN": {
        id: 2,
        name: "EVENTO: SOMBRAS DE OTOÑO",
        levels: [
            { lvl: 1, req_xp: 0, free: {type:'oro', qty:666, icon:'🎃'}, prem: {type:'sellos', qty:6, icon:'👻'} },
            // ...
        ]
    }

};

// AUTO-RELLENO: Extiende el pase hasta el nivel 41 si es necesario.
// Usamos solo Oro como recompensa de relleno.
const lastLvl = BATTLE_PASS_SEASONS["SEASON_1"].levels[BATTLE_PASS_SEASONS["SEASON_1"].levels.length - 1];
if (lastLvl.lvl < 41) {
    BATTLE_PASS_SEASONS["SEASON_1"].levels.push({
        lvl: 45,
        req_xp: lastLvl.req_xp + 500,
        free: { type: 'oro', qty: 15000, icon: '💰' },
        prem: { type: 'gemas', qty: 500, icon: '💎' }
    });
}; 

// Función auxiliar para rellenar huecos si la lista es corta (opcional)
function generateFillerLevels(baseLevels, maxLevel) {
    const lastLvl = baseLevels[baseLevels.length - 1];
    let currentXp = lastLvl.req_xp;
    
    for (let i = baseLevels.length + 1; i <= maxLevel; i++) {
        currentXp += 500;
        baseLevels.push({
            lvl: i,
            req_xp: currentXp,
            free: { type: 'oro', qty: 100 * i, icon: '💰' },
            prem: { type: 'madera', qty: 50 * i, icon: '🌲' } // Relleno genérico
        });
    }
    return baseLevels;
}