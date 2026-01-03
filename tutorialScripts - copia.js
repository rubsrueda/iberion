// tutorialScripts.js
console.log("tutorialScripts.js CARGADO - v8.1 - VALIDACIÓN FINAL 40 PASOS");

const TUTORIAL_SCRIPTS = {
    completo: [
        // === CAPÍTULO 1: Tus Primeras Tropas (6 Pasos) ===
        {
            id: 1, // 'open_resources_menu'
            message: "¡Bienvenido, General! Lo primero es conocer tu estado. Para ver tus recursos, haz clic en el <strong>botón del Menú (☰)</strong>.",
            highlightElementId: 'floatingMenuBtn',
            onStepStart: () => {
                // Este onStepStart ahora controla el estado del juego
                gameState.currentPhase = "tutorial_setup";
                UIManager.updateActionButtonsBasedOnPhase(); // Esto oculta todos los botones del juego
                gameState.tutorial.menu_opened = false;
            },
            actionCondition: () => gameState.tutorial.menu_opened === true
        },
        {
            id: 2, // 'economy_intro_and_close'
            message: "Este es tu panel de recursos. El <strong>Oro</strong> es clave. Ahora, cierra el menú volviendo a pulsar el botón (☰) para continuar.",
            highlightElementId: 'floatingMenuBtn',
            onStepStart: () => { 
                gameState.playerResources[1].oro = 1500; UIManager.updateAllUIDisplays();
                gameState.tutorial.menu_closed = false; // Preparamos el flag
            },
            actionCondition: () => gameState.tutorial.menu_closed === true
        },
        {
            id: 3, // 'welcome_creation'
            message: "Reclutemos tu primera división. Haz clic en <strong>'Crear División' (➕)</strong>.",
            highlightElementId: 'floatingCreateDivisionBtn',
            
            onStepStart: () => {
                console.log("[TUTORIAL] Transición a fase de DESPLIEGUE.");
                gameState.currentPhase = "deployment"; // 1. Cambiamos la fase

                // 2. ¡LE DECIMOS A LA UI QUE SE ACTUALICE CON LA NUEVA FASE!
                UIManager.updateActionButtonsBasedOnPhase(); 
            },
            actionCondition: () => domElements.unitManagementModal.style.display === 'flex'
        },
        {
            id: 4,
            message: "La Infantería Ligera es la espina dorsal del ejército. Añade dos regimientos pulsando el <strong>'+'</strong>.",
            highlightElementId: 'availableUnitsList',
            actionCondition: () => typeof currentDivisionBuilder !== 'undefined' && currentDivisionBuilder.length >= 2
        },
        {
            id: 5,
            message: "Has formado una división. Pulsa <strong>'Finalizar y Colocar'</strong>.",
            highlightElementId: 'finalizeUnitManagementBtn',
            actionCondition: () => placementMode.active === true
        },
        {
            id: 6,
            message: "Despliega tus tropas en la <strong>casilla resaltada</strong>.",
            onStepStart: () => { TutorialManager.initialUnitCount = units.length; },
            highlightHexCoords: [{r: 2, c: 2}],
            actionCondition: () => units.length > TutorialManager.initialUnitCount
        },

        // === CAPÍTULO 2: El Arte de la Guerra (6 Pasos) ===
        {
            id: 7,
            message: "El posicionamiento es clave. Selecciona tu división y muévela a la <strong>posición de emboscada resaltada</strong>.",
            onStepStart: () => { 

                gameState.currentPhase = "play"; // ¡Cambiamos a la fase de juego!
                gameState.turnNumber = 1; // Reseteamos el contador de turnos para el juego real.
                resetUnitsForNewTurn(1); // Preparamos las unidades para el primer turno.
                UIManager.updateAllUIDisplays();
                
                const u = units.find(un => un.player === 1); 
                selectUnit(u); 
            },
            highlightHexCoords: [{ r: 3, c: 3 }],
            actionCondition: () => {
                const playerUnit = units.find(u => u.player === 1);
                return playerUnit && playerUnit.r === 3 && playerUnit.c === 3;
            }
        },

        {
            id: 8, // atacar
            message: "¡Emboscada! Un enemigo. <strong>Haz clic directamente sobre él para atacarlo.</strong>",
            onStepStart: () => {
                const enemy = AiGameplayManager.createUnitObject({ name: "Explorador Hostil", regiments: [{ ...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera' }] }, 2, { r: 4, c: 4 });
                placeFinalizedDivision(enemy, 4, 4);
                const playerUnit = units.find(u => u.player === 1);
                if (playerUnit) { playerUnit.hasAttacked = false; }
                gameState.tutorial.attack_completed = false;
            },
            highlightHexCoords: () => [{r:4, c:4}],
            actionCondition: () => gameState.tutorial.attack_completed === true,
            // <<== AÑADE ESTA LÍNEA PARA CUMPLIR TU PETICIÓN ==>>
            onStepComplete: () => { if (UIManager) UIManager.renderAllUnitsFromData(); }
        },
        {
            id: 9, // DETENERSE AQUÍ
            message: "Bien hecho. El combate es un intercambio. Has ganado experiencia. Para continuar, <strong>finaliza tu turno ahora (►)</strong>.",
            highlightElementId: 'floatingEndTurnBtn',
            // La condición ahora es inequívoca: el tutorial espera la señal de 'turnEnded'
            actionCondition: () => gameState.tutorial.turnEnded === true
        },
        {
            id: 10, // flanquear
            message: "Un aliado ha fijado al enemigo. Ahora está flanqueado. ¡<strong>Atácalo de nuevo</strong> para infligir daño masivo!",
            onStepStart: () => {
                gameState.currentPlayer = 1; 
                // El enemigo se queda donde estaba al final de tu turno.
                const enemy = units.find(u => u.player === 2 && u.currentHealth > 0);
                
                // Creamos un aliado en la posición (3,4) como pediste.
                const ally = AiGameplayManager.createUnitObject({ name: "Aliado Fijo", regiments: [{...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}]}, 1, {r: 3, c: 4});
                placeFinalizedDivision(ally, 3, 4);
                // Nos aseguramos de que esta unidad aliada no pueda actuar.
                ally.hasMoved = true;
                ally.hasAttacked = true;

                // Reseteamos tu unidad principal para que pueda realizar el ataque de flanqueo.
                const playerUnit = units.find(u => u.player === 1 && !u.name.includes("Aliado"));
                if (playerUnit) { 
                    playerUnit.hasMoved = false; 
                    playerUnit.hasAttacked = false; 
                    playerUnit.currentMovement = playerUnit.movement;
                }
                gameState.tutorial.flank_attack_completed = false;
                gameState.tutorial.force_attack_allowed = true; // Habilitamos el ataque forzado
            },
            highlightHexCoords: () => { const e = units.find(u => u.player === 2); return e ? [{ r: e.r, c: e.c }] : []; },
            actionCondition: () => gameState.tutorial.flank_attack_completed === true
        },

        {
            id: 11, // reemplazar el paso de moral
            message: "¡Flanqueo exitoso! La unidad enemiga ha sido destruida. Has aprendido las bases del combate. **Finaliza tu turno (►)**.",
            highlightElementId: 'floatingEndTurnBtn',
            actionCondition: () => gameState.turnNumber > 1
        },
        {
            id: 12,
            message: "Tu ejército consume oro y comida. Su Moral y Experiencia modifican sus resultados, En la parte inferior de la pantalla, Pulsa en el panel de información de la unidad... ▲ Unidad: División 1 (J1)... Finaliza tu turno (►)" ,
            highlightElementId: 'floatingEndTurnBtn',
            onStepStart: () => {
                // Forzamos un escenario donde el mantenimiento no se puede pagar para la lección
                gameState.playerResources[1].oro = 0;
                logMessage("Tus arcas están vacías. No puedes pagar el mantenimiento este turno.", "warning");
                
                // Seleccionamos la unidad para que el jugador vea su estado
                const playerUnit = units.find(u => u.player === 1 && !u.name.includes("Aliado"));
                if (playerUnit) {
                    selectUnit(playerUnit);
                }
            },
            actionCondition: () => gameState.turnNumber > 2 // Esperamos al siguiente turno para continuar
        },
        
        // === CAPÍTULO 3: Tácticas Avanzadas de División (4 pasos, +1 del anterior = 5) ===
        {
            id: 13,
            message: "Para cubrir más terreno, puedes <strong>dividir</strong> tus fuerzas. Con tu unidad principal seleccionada, pulsa <strong>'Dividir' (✂)</strong>.",
            highlightElementId: 'floatingSplitBtn',
            actionCondition: () => domElements.advancedSplitUnitModal.style.display === 'flex'
        },
        {
            id: 14,
            message: "Mueve un regimiento a la 'Nueva Unidad', confirma la división y coloca la nueva tropa en el mapa.",
            onStepStart: () => { 
                // La bandera que preparamos también debe ser la correcta.
                gameState.tutorial.unit_split = false;
            },
            // La condición debe esperar la bandera que SÍ se envía.
            actionCondition: () => gameState.tutorial.unit_split === true
        },
        {
            id: 15,
            message: "Para crear una fuerza más poderosa, mueve una división sobre la otra para <strong>fusionarlas</strong>.",
            onStepStart: () => { gameState.tutorial.unitHasMerge = false; },
            actionCondition: () => gameState.tutorial.unitHasMerge === true
        },
        {
            id: 16,
            message: "Tus tropas están heridas. Revisa a la división 💪 Sal de la pantalla y pulsa sobre <strong>Consolidar (🔁)</strong> combina supervivientes del mismo tipo para reducir Regimientos. ¡Pruébalo!",
            onStepStart: () => {
                console.log("[TUTORIAL] Configurando paso 16: Consolidación");

                // 1. Limpiar el tablero de unidades del jugador para evitar confusiones
                const playerUnits = units.filter(u => u.player === 1);
                playerUnits.forEach(unit => handleUnitDestroyed(unit, null));
                deselectUnit();

                // 2. Crear los dos regimientos dañados
                const regimientoTipo = REGIMENT_TYPES["Infantería Ligera"];
                const regimientoDañado1 = { ...regimientoTipo, type: 'Infantería Ligera', health: regimientoTipo.health / 2 };
                const regimientoDañado2 = { ...regimientoTipo, type: 'Infantería Ligera', health: regimientoTipo.health / 2 };
                const regimientoDañado3 = { ...regimientoTipo, type: 'Infantería Ligera', health: regimientoTipo.health / 2 };
                const regimientoDañado4 = { ...regimientoTipo, type: 'Infantería Ligera', health: regimientoTipo.health / 2 };
                const regimientoDañado5 = { ...regimientoTipo, type: 'Infantería Ligera', health: regimientoTipo.health / 2 };

                // 3. Crear el objeto de la nueva división con estos regimientos
                const nuevaDivisionData = {
                    name: "División 1",
                    regiments: [regimientoDañado1, regimientoDañado2, regimientoDañado3, regimientoDañado4, regimientoDañado5]
                };
                const unidadConsolidar = AiGameplayManager.createUnitObject(nuevaDivisionData, 1, { r: 3, c: 3 });
                
                // 4. Colocar la nueva división en el tablero
                placeFinalizedDivision(unidadConsolidar, 3, 3);

                // 5. Seleccionarla para el jugador
                selectUnit(unidadConsolidar);
                
                // 6. Preparar la bandera que el tutorial espera
                gameState.tutorial.consolidation_completed = false;
            },
            highlightElementId: 'floatingConsolidateBtn',
            actionCondition: () => gameState.tutorial.consolidation_completed === true
        },
        
        // === CAPÍTULO 4: Dominio del Territorio (6 Pasos) ===
        {
            id: 17,
            message: "Controlar territorio es más que solo pintarlo de tu color. Haz clic en este hexágono tuyo para ver sus detalles.",
            highlightHexCoords: [{r: 1, c: 1}],
            onStepStart: () => {
                // Preparamos la bandera para este paso.
                gameState.tutorial.hex_selected = false;
            },
            // La condición ahora espera a que la bandera se active.
            actionCondition: () => gameState.tutorial.hex_selected === true
        },
        {
            id: 18,
            message: "<strong>Estabilidad:</strong> Es tu control, afecta a tus ingresos. <strong>Nacionalidad:</strong> Es la lealtad. Solo subirá si la Estabilidad es alta.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 6000))
        },
        {
            id: 19,
            message: "¡A la práctica! Hemos detectado un puesto de avanzada enemigo. <strong>Mueve tu división principal para ocuparlo.</strong>",
            onStepStart: () => {
                console.log("[TUTORIAL] Limpiando unidades enemigas residuales antes del paso 19.");
                const enemyUnits = units.filter(u => u.player === 2);
                enemyUnits.forEach(unit => handleUnitDestroyed(unit, null));
                const enemyHexR = 4;
                const enemyHexC = 4;
                const hex = board[enemyHexR]?.[enemyHexC];

                // Preparamos el hexágono enemigo (esto se mantiene igual)
                if (hex) {
                    hex.owner = 2;
                    hex.nacionalidad = { 1: 0, 2: 2 };
                    hex.estabilidad = 3;
                    renderSingleHexVisuals(enemyHexR, enemyHexC);
                }
                
                // <<== CORRECCIÓN: Identificar la unidad principal por su fuerza ==>>
                // 1. Filtramos todas las unidades del jugador.
                const allPlayerUnits = units.filter(u => u.player === 1);

                if (allPlayerUnits.length > 0) {
                    // 2. Las ordenamos de más fuerte (más regimientos) a más débil.
                    allPlayerUnits.sort((a, b) => b.regiments.length - a.regiments.length);
                    
                    // 3. La unidad más fuerte es nuestra "unidad principal".
                    const mainPlayerUnit = allPlayerUnits[0];
                    console.log(`[TUTORIAL] Unidad principal identificada para el paso 19: ${mainPlayerUnit.name}`);

                    // 4. Nos aseguramos de que esta unidad pueda moverse.
                    mainPlayerUnit.hasMoved = false;
                    mainPlayerUnit.hasAttacked = false;
                    mainPlayerUnit.currentMovement = mainPlayerUnit.movement;
                } else {
                    console.error("[TUTORIAL] No se encontraron unidades del jugador para el paso 19.");
                }
            },
            highlightHexCoords: [{r: 4, c: 4}],
            // <<== CORRECCIÓN: La condición ahora es mucho más simple y robusta ==>>
            // Simplemente comprueba si CUALQUIER unidad del jugador está en la casilla objetivo.
            actionCondition: () => {
                const unitOnTargetHex = getUnitOnHex(4, 4);
                return unitOnTargetHex && unitOnTargetHex.player === 1;
            }
        },
        {
            id: 20,
            message: "¡Alerta! Tu patrulla está aislada y <strong>sin Suministro</strong>. Sufrirá atrición. Selecciónala.",
            onStepStart: () => {
                const isolatedUnit = AiGameplayManager.createUnitObject({ name: "Patrulla Aislada", regiments: [{...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}]}, 1, {r: 1, c: 4});
                placeFinalizedDivision(isolatedUnit, 1, 4); deselectUnit();
                // Preparamos la nueva bandera.
                gameState.tutorial.unit_selected_by_objective = false; 
            },
            highlightHexCoords: [{r: 1, c: 4}],
            // La condición ahora espera la nueva bandera.
            actionCondition: () => gameState.tutorial.unit_selected_by_objective === true 
        },
        {
            id: 21,
            message: "¡No la abandones! Muévela de vuelta a la <strong>casilla segura</strong> para restaurar su línea de suministro.",
            highlightHexCoords: [{r: 2, c: 3}],
            actionCondition: () => {
                const unit = units.find(u => u.name === "Patrulla Aislada");
                return unit && unit.r === 2 && unit.c === 3;
            }
        },
        {
            id: 22,
            message: "Tus tropas están heridas. La acción <strong>Reforzar (💪)</strong> cura a tus regimientos a cambio de oro. Pulsa el botón y luego el <strong>'+'</strong> junto a un regimiento dañado.",
            onStepStart: () => {
                //const isolatedUnit = AiGameplayManager.createUnitObject({ name: "División 1", regiments: [{...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera'}]}, 1, {r: 1, c: 4});
                //placeFinalizedDivision(isolatedUnit, 1, 4); deselectUnit();
                const playerUnit = units.find(u => u.player === 1 && u.name.startsWith("División 1"));
                if (playerUnit) {
                    // Dañamos la unidad para la lección
                    playerUnit.regiments.forEach(reg => reg.health = Math.floor(REGIMENT_TYPES[reg.type].health * 0.4));
                    recalculateUnitHealth(playerUnit); 
                    UIManager.updateUnitStrengthDisplay(playerUnit);

                    // Movemos la unidad junto a la capital para que pueda ser reforzada
                    playerUnit.r = 0;
                    playerUnit.c = 1;
                    positionUnitElement(playerUnit);
                    renderSingleHexVisuals(playerUnit.r, playerUnit.c);
                    
                    playerUnit.hasMoved = false; 
                    playerUnit.hasAttacked = false; 
                    playerUnit.currentMovement = playerUnit.movement;
                    
                    selectUnit(playerUnit);
                }
                 // <<== PREPARAMOS LA BANDERA QUE ESPERA EL SIGUIENTE PASO ==>>
                gameState.tutorial.unitReinforced = false;
            },
            highlightElementId: 'floatingReinforceBtn',
            actionCondition: () => gameState.tutorial.unitReinforced === true
        },

        {
            id: 22.1, // Nuevo paso para introducir la consola
            message: "¡Bien hecho! Todas las acciones importantes se registran en la <strong>Crónica</strong>. Haz clic en el botón de <strong>Consola (C)</strong> para ver el historial.",
            highlightElementId: 'floatingConsoleBtn',
            actionCondition: () => {
                const consolePanel = document.getElementById('debug-console');
                // La condición se cumple si el panel de la consola existe y está visible
                return consolePanel && consolePanel.style.display !== 'none';
            },
            onStepComplete: () => {
                // Dejamos la consola abierta un momento para que el jugador la vea y luego continuamos.
                setTimeout(() => {
                    const consolePanel = document.getElementById('debug-console');
                    if (consolePanel) {
                        consolePanel.style.display = 'none'; // La cerramos automáticamente para no estorbar
                    }
                }, 4000); // 4 segundos
            }
        },

        // === CAPÍTULO 5: Forjando un Imperio (6 Pasos) ===
        {
            id: 23,
            message: "Para construir, necesitas tecnología. Abre el <strong>Árbol de Tecnologías (💡)</strong>.",
            highlightElementId: 'floatingTechTreeBtn',
            actionCondition: () => domElements.techTreeScreen.offsetHeight > 0
        },
        {
            id: 24,
            message: "Desbloquea <strong>'Ingeniería Civil'</strong>. Es un requisito para construir caminos y otras estructuras.",
            onStepStart: () => { 
                // Inyección de Suministros #1: Puntos de Investigación
                gameState.playerResources[1].researchPoints = 100;
                logMessage("Suministros del Cuartel General: ¡+100 Puntos de Investigación recibidos!", "success");
                UIManager.updateAllUIDisplays();
            },
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('ENGINEERING')
        },
        {
            id: 25,
            message: "Ahora que tienes la tecnología, selecciona la <strong>casilla vacía resaltada</strong>, pulsa el botón <strong>'Construir' (🏗️)</strong> y elige 'Camino'.",
            onStepStart: () => {
                closeTechTreeScreen(); // Cerramos el árbol tecnológico al empezar el paso
                // Damos los recursos justos para la construcción del camino
                gameState.playerResources[1].piedra += 2100;
                gameState.playerResources[1].madera += 300;
                gameState.playerResources[1].hierro += 400;
                gameState.playerResources[1].oro += 1000;
                gameState.playerResources[1].researchPoints = 160;
                logMessage("Suministros del Cuartel General: ¡Materiales de construcción para el camino recibidos!", "success");
                UIManager.updateAllUIDisplays();
            },
            highlightHexCoords: [{r:3, c:3}],
            // La condición es simple: ¿se ha construido un camino en esa casilla?
            actionCondition: () => board[3][3].structure === 'Camino'
        },

        {
            id: 26,
            message: "Una frontera sin defensas es una invitación. Vuelve al árbol tecnológico e investiga <strong>'Fortificaciones'</strong>.",
            actionCondition: () => gameState.playerResources[1].researchedTechnologies.includes('FORTIFICATIONS')
        },
        {
            id: 27,
            message: "¡Excelente! Vuelve al mapa y construye tu <strong>Fortaleza</strong>. Te permitirá reclutar tropas en el frente.",
            highlightHexCoords: [{r:3, c:3}],
            actionCondition: () => board[3][3].structure === 'Fortaleza'
        },
        {
            id: 28,
            message: "para establecer una Ruta Comercial debes conectar tu Capital a tu nueva **Fortaleza** con Caminos genera Oro extra cada turno.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 5000))
        },
        
        // === CAPÍTULO 6: Héroes y Leyendas (8 Pasos) ===
        {
            id: 29,
            message: "Ha llegado tu primer <strong>Héroe</strong>: Fabio Máximo. Son personajes persistentes que guardas en tu perfil de General.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 4000))
        },
        {
            id: 30,
            message: "Para asignarlo,necesita Investigar Liderezgo, y la división tener un 'Cuartel General' y estar en una ciudad... Investiga, Seleccióna y pulsa <strong>'Asignar General' (👤)</strong>.",
            onStepStart: () => {

                const isolatedUnit = AiGameplayManager.createUnitObject({ name: "Aliado", regiments: [{...REGIMENT_TYPES["Cuartel General"], type: 'Cuartel General'}]}, 1, {r: 1, c: 1});
                placeFinalizedDivision(isolatedUnit, 1, 1); deselectUnit();

                const playerUnit = units.find(u => u.player === 1 && !u.name.includes("Aliado"));
                if (playerUnit && !playerUnit.regiments.some(r => r.type === "Cuartel General")) {
                    playerUnit.regiments.push({...REGIMENT_TYPES["Cuartel General"], type: 'Cuartel General'});
                    recalculateUnitStats(playerUnit); if (selectedUnit) UIManager.showUnitContextualInfo(selectedUnit, true);
                }
            },
            highlightElementId: 'floatingAssignGeneralBtn',
            actionCondition: () => domElements.barracksModal.style.display === 'flex'
        },
        {
            id: 31,
            message: "Este es tu Cuartel. Antes de asignarlo, vamos a mejorar a Fabio. <strong>Haz clic en su retrato</strong> para ver sus detalles. Avanzaremos automáticamente.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 6000))
        },
        {
            id: 32,
            message: "Cada Héroe tiene habilidades <strong>Pasivas</strong> (siempre activas) y una <strong>Activa</strong> (para combate). Las de Fabio son defensivas.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 5000))
        },
        {
            id: 33,
            message: "Sube de <strong>Nivel</strong> a un héroe con Libros de XP para fortalecerlo. Te hemos concedido algunos. ¡Úsalos!",
            onStepStart: () => { if (PlayerDataManager.currentPlayer) PlayerDataManager.currentPlayer.inventory.xp_books = 10; },
            highlightElementId: 'heroLevelUpBtn',
            actionCondition: () => PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.heroes.find(h=>h.id==='g_fabius').level > 1
        },
        {
            id: 34,
            message: "¡Ha ganado un <strong>Punto de Habilidad</strong>! Gástalo para mejorar su habilidad activa.",
            highlightElementId: 'heroDetailSkills',
            actionCondition: () => PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.heroes.find(h=>h.id==='g_fabius').skill_points_unspent < 1
        },
        {
            id: 35,
            message: "La <strong>Evolución</strong> aumenta las estrellas y desbloquea habilidades. Requieres **Fragmentos**. Te hemos dado suficientes. ¡Evoluciona a Fabio!",
            onStepStart: () => { if(PlayerDataManager.currentPlayer) PlayerDataManager.addFragmentsToHero('g_fabius', 50); },
            highlightElementId: 'heroEvolveBtn',
            actionCondition: () => PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.heroes.find(h=>h.id==='g_fabius').stars > 1
        },
        {
            id: 36,
            message: "Ahora que Fabio es más fuerte, estás listo. Cierra los paneles y <strong>asígnalo a tu división</strong> desde el Cuartel.",
            onStepStart: () => { 
                // Preparamos la bandera que se activará desde 'assignHeroToUnit'
                gameState.tutorial.hero_assigned = false; 
            },
            // La condición ahora espera nuestra notificación explícita
            actionCondition: () => gameState.tutorial.hero_assigned === true 
        },

        // === CAPÍTULO 7: Hacia la Victoria (4 Pasos) ===
        {
            id: 37,
            message: "Debilita al enemigo atacando su economía. Mueve tu división a este territorio y usa la acción <strong>Saquear (💰)</strong>. Necesitarás varios turnos",
             onStepStart: () => {
                const enemyHexR = 5;
                const enemyHexC = 5;
                const hex = board[enemyHexR]?.[enemyHexC];

                // Preparamos el hexágono enemigo
                if (hex) {
                    hex.owner = 2; // Lo hacemos del enemigo
                    hex.nacionalidad = { 1: 0, 2: 2 }; // Establecemos su Nacionalidad a 2
                    hex.estabilidad = 3; // Estabilidad suficiente para permitir la conquista
                    renderSingleHexVisuals(enemyHexR, enemyHexC); // Lo redibujamos
                }

                const targetHex = board[5][5]; targetHex.owner = 2; targetHex.estabilidad = 3;
                renderSingleHexVisuals(5, 5); gameState.tutorial.pillage_completed = false;
                const playerUnit = units.find(u => u.player === 1 && !u.name.includes("Aliado"));
                if (playerUnit) { playerUnit.hasMoved = false; playerUnit.hasAttacked = false; playerUnit.currentMovement = playerUnit.movement;}
            },
            highlightHexCoords: [{r:5, c:5}],
            actionCondition: () => gameState.tutorial.pillage_completed === true
        },
        {
            id: 38,
            message: "La victoria se logra de dos formas: **capturando la capital enemiga** o **destruyendo todas sus divisiones**. ¡Elige tu estrategia!",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 5000))
        },
        {
            id: 39,
            message: "Recuerda, si tienes dudas, consulta la <strong>Wiki (ℹ️)</strong>. Contiene detalles sobre cada mecánica del juego.",
            highlightElementId: 'floatingWikiBtn',
            actionCondition: () => domElements.wikiModal.style.display === 'flex'
        },
        {
            id: 40,
            message: "Tu entrenamiento ha concluido. ¡Pulsa el botón de abajo para finalizar y volver al menú principal!",
            onStepStart: () => {
                if (domElements.wikiModal) domElements.wikiModal.style.display = 'none';
                UIManager.setEndTurnButtonToFinalizeTutorial();
            },
            actionCondition: () => false
        }
    ]
};