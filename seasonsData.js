// seasonsData.js
console.log("seasonsData.js CARGADO - Biblioteca de Temporadas.");

const BATTLE_PASS_SEASONS = {
    
    // --- TEMPORADA 1: EL LANZAMIENTO ---
    "SEASON_1": {
        id: 1,
        name: "T1: EL AMANECER DE IBERIA",
        description: "Los primeros pasos hacia la conquista total.",
        
        // Aquí defines nivel a nivel. 
        // type: 'oro' | 'madera' | 'sellos' | 'fragmentos' | 'equipo' | 'xp_books'
        levels: [
            // LA CURVA DE ENGANCHE (Negociada)
            { lvl: 1,  req_xp: 0,    free: {type:'oro', qty:500, icon:'💰'},       prem: {type:'sellos', qty:1, icon:'💎'} },
            { lvl: 2,  req_xp: 500,  free: {type:'madera', qty:500, icon:'🌲'},    prem: {type:'xp_books', qty:5, icon:'📖'} },
            { lvl: 3,  req_xp: 1000, free: {type:'hierro', qty:200, icon:'⛓️'},     prem: {type:'fragmentos', id:'g_el_cid', qty:5, icon:'🧩'} }, // Héroe
            { lvl: 4,  req_xp: 1500, free: {type:'oro', qty:1000, icon:'💰'},      prem: {type:'oro', qty:10000, icon:'💰'} },
            { lvl: 5,  req_xp: 2000, free: {type:'sellos', qty:1, icon:'💎'},      prem: {type:'equipo', id:'rare_weapon_1', qty:1, icon:'⚔️'} }, // Equipo

            // NIVEL 6 al 10 (Mantenimiento)
            { lvl: 6,  req_xp: 2500, free: {type:'comida', qty:800, icon:'🌾'},    prem: {type:'piedra', qty:500, icon:'🗿'} },
            { lvl: 7,  req_xp: 3000, free: {type:'xp_books', qty:3, icon:'📖'},    prem: {type:'sellos', qty:10, icon:'💎'} },
            { lvl: 8,  req_xp: 3500, free: {type:'oro', qty:600, icon:'💰'},       prem: {type:'fragmentos', id:'g_viriato', qty:10, icon:'🧩'} },
            { lvl: 9,  req_xp: 4000, free: {type:'piedra', qty:300, icon:'🗿'},    prem: {type:'equipo', id:'rare_chest_1', qty:1, icon:'🛡️'} },
            { lvl: 10, req_xp: 4500, free: {type:'sellos', qty:2, icon:'💎'},      prem: {type:'sellos', qty:15, icon:'💎'} },
            
            // ... (Puedes añadir hasta el nivel 40 o 50 copiando y pegando) ...
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

// AUTO-RELLENO: Si tu lista manual es corta, esto la completa hasta el día 41
// Así no tienes que escribir 41 líneas si no quieres.
BATTLE_PASS_SEASONS["SEASON_1"].levels = generateFillerLevels(BATTLE_PASS_SEASONS["SEASON_1"].levels, 41);