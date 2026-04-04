// researchRewardsManager.js
// Sistema de recompensas de puntos de investigación por acciones clave
console.log("researchRewardsManager.js CARGADO");

/**
 * Configuración de puntos de investigación otorgados por cada acción.
 * Ajusta estos valores para balancear la progresión tecnológica.
 */
const RESEARCH_REWARDS = {
    hexExplored: 1,          // Cada casilla explorada (fog of war revelado por primera vez)
    ruinExplored: 1,        // Cada ruina explorada y saqueada
    unitSplit: 1,            // Cada división creada (split de unidad)
    structureBuilt: 1,       // Cada infraestructura creada (caminos, fuertes, etc)
    battleOccurred: 1,       // Cada batalla (combate entre unidades)
    bankTransaction: 1,      // Cada transacción con la banca (compra/venta de recursos)
    caravanTradeInterval: 1, // Cada 5 intercambios completados por caravanas
};

const RESEARCH_REWARDS_VERBOSE_LOGS = false;

/**
 * Manager principal para otorgar puntos de investigación.
 */
const ResearchRewardsManager = {
    _ensureResearchRewardsState: function() {
        if (!gameState.researchRewards) {
            gameState.researchRewards = {
                hexesExploredByPlayer: {},
                caravanTradeCountByPlayer: {}
            };
            return;
        }

        if (!gameState.researchRewards.hexesExploredByPlayer) {
            gameState.researchRewards.hexesExploredByPlayer = {};
        }

        if (!gameState.researchRewards.caravanTradeCountByPlayer) {
            gameState.researchRewards.caravanTradeCountByPlayer = {};
        }
    },
    /**
     * Inicializa el sistema de recompensas.
     * Debe llamarse al inicio del juego.
     */
    init: function() {
        // Inicializar contadores si no existen
        this._ensureResearchRewardsState();
        
        console.log("[ResearchRewards] Sistema de recompensas de investigación inicializado.");
    },

    /**
     * Otorga puntos de investigación a un jugador.
     * @param {number} playerId - ID del jugador
     * @param {number} amount - Cantidad de puntos a otorgar
     * @param {string} reason - Razón para el log
     */
    grantResearchPoints: function(playerId, amount, reason = "") {
        if (!gameState.playerResources[playerId]) {
            console.warn(`[ResearchRewards] Jugador ${playerId} no tiene recursos inicializados.`);
            return;
        }

        // Inicializar researchPoints si no existe
        if (typeof gameState.playerResources[playerId].researchPoints === 'undefined') {
            gameState.playerResources[playerId].researchPoints = 0;
        }

        gameState.playerResources[playerId].researchPoints += amount;
        
        const reasonText = reason ? ` (${reason})` : "";
        if (RESEARCH_REWARDS_VERBOSE_LOGS) {
            logMessage(`+${amount} 💡 Puntos de Investigación${reasonText}`, "event");
            console.log(`[ResearchRewards] J${playerId} recibe ${amount} puntos de investigación${reasonText}. Total: ${gameState.playerResources[playerId].researchPoints}`);
        }
        
        // Actualizar UI
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
    },

    /**
     * Recompensa por casilla explorada (fog of war).
     * Se llama desde updateFogOfWar cuando una casilla pasa de 'hidden' a 'visible'.
     * @param {number} playerId - ID del jugador que explora
     * @param {number} r - Fila del hex
     * @param {number} c - Columna del hex
     */
    onHexExplored: function(playerId, r, c) {
        this._ensureResearchRewardsState();
        // Inicializar el Set de hexes explorados si no existe
        const playerKey = `player${playerId}`;
        if (!gameState.researchRewards.hexesExploredByPlayer[playerKey]) {
            gameState.researchRewards.hexesExploredByPlayer[playerKey] = new Set();
        }

        const hexKey = `${r},${c}`;
        
        // Solo otorgar puntos si es la primera vez que este jugador ve este hex
        if (!gameState.researchRewards.hexesExploredByPlayer[playerKey].has(hexKey)) {
            gameState.researchRewards.hexesExploredByPlayer[playerKey].add(hexKey);
            this.grantResearchPoints(playerId, RESEARCH_REWARDS.hexExplored, "Casilla explorada");
        }
    },

    /**
     * Recompensa por ruina explorada.
     * Se llama desde _executeExploreRuins después de saquear la ruina.
     * @param {number} playerId - ID del jugador que explora
     */
    onRuinExplored: function(playerId) {
        this.grantResearchPoints(playerId, RESEARCH_REWARDS.ruinExplored, "Ruina explorada");
    },

    /**
     * Recompensa por división creada (split).
     * Se llama desde splitUnit después de crear la nueva unidad.
     * @param {number} playerId - ID del jugador que hace el split
     */
    onUnitSplit: function(playerId) {
        this.grantResearchPoints(playerId, RESEARCH_REWARDS.unitSplit, "División creada");
    },

    /**
     * Recompensa por estructura construida.
     * Se llama desde handleConfirmBuildStructure después de construir.
     * @param {number} playerId - ID del jugador que construye
     * @param {string} structureType - Tipo de estructura construida
     */
    onStructureBuilt: function(playerId, structureType) {
        this.grantResearchPoints(playerId, RESEARCH_REWARDS.structureBuilt, `Estructura: ${structureType}`);
    },

    /**
     * Recompensa por batalla ocurrida.
     * Se llama desde _finalizeBattleActions después de resolver el combate.
     * Ambos jugadores participantes reciben puntos.
     * @param {number} attackerId - ID del atacante
     * @param {number} defenderId - ID del defensor
     */
    onBattleOccurred: function(attackerId, defenderId) {
        this.grantResearchPoints(attackerId, RESEARCH_REWARDS.battleOccurred, "Batalla");
        if (defenderId && defenderId !== attackerId) {
            this.grantResearchPoints(defenderId, RESEARCH_REWARDS.battleOccurred, "Batalla");
        }
    },

    /**
     * Recompensa por transacción con la banca.
     * Se llama desde _executeTradeWithBank después de completar el intercambio.
     * @param {number} playerId - ID del jugador que comercia
     */
    onBankTransaction: function(playerId) {
        this.grantResearchPoints(playerId, RESEARCH_REWARDS.bankTransaction, "Transacción bancaria");
    },

    /**
     * Recompensa por intercambios de caravana.
     * Se llama desde updateTradeRoutes cuando una caravana completa un intercambio.
     * Otorga puntos cada 5 intercambios.
     * @param {number} playerId - ID del jugador dueño de la caravana
     */
    onCaravanTrade: function(playerId) {
        this._ensureResearchRewardsState();
        const playerKey = `player${playerId}`;
        
        // Inicializar contador si no existe
        if (typeof gameState.researchRewards.caravanTradeCountByPlayer[playerKey] === 'undefined') {
            gameState.researchRewards.caravanTradeCountByPlayer[playerKey] = 0;
        }

        gameState.researchRewards.caravanTradeCountByPlayer[playerKey]++;
        const count = gameState.researchRewards.caravanTradeCountByPlayer[playerKey];

        // Otorgar puntos cada 5 intercambios
        if (count % 5 === 0) {
            this.grantResearchPoints(playerId, RESEARCH_REWARDS.caravanTradeInterval, `${count} intercambios de caravana`);
        }
    },

    /**
     * Limpia los Sets para serialización (remueve Sets antes de guardar/enviar a red).
     * Los Sets no son serializables a JSON.
     */
    prepareForSerialization: function() {
        if (!gameState.researchRewards) return;

        // Convertir Sets a Arrays
        const hexesExplored = gameState.researchRewards.hexesExploredByPlayer;
        const serializable = {};
        
        for (const playerKey in hexesExplored) {
            if (hexesExplored[playerKey] instanceof Set) {
                serializable[playerKey] = Array.from(hexesExplored[playerKey]);
            }
        }
        
        gameState.researchRewards.hexesExploredByPlayer = serializable;
    },

    /**
     * Restaura los Sets después de deserialización.
     */
    restoreAfterDeserialization: function() {
        this._ensureResearchRewardsState();

        // Convertir Arrays de vuelta a Sets
        const hexesExplored = gameState.researchRewards.hexesExploredByPlayer;
        
        for (const playerKey in hexesExplored) {
            if (Array.isArray(hexesExplored[playerKey])) {
                hexesExplored[playerKey] = new Set(hexesExplored[playerKey]);
            }
        }
    }
};

// Auto-inicializar cuando se carga el script
if (typeof gameState !== 'undefined') {
    ResearchRewardsManager.init();
}
