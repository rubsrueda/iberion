// domElements.js
console.log("domElements.js: Script cargado. Variables declaradas, esperando DOMContentLoaded.");

// --- Declaración global explícita de domElements como 'var'. ---
var domElements = {}; 
// --- FIN CORRECCIÓN CRÍTICA ---

// --- Inicialización de propiedades a null para que siempre existan en el objeto ---
domElements.isPanning = false; 
domElements.boardInitialX = 0;
domElements.boardInitialY = 0;
domElements.panStartX = 0;     
domElements.panStartY = 0;     
domElements.currentBoardTranslateX = 0;
domElements.currentBoardTranslateY = 0;

domElements.settingsModal = null;
domElements.closeSettingsBtn = null;
domElements.saveSettingsBtn = null;
domElements.settingMusicToggle = null;
domElements.settingSfxToggle = null;
domElements.settingGoldConfirm = null;
domElements.settingHints = null;
domElements.resetHintsBtn = null;

domElements.domElementsInitialized = false; 

// --- Inicializar todas las propiedades a null ---
domElements.heroDetailModal = null; 
domElements.tacticalUiContainer = null;
domElements.unitManagementModal = null;
domElements.closeUnitManagementModalBtn = null;
domElements.unitManagementTitle = null;
domElements.unitCategoryTabs = null;
domElements.availableUnitsList = null;
domElements.divisionCompositionList = null;
domElements.divisionCostSummary = null;
domElements.divisionStatsSummary = null;
domElements.divisionRegimentCount = null;
domElements.cancelUnitManagementBtn = null;
domElements.finalizeUnitManagementBtn = null;
domElements.mainMenuScreenEl = null;
domElements.setupScreen = null; 
domElements.worldMapScreenEl = null;
domElements.gameContainer = null; 
domElements.welcomeHelpModalEl = null; 
domElements.startCampaignBtnEl = null;
domElements.barracksBtn = null;
domElements.startSkirmishBtnEl = null; 
domElements.startTutorialBtn = null;
domElements.floatingPillageBtn = null;
domElements.startGameBtn = null;
domElements.expandPanelBtn = null;
domElements.floatingRazeBtn = null;
domElements.floatingExploreRuinBtn = null;
domElements.floatingTradeBtn = null;
domElements.floatingStopTradeBtn = null;

// NUEVO: Botones de la pantalla de configuración y lobby
domElements.startLocalGameBtn = null;
domElements.createNetworkGameBtn = null;
domElements.joinNetworkGameBtn = null;
domElements.hostLobbyScreen = null;
domElements.barracksModal  = null;
domElements.shortGameCodeEl = null;
domElements.hostStatusEl = null;
domElements.hostPlayerListEl = null;
domElements.backToMainMenuBtn_fromHostLobby = null;

//Pantalla de Login: 
domElements.loginScreen = null;
domElements.usernameInput = null;
domElements.passwordInput = null;
domElements.loginBtn = null;
domElements.logoutBtn = null;
domElements.loginErrorMessage = null;
domElements.currentGeneralName = null;
domElements.player2NameDiv = null;  
domElements.player2NameInput = null; 
domElements.importProfileInput = null;
domElements.exportProfileBtn_float = null;
domElements.startIberiaMagnaBtn = null;

// Ranking general:
domElements.rankingModal = null;
domElements.rankingListContainer = null;
domElements.closeRankingBtn = null;

//pase de batalla: 
domElements.battlePassModal = null;
domElements.openBattlePassProfileBtn = null;

//barbaros
domElements.barbarianDensitySelect = null;

// Antiguo botón startGameBtn se renombra a startLocalGameBtn
domElements.player1TypeSelect = null;
domElements.player1AiLevelDiv = null;
domElements.player1AiLevelSelect = null;
domElements.player2TypeSelect = null;
domElements.resourceLevelSelect = null;
domElements.initialUnitsCountSelect = null;
domElements.backToMainMenuBtn_fromSetup = null;
domElements.boardSizeSelect = null;
domElements.worldMapImageEl = null;
domElements.territoryMarkerContainerEl = null;
domElements.campaignMessagesEl = null;
domElements.backToMainMenuBtn_fromCampaign = null;
domElements.scenarioBriefingModalEl = null;
domElements.scenarioTitleEl = null; 
domElements.scenarioImageEl = null; 
domElements.scenarioDescriptionEl = null;
domElements.startScenarioBattleBtnEl = null;
domElements.closeScenarioBriefingBtnEl = null;
domElements.gameBoard = null;
domElements.floatingMenuBtn = null;
domElements.floatingEndTurnBtn = null;
domElements.floatingMenuPanel = null;
domElements.contextualInfoPanel = null;
domElements.closeContextualPanelBtn = null;
domElements.gameMessagesMobile = null; 
domElements.floatingCreateDivisionBtn = null;
domElements.floatingTechTreeBtn = null;
domElements.closeTechTreeBtn = null; 
domElements.floatingConsoleBtn = null; 
domElements.createDivisionModal = null;
domElements.divisionNameInput = null;
domElements.availableRegimentsListEl = null;
domElements.currentDivisionRegimentsListEl = null;
domElements.totalDivisionCostDisplay = null;
domElements.totalDivisionStatsDisplay = null;
domElements.finalizeCreateDivisionBtn = null; 
domElements.floatingManageBtn = null;
domElements.unitDetailModal = null;
domElements.closeUnitDetailModalBtn = null;
domElements.unitDetailTitle = null;
domElements.unitDetailRegimentList = null;
domElements.buildStructureModal = null;
domElements.buildHexCoordsDisplay = null;
domElements.availableStructuresListModalEl = null;
domElements.confirmBuildBtn = null; 
domElements.splitUnitConfirmationModal = null; 
domElements.splitUnitNameDisplay_simple = null;
domElements.splitUnitCurrentRegiments_simple = null;
domElements.regimentsToSplitInput_simple = null;
domElements.splitMaxRegimentsAllowed_simple = null;
domElements.splitOriginalUnitRemainingRegiments_simple = null;
domElements.confirmSplitBtn_simple = null; 
domElements.cancelSplitBtn_simple = null; 
domElements.closeSplitConfirmationBtn_simple = null; 
domElements.advancedSplitUnitModal = null;
domElements.closeAdvancedSplitModalBtn = null;
domElements.advancedSplitUnitNameDisplay = null;
domElements.originalUnitRegimentCount = null;
domElements.originalUnitPreviewStats = null;
domElements.originalUnitPreviewHealth = null;
domElements.originalUnitRegimentsList = null;
domElements.newUnitRegimentCount = null;
domElements.newUnitPreviewStats = null;
domElements.newUnitPreviewHealth = null;
domElements.newUnitRegimentsList = null;
domElements.finalizeAdvancedSplitBtn = null; 
domElements.cancelAdvancedSplitBtn = null; 
domElements.floatingAssignGeneralBtn = null;
domElements.floatingUndoMoveBtn = null;
domElements.floatingNextUnitBtn = null;
domElements.floatingConsolidateBtn = null; 
domElements.floatingReinforceBtn = null;
domElements.floatingSplitBtn = null;
domElements.floatingBuildBtn = null;
domElements.createDivisionBtn = null; 
domElements.endTurnBtn = null;
domElements.saveGameBtn = null;
domElements.loadGameInput = null;
domElements.messagesDisplay = null;
domElements.closeWelcomeHelpBtn = null; 
domElements.welcomeHelpTitleEl = null;
domElements.welcomeHelpSectionsEl = null;
domElements.welcomeHelpFooterEl = null;
domElements.doNotShowAgainCheckbox = null;
domElements.startGameFromHelpBtn = null; 
domElements.setAsCapitalBtn = null;
domElements.player1Civ = null;
domElements.player2Civ = null;

// --- Banca ---
domElements.bankModal = null;
domElements.closeBankModalBtn = null;
domElements.bankOfferResourceSelect = null;
domElements.bankOfferAmountInput = null;
domElements.bankPlayerResourceAmount = null;
domElements.bankRequestResourceSelect = null;
domElements.bankRequestAmountInput = null;
domElements.bankConfirmTradeBtn = null;

domElements.floatingInboxBtn = null;
domElements.inboxModal = null;
domElements.toggleRightMenuBtn = null;

// Nuevas propiedades para el modal de detalles de unidad rediseñado
domElements.unitDetailTotalHealthBar = null;
domElements.unitDetailTotalHealthText = null;
domElements.unitDetailCombatStats = null;
domElements.unitDetailMovementStats = null;
domElements.unitDetailVisionStats = null;
domElements.unitDetailMorale = null;
domElements.unitDetailXP = null;
domElements.disbandUnitBtn = null;
domElements.floatingWikiBtn = null;
domElements.wikiModal = null;
domElements.closeWikiModalBtn = null;

// Variables para el control de Zoom
domElements.isPinching = false;
domElements.initialPinchDistance = 0;
domElements.currentBoardScale = 1;    

// Elementos para el Lobby LAN (Antiguos eliminados o re-purposed, esta es la lista limpia)
domElements.skirmishOptionsContainer = null;
domElements.techTreeScreen = null;

function initializeDomElements() {
    if (domElements.domElementsInitialized) return;
    console.log("domElements.js: Inicializando referencias a elementos DOM...");
    
    // --- Reseteo de propiedades de estado de UI (incluyendo las nuevas de zoom) ---
    domElements.isPanning = false;
    domElements.boardInitialX = 0;
    domElements.boardInitialY = 0;
    domElements.panStartX = 0;
    domElements.panStartY = 0;
    domElements.currentBoardTranslateX = 0;
    domElements.currentBoardTranslateY = 0;

    // <<== NUEVO: Inicialización de variables de estado para el zoom ==>>
    domElements.isPinching = false;
    domElements.initialPinchDistance = 0;
    domElements.currentBoardScale = 1;
    // <<== FIN DE LA MODIFICACIÓN ==>>

    domElements.domElementsInitialized = false;

    //configuración del sistema
    domElements.settingsModal = document.getElementById('settingsModal');
    domElements.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    domElements.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    domElements.settingMusicToggle = document.getElementById('settingMusicToggle');
    domElements.settingSfxToggle = document.getElementById('settingSfxToggle');
    domElements.settingGoldConfirm = document.getElementById('settingGoldConfirm');
    domElements.settingHints = document.getElementById('settingHints');
    domElements.resetHintsBtn = document.getElementById('resetHintsBtn');    

    // Ranking general:
    domElements.rankingModal = document.getElementById('rankingModal');
    domElements.rankingListContainer = document.getElementById('rankingListContainer');
    domElements.closeRankingBtn = document.getElementById('closeRankingBtn');

    //pase de batalla: 
    domElements.battlePassModal = document.getElementById('battlePassModal');
    domElements.openBattlePassProfileBtn = document.getElementById('openBattlePassProfileBtn');

    //Barbaros
    domElements.barbarianDensitySelect = document.getElementById('barbarianDensity');

    // --- Obtener referencias de elementos DOM ---
    domElements.setupScreen = document.getElementById('setupScreen'); 
    domElements.setupScreen2 = document.getElementById('setupScreen2');
    domElements.heroDetailModal = document.getElementById('heroDetailModal');
    domElements.tacticalUiContainer = document.getElementById('tactical-ui-container');
    domElements.welcomeHelpModalEl = document.getElementById('welcomeHelpModal');
    domElements.closeWelcomeHelpBtn = document.getElementById('closeWelcomeHelpBtn');
    domElements.welcomeHelpTitleEl = document.getElementById('welcomeHelpTitle');
    domElements.welcomeHelpSectionsEl = document.getElementById('welcomeHelpSections');
    domElements.welcomeHelpFooterEl = document.getElementById('welcomeHelpFooter');
    domElements.doNotShowAgainCheckbox = document.getElementById('doNotShowAgainCheckbox');
    domElements.startGameFromHelpBtn = document.getElementById('startGameFromHelpBtn');
    domElements.setAsCapitalBtn = document.getElementById('setAsCapitalBtn');
    domElements.floatingTechTreeBtn = document.getElementById('floatingTechTreeBtn');
    domElements.closeTechTreeBtn = document.getElementById('closeTechTreeBtn');
    domElements.loginScreen = document.getElementById('loginScreen');
    domElements.usernameInput = document.getElementById('usernameInput');
    domElements.passwordInput = document.getElementById('passwordInput');
    domElements.loginBtn = document.getElementById('loginBtn');
    domElements.logoutBtn = document.getElementById('logoutBtn');
    domElements.loginErrorMessage = document.getElementById('loginErrorMessage');
    domElements.currentGeneralName = document.getElementById('currentGeneralName');
    domElements.player2NameDiv = document.getElementById('player2NameDiv');        
    domElements.player2NameInput = document.getElementById('player2NameInput');   
    domElements.importProfileInput = document.getElementById('importProfileInput');
    domElements.exportProfileBtn_float = document.getElementById('exportProfileBtn_float');
    domElements.startIberiaMagnaBtn = document.getElementById('startIberiaMagnaBtn');
    domElements.floatingConsoleBtn = document.getElementById('floatingConsoleBtn'); 
    domElements.mainMenuScreenEl = document.getElementById('mainMenuScreen');
    domElements.setupScreen = document.getElementById('setupScreen');
    domElements.worldMapScreenEl = document.getElementById('worldMapScreen');
    domElements.gameContainer = document.querySelector('.game-container');
    //domElements.startCampaignBtnEl = document.getElementById('startCampaignBtn');
    //domElements.startSkirmishBtnEl = document.getElementById('startSkirmishBtn'); 
    //domElements.startTutorialBtn = document.getElementById('startTutorialBtn'); 
    domElements.barracksBtn = document.getElementById('barracksBtn');    
    domElements.expandPanelBtn = document.getElementById('expandPanelBtn');
    domElements.startGameBtn = document.getElementById('startGameBtn');
    domElements.startLocalGameBtn = document.getElementById('startLocalGameBtn');
    domElements.createNetworkGameBtn = document.getElementById('createNetworkGameBtn');
    domElements.joinNetworkGameBtn = document.getElementById('joinNetworkGameBtn');
    domElements.hostLobbyScreen = document.getElementById('hostLobbyScreen');
    domElements.barracksModal = document.getElementById('barracksModal');
    domElements.shortGameCodeEl = document.getElementById('short-game-code');
    domElements.hostStatusEl = document.getElementById('host-status');
    domElements.hostPlayerListEl = document.getElementById('host-player-list');
    domElements.backToMainMenuBtn_fromHostLobby = document.getElementById('backToMainMenuBtn_fromHostLobby');
    domElements.player1TypeSelect = document.getElementById('player1Type');
    domElements.player1Civ = document.getElementById('player1Civ');
    domElements.player2Civ = document.getElementById('player2Civ');
    domElements.player1AiLevelDiv = document.getElementById('player1AiLevelDiv');
    domElements.player1AiLevelSelect = document.getElementById('player1AiLevel');
    domElements.player2TypeSelect = document.getElementById('player2Type');
    domElements.resourceLevelSelect = document.getElementById('resourceLevel');
    domElements.initialUnitsCountSelect = document.getElementById('initialUnitsCount');
    domElements.boardSizeSelect = document.getElementById('boardSizeSelect');
    domElements.backToMainMenuBtn_fromSetup = document.getElementById('backToMainMenuBtn_fromSetup');
    domElements.worldMapImageEl = document.getElementById('worldMapImage');
    domElements.territoryMarkerContainerEl = document.getElementById('territoryMarkerContainer');
    domElements.campaignMessagesEl = document.getElementById('campaignMessages');
    domElements.backToMainMenuBtn_fromCampaign = document.getElementById('backToMainMenuBtn_fromCampaign');
    domElements.scenarioBriefingModalEl = document.getElementById('scenarioBriefingModal');
    domElements.scenarioTitleEl = document.getElementById('scenarioTitle');
    domElements.scenarioImageEl = document.getElementById('scenarioImage');
    domElements.scenarioDescriptionEl = document.getElementById('scenarioDescription');
    domElements.startScenarioBattleBtnEl = document.getElementById('startScenarioBattleBtn');
    domElements.closeScenarioBriefingBtnEl = document.getElementById('closeScenarioBriefingBtn'); 
    domElements.gameBoard = document.getElementById('gameBoard');
    domElements.floatingMenuBtn = document.getElementById('floatingMenuBtn');
    domElements.floatingEndTurnBtn = document.getElementById('floatingEndTurnBtn');
    domElements.floatingPillageBtn = document.getElementById('floatingPillageBtn');
    domElements.floatingRazeBtn = document.getElementById('floatingRazeBtn');
    domElements.unitManagementModal = document.getElementById('unitManagementModal');
    domElements.closeUnitManagementModalBtn = document.getElementById('closeUnitManagementModalBtn');
    domElements.unitManagementTitle = document.getElementById('unitManagementTitle');
    domElements.unitCategoryTabs = document.getElementById('unitCategoryTabs');
    domElements.availableUnitsList = document.getElementById('availableUnitsList');
    domElements.divisionCompositionList = document.getElementById('divisionCompositionList');
    domElements.divisionCostSummary = document.getElementById('divisionCostSummary');
    domElements.divisionStatsSummary = document.getElementById('divisionStatsSummary');
    domElements.divisionRegimentCount = document.getElementById('divisionRegimentCount');
    domElements.cancelUnitManagementBtn = document.getElementById('cancelUnitManagementBtn');
    domElements.finalizeUnitManagementBtn = document.getElementById('finalizeUnitManagementBtn');
    console.log("--- LOG INIT --- domElements.js: floatingEndTurnBtn inicializado:", domElements.floatingEndTurnBtn);
    domElements.floatingMenuPanel = document.getElementById('floatingMenuPanel')
        || document.getElementById('top-bar-menu');
    domElements.contextualInfoPanel = document.getElementById('contextualInfoPanel');
    domElements.closeContextualPanelBtn = document.getElementById('closeContextualPanelBtn');
    domElements.gameMessagesMobile = document.getElementById('gameMessagesMobile');
    domElements.floatingMenuTitle = document.getElementById('floatingMenuTitle');
    domElements.floatingCreateDivisionBtn = document.getElementById('floatingCreateDivisionBtn');
    domElements.concedeBattleBtn_float = document.getElementById('concedeBattleBtn_float');
    domElements.saveGameBtn_float = document.getElementById('saveGameBtn_float');
    domElements.loadGameInput_float = document.getElementById('loadGameInput_float');
    domElements.backToMainFromBattleBtn = document.getElementById('backToMainFromBattleBtn');
    domElements.contextualTitle = document.getElementById('contextualTitle');
    domElements.contextualContent = document.getElementById('contextualContent');
    domElements.contextualActions = document.getElementById('contextualActions');
    
    // Inicialización de modales específicos (normales)
    domElements.createDivisionModal = document.getElementById('createDivisionModal');
    domElements.divisionNameInput = document.getElementById('divisionNameInput');
    domElements.availableRegimentsListEl = document.getElementById('availableRegimentsList');
    domElements.currentDivisionRegimentsListEl = document.getElementById('currentDivisionRegimentsList');
    domElements.totalDivisionCostDisplay = document.getElementById('totalDivisionCostDisplay');
    domElements.totalDivisionStatsDisplay = document.getElementById('totalDivisionStatsDisplay');
    domElements.finalizeCreateDivisionBtn = document.getElementById('finalizeCreateDivisionBtn'); 
    domElements.floatingExploreRuinBtn = document.getElementById('floatingExploreRuinBtn');
    domElements.buildStructureModal = document.getElementById('buildStructureModal');
    domElements.buildHexCoordsDisplay = document.getElementById('buildHexCoordsDisplay');
    domElements.availableStructuresListModalEl = document.getElementById('availableStructuresList');
    domElements.confirmBuildBtn = document.getElementById('confirmBuildBtn'); 
    domElements.floatingTradeBtn = document.getElementById('floatingTradeBtn');
    domElements.floatingStopTradeBtn = document.getElementById('floatingStopTradeBtn');

    // Inicialización de elementos del Modal de Confirmación de División SIMPLE (antiguo)
    domElements.splitUnitConfirmationModal = document.getElementById('splitUnitConfirmationModal');
    domElements.splitUnitNameDisplay_simple = document.getElementById('splitUnitNameDisplay_simple');
    domElements.splitUnitCurrentRegiments_simple = document.getElementById('splitUnitCurrentRegiments_simple');
    domElements.regimentsToSplitInput_simple = document.getElementById('regimentsToSplitInput_simple');
    domElements.splitMaxRegimentsAllowed_simple = document.getElementById('splitMaxRegimentsAllowed_simple');
    domElements.splitOriginalUnitRemainingRegiments_simple = document.getElementById('splitOriginalUnitRemainingRegiments_simple');
    domElements.confirmSplitBtn_simple = document.getElementById('confirmSplitBtn_simple'); 
    domElements.cancelSplitBtn_simple = document.getElementById('cancelSplitBtn_simple'); 
    domElements.closeSplitConfirmationBtn_simple = document.getElementById('closeSplitConfirmationBtn_simple');

    // Inicialización de elementos del Modal de Confirmación de División AVANZADO
    domElements.advancedSplitUnitModal = document.getElementById('advancedSplitUnitModal');
    domElements.closeAdvancedSplitModalBtn = document.getElementById('closeAdvancedSplitModalBtn');
    domElements.advancedSplitUnitNameDisplay = document.getElementById('advancedSplitUnitNameDisplay');
    domElements.originalUnitRegimentCount = document.getElementById('originalUnitRegimentCount');
    domElements.originalUnitPreviewStats = document.getElementById('originalUnitPreviewStats');
    domElements.originalUnitPreviewHealth = document.getElementById('originalUnitPreviewHealth');
    domElements.originalUnitRegimentsList = document.getElementById('originalUnitRegimentsList');
    domElements.newUnitRegimentCount = document.getElementById('newUnitRegimentCount');
    domElements.newUnitPreviewStats = document.getElementById('newUnitPreviewStats');
    domElements.newUnitPreviewHealth = document.getElementById('newUnitPreviewHealth');
    domElements.newUnitRegimentsList = document.getElementById('newUnitRegimentsList');
    domElements.finalizeAdvancedSplitBtn = document.getElementById('finalizeAdvancedSplitBtn'); 
    domElements.cancelAdvancedSplitBtn = document.getElementById('cancelAdvancedSplitBtn'); 
    
    // Elementos del Modal de detalle de división (REDISEÑADO)
    domElements.unitDetailModal = document.getElementById('unitDetailModal');
    domElements.closeUnitDetailModalBtn = document.getElementById('closeUnitDetailModalBtn');
    domElements.unitDetailTitle = document.getElementById('unitDetailTitle');
    domElements.unitDetailRegimentList = document.getElementById('unitDetailRegimentList');
    domElements.unitDetailTotalHealthBar = document.getElementById('unitDetailTotalHealthBar');
    domElements.unitDetailTotalHealthText = document.getElementById('unitDetailTotalHealthText');
    domElements.unitDetailCombatStats = document.getElementById('unitDetailCombatStats');
    domElements.unitDetailMovementStats = document.getElementById('unitDetailMovementStats');
    domElements.unitDetailVisionStats = document.getElementById('unitDetailVisionStats');
    domElements.unitDetailMorale = document.getElementById('unitDetailMorale');
    domElements.unitDetailXP = document.getElementById('unitDetailXP');
    domElements.disbandUnitBtn = document.getElementById('disbandUnitBtn');

    // --- Banca ---
    domElements.bankModal = document.getElementById('bankModal');
    domElements.closeBankModalBtn = document.getElementById('closeBankModalBtn');
    domElements.bankOfferResourceSelect = document.getElementById('bankOfferResourceSelect');
    domElements.bankOfferAmountInput = document.getElementById('bankOfferAmountInput');
    domElements.bankPlayerResourceAmount = document.getElementById('bankPlayerResourceAmount');
    domElements.bankRequestResourceSelect = document.getElementById('bankRequestResourceSelect');
    domElements.bankRequestAmountInput = document.getElementById('bankRequestAmountInput');
    domElements.bankConfirmTradeBtn = document.getElementById('bankConfirmTradeBtn');

    //botones de acción flotantes
    domElements.floatingAssignGeneralBtn = document.getElementById('floatingAssignGeneralBtn'); // <<== Botón Asignar General    
    domElements.floatingUndoMoveBtn = document.getElementById('floatingUndoMoveBtn');
    domElements.floatingNextUnitBtn = document.getElementById('floatingNextUnitBtn');
    domElements.floatingConsolidateBtn = document.getElementById('floatingConsolidateBtn');
    domElements.floatingReinforceBtn = document.getElementById('floatingReinforceBtn');
    domElements.floatingSplitBtn = document.getElementById('floatingSplitBtn');
    domElements.floatingBuildBtn = document.getElementById('floatingBuildBtn');
    domElements.toggleRightMenuBtn = document.getElementById('toggle-right-menu-btn');
    
    
    // Asignaciones a variables más generales o de conveniencia (compatibilidad)
    domElements.endTurnBtn = domElements.floatingEndTurnBtn;
    domElements.saveGameBtn = domElements.saveGameBtn_float;
    domElements.loadGameInput = domElements.loadGameInput_float;
    domElements.messagesDisplay = domElements.gameMessagesMobile ? domElements.gameMessagesMobile.querySelector('p') : null;
    domElements.createDivisionBtn = domElements.floatingCreateDivisionBtn;
    domElements.floatingWikiBtn = document.getElementById('floatingWikiBtn');
    domElements.wikiModal = document.getElementById('wikiModal');
    domElements.closeWikiModalBtn = document.getElementById('closeWikiModalBtn');
    domElements.floatingInboxBtn = document.getElementById('floatingInboxBtn');
    domElements.inboxModal = document.getElementById('inboxModal');
    
    if (!domElements.divisionNameInput) { domElements.divisionNameInput = document.getElementById('divisionNameInput'); } // <<< CORRECCIÓN APLICADA AQUÍ
    
    domElements.techTreeScreen = document.getElementById('techTreeScreen');
    if (!domElements.welcomeHelpModalEl) console.error("DOM CRIT: welcomeHelpModalEl NO ENCONTRADO");
    if (!domElements.closeTechTreeBtn) console.error("DOM CRIT: closeTechTreeBtn NO ENCONTRADO. Verifica index.html.");
    else console.log("DOM OK: closeTechTreeBtn encontrado.");

    if (!domElements.welcomeHelpTitleEl) console.error("DOM CRIT: welcomeHelpTitleEl NO ENCONTRADO");
    if (!domElements.welcomeHelpSectionsEl) console.error("DOM CRIT: welcomeHelpSectionsEl NO ENCONTRADO");
    if (!domElements.welcomeHelpFooterEl) console.error("DOM CRIT: welcomeHelpFooterEl NO ENCONTRADO");
    if (!domElements.doNotShowAgainCheckbox) console.error("DOM CRIT: doNotShowAgainCheckbox NO ENCONTRADO");
    if (!domElements.startGameFromHelpBtn) console.error("DOM CRIT: startGameFromHelpBtn NO ENCONTRADO");

    if (!domElements.floatingTechTreeBtn) console.error("DOM CRIT: floatingTechTreeBtn NO ENCONTRADO");
    if (!domElements.floatingConsoleBtn) console.error("DOM CRIT: floatingConsoleBtn NO ENCONTRADO"); 
    if (!domElements.mainMenuScreenEl) console.error("DOM CRIT: mainMenuScreenEl NO ENCONTRADO");
    if (!domElements.setupScreen) console.error("DOM CRIT: setupScreen NO ENCONTRADO");
    if (!domElements.worldMapScreenEl) console.error("DOM CRIT: worldMapScreenEl NO ENCONTRADO");
    if (!domElements.gameContainer) console.error("DOM CRIT: gameContainer (clase '.game-container') NO ENCONTRADO. ¿El juego táctico está en el HTML?");
    //if (!domElements.startCampaignBtnEl) console.error("DOM CRIT: startCampaignBtnEl NO ENCONTRADO");
    //if (!domElements.startSkirmishBtnEl) console.error("DOM CRIT: startSkirmishBtnEl (ID: 'startSkirmishBtn') NO ENCONTRADO. Verifica index.html."); 
    //else console.log("DOM OK: startSkirmishBtnEl encontrado.");

    //if (!domElements.startTutorialBtn) console.error("DOM CRIT: startTutorialBtn NO ENCONTRADO"); 
    
    domElements.domElementsInitialized = true;
    console.log("domElements.js: Referencias a elementos DOM completamente inicializadas.");
     console.log("domElements object:", domElements);
}

document.addEventListener('DOMContentLoaded', initializeDomElements);