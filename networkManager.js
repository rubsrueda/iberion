// networkManager.js - VERSIÓN CORREGIDA (SERIALIZACIÓN SEGURA)
console.log("networkManager.js CARGADO - v4.0");

const NetworkManager = {
    miId: null,
    esAnfitrion: false,
    checkInterval: null,
    subscription: null,

    _generarCodigoCorto: function() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
        let result = "";
        for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    },

    // --- FUNCIÓN LIMPIADORA CLAVE ---
    // Elimina elementos visuales (DOM) y referencias circulares antes de guardar
    // --- FUNCIÓN LIMPIADORA CLAVE ---
    _prepararEstadoParaNube: function() {
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

        return {
            gameState: JSON.parse(JSON.stringify(gameState, replacer)),
            board: JSON.parse(JSON.stringify(board, replacer)),
            units: JSON.parse(JSON.stringify(units, replacer)),
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };
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

        console.log(`[Host] Subiendo partida ${matchId}...`);

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
            console.error("Error Supabase:", error);
            alert("Error al crear partida.");
            return null;
        }

        // Sistema de Polling (Esperar al J2)
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        this.checkInterval = setInterval(async () => {
            const { data } = await supabaseClient
                .from('active_matches')
                .select('guest_id')
                .eq('match_id', matchId)
                .single();

            if (data && data.guest_id) {
                console.log("¡JUGADOR 2 CONECTADO!");
                clearInterval(this.checkInterval);
                
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
        }, 2000);
        
        return matchId;
    },

    // 2. UNIRSE (CLIENTE)
    unirsePartidaEnNube: async function(codigoInput) {
        const matchId = codigoInput.trim().toUpperCase();
        console.log(`[Cliente] Buscando: ${matchId}...`);

        const { data, error } = await supabaseClient.from('active_matches').select('*').eq('match_id', matchId).single();

        if (error || !data) {
            alert("Partida no encontrada.");
            return false;
        }

        const guestUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();
        await supabaseClient.from('active_matches').update({ guest_id: guestUuid }).eq('match_id', matchId);

        console.log("[Cliente] Datos recibidos. Reconstruyendo...");

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
        console.log("☁️ Guardando turno...");

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
                    console.log("📥 Sincronizando estado remoto...");
                    reconstruirJuegoDesdeDatos(nuevoEstado);
                    gameState.lastActionTimestamp = nuevoEstado.timestamp;
                }
            })
            .subscribe();
    }, 

    // Nueva función para recuperar estado de emergencia
    cargarPartidaDeNube: async function(gameCode) {
        console.log(`[Nube] 🚑 RECUPERACIÓN DE EMERGENCIA para partida: ${gameCode}`);
        
        // Buscamos en 'active_matches' que es donde guardas el estado vivo
        const { data, error } = await supabaseClient
            .from('active_matches')
            .select('game_state, current_turn_player')
            .eq('match_id', gameCode)
            .single();

        if (error || !data) {
            console.warn("[Nube] No se pudo recuperar partida de la nube:", error);
            return false;
        }

        const cloudTimestamp = data.game_state.timestamp || 0;
        const localTimestamp = gameState.lastActionTimestamp || 0;

        console.log(`[Sync] Nube (${cloudTimestamp}) vs Local (${localTimestamp})`);

        // Si la nube tiene datos más nuevos (el otro jugó mientras yo estaba desconectado)
        if (cloudTimestamp > localTimestamp) {
            console.log("📥 ¡Datos nuevos encontrados en la nube! Sincronizando...");
            if (typeof reconstruirJuegoDesdeDatos === 'function') {
                reconstruirJuegoDesdeDatos(data.game_state);
                // Si ahora es mi turno, avisar
                if (data.current_turn_player === gameState.myPlayerNumber) {
                    if(typeof showToast === 'function') showToast("¡Es tu turno!", "success");
                    // Reactivar temporizador si es necesario
                    if (TurnTimerManager && TurnTimerManager.start) {
                        TurnTimerManager.start(gameState.turnDurationSeconds);
                    }
                }
                return true;
            }
        } else {
            console.log("✅ El estado local ya está actualizado.");
        }
        return false;
    },

};