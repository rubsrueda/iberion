// rewardsConfig.js
const REWARDS_CONFIG = {
    // --- PREMIO DIARIO (Daily Login) ---
    getDailyReward: function(playerLevel) {
        // Nivel bajo: Oro para empezar. Nivel alto: Sellos valiosos.
        if (playerLevel < 5) return { type: 'oro', qty: 200, label: "200 Oro" }; // Tu petición exacta
        if (playerLevel < 15) return { type: 'oro', qty: 500, label: "500 Oro" };
        if (playerLevel < 30) return { type: 'sellos', qty: 1, label: "1 Sello de Guerra" };
        return { type: 'sellos', qty: 2, label: "2 Sellos de Guerra" };
    },

    // --- POOL DE MISIONES DIARIAS ---
    // Cada día se seleccionan 3 al azar.
    // XP Pase: Ayuda a subir niveles del Pase de Batalla (1-41)
    // Oro: Ayuda a comprar en la tienda.
    DAILY_MISSIONS_POOL: [
        { id: 'win_1', desc: "Gana 1 Batalla (Cualquier modo)", target: 1, xp_reward: 500, gold_reward: 100, type: 'match_win' },
        { id: 'play_3_turns', desc: "Juega 10 Turnos en total", target: 10, xp_reward: 300, gold_reward: 50, type: 'turn_played' },
        { id: 'kill_5_units', desc: "Elimina 5 Regimientos Enemigos", target: 5, xp_reward: 400, gold_reward: 100, type: 'unit_kill' },
        { id: 'forge_item', desc: "Forja 1 Objeto de Equipo", target: 1, xp_reward: 600, gold_reward: 0, type: 'forge_item' },
        { id: 'spend_gold', desc: "Gasta 2000 Oro en partidas", target: 2000, xp_reward: 350, gold_reward: 50, type: 'gold_spent' },
        { id: 'recruit_units', desc: "Recluta 10 Regimientos", target: 10, xp_reward: 300, gold_reward: 50, type: 'units_recruited' },
        { id: 'capture_city', desc: "Conquista 1 Ciudad o Fortaleza", target: 1, xp_reward: 500, gold_reward: 150, type: 'city_captured' }
    ],

    // --- LOGROS DE CARRERA (Hitos a largo plazo) ---
    ACHIEVEMENTS: {
        'SLAYER_1': { id: 'SLAYER_1', title: "Iniciando la Purga", desc: "Elimina 50 regimientos enemigos", goal: 50, rewardType: 'oro', rewardQty: 1000 },
        'CONQUEROR_1': { id: 'CONQUEROR_1', title: "Señor de la Guerra", desc: "Gana 10 partidas", goal: 10, rewardType: 'sellos', rewardQty: 5 },
        'VETERAN_1': { id: 'VETERAN_1', title: "Comandante Experto", desc: "Llega al Nivel de Cuenta 5", goal: 5, rewardType: 'fragmentos', rewardQty: 20 }
    }
};