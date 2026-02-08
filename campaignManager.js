// campaignManager.js (20250827)

// Se asume que las variables de elementos DOM como mainMenuScreenEl, worldMapScreenEl, etc.,
// y GAME_DATA_REGISTRY, WORLD_MAP_DATA son globales y definidas en otros archivos
// que se cargan antes (domElements.js, state.js, datos de mapa/escenario).

let worldData = null;
let campaignState = {
    conqueredTerritories: new Set(),
    currentTerritoryIdForBattle: null,
    currentScenarioDataForBattle: null,
    currentMapTacticalDataForBattle: null,
};

// --- INICIALIZACIÓN Y NAVEGACIÓN ENTRE PANTALLAS ---
// En campaignManager.js, REEMPLAZA la función showScreen COMPLETA

function showScreen(screenToShow) {
    // Creamos una lista COMPLETA de todas las pantallas/contenedores que actúan como "pantallas principales".
    const screens = [
        domElements.mainMenuScreenEl, 
        domElements.setupScreen,
        domElements.hostLobbyScreen, // <<-- AÑADIDO: Ahora se ocultará correctamente.
        domElements.lanLobbyScreen,  // Mantenemos el antiguo por si acaso.
        domElements.worldMapScreenEl, 
        domElements.gameContainer, 
        domElements.scenarioBriefingModalEl,
        domElements.inboxModal, 
        domElements.deseosModal
    ];

    // Ocultamos todas las pantallas de la lista.
    screens.forEach(s => {
        if (s && s.style) { // Añadida verificación de seguridad
            s.style.display = 'none';
        }
    });

    const isGameScreen = !!(screenToShow && (screenToShow === domElements.gameContainer || screenToShow.id === 'gameContainer' || screenToShow.classList.contains('game-container')));
    if (!isGameScreen) {
        const topBar = document.getElementById('top-bar-menu');
        if (topBar) topBar.style.display = 'none';
        if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'none';
        if (domElements.floatingMenuPanel) domElements.floatingMenuPanel.style.display = 'none';
        if (domElements.contextualInfoPanel) domElements.contextualInfoPanel.classList.remove('visible');
        const reopenBtn = document.getElementById('reopenContextualPanelBtn');
        if (reopenBtn) reopenBtn.style.display = 'none';
        const rightMenuGroup = document.querySelector('.right-menu-group.is-open');
        if (rightMenuGroup) rightMenuGroup.classList.remove('is-open');
        if (domElements.toggleRightMenuBtn) domElements.toggleRightMenuBtn.textContent = '⚙️';
        if (typeof UIManager !== 'undefined' && UIManager.hideAllActionButtons) {
            UIManager.hideAllActionButtons();
        }
    }
    
    // CRÍTICO: También ocultar explícitamente el mainMenuScreen si se está mostrando gameContainer
    // Esto previene que el menú quede visible debajo del mapa (z-index issues)
    if (screenToShow && (screenToShow.id === 'gameContainer' || screenToShow.classList.contains('game-container'))) {
        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) {
            mainMenu.style.setProperty('display', 'none', 'important');
            mainMenu.style.setProperty('visibility', 'hidden', 'important');
            mainMenu.style.setProperty('pointer-events', 'none', 'important');
            mainMenu.style.setProperty('z-index', '0', 'important');
        }
    }
    
    // Mostramos solo la pantalla que queremos.
    if (screenToShow) {
        // Usamos 'flex' para modales y el contenedor del juego para un centrado correcto.
        const displayStyle = (screenToShow.classList.contains('modal') || screenToShow === domElements.gameContainer) ? 'flex' : 'block';
        screenToShow.style.display = displayStyle;
    }
}


// --- INICIO DE FUNCIÓN: initializeCampaignMode ---
function initializeCampaignMode() {
    showScreen(domElements.worldMapScreenEl); // Usar domElements

    if (typeof WORLD_MAP_DATA === 'undefined') {
        console.error("CampaignManager Error: WORLD_MAP_DATA no está definido.");
        if (domElements.campaignMessagesEl) domElements.campaignMessagesEl.textContent = "Error: Datos de campaña global no encontrados."; // Usar domElements
        return;
    }
    worldData = WORLD_MAP_DATA;

    if (domElements.worldMapImageEl && worldData.mapImage) { // Usar domElements
         domElements.worldMapImageEl.src = worldData.mapImage; // Usar domElements
    } else if (domElements.worldMapImageEl) { // Usar domElements
        domElements.worldMapImageEl.src = ""; // Usar domElements
    }

    loadCampaignProgress();
    renderWorldMap();
    updateCampaignMessages(`Bienvenido, General. Selecciona un territorio para actuar.`);
}
// --- FIN DE FUNCIÓN: initializeCampaignMode ---


// --- INICIO DE FUNCIÓN: setupMainMenuListeners ---
function setupMainMenuListeners() { // Esta función será llamada por main.js -> initApp
    // Asegurarse que todos los elementos se acceden a través de domElements
   /* if (!domElements.startCampaignBtnEl || !domElements.startSkirmishBtnEl || !domElements.startTutorialBtn || !domElements.backToMainMenuBtn_fromCampaign || !domElements.backToMainMenuBtn_fromSetup || !domElements.closeScenarioBriefingBtnEl || !domElements.startScenarioBattleBtnEl) {
        console.error("CampaignManager: Faltan uno o más botones del menú principal/navegación. Asegúrate que domElements.js los inicializó.");
        return;
    }
    */
    //domElements.startCampaignBtnEl.addEventListener('click', initializeCampaignMode);
    //domElements.startSkirmishBtnEl.addEventListener('click', () => showScreen(domElements.setupScreen)); 
        
    //domElements.startTutorialBtn.addEventListener('click', () => {
        // 1. Carga el mapa y el estado base del juego
        const tutorialScenario = GAME_DATA_REGISTRY.scenarios["TUTORIAL_SCENARIO"];
        const tutorialMap = GAME_DATA_REGISTRY.maps[tutorialScenario.mapFile];
        
        // <<== MODIFICACIÓN: Llamamos a resetAndSetupTacticalGame primero ==>>
        resetAndSetupTacticalGame(tutorialScenario, tutorialMap, "tutorial");
        
        // 2. Muestra la pantalla del juego
        showScreen(domElements.gameContainer);
        if (domElements.tacticalUiContainer) {
            domElements.tacticalUiContainer.style.display = 'block';
        }
        
        // <<== MODIFICACIÓN: Inicializamos el estado del tutorial DESPUÉS ==>>
        // Esto asegura que la fase se establece correctamente.
        initializeTutorialState(); 
        
        // 3. Forzamos el estado inicial a 'deployment' para los primeros pasos.
        gameState.currentPhase = "deployment";
        
        // 4. Inicia la secuencia del tutorial
        TutorialManager.start(TUTORIAL_SCRIPTS.completo);
    //    });
    domElements.backToMainMenuBtn_fromCampaign.addEventListener('click', () => showScreen(domElements.mainMenuScreenEl)); 
    domElements.backToMainMenuBtn_fromSetup.addEventListener('click', () => showScreen(domElements.mainMenuScreenEl)); 
    domElements.closeScenarioBriefingBtnEl.addEventListener('click', closeScenarioBriefing);
    domElements.startScenarioBattleBtnEl.addEventListener('click', handleStartScenarioBattle);
}
// --- FIN DE FUNCIÓN: setupMainMenuListeners ---


// --- INICIO DE FUNCIÓN: renderWorldMap ---
function renderWorldMap() {
    if (!worldData || !domElements.territoryMarkerContainerEl) { // Usar domElements
        console.warn("CampaignManager - renderWorldMap: worldData o territoryMarkerContainerEl no listos.");
        return;
    }
    domElements.territoryMarkerContainerEl.innerHTML = ''; // Usar domElements
    for (const territoryId in worldData.territories) {
        const territory = worldData.territories[territoryId];
        const terrEl = document.createElement('div');
        terrEl.classList.add('territory-on-map');
        if (territory.position) {
            terrEl.style.left = territory.position.x + 'px';
            terrEl.style.top = territory.position.y + 'px';
        }
        terrEl.textContent = territory.displayName || territory.name.substring(0, 3);
        terrEl.title = territory.name;
        let ownerClass = 'neutral-territory';
        if (campaignState.conqueredTerritories.has(territoryId)) ownerClass = 'player-controlled';
        else if (territory.initialOwner?.startsWith('ai_')) ownerClass = `ai-controlled ai-owner-${territory.initialOwner}`;
        terrEl.classList.add(ownerClass);
        let canBeSelected = false;
        if (!campaignState.conqueredTerritories.has(territoryId)) {
            if (campaignState.conqueredTerritories.size === 0 && territoryId === worldData.playerStartTerritory) canBeSelected = true;
            else territory.adjacent?.forEach(adjId => { if (campaignState.conqueredTerritories.has(adjId)) canBeSelected = true; });
        }
        if (canBeSelected) {
            terrEl.classList.add('selectable-territory');
            terrEl.addEventListener('click', () => onTerritoryClick(territoryId));
        }
        domElements.territoryMarkerContainerEl.appendChild(terrEl); // Usar domElements
    }
}
// --- FIN DE FUNCIÓN: renderWorldMap ---


// --- INICIO DE FUNCIÓN: onTerritoryClick ---
function onTerritoryClick(territoryId) {
    campaignState.currentTerritoryIdForBattle = territoryId;
    if (!worldData || !worldData.territories[territoryId]) {
        console.error("CampaignManager - onTerritoryClick: No se encontraron datos para el territorio:", territoryId);
        return;
    }
    const territoryData = worldData.territories[territoryId];
    const scenarioDataKey = territoryData.scenarioFile;

    if (typeof GAME_DATA_REGISTRY === 'undefined' || !GAME_DATA_REGISTRY.scenarios) {
        console.error("CampaignManager Error: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.scenarios no está definido.");
        if (domElements.campaignMessagesEl) domElements.campaignMessagesEl.textContent = "Error crítico: Registro de escenarios no disponible."; // Usar domElements
        return;
    }
    const scenarioData = GAME_DATA_REGISTRY.scenarios[scenarioDataKey];

    if (typeof scenarioData === 'undefined') {
        console.error(`CampaignManager Error: Datos del escenario "${scenarioDataKey}" no encontrados EN EL REGISTRO.`);
        updateCampaignMessages(`Error al cargar datos para ${territoryData.name}. Clave: ${scenarioDataKey}`);
        campaignState.currentTerritoryIdForBattle = null;
        return;
    }
    campaignState.currentScenarioDataForBattle = scenarioData;

    // --- ¡CORRECCIÓN CLAVE AQUÍ! Acceder a los elementos a través de domElements ---
    if (domElements.scenarioTitleEl) domElements.scenarioTitleEl.textContent = scenarioData.displayName;
    if (domElements.scenarioDescriptionEl) domElements.scenarioDescriptionEl.textContent = scenarioData.description;
    if (domElements.scenarioImageEl) {
        domElements.scenarioImageEl.src = scenarioData.briefingImage || "";
        domElements.scenarioImageEl.style.display = (scenarioData.briefingImage && scenarioData.briefingImage !== "") ? 'block' : 'none';
    }
    if (domElements.scenarioBriefingModalEl) domElements.scenarioBriefingModalEl.style.display = 'flex';
    // --- FIN CORRECCIÓN CLAVE ---
}
// --- FIN DE FUNCIÓN: onTerritoryClick ---


// --- INICIO DE FUNCIÓN: closeScenarioBriefing ---
function closeScenarioBriefing() {
    if (domElements.scenarioBriefingModalEl) domElements.scenarioBriefingModalEl.style.display = 'none'; // Usar domElements
    campaignState.currentTerritoryIdForBattle = null;
    campaignState.currentScenarioDataForBattle = null;
    campaignState.currentMapTacticalDataForBattle = null;
}
// --- FIN DE FUNCIÓN: closeScenarioBriefing ---


// --- INICIO DE FUNCIÓN: handleStartScenarioBattle ---
function handleStartScenarioBattle() {
    if (!campaignState.currentTerritoryIdForBattle || !campaignState.currentScenarioDataForBattle) {
        console.error("CampaignManager: No hay datos válidos para iniciar batalla.");
        updateCampaignMessages("Error al iniciar batalla: Faltan datos.");
        return;
    }
    const scenarioData = campaignState.currentScenarioDataForBattle;
    const mapTacticalDataKey = scenarioData.mapFile;

    if (typeof GAME_DATA_REGISTRY === 'undefined' || !GAME_DATA_REGISTRY.maps) {
        console.error("CampaignManager Error: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.maps no está definido.");
        updateCampaignMessages(`Error crítico: Registro de mapas no disponible.`);
        return;
    }
    const mapTacticalData = GAME_DATA_REGISTRY.maps[mapTacticalDataKey];

    if (typeof mapTacticalData === 'undefined') {
        console.error(`CampaignManager Error: Datos del mapa táctico "${mapTacticalDataKey}" no encontrados EN EL REGISTRO.`);
        updateCampaignMessages(`No se pudo iniciar batalla: falta mapa "${mapTacticalDataKey}".`);
        return;
    }
    campaignState.currentMapTacticalDataForBattle = mapTacticalData;
    closeScenarioBriefing();
    showScreen(domElements.gameContainer);
    if (domElements.tacticalUiContainer) {
        domElements.tacticalUiContainer.style.display = 'block';
    }// Usar domElements

    if (typeof resetAndSetupTacticalGame === "function") { 
        resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignState.currentTerritoryIdForBattle);
    } else {
        console.error("CampaignManager Error: La función resetAndSetupTacticalGame no está definida.");
    }
}
// --- FIN DE FUNCIÓN: handleStartScenarioBattle ---


// --- INICIO DE FUNCIÓN: handleTacticalBattleResult ---
function handleTacticalBattleResult(playerWon, battleTerritoryId) {
    showScreen(domElements.worldMapScreenEl); // Usar domElements
    if (!worldData || !worldData.territories[battleTerritoryId]) {
        console.error("CampaignManager - handleTacticalBattleResult: Datos de territorio no encontrados:", battleTerritoryId);
        updateCampaignMessages("Error procesando resultado de batalla.");
        return;
    }
    const territoryName = worldData.territories[battleTerritoryId].name;
    if (playerWon) {
        campaignState.conqueredTerritories.add(battleTerritoryId);
        updateCampaignMessages(`¡${territoryName} ha sido conquistado!`);
        saveCampaignProgress();
        renderWorldMap();
        checkGlobalVictory();
    } else {
        updateCampaignMessages(`Derrota en ${territoryName}. El territorio sigue en manos enemigas.`);
    }
    campaignState.currentTerritoryIdForBattle = null;
    campaignState.currentScenarioDataForBattle = null;
    campaignState.currentMapTacticalDataForBattle = null;
}
// --- FIN DE FUNCIÓN: handleTacticalBattleResult ---


// --- INICIO DE FUNCIÓN: checkGlobalVictory ---
function checkGlobalVictory() {
    if (!worldData) return;
    const totalTerritoriesToConquer = Object.keys(worldData.territories).filter(id => {
        const territory = worldData.territories[id];
        return territory.initialOwner !== 'player';
    }).length;
    let playerOwnedNonStartTerritories = 0;
    campaignState.conqueredTerritories.forEach(id => {
        const terr = worldData.territories[id];
        if (terr && terr.initialOwner !== 'player') playerOwnedNonStartTerritories++;
    });
    const allPlayerStartTerritoriesConquered = worldData.playerStartTerritory ? campaignState.conqueredTerritories.has(worldData.playerStartTerritory) : true;
    if (totalTerritoriesToConquer > 0 && playerOwnedNonStartTerritories >= totalTerritoriesToConquer && allPlayerStartTerritoriesConquered) {
        updateCampaignMessages("¡VICTORIA GLOBAL! Has conquistado todos los territorios.");
        alert("¡FELICIDADES, HAS CONQUISTADO EL MUNDO!");
    } else if (totalTerritoriesToConquer === 0 && allPlayerStartTerritoriesConquered && Object.keys(worldData.territories).length > 0) {
         updateCampaignMessages("¡Todos los territorios ya son tuyos!");
         alert("¡Mapa de prueba completado!");
    }
}
// --- FIN DE FUNCIÓN: checkGlobalVictory ---


// --- INICIO DE FUNCIÓN: saveCampaignProgress ---
function saveCampaignProgress() {
    try {
        localStorage.setItem('hexEvolvedCampaignState', JSON.stringify({
            conqueredTerritories: Array.from(campaignState.conqueredTerritories)
        }));
    } catch (e) { console.error("CampaignManager: Error guardando progreso de campaña:", e); }
}
// --- FIN DE FUNCIÓN: saveCampaignProgress ---


// --- INICIO DE FUNCIÓN: loadCampaignProgress ---
function loadCampaignProgress() {
    const savedState = localStorage.getItem('hexEvolvedCampaignState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            campaignState.conqueredTerritories = new Set(parsedState.conqueredTerritories || []);
        } catch (e) {
            console.error("CampaignManager: Error parseando estado de campaña guardado:", e);
            campaignState.conqueredTerritories = new Set();
        }
    } else {
        campaignState.conqueredTerritories = new Set();
    }
}
// --- FIN DE FUNCIÓN: loadCampaignProgress ---


// --- INICIO DE FUNCIÓN: updateCampaignMessages ---
function updateCampaignMessages(message) {
    if (domElements.campaignMessagesEl) domElements.campaignMessagesEl.textContent = message; // Usar domElements
    else console.warn("CampaignManager: campaignMessagesEl no encontrado para mostrar mensaje:", message);
}
// --- FIN DE FUNCIÓN: updateCampaignMessages ---

// --- INICIALIZACIÓN DEL CAMPAIGN MANAGER ---
// El listener DOMContentLoaded aquí es principalmente para asegurar que este script
// se ejecuta después de que el DOM está listo, PERO la inicialización principal
// de listeners y la muestra de la primera pantalla ahora es orquestada por main.js -> initApp
document.addEventListener('DOMContentLoaded', () => {
    // Ya no llamamos a initializeDomElements() aquí.
    // Ya no llamamos a setupMainMenuListeners() ni showScreen() aquí directamente.
    // main.js -> initApp se encargará de llamar a setupMainMenuListeners()
    // y a showScreen(domElements.mainMenuScreenEl) después de que initializeDomElements() se haya completado.
});