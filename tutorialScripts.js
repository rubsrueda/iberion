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
            message: "1) Reclutar unidades: selecciona tu capital, crea una división y colócala en (2,2). Intenta moverla: no podrás porque la división se creó con un regimiento de Infantería Pesada que no puede atravesar bosque. Divide la división (✂️) para quitar ese regimiento y poder moverte a través del bosque.",
            highlightElementId: 'floatingCreateDivisionBtn',
            highlightHexCoords: [{ r: 2, c: 2 }],
            // También resaltamos el botón de dividir en la UI para guiar al usuario
            highlightSplitBtn: 'floatingSplitBtn',
            onStepStart: () => {
                const capitalHex = board[1][1];
                if (capitalHex) UIManager.showHexContextualInfo(1, 1, capitalHex);

                // Preparar el escenario: marcar el hex destino como bosque
                if (board[2]?.[2]) {
                    board[2][2].terrain = board[2][2].terrain || 'Bosque';
                    renderSingleHexVisuals(2, 2);
                }

                // Reiniciar flag de división para esta etapa del tutorial
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.unit_split = false;

                // Si ya existe una unidad en (2,2) la convertimos en una unidad con
                // Infantería Pesada para representar la restricción de movimiento.
                const placedUnit = units.find(u => u.player === 1 && u.r === 2 && u.c === 2);
                if (placedUnit) {
                    if (typeof REGIMENT_TYPES !== 'undefined' && REGIMENT_TYPES["Infantería Pesada"]) {
                        placedUnit.regiments = [{ ...REGIMENT_TYPES["Infantería Pesada"], type: 'Infantería Pesada', health: 100 }];
                        recalculateUnitHealth && recalculateUnitHealth(placedUnit);
                    }
                }
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => {
                // Requerimos que la unidad exista en (2,2) y que el jugador haya dividido la unidad
                return units.some(u => u.player === 1 && u.r === 2 && u.c === 2) && (gameState.tutorial || {}).unit_split === true;
            }
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
    ],

    archipelagoInvasor: [
        {
            id: 'ARCHI_TUT_00_INTRO',
            message: "¡Bienvenido, Invasor! Eres el Jugador 2. Tu objetivo: invadir la isla del enemigo paso a paso, como lo haría la IA.",
            duration: 3000,
            onStepStart: () => {
                gameState.currentPhase = "play";
                gameState.currentPlayer = 2;
                gameState.myPlayerNumber = 2;
                gameState.setupTempSettings = gameState.setupTempSettings || {};
                gameState.setupTempSettings.navalMap = true;

                addCityToBoardData(5, 5, 1, "Capital Enemiga", true);
                addCityToBoardData(2, 2, 2, "Tu Capital Invasora", true);

                gameState.playerResources[2].oro = 1500;
                gameState.playerResources[2].piedra = 800;
                gameState.playerResources[2].madera = 800;
                gameState.playerResources[2].hierro = 500;
                gameState.playerResources[2].comida = 500;
                gameState.playerResources[2].researchPoints = 200;

                const techs = gameState.playerResources[2].researchedTechnologies || [];
                ['ENGINEERING', 'FORTIFICATIONS', 'NAVIGATION', 'LEADERSHIP', 'DRILL_TACTICS'].forEach(t => {
                    if (!techs.includes(t)) techs.push(t);
                });
                gameState.playerResources[2].researchedTechnologies = techs;

                if (UIManager) {
                    UIManager.updateActionButtonsBasedOnPhase();
                    UIManager.updateAllUIDisplays();
                }
            },
            highlightHexCoords: [{ r: 2, c: 2 }]
        },
        {
            id: 'ARCHI_TUT_00B_BASIC_MOVEMENT',
            message: "FASE 0B - MOVIMIENTO BÁSICO: Selecciona tu unidad en (2,2) y muévela a una casilla adyacente. Las unidades se mueven en hexágonos conectados, consumen movimiento y necesitan suministro.",
            highlightHexCoords: [{ r: 3, c: 2 }],
            onStepStart: () => {
                const unit = units.find(u => u.player === 2 && u.r === 2 && u.c === 2);
                if (unit) {
                    unit.hasMoved = false;
                    unit.currentMovement = unit.movement;
                    selectUnit(unit);
                }
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.unit_moved = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => {
                const moved = units.find(u => u.player === 2 && u.hasMoved);
                return moved && (gameState.tutorial || {}).unit_moved === true;
            }
        },
        {
            id: 'ARCHI_TUT_00C_CITIES',
            message: "FASE 0C - CIUDADES: Son puntos de control estratégicos. Generan ingresos (oro/comida), permiten refuerzos, reclutamiento y caravanas. Tu capital está en (2,2). El enemigo controla (5,5).",
            duration: 3500,
            onStepStart: () => {
                // Resaltar ambas capitales
                renderSingleHexVisuals(2, 2);
                renderSingleHexVisuals(5, 5);
            }
        },
        {
            id: 'ARCHI_TUT_00D_ECONOMY',
            message: "FASE 0D - IMPUESTOS & ECONOMÍA: Cada ciudad genera oro/comida cada turno (impuestos territoriales). Puedes ver tus recursos arriba. Caravanas dan ingresos extra. Sin economía, no puedes producir/construir.",
            duration: 3500,
            onStepStart: () => {
                // Mostrar panel de recursos
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_00E_TERRITORY_CONTROL',
            message: "FASE 0E - CONTROL DE TERRENO: Los hexágonos te pertenecen si tienes una ciudad, estructura o unidad allí. El terreno enemigo sombreado en rojo = prohibido. Tu terreno está protegido: solo tú puedes construir/ocupar. Controla más = más ingresos.",
            duration: 4000,
            onStepStart: () => {
                // Marcar algunos hexágonos como propios
                const ownHexes = [
                    { r: 2, c: 1 }, { r: 2, c: 3 },
                    { r: 1, c: 2 }, { r: 3, c: 2 }
                ];
                ownHexes.forEach(hex => {
                    if (board[hex.r]?.[hex.c]) {
                        board[hex.r][hex.c].owner = 2;
                        renderSingleHexVisuals(hex.r, hex.c);
                    }
                });
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_00F_SUPPLY',
            message: "FASE 0F - SUMINISTRO & REFUERZOS: Las unidades necesitan suministro para moverse, atacar y reforzarse. Suministro viene de: (1) ciudades/fortalezas propias, (2) caminos/infraestructura conectados. Sin suministro = unidad bloqueada.",
            duration: 4000,
            onStepStart: () => {
                // Crear un hexágono sin suministro para demostrar
                if (board[4]?.[4]) {
                    board[4][4].owner = null; // Sin dueño = sin suministro
                    renderSingleHexVisuals(4, 4);
                }
                // Crear un camino para mostrar conexión
                if (board[2]?.[3]) {
                    board[2][3].structure = 'Camino';
                    board[2][3].owner = 2;
                    renderSingleHexVisuals(2, 3);
                }
                gameState.playerResources[2].madera += 100;
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_01_DEFENSIVE_MERGE',
            message: "FASE 1 - FUSIÓN DEFENSIVA: Crea 2 divisiones pequeñas, luego fúsionalas para defenderte de amenazas. La IA lo hace automáticamente cuando detecta peligro.",
            onStepStart: () => {
                const enemy1 = AiGameplayManager?.createUnitObject ? AiGameplayManager.createUnitObject({
                    name: "Patrulla Enemiga",
                    regiments: [
                        { ...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera' },
                        { ...REGIMENT_TYPES["Arqueros"], type: 'Arqueros' }
                    ]
                }, 1, { r: 1, c: 2 }) : null;

                if (enemy1) placeFinalizedDivision(enemy1, 1, 2);

                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.merged_units = false;
            },
            actionCondition: () => (gameState.tutorial || {}).merged_units === true
        },
        {
            id: 'ARCHI_TUT_02_STRATEGIC_SPLIT',
            message: "FASE 2 - DIVISIÓN ESTRATÉGICA: Para ocupar más territorio, divide tu unidad grande. La IA expande presencia constantemente.",
            onStepStart: () => {
                const unit = units.find(u => u.player === 2 && u.r === 2 && u.c === 2);
                if (unit && (unit.regiments?.length || 0) <= 5) {
                    const comp = ['Infantería Pesada', 'Infantería Pesada', 'Arqueros', 'Caballería Ligera', 'Infantería Pesada'];
                    for (let i = 0; i < 2; i++) {
                        if (AiGameplayManager?.produceUnit) {
                            AiGameplayManager.produceUnit(2, comp, 'attacker', `Cuerpo-${i}`);
                        }
                    }
                }
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.unit_split_archi = false;
            },
            actionCondition: () => (gameState.tutorial || {}).unit_split_archi === true
        },
        {
            id: 'ARCHI_TUT_03_BARBARIAN_CONQUEST',
            message: "FASE 3 - CONQUISTA BÁRBARA: Localiza ciudades bárbaras (neutras). Son objetivos fáciles para expandir. Mira al tablero: verás puntos sin dueño.",
            duration: 3500,
            onStepStart: () => {
                addCityToBoardData(4, 4, null, "Hamlet Bárbaro", false);
                addCityToBoardData(3, 4, null, "Pueblito Bárbaro", false);
            }
        },
        {
            id: 'ARCHI_TUT_04_EXPEDITION_POWER',
            message: "FASE 4 - FORMAR EXPEDICIÓN: Reúne 2x el poder de la guarnición bárbara. Conquista (4,4). La IA calcula esto automáticamente.",
            highlightHexCoords: [{ r: 4, c: 4 }],
            onStepStart: () => {
                resetUnitsForNewTurn(2);
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.barbarian_conquered = false;
            },
            actionCondition: () => (gameState.tutorial || {}).barbarian_conquered === true
        },
        {
            id: 'ARCHI_TUT_05_INFRASTRUCTURE',
            message: "FASE 5 - INFRAESTRUCTURA: Construye Caminos y Fortalezas en territorios clave. Conectan ciudades, abren rutas comerciales y permiten refuerzos.",
            highlightHexCoords: [{ r: 3, c: 3 }],
            onStepStart: () => {
                gameState.playerResources[2].piedra += 300;
                gameState.playerResources[2].madera += 300;
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.infrastructure_built = false;
            },
            actionCondition: () => (gameState.tutorial || {}).infrastructure_built === true
        },
        {
            id: 'ARCHI_TUT_06_TRADE_ROUTES',
            message: "FASE 6 - CARAVANAS COMERCIALES: Crea rutas entre ciudades. Generan oro pasivo para financiar la guerra. Essential para mantener producción.",
            onStepStart: () => {
                let supply = units.find(u => u.player === 2 && u.regiments?.some(r => r.type === 'Columna de Suministro'));
                if (!supply && AiGameplayManager?.createUnitObject) {
                    supply = AiGameplayManager.createUnitObject({
                        name: "Columna de Comercio",
                        regiments: [{ ...REGIMENT_TYPES["Columna de Suministro"], type: 'Columna de Suministro' }]
                    }, 2, { r: 2, c: 2 });
                    placeFinalizedDivision(supply, 2, 2);
                }
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.trade_route_created = false;
            },
            actionCondition: () => (gameState.tutorial || {}).trade_route_created === true
        },
        {
            id: 'ARCHI_TUT_07_PRESSURE_FORTRESS',
            message: "FASE 7 - FORTALEZA DE PRESIÓN: Ocupa territorio enemigo y construye una Fortaleza. Esto activa automáticamente producción de refuerzos masivos.",
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.invasion_fortress_built = false;
            },
            actionCondition: () => (gameState.tutorial || {}).invasion_fortress_built === true
        },
        {
            id: 'ARCHI_TUT_08_MASS_PRODUCTION',
            message: "FASE 8 - PRODUCCIÓN EN MASA: Con la fortaleza construida, la IA produce múltiples divisiones grandes (6+ regimientos) cada turno para presionar.",
            onStepStart: () => {
                gameState.playerResources[2].oro += 1000;
                gameState.playerResources[2].comida += 500;
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.heavy_divisions_created = false;
            },
            actionCondition: () => (gameState.tutorial || {}).heavy_divisions_created === true
        },
        {
            id: 'ARCHI_TUT_09_NAVAL_PRESENCE',
            message: "FASE 9 - PRESENCIA NAVAL: Crea Barcos de Guerra para (1) bombardear, (2) transportar tropas a la retaguardia enemiga.",
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.naval_unit_created = false;
            },
            actionCondition: () => (gameState.tutorial || {}).naval_unit_created === true
        },
        {
            id: 'ARCHI_TUT_10_AMPHIBIOUS_LANDING',
            message: "FASE 10 - DESEMBARCO ANFIBIO: Embarca tropas en un barco, navega a aguas costeras enemigas y desembarca para golpes de mano.",
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.amphibious_landing_done = false;
            },
            actionCondition: () => (gameState.tutorial || {}).amphibious_landing_done === true
        },
        {
            id: 'ARCHI_TUT_11_ECONOMIC_WARFARE',
            message: "FASE 11 - GUERRA ECONÓMICA: Saquea ruinas enemigas y arrastra infraestructura enemiga. Debilita su economía y rutas comerciales.",
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.economic_warfare_started = false;
            },
            actionCondition: () => (gameState.tutorial || {}).economic_warfare_started === true
        },
        {
            id: 'ARCHI_TUT_12_HUNTER_DIVISIONS',
            message: "FASE 12 - DIVISIONES CAZADORAS: Si el enemigo crea divisiones pequeñas (1-2 regimientos), crea divisiones de 3 regimientos para cazarlas.",
            duration: 3500
        },
        {
            id: 'ARCHI_TUT_13_HEAVY_RESPONSE',
            message: "FASE 13 - RESPUESTA PESADA: Si el enemigo crea una división grande (10+), fusiona o produce divisiones para igualar su poder combativo.",
            duration: 3500
        },
        {
            id: 'ARCHI_TUT_14_SUPPLY_LINES',
            message: "FASE 14 - LÍNEAS DE SUMINISTRO: Mantén caminos conectados. Las unidades solo se refuerzan desde ciudades/fortalezas propias o estructuras aliadas.",
            duration: 3500
        },
        {
            id: 'ARCHI_TUT_15_CYCLE_REPEAT',
            message: "FASE 15 - CICLO INFINITO: Repite: defender → expandir → conquistar → construir → producir → presionar. La IA lo hace cada turno sin piedad. ¡Buena suerte, General!",
            duration: 4000,
            onStepStart: () => {
                if (UIManager && UIManager.showRewardToast) {
                    UIManager.showRewardToast("¡TUTORIAL DE INVASIÓN COMPLETADO!", "⚔️");
                    if (UIManager.setEndTurnButtonToFinalizeTutorial) {
                        UIManager.setEndTurnButtonToFinalizeTutorial();
                    }
                }
            },
            actionCondition: () => false
        }
    ]
};
