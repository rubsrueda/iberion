console.log("🔴 CARGANDO BattlePassManager_simple.js - VERSIÓN SIMPLE");
window.BattlePassManagerLoaded = true;
const BattlePassManager = {
    version: "SIMPLE_TEST_VERSION",
    open: async function() {
        console.log("🟢 BattlePassManager.open() called - SIMPLE VERSION");
    },
    switchTab: function(tab) {
        console.log("🟢 BattlePassManager.switchTab():", tab, "- SIMPLE VERSION");
    }
};
console.log("🔴 ✅ BattlePassManager loaded successfully - SIMPLE VERSION");
