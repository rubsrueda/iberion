// networkManager.js
console.log("networkManager.js CARGADO - Lógica de red lista.");

const PEER_SERVER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
};

const NetworkManager = {
    peer: null,
    conn: null,
    esAnfitrion: false,
    miId: null,
    idRemoto: null,
    
    _isConnecting: false, // Nuestro nuevo "cerrojo"
    
    _onConexionAbierta: null,
    _onDatosRecibidos: null,
    _onConexionCerrada: null,

    preparar: function(onConexionAbierta, onDatosRecibidos, onConexionCerrada) {
        this._onConexionAbierta = onConexionAbierta;
        this._onDatosRecibidos = onDatosRecibidos;
        this._onConexionCerrada = onConexionCerrada;
    },

    iniciarAnfitrion: function(onIdGenerado) {
        if (this._isConnecting) {
            console.warn("[NetworkManager] Se ha bloqueado un intento de iniciar anfitrión mientras ya se estaba conectando.");
            return;
        }
        this._isConnecting = true;

        if (this.peer) {
            this.peer.destroy();
        }
        this.peer = null;
        this.esAnfitrion = true;
        
        // Damos un respiro un poco más largo al navegador.
        setTimeout(() => {
            try {
                // <<== CAMBIO CLAVE: Generar un ID aleatorio explícito ==>>
                // Esto a veces ayuda a la conexión con servidores públicos.
                // Usamos una combinación de timestamp y aleatorio para asegurar que sea único.
                const peerId = `hge-host-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                console.log(`Intentando conectar a PeerJS con ID: ${peerId}`);

                this.peer = new Peer(peerId, PEER_SERVER_CONFIG);
                // <<== FIN DEL CAMBIO ==>>

        this.peer.on('open', (id) => {
            console.log(`%c¡CONEXIÓN CON SERVIDOR PEERJS EXITOSA! Mi ID es: ${id}`, "...");
            this._isConnecting = false; // <<< Desbloqueamos al tener éxito
             this.miId = id;
                    if (onIdGenerado) onIdGenerado(this.miId);

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

        // Dentro del this.peer.on('error', ...)
        this.peer.on('error', (err) => {
            console.error("Error en PeerJS (Anfitrión):", err);
            this._isConnecting = false; // <<< Desbloqueamos también en caso de error
            alert(`Error de conexión de red: ${err.type}. Puede que un firewall esté bloqueando la conexión o el servidor esté ocupado.`);
                    this.desconectar();
        });

            } catch (e) {
                console.error("Fallo catastrófico al crear la instancia de Peer:", e);
            }
        }, 500); // Aumentado a 500ms
    },

    unirseAPartida: function(anfitrionId) {
        console.log("%c[Paso 1 Client] Se ha llamado a unirseAPartida.", "color: cyan;");
        if (this._isConnecting) {
            console.warn("[NetworkManager] Se ha bloqueado un intento de unirse a partida mientras ya se estaba conectando.");
            return;
        }
        this._isConnecting = true;
        if (this.peer) {
            console.log("%c[Paso 2 Client] Instancia de PeerJS anterior detectada. Llamando a destroy().", "color: cyan;");
            this.peer.destroy();
        }
        this.peer = null;
        this.esAnfitrion = false;

        console.log("%c[Paso 3 Client] Entrando en setTimeout para crear nueva instancia de Peer.", "color: cyan;");
        setTimeout(() => {
            try {
                console.log("%c[Paso 4 Client] Dentro de setTimeout. Creando new Peer()...", "color: cyan;");
                this.peer = new Peer(undefined, PEER_SERVER_CONFIG);

                console.log("%c[Paso 5 Client] Objeto Peer creado. Añadiendo listeners...", "color: cyan;");

        this.peer.on('open', (id) => {
            console.log(`%c[Paso 6 Client - ÉXITO] Evento 'open' disparado. Mi ID es: ${id}`, "background: green; color: white;");
            this.miId = id;
            
            if (!anfitrionId) {
                console.error("Error: Se intentó unirse a una partida sin ID de anfitrion.");
                this._isConnecting = false; // <<< DESBLOQUEAMOS si hay error
                return;
            }
            
            console.log(`%c[Paso 7 Client] Llamando a peer.connect('${anfitrionId}')...`, "color: cyan;");
            this.conn = this.peer.connect(anfitrionId);
            this.idRemoto = anfitrionId; // Guardamos el ID remoto

            // <<< ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA! >>>
            // Le decimos que use la función que ya tienes para configurar los eventos de la conexión.
            this._configurarEventosDeConexion(); 
        });

        // Dentro del this.peer.on('error', ...)
        this.peer.on('error', (err) => {
            console.error("%c[Paso E1 Client - ERROR]...", "...", err);
            this._isConnecting = false; // <<< Desbloqueamos en caso de error
            this.desconectar();
        });

            } catch(e) {
                 console.error("%c[Paso E2 Client - ERROR CATASTRÓFICO] Fallo al crear new Peer():", "background: red; color: white;", e);
            }
        }, 200);
    },

    desconectar: function() {
        console.log("[NetworkManager] Iniciando desconexión completa...");
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
        console.log("[NetworkManager] Desconexión y limpieza completadas.");
    },

    enviarDatos: function(datos) {
        // ESTE 'if' ES LA SOLUCIÓN.
        // Solo intentará mostrar el log de 'action.type' si 'datos'
        // es realmente una petición de acción.
        if (datos.type === 'actionRequest' && datos.action) {
            console.log(`[NETWORK FLOW - PASO 2] Enviando petición '${datos.action.type}' al Anfitrión.`);
        }
        
        // El resto de tu función se queda exactamente igual.
        if (this.conn && this.conn.open) {
            // Esta línea ya no la he copiado, pero es donde está tu `console.log` general de "[VIAJE-RED]..."
            // y el `this.conn.send(datos);`
            this.conn.send(datos);
        } else {
            console.warn("[NetworkManager] Intento de enviar datos sin una conexión activa.");
        }
    },

    _configurarEventosDeConexion: function() {
        if (!this.conn) {
            console.error("Se intentó configurar eventos sin una conexión válida.");
            return;
        }

        console.log(`[Configurando Eventos] Añadiendo listeners para la conexión con ${this.conn.peer}...`);

        this.conn.on('open', () => {
            console.log(`%c[Paso 8 - ÉXITO CONEXIÓN] La conexión de datos con ${this.conn.peer} está abierta.`, "background: blue; color: white;");
            this._isConnecting = false; // Desbloqueamos el cerrojo AHORA que la conexión es real.
            if (this._onConexionAbierta) this._onConexionAbierta(this.idRemoto);
        });

        this.conn.on('data', (datos) => {
            console.log(`%c[NETWORK RECEIVE] Datos recibidos de ${this.conn.peer}:`, 'background: #2E8B57; color: white;', JSON.parse(JSON.stringify(datos)));
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
        
        this.enviarDatos(fullStatePacket);
    }
};