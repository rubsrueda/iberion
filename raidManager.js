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
                caravan_pos: { r: 6, c: 1 }, // Posición inicial en agua, no en la fortaleza
                last_update: now.toISOString(),
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
        const stageData = this.currentRaid.stage_data;
        
        console.log("[Raid] Intentando entrar al Raid ID:", this.currentRaid.id);
        console.log("[Raid] Datos del jugador:", {uid, username: player.username, gold: player.currencies.gold});

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
                madera: 5000,
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
        
        console.log("[Raid] gameState inicializado correctamente");

        // D. Cargar Mapa Visual
        this.showRaidMap(stageData);
        
        // E. Calcular y aplicar movimiento automático de la caravana
        console.log("[Raid] Calculando movimiento automático de la caravana...");
        await this.calculateCaravanPath(stageData);
        
        // F. Mensaje de bienvenida
        setTimeout(() => {
            alert(
                "🗡️ FASE DE PREPARACIÓN 🗡️\n\n" +
                "1. Tienes 250 Puntos de Investigación (💡)\n" +
                "2. Usa tu fortaleza para crear tu DIVISIÓN\n" +
                "3. Una vez lista, pulsa 'Finalizar Turno'\n\n" +
                "¡Detén la Caravana Imperial!"
            );
        }, 500);
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
                // Ocultar todos los modales
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
                
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

    // 2. Cerebro Temporal
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
                // MODO COMBATE: Abrir el mapa y procesar movimiento de caravana
                this.processCaravanMovement(hoursElapsedTotal); // Lo haremos en el siguiente paso
                this.showRaidMap();
            }
        }
    },

    // 3. Transición de Etapa (Reset)
    transitionToStage: async function(newStageIdx) {
        // Reiniciar datos para la nueva etapa
        const newStageData = {
            caravan_hp: 100000,
            caravan_max_hp: 100000,
            caravan_pos: { r: 6, c: 0 },
            last_update: new Date().toISOString(), // El reloj de movimiento empieza ahora para esta etapa
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
            console.log(`[Raid] Etapa ${newStageIdx} iniciada.`);
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

    // 3. MOSTRAR MAPA
    showRaidMap: function(stageData) {
        // Si no pasamos stageData, usar el actual
        const data = stageData || this.currentRaid.stage_data;
        const stageNum = this.currentRaid.current_stage;
        const config = (typeof RAID_CONFIG !== 'undefined' && RAID_CONFIG.STAGES) 
            ? RAID_CONFIG.STAGES[stageNum] 
            : { name: "Zona Desconocida", type: "land", mapType: "plains", caravan: "Caravana" };
        
        console.log("[Raid] Cargando mapa de incursión. Etapa:", stageNum, "Config:", config);
        
        // Cerrar todos los modales
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        
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

    // 4. Entrar a la Incursión (Jugador)
    enterRaid: async function() {
        if (!this.currentRaid) return;
        
        const player = PlayerDataManager.currentPlayer;
        const uid = player.auth_id;
        const stageData = this.currentRaid.stage_data;
        
        // 1. CHEQUEO DE ENTRADA
        let mySlotIdx = stageData.slots.indexOf(uid);
        
        // (Tu lógica de pago existente va aquí...)

        // 2. PREPARACIÓN DEL "ENTORNO DE GUERRA"
        console.log("Configurando entorno táctico de Incursión...");

        // === CORRECCIÓN DEL ERROR ===
        // Inicializamos los contenedores del estado antes de usarlos
        gameState.currentPhase = "play";
        gameState.currentPlayer = 1;
        gameState.myPlayerNumber = 1; // En el Raid, tú siempre eres el 'Jugador 1' localmente

        // Creamos los objetos vacíos para evitar el error "undefined"
        gameState.playerResources = {}; 
        gameState.playerCivilizations = { 1: "Iberia", 2: "Bárbaros" }; // Valores por defecto para evitar error visual
        gameState.playerTypes = { player1: "human", player2: "ai" };
        gameState.unitsPlacedByPlayer = { 1: 0 }; 
        gameState.activeCommanders = { 1: [] };
        // ============================

        // A. AHORA SÍ ASIGNAMOS LOS RECURSOS (Ya no dará error)
        gameState.playerResources[1] = {
            oro: 40000,
            comida: 5000,
            madera: 5000,
            hierro: 5000,
            piedra: 2000,
            researchPoints: 250, 
            researchedTechnologies: ["ORGANIZATION", "NAVIGATION"], 
            puntosReclutamiento: 2000 
        };

        // C. Configuración de Fase
        gameState.deploymentUnitLimit = 1; // Solo 1 Gran División por jugador

        // 3. CARGAR EL MAPA
        this.showRaidMap(stageData);
        
        // 4. MENSAJE
        alert(
            "--- FASE DE PREPARACIÓN ---\n\n" +
            "1. Tienes 250 Puntos de Investigación. Úsalos sabiamente en el menú (💡).\n" +
            "2. Elige tu rol: ¿Tanque Pesado? ¿DPS a Distancia? ¿Soporte?\n" +
            "3. Crea tu DIVISIÓN en tu Puerto asignado.\n" +
            "4. Cuando estés listo, pulsa 'Finalizar Turno' para sincronizar."
        );
    },

    // 5. El Algoritmo "Perezoso" de la Caravana
    calculateCaravanPath: async function(stageData) {
        const now = new Date();
        const lastUpdate = new Date(stageData.last_update || now); // Si es null, es ahora
        const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
        
        console.log("[Raid] Calculando movimiento de caravana. Horas pasadas:", hoursPassed);
        
        if (hoursPassed <= 0) return false; // Nada que actualizar

        const speed = RAID_CONFIG.CARAVAN_SPEED; // 3 casillas/hora
        let movesPending = Math.floor(hoursPassed * speed);
        
        // Si no hay movimientos completos, salimos
        if (movesPending < 1) return false;

        let moved = false;
        // Bucle de movimiento
        for (let i = 0; i < movesPending; i++) {
            const curr = stageData.caravan_pos; // {r, c}
            
            console.log("[Raid] Intentando mover caravana desde", curr);
            
            // Objetivo: Llegar a la columna 24
            if (curr.c >= 24) {
                stageData.is_victory = false; // La caravana escapó = Derrota de jugadores
                stageData.is_defeat = true;
                console.log("[Raid] ¡La caravana escapó! Derrota.");
                break;
            }

            // Intento 1: Avanzar Recto (c+1)
            if (!this.isBlocked(curr.r, curr.c + 1, stageData.units)) {
                curr.c++;
                moved = true;
                console.log("[Raid] Caravana avanzó recto a", curr);
            } 
            // Intento 2: Esquivar Abajo (r+1)
            else if (curr.r < 7 && !this.isBlocked(curr.r + 1, curr.c + 1, stageData.units)) {
                curr.r++;
                curr.c++;
                moved = true;
                console.log("[Raid] Caravana esquivó hacia abajo a", curr);
            }
            // Intento 3: Esquivar Arriba (r-1)
            else if (curr.r > 5 && !this.isBlocked(curr.r - 1, curr.c + 1, stageData.units)) {
                curr.r--;
                curr.c++;
                moved = true;
                console.log("[Raid] Caravana esquivó hacia arriba a", curr);
            } else {
                console.log("[Raid] Caravana bloqueada en", curr);
            }
            // Si todo está bloqueado, se queda quieta (pierde el turno de movimiento)
        }

        // Actualizar timestamp
        stageData.last_update = now.toISOString();
        
        // Si hubo movimiento, actualizar en la DB
        if (moved && this.currentRaid) {
            await supabaseClient
                .from('alliance_raids')
                .update({ stage_data: stageData })
                .eq('id', this.currentRaid.id);
            
            console.log("[Raid] Posición de caravana actualizada en DB");
            
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
    recordDamage: async function(damageAmount) {
        if (!this.currentRaid) {
            console.warn("[Raid] No hay raid activo para registrar daño");
            return;
        }
        
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myName = PlayerDataManager.currentPlayer.username;
        
        console.log("[Raid] Registrando daño:", damageAmount, "por", myName);
        
        // 1. Actualizar HP localmente
        const previousHp = this.currentRaid.stage_data.caravan_hp;
        this.currentRaid.stage_data.caravan_hp = Math.max(0, previousHp - damageAmount);
        
        console.log("[Raid] HP de caravana:", previousHp, "->", this.currentRaid.stage_data.caravan_hp);
        
        // 2. Actualizar Log de Daño en DB
        // Usamos una llamada RPC (Stored Procedure) o actualización directa JSON si Supabase lo permite fácil.
        // Aquí hacemos un fetch + update simple por seguridad.
        
        try {
            const { data: raid, error: fetchError } = await supabaseClient
                .from('alliance_raids')
                .select('global_log, stage_data')
                .eq('id', this.currentRaid.id)
                .single();
                
            if (fetchError) {
                console.error("[Raid] Error al obtener datos del raid:", fetchError);
                return;
            }
                
            if (raid) {
                const log = raid.global_log || { damage_by_user: {} };
                const currentDmg = log.damage_by_user[myUid]?.amount || 0;
                
                log.damage_by_user[myUid] = {
                    username: myName,
                    amount: currentDmg + damageAmount
                };
                
                console.log("[Raid] Daño acumulado de", myName, ":", log.damage_by_user[myUid].amount);
                
                // Actualizamos HP y Log
                raid.stage_data.caravan_hp = this.currentRaid.stage_data.caravan_hp;
                
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
                    return;
                }
                
                console.log("[Raid] Daño registrado exitosamente en la base de datos");
                
                // Chequear victoria
                if (raid.stage_data.caravan_hp <= 0) {
                    console.log("[Raid] Iniciando distribución de recompensas...");
                    // Delay pequeño para asegurar que la animación de combate termine
                    setTimeout(() => {
                        this.distributeRewards(log.damage_by_user);
                    }, 1000);
                }
                
                // Actualizar visualmente la vida de la caravana en el mapa
                const bossUnit = units.find(u => u.id === 'boss_caravan' || u.isBoss);
                if (bossUnit) {
                    bossUnit.currentHealth = this.currentRaid.stage_data.caravan_hp;
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
            }
        } catch (error) {
            console.error("[Raid] Error en recordDamage:", error);
        }
    },

    // Lógica de Reparto de Botín
    distributeRewards: async function(damageMap) {
        console.log("¡VICTORIA EN RAID! Calculando recompensas...");
        console.log("[Raid Rewards] Mapa de daño:", damageMap);
        
        let totalDamage = 0;
        for (let uid in damageMap) totalDamage += damageMap[uid].amount;
        
        console.log("[Raid Rewards] Daño total:", totalDamage);
        
        // Si yo soy quien dio el golpe final (o el líder que lo procesa), 
        // calculo mi parte. (Idealmente esto se haría en servidor, pero aquí lo hacemos local).
        // Para simplificar: Cada cliente calcula SU propia recompensa y la reclama.
        
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myData = damageMap[myUid];
        
        console.log("[Raid Rewards] Mi UID:", myUid, "Mis datos:", myData);
        
        if (myData && totalDamage > 0) {
            const contributionPct = myData.amount / totalDamage;
            
            console.log("[Raid Rewards] Mi contribución:", (contributionPct * 100).toFixed(1) + "%");
            
            // Pool de Premios Base (Escala según etapa)
            const stageMultiplier = this.currentRaid?.current_stage || 1;
            const baseGems = 300 * stageMultiplier;
            const baseXp = 3000 * stageMultiplier;
            const baseSeals = 3 * stageMultiplier;
            const baseGold = 5000 * stageMultiplier;
            
            const myGems = Math.floor(baseGems * contributionPct);
            const mySeals = Math.max(1, Math.floor(baseSeals * contributionPct)); // Mínimo 1 sello si participaste
            const myXp = Math.floor(baseXp * contributionPct);
            const myGold = Math.floor(baseGold * contributionPct);
            
            console.log("[Raid Rewards] Calculadas:", { myGems, mySeals, myXp, myGold });
            
            // Otorgar con manejo de errores
            try {
                PlayerDataManager.currentPlayer.currencies.gems += myGems;
                PlayerDataManager.currentPlayer.currencies.gold += myGold;
                
                if (typeof PlayerDataManager.addWarSeals === 'function') {
                    PlayerDataManager.addWarSeals(mySeals);
                } else {
                    console.warn("[Raid Rewards] Función addWarSeals no disponible");
                }
                
                // Agregar XP de Battle Pass con retry
                if (typeof BattlePassManager !== 'undefined' && BattlePassManager.addMatchXp) {
                    try {
                        const xpResult = await BattlePassManager.addMatchXp(myXp);
                        if (!xpResult || !xpResult.success) {
                            console.warn("[Raid Rewards] Error al agregar XP de Battle Pass:", xpResult?.error);
                            // Re-intentar una vez
                            await new Promise(r => setTimeout(r, 1000));
                            await BattlePassManager.addMatchXp(myXp);
                        }
                    } catch (bpError) {
                        console.error("[Raid Rewards] Error en Battle Pass:", bpError);
                    }
                } else {
                    console.warn("[Raid Rewards] BattlePassManager no disponible");
                }
                
                await PlayerDataManager.saveCurrentPlayer();
                
                console.log("[Raid Rewards] Recompensas guardadas exitosamente");
                
                // Mostrar resumen detallado
                alert(
                    `🎉 ¡VICTORIA EN EL RAID! 🎉\n\n` +
                    `Tu Contribución: ${(contributionPct*100).toFixed(1)}%\n` +
                    `Daño Total: ${myData.amount.toLocaleString()}\n\n` +
                    `RECOMPENSAS:\n` +
                    `💎 ${myGems} Gemas\n` +
                    `🏆 ${mySeals} Sellos de Guerra\n` +
                    `⭐ ${myXp} XP de Pase de Batalla\n` +
                    `💰 ${myGold} Oro\n\n` +
                    `¡Buen trabajo, comandante!`
                );
                
                // Marcar raid como completado
                if (this.currentRaid) {
                    await supabaseClient
                        .from('alliance_raids')
                        .update({ 
                            status: 'completed',
                            'stage_data.is_victory': true
                        })
                        .eq('id', this.currentRaid.id);
                }
                
                // Volver al HQ
                setTimeout(() => {
                    if (this.allianceId) {
                        this.openRaidWindow(this.allianceId);
                    } else {
                        // Cerrar juego y volver a menú principal
                        if (domElements.gameContainer) domElements.gameContainer.style.display = 'none';
                        if (domElements.mainMenu) domElements.mainMenu.style.display = 'flex';
                    }
                }, 500);
            } catch (error) {
                console.error("[Raid Rewards] Error procesando recompensas:", error);
                alert("Error al procesar recompensas. Tus recompensas se guardarán cuando vuelvas a conectarte.");
            }
        } else {
            console.warn("[Raid Rewards] No hay datos de daño para este jugador o daño total es 0");
            alert("No participaste en el daño a la caravana. ¡Necesitas atacarla para obtener recompensas!");
        }
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

};