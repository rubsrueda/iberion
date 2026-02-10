// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {

    // === BIFURCACIÓN: MODO EDITOR ===
    // Si estamos en modo editor, delegar al manejador del editor y salir temprano
    if (typeof EditorState !== 'undefined' && EditorState.isEditorMode) {
        if (typeof handleEditorHexClick === 'function') {
            handleEditorHexClick(r, c);
        } else {
            console.error('[Main] handleEditorHexClick no está definido');
        }
        return; // Salir - no ejecutar lógica de juego
    }

    // === GUARDIÁN: MODO PAINT ACTIVO ===
    // Si el sistema de movimiento automático está en modo paint, no procesar clics
    if (typeof AutoMoveManager !== 'undefined' && AutoMoveManager.isPaintModeActive) {
        return; // El AutoMoveManager manejará el clic
    }

    // Obtenemos los datos del hexágono en el que se hizo clic.
    const hexDataClicked = board[r]?.[c];

    if (gameState.isTutorialActive) {
        gameState.tutorial.map_clicked = true;
    }

    // Cerrar menú radial solo si se hizo clic fuera de un botón radial
    const radialContainer = document.getElementById('radialMenuContainer');
    if (radialContainer && radialContainer.style.display === 'block') {
        const rect = radialContainer.getBoundingClientRect();
        // Obtener coordenadas del clic en pantalla
        const clickX = event ? event.clientX : 0;
        const clickY = event ? event.clientY : 0;
        const distFromCenter = Math.sqrt(
            Math.pow(clickX - (rect.left + rect.width / 2), 2) + 
            Math.pow(clickY - (rect.top + rect.height / 2), 2)
        );
        // Solo cerrar si el clic está lejos del menú radial
        if (distFromCenter > rect.width) {
            if (typeof UIManager !== 'undefined' && UIManager.hideRadialMenu) {
                UIManager.hideRadialMenu();
            }
        }
    }

    // Si se hace clic en la ciudad de La Banca, abrir el modal de comercio y detener todo lo demás.
    // EXCEPCIÓN: No abrir la banca en modo Raid
    if (hexDataClicked && hexDataClicked.owner === BankManager.PLAYER_ID && !gameState.isRaid) {
        if (typeof openBankModal === 'function') {
            logMessage("Accediendo al Mercado de La Banca...");
            openBankModal();
        } else {
            console.error("La función openBankModal no está definida.");
        }
        return; // Detiene la ejecución para no seleccionar la "unidad" o el hexágono.
    }
   
    // --- GUARDIÁN DE TURNO LÓGICO ---
    // Este bloque es el primero que se ejecuta. Si es una partida en red
    // y no es tu turno, muestra un mensaje y detiene toda la función.
    // Esto impide que el jugador inactivo pueda realizar CUALQUIER acción.
    // La nueva lógica
    const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;
    if (isNetworkGame() && !isMyTurn && gameState.currentPhase !== 'deployment') {
        const unitOnHex = getUnitOnHex(r, c);
        // Permite la selección de unidades propias fuera de turno para inspección, pero bloquea otras acciones.
        if (!unitOnHex || unitOnHex.player !== gameState.myPlayerNumber) {
            logMessage(`Es el turno del Jugador ${gameState.currentPlayer}.`);
            return;
        }
    }
    
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
    
    
    if (!hexDataClicked) return;
    
    // Obtenemos la unidad que pueda estar en ese hexágono.
    const clickedUnit = getUnitOnHex(r, c);
    
    // --- LÓGICA DE SELECCIÓN Y ACCIÓN ---
    // Este es el corazón de la interacción del jugador durante su turno.

    // CASO 1: YA tienes una unidad seleccionada (selectedUnit existe).
    if (selectedUnit) {
        // Ya hay una unidad seleccionada, intentamos realizar una acción.
        const actionTaken = handleActionWithSelectedUnit(r, c, clickedUnit);

        // Si NO se tomó ninguna acción (ej: clic en un lugar inválido),
        // deseleccionamos la actual y procesamos el nuevo clic.
        if (!actionTaken) {
            deselectUnit(); // Esto también oculta los paneles
            if (clickedUnit) {
                selectUnit(clickedUnit); // Selecciona la nueva unidad
            } else {
                UIManager.showHexContextualInfo(r, c, hexDataClicked);
            }
        }
    } else {
        // No había nada seleccionado, así que seleccionamos lo que haya en el hexágono.
        if (clickedUnit) {
            selectUnit(clickedUnit);
        } else {
            UIManager.showHexContextualInfo(r, c, hexDataClicked);
        }
    }
}

function showScreen(screenElement) {

    // Oculta TODAS las pantallas EXCEPTO mainMenuScreen cuando sea necesario
    document.querySelectorAll('.modal, .modal-overlay').forEach(el => {
        if (el.classList.contains('modal-overlay')) {
            if (el !== screenElement) {
                el.classList.remove('active');
                el.style.setProperty('display', 'none');
            }
        } else if (!el.classList.contains('no-auto-hide') && !el.classList.contains('no-close-on-click')) {
            el.style.setProperty('display', 'none');
        } else if (el.id === 'mainMenuScreen' && screenElement?.id !== 'mainMenuScreen') {
            // Si mainMenuScreen tiene la clase no-close-on-click pero NO es la pantalla que queremos mostrar, ocúltala
            el.style.setProperty('display', 'none');
        }
    });
    
    // Forzar ocultar el login específicamente para evitar z-index issues
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && screenElement?.id !== 'loginScreen') {
        loginScreen.style.setProperty('display', 'none');
        loginScreen.style.setProperty('z-index', '2000');
    }

    // CRÍTICO: Ocultar gameContainer cuando se muestra cualquier otra pantalla (excepto si gameContainer es lo que se intenta mostrar)
    const gameContainer = document.querySelector('.game-container');
    if (screenElement && screenElement.id !== 'gameContainer' && !screenElement.classList.contains('game-container')) {
        if (gameContainer) {
            gameContainer.style.setProperty('display', 'none', 'important');
        }
    }

    // CRÍTICO: Si se muestra el gameContainer (que no es un .modal), ocultar explícitamente el mainMenuScreen
    // Esto es ESENCIAL para evitar que el menú quede visible debajo del mapa después de inactividad o refresh
    if (screenElement && (screenElement.id === 'gameContainer' || screenElement.classList.contains('game-container'))) {
        const mainMenu = document.getElementById('mainMenuScreen');
        if (mainMenu) {
            mainMenu.style.setProperty('display', 'none', 'important');
            mainMenu.style.setProperty('visibility', 'hidden', 'important');
            mainMenu.style.setProperty('pointer-events', 'none', 'important');
        }
    }

    // Muestra la pantalla solicitada
    if (screenElement) {
        if (screenElement.classList.contains('modal-overlay')) {
            screenElement.classList.add('active');
            screenElement.style.setProperty('display', 'flex');
        } else {
            screenElement.style.setProperty('display', 'flex');
            // Asegurar que la pantalla mostrada tenga un z-index apropiado
            if (screenElement.id === 'mainMenuScreen') {
                screenElement.style.setProperty('z-index', '900');
            }
        }
    }
}

// ======================================================================
// 2. LÓGICA DE CUENTAS DE USUARIO
// ======================================================================

const showMainMenu = () => {
    // Reset the login screen flag to allow showing it again if needed
    window.loginScreenShown = false;
    
    if (PlayerDataManager.currentPlayer) {
        const newGeneralNameDisplay = document.getElementById('currentGeneralName_main');
        if (newGeneralNameDisplay) newGeneralNameDisplay.textContent = PlayerDataManager.currentPlayer.username;
        if (domElements.currentGeneralName) domElements.currentGeneralName.textContent = PlayerDataManager.currentPlayer.username;
    }
    if (typeof AudioManager !== 'undefined') {
        AudioManager.playMusic('menu_theme');
    }

    // Asegurarse de ocultar explícitamente la pantalla de login
    if (domElements.loginScreen) {
        domElements.loginScreen.style.setProperty('display', 'none');
    }

    // Forzamos que se muestre directamente el nuevo menú principal
    showScreen(domElements.mainMenuScreenEl);
};

const showLoginScreen = () => {
    // Prevenir mostrar login múltiples veces
    const loginEl = domElements.loginScreen || document.getElementById('loginScreen');
    const isLoginVisible = loginEl && window.getComputedStyle(loginEl).display !== 'none';
    if (window.loginScreenShown && isLoginVisible) {
        return;
    }
    window.loginScreenShown = true;
    
    showScreen(domElements.loginScreen);
    const lastUser = localStorage.getItem('lastUser');
    
    // Usamos un pequeño retraso y comprobamos que los elementos existan
    setTimeout(() => {
        // Intentamos obtener los elementos directamente si domElements falla
        const userInp = domElements.usernameInput || document.getElementById('loginEmail');
        const passInp = domElements.passwordInput || document.getElementById('loginPassword');

        if (userInp) {
            if (lastUser) userInp.value = lastUser;
            userInp.focus();
        }
        // Si el usuario ya estaba puesto, enfocamos la contraseña
        if (lastUser && passInp) {
            passInp.focus();
        }
    }, 200); // 200ms es suficiente para que el DOM se estabilice
};

function initApp() {

    // <<== DETECCIÓN DE DEEP LINK PARA REPLAYS ==>>
    // Si hay parámetro ?replay=TOKEN, cargar ese replay sin necesidad de ser el dueño
    const urlParams = new URLSearchParams(window.location.search);
    const replayToken = urlParams.get('replay');
    
    if (replayToken) {
        // Guardar el token para procesarlo después de autenticación
        sessionStorage.setItem('pendingReplayToken', replayToken);
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Aviso legal y cookies
    const accepted = localStorage.getItem('terms_accepted');
    if (!accepted) {
        document.getElementById('legalModal').style.display = 'flex';
        document.getElementById('acceptLegalBtn').onclick = () => {
            localStorage.setItem('terms_accepted', 'true');
            document.getElementById('legalModal').style.display = 'none';
            // Aquí continuaríamos con la carga normal si estuviera pausada
        };
    }
    
    // --- 1. ACTIVAR WAKE LOCK (NUEVO) ---
    // Esto evita que el móvil apague la pantalla y mate la conexión.
    if (typeof enableMobileWakeLock === "function") {
        enableMobileWakeLock(); 
    }

    // 1. JUGADOR NUEVO (Va directo al Tutorial)
    const newPlayerBtn = document.getElementById('newPlayerDirectBtn');
    
    if (newPlayerBtn) {
        // Aseguramos que el botón no tenga listeners antiguos
        const newBtn = newPlayerBtn.cloneNode(true);
        newPlayerBtn.parentNode.replaceChild(newBtn, newPlayerBtn);
        
        newBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevenir comportamientos por defecto

            try {
                // Ocultar Login inmediatamente
                const loginScreen = document.getElementById('loginScreen');
                if (loginScreen) loginScreen.style.display = 'none';

                // --- GESTIÓN DE JUGADOR ---
                // Si no hay jugador logueado, crear invitado
                if (!PlayerDataManager.currentPlayer) {
                    PlayerDataManager.currentPlayer = PlayerDataManager.createNewPlayer("Recluta", "tutorial");
                    // ID especial para que no guarde en DB real
                    PlayerDataManager.currentPlayer.auth_id = "temp_guest_id";
                }
                gameState.myPlayerNumber = 1; // Asignar jugador local

                // --- RESET DE JUEGO ---
                if (typeof resetGameStateVariables === 'function') {
                    resetGameStateVariables(2, Infinity, 'development');
                } else {
                    console.error("ERROR CRÍTICO: resetGameStateVariables no existe.");
                }

                // Configuración
                gameState.playerCivilizations[2] = 'Roma';
                gameState.playerCivilizations[1] = 'Iberia';

                // --- CARGA DE MAPA Y DATOS ---
                if (!GAME_DATA_REGISTRY || !GAME_DATA_REGISTRY.scenarios) {
                    throw new Error("GAME_DATA_REGISTRY no está cargado.");
                }

                const tutorialScenario = GAME_DATA_REGISTRY.scenarios["TUTORIAL_SCENARIO"];
                if (!tutorialScenario) throw new Error("Escenario Tutorial no encontrado en registro.");

                const tutorialMap = GAME_DATA_REGISTRY.maps[tutorialScenario.mapFile];
                
                // Preparar Tablero
                if(typeof resetAndSetupTacticalGame === 'function') {
                    await resetAndSetupTacticalGame(tutorialScenario, tutorialMap, "tutorial");
                }

                // Iniciar Tutorial
                if(typeof initializeTutorialState === 'function') initializeTutorialState();
                
                gameState.currentPhase = "deployment";
                
                // Mostrar pantalla de juego
                showScreen(domElements.gameContainer); // Asegura que domElements esté cargado
                if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';

                // ARRANCAR SCRIPT
                TutorialManager.start(TUTORIAL_SCRIPTS.completo);

            } catch (err) {
                console.error("❌ ERROR AL INICIAR TUTORIAL:", err);
                alert("Error al iniciar tutorial: " + err.message);
                // Si falla, volvemos a mostrar login para que no se quede pantalla negra
                document.getElementById('loginScreen').style.display = 'flex';
            }
        });
    } else {
        console.error("⛔ Botón 'newPlayerDirectBtn' NO ENCONTRADO en el DOM.");
    }

    // 2. LOGIN GOOGLE
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            PlayerDataManager.loginWithGoogle();
        });
    }

    // 3. LOGIN FACEBOOK (Nuevo)
    const facebookBtn = document.getElementById('facebookLoginBtn');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', async () => {
            // Requiere que "Facebook" esté activado en el panel de Supabase Auth
            await supabaseClient.auth.signInWithOAuth({
                provider: 'facebook',
                options: { redirectTo: window.location.origin }
            });
        });
    }

    // ACTIVAMOS EL ESCUCHADOR DE SUPABASE (solo se inicializa una vez gracias al flag)
    if (PlayerDataManager.initAuthListener) {
        PlayerDataManager.initAuthListener();
    }

    if (typeof TurnTimerManager !== 'undefined') TurnTimerManager.init();
    // Precargar todos los sonidos al iniciar la aplicación
    if (typeof AudioManager !== 'undefined' && AudioManager.preload) {
        AudioManager.preload();
    }

    //conexiones 
    document.addEventListener("visibilitychange", async () => {
        // Cuando el usuario vuelve a la pestaña o desbloquea el móvil
        if (document.visibilityState === "visible") {
            console.log("⚡ [Sistema] Regreso detectado (Wake Up). Verificando integridad...");
            
            // Habilitar Wake Lock de nuevo
            if(typeof enableMobileWakeLock === 'function') enableMobileWakeLock();

            // CRÍTICO: Si estamos en una partida en red, asegurarse que el juego esté visible
            // y que el menú principal no bloquee la interfaz
            if (gameState && gameState.currentPhase && gameState.currentPhase !== 'gameOver') {
                console.log("🎮 Partida activa detectada. Mostrando interfaz de juego después de inactividad...");
                
                // Forzar ocultación BRUTAL del mainMenuScreen primero
                const mainMenu = document.getElementById('mainMenuScreen');
                if (mainMenu) {
                    mainMenu.style.setProperty('display', 'none', 'important');
                    mainMenu.style.setProperty('visibility', 'hidden', 'important');
                    mainMenu.style.setProperty('pointer-events', 'none', 'important');
                    mainMenu.style.setProperty('z-index', '0', 'important');
                    console.log("🚀 [Visibilidad] mainMenuScreen ocultado forzadamente después de regreso.");
                }
                
                // Mostrar gameContainer con z-index alto
                const gameContainer = document.querySelector('.game-container') || domElements.gameContainer;
                if (gameContainer) {
                    gameContainer.style.setProperty('display', 'flex', 'important');
                    gameContainer.style.setProperty('z-index', '100', 'important');
                    gameContainer.style.setProperty('visibility', 'visible', 'important');
                    console.log("🎮 [Visibilidad] gameContainer mostrado con z-index elevado.");
                }
                
                // Mostrar UI táctica
                const tacticalUI = document.getElementById('tactical-ui-container') || domElements.tacticalUiContainer;
                if (tacticalUI) {
                    tacticalUI.style.setProperty('display', 'block', 'important');
                    console.log("📊 [Visibilidad] UI táctica mostrada.");
                }
                
                // Usar showScreen() como backup para asegurar que se manejen correctamente todos los z-index
                if (typeof showScreen === 'function' && domElements.gameContainer) {
                    setTimeout(() => {
                        showScreen(domElements.gameContainer);
                        console.log("✅ [Visibilidad] showScreen ejecutado después de inactividad.");
                    }, 100); // Pequeño delay para asegurar que DOM está listo
                }
            }

            // 1. ¿Estábamos en una partida Online?
            // Obtenemos el ID limpio sin prefijo 'hge-'
            const rawId = NetworkManager.miId || NetworkManager.idRemoto;
            if (!rawId) return; // No hay partida activa

            const gameCode = rawId.replace(GAME_ID_PREFIX, '');
            
            // 2. ¿Está el P2P muerto?
            const isP2PDead = !NetworkManager.conn || !NetworkManager.conn.open;

            if (isP2PDead) {
                console.warn("⚠️ [Red] Conexión P2P caída. Iniciando recuperación híbrida...");
                if(typeof showToast === 'function') showToast("Reconectando sesión...", "warning");

                // ESTRATEGIA A: Intentar bajar el estado de la base de datos INMEDIATAMENTE
                // Esto permite seguir jugando o ver qué pasó mientras el P2P se arregla
                const recovered = await NetworkManager.cargarPartidaDeNube(gameCode);
                
                // ESTRATEGIA B: Reiniciar la conexión P2P silenciosamente en segundo plano
                console.log("🔄 Re-iniciando enlace P2P...");
                if (!NetworkManager.esAnfitrion) {
                    // Cliente: Se vuelve a unir
                    NetworkManager.unirseAPartida(gameCode);
                } else {
                    // Anfitrión: Es más complejo, generalmente espera a que el cliente vuelva, 
                    // pero si el anfitrión se cayó, debe reiniciar su Peer.
                    if (!NetworkManager.peer || NetworkManager.peer.destroyed) {
                    // Lógica para revivir host si fuera necesario (opcional)
                    // En peerjs reiniciar el mismo ID de host es difícil si no se destruyó bien,
                    // pero normalmente el anfitrión se queda en la pantalla.
                    console.log("El Anfitrión sigue activo localmente. Esperando reconexión del cliente.");
                    }
                }

            } else {
                // Si el P2P parece vivo, mandamos un ping para asegurarnos
                console.log("ℹ️ [Red] P2P parece activo. Enviando Ping de seguridad.");
                try {
                    NetworkManager.conn.send({ type: 'HEARTBEAT' });
                    // Aprovechamos para chequear la nube por si acaso el P2P se quedó "zombie"
                    // (conectado pero sin transmitir datos reales)
                    await NetworkManager.cargarPartidaDeNube(gameCode);
                } catch (e) {
                    console.log("❌ Ping fallido. Forzando reconexión.");
                    if (!NetworkManager.esAnfitrion) NetworkManager.unirseAPartida(gameCode);
                }
            }
        }
    });

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

    // === INICIALIZAR SISTEMA DE MOVIMIENTO AUTOMÁTICO ===
    if (typeof AutoMoveManager !== 'undefined' && AutoMoveManager.init) {
        AutoMoveManager.init();
    } else {
        console.warn("[Main] AutoMoveManager no está disponible");
    }
    
    // === INICIALIZAR SISTEMA DE INVESTIGACIÓN AUTOMÁTICA ===
    if (typeof AutoResearchManager !== 'undefined' && AutoResearchManager.init) {
        AutoResearchManager.init();
    } else {
        console.warn("[Main] AutoResearchManager no está disponible");
    }
    
    // === INICIALIZAR SISTEMA DE RECOMPENSAS DE INVESTIGACIÓN ===
    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.init) {
        ResearchRewardsManager.init();
    } else {
        console.warn("[Main] ResearchRewardsManager no está disponible");
    }

    if (typeof addModalEventListeners === "function") { addModalEventListeners(); } 
    else { console.error("main.js: CRÍTICO: addModalEventListeners no está definida."); }
    
    if (typeof UIManager !== 'undefined' && UIManager.setDomElements) { UIManager.setDomElements(domElements); } 
    else { console.error("main.js: CRÍTICO: UIManager no definido."); }
    
    if (typeof InventoryManager !== 'undefined') InventoryManager.init();

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
            infoPanel.classList.remove('visible');
            if (reopenInfoBtn) reopenInfoBtn.style.display = 'block';
        });
    }

    if (tutorialPanel && closeTutorialBtn) {
        closeTutorialBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tutorialPanel.classList.remove('visible');
            if (reopenInfoBtn) reopenInfoBtn.style.display = 'block';
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
        
    if (domElements.loginBtn) {
        domElements.loginBtn.addEventListener('click', async () => { // Añade async
            domElements.loginErrorMessage.textContent = "Conectando...";
            const username = domElements.usernameInput.value;
            const password = domElements.passwordInput.value;
            
            // Añade el await aquí:
            const result = await PlayerDataManager.login(username, password);
            
            if (result.success) {
                domElements.loginErrorMessage.textContent = result.message || "Iniciando sesión...";
                // El auth listener se encargará de cerrar login y mostrar el menú
                return;
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
    

    
    // 1. Abrir Pase de Batalla desde el Perfil
    const bpBtnProfile = document.getElementById('openBattlePassProfileBtn');
    if (bpBtnProfile) {
        bpBtnProfile.addEventListener('click', () => {
            if (typeof BattlePassManager !== 'undefined') {
                // Cerramos perfil temporalmente para ver mejor el pase? 
                // O mejor lo mostramos encima (el pase tiene z-index alto)
                BattlePassManager.open();
            } else {
                console.error("BattlePassManager no está definido.");
            }
        });
    }

    // 2. Corrección del botón cerrar perfil (le puse ID en el HTML nuevo para ser más limpio)
    const closeProfile = document.getElementById('closeProfileBtn');
    if (closeProfile) {
        closeProfile.addEventListener('click', () => {
             document.getElementById('profileModal').style.display = 'none';
        });
    }
    
    // Listener del Buzón
    if (domElements.floatingInboxBtn) {
        domElements.floatingInboxBtn.addEventListener('click', (event) => {
            
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
    // (Se gestiona más abajo junto al resto de botones para evitar duplicados)

    // Guardar Partida (Nuevo botón)
    const saveGameBtnTop = document.getElementById('saveGameBtn_top');
    if (saveGameBtnTop) {
        saveGameBtnTop.addEventListener('click', () => { 
            if (typeof handleSaveGame === "function") handleSaveGame();
        }); 
    }

    // Cargar Partida (Nuevo input)
    const loadBtnTop = document.getElementById('loadGameBtn_top'); // Asegúrate de que el ID en el HTML sea un botón, no un label
    if (loadBtnTop) {
        loadBtnTop.onclick = () => handleLoadGame();
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

    if (domElements.importProfileInput && !domElements.importProfileInput.hasListener) {
        domElements.importProfileInput.addEventListener('change', (event) => {
            importProfile(event);
        });
        domElements.importProfileInput.hasListener = true;
    }

    if (domElements.exportProfileBtn_float && !domElements.exportProfileBtn_float.hasListener) {
        domElements.exportProfileBtn_float.addEventListener('click', () => {
            exportProfile();
        });
        domElements.exportProfileBtn_float.hasListener = true;
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
   
    // Configuración de Audio - SE CARGA Y APLICA ANTES DE HACER NADA
    if (typeof AudioManager !== 'undefined' && AudioManager.preload) {
        AudioManager.preload();
        
        // --- LLAMAR LA FUNCIÓN UNIFICADA PARA CARGAR Y APLICAR SETTINGS ---
        // Esta función maneja localStorage, perfil Supabase y fallbacks
        if (typeof loadAndApplySettings === 'function') {
            loadAndApplySettings();
        } else {
            // Fallback por si la función no está lista
            const savedSettings = JSON.parse(localStorage.getItem('iberion_settings'));
            if (savedSettings) {
                AudioManager.setVolume(
                    savedSettings.music ? 0.3 : 0, 
                    savedSettings.sfx ? 0.7 : 0
                );
            } else {
                AudioManager.setVolume(0.3, 0.7);
            }
        }
    }

    // ======================================================================    
    //Juego en red   
    // ====================================================================== 

    function onConexionLANEstablecida(idRemoto) {
        if (NetworkManager.esAnfitrion) {
            if (domElements.hostStatusEl) {
                domElements.hostStatusEl.textContent = 'Jugador Conectado. Iniciando...';
                domElements.hostStatusEl.className = 'status conectado';
            }
            if (domElements.hostPlayerListEl) {
                domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li><li>J2: Cliente Conectado</li>`;
            }
            
            
            // Recuperamos los settings que guardamos.
            const gameSettings = gameState.networkGameSettings;

            if (!gameSettings) {
                console.error("¡ERROR CRÍTICO! No se encontraron los gameSettings para iniciar la partida en red.");
                alert("Error al iniciar la partida. Vuelve a intentarlo.");
                return;
            }
            
            // 1. Enviamos la orden de iniciar con los settings.
            const dataPacket = { type: 'startGame', settings: gameSettings };
            NetworkManager.enviarDatos(dataPacket);
            
            // 2. Esperamos un poco y luego iniciamos la partida para nosotros.
            // Este retraso da tiempo al cliente a prepararse.
            setTimeout(() => { 
                iniciarPartidaLAN(gameSettings); 
            }, 500);

        } else {
        }
    }

    function onDatosLANRecibidos(datos) {
        // ... (Tu función onDatosLANRecibidos no necesita cambios, la puedes dejar como está)
        // ... Te la pongo aquí para que la tengas completa si la borraste.
        if (datos.type === 'actionRequest' && datos.action?.type === 'moveUnit') {
            const soyAnfitrion = NetworkManager.esAnfitrion;
        }
        
            // Lógica del Cliente (cuando NO es anfitrión)
        if (!NetworkManager.esAnfitrion) { // Lógica del Cliente
            switch (datos.type) {
                case 'startGame':
                    // Esto es para la configuración inicial, antes de que el tablero exista
                    iniciarPartidaLAN(datos.settings);
                    break;
                
                case 'fullStateUpdate':
                case 'initialGameSetup':
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                default:
                    console.warn(`[Cliente] Recibido paquete desconocido del anfitrión: '${datos.type}'.`);
                    break;
            }
        } else {
            if (datos.type === 'actionRequest') {
                processActionRequest(datos.action);
            } else {
                console.warn(`[Anfitrión] Recibido paquete desconocido del cliente: '${datos.type}'.`);
            }
        }
    }

    function onConexionLANCerrada() {
        // ... (Tu función onConexionLANCerrada no necesita cambios, la puedes dejar como está)
        alert("El otro jugador se ha desconectado.");
        showScreen(domElements.mainMenuScreenEl); // Simplificado para volver al menú
    }

    // 1. Botón para que el CLIENTE se una a una partida
    if (domElements.joinNetworkGameBtn && !domElements.joinNetworkGameBtn.hasListener) {
        domElements.joinNetworkGameBtn.addEventListener('click', () => {
            const shortCode = prompt("Introduce el ID de la partida:");
            if (shortCode && shortCode.trim() !== "") {
                logMessage(`Intentando unirse a ${shortCode}...`);
                NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
                NetworkManager.unirseAPartida(shortCode.trim());
            } else if (shortCode !== null) {
                alert("Código inválido.");
            }
        });
        domElements.joinNetworkGameBtn.hasListener = true;
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
                gameMode: document.getElementById('gameModeSelect')?.value || 'development',
                resourceLevel: domElements.resourceLevelSelect.value,
                boardSize: domElements.boardSizeSelect.value,
                turnTime: document.getElementById('turnTimeSelect')?.value || '180',
                barbarianDensity: document.getElementById('barbarianDensity')?.value || 'med',
                victoryByPoints: (document.getElementById('victoryByPoints')?.value || 'enabled') === 'enabled',
                navalMap: domElements.boardSizeSelect.value === 'large' && document.getElementById('navalMapCheckbox')?.checked,
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
            
            // 4. Iniciar la partida en nuestra propia máquina con la misma configuración
            iniciarPartidaLAN(gameSettings);
        });
    }
    
    // --- BOTÓN CREAR PARTIDA (HOST) ---
    const btnCrear = document.getElementById('createNetworkGameBtn');   
    if (btnCrear) {
        const nuevoBtn = btnCrear.cloneNode(true);
        btnCrear.parentNode.replaceChild(nuevoBtn, btnCrear);
        
        nuevoBtn.addEventListener('click', async () => {
            
            // VERIFICACIÓN CRÍTICA: El usuario DEBE estar autenticado para jugar en red
            if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
                alert("⚠️ Debes iniciar sesión para crear una partida en línea.");
                if (typeof showLoginScreen === 'function') {
                    showLoginScreen();
                }
                return;
            }
            
            // 1. RECUPERAR CONFIGURACIÓN REAL (De la memoria o del HTML)
            let settings = gameState.setupTempSettings;
            
            // Si falló la memoria, leer de los selectores HTML
            if (!settings) {
                settings = {
                    boardSize: document.getElementById('boardSizeSelect')?.value || 'small',
                    resourceLevel: document.getElementById('resourceLevel')?.value || 'med',
                    unitLimit: document.getElementById('initialUnitsCount')?.value || '5',
                    turnTime: document.getElementById('turnTimeSelect')?.value || '180',
                    numPlayers: parseInt(document.getElementById('num-players-slider')?.value) || 2,
                    gameMode: document.getElementById('gameModeSelect')?.value || 'development',
                    barbarianDensity: document.getElementById('barbarianDensity')?.value || 'med',
                    victoryByPoints: (document.getElementById('victoryByPoints')?.value || 'enabled') === 'enabled',
                    navalMap: (document.getElementById('boardSizeSelect')?.value === 'large') && document.getElementById('navalMapCheckbox')?.checked
                };
            }

            // 2. INICIALIZAR EL ESTADO DEL JUEGO (Aquí se cargan los recursos de constants.js)
            if (typeof resetGameStateVariables === 'function') {
                const turnTime = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);
                const gameMode = settings.gameMode || 'development';
                
                // ¡ESTA ES LA LÍNEA CLAVE QUE FALTABA! PASAMOS gameMode COMO PARÁMETRO
                resetGameStateVariables(settings.numPlayers, turnTime, gameMode);
                
                // Configurar detalles específicos
                gameState.deploymentUnitLimit = settings.unitLimit === "unlimited" ? Infinity : parseInt(settings.unitLimit);
                if (gameState.gameMode === 'invasion') {
                    gameState.deploymentUnitLimitByPlayer = {
                        1: INVASION_MODE_CONFIG.ATTACKER_DEPLOYMENT_UNIT_LIMIT
                    };
                } else {
                    gameState.deploymentUnitLimitByPlayer = null;
                }
                gameState.victoryByPointsEnabled = settings.victoryByPoints ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
                gameState.myPlayerNumber = 1; 
                gameState.currentPhase = "deployment"; // Asegurar fase
                if (!gameState.setupTempSettings) gameState.setupTempSettings = {};
                gameState.setupTempSettings.barbarianDensity = settings.barbarianDensity || 'med';
                gameState.setupTempSettings.navalMap = settings.navalMap || false;
                
                // Leer Civilizaciones y Tipos de la Pantalla 2
                const playerTypes = {};
                const playerCivilizations = {};
                for (let i = 1; i <= settings.numPlayers; i++) {
                    const civEl = document.getElementById(`player${i}Civ`);
                    const typeEl = document.getElementById(`player${i}TypeSelect`);
                    if (civEl && typeEl) {
                        playerCivilizations[i] = civEl.value;
                        playerTypes[`player${i}`] = typeEl.value;
                    }
                }
                gameState.playerCivilizations = playerCivilizations;
                gameState.playerTypes = playerTypes;

            } else {
                console.error("CRÍTICO: resetGameStateVariables no está definida.");
                return;
            }
            
            // 3. GENERAR EL MAPA VISUAL Y DE DATOS
            if (typeof initializeNewGameBoardDOMAndData === 'function') {
                initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize, settings.navalMap || false, settings.gameMode || 'development');
            }

            // 4. SUBIR A LA NUBE (Ahora subirá el estado perfecto que acabamos de crear)
            const gameId = await NetworkManager.crearPartidaEnNube();
            
            if (gameId) {
                // Mostrar Lobby
                const lobby = document.getElementById('hostLobbyScreen');
                const codeSpan = document.getElementById('short-game-code');
                const list = document.getElementById('host-player-list');
                
                if (codeSpan) codeSpan.textContent = gameId;
                if (list) list.innerHTML = `<li>Esperando oponente...</li>`;
                
                showScreen(lobby);
            }
        });
    }

    // --- BOTÓN UNIRSE (CLIENTE) ---
    const btnUnirse = document.getElementById('joinNetworkGameBtn');
    if (btnUnirse) {
        const nuevoBtn = btnUnirse.cloneNode(true);
        btnUnirse.parentNode.replaceChild(nuevoBtn, btnUnirse);
        
        nuevoBtn.addEventListener('click', async () => {
            
            // VERIFICACIÓN CRÍTICA: El usuario DEBE estar autenticado para jugar en red
            if (!PlayerDataManager.currentPlayer || !PlayerDataManager.currentPlayer.auth_id) {
                alert("⚠️ Debes iniciar sesión para unirte a una partida en línea.");
                if (typeof showLoginScreen === 'function') {
                    showLoginScreen();
                }
                return;
            }
            
            const codigo = prompt("Introduce el Código de 4 letras:");
            if (!codigo) return;

            // LLAMADA DIRECTA A LA NUBE
            const exito = await NetworkManager.unirsePartidaEnNube(codigo);
            
            if (exito) {
                showScreen(document.querySelector('.game-container'));
                if (document.getElementById('tactical-ui-container')) {
                    document.getElementById('tactical-ui-container').style.display = 'block';
                }
            }
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
            if (selectedUnit) {
                hexToBuildOn = { r: selectedUnit.r, c: selectedUnit.c };
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

        // audio
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playMusic('battle_theme');
        }
        
        domElements.startLocalGameBtn.addEventListener('click', () => { 
            
            //1.  Reutilizamos la configuración temporal guardada por el botón "Siguiente"
            const settings = gameState.setupTempSettings || {};
            const numPlayers = settings.numPlayers || 2;

            // 2. Convertimos la duración del turno aquí
            const turnDuration = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);

            // 3. CAPTURAR MODO DE JUEGO ANTES DEL RESET
            const gameModeSelect = document.getElementById('gameModeSelect');
            const gameMode = gameModeSelect ? gameModeSelect.value : 'development';

            // 4. Resetear el estado del juego (AHORA PASANDO GAME MODE COMO PARÁMETRO)
            if (typeof resetGameStateVariables === "function") {
                resetGameStateVariables(numPlayers, turnDuration, gameMode);
                gameState.myPlayerNumber = 1;
            } else {
                console.error("main.js: resetGameStateVariables no definida.");
                return;
            }

            // 5. RECOLECTAR CONFIGURACIÓN REAL DE SETUPSCREEN2 (Valores dinámicos)
                
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
            if (gameState.gameMode === 'invasion') {
                gameState.deploymentUnitLimitByPlayer = {
                    1: INVASION_MODE_CONFIG.ATTACKER_DEPLOYMENT_UNIT_LIMIT
                };
            } else {
                gameState.deploymentUnitLimitByPlayer = null;
            }
            gameState.victoryByPointsEnabled = settings.victoryByPoints ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
            console.error(`DEBUGGING TIMER | PASO 3: Asignando gameState.turnDurationSeconds. Valor final: ${gameState.turnDurationSeconds}`);
            gameState.isCampaignBattle = false;
            
            // C. Asignar la duración del turno al gameState ya reseteado. ESTA ES LA CLAVE.
            gameState.turnDurationSeconds = turnDuration;
            
            // 6. Inicializar el tablero de juego.
            if (typeof initializeNewGameBoardDOMAndData === "function") { 
                initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize, settings.navalMap || false, gameMode); 
            } else { 
                console.error("CRÍTICO: initializeNewGameBoardDOMAndData NO es una función."); 
                return;
            }

            // <<== INICIALIZAR REPLAY ENGINE ==>>
            if (typeof ReplayIntegration !== 'undefined' && typeof ReplayEngine !== 'undefined') {
                // FORZAR generación de matchId único (evitar usar gameState.matchId que puede ser objeto)
                const matchId = `match_${crypto.randomUUID().substring(0, 8)}`;
                const mapSeed = gameState.mapSeed || Math.random().toString(36).substring(7);
                const playersInfo = gameState.players || Object.entries(gameState.playerCivilizations || {}).map((k, v) => ({
                    id: k,
                    player_number: parseInt(k),
                    name: `Jugador ${k}`,
                    civ: v,
                    color: ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'][parseInt(k)-1] || '#888'
                }));
                
                ReplayIntegration.startGameRecording(matchId, mapSeed, playersInfo);
            }

            // <<== INICIALIZAR STAT TRACKER ==>>
            if (typeof StatTracker !== 'undefined') {
                StatTracker.initialize(numPlayers);
            }

            // <<== INICIALIZAR LEDGER UI ==>>
            if (typeof LedgerUI !== 'undefined') {
                LedgerUI.initialize();
            }

            // <<== INICIALIZAR LEDGER INTEGRATION (Botón en UI) ==>>
            if (typeof LedgerIntegration !== 'undefined') {
                LedgerIntegration.initialize();
            }

            // <<== INICIALIZAR LEGACY UI ==>>
            if (typeof LegacyUI !== 'undefined') {
                LegacyUI.initialize();
            }

            // <<== INICIALIZAR GAME HISTORY UI ==>>
            if (typeof GameHistoryUI !== 'undefined') {
                GameHistoryUI.initialize();
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
            UIManager.hideAllActionButtons();
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

            // 8. ARRANCAR EL RELOJ PARA EL PRIMER TURNO
            if (gameState.currentPhase !== 'deployment' || (gameState.playerTypes && gameState.playerTypes['player1'] === 'human')) {
                // Verificamos que sea un tiempo válido (no infinito y que sea un número)
                if (typeof TurnTimerManager !== 'undefined' && turnDuration !== Infinity && !isNaN(turnDuration)) {
                    TurnTimerManager.start(turnDuration);
                } else {
                    // Si es infinito, aseguramos que el reloj esté oculto
                    if (typeof TurnTimerManager !== 'undefined') TurnTimerManager.stop();
                }
            }
            
            logMessage(`Partida iniciada. Tiempo por turno: ${turnDuration === Infinity ? "Sin límite" : turnDuration + "s"}`);
        

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

    // === LISTENER PARA MOSTRAR/OCULTAR OPCIÓN DE MAPA NAVAL ===
    const boardSizeSelect = document.getElementById('boardSizeSelect');
    const navalMapOption = document.getElementById('navalMapOption');
    if (boardSizeSelect && navalMapOption) {
        boardSizeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'large') {
                navalMapOption.style.display = 'block';
            } else {
                navalMapOption.style.display = 'none';
                // Desmarcar si cambió a otro tamaño
                const checkbox = document.getElementById('navalMapCheckbox');
                if (checkbox) checkbox.checked = false;
            }
        });
    }

    // === LÓGICA DE TRANSICIÓN DE PANTALLAS DE CONFIGURACIÓN (SETUP) ===
    const nextToPlayerSetupBtn = document.getElementById('next-to-player-setup-btn');
    if (nextToPlayerSetupBtn) {
        nextToPlayerSetupBtn.addEventListener('click', () => {
            
            // 1. Lectura robusta de los valores del DOM
            const boardSizeVal = document.getElementById('boardSizeSelect')?.value || 'small';
            const resourceLevelVal = document.getElementById('resourceLevel')?.value || 'med';
            const unitLimitVal = document.getElementById('initialUnitsCount')?.value || '5';
            const turnTimeVal = document.getElementById('turnTimeSelect')?.value || '180'; // Valor por defecto seguro
            const numPlayersVal = parseInt(document.getElementById('num-players-slider')?.value) || 2;

            const barbarianDensityVal = document.getElementById('barbarianDensity')?.value || 'med';
            const victoryByPointsVal = document.getElementById('victoryByPoints')?.value || 'enabled';
            const navalMapVal = boardSizeVal === 'large' && document.getElementById('navalMapCheckbox')?.checked;


            // 2. Guardado en el estado temporal
            gameState.setupTempSettings = {
                boardSize: boardSizeVal,
                resourceLevel: resourceLevelVal,
                unitLimit: unitLimitVal,
                turnTime: turnTimeVal,
                numPlayers: numPlayersVal,
                barbarianDensity: barbarianDensityVal,
                victoryByPoints: victoryByPointsVal === 'enabled',
                navalMap: navalMapVal
            };
            
            // 3. Renderizado de la siguiente pantalla
            if (typeof renderPlayerSelectionSetup === 'function') {
                renderPlayerSelectionSetup(numPlayersVal); 
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
        //Lógica para Raid
        if (gameState.isRaid) {
            if (gameState.currentPhase === 'deployment') {
                // El jugador ha terminado de crear su unidad.
                // 1. Validar que ha creado algo
                const myUnits = units.filter(u => u.player === 1);
                if (myUnits.length === 0) {
                    logMessage("Debes desplegar tu flota antes de comenzar.", "error");
                    return;
                }

                // 2. Guardar la unidad en la Base de Datos (stage_data.units)
                if (typeof RaidManager !== 'undefined') {
                    RaidManager.saveMyUnitToDB(myUnits[0]); // <--- Nueva función necesaria
                }
                
                // 3. Cambiar a fase de juego
                gameState.currentPhase = 'play';
                UIManager.refreshActionButtons();
                alert("Flota desplegada. Sincronizando con la Alianza...");
            } else {
                // En fase de juego, finalizar turno significa "Gastar puntos de acción"
                // y recargar movimiento localmente.
                resetUnitsForNewTurn(1);
                logMessage("Turno finalizado. Puntos de acción recargados.");
            }
            return; // Cortar aquí, no ejecutar la lógica estándar de turnos
        }

        if (typeof handleEndTurn === "function") {
            handleEndTurn();
        }else {
                console.error("main.js Error: La función handleEndTurn no está definida en gameFlow.js."); 
    }
        }); 
    } else { 
        console.warn("main.js: floatingEndTurnBtn no encontrado."); 
    }

    
    if (domElements.floatingMenuBtn) { 
        domElements.floatingMenuBtn.addEventListener('click', () => { 
            const topBar = domElements.floatingMenuPanel || document.getElementById('top-bar-menu');
            if (!topBar) return;

            const isVisible = topBar.style.display === 'block' || topBar.style.display === 'flex';
            topBar.style.display = isVisible ? 'none' : 'flex';

            // Notifica al tutorial de forma limpia
            if (gameState.isTutorialActive) {
                if (!isVisible) {
                    TutorialManager.notifyActionCompleted('menu_opened');
                } else {
                    TutorialManager.notifyActionCompleted('menu_closed');
                }
            }
            
            if (!isVisible) {
                if (typeof UIManager !== 'undefined' && typeof UIManager.updateTopBarInfo === "function") {
                    UIManager.updateTopBarInfo();
                }
                if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === "function") { 
                    UIManager.updatePlayerAndPhaseInfo(); 
                }
            } else if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") {
                UIManager.hideContextualPanel();
            }
        }); 
    } else { console.warn("main.js: floatingMenuBtn no encontrado."); }

    if (domElements.floatingSplitBtn) {
        domElements.floatingSplitBtn.addEventListener('click', (event) => {
            event.stopPropagation();

            if (UIManager && UIManager._autoCloseTimeout) {
                clearTimeout(UIManager._autoCloseTimeout);
                UIManager._autoCloseTimeout = null;
            }
            
            // --- INICIO DEL DIAGNÓSTICO ---
            // Este log nos dirá si el clic está siendo registrado.
            
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
        // Clonamos el nodo para eliminar listeners antiguos acumulados (causa común de bugs)
        const newBtn = domElements.floatingCreateDivisionBtn.cloneNode(true);
        domElements.floatingCreateDivisionBtn.parentNode.replaceChild(newBtn, domElements.floatingCreateDivisionBtn);
        domElements.floatingCreateDivisionBtn = newBtn;

        domElements.floatingCreateDivisionBtn.addEventListener('click', () => {
            
            // 1. Validaciones de seguridad
            if (!gameState || typeof gameState.deploymentUnitLimit === 'undefined') return;

            // 2. ¿Es fase de despliegue? VALIDAR LÍMITE
            if (gameState.currentPhase === 'deployment') {
                const currentCount = (gameState.unitsPlacedByPlayer && gameState.unitsPlacedByPlayer[gameState.currentPlayer]) || 0;
                let limit;
                if (gameState.deploymentUnitLimitByPlayer && typeof gameState.deploymentUnitLimitByPlayer === 'object') {
                    limit = gameState.deploymentUnitLimitByPlayer[gameState.currentPlayer];
                }
                if (limit === undefined || limit === null) {
                    limit = gameState.deploymentUnitLimit; // Ya debe ser un número o Infinity
                }

                // SI YA ALCANZÓ EL LÍMITE, DETENER AQUÍ.
                if (limit !== Infinity && currentCount >= limit) {
                    logMessage(`Has alcanzado el límite de despliegue (${limit} unidades).`);
                    return; 
                }
                
                // Si pasa, preparamos el modo
                placementMode.recruitHex = null; 
            } 
            // 3. ¿Es fase de juego? VALIDAR POSICIÓN
            else if (gameState.currentPhase === 'play') {
                if (typeof hexToBuildOn === 'undefined' || hexToBuildOn === null) {
                    logMessage("Debes seleccionar una ciudad o fortaleza propia.");
                    return;
                }
                placementMode.recruitHex = { r: hexToBuildOn.r, c: hexToBuildOn.c }; 
            }

            // 4. Si pasamos los filtros, abrimos el modal
            if (typeof openUnitManagementModal === "function") {
                openUnitManagementModal();
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
            // Función helper para abrir el árbol tecnológico
            const tryOpenTechTree = () => {
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
                    return true;
                }
                return false;
            };
            
            // Intentar abrir inmediatamente
            if (!tryOpenTechTree()) {
                // Si falla, esperar a que se cargue
                let attempts = 0;
                const checkCallback = () => {
                    attempts++;
                    if (tryOpenTechTree()) {
                        if (typeof window !== 'undefined' && window.intervalManager) {
                            window.intervalManager.clearInterval('techTree_check');
                        } else {
                            clearInterval(checkInterval);
                        }
                    } else if (attempts > 20) {
                        if (typeof window !== 'undefined' && window.intervalManager) {
                            window.intervalManager.clearInterval('techTree_check');
                        } else {
                            clearInterval(checkInterval);
                        }
                        console.error("main.js: CRÍTICO: openTechTreeScreen no se cargó después de 2 segundos");
                        alert("La pantalla de tecnologías aún no está disponible. Intenta recargar la página.");
                    }
                };

                let checkInterval = null;
                if (typeof window !== 'undefined' && window.intervalManager) {
                    window.intervalManager.setInterval('techTree_check', checkCallback, 100);
                } else {
                    checkInterval = setInterval(checkCallback, 100);
                }
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

            // Usamos la función de PETICIÓN, no la de ejecución directa
            if (typeof RequestUndoLastUnitMove === "function" && typeof selectedUnit !== 'undefined' && selectedUnit) {
                RequestUndoLastUnitMove(selectedUnit); // ¡CORRECCIÓN!
                
                // La UI se actualizará para todos cuando el anfitrión retransmita el estado.
                // Podemos ocultar el panel localmente para una respuesta más rápida.
                if(typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
                    UIManager.hideContextualPanel();
                }
            } else {
                console.warn("[DEBUG Botón Deshacer] No se puede deshacer el movimiento.");
                if(typeof UIManager !== 'undefined' && typeof UIManager.showMessageTemporarily === 'function') UIManager.showMessageTemporarily("No se puede deshacer el movimiento.", 3000, true);
            }
        });
    } else { console.warn("main.js: floatingUndoMoveBtn no encontrado, no se pudo añadir listener."); }

    if (domElements.floatingReinforceBtn) {
        domElements.floatingReinforceBtn.addEventListener('click', (event) => {
            event.stopPropagation();

            // Obtenemos las coordenadas de la última unidad sobre la que se mostró el panel.
            // Esto es más fiable que depender de `selectedUnit`, que es solo para unidades controlables.
            const unitR = gameState.selectedHexR;
            const unitC = gameState.selectedHexC;

            if (typeof unitR !== 'undefined' && unitR !== -1) {
                const unitToShow = getUnitOnHex(unitR, unitC);

                if (unitToShow) {
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

            const requiresLoginActions = new Set([
                'openProfile',
                'openAltar',
                'openBarracks',
                'openForge'
            ]);

            if (requiresLoginActions.has(action) && !PlayerDataManager.currentPlayer) {
                console.warn("Acción requiere login. Redirigiendo a login...");
                if (typeof showToast === 'function') {
                    showToast("Debes iniciar sesión para acceder a esta sección.", "info");
                }
                if (typeof showLoginScreen === 'function') {
                    showLoginScreen();
                }
                return;
            }

            switch(action) {
                case 'openGameModes':
                    document.getElementById('gameModesModal').style.display = 'flex';
                    break;

                case 'openProfile':
                    if (typeof openProfileModal === 'function') {
                        openProfileModal();
                    }
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

                case 'openAlliance':
                    // Aquí llamamos al gestor de alianzas. 
                    // Usamos una comprobación de seguridad por si aún no has cargado el script.
                    if (typeof AllianceManager !== 'undefined') {
                        AllianceManager.open();
                    } else {
                        console.error("AllianceManager no está definido. ¿Falta el script?");
                    }
                    break;

                case 'openStore':
                    // Verificación de seguridad (opcional, pero buena práctica)
                    if (typeof StoreManager !== 'undefined') {
                        StoreManager.open();
                    } else {
                        console.error("StoreManager no se ha cargado correctamente.");
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
    newTutorialBtn.addEventListener('click', async () => {
        if (!PlayerDataManager.currentPlayer) PlayerDataManager.login("General", "tutorial");
        document.getElementById('gameModesModal').style.display = 'none';
        
        
        if (typeof resetGameStateVariables === 'function') {
            resetGameStateVariables(2, Infinity, 'development');
        }

        //PlayerDataManager.login("General", "tutorial");
        
        gameState.playerCivilizations[2] = 'Roma';
        gameState.playerCivilizations[1] = 'Iberia';

        const tutorialScenario = GAME_DATA_REGISTRY.scenarios["TUTORIAL_SCENARIO"];
        const tutorialMap = GAME_DATA_REGISTRY.maps[tutorialScenario.mapFile];

        if(typeof resetAndSetupTacticalGame === 'function') await resetAndSetupTacticalGame(tutorialScenario, tutorialMap, "tutorial");
        
        if(typeof initializeTutorialState === 'function') initializeTutorialState(); 
        gameState.currentPhase = "deployment";
        
        showScreen(domElements.gameContainer);
        if (domElements.tacticalUiContainer) domElements.tacticalUiContainer.style.display = 'block';
        initializeTutorialState(); 
        gameState.currentPhase = "deployment";
        TutorialManager.start(TUTORIAL_SCRIPTS.completo);
        TurnTimerManager.start(300); // Inicia el reloj con 3 minutos
    });
}

// Botón de Unirse a Partida en Red (Desde el Modal "Elige tu Batalla")
    const newJoinNetworkBtn = document.getElementById('joinNetworkGameBtn_new');
    if (newJoinNetworkBtn) {
        // Clonamos para limpiar listeners viejos
        const newBtn = newJoinNetworkBtn.cloneNode(true);
        newJoinNetworkBtn.parentNode.replaceChild(newBtn, newJoinNetworkBtn);

        newBtn.addEventListener('click', async () => {
            document.getElementById('gameModesModal').style.display = 'none';
            
            const shortCode = prompt("Introduce el ID de la partida (4 letras):");
            
            if (shortCode && shortCode.trim() !== "") {
                logMessage(`Buscando sala ${shortCode} en la nube...`);
                
                // --- CORRECCIÓN: Usar la nueva función de Nube, sin 'preparar' ---
                const exito = await NetworkManager.unirsePartidaEnNube(shortCode.trim());
                
                if (exito) {
                    showScreen(domElements.gameContainer);
                    if (domElements.tacticalUiContainer) {
                        domElements.tacticalUiContainer.style.display = 'block';
                    }
                }
            }
        });
    }

// --- BOTÓN CONTINUAR PARTIDA ---
    const btnResume = document.getElementById('resumeGameBtn');
    if (btnResume) {
        // Clonar para limpiar listeners viejos y asegurar frescura
        const newBtn = btnResume.cloneNode(true);
        btnResume.parentNode.replaceChild(newBtn, btnResume);
        
        newBtn.addEventListener('click', () => {
            
            // 1. Cerrar el menú de modos
            const modesModal = document.getElementById('gameModesModal');
            if(modesModal) modesModal.style.display = 'none';

            // 2. Abrir la lista (usando la función global)
            if (typeof window.openMyGamesModal === 'function') {
                window.openMyGamesModal();
            } else {
                console.error("Error Crítico: openMyGamesModal no encontrada. ¿modalLogic.js cargado?");
                alert("Error de sistema: Función de carga no disponible.");
            }
        });
    }

    // --- BOTÓN CERRAR LISTA DE PARTIDAS ---
    const btnCloseMyGames = document.getElementById('closeMyGamesBtn');
    if (btnCloseMyGames) {
        btnCloseMyGames.addEventListener('click', () => {
            document.getElementById('myGamesModal').style.display = 'none';
            // Opcional: Volver a abrir el menú de modos si quieres volver atrás
            document.getElementById('gameModesModal').style.display = 'flex';
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
if (newGeneralNameDisplay) {
    newGeneralNameDisplay.style.cursor = 'pointer';
    newGeneralNameDisplay.addEventListener('click', () => {
        if (!PlayerDataManager.currentPlayer) {
            if (typeof showLoginScreen === 'function') {
                showLoginScreen();
            }
            return;
        }
        if (typeof openProfileModal === 'function') {
            openProfileModal();
        }
    });
    if (!PlayerDataManager.currentPlayer) {
        newGeneralNameDisplay.textContent = 'Ninguno';
    }
}

    // ======================================================================
    // 4. LÓGICA DE ARRANQUE
    // ======================================================================
    
    
    // Resetear flags ANTES de inicializar auth listener
    window.loginScreenShown = false;
    window.oauthCallbackDetected = false;
    
    // Inicializar auth listener DESPUÉS de resetear flags
    PlayerDataManager.initAuthListener();
    
    // Verificar si hay sesión guardada en Supabase
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            // El auth listener se encargará de cargar el perfil
            return;
        }
        
        // No hay sesión de Supabase, intentar auto-login local
        const lastUser = localStorage.getItem('lastUser');
        
        if (lastUser && PlayerDataManager.autoLogin(lastUser)) {
            showMainMenu();
        } else {
            // No hay usuario ni local ni en Supabase
            openLandingPage(false);
            
            // Dar tiempo para que Supabase termine de verificar sesión
            setTimeout(() => {
                // NO mostrar login si estamos procesando OAuth callback
                if (window.oauthCallbackDetected) {
                    return;
                }
                
                if (!PlayerDataManager.currentPlayer && !PlayerDataManager.isProcessingAuth) {
                    showLoginScreen();
                } else {
                }
            }, 2000);
        }
    }).catch(err => {
        console.error('❌ Error verificando sesión:', err);
        openLandingPage(false);
        setTimeout(() => {
            if (!PlayerDataManager.currentPlayer && !window.oauthCallbackDetected) {
                showLoginScreen();
            }
        }, 2000);
    });

    // --- PARCHE DE EMERGENCIA: RECARGAR PERFIL ---
    if (PlayerDataManager.currentPlayer) {
        // Forzamos la recarga desde la nube para traer el alliance_id actualizado
        // Usamos una pequeña "trampa": llamamos a login sin credenciales para que refresque la sesión
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                // Recargar perfil completo
                supabaseClient
                    .from('profiles')
                    .select('profile_data')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        if (data && data.profile_data) {
                            PlayerDataManager.currentPlayer = data.profile_data;
                            PlayerDataManager.currentPlayer.auth_id = user.id;
                        }
                    });
            }
        });
    }

    // ======================================================================
    // ASEGURAR Z-INDEX CORRECTO DESPUÉS DE INICIALIZACIÓN
    // ======================================================================
    // Función de utilidad para corregir z-index si es necesario
    function ensureCorrectZIndex() {
        // Dar un poco de tiempo para que el DOM se estabilice
        setTimeout(() => {
            const mainMenu = document.getElementById('mainMenuScreen');
            const gameContainer = document.querySelector('.game-container') || domElements.gameContainer;
            
            if (gameContainer && gameContainer.style.display !== 'none') {
                // El gameContainer está visible, asegurar que mainMenuScreen no interfiera
                if (mainMenu && mainMenu.style.display !== 'none') {
                    console.warn("⚠️ [Z-Index] mainMenuScreen estaba visible con gameContainer. Corrigiendo...");
                    mainMenu.style.setProperty('display', 'none', 'important');
                    mainMenu.style.setProperty('visibility', 'hidden', 'important');
                    mainMenu.style.setProperty('pointer-events', 'none', 'important');
                }
            }
        }, 500);
    }
    
    // Llamar a la función de corrección
    ensureCorrectZIndex();


}

function isNetworkGame() {
    return NetworkManager.conn && NetworkManager.conn.open;
}

function executeConfirmedAction(action) {
    
    // Cada vez que alguien hace algo, actualizamos la "hora oficial" del estado
    gameState.lastActionTimestamp = Date.now();
    

    if (NetworkManager.esAnfitrion && action.payload.playerId === gameState.myPlayerNumber && action.type !== 'syncGameState') {
         if (UIManager) UIManager.updateAllUIDisplays();
         return;
    }
    //console.log(`%c[VIAJE-7] Jugador ${gameState.myPlayerNumber} sincronizando acción retransmitida: ${action.type}`, 'color: #DAA520; font-weight: bold;', action.payload);
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
            if (typeof _executeResearch === 'function') {
                // Llamamos a la función cerebro, que devuelve true si tuvo éxito.
                const success = _executeResearch(payload.techId, payload.playerId);
                if (success) {
                    actionExecuted = true;
                }
            }
            break;

        case 'moveUnit': 

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
            //if (unitToDisband) {
                // Ahora llamamos a la función síncrona
                //actionExecuted = _executeDisbandUnit(unitToDisband); // <<== Se quita 'await'
            //}
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
    
    const gameMode = settings.gameMode || 'development';
    resetGameStateVariables(2, Infinity, gameMode); // Asumiendo que LAN es para 2 jugadores, PASANDO gameMode

    gameState.playerTypes = settings.playerTypes;
    gameState.playerCivilizations = settings.playerCivilizations;
    gameState.deploymentUnitLimit = settings.deploymentUnitLimit;
    if (gameState.gameMode === 'invasion') {
        gameState.deploymentUnitLimitByPlayer = {
            1: INVASION_MODE_CONFIG.ATTACKER_DEPLOYMENT_UNIT_LIMIT
        };
    } else {
        gameState.deploymentUnitLimitByPlayer = null;
    }
    gameState.turnDurationSeconds = settings.turnTime === 'none' ? Infinity : parseInt(settings.turnTime);
    gameState.victoryByPointsEnabled = settings.victoryByPoints ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
    if (!gameState.setupTempSettings) gameState.setupTempSettings = {};
    gameState.setupTempSettings.barbarianDensity = settings.barbarianDensity || 'med';
    gameState.setupTempSettings.navalMap = settings.navalMap || false;
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

    if (NetworkManager.esAnfitrion) {
        initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize, settings.navalMap || false, settings.gameMode || 'development');
        
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

// Cache de deduplicación de acciones (para evitar procesar la misma acción múltiples veces)
const _processedActions = new Map(); // actionId -> timestamp
const _ACTION_CACHE_DURATION = 5000; // 5 segundos

// Limpiar cache antiguo periódicamente
const cleanupActionCache = () => {
    const now = Date.now();
    for (const [actionId, timestamp] of _processedActions.entries()) {
        if (now - timestamp > _ACTION_CACHE_DURATION) {
            _processedActions.delete(actionId);
        }
    }
};

if (typeof window !== 'undefined' && window.intervalManager) {
    window.intervalManager.setInterval('actionCache_cleanup', cleanupActionCache, _ACTION_CACHE_DURATION);
} else {
    setInterval(cleanupActionCache, _ACTION_CACHE_DURATION);
}

async function processActionRequest(action) { 
    // DIAGNÓSTICO: Log explícito de la acción recibida
    
    // DEDUPLICACIÓN: Verificar si esta acción ya fue procesada
    if (action.actionId) {
        if (_processedActions.has(action.actionId)) {
            console.warn(`%c[DEDUPLICACIÓN] Acción duplicada detectada (${action.type}, ID: ${action.actionId}), IGNORANDO.`, 'background: #FF4500; color: white;');
            return; 
        }
        _processedActions.set(action.actionId, Date.now());
    }
    
    
    // Si la acción no es del anfitrión, la ignora para evitar que procese sus propias retransmisiones
    if (action.payload.playerId !== NetworkManager.miId && NetworkManager.esAnfitrion && action.payload.playerId !== gameState.currentPlayer) {
        // Excepción: permitimos que las acciones se procesen si son del jugador actual.
    }
    
    let payload = action.payload;
    let actionExecuted = false;

    switch (action.type) {
        case 'endTurn':
            if (payload.playerId !== gameState.currentPlayer) {
                console.warn(`[Red - Anfitrión] RECHAZADO: Fin de turno de J${payload.playerId} pero el turno era de J${gameState.currentPlayer}.`);
                break;
            }

            console.log(`[Red - Anfitrión] Procesando fin de turno para J${payload.playerId}...`);
            
            // --- CORRECCIÓN CRÍTICA: Usar la función centralizada ---
            handleEndTurn(true);
            
            actionExecuted = true;
            break;    

        case 'attackUnit': 
            const attacker = getUnitById(payload.attackerId);
            const defender = getUnitById(payload.defenderId);
            if (attacker && defender && isValidAttack(attacker, defender)) {
                await attackUnit(attacker, defender); 
                actionExecuted = true;
            }
            break;

        case 'researchTech':
            const tech = TECHNOLOGY_TREE_DATA[payload.techId];
            const playerRes = gameState.playerResources[payload.playerId];
            if (tech && playerRes && (playerRes.researchPoints || 0) >= (tech.cost.researchPoints || 0) && hasPrerequisites(playerRes.researchedTechnologies, payload.techId)) {
                _executeResearch(payload.techId, payload.playerId)
                actionExecuted = true;
            }
            break;

        case 'moveUnit':
            const unitToMove = getUnitById(payload.unitId);
            if (unitToMove && isValidMove(unitToMove, payload.toR, payload.toC)) {
                const fromR = unitToMove.r;
                const fromC = unitToMove.c;

                await _executeMoveUnit(unitToMove, payload.toR, payload.toC);

                // Blindaje de datos para retransmisión
                const movedUnit = getUnitById(payload.unitId);
                if (movedUnit) {
                    movedUnit.lastMove = {
                        fromR: fromR,
                        fromC: fromC,
                        initialCurrentMovement: movedUnit.lastMove.initialCurrentMovement,
                        initialHasMoved: false,
                        initialHasAttacked: movedUnit.hasAttacked,
                        movedToHexOriginalOwner: movedUnit.lastMove.movedToHexOriginalOwner
                    };
                }
                actionExecuted = true;
            }
            break;

        case 'mergeUnits': 
            const mergingUnit = getUnitById(payload.mergingUnitId); 
            const targetUnitMerge = getUnitById(payload.targetUnitId); 
            
            if (mergingUnit && targetUnitMerge) {
                const esElMismoJugador = mergingUnit.player === payload.playerId && targetUnitMerge.player === payload.playerId;
                
                if (esElMismoJugador) {
                    try {
                        await mergeUnits(mergingUnit, targetUnitMerge);
                        actionExecuted = true;
                    } catch (error) {
                        console.error(`[Red - Anfitrión] ❌ Error en mergeUnits:`, error);
                    }
                }
            }
            break;
            
        case 'splitUnit': 
            const originalUnit = getUnitById(payload.originalUnitId); 
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments }; 
            if (originalUnit) {
                 splitUnit(originalUnit, payload.targetR, payload.targetC);
                 actionExecuted = true;
            }
            gameState.preparingAction = null; 
            break;

        // --- CORRECCIÓN CRÍTICA ERROR 2 (SAQUEO) ---
        case 'pillageHex': 
            const pillager = getUnitById(payload.unitId); 
            if(pillager && pillager.player === payload.playerId) {
                // Usamos la función pura _executePillageAction
                _executePillageAction(pillager);
                actionExecuted = true;
            } else {
                console.warn("[Host] Pillage rechazado: Unidad no encontrada o jugador incorrecto.");
            }
            break;
        // -------------------------------------------

        case 'disbandUnit': 
            const unitToDisband = getUnitById(payload.unitId); 
            if(unitToDisband){
                actionExecuted = await _executeDisbandUnit(unitToDisband);
             }
             break;

        case 'placeUnit':
            if (gameState.currentPhase === 'deployment') {
                const pId = payload.playerId; // o payload.unitData.player
                const currentCount = gameState.unitsPlacedByPlayer[pId] || 0;
                let limit;
                if (gameState.deploymentUnitLimitByPlayer && typeof gameState.deploymentUnitLimitByPlayer === 'object') {
                    limit = gameState.deploymentUnitLimitByPlayer[pId];
                }
                if (limit === undefined || limit === null) {
                    limit = gameState.deploymentUnitLimit;
                }
                
                // Si intenta poner más del límite, rechazamos la acción y no hacemos nada
                if (limit !== Infinity && currentCount >= limit) {
                    console.warn(`[Host] Acción rechazada: Jugador ${pId} intentó exceder el límite de despliegue.`);
                    break; // Salimos del switch sin poner actionExecuted = true
                }
            }

            const hexToPlace = board[payload.r]?.[payload.c];
            if (hexToPlace && !hexToPlace.unit) {
                if (!payload.unitData.id) payload.unitData.id = `u${unitIdCounter++}`;
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
            const divisionToReinforce = getUnitById(payload.divisionId); 
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId); 
            if(divisionToReinforce && regimentToReinforce) {
                 handleReinforceRegiment(divisionToReinforce, regimentToReinforce);
                 actionExecuted = true;
            }
            break;

        case 'undoMove':
            const unitToUndo = getUnitById(payload.unitId);
            if (unitToUndo && unitToUndo.player === payload.playerId) {
                await undoLastUnitMove(unitToUndo);
                actionExecuted = true;
            }
            break;
        
        case 'razeStructure':
            // Restaurado el log de diagnóstico original
            console.groupCollapsed("%c[DIAGNÓSTICO HOST - RAZE]", "background: #e67e22; color: white;");
            const unitToRaze = getUnitById(payload.unitId);
            const hexToRaze = board[payload.r]?.[payload.c];

            
            // CORRECCIÓN: Solo verificamos !hasAttacked. Permitimos si hasMoved es true.
            if (unitToRaze && hexToRaze && !unitToRaze.hasAttacked && hexToRaze.structure) {
                _executeRazeStructure(payload);
                actionExecuted = true;
            } else {
                console.error("%c -> CONDICIÓN FALLIDA. La acción de arrasar NO se ejecutará.", "color: red;");
            }
            console.groupEnd();
            break;


        case 'exploreRuins':
            const unitToExplore = getUnitById(payload.unitId);
            const hexToExplore = board[payload.r]?.[payload.c];
            if (unitToExplore && hexToExplore && !unitToExplore.hasAttacked && hexToExplore.feature === 'ruins') {
                _executeExploreRuins(payload);
                actionExecuted = true;
            }
            break;

        case 'assignGeneral':
            const unitToAssign = getUnitById(payload.unitId);
            if (unitToAssign && unitToAssign.player === payload.playerId) {
                _executeAssignGeneral(payload);
                actionExecuted = true;
            }
            break;

        case 'establishTradeRoute':
            actionExecuted = _executeEstablishTradeRoute(payload);
            break;

        case 'tradeWithBank':
            actionExecuted = _executeTradeWithBank(payload);
            break;
            
        case 'changeCapital':
             actionExecuted = handleChangeCapital(payload.cityR, payload.cityC);
             break;

        case 'cheatResource':
            const targetPlayerRes = gameState.playerResources[payload.playerId];
            if (targetPlayerRes) {
                targetPlayerRes[payload.resource] = (targetPlayerRes[payload.resource] || 0) + payload.amount;
                actionExecuted = true; // Esto disparará el broadcastFullState automáticamente
            }
            break;

        default:
            console.warn(`[Red - Anfitrión] Recibida petición de acción desconocida: ${action.type}`);
            break;
        }

    // Si CUALQUIER acción (incluida endTurn) se ejecutó y cambió el estado...
    if (actionExecuted) {
        // Esto le dice al mundo: "Este estado es NUEVO y OFICIAL"
        gameState.lastActionTimestamp = Date.now();

        
        // Actualizar visualmente al Anfitrión
        if (typeof renderFullBoardVisualState === 'function') {
            renderFullBoardVisualState();
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }

        // 1. Enviar el cambio a los clientes conectados (P2P rápido)
        if (typeof isNetworkGame === 'function' && isNetworkGame()) {
            if (typeof NetworkManager !== 'undefined' && typeof NetworkManager.broadcastFullState === 'function') {
                NetworkManager.broadcastFullState();
            }

            // 2. [NUEVO] GUARDAR EN LA NUBE INMEDIATAMENTE (Respaldo)
            // Esto es crucial para que si el móvil se desconecta, al volver descargue este estado exacto.
            if (typeof NetworkManager !== 'undefined' && NetworkManager.miId && typeof NetworkManager.subirTurnoANube === 'function') {
                NetworkManager.subirTurnoANube();
            }
        }
    } else {
        console.warn(`[Red - Anfitrión] La acción ${action.type} fue recibida pero no se ejecutó.`);
    }
}

function reconstruirJuegoDesdeDatos(datos) {
    try {
        
        // 1. Guardamos nuestra identidad local
        const miIdentidadLocal = gameState.myPlayerNumber;

        // 2. Limpieza visual
        if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
        board = [];
        units = [];
        if (typeof UnitGrid !== 'undefined') UnitGrid.clear();

        // 3. Inyectar los datos del gameState
        if (datos.gameState) {
            gameState.currentPhase = datos.gameState.currentPhase || "deployment";
            gameState.currentPlayer = datos.gameState.currentPlayer || 1;
            gameState.turnNumber = datos.gameState.turnNumber || 1;
            gameState.playerResources = datos.gameState.playerResources || {};
            gameState.unitsPlacedByPlayer = datos.gameState.unitsPlacedByPlayer || {};
            gameState.playerTypes = datos.gameState.playerTypes || {};
            
            Object.assign(gameState, datos.gameState);

            // Restaurar para que el reloj funcione
            if (gameState.turnDurationSeconds === null || gameState.turnDurationSeconds === undefined) {
                gameState.turnDurationSeconds = Infinity;
            }
        } else {
            console.error("CRÍTICO: datos.gameState venía vacío de la nube.");
        }
        unitIdCounter = datos.unitIdCounter;

        // 4. RESTAURAR IDENTIDAD
        if (miIdentidadLocal) {
            gameState.myPlayerNumber = miIdentidadLocal;
        }

        // 5. Reconstruir Tablero
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
        
        // 6. Reconstruir Unidades
        datos.units.forEach(unitData => {
            unitData.element = null;
            placeFinalizedDivision(unitData, unitData.r, unitData.c);
        });
        
        // 6.5 Restaurar estructuras de datos no serializables
        if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.restoreAfterDeserialization) {
            ResearchRewardsManager.restoreAfterDeserialization();
        }

        // 7. ACTUALIZACIÓN VISUAL MASIVA
        renderFullBoardVisualState();
        if (typeof initializeBoardPanning === "function") initializeBoardPanning();
        if (typeof updateFogOfWar === "function") updateFogOfWar();
        if (UIManager) {
            UIManager.updatePlayerAndPhaseInfo(); 
            UIManager.updateAllUIDisplays();
            UIManager.refreshActionButtons();
            // Eliminamos la llamada a updateTurnIndicatorAndBlocker aquí para no bloquear por error
            // UIManager.updateTurnIndicatorAndBlocker(); 
        }

        if (typeof TurnTimerManager !== 'undefined') {
            TurnTimerManager.stop(); 
            
            let duration = gameState.turnDurationSeconds;
            if (duration === null || duration === 'none') duration = Infinity;
            
            const esMiTurno = gameState.currentPlayer === gameState.myPlayerNumber;
            const hayTiempoLimite = (duration !== Infinity && !isNaN(duration) && duration > 0);

            // A. SI ES MI TURNO: Arrancar Reloj Y QUITAR EL CARTEL GRIS A LA FUERZA
            if (esMiTurno) {
                console.log(`[Timer] Es mi turno recuperado. Iniciando reloj: ${duration}s y desbloqueando.`);
                
                // 1. ARRANCAR RELOJ
                if (hayTiempoLimite) TurnTimerManager.start(duration);
                
                // 2. PARCHE VISUAL: FORZAR QUITAR EL CARTEL "ESPERANDO..."
                // Esto es vital porque al reconectar el móvil, el estado de red puede ser "false"
                // y el juego te bloquearía aunque sea tu turno.
                const blocker = document.getElementById('turnBlocker');
                if (blocker) blocker.style.display = 'none';

                if (UIManager) UIManager.refreshActionButtons(); // Asegura botón "Fin de Turno"

            } else {
                // B. NO ES MI TURNO: Ocultar reloj
                if(document.getElementById('turnTimerDisplay')) {
                    document.getElementById('turnTimerDisplay').style.display = 'none';
                }
                // Si no es mi turno, sí podemos dejar que el blocker actúe normal o mostrarlo
                const blocker = document.getElementById('turnBlocker');
                if (blocker) {
                    blocker.style.display = 'flex';
                    blocker.textContent = `Turno del Jugador ${gameState.currentPlayer}...`;
                }
            }
        } 
        // ================================================================

        // CRÍTICO: FORZAR VISIBILIDAD DEL JUEGO DESPUÉS DE CARGAR
        const gameContainer = document.querySelector('.game-container');
        const mainMenu = document.getElementById('mainMenuScreen');
        const setupScreen = document.getElementById('setupScreen');
        
        if (gameContainer) {
            gameContainer.style.setProperty('display', 'flex', 'important');
            gameContainer.style.setProperty('visibility', 'visible', 'important');
            gameContainer.style.setProperty('z-index', '1200', 'important');
        }
        
        if (mainMenu) {
            mainMenu.style.setProperty('display', 'none', 'important');
            mainMenu.style.setProperty('visibility', 'hidden', 'important');
            mainMenu.style.setProperty('pointer-events', 'none', 'important');
        }
        
        if (setupScreen) {
            setupScreen.style.setProperty('display', 'none', 'important');
        }
        
        const tacticalUI = document.getElementById('tactical-ui-container');
        if (tacticalUI) {
            tacticalUI.style.setProperty('display', 'block', 'important');
        }

        logMessage(`Sincronizado. Turno: J${gameState.currentPlayer}`);

        // CRÍTICO: SI EL TURNO ACTUAL ES DE IA, EJECUTAR SU TURNO AUTOMÁTICAMENTE
        // Esto es necesario después de cargar una partida contra IA
        const currentPlayerType = gameState.playerTypes && gameState.playerTypes[gameState.currentPlayer];
        if (currentPlayerType === 'ai' && gameState.currentPhase === 'play') {
            
            // Delay breve para asegurar que la UI está completamente renderizada
            setTimeout(() => {
                if (typeof simpleAiTurn === 'function') {
                    simpleAiTurn();
                } else {
                    console.error("[Reconstruir] simpleAiTurn no está definido. La IA no puede jugar.");
                }
            }, 500); // 500ms para asegurar que todo el render está completo
        } else {
        }

    } catch (error) { 
        console.error("Error crítico al reconstruir:", error);
        logMessage("Error de datos.", "error");
    }
}

document.addEventListener('DOMContentLoaded', initApp);

// En main.js (Al final del archivo, fuera de cualquier función)




