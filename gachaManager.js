// gachaManager.js
const GachaManager = {

    init: function() {
        const pools = {
            COMUN: [],
            RARO: [],
            EPICO: [],
            LEGENDARIO: []
        };
        for (const heroId in COMMANDERS) {
            const hero = COMMANDERS[heroId];
            const rarityKey = hero.rarity
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase();

            if (pools[rarityKey]) {
                pools[rarityKey].push(heroId);
            }
        }
        GACHA_CONFIG.HERO_POOLS_BY_RARITY = pools;
    },

    executeWish: function(bannerId, pullCount) {
        if (!PlayerDataManager.spendWarSeals(pullCount)) {
            return; 
        }

        const player = PlayerDataManager.getCurrentPlayer();
        const results = [];
        
        for (let i = 0; i < pullCount; i++) {
            player.gacha_state.pulls_since_last_epic++;
            player.gacha_state.pulls_since_last_legendary++;

            let result;

            if (player.gacha_state.pulls_since_last_legendary >= GACHA_CONFIG.PITY_LEGENDARY) {
                result = this._getReward('LEGENDARIO', bannerId);
                player.gacha_state.pulls_since_last_legendary = 0;
                player.gacha_state.pulls_since_last_epic = 0;
            } 
            else if (pullCount === 10 && player.gacha_state.pulls_since_last_epic >= GACHA_CONFIG.PITY_EPIC) {
                result = this._rollOnBanner(bannerId, true); 
                if (result.rarity === 'LEGENDARIO') {
                    player.gacha_state.pulls_since_last_legendary = 0;
                    player.gacha_state.pulls_since_last_epic = 0;
                } else {
                    player.gacha_state.pulls_since_last_epic = 0;
                }
            }
            else {
                result = this._rollOnBanner(bannerId, false);
                if (result.rarity === 'LEGENDARIO') {
                    player.gacha_state.pulls_since_last_legendary = 0;
                    player.gacha_state.pulls_since_last_epic = 0;
                } else if (result.rarity === 'EPICO') {
                    player.gacha_state.pulls_since_last_epic = 0;
                }
            }
            results.push(result);
        }
        
        // La lógica de aplicar resultados se ha movido a _getReward,
        // por lo que este bucle ya no es necesario aquí.
        // results.forEach(res => { ... });
        
        PlayerDataManager.saveCurrentPlayer();

        if (typeof showGachaResults === 'function') {
            startGachaAnimation(results);
        } else {
            console.error("La función para mostrar resultados de gacha no está definida todavía.");
        }
    },
    
    _rollOnBanner: function(bannerId, forceAtLeastEpic = false) {
        const odds = GACHA_CONFIG.COMMON_BANNER_ODDS;
        const roll = Math.random() * 100;
        
        let rarity;

        if (forceAtLeastEpic) {
            const epicOrLegendaryTotalOdds = odds.EPICO + odds.LEGENDARIO;
            const legendaryChanceInPity = (odds.LEGENDARIO / epicOrLegendaryTotalOdds) * 100;
            if (roll < legendaryChanceInPity) {
                rarity = 'LEGENDARIO';
            } else {
                rarity = 'EPICO';
            }
        } else {
            if (roll < odds.LEGENDARIO) rarity = 'LEGENDARIO';
            else if (roll < odds.LEGENDARIO + odds.EPICO) rarity = 'EPICO';
            else if (roll < odds.LEGENDARIO + odds.EPICO + odds.RARO) rarity = 'RARO';
            else rarity = 'COMUN';
        }

        // <<== CORRECCIÓN 1: Devolver (return) el resultado de la función.
        return this._getReward(rarity, bannerId); 
    },
    
    _getReward: function(rarity, bannerId) {
    // 1. Unificamos la rareza para evitar errores de acentos o mayúsculas
    const cleanRarity = rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); 
    // Ahora 'cleanRarity' será siempre: COMUN, RARO, EPICO o LEGENDARIO

    const typeRoll = Math.random() * 100;

    // 40% de probabilidad de dar fragmentos de FORJA (Equipo)
    if (typeRoll < 40) {
        const possibleEquips = Object.values(EQUIPMENT_DEFINITIONS).filter(e => 
            e.rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === cleanRarity
        );

        if (possibleEquips.length > 0) {
            const item = possibleEquips[Math.floor(Math.random() * possibleEquips.length)];
            let qty = 1;
            if (cleanRarity === "COMUN") qty = Math.floor(Math.random() * 3) + 3;
            else if (cleanRarity === "RARO") qty = Math.floor(Math.random() * 2) + 2;
            else if (cleanRarity === "EPICO") qty = Math.floor(Math.random() * 2) + 1;

            PlayerDataManager.addEquipmentFragments(item.id, qty);
            return { type: 'equipment_fragments', item: item, rarity: rarity, fragments: qty };
        }
    }

    // 60% (o si falla lo anterior) damos fragmentos de HÉROE
    const heroPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY[cleanRarity] || GACHA_CONFIG.HERO_POOLS_BY_RARITY.COMUN;
    const randomHeroId = heroPool[Math.floor(Math.random() * heroPool.length)];
    const fragments = GACHA_CONFIG.FRAGMENTS_PER_PULL[cleanRarity] ? GACHA_CONFIG.FRAGMENTS_PER_PULL[cleanRarity][0] : 10;

    PlayerDataManager.addFragmentsToHero(randomHeroId, fragments);
    return { type: 'fragments', heroId: randomHeroId, rarity: rarity, fragments: fragments };
}
};