// bank_logic.js

const BankManager = {
    PLAYER_ID: 0, // La Banca siempre será el Jugador 0

    /**
     * Se llama al final de cada ronda completa.
     * Gestiona las acciones de la IA de La Banca.
     */
    executeTurn: function() {
        // Si estamos en red y NO soy el anfitrión, NO CALCULO NADA. 
        // Espero a que el anfitrión me mande los resultados en el siguiente sync.
        if (typeof NetworkManager !== 'undefined' && NetworkManager.conn && NetworkManager.conn.open && !NetworkManager.esAnfitrion) {
            console.log("[Banca] Soy Cliente: Omitiendo lógica de Banca (Espero datos del Host).");
            return;
        }
        // -----------------------------------------------------

        console.log("%c[Banca] Ejecutando turno de La Banca (Autoridad)...", "color: olive; font-weight: bold;");

        // PASO 1: Mover y gestionar las caravanas que ya están en el mapa.
        this.manageExistingCaravans();

        // PASO 2: Comprobar si se debe crear una nueva caravana.
        this.createNewCaravanIfNeeded();
        
        console.log("[Banca] Turno de La Banca completado.");
    },

    /**
     * Comprueba las condiciones y, si se cumplen, crea una nueva caravana.
     */
    createNewCaravanIfNeeded: function() {
        // === LÍMITE GLOBAL DE CARAVANAS ===
        const maxSimultaneousCaravans = 3;
        const activeCaravans = units.filter(u => u.player === this.PLAYER_ID && u.tradeRoute).length;
        
        if (activeCaravans >= maxSimultaneousCaravans) {
            console.log(`[Banca] Límite de ${maxSimultaneousCaravans} caravanas alcanzado. No se crea nueva.`);
            return;
        }
        
        // 1. Obtener la Ciudad Banco
        const bankCity = gameState.cities.find(c => c.owner === this.PLAYER_ID);
        if (!bankCity) return;
        
        // Comprobar bloqueo físico: Si hay alguien en la puerta, no salimos.
        const unitAtBank = getUnitOnHex(bankCity.r, bankCity.c);
        if (unitAtBank) return;
        
        // A. Listar rutas activas desde ESTA ciudad (como lo hace el jugador)
        const existingRouteKeys = new Set();
        
        // Filtramos todas las caravanas de la banca que salen de esta ciudad
        units.forEach(u => {
            if (u.player === this.PLAYER_ID && u.tradeRoute && u.tradeRoute.origin && u.tradeRoute.destination) {
                // CORRECCIÓN: Solo contar caravanas que salgan específicamente de esta ciudad
                if (u.tradeRoute.origin.r === bankCity.r && u.tradeRoute.origin.c === bankCity.c) {
                    // Guardamos la clave "Origen-Destino" para evitar duplicados
                    const routeKey = `${u.tradeRoute.origin.name}-${u.tradeRoute.destination.name}`;
                    existingRouteKeys.add(routeKey);
                }
            }
        });

        // B. Filtrar ciudades objetivo válidas (Ciudades reales de jugadores)
        const totalCities = gameState.cities.filter(c => c.owner > 0); 
        
        let availableTargets = totalCities.filter(targetCity => {
            // Regla 1: Que no sea la propia banca (obvio)
            if (targetCity.owner === this.PLAYER_ID) return false;

            // Regla 2: Que NO HAYA YA una caravana desde ESTA ciudad hacia ese destino (igual que el jugador)
            const routeKey = `${bankCity.name}-${targetCity.name}`;
            if (existingRouteKeys.has(routeKey)) return false;

            // Regla 3: Que exista camino físico
            const path = findInfrastructurePath(bankCity, targetCity);
            if (!path) return false;

            return true;
        });

        if (availableTargets.length === 0) {
            // No hay rutas libres
            return;
        }
        
        // Barajar objetivos disponibles para que sea aleatorio
        for (let i = availableTargets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableTargets[i], availableTargets[j]] = [availableTargets[j], availableTargets[i]];
        }

        // Crear SOLAMENTE UNA caravana por turno (el break detiene el bucle tras el éxito)
        for (const targetCity of availableTargets) {
            const success = this.buildAndDeployCaravan(bankCity, targetCity);
            if (success) break; 
        }
    },

    /**
     * Mueve las caravanas existentes de La Banca.
     */
    manageExistingCaravans: function() {
        // La función global se encarga del movimiento, curación y recomposición.
        if (typeof updateTradeRoutes === 'function') {
            updateTradeRoutes(this.PLAYER_ID);
        }
    },

    /**
     * Construye y despliega una nueva división-caravana si hay una ruta válida.
     * @param {object} originCity - La ciudad de La Banca.
     * @param {object} targetCity - La ciudad de destino del jugador.
     */
    buildAndDeployCaravan: function(originCity, targetCity) {
        const path = findInfrastructurePath(originCity, targetCity);

        if (!path) {
            console.warn(`[Banca] No se encontró una ruta de infraestructura válida a ${targetCity.name}.`);
            return false; // Devolver 'false' en caso de fallo
        }

        // Calcular la composición de la nueva caravana
        const composition = this.calculateCaravanComposition();
        
        // Crear el objeto de la nueva división
        const newCaravanData = {
            id: null, // Será asignado por placeFinalizedDivision
            player: this.PLAYER_ID,
            name: `Caravana a ${targetCity.name}`,
            regiments: composition,
            r: originCity.r, 
            c: originCity.c,
            // Propiedades por defecto
            hasMoved: true, // Para que no pueda ser controlada en el turno de creación
            hasAttacked: true,
            level: 0, experience: 0, 
            morale: 100, maxMorale: 125,
        };

        // Asignar stats
        calculateRegimentStats(newCaravanData);
        newCaravanData.currentHealth = newCaravanData.maxHealth;
        newCaravanData.currentMovement = newCaravanData.movement;

        // Establecer la ruta comercial
        const cargoCapacity = newCaravanData.regiments.reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type].goldValueOnDestroy || 0), 0);
        newCaravanData.tradeRoute = {
            origin: { r: originCity.r, c: originCity.c, name: originCity.name },
            destination: { r: targetCity.r, c: targetCity.c, name: targetCity.name },
            path: path,
            position: 0,
            goldCarried: 0,
            cargoCapacity: cargoCapacity,
            forward: true
        };

        // Colocar la unidad en el tablero
        placeFinalizedDivision(newCaravanData, originCity.r, originCity.c);
        logMessage(`La Banca ha enviado una caravana hacia ${targetCity.name}.`, "event");

        return true; // Devolver 'true' en caso de éxito
    },

    /**
     * Calcula la composición de regimientos para una caravana de La Banca.
     * @returns {Array<object>} El array de objetos de regimiento.
     */
    calculateCaravanComposition: function() {
        const allPlayerUnits = units.filter(u => u.player > 0);
        
        let averageSize = 2; // Tamaño por defecto si no hay jugadores
        if (allPlayerUnits.length > 0) {
            allPlayerUnits.sort((a, b) => b.regiments.length - a.regiments.length);
            const top4Units = allPlayerUnits.slice(0, 4);
            const totalRegiments = top4Units.reduce((sum, unit) => sum + unit.regiments.length, 0);
            averageSize = Math.max(1, Math.round(totalRegiments / top4Units.length));
        }

        const numHeavyCav = Math.ceil(averageSize / 2);
        const numHorseArchers = Math.floor(averageSize / 2);

        const composition = [];
        
        // --- INICIO CORRECCIÓN ---
        // Añadir siempre un regimiento de Columna de Suministro para que sea una caravana funcional
        composition.push({ type: "Columna de Suministro", health: REGIMENT_TYPES["Columna de Suministro"].health });
        // --- FIN CORRECCIÓN ---

        for (let i = 0; i < numHeavyCav; i++) {
            composition.push({ type: "Caballería Pesada", health: REGIMENT_TYPES["Caballería Pesada"].health });
        }
        for (let i = 0; i < numHorseArchers; i++) {
            composition.push({ type: "Arqueros a Caballo", health: REGIMENT_TYPES["Arqueros a Caballo"].health });
        }
        
        return composition;
    },

    /**
     * Recompone los regimientos de una caravana existente.
     * @param {object} unit - La unidad de caravana a recomponer.
     */
    recomposeCaravan: function(unit) {
        if (unit.player !== this.PLAYER_ID) return;

        console.log(`[Banca] Recomponiendo caravana "${unit.name}".`);
        const newComposition = this.calculateCaravanComposition();
        unit.regiments = newComposition;
        
        // Recalcular stats y curar completamente
        calculateRegimentStats(unit);
        unit.currentHealth = unit.maxHealth;

        // Actualizar capacidad de carga
        if (unit.tradeRoute) {
            unit.tradeRoute.cargoCapacity = unit.regiments.reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type].goldValueOnDestroy || 0), 0);
        }
    }
};