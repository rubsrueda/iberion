// En tutorialScripts.js

console.log("tutorialScripts.js CARGADO - v11 (tutorial narrativo 10 min)");

const TUTORIAL_SCRIPTS = {
    completo: [
        {
            id: 'TUT_00_BRIEFING',
            message: "Bienvenido, General. En 3 minutos veras lo esencial: tactica, economia y dominio del mapa.",
            duration: 2500,
            onStepStart: () => {
                gameState.currentPhase = "play";
                gameState.currentPlayer = 1;
                gameState.myPlayerNumber = 1;

                addCityToBoardData(1, 1, 1, "Tu Capital", true);
                renderSingleHexVisuals(1, 1);

                gameState.playerResources[1].oro += 800;
                gameState.playerResources[1].piedra += 600;
                gameState.playerResources[1].madera += 600;
                gameState.playerResources[1].hierro += 300;
                gameState.playerResources[1].comida += 300;
                gameState.playerResources[1].researchPoints = 120;

                if (UIManager) {
                    UIManager.updateActionButtonsBasedOnPhase();
                    UIManager.updateAllUIDisplays();
                }
            },
            highlightHexCoords: [{ r: 1, c: 1 }]
        },
        {
            id: 'TUT_01_MAP_CLICK',
            message: "Toca el mapa para confirmar tu mando.",
            onStepStart: () => { gameState.tutorial.map_clicked = false; },
            actionCondition: () => gameState.tutorial.map_clicked === true
        },
        {
            id: 'TUT_02_MENU_OPEN',
            message: "Abre el menu (☰). Aqui veras recursos, turno y estado del imperio.",
            highlightElementId: 'floatingMenuBtn',
            onStepStart: () => { gameState.tutorial.menu_opened = false; },
            actionCondition: () => gameState.tutorial.menu_opened === true
        },
        {
            id: 'TUT_03_CREATE_DIVISION',
            message: "Selecciona tu capital y pulsa <strong>Crear Division (➕)</strong>.",
            highlightElementId: 'floatingCreateDivisionBtn',
            onStepStart: () => {
                const capitalHex = board[1][1];
                if (capitalHex) UIManager.showHexContextualInfo(1, 1, capitalHex);
            },
            highlightHexCoords: [{ r: 1, c: 1 }],
            actionCondition: () => domElements.unitManagementModal.style.display === 'flex'
        },
        {
            id: 'TUT_04_BUILD_DIVISION',
            message: "Agrega <strong>3 regimientos de Infanteria Ligera</strong> con el boton +.",
            actionCondition: () => typeof currentDivisionBuilder !== 'undefined' &&
                currentDivisionBuilder.length >= 3 &&
                currentDivisionBuilder.every(r => r.type === 'Infantería Ligera')
        },
        {
            id: 'TUT_05_FINALIZE_DIVISION',
            message: "Pulsa <strong>Finalizar y Colocar</strong>.",
            highlightElementId: 'finalizeUnitManagementBtn',
            actionCondition: () => placementMode.active === true
        },
        {
            id: 'TUT_06_PLACE_DIVISION',
            message: "Coloca la division en la casilla resaltada.",
            highlightHexCoords: [{ r: 2, c: 2 }],
            actionCondition: () => units.some(u => u.player === 1 && u.r === 2 && u.c === 2)
        },
        {
            id: 'TUT_07_RESOURCE_MOVE',
            message: "La economia manda. Mueve tu division a la mina de oro (2,1).",
            highlightHexCoords: [{ r: 2, c: 1 }],
            onStepStart: () => {
                resetUnitsForNewTurn(1);
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) {
                    playerUnit.hasMoved = false;
                    playerUnit.hasAttacked = false;
                    playerUnit.currentMovement = playerUnit.movement;
                }
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => units.some(u => u.player === 1 && u.r === 2 && u.c === 1)
        },
        {
            id: 'TUT_08_COMBAT',
            message: "Un explorador enemigo aparece. Atacalo y gana tu primer combate.",
            highlightHexCoords: [{ r: 3, c: 2 }],
            onStepStart: () => {
                const playerUnit = units.find(u => u.player === 1);
                const enemyTarget = playerUnit ? { r: playerUnit.r + 1, c: playerUnit.c } : { r: 3, c: 2 };
                const enemy = AiGameplayManager.createUnitObject({
                    name: "Explorador Hostil",
                    regiments: [{ ...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera', health: 100 }]
                }, 2, enemyTarget);
                placeFinalizedDivision(enemy, enemyTarget.r, enemyTarget.c);
                if (playerUnit) { playerUnit.hasAttacked = false; }
                gameState.tutorial.attack_completed = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.tutorial.attack_completed
        },
        {
            id: 'TUT_09_END_TURN',
            message: "Termina el turno (►) para poder actuar de nuevo.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => { gameState.tutorial.turnEnded = false; },
            actionCondition: () => gameState.tutorial.turnEnded === true
        },
        {
            id: 'TUT_10_SPLIT',
            message: "Divide la unidad con <strong>Dividir (✂️)</strong> y coloca la nueva division en (3,2).",
            highlightElementId: 'floatingSplitBtn',
            highlightHexCoords: [{ r: 3, c: 2 }],
            onStepStart: () => {
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) { selectUnit(playerUnit); }
                gameState.tutorial.unit_split = false;
            },
            actionCondition: () => gameState.tutorial.unit_split
        },
        {
            id: 'TUT_11_SUPPLY_INFO',
            message: "Sin suministro tus tropas sufren. Curar solo es posible en capital o adyacente.",
            duration: 3500
        },
        {
            id: 'TUT_12_SUPPLY_MOVE',
            message: "Mueve tu unidad danada junto a la capital (1,2).",
            highlightHexCoords: [{ r: 1, c: 2 }],
            onStepStart: () => {
                const unit = units.find(u => u.player === 1);
                if (unit) {
                    unit.regiments.forEach(reg => { reg.health = Math.max(20, Math.floor(reg.health * 0.5)); });
                    recalculateUnitHealth(unit);
                }
                resetUnitsForNewTurn(1);
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => units.some(u => u.player === 1 && u.r === 1 && u.c === 2)
        },
        {
            id: 'TUT_13_REINFORCE',
            message: "Pulsa <strong>Gestionar/Reforzar (💪)</strong> y cura un regimiento.",
            highlightElementId: 'floatingReinforceBtn',
            onStepStart: () => { gameState.tutorial.unitReinforced = false; },
            actionCondition: () => gameState.tutorial.unitReinforced
        },
        {
            id: 'TUT_14_TECH_OPEN',
            message: "La ciencia define el futuro. Abre el <strong>Arbol Tecnologico (💡)</strong>.",
            highlightElementId: 'floatingTechTreeBtn',
            actionCondition: () => domElements.techTreeScreen.style.display === 'flex'
        },
        {
            id: 'TUT_15_TECH_ENGINEERING',
            message: "Investiga <strong>Ingenieria Civil</strong> para construir caminos.",
            onStepStart: () => {
                gameState.playerResources[1].researchPoints = 120;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('ENGINEERING')
        },
        {
            id: 'TUT_16_BUILD_ROAD',
            message: "Construye un <strong>Camino</strong> en un hex propio y vacio (1,3). Selecciona el hex y pulsa <strong>Construir</strong>.",
            highlightHexCoords: [{ r: 1, c: 3 }],
            onStepStart: () => {
                if (typeof closeTechTreeScreen === 'function') closeTechTreeScreen();
                if (board[1]?.[3]) {
                    board[1][3].owner = 1;
                    board[1][3].structure = null;
                    renderSingleHexVisuals(1, 3);
                }
                gameState.playerResources[1].piedra += 200;
                gameState.playerResources[1].madera += 200;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => board[1][3]?.structure === 'Camino'
        },
        {
            id: 'TUT_17_TECH_FORTIFICATIONS',
            message: "Ahora fortifica la frontera. Investiga <strong>Fortificaciones</strong>.",
            onStepStart: () => {
                gameState.playerResources[1].researchPoints = 160;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('FORTIFICATIONS')
        },
        {
            id: 'TUT_18_BUILD_FORT',
            message: "Mejora el camino a <strong>Fortaleza</strong> en (1,3).",
            highlightHexCoords: [{ r: 1, c: 3 }],
            onStepStart: () => {
                gameState.playerResources[1].piedra += 1200;
                gameState.playerResources[1].hierro += 500;
                gameState.playerResources[1].oro += 800;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => board[1][3]?.structure === 'Fortaleza'
        },
        {
            id: 'TUT_19_TRADE_ROUTE',
            message: "El comercio sostiene la guerra. Crea una ruta comercial con la <strong>Columna de Suministro</strong>.",
            highlightElementId: 'floatingTradeBtn',
            onStepStart: () => {
                addCityToBoardData(1, 4, 1, null, false);
                board[1][2].structure = 'Camino';
                renderSingleHexVisuals(1, 2);

                const supply = AiGameplayManager.createUnitObject({
                    name: "Columna de Suministro",
                    regiments: [{ ...REGIMENT_TYPES["Columna de Suministro"], type: 'Columna de Suministro' }]
                }, 1, { r: 1, c: 1 });
                placeFinalizedDivision(supply, 1, 1);
                supply.hasMoved = false;
                supply.hasAttacked = false;
                selectUnit(supply);
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => units.some(u => u.player === 1 && u.tradeRoute)
        },
        {
            id: 'TUT_20_TACTICS_INFO',
            message: "Concepto tactico: flanquea, usa terreno (bosques/colinas) y controla el suministro. Estrategico: ciudades, rutas y fortalezas definen la economia.",
            duration: 4200
        },
        {
            id: 'TUT_21_NAVAL_INFO',
            message: "Naval y desembarcos: las flotas transportan tropas y abren frentes. Busca costas seguras y protege la ruta.",
            duration: 3800
        },
        {
            id: 'TUT_22_VICTORY_POINTS',
            message: "Victoria rapida: el juego termina cuando un jugador llega a <strong>8 puntos de victoria</strong>.",
            duration: 3500
        },
        {
            id: 'TUT_23_FINISH',
            message: "Listo, General. Pulsa la bandera para finalizar y empieza tu primera partida.",
            onStepStart: () => {
                if (UIManager) {
                    UIManager.showRewardToast("¡TUTORIAL COMPLETADO!", "🏆");
                    UIManager.setEndTurnButtonToFinalizeTutorial();
                }
            },
            actionCondition: () => false
        }
    ]
};