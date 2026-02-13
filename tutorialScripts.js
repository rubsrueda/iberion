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
    ],

    archipelagoInvasor: [
        {
            id: 'ARCHI_TUT_00_INTRO',
            message: "¡Bienvenido, Invasor! Eres el Jugador 2 con una base pequeña. Tu objetivo: expandir tu territorio y conquistar la isla principal del enemigo, como lo haría la IA conquistadora.",
            duration: 3500,
            onStepStart: () => {
                gameState.currentPhase = "play";
                gameState.currentPlayer = 2;
                gameState.myPlayerNumber = 2;
                gameState.isTutorialActive = true;
                gameState.tutorial = gameState.tutorial || {};

                // Dar recursos abundantes para el tutorial
                gameState.playerResources[2].oro = 2000;
                gameState.playerResources[2].piedra = 800;
                gameState.playerResources[2].madera = 800;
                gameState.playerResources[2].hierro = 300;
                gameState.playerResources[2].comida = 600;
                gameState.playerResources[2].researchPoints = 300;

                // Garantizar tecnologías clave
                const techs = gameState.playerResources[2].researchedTechnologies || [];
                ['ENGINEERING', 'FORTIFICATIONS', 'NAVIGATION', 'LEADERSHIP', 'DRILL_TACTICS'].forEach(t => {
                    if (!techs.includes(t)) techs.push(t);
                });
                gameState.playerResources[2].researchedTechnologies = techs;

                // Crear unidad inicial de invasión en la capital del J2
                const myCapital = gameState.cities.find(c => c.owner === 2 && c.isCapital);
                if (myCapital && AiGameplayManager?.createUnitObject) {
                    const invaderUnit = AiGameplayManager.createUnitObject({
                        name: "Cuerpo Invasor",
                        regiments: [
                            { ...REGIMENT_TYPES["Infantería Pesada"], type: 'Infantería Pesada' },
                            { ...REGIMENT_TYPES["Caballería Ligera"], type: 'Caballería Ligera' },
                            { ...REGIMENT_TYPES["Arqueros"], type: 'Arqueros' }
                        ]
                    }, 2, { r: myCapital.r, c: myCapital.c });
                    if (invaderUnit) placeFinalizedDivision(invaderUnit, myCapital.r, myCapital.c);
                }

                if (UIManager) {
                    UIManager.updateActionButtonsBasedOnPhase();
                    UIManager.updateAllUIDisplays();
                }
            }
        },
        {
            id: 'ARCHI_TUT_00B_UNDERSTAND_MAP',
            message: "FASE 0B - LEE EL MAPA: Tienes una base en una isla pequeña (Archipiélago Invasor). El enemigo controla una isla mucho más grande (Archipiélago Defensor). El agua los separa. ¡Tu desafío: atravesar y conquistar!",
            duration: 4000,
            onStepStart: () => {
                const myCapital = gameState.cities.find(c => c.owner === 2 && c.isCapital);
                const enemyCapital = gameState.cities.find(c => c.owner === 1 && c.isCapital);
                if (myCapital && UIManager) {
                    UIManager.highlightTutorialElement(null, [{ r: myCapital.r, c: myCapital.c }]);
                }
            }
        },
        {
            id: 'ARCHI_TUT_00C_MOVEMENT',
            message: "FASE 0C - MOVIMIENTO: Toma tu unidad y muévela hacia el borde de tu isla. Las unidades gastan movimiento con cada paso y necesitan suministro (ciudades/fortalezas). ¡Mueve ahora!",
            onStepStart: () => {
                gameState.tutorial.unit_moved = false;
                const myUnit = units.find(u => u.player === 2);
                if (myUnit) selectUnit(myUnit);
            },
            actionCondition: () => gameState.tutorial.unit_moved === true
        },
        {
            id: 'ARCHI_TUT_00D_ECONOMY',
            message: "FASE 0D - ECONOMÍA DE GUERRA: Tu capital genera oro/comida cada turno. Sin economía = sin ejército. Necesitarás expandir tu territorio para obtener más ingresos. Mira tu panel de recursos arriba.",
            duration: 3500,
            onStepStart: () => {
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_00E_SUPPLY',
            message: "FASE 0E - SUMINISTRO CRÍTICO: Las unidades necesitan suministro (lines verdes) para moverse, atacar y reforzarse. Sale de ciudades/fortalezas tuyas. Sin suministro = unidad bloqueada. Mantén conexiones abiertas.",
            duration: 4000,
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
            }
        },
        {
            id: 'ARCHI_TUT_01_SPLIT_UNITS',
            message: "FASE 1 - DIVIDIR FUERZAS: Tu unidad es fuerte pero grande. Divídela (✂️) en dos divisiones: una pequeña (exploradores) y una grande (invasión principal). La IA hace esto para maximizar control territorial.",
            onStepStart: () => {
                gameState.tutorial.unit_split = false;
            },
            actionCondition: () => gameState.tutorial.unit_split === true
        },
        {
            id: 'ARCHI_TUT_02_ISLAND_EXPLORATION',
            message: "FASE 2 - EXPLORAR TU ISLA: Usa la división pequeña para explorar tu pequeño archipiélago. Busca recursos, minas de oro, comida. Aumentarán tus ingresos críticos. Ubica todos los recursos que puedas.",
            duration: 4000,
            onStepStart: () => {
                gameState.tutorial.exploration_phase = false;
            }
        },
        {
            id: 'ARCHI_TUT_03_BUILD_ROADS',
            message: "FASE 3 - INFRAESTRUCTURA CONECTADA: Construye Caminos (carta ENGINEERING) entre ciudades/recursos. Los caminos conectan tu territorio, abriendo líneas de suministro y rutas comerciales. Conecta todo.",
            onStepStart: () => {
                gameState.playerResources[2].piedra += 400;
                gameState.playerResources[2].madera += 400;
                gameState.tutorial.infrastructure_built = false;
            },
            actionCondition: () => gameState.tutorial.infrastructure_built === true
        },
        {
            id: 'ARCHI_TUT_04_FORTIFICATIONS',
            message: "FASE 4 - DEFENSAS LOCALES: Construye una pequeña Fortaleza (FORTIFICATIONS) en el borde de tu isla, orientada hacia el enemigo. Las fortalezas permiten reclutamiento y defensa. Serán cruciales cuando ataque el enemigo IA.",
            onStepStart: () => {
                gameState.tutorial.fortress_built = false;
            },
            actionCondition: () => gameState.tutorial.fortress_built === true
        },
        {
            id: 'ARCHI_TUT_05_TRADE_ROUTES',
            message: "FASE 5 - COMERCIO & CARAVANAS: Crea una Columna de Suministro y establece rutas comerciales entre tus ciudades. Generan oro pasivo continuo. Son críticas para financiar tu ejército invasor.",
            onStepStart: () => {
                let supply = units.find(u => u.player === 2 && u.regiments?.some(r => r.type === 'Columna de Suministro'));
                if (!supply && AiGameplayManager?.createUnitObject) {
                    supply = AiGameplayManager.createUnitObject({
                        name: "Caravana de Mercaderes",
                        regiments: [{ ...REGIMENT_TYPES["Columna de Suministro"], type: 'Columna de Suministro' }]
                    }, 2, { r: gameState.cities.find(c => c.owner === 2)?.r || 1, c: gameState.cities.find(c => c.owner === 2)?.c || 2 });
                    if (supply) placeFinalizedDivision(supply, supply.r, supply.c);
                }
                gameState.tutorial.trade_route_created = false;
            },
            actionCondition: () => gameState.tutorial.trade_route_created === true
        },
        {
            id: 'ARCHI_TUT_06_MERGE_FOR_WAR',
            message: "FASE 6 - CONSOLIDAR PARA GUERRA: Fusiona (☆) tus divisiones pequeñas en una formación grande y cohesiva. Necesitas 2x el poder estimado del enemigo para invadir con seguridad. Convierte tu pequeño ejército en una máquina de guerra.",
            onStepStart: () => {
                gameState.tutorial.unit_merged = false;
            },
            actionCondition: () => gameState.tutorial.unit_merged === true
        },
        {
            id: 'ARCHI_TUT_07_NAVAL_STRATEGY',
            message: "FASE 7 - ESTRATEGIA NAVAL: En mapas tipo Archipiélago, necesitarás Barcos de Guerra para cruzar el agua. Investiga NAVIGATION y construye barcos. Los barcos transportan tropas y bombardean costas enemigas.",
            onStepStart: () => {
                gameState.tutorial.naval_unit_created = false;
            },
            actionCondition: () => gameState.tutorial.naval_unit_created === true
        },
        {
            id: 'ARCHI_TUT_08_CROSS_WATER',
            message: "FASE 8 - CRUZAR EL AGUA: Embarca tu ejército invasor en un barco de guerra. Navega hacia aguas costeras enemigas. La IA usa esto para ataques anfibios sorpresa y desembarcos en la retaguardia.",
            onStepStart: () => {
                gameState.tutorial.amphibious_landing_done = false;
            },
            actionCondition: () => gameState.tutorial.amphibious_landing_done === true
        },
        {
            id: 'ARCHI_TUT_09_ISLAND_TOEHOLD',
            message: "FASE 9 - CABEZA DE PLAYA: Has desembarcado en territorio enemigo. Construye inmediatamente una Fortaleza (FORTIFICATIONS) como base de operaciones. Esta isla enemiga es ahora tu punto de apoyo. Consolida.",
            onStepStart: () => {
                gameState.tutorial.invasion_fortress_built = false;
            },
            actionCondition: () => gameState.tutorial.invasion_fortress_built === true
        },
        {
            id: 'ARCHI_TUT_10_PRODUCTION_BEGINS',
            message: "FASE 10 - MÁQUINA DE GUERRA: Con la fortaleza en territorio enemigo, produce masivamente. Crea 3-4 divisiones grandes cada turno. La IA satura el campo de batalla para abrumar defensas.",
            onStepStart: () => {
                gameState.playerResources[2].oro += 2000;
                gameState.playerResources[2].comida += 800;
                gameState.tutorial.heavy_divisions_produced = false;
            },
            actionCondition: () => gameState.tutorial.heavy_divisions_produced === true
        },
        {
            id: 'ARCHI_TUT_11_ECONOMIC_SABOTAGE',
            message: "FASE 11 - GUERRA ECONÓMICA: Saquea todas las ruinas/ciudades bárbaras del enemigo. Destruye sus caminos y Fortalezas menores. Debilita su economía mientras fortaleces la tuya. La IA siempre hace esto.",
            onStepStart: () => {
                gameState.tutorial.economic_warfare_started = false;
            },
            actionCondition: () => gameState.tutorial.economic_warfare_started === true
        },
        {
            id: 'ARCHI_TUT_12_SPLIT_PRESSURE',
            message: "FASE 12 - DIVIDIR MÁS: Divide una división grande en 2-3 más pequeñas para ocupar múltiples posiciones simultáneamente. Presiona en múltiples frentes. El enemigo no puede defenderlo todo.",
            duration: 3500,
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
            }
        },
        {
            id: 'ARCHI_TUT_13_SUPPLY_LINES_PUSH',
            message: "FASE 13 - LÍNEAS VITALES: Mientras avanzas, conecta constantemente con Caminos para mantener suministro. Las unidades sin suministro se bloquean. Extiende tus líneas como la IA: infraestructura + movimiento = conquista.",
            duration: 3500,
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
            }
        },
        {
            id: 'ARCHI_TUT_14_CAPITAL_SIEGE',
            message: "FASE 14 - SITIO FINAL: Aísla la Capital enemiga. Crea superioridad numérica 3:1. Bombardea con Artillería si la tienes. El enemigo controlador colapsará sin refuerzos. ¡La victoria está cerca!",
            duration: 4000,
            onStepStart: () => {
                gameState.tutorial = gameState.tutorial || {};
            }
        },
        {
            id: 'ARCHI_TUT_15_TOTAL_VICTORY',
            message: "FASE 15 - VICTORIA TOTAL: ¡Conquistaste la Capital enemiga! Así es como la IA invasora juega: expandir → conectar → producir masivamente → sitiar. Repite este ciclo y ganarás. ¡INVASIÓN COMPLETADA!",
            duration: 5000,
            onStepStart: () => {
                if (UIManager && UIManager.showRewardToast) {
                    UIManager.showRewardToast("¡TUTORIAL DE INVASIÓN COMPLETADO!", "⚔️🏆");
                    if (UIManager.setEndTurnButtonToFinalizeTutorial) {
                        UIManager.setEndTurnButtonToFinalizeTutorial();
                    }
                }
            },
            actionCondition: () => false
        }
    ]
};
