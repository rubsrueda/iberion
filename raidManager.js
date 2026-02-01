// raidManager.js
console.log("raidManager.js CARGADO - Motor de Incursión.");

const RaidManager = {
    currentRaid: null,
    allianceId: null,

    // 1. INICIAR (Solo Líder)
    startNewRaid: async function(aliId) {
        console.log("Iniciando Incursión: Generando División Real...");
        const now = new Date();
        
        // 1. LEER CONFIGURACIÓN (De constants.js ya existente)
        const stageNum = 1; 
        const config = RAID_CONFIG.STAGES[stageNum];
        const baseUnitStats = REGIMENT_TYPES[config.regimentType];
        
        // 2. CONSTRUIR LOS REGIMIENTOS REALES
        const bossRegiments = [];
        let totalHpCalculated = 0;

        for (let i = 0; i < config.regimentCount; i++) {
            bossRegiments.push({
                type: config.regimentType,
                health: baseUnitStats.health,
                maxHealth: baseUnitStats.health
            });
            totalHpCalculated += baseUnitStats.health;
        }

        // 3. SOBRESCRIBIR DB CON DATOS LIMPIOS
        const newRaid = {
            alliance_id: aliId,
            start_time: now.toISOString(),
            current_stage: stageNum,
            status: 'active',
            stage_data: {
                // AQUÍ ESTÁ LA CORRECCIÓN: Guardamos el array real, no un número inventado
                boss_regiments: bossRegiments, 
                
                caravan_hp: totalHpCalculated,
                caravan_max_hp: totalHpCalculated,
                caravan_pos: { r: 6, c: 1 }, // Posición inicial (columna 1 = inicio del mapa)
                stage_start_time: now.toISOString(), // IMPORTANTE: Tiempo de inicio de esta etapa
                slots: [null, null, null, null, null, null, null, null],
                units: {}
            },
            global_log: { damage_by_user: {} }
        };

        // Insertar (Esto limpia efectivamente el estado anterior al crear uno nuevo activo)
        const { error } = await supabaseClient
            .from('alliance_raids')
            .insert(newRaid);
        
        if (error) {
            alert("Error: " + error.message);
        } else {
            // Recargar UI inmediatamente para ver los cambios
            if(typeof AllianceManager !== 'undefined') AllianceManager.loadHQ(aliId);
        }
    },

    // 2. ENTRAR (Cualquier miembro, botón ATACAR)
    enterRaid: async function() {
        if (!this.currentRaid) {
            console.error("[Raid] No hay raid activo cargado");
            return;
        }
        
        const player = PlayerDataManager.currentPlayer;
        const uid = player.auth_id;
        let stageData = this.currentRaid.stage_data; // Cambiar a 'let' para poder reasignar
        
        console.log("[Raid] Intentando entrar al Raid ID:", this.currentRaid.id);
        console.log("[Raid] Datos del jugador:", {uid, username: player.username, gold: player.currencies.gold});
        
        // === MIGRACIÓN: Corregir raids existentes sin stage_start_time ===
        if (!stageData.stage_start_time) {
            console.warn("[Raid] Raid antiguo detectado. Aplicando migración...");
            
            // Usar el start_time del raid completo como referencia
            const raidStartTime = new Date(this.currentRaid.start_time);
            const now = new Date();
            const hoursElapsed = (now - raidStartTime) / (1000 * 60 * 60);
            
            // Calcular en qué etapa DEBERÍAMOS estar
            const expectedStage = Math.min(4, Math.floor(hoursElapsed / RAID_CONFIG.DURATION_PER_STAGE_HOURS) + 1);
            
            // Calcular cuándo empezó la etapa actual
            const stageStartOffset = (this.currentRaid.current_stage - 1) * RAID_CONFIG.DURATION_PER_STAGE_HOURS;
            const calculatedStageStart = new Date(raidStartTime.getTime() + (stageStartOffset * 60 * 60 * 1000));
            
            stageData.stage_start_time = calculatedStageStart.toISOString();
            
            // Si estamos en la etapa incorrecta, forzar transición
            if (expectedStage > this.currentRaid.current_stage) {
                console.log(`[Raid] Etapa incorrecta detectada. Forzando transición: ${this.currentRaid.current_stage} → ${expectedStage}`);
                await this.transitionToStage(expectedStage);
                return; // Salir y dejar que se vuelva a llamar
            }
            
            // Resetear posición a inicial para recalcular correctamente
            stageData.caravan_pos = { r: 6, c: 1 };
            
            console.log("[Raid] Migración completada. stage_start_time:", stageData.stage_start_time);
        }

        // A. Verificar si ya estoy dentro (Reconexión)
        let mySlotIdx = stageData.slots.indexOf(uid);
        console.log("[Raid] Slot actual del jugador:", mySlotIdx);
        
        // B. Si no estoy dentro, intentar pagar y ocupar slot
        if (mySlotIdx === -1) {
            
            // Buscar hueco
            mySlotIdx = stageData.slots.indexOf(null);
            console.log("[Raid] Buscando slot disponible. Encontrado:", mySlotIdx);
            
            if (mySlotIdx === -1) {
                alert("El mapa está lleno (8/8). Debes esperar a que alguien se retire o muera.");
                return;
            }

            if (player.currencies.gold < RAID_CONFIG.ENTRY_COST) {
                alert(`Faltan fondos. Necesitas ${RAID_CONFIG.ENTRY_COST} oro.`);
                return;
            }

            // Cobrar
            player.currencies.gold -= RAID_CONFIG.ENTRY_COST;
            await PlayerDataManager.saveCurrentPlayer();
            console.log("[Raid] Cobrado " + RAID_CONFIG.ENTRY_COST + " oro. Restante:", player.currencies.gold);

            // Asignar Slot y Unidad Inicial
            stageData.slots[mySlotIdx] = uid;
            console.log("[Raid] Slot asignado:", mySlotIdx);
            
            // Definir unidad según etapa (Tierra/Mar)
            const stageType = RAID_CONFIG.STAGES?.[this.currentRaid.current_stage]?.type || 'land';
            const unitType = stageType === 'naval' ? 'Barco de Guerra' : 'Infantería Pesada';
            
            // Calcular posición de spawn basada en slot
            // Slots 0-3 aparecen en fila 1-2 (Norte), slots 4-7 en fila 10-11 (Sur)
            const spawnRow = mySlotIdx < 4 ? (1 + Math.floor(mySlotIdx / 2)) : (10 + Math.floor((mySlotIdx - 4) / 2));
            const spawnCol = (mySlotIdx % 2) * 2; // Columnas 0 o 2 para separar
            
            // NUEVO: Mapa de posiciones de fortalezas para logging
            const fortressPositions = [
                {r: 1, c: 2}, {r: 1, c: 6}, {r: 1, c: 10}, {r: 1, c: 14},
                {r: 10, c: 2}, {r: 10, c: 6}, {r: 10, c: 10}, {r: 10, c: 14}
            ];
            
            console.log(`%c[Raid] ¡JUGADOR ASIGNADO AL SLOT ${mySlotIdx}!`, 'background: #00ff00; color: #000; font-weight: bold; padding: 5px;');
            console.log(`[Raid] Fortaleza asignada en posición: (${fortressPositions[mySlotIdx].r}, ${fortressPositions[mySlotIdx].c})`);
            console.log(`[Raid] Unidad inicial aparecerá en: (${spawnRow}, ${spawnCol})`);

            if (!stageData.units) stageData.units = {};
            
            // Crear regimiento inicial vacío - el jugador lo construirá
            stageData.units[uid] = {
                type: "Placeholder", // Solo para reservar el slot
                regiments: [],
                hp: 0,
                max_hp: 0,
                r: spawnRow,
                c: spawnCol, 
                player_name: player.username
            };
            
            console.log("[Raid] Unidad inicial creada en posición:", {r: spawnRow, c: spawnCol});
            
            // Guardar ocupación en DB
            const { error, data: updatedRaid } = await supabaseClient
                .from('alliance_raids')
                .update({ stage_data: stageData })
                .eq('id', this.currentRaid.id)
                .select()
                .single();
                
            if (error) {
                console.error("[Raid] Error al guardar slot:", error);
                alert("Error al entrar al raid. Intenta de nuevo.");
                return;
            }
            
            // CRÍTICO: Actualizar currentRaid con los datos recién guardados
            this.currentRaid = updatedRaid;
            
            console.log("[Raid] Slot guardado exitosamente en la base de datos");
            console.log("[Raid] Slot actualizado en currentRaid:", this.currentRaid.stage_data.slots);
        } else {
            console.log("[Raid] El jugador ya estaba en un slot. Reconectando...");
        }

        // B2. CRÍTICO: Recargar datos FRESCOS desde la BD antes de renderizar
        console.log("[Raid] Recargando datos actualizados desde la base de datos...");
        const { data: freshRaidData, error: refreshError } = await supabaseClient
            .from('alliance_raids')
            .select('*')
            .eq('id', this.currentRaid.id)
            .single();
        
        if (freshRaidData && !refreshError) {
            this.currentRaid = freshRaidData;
            console.log("[Raid] Datos actualizados. Etapa:", this.currentRaid.current_stage);
            console.log("[Raid] Regimientos del boss:", this.currentRaid.stage_data.boss_regiments?.length || 0);
            console.log("[Raid] Tipo de regimiento:", this.currentRaid.stage_data.boss_regiments?.[0]?.type || 'N/A');
            console.log("%c[Raid] HP de caravana:", 'background: #00ff00; color: #000; font-weight: bold;', 
                this.currentRaid.stage_data.caravan_hp, "/", this.currentRaid.stage_data.caravan_max_hp);
            
            // CRÍTICO: Actualizar la referencia de stageData para que apunte a los datos frescos
            stageData = this.currentRaid.stage_data;
            console.log("[Raid] ✅ Referencia de stageData actualizada a datos frescos");
        } else {
            console.error("[Raid] Error al recargar datos:", refreshError);
        }

        // C. Inicializar gameState para el modo Raid
        console.log("[Raid] Inicializando gameState para modo Raid...");
        
        // Resetear gameState completamente para evitar conflictos
        Object.keys(gameState).forEach(key => delete gameState[key]);
        
        gameState.currentPhase = "deployment"; // Empezar en deployment para que pueda crear su división
        gameState.currentPlayer = 1;
        gameState.myPlayerNumber = 1;
        gameState.isRaid = true;
        gameState.isNetworkGame = false; // Raids NO usan la lógica de red estándar
        gameState.numPlayers = 2; // Jugadores vs IA
        gameState.turnNumber = 1;
        gameState.cities = []; // Inicializar ciudades vacío
        
        // Inicializar recursos
        gameState.playerResources = {
            1: {
                oro: 40000,
                comida: 5000,
                madera: 15000,
                hierro: 5000,
                piedra: 2000,
                researchPoints: 250,
                researchedTechnologies: ["ORGANIZATION", "NAVIGATION"],
                puntosReclutamiento: 2000
            },
            2: {
                oro: 0, comida: 0, madera: 0, hierro: 0, piedra: 0,
                researchPoints: 0, researchedTechnologies: [], puntosReclutamiento: 0
            }
        };
        
        gameState.playerCivilizations = { 1: "Iberia", 2: "Imperio" };
        gameState.playerTypes = { 1: "human", 2: "ai" };
        gameState.unitsPlacedByPlayer = { 1: 0, 2: 1 }; // La IA ya tiene la caravana
        gameState.activeCommanders = { 1: [], 2: [] };
        gameState.deploymentUnitLimit = 1; // Solo 1 división
        gameState.eliminatedPlayers = [];
        
        // Inicializar playerStats y matchSnapshots para evitar errores en sistema de progresión
        if (!gameState.playerStats) {
            gameState.playerStats = {
                unitsDestroyed: {
                    player1: 0,
                    player2: 0
                }
            };
        }
        if (!gameState.matchSnapshots) {
            gameState.matchSnapshots = [];
        }
        
        console.log("[Raid] gameState inicializado correctamente");

        // D. Cargar Mapa Visual - IMPORTANTE: Usar this.currentRaid.stage_data actualizado
        this.showRaidMap(this.currentRaid.stage_data);
        
        // E. Calcular y aplicar movimiento automático de la caravana basado en tiempo transcurrido
        console.log("[Raid] === CALCULANDO POSICIÓN DE CARAVANA ===");
        console.log("[Raid] Etapa actual:", this.currentRaid.current_stage);
        console.log("[Raid] stage_start_time:", stageData.stage_start_time);
        console.log("[Raid] Posición actual antes de calcular:", JSON.stringify(stageData.caravan_pos));
        
        await this.calculateCaravanPath(stageData);
        
        console.log("[Raid] Posición después de calcular:", JSON.stringify(stageData.caravan_pos));
        
        // F. Iniciar monitoreo en tiempo real del HP
        this.startHPMonitoring();
        
        // G. Mensaje de bienvenida
        const introMessage = () => {
            alert(
                "🗡️ FASE DE PREPARACIÓN 🗡️\n\n" +
                "1. Tienes 250 Puntos de Investigación (💡)\n" +
                "2. Usa tu fortaleza para crear tu DIVISIÓN\n" +
                "3. Una vez lista, pulsa 'Finalizar Turno'\n\n" +
                "¡Detén la Caravana Imperial!"
            );
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            window.intervalManager.setTimeout('raid_introAlert', introMessage, 500);
        } else {
            setTimeout(introMessage, 500);
        }
    },

    // Monitoreo en tiempo real del HP de la caravana
    hpMonitoringInterval: null,
    usingIntervalManager: false,
    isUpdatingHP: false, // Flag para evitar actualizaciones concurrentes
    
    startHPMonitoring: function() {
        // Limpiar intervalo anterior si existe
        if (this.hpMonitoringInterval) {
            if (this.usingIntervalManager && typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearInterval(this.hpMonitoringInterval);
            } else {
                clearInterval(this.hpMonitoringInterval);
            }
        }

        console.log("[Raid] Iniciando monitoreo en tiempo real del HP");
        
        // Verificar HP cada 3 segundos (aumentado de 2 a 3)
        const monitorCallback = async () => {
            // No monitorear si estamos en medio de una actualización
            if (this.isUpdatingHP) {
                console.log("[Raid] Monitoreo saltado - actualización en progreso");
                return;
            }

            if (!this.currentRaid || !gameState.isRaid) {
                this.stopHPMonitoring();
                return;
            }

            try {
                const { data: raid, error } = await supabaseClient
                    .from('alliance_raids')
                    .select('stage_data')
                    .eq('id', this.currentRaid.id)
                    .single();

                if (error || !raid) return;

                const remoteHP = raid.stage_data.caravan_hp;
                const localHP = this.currentRaid.stage_data.caravan_hp;

                // Si el HP remoto es diferente al local, actualizar
                if (remoteHP !== localHP) {
                    console.log(`%c[Raid] HP actualizado: ${localHP} → ${remoteHP}`, 'background: #00ccff; color: #000;');
                    
                    this.currentRaid.stage_data.caravan_hp = remoteHP;

                    // Actualizar visual del boss
                    const bossUnit = getUnitById('boss_caravan') || units.find(u => u.isBoss);
                    if (bossUnit) {
                        bossUnit.currentHealth = remoteHP;
                        if (bossUnit.element) {
                            const hpBar = bossUnit.element.querySelector('.unit-strength');
                            if (hpBar && bossUnit.maxHealth > 0) {
                                const hpPercent = Math.ceil((remoteHP / bossUnit.maxHealth) * 100);
                                hpBar.textContent = hpPercent + '%';
                            }
                        }
                    }

                    // Si llegó a 0, iniciar distribución de recompensas
                    if (remoteHP <= 0 && !raid.stage_data.is_victory) {
                        console.log("[Raid] ¡Caravana destruida detectada! Iniciando recompensas...");
                        
                        // Obtener el log completo para distribuir recompensas
                        const { data: fullRaid } = await supabaseClient
                            .from('alliance_raids')
                            .select('global_log, stage_data')
                            .eq('id', this.currentRaid.id)
                            .single();
                        
                        if (fullRaid && fullRaid.global_log && fullRaid.global_log.damage_by_user) {
                            // Detener monitoreo antes de distribuir
                            this.stopHPMonitoring();
                            
                            // Delay para asegurar que la animación termine
                            const rewardCallback = () => {
                                this.distributeRewards(fullRaid.global_log.damage_by_user);
                            };

                            if (typeof window !== 'undefined' && window.intervalManager) {
                                window.intervalManager.setTimeout('raid_rewardDelay', rewardCallback, 1000);
                            } else {
                                setTimeout(rewardCallback, 1000);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[Raid] Error en monitoreo de HP:", err);
            }
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            this.usingIntervalManager = true;
            this.hpMonitoringInterval = 'raid_hpMonitoring';
            window.intervalManager.setInterval(this.hpMonitoringInterval, monitorCallback, 3000);
        } else {
            this.usingIntervalManager = false;
            this.hpMonitoringInterval = setInterval(monitorCallback, 3000);
        }
    },
    
    stopHPMonitoring: function() {
        if (this.hpMonitoringInterval) {
            if (this.usingIntervalManager && typeof window !== 'undefined' && window.intervalManager) {
                window.intervalManager.clearInterval(this.hpMonitoringInterval);
            } else {
                clearInterval(this.hpMonitoringInterval);
            }
            this.hpMonitoringInterval = null;
            this.usingIntervalManager = false;
            console.log("[Raid] Monitoreo de HP detenido");
        }
    },

    // 3. MOSTRAR MAPA
    showRaidMap: function(stageData) {
        // Obtenemos la config de la etapa actual (si existe, si no default)
        const stageNum = this.currentRaid.current_stage;
        const config = (typeof RAID_CONFIG !== 'undefined' && RAID_CONFIG.STAGES) 
            ? RAID_CONFIG.STAGES[stageNum] 
            : { name: "Zona Desconocida", type: "land", mapType: "plains", caravan: "Caravana" };

        if (typeof initializeRaidMap === 'function') {
            initializeRaidMap(config, stageData);
            
            // Mostrar pantalla de juego
            if (domElements.gameContainer) {
                // Ocultar todos los modales EXCEPTO ledgerModal y legacyModal
                document.querySelectorAll('.modal:not(#ledgerModal):not(#legacyModal)').forEach(m => m.style.display = 'none');
                
                // Mostrar juego
                showScreen(domElements.gameContainer);
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
            }
        } else {
            console.error("Falta initializeRaidMap en boardManager.js");
        }
    },

    // 1. Entrada Principal (Desde el botón ATACAR en el HQ)
    openRaidWindow: async function(aliId) {
        this.allianceId = aliId;
        
        // Cargar o Crear Raid
        let { data: raid } = await supabaseClient
            .from('alliance_raids')
            .select('*')
            .eq('alliance_id', aliId)
            .eq('status', 'active')
            .single();

        if (!raid) {
            // Si no hay raid activo, el líder puede iniciarlo (Lógica futura)
            alert("No hay una incursión activa en este momento. El Líder debe iniciarla.");
            return;
        }

        this.currentRaid = raid;
        
        // 2. Sincronizar Tiempo y Etapa
        await this.syncRaidState();
    },

    // 2. Cerebro Temporal - Verifica y ajusta la etapa según el tiempo transcurrido
    syncRaidState: async function() {
        const now = new Date();
        const startTime = new Date(this.currentRaid.start_time);
        
        // Calcular horas transcurridas desde el inicio TOTAL del evento (0 a 48)
        const hoursElapsedTotal = (now - startTime) / (1000 * 60 * 60);
        
        // Calcular en qué etapa deberíamos estar (1, 2, 3 o 4)
        const calculatedStage = Math.floor(hoursElapsedTotal / RAID_CONFIG.DURATION_PER_STAGE_HOURS) + 1;

        if (hoursElapsedTotal >= 48) {
            this.finishRaid(); // Se acabó el tiempo global
            return;
        }

        // Si la etapa calculada es mayor que la guardada, hay que hacer TRANSICIÓN
        if (calculatedStage > this.currentRaid.current_stage) {
            console.log(`[Raid] Transición de tiempo detectada: Etapa ${this.currentRaid.current_stage} -> ${calculatedStage}`);
            await this.transitionToStage(calculatedStage);
        } else {
            // Estamos en la etapa correcta, verificamos si ya se ganó
            if (this.currentRaid.stage_data.is_victory) {
                // MODO LIMBO: Esperando a que el reloj llegue a la siguiente etapa
                this.showLimboScreen(calculatedStage + 1);
            } else {
                // MODO COMBATE: Proceder a entrar al raid
                await this.enterRaid();
            }
        }
    },

    // 3. Transición de Etapa (Reset)
    transitionToStage: async function(newStageIdx) {
        // CORRECCIÓN: Leer la configuración de la nueva etapa
        const config = RAID_CONFIG.STAGES[newStageIdx];
        const baseUnitStats = REGIMENT_TYPES[config.regimentType];
        
        // Construir regimientos reales según la nueva etapa
        const bossRegiments = [];
        let totalHpCalculated = 0;

        for (let i = 0; i < config.regimentCount; i++) {
            bossRegiments.push({
                type: config.regimentType,
                health: baseUnitStats.health,
                maxHealth: baseUnitStats.health
            });
            totalHpCalculated += baseUnitStats.health;
        }
        
        // Reiniciar datos para la nueva etapa CON los regimientos correctos
        const now = new Date();
        const newStageData = {
            boss_regiments: bossRegiments, // AGREGADO: Array real de regimientos
            caravan_hp: totalHpCalculated,
            caravan_max_hp: totalHpCalculated,
            caravan_pos: { r: 6, c: 1 }, // CORREGIDO: Siempre empezar en columna 1, no 0
            stage_start_time: now.toISOString(), // IMPORTANTE: Tiempo de inicio de ESTA etapa
            is_victory: false,
            slots: Array(8).fill(null), // Expulsar a todos (Opción A)
            units: {} // Limpiar mapa
        };

        const { data, error } = await supabaseClient
            .from('alliance_raids')
            .update({ 
                current_stage: newStageIdx,
                stage_data: newStageData
            })
            .eq('id', this.currentRaid.id)
            .select()
            .single();

        if (!error) {
            this.currentRaid = data;
            console.log(`[Raid] Etapa ${newStageIdx} iniciada con ${config.regimentType}.`);
            this.showRaidMap(); // Cargar mapa nuevo
        }
    },

    // UI: Pantalla de Espera (Limbo)
    showLimboScreen: function(nextStage) {
        alert(`¡Victoria en esta etapa!\n\nLa caravana ha sido detenida o destruida.\n\nLa Etapa ${nextStage} comenzará pronto.`);
        // Volver al HQ
        if (document.getElementById('allianceModal')) {
            document.getElementById('allianceModal').style.display = 'flex';
        }
    },
    
    finishRaid: function() {
        alert("El evento de Incursión ha terminado. Calculando recompensas...");
        // Lógica de reparto final...
    },

    // ===== FUNCIÓN DEBUG =====
    // Forzar avance a la siguiente fase (solo para testing)
    debugForceNextStage: async function() {
        if (!this.currentRaid) {
            console.error("[Raid Debug] No hay raid activo");
            return;
        }
        
        const nextStage = this.currentRaid.current_stage + 1;
        if (nextStage > 4) {
            console.log("[Raid Debug] Ya estás en la última etapa");
            return;
        }
        
        console.log(`[Raid Debug] Forzando transición: Etapa ${this.currentRaid.current_stage} → ${nextStage}`);
        await this.transitionToStage(nextStage);
        console.log("[Raid Debug] ✅ Transición completada");
    },

    // 3. MOSTRAR MAPA
    showRaidMap: function(stageData) {
        // Si no pasamos stageData, usar el actual
        const data = stageData || this.currentRaid.stage_data;
        const stageNum = this.currentRaid.current_stage;
        const config = (typeof RAID_CONFIG !== 'undefined' && RAID_CONFIG.STAGES) 
            ? RAID_CONFIG.STAGES[stageNum] 
            : { name: "Zona Desconocida", type: "land", mapType: "plains", caravan: "Caravana" };
        
        console.log("[Raid] Cargando mapa de incursión. Etapa:", stageNum, "Config:", config);
        
        // Cerrar todos los modales EXCEPTO ledgerModal y legacyModal
        document.querySelectorAll('.modal:not(#ledgerModal):not(#legacyModal)').forEach(m => m.style.display = 'none');
        
        // Iniciar mapa
        if (typeof initializeRaidMap === 'function') {
            initializeRaidMap(config, data);
            
            // Mostrar pantalla de juego
            if (domElements.gameContainer) {
                showScreen(domElements.gameContainer);
                if (domElements.tacticalUiContainer) {
                    domElements.tacticalUiContainer.style.display = 'block';
                }
            }
        } else {
            console.error("[Raid] Falta initializeRaidMap en boardManager.js");
        }
    },

    // 4. VERIFICAR Y AVANZAR ETAPAS AUTOMÁTICAMENTE
    checkAndAdvanceStage: async function() {
        if (!this.currentRaid) return;

        const now = new Date();
        const startTime = new Date(this.currentRaid.start_time);
        const hoursFromStart = (now - startTime) / (1000 * 60 * 60);
        
        // Cada etapa dura 12 horas, hay 4 etapas en total (48h)
        const HOURS_PER_STAGE = 12;
        const TOTAL_STAGES = 4;
        
        // Calcular en qué etapa DEBERÍAMOS estar basándonos en el tiempo
        const expectedStage = Math.min(TOTAL_STAGES, Math.floor(hoursFromStart / HOURS_PER_STAGE) + 1);
        
        console.log(`[Raid] Verificando etapas. Horas desde inicio: ${hoursFromStart.toFixed(2)}h`);
        console.log(`[Raid] Etapa actual: ${this.currentRaid.current_stage}, Etapa esperada: ${expectedStage}`);
        
        // Si el raid ha pasado las 48 horas (4 etapas * 12h), FINALIZAR
        if (hoursFromStart >= TOTAL_STAGES * HOURS_PER_STAGE) {
            console.log("[Raid] ⏰ El raid ha EXPIRADO (>48h). Finalizando automáticamente...");
            
            // Si la caravana llegó al final = Derrota
            // Si la caravana murió = Victoria
            const stageData = this.currentRaid.stage_data;
            const caravanReachedEnd = stageData.caravan_pos.c >= 24;
            const caravanDead = stageData.caravan_hp <= 0;
            
            await supabaseClient
                .from('alliance_raids')
                .update({ 
                    status: 'completed',
                    stage_data: {
                        ...stageData,
                        is_victory: caravanDead,
                        is_defeat: !caravanDead
                    }
                })
                .eq('id', this.currentRaid.id);
            
            alert("⏰ El Raid ha FINALIZADO (tiempo límite 48h). Volviendo al HQ...");
            
            // Volver al HQ de la alianza
            if (typeof AllianceManager !== 'undefined' && this.allianceId) {
                AllianceManager.loadHQ(this.allianceId);
            }
            return true; // Indica que el raid terminó
        }
        
        // Si la etapa actual es menor a la esperada, avanzar automáticamente
        if (this.currentRaid.current_stage < expectedStage) {
            console.log(`[Raid] ⏩ Avanzando automáticamente de etapa ${this.currentRaid.current_stage} → ${expectedStage}`);
            
            // Actualizar la etapa en la DB
            const { data, error } = await supabaseClient
                .from('alliance_raids')
                .update({ current_stage: expectedStage })
                .eq('id', this.currentRaid.id)
                .select()
                .single();
            
            if (error) {
                console.error("[Raid] Error al avanzar de etapa:", error);
                return false;
            }
            
            // Actualizar currentRaid local
            this.currentRaid = data;
            
            console.log(`[Raid] ✅ Etapa actualizada a ${expectedStage}`);
            
            // Notificar al jugador si está en el raid
            if (gameState.isRaid) {
                alert(
                    `🚨 NUEVA ETAPA ${expectedStage}/4 🚨\n\n` +
                    `El tiempo ha avanzado. La caravana continúa su marcha.\n\n` +
                    `¡Detenla antes de que escape!`
                );
            }
            
            return true; // Indica que hubo cambio de etapa
        }
        
        return false; // No hubo cambios
    },

    // 5. El Algoritmo de la Caravana - Calcula posición basada en tiempo real
    calculateCaravanPath: async function(stageData) {
        // PRIMERO: Verificar si debemos avanzar de etapa
        const stageChanged = await this.checkAndAdvanceStage();
        if (stageChanged && this.currentRaid.status === 'completed') {
            // El raid terminó durante la verificación
            return false;
        }
        
        const now = new Date();
        const stageStartTime = new Date(stageData.stage_start_time || this.currentRaid.start_time);
        const hoursElapsed = (now - stageStartTime) / (1000 * 60 * 60);
        
        console.log("[Raid] Calculando posición de caravana. Horas desde inicio de etapa:", hoursElapsed.toFixed(2));
        
        if (hoursElapsed <= 0) return false; // Nada que calcular

        const speed = RAID_CONFIG.CARAVAN_SPEED; // 3 casillas/hora
        const totalMovesExpected = Math.floor(hoursElapsed * speed);
        
        console.log("[Raid] Movimientos esperados desde inicio de etapa:", totalMovesExpected);
        
        // Calcular la posición ideal (sin obstáculos)
        const startCol = 1; // Siempre empieza en columna 1
        let targetCol = Math.min(24, startCol + totalMovesExpected);
        
        // Si la caravana ya está en su posición esperada o más adelante, no hacer nada
        if (stageData.caravan_pos.c >= targetCol) {
            console.log("[Raid] Caravana ya está en posición correcta o adelantada:", stageData.caravan_pos);
            return false;
        }
        
        // Calcular cuántos movimientos necesitamos hacer para alcanzar la posición objetivo
        let movesPending = targetCol - stageData.caravan_pos.c;
        let moved = false;
        
        console.log("[Raid] Moviendo caravana de columna", stageData.caravan_pos.c, "a", targetCol);
        
        // Bucle de movimiento
        for (let i = 0; i < movesPending; i++) {
            const curr = stageData.caravan_pos;
            
            // Objetivo: Llegar a la columna objetivo
            if (curr.c >= 24) {
                stageData.is_defeat = true; // La caravana escapó
                console.log("[Raid] ¡La caravana escapó! Derrota.");
                break;
            }

            // Intento 1: Avanzar Recto (c+1)
            if (!this.isBlocked(curr.r, curr.c + 1, stageData.units)) {
                curr.c++;
                moved = true;
            } 
            // Intento 2: Esquivar Abajo (r+1)
            else if (curr.r < 7 && !this.isBlocked(curr.r + 1, curr.c + 1, stageData.units)) {
                curr.r++;
                curr.c++;
                moved = true;
            }
            // Intento 3: Esquivar Arriba (r-1)
            else if (curr.r > 5 && !this.isBlocked(curr.r - 1, curr.c + 1, stageData.units)) {
                curr.r--;
                curr.c++;
                moved = true;
            } else {
                // Bloqueada completamente - se queda quieta
                console.log("[Raid] Caravana bloqueada en", curr);
                break;
            }
        }
        
        // Si hubo movimiento, actualizar en la DB
        if (moved && this.currentRaid) {
            console.log("[Raid] Nueva posición de caravana:", stageData.caravan_pos);
            
            // VALIDACIÓN CRÍTICA: Verificar que el HP no se haya corrompido
            const expectedMaxHp = stageData.caravan_max_hp;
            const currentHp = stageData.caravan_hp;
            
            console.log("[Raid] Validación antes de guardar - HP:", currentHp, "/", expectedMaxHp);
            
            if (currentHp > expectedMaxHp) {
                console.error("%c[Raid] ERROR: HP actual excede el máximo!", 'background: #ff0000; color: #fff; font-weight: bold;');
                console.error("[Raid] Esto indica corrupción de datos. Corrigiendo...");
                stageData.caravan_hp = expectedMaxHp;
            }
            
            await supabaseClient
                .from('alliance_raids')
                .update({ stage_data: stageData })
                .eq('id', this.currentRaid.id);
            
            // Actualizar visualmente en el mapa si estamos en el juego
            if (typeof updateCaravanPosition === 'function' && typeof board !== 'undefined') {
                updateCaravanPosition(stageData.caravan_pos.r, stageData.caravan_pos.c);
            }
        }
        
        return moved;
    },

    isBlocked: function(r, c, unitsMap) {
        // Recorre las unidades de los jugadores para ver si hay alguien en (r,c)
        for (const uid in unitsMap) {
            const u = unitsMap[uid];
            if (u.r === r && u.c === c && u.hp > 0) return true;
        }
        return false;
    },

    // Función para registrar daño (Llamar desde attackUnit en unit_Actions.js si gameState.isRaid es true)
    recordDamage: async function(damageAmount, updatedBossRegiments = null) {
        if (!this.currentRaid) {
            console.warn("[Raid] No hay raid activo para registrar daño");
            return;
        }

        // ⚠️ VALIDACIÓN CRÍTICA: Rechazar daño inválido
        if (typeof damageAmount !== 'number' || damageAmount <= 0) {
            console.error('%c[Raid] ❌ ERROR: Daño inválido recibido:', 'background: #ff0000; color: #fff;', damageAmount);
            console.error('[Raid] ❌ Solo se aceptan números positivos. Operación cancelada.');
            return;
        }

        // Nota: El flag isUpdatingHP ya está activo desde attackUnit()
        
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myName = PlayerDataManager.currentPlayer.username;
        
        console.log("%c[Raid] === REGISTRANDO DAÑO Y ACTUALIZANDO REGIMIENTOS ===", 'background: #ff6600; color: #fff; font-weight: bold;');
        console.log("[Raid] Jugador:", myName);
        console.log("[Raid] Daño infligido:", damageAmount);
        console.log("[Raid] Regimientos actualizados recibidos:", updatedBossRegiments ? updatedBossRegiments.length : 'ninguno');
        
        // CRÍTICO: NO calcular HP localmente, leer siempre el valor más reciente de la BD
        try {
            // 1. PRIMERO: Leer el estado ACTUAL del raid desde la BD
            const { data: raid, error: fetchError } = await supabaseClient
                .from('alliance_raids')
                .select('global_log, stage_data')
                .eq('id', this.currentRaid.id)
                .single();
                
            if (fetchError) {
                console.error("[Raid] Error al obtener datos del raid:", fetchError);
                this.isUpdatingHP = false; // Liberar flag
                return;
            }
                
            if (raid) {
                // 2. Usar el HP MÁS RECIENTE de la BD (no el local)
                const hpBeforeAttack = raid.stage_data.caravan_hp;
                const hpAfterAttack = Math.max(0, hpBeforeAttack - damageAmount);
                
                console.log("[Raid] HP en BD (antes del ataque):", hpBeforeAttack);
                console.log("[Raid] HP después de restar daño:", hpAfterAttack);
                console.log("[Raid] Diferencia:", hpBeforeAttack - hpAfterAttack);
                
                // Validación: Detectar valores anómalos
                if (hpAfterAttack > hpBeforeAttack) {
                    console.error("%c[Raid] ERROR CRÍTICO: HP aumentó en lugar de disminuir!", 'background: #ff0000; color: #fff; font-weight: bold;');
                    console.error("[Raid] Esto NO debería ocurrir. Cancelando operación.");
                    this.isUpdatingHP = false;
                    return;
                }
                
                // 3. CRÍTICO: Actualizar boss_regiments con los regimientos debilitados
                if (updatedBossRegiments && Array.isArray(updatedBossRegiments)) {
                    console.log("%c[Raid] 🔧 ACTUALIZANDO boss_regiments con HP reducido", 'background: #00ffff; color: #000; font-weight: bold;');
                    // Limpiar campos innecesarios de los regimientos antes de guardar
                    raid.stage_data.boss_regiments = updatedBossRegiments.map(reg => ({
                        type: reg.type,
                        health: reg.health,
                        maxHealth: reg.maxHealth || reg.health
                    }));
                    
                    // Log para depuración
                    const totalRegHP = raid.stage_data.boss_regiments.reduce((sum, r) => sum + r.health, 0);
                    console.log("[Raid] Total HP de regimientos guardados:", totalRegHP);
                    console.log("[Raid] Primer regimiento HP:", raid.stage_data.boss_regiments[0]?.health);
                } else {
                    console.warn("[Raid] ⚠️ No se recibieron regimientos actualizados, solo se actualiza HP total");
                }
                
                // 4. Actualizar log de daño acumulado
                const log = raid.global_log || { damage_by_user: {} };
                const currentDmg = log.damage_by_user[myUid]?.amount || 0;
                
                log.damage_by_user[myUid] = {
                    username: myName,
                    amount: currentDmg + damageAmount
                };
                
                console.log("[Raid] Daño acumulado de", myName, ":", log.damage_by_user[myUid].amount);
                
                // 5. Actualizar HP con el valor calculado desde la BD
                raid.stage_data.caravan_hp = hpAfterAttack;
                
                // Si la caravana fue destruida, marcar victoria
                if (raid.stage_data.caravan_hp <= 0) {
                    raid.stage_data.is_victory = true;
                    console.log("[Raid] ¡VICTORIA! La caravana ha sido destruida.");
                }
                
                const { error: updateError } = await supabaseClient
                    .from('alliance_raids')
                    .update({
                        stage_data: raid.stage_data,
                        global_log: log
                    })
                    .eq('id', this.currentRaid.id);
                
                if (updateError) {
                    console.error("[Raid] Error al actualizar raid:", updateError);
                    this.isUpdatingHP = false; // Liberar flag
                    return;
                }
                
                console.log("[Raid] Daño registrado exitosamente en la base de datos");
                
                // CRÍTICO: Actualizar this.currentRaid con el nuevo HP
                this.currentRaid.stage_data.caravan_hp = hpAfterAttack;
                console.log("%c[Raid] ✅ HP actualizado en currentRaid local", 'background: #00ff00; color: #000;');
                
                // Actualizar visualmente la vida de la caravana en el mapa
                const bossUnit = getUnitById('boss_caravan') || units.find(u => u.isBoss);
                if (bossUnit) {
                    bossUnit.currentHealth = hpAfterAttack;
                    // Actualizar la barra de vida
                    if (bossUnit.element) {
                        const hpBar = bossUnit.element.querySelector('.unit-strength');
                        if (hpBar) {
                            const hpPercent = Math.ceil((bossUnit.currentHealth / bossUnit.maxHealth) * 100);
                            hpBar.textContent = hpPercent + '%';
                            console.log("[Raid] Barra de vida actualizada:", hpPercent + "%");
                        }
                    }
                }
                
                // Chequear victoria
                if (hpAfterAttack <= 0) {
                    console.log("[Raid] ¡VICTORIA! Iniciando distribución de recompensas...");
                    // Delay pequeño para asegurar que la animación de combate termine
                    setTimeout(() => {
                        this.distributeRewards(log.damage_by_user);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error("[Raid] Error en recordDamage:", error);
            throw error; // Propagar error para que attackUnit() maneje el finally
        }
    },

    // Lógica de Reparto de Botín
    distributeRewards: async function(damageMap) {
        // Prevenir ejecución duplicada
        if (this._rewardsDistributed) {
            console.log("[Raid Rewards] Recompensas ya distribuidas, ignorando llamada duplicada");
            return;
        }
        this._rewardsDistributed = true;
        
        console.log("¡VICTORIA EN RAID! Calculando recompensas...");
        console.log("[Raid Rewards] Mapa de daño:", damageMap);
        
        let totalDamage = 0;
        for (let uid in damageMap) totalDamage += damageMap[uid].amount;
        
        console.log("[Raid Rewards] Daño total:", totalDamage);
        
        // Pool de Premios Base (Escala según etapa)
        const stageMultiplier = this.currentRaid?.current_stage || 1;
        const baseGems = 300 * stageMultiplier;
        const baseXp = 3000 * stageMultiplier;
        const baseSeals = 3 * stageMultiplier;
        const baseGold = 5000 * stageMultiplier;
        
        // PASO 1: Calcular recompensas para TODOS los jugadores
        const allRewards = {};
        for (let uid in damageMap) {
            const contributionPct = damageMap[uid].amount / totalDamage;
            allRewards[uid] = {
                player_uid: uid,
                player_name: damageMap[uid].name,
                damage_dealt: damageMap[uid].amount,
                contribution_pct: contributionPct,
                gems: Math.floor(baseGems * contributionPct),
                seals: Math.max(1, Math.floor(baseSeals * contributionPct)),
                xp: Math.floor(baseXp * contributionPct),
                gold: Math.floor(baseGold * contributionPct),
                claimed: false
            };
        }
        
        console.log("[Raid Rewards] Recompensas calculadas para todos:", allRewards);
        
        // PASO 2: Guardar en la BD (estructura nueva: raid.rewards_data)
        try {
            await supabaseClient
                .from('alliance_raids')
                .update({ 
                    status: 'completed',
                    'stage_data.is_victory': true,
                    rewards_data: allRewards,
                    completed_at: new Date().toISOString()
                })
                .eq('id', this.currentRaid.id);
            
            console.log("[Raid Rewards] ✅ Recompensas guardadas en BD para TODOS los jugadores");
        } catch (dbError) {
            console.error("[Raid Rewards] Error guardando recompensas:", dbError);
        }
        
        // PASO 3: Reclamar MIS recompensas (si participé)
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myRewards = allRewards[myUid];
        
        if (myRewards && totalDamage > 0) {
            try {
                await this.claimMyRewards(myRewards);
            } catch (error) {
                console.error("[Raid Rewards] Error reclamando mis recompensas:", error);
                alert("Error al procesar recompensas. Tus recompensas estarán disponibles cuando vuelvas a conectarte.");
            }
        } else {
            console.warn("[Raid Rewards] No participé en este raid");
            alert("No participaste en el daño a la caravana. ¡Necesitas atacarla para obtener recompensas!");
        }
    },
    
    // Nueva función: Reclamar recompensas de un raid
    claimMyRewards: async function(rewardsData) {
        console.log("[Raid Rewards] Reclamando mis recompensas:", rewardsData);
        
        // Otorgar recompensas
        PlayerDataManager.currentPlayer.currencies.gems += rewardsData.gems;
        PlayerDataManager.currentPlayer.currencies.gold += rewardsData.gold;
        
        if (typeof PlayerDataManager.addWarSeals === 'function') {
            PlayerDataManager.addWarSeals(rewardsData.seals);
        }
        
        // Agregar XP de Battle Pass
        if (typeof BattlePassManager !== 'undefined' && BattlePassManager.addMatchXp) {
            try {
                await BattlePassManager.addMatchXp(rewardsData.xp);
            } catch (bpError) {
                console.error("[Raid Rewards] Error en Battle Pass:", bpError);
            }
        }
        
        await PlayerDataManager.saveCurrentPlayer();
        
        console.log("[Raid Rewards] ✅ Recompensas aplicadas y guardadas");
        
        // Marcar como reclamadas en la BD
        try {
            const { data: raid } = await supabaseClient
                .from('alliance_raids')
                .select('rewards_data')
                .eq('id', this.currentRaid.id)
                .single();
            
            if (raid && raid.rewards_data) {
                const myUid = PlayerDataManager.currentPlayer.auth_id;
                raid.rewards_data[myUid].claimed = true;
                raid.rewards_data[myUid].claimed_at = new Date().toISOString();
                
                await supabaseClient
                    .from('alliance_raids')
                    .update({ rewards_data: raid.rewards_data })
                    .eq('id', this.currentRaid.id);
                
                console.log("[Raid Rewards] ✅ Marcado como reclamado en BD");
            }
        } catch (err) {
            console.error("[Raid Rewards] Error marcando como reclamado:", err);
        }
        
        // Mostrar resumen
        alert(
            `🎉 ¡VICTORIA EN EL RAID! 🎉\n\n` +
            `Tu Contribución: ${(rewardsData.contribution_pct * 100).toFixed(1)}%\n` +
            `Daño Total: ${rewardsData.damage_dealt.toLocaleString()}\n\n` +
            `RECOMPENSAS:\n` +
            `💎 ${rewardsData.gems} Gemas\n` +
            `🏆 ${rewardsData.seals} Sellos de Guerra\n` +
            `⭐ ${rewardsData.xp} XP de Pase de Batalla\n` +
            `💰 ${rewardsData.gold} Oro\n\n` +
            `¡Buen trabajo, comandante!`
        );
        
        // Volver al HQ
        setTimeout(() => {
            if (this.allianceId) {
                this.openRaidWindow(this.allianceId);
            } else {
                if (domElements.gameContainer) domElements.gameContainer.style.display = 'none';
                if (domElements.mainMenu) domElements.mainMenu.style.display = 'flex';
            }
        }, 500);
    }, 

    // En raidManager.js, añade al objeto RaidManager:

    saveMyUnitToDB: async function(unitObject) {
        if (!this.currentRaid) return;
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myName = PlayerDataManager.currentPlayer.username;

        // Extraemos solo los datos necesarios para reconstruirla
        const unitData = {
            player_name: myName,
            type: "Custom", // Tipo genérico, lo importante son los regimientos
            hp: unitObject.currentHealth,
            max_hp: unitObject.maxHealth,
            r: unitObject.r,
            c: unitObject.c,
            // ¡GUARDAMOS LOS REGIMIENTOS EXACTOS!
            regiments: unitObject.regiments.map(r => ({ type: r.type, health: r.health })),
            // Guardamos ID del héroe si tiene
            commander: unitObject.commander
        };

        // Actualizar localmente el stage_data
        this.currentRaid.stage_data.units[myUid] = unitData;

        // Enviar a Supabase
        await supabaseClient.from('alliance_raids')
            .update({ stage_data: this.currentRaid.stage_data })
            .eq('id', this.currentRaid.id);

        console.log("Unidad guardada en la nube del Raid.");
    },

    // === UTILIDADES DE DEBUG ===
    
    // Reiniciar el raid completamente (útil para pruebas)
    debugResetRaid: async function(allianceIdParam) {
        // Usar el parámetro, o el allianceId actual, o el del currentRaid
        const aliId = allianceIdParam || this.allianceId || this.currentRaid?.alliance_id;
        
        if (!aliId) {
            console.error("[Raid Debug] No hay allianceId. Pasa el ID como parámetro: debugResetRaid('tu-alliance-id')");
            console.log("[Raid Debug] O ejecuta desde el currentRaid:", this.currentRaid?.alliance_id);
            return;
        }
        
        console.log("[Raid Debug] Eliminando raids activos de alianza:", aliId);
        
        // Marcar todos los raids activos como completados
        const { error } = await supabaseClient
            .from('alliance_raids')
            .update({ status: 'completed' })
            .eq('alliance_id', aliId)
            .eq('status', 'active');
        
        if (error) {
            console.error("[Raid Debug] Error:", error);
            return;
        }
        
        console.log("[Raid Debug] ✅ Raids anteriores cerrados");
        console.log("[Raid Debug] Vuelve al HQ de tu alianza para iniciar uno nuevo");
        
        // Cerrar el juego actual y volver al menú
        if (typeof domElements !== 'undefined' && domElements.gameContainer) {
            domElements.gameContainer.style.display = 'none';
        }
        
        // Intentar abrir el modal de alianza si existe
        const allianceModal = document.getElementById('allianceModal');
        if (allianceModal) {
            allianceModal.style.display = 'flex';
            
            // Recargar el HQ
            if (typeof AllianceManager !== 'undefined') {
                AllianceManager.loadHQ(aliId);
            }
        }
    },
    
    // Ver estado detallado del raid actual
    debugShowRaidState: function() {
        if (!this.currentRaid) {
            console.log("[Raid Debug] No hay raid activo cargado");
            return;
        }
        
        console.log("[Raid Debug] === ESTADO DEL RAID ===");
        console.log("ID:", this.currentRaid.id);
        console.log("Alianza:", this.currentRaid.alliance_id);
        console.log("Inicio:", this.currentRaid.start_time);
        console.log("Etapa actual:", this.currentRaid.current_stage);
        console.log("Estado:", this.currentRaid.status);
        console.log("");
        console.log("=== STAGE DATA ===");
        console.log("stage_start_time:", this.currentRaid.stage_data.stage_start_time);
        console.log("Posición caravana:", this.currentRaid.stage_data.caravan_pos);
        console.log("HP caravana:", this.currentRaid.stage_data.caravan_hp, "/", this.currentRaid.stage_data.caravan_max_hp);
        console.log("Regimientos:", this.currentRaid.stage_data.boss_regiments?.length || 0);
        console.log("Slots ocupados:", this.currentRaid.stage_data.slots.filter(s => s !== null).length, "/ 8");
        console.log("Victoria:", this.currentRaid.stage_data.is_victory);
        console.log("Derrota:", this.currentRaid.stage_data.is_defeat);
        
        // Calcular tiempo transcurrido
        const now = new Date();
        const start = new Date(this.currentRaid.start_time);
        const stageStart = new Date(this.currentRaid.stage_data.stage_start_time || start);
        
        console.log("");
        console.log("=== TIEMPO ===");
        console.log("Horas desde inicio total:", ((now - start) / (1000*60*60)).toFixed(2));
        console.log("Horas desde inicio de etapa:", ((now - stageStart) / (1000*60*60)).toFixed(2));
        console.log("Posición esperada (col):", Math.min(24, 1 + Math.floor(((now - stageStart) / (1000*60*60)) * 3)));
    },

    // Verificar consistencia de datos del raid (nueva función de debug)
    debugCheckConsistency: function() {
        if (!this.currentRaid) {
            console.log("%c[Raid Debug] No hay raid activo cargado", 'background: #ff0000; color: #fff; font-weight: bold; padding: 5px;');
            return;
        }

        console.log("%c[Raid Debug] VERIFICACIÓN DE CONSISTENCIA", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
        
        const stageData = this.currentRaid.stage_data;
        const currentStage = this.currentRaid.current_stage;
        const expectedConfig = RAID_CONFIG.STAGES[currentStage];
        
        if (!expectedConfig) {
            console.error("%cETAPA INVÁLIDA:", 'background: #ff0000; color: #fff; font-weight: bold;', currentStage);
            return;
        }

        console.log("Etapa actual:", currentStage, "-", expectedConfig.name);
        console.log("Tipo:", expectedConfig.type);
        
        let hasErrors = false;

        // Verificar regimientos
        console.log("\n--- VERIFICACIÓN DE REGIMIENTOS ---");
        if (stageData.boss_regiments && stageData.boss_regiments.length > 0) {
            const actualType = stageData.boss_regiments[0].type;
            const expectedType = expectedConfig.regimentType;
            const actualCount = stageData.boss_regiments.length;
            const expectedCount = expectedConfig.regimentCount;
            
            console.log("Tipo esperado:", expectedType);
            console.log("Tipo actual:", actualType);
            console.log("Match:", actualType === expectedType ? "✅" : "❌");
            
            console.log("Cantidad esperada:", expectedCount);
            console.log("Cantidad actual:", actualCount);
            console.log("Match:", actualCount === expectedCount ? "✅" : "❌");
            
            if (actualType !== expectedType || actualCount !== expectedCount) {
                console.error(
                    "%c¡INCONSISTENCIA EN REGIMIENTOS!",
                    'background: #ff0000; color: #fff; font-weight: bold; padding: 10px;'
                );
                hasErrors = true;
            }
        } else {
            console.error("⚠️ No hay regimientos del boss");
            hasErrors = true;
        }
        
        // Verificar posición
        console.log("\n--- VERIFICACIÓN DE POSICIÓN ---");
        if (stageData.caravan_pos) {
            console.log("Posición actual:", stageData.caravan_pos);
            if (stageData.caravan_pos.c < 1) {
                console.error("❌ Posición inválida (columna < 1)");
                hasErrors = true;
            } else {
                console.log("✅ Posición válida");
            }
        } else {
            console.error("⚠️ No hay posición de caravana");
            hasErrors = true;
        }
        
        // Verificar HP
        console.log("\n--- VERIFICACIÓN DE HP ---");
        console.log("HP actual:", stageData.caravan_hp);
        console.log("HP máximo:", stageData.caravan_max_hp);
        
        // Calcular HP esperado basado en regimientos
        let expectedHp = 0;
        if (stageData.boss_regiments && stageData.boss_regiments.length > 0) {
            expectedHp = stageData.boss_regiments.reduce((sum, r) => sum + (r.maxHealth || r.health), 0);
            console.log("HP esperado según regimientos:", expectedHp);
        }
        
        if (stageData.caravan_hp > stageData.caravan_max_hp) {
            console.error("❌ HP actual excede el máximo");
            hasErrors = true;
        } else if (expectedHp > 0 && stageData.caravan_max_hp !== expectedHp) {
            console.error("❌ HP máximo NO coincide con la suma de regimientos");
            console.error("   Esperado:", expectedHp);
            console.error("   Actual:", stageData.caravan_max_hp);
            hasErrors = true;
        } else {
            console.log("✅ HP máximo válido");
        }
        
        // CRÍTICO: Verificar si hay herencia de daño
        const hpPercentage = (stageData.caravan_hp / stageData.caravan_max_hp) * 100;
        console.log("Porcentaje de HP:", hpPercentage.toFixed(1) + "%");
        
        if (hpPercentage < 100) {
            console.error(
                "%c⚠️ HERENCIA DE DAÑO DETECTADA",
                'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;'
            );
            console.error("La caravana de esta fase ya tiene daño");
            console.error("HP faltante:", stageData.caravan_max_hp - stageData.caravan_hp);
            console.error("Esto NO debería ocurrir en una fase nueva");
            hasErrors = true;
        } else {
            console.log("✅ La caravana tiene HP completo (sin daño heredado)");
        }
        
        // Resultado final
        console.log("\n" + "=".repeat(50));
        if (hasErrors) {
            console.error(
                "%c¡SE ENCONTRARON INCONSISTENCIAS!",
                'background: #ff0000; color: #fff; font-weight: bold; padding: 10px;'
            );
            console.log("%cRecomendación: Usa RaidManager.debugForceNextStage() para forzar la transición correcta", 
                'background: #ffff00; color: #000; font-weight: bold; padding: 5px;');
        } else {
            console.log(
                "%c✅ TODOS LOS DATOS SON CONSISTENTES",
                'background: #00ff00; color: #000; font-weight: bold; padding: 10px;'
            );
        }
    },

    // NUEVA FUNCIÓN: Reparar HP de la caravana (emergencia)
    debugRepairCaravanHP: async function() {
        if (!this.currentRaid) {
            console.error("[Raid Debug] No hay raid activo");
            return;
        }

        console.log("%c=== REPARACIÓN DE HP DE CARAVANA ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
        
        const stageData = this.currentRaid.stage_data;
        const currentStage = this.currentRaid.current_stage;
        const config = RAID_CONFIG.STAGES[currentStage];
        
        if (!config) {
            console.error("Etapa inválida:", currentStage);
            return;
        }

        console.log("Etapa actual:", currentStage, "-", config.name);
        console.log("HP actual:", stageData.caravan_hp, "/", stageData.caravan_max_hp);
        
        // Recalcular HP correcto basado en la configuración de la etapa
        const regimentType = config.regimentType;
        const regimentCount = config.regimentCount;
        const baseStats = REGIMENT_TYPES[regimentType];
        
        if (!baseStats) {
            console.error("Tipo de regimiento no encontrado:", regimentType);
            return;
        }

        const correctMaxHP = regimentCount * baseStats.health;
        
        console.log("\n--- VALORES CORRECTOS ---");
        console.log("Tipo de regimiento:", regimentType);
        console.log("Cantidad:", regimentCount);
        console.log("HP por regimiento:", baseStats.health);
        console.log("HP máximo correcto:", correctMaxHP);
        
        if (stageData.caravan_hp === correctMaxHP && stageData.caravan_max_hp === correctMaxHP) {
            console.log("%c✅ El HP ya es correcto, no se necesita reparación", 'background: #00ff00; color: #000; font-weight: bold;');
            return;
        }

        console.log("\n%c⚠️ Se detectó HP incorrecto. Reparando...", 'background: #ff0000; color: #fff; font-weight: bold;');
        
        // Regenerar regimientos correctos
        const newRegiments = [];
        for (let i = 0; i < regimentCount; i++) {
            newRegiments.push({
                type: regimentType,
                health: baseStats.health,
                maxHealth: baseStats.health
            });
        }

        // Actualizar stage_data
        stageData.boss_regiments = newRegiments;
        stageData.caravan_hp = correctMaxHP;
        stageData.caravan_max_hp = correctMaxHP;

        // Guardar en la BD
        const { error } = await supabaseClient
            .from('alliance_raids')
            .update({ stage_data: stageData })
            .eq('id', this.currentRaid.id);

        if (error) {
            console.error("Error al guardar:", error);
            return;
        }

        console.log("%c✅ HP REPARADO EXITOSAMENTE", 'background: #00ff00; color: #000; font-weight: bold; padding: 10px;');
        console.log("Nuevo HP:", correctMaxHP, "/", correctMaxHP);
        console.log("\n⚠️ IMPORTANTE: Sal y vuelve a entrar al raid para ver los cambios");
        
        // Actualizar el currentRaid local
        this.currentRaid.stage_data = stageData;
    },

    // Verificar recompensas pendientes (llamar al iniciar sesión)
    checkPendingRewards: async function() {
        const myUid = PlayerDataManager.currentPlayer?.auth_id;
        if (!myUid) {
            console.log('[Raid] No hay usuario autenticado, saltando check de recompensas pendientes');
            return;
        }
        
        console.log('[Raid] Verificando recompensas pendientes para:', myUid);
        
        try {
            const { data: completedRaids, error } = await supabaseClient
                .from('alliance_raids')
                .select('id, rewards_data, current_stage, completed_at')
                .eq('status', 'completed');
            
            if (error) {
                console.error('[Raid] Error en query de recompensas:', error);
                return;
            }
            
            if (!completedRaids || completedRaids.length === 0) {
                console.log('[Raid] No hay raids completados');
                return;
            }
            
            let pendingCount = 0;
            
            for (let raid of completedRaids) {
                // Saltar raids sin rewards_data
                if (!raid.rewards_data) continue;
                
                const myRewards = raid.rewards_data[myUid];
                
                if (myRewards && !myRewards.claimed) {
                    pendingCount++;
                    await this.claimPendingReward(raid.id, myRewards, raid.current_stage, raid.completed_at);
                }
            }
            
            if (pendingCount > 0) {
                console.log(`[Raid] ✅ ${pendingCount} recompensa(s) pendiente(s) entregada(s)`);
            }
        } catch (error) {
            console.error('[Raid] Error verificando recompensas pendientes:', error);
        }
    },
    
    claimPendingReward: async function(raidId, rewards, stage, completedAt) {
        try {
            PlayerDataManager.currentPlayer.currencies.gems += rewards.gems;
            PlayerDataManager.currentPlayer.currencies.gold += rewards.gold;
            
            if (typeof PlayerDataManager.addWarSeals === 'function') {
                PlayerDataManager.addWarSeals(rewards.seals);
            }
            
            if (typeof BattlePassManager !== 'undefined' && BattlePassManager.addMatchXp) {
                await BattlePassManager.addMatchXp(rewards.xp).catch(e => console.error(e));
            }
            
            await PlayerDataManager.saveCurrentPlayer();
            
            const { data: raid } = await supabaseClient
                .from('alliance_raids')
                .select('rewards_data')
                .eq('id', raidId)
                .single();
            
            if (raid?.rewards_data) {
                raid.rewards_data[PlayerDataManager.currentPlayer.auth_id].claimed = true;
                raid.rewards_data[PlayerDataManager.currentPlayer.auth_id].claimed_at = new Date().toISOString();
                
                await supabaseClient
                    .from('alliance_raids')
                    .update({ rewards_data: raid.rewards_data })
                    .eq('id', raidId);
            }
            
            const date = new Date(completedAt).toLocaleDateString();
            alert(
                `✨ ¡RECOMPENSAS DE RAID PENDIENTES! ✨\n\n` +
                `Raid Fase ${stage} (${date})\n` +
                `Contribución: ${(rewards.contribution_pct * 100).toFixed(1)}%\n\n` +
                `💎 ${rewards.gems} Gemas\n` +
                `🏆 ${rewards.seals} Sellos\n` +
                `⭐ ${rewards.xp} XP\n` +
                `💰 ${rewards.gold} Oro`
            );
        } catch (error) {
            console.error('[Raid] Error reclamando recompensa:', error);
        }
    }

};
