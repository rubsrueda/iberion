// networkManager.js - VERSIÓN CORREGIDA UUID
console.log("networkManager.js CARGADO - Modo Base de Datos (UUID FIX)");

const NetworkManager = {
    miId: null,
    esAnfitrion: false,
    checkInterval: null,
    subscription: null,

    // Generador de códigos de sala (4 letras)
    _generarCodigoCorto: function() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
        let result = "";
        for (let i = 0; i < 4; i++) { 
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // 1. CREAR PARTIDA (HOST)
    crearPartidaEnNube: async function(gameSettings) {
        const matchId = this._generarCodigoCorto();
        this.miId = matchId;
        this.esAnfitrion = true;
        
        // Limpieza de estado
        const estadoInicial = {
            gameState: JSON.parse(JSON.stringify(gameState)),
            board: board.map(row => row.map(hex => ({...hex, element: undefined}))),
            units: units.map(u => ({...u, element: undefined})),
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };

        console.log(`[Host] Creando sala ${matchId}...`);

        // --- CORRECCIÓN 1: UUID VÁLIDO PARA EL HOST ---
        // Si no hay usuario logueado, generamos un UUID real al azar
        const hostUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();

        const { error } = await supabaseClient
            .from('active_matches')
            .upsert({
                match_id: matchId,
                host_id: hostUuid, // <--- AQUÍ ESTABA EL ERROR ANTES
                game_state: estadoInicial,
                current_turn_player: 1,
                guest_id: null 
            });

        if (error) {
            console.error("Error Supabase:", error);
            alert(`Error de base de datos: ${error.message}`);
            return null;
        }

        // Sistema de Polling (Comprobar si entra el J2)
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        this.checkInterval = setInterval(async () => {
            const { data } = await supabaseClient
                .from('active_matches')
                .select('guest_id')
                .eq('match_id', matchId)
                .single();

            if (data && data.guest_id) {
                console.log("¡JUGADOR 2 DETECTADO!");
                clearInterval(this.checkInterval);

                if (document.getElementById('host-player-list')) {
                    document.getElementById('host-player-list').innerHTML = `<li>J1: Anfitrión (Tú)</li><li>J2: CONECTADO</li>`;
                }
                
                setTimeout(() => {
                    showScreen(domElements.gameContainer);
                    if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
                    this.activarEscuchaDeTurnos(matchId);
                }, 1000);
            }
        }, 2000);
        
        return matchId;
    },

    // 2. UNIRSE (CLIENTE)
    unirsePartidaEnNube: async function(codigoInput) {
        const matchId = codigoInput.trim().toUpperCase();
        console.log(`[Cliente] Buscando sala: ${matchId}...`);

        // 1. Buscar la partida
        const { data, error } = await supabaseClient
            .from('active_matches')
            .select('*')
            .eq('match_id', matchId)
            .single();

        if (error || !data) {
            console.error("Error búsqueda:", error);
            alert("Partida no encontrada. Verifica el código.");
            return false;
        }

        // --- CORRECCIÓN 2: UUID VÁLIDO PARA EL GUEST ---
        // Generamos un UUID real si no hay login, para que Supabase no se queje
        const guestUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();

        // 2. Escribir mi ID
        const { error: updateError } = await supabaseClient
            .from('active_matches')
            .update({ guest_id: guestUuid }) // <--- AQUÍ ESTABA EL ERROR DEL CLIENTE
            .eq('match_id', matchId);

        if (updateError) {
            console.error("Error update:", updateError);
            alert(`Error al unirse: ${updateError.message}`);
            return false;
        }

        console.log("[Cliente] Conectado. Cargando...");

        // 3. Cargar el juego
        gameState.myPlayerNumber = 2; 
        
        if (typeof reconstruirJuegoDesdeDatos === 'function') {
            reconstruirJuegoDesdeDatos(data.game_state);
        }

        this.miId = matchId;
        this.esAnfitrion = false;
        
        // 4. Activar escucha
        this.activarEscuchaDeTurnos(matchId);
        
        return true;
    },

    // 3. SUBIR TURNO
    subirTurnoANube: async function() {
        if (!this.miId) return;
        console.log("☁️ Subiendo turno...");

        const estadoGuardar = {
            gameState: gameState,
            board: board.map(row => row.map(hex => ({...hex, element: undefined}))),
            units: units.map(u => ({...u, element: undefined})),
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };

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
        console.log("📡 Sincronización activada.");
        
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
                // Si el timestamp es más nuevo que el mío, actualizo
                if (nuevoEstado.timestamp > (gameState.lastActionTimestamp || 0)) {
                    console.log("📥 Nuevo turno recibido.");
                    reconstruirJuegoDesdeDatos(nuevoEstado);
                    gameState.lastActionTimestamp = nuevoEstado.timestamp;
                }
            })
            .subscribe();
    }
};