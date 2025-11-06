// En tutorialScripts.js

const TUTORIAL_SCRIPTS = {
    completo: [
        // =====================================================================
        // === CAPÍTULO 1: Fundamentos del Mando (7 Pasos)
        // =====================================================================
        {
            id: 'TUT_1_START',
            message: "¡Bienvenido, General! Comencemos tu entrenamiento.",
            duration: 3000,
           
            onStepStart: () => {
               // units = [];
               // board.forEach(row => row.forEach(hex => { hex.owner = null; hex.isCapital = false; hex.structure = null; hex.unit = null; }));
               // renderFullBoardVisualState();
                gameState.currentPhase = "play";
                addCityToBoardData(1, 1, 1, "Tu Capital", true);
                renderSingleHexVisuals(1, 1);
                gameState.playerResources[1].oro += 1000;
                gameState.playerResources[1].piedra += 2100;
                gameState.playerResources[1].madera += 300;
                gameState.playerResources[1].hierro += 400;
                gameState.playerResources[1].researchPoints = 160;
            },
            highlightHexCoords: [{r: 1, c: 1}]
            
            
        },
        {
            id: 'TUT_2_CREATE_UNIT',
            message: "Tu primera tarea: selecciona tu ciudad, y recluta una división. Pulsa el botón <strong>'Crear División' (➕)</strong>.",
            highlightElementId: 'floatingCreateDivisionBtn',
            onStepStart: () => {
                // Seleccionamos la capital para que el botón de crear aparezca.
                const capitalHex = board[1][1];
                if (capitalHex) UIManager.showHexContextualInfo(1, 1, capitalHex);
            },
            highlightHexCoords: [{r: 1, c: 1}],
            actionCondition: () => domElements.unitManagementModal.style.display === 'flex'
        },
        {
            id: 'TUT_3_BUILD_DIVISION',
            message: "Añade <strong>tres regimientos de Infantería Ligera</strong> a tu división pulsando el <strong>'+'</strong>.",
            actionCondition: () => typeof currentDivisionBuilder !== 'undefined' && currentDivisionBuilder.length >= 3 && currentDivisionBuilder.every(r => r.type === 'Infantería Ligera')
        },
        {
            id: 'TUT_4_FINALIZE_DIVISION',
            message: "¡Perfecto! Ahora, pulsa <strong>'Finalizar y Colocar'</strong>.",
            highlightElementId: 'finalizeUnitManagementBtn',
            actionCondition: () => placementMode.active === true
        },
        {
            id: 'TUT_5_PLACE_UNIT',
            message: "Despliega tu nueva división en la <strong>casilla resaltada</strong>.",
            highlightHexCoords: [{r: 2, c: 2}],
            actionCondition: () => units.some(u => u.player === 1 && u.r === 2 && u.c === 2)
        },
        {
            id: 'TUT_6_SELECT_AND_MOVE',
            message: "Ahora, <strong>selecciona tu división</strong> y <strong>muévela a la posición estratégica</strong>.",
            highlightHexCoords: [{r: 3, c: 3}],
            onStepStart: () => resetUnitsForNewTurn(1),
            actionCondition: () => units.some(u => u.player === 1 && u.r === 3 && u.c === 3)
        },
        {
            id: 'TUT_7_ATTACK',
            message: "¡Una emboscada! <strong>Ataca a la unidad enemiga</strong>.",
            highlightHexCoords: [{r: 4, c: 4}],
            onStepStart: () => {
                const enemy = AiGameplayManager.createUnitObject({ name: "Explorador Hostil", regiments: [{...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera', health: 100 }]}, 2, {r: 4, c: 4});
                placeFinalizedDivision(enemy, 4, 4);
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) playerUnit.hasAttacked = false;
                gameState.tutorial.attack_completed = false;
            },
            actionCondition: () => gameState.tutorial.attack_completed
        },

         {
        id: 'TUT_7_B_END_TURN_PROMPT',
        message: "¡Bien hecho! Has completado tus acciones. Ahora, <strong>finaliza tu turno (►)</strong> para continuar.",
        highlightElementId: 'floatingEndTurnBtn',
        onStepStart: () => {
            if(domElements.floatingEndTurnBtn) {
                domElements.floatingEndTurnBtn.disabled = false; // Nos aseguramos de que el botón esté habilitado
            }
            gameState.tutorial.turnEnded = false; // Preparamos la bandera que debe activarse
        },
        actionCondition: () => gameState.tutorial.turnEnded
    },

        // =====================================================================
        // === CAPÍTULO 2: Tácticas Avanzadas (5 Pasos)
        // =====================================================================
        {
            id: 'TUT_8_SPLIT_INTRO',
            message: "¡Buen golpe! Para tácticas avanzadas, necesitas más unidades. Pulsa <strong>'Dividir' (✂️)</strong>.",
            highlightElementId: 'floatingSplitBtn',
            onStepStart: () => {
                const playerUnit = units.find(u => u.player === 1);
                if(playerUnit) { resetUnitsForNewTurn(1); selectUnit(playerUnit); }
            },
            actionCondition: () => domElements.advancedSplitUnitModal.style.display === 'flex'
        },
        {
            id: 'TUT_9_SPLIT_EXECUTE',
            message: "Mueve un regimiento a la 'Nueva Unidad', confirma y <strong>colócala en la casilla de flanqueo</strong>.",
            highlightHexCoords: [{r: 3, c: 4}],
            onStepStart: () => { gameState.tutorial.unit_split = false; },
            actionCondition: () => gameState.tutorial.unit_split
        },
        {
            id: 'TUT_10_FLANK_INFO',
            message: "¡Perfecto! Atacar a un enemigo que ya está en combate con un aliado es un <strong>flanqueo</strong>. Causa mucho más daño y reduce la moral enemiga.",
            duration: 6000
        },
        {
            id: 'TUT_11_FLANK_EXECUTE',
            message: "Ahora, selecciona tu primera unidad y <strong>ataca de nuevo al enemigo</strong> para ejecutar el flanqueo.",
            highlightHexCoords: [{r: 4, c: 4}],
            onStepStart: () => {
                units.filter(u => u.player === 1).forEach(unit => resetUnitsForNewTurn(1));
                gameState.tutorial.attack_completed = false;
            },
            actionCondition: () => gameState.tutorial.attack_completed
        },
        {
            id: 'TUT_12_MERGE_UNITS',
            message: "Reagrupa tus fuerzas. <strong>Mueve una de tus unidades sobre la otra para fusionarlas</strong>.",
            onStepStart: () => {
                units = units.filter(u => u.player === 1);
                renderFullBoardVisualState();
                resetUnitsForNewTurn(1);
                gameState.tutorial.unitHasMerge = false;
            },
            actionCondition: () => units.filter(u => u.player === 1).length === 1
        },

        // =====================================================================
        // === CAPÍTULO 3: Logística y Gestión (6 Pasos)
        // =====================================================================
        {
            id: 'TUT_13_INSPECT_UNIT',
            message: "Tus tropas están heridas. Para ver su estado en detalle, pulsa <strong>'Gestionar/Reforzar' (💪)</strong>.",
            highlightElementId: 'floatingReinforceBtn',
            onStepStart: () => {
                const playerUnit = units.find(u => u.player === 1);
                if(playerUnit) {
                    playerUnit.regiments.forEach(r => r.health *= 1);
                    recalculateUnitHealth(playerUnit);
                    selectUnit(playerUnit);
                }
            },
            actionCondition: () => domElements.unitDetailModal.style.display === 'flex'
        },
        {
            id: 'TUT_14_UNIT_DETAIL_INFO',
            message: "Aquí puedes ver la salud de cada regimiento. Cierra esta ventana con la <strong>'X'</strong>.",
            actionCondition: () => domElements.unitDetailModal.style.display === 'none'
        },
        {
            id: 'TUT_15_SUPPLY_INFO',
            message: "Para curar tropas, necesitan <strong>Suministros</strong>. Solo puedes reforzar unidades en tu capital o junto a ella.",
            duration: 5000
        },
        {
            id: 'TUT_16_SUPPLY_MOVE',
            message: "<strong>Mueve tu división dañada junto a tu capital</strong>.",
            highlightHexCoords: [{r: 1, c: 2}],
            onStepStart: () => resetUnitsForNewTurn(1),
            actionCondition: () => units.some(u => u.player === 1 && u.r === 1 && u.c === 2)
        },
        {
            id: 'TUT_17_REINFORCE_EXECUTE',
            message: "¡En rango de suministro! Vuelve a pulsar <strong>'Gestionar' (💪)</strong> y luego el <strong>'+'</strong> para curar un regimiento.",
            highlightElementId: 'floatingReinforceBtn',
            onStepStart: () => { gameState.tutorial.unitReinforced = false; },
            actionCondition: () => gameState.tutorial.unitReinforced
        },
        {
            id: 'TUT_18_NEXT_UNIT_BUTTON',
            message: "Cuando tienes varias unidades, el botón <strong>'Siguiente Unidad' (»)</strong> te ayuda a seleccionarlas rápidamente. ¡Púlsalo!",
            highlightElementId: 'floatingNextUnitBtn',
            onStepStart: () => {
                const secondUnit = AiGameplayManager.createUnitObject({ name: "Exploradores", regiments: [{...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}]}, 1, {r: 0, c: 2});
                placeFinalizedDivision(secondUnit, 0, 2);
                resetUnitsForNewTurn(1);
                UIManager.updateAllUIDisplays();
            },
            actionCondition: () => selectedUnit && selectedUnit.name === "Exploradores"
        },
        
        // =====================================================================
        // === CAPÍTULO 4: Tecnología y Construcción (5 Pasos)
        // =====================================================================

        {
            id: 'TUT_19_TECH_INTRO',
            message: "La Tecnología es clave. Abre el <strong>Menú (⚙️)</strong> y luego el <strong>Árbol de Tecnologías (💡)</strong>.",
            highlightElementId: 'toggle-right-menu-btn',
            actionCondition: () => domElements.techTreeScreen.style.display === 'flex'
        },
        {
            id: 'TUT_20_RESEARCH_ENGINEERING',
            message: "Para construir caminos, investiga <strong>'Ingeniería Civil'</strong>.",
            onStepStart: () => { gameState.playerResources[1].researchPoints = 100; UIManager.updateAllUIDisplays(); },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('ENGINEERING')
        },
        {
            id: 'TUT_21_CLEAR_PATH',
            message: "<strong>La la colina (4,3) Sería un buen lugar para construir una Fortaleza</strong>. asegura el camino a la colina, primero debes ocupar toda la ruta. ",
            highlightHexCoords: [{r: 2, c: 3}],
            onStepStart: () => {
                closeTechTreeScreen();
                resetUnitsForNewTurn(1);
            },
            actionCondition: () => units.some(u => u.player === 1 && u.r === 2 && u.c === 3)
        },
        {
            id: 'TUT_22_BUILD_PATH_PROMPT',
            message: "¡Ruta controlada! Ahora construye el camino completo. en cada una. Recuerda mover tu unidad para poder construir.",
            highlightHexCoords: [{r: 1, c: 2}, {r: 2, c: 3}, {r: 3, c: 3}],
            onStepStart: () => {
                gameState.playerResources[1].piedra += 300; // Suficiente para 3 tramos
                gameState.playerResources[1].madera += 300;
                gameState.playerResources[1].researchPoints += 160;
                UIManager.updateAllUIDisplays();
            },
            // La condición se cumple solo cuando LOS TRES tramos del camino están construidos
            actionCondition: () => {
                const hex1 = board[1]?.[2];
                const hex2 = board[2]?.[3];
                const hex3 = board[3]?.[3];
                return hex1?.structure === 'Camino' && hex2?.structure === 'Camino' && hex3?.structure === 'Camino';
            }
        },
        {
            id: 'TUT_23_RESEARCH_FORTIFICATIONS',
            message: "¡Camino completo! Ahora fortifica esa colina. Ve al Árbol Tecnológico e investiga <strong>'Fortificaciones'</strong>.",
            onStepStart: () => { openTechTreeScreen(); },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('FORTIFICATIONS')
        },
        {
            id: 'TUT_24_BUILD_FORTRESS',
            message: "Vuelve al mapa. Ahora que la colina está conectada y tienes la tecnología, <strong>selecciónala y construye una Fortaleza</strong>.",
            highlightHexCoords: [{r: 4, c: 3}],
            onStepStart: () => {
                closeTechTreeScreen();
                // Damos recursos para la fortaleza
                gameState.playerResources[1].piedra += 1000;
                gameState.playerResources[1].hierro += 400;
                gameState.playerResources[1].oro += 600;
                UIManager.updateAllUIDisplays();
                // Movemos la unidad a un lado para que la casilla quede libre para construir
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit && playerUnit.r === 4 && playerUnit.c === 3) {
                    _executeMoveUnit(playerUnit, 4, 4);
                }
            },
            actionCondition: () => board[4][3]?.structure === 'Fortaleza'
        },
        {
            id: 'TUT_25_END_TURN_FINAL',
            message: "Has aprendido a construir y fortificar. <strong>Finaliza tu turno</strong> para la última lección.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => { gameState.tutorial.turnEnded = false; },
            actionCondition: () => gameState.tutorial.turnEnded
        },
        
        // =====================================================================
        // === CAPÍTULO 5: Héroes y Metajuego (8 Pasos)
        // =====================================================================
        {
            id: 'TUT_24_HEROES_INTRO',
            message: "Los Héroes son comandantes únicos que lideran tus divisiones. Abre el <strong>Cuartel (🎖️)</strong> desde el menú.",
            highlightElementId: 'toggle-right-menu-btn', // Primero abrimos el menú
            actionCondition: () => domElements.barracksModal.style.display === 'flex'
        },
        {
            id: 'TUT_25_HERO_DETAIL',
            message: "Este es tu primer héroe, Fabio Máximo. <strong>Haz clic en su retrato</strong> para ver sus detalles.",
            actionCondition: () => domElements.heroDetailModal.style.display === 'flex'
        },
        {
            id: 'TUT_26_HERO_LEVEL_UP',
            message: "Sube de <strong>Nivel</strong> a un héroe con Libros de XP para fortalecerlo. ¡Usa los que te hemos concedido!",
            onStepStart: () => { if (PlayerDataManager.currentPlayer) PlayerDataManager.currentPlayer.inventory.xp_books += 10; },
            highlightElementId: 'heroLevelUpBtn',
            actionCondition: () => PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.heroes.find(h=>h.id==='g_fabius').level > 1
        },
        {
            id: 'TUT_27_HERO_EVOLVE',
            message: "La <strong>Evolución</strong> aumenta las estrellas y desbloquea habilidades. Requiere Fragmentos. ¡Evoluciona a Fabio!",
            onStepStart: () => { if(PlayerDataManager.currentPlayer) PlayerDataManager.addFragmentsToHero('g_fabius', 50); },
            highlightElementId: 'heroEvolveBtn',
            actionCondition: () => PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.heroes.find(h=>h.id==='g_fabius').stars > 1
        },
        {
            id: 'TUT_28_RESEARCH_LEADERSHIP',
            message: "Ha llegado tu primer Héroe. Pero para asignarlo, necesitas la tecnología de <strong>'Liderazgo'</strong>. Investígala ahora.",
            onStepStart: () => {
                openTechTreeScreen();
                gameState.playerResources[1].researchPoints += 100; // Damos puntos suficientes
                UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('LEADERSHIP')
        },
        {
            id: 'TUT_29_CREATE_HQ_DIVISION',
            message: "¡Bien! Ahora necesitas una división con un <strong>'Cuartel General'</strong>. Crea una nueva división desde tu Fortaleza que incluya este regimiento.",
            onStepStart: () => {
                closeTechTreeScreen();
                // Damos recursos para el Cuartel General
                gameState.playerResources[1].oro += 800; 
                UIManager.updateAllUIDisplays();
            },
            // La condición se cumple cuando exista una unidad con un Cuartel General
            actionCondition: () => units.some(u => u.player === 1 && u.regiments.some(r => r.type === 'Cuartel General'))
        },
        {
            id: 'TUT_30_ASSIGN_PROMPT',
            message: "¡División de mando lista! Ahora, <strong>selecciónala y pulsa 'Asignar General' (👤)</strong>.",
            highlightElementId: 'floatingAssignGeneralBtn',
            onStepStart: () => {
                // Seleccionamos automáticamente la nueva unidad de mando
                const hqUnit = units.find(u => u.player === 1 && u.regiments.some(r => r.type === 'Cuartel General'));
                if (hqUnit) {
                    selectUnit(hqUnit);
                }
            },
            actionCondition: () => domElements.barracksModal.style.display === 'flex'
        },
        {
            id: 'TUT_31_ASSIGN_EXECUTE',
            message: "Este es tu Cuartel. <strong>Haz clic en el retrato de Fabio Máximo</strong> para abrir sus detalles y asignarlo.",
            // La condición se cumple cuando la unidad de mando tiene un comandante asignado
            actionCondition: () => {
                const hqUnit = units.find(u => u.player === 1 && u.regiments.some(r => r.type === 'Cuartel General'));
                return hqUnit && hqUnit.commander === 'g_fabius';
            }
        },
        {
            id: 'TUT_32_FINAL_GOAL',
            message: "¡General asignado! Tu ejército está completo. La victoria se logra capturando la <strong>capital enemiga</strong>.",
            duration: 5000,
            onStepStart: () => {
                addCityToBoardData(7, 8, 2, "Capital Enemiga", true);
                renderSingleHexVisuals(8, 8);
                resetUnitsForNewTurn(1);
            }
        },
        {
            id: 'TUT_32_END_TURN_FINAL',
            message: "Has aprendido mucho. Cierra la consola y <strong>finaliza tu turno</strong> para la prueba final.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => {
                const consoleEl = document.getElementById('debug-console');
                if (consoleEl) consoleEl.style.display = 'none';
                gameState.tutorial.turnEnded = false;
            },
            actionCondition: () => gameState.tutorial.turnEnded
        },

        // =====================================================================
        // === CAPÍTULO 6: Conquista y Asimilación (¡NUEVO!)
        // =====================================================================
        {
            id: 'TUT_28_CONQUEST_INTRO',
            message: "¡Bien hecho! Ahora aprenderás a conquistar. <strong>Selecciona tu división en (4,4)</strong>.",
            highlightHexCoords: [{r: 4, c: 4}],
            onStepStart: () => {
                resetUnitsForNewTurn(1);
                // Aseguramos que el hex (4,4) es del enemigo
                const hex = board[4][4];
                if(hex) { hex.owner = 2; hex.nacionalidad = {1:0, 2:1}; renderSingleHexVisuals(4,4); }
            },
            actionCondition: () => selectedUnit && selectedUnit.r === 4 && selectedUnit.c === 4
        },
        {
            id: 'TUT_29_NATIONALITY_INFO',
            message: "En el panel inferior, fíjate en <strong>'Nac: 1/5'</strong>. Es la lealtad del territorio. Debes reducirla a 0 para conquistarlo.",
            highlightElementId: 'contextualInfoPanel',
            duration: 7000 // Pausa de 7 segundos para leer
        },
        {
            id: 'TUT_30_END_TURN_FOR_CONQUEST',
            message: "La Nacionalidad enemiga disminuye al final de cada turno que ocupas la casilla. <strong>Finaliza tu turno (►)</strong> para ver el efecto.",
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => {
                gameState.tutorial.turnEnded = false;
            },
            actionCondition: () => gameState.tutorial.turnEnded
        },
        {
            id: 'TUT_31_CONQUEST_RESULT',
            message: "¡Territorio conquistado! La casilla ha cambiado a tu color. Así se expande un imperio.",
            duration: 5000,
            onStepStart: () => {
                // Forzamos el cambio de dueño para el tutorial, ya que la lógica normal podría requerir más turnos
                const hex = board[4][4];
                if(hex) {
                    hex.owner = 1;
                    hex.nacionalidad = {1:1, 2:0};
                    renderSingleHexVisuals(4,4);
                }
            }
        },

        // =====================================================================
        // === CAPÍTULO 7: La Victoria Final (4 Pasos)
        // =====================================================================
        {
            id: 'TUT_33_SHOW_GOAL',
            message: "La victoria se logra capturando la <strong>capital enemiga</strong>. ¡Está allí!",
            duration: 4000,
            onStepStart: () => {
                addCityToBoardData(7, 8, 2, "Capital Enemiga", true);
                renderSingleHexVisuals(7, 8);
                const playerUnit = units.find(u => u.player === 1);
                if(playerUnit) { resetUnitsForNewTurn(1); selectUnit(playerUnit); }
            }
        },


        {
            id: 'TUT_34_CAPTURE_CAPITAL',
            message: "El camino está despejado. <strong>Mueve tu división y captura la capital</strong>.",
            highlightHexCoords: [{r: 7, c: 8}],
            onStepStart: () => {
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) playerUnit.currentMovement = 99;
            },
            actionCondition: () => units.some(u => u.player === 1 && u.r === 7 && u.c === 8)
        },

        {
            id: 'TUT_36_FINAL_BATTLE_PROMPT',
            message: "¡Pero no estará indefensa! Una última guarnición la protege. <strong>Acércate y destrúyela</strong>.",
            highlightHexCoords: [{r: 6, c: 8}],
            onStepStart: () => {
                // Creamos la división enemiga que protege la capital
                const enemyGuard = AiGameplayManager.createUnitObject({ 
                    name: "Guardia de la Capital", 
                    regiments: [
                        {...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}, 
                        {...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}
                    ]
                }, 2, {r: 6, c: 8}); // La colocamos justo delante de la capital
                placeFinalizedDivision(enemyGuard, 6, 8);
                
                // Preparamos al jugador
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) {
                    playerUnit.currentMovement = 99; // Damos movimiento de sobra
                }
                gameState.tutorial.attack_completed = false; // Reseteamos el flag de ataque
            },
            // La condición se cumple cuando el jugador ha atacado (y presumiblemente destruido) a la guardia
            actionCondition: () => {
                const enemyGuard = units.find(u => u.name === "Guardia de la Capital");
                return !enemyGuard || enemyGuard.currentHealth <= 0;
            }
        },
        {
            id: 'TUT_37_CAPTURE_CAPITAL',
            message: "¡La defensa ha caído! Ahora, <strong>captura la capital</strong>.",
            highlightHexCoords: [{r: 7, c: 8}],
            onStepStart: () => {
                // Damos una nueva acción al jugador
                resetUnitsForNewTurn(1);
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) {
                    playerUnit.currentMovement = 99;
                }
                const hex = board[7][8];
                // Forzamos el cambio de dueño para el tutorial, ya que la lógica normal podría requerir más turnos
                
                if(hex) {
                    hex.owner = 1;
                    hex.nacionalidad = {1:1, 2:0};
                    renderSingleHexVisuals(7,8);
                }
            },
            actionCondition: () => board[7][8]?.owner === 1


        },
        {
            id: 'TUT_38_VICTORY',
            message: "Has completado tu entrenamiento. ¡Ahora estás listo para la conquista!",
            onStepStart: () => {
                UIManager.showRewardToast("¡TUTORIAL COMPLETADO!", "🏆");
                UIManager.setEndTurnButtonToFinalizeTutorial();
            },
            actionCondition: () => false
        }
    ]
};