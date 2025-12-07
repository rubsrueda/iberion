// networkManager.js
console.log("networkManager.js CARGADO - Sistema de Códigos Cortos (v2.0) listo.");

const PEER_SERVER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
};

const NetworkManager = {
    _maxConnectionRetries: 3,
    _connectionRetryDelay: 2000,
    _connectionAttempts: 0,
    peer: null,
    conn: null,
    esAnfitrion: false,
    miId: null,
    idRemoto: null,
    _prefix: 'hge-', // Prefijo invisible para garantizar unicidad global
    
    _isConnecting: false, // Nuestro "cerrojo"
    
    _onConexionAbierta: null,
    _onDatosRecibidos: null,
    _onConexionCerrada: null,

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
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin I, 1, O, 0
        let result = "";
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    iniciarAnfitrion: function(onIdGenerado) {
        if (this._isConnecting) {
            console.warn("[NetworkManager] Intento de iniciar anfitrión bloqueado, ya hay una conexión en proceso.");
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
                    // Generamos el código corto para el usuario
                    const shortCode = this._generarCodigoCorto();
                    // El ID real incluye el prefijo invisible
                    const realPeerId = this._prefix + shortCode;
                    
                    console.log(`Intentando conectar a PeerJS con ID: ${realPeerId} (Usuario verá: ${shortCode})`);
                    this.peer = new Peer(realPeerId, PEER_SERVER_CONFIG);

                    this.peer.on('open', (id) => {
                        this._isConnecting = false;
                        this._connectionAttempts = 0;
                        console.log(`%c¡CONEXIÓN DE RED ESTABLECIDA!`, "background: green; color: white;");
                        this.miId = id;
                        
                        // DEVOLVEMOS SOLO EL CÓDIGO CORTO AL CALLBACK DE LA UI
                        if (onIdGenerado) onIdGenerado(shortCode);

                        this.peer.on('connection', (newConnection) => {
                            console.log(`Conexión entrante de: ${newConnection.peer}`);
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
                        console.error(`Error en PeerJS:`, err);

                        if (err.type === 'unavailable-id') {
                            // Si el ID ya existe (muy mala suerte), probamos con otro código corto inmediatamente
                            console.warn("Código colisionado, reintentando con uno nuevo...");
                            setTimeout(tryConnectAsHost, 100); 
                        } else if (this._connectionAttempts < this._maxConnectionRetries) {
                            console.warn(`Reintentando conexión en ${this._connectionRetryDelay / 1000} segundos...`);
                            setTimeout(tryConnectAsHost, this._connectionRetryDelay);
                        } else {
                            alert(`Error de red: ${err.type}. Comprueba tu conexión.`);
                            this.desconectar();
                        }
                    });

                } catch (e) {
                    this._isConnecting = false;
                    console.error("Fallo catastrófico al crear Peer:", e);
                    alert("Error crítico de red.");
                }
            }, 500);
        };

        tryConnectAsHost();
    },

    unirseAPartida: function(codigoUsuario) {
        console.log("%c[Cliente] Iniciando conexión...", "color: cyan;");
        if (this._isConnecting) return;
        
        // 1. LIMPIEZA DEL CÓDIGO DE USUARIO
        // Convertimos a mayúsculas, quitamos espacios y eliminamos el prefijo si el usuario lo puso por error.
        let cleanCode = codigoUsuario.trim().toUpperCase().replace(this._prefix.toUpperCase(), '');
        
        // 2. RECONSTRUCCIÓN DEL ID REAL
        const anfitrionId = this._prefix + cleanCode;
        
        console.log(`[Cliente] Conectando a ID real: ${anfitrionId}`);

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
                    
                    this.conn = this.peer.connect(anfitrionId);
            this.idRemoto = anfitrionId; // Guardamos el ID remoto

            // <<< ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA! >>>
            // Le decimos que use la función que ya tienes para configurar los eventos de la conexión.
                    this._configurarEventosDeConexion(); 
                });

                this.peer.on('error', (err) => {
                    console.error("[Cliente] Error de conexión:", err);
                    this._isConnecting = false;
                    if (err.type === 'peer-unavailable') {
                        alert(`No se encontró la partida "${cleanCode}". Verifica el código.`);
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

        this.conn.on('open', () => {
            console.log(`%c[Red] ¡Conexión establecida con ${this.conn.peer}!`, "background: blue; color: white;");
            this._isConnecting = false;
            if (this._onConexionAbierta) this._onConexionAbierta(this.idRemoto);
        });

        this.conn.on('data', (datos) => {
            //console.log(`[Red] Datos recibidos:`, datos.type);
            if (this._onDatosRecibidos) this._onDatosRecibidos(datos);
        });

        this.conn.on('close', () => {
            console.warn(`[NetworkManager] La conexión con ${this.conn.peer} se ha cerrado.`);
            this._isConnecting = false; // Asegurarse de desbloquear si se cierra.
            if (this._onConexionCerrada) this._onConexionCerrada();
            this.conn = null;
        });

        this.conn.on('error', (err) => {
            console.error(`%c[ERROR DE CONEXIÓN DE DATOS] Fallo al conectar con ${this.conn.peer}:`, 'background: red; color: white;', err);
            this._isConnecting = false; // Desbloquear en caso de error.
            alert(`No se pudo establecer la conexión de datos con el anfitrión. Error: ${err.type}. Puede ser un problema de red o firewall.`);
            this.desconectar();
        });
    },

    broadcastFullState: function() {
        if (!this.esAnfitrion || !this.conn || !this.conn.open) return;
        console.log("[NETWORK FLOW - PASO 5] Anfitrión retransmitiendo estado completo (fullStateUpdate) a todos los clientes.", "background: #FFD700; color: black;");
        
    // Preparamos un objeto de estado limpio para no enviar elementos del DOM
        const replacer = (key, value) => (key === 'element' ? undefined : value);
    
    // El gameState se envía tal cual, el cliente lo fusionará
        const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
    // Limpiamos la identidad del jugador para que el cliente use la suya propia
        delete gameStateForBroadcast.myPlayerNumber;

        const fullStatePacket = {
        type: 'fullStateUpdate', // Un nuevo tipo de mensaje claro y único
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