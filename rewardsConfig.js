// rewardsConfig.js
const REWARDS_CONFIG = {
    // Logros de carrera
    ACHIEVEMENTS: {
        'SLAYER_1': { id: 'SLAYER_1', title: "Iniciando la Purga", desc: "Elimina 50 regimientos enemigos", goal: 50, rewardType: 'oro', rewardQty: 1000 },
        'CONQUEROR_1': { id: 'CONQUEROR_1', title: "Señor de la Guerra", desc: "Gana 10 partidas", goal: 10, rewardType: 'sellos', rewardQty: 5 },
        'VETERAN_1': { id: 'VETERAN_1', title: "Comandante Experto", desc: "Llega al Nivel de Cuenta 5", goal: 5, rewardType: 'fragmentos', rewardQty: 20 }
    },

    // Premios diarios basados en el nivel
    getDailyReward: function(playerLevel) {
        if (playerLevel < 5) return { type: 'oro', qty: 200, label: "200 de Oro" };
        if (playerLevel < 10) return { type: 'oro', qty: 500, label: "500 de Oro" };
        return { type: 'sellos', qty: 1, label: "1 Sello de Guerra" };
    }
};
