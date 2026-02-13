// En tutorialScripts.js

console.log("tutorialScripts.js CARGADO - v11 (tutorial narrativo 10 min)");

const TUTORIAL_SCRIPTS = {
    completo: [
        // Tutorial compacto y funcional: reclutar, dividir para atravesar bosque, mover, combatir y finalizar.
        {
            id: 'TUT_00_BRIEFING',
            message: "Bienvenido, General. Este tutorial rápido te enseñará reclutar, dividir, moverte por bosque y combatir.",
            duration: 2200,
            onStepStart: () => {
                gameState.currentPhase = "play";
                gameState.currentPlayer = 1;
                gameState.myPlayerNumber = 1;

                // Asegurar estructura mínima del tutorial y flags
                gameState.tutorial = gameState.tutorial || {};
                gameState.tutorial.unit_split = false;
                gameState.tutorial.attack_completed = false;
                gameState.tutorial.turnEnded = false;

                // Ubicar dos capitales en casillas de tierra usando helper seguro
                const rows = (board || []).length || 10;
                const cols = (board && board[0]) ? board[0].length : 10;
                const cap1 = typeof findDistributedLandPosition === 'function'
                    ? findDistributedLandPosition({ minR: 1, maxR: Math.max(2, Math.floor(rows * 0.3)), minC: 1, maxC: Math.max(2, Math.floor(cols * 0.3)), maxAttempts: 500 })
                    : { r: 1, c: 1 };
                const cap2 = typeof findDistributedLandPosition === 'function'
                    ? findDistributedLandPosition({ minR: Math.max(2, Math.floor(rows * 0.6)), maxR: Math.max(3, rows - 2), minC: Math.max(2, Math.floor(cols * 0.6)), maxC: Math.max(3, cols - 2), maxAttempts: 500 })
                    : { r: Math.max(5, rows - 2), c: Math.max(5, cols - 3) };

                addCityToBoardData(cap1.r, cap1.c, 1, "Tu Capital", true);
                renderSingleHexVisuals(cap1.r, cap1.c);
                addCityToBoardData(cap2.r, cap2.c, 2, "Capital Enemiga", true);
                renderSingleHexVisuals(cap2.r, cap2.c);

                // Dar recursos útiles
                const res = gameState.playerResources[1];
                if (res) {
                    res.oro = (res.oro || 0) + 800;
                    res.piedra = (res.piedra || 0) + 400;
                    res.madera = (res.madera || 0) + 400;
                    res.hierro = (res.hierro || 0) + 200;
                    res.comida = (res.comida || 0) + 200;
                }

                // Crear una unidad de demostración en la capital del jugador 1
                if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.createUnitObject) {
                    const demo = AiGameplayManager.createUnitObject({
                        name: 'División Demo',
                        regiments: [
                            { ...(REGIMENT_TYPES && REGIMENT_TYPES['Infantería Pesada'] ? REGIMENT_TYPES['Infantería Pesada'] : {}), type: 'Infantería Pesada', health: 100 },
                            { ...(REGIMENT_TYPES && REGIMENT_TYPES['Infantería Ligera'] ? REGIMENT_TYPES['Infantería Ligera'] : {}), type: 'Infantería Ligera', health: 100 }
                        ]
                    }, 1, { r: cap1.r, c: cap1.c });
                    if (demo && typeof placeFinalizedDivision === 'function') placeFinalizedDivision(demo, cap1.r, cap1.c);
                }

                // Elegir un hex objetivo cercano para demostrar bosque + bloqueo de Infantería Pesada
                let target = null;
                const neigh = [ [0,1],[1,0],[0,-1],[-1,0],[1,-1],[-1,1] ];
                for (const d of neigh) {
                    const rr = cap1.r + d[0];
                    const cc = cap1.c + d[1];
                    if (board[rr] && board[rr][cc] && board[rr][cc].terrain !== 'water') { target = { r: rr, c: cc }; break; }
                }
                if (!target) target = { r: Math.min(rows-1, cap1.r+1), c: Math.min(cols-1, cap1.c) };
                // Forzar que el objetivo sea bosque para la demostración
                if (board[target.r] && board[target.r][target.c]) {
                    board[target.r][target.c].terrain = 'forest';
                    renderSingleHexVisuals(target.r, target.c);
                }

                // Guardar coords para pasos siguientes
                gameState.tutorial.positions = { capital: cap1, enemyCapital: cap2, targetHex: target };

                if (UIManager) UIManager.updateAllUIDisplays();
            },
            highlightHexCoords: []
        },
        {
            id: 'TUT_01_RECRUIT',
            message: "1) Tu división contiene Infantería Pesada y no puede atravesar bosque. Intenta moverla al hex objetivo marcado. Si no puedes, usa 'Dividir' (✂️) para separar al pesado y poder mover la unidad ligera.",
            highlightElementId: 'floatingSplitBtn',
            onStepStart: () => {
                // Mostrar objetivo y preparar flags
                const pos = gameState.tutorial.positions;
                if (pos && pos.targetHex) renderSingleHexVisuals(pos.targetHex.r, pos.targetHex.c);
                gameState.tutorial.unit_split = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => (gameState.tutorial || {}).unit_split === true
        },
        {
            id: 'TUT_02_MOVE',
            message: "2) Mueve la división ligera resultante al hex marcado. Debería poder atravesar el bosque tras dividir.",
            highlightHexCoords: [],
            onStepStart: () => {
                resetUnitsForNewTurn && resetUnitsForNewTurn(1);
            },
            actionCondition: () => {
                const pos = gameState.tutorial.positions; if (!pos) return false;
                return units.some(u => u.player === 1 && u.r === pos.targetHex.r && u.c === pos.targetHex.c);
            }
        },
        {
            id: 'TUT_03_COMBAT',
            message: "3) Combate: derrota al explorador enemigo que aparecerá junto al objetivo.",
            onStepStart: () => {
                const pos = gameState.tutorial.positions; if (!pos) return;
                const spawn = { r: Math.min((board.length-1), pos.targetHex.r+1), c: pos.targetHex.c };
                if (AiGameplayManager && AiGameplayManager.createUnitObject) {
                    const enemy = AiGameplayManager.createUnitObject({ name: 'Explorador Hostil', regiments: [{ ...(REGIMENT_TYPES && REGIMENT_TYPES['Infantería Ligera'] ? REGIMENT_TYPES['Infantería Ligera'] : {}), type: 'Infantería Ligera', health: 100 }] }, 2, { r: spawn.r, c: spawn.c });
                    if (enemy && typeof placeFinalizedDivision === 'function') placeFinalizedDivision(enemy, spawn.r, spawn.c);
                }
                gameState.tutorial.attack_completed = false;
                if (UIManager) UIManager.updateAllUIDisplays();
            },
            actionCondition: () => (gameState.tutorial || {}).attack_completed === true
        },
        {
            id: 'TUT_04_END',
            message: "4) Fin de turno: pulsa ► para finalizar el turno y completar el tutorial.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => { gameState.tutorial.turnEnded = false; },
            actionCondition: () => gameState.tutorial.turnEnded === true
        }
    ],

    archipelagoInvasor: [
        {
            id: 'ARCHI_TUT_00_MAPA_FIJO',
            message: "Paso 1: Cargando mapa fijo del archipiélago...",
            duration: 2000,
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
                        
                        // Aplicar terrenos
                        for (let r = 0; r < B_ROWS; r++) {
                            for (let c = 0; c < B_COLS; c++) {
                                if (board[r]?.[c] && mapData.board[r]?.[c]) {
                                    board[r][c].terrain = mapData.board[r][c];
                                }
                            }
                        }
                        console.log("✓ Terrenos aplicados");
                        
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
                        
                        // Crear ciudades
                        addCityToBoardData(cap1.r, cap1.c, 1, "Base de Invasión", true);
                        renderSingleHexVisuals(cap1.r, cap1.c);
                        
                        addCityToBoardData(cap2.r, cap2.c, 2, "Capital del Reino", true);
                        renderSingleHexVisuals(cap2.r, cap2.c);
                        
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
                        res1.oro = 800;
                        res1.piedra = 400;
                        res1.madera = 400;
                        res1.hierro = 200;
                        res1.comida = 200;
                        
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
    ]
};
