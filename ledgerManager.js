/**
 * ledgerManager.js
 * Gestor del "Cuaderno de Estado" durante la partida
 * Proporciona métodos para obtener datos y actualizar vistas
 */

console.log('[ledgerManager.js] Archivo cargado en:', new Date().toISOString());

const LedgerManager = {
    isOpen: false,
    currentTab: 'resumen', // resumen, demografia, militar, economia, cronica, comercio

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
        if (['resumen', 'demografia', 'militar', 'economia', 'cronica', 'comercio'].includes(tabName)) {
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
            case 'cronica':
                this._updateCronica();
                break;
            case 'comercio':
                this._updateComercio();
                break;
        }
    },

    _getTradePairKey: function(a, b) {
        if (!a || !b) return null;
        const aKey = Number.isInteger(a.r) && Number.isInteger(a.c) ? `${a.r},${a.c}` : a.name;
        const bKey = Number.isInteger(b.r) && Number.isInteger(b.c) ? `${b.r},${b.c}` : b.name;
        return [aKey, bKey].sort().join('|');
    },

    _getTradeValueForCity: function(cityLike) {
        const hex = board?.[cityLike?.r]?.[cityLike?.c];
        if (!hex) return 1;
        if (hex.isCapital) return STRUCTURE_TYPES.Ciudad?.tradeValue || 10;
        if (hex.structure && STRUCTURE_TYPES[hex.structure]?.tradeValue) {
            return STRUCTURE_TYPES[hex.structure].tradeValue;
        }
        if (hex.isCity) return STRUCTURE_TYPES.Aldea?.tradeValue || 5;
        return 1;
    },

    _isTradeUnitOperational: function(unit) {
        if (!unit?.tradeRoute?.origin || !unit?.tradeRoute?.destination) return false;
        const routePath = unit.tradeRoute.path;
        return Array.isArray(routePath) && routePath.length > 0;
    },

    _getPlayerTradeUnits: function(playerId) {
        return units.filter(unit => {
            const unitPlayer = unit.playerId ?? unit.player;
            return unitPlayer === playerId && !!unit.tradeRoute;
        });
    },

    // Compatibilidad retroactiva: algunas rutas antiguas del código aún invocan este método.
    _getOperationalTradeUnits: function(playerId) {
        return this._getPlayerTradeUnits(playerId).filter(unit => this._isTradeUnitOperational(unit));
    },

    /**
     * PESTAÑA: COMERCIO – Rutas usadas y pares disponibles
     */
    _updateComercio: function() {
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;

        // Obtener rutas activas pertenecientes al jugador (incluye caravanas en proceso)
        const activeUnits = this._getPlayerTradeUnits(myPlayerId);

        const activeKeys = new Set();
        const activeRoutes = activeUnits.map(u => {
            const origin = u.tradeRoute.origin;
            const destination = u.tradeRoute.destination;
            if (!origin || !destination) return null;
            const key = this._getTradePairKey(origin, destination);
            if (key) activeKeys.add(key);
            return {
                unitId: u.id,
                unitName: u.name,
                originName: origin.name || `${origin.r},${origin.c}`,
                destinationName: destination.name || `${destination.r},${destination.c}`,
                goldCarried: u.tradeRoute.goldCarried,
                cargoCapacity: u.tradeRoute.cargoCapacity,
                pathLength: Array.isArray(u.tradeRoute.path) ? u.tradeRoute.path.length : (u.tradeRoute.pathData ? u.tradeRoute.pathData.length : null),
                isOperational: this._isTradeUnitOperational(u)
            };
        }).filter(Boolean);

        // Obtener todas las ciudades del jugador
        const playerCities = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (hex && hex.owner === myPlayerId && hex.isCity) {
                    playerCities.push({ r, c, name: hex.name || `${r},${c}` });
                }
            }
        }

        // Función para comprobar conectividad vía carreteras entre dos ciudades
        const areCitiesConnected = (a, b) => {
            const path = typeof findInfrastructurePath === 'function'
                ? findInfrastructurePath(a, b, { allowForeignInfrastructure: true })
                : null;
            return Array.isArray(path) && path.length > 0;
        };

        // Generar pares disponibles
        const freeRoutes = [];
        for (let i = 0; i < playerCities.length; i++) {
            for (let j = i + 1; j < playerCities.length; j++) {
                const a = playerCities[i];
                const b = playerCities[j];
                const key = this._getTradePairKey(a, b);
                if (activeKeys.has(key)) continue; // ya en uso
                const connected = areCitiesConnected(a, b);
                freeRoutes.push({ aName: a.name, bName: b.name, isConnected: connected });
            }
        }

        const comercio = {
            activeCount: activeRoutes.length,
            activeRoutes: activeRoutes,
            freeCount: freeRoutes.length,
            freeRoutes: freeRoutes
        };

        LedgerUI.displayComercio(comercio);
    },

    /**
     * Intenta iniciar una ruta comercial entre dos ciudades (por nombre/coord string).
     * Busca una unidad válida en la ciudad origen, calcula el camino y llama a _executeEstablishTradeRoute.
     */
    startTradeRoute: function(aName, bName) {
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;
        if (!aName || !bName) return false;

        // Resolver ciudades por nombre o por coordenadas "r,c"
        const parseOrFind = (label) => {
            // intentar por nombre
            let city = gameState.cities.find(c => c.name === label && c.owner === myPlayerId);
            if (city) return city;
            // intentar parsear 'r,c'
            const parts = label.split(',').map(s => s.trim());
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const r = parseInt(parts[0], 10), c = parseInt(parts[1], 10);
                city = gameState.cities.find(ci => ci.r === r && ci.c === c && ci.owner === myPlayerId);
                if (city) return city;
            }
            return null;
        };

        const origin = parseOrFind(aName);
        const dest = parseOrFind(bName);
        if (!origin || !dest) {
            logMessage('No se encontraron las ciudades origen/destino para iniciar la ruta.', 'warning');
            if (typeof showToast === 'function') showToast('No se encontraron las ciudades origen/destino.', 'warning', 3500);
            if (typeof Chronicle !== 'undefined' && typeof Chronicle.logEvent === 'function') {
                Chronicle.logEvent('trade_route_failed', { reason: 'cities_not_found', aName: aName, bName: bName, player: myPlayerId });
            }
            return false;
        }

        // Buscar unidad candidata en origen
        let candidate = units.find(u => (u.playerId ?? u.player) === myPlayerId && u.r === origin.r && u.c === origin.c && !u.tradeRoute && u.regiments?.some(reg => (REGIMENT_TYPES[reg.type].abilities || []).includes('provide_supply')));
        if (!candidate) {
            // fallback: cualquier unidad sin ruta en la ciudad
            candidate = units.find(u => (u.playerId ?? u.player) === myPlayerId && u.r === origin.r && u.c === origin.c && !u.tradeRoute);
        }

        if (!candidate) {
            logMessage('No hay unidades válidas en la ciudad origen para iniciar la ruta.', 'warning');
            if (typeof showToast === 'function') showToast('No hay unidades válidas en la ciudad origen.', 'warning', 3500);
            if (typeof Chronicle !== 'undefined' && typeof Chronicle.logEvent === 'function') {
                Chronicle.logEvent('trade_route_failed', { reason: 'no_unit_available', origin: origin?.name || `${origin?.r},${origin?.c}`, player: myPlayerId });
            }
            return false;
        }

        // Determinar si es naval
        const isNaval = candidate.regiments?.some(reg => REGIMENT_TYPES[reg.type]?.is_naval === true);

        // Calcular path usando las mismas utilidades que requestEstablishTradeRoute
        let path = null;
        if (isNaval) {
            path = typeof traceNavalPath === 'function' ? traceNavalPath(candidate, { r: candidate.r, c: candidate.c }, dest) : null;
        } else {
            path = typeof findInfrastructurePath === 'function'
                ? findInfrastructurePath(origin, dest, { allowForeignInfrastructure: true })
                : null;
        }

        if (!path || path.length === 0) {
            logMessage('No se pudo calcular un camino válido para la ruta.', 'warning');
            if (typeof showToast === 'function') showToast('No se pudo calcular un camino válido para la ruta.', 'warning', 3500);
            if (typeof Chronicle !== 'undefined' && typeof Chronicle.logEvent === 'function') {
                Chronicle.logEvent('trade_route_failed', { reason: 'no_path', origin: origin?.name, destination: dest?.name, unitId: candidate?.id, player: myPlayerId });
            }
            return false;
        }

        // Ejecutar establecimiento de ruta
        if (typeof _executeEstablishTradeRoute === 'function') {
            _executeEstablishTradeRoute({ unitId: candidate.id, origin: origin, destination: dest, path: path });
            logMessage(`Ruta iniciada: ${origin.name} → ${dest.name}`, 'success');
            if (typeof showToast === 'function') showToast(`Ruta iniciada: ${origin.name} → ${dest.name}`, 'success', 3000);
            if (typeof Chronicle !== 'undefined' && typeof Chronicle.logEvent === 'function') {
                Chronicle.logEvent('trade_route_started', {
                    player: myPlayerId,
                    unitId: candidate.id,
                    unitName: candidate.name,
                    origin: { r: origin.r, c: origin.c, name: origin.name },
                    destination: { r: dest.r, c: dest.c, name: dest.name }
                });
            }
            return true;
        } else {
            console.error('Función _executeEstablishTradeRoute no disponible.');
            return false;
        }
    },

    /**
     * PESTAÑA 1: RESUMEN NACIONAL (El "Outliner")
     */
    _updateResumenNacional: function() {
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;
        
        // Leer oro directamente de gameState.playerResources
        const oroActual = gameState.playerResources?.[myPlayerId]?.oro || 0;
        
        // Contar regimientos activos REALES
        let regimentosActivos = 0;
        units.forEach(unit => {
            const unitPlayer = unit.playerId ?? unit.player;
            const isAlive = unit.currentHealth === undefined ? !unit.isDefeated : unit.currentHealth > 0;
            if (unitPlayer === myPlayerId && isAlive && unit.regiments) {
                regimentosActivos += unit.regiments.length;
            }
        });

        const resumen = {
            tesoreria: {
                ingresos: this._calculateIncomeThisTurn(myPlayerId),
                gastos: this._calculateExpensesThisTurn(myPlayerId),
                balance: this._calculateIncomeThisTurn(myPlayerId) - this._calculateExpensesThisTurn(myPlayerId),
                oro: oroActual // Leer directamente
            },
            capacidadMilitar: {
                regimentosActivos: regimentosActivos, // Contar REAL
                limiteSuministros: this._calculateSupplyLimit(myPlayerId),
                porcentajeUso: Math.floor((regimentosActivos / Math.max(1, this._calculateSupplyLimit(myPlayerId))) * 100)
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
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;
        
        // Construir tabla con DATOS REALES de todos los jugadores
        const tabla = [];
        
        for (let playerId = 1; playerId <= gameState.numPlayers; playerId++) {
            // Saltar jugadores eliminados
            if (gameState.eliminatedPlayers?.includes(playerId)) continue;
            
            // Calcular población REAL según la regla especificada
            let poblacion = 0;
            let ciudades = 0;
            let territorio = 0;
            
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[r].length; c++) {
                    const hex = board[r][c];
                    if (hex?.owner === playerId) {
                        territorio++;
                        
                        // Contar población por tipo de estructura
                        if (hex.isCity || hex.structure === 'Metrópoli' || hex.structure === 'Ciudad' || hex.structure === 'Aldea') {
                            ciudades++;
                            // Detectar tipo de ciudad por hex.structure
                            if (hex.structure === 'Metrópoli') {
                                poblacion += 8000; // Metrópoli
                            } else if (hex.structure === 'Ciudad') {
                                poblacion += 4000; // Ciudad
                            } else {
                                poblacion += 2000; // Aldea (por defecto para isCity)
                            }
                        } else if (hex.structure === "Fortaleza") {
                            poblacion += 1000; // Fortaleza
                        } else {
                            poblacion += 200; // Hexágono libre
                        }
                    }
                }
            }
            
            // Calcular poder militar REAL (suma de ataque + defensa de regimientos)
            let poderMilitar = 0;
            units.forEach(unit => {
                const unitPlayer = unit.playerId ?? unit.player;
                const isAlive = unit.currentHealth === undefined ? !unit.isDefeated : unit.currentHealth > 0;
                if (unitPlayer === playerId && isAlive && unit.regiments) {
                    unit.regiments.forEach(regiment => {
                        const regData = REGIMENT_TYPES[regiment.type];
                        if (regData) {
                            poderMilitar += (regData.attack || 0) + (regData.defense || 0);
                        }
                    });
                }
            });
            
            // Oro actual
            const oro = gameState.playerResources?.[playerId]?.oro || 0;
            
            // Puntuación (combinación de factores)
            const puntuacion = Math.floor(
                (poblacion / 100) + 
                (poderMilitar / 10) + 
                (territorio * 10) +
                (oro / 10)
            );
            
            tabla.push({
                playerId: playerId,
                civilization: gameState.playerCivilizations?.[playerId] || 'Desconocida',
                isMe: playerId === myPlayerId,
                score: puntuacion,
                power: poderMilitar,
                gold: oro,
                territory: territorio,
                cities: ciudades,
                population: poblacion
            });
        }
        
        // Ordenar por puntuación
        tabla.sort((a, b) => b.score - a.score);
        
        // Añadir rango
        tabla.forEach((player, index) => {
            player.rango = index + 1;
        });

        LedgerUI.displayDemografia(tabla);
    },

    /**
     * PESTAÑA 3: MILITAR (Desglose Táctico)
     */
    _updateMilitar: function() {
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;
        const myUnits = units.filter(u => {
            const unitPlayer = u.playerId ?? u.player;
            const isAlive = u.currentHealth === undefined ? !u.isDefeated : u.currentHealth > 0;
            return unitPlayer === myPlayerId && isAlive;
        });
        
        const tierra = [];
        const naval = [];
        let manpower = 0;
        const regimentTotals = {}; // Contador global de regimientos por tipo
        let suppliedRegiments = 0;
        let unsuppliedRegiments = 0;

        myUnits.forEach(unit => {
            const unitInfo = {
                id: unit.id,
                name: unit.name || `Unidad ${unit.id}`,
                type: unit.type,
                location: { r: unit.r, c: unit.c },
                morale: unit.morale || 100,
                regiments: [],
                totalHealth: 0,
                supplies: unit.supplies || 100,
                isDisorganized: unit.isDisorganized || false
            };

            // Desglose REAL de regimientos por tipo
            if (unit.regiments) {
                const regimentCounts = {};
                unit.regiments.forEach(regiment => {
                    const regType = regiment.type;
                    
                    // Contar en la unidad
                    if (!regimentCounts[regType]) {
                        regimentCounts[regType] = {
                            type: regType,
                            count: 0,
                            totalHealth: 0
                        };
                    }
                    regimentCounts[regType].count++;
                    regimentCounts[regType].totalHealth += regiment.health || 0;
                    
                    // Contar en el total global
                    if (!regimentTotals[regType]) {
                        regimentTotals[regType] = 0;
                    }
                    regimentTotals[regType]++;
                    manpower++;
                    const isSupplied = typeof isHexSupplied === 'function'
                        ? isHexSupplied(unit.r, unit.c, myPlayerId)
                        : true;
                    if (isSupplied) {
                        suppliedRegiments++;
                    } else {
                        unsuppliedRegiments++;
                    }
                });
                
                // Convertir a array
                unitInfo.regiments = Object.values(regimentCounts);
                unitInfo.totalHealth = Object.values(regimentCounts).reduce((sum, r) => sum + r.totalHealth, 0);
            }

            // Clasificar por tipo REAL (is_naval en REGIMENT_TYPES)
            const isNaval = unit.regiments?.some(reg => {
                const regData = typeof REGIMENT_TYPES !== 'undefined' ? REGIMENT_TYPES[reg.type] : null;
                return regData?.is_naval === true;
            });

            if (isNaval) {
                naval.push(unitInfo);
            } else {
                tierra.push(unitInfo);
            }
        });

        const militar = {
            tierra: tierra,
            naval: naval,
            manpower: manpower,
            regimentTotals: regimentTotals, // Añadir resumen por tipo
            supplyStatus: this._assessSupplyStatus(myPlayerId, suppliedRegiments, unsuppliedRegiments, manpower),
            suppliedRegiments: suppliedRegiments,
            unsuppliedRegiments: unsuppliedRegiments
        };

        LedgerUI.displayMilitar(militar);
    },

    /**
     * PESTAÑA 4: ECONOMÍA (Libro de Cuentas)
     */
    _updateEconomia: function() {
        const myPlayerId = gameState.myPlayerNumber || gameState.currentPlayer;
        
        // Calcular ingresos REALES
        const impuestos = this._calculateIncomeThisTurn(myPlayerId) - this._calculateTrade(myPlayerId); // Oro de hexágonos y estructuras
        const comercio = this._calculateTrade(myPlayerId); // Caravanas
        const saqueosMilitares = 0; // Histórico (no hay sistema de tracking aún)
        
        const ingresos = {
            impuestos: impuestos,
            comercio: comercio,
            militares: saqueosMilitares, // Renombrado de "saqueos"
            total: impuestos + comercio + saqueosMilitares
        };

        // Calcular gastos REALES (solo ejército)
        const ejercito = this._calculateArmyUpkeep(myPlayerId);
        
        const gastos = {
            ejercito: ejercito,
            total: ejercito
        };

        const economia = {
            ingresos: ingresos,
            gastos: gastos,
            balance: ingresos.total - gastos.total,
            oroActual: gameState.playerResources?.[myPlayerId]?.oro || 0,
            desglosePorcentual: {
                impuestos: ingresos.total > 0 ? Math.floor((ingresos.impuestos / ingresos.total) * 100) : 0,
                comercio: ingresos.total > 0 ? Math.floor((ingresos.comercio / ingresos.total) * 100) : 0,
                militares: ingresos.total > 0 ? Math.floor((ingresos.militares / ingresos.total) * 100) : 0
            }
        };

        LedgerUI.displayEconomia(economia);
    },

    // === MÉTODOS DE CÁLCULO (privados) ===

    _calculateIncomeThisTurn: function(playerId) {
        // Usar la lógica REAL del juego para calcular ingresos
        let totalIncome = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0 };
        
        const MAX_NACIONALIDAD = 100;
        
        // Iterar sobre cada hexágono
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (!hex || hex.owner !== playerId) continue;
                
                // Calcular multiplicador de estabilidad (como hace el juego)
                let stabilityMultiplier = 1.0;
                if (hex.estabilidad !== undefined) {
                    switch (hex.estabilidad) {
                        case 0: stabilityMultiplier = 0; break;
                        case 1: stabilityMultiplier = 0.25; break;
                        case 2: stabilityMultiplier = 0.70; break;
                        case 3: stabilityMultiplier = 1.0; break;
                        case 4: stabilityMultiplier = 1.25; break;
                        case 5: stabilityMultiplier = 1.50; break;
                        default: stabilityMultiplier = 1.0;
                    }
                }
                
                // Calcular multiplicador de nacionalidad
                const nationalityMultiplier = (hex.nacionalidad?.[playerId] || 0) / MAX_NACIONALIDAD;
                
                // Calcular ingreso de oro base
                let incomeFromHex = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0 };
                
                if (hex.isCity) {
                    incomeFromHex.oro = hex.isCapital ? GOLD_INCOME.PER_CAPITAL : GOLD_INCOME.PER_CITY;
                } else if (hex.structure === "Fortaleza") {
                    incomeFromHex.oro = GOLD_INCOME.PER_FORT;
                } else if (hex.structure === "Camino") {
                    incomeFromHex.oro = GOLD_INCOME.PER_ROAD;
                } else {
                    incomeFromHex.oro = GOLD_INCOME.PER_HEX;
                }
                
                // Añadir ingresos de recursos (si hay nodos)
                if (hex.resourceNode && typeof RESOURCE_NODES_DATA !== 'undefined' && RESOURCE_NODES_DATA[hex.resourceNode]) {
                    const nodeInfo = RESOURCE_NODES_DATA[hex.resourceNode];
                    const resourceType = nodeInfo.name?.toLowerCase().replace('_mina', '') || '';
                    if (resourceType && resourceType !== 'oro') {
                        incomeFromHex[resourceType] = (incomeFromHex[resourceType] || 0) + (nodeInfo.income || 0);
                    }
                }
                
                // Aplicar bonificadores de tecnología
                const playerTechs = gameState.playerResources?.[playerId]?.researchedTechnologies || [];
                if (incomeFromHex.oro > 0 && playerTechs.includes('PROSPECTING')) incomeFromHex.oro += 1;
                if (incomeFromHex.hierro > 0 && playerTechs.includes('IRON_WORKING')) incomeFromHex.hierro += 1;
                if (incomeFromHex.piedra > 0 && playerTechs.includes('MASONRY')) incomeFromHex.piedra += 1;
                if (incomeFromHex.madera > 0 && playerTechs.includes('FORESTRY')) incomeFromHex.madera += 1;
                if (incomeFromHex.comida > 0 && playerTechs.includes('SELECTIVE_BREEDING')) incomeFromHex.comida += 1;
                
                // Aplicar multiplicadores de estabilidad y nacionalidad
                for (const res in incomeFromHex) {
                    const baseIncome = incomeFromHex[res];
                    const finalIncome = baseIncome * stabilityMultiplier * nationalityMultiplier;
                    totalIncome[res] = (totalIncome[res] || 0) + finalIncome;
                }
            }
        }
        
        // Redondear y convertir a entero
        let totalGold = Math.round(totalIncome.oro || 0);
        
        // Añadir oro de caravanas (se calcula cuando llegan a destino)
        totalGold += this._calculateTrade(playerId);
        
        return totalGold;
    },

    _calculateExpensesThisTurn: function(playerId) {
        // Solo gasto de ejército - NO hay mantenimiento de edificios ni corrupción
        return this._calculateArmyUpkeep(playerId);
    },

    _calculateSupplyLimit: function(playerId) {
        let standardLimit = 0; // Límite de regimientos estándar
        let villagerLimit = 0; // Límite de Pueblos (suma en paralelo)
        
        // Contar capacidad según infraestructura (UNIT CAP basado en hex.structure)
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (hex?.owner === playerId) {
                    // Determinar capacidad base según estructura
                    if (hex.structure === 'Metrópoli') {
                        standardLimit += UNIT_CAP_BY_INFRASTRUCTURE["Metrópoli"];
                    } else if (hex.structure === 'Ciudad') {
                        standardLimit += UNIT_CAP_BY_INFRASTRUCTURE["Ciudad"];
                    } else if (hex.structure === 'Aldea') {
                        standardLimit += UNIT_CAP_BY_INFRASTRUCTURE["Aldea"];
                    } else if (hex.structure === 'Fortaleza') {
                        standardLimit += UNIT_CAP_BY_INFRASTRUCTURE["Fortaleza"];
                    } else {
                        // Cualquier otro hex controlado
                        standardLimit += UNIT_CAP_BY_INFRASTRUCTURE["Hexágono Libre"];
                    }
                    
                    // Los Pueblos DUPLICAN la capacidad de tropas
                    // (la lógica de Pueblos se implementará en el sistema de reclutamiento)
                }
            }
        }
        
        // Por ahora retornamos solo el límite estándar
        // El sistema de Pueblos se implementará en la lógica de reclutamiento paralelo
        return standardLimit;
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
                    const hasInfrastructure = board[r][c]?.hasRoad || board[r][c]?.structure === 'Camino' || board[r][c]?.isCity;
                    if (!hasInfrastructure) {
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
        // YA NO SE USA - Los impuestos se calculan en _calculateIncomeThisTurn()
        // Mantener por compatibilidad pero retornar 0
        return 0;
    },

    _calculateTrade: function(playerId) {
        const activeTradeUnits = this._getPlayerTradeUnits(playerId).filter(unit => {
            return unit?.tradeRoute?.origin && unit?.tradeRoute?.destination;
        });
        return activeTradeUnits.reduce((totalTrade, unit) => {
            const originValue = this._getTradeValueForCity(unit.tradeRoute.origin);
            const destinationValue = this._getTradeValueForCity(unit.tradeRoute.destination);
            const routeValue = Math.max(1, Math.min(originValue, destinationValue));
            return totalTrade + (routeValue * (TRADE_INCOME_PER_ROUTE || 50));
        }, 0);
    },

    _calculateRaids: function(playerId) {
        // No hay sistema de ingresos fijos por saqueos
        // Los saqueos dan oro cuando ocurren (evento histórico)
        return 0; 
    },

    _calculateTreaties: function(playerId) {
        // Sistema de tratados no existe aún
        return 0;
    },

    _calculateBuildingMaintenance: function(playerId) {
        // NO existe mantenimiento de edificios
        return 0;
    },

    _calculateArmyUpkeep: function(playerId) {
        let cost = 0;
        
        // Obtener el costo de upkeep real de cada tipo de regimiento
        units.forEach(unit => {
            const unitPlayer = unit.playerId ?? unit.player;
            const isAlive = unit.currentHealth === undefined ? !unit.isDefeated : unit.currentHealth > 0;
            if (unitPlayer === playerId && isAlive && unit.regiments) {
                unit.regiments.forEach(regiment => {
                    // Buscar el costo de upkeep en REGIMENT_TYPES
                    if (typeof REGIMENT_TYPES !== 'undefined' && REGIMENT_TYPES[regiment.type]) {
                        const regimentData = REGIMENT_TYPES[regiment.type];
                        if (regimentData.cost && typeof regimentData.cost.upkeep === 'number') {
                            cost += regimentData.cost.upkeep;
                        }
                    }
                });
            }
        });
        
        return cost;
    },

    _calculateCorruptionCost: function(playerId) {
        // NO existe gasto por corrupción
        return 0;
    },

    _assessSupplyStatus: function(playerId, suppliedRegiments = 0, unsuppliedRegiments = 0, totalRegiments = 0) {
        if (totalRegiments === 0) return 'N/A';
        if (unsuppliedRegiments === 0) return 'Alta';

        const unsuppliedRatio = unsuppliedRegiments / totalRegiments;
        if (unsuppliedRatio <= 0.3) return 'Media';
        return 'Baja';
    },

    /**
     * PESTAÑA 5: CRÓNICA (Log Narrativo)
     */
    _updateCronica: function() {
        // Obtener logs de Chronicle
        const logs = typeof Chronicle !== 'undefined' ? Chronicle.getLogs() : [];
        
        // Agrupar por turno para mejor visualización
        const logsByTurn = {};
        logs.forEach(log => {
            const turn = log.turn || 1;
            if (!logsByTurn[turn]) {
                logsByTurn[turn] = [];
            }
            logsByTurn[turn].push(log);
        });

        const cronica = {
            totalEvents: logs.length,
            currentTurn: gameState.turnNumber || 1,
            logs: logs,
            logsByTurn: logsByTurn
        };

        LedgerUI.displayCronica(cronica);
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LedgerManager = LedgerManager;
}
