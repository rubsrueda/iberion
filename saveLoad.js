// saveLoad.js
// Funciones para guardar y cargar el estado del juego.

function handleSaveGame() {
    if (!gameState || !board || !units) {
        logMessage("Error: Estado del juego no inicializado para guardar.");
        return;
    }
    const gameDataToSave = {
        gameState: gameState,
        board: board.map(row => row.map(hex => ({
            terrain: hex.terrain,
            owner: hex.owner,
            structure: hex.structure,
            isCity: hex.isCity,
            isCapital: hex.isCapital,
            resourceNode: hex.resourceNode,
            visibility: hex.visibility,
            nacionalidad: hex.nacionalidad,
            estabilidad: hex.estabilidad
        }))),
        units: units.map(unit => ({
            ...unit,
            element: undefined
        })),
        unitIdCounter: unitIdCounter
    };

    try {
        const dataStr = JSON.stringify(gameDataToSave);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hexGeneralEvolved_save.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logMessage("Partida Guardada.");
    } catch (error) {
        logMessage("Error al guardar la partida: " + error.message);
        console.error("Error de guardado:", error);
    }
}

function handleLoadGame(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (!loadedData.gameState || !loadedData.board || !loadedData.units) {
                throw new Error("Archivo de guardado inválido o corrupto.");
            }

            if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
            board = [];
            units = [];
            
            Object.assign(gameState, loadedData.gameState);

            ensureFullGameState();
            
            unitIdCounter = loadedData.unitIdCounter || 0;

            const boardSize = loadedData.board.length > 0 ? { rows: loadedData.board.length, cols: loadedData.board[0].length } : BOARD_SIZES.small;
            if (domElements.gameBoard) {
                 domElements.gameBoard.style.width = `${boardSize.cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
                 domElements.gameBoard.style.height = `${boardSize.rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;
            }
            
            board = Array(boardSize.rows).fill(null).map(() => Array(boardSize.cols).fill(null));

            for (let r_load = 0; r_load < boardSize.rows; r_load++) {
                for (let c_load = 0; c_load < boardSize.cols; c_load++) {
                    const hexElement = createHexDOMElementWithListener(r_load, c_load);
                    if (domElements.gameBoard) domElements.gameBoard.appendChild(hexElement);
                    
                    const loadedHexData = loadedData.board[r_load]?.[c_load];
                    if (loadedHexData) {
                        board[r_load][c_load] = { 
                            ...loadedHexData,
                            // <<== SOLUCIÓN: GARANTIZAR QUE EXISTEN LAS PROPIEDADES ==>>
                            nacionalidad: loadedHexData.nacionalidad || { 1: 0, 2: 0 },
                            estabilidad: loadedHexData.estabilidad || 0,
                            // <<== FIN DE LA SOLUCIÓN ==>>
                            element: hexElement,
                            unit: null
                        };
                    } else {
                         board[r_load][c_load] = { 
                             element: hexElement, terrain: 'plains', owner: null, structure: null, isCity: false, 
                             isCapital: false, resourceNode: null, visibility: {player1: 'hidden', player2: 'hidden'}, 
                             unit: null, nacionalidad: {1:0, 2:0}, estabilidad: 0
                         };
                    }
                }
            }

            loadedData.units.forEach(unitData => {
                const hydratedStats = calculateRegimentStats(unitData.regiments, unitData.player);
                const hydratedUnit = {
                    ...unitData,
                    attack: hydratedStats.attack, defense: hydratedStats.defense,
                    movement: hydratedStats.movement, visionRange: hydratedStats.visionRange,
                    attackRange: hydratedStats.attackRange, initiative: hydratedStats.initiative,
                    maxHealth: hydratedStats.maxHealth,
                    element: null
                };

                const unitElement = document.createElement('div');
                unitElement.classList.add('unit', `player${hydratedUnit.player}`);
                unitElement.textContent = hydratedUnit.sprite;
                unitElement.dataset.id = hydratedUnit.id;
                const strengthDisplay = document.createElement('div');
                strengthDisplay.classList.add('unit-strength');
                strengthDisplay.textContent = hydratedUnit.currentHealth;
                unitElement.appendChild(strengthDisplay);
                if (domElements.gameBoard) domElements.gameBoard.appendChild(unitElement);
                
                hydratedUnit.element = unitElement;
                units.push(hydratedUnit);
                
                if (hydratedUnit.r !== -1 && hydratedUnit.c !== -1 && board[hydratedUnit.r]?.[hydratedUnit.c]) {
                    board[hydratedUnit.r][hydratedUnit.c].unit = hydratedUnit;
                }
            });

            renderFullBoardVisualState(); 
            UIManager.updateAllUIDisplays();    
            deselectUnit();
            if (UIManager.hideContextualPanel) UIManager.hideContextualPanel();
            
            logMessage("Partida Cargada Correctamente.");
            if (domElements.setupScreen) domElements.setupScreen.style.display = 'none';
            if (domElements.gameContainer) domElements.gameContainer.style.display = 'flex';

        } catch (error) {
            logMessage("Error al cargar la partida: " + error.message);
            console.error("Error de Carga Detallado:", error);
        }
    };
    reader.readAsText(file);
    if (domElements.loadGameInput) domElements.loadGameInput.value = "";
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