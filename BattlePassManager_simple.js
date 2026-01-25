window.BattlePassManagerLoaded = true;
const BattlePassManager = {
    open: async function() {
        console.log("BattlePassManager.open() called");
    },
    switchTab: function(tab) {
        console.log("BattlePassManager.switchTab():", tab);
    }
};
console.log("BattlePassManager loaded successfully");
