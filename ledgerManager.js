/**
 * ledgerManager.js
 * Gestor del "Cuaderno de Estado" durante la partida
 * Proporciona métodos para obtener datos y actualizar vistas
 */

console.log('%c🔥🔥🔥 LEDGER MANAGER CARGADO 🔥🔥🔥', 'background: red; color: yellow; font-size: 20px; padding: 10px;');
console.log('[ledgerManager.js] Archivo cargado en:', new Date().toISOString());

const LedgerManager = {
    isOpen: false,
    currentTab: 'resumen', // resumen, demografia, militar, economia

    /**
     * Abre el cuaderno de estado
     */
    open: function() {
        console.log('%c[LedgerManager.open] 🟢 INICIANDO APERTURA DEL CUADERNO', 'background: lime; color: black; font-size: 16px; padding: 5px;');
        console.log('[LedgerManager.open] Estado actual isOpen:', this.isOpen);
        this.isOpen = true;
        console.log('[LedgerManager.open] isOpen ahora es:', this.isOpen);
        
        console.log('[LedgerManager.open] Buscando modal con ID "ledgerModal"...');
        const modal = document.getElementById('ledgerModal');
        console.log('[LedgerManager.open] Modal encontrado:', modal);
        console.log('[LedgerManager.open] Modal es null?', modal === null);
        if (!modal) {
            console.error('%c[LedgerManager.open] ❌ FATAL: Modal #ledgerModal no existe en HTML', 'background: red; color: white; font-size: 16px; padding: 5px;');
            console.error('[LedgerManager.open] Verifica que index.html incluye ledgerUI.js');
            return;
        }
        
        console.log('[LedgerManager.open] Modal encontrado. Aplicando estilos FORZADOS...');
        console.log('[LedgerManager.open] Display ANTES:', modal.style.display);
        console.log('[LedgerManager.open] Computed style ANTES:', window.getComputedStyle(modal).display);
        
        // MÉTODO NUCLEAR: Reescribir TODOS los estilos con !important
        // Ignoramos completamente cualquier CSS global
        modal.setAttribute('style', `
            display: flex !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 99999 !important;
            justify-content: center !important;
            align-items: center !important;
            background: rgba(0,0,0,0.95) !important;
            overflow: auto !important;
        `);
        
        console.log('%c[LedgerManager.open] ✅ ESTILOS APLICADOS', 'background: green; color: white; font-size: 14px; padding: 5px;');
        console.log('[LedgerManager.open] Display DESPUÉS:', modal.style.display);
        console.log('[LedgerManager.open] Position DESPUÉS:', modal.style.position);
        console.log('[LedgerManager.open] Z-index DESPUÉS:', modal.style.zIndex);
        console.log('[LedgerManager.open] Computed display DESPUÉS:', window.getComputedStyle(modal).display);
        console.log('[LedgerManager.open] OffsetWidth:', modal.offsetWidth);
        console.log('[LedgerManager.open] OffsetHeight:', modal.offsetHeight);
        
        // Actualizar pantallas si LedgerUI está disponible
        console.log('[LedgerManager.open] Verificando LedgerUI...');
        console.log('[LedgerManager.open] LedgerUI definido?', typeof LedgerUI !== 'undefined');
        if (typeof LedgerUI !== 'undefined') {
            console.log('[LedgerManager.open] ✅ LedgerUI disponible, actualizando pantallas...');
            this.updateAllDisplays();
        } else {
            console.warn('[LedgerManager.open] ⚠️ LedgerUI no está disponible');
        }
        console.log('%c[LedgerManager.open] 🎉 APERTURA COMPLETADA', 'background: lime; color: black; font-size: 16px; padding: 5px;');
    },

    /**
     * Cierra el cuaderno
     */
    close: function() {
        console.log('[LedgerManager] Cerrando cuaderno de estado...');
        this.isOpen = false;
        
        const modal = document.getElementById('ledgerModal');
        if (modal) {
            modal.setAttribute('style', 'display: none !important;');
            console.log('[LedgerManager] ✅ Cuaderno cerrado');
        }
    },

    /**
     * Cambia de pestaña
     */
    switchTab: function(tabName) {
        if (['resumen', 'demografia', 'militar', 'economia'].includes(tabName)) {
            this.currentTab = tabName;
            this.updateAllDisplays();
        }
    },

    /**
     * Actualiza todas las vistas del cuaderno
     */
    updateAllDisplays: function() {
        if (!this.isOpen || typeof LedgerUI === 'undefined') return;
        
        switch(this.currentTab) {
            case 'resumen':
                this._updateResumenNacional();
                break;
            case 'demografia':
                this._updateDemografia();
                break;
            case 'militar':
                this._updateMilitar();
                break;
            case 'economia':
                this._updateEconomia();
                break;
        }
    },

    /**
     * PESTAÑA 1: RESUMEN NACIONAL (El "Outliner")
     */
    _updateResumenNacional: function() {
        const myPlayerId = gameState.myPlayerNumber;
        const myStats = StatTracker.getPlayerStats(myPlayerId);
        
        if (!myStats) return;

        const resumen = {
            tesoreria: {
                ingresos: this._calculateIncomeThisTurn(myPlayerId),
                gastos: this._calculateExpensesThisTurn(myPlayerId),
                balance: this._calculateIncomeThisTurn(myPlayerId) - this._calculateExpensesThisTurn(myPlayerId),
                oro: myStats.gold
            },
            capacidadMilitar: {
                regimentosActivos: myStats.militaryUnits,
                limiteSuministros: this._calculateSupplyLimit(myPlayerId),
                porcentajeUso: Math.floor((myStats.militaryUnits / this._calculateSupplyLimit(myPlayerId)) * 100)
            },
            estabilidad: {
                corrupcion: this._calculateCorruptionLevel(myPlayerId),
                ordenPublico: 100 - this._calculateCorruptionLevel(myPlayerId),
                nivelEstabilidad: this._assessStability(myPlayerId)
            },
            recursosEstrategicos: {
                hierro: gameState.playerResources?.[myPlayerId]?.hierro || 0,
                madera: gameState.playerResources?.[myPlayerId]?.madera || 0,
                comida: gameState.playerResources?.[myPlayerId]?.comida || 0,
                piedra: gameState.playerResources?.[myPlayerId]?.piedra || 0
            }
        };

        LedgerUI.displayResumenNacional(resumen);
    },

    /**
     * PESTAÑA 2: DEMOGRAFÍA (Comparativa - Estilo Civ4)
     */
    _updateDemografia: function() {
        const ranking = StatTracker.getRanking('score');
        const myPlayerId = gameState.myPlayerNumber;
        
        const tabla = ranking.map((player, index) => ({
            rango: index + 1,
            playerId: player.playerId,
            civilization: player.civilization,
            isMe: player.playerId === myPlayerId,
            score: player.score,
            power: player.militaryPower + player.navyPower,
            gold: player.gold,
            territory: player.territory,
            cities: player.cities,
            population: player.population
        }));

        LedgerUI.displayDemografia(tabla);
    },

    /**
     * PESTAÑA 3: MILITAR (Desglose Táctico)
     */
    _updateMilitar: function() {
        const myPlayerId = gameState.myPlayerNumber;
        const myUnits = units.filter(u => u.playerId === myPlayerId && !u.isDefeated);
        
        const tierra = [];
        const naval = [];
        let manpower = 0;

        myUnits.forEach(unit => {
            const unitInfo = {
                id: unit.id,
                name: unit.name || `Unidad ${unit.id}`,
                type: unit.type,
                location: { r: unit.r, c: unit.c },
                morale: unit.morale || 100,
                regiments: unit.regiments?.length || 0,
                health: unit.health || 100,
                supplies: unit.supplies || 100,
                isDisorganized: unit.isDisorganized || false
            };

            if (unit.type === 'naval') {
                naval.push(unitInfo);
            } else {
                tierra.push(unitInfo);
            }

            // Contar reclutas en reserva
            manpower += unit.regiments?.length || 0;
        });

        const militar = {
            tierra: tierra,
            naval: naval,
            manpower: manpower,
            supplyStatus: this._assessSupplyStatus(myPlayerId)
        };

        LedgerUI.displayMilitar(militar);
    },

    /**
     * PESTAÑA 4: ECONOMÍA (Libro de Cuentas)
     */
    _updateEconomia: function() {
        const myPlayerId = gameState.myPlayerNumber;
        
        const ingresos = {
            impuestos: this._calculateTaxes(myPlayerId),
            comercio: this._calculateTrade(myPlayerId),
            saqueos: this._calculateRaids(myPlayerId),
            tratados: this._calculateTreaties(myPlayerId),
            total: 0
        };
        ingresos.total = ingresos.impuestos + ingresos.comercio + ingresos.saqueos + ingresos.tratados;

        const gastos = {
            edificios: this._calculateBuildingMaintenance(myPlayerId),
            ejercito: this._calculateArmyUpkeep(myPlayerId),
            corrupcion: this._calculateCorruptionCost(myPlayerId),
            total: 0
        };
        gastos.total = gastos.edificios + gastos.ejercito + gastos.corrupcion;

        const economia = {
            ingresos: ingresos,
            gastos: gastos,
            balance: ingresos.total - gastos.total,
            oroActual: gameState.playerResources?.[myPlayerId]?.oro || 0,
            desglosePorcentual: {
                impuestos: Math.floor((ingresos.impuestos / (ingresos.total || 1)) * 100),
                comercio: Math.floor((ingresos.comercio / (ingresos.total || 1)) * 100),
                saqueos: Math.floor((ingresos.saqueos / (ingresos.total || 1)) * 100)
            }
        };

        LedgerUI.displayEconomia(economia);
    },

    // === MÉTODOS DE CÁLCULO (privados) ===

    _calculateIncomeThisTurn: function(playerId) {
        return (this._calculateTaxes(playerId) + this._calculateTrade(playerId)) || 0;
    },

    _calculateExpensesThisTurn: function(playerId) {
        return (this._calculateArmyUpkeep(playerId) + this._calculateBuildingMaintenance(playerId)) || 0;
    },

    _calculateSupplyLimit: function(playerId) {
        let limit = 10; // Base
        
        // Contar metrópolis y fortalezas
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]?.owner === playerId) {
                    if (board[r][c]?.structure?.type === 'metropolis') {
                        limit += 15;
                    } else if (board[r][c]?.structure?.type === 'fortress') {
                        limit += 10;
                    } else if (board[r][c]?.structure?.type === 'city') {
                        limit += 5;
                    }
                }
            }
        }
        
        return limit;
    },

    _calculateCorruptionLevel: function(playerId) {
        // Simulación: corrupción basada en falta de carreteras
        let corruption = 0;
        let hexesWithoutRoads = 0;
        let totalHexes = 0;

        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]?.owner === playerId) {
                    totalHexes++;
                    if (!board[r][c]?.hasRoad) {
                        hexesWithoutRoads++;
                    }
                }
            }
        }

        corruption = totalHexes > 0 ? Math.floor((hexesWithoutRoads / totalHexes) * 20) : 0;
        return Math.min(corruption, 50);
    },

    _assessStability: function(playerId) {
        const corruption = this._calculateCorruptionLevel(playerId);
        if (corruption > 40) return 'Muy Baja';
        if (corruption > 25) return 'Baja';
        if (corruption > 10) return 'Media';
        return 'Alta';
    },

    _calculateTaxes: function(playerId) {
        let taxes = 0;
        const cityCount = units.filter(u => u.playerId === playerId && u.type === 'city').length;
        taxes = cityCount * 50; // 50 oro por ciudad
        return taxes;
    },

    _calculateTrade: function(playerId) {
        // Aproximado: contar caravanas activas
        const caravans = units.filter(u => u.playerId === playerId && u.type === 'caravan');
        return caravans.length * 30;
    },

    _calculateRaids: function(playerId) {
        // Se obtendría del histórico de saqueos
        return 0; // Placeholder
    },

    _calculateTreaties: function(playerId) {
        // Se obtendría de alianzas/tratados
        return 0; // Placeholder
    },

    _calculateBuildingMaintenance: function(playerId) {
        let cost = 0;
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c]?.owner === playerId && board[r][c]?.structure) {
                    cost += board[r][c].structure.maintenanceCost || 5;
                }
            }
        }
        return cost;
    },

    _calculateArmyUpkeep: function(playerId) {
        let cost = 0;
        units.forEach(unit => {
            if (unit.playerId === playerId && !unit.isDefeated) {
                cost += (unit.regiments?.length || 0) * 2; // 2 oro por regimiento
            }
        });
        return cost;
    },

    _calculateCorruptionCost: function(playerId) {
        const corruptionLevel = this._calculateCorruptionLevel(playerId);
        return Math.floor(corruptionLevel * 3); // Costo de corrupción
    },

    _assessSupplyStatus: function(playerId) {
        const activeUnits = units.filter(u => u.playerId === playerId && !u.isDefeated).length;
        const limit = this._calculateSupplyLimit(playerId);
        const percentage = (activeUnits / limit) * 100;

        if (percentage > 90) return 'CRÍTICO';
        if (percentage > 70) return 'Elevado';
        if (percentage > 50) return 'Normal';
        return 'Bajo';
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LedgerManager = LedgerManager;
}
