// gachaManager.js
console.log("gachaManager.js CARGADO - Motor del sistema de Deseos listo.");

const GachaManager = {

    init: function() {
        console.log("GachaManager: Inicializando pools de héroes...");
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
        console.log("Gacha Hero Pools inicializados con éxito.", GACHA_CONFIG.HERO_POOLS_BY_RARITY);
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
                console.log("%c[PITY SYSTEM] ¡Legendario garantizado!", "color: gold; font-weight: bold;");
                result = this._getReward('LEGENDARIO', bannerId);
                player.gacha_state.pulls_since_last_legendary = 0;
                player.gacha_state.pulls_since_last_epic = 0;
            } 
            else if (pullCount === 10 && player.gacha_state.pulls_since_last_epic >= GACHA_CONFIG.PITY_EPIC) {
                console.log("%c[PITY SYSTEM] ¡Épico garantizado en tirada de 10!", "color: mediumpurple; font-weight: bold;");
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

        console.log(`[Gacha Roll] Tirada: ${roll.toFixed(2)} | Odds: L=${odds.LEGENDARIO}, E=${odds.EPICO}, R=${odds.RARO}, C=${odds.COMUN}`);
        
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
        // Probabilidad reducida para equipo
        const rewardTypeRoll = Math.random() * 100;
        const EQUIPMENT_CHANCE = 30; // Mantenemos la probabilidad baja

        if (rewardTypeRoll < EQUIPMENT_CHANCE) {
            const possibleItems = Object.values(EQUIPMENT_DEFINITIONS).filter(item => item.rarity === rarity);
            if (possibleItems.length > 0) {
                const droppedItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                
                // <<== LÓGICA DE FRAGMENTOS ==>>
                // Determinar cuántos fragmentos dar. Menos para rarezas altas.
                let fragmentsAmount = 1;
                if (rarity === "Común") fragmentsAmount = Math.floor(Math.random() * 3) + 3; // 3-5 fragmentos
                else if (rarity === "Raro") fragmentsAmount = Math.floor(Math.random() * 2) + 2;  // 2-3 fragmentos
                else if (rarity === "Épico") fragmentsAmount = Math.floor(Math.random() * 2) + 1;  // 1-2 fragmentos
                else if (rarity === "Legendario") fragmentsAmount = 1; // 1 fragmento
                
                // Llamar a la función del PlayerDataManager para añadir los fragmentos
                PlayerDataManager.addEquipmentFragments(droppedItem.id, fragmentsAmount);

                return { type: 'equipment_fragments', item: droppedItem, rarity: rarity, fragments: fragmentsAmount };
            }
        }
        
        // ... (la lógica para fragmentos de héroe se mantiene exactamente igual)
        const heroPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY[rarity];
        if (!heroPool || heroPool.length === 0) { 
            const fallbackPool = GACHA_CONFIG.HERO_POOLS_BY_RARITY.COMUN;
            const heroId = fallbackPool[0];
            const fragments = GACHA_CONFIG.FRAGMENTS_PER_PULL.COMUN[0];
            PlayerDataManager.addFragmentsToHero(heroId, fragments);
            return { type: 'fragments', heroId, rarity: "COMUN", fragments };
        }
        
        const randomHeroId = heroPool[Math.floor(Math.random() * heroPool.length)];
        const fragmentPool = GACHA_CONFIG.FRAGMENTS_PER_PULL[rarity];
        const randomFragments = fragmentPool[Math.floor(Math.random() * fragmentPool.length)];

        PlayerDataManager.addFragmentsToHero(randomHeroId, randomFragments);
        return { type: 'fragments', heroId: randomHeroId, rarity: rarity, fragments: randomFragments };
    },
};