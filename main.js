// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
   
    // --- GUARDIÁN DE TURNO LÓGICO ---
    // Este bloque es el primero que se ejecuta. Si es una partida en red
    // y no es tu turno, muestra un mensaje y detiene toda la función.
    // Esto impide que el jugador inactivo pueda realizar CUALQUIER acción.
    // La nueva lógica
    const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

    // Si NO es mi turno, pero ESTOY EN UNA PARTIDA DE RED, me bloqueo a MÍ MISMO.
    if (!isMyTurn && isNetworkGame()) {
        console.log(`[Acción Bloqueada] Soy J${gameState.myPlayerNumber} y he ignorado un clic porque es el turno de J${gameState.currentPlayer}.`);
        UIManager.showMessageTemporarily(`Es el turno del Jugador ${gameState.currentPlayer}.`, 1500, true);
        return;
    }
    // --- FIN DEL GUARDIÁN ---

    // --- MANEJO DEL MODO DE COLOCACIÓN ---
    // Si el guardián anterior permitió pasar, lo siguiente más importante es
    // comprobar si estás en modo "colocar unidad". Si es así, toda la lógica
    // se delega a la función correspondiente y se detiene aquí.
    if (placementMode.active) {
        if (typeof handlePlacementModeClick === "function") {
            handlePlacementModeClick(r, c);
        } else {
            console.error("Error crítico: handlePlacementModeClick no está definido.");
        }
        return; 
    }
    
    // CASO ESPECIAL: Se está esperando la colocación de una unidad recién dividida.
    if (gameState.preparingAction?.type === 'split_unit') {
    const hexEl = board[r]?.[c]?.element;

        // Verificamos si el clic fue en un hexágono válido para colocar (los que están resaltados).
        if (hexEl && hexEl.classList.contains('highlight-place')) {
            const originalUnit = units.find(u => u.id === gameState.preparingAction.unitId);
            
            if (originalUnit) {
                // ¡LA LÍNEA CLAVE! Usamos la función de Request que ya sabe cómo manejar la red
                if (typeof RequestSplitUnit === "function") {
                    RequestSplitUnit(originalUnit, r, c);
                } else {
                    console.error("CRÍTICO: La función RequestSplitUnit no está definida.");
                }
            }
        } else {
            logMessage("Colocación cancelada.");
        }
        
        // Pase lo que pase (clic válido o inválido), cancelamos el modo de preparación.
        if (typeof cancelPreparingAction === "function") {
            cancelPreparingAction();
        }
        
        return; // La acción de 'split' ya ha sido manejada. Fin de onHexClick.
    }

    // --- VERIFICACIONES GENERALES DEL JUEGO ---
    // Se comprueba si el juego está en una condición que no permite clics,
    // como justo después de mover el mapa, si no hay estado de juego o si la partida ha terminado.
    if (gameState?.justPanned || !gameState || gameState.currentPhase === "gameOver") {
        if (gameState) gameState.justPanned = false;
        return;
    }
    
    // Obtenemos los datos del hexágono en el que se hizo clic.
    const hexDataClicked = board[r]?.[c];
    if (!hexDataClicked) return;
    
    // Obtenemos la unidad que pueda estar en ese hexágono.
    const clickedUnit = getUnitOnHex(r, c);
    console.log(`[DIAGNÓSTICO getUnitOnHex] Para el clic en (${r},${c}), la función encontró:`, clickedUnit ? clickedUnit.name : 'ninguna unidad');
    
    // --- LÓGICA DE SELECCIÓN Y ACCIÓN ---
    // Este es el corazón de la interacción del jugador durante su turno.

    // CASO 1: YA tienes una unidad seleccionada (selectedUnit existe).
    if (selectedUnit) {
        // Se intenta realizar una acción con la unidad seleccionada en el hexágono objetivo.
        const actionTaken = handleActionWithSelectedUnit(r, c, clickedUnit);

        // Si no se realizó ninguna acción (por ejemplo, hiciste clic en una casilla vacía
        // a la que no te puedes mover), se deselecciona la unidad actual
        // y se procede a seleccionar lo que haya en la nueva casilla.
        if (!actionTaken) {
                // ... significa que fue un "clic en la nada".

                // Deseleccionamos la unidad actual.
            deselectUnit();
            UIManager.hideContextualPanel();

                // Y ahora, si en la casilla donde hemos hecho clic HAY OTRA COSA
                // (otra unidad tuya o un hexágono), la seleccionamos.
            if (clickedUnit) {
                    selectUnit(clickedUnit); // Selecciona la nueva unidad clickada
            } else {
                    UIManager.showHexContextualInfo(r, c, hexDataClicked); // Muestra info del hex vacío
            }
        }
            // Si SÍ se tomó una acción (actionTaken es true), no hacemos nada más. 
            // La unidad permanece seleccionada para que veas su estado actualizado.
            
    } else { // Si no había nada seleccionado al principio...
            if (clickedUnit) {
                selectUnit(clickedUnit);
            } else {
                UIManager.showHexContextualInfo(r, c, hexDataClicked);
            }
    }

    // LA NUEVA VERSIÓN DENTRO de onHexClick
    if (selectedUnit) {
        const actionTaken = handleActionWithSelectedUnit(r, c, clickedUnit);

        // Si NO se tomó ninguna acción...
        if (!actionTaken) {
            // ... significa que fue un "clic en la nada".

            // Deseleccionamos la unidad actual.
            deselectUnit();
            UIManager.hideContextualPanel();

            // Y ahora, si en la casilla donde hemos hecho clic HAY OTRA COSA
            // (otra unidad tuya o un hexágono), la seleccionamos.
            if (clickedUnit) {
                selectUnit(clickedUnit); // Selecciona la nueva unidad clickada
            } else {
                UIManager.showHexContextualInfo(r, c, hexDataClicked); // Muestra info del hex vacío
            }
        }
        // Si SÍ se tomó una acción (actionTaken es true), no hacemos nada más. 
        // La unidad permanece seleccionada para que veas su estado actualizado.
        
    } else { // Si no había nada seleccionado al principio...
        if (clickedUnit) {
            if (clickedUnit.player === gameState.currentPlayer) {
                    // Si es TU unidad, la seleccionas normalmente.
                    selectUnit(clickedUnit);
                } else {
                    // Si es una unidad ENEMIGA...
                    // ...comprobamos si tienes visión sobre ella con un explorador.
                    if (typeof isEnemyScouted === 'function' && isEnemyScouted(clickedUnit)) {
                        // Si tienes visión, MUESTRAS SU INFO pero NO la seleccionas.
                        UIManager.showUnitContextualInfo(clickedUnit, false);
                    } else {
                        // Si no tienes visión, solo muestras info básica del hexágono.
                        UIManager.showHexContextualInfo(r, c, hexDataClicked);
                        logMessage("No tienes suficiente visión para ver los detalles de esta unidad enemiga.");
                    }
                }
        } else {
            UIManager.showHexContextualInfo(r, c, hexDataClicked);
        }
    }
}

function showScreen(screenElement) {
    console.log(`[showScreen] Intentando mostrar: ${screenElement ? screenElement.id : 'ninguna pantalla (ocultar todo)'}.`);

    // Oculta todas las pantallas de ambos sistemas
    document.querySelectorAll('.modal, .modal-overlay').forEach(el => {
        if (el.classList.contains('modal-overlay')) {
            el.classList.remove('active');
        } else if (!el.classList.contains('no-auto-hide')) { // Respeta los modales secundarios
            el.style.display = 'none';
        }
    });

    // Muestra la pantalla solicitada
    if (screenElement) {
        if (screenElement.classList.contains('modal-overlay')) {
            screenElement.classList.add('active');
        } else {
            screenElement.style.display = 'flex';
        }
    }
}


function initApp() {
    console.log("main.js: DOMContentLoaded -> initApp INICIADO (Versión CORREGIDA con Cuentas).");
    // ======================================================================
    // 0. CORTAFUEGOS DE ESTADO DEL TUTORIAL
    // ======================================================================
    // Esta es una medida de seguridad. Si el usuario recarga la página (F5)
    // o vuelve al menú, nos aseguramos de que el estado del tutorial se reinicie.
    if (gameState && gameState.isTutorialActive) {
        console.warn("Se detectó un estado de tutorial activo al cargar la app. Forzando reinicio.");
        gameState.isTutorialActive = false;
        
        // Si sigues usando la variable global, también la reseteamos.
        if (typeof window.TUTORIAL_MODE_ACTIVE !== 'undefined') {
            window.TUTORIAL_MODE_ACTIVE = false;
        }
    }

    // ======================================================================
    // 1. VERIFICACIONES DE CARGA
    // ======================================================================
    
    if (typeof domElements === 'undefined' || !domElements.domElementsInitialized) {
         console.error("main.js: CRÍTICO: domElements no está definido."); return;
    }

    if (typeof GachaManager !== 'undefined' && GachaManager.init) GachaManager.init();
    
    if (typeof MailboxManager !== 'undefined' && MailboxManager.init) MailboxManager.init();

    if (typeof addModalEventListeners === "function") { addModalEventListeners(); } 
    else { console.error("main.js: CRÍTICO: addModalEventListeners no está definida."); }
    
    if (typeof UIManager !== 'undefined' && UIManager.setDomElements) { UIManager.setDomElements(domElements); } 
    else { console.error("main.js: CRÍTICO: UIManager no definido."); }
    

    // DENTRO DE initApp(), ASEGÚRATE DE TENER ESTA VERSIÓN FINAL

// ======================================================================
// === LÓGICA DE PANELES (ÚNICA Y DEFINITIVA) ===========================
// ======================================================================
const infoPanel = document.getElementById('contextualInfoPanel');
const closeInfoBtn = document.getElementById('closeContextualPanelBtn');
const tutorialPanel = document.getElementById('tutorialMessagePanel');
const closeTutorialBtn = document.getElementById('closeTutorialPanelBtn');
const reopenInfoBtn = document.getElementById('reopenContextualPanelBtn');

if (infoPanel && closeInfoBtn) {
    closeInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        infoPanel.classList.remove('visible'); // Cierre limpio
        if (reopenInfoBtn) reopenInfoBtn.style.display = 'block'; // Muestra ▲
        //if (typeof deselectUnit === 'function') deselectUnit();
    });
}

if (tutorialPanel && closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tutorialPanel.classList.remove('visible'); // Cierre limpio
        if (reopenInfoBtn) reopenInfoBtn.style.display = 'block'; // Muestra ▲
    });
}

    // Botón de Re-apertura ▲ (ya no debería tener problemas)
    if (reopenInfoBtn) {
        reopenInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            reopenInfoBtn.style.display = 'none';
            if (gameState.isTutorialActive) {
                if (TutorialManager && typeof TutorialManager.reshowCurrentMessage === 'function') {
                    TutorialManager.reshowCurrentMessage();
                }
            } else {
                if (typeof GAME_TIPS !== 'undefined' && GAME_TIPS.length > 0) {
                    const randomIndex = Math.floor(Math.random() * GAME_TIPS.length);
                    if (UIManager && UIManager.showGeneralMessage) {
                        UIManager.showGeneralMessage(GAME_TIPS[randomIndex]); 
                    }
                }
            }
        });
    }
    
    /*
    // Cierre automático del panel de INFO al hacer clic fuera (con excepción para ▲)
    document.body.addEventListener('click', (event) => {
        if (event.target === reopenInfoBtn) return;
        
        const currentInfoPanel = document.getElementById('contextualInfoPanel'); // Le cambio el nombre para evitar conflictos
        if (currentInfoPanel && currentInfoPanel.classList.contains('visible')) {
            const tacticalUI = document.getElementById('tactical-ui-container');
            if (!currentInfoPanel.contains(event.target) && !(tacticalUI && tacticalUI.contains(event.target))) {
                currentInfoPanel.classList.remove('visible');
                if (typeof deselectUnit === 'function') deselectUnit();
            }
        }
    }, true);
    */
    // ======================================================================
    // 2. LÓGICA DE CUENTAS DE USUARIO
    // ======================================================================

    const showMainMenu = () => {
    if (PlayerDataManager.currentPlayer) {
        // <<== MODIFICACIÓN IMPORTANTE ==>>
        // Actualizamos los dos posibles displays del nombre del general
        const newGeneralNameDisplay = document.getElementById('currentGeneralName_main');
        if (newGeneralNameDisplay) newGeneralNameDisplay.textContent = PlayerDataManager.currentPlayer.username;
        if (domElements.currentGeneralName) domElements.currentGeneralName.textContent = PlayerDataManager.currentPlayer.username;
    }

    // Forzamos que se muestre directamente el nuevo menú principal
    showScreen(domElements.mainMenuScreenEl);
};

    const showLoginScreen = () => {
        showScreen(domElements.loginScreen);
        const lastUser = localStorage.getItem('lastUser');
        if (lastUser) {
            domElements.usernameInput.value = lastUser;
            domElements.passwordInput.focus();
        } else {
            domElements.usernameInput.focus();
        }
    };
    
    if (domElements.loginBtn) {
        domElements.loginBtn.addEventListener('click', () => {
            domElements.loginErrorMessage.textContent = "";
            const username = domElements.usernameInput.value;
            const password = domElements.passwordInput.value;
            const result = PlayerDataManager.login(username, password);
            
            if (result.success) {
                // 1. Ocultamos explícitamente la pantalla de login.
                showScreen(null); // Esto oculta todas las pantallas.
                
                // 2. Luego, procedemos a mostrar el menú principal.
                showMainMenu();
            } else {
                domElements.loginErrorMessage.textContent = result.message;
            }
        });
    }

    if (domElements.logoutBtn) {
        domElements.logoutBtn.addEventListener('click', () => {
            PlayerDataManager.logout();
            showLoginScreen();
        });
    }

    // ======================================================================
    // 3. LISTENERS DE LA INTERFAZ
    // ======================================================================
    
    // Listener del Buzón
    if (domElements.floatingInboxBtn) {
        domElements.floatingInboxBtn.addEventListener('click', (event) => {
            console.log("hice click"); // <--- AÑADE ESTA LÍNEA AQUÍ
            
            event.stopPropagation();

            const modal = document.getElementById('inboxModal');
            if (modal) {
                modal.style.display = 'flex';
                
                if (MailboxManager && MailboxManager.renderList) {
                    MailboxManager.renderList();
                }
            }
        });
    }

    // Listener de botones expandibles
    if (domElements.toggleRightMenuBtn) {
        domElements.toggleRightMenuBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            // Buscamos el contenedor padre que tiene toda la lógica
            const menuGroup = domElements.toggleRightMenuBtn.closest('.right-menu-group');
            if (menuGroup) {
                const isOpen = menuGroup.classList.toggle('is-open');
                domElements.toggleRightMenuBtn.textContent = isOpen ? '✕' : '⚙️';
            }
        });

        // Cierra el submenú si haces clic fuera (esta parte es importante)
        document.addEventListener('click', (event) => {
            const menuGroup = document.querySelector('.right-menu-group.is-open');
            // Si el menú está abierto y el clic fue fuera de él
            if (menuGroup && !menuGroup.contains(event.target)) {
                menuGroup.classList.remove('is-open');
                if (domElements.toggleRightMenuBtn) domElements.toggleRightMenuBtn.textContent = '⚙️';
            }
        });
    }

    // Listener de información
    if (domElements.floatingMenuBtn) { 
        domElements.floatingMenuBtn.addEventListener('click', () => { 
            const topBar = document.getElementById('top-bar-menu'); // Buscamos la nueva barra
            if (!topBar) return;
            
            const isVisible = topBar.style.display !== 'none';

            if (isVisible) {
                topBar.style.display = 'none';
            } else {
                topBar.style.display = 'flex';
                // Al abrir, pedimos a UIManager que refresque la info
                if (typeof UIManager !== 'undefined' && UIManager.updateTopBarInfo) {
                    UIManager.updateTopBarInfo();
                }
            }
        }); 
    }

    // Guardar Partida (Nuevo botón)
    const saveGameBtnTop = document.getElementById('saveGameBtn_top');
    if (saveGameBtnTop) {
        saveGameBtnTop.addEventListener('click', () => { 
            if (typeof handleSaveGame === "function") handleSaveGame();
        }); 
    }

    // Cargar Partida (Nuevo input)
    const loadGameInputTop = document.getElementById('loadGameInput_top');
    if (loadGameInputTop) {
        loadGameInputTop.addEventListener('change', (event) => { 
            if (typeof handleLoadGame === "function") handleLoadGame(event);
        });
    }

    // Exportar Perfil (Nuevo botón)
    const exportProfileBtnTop = document.getElementById('exportProfileBtn_top');
    if (exportProfileBtnTop) {
        exportProfileBtnTop.addEventListener('click', () => exportProfile());
    }

    // Rendirse / Salir (Nuevo botón)
    const concedeBattleBtnTop = document.getElementById('concedeBattleBtn_top');
    if (concedeBattleBtnTop) {
        concedeBattleBtnTop.addEventListener('click', () => {
            // La misma lógica que ya tenías para rendirte o salir al menú
            if (confirm("¿Seguro que quieres abandonar la batalla? El progreso no se guardará.")) { 
                // Limpia la UI y vuelve al menú principal
                if (domElements.gameContainer) domElements.gameContainer.style.display = 'none';
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'none';
                if (document.getElementById('top-bar-menu')) document.getElementById('top-bar-menu').style.display = 'none';
                showScreen(domElements.mainMenuScreenEl);
            }
        });
    }
    
    // <<== "Cuartel" ==>>
    if (domElements.barracksBtn && !domElements.barracksBtn.hasListener) {
        domElements.barracksBtn.addEventListener('click', () => {
            if(typeof openBarracksModal === "function") {
                openBarracksModal(false);
            }
        });
        domElements.barracksBtn.hasListener = true;
    }

    if (domElements.importProfileInput) {
        domElements.importProfileInput.addEventListener('change', (event) => {
            importProfile(event);
        });
    }

    if (domElements.exportProfileBtn_float) {
        domElements.exportProfileBtn_float.addEventListener('click', () => {
            exportProfile();
        });
    }

    // Lógica para el panel del tutorial
    if (closeTutorialBtn && tutorialPanel) {
        closeTutorialBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tutorialPanel.classList.remove('visible');
            // Opcional: podrías mostrar un botón para reabrir el tutorial si quisieras
        });
    }
    
    // <<== "Forja" ==>>

    const openForgeBtn = document.getElementById('openForgeBtn');
    if (openForgeBtn) {
        openForgeBtn.addEventListener('click', () => {
            if (typeof openForgeModal === "function") {
                openForgeModal();
            }
        });
    }

    const closeForgeBtn = document.getElementById('closeForgeBtn');
    if (closeForgeBtn) {
        closeForgeBtn.addEventListener('click', () => {
            const modal = document.getElementById('forgeModal');
            if(modal) modal.style.display = 'none';
        });
    }

    const forgeItemBtn = document.getElementById('forgeItemBtn');
    if (forgeItemBtn) {
        forgeItemBtn.addEventListener('click', () => {
            if (typeof handleForgeItem === "function") {
                handleForgeItem();
            }
        });
    }

    // <<== "Cuartel" ==>>
    if (domElements.barracksBtn && !domElements.barracksBtn.hasListener) {
        domElements.barracksBtn.addEventListener('click', () => {
            if(typeof openBarracksModal === "function") {
                openBarracksModal(false); // Abrir en modo "solo vista"
            } else {
                console.error("main.js: La función openBarracksModal no está definida en modalLogic.js.");
            }
        });
        domElements.barracksBtn.hasListener = true; // Previene añadir múltiples listeners
    }
   
    // <<==botón de IMPORTAR Perfil==>>
    if (domElements.importProfileInput) {
        domElements.importProfileInput.addEventListener('change', (event) => {
            importProfile(event);
        });
    }

    // <<== botón de EXPORTAR Perfil==>>
    if (domElements.exportProfileBtn_float) {
        domElements.exportProfileBtn_float.addEventListener('click', () => {
            exportProfile();
        });
    }
    // ======================================================================    
    //Juego en red   
    // ====================================================================== 
    // En main.js
    if (domElements.createNetworkGameBtn && !domElements.createNetworkGameBtn.hasListener) {
        domElements.createNetworkGameBtn.addEventListener('click', () => {
            console.log("[Anfitrión] Clic en 'Crear Partida en Red'. Preparando lobby...");

            // Ya NO leemos ni creamos gameSettings aquí. Solo mostramos el lobby.
            
            showScreen(domElements.hostLobbyScreen);
            gameState.currentPhase = "hostLobby";

            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            NetworkManager.iniciarAnfitrion((idGenerado) => {
                if(domElements.shortGameCodeEl) domElements.shortGameCodeEl.textContent = idGenerado;
                if(domElements.hostPlayerListEl) domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li>`;
            });
        });
        domElements.createNetworkGameBtn.hasListener = true;
    }
    
    // En main.js
    function onConexionLANEstablecida(idRemoto) {
        if (NetworkManager.esAnfitrion) {
            if (domElements.hostStatusEl) {
                domElements.hostStatusEl.textContent = 'Jugador Conectado. Iniciando...';
                domElements.hostStatusEl.className = 'status conectado';
            }
            if (domElements.hostPlayerListEl) {
                domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li><li>J2: Cliente Conectado</li>`;
            }
            
            console.log("[Red - Anfitrión] Cliente conectado. Recopilando settings y iniciando la partida...");
            
            // --- LA LÓGICA DE RECOPILAR SETTINGS AHORA ESTÁ AQUÍ ---
            const settings = gameState.setupTempSettings || {};
            const numPlayers = 2; // Partidas en red por ahora son de 2
            
            const playerTypes = {};
            const playerCivilizations = {};
            for (let i = 1; i <= numPlayers; i++) {
                const playerKey = `player${i}`;
                // ASUMIMOS J1 = HUMANO, J2 = HUMANO. Esta lógica podría mejorarse
                playerTypes[playerKey] = 'human'; 
                
                const civSelectEl = document.getElementById(`player${i}Civ`);
                if (civSelectEl) {
                    playerCivilizations[i] = civSelectEl.value;
                } else { // Fallback por si acaso
                    playerCivilizations[i] = 'ninguna';
                }
            }
            
            const gameSettings = {
                ...settings,
                playerTypes: playerTypes,
                playerCivilizations: playerCivilizations,
                deploymentUnitLimit: settings.unitLimit === "unlimited" ? Infinity : parseInt(settings.unitLimit)
            };
            
            const dataPacket = { type: 'startGame', settings: gameSettings };
            
            NetworkManager.enviarDatos(dataPacket); // Enviamos los settings al cliente
            setTimeout(() => { iniciarPartidaLAN(gameSettings); }, 500); // Iniciamos para nosotros mismos

        } else {
            console.log(`[Red - Cliente] Conexión establecida. Esperando inicio de partida...`);
        }
    }
    
    function onDatosLANRecibidos(datos) {
        
        // [LOG DE RED - AÑADIDO AQUÍ, AL PRINCIPIO]
        if (datos.type === 'actionRequest' && datos.action?.type === 'moveUnit') {
            const soyAnfitrion = NetworkManager.esAnfitrion;
            console.log(`[NETWORK FLOW - PASO 3] ${soyAnfitrion ? 'Anfitrión' : 'Cliente'} ha recibido un paquete. Tipo: '${datos.type}', Acción solicitada: '${datos.action.type}'.`);
        }
        
        console.log(`%c[PROCESS DATA] onDatosLANRecibidos procesando paquete tipo: ${datos.type}`, 'background: #DAA520; color: black;');
        // Lógica del Cliente (cuando NO es anfitrión)
        if (!NetworkManager.esAnfitrion) {
            switch (datos.type) {
                case 'startGame':
                    // Esto es para la configuración inicial, antes de que el tablero exista
                    iniciarPartidaLAN(datos.settings);
                    break;
                    
                case 'initialGameSetup':
                    // La primera "fotografía" completa del juego al empezar
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                case 'fullStateUpdate':
                    // CUALQUIER otra actualización del juego durante la partida
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                default:
                    console.warn(`[Cliente] Recibido paquete desconocido del anfitrión: '${datos.type}'.`);
                    break;
            }
        }
        // Lógica del Anfitrión (recibiendo peticiones del cliente)
        else {
            if (datos.type === 'actionRequest') {
                console.log(`%c[HOST PROCESS] Anfitrión va a procesar acción solicitada: ${datos.action.type}`, 'background: #DC143C; color: white;', datos.action.payload);
                processActionRequest(datos.action);
            } else {
                console.warn(`[Anfitrión] Recibido paquete desconocido del cliente: '${datos.type}'.`);
            }
        }
    }

    function onConexionLANCerrada() {
        if (!domElements.lanStatusEl || !domElements.lanPlayerListEl || !domElements.lanRemoteIdInput || !domElements.lanConnectBtn) return;
        domElements.lanStatusEl.textContent = 'Desconectado';
        domElements.lanStatusEl.className = 'status desconectado';
        domElements.lanPlayerListEl.innerHTML = `<li>Tú (${NetworkManager.miId})</li>`;
        document.getElementById('lan-game-options-host').style.display = 'none';

        // Habilitar de nuevo la opción de unirse
        domElements.lanRemoteIdInput.disabled = false;
        domElements.lanConnectBtn.disabled = false;
        alert("El otro jugador se ha desconectado.");
    }

// Botón para ir a la pantalla del Lobby LAN
    if (domElements.startLanModeBtn) {
        domElements.startLanModeBtn.addEventListener('click', () => {
            showScreen(domElements.lanLobbyScreen);
            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            
            // Iniciamos como anfitrión por defecto, esperando que alguien se una.
            NetworkManager.iniciarAnfitrion((idGenerado) => {
                if(domElements.lanRoomIdEl) domElements.lanRoomIdEl.textContent = idGenerado;
                if(domElements.lanPlayerListEl) domElements.lanPlayerListEl.innerHTML = `<li>J1: Tú (${idGenerado})</li>`;
            });
        });
    }

    // Botón para unirse a la sala de otro
    if (domElements.lanConnectBtn) {
        domElements.lanConnectBtn.addEventListener('click', () => {
            const idAnfitrion = domElements.lanRemoteIdInput.value;
            if (idAnfitrion) {
                NetworkManager.desconectar(); // Primero nos desconectamos de nuestra sesión de anfitrión
                NetworkManager.unirseAPartida(idAnfitrion);
            } else {
                alert("Por favor, introduce el ID de la sala del anfitrión.");
            }
        });
    }

    // Botón para copiar el ID de la sala
    if(domElements.lanCopyIdBtn){
        domElements.lanCopyIdBtn.addEventListener('click', () => {
            if(NetworkManager.miId){
                navigator.clipboard.writeText(NetworkManager.miId).then(() => {
                    alert('ID de la sala copiado al portapapeles');
                });
            }
        });
    }
    
    // Botón para volver al menú principal desde el lobby
    if (domElements.backToMainMenuBtn_fromLan) {
        domElements.backToMainMenuBtn_fromLan.addEventListener('click', () => {
            NetworkManager.desconectar();
            
            // Devolver las opciones de skirmish a su lugar original
            const optionsContainer = domElements.skirmishOptionsContainer;
            const originalParent = domElements.setupScreen.querySelector('.modal-content');
            if(optionsContainer && originalParent && !originalParent.contains(optionsContainer)){
                // CAMBIO: Apuntamos al botón correcto antes del cual insertar. El original fue renombrado
                originalParent.insertBefore(optionsContainer, domElements.startLocalGameBtn.parentElement);
            }
            
            showScreen(domElements.mainMenuScreenEl);
        });
    }
    
    if (domElements.lanStartGameBtn) {
        domElements.lanStartGameBtn.addEventListener('click', () => {
            if (!NetworkManager.conn || !NetworkManager.conn.open) {
                alert("Error: No hay otro jugador conectado para iniciar la partida.");
                return;
            }
            
            console.log("[LAN Anfitrión] Botón 'Comenzar Partida' pulsado. Recopilando opciones...");
            
            // 1. Recopilar toda la configuración de la partida desde los elementos de la UI
            const gameSettings = {
                playerTypes: {
                    player1: 'human', // Anfitrión es siempre J1
                    player2: 'human'  // Cliente es siempre J2
                },
                playerCivilizations: {
                    1: domElements.player1Civ.value,
                    2: domElements.player2Civ.value
                },
                resourceLevel: domElements.resourceLevelSelect.value,
                boardSize: domElements.boardSizeSelect.value,
                deploymentUnitLimit: domElements.initialUnitsCountSelect.value === "unlimited" 
                                    ? Infinity 
                                    : parseInt(domElements.initialUnitsCountSelect.value)
            };
            
            // 2. Crear un paquete de datos para enviar. Incluimos el tipo de mensaje.
            const dataPacket = {
                type: 'startGame',
                settings: gameSettings,
                anfitrionPeerId: NetworkManager.miId // El cliente sabrá quién es J1 y J2
            };

            // 3. Enviar la configuración al otro jugador
            NetworkManager.enviarDatos(dataPacket);
            console.log("[LAN Anfitrión] Paquete de configuración enviado:", dataPacket);
            
            // 4. Iniciar la partida en nuestra propia máquina con la misma configuración
            iniciarPartidaLAN(gameSettings);
        });
    }
    
    // 1. Botón para que el CLIENTE se una a una partida
    if (domElements.joinNetworkGameBtn && !domElements.joinNetworkGameBtn.hasListener) {
        domElements.joinNetworkGameBtn.addEventListener('click', () => {
            const shortCode = prompt("Introduce el ID de la partida:");
            if (shortCode && shortCode.trim() !== "") {
                logMessage(`Intentando unirse a ${shortCode}...`);
                NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
                NetworkManager.unirseAPartida(shortCode.trim());
            } else {
                if (shortCode !== null) alert("Código inválido.");
            }
        });
        domElements.joinNetworkGameBtn.hasListener = true;
    }
    
    // 2. Botón para que el ANFITRIÓN cree una partida en red
    if (domElements.createNetworkGameBtn) {
        domElements.createNetworkGameBtn.addEventListener('click', () => {
            console.log("[Anfitrión] Clic en 'Crear Partida en Red'. Preparando lobby...");

            // Reutilizamos la configuración global guardada en el paso anterior
            const settings = gameState.setupTempSettings || {};
            // Log MUY detallado para ver qué estamos recuperando
            console.error("DEBUGGING TIMER | PASO 2: Recuperando configuración al iniciar partida. Objeto 'settings':", JSON.stringify(settings, null, 2));
            gameState.turnDurationSeconds = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);
            const numPlayers = settings.numPlayers || 2;
            
            // Recolectamos dinámicamente la configuración de los jugadores
            const playerTypes = {};
            const playerCivilizations = {};
            
            for (let i = 1; i <= numPlayers; i++) {
                const playerNum = i;
                const playerKey = `player${playerNum}`; // 'player1', 'player2'
                
                const civSelectEl = document.getElementById(`player${playerNum}Civ`);
                const typeSelectEl = document.getElementById(`player${playerNum}TypeSelect`);

                // Si un jugador está "Cerrado", no lo incluimos en la partida
                if (typeSelectEl && typeSelectEl.value !== 'closed') {
                    if (civSelectEl) {
                        playerTypes[playerKey] = typeSelectEl.value;
                        playerCivilizations[playerNum] = civSelectEl.value;
                    } else {
                        console.error(`Error: No se encontró el selector de civilización para el jugador ${playerNum}`);
                        return; // Detiene la creación si falta un elemento
                    }
                }
            }

            const gameSettings = {
                ...settings, // Incluye boardSize, resourceLevel, etc.
                playerTypes: playerTypes,
                playerCivilizations: playerCivilizations,
                deploymentUnitLimit: settings.unitLimit === "unlimited" ? Infinity : parseInt(settings.unitLimit)
            };
            
            showScreen(domElements.hostLobbyScreen);
            domElements.hostLobbyScreen.dataset.gameSettings = JSON.stringify(gameSettings);
            gameState.currentPhase = "hostLobby";

            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            NetworkManager.iniciarAnfitrion((idGenerado) => {
                if(domElements.shortGameCodeEl) domElements.shortGameCodeEl.textContent = idGenerado;
                if(domElements.hostPlayerListEl) domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li>`;
            });
        });
    }

    // 3. Botón para que el ANFITRIÓN cancele el lobby
    if(domElements.backToMainMenuBtn_fromHostLobby) {
        domElements.backToMainMenuBtn_fromHostLobby.addEventListener('click', () => {
             NetworkManager.desconectar();
             showScreen(domElements.setupScreen);
        });
    }

    if (domElements.floatingAssignGeneralBtn && !domElements.floatingAssignGeneralBtn.hasListener) {
        domElements.floatingAssignGeneralBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                console.log(`Abriendo Cuartel para asignar un Héroe a ${selectedUnit.name}.`);
                if (typeof openBarracksModal === "function") {
                    openBarracksModal(true, selectedUnit);
                }
            }
        });
        domElements.floatingAssignGeneralBtn.hasListener = true;
    }

    if (domElements.floatingBuildBtn) {
        domElements.floatingBuildBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[DEBUG Botón Construir] click detectado.");
            if (selectedUnit) {
                hexToBuildOn = { r: selectedUnit.r, c: selectedUnit.c };
                console.log(`Modo construcción iniciado por unidad seleccionada en (${hexToBuildOn.r}, ${hexToBuildOn.c}).`);
            }
            if (hexToBuildOn) {
                if (typeof openBuildStructureModal === "function") { openBuildStructureModal(); } 
                else { console.error("CRÍTICO: La función openBuildStructureModal no está definida en modalLogic.js"); }
            } else {
                console.warn("[DEBUG Botón Construir] No se puede construir. No hay unidad ni hexágono seleccionado.");
                if (UIManager) UIManager.showMessageTemporarily("No hay una acción de construcción válida.", 3000, true);
            }
        });
    } else { 
        console.warn("main.js: floatingBuildBtn no encontrado, no se pudo añadir listener."); 
    }

    //botón de arrasar infraestructura
    if (domElements.floatingRazeBtn) {
        domElements.floatingRazeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof requestRazeStructure === "function") {
                requestRazeStructure();
            } else {
                console.error("Error: La función requestRazeStructure no está definida en unit_Actions.js");
            }
        });
    }

    //botón de explorar ruinas
    if (domElements.floatingExploreRuinBtn) {
        domElements.floatingExploreRuinBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof requestExploreRuins === "function") {
                requestExploreRuins();
            } else {
                console.error("Error: La función requestExploreRuins no está definida en unit_Actions.js");
            }
        });
    }

    //botón de saqueo
    if (domElements.floatingPillageBtn) {
        domElements.floatingPillageBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            RequestPillageAction(); 
        });
    } else {
        console.warn("main.js: floatingPillageBtn no encontrado, no se pudo añadir listener.");
    }

    // === LÓGICA DEL BOTÓN DE EMPEZAR PARTIDA LOCAL ===
    if (domElements.startLocalGameBtn && !domElements.startLocalGameBtn.hasListener) { 
        domElements.startLocalGameBtn.addEventListener('click', () => { 
            console.log("main.js: Botón 'Empezar Partida (Local)' clickeado. Iniciando validación...");
            
            //1.  Reutilizamos la configuración temporal guardada por el botón "Siguiente"
            const settings = gameState.setupTempSettings || {};
            const numPlayers = settings.numPlayers || 2;

            // 2. Convertimos la duración del turno aquí
            const turnDuration = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);

            // 3. Resetear el estado del juego. Es LO PRIMERO que hacemos.
            if (typeof resetGameStateVariables === "function") {
                resetGameStateVariables(numPlayers, turnDuration);
                gameState.myPlayerNumber = 1;
            } else {
                console.error("main.js: resetGameStateVariables no definida.");
                return;
            }

            // 4. RECOLECTAR CONFIGURACIÓN REAL DE SETUPSCREEN2 (Valores dinámicos)
                
            gameState.playerTypes = {};
            gameState.playerCivilizations = {};
            gameState.playerAiLevels = {}; // Siempre se resetea

            let configurationSuccess = true;

            for (let i = 1; i <= numPlayers; i++) {
                    const playerNum = i;
                    const playerKey = `player${playerNum}`; // 'player1', 'player2', etc.
                    
                    // Leemos del DOM por ID (creados en modalLogic.js)
                    const civSelectEl = document.getElementById(`player${playerNum}Civ`);
                    const typeSelectEl = document.getElementById(`player${playerNum}TypeSelect`);

                if (!civSelectEl || !typeSelectEl) {
                        console.error(`Fallo: Selectores de Jugador ${playerNum} no encontrados en el DOM.`);
                        configurationSuccess = false;
                        break;
                }
                
                const typeValue = typeSelectEl.value;
                gameState.playerCivilizations[playerNum] = civSelectEl.value;
                gameState.playerTypes[playerKey] = typeValue;

                    // Configuración de nivel de IA (si aplica)
                if (typeValue.startsWith('ai_')) {
                        gameState.playerAiLevels[playerKey] = typeValue.split('_')[1] || 'normal'; // <<-- ASIGNACIÓN CORREGIDA
                    }
                }
                
                if (!configurationSuccess) {
                    UIManager.showMessageTemporarily("Fallo en la configuración: Faltan datos de jugadores (reintente 'Siguiente').", 4000, true);
                    return;
            }
            
            // 5. Finalizar configuración global usando settings del paso "Siguiente"
                
            gameState.deploymentUnitLimit = settings.unitLimit === "unlimited" ? Infinity : parseInt(settings.unitLimit);
            console.error(`DEBUGGING TIMER | PASO 3: Asignando gameState.turnDurationSeconds. Valor final: ${gameState.turnDurationSeconds}`);
            gameState.isCampaignBattle = false;
            
            // C. Asignar la duración del turno al gameState ya reseteado. ESTA ES LA CLAVE.
            gameState.turnDurationSeconds = turnDuration;
            console.log(`TIMER DEBUG: gameState.turnDurationSeconds asignado a: ${gameState.turnDurationSeconds}`);
            
            // 6. Inicializar el tablero de juego.
            if (typeof initializeNewGameBoardDOMAndData === "function") { 
                initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize); 
            } else { 
                console.error("CRÍTICO: initializeNewGameBoardDOMAndData NO es una función."); 
                return;
            }

                // 5. Transición de Pantalla
                if (typeof showScreen === "function" && domElements.gameContainer) { 
            showScreen(domElements.gameContainer);
            if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'block';
                    }
                } else { 
                    console.error("main.js: CRÍTICO: showScreen o domElements.gameContainer no disponibles."); 
                    return;
            }
            
            gameState.currentPhase = "deployment";
                // Corrección en el inicializador de unidades
            gameState.unitsPlacedByPlayer = {}; 
                for(let i=1; i<=numPlayers; i++) gameState.unitsPlacedByPlayer[i] = 0;


                // 7. Actualización final de UI y logs
                if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") { 
                UIManager.updateAllUIDisplays(); 
                } else { 
                    console.warn("main.js: UIManager.updateAllUIDisplays no definida."); 
            }

            if (typeof logMessage === "function") {
                const player1CivName = CIVILIZATIONS[gameState.playerCivilizations[1]]?.name || 'Desconocida';
                logMessage(`Fase de Despliegue. Jugador 1 (${player1CivName}) | Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit}.`);
            }
                else console.warn("main.js: logMessage no definida.");

                // FINALLY: Ya no necesitamos los Mocks, pero el motor ya superó la barrera.
        });
        domElements.startLocalGameBtn.hasListener = true;
        } else { 
            console.warn("main.js: startLocalGameBtn no encontrado."); 
    }
    

    //iberia Magna
    // ======================================================================
    if (domElements.startIberiaMagnaBtn) {
        // La función del listener ahora es 'async' para poder usar 'await'.
        domElements.startIberiaMagnaBtn.addEventListener('click', async () => {
            console.log("Iniciando modo de juego: Tronos de Iberia...");
            logMessage("Cargando el mapa de la península, por favor espera...");

            // 1. Prepara el estado del juego para 8 jugadores
            resetGameStateForIberiaMagna(); // Esta función la creaste en el paso anterior.

            // 2. ESPERA a que tu mapa CSV se cargue y se procese.
            // El 'await' es la clave: el código no continuará hasta que el mapa esté listo.
            await initializeIberiaMagnaData();
            
            // 3. Ahora que el mapa está listo, inicializa el tablero visual.
            initializeIberiaMagnaMap();
            
            // 4. Muestra la pantalla del juego.
            showScreen(domElements.gameContainer);
            if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'block';
            }
        });
    }

const contextualPanel = document.getElementById('contextualInfoPanel');
    const panelHeader = document.getElementById('contextualHeader');

    if (panelHeader && contextualPanel) {
        // Hacemos que TODA la cabecera sea "clicable" para expandir/contraer
        panelHeader.addEventListener('click', () => {
            // Alterna la clase que controla la expansión en el CSS
            contextualPanel.classList.toggle('is-expanded');
        });
    }

    // === LÓGICA DE TRANSICIÓN DE PANTALLAS DE CONFIGURACIÓN (SETUP) ===
    const nextToPlayerSetupBtn = document.getElementById('next-to-player-setup-btn');
    if (nextToPlayerSetupBtn) {
        nextToPlayerSetupBtn.addEventListener('click', () => {
            
            // Lee todos los valores directamente del DOM en variables constantes.
            const numPlayers = parseInt(document.getElementById('new-num-players').value) || 2;

            // Guarda toda la configuración en el objeto temporal.
            gameState.setupTempSettings = {
                boardSize: document.getElementById('boardSizeSelect').value,
                resourceLevel: document.getElementById('resourceLevel').value,
                unitLimit: document.getElementById('initialUnitsCount').value,
                turnTime: document.getElementById('turnTimeSelect').value,
                numPlayers: numPlayers
            };
            
            // Muestra la siguiente pantalla (selección de jugadores).
            if (typeof renderPlayerSelectionSetup === 'function') {
                renderPlayerSelectionSetup(numPlayers); 
            }
            showScreen(domElements.setupScreen2);
        });
    }

    // Listener para VOLVER a la pantalla 1 desde la 2
    const backToGlobalSetupBtn = document.getElementById('back-to-global-setup-btn');
    if (backToGlobalSetupBtn) {
        backToGlobalSetupBtn.addEventListener('click', () => {
            showScreen(domElements.setupScreen); 
        });
    }

    if (domElements.floatingEndTurnBtn) { 
        domElements.floatingEndTurnBtn.addEventListener('click', () => { 
            // La única responsabilidad del botón es llamar a la función principal.
            // Toda la lógica compleja (red, local, IA) estará dentro de handleEndTurn.
            if (typeof handleEndTurn === "function") {
                handleEndTurn();
            } else {
                console.error("main.js Error: La función handleEndTurn no está definida en gameFlow.js."); 
    }
        }); 
    } else { 
        console.warn("main.js: floatingEndTurnBtn no encontrado."); 
    }

    
    if (domElements.floatingMenuBtn && domElements.floatingMenuPanel) { 
        domElements.floatingMenuBtn.addEventListener('click', () => { 
            const isVisible = domElements.floatingMenuPanel.style.display === 'block' || domElements.floatingMenuPanel.style.display === 'flex'; 
            domElements.floatingMenuPanel.style.display = isVisible ? 'none' : 'block'; 

            // Notifica al tutorial de forma limpia
            if (gameState.isTutorialActive) {
                if (!isVisible) {
                    TutorialManager.notifyActionCompleted('menu_opened');
                } else {
                    TutorialManager.notifyActionCompleted('menu_closed');
                }
            }
            
            if (!isVisible && typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === "function") { 
                 UIManager.updatePlayerAndPhaseInfo(); 
            }
            if (isVisible && typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") {
                 UIManager.hideContextualPanel();
    }
        }); 
    } else { console.warn("main.js: floatingMenuBtn o floatingMenuPanel no encontrado."); }

    if (domElements.floatingSplitBtn) {
        domElements.floatingSplitBtn.addEventListener('click', (event) => {
            event.stopPropagation();

            if (UIManager && UIManager._autoCloseTimeout) {
                clearTimeout(UIManager._autoCloseTimeout);
                UIManager._autoCloseTimeout = null;
                console.log("[FIX] Temporizador de autocierre cancelado al abrir el modal de división.");
            }
            
            // --- INICIO DEL DIAGNÓSTICO ---
            // Este log nos dirá si el clic está siendo registrado.
            console.log("[DEBUG] Clic en el botón de dividir detectado."); 
            
            // Verificamos el estado de selectedUnit EN EL MOMENTO del clic.
            if (!selectedUnit) {
                console.error("[DEBUG] El botón se ha pulsado, pero 'selectedUnit' es NULO. No se puede abrir el modal.");
                return;
            }
            if ((selectedUnit.regiments?.length || 0) <= 1) {
                console.error(`[DEBUG] 'selectedUnit' (${selectedUnit.name}) solo tiene ${selectedUnit.regiments.length} regimientos. Se necesitan más de 1 para dividir.`);
                return;
            }
            // --- FIN DEL DIAGNÓSTICO ---

            // Si pasamos los diagnósticos, llamamos a la función.
            console.log("[DEBUG] Condiciones cumplidas. Llamando a openAdvancedSplitUnitModal...");
            if (typeof openAdvancedSplitUnitModal === "function") {
                openAdvancedSplitUnitModal(selectedUnit);
            } else {
                console.error("CRÍTICO: La función openAdvancedSplitUnitModal no está definida, pero se intentó llamar.");
            }
        });
    }

    if (domElements.saveGameBtn_float) { 
        domElements.saveGameBtn_float.addEventListener('click', () => { 
            if (typeof handleSaveGame === "function") handleSaveGame();
            else console.error("main.js Error: handleSaveGame no definida."); 
        }); 
    }

    if (domElements.loadGameInput_float) { 
        domElements.loadGameInput_float.addEventListener('click', (event) => { event.target.value = null; }); 
        domElements.loadGameInput_float.addEventListener('change', (event) => { 
            if (typeof handleLoadGame === "function") handleLoadGame(event);
            else console.error("main.js Error: handleLoadGame no definida.");
        }); 
    }

    if (domElements.concedeBattleBtn_float) { 
        domElements.concedeBattleBtn_float.addEventListener('click', () => { 
            // <<== GUARDIA DE SEGURIDAD PARA EL TUTORIAL ==>>
            if (gameState.isTutorialActive) {
                if (confirm("¿Seguro que quieres salir del tutorial? Tu progreso se perderá.")) {
                    console.log("Rendición durante tutorial: Finalizando y volviendo al menú.");
                    
                    // Secuencia de limpieza completa del tutorial
                    gameState.isTutorialActive = false;
                    window.TUTORIAL_MODE_ACTIVE = false;
                    if (typeof UIManager !== 'undefined') {
                        UIManager.restoreEndTurnButton();
                        UIManager.hideContextualPanel();
                    }
                    if (domElements.floatingMenuPanel) domElements.floatingMenuPanel.style.display = 'none';
                    if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'none';
                    
                    showScreen(domElements.mainMenuScreenEl);
                    return; // Detiene la ejecución para no procesar la lógica de rendición normal.
                } else {
                    return; // El usuario canceló la salida del tutorial.
                }
            }

             if (typeof logMessage === "function") logMessage("Batalla concedida.");
             else console.warn("main.js: logMessage no definida.");

            if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
                 campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); 
            } else { 
                 gameState.currentPhase = "gameOver"; 
                 if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") UIManager.updateAllUIDisplays();
                 else console.warn("main.js: UIManager.updateAllUIDisplays no definida.");

                 alert("Has concedido la escaramuza."); 
                 if (typeof showScreen === "function" && domElements.mainMenuScreenEl) showScreen(domElements.mainMenuScreenEl);
                 else console.error("main.js: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles.");
            } 
        }); 
    }

    if (domElements.backToMainFromBattleBtn) { 
        domElements.backToMainFromBattleBtn.addEventListener('click', () => { 
            if (confirm("¿Seguro que quiere salir y volver al menú principal? El progreso de esta batalla no se guardará.")) { 
                
                // --- FASE 1: Limpieza ---
                
                // A. Limpieza específica del tutorial
                if (gameState.isTutorialActive) {
                    console.log("Saliendo del tutorial sin terminar. Reiniciando estado del tutorial.");
                    gameState.isTutorialActive = false;
                    window.TUTORIAL_MODE_ACTIVE = false; // Si sigues usando esta variable global
                    if (typeof UIManager !== 'undefined' && UIManager.restoreEndTurnButton) {
                        UIManager.restoreEndTurnButton();
                    }
                }
                
                // B. Limpieza general de la UI de batalla
                if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel();
                 else {
                      if (domElements.contextualInfoPanel) domElements.contextualInfoPanel.style.display = 'none';
                      if(typeof UIManager !== 'undefined' && typeof UIManager.hideAllActionButtons === 'function') UIManager.hideAllActionButtons();
                      if (typeof selectedUnit !== 'undefined') selectedUnit = null; 
                      if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null; 
                 }
                if (domElements.floatingMenuPanel) domElements.floatingMenuPanel.style.display = 'none';
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'none';
                
                // --- FASE 2: Navegación ---
                
                // A. Si era una batalla de campaña, el campaignManager se encarga de la transición.
                if (gameState.isCampaignBattle) {
                    campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); 
                } 
                // B. Si era escaramuza o tutorial, simplemente volvemos al menú principal.
                else { 
                    gameState.currentPhase = "gameOver"; 
                    if (typeof showScreen === "function") {
                        showScreen(domElements.mainMenuScreenEl);
                    } else {
                        console.error("main.js: showScreen no está disponible para volver al menú principal.");
                    }
                } 
            } 
             if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'none';
            }
            showScreen(domElements.mainMenuScreenEl);
        }); 
    }
    
    if (domElements.floatingCreateDivisionBtn) {
        domElements.floatingCreateDivisionBtn.addEventListener('click', () => {
            console.log("%c[+] Botón 'Crear División' presionado.", "color: #28a745; font-weight: bold;"); 
            
            if (typeof gameState === 'undefined' || typeof placementMode === 'undefined') {
                console.error("main.js: CRÍTICO: gameState o placementMode no definidos. Abortando acción.");
                return;
            }
            const isRecruitingInPlayPhase = gameState.currentPhase === 'play' && typeof hexToBuildOn !== 'undefined' && hexToBuildOn !== null;
            
            if (isRecruitingInPlayPhase) {
                placementMode.recruitHex = { r: hexToBuildOn.r, c: hexToBuildOn.c }; 
                console.log(`[+] MODO: Reclutamiento en partida. Origen: hex (${placementMode.recruitHex.r},${placementMode.recruitHex.c}).`);
            } else if (gameState.currentPhase === 'deployment') {
                placementMode.recruitHex = null; 
                console.log("[+] MODO: Despliegue inicial de partida.");
            } else {
                console.warn(`[!] ADVERTENCIA: Botón de crear división presionado en un contexto no válido. Fase: ${gameState.currentPhase}.`);
                logMessage("No se puede crear una unidad en este momento.");
                return;
            }
            if (typeof openUnitManagementModal === "function") {
                console.log("[>] Llamando a openUnitManagementModal() para mostrar la nueva interfaz...");
            openUnitManagementModal();
            } else {
                console.error("main.js: CRÍTICO: La función 'openUnitManagementModal' no está definida en modalLogic.js.");
            }
        });
    } else { 
        console.warn("main.js: floatingCreateDivisionBtn no encontrado."); 
    }

    if (domElements.floatingWikiBtn) {
        domElements.floatingWikiBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof openWikiModal === "function") {
                openWikiModal();
            } else {
                console.error("Error: La función openWikiModal no está definida en modalLogic.js");
            }
        });
    }

    if (domElements.closeWikiModalBtn) {
        domElements.closeWikiModalBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (domElements.wikiModal) {
                domElements.wikiModal.style.display = 'none';
    }
        });
    }

    if (domElements.floatingTechTreeBtn) {
        domElements.floatingTechTreeBtn.addEventListener('click', () => {
            if (typeof openTechTreeScreen === "function") {
                openTechTreeScreen();
                if (domElements && domElements.floatingMenuPanel && domElements.floatingMenuPanel.style.display !== 'none') {
                    domElements.floatingMenuPanel.style.display = 'none';
    }
                if (domElements && domElements.contextualInfoPanel && domElements.contextualInfoPanel.classList.contains('visible')) {
                    if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) {
                        UIManager.hideContextualPanel();
                    }
                } else {
                     if(typeof UIManager !== 'undefined' && typeof UIManager.hideAllActionButtons === 'function') UIManager.hideAllActionButtons(); 
                     if (domElements && domElements.floatingCreateDivisionBtn) {
                    if (gameState && gameState.currentPhase !== "deployment") {
                        domElements.floatingCreateDivisionBtn.style.display = 'none';
                    }
                 }
                }
            } else {
                console.error("main.js: CRÍTICO: openTechTreeScreen no está definida (de techScreenUI.js).");
                alert("La pantalla de tecnologías aún no está disponible.");
            }
        });
    } else { console.warn("main.js: floatingTechTreeBtn no encontrado, no se pudo añadir listener."); }

    if (typeof initDebugConsole === "function") {
        initDebugConsole(); 
    } else {
        console.error("main.js: CRÍTICO: initDebugConsole no está definida (de debugConsole.js).");
    }

        if (domElements.floatingUndoMoveBtn) {
        domElements.floatingUndoMoveBtn.addEventListener('click', (event) => {
            event.stopPropagation(); 
            console.log("[DEBUG Botón Deshacer] click detectado");
            if (typeof RequestUndoLastUnitMove === "function" && typeof selectedUnit !== 'undefined' && selectedUnit) {
                 RequestUndoLastUnitMove(selectedUnit);
                 if(typeof UIManager !== 'undefined' && typeof UIManager.updateSelectedUnitInfoPanel === 'function') UIManager.updateSelectedUnitInfoPanel();
            } else {
                 console.warn("[DEBUG Botón Deshacer] No se puede deshacer el movimiento.");
                 if(typeof UIManager !== 'undefined' && typeof UIManager.showMessageTemporarily === 'function') UIManager.showMessageTemporarily("No se puede deshacer el movimiento.", 3000, true);
    }
        });
    } else { console.warn("main.js: floatingUndoMoveBtn no encontrado, no se pudo añadir listener."); }

    if (domElements.floatingReinforceBtn) {
        domElements.floatingReinforceBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[Botón 💪/👁️] Clic detectado.");

            // Obtenemos las coordenadas de la última unidad sobre la que se mostró el panel.
            // Esto es más fiable que depender de `selectedUnit`, que es solo para unidades controlables.
            const unitR = gameState.selectedHexR;
            const unitC = gameState.selectedHexC;

            if (typeof unitR !== 'undefined' && unitR !== -1) {
                const unitToShow = getUnitOnHex(unitR, unitC);

                if (unitToShow) {
                    console.log(`[Botón 💪/👁️] Abriendo modal para: ${unitToShow.name}`);
                    if (typeof openUnitDetailModal === "function") {
                        // La función openUnitDetailModal ya sabe cómo manejar
                        // una unidad propia vs. una unidad enemiga.
                        openUnitDetailModal(unitToShow);
                    } else {
                        console.error("CRÍTICO: La función 'openUnitDetailModal' no está definida en modalLogic.js.");
                    }
                } else {
                    console.warn(`[Botón 💪/👁️] Clic, pero no se encontró ninguna unidad en las coordenadas guardadas (${unitR}, ${unitC}).`);
    }
            } else {
                console.warn("[Botón 💪/👁️] Clic, pero no hay coordenadas de unidad seleccionada en el gameState.");
            }
        });
    } else { 
            console.warn("main.js: floatingReinforceBtn no encontrado, no se pudo añadir listener."); 
    }

    if (domElements.floatingNextUnitBtn) {
        domElements.floatingNextUnitBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof selectNextIdleUnit === "function") {
                selectNextIdleUnit();
            } else {
                console.error("Error: La función selectNextIdleUnit no está definida en gameFlow.js");
            }
        });
    } else {
        console.warn("main.js: floatingNextUnitBtn no encontrado.");
    }

    if (domElements.floatingConsolidateBtn) {
        domElements.floatingConsolidateBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit && typeof consolidateRegiments === "function") {
                consolidateRegiments(selectedUnit);
            }
        });
    } else {
        console.warn("main.js: floatingConsolidateBtn no encontrado.");
    }
/*
    if (typeof showWelcomeHelpModal === "function") {
        console.log("main.js: Llamando a showWelcomeHelpModal().");
        showWelcomeHelpModal(); 
    } else {
        console.error("main.js: CRÍTICO: showWelcomeHelpModal no está definida (de modalLogic.js).");
        if (typeof showScreen === "function" && domElements && domElements.mainMenuScreenEl) {
            showScreen(domElements.mainMenuScreenEl);
        } else {
            console.error("main.js: CRÍTICO: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles para fallback.");
            if (domElements && domElements.setupScreen) domElements.setupScreen.style.display = 'flex';
             else console.error("main.js: CRÍTICO: domElements.setupScreen no disponible.");
        }
        if (typeof logMessage === "function") logMessage("Bienvenido a Hex General Evolved.");
        else console.warn("main.js: logMessage no definida.");
    }
*/
    if (domElements.floatingManageBtn) {
        domElements.floatingManageBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                if (typeof openUnitDetailModal === "function") {
                    openUnitDetailModal(selectedUnit);
                }
            }
        });
    }

    if (domElements.disbandUnitBtn) {
        domElements.disbandUnitBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                if (typeof handleDisbandUnit === "function") {
                    handleDisbandUnit(selectedUnit);
                } else {
                    console.error("Error: La función handleDisbandUnit no está definida.");
                }
            } else {
                logMessage("No hay unidad seleccionada para disolver.", "error");
    }
        });
    } else {
        console.warn("main.js: disbandUnitBtn no encontrado, no se pudo añadir listener.");
    }

    if (domElements.setAsCapitalBtn) {
        domElements.setAsCapitalBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[Botón Capital] Clic detectado.");

            // Usamos el estado global para saber qué hexágono está seleccionado.
            const selectedR = gameState.selectedHexR;
            const selectedC = gameState.selectedHexC;

            if (typeof selectedR !== 'undefined' && selectedR !== -1) {
                // Llamamos a la función principal que maneja la lógica
                if (typeof requestChangeCapital === "function") {
                    requestChangeCapital(selectedR, selectedC);
                } else {
                    console.error("Error: La función requestChangeCapital no está definida en gameFlow.js");
                }
            } else {
                console.warn("[Botón Capital] Clic, pero no hay hexágono seleccionado en el gameState.");
            }
        });
    } else {
        console.warn("main.js: setAsCapitalBtn no encontrado, no se pudo añadir listener.");
    } 


    // ======================================================================
// 4. LÓGICA DEL NUEVO MENÚ PRINCIPAL INTERACTIVO
// ======================================================================
const interactiveBoard = document.getElementById('interactiveBoardContainer');
if (interactiveBoard) {
    interactiveBoard.addEventListener('click', (event) => {
        const hotspot = event.target.closest('.main-menu-hotspot');
        if (!hotspot) return;

        // Prevenimos que el clic se propague a otros elementos
        event.stopPropagation();

        const action = hotspot.dataset.action;
        console.log("Hotspot presionado:", action);

        switch(action) {
            case 'openGameModes':
                document.getElementById('gameModesModal').style.display = 'flex';
                break;
            case 'openAltar':
                if (typeof openDeseosModal === 'function') {
                    openDeseosModal();
                }
                break;
            case 'openBarracks':
                if (typeof openBarracksModal === 'function') {
                    openBarracksModal(false); // false = modo vista, no asignación
                }
                break;
            case 'openForge':
                if (typeof openForgeModal === 'function') {
                    openForgeModal();
                }
                break;
            case 'showComingSoon':
            // Usamos la nueva función de notificación para el jugador
            if (typeof showToast === 'function') {
                showToast("Esta función estará disponible próximamente.", "info");
            } else {
                alert("Próximamente..."); // Fallback por si acaso
            }
            break;
        }
    });
}

// -- Listeners para el nuevo modal de modos de juego --

// Botón para cerrar el modal de modos
const closeGameModesBtn = document.getElementById('closeGameModesModalBtn');
if (closeGameModesBtn) {
    closeGameModesBtn.addEventListener('click', () => {
        document.getElementById('gameModesModal').style.display = 'none';
    });
}

// Botón de Partida Rápida (Escaramuza)
const newSkirmishBtn = document.getElementById('startSkirmishBtn_new');
if (newSkirmishBtn) {
    newSkirmishBtn.addEventListener('click', () => {
        document.getElementById('gameModesModal').style.display = 'none';
        if (typeof showScreen === 'function') showScreen(domElements.setupScreen);
    });
}

// Botón del Tutorial
const newTutorialBtn = document.getElementById('startTutorialBtn_new');
if (newTutorialBtn) {
    newTutorialBtn.addEventListener('click', () => {
        document.getElementById('gameModesModal').style.display = 'none';
        
        if (typeof resetGameStateVariables === 'function') {
            resetGameStateVariables(2);
        }

        const tutorialScenario = GAME_DATA_REGISTRY.scenarios["TUTORIAL_SCENARIO"];
        const tutorialMap = GAME_DATA_REGISTRY.maps[tutorialScenario.mapFile];

        if(typeof resetAndSetupTacticalGame === 'function') resetAndSetupTacticalGame(tutorialScenario, tutorialMap, "tutorial");
        
        if(typeof initializeTutorialState === 'function') initializeTutorialState(); 
        gameState.currentPhase = "deployment";
        
        showScreen(domElements.gameContainer);
        if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
        initializeTutorialState(); 
        gameState.currentPhase = "deployment";
        TutorialManager.start(TUTORIAL_SCRIPTS.completo);
    });
}

// Botón de Unirse a Partida en Red
const newJoinNetworkBtn = document.getElementById('joinNetworkGameBtn_new');
if (newJoinNetworkBtn) {
    newJoinNetworkBtn.addEventListener('click', () => {
        document.getElementById('gameModesModal').style.display = 'none';
        const shortCode = prompt("Introduce el ID de la partida:");
        if (shortCode && shortCode.trim() !== "") {
            if (typeof logMessage === 'function') logMessage(`Intentando unirse a ${shortCode}...`);
            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            NetworkManager.unirseAPartida(shortCode.trim());
        }
    });
}

// -- Reconectar el botón de logout y el nombre del general --
const newLogoutBtn = document.getElementById('logoutBtn_main');
if (newLogoutBtn) {
    newLogoutBtn.addEventListener('click', () => {
        PlayerDataManager.logout();
        if (typeof showScreen === 'function') showScreen(domElements.loginScreen);
    });
}
const newGeneralNameDisplay = document.getElementById('currentGeneralName_main');
if (newGeneralNameDisplay && PlayerDataManager.currentPlayer) {
    newGeneralNameDisplay.textContent = PlayerDataManager.currentPlayer.username;
}

    // ======================================================================
    // 4. LÓGICA DE ARRANQUE
    // ======================================================================
    const lastUser = localStorage.getItem('lastUser');
    if (lastUser && PlayerDataManager.autoLogin(lastUser)) {
        showMainMenu();
    } else {
        showLoginScreen();
    }
    
    console.log("main.js: initApp() FINALIZADO.");
}

function isNetworkGame() {
    return NetworkManager.conn && NetworkManager.conn.open;
}

function executeConfirmedAction(action) {
    
    console.log(`%c[VIAJE-7] Cliente ${gameState.myPlayerNumber} ha recibido un 'actionBroadcast' y está dentro de executeConfirmedAction. Acción: ${action.type}`, 'color: #DAA520; font-weight: bold;', action.payload);

    if (NetworkManager.esAnfitrion && action.payload.playerId === gameState.myPlayerNumber && action.type !== 'syncGameState') {
         if (UIManager) UIManager.updateAllUIDisplays();
         return;
    }
    //console.log(`%c[VIAJE-7] Jugador ${gameState.myPlayerNumber} sincronizando acción retransmitida: ${action.type}`, 'color: #DAA520; font-weight: bold;', action.payload);
    console.log(`[Red - Sincronizando] Ejecutando acción retransmitida por anfitrión: ${action.type}`);
    const payload = action.payload;
    
    switch (action.type) {

        case 'syncGameState':
            const miNumero = gameState.myPlayerNumber; 
            Object.assign(gameState, payload.newGameState);
            gameState.myPlayerNumber = miNumero; 
            
            resetUnitsForNewTurn(gameState.currentPlayer);
            logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);

            if (UIManager) {
                UIManager.updateTurnIndicatorAndBlocker();
                UIManager.updateAllUIDisplays();
            };
            break;

        case 'placeUnit':
            // 1. Se ejecuta la acción lógica: la unidad se añade al estado del juego.
            placeFinalizedDivision(payload.unitData, payload.r, payload.c);

            // --- ¡SOLUCIÓN CLAVE Y DEFINITIVA! ---
            // 2. Apagamos el "interruptor" de colocación en esta máquina.
            //    Esto asegura que el juego vuelva a su estado normal de "seleccionar y actuar"
            //    para TODOS los jugadores, no solo para el que inició la acción.
            placementMode.active = false;
            placementMode.unitData = null;
            placementMode.recruitHex = null;
            if (UIManager) UIManager.clearHighlights();
            // --- FIN DE LA SOLUCIÓN ---
            break;

        case 'researchTech': 
            attemptToResearch(payload.techId); 
            break;

        case 'moveUnit': 

            console.log(`%c[VIAJE-8] Cliente dentro del 'case moveUnit'. Intentando encontrar la unidad con ID: ${payload.unitId}`, 'color: #DAA520; font-weight: bold;');
            const unitToMove = units.find(u => u.id === payload.unitId); 
            if (unitToMove) _executeMoveUnit(unitToMove, payload.toR, payload.toC);
            break;

        case 'attackUnit': 
            const attacker = units.find(u => u.id === payload.attackerId); 
            const defender = units.find(u => u.id === payload.defenderId); 
            if (attacker && defender) attackUnit(attacker, defender); 
            break;
            
        case 'mergeUnits': 
            const mergingUnit = units.find(u => u.id === payload.mergingUnitId); 
            const targetUnitMerge = units.find(u => u.id === payload.targetUnitId); 
            if(mergingUnit && targetUnitMerge) mergeUnits(mergingUnit, targetUnitMerge); 
            break;
        case 'splitUnit': 
            const originalUnit = units.find(u => u.id === payload.originalUnitId); 
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments }; 
            if (originalUnit) splitUnit(originalUnit, payload.targetR, payload.targetC); 
            gameState.preparingAction = null; 
            break;
        case 'pillageHex': 
            const pillager = units.find(u => u.id === payload.unitId); 
            if (pillager) { selectedUnit = pillager; handlePillageAction(); selectedUnit = null; } 
            break;
        case 'disbandUnit': 
            const unitToDisband = units.find(u => u.id === payload.unitId); 
            if (unitToDisband) handleDisbandUnit(unitToDisband); 
            break;
        case 'buildStructure': 
            handleConfirmBuildStructure(payload); 
            break;
        case 'reinforceRegiment': 
            const divisionToReinforce = units.find(u => u.id === payload.divisionId); 
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId); 
            if (divisionToReinforce && regimentToReinforce) handleReinforceRegiment(divisionToReinforce, regimentToReinforce); 
            break;

        if (UIManager && action.type !== 'syncGameState') {
            UIManager.updateAllUIDisplays();
        }
    }
    
    // Al final de CUALQUIER acción, actualizamos la UI para asegurar la consistencia visual.
    if (UIManager && action.type !== 'syncGameState') {
        UIManager.updateAllUIDisplays();
    }
}

function iniciarPartidaLAN(settings) {
    if(typeof resetGameStateVariables !== 'function' || typeof showScreen !== 'function' || typeof initializeNewGameBoardDOMAndData !== 'function'){
        console.error("Faltan funciones críticas para iniciar partida LAN.");
        return;
    }
    
    resetGameStateVariables(2); // Asumiendo que LAN es para 2 jugadores

    gameState.playerTypes = settings.playerTypes;
    gameState.playerCivilizations = settings.playerCivilizations;
    gameState.deploymentUnitLimit = settings.deploymentUnitLimit;
    gameState.turnDurationSeconds = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);
    gameState.isCampaignBattle = false;

    showScreen(domElements.gameContainer);
            if (domElements.tacticalUiContainer) {
                domElements.tacticalUiContainer.style.display = 'block';
            }
    gameState.currentPhase = "deployment";
    // CORRECCIÓN: Inicializar contador de unidades desplegadas
    gameState.unitsPlacedByPlayer = { 1: 0, 2: 0 }; 
    
    // El anfitrión es J1, el cliente es J2
    gameState.myPlayerNumber = NetworkManager.esAnfitrion ? 1 : 2;
    console.log(`[iniciarPartidaLAN] Lógica de red iniciada. Soy Jugador: ${gameState.myPlayerNumber}`);

    if (NetworkManager.esAnfitrion) {
        console.log("[Anfitrión] Generando el mapa y el estado inicial...");
        initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize);
        
        // El anfitrión crea una "fotografía" del estado del juego
        const replacer = (key, value) => (key === 'element' ? undefined : value);
        const gameStateCopy = JSON.parse(JSON.stringify(gameState, replacer));
        delete gameStateCopy.myPlayerNumber; // El cliente no necesita saber nuestra identidad

        const initialGameSetupPacket = {
            type: 'initialGameSetup',
            payload: {
                board: JSON.parse(JSON.stringify(board, replacer)),
                gameState: gameStateCopy,
                units: JSON.parse(JSON.stringify(units, replacer)),
                unitIdCounter: unitIdCounter
            }
        };

        // Y la envía al cliente
        NetworkManager.enviarDatos(initialGameSetupPacket);
        
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();
        logMessage(`¡Partida iniciada! Eres el Anfitrión (Jugador 1).`);

    } else {
        // El cliente no hace NADA. Simplemente espera la "fotografía" del anfitrión.
        logMessage("Esperando datos del anfitrión para sincronizar la partida...");
    }
}

// ========== VERSIÓN DE CÓDIGO: v3.1 - DEDUPLICACIÓN ACTIVA ==========
console.log("%c[SISTEMA] main.js v3.1 CARGADO - Sistema de deduplicación activo", "background: #00FF00; color: #000; font-weight: bold; padding: 4px;");

// Cache de deduplicación de acciones (para evitar procesar la misma acción múltiples veces)
const _processedActions = new Map(); // actionId -> timestamp
const _ACTION_CACHE_DURATION = 5000; // 5 segundos

// Limpiar cache antiguo periódicamente
setInterval(() => {
    const now = Date.now();
    for (const [actionId, timestamp] of _processedActions.entries()) {
        if (now - timestamp > _ACTION_CACHE_DURATION) {
            _processedActions.delete(actionId);
        }
    }
}, _ACTION_CACHE_DURATION);

async function processActionRequest(action) { // <<== async
    // DIAGNÓSTICO: Log explícito de la acción recibida
    console.log(`%c[processActionRequest] Acción recibida: ${action.type}`, 'background: #4169E1; color: white; font-weight: bold;');
    console.log(`  - actionId presente: ${!!action.actionId}`);
    if (action.actionId) {
        console.log(`  - actionId valor: ${action.actionId}`);
    } else {
        console.warn(`  - ⚠️ ADVERTENCIA: Esta acción NO tiene actionId, NO se puede deduplicar`);
    }
    
    // DEDUPLICACIÓN: Verificar si esta acción ya fue procesada
    if (action.actionId) {
        if (_processedActions.has(action.actionId)) {
            console.warn(`%c[DEDUPLICACIÓN] Acción duplicada detectada (${action.type}, ID: ${action.actionId}), IGNORANDO.`, 'background: #FF4500; color: white;');
            return; // Ignorar esta acción duplicada
        }
        // Registrar esta acción como procesada
        _processedActions.set(action.actionId, Date.now());
        console.log(`%c[DEDUPLICACIÓN] Acción registrada (${action.type}, ID: ${action.actionId})`, 'color: #32CD32;');
    }
    
    console.log(`%c[Anfitrión] Procesando petición de acción: ${action.type}`, 'color: #FF69B4; font-weight: bold;', action.payload);
    
    // Si la acción no es del anfitrión, la ignora para evitar que procese sus propias retransmisiones
    if (action.payload.playerId !== NetworkManager.miId && NetworkManager.esAnfitrion && action.payload.playerId !== gameState.currentPlayer) {
        // Excepción: permitimos que las acciones se procesen si son del jugador actual, independientemente de quién sea.
    }
    
    let payload = action.payload;
    let actionExecuted = false;

    // Tu switch completo con toda su lógica se mantiene intacto.
    // Solo hemos modificado ligeramente el final del case 'endTurn'.
    switch (action.type) {
        case 'endTurn':
            if (payload.playerId !== gameState.currentPlayer) {
                console.warn(`[Red - Anfitrión] RECHAZADO: Fin de turno de J${payload.playerId} pero el turno era de J${gameState.currentPlayer}.`);
                // Ya no retornamos de la función `processActionRequest`, solo salimos del switch.
                break;
            }

            console.log(`[Red - Anfitrión] Procesando fin de turno para J${payload.playerId}...`);
            
            // ¡Llamamos a la función centralizada de gameFlow.js pasándole el flag!
            handleEndTurn(true);
            
            actionExecuted = true;
            break;    

            // Se ejecuta toda tu lógica de fin de turno que cambia el estado del juego.
            const playerEndingTurn = gameState.currentPlayer;
            
            // --- INICIO DE LA LÓGICA DE JUEGO DEL FIN DE TURNO (DE TU FUNCIÓN handleEndTurn) ---
            if (gameState.currentPhase === "deployment") {
                if (gameState.currentPlayer === 1) gameState.currentPlayer = 2;
                else { gameState.currentPhase = "play"; gameState.currentPlayer = 1; gameState.turnNumber = 1; }
            } else if (gameState.currentPhase === "play") {
                updateTerritoryMetrics(playerEndingTurn);
                collectPlayerResources(playerEndingTurn); 
                handleUnitUpkeep(playerEndingTurn);
                handleHealingPhase(playerEndingTurn);
                const tradeGold = calculateTradeIncome(playerEndingTurn);
                if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;
                gameState.currentPlayer = playerEndingTurn === 1 ? 2 : 1;
                if (gameState.currentPlayer === 1) gameState.turnNumber++;
                handleBrokenUnits(gameState.currentPlayer);
                resetUnitsForNewTurn(gameState.currentPlayer);
                if (gameState.playerResources[gameState.currentPlayer]) {
                    const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5; 
                    gameState.playerResources[gameState.currentPlayer].researchPoints += baseResearchIncome;
                }
                const player = gameState.currentPlayer;
                const playerRes = gameState.playerResources[player];
                if(playerRes) {
                    let foodProducedThisTurn = 0, foodActuallyConsumed = 0, unitsSufferingAttrition = 0, unitsDestroyedByAttrition = [];
                     units.filter(u => u.player === player && u.currentHealth > 0).forEach(unit => {
                        let unitConsumption = 0;
                        (unit.regiments || []).forEach(reg => { unitConsumption += REGIMENT_TYPES[reg.type]?.foodConsumption || 0; });
                        if (isHexSupplied(unit.r, unit.c, player) && playerRes.comida >= unitConsumption) {
                            playerRes.comida -= unitConsumption;
                            foodActuallyConsumed += unitConsumption;
                        } else {
                            unit.currentHealth -= (ATTRITION_DAMAGE_PER_TURN || 1);
                            unitsSufferingAttrition++;
                            if (unit.currentHealth <= 0) unitsDestroyedByAttrition.push(unit.id);
                        }
                    });
                    unitsDestroyedByAttrition.forEach(unitId => { const unit = units.find(u => u.id === unitId); if (unit && handleUnitDestroyed) handleUnitDestroyed(unit, null); });
                }
            }
            // --- FIN DE LA LÓGICA DE JUEGO ---
            
            console.log(`[Red - Anfitrión] Retransmitiendo nuevo estado: Turno de J${gameState.currentPlayer}`);
            const replacer = (key, value) => (key === 'element' ? undefined : value);
            const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
            
            NetworkManager.enviarDatos({
                type: 'actionBroadcast',
                action: { type: 'syncGameState', payload: { newGameState: gameStateForBroadcast } }
            });
            
            actionExecuted = true;
            break;
            
        case 'attackUnit': // <<== MODIFICACIÓN IMPORTANTE AQUÍ
            const attacker = units.find(u => u.id === payload.attackerId);
            const defender = units.find(u => u.id === payload.defenderId);
            if (attacker && defender && isValidAttack(attacker, defender)) {
                await attackUnit(attacker, defender); // <<== AWAIT
                actionExecuted = true;
            }
            break;

        case 'researchTech':
            const tech = TECHNOLOGY_TREE_DATA[payload.techId];
            const playerRes = gameState.playerResources[payload.playerId];
            if (tech && playerRes && (playerRes.researchPoints || 0) >= (tech.cost.researchPoints || 0) && hasPrerequisites(playerRes.researchedTechnologies, payload.techId)) {
                attemptToResearch(payload.techId);
                actionExecuted = true;
            }
            break;
        case 'moveUnit':
            const unitToMove = units.find(u => u.id === payload.unitId);
            if (unitToMove && isValidMove(unitToMove, payload.toR, payload.toC)) {
                await _executeMoveUnit(unitToMove, payload.toR, payload.toC); // await aquí también es una buena práctica
                actionExecuted = true;
            }
            break;

        case 'mergeUnits': 
            console.log(`[DEBUG] Recibida solicitud mergeUnits:`, payload);
            
            const mergingUnit = units.find(u => u.id === payload.mergingUnitId); 
            const targetUnitMerge = units.find(u => u.id === payload.targetUnitId); 
            
            console.log(`[DEBUG] Unidades encontradas - Fusionar: ${!!mergingUnit}, Objetivo: ${!!targetUnitMerge}`);
            
            if (mergingUnit && targetUnitMerge) {
                console.log(`[DEBUG] Posiciones - Fusionar: (${mergingUnit.r}, ${mergingUnit.c}), Objetivo: (${targetUnitMerge.r}, ${targetUnitMerge.c})`);
                
                // Solo verificamos que pertenezcan al mismo jugador
                const esElMismoJugador = mergingUnit.player === payload.playerId && targetUnitMerge.player === payload.playerId;
                
                console.log(`[DEBUG] Validación - Mismo jugador: ${esElMismoJugador}`);
                
                if (esElMismoJugador) {
                    try {
                        console.log(`[DEBUG] Ejecutando mergeUnits...`);
                        
                        // Guardamos el estado de salud antes de la fusión para validar el éxito
                        const healthBefore = {
                            merging: mergingUnit.currentHealth,
                            target: targetUnitMerge.currentHealth
                        };
                        
                        // CORRECCIÓN CRÍTICA: Usar await para esperar a que mergeUnits complete
                        // la eliminación de la unidad antes de hacer el broadcast
                        await mergeUnits(mergingUnit, targetUnitMerge);
                        
                        // Si llegamos aquí sin errores, consideramos la fusión exitosa
                        // Ya no validamos por conteo de unidades, sino por ejecución sin errores
                        actionExecuted = true;
                        console.log(`[Red - Anfitrión] ✅ Fusión ejecutada exitosamente`);
                        
                        // Log adicional para debugging
                        const healthAfter = {
                            target: targetUnitMerge.currentHealth
                        };
                        console.log(`[DEBUG] Salud antes:`, healthBefore, `después:`, healthAfter);
                        
                    } catch (error) {
                        console.error(`[Red - Anfitrión] ❌ Error en mergeUnits:`, error);
                        // Solo si hay error real no marcamos como exitosa
                    }
                } else {
                    console.log(`[Red - Anfitrión] ❌ Fusión rechazada: unidades no pertenecen al jugador ${payload.playerId}`);
                    console.log(`  - mergingUnit.player: ${mergingUnit.player}`);
                    console.log(`  - targetUnitMerge.player: ${targetUnitMerge.player}`);
                }
            } else {
                console.log(`[Red - Anfitrión] ❌ Una o ambas unidades no encontradas`);
                console.log(`IDs buscados: ${payload.mergingUnitId}, ${payload.targetUnitId}`);
                console.log(`IDs disponibles:`, units.map(u => u.id));
            }
            break;
            
        case 'splitUnit': 
            const originalUnit = units.find(u => u.id === payload.originalUnitId); 
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments }; 
            if (originalUnit) {
                 splitUnit(originalUnit, payload.targetR, payload.targetC);
                 actionExecuted = true;
            }
            gameState.preparingAction = null; 
            break;
        case 'pillageHex': 
            const pillager = units.find(u => u.id === payload.unitId); 
            if(pillager) {
                selectedUnit = pillager; 
                handlePillageAction();
                selectedUnit = null;
                actionExecuted = true;
            }
            break;
        case 'disbandUnit': 
            const unitToDisband = units.find(u => u.id === payload.unitId); 
            if(unitToDisband){
                handleDisbandUnit(unitToDisband);
                actionExecuted = true;
             }
             break;

        case 'placeUnit':
            const hexToPlace = board[payload.r]?.[payload.c];
            if (hexToPlace && !hexToPlace.unit) {
                // EL ANFITRIÓN ES EL ÚNICO QUE ASIGNA EL ID
                if (payload.unitData.id === null) { 
                    payload.unitData.id = `u${unitIdCounter++}`;
                }
                placeFinalizedDivision(payload.unitData, payload.r, payload.c);
                actionExecuted = true;
            }
            break;

        case 'buildStructure': 
            const builderPlayerRes = gameState.playerResources[payload.playerId];
            const structureCost = STRUCTURE_TYPES[payload.structureType].cost;
            let canAfford = true;
            for(const res in structureCost){
                if (res !== 'Colono' && (builderPlayerRes[res] || 0) < structureCost[res]) {
                    canAfford = false;
                    break;
                }
            }
            if(canAfford){
            handleConfirmBuildStructure(payload); 
            actionExecuted = true; 
            }
            break;

        case 'reinforceRegiment': 
            const divisionToReinforce = units.find(u => u.id === payload.divisionId); 
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId); 
            if(divisionToReinforce && regimentToReinforce) {
                 handleReinforceRegiment(divisionToReinforce, regimentToReinforce);
                 actionExecuted = true;
            }
            break;

        case 'undoMove':
            const unitToUndo = units.find(u => u.id === payload.unitId);
            if (unitToUndo && unitToUndo.player === payload.playerId) {
                await undoLastUnitMove(unitToUndo);
                actionExecuted = true;
            }
            break;
        
        case 'razeStructure':
            const unitToRaze = units.find(u => u.id === payload.unitId);
            const hexToRaze = board[payload.r]?.[payload.c];
            // Validaciones básicas en el anfitrión
            if (unitToRaze && hexToRaze && !unitToRaze.hasAttacked && hexToRaze.structure) {
                _executeRazeStructure(payload);
                actionExecuted = true;
            }
            break;

        case 'exploreRuins':
            const unitToExplore = units.find(u => u.id === payload.unitId);
            const hexToExplore = board[payload.r]?.[payload.c];
            // Validaciones básicas en el anfitrión
            if (unitToExplore && hexToExplore && !unitToExplore.hasAttacked && hexToExplore.feature === 'ruins') {
                _executeExploreRuins(payload);
                actionExecuted = true;
            }
            break;

        default:
            console.warn(`[Red - Anfitrión] Recibida petición de acción desconocida: ${action.type}`);
            break;
        }

    // Si CUALQUIER acción (incluida endTurn) se ejecutó y cambió el estado...
    if (actionExecuted) {
        // ...el Anfitrión llama a su nueva función para retransmitir el ESTADO COMPLETO Y FINAL.
        // Ya no enviamos la acción, sino el resultado.
        NetworkManager.broadcastFullState();
    } else {
        // Tu log de advertencia original, que es muy útil, se mantiene.
        console.warn(`[Red - Anfitrión] La acción ${action.type} fue recibida pero no se ejecutó (probablemente por una condición inválida).`);
    }
}

function reconstruirJuegoDesdeDatos(datos) {
    try {
        // Guardamos nuestra identidad, que es lo único que nos pertenece
        const miIdentidadLocal = gameState.myPlayerNumber;

        // Limpiar el estado y el tablero local
        if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
        board = [];
        units = [];

        // Sincronizamos el estado principal (esto sobrescribe nuestra identidad temporalmente)
        Object.assign(gameState, datos.gameState);
        unitIdCounter = datos.unitIdCounter;
        
        if (miIdentidadLocal) {
            gameState.myPlayerNumber = miIdentidadLocal;
        }
        // ¡Restauramos nuestra verdadera identidad!
        gameState.myPlayerNumber = miIdentidadLocal;
        
        // Reconstruir el tablero desde los datos del anfitrión
        const boardData = datos.board;
        const boardSize = { rows: boardData.length, cols: boardData[0].length };
        domElements.gameBoard.style.width = `${boardSize.cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
        domElements.gameBoard.style.height = `${boardSize.rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;
        board = Array(boardSize.rows).fill(null).map(() => Array(boardSize.cols).fill(null));

        for (let r = 0; r < boardSize.rows; r++) {
            for (let c = 0; c < boardSize.cols; c++) {
                const hexElement = createHexDOMElementWithListener(r, c);
                domElements.gameBoard.appendChild(hexElement);
                board[r][c] = { ...boardData[r][c], element: hexElement, unit: null };
            }
        }
        
        // Reconstruir las unidades desde los datos del anfitrión
        datos.units.forEach(unitData => {
            placeFinalizedDivision(unitData, unitData.r, unitData.c);
        });

        // Refrescar toda la UI con el estado recién sincronizado
        renderFullBoardVisualState();
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();

        if (typeof initializeBoardPanning === "function") {
            initializeBoardPanning();
        } else {
            console.error("Error crítico: La función initializeBoardPanning no está disponible para el cliente.");
        }

        // CORRECCIÓN: Deseleccionar la unidad para evitar referencias obsoletas
        // Esto soluciona el problema donde el cliente no puede mover después de atacar
        // y el botón de "siguiente unidad" no aparece
        if (typeof deselectUnit === 'function') {
            deselectUnit();
        }

        logMessage("¡Sincronización con el anfitrión completada! La partida está lista.");

    } catch (error) {
        console.error("Error crítico al reconstruir el juego en el cliente:", error);
        logMessage("Error: No se pudo sincronizar la partida con el anfitrión.", "error");
    }
    /*
    // ===================================================================
    // == LÓGICA DE CIERRE DE PANEL AL HACER CLIC FUERA ==================
    // ===================================================================
    document.body.addEventListener('click', (event) => {
        // Obtenemos los elementos en el momento del clic
        const infoPanel = document.getElementById('contextualInfoPanel');
        const tacticalUI = document.getElementById('tactical-ui-container');

        // Si el panel de información no está visible, no hacemos nada.
        if (!infoPanel || !infoPanel.classList.contains('visible')) {
            return;
        }

        // CONDICIONES PARA NO CERRAR EL PANEL:
        // 1. Si el clic fue DENTRO del propio panel.
        // 2. Si el clic fue en uno de los botones de acción flotantes.
        if (infoPanel.contains(event.target) || (tacticalUI && tacticalUI.contains(event.target))) {
            return; // No hacer nada, fue un clic en la UI.
        }

        // Si el clic fue en cualquier otra parte (un hexágono, un espacio vacío)...
        console.log("Clic fuera de la UI. Cerrando panel contextual.");
        infoPanel.classList.remove('visible');
        if (typeof deselectUnit === 'function') {
            deselectUnit(); // Deseleccionamos todo
        }
    }, false); // El 'true' es importante, asegura que este listener se ejecute primero
    */
}

document.addEventListener('DOMContentLoaded', initApp);