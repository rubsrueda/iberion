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

const CampaignHub = {
    _modalId: 'campaignHubModal',
    _selectedTab: 'official',
    _campaigns: {
        official: [],
        own: [],
        public: []
    },
    _selectedCampaign: null,
    _progressStorageKey: 'hexEvolvedCampaignProgressV2',

    _loadProgress() {
        try {
            const raw = localStorage.getItem(this._progressStorageKey);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('[CampaignHub] Progreso invalido, reiniciando.', error);
            return {};
        }
    },

    _saveProgress(progress) {
        try {
            localStorage.setItem(this._progressStorageKey, JSON.stringify(progress));
        } catch (error) {
            console.error('[CampaignHub] No se pudo guardar progreso:', error);
        }
    },

    markScenarioCompleted(campaignId, scenarioOrder) {
        if (!campaignId || !Number.isInteger(scenarioOrder)) return;
        const progress = this._loadProgress();
        if (!progress[campaignId]) {
            progress[campaignId] = { completedOrders: [], lastPlayedOrder: null, modified_at: Date.now() };
        }
        const completed = new Set(progress[campaignId].completedOrders || []);
        completed.add(scenarioOrder);
        progress[campaignId].completedOrders = Array.from(completed).sort((a, b) => a - b);
        progress[campaignId].lastPlayedOrder = scenarioOrder;
        progress[campaignId].modified_at = Date.now();
        this._saveProgress(progress);
    },

    _getCampaignProgress(campaignId) {
        const progress = this._loadProgress();
        return progress[campaignId] || { completedOrders: [], lastPlayedOrder: null };
    },

    _closeModal() {
        const modal = document.getElementById(this._modalId);
        if (modal) modal.remove();
    },

    _normalizeCampaignFromSupabase(row, sourceType) {
        const payload = row?.campaign_data;
        if (!payload || !Array.isArray(payload.scenarios)) return null;
        return {
            id: `${sourceType}:${row.id}`,
            sourceType,
            title: payload.meta?.title || row.title || 'Campaña sin titulo',
            description: payload.meta?.description || row.description || '',
            scenarios: payload.scenarios,
            raw: payload
        };
    },

    _buildOfficialCampaignFromWorldMap() {
        if (typeof WORLD_MAP_DATA === 'undefined' || !WORLD_MAP_DATA?.territories) return null;

        const scenarios = Object.entries(WORLD_MAP_DATA.territories)
            .map(([territoryId, territory], index) => ({
                order: index + 1,
                scenarioId: territory.displayName || territory.name || territoryId,
                registryScenarioKey: territory.scenarioFile,
                sourceTerritoryId: territoryId
            }))
            .filter(s => !!s.registryScenarioKey);

        if (scenarios.length === 0) return null;

        return {
            id: 'official:world_map_default',
            sourceType: 'official',
            title: WORLD_MAP_DATA.displayName || 'Campaña Oficial',
            description: WORLD_MAP_DATA.description || 'Campaña oficial basada en el mapa mundial.',
            scenarios,
            raw: null
        };
    },

    async _loadCampaignGroups() {
        this._campaigns = { official: [], own: [], public: [] };

        const officialFromWorldMap = this._buildOfficialCampaignFromWorldMap();
        if (officialFromWorldMap) this._campaigns.official.push(officialFromWorldMap);

        if (typeof GAME_DATA_REGISTRY !== 'undefined' && GAME_DATA_REGISTRY.campaigns) {
            Object.entries(GAME_DATA_REGISTRY.campaigns).forEach(([key, campaign]) => {
                if (!Array.isArray(campaign?.scenarios)) return;
                this._campaigns.official.push({
                    id: `official:${key}`,
                    sourceType: 'official',
                    title: campaign.meta?.title || campaign.title || key,
                    description: campaign.meta?.description || campaign.description || '',
                    scenarios: campaign.scenarios,
                    raw: campaign
                });
            });
        }

        if (typeof CampaignStorage !== 'undefined' && CampaignStorage.listLocalCampaigns && CampaignStorage.loadFromLocalStorage) {
            (CampaignStorage.listLocalCampaigns() || []).forEach(item => {
                const payload = CampaignStorage.loadFromLocalStorage(item.id);
                if (!payload || !Array.isArray(payload.scenarios)) return;
                this._campaigns.own.push({
                    id: `own-local:${item.id}`,
                    sourceType: 'own-local',
                    title: payload.meta?.title || item.title || 'Campaña local',
                    description: payload.meta?.description || '',
                    scenarios: payload.scenarios,
                    raw: payload
                });
            });
        }

        if (typeof CampaignStorage !== 'undefined' && CampaignStorage.loadUserCampaigns) {
            try {
                const rows = await CampaignStorage.loadUserCampaigns();
                (rows || []).forEach(row => {
                    const normalized = this._normalizeCampaignFromSupabase(row, 'own-cloud');
                    if (normalized) this._campaigns.own.push(normalized);
                });
            } catch (error) {
                console.warn('[CampaignHub] No se pudieron cargar campañas propias en nube:', error);
            }
        }

        if (typeof CampaignStorage !== 'undefined' && CampaignStorage.searchPublicCampaigns) {
            try {
                const rows = await CampaignStorage.searchPublicCampaigns('');
                (rows || []).forEach(row => {
                    const normalized = this._normalizeCampaignFromSupabase(row, 'public');
                    if (normalized) this._campaigns.public.push(normalized);
                });
            } catch (error) {
                console.warn('[CampaignHub] No se pudieron cargar campañas publicas:', error);
            }
        }
    },

    _getTabLabel(tab) {
        if (tab === 'official') return 'Oficiales';
        if (tab === 'own') return 'Propias';
        return 'Publicas';
    },

    _renderCampaignList(container) {
        container.innerHTML = '';
        const campaigns = this._campaigns[this._selectedTab] || [];
        if (!campaigns.length) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 14px; border: 1px dashed rgba(157,194,212,0.5); border-radius: 8px; color: #9dc2d4;';
            empty.textContent = 'No hay campañas en esta categoria.';
            container.appendChild(empty);
            return;
        }

        campaigns.forEach(campaign => {
            const progress = this._getCampaignProgress(campaign.id);
            const completedCount = (progress.completedOrders || []).length;
            const total = campaign.scenarios.length;

            const card = document.createElement('div');
            card.style.cssText = 'border: 1px solid rgba(0,243,255,0.25); border-radius: 10px; padding: 12px; background: rgba(8,18,26,0.75);';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div style="min-width:0;">
                        <div style="color:#dff9ff; font-weight:700;">${campaign.title}</div>
                        <div style="color:#9dc2d4; font-size:0.88em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${campaign.description || 'Sin descripcion'}</div>
                    </div>
                    <div style="color:#6ed8ff; font-size:0.86em;">${completedCount}/${total}</div>
                </div>
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button data-act="continue" style="flex:1; padding:8px; border:none; border-radius:6px; background:#198754; color:white; cursor:pointer;">Continuar</button>
                    <button data-act="choose" style="flex:1; padding:8px; border:none; border-radius:6px; background:#0d6efd; color:white; cursor:pointer;">Elegir escenario</button>
                </div>
            `;

            const continueBtn = card.querySelector('button[data-act="continue"]');
            const chooseBtn = card.querySelector('button[data-act="choose"]');

            continueBtn.addEventListener('click', () => this._continueCampaign(campaign));
            chooseBtn.addEventListener('click', () => this._openScenarioSelector(campaign));

            container.appendChild(card);
        });
    },

    _getScenarioOrder(entry, index) {
        return Number.isInteger(entry?.order) ? entry.order : (index + 1);
    },

    _continueCampaign(campaign) {
        const progress = this._getCampaignProgress(campaign.id);
        const completed = new Set(progress.completedOrders || []);
        const sorted = [...campaign.scenarios].sort((a, b) => this._getScenarioOrder(a, 0) - this._getScenarioOrder(b, 0));
        const next = sorted.find((s, idx) => !completed.has(this._getScenarioOrder(s, idx))) || sorted[0];
        this._launchScenario(campaign, next, sorted.indexOf(next));
    },

    _openScenarioSelector(campaign) {
        this._selectedCampaign = campaign;
        const existing = document.getElementById('campaignHubScenarioPicker');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'campaignHubScenarioPicker';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 10645; display:flex; align-items:center; justify-content:center; padding:16px;';

        const panel = document.createElement('div');
        panel.style.cssText = 'width:min(760px,96vw); max-height:84vh; overflow:auto; background:#112433; border:2px solid #00f3ff; border-radius:10px; padding:14px;';

        const progress = this._getCampaignProgress(campaign.id);
        const completed = new Set(progress.completedOrders || []);
        const maxUnlockedOrder = Math.max(1, completed.size + 1);

        const title = document.createElement('div');
        title.style.cssText = 'color:#00f3ff; font-weight:700; margin-bottom:10px;';
        title.textContent = `Escenarios: ${campaign.title}`;
        panel.appendChild(title);

        (campaign.scenarios || []).forEach((entry, idx) => {
            const order = this._getScenarioOrder(entry, idx);
            const isCompleted = completed.has(order);
            const isUnlocked = isCompleted || order <= maxUnlockedOrder;
            const label = entry?.scenarioData?.meta?.name || entry?.scenarioId || `Escenario ${order}`;

            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:10px; border:1px solid rgba(0,243,255,0.25); border-radius:8px; padding:10px; margin-bottom:8px; background:rgba(8,18,26,0.8);';

            const status = isCompleted ? 'Completado' : (isUnlocked ? 'Disponible' : 'Bloqueado');
            row.innerHTML = `<div><div style="color:#dff9ff;font-weight:600;">${order}. ${label}</div><div style="color:#9dc2d4;font-size:0.86em;">${status}</div></div>`;

            const playBtn = document.createElement('button');
            playBtn.textContent = isCompleted ? 'Jugar de nuevo' : 'Jugar';
            playBtn.disabled = !isUnlocked;
            playBtn.style.cssText = `padding:8px 12px; border:none; border-radius:6px; color:#fff; font-weight:600; cursor:${isUnlocked ? 'pointer' : 'not-allowed'}; background:${isUnlocked ? '#0d6efd' : '#5a6b78'};`;
            playBtn.addEventListener('click', () => this._launchScenario(campaign, entry, idx));

            row.appendChild(playBtn);
            panel.appendChild(row);
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cerrar';
        closeBtn.style.cssText = 'margin-top:8px; padding:9px 12px; border:none; border-radius:6px; background:#6c757d; color:white; cursor:pointer;';
        closeBtn.addEventListener('click', () => overlay.remove());
        panel.appendChild(closeBtn);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    },

    async _launchScenario(campaign, entry, idx) {
        const scenarioOrder = this._getScenarioOrder(entry, idx);
        const territoryId = `hub:${campaign.id}:${scenarioOrder}`;

        let scenarioData = null;
        let mapData = null;

        if (entry?.registryScenarioKey && typeof GAME_DATA_REGISTRY !== 'undefined') {
            scenarioData = GAME_DATA_REGISTRY.scenarios?.[entry.registryScenarioKey] || null;
            mapData = scenarioData?.mapFile ? GAME_DATA_REGISTRY.maps?.[scenarioData.mapFile] : null;
        }

        if (!scenarioData && entry?.scenarioData?.mapFile && typeof GAME_DATA_REGISTRY !== 'undefined') {
            scenarioData = entry.scenarioData;
            mapData = GAME_DATA_REGISTRY.maps?.[entry.scenarioData.mapFile] || null;
        }

        try {
            this._closeModal();
            const scenarioPicker = document.getElementById('campaignHubScenarioPicker');
            if (scenarioPicker) scenarioPicker.remove();

            if (scenarioData && mapData && typeof resetAndSetupTacticalGame === 'function') {
                showScreen(domElements.gameContainer);
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
                await resetAndSetupTacticalGame(scenarioData, mapData, territoryId);
                gameState.currentCampaignId = campaign.id;
                gameState.currentCampaignScenarioOrder = scenarioOrder;
                return;
            }

            if (entry?.scenarioData?.settings && entry?.scenarioData?.boardData && typeof EditorSerializer !== 'undefined') {
                showScreen(domElements.gameContainer);
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
                EditorSerializer.importScenario(entry.scenarioData);
                EditorSerializer.prepareScenarioForPlay(entry.scenarioData);
                gameState.isCampaignBattle = true;
                gameState.currentCampaignTerritoryId = territoryId;
                gameState.currentCampaignId = campaign.id;
                gameState.currentCampaignScenarioOrder = scenarioOrder;
                gameState.currentScenarioData = {
                    displayName: entry?.scenarioData?.meta?.name || entry?.scenarioId || `Escenario ${scenarioOrder}`
                };
                if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
                    UIManager.updateAllUIDisplays();
                }
                return;
            }

            alert('No se pudo iniciar este escenario. Formato no compatible o faltan datos.');
        } catch (error) {
            console.error('[CampaignHub] Error iniciando escenario:', error);
            alert('Error al iniciar escenario de campaña. Revisa la consola para mas detalles.');
        }
    },

    async open() {
        this._closeModal();
        await this._loadCampaignGroups();

        const modal = document.createElement('div');
        modal.id = this._modalId;
        modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 10640; display:flex; align-items:center; justify-content:center; padding:16px;';

        const panel = document.createElement('div');
        panel.style.cssText = 'width:min(920px,96vw); max-height:88vh; background:#112433; border:2px solid #00f3ff; border-radius:10px; display:flex; flex-direction:column; overflow:hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'padding:12px 14px; border-bottom:1px solid rgba(0,243,255,0.35); color:#00f3ff; font-weight:700; display:flex; justify-content:space-between; align-items:center;';
        header.innerHTML = '<span>Campañas</span>';

        const close = document.createElement('button');
        close.textContent = 'Cerrar';
        close.style.cssText = 'padding:7px 10px; border:none; border-radius:6px; background:#6c757d; color:#fff; cursor:pointer;';
        close.addEventListener('click', () => this._closeModal());
        header.appendChild(close);

        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex; gap:8px; padding:10px 12px; border-bottom:1px solid rgba(0,243,255,0.2);';
        ['official', 'own', 'public'].forEach(tab => {
            const btn = document.createElement('button');
            btn.textContent = this._getTabLabel(tab);
            btn.style.cssText = `padding:8px 12px; border:none; border-radius:6px; cursor:pointer; color:#fff; background:${this._selectedTab === tab ? '#0d6efd' : '#44515d'};`;
            btn.addEventListener('click', () => {
                this._selectedTab = tab;
                this.open();
            });
            tabs.appendChild(btn);
        });

        const body = document.createElement('div');
        body.style.cssText = 'padding:12px; overflow-y:auto; display:grid; gap:10px;';
        this._renderCampaignList(body);

        panel.appendChild(header);
        panel.appendChild(tabs);
        panel.appendChild(body);
        modal.appendChild(panel);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this._closeModal();
        });

        document.body.appendChild(modal);
    }
};

window.CampaignHub = CampaignHub;

/**
 * Selecciona el tutorial appropriado según el gameMode
 * Delegado a TutorialManager.selectTutorialByGameMode()
 */
function getTutorialForGameMode(gameMode) {
    return TutorialManager.selectTutorialByGameMode(gameMode);
}

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
    
    // Seleccionar mapa basado en gameMode
    if (gameState.gameMode === 'invasion' && typeof initializeNewGameBoardDOMAndData === 'function') {
        // Mapa archipiélago para tutorial de invasión
        console.log('[CampaignManager] Tutorial: Generando mapa de invasión archipiélago...');
        initializeNewGameBoardDOMAndData('min', 'small', true, 'invasion');
    } else {
        // Mapa tutorial clásico para tutorial normal
        console.log('[CampaignManager] Tutorial: Generando mapa tutorial clásico...');
        const tutorialScenario = GAME_DATA_REGISTRY.scenarios["TUTORIAL_SCENARIO"];
        const tutorialMap = GAME_DATA_REGISTRY.maps[tutorialScenario.mapFile];
        resetAndSetupTacticalGame(tutorialScenario, tutorialMap, "tutorial");
    }
        
    // 2. Muestra la pantalla del juego
    showScreen(domElements.gameContainer);
    if (domElements.tacticalUiContainer) {
        domElements.tacticalUiContainer.style.display = 'block';
    }
    
    // <<== MODIFICACIÓN: Inicializamos el estado del tutorial DESPUÉS ==>>
    // Esto asegura que la fase se establece correctamente.
    initializeTutorialState(); 
    
    // 3. Forzamos el estado inicial a 'play' para los primeros pasos.
    gameState.currentPhase = "play";
    
    // 4. Inicia la secuencia del tutorial apropriada según el modo de juego
    const selectedTutorial = getTutorialForGameMode(gameState.gameMode);
    TutorialManager.start(selectedTutorial);
    
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

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const getHistoricalValue = (key) => {
        if (scenarioData.meta && scenarioData.meta[key]) return scenarioData.meta[key];
        if (scenarioData[key]) return scenarioData[key];
        return '';
    };

    const historicalData = {
        title: getHistoricalValue('historicalTitle'),
        period: getHistoricalValue('historicalPeriod'),
        date: getHistoricalValue('historicalDate'),
        location: getHistoricalValue('historicalLocation'),
        sides: getHistoricalValue('historicalSides'),
        context: getHistoricalValue('historicalContext'),
        objectives: getHistoricalValue('historicalObjectives'),
        sources: getHistoricalValue('historicalSources')
    };

    // --- ¡CORRECCIÓN CLAVE AQUÍ! Acceder a los elementos a través de domElements ---
    if (domElements.scenarioTitleEl) domElements.scenarioTitleEl.textContent = scenarioData.displayName;
    if (domElements.scenarioDescriptionEl) domElements.scenarioDescriptionEl.textContent = scenarioData.description;
    if (domElements.scenarioHistoricalMetaEl) {
        const hasHistoricalData = Object.values(historicalData).some(value => String(value || '').trim() !== '');
        if (hasHistoricalData) {
            const rows = [];
            if (historicalData.title) rows.push(`<div><strong>Referencia histórica:</strong> ${escapeHtml(historicalData.title)}</div>`);
            if (historicalData.period) rows.push(`<div><strong>Periodo:</strong> ${escapeHtml(historicalData.period)}</div>`);
            if (historicalData.date) rows.push(`<div><strong>Fecha:</strong> ${escapeHtml(historicalData.date)}</div>`);
            if (historicalData.location) rows.push(`<div><strong>Ubicación:</strong> ${escapeHtml(historicalData.location)}</div>`);
            if (historicalData.sides) rows.push(`<div><strong>Bandos:</strong> ${escapeHtml(historicalData.sides)}</div>`);
            if (historicalData.context) rows.push(`<div style="margin-top:6px;"><strong>Contexto:</strong><br>${escapeHtml(historicalData.context).replace(/\n/g, '<br>')}</div>`);
            if (historicalData.objectives) rows.push(`<div style="margin-top:6px;"><strong>Objetivos:</strong><br>${escapeHtml(historicalData.objectives).replace(/\n/g, '<br>')}</div>`);
            if (historicalData.sources) rows.push(`<div style="margin-top:6px;"><strong>Fuentes:</strong><br>${escapeHtml(historicalData.sources).replace(/\n/g, '<br>')}</div>`);

            domElements.scenarioHistoricalMetaEl.innerHTML = rows.join('');
            domElements.scenarioHistoricalMetaEl.style.display = 'block';
        } else {
            domElements.scenarioHistoricalMetaEl.innerHTML = '';
            domElements.scenarioHistoricalMetaEl.style.display = 'none';
        }
    }
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
    if (typeof battleTerritoryId === 'string' && battleTerritoryId.startsWith('hub:')) {
        const campaignId = gameState.currentCampaignId;
        const scenarioOrder = Number(gameState.currentCampaignScenarioOrder);

        showScreen(domElements.mainMenuScreenEl);

        if (playerWon && campaignId && Number.isInteger(scenarioOrder) && typeof CampaignHub !== 'undefined') {
            CampaignHub.markScenarioCompleted(campaignId, scenarioOrder);
            if (typeof showToast === 'function') {
                showToast('Escenario completado. Progreso de campaña actualizado.', 'success');
            }
        }

        campaignState.currentTerritoryIdForBattle = null;
        campaignState.currentScenarioDataForBattle = null;
        campaignState.currentMapTacticalDataForBattle = null;
        return;
    }

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
