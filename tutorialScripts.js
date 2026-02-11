// En tutorialScripts.js

console.log("tutorialScripts.js CARGADO - v11 (tutorial narrativo 10 min)");

const TUTORIAL_SCRIPTS = {
    completo: [
        {
            id: 'TUT_00_BRIEFING',
            message: "Bienvenido, General. Este turno guia recorre 15 puntos clave del mando.",
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
                gameState.playerResources[1].researchPoints = 140;

                if (UIManager) {
                    UIManager.updateActionButtonsBasedOnPhase();
                    UIManager.updateAllUIDisplays();
                }
            },
            highlightHexCoords: [{ r: 1, c: 1 }]
        },
        {
            id: 'TUT_01_RECRUIT',
            message: "1) Reclutar unidades: selecciona tu capital, crea una division y colócala en (2,2).",
            highlightElementId: 'floatingCreateDivisionBtn',
            highlightHexCoords: [{ r: 2, c: 2 }],
            onStepStart: () => {
                const capitalHex = board[1][1];
                if (capitalHex) UIManager.showHexContextualInfo(1, 1, capitalHex);
            },
            actionCondition: () => units.some(u => u.player === 1 && u.r === 2 && u.c === 2)
        },
        {
            id: 'TUT_02_SELECT_READ',
            message: "2) Seleccion y lectura del tablero: toca cualquier hex para leer terreno y rangos.",
            onStepStart: () => { gameState.tutorial.map_clicked = false; },
            actionCondition: () => gameState.tutorial.map_clicked === true
        },
        {
            id: 'TUT_03_MOVE',
            message: "3) Movimiento: mueve tu division a la mina de oro (2,1).",
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
            id: 'TUT_04_COMBAT',
            message: "4) Combate: derrota al explorador enemigo que aparece al sur.",
            highlightHexCoords: [{ r: 3, c: 1 }],
            onStepStart: () => {
                const enemy = AiGameplayManager.createUnitObject({
                    name: "Explorador Hostil",
                    regiments: [{ ...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera', health: 100 }]
                }, 2, { r: 3, c: 1 });
                placeFinalizedDivision(enemy, 3, 1);
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) { playerUnit.hasAttacked = false; }
                gameState.tutorial.attack_completed = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.tutorial.attack_completed
        },
        {
            id: 'TUT_05_SPLIT_MERGE',
            message: "5) Dividir y unir: divide la unidad (✂️) y coloca la nueva division en (3,2).",
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
            id: 'TUT_06_REINFORCE',
            message: "6) Reforzar y consolidar: lleva una unidad danada junto a la capital (1,2) y reforzala.",
            highlightHexCoords: [{ r: 1, c: 2 }],
            highlightElementId: 'floatingReinforceBtn',
            onStepStart: () => {
                const unit = units.find(u => u.player === 1);
                if (unit) {
                    unit.regiments.forEach(reg => { reg.health = Math.max(20, Math.floor(reg.health * 0.5)); });
                    recalculateUnitHealth(unit);
                }
                resetUnitsForNewTurn(1);
                gameState.tutorial.unitReinforced = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.tutorial.unitReinforced
        },
        {
            id: 'TUT_07_STRUCTURES',
            message: "7) Construccion: con ENGINEERING construye un Camino en (1,3). Fortaleza mejora caminos con FORTIFICATIONS; ciudades requieren Colono.",
            highlightHexCoords: [{ r: 1, c: 3 }],
            onStepStart: () => {
                const techs = gameState.playerResources[1].researchedTechnologies;
                if (!techs.includes('ENGINEERING')) techs.push('ENGINEERING');
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
            id: 'TUT_08_TRADE_ROUTE',
            message: "8) Comercio y rutas: crea una ruta comercial con la Columna de Suministro.",
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
            id: 'TUT_09_EXPLORE_PILLAGE',
            message: "9) Exploracion y saqueo: las ruinas dan botin y saquear debilita economias enemigas.",
            duration: 3200
        },
        {
            id: 'TUT_10_RAZE_DISBAND',
            message: "10) Arrasar y disolver: destruir infraestructura corta rutas; disolver recupera parte del coste.",
            duration: 3200
        },
        {
            id: 'TUT_11_ASSIGN_COMMANDER',
            message: "11) Asignar comandante: en puntos de reclutamiento y con liderazgo investigado.",
            duration: 3200
        },
        {
            id: 'TUT_12_END_TURN',
            message: "12) Fin de turno: pulsa ► para cerrar acciones y preparar el siguiente turno.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => { gameState.tutorial.turnEnded = false; },
            actionCondition: () => gameState.tutorial.turnEnded === true
        },
        {
            id: 'TUT_13_CHAIN',
            message: "13) Cadena tactica: suministro, movimiento, combate, control, construccion, reclutamiento, plan.",
            duration: 3500
        },
        {
            id: 'TUT_14_ERRORS',
            message: "14) Errores comunes: mover sin suministro, atacar mal posicionado, expandir sin rutas.",
            duration: 3500
        },
        {
            id: 'TUT_15_TACTIC_STRATEGY',
            message: "15) Lo tactico y lo estrategico: posicion gana batallas, infraestructura gana guerras. Pulsa la bandera para finalizar.",
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