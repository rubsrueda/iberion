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
    console.log("%c[Cliente] Iniciando conexión...", "color: cyan;");
    if (this._isConnecting) return;
    
    // 1. LIMPIEZA: Mayúsculas y quitar espacios
    let cleanCode = codigoUsuario.trim().toUpperCase();
    
    // 2. SEGURIDAD: Si el usuario escribió el prefijo por error, lo quitamos
    if (cleanCode.startsWith(GAME_ID_PREFIX.toUpperCase())) {
        cleanCode = cleanCode.replace(GAME_ID_PREFIX.toUpperCase(), '');
    }

    // 3. CONSTRUCCIÓN: Añadimos el prefijo global obligatoriamente
    const anfitrionId = GAME_ID_PREFIX + cleanCode;
    
    console.log(`[Cliente] Input: '${codigoUsuario}' -> Clean: '${cleanCode}' -> TARGET ID: '${anfitrionId}'`);

    this._isConnecting = true;
    if (this.peer) {
        this.peer.destroy();
    }
    this.peer = null;
    this.esAnfitrion = false;

    setTimeout(() => {
        try {
            this.peer = new Peer(undefined, PEER_SERVER_CONFIG);

            this.peer.on('open', (id) => {
                console.log(`[Cliente] Mi ID temporal: ${id}`);
                this.miId = id;
                
                // Conectamos usando el ID CON PREFIJO
                console.log(`[Cliente] Ejecutando peer.connect('${anfitrionId}')...`);
                this.conn = this.peer.connect(anfitrionId);
                this.idRemoto = anfitrionId;

                this._configurarEventosDeConexion(); 
            });

            this.peer.on('error', (err) => {
                console.error("[Cliente] Error de conexión:", err);
                this._isConnecting = false;
                if (err.type === 'peer-unavailable') {
                    alert(`No se encontró la partida con código "${cleanCode}".\nAsegúrate de que el anfitrión está en la pantalla de "Esperando Jugador".`);
                } else {
                    alert(`Error de conexión: ${err.type}`);
                }
                this.desconectar();
            });

        } catch(e) {
             console.error("[Cliente] Error catastrófico:", e);
             this._isConnecting = false;
        }
    }, 200);
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

    // 1. Conexión Abierta
    this.conn.on('open', () => {
        console.log(`%c[Red] ¡Conexión establecida!`, "background: green; color: white;");
        this._isConnecting = false;
        
        // Iniciamos el latido SOLO para mantener despierto al móvil
        this._startHeartbeat(); 

        if (this._onConexionAbierta) this._onConexionAbierta(this.idRemoto);
        
        // Si soy cliente, pido el estado del juego para sincronizarme
        if (!this.esAnfitrion) {
            this.enviarDatos({ type: 'actionRequest', action: { type: 'syncGameState', payload: {} } });
        }
    });

    // 2. Datos Recibidos
    this.conn.on('data', (datos) => {
        // Si es un latido, no hacemos NADA. Solo sirve para mantener el flujo de datos activo.
        if (datos.type === 'HEARTBEAT') {
            return; 
        }
        // Si es un dato real del juego, lo procesamos
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
        console.error(`[Red] Error:`, err);
        // No desconectamos proactivamente por errores menores
        if (err.type === 'peer-unavailable') {
            alert("El otro jugador no está disponible.");
            this.desconectar();
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
