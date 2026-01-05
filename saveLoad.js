// saveLoad.js
// Funciones para guardar y cargar el estado del juego.

async function handleSaveGame() {
    if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
        logMessage("Debes estar conectado a la nube para guardar la partida.", "error");
        return;
    }

    const saveName = prompt("Introduce un nombre para esta partida:", "Partida Guardada " + new Date().toLocaleDateString());
    if (!saveName) return;

    // Recopilamos los datos (esto ya lo tenías)
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

    const unitsState = units.map(unit => ({
        ...unit,
        element: undefined // No guardamos el elemento visual
    }));

    const fullSaveData = {
        gameState: gameState,
        board: boardState,
        units: unitsState,
        unitIdCounter: unitIdCounter
    };

    logMessage("Guardando en la nube...");

    // ENVIAR A SUPABASE
    const { data, error } = await supabaseClient
        .from('game_saves')
        .insert({
            user_id: PlayerDataManager.currentPlayer.auth_id,
            save_name: saveName,
            board_state: boardState,
            game_state: {
                gameState: gameState,
                units: unitsState,
                unitIdCounter: unitIdCounter
            }
        });

    if (error) {
        console.error("Error al guardar:", error);
        logMessage("Error al guardar en la nube: " + error.message, "error");
    } else {
        logMessage("¡Partida '" + saveName + "' guardada con éxito en la nube!", "success");
    }
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
        .select('id, save_name, created_at')
        .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
        .order('created_at', { ascending: false });

    if (error || !saves || saves.length === 0) {
        logMessage("No se han encontrado partidas guardadas.", "warning");
        return;
    }

    // 2. Mostrar un selector simple (puedes mejorar esto con un modal luego)
    let message = "Selecciona el número de la partida a cargar:\n";
    saves.forEach((s, i) => {
        message += `${i + 1}. ${s.save_name} (${new Date(s.created_at).toLocaleString()})\n`;
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
            
            // Cerrar menús y mostrar juego
            if (domElements.setupScreen) domElements.setupScreen.style.display = 'none';
            if (domElements.gameContainer) domElements.gameContainer.style.display = 'flex';
            logMessage("Partida cargada desde la nube.", "success");
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

