// networkManager.js
console.log("networkManager.js CARGADO - Modo Base de Datos");

const NetworkManager = {
    miId: null,
    esAnfitrion: false,
    checkInterval: null,
    subscription: null,

    // Generador de códigos
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
        
        // Limpiamos referencias circulares del estado (elementos DOM)
        const estadoInicial = {
            gameState: JSON.parse(JSON.stringify(gameState)),
            board: board.map(row => row.map(hex => ({...hex, element: undefined}))),
            units: units.map(u => ({...u, element: undefined})),
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };

        console.log(`[Host] Creando sala ${matchId} en Supabase...`);

        // Insertar en Supabase
        const { error } = await supabaseClient
            .from('active_matches')
            .upsert({
                match_id: matchId,
                // Si hay usuario logueado, usa su ID. Si no, usa NULL (la base de datos lo aceptará si la columna permite nulos)
                host_id: PlayerDataManager.currentPlayer?.auth_id || null,
                game_state: estadoInicial,
                current_turn_player: 1,
                guest_id: null 
            });

        if (error) {
            console.error("Error Supabase:", error);
            alert("Error al crear partida. Revisa la consola.");
            return null;
        }

        // --- SISTEMA DE POLLING (Comprobación cada 2s) ---
        if (this.checkInterval) clearInterval(this.checkInterval);
        
        this.checkInterval = setInterval(async () => {
            const { data } = await supabaseClient
                .from('active_matches')
                .select('guest_id')
                .eq('match_id', matchId)
                .single();

            // Si hay un guest_id, el jugador 2 ha entrado
            if (data && data.guest_id) {
                console.log("¡JUGADOR 2 DETECTADO EN DB!");
                clearInterval(this.checkInterval); // Parar de comprobar

                // Actualizar UI visualmente
                if (document.getElementById('host-player-list')) {
                    document.getElementById('host-player-list').innerHTML = `<li>J1: Anfitrión (Tú)</li><li>J2: CONECTADO</li>`;
                }
                
                // Iniciar juego tras breve pausa
                setTimeout(() => {
                    showScreen(domElements.gameContainer);
                    if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
                    // Activar escucha de turnos
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

        // 2. Escribir "Estoy aquí" en la DB
        const { error: updateError } = await supabaseClient
            .from('active_matches')
            .update({ guest_id: 'guest_' + Date.now() })
            .eq('match_id', matchId);

        if (updateError) {
            console.error("Error update:", updateError);
            alert("Error al unirse. Inténtalo de nuevo.");
            return false;
        }

        console.log("[Cliente] ¡Unido con éxito! Cargando mapa...");

        // 3. Cargar el juego
        // Importante: Aseguramos que myPlayerNumber sea 2 ANTES de reconstruir
        gameState.myPlayerNumber = 2; 
        
        if (typeof reconstruirJuegoDesdeDatos === 'function') {
            reconstruirJuegoDesdeDatos(data.game_state);
        } else {
            console.error("Falta la función reconstruirJuegoDesdeDatos");
        }

        this.miId = matchId;
        this.esAnfitrion = false;
        
        // 4. Activar escucha de turnos
        this.activarEscuchaDeTurnos(matchId);
        
        return true;
    },

    // 3. SUBIR TURNO (Ambos)
    subirTurnoANube: async function() {
        if (!this.miId) return;
        console.log("☁️ Subiendo turno a Supabase...");

        const estadoGuardar = {
            gameState: gameState,
            board: board.map(row => row.map(hex => ({...hex, element: undefined}))),
            units: units.map(u => ({...u, element: undefined})),
            unitIdCounter: unitIdCounter,
            timestamp: Date.now()
        };

        const guestUuid = PlayerDataManager.currentPlayer?.auth_id || crypto.randomUUID();

        await supabaseClient
            .from('active_matches')
            .update({ guest_id: guestUuid })
            .eq('match_id', matchId);
    },

    // 4. ESCUCHAR TURNOS (Ambos)
    activarEscuchaDeTurnos: function(matchId) {
        console.log("📡 Escuchando turnos...");
        
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
                    console.log("📥 Recibido nuevo turno del oponente.");
                    reconstruirJuegoDesdeDatos(nuevoEstado);
                    gameState.lastActionTimestamp = nuevoEstado.timestamp;
                }
            })
            .subscribe();
    }
};