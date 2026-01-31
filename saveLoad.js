// saveLoad.js
// Funciones para guardar y cargar el estado del juego.
// 
// ARQUITECTURA UNIFICADA (v2.0):
// ===============================
// Todas las partidas se guardan exactamente igual, independientemente de si son:
// - Partidas en red (multijugador en línea)
// - Partidas locales vs IA
// - Partidas locales multijugador (humano vs humano)
//
// El tipo de oponente es METADATA, no afecta el sistema de guardado.
// Beneficios:
// 1. Simplificación de código (una sola función de guardado)
// 2. Consistencia garantizada en todas las partidas
// 3. Fácil expansión futura (cambiar oponente sin perder el guardado)
// 4. Recuperación de progreso automática (autosaves cada 5 turnos + final de partida)
//
// Funciones principales:
// - saveGameUnified(name, isAutoSave) - Función centralizada (se usa en fin de partida + cada 5 turnos)
// - handleSaveGame() - Interfaz manual para que el usuario guarde
// - handleLoadGame() - Carga partidas con información del tipo de juego
//

/**
 * Función auxiliar para preparar el estado del juego para guardado
 * Extrae solo los datos necesarios, sin referencias a DOM ni circulares
 */
function _prepareGameDataForSave() {
    const boardState = board.map(row => row.map(hex => ({
        terrain: hex.terrain,
        owner: hex.owner,
        structure: hex.structure,
        isCity: hex.isCity,
        isCapital: hex.isCapital,
        resourceNode: hex.resourceNode,
        visibility: hex.visibility,
        nacionalidad: hex.nacionalidad,
        estabilidad: hex.estabilidad
    })));

    const unitsState = units.map(unit => {
        const unitCopy = { ...unit };
        delete unitCopy.element; // No guardamos referencias a DOM
        return unitCopy;
    });

    return { boardState, unitsState };
}

/**
 * Función CENTRALIZADA para guardar CUALQUIER tipo de partida
 * Se trata de igual forma: contra IA, contra jugador local, o partida de red
 * 
 * El tipo de oponente es metadata, no afecta el guardado
 * 
 * @param {string} saveName - Nombre descriptivo para el guardado. Si es undefined, genera uno automático
 * @param {boolean} isAutoSave - true si es un autosave, false si es manual
 * @returns {Promise<boolean>} true si el guardado fue exitoso
 */
async function saveGameUnified(saveName, isAutoSave = false) {
    // Validación: jugador debe estar autenticado
    if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
        console.error("[SaveGame] Error: Jugador no autenticado");
        if (!isAutoSave) {
            logMessage("Debes estar conectado para guardar la partida.", "error");
        }
        return false;
    }

    // Generar nombre automático si no se proporciona uno
    if (!saveName) {
        if (isAutoSave) {
            // Para autosaves, incluir timestamp
            const now = new Date();
            const timeStr = now.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            saveName = `AUTOSAVE_${timeStr}`;
        } else {
            saveName = `Partida Guardada ${new Date().toLocaleDateString('es-ES')}`;
        }
    }

    try {
        // Preparar datos de forma unificada
        const { boardState, unitsState } = _prepareGameDataForSave();

        // Determinar tipo de partida (metadata)
        let gameType = "local_vs_ai"; // Por defecto
        if (typeof NetworkManager !== 'undefined' && NetworkManager.miId) {
            gameType = "network_multiplayer";
        } else if (gameState.playerTypes && gameState.playerTypes.player2 === 'human') {
            gameType = "local_multiplayer";
        }

        // Metadatos generales para todas las partidas
        const gameMetadata = {
            gameType: gameType,
            turnNumber: gameState.turnNumber || 0,
            currentPlayer: gameState.currentPlayer || 1,
            numPlayers: gameState.numPlayers || 2,
            isCampaignBattle: gameState.isCampaignBattle || false,
            winner: gameState.winner || null,
            gamePhase: gameState.currentPhase || "play",
            savedAt: new Date().toISOString(),
            isAutoSave: isAutoSave
        };

        // Información sobre los oponentes/jugadores
        const playerInfo = {
            playerTypes: gameState.playerTypes || {},
            playerCivilizations: gameState.playerCivilizations || {},
            playerResources: gameState.playerResources || {}
        };

        // Estructura unificada de guardado
        const saveData = {
            user_id: PlayerDataManager.currentPlayer.auth_id,
            save_name: saveName,
            game_state: {
                gameState: gameState,
                units: unitsState,
                unitIdCounter: unitIdCounter,
                metadata: gameMetadata,
                playerInfo: playerInfo
            },
            board_state: boardState,
            created_at: new Date().toISOString()
        };

        if (!isAutoSave) {
            logMessage("Guardando en la nube...");
        }

        // Usar UPSERT para que si el nombre ya existe, se actualiza
        // (Permite sobrescribir autosaves con el mismo nombre)
        const { error } = await supabaseClient
            .from('game_saves')
            .upsert(saveData, { 
                onConflict: 'user_id,save_name'
            });

        if (error) {
            console.error("[SaveGame] Error al guardar:", error);
            if (!isAutoSave) {
                logMessage("Error al guardar: " + error.message, "error");
            }
            return false;
        } else {
            console.log(`[SaveGame] '${saveName}' guardada exitosamente (${gameType})`);
            if (!isAutoSave) {
                logMessage(`¡Partida '${saveName}' guardada con éxito!`, "success");
            }
            return true;
        }
    } catch (error) {
        console.error("[SaveGame] Excepción:", error);
        if (!isAutoSave) {
            logMessage("Error inesperado al guardar: " + error.message, "error");
        }
        return false;
    }
}

/**
 * Interfaz manual para guardar una partida (usuario presiona botón "Guardar")
 * Pide nombre al usuario y guarda como guardado manual
 */
async function handleSaveGame() {
    const defaultName = `Partida ${new Date().toLocaleDateString('es-ES')}`;
    const saveName = prompt("Introduce un nombre para esta partida:", defaultName);
    
    if (!saveName) return; // Usuario canceló

    await saveGameUnified(saveName, false);
}

async function handleLoadGame() {
    if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
        logMessage("Inicia sesión para cargar tus partidas de la nube.", "error");
        return;
    }

    logMessage("Buscando partidas en la nube...");

    // 1. Obtener lista de partidas
    const { data: saves, error } = await supabaseClient
        .from('game_saves')
        .select('id, save_name, created_at, game_state')
        .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
        .order('created_at', { ascending: false });

    if (error || !saves || saves.length === 0) {
        logMessage("No se han encontrado partidas guardadas.", "warning");
        return;
    }

    // 2. Mostrar un selector con información sobre el tipo de partida
    let message = "Selecciona el número de la partida a cargar:\n\n";
    saves.forEach((s, i) => {
        const gameType = s.game_state?.metadata?.gameType || "desconocido";
        const turn = s.game_state?.metadata?.turnNumber || 0;
        const gamePhase = s.game_state?.metadata?.gamePhase || "unknown";
        const createdDate = new Date(s.created_at).toLocaleString('es-ES');
        
        // Mapear tipo de partida a etiqueta legible
        let typeLabel = gameType;
        if (gameType === 'network') typeLabel = "🌐 En Línea";
        else if (gameType === 'network_multiplayer') typeLabel = "🌐 En Línea";
        else if (gameType === 'skirmish_local') typeLabel = "👥 Local";
        else if (gameType === 'local_multiplayer') typeLabel = "👥 Local";
        else if (gameType === 'skirmish_ai') typeLabel = "🤖 vs IA";
        else if (gameType === 'local_vs_ai') typeLabel = "🤖 vs IA";
        else if (gameType === 'campaign') typeLabel = "🗺️ Campaña";
        else if (gameType === 'raid') typeLabel = "⚔️ Raid";
        
        message += `${i + 1}. [${typeLabel}] ${s.save_name} (Turno ${turn}, ${gamePhase}) - ${createdDate}\n`;
    });

    const choice = prompt(message);
    const index = parseInt(choice) - 1;

    if (saves[index]) {
        const saveId = saves[index].id;
        
        // 3. Descargar la partida elegida
        const { data: fullSave, error: loadError } = await supabaseClient
            .from('game_saves')
            .select('*')
            .eq('id', saveId)
            .single();

        if (fullSave) {
            logMessage("Cargando datos...");
            
            // Usamos tu función existente para reconstruir el mundo
            const dataToRestore = {
                gameState: fullSave.game_state.gameState,
                board: fullSave.board_state,
                units: fullSave.game_state.units,
                unitIdCounter: fullSave.game_state.unitIdCounter
            };

            reconstruirJuegoDesdeDatos(dataToRestore);
            
            // Mostrar información sobre qué tipo de partida se cargó
            const gameType = fullSave.game_state?.metadata?.gameType || "desconocida";
            let typeMsg = "";
            if (gameType === 'network' || gameType === 'network_multiplayer') typeMsg = " (Partida en línea)";
            else if (gameType === 'skirmish_local' || gameType === 'local_multiplayer') typeMsg = " (Partida local multijugador)";
            else if (gameType === 'skirmish_ai' || gameType === 'local_vs_ai') typeMsg = " (Partida vs IA)";
            else if (gameType === 'campaign') typeMsg = " (Campaña)";
            else if (gameType === 'raid') typeMsg = " (Raid)";
            
            // Cerrar menús y mostrar juego
            if (domElements.setupScreen) domElements.setupScreen.style.display = 'none';
            if (domElements.gameContainer) domElements.gameContainer.style.display = 'flex';
            logMessage(`Partida cargada desde la nube${typeMsg}.`, "success");
        }
    }
}

// Archivo a modificar: saveLoad.js (añadir al final)

/**
 * (NUEVO) Exporta el perfil del jugador actual como un archivo .json descargable.
 */
function exportProfile() {
    if (!PlayerDataManager.currentPlayer) {
        logMessage("Error: No hay un perfil de jugador activo para exportar.", "error");
        return;
    }

    try {
        const profileData = PlayerDataManager.getCurrentPlayer();
        const dataStr = JSON.stringify(profileData, null, 2); // El null, 2 formatea el JSON para que sea legible
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profileData.username}_profile.json`;
        document.body.appendChild(a);
        a.click();
        
        // Limpieza
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logMessage(`Perfil de '${profileData.username}' exportado con éxito.`);

    } catch (error) {
        logMessage("Error al exportar el perfil: " + error.message, "error");
        console.error("Error de exportación:", error);
    }
}

/**
 * (NUEVO) Importa un perfil de jugador desde un archivo .json seleccionado.
 * @param {Event} event - El evento 'change' del input de tipo file.
 */
function importProfile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedProfile = JSON.parse(e.target.result);

            // Validación simple para asegurar que es un perfil
            if (!loadedProfile.username || !loadedProfile.credentials || !loadedProfile.heroes) {
                throw new Error("El archivo no parece ser un perfil de jugador válido.");
            }
            
            // Guardar el perfil importado en LocalStorage
            const playerDataKey = `player_${loadedProfile.username.toLowerCase()}`;
            localStorage.setItem(playerDataKey, JSON.stringify(loadedProfile));
            
            // Hacer que este sea el último usuario para el auto-login
            localStorage.setItem('lastUser', loadedProfile.username);

            logMessage(`Perfil de '${loadedProfile.username}' importado con éxito. Reiniciando para aplicar cambios...`);
            
            // Forzar un reinicio de la página para que el nuevo perfil se cargue limpiamente
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            logMessage("Error al importar el perfil: " + error.message, "error");
            console.error("Error de importación:", error);
        }
    };
    reader.readAsText(file);
}

/**
 * Función HELPER para detectar el tipo de partida desde metadatos de guardado
 * Usada por otras partes del sistema para adaptar comportamientos según el tipo
 * 
 * @param {Object} gameState - El objeto gameState guardado
 * @returns {string} Uno de: "network_multiplayer", "local_multiplayer", "local_vs_ai", "unknown"
 */
function getGameTypeFromSave(gameStateObject) {
    if (!gameStateObject) return "unknown";
    
    // Intenta leer de metadata primero (sistemas nuevos)
    if (gameStateObject.metadata?.gameType) {
        return gameStateObject.metadata.gameType;
    }
    
    // Fallback: Detectar automáticamente basado en playerTypes
    const playerTypes = gameStateObject.playerTypes;
    if (!playerTypes) return "unknown";
    
    const p2Type = playerTypes.player2;
    if (!p2Type) return "unknown";
    
    if (p2Type === 'human') {
        return "local_multiplayer";
    } else if (p2Type.startsWith('ai_')) {
        return "local_vs_ai";
    }
    
    // Si está en red, sería network_multiplayer
    // Pero eso se detecta mejor desde NetworkManager en tiempo de ejecución
    return "unknown";
}

/**
 * Función para obtener información descriptiva sobre un tipo de partida
 * @param {string} gameType - El tipo de partida
 * @returns {Object} {icon, label, description}
 */
function getGameTypeInfo(gameType) {
    const infoMap = {
        'network_multiplayer': {
            icon: '🌐',
            label: 'En Línea',
            description: 'Partida multijugador en línea (Supabase)'
        },
        'local_multiplayer': {
            icon: '👥',
            label: 'Local Multijugador',
            description: 'Partida local entre dos humanos'
        },
        'local_vs_ai': {
            icon: '🤖',
            label: 'vs IA',
            description: 'Partida local contra la IA'
        },
        'unknown': {
            icon: '❓',
            label: 'Desconocido',
            description: 'Tipo de partida no identificado'
        }
    };
    
    return infoMap[gameType] || infoMap['unknown'];
}
