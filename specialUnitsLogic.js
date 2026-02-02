/**
 * specialUnitsLogic.js
 * Lógica para unidades especiales: Exploradores (Espionaje) y Pueblos
 */

const SpecialUnitsLogic = {
    /**
     * EXPLORADORES - Mecánica Dual
     */
    
    /**
     * Cambia el modo de un explorador entre Exploración y Espionaje
     */
    toggleScoutMode: function(unit) {
        if (!unit || !REGIMENT_TYPES[unit.regiments[0]?.type]?.isScout) {
            console.warn('[SpecialUnitsLogic] No es un explorador válido');
            return false;
        }
        
        const newMode = !unit.spyMode;
        unit.spyMode = newMode;
        
        // Cambiar visión según el modo
        if (newMode) {
            console.log(`[SpecialUnitsLogic] ${unit.name} cambió a MODO ESPÍA - invisible a enemigos (rango 3)`);
            // En modo espía: invisibilidad relativa, pero revela detalles de tropas
            unit.isInvisibleToEnemies = true;
            unit.revealsEnemyDetails = true;
        } else {
            console.log(`[SpecialUnitsLogic] ${unit.name} cambió a MODO EXPLORACIÓN - revela niebla`);
            unit.isInvisibleToEnemies = false;
            unit.revealsEnemyDetails = false;
        }
        
        return true;
    },
    
    /**
     * Verifica si dos exploradores enemigos en la misma casilla se anulan/detectan
     */
    checkScoutCounterDetection: function(r, c) {
        const unitsAtHex = units.filter(u => u.r === r && u.c === c && u.currentHealth > 0);
        const scouts = unitsAtHex.filter(u => REGIMENT_TYPES[u.regiments[0]?.type]?.isScout);
        
        if (scouts.length < 2) return null;
        
        // Agrupar por jugador
        const scoutsByPlayer = {};
        scouts.forEach(scout => {
            const playerId = scout.playerId ?? scout.player;
            if (!scoutsByPlayer[playerId]) {
                scoutsByPlayer[playerId] = [];
            }
            scoutsByPlayer[playerId].push(scout);
        });
        
        // Si hay exploradores de equipos enemigos
        const playerIds = Object.keys(scoutsByPlayer);
        if (playerIds.length >= 2) {
            console.log(`[SpecialUnitsLogic] ¡DETECCIÓN DE ESPÍAS! Hay exploradores enemigos en (${r}, ${c})`);
            
            // Retornar los exploradores detectados para aplicar daño mutuo
            return {
                detected: true,
                scouts: scouts,
                message: "¡Los espías fueron detectados mutuamente!"
            };
        }
        
        return null;
    },
    
    /**
     * Impide que exploradores en modo espía combatan con otros soldados
     */
    canScoutAttackTarget: function(attacker, defender) {
        const attackerIsScout = REGIMENT_TYPES[attacker.regiments[0]?.type]?.isScout;
        const defenderIsScout = REGIMENT_TYPES[defender.regiments[0]?.type]?.isScout;
        
        // Los exploradores SOLO pueden atacar/ser atacados por otros exploradores
        if (attackerIsScout) {
            if (!defenderIsScout) {
                return { canAttack: false, reason: "Los exploradores solo pueden atacar a otros exploradores" };
            }
            return { canAttack: true };
        }
        
        // Las unidades normales NO pueden atacar exploradores en modo espía
        if (defenderIsScout && defender.spyMode) {
            return { canAttack: false, reason: "El explorador en modo espía es invisible" };
        }
        
        return { canAttack: true };
    },
    
    /**
     * PUEBLOS - Unidad Defensiva con Capacidad Paralela
     */
    
    /**
     * Calcula el Unit Cap TOTAL incluyendo Pueblos
     * Los Pueblos DUPLICAN la capacidad (suma en paralelo)
     */
    calculateTotalUnitCap: function(playerId) {
        const standardCap = typeof LedgerManager !== 'undefined' 
            ? LedgerManager._calculateSupplyLimit(playerId)
            : 0;
        
        // Contar Pueblos
        let villagerCount = 0;
        units.forEach(unit => {
            const unitPlayer = unit.playerId ?? unit.player;
            const isVillager = unit.regiments?.some(r => REGIMENT_TYPES[r.type]?.isVillager);
            
            if (unitPlayer === playerId && isVillager && unit.currentHealth > 0) {
                // Cada regimiento de Pueblo cuenta como capacidad
                const villagerRegiments = unit.regiments.filter(r => REGIMENT_TYPES[r.type]?.isVillager);
                villagerCount += villagerRegiments.reduce((sum, r) => sum + (r.count || 1), 0);
            }
        });
        
        // Los Pueblos tienen su propio límite de capacidad (en paralelo)
        const villagerCap = villagerCount; // Simplemente contar cuántos pueblos hay
        
        console.log(`[SpecialUnitsLogic] Unit Cap: Standard=${standardCap}, Villagers=${villagerCap}`);
        
        return {
            standard: standardCap,
            villagers: villagerCap,
            total: standardCap + villagerCap
        };
    },
    
    /**
     * Valida si un Pueblo puede moverse (solo en hexágonos propios)
     */
    canVillagerMove: function(unit, fromR, fromC, toR, toC) {
        if (!unit || !unit.regiments?.some(r => REGIMENT_TYPES[r.type]?.isVillager)) {
            return { canMove: true }; // No es un pueblo
        }
        
        const destHex = board[toR]?.[toC];
        const isOwnTerritory = destHex?.owner === (unit.playerId ?? unit.player);
        
        if (!isOwnTerritory) {
            return { 
                canMove: false, 
                reason: "Los Pueblos solo pueden moverse en territorio propio" 
            };
        }
        
        return { canMove: true };
    },
    
    /**
     * Validar que pueblos NO pueden atacar primero (solo defender)
     */
    canVillagerAttack: function(unit, isInitiator = false) {
        if (!unit || !unit.regiments?.some(r => REGIMENT_TYPES[r.type]?.isVillager)) {
            return { canAttack: true }; // No es un pueblo
        }
        
        if (isInitiator) {
            return { 
                canAttack: false, 
                reason: "Los Pueblos son únicamente defensivos y no pueden iniciar combate" 
            };
        }
        
        return { canAttack: true }; // Puede defender
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.SpecialUnitsLogic = SpecialUnitsLogic;
}
