// introTutorial.js
const INTRO_STEPS = [
    {
        id: 'ARCHI_TUT_00_MAPA_FIJO',
        onStepStart: () => {
            console.log("=== PASO 0: SETUP INICIAL ===");
            
            // --- MEJORA CRÍTICA: Hacer que el panel de mensajes avance al hacer clic ---
            const tutPanel = document.getElementById('tutorialMessagePanel');
            if (tutPanel) {
                tutPanel.style.cursor = 'pointer'; // Indicamos que es clicable
                tutPanel.onclick = () => {
                    if (gameState.isTutorialActive && gameState.tutorial) {
                        gameState.tutorial.map_clicked = true;
                    }
                };
            }

            gameState.currentPhase = "play";
            gameState.currentPlayer = 1;
            gameState.myPlayerNumber = 1;
            gameState.setupTempSettings = gameState.setupTempSettings || {};
            gameState.setupTempSettings.navalMap = true;

            const loadMapFromJSON = async () => {
                try {
                    const response = await fetch('./data/tutorial_map.json');
                    const mapData = await response.json();
                    const B_ROWS = mapData.rows || 10;
                    const B_COLS = mapData.cols || 10;
                    
                    if (!board || board.length !== B_ROWS) {
                        for (let r = 0; r < B_ROWS; r++) {
                            if (!board[r]) board[r] = [];
                            for (let c = 0; c < B_COLS; c++) if (!board[r][c]) board[r][c] = {};
                        }
                    }
                    
                    const cap1 = mapData.positions.yourCapital;
                    const cap2 = mapData.positions.enemyCapital;
                    
                    if (board[cap1.r]?.[cap1.c]?.terrain !== 'water') renderSingleHexVisuals(cap1.r, cap1.c);
                    if (board[cap2.r]?.[cap2.c]?.terrain !== 'water') renderSingleHexVisuals(cap2.r, cap2.c);
                    
                    gameState.tutorial = gameState.tutorial || {};
                    gameState.tutorial.positions = {
                        yourCapital: cap1,
                        enemyCapital: cap2,
                        targetHex_Forest: mapData.positions.targetHex_Forest
                    };
                    
                    gameState.playerResources[1] = { oro: 1200, piedra: 600, madera: 600, hierro: 400, comida: 400 };
                    gameState.playerResources[2] = { oro: 1200, piedra: 600, madera: 600, hierro: 400, comida: 400 };
                    
                    gameState.tutorial.step1_complete = true;
                    if (UIManager) UIManager.updateAllUIDisplays();
                } catch (error) { console.error("❌ Error mapa:", error); }
            };
            loadMapFromJSON();
        },
        actionCondition: () => gameState.tutorial && gameState.tutorial.step1_complete === true
    },

    { 
        id: 'TUT_01', 
        message: "¡Saludos, General! El Reino te ha confiado la conquista de este archipiélago. Toca el mapa (o este mensaje) para continuar.", 
        onStepStart: () => {
            if (!gameState.tutorial) gameState.tutorial = {};
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_02', 
        message: "Tu objetivo es capturar la Capital enemiga o lograr la victoria por puntos. Toca para continuar.", 
        onStepStart: () => {
            centerMapOn(2, 6);
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    {
        id: 'ARCHI_TUT_03',
        message: "Inicias en la isla PEQUEÑA (izquierda). El enemigo controla la isla GRANDE (derecha). Conquístala paso a paso.",
        onStepStart: () => {
            const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
            if (pos.yourCapital) centerMapOn(pos.yourCapital.r, pos.yourCapital.c);
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },
     
    { 
        id: 'TUT_04', 
        message: "Para gobernar, necesitas usar tu panel de mando. Está oculto tras el botón de engranaje '⚙️'.", 
        onStepStart: () => {
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_05_PRESENTACION', 
        message: "Este es tu centro de operaciones. Vamos a ver cada herramienta. Toca para empezar el recorrido.", 
        onStepStart: () => {
            gameState.tutorial.map_clicked = false;
            const menuGroup = document.querySelector('.right-menu-group');
            if (menuGroup) menuGroup.classList.add('is-open');
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_06_HEROES', 
        message: "🎖️ Cuartel: Aquí gestionas a tus Héroes. Son líderes poderosos que otorgan bonificaciones a tus divisiones.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_0601_HEROES', 
        message: "Tus Héroes suben de nivel con Experiencia, y Evolucionan con Sellos del Héroe. Esto desbloquea Habilidades y Talentos. Además, puedes equiparlos desde la forja.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_07_INV', 
        message: "🎒 Inventario: Aquí ves tus objetos guardados, Sellos, Libros de Experiencia, Equipo y suministros.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_08_FORJA', 
        message: "⚔️ Forja: Mejora el equipo de tus Héroes o funde materiales para crear armas legendarias.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_09_WIKI', 
        message: "ℹ️ Ayuda: ¿Dudas sobre una unidad o terreno? Aquí tienes la enciclopedia completa del Reino.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_10_MAIL', 
        message: "✉️ Mensajes: Recibe recompensas, informes de batalla y avisos del Sistema.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_11_TECH', 
        message: "💡 Tecnologías: Invierte puntos en investigar mejoras tácticas para la partida en curso.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_12_CONSOLE', 
        message: "C Consola: Solo para generales avanzados. Permite gestionar comandos del sistema.", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_13_INFO', 
        message: "☰ Información: Detalles y consultas de la partida. ¡Úsalo para saber tu estado!", 
        onStepStart: () => { gameState.tutorial.map_clicked = false; },
        onStepEnd: () => {
            const menuGroup = document.querySelector('.right-menu-group');
            if (menuGroup) menuGroup.classList.remove('is-open');
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },

    { 
        id: 'TUT_14', 
        message: "Para finalizar turno, pulsa el botón '►' que dará paso al turno del siguiente jugador. ¡Buena suerte, General!", 
        onStepStart: () => {
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    }
];
