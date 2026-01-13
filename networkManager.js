// networkManager.js
console.log("networkManager.js CARGADO - v3.0 (Prefijo Global Seguro)");
const PEER_SERVER_CONFIG = {
host: '0.peerjs.com',
port: 443,
path: '/',
secure: true,
};
// CONSTANTE DE PREFIJO - Definida fuera del objeto para máxima seguridad
const GAME_ID_PREFIX = 'hge-';
const NetworkManager = {
_maxConnectionRetries: 3,
_connectionRetryDelay: 2000,
_connectionAttempts: 0,
peer: null,
conn: null,
esAnfitrion: false,
miId: null,
idRemoto: null,

_isConnecting: false,

_onConexionAbierta: null,
_onDatosRecibidos: null,
_onConexionCerrada: null,

 _heartbeatInterval: null,
_lastHeartbeatReceived: 0,

preparar: function(onConexionAbierta, onDatosRecibidos, onConexionCerrada) {
    this._onConexionAbierta = onConexionAbierta;
    this._onDatosRecibidos = onDatosRecibidos;
    this._onConexionCerrada = onConexionCerrada;
},

/**
 * Genera una cadena aleatoria corta de 6 caracteres (letras mayúsculas y números).
 * Evita caracteres confusos como O/0 o I/1.
 */
_generarCodigoCorto: function() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let result = "";
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
},

iniciarAnfitrion: function(onIdGenerado) {
    if (this._isConnecting) {
        console.warn("[NetworkManager] Ya hay una conexión en proceso.");
        return;
    }
    
    this.esAnfitrion = true;
    this._connectionAttempts = 0;

    const tryConnectAsHost = () => {
        if (this._isConnecting) return;
        this._isConnecting = true;
        this._connectionAttempts++;

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        setTimeout(() => {
            try {
                // 1. Generamos el código corto visual
                const shortCode = this._generarCodigoCorto();
                
                // 2. Construimos el ID técnico real usando la constante global
                const realPeerId = GAME_ID_PREFIX + shortCode;
                
                console.log(`[Host] Iniciando Peer. ID Real: '${realPeerId}' (Visible: '${shortCode}')`);
                
                this.peer = new Peer(realPeerId, PEER_SERVER_CONFIG);

                this.peer.on('open', (id) => {
                    this._isConnecting = false;
                    this._connectionAttempts = 0;
                    console.log(`%c[Host] ¡LISTO! ID registrado: ${id}`, "background: green; color: white;");
                    this.miId = id;
                    
                    // DEVOLVEMOS SOLO EL CÓDIGO CORTO A LA UI
                    if (onIdGenerado) onIdGenerado(shortCode);

                    this.peer.on('connection', (newConnection) => {
                        console.log(`[Host] Conexión entrante de: ${newConnection.peer}`);
                        if (this.conn && this.conn.open) {
                            newConnection.close();
                            return;
                        }
                        this.conn = newConnection;
                        this.idRemoto = newConnection.peer;
                        this._configurarEventosDeConexion();
                    });
                });

                this.peer.on('error', (err) => {
                    this._isConnecting = false;
                    console.error(`[Host] Error PeerJS:`, err);

                    if (err.type === 'unavailable-id') {
                        console.warn("[Host] Colisión de ID, reintentando con nuevo código...");
                        setTimeout(tryConnectAsHost, 100); 
                    } else if (this._connectionAttempts < this._maxConnectionRetries) {
                        console.warn(`[Host] Reintentando conexión...`);
                        setTimeout(tryConnectAsHost, this._connectionRetryDelay);
                    } else {
                        alert(`Error de red: ${err.type}.`);
                        this.desconectar();
                    }
                });

            } catch (e) {
                this._isConnecting = false;
                console.error("[Host] Excepción crítica:", e);
                alert("Error crítico de red.");
            }
        }, 500);
    };

    tryConnectAsHost();
},

unirseAPartida: function(codigoUsuario) {
    console.log("%c[Cliente] Iniciando conexión/reconexión...", "color: cyan;");
    if (this._isConnecting) return;
    
    // 1. LIMPIEZA: Mayúsculas y quitar espacios
    let cleanCode = codigoUsuario.trim().toUpperCase();
    
    // 2. SEGURIDAD: Si el usuario escribió el prefijo por error, lo quitamos
    if (cleanCode.startsWith(GAME_ID_PREFIX.toUpperCase())) {
        cleanCode = cleanCode.replace(GAME_ID_PREFIX.toUpperCase(), '');
    }

    // 3. CONSTRUCCIÓN: Añadimos el prefijo global obligatoriamente
    const anfitrionId = GAME_ID_PREFIX + cleanCode;
    
    this._isConnecting = true;

    // --- LIMPIEZA AGRESIVA DE CONEXIONES ANTERIORES ---
    if (this.conn) {
        this.conn.close(); // Cierra la conexión vieja
        this.conn = null;
    }
    if (this.peer) {
        this.peer.destroy(); // Destruye la identidad vieja para renovar IPs
        this.peer = null;
    }
    this.esAnfitrion = false;
    // --------------------------------------------------

    // Esperamos un poco para asegurar que el navegador liberó los puertos
    setTimeout(() => {
        try {
            this.peer = new Peer(undefined, PEER_SERVER_CONFIG);

            this.peer.on('open', (id) => {
                console.log(`[Cliente] Nueva identidad generada: ${id}`);
                this.miId = id;
                
                console.log(`[Cliente] Conectando con Host: '${anfitrionId}'...`);
                this.conn = this.peer.connect(anfitrionId, {
                    reliable: true // Forzar modo fiable si es posible
                });
                this.idRemoto = anfitrionId;

                this._configurarEventosDeConexion(); 
            });

            this.peer.on('error', (err) => {
                console.error("[Cliente] Error de conexión:", err);
                this._isConnecting = false;
                
                // Si el peer no existe, es que el Host también se cayó o cambió
                if (err.type === 'peer-unavailable') {
                    if (typeof showToast === 'function') showToast("El Anfitrión no responde. Inténtalo de nuevo.", "error");
                }
                // No llamamos a desconectar() aquí para permitir reintentos manuales
            });

        } catch(e) {
             console.error("[Cliente] Error catastrófico:", e);
             this._isConnecting = false;
        }
    }, 500); // 500ms de espera para limpieza
},

desconectar: function() {
    console.log("[Red] Desconectando...");
    if (this.conn) {
        this.conn.close();
    }
    if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
    }
    this.peer = null;
    this.conn = null;
    this.miId = null;
    this.idRemoto = null;
    this.esAnfitrion = false;
    this._isConnecting = false;
},

enviarDatos: function(datos) {
        // ESTE 'if' ES LA SOLUCIÓN.
        // Solo intentará mostrar el log de 'action.type' si 'datos'
        // es realmente una petición de acción.
    if (datos.type === 'actionRequest' && datos.action) {
        console.log(`[Red] Enviando acción: '${datos.action.type}'`);
    }
    
        // El resto de tu función se queda exactamente igual.
    if (this.conn && this.conn.open) {
            // Esta línea ya no la he copiado, pero es donde está tu `console.log` general de "[VIAJE-RED]..."
            // y el `this.conn.send(datos);`
        this.conn.send(datos);
    } else {
        console.warn("[Red] No se puede enviar: conexión inactiva.");
    }
},

_configurarEventosDeConexion: function() {
    if (!this.conn) return;

    // 1. AL CONECTAR / RECONECTAR
    this.conn.on('open', () => {
        console.log(`%c[Red] Conexión establecida. Iniciando protocolo de sincronización...`, "color: green;");
        this._isConnecting = false;
        
        // Iniciamos el latido SOLO para mantener despierto al móvil
        this._startHeartbeat(); 

        if (this._onConexionAbierta) this._onConexionAbierta(this.idRemoto);

        // --- PROTOCOLO DE SINCRONIZACIÓN ---
        // En lugar de pedir datos ciegamente, enviamos NUESTRO reloj.
        // "Hola, mi partida está actualizada hasta el momento X".
        const myTimestamp = gameState.lastActionTimestamp || 0;
        
        this.enviarDatos({ 
            type: 'HANDSHAKE_SYNC', 
            timestamp: myTimestamp 
        });
    });

    // 2. RECIBIR DATOS
    this.conn.on('data', (datos) => {
        if (datos.type === 'HEARTBEAT') return;

        // A. GESTIÓN DEL HANDSHAKE (Comparar relojes)
        if (datos.type === 'HANDSHAKE_SYNC') {
            const remoteTimestamp = datos.timestamp;
            const localTimestamp = gameState.lastActionTimestamp || 0;
            
            console.log(`[Sync] Comparando: Local(${localTimestamp}) vs Remoto(${remoteTimestamp})`);

            if (remoteTimestamp > localTimestamp) {
                // El OTRO ha jugado mientras yo no estaba.
                console.log("-> El otro jugador tiene datos más nuevos. Solicitando su estado.");
                this.enviarDatos({ type: 'REQUEST_FULL_STATE' });
            } 
            else if (localTimestamp > remoteTimestamp) {
                // YO he jugado (o soy el Host y no ha pasado nada). Le envío mi estado.
                console.log("-> Yo tengo datos más nuevos. Enviando mi estado.");
                this.broadcastFullState();
            }
            else {
                console.log("-> Estamos sincronizados.");
            }
            return;
        }

        // B. ALGUIEN ME PIDE MI ESTADO
        if (datos.type === 'REQUEST_FULL_STATE') {
            console.log("-> Me piden el estado completo. Enviando...");
            this.broadcastFullState();
            return;
        }

        // C. RECIBO EL ESTADO COMPLETO (Sobrescribir mi juego)
        if (datos.type === 'fullStateUpdate' || datos.type === 'initialGameSetup') {
            console.log("%c[Red] Recibida actualización completa de estado.", "color: orange;");
            reconstruirJuegoDesdeDatos(datos.payload);
            return;
        }

        // D. ACCIONES NORMALES
        if (this._onDatosRecibidos) this._onDatosRecibidos(datos);
    });

        // 3. Cierre REAL de Conexión
    this.conn.on('close', () => {
        console.warn(`[Red] El navegador ha cerrado la conexión.`);
        this._stopHeartbeat();
        
        // Intentar reconexión automática suave
        if (this.idRemoto && !this.esAnfitrion) {
             console.log("Intentando reconectar...");
             setTimeout(() => this.unirseAPartida(this.idRemoto.replace(GAME_ID_PREFIX, '')), 1000);
        } else {
             // Solo avisamos al usuario si el cierre es definitivo
             if (this._onConexionCerrada) this._onConexionCerrada();
        }
    });

    // 4. Errores
    this.conn.on('error', (err) => {
        console.error(`[Red] Error PeerJS:`, err);
        
        // Si el error es que no encuentra al otro (típico al desbloquear el móvil),
        // NO mostramos alerta ni desconectamos. Dejamos que el sistema de autorreconexión actúe.
        if (err.type === 'peer-unavailable') {
            console.warn("El peer no responde (probablemente por bloqueo de pantalla). Intentando recuperar...");
            
            // Si soy cliente, fuerzo la reconexión inmediata sin molestar al usuario
            if (!this.esAnfitrion && this.idRemoto) {
                this.unirseAPartida(this.idRemoto.replace(GAME_ID_PREFIX, ''));
            }
            return; // Salimos para no ejecutar nada más
        }

        // Solo mostramos alerta para otros errores fatales que no sean de conexión perdida
        if (err.type === 'network' || err.type === 'server-error') {
            // Opcional: mostrar un toast en lugar de alert
            if(typeof showToast === 'function') showToast("Inestabilidad de red detectada", "warning");
        }
    });
},

_startHeartbeat: function() {
    // Limpiamos cualquier intervalo anterior
    this._stopHeartbeat();
    
    console.log("[Red] Iniciando sistema 'Keep-Alive' (Latido)...");

    // Enviamos un 'ping' cada 3 segundos.
    // Su ÚNICA función es evitar que el navegador del móvil "congele" la conexión.
    this._heartbeatInterval = setInterval(() => {
        if (this.conn && this.conn.open) {
            try {
                this.conn.send({ type: 'HEARTBEAT' });
            } catch (e) {
                console.warn("No se pudo enviar el latido (conexión inestable).");
            }
        }
    }, 5000);
},

_stopHeartbeat: function() {
    if (this._heartbeatInterval) {
        clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = null;
    }
},

broadcastFullState: function() {
    if (!this.esAnfitrion || !this.conn || !this.conn.open) return;
    
    const replacer = (key, value) => (key === 'element' ? undefined : value);
    const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
    // Limpiamos la identidad del jugador para que el cliente use la suya propia
    delete gameStateForBroadcast.myPlayerNumber;

    const fullStatePacket = {
        type: 'fullStateUpdate',
        payload: {
            gameState: gameStateForBroadcast,
            board: JSON.parse(JSON.stringify(board, replacer)),
            units: JSON.parse(JSON.stringify(units, replacer)),
            unitIdCounter: unitIdCounter
        }
    };

        // --- INICIO DEL CÓDIGO DE DIAGNÓSTICO ---

            // Este log es solo para el anfitrión, justo antes de enviar los datos.
            console.log("%c[DIAGNÓSTICO DE RETRANSMISIÓN DEL ANFITRIÓN]", "background: #fd7e14; color: white; font-weight: bold;");

            // Verificamos el estado de las tecnologías del Jugador 2 que se van a enviar.
            const tecnologiasJ2 = fullStatePacket.payload.gameState.playerResources['2']?.researchedTechnologies || 'No definido';
            console.log("  -> Tecnologías del J2 a punto de ser enviadas:", JSON.stringify(tecnologiasJ2));

            // Verificamos el estado de 'hasMoved' de la primera unidad del Jugador 2 (si existe).
            const primeraUnidadJ2 = fullStatePacket.payload.units.find(u => u.player === 2);
            if (primeraUnidadJ2) {
                console.log(`  -> Estado de '${primeraUnidadJ2.name}' (J2) a punto de ser enviado: hasMoved=${primeraUnidadJ2.hasMoved}, hasAttacked=${primeraUnidadJ2.hasAttacked}, lastMove existe=${!!primeraUnidadJ2.lastMove}`);
            } else {
                console.log("  -> No hay unidades del J2 en el paquete a enviar.");
            }

            
            // --- FIN DEL CÓDIGO DE DIAGNÓSTICO ---
        
    
    this.enviarDatos(fullStatePacket);
}
};