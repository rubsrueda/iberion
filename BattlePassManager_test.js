// BattlePassManager_test.js - Versión minimalista de prueba

console.log("[BattlePassManager_test] Iniciando carga...");

const BattlePassManager = {
    currentSeason: null,
    userProgress: null,
    dailyMissions: [],
    currentTab: 'rewards',
    
    open: async function() {
        console.log("[BattlePassManager] open() llamado");
        console.log("Modal elemento:", document.getElementById('battlePassModal'));
    },
    
    switchTab: function(tabName) {
        console.log("[BattlePassManager] switchTab():", tabName);
        this.currentTab = tabName;
    }
};

console.log("[BattlePassManager_test] Objeto definido correctamente");
console.log("typeof BattlePassManager:", typeof BattlePassManager);
