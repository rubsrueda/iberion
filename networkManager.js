// networkManager.js - VERSIÓN CORREGIDA (SERIALIZACIÓN SEGURA)

const NetworkManager = {
    miId: null,
    esAnfitrion: false,
    checkInterval: null,
    subscription: null,

    _clearMatchPolling: function() {
        if (typeof window !== 'undefined' && window.intervalManager) {
            window.intervalManager.clearInterval('network_matchPolling');
        } else if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.checkInterval = null;
    },

    _generarCodigoCorto: function() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
        let result = "";
        for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    },

    // --- FUNCIÓN LIMPIADORA CLAVE ---
    // Elimina elementos visuales (DOM) y referencias circulares antes de guardar
    // OPTIMIZADA: Una sola pasada de stringify en lugar de doble serialización
    // --- FUNCIÓN LIMPIADORA CLAVE ---
    _prepararEstadoParaNube: function() {
        // Preparar estructuras de datos no serializables
        if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.prepareForSerialization) {
            ResearchRewardsManager.prepareForSerialization();
        }
        
        // Función replacer para limpiar en una sola pasada
        const replacer = (key, value) => {
            if (key === 'element') return undefined; // Borrar referencias al HTML
            if (key === 'selectedUnit') return null; // La selección es local
            return value;
        };
        
        // --- SEGURIDAD: Inicializar recursos si faltan ---
        // Esto evita el error "reading '1'" si se guarda muy rápido
        if (!gameState.playerResources) gameState.playerResources = {};
        if (!gameState.playerResources[1]) gameState.playerResources[1] = { oro: 0, comida: 0, madera: 0, piedra: 0, hierro: 0 };
        if (!gameState.playerResources[2]) gameState.playerResources[2] = { oro: 0, comida: 0, madera: 0, piedra: 0, hierro: 0 };

        // OPTIMIZACIÓN: Una sola pasada de stringify + parse
        // En lugar de JSON.parse(JSON.stringify(x)) para cada propiedad
        const estadoCompleto = {
            gameState: gameState,
            board: board,
            units: units,
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };
        
        // Serializar una sola vez con el replacer
        const serialized = JSON.stringify(estadoCompleto, replacer);
        
        // Parsear para devolver objeto JS limpio
        const cleaned = JSON.parse(serialized);
        
        if (typeof Logger !== 'undefined') {
            Logger.debug('NetworkManager', 
                `Estado serializado (${Math.round(serialized.length / 1024)}KB)`, {
                unitsCount: units.length,
                boardSize: `${board.length}x${board[0]?.length || 0}`,
                turnNumber: gameState.turnNumber
            });
        }
        
        return cleaned;
    },

    // 1. CREAR PARTIDA (HOST)
    crearPartidaEnNube: async function() { // Ya no necesita argumentos, lee el global
        const matchId = this._generarCodigoCorto();
        this.miId = matchId;
        this.esAnfitrion = true;
        
        // NO tocamos gameState aquí. Asumimos que main.js ya lo configuró (recursos, fase, etc).
        
        // Preparamos los datos limpios para subir
        const estadoInicial = this._prepararEstadoParaNube();
        const hostUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();
        
        if (!hostUuid) {
            console.error("[Host] Error: No hay auth_id disponible. PlayerDataManager:", PlayerDataManager.currentPlayer);
            alert("Error: Usuario no autenticado correctamente. Recarga la página.");
            return null;
        }

        const { error } = await supabaseClient
            .from('active_matches')
            .upsert({
                match_id: matchId,
                host_id: hostUuid,
                game_state: estadoInicial,
                current_turn_player: 1,
                guest_id: null 
            });

        if (error) {
            console.error("Error Supabase al crear partida:", error);
            alert("Error al crear partida: " + error.message);
            return null;
        }
        
        // Sistema de Polling (Esperar al J2)
        this._clearMatchPolling();
        
        const pollingCallback = async () => {
            const { data } = await supabaseClient
                .from('active_matches')
                .select('guest_id')
                .eq('match_id', matchId)
                .single();

            if (data && data.guest_id) {
                this._clearMatchPolling();
                
                if (document.getElementById('host-player-list')) {
                    document.getElementById('host-player-list').innerHTML = `<li>J1: Anfitrión</li><li>J2: CONECTADO</li>`;
                }
                
                setTimeout(() => {
                    showScreen(domElements.gameContainer);
                    if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
                    this.activarEscuchaDeTurnos(matchId);
                    
                    // Forzar refresco visual al entrar
                    if(typeof UIManager !== 'undefined') {
                        UIManager.updateAllUIDisplays();
                        UIManager.refreshActionButtons();
                    }
                }, 1000);
            }
        };

        if (typeof window !== 'undefined' && window.intervalManager) {
            window.intervalManager.setInterval('network_matchPolling', pollingCallback, 2000);
        } else {
            this.checkInterval = setInterval(pollingCallback, 2000);
        }
        
        return matchId;
    },

    // 2. UNIRSE (CLIENTE)
    unirsePartidaEnNube: async function(codigoInput) {
        const matchId = codigoInput.trim().toUpperCase();

        const { data, error } = await supabaseClient.from('active_matches').select('*').eq('match_id', matchId).single();

        if (error || !data) {
            console.error("[Cliente] Error al buscar partida:", error);
            alert("Partida no encontrada o código incorrecto.");
            return false;
        }
        
        const guestUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();
        
        if (!guestUuid) {
            console.error("[Cliente] Error: No hay auth_id disponible. PlayerDataManager:", PlayerDataManager.currentPlayer);
            alert("Error: Usuario no autenticado correctamente. Recarga la página.");
            return false;
        }
        
        const { error: updateError } = await supabaseClient
            .from('active_matches')
            .update({ guest_id: guestUuid })
            .eq('match_id', matchId);
        
        if (updateError) {
            console.error("[Cliente] Error al unirse:", updateError);
            alert("Error al conectarse a la partida: " + updateError.message);
            return false;
        }

        // --- ORDEN DE CARGA CORREGIDO ---
        // 1. Establecer identidad ANTES de cargar datos para que la UI sepa quién soy
        this.miId = matchId;
        this.esAnfitrion = false;
        gameState.myPlayerNumber = 2; 

        // 2. Cargar los datos
        if (typeof reconstruirJuegoDesdeDatos === 'function') {
            reconstruirJuegoDesdeDatos(data.game_state);
        }

        // 3. Activar escucha
        this.activarEscuchaDeTurnos(matchId);
        
        return true;
    },

    // 3. SUBIR TURNO
    subirTurnoANube: async function() {
        if (!this.miId) return;

        // Usamos la función segura
        const estadoGuardar = this._prepararEstadoParaNube();

        await supabaseClient
            .from('active_matches')
            .update({ 
                game_state: estadoGuardar,
                updated_at: new Date()
            })
            .eq('match_id', this.miId);
    },

    // 4. ESCUCHAR TURNOS
    activarEscuchaDeTurnos: function(matchId) {
        if (this.subscription) supabaseClient.removeChannel(this.subscription);

        this.subscription = supabaseClient
            .channel(`partida_${matchId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'active_matches', 
                filter: `match_id=eq.${matchId}` 
            }, (payload) => {
                const nuevoEstado = payload.new.game_state;
                // Si el timestamp es más nuevo, actualizamos
                if (nuevoEstado.timestamp > (gameState.lastActionTimestamp || 0)) {
                    reconstruirJuegoDesdeDatos(nuevoEstado);
                    gameState.lastActionTimestamp = nuevoEstado.timestamp;
                }
            })
            .subscribe();
    }, 

    // Nueva función para recuperar estado de emergencia
    cargarPartidaDeNube: async function(gameCode) {
        // Buscamos en 'active_matches' que es donde guardas el estado vivo
        const { data, error } = await supabaseClient
            .from('active_matches') // Asegúrate de leer active_matches, NO game_saves (que son backups)
            .select('game_state')
            .eq('match_id', gameCode)
            .single();

        if (error || !data) return false;

        const cloudState = data.game_state;
        const localTs = gameState.lastActionTimestamp || 0;
        const cloudTs = cloudState.timestamp || 0;

        console.log(`[Sync Check] Local: ${localTs} | Nube: ${cloudTs}`);

        // REGLA DE ORO: Solo cargamos si la nube es REALMENTE más nueva.
        // Si son iguales, preferimos quedarnos como estamos para evitar parpadeos o reversiones.
        if (cloudTs > localTs) { 
            console.log("✅ ¡La nube tiene datos nuevos! Actualizando...");
            if (typeof reconstruirJuegoDesdeDatos === 'function') {
                reconstruirJuegoDesdeDatos(cloudState);
                return true;
            }
        } else {
            console.log("⏸️ Datos de nube antiguos o iguales. Ignorando.");
        }
        return false;
    },

    // Nueva función para cargar desde la lista
    cargarPartidaDesdeLista: function(matchData) {
        console.log("Cargando partida seleccionada:", matchData.match_id);
        
        this.miId = matchData.match_id;
        const uid = PlayerDataManager.currentPlayer?.auth_id;
        this.esAnfitrion = (matchData.host_id === uid);
        
        // 1. Cargar el estado
        if (typeof reconstruirJuegoDesdeDatos === 'function') {
            reconstruirJuegoDesdeDatos(matchData.game_state);
        }
        
        // 2. Establecer identidad local
        gameState.myPlayerNumber = this.esAnfitrion ? 1 : 2;

        // 3. MOSTRAR PANTALLA
        showScreen(domElements.gameContainer);
        if(domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';

        // --- CORRECCIÓN IA: Detectar si es Vs IA ---
        const isModeAI = matchData.status === 'VS_AI' || gameState.playerTypes['player2'].includes('ai');
        
        if (isModeAI) {
            console.log("[Carga] Modo VS IA detectado. Desactivando espera de red.");
            
            // Si es el turno de la IA (J2), forzar su ejecución
            if (gameState.currentPlayer === 2) {
                // Mostrar bloqueo visual brevemente
                const blocker = document.getElementById('turnBlocker');
                if (blocker) {
                    blocker.textContent = "IA Calculando...";
                    blocker.style.display = 'flex';
                }
                
                // Ejecutar turno IA
                setTimeout(() => {
                    simpleAiTurn(); // O la función de IA que uses
                    if(blocker) blocker.style.display = 'none';
                }, 1000);
            } else {
                // Si es mi turno, asegurarme de que no haya bloqueo
                const blocker = document.getElementById('turnBlocker');
                if (blocker) blocker.style.display = 'none';
            }

            // NO activamos la escucha de red en tiempo real si es contra la IA
            // porque no hay otro humano enviando datos.
            
        } else {
            // Modo Humano: Activar escucha normal
            this.activarEscuchaDeTurnos(matchData.match_id);
        }
        
        // 4. Actualizar UI
        if(typeof UIManager !== 'undefined') {
            UIManager.updateAllUIDisplays();
            UIManager.refreshActionButtons();
        }
        
        logMessage(`Partida ${matchData.match_id} reanudada.`);
    },

};