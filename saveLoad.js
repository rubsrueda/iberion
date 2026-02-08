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

// --- Sistema de Debounce para evitar guardados simultáneos ---
const SaveGameDebounce = {
    isProcessing: false,
    pendingRequests: new Map(),

    async execute(saveName, isAutoSave) {
        const key = `${isAutoSave}_${saveName}`;
        
        if (this.isProcessing) {
            this.pendingRequests.set(key, { saveName, isAutoSave });
            return false;
        }

        this.isProcessing = true;
        try {
            return await saveGameUnifiedInternal(saveName, isAutoSave);
        } finally {
            this.isProcessing = false;
            
            // Procesar próxima solicitud en cola
            if (this.pendingRequests.size > 0) {
                const [nextKey, nextRequest] = this.pendingRequests.entries().next().value;
                this.pendingRequests.delete(nextKey);
                setTimeout(() => {
                    this.execute(nextRequest.saveName, nextRequest.isAutoSave);
                }, 100);
            }
        }
    }
};

// --- Guardado Local (fallback/offline) ---
const LOCAL_SAVE_KEY = 'iberion_local_saves';

function _readLocalSaves() {
    try {
        const raw = localStorage.getItem(LOCAL_SAVE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.warn("[LocalSave] Error leyendo localStorage:", e);
        return [];
    }
}

function _writeLocalSaves(list) {
    try {
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(list));
        return true;
    } catch (e) {
        console.warn("[LocalSave] Error escribiendo localStorage:", e);
        return false;
    }
}

function _saveToLocalStorage(saveData) {
    const list = _readLocalSaves();
    const existingIndex = list.findIndex(s => s.save_name === saveData.save_name);
    if (existingIndex !== -1) {
        list[existingIndex] = { ...list[existingIndex], ...saveData, updated_at: new Date().toISOString() };
    } else {
        list.unshift(saveData);
    }
    _writeLocalSaves(list);
}

function getLocalSavedGames() {
    return _readLocalSaves();
}

function deleteLocalSavedGame(saveId) {
    const list = _readLocalSaves();
    const newList = list.filter(s => s.id !== saveId);
    _writeLocalSaves(newList);
}

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
    return await SaveGameDebounce.execute(saveName, isAutoSave);
}

/**
 * Función INTERNA que hace el guardado real
 */
async function saveGameUnifiedInternal(saveName, isAutoSave = false) {
    // Validación: jugador debe estar autenticado
    if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
        console.warn("[SaveGame] Jugador no autenticado. Guardando localmente.");
        // Permitir guardado local si no hay login
        const { boardState, unitsState } = _prepareGameDataForSave();

        let localGameType = "local_vs_ai";
        if (gameState.playerTypes && gameState.playerTypes.player2 === 'human') {
            localGameType = "local_multiplayer";
        }

        const localSave = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            save_name: saveName || `Partida Guardada ${new Date().toLocaleDateString('es-ES')}`,
            user_id: null,
            board_state: boardState,
            game_state: {
                gameState: gameState,
                units: unitsState,
                unitIdCounter: unitIdCounter,
                metadata: {
                    gameType: localGameType,
                    turnNumber: gameState.turnNumber || 0,
                    currentPlayer: gameState.currentPlayer || 1,
                    numPlayers: gameState.numPlayers || 2,
                    isCampaignBattle: gameState.isCampaignBattle || false,
                    winner: gameState.winner || null,
                    gamePhase: gameState.currentPhase || "play",
                    savedAt: new Date().toISOString(),
                    isAutoSave: isAutoSave
                },
                playerInfo: {
                    playerTypes: gameState.playerTypes,
                    playerCivilizations: gameState.playerCivilizations,
                    playerResources: gameState.playerResources
                }
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_local: true
        };

        _saveToLocalStorage(localSave);
        if (!isAutoSave) {
            logMessage("Partida guardada localmente.", "success");
        }
        return true;
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

    if (isAutoSave && PlayerDataManager.currentPlayer?.auth_id) {
        const userSuffix = PlayerDataManager.currentPlayer.auth_id.slice(0, 8);
        if (!saveName.includes(userSuffix)) {
            saveName = `${saveName}_${userSuffix}`;
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

        try {
            // Primero verificar si existe una partida con ese nombre
            const { data: existing, error: selectError } = await supabaseClient
                .from('game_saves')
                .select('id')
                .eq('user_id', saveData.user_id)
                .eq('save_name', saveData.save_name)
                .maybeSingle();

            if (selectError) {
                console.error("[SaveGame] Error al buscar partida existente:", selectError);
                throw selectError;
            }

            let error = null;
            
            if (existing) {
                // Actualizar la partida existente
                const result = await supabaseClient
                    .from('game_saves')
                    .update({
                        game_state: saveData.game_state,
                        board_state: saveData.board_state,
                        created_at: saveData.created_at
                    })
                    .eq('id', existing.id);
                error = result.error;
            } else {
                // Insertar nueva partida
                const result = await supabaseClient
                    .from('game_saves')
                    .insert([saveData]);
                error = result.error;

                if (error && error.code === '23505') {
                    const uniqueSuffix = new Date().toISOString().replace(/[:.]/g, '-');
                    const uniqueName = `${saveData.save_name} (${uniqueSuffix})`;
                    const retryResult = await supabaseClient
                        .from('game_saves')
                        .insert([{ ...saveData, save_name: uniqueName }]);
                    error = retryResult.error;
                    if (!error && !isAutoSave) {
                        logMessage(`Nombre duplicado. Guardado como '${uniqueName}'.`, "warning");
                    }
                }
            }

            if (error) {
                console.error("[SaveGame] Error al guardar:", error);
                // Fallback a guardado local si falla la nube
                const localFallback = { ...saveData, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, is_local: true };
                _saveToLocalStorage(localFallback);
                if (!isAutoSave) {
                    logMessage("Error en la nube. Guardado local realizado.", "warning");
                }
                return true;
            } else {
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
    } catch (error) {
        console.error("[SaveGame] Error inesperado en saveGameUnifiedInternal:", error);
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

function showGameContainerFromLoad() {
    
    // 1. Obtener referencias a elementos críticos
    const gameContainer = document.querySelector('.game-container') || domElements.gameContainer;
    const mainMenu = document.getElementById('mainMenuScreen');
    const setupScreen = document.getElementById('setupScreen');
    const gameContainer2 = document.getElementById('gameContainer');
    
    // 2. Debug: Mostrar qué encontramos
    
    // 3. OCULTAR EXPLÍCITAMENTE POR ID
    if (mainMenu) {
        mainMenu.style.setProperty('display', 'none', 'important');
        mainMenu.style.setProperty('visibility', 'hidden', 'important');
        mainMenu.style.setProperty('pointer-events', 'none', 'important');
        mainMenu.style.setProperty('z-index', '0', 'important');
    }
    
    if (setupScreen) {
        setupScreen.style.setProperty('display', 'none', 'important');
    }
    
    // 4. MOSTRAR EL JUEGO DE MÚLTIPLES FORMAS PARA ASEGURAR
    if (gameContainer) {
        gameContainer.style.setProperty('display', 'flex', 'important');
        gameContainer.style.setProperty('visibility', 'visible', 'important');
        gameContainer.style.setProperty('z-index', '1200', 'important');
    }
    
    if (gameContainer2) {
        gameContainer2.style.setProperty('display', 'flex', 'important');
        gameContainer2.style.setProperty('visibility', 'visible', 'important');
        gameContainer2.style.setProperty('z-index', '1200', 'important');
    }
    
    // 5. Intentar usar showScreen() si está disponible
    if (typeof showScreen === 'function' && (gameContainer || gameContainer2)) {
        const containerToShow = gameContainer || gameContainer2;
        showScreen(containerToShow);
    }
    
    // 6. Refrescar la UI táctica si existe
    const tacticalUI = document.getElementById('tactical-ui-container') || domElements.tacticalUiContainer;
    if (tacticalUI) {
        tacticalUI.style.setProperty('display', 'block', 'important');
    }
    
    // 7. Verificación final: Asegurar que ya no hay ningún overlay modal visible
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id !== 'postMatchModal' && modal.id !== 'replayModal') {
            modal.style.setProperty('display', 'none', 'important');
        }
    });
    
}

async function handleLoadGame() {
    const hasAuth = PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.auth_id;
    if (!hasAuth) {
        const localSaves = getLocalSavedGames();
        if (!localSaves || localSaves.length === 0) {
            logMessage("No hay partidas locales para cargar.", "warning");
            return;
        }
        let message = "Selecciona el número de la partida local a cargar:\n\n";
        localSaves.forEach((s, i) => {
            const createdDate = new Date(s.created_at || s.updated_at || Date.now()).toLocaleDateString('es-ES');
            const state = s.game_state?.gameState || {};
            const turn = state.turnNumber || 1;
            const gamePhase = state.currentPhase || 'play';
            message += `${i + 1}. [LOCAL] ${s.save_name} (Turno ${turn}, ${gamePhase}) - ${createdDate}\n`;
        });
        const choice = prompt(message);
        const index = parseInt(choice) - 1;
        if (localSaves[index]) {
            const localSave = localSaves[index];
            let dataToRestore = localSave.game_state;
            if (!dataToRestore.board && localSave.board_state) dataToRestore.board = localSave.board_state;
            if (typeof reconstruirJuegoDesdeDatos === 'function') {
                reconstruirJuegoDesdeDatos(dataToRestore);
                // Mostrar el juego y ocultar el menú usando showScreen
                // Agregar pequeño delay para asegurar que el DOM está completamente actualizado
                setTimeout(() => {
                    showGameContainerFromLoad();
                }, 100);
                logMessage("Partida local cargada.", "success");
            }
        }
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
        // Fallback a locales si la nube está vacía
        const localSaves = getLocalSavedGames();
        if (!localSaves || localSaves.length === 0) {
            logMessage("No se han encontrado partidas guardadas.", "warning");
            return;
        }
        let message = "Selecciona el número de la partida local a cargar:\n\n";
        localSaves.forEach((s, i) => {
            const createdDate = new Date(s.created_at || s.updated_at || Date.now()).toLocaleDateString('es-ES');
            const state = s.game_state?.gameState || {};
            const turn = state.turnNumber || 1;
            const gamePhase = state.currentPhase || 'play';
            message += `${i + 1}. [LOCAL] ${s.save_name} (Turno ${turn}, ${gamePhase}) - ${createdDate}\n`;
        });
        const choice = prompt(message);
        const index = parseInt(choice) - 1;
        if (localSaves[index]) {
            const localSave = localSaves[index];
            let dataToRestore = localSave.game_state;
            if (!dataToRestore.board && localSave.board_state) dataToRestore.board = localSave.board_state;
            if (typeof reconstruirJuegoDesdeDatos === 'function') {
                reconstruirJuegoDesdeDatos(dataToRestore);
                // Mostrar el juego y ocultar el menú usando showScreen
                setTimeout(() => {
                    showGameContainerFromLoad();
                }, 100);
                logMessage("Partida local cargada.", "success");
            }
        }
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
            
            // Cerrar menús y mostrar juego usando showScreen() para asegurar z-index correcto
            if (domElements.setupScreen) domElements.setupScreen.style.display = 'none';
            
            // IMPORTANTE: Agregar delay para asegurar que reconstruirJuegoDesdeDatos() terminó completamente
            setTimeout(() => {
                showGameContainerFromLoad();
                logMessage(`Partida cargada desde la nube${typeMsg}.`, "success");
            }, 100);
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

// Exponer helpers locales para UI
if (typeof window !== 'undefined') {
    window.getLocalSavedGames = getLocalSavedGames;
    window.deleteLocalSavedGame = deleteLocalSavedGame;
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
