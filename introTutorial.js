// introTutorial.js
const INTRO_STEPS = [

     {
            id: 'ARCHI_TUT_00_MAPA_FIJO',
            onStepStart: () => {
                console.log("=== PASO 1: SETUP INICIAL - CARGANDO MAPA FIJO ===");
                gameState.currentPhase = "play";
                gameState.currentPlayer = 1;
                gameState.myPlayerNumber = 1;
                gameState.setupTempSettings = gameState.setupTempSettings || {};
                gameState.setupTempSettings.navalMap = true;

                // Cargar mapa desde JSON
                const loadMapFromJSON = async () => {
                    try {
                        const response = await fetch('./data/tutorial_map.json');
                        const mapData = await response.json();
                        
                        console.log("✓ Mapa JSON cargado:", mapData);
                        
                        // 1. APLICAR TERRENOS DESDE JSON
                        const B_ROWS = mapData.rows || 10;
                        const B_COLS = mapData.cols || 10;
                        
                        // Asegurar que el board tiene las dimensiones correctas
                        if (!board || board.length !== B_ROWS) {
                            console.warn("⚠️ Reinicializando board a", B_ROWS, "x", B_COLS);
                            for (let r = 0; r < B_ROWS; r++) {
                                if (!board[r]) board[r] = [];
                                for (let c = 0; c < B_COLS; c++) {
                                    if (!board[r][c]) board[r][c] = {};
                                }
                            }
                        }
                        
                            // NO modificar el terreno aquí. El mapa procedural ya lo hace correctamente.
                            console.log("✓ Terrenos NO modificados por el tutorial");
                        
                        // 2. CREAR CAPITALES EN COORDENADAS FIJAS
                        const cap1 = mapData.positions.yourCapital;  // (3, 1)
                        const cap2 = mapData.positions.enemyCapital;  // (2, 6)
                        
                        // Validar que son tierra, no agua
                        if (board[cap1.r]?.[cap1.c]?.terrain === 'water') {
                            console.error("❌ ERROR: Capital invasor en agua!", cap1);
                            return false;
                        }
                        if (board[cap2.r]?.[cap2.c]?.terrain === 'water') {
                            console.error("❌ ERROR: Capital defensor en agua!", cap2);
                            return false;
                        }
                        
                            // NO crear capitales aquí, el mapa procedural ya las crea correctamente
                            if (board[cap1.r]?.[cap1.c]?.terrain !== 'water') {
                                renderSingleHexVisuals(cap1.r, cap1.c);
                            }
                            if (board[cap2.r]?.[cap2.c]?.terrain !== 'water') {
                                renderSingleHexVisuals(cap2.r, cap2.c);
                            }
                        
                        console.log("✓ Capital invasor en", cap1, "— isla pequeña LEFT");
                        console.log("✓ Capital defensor en", cap2, "— isla grande RIGHT");
                        
                        // 3. GUARDAR POSICIONES EN ESTADO
                        gameState.tutorial = gameState.tutorial || {};
                        gameState.tutorial.positions = {
                            yourCapital: cap1,
                            enemyCapital: cap2,
                            targetHex_Forest: mapData.positions.targetHex_Forest
                        };
                        gameState.tutorial.step1_complete = true;
                        
                        // 4. INICIALIZAR RECURSOS
                        gameState.playerResources[1] = gameState.playerResources[1] || {};
                        const res1 = gameState.playerResources[1];
                        res1.oro = 1200;
                        res1.piedra = 600;
                        res1.madera = 600;
                        res1.hierro = 400;
                        res1.comida = 400;
                        
                        gameState.playerResources[2] = gameState.playerResources[2] || {};
                        const res2 = gameState.playerResources[2];
                        res2.oro = 1200;
                        res2.piedra = 600;
                        res2.madera = 600;
                        res2.hierro = 400;
                        res2.comida = 400;
                        
                        console.log("✓ Recursos inicializados");
                        console.log("=== PASO 1 COMPLETADO ===");
                        
                        if (UIManager) {
                            UIManager.updateAllUIDisplays();
                            UIManager.updateActionButtonsBasedOnPhase();
                        }
                        
                        return true;
                    } catch (error) {
                        console.error("❌ Error cargando mapa JSON:", error);
                        return false;
                    }
                };
                
                // Ejecutar carga
                loadMapFromJSON();
            },
            highlightHexCoords: []
        },
    
    { 
        id: 'TUT_01', 
        message: "¡Saludos, General! El Reino te ha confiado la conquista de este archipiélago. Toca el mapa para continuar.", 
        onStepStart: () => {
            // Inicializamos o reseteamos el flag de clic para este paso
            if (!gameState.tutorial) gameState.tutorial = {};
            gameState.tutorial.map_clicked = false;
        },
        // Solo avanzará cuando main.js ponga esto en true tras un clic
        actionCondition: () => gameState.tutorial && gameState.tutorial.map_clicked === true 
    },
    { 
        id: 'TUT_02', 
        message: "Tu objetivo es capturar la Capital enemiga o lograr la victoria por puntos. Toca el mapa para continuar.", 
        onStepStart: () => {
            centerMapOn(2, 6);
            gameState.tutorial.map_clicked = false;
        },
        
    },

      {
            id: 'ARCHI_TUT_03',
            message: "Empezamos por conquistar la isla pequeña paso a paso. Eres el Jugador 1 (invasor), inicias en la isla PEQUEÑA a la izquierda. El Jugador 2 (defensor) controla el resto.",
           // duration: 3500,
            onStepStart: () => {
                console.log("Paso 1B: Briefing completado");
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                console.log("Posiciones cargadas:", pos);
                if (pos.yourCapital) renderSingleHexVisuals(pos.yourCapital.r, pos.yourCapital.c);
                if (pos.enemyCapital) renderSingleHexVisuals(pos.enemyCapital.r, pos.enemyCapital.c);
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            highlightHexCoords: []
           actionCondition: () => gameState.tutorial.map_clicked === true 
        },
     
    { 
        id: 'TUT_04', 
        message: "Empecemos por entender tu panel de mando. Abajo a la derecha '⚙️' Toca el mapa para continuar.", 
        onStepStart: () => {
            centerMapOn(3, 1);
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    }

 { 
        id: 'TUT_05_MENU', 
        message: "Aquí encontrarás: 🎖️ a los Heroes, 🎒 tu Inventario, ⚔️ la Forja, ℹ️ La Ayuda, ✉️Tus mensajes, 💡 Tecnologías, C La Consola, y ☰ El panel de Información. Explóralos para conocer tu estado. Toca el mapa para continuar.", 
        onStepStart: () => {
            gameState.tutorial.map_clicked = false;

            // LÓGICA PARA ABRIR EL MENÚ AUTOMÁTICAMENTE
            const menuGroup = document.querySelector('.right-menu-group');
            const toggleBtn = document.getElementById('toggle-right-menu-btn');
            
            if (menuGroup && !menuGroup.classList.contains('is-open')) {
                menuGroup.classList.add('is-open');
                if (toggleBtn) toggleBtn.textContent = '✕'; // Cambia el icono a cerrar
            }
        },
        onStepEnd: () => {
            // OPCIONAL: Cerrar el menú al pasar al siguiente paso
            const menuGroup = document.querySelector('.right-menu-group');
            const toggleBtn = document.getElementById('toggle-right-menu-btn');
            
            if (menuGroup) {
                menuGroup.classList.remove('is-open');
                if (toggleBtn) toggleBtn.textContent = '⚙️';
            }
        },
        actionCondition: () => gameState.tutorial && gameState.tutorial.map_clicked === true 
    }
];
