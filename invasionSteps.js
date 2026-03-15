// invasionSteps.js
const INVASION_STEPS = [
  
        {
            id: 'ARCHI_TUT_00B_INTRO',
            message: "Bienvenido, Invasor. Tu objetivo: conquistar la isla del enemigo paso a paso. Eres el Jugador 1 (invasor), controlando la isla PEQUEÑA a la izquierda. El Jugador 2 (defensor) controla la isla GRANDE a la derecha.",
            duration: 3500,
            onStepStart: () => {
                console.log("Paso 1B: Briefing completado");
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                console.log("Posiciones cargadas:", pos);
                if (pos.yourCapital) renderSingleHexVisuals(pos.yourCapital.r, pos.yourCapital.c);
                if (pos.enemyCapital) renderSingleHexVisuals(pos.enemyCapital.r, pos.enemyCapital.c);
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            highlightHexCoords: []
        },
        {
            id: 'ARCHI_TUT_00C_BASIC_MOVEMENT',
            message: "Fase 0C: Movimiento Básico. Selecciona una unidad en tu capital invasora (la isla pequeña a la izquierda) y muévela a una casilla adyacente.",
            highlightHexCoords: [],
            onStepStart: () => {
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 3, c: 1 };
                const unit = units && units.find(u => u.player === 1 && u.r === cap.r && u.c === cap.c);
                if (unit) {
                    unit.hasMoved = false;
                    unit.currentMovement = unit.movement;
                    selectUnit && selectUnit(unit);
                }
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.unit_moved = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => {
                const moved = units && units.find(u => u.player === 1 && u.hasMoved);
                return moved && (gameState.tutorial || {}).unit_moved === true;
            }
        },
        {
            id: 'ARCHI_TUT_00D_CITIES',
            message: "Fase 0D: Ciudades. Son puntos de control estratégicos. Generan ingresos (oro/comida), permiten reclutamiento y refuerzos. Tu capital está en (3,1) — isla pequeña. El enemigo controla (2,6) — isla grande.",
            duration: 3500,
            onStepStart: () => {
                // Resaltar ambas capitales
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                if (pos.yourCapital) renderSingleHexVisuals(pos.yourCapital.r, pos.yourCapital.c);
                if (pos.enemyCapital) renderSingleHexVisuals(pos.enemyCapital.r, pos.enemyCapital.c);
            }
        },
        {
            id: 'ARCHI_TUT_00E_ECONOMY',
            message: "Fase 0E: Impuestos & Economía. Cada ciudad genera oro/comida cada turno. Ves tus recursos arriba. Sin economía, no puedes producir/construir.",
            duration: 3500,
            onStepStart: () => {
                // Mostrar panel de recursos
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_00E_TERRITORY_CONTROL',
            message: "Fase 0E: Control de Terreno. Los hexágonos que controlas están marcados si tienes una ciudad, estructura o unidad allí. Tu terreno es defendido (isla pequeña izquierda). Terreno enemigo es rojo/bloqueado. Controla más = más ingresos.",
            duration: 4000,
            onStepStart: () => {
                // Marcar hexágonos alrededor de la capital invasora como propios
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 3, c: 1 };
                const ownHexes = [
                    { r: cap.r-1, c: cap.c }, { r: cap.r+1, c: cap.c },
                    { r: cap.r, c: cap.c-1 }, { r: cap.r, c: cap.c+1 }
                ];
                ownHexes.forEach(hex => {
                    if (board[hex.r]?.[hex.c] && board[hex.r][hex.c].terrain !== 'water') {
                        board[hex.r][hex.c].owner = 1;
                        renderSingleHexVisuals(hex.r, hex.c);
                    }
                });
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: 'ARCHI_TUT_00F_SUPPLY',
            message: "Fase 0F: Suministro & Refuerzos. Las unidades necesitan suministro para moverse, atacar y reforzarse. Suministro viene de: (1) ciudades/fortalezas propias, (2) caminos/infraestructura conectados.",
            duration: 4000,
            onStepStart: () => {
                // Crear un camino de demo
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 3, c: 1 };
                if (board[cap.r + 1]?.[cap.c + 1]) {
                    board[cap.r + 1][cap.c + 1].structure = 'Camino';
                    board[cap.r + 1][cap.c + 1].owner = 1;
                    renderSingleHexVisuals(cap.r + 1, cap.c + 1);
                }
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
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 2, c: 2 };
                const unit = units.find(u => u.player === 2 && u.r === cap.r && u.c === cap.c);
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
                    const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                    const cap = pos.yourCapital || { r: 2, c: 2 };
                    supply = AiGameplayManager.createUnitObject({
                        name: "Columna de Comercio",
                        regiments: [{ ...REGIMENT_TYPES["Columna de Suministro"], type: 'Columna de Suministro' }]
                    }, 2, { r: cap.r, c: cap.c });
                    placeFinalizedDivision(supply, cap.r, cap.c);
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
];
