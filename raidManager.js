// raidManager.js
console.log("raidManager.js CARGADO - Motor de Incursión.");

const RaidManager = {
    currentRaid: null,
    allianceId: null,

    // 1. INICIAR (Solo Líder)
    startNewRaid: async function(aliId) {
        console.log("Iniciando nueva incursión...");
        const now = new Date();
        
        const newRaid = {
            alliance_id: aliId,
            start_time: now.toISOString(),
            current_stage: 1,
            status: 'active',
            stage_data: {
                caravan_hp: 100000,
                caravan_max_hp: 100000,
                caravan_pos: { r: 6, c: 0 },
                last_update: now.toISOString(),
                // 8 Slots vacíos
                slots: [null, null, null, null, null, null, null, null],
                units: {}
            },
            global_log: { damage_by_user: {} }
        };

        const { error } = await supabaseClient
            .from('alliance_raids')
            .insert(newRaid);
        
        if (error) {
            console.error("Error al iniciar raid:", error);
            alert("Error al iniciar el evento.");
        } else {
            alert("¡La Ruta del Oro ha comenzado! Tus tropas pueden atacar.");
        }
    },

    // 2. ENTRAR (Cualquier miembro, botón ATACAR)
    enterRaid: async function() {
        if (!this.currentRaid) return;
        
        const player = PlayerDataManager.currentPlayer;
        const uid = player.auth_id;
        const stageData = this.currentRaid.stage_data;
        
        console.log("Intentando entrar al Raid ID:", this.currentRaid.id);

        // A. Verificar si ya estoy dentro (Reconexión)
        let mySlotIdx = stageData.slots.indexOf(uid);
        
        // B. Si no estoy dentro, intentar pagar y ocupar slot
        if (mySlotIdx === -1) {
            
            // Buscar hueco
            mySlotIdx = stageData.slots.indexOf(null);
            
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

            // Asignar Slot y Unidad Inicial
            stageData.slots[mySlotIdx] = uid;
            
            // Definir unidad según etapa (Tierra/Mar)
            // (Asegúrate de que RAID_CONFIG.STAGES esté definido en constants.js)
            const stageType = RAID_CONFIG.STAGES?.[this.currentRaid.current_stage]?.type || 'land';
            const unitType = stageType === 'naval' ? 'Barco de Guerra' : 'Infantería Pesada';
            
            // Slot 0-3: Arriba (Row 2), Slot 4-7: Abajo (Row 9)
            const spawnRow = mySlotIdx < 4 ? (mySlotIdx + 1) : (mySlotIdx + 5); 

            if (!stageData.units) stageData.units = {};
            stageData.units[uid] = {
                type: unitType,
                hp: 200, // Vida estándar
                max_hp: 200,
                r: spawnRow,
                c: 0, 
                player_name: player.username
            };
            
            // Guardar ocupación en DB
            await supabaseClient
                .from('alliance_raids')
                .update({ stage_data: stageData })
                .eq('id', this.currentRaid.id);
        }

        // C. Cargar Mapa Visual
        this.showRaidMap(stageData);
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
        // Aquí mostraremos un modal simple o usaremos el gameContainer vacío
        alert(`¡Victoria en esta etapa!\n\nLa caravana ha sido detenida o destruida.\n\nLa Etapa ${nextStage} comenzará pronto.`);
        // Volver al HQ
        document.getElementById('allianceModal').style.display = 'flex';
    },
    
    // UI: Cargar Mapa (Placeholder)
    showRaidMap: function() {
        console.log("Cargando mapa de incursión...");
        // Aquí llamaremos a initializeNewGameBoardDOMAndData con el tipo de terreno forzado
        // ...
        
        // Mostrar pantalla de juego
        showScreen(domElements.gameContainer);
    },
    
    finishRaid: function() {
        alert("El evento de Incursión ha terminado. Calculando recompensas...");
        // Lógica de reparto final...
    },

    // 4. Entrar a la Incursión (Jugador)
    enterRaid: async function() {
        const player = PlayerDataManager.currentPlayer;
        const uid = player.auth_id;
        
        // A. Validaciones
        if (!this.currentRaid) return;
        if (player.currencies.gold < RAID_CONFIG.ENTRY_COST) {
            alert(`Necesitas ${RAID_CONFIG.ENTRY_COST} de oro para unirte a la incursión.`);
            return;
        }

        // B. Refrescar estado para asegurar slots libres reales
        const { data: freshRaid } = await supabaseClient
            .from('alliance_raids')
            .select('*')
            .eq('id', this.currentRaid.id)
            .single();
        this.currentRaid = freshRaid;

        const stageData = this.currentRaid.stage_data;
        
        // ¿Ya estoy dentro?
        let mySlotIdx = stageData.slots.indexOf(uid);
        
        if (mySlotIdx === -1) {
            // No estoy dentro. Buscar hueco libre.
            mySlotIdx = stageData.slots.indexOf(null);
            
            if (mySlotIdx === -1) {
                alert("El frente de batalla está lleno (8/8 jugadores). Espera una baja.");
                return;
            }

            // Cobrar entrada
            player.currencies.gold -= RAID_CONFIG.ENTRY_COST;
            await PlayerDataManager.saveCurrentPlayer();

            // Ocupar Slot
            stageData.slots[mySlotIdx] = uid;
            
            // Asignar unidad inicial (Si es Naval o Terrestre depende de la etapa)
            const stageConfig = RAID_CONFIG.STAGES[this.currentRaid.current_stage];
            const unitType = stageConfig.type === 'naval' ? 'Barco de Guerra' : 'Infantería Pesada'; // Unidad base
            
            // Posición de despliegue según el slot (Rows 1-4 o 8-12)
            // Slots 0-3 van arriba, 4-7 van abajo
            const spawnRow = mySlotIdx < 4 ? mySlotIdx : (mySlotIdx + 4); // Ej: 0,1,2,3 o 8,9,10,11
            
            // Guardar mi unidad en la persistencia del Raid
            if (!stageData.units) stageData.units = {};
            stageData.units[uid] = {
                type: unitType,
                hp: 200, // Salud base estándar
                max_hp: 200,
                r: spawnRow,
                c: 0, // Empiezan a la izquierda
                player_name: player.username
            };
        }

        // C. Calcular Movimiento de la Caravana (Lazy Update) antes de guardar
        this.calculateCaravanPath(stageData);

        // D. Guardar todo en DB
        await supabaseClient
            .from('alliance_raids')
            .update({ stage_data: stageData })
            .eq('id', this.currentRaid.id);

        // E. Cargar Mapa Visual
        this.showRaidMap(stageData);
    },

    // 5. El Algoritmo "Perezoso" de la Caravana
    calculateCaravanPath: function(stageData) {
        const now = new Date();
        const lastUpdate = new Date(stageData.last_update || now); // Si es null, es ahora
        const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);
        
        if (hoursPassed <= 0) return; // Nada que actualizar

        const speed = RAID_CONFIG.CARAVAN_SPEED; // 3 casillas/hora
        let movesPending = Math.floor(hoursPassed * speed);
        
        // Si no hay movimientos completos, salimos (acumulamos tiempo decimal para la próxima en un sistema real, aquí simplificamos)
        if (movesPending < 1) return;

        // Bucle de movimiento
        for (let i = 0; i < movesPending; i++) {
            const curr = stageData.caravan_pos; // {r, c}
            
            // Objetivo: Llegar a la columna 24
            if (curr.c >= 24) {
                stageData.is_victory = false; // La caravana escapó = Derrota de jugadores
                // Podríamos marcar status='failed' aquí
                break;
            }

            // Intento 1: Avanzar Recto (c+1)
            if (!this.isBlocked(curr.r, curr.c + 1, stageData.units)) {
                curr.c++;
            } 
            // Intento 2: Esquivar Abajo (r+1)
            else if (curr.r < 7 && !this.isBlocked(curr.r + 1, curr.c + 1, stageData.units)) {
                curr.r++;
                curr.c++;
            }
            // Intento 3: Esquivar Arriba (r-1)
            else if (curr.r > 5 && !this.isBlocked(curr.r - 1, curr.c + 1, stageData.units)) {
                curr.r--;
                curr.c++;
            }
            // Si todo está bloqueado, se queda quieta (pierde el turno de movimiento)
        }

        // Actualizar timestamp
        stageData.last_update = now.toISOString();
    },

    isBlocked: function(r, c, unitsMap) {
        // Recorre las unidades de los jugadores para ver si hay alguien en (r,c)
        for (const uid in unitsMap) {
            const u = unitsMap[uid];
            if (u.r === r && u.c === c && u.hp > 0) return true;
        }
        return false;
    }, 

    showRaidMap: function(stageData) {
        // Si no pasamos stageData, usar el actual
        const data = stageData || this.currentRaid.stage_data;
        const config = RAID_CONFIG.STAGES[this.currentRaid.current_stage];
        
        // Cerrar modales
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        
        // Iniciar mapa
        if (typeof initializeRaidMap === 'function') {
            initializeRaidMap(config, data);
            showScreen(domElements.gameContainer);
            if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
        }
    }, 

    // Función para registrar daño (Llamar desde attackUnit en unit_Actions.js si gameState.isRaid es true)
    recordDamage: async function(damageAmount) {
        if (!this.currentRaid) return;
        
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myName = PlayerDataManager.currentPlayer.username;
        
        // 1. Actualizar HP localmente
        this.currentRaid.stage_data.caravan_hp = Math.max(0, this.currentRaid.stage_data.caravan_hp - damageAmount);
        
        // 2. Actualizar Log de Daño en DB
        // Usamos una llamada RPC (Stored Procedure) o actualización directa JSON si Supabase lo permite fácil.
        // Aquí hacemos un fetch + update simple por seguridad.
        
        const { data: raid } = await supabaseClient
            .from('alliance_raids')
            .select('global_log, stage_data')
            .eq('id', this.currentRaid.id)
            .single();
            
        if (raid) {
            const log = raid.global_log || { damage_by_user: {} };
            const currentDmg = log.damage_by_user[myUid]?.amount || 0;
            
            log.damage_by_user[myUid] = {
                username: myName,
                amount: currentDmg + damageAmount
            };
            
            // Actualizamos HP y Log
            raid.stage_data.caravan_hp = this.currentRaid.stage_data.caravan_hp;
            
            await supabaseClient.from('alliance_raids').update({
                stage_data: raid.stage_data,
                global_log: log
            }).eq('id', this.currentRaid.id);
            
            // Chequear victoria
            if (raid.stage_data.caravan_hp <= 0) {
                this.distributeRewards(log.damage_by_user);
            }
        }
    },

    // Lógica de Reparto de Botín
    distributeRewards: async function(damageMap) {
        console.log("¡VICTORIA EN RAID! Calculando recompensas...");
        
        let totalDamage = 0;
        for (let uid in damageMap) totalDamage += damageMap[uid].amount;
        
        // Si yo soy quien dio el golpe final (o el líder que lo procesa), 
        // calculo mi parte. (Idealmente esto se haría en servidor, pero aquí lo hacemos local).
        // Para simplificar: Cada cliente calcula SU propia recompensa y la reclama.
        
        const myUid = PlayerDataManager.currentPlayer.auth_id;
        const myData = damageMap[myUid];
        
        if (myData && totalDamage > 0) {
            const contributionPct = myData.amount / totalDamage;
            
            // Pool de Premios Base
            const baseGems = 500;
            const baseXp = 5000;
            const baseSeals = 5;
            
            const myGems = Math.floor(baseGems * contributionPct);
            const mySeals = Math.max(1, Math.floor(baseSeals * contributionPct)); // Mínimo 1 sello si participaste
            
            // Otorgar
            PlayerDataManager.currentPlayer.currencies.gems += myGems;
            PlayerDataManager.addWarSeals(mySeals);
            await BattlePassManager.addMatchXp(baseXp * contributionPct);
            
            await PlayerDataManager.saveCurrentPlayer();
            
            alert(`¡VICTORIA! Contribución: ${(contributionPct*100).toFixed(1)}%\nRecompensas: ${myGems} Gemas, ${mySeals} Sellos.`);
            
            // Cerrar Raid y marcar como terminada en DB (Solo si soy líder o el último)
            // Aquí simplemente recargamos la página o volvemos al HQ.
            this.openRaidWindow(this.allianceId); // Volver al HQ
        }
    }

};