// modalLogic.js

function RequestConfirmBuildStructure() {
    // 1. Validaciones iniciales
    if (!selectedStructureToBuild || !hexToBuildOn) {
        console.warn("[Build Request] Acción cancelada: faltan datos de estructura o hexágono.");
        return;
    }

    const { r, c } = hexToBuildOn;
    const unitOnHex = getUnitOnHex(r, c);

    // 2. Crear el paquete de acción
    const action = {
        type: 'buildStructure',
        actionId: `build_${gameState.currentPlayer}_${r}_${c}_${Date.now()}`,
        payload: {
            playerId: gameState.currentPlayer,
            r: r,
            c: c,
            structureType: selectedStructureToBuild,
            builderUnitId: unitOnHex && STRUCTURE_TYPES[selectedStructureToBuild].cost.Colono ? unitOnHex.id : null
        }
    };

    // 3. Decidir el flujo: Red (Host/Cliente) o Local
    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            // -- FLUJO DEL ANFITRIÓN --
            console.log(`[Host] Recibida acción local de construcción. Procesando...`);
            processActionRequest(action);
        } else {
            // -- FLUJO DEL CLIENTE --
            console.log(`[Client] Enviando petición de construcción al Host...`);
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
    } else {
        // -- FLUJO DE PARTIDA LOCAL --
        console.log(`[Local] Ejecutando acción de construcción...`);
        handleConfirmBuildStructure();
    }

    // 4. Limpieza de la UI (se ejecuta en todos los casos)
    domElements.buildStructureModal.style.display = 'none';
    if (UIManager) UIManager.hideContextualPanel();
    if (typeof cancelPreparingAction === "function") {
        cancelPreparingAction();
    }
}

function RequestReinforceRegiment(division, regiment) {
    const regData = REGIMENT_TYPES[regiment.type];
    if ((regiment.health || 0) >= regData.health) return;
    
    const reinforceCostMultiplier = 1.5;
    const baseRegCost = regData.cost.oro || 0;
    const costPerHp = baseRegCost / regData.health;
    const healthToRestore = regData.health - regiment.health;
    const totalCost = Math.ceil(costPerHp * healthToRestore * reinforceCostMultiplier);
    
    //if (confirm(`¿Reforzar ${getAbbreviatedName(regiment.type)} por ${totalCost} de oro?`)) {
        const action = {
            type: 'reinforceRegiment',
            payload: {
                playerId: division.player,
                divisionId: division.id,
                regimentId: regiment.id 
            }
        };

        if (isNetworkGame()) {
            if (NetworkManager.esAnfitrion) {
                processActionRequest(action);
                NetworkManager.broadcastFullState();
            } else {
                NetworkManager.enviarDatos({ type: 'actionRequest', action });
            }
            logMessage("Petición de refuerzo enviada...");
            return;
        }
        handleReinforceRegiment(division, regiment);
    //}
}

function showCityContextualInfo(cityData) { // Modificar función existente o crear una nueva
    if (!cityData || !domElements) return;
    
    const currentPlayer = gameState.currentPlayer;
    const isOwnCity = cityData.owner === currentPlayer;
    // Determinar si la ciudad es "Avanzada" (Aldea o superior).
    // Esto puede depender de si tiene una estructura definida ('Aldea', 'Ciudad', 'Metrópoli')
    // o si 'isCapital' ya está set true (indicando que fue establecida previamente).
    // Si no hay estructura pero es 'isCity' y no es la capital, podemos considerarla al menos como una Aldea.
    const isAdvancedCity = cityData.isCapital || (cityData.structure && STRUCTURE_TYPES[cityData.structure]?.typeHierarchy >= "Aldea") || (cityData.isCity && !cityData.isCapital);
    
    const setCapitalBtn = document.getElementById('setAsCapitalBtn'); // El botón que añadiremos en HTML

     if (isOwnCity && isAdvancedCity && !cityData.isCapital) {
        if (setCapitalBtn) {
            setCapitalBtn.style.display = 'block'; // Mostrar botón
            setCapitalBtn.onclick = () => {
                requestChangeCapital(cityData.r, cityData.c);
                // Opcionalmente cerrar panel si la acción es final
                if (UIManager.hideContextualPanel) UIManager.hideContextualPanel(); 
            };
        } else {
            console.warn("UIManager: Botón 'setAsCapitalBtn' no encontrado.");
        }
    } else {
        if (setCapitalBtn) setCapitalBtn.style.display = 'none'; // Ocultar si no es aplicable
    }
}

function addModalEventListeners() {
    console.log("modalLogic: addModalEventListeners INICIADO.");


    if (typeof domElements === 'undefined' || !domElements.domElementsInitialized) {
         console.error("modalLogic: CRÍTICO: domElements no está definido o no se ha inicializado completamente.");
         return;
    }

    
    // Listeners de Configuración
    if (domElements.saveSettingsBtn) {
        domElements.saveSettingsBtn.addEventListener('click', saveSettings);
    }
    if (domElements.closeSettingsBtn) {
        domElements.closeSettingsBtn.addEventListener('click', () => {
            domElements.settingsModal.style.display = 'none';
        });
    }
    if (domElements.resetHintsBtn) {
        domElements.resetHintsBtn.addEventListener('click', resetHints);
    }

    // Listeners de Ranking
    if (domElements.closeRankingBtn) {
        domElements.closeRankingBtn.addEventListener('click', () => {
            domElements.rankingModal.style.display = 'none';
        });
    }

    // --- LISTENER DEL PASE DE BATALLA (PERFIL) ---
    if (domElements.openBattlePassProfileBtn) {
        domElements.openBattlePassProfileBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // Verificamos si el Manager del Pase existe antes de llamar
            if (typeof BattlePassManager !== 'undefined') {
                console.log("Abriendo Pase de Batalla desde Perfil...");
                BattlePassManager.open();
            } else {
                console.error("Error: BattlePassManager no está cargado.");
            }
        });
    }

    // --- ASEGURAR QUE EL BOTÓN CERRAR FUNCIONA CON EL NUEVO ID pase de batalla---
    const closeProfile = document.getElementById('closeProfileBtn');
    if (closeProfile) {
        // Clonamos para eliminar listeners viejos
        const newClose = closeProfile.cloneNode(true);
        closeProfile.parentNode.replaceChild(newClose, closeProfile);
        
        newClose.addEventListener('click', () => {
             document.getElementById('profileModal').style.display = 'none';
        });
    }

    //tecnología
    if (domElements.closeTechTreeBtn) {
        domElements.closeTechTreeBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (typeof closeTechTreeScreen === "function") closeTechTreeScreen();
            else console.error("modalLogic: closeTechTreeScreen no definida.");
        });
    } else { 
        console.warn("modalLogic: closeTechTreeBtn no encontrado en domElements."); 
    }

    if (domElements.closeAdvancedSplitModalBtn) {
        domElements.closeAdvancedSplitModalBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';
            if (typeof cancelPreparingAction === "function") cancelPreparingAction(); 
            _unitBeingSplit = null; 
        });
    } 

    if (domElements.cancelAdvancedSplitBtn) {
        domElements.cancelAdvancedSplitBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';
            if (typeof cancelPreparingAction === "function") cancelPreparingAction(); 
            _unitBeingSplit = null; 
        });
    } 
    
    if (domElements.finalizeAdvancedSplitBtn) {
        domElements.finalizeAdvancedSplitBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (typeof handleFinalizeSplit === "function") handleFinalizeSplit(); 
            else console.error("modalLogic: La función handleFinalizeSplit no está definida.");
        });
    }

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                if (modal.id === 'advancedSplitUnitModal' || modal.id === 'createDivisionModal' || modal.id === 'buildStructureModal') {
                    if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                }
            }
        });
    });

    window.addEventListener('click', function(event) {
        const modalClicked = event.target.closest('.modal');

        // LÓGICA ORIGINAL: Si el clic fue directamente sobre el fondo de un modal, ciérralo.
        // Pero sólo si el modal NO tiene la clase 'no-close-on-click'
        if (modalClicked && event.target === modalClicked && !modalClicked.classList.contains('no-close-on-click')) {
            modalClicked.style.display = 'none';
        }

        // NUEVA LÓGICA DE PREVENCIÓN:
        // No queremos que este listener interfiera con nada más, especialmente no con los
        // botones del juego. En lugar de detener la propagación siempre,
        // no hacemos nada más. El evento de clic puede seguir su camino.
    });

    if (domElements.closeUnitManagementModalBtn) {
        domElements.closeUnitManagementModalBtn.addEventListener('click', closeUnitManagementModalAndCancel);
    } else {
        console.warn("modalLogic: closeUnitManagementModalBtn no encontrado.");
    }

    if (domElements.cancelUnitManagementBtn) {
        domElements.cancelUnitManagementBtn.addEventListener('click', closeUnitManagementModalAndCancel);
    } else {
        console.warn("modalLogic: cancelUnitManagementBtn no encontrado.");
    }

    if (domElements.finalizeUnitManagementBtn) {
        domElements.finalizeUnitManagementBtn.addEventListener('click', handleFinalizeDivision);
    } else {
        console.warn("modalLogic: finalizeUnitManagementBtn no encontrado.");
    }

    if (domElements.confirmBuildBtn) {
    domElements.confirmBuildBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Usamos la función de PETICIÓN
        if (typeof RequestConfirmBuildStructure === 'function') RequestConfirmBuildStructure();
        else console.error("modalLogic: RequestConfirmBuildStructure no definida.");
    });
    } else console.warn("modalLogic: confirmBuildBtn (Construir Estructura) no encontrado.");
    
    if (domElements.closeWelcomeHelpBtn) {
        domElements.closeWelcomeHelpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof closeWelcomeHelpModal === 'function') closeWelcomeHelpModal();
            else console.error("modalLogic: closeWelcomeHelpModal no definida.");
        });
    } else console.warn("modalLogic: closeWelcomeHelpBtn no encontrado.");
    
    if (domElements.startGameFromHelpBtn) {
        domElements.startGameFromHelpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof closeWelcomeHelpModal === 'function') closeWelcomeHelpModal();
            else console.error("modalLogic: closeWelcomeHelpModal no definida para iniciar juego desde ayuda.");
        });
    } else console.warn("modalLogic: startGameFromHelpBtn no encontrado.");

    const closeHeroDetailBtn = document.getElementById('closeHeroDetailBtn');
    if (closeHeroDetailBtn) {
        closeHeroDetailBtn.addEventListener('click', () => {
            const modal = document.getElementById('heroDetailModal');
            if (modal) modal.style.display = 'none';
            refreshBarracksView();
        });
    } else {
        console.warn("modalLogic: closeHeroDetailBtn no encontrado.");
    }

    // --- INICIO DE LA Banca ---
    if (domElements.closeBankModalBtn) {
        domElements.closeBankModalBtn.addEventListener('click', () => {
            domElements.bankModal.style.display = 'none';
        });
    }

    if (domElements.bankOfferResourceSelect) {
        domElements.bankOfferResourceSelect.addEventListener('change', updateBankTradeUI);
    }

    if (domElements.bankOfferAmountInput) {
        domElements.bankOfferAmountInput.addEventListener('input', updateBankTradeUI);
    }
    
    if (domElements.bankRequestResourceSelect) {
        // En el futuro, podría haber lógica aquí si el ratio de cambio varía.
        // Por ahora, no necesita un listener.
    }

    if (domElements.bankConfirmTradeBtn) {
        domElements.bankConfirmTradeBtn.addEventListener('click', handleBankTrade);
    }

    // Buscamos específicamente el botón dentro del contenedor de setupScreen
    const setupCloseBtn = document.querySelector('#setupScreen .modal-close-btn');
    
    if (setupCloseBtn) {
        // Clonar para limpiar listeners antiguos
        const newBtn = setupCloseBtn.cloneNode(true);
        setupCloseBtn.parentNode.replaceChild(newBtn, setupCloseBtn);
        
        // Listener corregido que respeta las clases CSS
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (domElements.setupScreen) {
                // 1. Quitamos la clase que la hace visible
                domElements.setupScreen.classList.remove('active');
                // 2. IMPORTANTE: Borramos cualquier estilo 'display' pegado manualmente
                domElements.setupScreen.style.removeProperty('display');
            }
            
            // Volver al menú principal
            if (typeof showScreen === 'function') {
                showScreen(domElements.mainMenuScreenEl);
            } else if (domElements.mainMenuScreenEl) {
                domElements.mainMenuScreenEl.style.display = 'flex';
            }
        });
    }

    console.log("modalLogic: addModalEventListeners FINALIZADO.");
}

function openBuildStructureModal() {
    if (!hexToBuildOn) {
        console.error("  -> ERROR: hexToBuildOn es nulo. Saliendo.");
        return;
    }
    const { r, c } = hexToBuildOn;
    const hex = board[r]?.[c];
    if (!hex) {
        console.error(`  -> ERROR: No se encontró hexágono en board[${r}][${c}]. Saliendo.`);
        return;
    }
    
    // <<== Guardamos los datos en el modal ==>>
    domElements.buildStructureModal.dataset.r = r;
    domElements.buildStructureModal.dataset.c = c;

    if (!domElements.buildStructureModal || !domElements.availableStructuresListModalEl) {
        console.error("  -> ERROR: Elementos del DOM del modal no encontrados. Saliendo.");
        return;
    }
    
    // Preparar UI
    domElements.buildHexCoordsDisplay.textContent = `${r},${c}`;
    domElements.availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    domElements.confirmBuildBtn.disabled = true;

    const playerResources = gameState.playerResources[gameState.currentPlayer];
    const playerTechs = playerResources.researchedTechnologies || [];
    let buildableOptions = [];

    // --- INICIO DE LA LÓGICA DE DECISIÓN CORREGIDA ---
    if (hex.structure) {

        // MODO MEJORA: Solo validamos la posible siguiente estructura.
        console.log("  [Paso 2] MODO MEJORA detectado.");
        const upgradeId = STRUCTURE_TYPES[hex.structure]?.nextUpgrade;

        if (upgradeId) {
            // Se encontró una posible mejora, ahora aplicamos tu bloque de validación completo a ESE ÚNICO ID.
            const structureId = upgradeId; 
            const structureInfo = STRUCTURE_TYPES[structureId];
            
            console.log(`\n  --- Validando Mejora: ${structureId.toUpperCase()} ---`);
            let isOptionForHex = true; // Sabemos que es una opción porque es 'nextUpgrade'
            
            console.log(`    - ${structureId} es una opción válida. Comprobando requisitos...`);
            let canBuild = true;

            // **VALIDACIÓN DE TECNOLOGÍA** (Tu código original)
            if (structureInfo.requiredTech) {
                console.log(`      - Requiere tecnología: "${structureInfo.requiredTech}". ¿La tiene el jugador?`);
                if (playerTechs.includes(structureInfo.requiredTech)) {
                    console.log(`        -> SÍ. Tecnología encontrada.`);
                } else {
                    console.log(`        -> NO. Tecnología NO encontrada.`);
                    canBuild = false;
                }
            } else {
                console.log(`      - No requiere tecnología.`);
            }

            // **VALIDACIÓN DE COSTE** (Tu código original)
            if (structureInfo.cost && canBuild) {
                console.log(`      - Comprobando coste: ${JSON.stringify(structureInfo.cost)}`);
                for (const resKey in structureInfo.cost) {
                    const amountNeeded = structureInfo.cost[resKey];
                    if (resKey === 'Colono') {
                        console.log(`        - Comprobando requisito: Colono`);
                        
                        // --- INICIO DE LA CORRECCIÓN ---
                        // Un colono es válido si CUALQUIERA de estas dos condiciones es cierta:
                        // 1. La unidad actualmente seleccionada a nivel global ('selectedUnit') es un colono en esta casilla.
                        // 2. Simplemente hay una unidad en esta casilla que es un colono (independientemente de la selección global).
                        
                        const unitOnHex = getUnitOnHex(r, c);
                        const tieneRegimientoColono = unitOnHex?.regiments.some(reg => reg.type === 'Colono');

                        if (unitOnHex && unitOnHex.player === gameState.currentPlayer && tieneRegimientoColono) {
                            console.log(`          -> SÍ. Colono válido presente en (${r},${c}).`);
                        } else {
                            console.log(`          -> NO. No hay un Colono propio en (${r},${c}) para realizar la acción.`);
                            // Log de depuración para ver por qué falla
                            console.log({unitOnHex, selectedUnit, r, c});
                            canBuild = false;
                        }
                        // --- FIN DE LA CORRECCIÓN ---

                    } else { // Recursos normales
                        const playerAmount = playerResources[resKey] || 0;
                        console.log(`        - Comprobando requisito: ${amountNeeded} de ${resKey}. Tiene: ${playerAmount}`);
                        if (playerAmount < amountNeeded) {
                            console.log(`          -> NO. Fondos insuficientes.`);
                            canBuild = false;
                        } else {
                            console.log(`          -> SÍ. Fondos suficientes.`);
                        }
                    }
                    if (!canBuild) break;
                }
            }
            
            console.log(`    - RESULTADO FINAL PARA ${structureId}: ${canBuild ? "Se puede construir." : "NO se puede construir."}`);
            if (canBuild) {
                buildableOptions.push({
                    type: structureId, name: structureInfo.name, sprite: structureInfo.sprite,
                    costStr: Object.entries(structureInfo.cost || {}).map(([k,v]) => `${v} ${k}`).join(', ') || "Gratis"
                });
            }
        }
    } else {
        // MODO CONSTRUCCIÓN NUEVA: Ejecutamos tu bucle original completo, sin tocarlo.
        console.log("  [Paso 2] MODO CONSTRUCCIÓN NUEVA detectado.");
        console.log("  Empezando a iterar sobre todas las estructuras en STRUCTURE_TYPES...");

        for (const structureId in STRUCTURE_TYPES) {
            const structureInfo = STRUCTURE_TYPES[structureId];
            console.log(`\n  --- Validando: ${structureId.toUpperCase()} ---`);
            let isOptionForHex = false;
            
            if (hex.structure) { 
                console.log(`    - Hex tiene estructura: "${hex.structure}". ¿Es "${structureId}" la siguiente mejora?`);
                if (STRUCTURE_TYPES[hex.structure]?.nextUpgrade === structureId) {
                    isOptionForHex = true;
                } } 
            else {
                console.log(`    - Hex está vacío. ¿Se puede construir "${structureId}" desde cero aquí (terreno "${hex.terrain}")?`);
                if (structureInfo.buildableOn?.includes(hex.terrain)) {
                    isOptionForHex = true;
                    console.log(`      -> SÍ. El terreno es compatible.`);
                } else {
                     console.log(`      -> NO. Terreno no compatible. Requiere: ${structureInfo.buildableOn?.join(', ')}.`);
                }
            }

            if (!isOptionForHex) {
                console.log(`    - RESULTADO: ${structureId} NO es una opción para este hex. Saltando a la siguiente.`);
                continue;
            }

            console.log(`    - ${structureId} es una opción válida. Comprobando requisitos...`);
            let canBuild = true;

            if (structureInfo.requiredTech) {
                 console.log(`      - Requiere tecnología: "${structureInfo.requiredTech}". ¿La tiene el jugador?`);
                 if (playerTechs.includes(structureInfo.requiredTech)) {
                     console.log(`        -> SÍ. Tecnología encontrada.`);
                 } else {
                     console.log(`        -> NO. Tecnología NO encontrada.`);
                     canBuild = false;
                 }
            } else {
                 console.log(`      - No requiere tecnología.`);
            }

            if (structureInfo.cost && canBuild) {
                console.log(`      - Comprobando coste: ${JSON.stringify(structureInfo.cost)}`);
                for (const resKey in structureInfo.cost) {
                    const amountNeeded = structureInfo.cost[resKey];
                    if (resKey === 'Colono') {
                        console.log(`        - Comprobando requisito: Colono`);
                        if (selectedUnit) {
                            console.log(`          - Unidad seleccionada: SÍ (${selectedUnit.name})`);
                            if (selectedUnit.isSettler) {
                                 console.log(`          - ¿Es Colono?: SÍ`);
                                 if (selectedUnit.r === r && selectedUnit.c === c) {
                                     console.log(`          - ¿Está en la casilla correcta?: SÍ`);
                                 } else {
                                      console.log(`          - ¿Está en la casilla correcta?: NO. Unidad en (${selectedUnit.r},${selectedUnit.c})`);
                                      canBuild = false;
                                 }
                            } else {
                                 console.log(`          - ¿Es Colono?: NO`);
                                 canBuild = false;
                            }
                        } else {
                             console.log(`          - Unidad seleccionada: NO`);
                             canBuild = false;
                        }
                    } else { // Recursos normales
                        const playerAmount = playerResources[resKey] || 0;
                         console.log(`        - Comprobando requisito: ${amountNeeded} de ${resKey}. Tiene: ${playerAmount}`);
                        if (playerAmount < amountNeeded) {
                            console.log(`          -> NO. Fondos insuficientes.`);
                            canBuild = false;
                        } else {
                             console.log(`          -> SÍ. Fondos suficientes.`);
                        }
                    }
                    if (!canBuild) break;
                }
            }
            
            console.log(`    - RESULTADO FINAL PARA ${structureId}: ${canBuild ? "Se puede construir." : "NO se puede construir."}`);
            if (canBuild) {
                buildableOptions.push({
                    type: structureId, name: structureInfo.name, sprite: structureInfo.sprite,
                    costStr: Object.entries(structureInfo.cost || {}).map(([k,v]) => `${v} ${k}`).join(', ') || "Gratis"
                });
            }
        } // fin del 'for' original
    }
    
    // --- Lógica final para poblar y mostrar el modal (tu código original, sin cambios) ---
    console.log(`\n  [Paso 3] Fin de la iteración. Opciones construibles encontradas: ${buildableOptions.length}`);
    
    if (buildableOptions.length === 0) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No hay mejoras o construcciones disponibles aquí (o no tienes los requisitos).</li>';
    } else {
        buildableOptions.forEach(option => {
            const li = document.createElement('li');
            li.textContent = `${option.sprite} ${option.name} (Coste: ${option.costStr})`;
            li.addEventListener('click', () => {
                domElements.availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = option.type;
                domElements.confirmBuildBtn.disabled = false;
            });
            domElements.availableStructuresListModalEl.appendChild(li);
        });

        if (buildableOptions.length === 1) {
            domElements.availableStructuresListModalEl.querySelector('li').click();
        }
    }

    console.log("--- FIN openBuildStructureModal (Mostrando modal) ---");
    domElements.buildStructureModal.style.display = 'flex';
}

function populateAvailableStructuresForModal(r, c) {
    if (!domElements.availableStructuresListModalEl) return;
    domElements.availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    domElements.confirmBuildBtn.disabled = true;

    const hex = board[r]?.[c];
    if (!hex || hex.isCity) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No se puede construir aquí.</li>';
        return;
    }
    
    const playerResources = gameState.playerResources[gameState.currentPlayer];
    // ===>>> CORRECCIÓN AQUÍ: Obtenemos las tecnologías investigadas del jugador <<<===
    const playerTechs = playerResources.researchedTechnologies || [];
    let structureOffered = false;
    
    for (const type in STRUCTURE_TYPES) {
        const info = STRUCTURE_TYPES[type];
        let canBuild = true;
        let reason = "";

        // ===>>> ¡NUEVA VALIDACIÓN DE TECNOLOGÍA! <<<===
        if (info.requiredTech && !playerTechs.includes(info.requiredTech)) {
            canBuild = false;
            reason += `[Requiere ${TECHNOLOGY_TREE_DATA[info.requiredTech]?.name || info.requiredTech}]`;
        }
        // ===>>> FIN DE LA NUEVA VALIDACIÓN <<<===
        
        if (!info.buildableOn.includes(hex.terrain)) {
            canBuild = false; reason += "[Terreno Incorrecto]";
        }
        if (info.requiresStructure && hex.structure !== info.requiresStructure) {
            canBuild = false; reason += `[Requiere ${info.requiresStructure}]`;
        } else if (!info.requiresStructure && hex.structure) {
            canBuild = false; reason += "[Ya hay Estructura]";
        }

        let costStr = "";
        for (const res in info.cost) {
            costStr += `${info.cost[res]} ${res}, `;
            if ((playerResources[res] || 0) < info.cost[res]) {
                if (canBuild) reason += "[Fondos Insuficientes]";
                canBuild = false;
            }
        }
        costStr = costStr.slice(0, -2);
        
        const li = document.createElement('li');
        li.textContent = `${info.sprite} ${type} (${costStr}) ${reason}`;
        li.dataset.type = type;

        if (canBuild) {
            structureOffered = true;
            li.classList.add('buildable-structure-option');
            li.onclick = () => {
                domElements.availableStructuresListModalEl.querySelectorAll('li').forEach(i => i.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type;
                domElements.confirmBuildBtn.disabled = false;
            };
        } else {
            li.style.cssText = "opacity:0.6; cursor:not-allowed;";
        }
        domElements.availableStructuresListModalEl.appendChild(li);
    }
    if (!structureOffered) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles.</li>';
    }
}

function showWelcomeHelpModal() {
    const doNotShow = localStorage.getItem('hexEvolvedDoNotShowHelp');
    if (doNotShow === 'true') {
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
        return;
    }
    if (!domElements.welcomeHelpModalEl || !TUTORIAL_MESSAGES) {
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
        return;
    }
    domElements.welcomeHelpTitleEl.textContent = TUTORIAL_MESSAGES.title;
    domElements.welcomeHelpSectionsEl.innerHTML = TUTORIAL_MESSAGES.sections.map(s => `<h3>${s.heading}</h3><p>${s.content}</p>`).join('');
    domElements.welcomeHelpFooterEl.textContent = TUTORIAL_MESSAGES.footer;
    domElements.welcomeHelpModalEl.style.display = 'flex';
}

function closeWelcomeHelpModal() {
    if (domElements.welcomeHelpModalEl) {
        domElements.welcomeHelpModalEl.style.display = 'none';
        if (domElements.doNotShowAgainCheckbox.checked) {
            localStorage.setItem('hexEvolvedDoNotShowHelp', 'true');
        }
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
    }
}

function openAdvancedSplitUnitModal(unit) {
    // Le decimos al UIManager que detenga cualquier temporizador de autocierre pendiente.
    if (typeof UIManager !== 'undefined' && UIManager._autoCloseTimeout) { clearTimeout(UIManager._autoCloseTimeout); UIManager._autoCloseTimeout = null; }

    // El resto de la función se mantiene exactamente igual.
    if (!domElements.advancedSplitUnitModal || !unit) {
        if (UIManager) UIManager.hideContextualPanel();
        return;
    }
    _unitBeingSplit = unit;
    
    // Se crea un nuevo objeto que es una copia de todas las propiedades del regimiento original.
    _tempOriginalRegiments = (unit.regiments || []).map(reg => ({ ...reg }));
    _tempNewUnitRegiments = [];

    if (domElements.advancedSplitUnitNameDisplay) domElements.advancedSplitUnitNameDisplay.textContent = unit.name;
    updateAdvancedSplitModalDisplay();
    domElements.advancedSplitUnitModal.style.display = 'flex';
}

function moveRegimentToNewUnit(index) {
    if (index >= 0 && index < _tempOriginalRegiments.length) {
        if (_tempNewUnitRegiments.length >= MAX_REGIMENTS_PER_DIVISION) return;
        _tempNewUnitRegiments.push(_tempOriginalRegiments.splice(index, 1)[0]);
        updateAdvancedSplitModalDisplay();
    }
}

function moveRegimentToOriginalUnit(index) {
    if (index >= 0 && index < _tempNewUnitRegiments.length) {
        if (_tempOriginalRegiments.length >= MAX_REGIMENTS_PER_DIVISION) return;
        _tempOriginalRegiments.push(_tempNewUnitRegiments.splice(index, 1)[0]);
        updateAdvancedSplitModalDisplay();
    }
}

function updateAdvancedSplitModalDisplay() {
    // Verificación de seguridad
    if (!domElements.originalUnitRegimentsList || !domElements.newUnitRegimentsList || !_unitBeingSplit) return;
    
    // Creamos objetos temporales que son COPIAS COMPLETAS de la unidad original,
    // y LUEGO sobrescribimos solo la propiedad 'regiments'. Esto asegura que
    // tengan 'name', 'id' y todas las demás propiedades que calculateRegimentStats espera.
    let originalTempUnit = { ..._unitBeingSplit, regiments: _tempOriginalRegiments };
    let newTempUnit = { ..._unitBeingSplit, regiments: _tempNewUnitRegiments };

    // --- LOG DE DIAGNÓSTICO (Como pediste) ---
    // Esto nos mostrará en la consola exactamente qué objetos estamos enviando.
    console.log("[DIAGNÓSTICO] Objeto que se enviará a calculateRegimentStats (original):", originalTempUnit);
    calculateRegimentStats(originalTempUnit); 

    console.log("[DIAGNÓSTICO] Objeto que se enviará a calculateRegimentStats (nuevo):", newTempUnit);
    calculateRegimentStats(newTempUnit);
    

    // --- Panel de la Unidad Original ---
    domElements.originalUnitRegimentCount.textContent = `(${_tempOriginalRegiments.length})`; // Solo el contador
    domElements.originalUnitPreviewStats.textContent = `A/D: ${originalTempUnit.attack}/${originalTempUnit.defense}`; // Stats A/D
    domElements.originalUnitPreviewHealth.textContent = `Salud: ${originalTempUnit.maxHealth}`; // Salud
    
    domElements.newUnitRegimentCount.textContent = `(${_tempNewUnitRegiments.length})`;
    domElements.newUnitPreviewStats.textContent = `A/D: ${newTempUnit.attack}/${newTempUnit.defense}`;
    domElements.newUnitPreviewHealth.textContent = `Salud: ${newTempUnit.maxHealth}`;

    // Función auxiliar para crear el elemento de sprite (img o span)
    const createSpriteElement = (reg) => {
        const spriteValue = REGIMENT_TYPES[reg.type]?.sprite || '?';
        let spriteElement;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
            spriteElement = document.createElement('img');
            spriteElement.src = spriteValue;
            spriteElement.alt = reg.type;
            spriteElement.style.width = '24px';
            spriteElement.style.height = '24px';
            spriteElement.style.verticalAlign = 'middle';
        } else {
            spriteElement = document.createElement('span');
            spriteElement.textContent = spriteValue;
        }
        return spriteElement;
    };
    
    // --- PARA MOSTRAR SALUD ---
    const createRegimentDisplay = (reg) => {
        const regData = REGIMENT_TYPES[reg.type];
        const container = document.createElement('span');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        
        const spriteEl = createSpriteElement(reg);
        const healthText = document.createTextNode(` (${reg.health}/${regData.health})`);

        container.appendChild(spriteEl);
        container.appendChild(healthText);
        return container;
    };
    
    // Rellenar lista de Unidad Original
    domElements.originalUnitRegimentsList.innerHTML = '';
    _tempOriginalRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        li.style.justifyContent = 'space-between'; // Asegura que el botón se vaya a la derecha

        const regDisplay = createRegimentDisplay(reg);
        
        const actionSpan = document.createElement('span');
        actionSpan.className = 'regiment-actions';
        actionSpan.title = 'Mover';
        actionSpan.textContent = '➡️';
        
        li.appendChild(regDisplay); // Contenedor con sprite y salud
        li.appendChild(document.createTextNode(' ')); // Añade un espacio
        li.appendChild(actionSpan);
        
        li.title = `${reg.type} (Salud: ${reg.health})`;
        li.onclick = () => moveRegimentToNewUnit(i);
        domElements.originalUnitRegimentsList.appendChild(li);
    });

    // Rellenar lista de Nueva Unidad
    domElements.newUnitRegimentsList.innerHTML = '';
    _tempNewUnitRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        li.style.justifyContent = 'space-between';

        const regDisplay = createRegimentDisplay(reg);

        const actionSpan = document.createElement('span');
        actionSpan.className = 'regiment-actions';
        actionSpan.title = 'Devolver';
        actionSpan.textContent = '⬅️';
        
        li.appendChild(actionSpan);
        li.appendChild(document.createTextNode(' ')); // Añade un espacio
        li.appendChild(regDisplay);

        li.title = `${reg.type} (Salud: ${reg.health})`;
        li.onclick = () => moveRegimentToOriginalUnit(i);
        domElements.newUnitRegimentsList.appendChild(li);
    });

    // Habilita/deshabilita el botón de finalizar
    if (domElements.finalizeAdvancedSplitBtn) {
        domElements.finalizeAdvancedSplitBtn.disabled = _tempOriginalRegiments.length === 0 || _tempNewUnitRegiments.length === 0;
    }
}

// ========================================================================
// === LÓGICA PARA EL NUEVO MODAL DE GESTIÓN DE UNIDADES ==================
// ========================================================================

// Abre el nuevo modal y prepara su estado inicial.
function openUnitManagementModal() {
    if (!domElements?.unitManagementModal) return;

    currentDivisionBuilder = []; 
    
    const title = (placementMode.recruitHex) ? "Reclutar Nueva División" : "Preparar División para Despliegue";
    domElements.unitManagementTitle.textContent = title;
    domElements.divisionNameInput.value = `División ${units.filter(u => u.player === gameState.currentPlayer).length + 1}`;

    populateUnitManagementCategories(); // Rellena las pestañas de categorías
    updateDivisionSummary(); // Actualiza el panel de resumen (que estará vacío al principio)
    
    domElements.unitManagementModal.style.display = 'flex';
}

// Cierra el modal y cancela la acción de creación.
function closeUnitManagementModalAndCancel() {
    if (domElements.unitManagementModal) {
        domElements.unitManagementModal.style.display = 'none';
    }
    placementMode.active = false;
    placementMode.unitData = null;
    placementMode.recruitHex = null;
}

// Crea las pestañas de categorías (Infantería, Caballería, etc.).
function populateUnitManagementCategories() {
    if (!domElements.unitCategoryTabs) return;
    domElements.unitCategoryTabs.innerHTML = '';
    const categories = [...new Set(Object.values(REGIMENT_TYPES).map(reg => reg.category))];

    categories.forEach((category, index) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn';
        tabBtn.dataset.category = category;
        tabBtn.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            populateAvailableUnitsForCategory(category);
        });

        if (index === 0) {
            tabBtn.classList.add('active');
            populateAvailableUnitsForCategory(category); // Muestra la primera categoría por defecto
        }
        domElements.unitCategoryTabs.appendChild(tabBtn);
    });
}

// Muestra las unidades disponibles para la categoría seleccionada, validando tecnología.
function populateAvailableUnitsForCategory(category) {
    if (!domElements.availableUnitsList) return;
    domElements.availableUnitsList.innerHTML = '';

    const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
    const unlockedUnits = new Set();
    playerTechs.forEach(techId => {
        const techData = TECHNOLOGY_TREE_DATA[techId];
        if (techData?.unlocksUnits) {
            techData.unlocksUnits.forEach(unitKey => unlockedUnits.add(unitKey));
        }
    });

    let unitsInCategory = 0;
    for (const type in REGIMENT_TYPES) {
        const regiment = REGIMENT_TYPES[type];
        if (regiment.category === category) {
            if (unlockedUnits.has(type)) {
                unitsInCategory++;
                const unitEntry = document.createElement('div');
                unitEntry.className = 'unit-entry';

                // Contenedor para el sprite y el nombre
                const unitInfoSpan = document.createElement('span');
                
                // Lógica condicional para el sprite (img o span)
                const spriteValue = regiment.sprite;
                let spriteElement;

                if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
                    // Si es una ruta de imagen, crea un elemento <img>
                    spriteElement = document.createElement('img');
                    spriteElement.src = spriteValue;
                    spriteElement.alt = type;
                    spriteElement.style.width = '24px'; // Ajusta el tamaño como necesites
                    spriteElement.style.height = '24px';
                    spriteElement.style.marginRight = '8px';
                    spriteElement.style.verticalAlign = 'middle';
                } else {
                    // Si no, crea un elemento <span> para el emoji/texto
                    spriteElement = document.createElement('span');
                    spriteElement.textContent = spriteValue;
                    spriteElement.style.marginRight = '8px';
                }

                // --- Añadimos la salud máxima ---
                const healthText = ` (${regiment.health}/${regiment.health})`;
                
                unitInfoSpan.appendChild(spriteElement);
                unitInfoSpan.appendChild(document.createTextNode(type + healthText)); // Se añade la salud al texto

                // 4. Crear los controles de cantidad
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'quantity-controls';
                controlsDiv.dataset.type = type;
                controlsDiv.innerHTML = `<button class="quantity-btn minus">-</button><input type="number" class="quantity-input" value="0" min="0" readonly><button class="quantity-btn plus">+</button>`;
                
                // 5. Añadir todo al 'unitEntry' principal
                unitEntry.appendChild(unitInfoSpan);
                unitEntry.appendChild(controlsDiv);

                // La lógica de los listeners se mantiene igual
                const controls = unitEntry.querySelector('.quantity-controls');
                const input = controls.querySelector('.quantity-input');
                controls.querySelector('.plus').addEventListener('click', () => {
                    addRegimentToBuilder(type);
                    input.value = currentDivisionBuilder.filter(r => r.type === type).length;
                });
                controls.querySelector('.minus').addEventListener('click', () => {
                    removeRegimentFromBuilder(type);
                    input.value = currentDivisionBuilder.filter(r => r.type === type).length;
                });
                domElements.availableUnitsList.appendChild(unitEntry);
            }
        }
    }
    if (unitsInCategory === 0) {
        domElements.availableUnitsList.innerHTML = '<p style="text-align:center; padding:10px;">No hay unidades disponibles.</p>';
    }
}

// Añade un regimiento a la división en construcción.
function addRegimentToBuilder(type) {
    if (currentDivisionBuilder.length >= MAX_REGIMENTS_PER_DIVISION) {
        logMessage(`Una división no puede tener más de ${MAX_REGIMENTS_PER_DIVISION} regimientos.`);
        return;
    }
    if (REGIMENT_TYPES[type]) {
        // En lugar de una copia superficial, creamos un clon profundo y completo.
        // Cada regimiento será ahora un objeto totalmente independiente.
        const newRegiment = JSON.parse(JSON.stringify(REGIMENT_TYPES[type]));
        newRegiment.type = type;
        newRegiment.id = `r_${unitIdCounter}_${currentDivisionBuilder.length}_${Date.now()}`; // Añadir ID único
        currentDivisionBuilder.push(newRegiment);
        
        updateDivisionSummary();
    }
}

// Quita el último regimiento del tipo especificado.
function removeRegimentFromBuilder(type) {
    const indexToRemove = currentDivisionBuilder.findLastIndex(reg => reg.type === type);
    if (indexToRemove > -1) {
        currentDivisionBuilder.splice(indexToRemove, 1);
        updateDivisionSummary();
    }
}

// Actualiza todo el panel de resumen de la división en construcción.
function updateDivisionSummary() {
    if (!domElements.divisionCompositionList || !domElements.divisionCostSummary || !domElements.divisionStatsSummary || !domElements.divisionRegimentCount) {
        console.error("updateDivisionSummary: Faltan elementos del DOM del panel de resumen.");
        return;
    }

    // Puntos 1, 2 y 3 no tienen cambios y funcionan bien
    const finalCost = { oro: 0, puntosReclutamiento: 0 };
    currentDivisionBuilder.forEach(reg => {
        const costData = REGIMENT_TYPES[reg.type]?.cost || {};
        for (const res in costData) {
            if (res !== 'upkeep') {
                finalCost[res] = (finalCost[res] || 0) + costData[res];
            }
        }
    });
    const costString = Object.entries(finalCost)
        .filter(([, val]) => val > 0)
        .map(([res, val]) => `${val} ${res}`)
        .join(', ') || '0 Recursos';
    domElements.divisionCostSummary.textContent = costString;
    
    let tempDivisionObject = { player: gameState.currentPlayer, regiments: currentDivisionBuilder };
    calculateRegimentStats(tempDivisionObject);
    const statsString = `A: ${tempDivisionObject.attack} D: ${tempDivisionObject.defense} M: ${tempDivisionObject.movement}`;
    domElements.divisionStatsSummary.textContent = statsString;

    domElements.divisionRegimentCount.textContent = `${currentDivisionBuilder.length} / ${MAX_REGIMENTS_PER_DIVISION}`;
    
    const regimentCounts = {};
    currentDivisionBuilder.forEach(reg => {
        regimentCounts[reg.type] = (regimentCounts[reg.type] || 0) + 1;
    });
    
    domElements.divisionCompositionList.innerHTML = ''; 

    for (const [type, count] of Object.entries(regimentCounts)) {
        const regimentData = REGIMENT_TYPES[type];
        if (!regimentData) continue;

        const li = document.createElement('li');
        
        // Determina cuál es la representación visual (emoji o ruta de imagen)
        const visualInfo = regimentData.icon || regimentData.sprite || '?';
        let visualElement;

        // **AQUÍ ESTÁ LA LÓGICA CLAVE:**
        // Si la información visual es una ruta de imagen...
        if (visualInfo.includes('.png') || visualInfo.includes('.jpg') || visualInfo.includes('.gif')) {
            visualElement = document.createElement('img');
            visualElement.src = visualInfo;
            visualElement.className = 'regiment-icon-image'; // Clase para darle estilo
        } 
        // Si no, es un emoji o texto...
        else {
            visualElement = document.createElement('span');
            visualElement.textContent = visualInfo;
            visualElement.className = 'regiment-icon-emoji'; // Clase para darle estilo
        }
        
        // El resto del código es igual para ambos casos
        const countSpan = document.createElement('span');
        countSpan.className = 'regiment-count';
        countSpan.textContent = `x${count}`;
        
        li.appendChild(visualElement);
        li.appendChild(countSpan);
        
        domElements.divisionCompositionList.appendChild(li);
    }

    if (domElements.finalizeUnitManagementBtn) {
        domElements.finalizeUnitManagementBtn.disabled = currentDivisionBuilder.length === 0;
    }
}

function handleFinalizeDivision() {
    if (currentDivisionBuilder.length === 0) {
        logMessage("Una división debe tener al menos un regimiento.");
        return;
    }

    // 1. Calcular el coste total y validar recursos
    const finalCost = {};
    currentDivisionBuilder.forEach(reg => {
        const costData = REGIMENT_TYPES[reg.type]?.cost || {};
        for (const res in costData) {
            if (res !== 'upkeep') {
                finalCost[res] = (finalCost[res] || 0) + costData[res];
            }
        }
    });

    const playerRes = gameState.playerResources[gameState.currentPlayer];
    for (const res in finalCost) {
        if ((playerRes[res] || 0) < finalCost[res]) {
            logMessage(`No tienes suficientes recursos para crear esta división.`);
            return;
        }
    }
    
    // 2. Deducir los recursos
    for (const res in finalCost) {
        playerRes[res] -= finalCost[res];
    }

    if (UIManager && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }
    
    // 3. Crear el objeto "cáscara" de la unidad
    const newDivisionDataObject = {
        id: null, // Se asignará en placeFinalizedDivision
        player: gameState.currentPlayer,
        name: domElements.divisionNameInput.value.trim() || "Nueva División",
        commander: null,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        r: -1, c: -1, element: null, 
        hasMoved: false,
        hasAttacked: false,
        level: 0, experience: 0, 
        morale: 50, maxMorale: 125,
        cost: finalCost,
        isSettler: currentDivisionBuilder.some(reg => REGIMENT_TYPES[reg.type]?.isSettler === true)
    };

    console.log('[DEBUG COLONO] Objeto de división creado:', { 
        name: newDivisionDataObject.name, 
        isSettler: newDivisionDataObject.isSettler,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)) 
    });

    // 4. Pasar el objeto completo para que se rellene con stats
    calculateRegimentStats(newDivisionDataObject);

    // 5. Inicializar salud y movimiento usando los valores recién calculados
    newDivisionDataObject.currentHealth = newDivisionDataObject.maxHealth;
    newDivisionDataObject.currentMovement = newDivisionDataObject.movement;
    
    // 6. Activar el modo de colocación
    placementMode.active = true;
    placementMode.unitData = newDivisionDataObject;
    
    if (domElements.unitManagementModal) {
        domElements.unitManagementModal.style.display = 'none';
    }
    
    logMessage(`División "${newDivisionDataObject.name}" lista. Haz clic en un hexágono válido para colocarla.`);
    if (UIManager) UIManager.updatePlayerAndPhaseInfo();
}

function handleFinalizeSplit() {
    if (!_unitBeingSplit || _tempOriginalRegiments.length === 0 || _tempNewUnitRegiments.length === 0) {
        logMessage("División inválida: ambas unidades deben tener regimientos.");
        return;
    }
    
    if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';

    gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: _unitBeingSplit.id, 
        originalR: _unitBeingSplit.r, 
        originalC: _unitBeingSplit.c,
        newUnitRegiments: JSON.parse(JSON.stringify(_tempNewUnitRegiments)),
        remainingOriginalRegiments: JSON.parse(JSON.stringify(_tempOriginalRegiments))
    };

    if (typeof UIManager !== 'undefined' && UIManager.highlightPossibleSplitHexes) {
        UIManager.highlightPossibleSplitHexes(_unitBeingSplit);
    } 
    if (typeof logMessage === "function") logMessage(`Haz clic en un hex adyacente para colocar la nueva unidad.`);
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unit_split');
    }
    
    _unitBeingSplit = null;
    _tempOriginalRegiments = [];
    _tempNewUnitRegiments = [];

}

// ========================================================================
//Abre el modal de detalles de la división y lo rellena con la información de los regimientos.
// @param {object} unit - La unidad seleccionada para mostrar.
// ========================================================================
function openUnitDetailModal(unit) {
    if (!domElements.unitDetailModal || !unit) return;
    
    domElements.unitDetailTitle.textContent = `Gestión de: ${unit.name}`;
    populateUnitDetailList(unit); // Llama a la función que crea la lista
    domElements.unitDetailModal.style.display = 'flex';
}

/**
 * Rellena la lista de regimientos en el modal de detalles.
 * @param {object} unit - La unidad cuyos regimientos se van a mostrar.
 */
function populateUnitDetailList(unit) {
    if (!unit) return;

    domElements.unitDetailTitle.textContent = `Gestión de: ${unit.name}`;

    // Contenedor para la información del general
    let commanderHTML = '';
    if (unit.commander && COMMANDERS[unit.commander]) {
        const cmdr = COMMANDERS[unit.commander];
        
        // Decidimos si pintar Emoji (viejo) o Imagen (nuevo)
        const isImagePath = cmdr.sprite.includes('/') || cmdr.sprite.includes('.');
        const visualContent = isImagePath 
            ? `<img src="${cmdr.sprite}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid gold; vertical-align: middle;">`
            : `<span style="font-size: 2.5em;">${cmdr.sprite}</span>`;

        commanderHTML = `
            <div class="commander-details-section" style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid #f1c40f; margin-bottom: 15px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #888; font-size: 10px; text-transform: uppercase;">Comandante de División</h4>
                <div style="margin-bottom: 5px;">${visualContent}</div>
                <p style="font-size: 14px; font-weight: bold; margin: 0; color: #f1c40f;">
                    ${cmdr.name}
                </p>
                <p style="font-size: 10px; font-style: italic; margin: 2px 0 0 0; color: #cbd5e0;">
                    ${cmdr.title}
                </p>
            </div>
        `;
    }
    
    // Rellenar Stats Principales
    const statsContainer = domElements.unitDetailModal.querySelector('.unit-main-stats');
    if (statsContainer) {
        // Inyectamos el HTML del comandante (si existe) y luego los stats
        statsContainer.innerHTML = commanderHTML + `
            <div class="stat-row">
                <span class="stat-label">Salud:</span>
                <div class="unit-total-health-bar-container">
                    <div id="unitDetailTotalHealthBar" class="unit-total-health-bar" style="width: ${(unit.currentHealth / unit.maxHealth) * 100}%;"></div>
                </div>
                <span id="unitDetailTotalHealthText">${unit.currentHealth} / ${unit.maxHealth}</span>
            </div>
            <div class="stat-row stat-summary">
                <span id="unitDetailCombatStats">A/D: ${unit.attack}/${unit.defense}</span>
                <span id="unitDetailMovementStats">Mov: ${unit.currentMovement || unit.movement}</span>
                <span id="unitDetailVisionStats">Vis: ${unit.visionRange}</span>
            </div>
            <div class="stat-row">
                <span id="unitDetailMorale">Moral: ...</span>
                <span id="unitDetailXP">XP: ...</span>
            </div>
        `;

        // Re-asignamos referencias a los elementos internos de stats después de sobreescribir el HTML
        
        // Moral
        const moralStatusMap = { high: "Exaltada", low: "Baja", breaking: "Vacilante" };
        const moralColorMap = { high: "#2ecc71", low: "#f39c12", breaking: "#e74c3c" };
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = moralStatusMap.high; moralColor = moralColorMap.high; }
        else if (unit.morale <= 24) { moralStatus = moralStatusMap.breaking; moralColor = moralColorMap.breaking; }
        else if (unit.morale < 50) { moralStatus = moralStatusMap.low; moralColor = moralColorMap.low; }
        
        statsContainer.querySelector('#unitDetailMorale').innerHTML = `Moral: <strong style="color:${moralColor};">${unit.morale}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

        // Experiencia
        const levelData = XP_LEVELS[unit.level || 0];
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            let xpText = `XP: ${levelData.currentLevelName}`;
            if (nextLevelXP !== 'Max') {
                xpText += ` (${unit.experience || 0} / ${nextLevelXP})`;
            }
            statsContainer.querySelector('#unitDetailXP').textContent = xpText;
        }
    }


    // --- Rellenar la Lista de Regimientos ---
    const listEl = domElements.unitDetailRegimentList;
    listEl.innerHTML = ''; // Limpiar la lista

    if (!unit.regiments || unit.regiments.length === 0) {
        listEl.innerHTML = '<li>No hay regimientos en esta división.</li>';
        return;
    }
    
    // <<== Comprobamos si la unidad es del jugador actual para el "modo consulta" ==>>
    const isOwnUnit = unit.player === gameState.currentPlayer;

    unit.regiments.forEach(reg => {
        const regData = REGIMENT_TYPES[reg.type];
        if (!regData) return;

        const maxHealth = regData.health;
        const currentHealth = reg.health;
        const healthPercentage = (currentHealth / maxHealth) * 100;
        
        const li = document.createElement('li');
        li.className = 'regiment-detail-item';

        // 2. Crear el icono (condicionalmente como <img> o <span>)
        const iconSpan = document.createElement('span');
        iconSpan.className = 'regiment-icon';
        const spriteValue = regData.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.alt = reg.type;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            iconSpan.appendChild(img);
        } else {
            iconSpan.textContent = spriteValue;
        }

        // 3. Crear los demás elementos programáticamente
        const nameSpan = document.createElement('span');
        nameSpan.className = 'regiment-name';
        nameSpan.textContent = getAbbreviatedName(reg.type);

        const healthBarContainer = document.createElement('div');
        healthBarContainer.className = 'regiment-health-bar-container';
        healthBarContainer.innerHTML = `<div class="regiment-health-bar" style="width: ${healthPercentage}%;"></div>`;

        const healthTextSpan = document.createElement('span');
        healthTextSpan.className = 'regiment-health-text';
        healthTextSpan.textContent = `${currentHealth}/${maxHealth}`;

        // 4. Montar la estructura usando appendChild
        li.appendChild(iconSpan);
        li.appendChild(nameSpan);
        li.appendChild(healthBarContainer);
        li.appendChild(healthTextSpan);
        
        // 5. Añadir el botón de reforzar o el placeholder 
        if (isOwnUnit && currentHealth < maxHealth && isHexSuppliedForReinforce(unit.r, unit.c, unit.player)) {
            const reinforceBtn = document.createElement('button');
            reinforceBtn.className = 'reinforce-regiment-btn';
            reinforceBtn.title = 'Reforzar este regimiento (Coste en oro)';
            reinforceBtn.textContent = '➕';
            reinforceBtn.onclick = (e) => {
                e.stopPropagation();
                RequestReinforceRegiment(unit, reg);
            };
            li.appendChild(reinforceBtn);
        } else {
             const placeholder = document.createElement('div');
             placeholder.className = 'reinforce-placeholder';
             li.appendChild(placeholder);
        }
        
        listEl.appendChild(li);
    });

    // --- Lógica del Botón de Disolver ---
    if (domElements.disbandUnitBtn) {
        const hex = board[unit.r]?.[unit.c];
        // Se puede disolver si la unidad es propia y está en territorio propio
        const canDisband = isOwnUnit && hex && hex.owner === unit.player;
        
        domElements.disbandUnitBtn.style.display = isOwnUnit ? 'inline-block' : 'none';
        domElements.disbandUnitBtn.disabled = !canDisband;
        domElements.disbandUnitBtn.title = canDisband ? "Disuelve esta unidad" : "Debe estar en territorio propio";
    }
}

/**
 * Gestiona la acción de reforzar un único regimiento.
 * @param {object} division - La división a la que pertenece el regimiento.
 * @param {object} regiment - El regimiento específico a reforzar.
 */
function handleReinforceRegiment(division, regiment) {
    const regData = REGIMENT_TYPES[regiment.type];
    const healthToRestore = regData.health - regiment.health;
    if (healthToRestore <= 0) return;

    // <<== NUEVO CÁLCULO DE COSTE: más realista. ==>>
    // Costo para reforzar = (coste total del regimiento / salud total) * puntos de vida a curar * factor de sobrecoste
    const reinforceCostMultiplier = 1.5; // Reforzar es un 50% más caro que reclutar.
    const baseRegCost = regData.cost.oro || 0;
    const costPerHp = baseRegCost / regData.health;
    const totalCost = Math.ceil(costPerHp * healthToRestore * reinforceCostMultiplier);
    
    const playerRes = gameState.playerResources[division.player];
    if (playerRes.oro < totalCost) {
        logMessage(`Oro insuficiente. Necesitas ${totalCost} para reforzar.`, 'error');
        return;
    }

    // Usamos el `confirm` de siempre para la interacción
    //if (confirm(`¿Reforzar ${getAbbreviatedName(regiment.type)} por ${totalCost} de oro?`)) {

        if (gameState.isTutorialActive) {
            // Usamos el nombre de la bandera que espera el paso 23 del guion
            TutorialManager.notifyActionCompleted('unitReinforced'); 
        }
        
        if (gameState.isTutorialActive) gameState.tutorial.unitReinforced = true;
        playerRes.oro -= totalCost;
        regiment.health = regData.health; // Restaurar salud del regimiento
        
        recalculateUnitHealth(division); // Actualizar la salud total de la división

        logMessage(`${regiment.type} en ${division.name} ha sido reforzado.`);
        
        // Volvemos a poblar el modal para reflejar los cambios inmediatamente
        populateUnitDetailList(division); 

        // Actualizar la UI del juego principal
        if (UIManager) {
            UIManager.updatePlayerAndPhaseInfo();
            UIManager.updateUnitStrengthDisplay(division);
        }
    //}
}

// Listener para el botón de cerrar del nuevo modal
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('num-players-slider');
    // Búsqueda ajustada para el nuevo HTML
    const display = document.getElementById('num-players-display'); 
    const hiddenSelect = document.getElementById('new-num-players');

    if (slider && display && hiddenSelect) {
        const updatePlayerCount = (value) => {
            display.textContent = value;
            hiddenSelect.innerHTML = `<option value="${value}" selected>${value}</option>`;
        };

        slider.addEventListener('input', () => {
            updatePlayerCount(slider.value);
        });
        
        updatePlayerCount(slider.value); // Inicializa al cargar
    }
});

// ======================================================================
// =================== LÓGICA PARA LA WIKI INTERNA DEL JUEGO ==================
// ======================================================================

// --- FUNCIÓN PRINCIPAL PARA ABRIR Y GESTIONAR LA WIKI ---

/**
 * Abre el modal de la Wiki y rellena su contenido dinámicamente.
 */
function openWikiModal() {
    if (!domElements.wikiModal) return;

    // 1. Cargamos TODOS los datos de las pestañas
    populateWikiRegimentsTab(); 
    populateWikiStructuresTab();
    populateWikiTechTab();
    populateWikiHeroes();   
    populateWikiComercio(); 
    populateWikiVictoria(); 
    populateWikiConceptsTab();

    // 2. Sistema de navegación
    const tabs = document.querySelectorAll('.wiki-tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            // Limpieza total
            document.querySelectorAll('.wiki-tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.wiki-page').forEach(p => p.classList.remove('active'));
            
            // Activación
            tab.classList.add('active');
            const targetId = `wiki-tab-${tab.dataset.tab}`;
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.scrollTop = 0; // Siempre empezar arriba
            }
        };
    });

    domElements.wikiModal.style.display = 'flex';
}

// --- FUNCIONES AUXILIARES PARA RELLENAR CADA PESTAÑA ---

/**
 * Rellena la tabla de regimientos en la Wiki.
 */
function populateWikiRegimentsTab() {
    const table = document.getElementById('wikiRegimentsTable');
    if (!table) return;

    // 1. Limpiar tabla y crear cabecera
    table.innerHTML = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste</th>
                <th>Upkeep</th>
                <th>Ataque</th>
                <th>Defensa</th>
                <th>Salud</th>
                <th>Mov.</th>
                <th>Rango</th>
                <th>Limitaciones Terreno</th>
            </tr>
        </thead>
    `;
    const tbody = document.createElement('tbody');

    // Funciones auxiliares (se mantienen igual)
    const getStars = (value, max) => {
        const score = (value / max) * 5;
        const fullStars = Math.floor(score);
        let stars = '⭐'.repeat(fullStars);
        if (score - fullStars > 0.5) stars += '✨';
        return `<span class="wiki-stars" title="${value}">${stars}</span>`;
    };
    const maxAttack = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attack));
    const maxDefense = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.defense));
    const maxHealth = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.health));
    const maxMovement = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.movement));
    const maxRange = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attackRange));

    // 2. Iterar y construir filas y celdas
    for (const type in REGIMENT_TYPES) {
        const reg = REGIMENT_TYPES[type];
        const tr = tbody.insertRow(); // Crear una nueva fila

        // Celda de Icono (con la lógica corregida)
        const iconCell = tr.insertCell();
        iconCell.className = 'wiki-regiment-icon';
        const spriteValue = reg.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            iconCell.appendChild(img);
        } else {
            iconCell.textContent = spriteValue;
        }

        // Celdas de texto
        tr.insertCell().textContent = type;
        tr.insertCell().textContent = `${reg.cost.oro || 0} Oro, ${reg.cost.puntosReclutamiento || 0} PR`;
        tr.insertCell().textContent = `${reg.cost.upkeep || 0} Oro`;
        tr.insertCell().innerHTML = getStars(reg.attack, maxAttack);
        tr.insertCell().innerHTML = getStars(reg.defense, maxDefense);
        tr.insertCell().innerHTML = getStars(reg.health, maxHealth);
        tr.insertCell().innerHTML = getStars(reg.movement, maxMovement);
        tr.insertCell().innerHTML = getStars(reg.attackRange, maxRange);

        // Celda de Limitaciones (lógica sin cambios)
        let limitationsStr = 'Ninguna';
        if (reg.category && !reg.is_naval) {
            const categoryLimitations = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[reg.category] || [];
            const allLandLimitations = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land || [];
            const allLimitations = [...new Set([...allLandLimitations, ...categoryLimitations])];
            if (allLimitations.length > 0) {
                limitationsStr = allLimitations.map(t => TERRAIN_TYPES[t]?.name || t).join(', ');
            }
        } else if (reg.is_naval) {
            limitationsStr = "Solo Agua";
        }
        tr.insertCell().textContent = limitationsStr;
    }

    table.appendChild(tbody);
}

/**
 * Rellena las tablas de estructuras e ingresos en la Wiki.
 */
function populateWikiStructuresTab() {
    const structuresTable = document.getElementById('wikiStructuresTable');
    const incomeTable = document.getElementById('wikiIncomeTable');
    if (!structuresTable || !incomeTable) return;

    // --- Tabla de Estructuras (con la corrección) ---
    structuresTable.innerHTML = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste</th>
                <th>Efectos</th>
            </tr>
        </thead>
    `;
    const sTbody = document.createElement('tbody');
    for(const type in STRUCTURE_TYPES){
        const s = STRUCTURE_TYPES[type];
        const sTr = sTbody.insertRow();
        
        // Celda de Icono (con la lógica corregida)
        const sIconCell = sTr.insertCell();
        sIconCell.className = 'wiki-regiment-icon';
        const spriteValue = s.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            sIconCell.appendChild(img);
        } else {
            sIconCell.textContent = spriteValue;
        }

        // Celdas de texto
        sTr.insertCell().textContent = s.name;
        const costStr = Object.entries(s.cost).map(([res, val]) => `${val} ${res}`).join(', ');
        sTr.insertCell().textContent = costStr;
        let effectsStr = (s.defenseBonus ? `+${s.defenseBonus} Defensa. ` : '') +
                         (s.allowsRecruitment ? 'Permite reclutar. ' : '');
        sTr.insertCell().textContent = effectsStr;
    }
    structuresTable.appendChild(sTbody);

    // --- Tabla de Ingresos (sin cambios, ya era segura) ---
    incomeTable.innerHTML = `
        <thead>
            <tr>
                <th>Fuente</th>
                <th>Ingreso Base de Oro</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Hexágono Normal</td><td>${GOLD_INCOME.PER_HEX}</td></tr>
            <tr><td>Camino</td><td>${GOLD_INCOME.PER_ROAD}</td></tr>
            <tr><td>Fortaleza</td><td>${GOLD_INCOME.PER_FORT}</td></tr>
            <tr><td>Ciudad</td><td>${GOLD_INCOME.PER_CITY}</td></tr>
            <tr><td>Capital</td><td>${GOLD_INCOME.PER_CAPITAL}</td></tr>
        </tbody>
    `;
}

/**
 * Rellena la tabla de tecnologías en la Wiki.
 */
function populateWikiTechTab() {
    const table = document.getElementById('wikiTechTable');
    if (!table) return;

     let html = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste (Inv.)</th>
                <th>Desbloquea</th>
            </tr>
        </thead>
        <tbody>
    `;
    for(const id in TECHNOLOGY_TREE_DATA){
        const t = TECHNOLOGY_TREE_DATA[id];
        const unlocks = [...(t.unlocksUnits || []), ...(t.unlocksStructures || [])].join(', ');
        html += `
            <tr>
                <td class="wiki-regiment-icon">${t.sprite}</td>
                <td>${t.name}</td>
                <td>${t.cost.researchPoints}</td>
                <td>${unlocks || '-'}</td>
            </tr>
        `;
    }
    html += `</tbody>`;
    table.innerHTML = html;
}

/**
 * Rellena la pestaña de conceptos clave.
 */
function populateWikiConceptsTab() {
    const container = document.getElementById('wikiConceptsContent');
    if (!container) return;

    container.innerHTML = `
        <div>
            <h4>Victoria y Derrota</h4>
            <p>La victoria se logra de dos maneras: <strong>conquistando la capital del enemigo</strong> o <strong>destruyendo todas sus divisiones</strong> en el campo de batalla. ¡Protege tu propia capital y tus unidades a toda costa!</p>
        </div>
        <hr>
        <div>
            <h4>Economía y Territorio</h4>
            <p><strong>Estabilidad (0-5):</strong> Representa el control y orden. Es el modificador más importante de tus ingresos. Un territorio con Estabilidad 5 produce un <strong>+50% de recursos</strong>, mientras que uno con Estabilidad 1 solo produce un 25%.</p>
            <p><strong>Nacionalidad (0-5):</strong> Representa la lealtad de la población. También multiplica tus ingresos. Para que la Nacionalidad de un territorio aumente, su Estabilidad debe ser de <strong>al menos 3</strong>. La conquista de territorios es un proceso lento que requiere pacificar (subir Estabilidad) y luego asimilar (bajar Nacionalidad enemiga).</p>
            <p><strong>Mantenimiento (Upkeep):</strong> ¡Tu mayor gasto! Cada regimiento de tu ejército cuesta Oro por turno. Un ejército grande sin una economía fuerte llevará rápidamente a la bancarrota y a una pérdida masiva de moral en tus tropas.</p>
        </div>
        <hr>
        <div>
            <h4>Logística y Suministro</h4>
             <p><strong>Suministro:</strong> Las unidades necesitan estar conectadas a tu capital o a una fortaleza a través de una cadena ininterrumpida de territorios propios. Una unidad sin suministro <strong>pierde 10 de moral por turno</strong>, sufre <strong>daño de atrición</strong> y <strong>no puede ser reforzada</strong>.</p>
             <p><strong>Refuerzos y Disolución:</strong> Reforzar regimientos dañados cuesta un 150% de su valor original, ¡es caro perder hombres! Solo puedes reforzar en o adyacente a una ciudad/fortaleza. Disolver una unidad en territorio propio te devuelve el 50% de su coste.</p>
        </div>
        <hr>
        <div>
            <h4>Tácticas de Combate</h4>
            <p><strong>Moral (0-125):</strong> Es la voluntad de lucha. Tropas con moral alta luchan mejor. La moral baja si no pagas el mantenimiento, estás sin suministros o eres flanqueado. Si la moral de una división llega a 0, <strong>romperá filas y huirá</strong> o se rendirá.</p>
            <p><strong>Experiencia y Niveles:</strong> Las unidades ganan XP en combate. Al subir de nivel, obtienen bonus permanentes de ataque y defensa, convirtiéndose en tropas de élite.</p>
            <p><strong>Uso del Terreno:</strong> Los <strong>bosques</strong> ofrecen una enorme protección contra ataques a distancia. Las <strong>colinas</strong> dan bonus de defensa y un bonus de ataque a las unidades cuerpo a cuerpo. Usar el terreno a tu favor es clave para la victoria.</p>
            <p><strong>Flanqueo:</strong> Atacar a una unidad enemiga que ya está en combate con otra de tus unidades la considera "flanqueada", reduciendo drásticamente su defensa y moral.</p>
        </div>
        <div class="wiki-section">
            <h4>🏦 La Banca Neutral</h4>
            <p>En el centro del mapa reside 'La Banca'. Puedes comerciar recursos a un ratio de 4:1. Sus caravanas recorren los caminos; protegerlas o saquearlas cambiará el flujo de oro del mundo.</p>
        </div>
        <div class="wiki-section">
            <h4>🏆 Victoria por Prestigio (9 Puntos)</h4>
            <p>No solo la conquista total gana guerras. El primero en obtener 9 PV gana. Obtienes puntos por: Tener el ejército más grande, la ruta comercial más larga, más tecnologías o más héroes. También explorando Ruinas Antiguas.</p>
        </div>
        <div class="wiki-section">
            <h4>📉 Nacionalidad y Estabilidad</h4>
            <p>Ocupar un hexágono no lo hace tuyo. La estabilidad sube con presencia militar. Una vez estabilizado (Nivel 3), la Nacionalidad empezará a convertirse a tu bando. ¡La conquista real toma tiempo!</p>
        </div>
    `;
}

function populateWikiHeroes() {
    document.getElementById('wiki-tab-heroes').innerHTML = `
        <h3>🎖️ Comandantes y el Arte de la Forja</h3>
        <p>Los Héroes son líderes únicos que mejoran tus divisiones a través de habilidades pasivas y activas.</p>
        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:5px;">
            <strong>Progresión:</strong>
            <ul>
                <li><strong>Nivel:</strong> Mejora el daño y desbloquea puntos de talento usando Libros de XP.</li>
                <li><strong>Estrellas:</strong> Aumentan la rareza y desbloquean habilidades mediante fragmentos.</li>
            </ul>
            <strong>La Forja:</strong>
            <p>Obtén planos en el Altar y reúnete con fragmentos de equipo para fabricar piezas legendarias. Existen 6 slots: Cabeza, Arma, Pecho, Guantes, Piernas y Botas.</p>
        </div>
    `;
}

function populateWikiComercio() {
    document.getElementById('wiki-tab-comercio').innerHTML = `
        <h3>🏦 Sistema Financiero de Iberion</h3>
        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:5px; margin-bottom:10px;">
            <h4>Mercado de La Banca</h4>
            <p>La gran ciudad central ofrece servicios de intercambio. El ratio es <strong>4:1</strong> para cualquier recurso (oro, hierro, madera, etc.). Es la forma más rápida de obtener materiales críticos.</p>
        </div>
        <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:5px;">
            <h4>Rutas Comerciales</h4>
            <p>Asigna un General a una <strong>Columna de Suministros</strong>. Si hay un camino conectado entre dos de tus ciudades, puedes iniciar una ruta comercial. Generarás ingresos pasivos en cada turno mientras la unidad viaje protegida.</p>
        </div>
    `;
}

function populateWikiVictoria() {
    document.getElementById('wiki-tab-victoria').innerHTML = `
        <h3>👑 El Camino a la Supremacía</h3>
        <p>Iberion se puede ganar de dos formas fundamentales:</p>
        <div style="border-left: 3px solid #f1c40f; padding-left: 10px; margin-bottom: 15px;">
            <strong>1. Conquista Militar:</strong>
            <p>Captura la capital de tus oponentes o aniquila todas sus unidades en el campo de batalla.</p>
        </div>
        <div style="border-left: 3px solid #3498db; padding-left: 10px;">
            <strong>2. Prestigio (9 Puntos de Victoria):</strong>
            <p>El primer General en alcanzar 9 PV será el ganador absoluto. Puntos otorgados por:</p>
            <ul>
                <li>Ejército más imponente.</li>
                <li>Hegemonía tecnológica (más avances).</li>
                <li>Red de rutas comerciales más extensa.</li>
                <li>Poseer el mayor número de Héroes.</li>
                <li>Saquear la mayor cantidad de recursos.</li>
                <li>Descubrir PV ocultos en 🧭 <strong>Ruinas Antiguas</strong>.</li>
            </ul>
        </div>
    `;
}

//=======================================================================
//== FUNCIONES DE RED EN modalLogic.js              ==
//=======================================================================

function RequestReinforceRegiment(division, regiment) {
    // La validación y el `confirm` se quedan aquí, porque son parte de la "intención" del jugador.
    const regData = REGIMENT_TYPES[regiment.type];
    const healthToRestore = regData.health - regiment.health;
    if (healthToRestore <= 0) return;

    // --- CÓDIGO DE CÁLCULO DE COSTE AÑADIDO (tomado de handleReinforceRegiment) ---
    const reinforceCostMultiplier = 1.5;
    const baseRegCost = regData.cost.oro || 0;
    const costPerHp = baseRegCost / regData.health;
    const totalCost = Math.ceil(costPerHp * healthToRestore * reinforceCostMultiplier);
    
    if (confirm(`¿Reforzar ${getAbbreviatedName(regiment.type)} por ${totalCost} de oro?`)) {
        if (isNetworkGame()) {
            console.log(`[Red - Petición] Solicitando reforzar regimiento en ${division.name}.`);
            NetworkManager.enviarDatos({
                type: 'actionRequest',
                action: {
                    type: 'reinforceRegiment',
                    payload: {
                        playerId: division.player,
                        divisionId: division.id,
                        regimentId: regiment.id // Requiere IDs únicos, ¡asegúrate de que los regimientos los tengan!
                    }
                }
            });
            logMessage("Petición de refuerzo enviada...");
            return;
        }

        // Si es juego local, llama a la función original que ya incluye el confirm.
        handleReinforceRegiment(division, regiment);
    }
}

//=======================================================================
//== FUNCIONES DE Heroes                                               ==
//=======================================================================

/**
 * Abre el modal del Cuartel y muestra la colección de héroes del jugador.
 * Si 'assignmentMode' es true, permite seleccionar un héroe para asignarlo.
 * @param {boolean} assignmentMode - Si se está asignando un héroe a una división.
 * @param {object|null} targetUnit - La unidad a la que se le asignará el héroe.
 */ 
 function openBarracksModal(assignmentMode = false, targetUnit = null) {
    const modal = document.getElementById('barracksModal');
    const container = document.getElementById('heroCollectionContainer');
    if (!modal || !container || !PlayerDataManager.currentPlayer) return;

    container.innerHTML = '';
    const playerData = PlayerDataManager.getCurrentPlayer();

    // Lógica para el modo asignación (sin cambios)
    modal.dataset.assignmentMode = assignmentMode;
    if (targetUnit) {
        modal.dataset.targetUnitId = targetUnit.id;
    } else {
        delete modal.dataset.targetUnitId;
    }

    if (!playerData.heroes || playerData.heroes.length === 0) {
        container.innerHTML = '<p>No has reclutado a ningún héroe todavía.</p>';
    } else {
        // <<== LÓGICA MODIFICADA PARA MOSTRAR HÉROES DESBLOQUEADOS Y BLOQUEADOS ==>>
        
        // Primero, ordena la lista para mostrar siempre los desbloqueados (stars > 0) primero.
    playerData.heroes.sort((a, b) => b.stars - a.stars);
    
    playerData.heroes.forEach(heroInstance => {
        const heroData = COMMANDERS[heroInstance.id];
        // 1. Primero nos aseguramos de que heroData exista
        if (!heroData) return;
        
        // 2. <<== CORRECCIÓN: Ahora que heroData existe, creamos el spriteHTML ==>>
        let spriteHTML = '';
        if (heroData.sprite.includes('.png') || heroData.sprite.includes('.jpg')) {
            // Usamos una clase para que el CSS la controle
            spriteHTML = `<img src="${heroData.sprite}" alt="${heroData.name}" class="hero-card-image">`;
        } else {
            // Mantenemos la lógica para los emojis como fallback
            spriteHTML = `<div class="hero-sprite">${heroData.sprite}</div>`;
        }
        // <<== FIN DE LA CORRECCIÓN ==>>

        const isLocked = heroInstance.stars === 0;
        const card = document.createElement('div');
            // Añadimos la clase 'is-locked' si el héroe no está desbloqueado
        card.className = `hero-card ${heroData.rarity} ${isLocked ? 'is-locked' : ''}`;
        
            // Si está bloqueado, mostramos la tarjeta "fantasma" con el progreso de fragmentos
        if (isLocked) {
                // Asumimos un coste de 20 fragmentos para desbloquear (a 1 estrella)
            const fragmentsNeededToUnlock = HERO_FRAGMENTS_PER_STAR[1] || 20;
            // Usamos la variable spriteHTML que acabamos de crear
            card.innerHTML = `
                ${spriteHTML} 
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-fragments-progress">Fragmentos: ${heroInstance.fragments}/${fragmentsNeededToUnlock}</div>
                <div class="hero-stars">BLOQUEADO</div>
            `;
        } else {
                // Si está desbloqueado, mostramos la tarjeta normal
            card.innerHTML = `
                ${spriteHTML}
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-stars">${'⭐'.repeat(heroInstance.stars)}</div>
            `;
        }

        card.onclick = () => {
            openHeroDetailModal(heroInstance);
        };
        container.appendChild(card);
    });
    }
    
    modal.style.display = 'flex';
}

/**
 * Lee los datos actuales del jugador y vuelve a dibujar todas las tarjetas
 * de héroe en el modal del Cuartel.
 */
function refreshBarracksView() {
    const container = document.getElementById('heroCollectionContainer');
    const playerData = PlayerDataManager.getCurrentPlayer();
    if (!container || !playerData) return;

    container.innerHTML = ''; // Limpiar el contenido actual

    if (!playerData.heroes || playerData.heroes.length === 0) {
        container.innerHTML = '<p>No has reclutado a ningún héroe todavía.</p>';
        return;
    }

    // Ordenar para mostrar desbloqueados primero
    playerData.heroes.sort((a, b) => b.stars - a.stars);
    
    // Volver a crear cada tarjeta (este es tu código de openBarracksModal)
    playerData.heroes.forEach(heroInstance => {
        const heroData = COMMANDERS[heroInstance.id];
        if (!heroData) return;
        
        let spriteHTML = '';
        if (heroData.sprite.includes('.png') || heroData.sprite.includes('.jpg')) {
            spriteHTML = `<img src="${heroData.sprite}" alt="${heroData.name}" class="hero-card-image">`;
        } else {
            spriteHTML = `<div class="hero-sprite">${heroData.sprite}</div>`;
        }

        const isLocked = heroInstance.stars === 0;
        const card = document.createElement('div');
        card.className = `hero-card ${heroData.rarity} ${isLocked ? 'is-locked' : ''}`;
        
        if (isLocked) {
            const fragmentsNeededToUnlock = HERO_FRAGMENTS_PER_STAR[1] || 10;
            card.innerHTML = `
                ${spriteHTML} 
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-fragments-progress">Fragmentos: ${heroInstance.fragments || 0}/${fragmentsNeededToUnlock}</div>
                <div class="hero-stars">BLOQUEADO</div>
            `;
        } else {
            card.innerHTML = `
                ${spriteHTML}
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-stars">${'⭐'.repeat(heroInstance.stars)}</div>
            `;
        }

        // El onclick sigue abriendo el modal de detalles
        card.onclick = () => {
            openHeroDetailModal(heroInstance);
        };
        container.appendChild(card);
    });
}
/**
 * Abre y rellena la pantalla de detalles de un héroe específico.
 * Muestra un botón de "Asignar" solo si se viene desde el flujo de asignación.
 * @param {object} heroInstance - La instancia del héroe del jugador (con su nivel, xp, etc.).
 */
function openHeroDetailModal(heroInstance) {
    const modal = document.getElementById('heroDetailModal');
    if (!modal) return;

    const heroData = COMMANDERS[heroInstance.id];
    const playerData = PlayerDataManager.getCurrentPlayer();
    if (!heroData || !playerData) {
        console.error("No se pueden mostrar los detalles del héroe: Faltan datos.");
        return;
    }

    // <<== INICIO DE LA NUEVA LÓGICA PARA EQUIPO ==>>

    const playerInventory = PlayerDataManager.currentPlayer.inventory.equipment || [];

    // Itera sobre los 6 slots de equipo definidos en el HTML
    const slots = ['head', 'chest', 'legs', 'gloves', 'boots', 'weapon'];
    slots.forEach(slotType => {
        const slotElement = document.getElementById(`equip-${slotType}`);
        if (!slotElement) return;

        // Limpiar contenido y listeners anteriores
        slotElement.innerHTML = `<span>${slotType.charAt(0).toUpperCase() + slotType.slice(1)}</span>`;
        slotElement.classList.remove('available-upgrade');
        
        // 1. Mostrar el ícono del objeto equipado (si lo hay)
        const equippedInstanceId = heroInstance.equipment[slotType];
        if (equippedInstanceId) {
            const itemInstance = playerInventory.find(i => i.instance_id === equippedInstanceId);
            if (itemInstance) {
                const itemDef = EQUIPMENT_DEFINITIONS[itemInstance.item_id];
                if (itemDef) {
                    slotElement.innerHTML = `<span style="font-size: 2.5em;">${itemDef.icon}</span>`;
                    slotElement.title = itemDef.name;
                }
            }
        } else {
             slotElement.title = `Equipar ${slotType}`;
        }

        // 2. Comprobar si hay equipo disponible en el inventario para este slot
        const hasAvailableItems = playerInventory.some(item => {
            const itemDef = EQUIPMENT_DEFINITIONS[item.item_id];
            return itemDef && itemDef.slot === slotType;
        });

        if (hasAvailableItems) {
            slotElement.classList.add('available-upgrade');
        }

        // 3. Añadir el listener para abrir el selector
        slotElement.onclick = () => {
            openEquipmentSelector(heroInstance, slotType);
        };
    });
    const isLocked = heroInstance.stars === 0;
    // --- Rellenar UI de Detalles del Héroe ---
    document.getElementById('hero-portrait-container').innerHTML = `<img src="${heroData.sprite}" alt="${heroData.name}">`;
    document.getElementById('heroDetailName').textContent = heroData.name;
    document.getElementById('heroDetailTitle').textContent = heroData.title;
    
    const currentLevel = heroInstance.level;
    const xpForNextLevel = getXpForNextLevel(currentLevel);
    const talentPoints = heroInstance.talent_points_unspent || 0;
    const skillPoints = heroInstance.skill_points_unspent || 0;
    document.getElementById('heroDetailLevel').textContent = `${currentLevel} (Talentos: ${talentPoints}, Habil: ${skillPoints})`;
    document.getElementById('heroDetailXpBar').style.width = `${xpForNextLevel === 'Max' ? 100 : Math.min(100, (heroInstance.xp / xpForNextLevel) * 100)}%`;
    document.getElementById('heroDetailXpText').textContent = `${heroInstance.xp} / ${xpForNextLevel}`;
    const nextStar = heroInstance.stars + 1;
    const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar] || 'Max';
    document.getElementById('heroDetailStars').textContent = '⭐'.repeat(heroInstance.stars);
    document.getElementById('heroDetailFragmentBar').style.width = `${fragmentsNeeded === 'Max' ? 100 : Math.min(100, (heroInstance.fragments / fragmentsNeeded) * 100)}%`;
    document.getElementById('heroDetailFragmentText').textContent = `${heroInstance.fragments} / ${fragmentsNeeded}`;
    
    // --- LÓGICA DE BOTONES (Nivel y Evolución) ---
    const levelUpBtn = document.getElementById('heroLevelUpBtn');
    
    // NUEVO: El botón siempre está habilitado si no es nivel Max, para permitir el clic de comprobación
    levelUpBtn.disabled = xpForNextLevel === 'Max';
    
    levelUpBtn.onclick = () => {
        const booksOwned = playerData.inventory.xp_books || 0;
        
        if (booksOwned <= 0) {
            // LÓGICA DE REDIRECCIÓN A LA TIENDA
            if (confirm("¡No te quedan Libros de Experiencia!\n\n¿Quieres ir a la Tesorería para conseguir más usando tu Oro o Gemas?")) {
                document.getElementById('heroDetailModal').style.display = 'none'; // Cerrar héroe
                document.getElementById('barracksModal').style.display = 'none';   // Cerrar cuartel
                
                if (typeof StoreManager !== 'undefined') StoreManager.open();
            }
            return;
        }

        // Si tiene libros, procede normal
        PlayerDataManager.useXpBook(heroInstance.id);
        // Refrescar datos...
        const updatedHero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id);
        if (updatedHero) openHeroDetailModal(updatedHero);
    };

    const evolveBtn = document.getElementById('heroEvolveBtn');
    
    if (isLocked) {
        evolveBtn.textContent = "Desbloquear";
    } else {
        evolveBtn.textContent = "Evolucionar";
    }
    
    // La condición para desactivar ahora es más robusta
    evolveBtn.disabled = (heroInstance.fragments || 0) < fragmentsNeeded || !fragmentsNeeded;

    evolveBtn.onclick = () => {
        PlayerDataManager.evolveHero(heroInstance.id);
        const updatedHero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id);
        if (updatedHero) openHeroDetailModal(updatedHero);
    };
    
    // --- Lógica de Habilidades ---
    const skillsContainer = document.getElementById('heroDetailSkillsContainer');
    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        heroData.skills.forEach((skillData, index) => {
            if (!skillData) return;
            const skillDef = SKILL_DEFINITIONS[skillData.skill_id];
            if (!skillDef) return;

            const starsRequired = index + 1;
            const isUnlocked = heroInstance.stars >= starsRequired;

            let skillLevel = (Array.isArray(heroInstance.skill_levels) && heroInstance.skill_levels[index]) || 0;
            if (isUnlocked && index === 0 && skillLevel === 0) {
                 skillLevel = 1; 
            }
            
            const skillDiv = document.createElement('div');
            skillDiv.className = 'skill-item-rok';
            skillDiv.style.opacity = isUnlocked ? '1' : '0.6';

            if (isUnlocked) {
                skillDiv.style.cursor = 'pointer';
                skillDiv.onclick = () => openSkillDetailModal(heroInstance, index);
            }

            // <<== CORRECCIÓN: Mostrar candado si no está desbloqueada ==>>
            let skillHTML = `
                <div class="skill-icon ${index === 0 ? 'active' : ''}">
                    ${skillDef.sprite || 'H'}
                    <div class="skill-level">${isUnlocked ? skillLevel : '🔒'}/5</div>
                </div>
                <div class="skill-info">
                    <h5>${skillDef.name}</h5>
                    <p>${isUnlocked ? skillDef.description_template.substring(0, 50)+'...' : `Se desbloquea con ${starsRequired} ⭐`}</p>
                </div>
            `;
            skillDiv.innerHTML = skillHTML;
            skillsContainer.appendChild(skillDiv);
        });
    }

    // --- Botón para abrir el modal de talentos ---
    const talentBtn = document.getElementById('openTalentTreeBtn');
    talentBtn.onclick = () => {
        modal.style.display = 'none';
        openTalentModalForHero(heroInstance);
    };
    
    // <<== INICIO DEL CÓDIGO RESTAURADO ==>>
    
    const barracksModal = document.getElementById('barracksModal');
    const assignmentMode = barracksModal.dataset.assignmentMode === 'true';
    const footer = document.querySelector('#heroDetailModal .hero-detail-footer');

    // Primero, limpiar cualquier botón de asignación anterior para evitar duplicados
    const oldAssignBtn = document.getElementById('heroAssignBtn');
    if (oldAssignBtn) oldAssignBtn.remove();
    
    // Si estamos en modo asignación y hemos encontrado el footer
    if (assignmentMode && footer) {
        const targetUnitId = barracksModal.dataset.targetUnitId;
        const targetUnit = units.find(u => u.id === targetUnitId);
        
        if (targetUnit) {
            const assignBtn = document.createElement('button');
            assignBtn.id = 'heroAssignBtn';
            assignBtn.textContent = 'Asignar a esta División';
            // Aplicamos estilos directamente para que se vea bien
            assignBtn.style.cssText = 'background-color: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em;';
            
            assignBtn.onclick = () => {
                RequestAssignGeneral(targetUnit, heroInstance.id);
                modal.style.display = 'none';
                barracksModal.style.display = 'none';
            };
            // Lo añadimos al footer
            footer.appendChild(assignBtn);
        }
    }
    // <<== FIN DEL CÓDIGO RESTAURADO ==>>
    
    modal.style.display = 'flex';
}

function openTalentModalForHero(heroInstance) {
    const modal = document.getElementById('talentTreeModal');
    const heroData = COMMANDERS[heroInstance.id];
    if (!modal || !heroData) return;

    modal.dataset.heroId = heroInstance.id;
    document.getElementById('talentHeroName').textContent = `Talentos de ${heroData.name}`;
    
    // <<== CORRECCIÓN 1: Leer 'talent_points_unspent' ==>>
    document.getElementById('talentPointsAvailable').textContent = (heroInstance.talent_points_unspent || 0);

    document.getElementById('closeTalentTreeModalBtn').onclick = () => { modal.style.display = 'none'; };
    
    document.getElementById('resetTalentsBtn').onclick = () => {
        if (confirm(`¿Reiniciar talentos por 500 de oro?`)) {
            if (PlayerDataManager.resetTalents(heroInstance.id)) {
                openTalentModalForHero(PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id));
            }
        }
    };

    const canvasContainer = document.getElementById('talentCanvasContainer');
    canvasContainer.innerHTML = `<div class="talent-tree-canvas"></div>`;
    const treeCanvas = canvasContainer.querySelector('.talent-tree-canvas');
    
    drawCompleteTalentLayout(heroInstance, treeCanvas);
    
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        canvasContainer.scrollTop = (treeCanvas.scrollHeight - canvasContainer.clientHeight) / 2;
        canvasContainer.scrollLeft = (treeCanvas.scrollWidth - canvasContainer.clientWidth) / 2;
    });
}

function openSkillDetailModal(heroInstance, skillIndex) {
    const modal = document.getElementById('skillDetailModal');
    if (!modal) return;
    const heroData = COMMANDERS[heroInstance.id];
    const skillData = heroData.skills[skillIndex];
    const skillDef = SKILL_DEFINITIONS[skillData.skill_id];
    
    document.getElementById('skillDetailIcon').textContent = skillDef.sprite || 'H';
    document.getElementById('skillDetailName').textContent = skillDef.name;
    
    let currentLevel = (Array.isArray(heroInstance.skill_levels) && heroInstance.skill_levels[skillIndex]) || 0;
    if (skillIndex === 0 && currentLevel === 0) currentLevel = 1;
    document.getElementById('skillDetailCurrentLevel').textContent = `Nivel Actual: ${currentLevel}/5`;
    
    const levelPreviewContainer = document.getElementById('skillLevelPreview');
    levelPreviewContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const level = i + 1;
        const bonusValue = skillData.scaling_override[i];
        let description = skillDef.description_template.replace('{X}', bonusValue);
        
        const row = document.createElement('div');
        row.className = 'level-row';
        if (level === currentLevel) {
            row.classList.add('current');
        }
        row.textContent = `Nivel ${level}: ${description}`;
        levelPreviewContainer.appendChild(row);
    }
    
    // --- LÓGICA DEL BOTÓN DE MEJORA ---
    const upgradeBtn = document.getElementById('upgradeSkillBtn');
    const starsRequired = skillIndex + 1;
    
    // <<== LÓGICA DE ACTIVACIÓN CORREGIDA Y DEFINITIVA ==>>
    const hasSkillPoints = (heroInstance.skill_points_unspent || 0) > 0;
    const isUnlockedByStars = heroInstance.stars >= starsRequired;
    const isNotMaxLevel = currentLevel < 5;
    
    upgradeBtn.disabled = !(hasSkillPoints && isUnlockedByStars && isNotMaxLevel);
    
    upgradeBtn.onclick = () => {
        // Llama a la función correcta que gasta el punto de habilidad
        const success = PlayerDataManager.upgradeHeroSkill(heroInstance.id, skillIndex);
        if (success) {
            modal.style.display = 'none';
            const updatedHero = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroInstance.id);
            if (updatedHero) {
                // Refresca el modal principal para que se vea el cambio de puntos
                openHeroDetailModal(updatedHero);
            }
        }
    };

    document.getElementById('closeSkillDetailBtn').onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

// =======================================================================
// === SISTEMA DE TALENTOS VISUAL v2.0 ===
// =======================================================================

function drawCompleteTalentLayout(heroInstance, canvas) {
    canvas.innerHTML = ''; 
    const heroData = COMMANDERS[heroInstance.id];
    const playerTalents = heroInstance.talents || {};
    const svgLines = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgLines.classList.add('talent-svg-lines');
    
    // --- Usamos tus coordenadas como el centro ---
    const canvasCenterX = 750;
    const canvasCenterY = 950;
    const treeOffsetAmount = 330;

    heroData.talent_trees.forEach((treeName, treeIndex) => {
        const treeInfo = TALENT_TREES[treeName];
        if (!treeInfo || !treeInfo.tree) return;
        let treeOriginX = canvasCenterX, treeOriginY = canvasCenterY;
        
        // Posicionamiento de los árboles
        if (treeIndex === 0) { // Izquierda
            treeOriginX -= treeOffsetAmount;
        } else if (treeIndex === 1) { // Arriba
            treeOriginY -= treeOffsetAmount;
        } else if (treeIndex === 2) { // Derecha
            treeOriginX += treeOffsetAmount;
        }

        treeInfo.tree.nodes.forEach(nodeData => {
            const talentDef = TALENT_DEFINITIONS[nodeData.talentId];
            if (!talentDef) return;
            const nodeDiv = document.createElement('div');
            nodeDiv.id = `node-modal-${nodeData.talentId}`;
            nodeDiv.className = `talent-node ${talentDef.maxLevels > 1 ? 'square' : 'circle'}`;
            
            // --- LA FÓRMULA SIMPLIFICADA ---
            // Simplemente sumamos las coordenadas de la plantilla al origen del árbol.
            const finalX = treeOriginX + nodeData.position.x;
            const finalY = treeOriginY + nodeData.position.y; // Ya no hay que invertir nada.
            
            nodeDiv.style.left = `${finalX}px`;
            nodeDiv.style.top = `${finalY}px`;
            nodeDiv.style.transform = 'translate(-50%, -50%)';
            nodeDiv.textContent = TALENT_SPRITES[nodeData.talentId] || '♦';

            const currentLevel = playerTalents[nodeData.talentId] || 0;
            
            // <<== LA CORRECCIÓN CLAVE ESTÁ AQUÍ ==>>
            const canAfford = (heroInstance.talent_points_unspent || 0) > 0;
            
            const prereqsMet = hasPrerequisitesForTalent(nodeData.id, treeName, playerTalents);

            const values = talentDef.values ? `[${talentDef.values.join('/')}]` : '';
            nodeDiv.title = `${talentDef.name}\n${talentDef.description.replace('{X}', values)}`;

            if (currentLevel >= talentDef.maxLevels) {
                nodeDiv.classList.add('maxed');
            } else if (prereqsMet && canAfford) {
                nodeDiv.classList.add('available');
                // <<== ¡LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ! ==>>
                nodeDiv.onclick = () => handleTalentNodeClick(heroInstance.id, nodeData.talentId);
            }

            if (currentLevel > 0) {
                const levelSpan = document.createElement('span');
                levelSpan.className = 'talent-node-level';
                levelSpan.textContent = `${currentLevel}/${talentDef.maxLevels}`;
                nodeDiv.appendChild(levelSpan);
            }
            canvas.appendChild(nodeDiv);
        });
    });

    // dibujar las líneas
    canvas.appendChild(svgLines);

    // El resto de la función (requestAnimationFrame y nexo) no cambia.
    requestAnimationFrame(() => {
        heroData.talent_trees.forEach((treeName) => {
             const treeInfo = TALENT_TREES[treeName];
             if (!treeInfo || !treeInfo.tree) return;
             treeInfo.tree.nodes.forEach(nodeData => {
                 const childDiv = document.getElementById(`node-modal-${nodeData.talentId}`);
                 if (!childDiv) return;
                 const parentIds = Array.isArray(nodeData.requires) ? nodeData.requires : [nodeData.requires];
                 parentIds.forEach(parentId => {
                    let lineStartX, lineStartY;
                    if (parentId === null) {
                        lineStartX = canvasCenterX; lineStartY = canvasCenterY;
                    } else {
                        const parentNodeData = treeInfo.tree.nodes.find(n => n.id === parentId);
                        if (!parentNodeData) return;
                        const parentDiv = document.getElementById(`node-modal-${parentNodeData.talentId}`);
                        if(!parentDiv) return;
                        lineStartX = parentDiv.offsetLeft + parentDiv.offsetWidth / 2;
                        lineStartY = parentDiv.offsetTop + parentDiv.offsetHeight / 2;
                    }
                    const isPathUnlocked = parentId === null || hasPrerequisitesForTalent(nodeData.id, treeName, playerTalents);
                    const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
                    line.setAttribute('x1', lineStartX); line.setAttribute('y1', lineStartY);
                    line.setAttribute('x2', childDiv.offsetLeft + childDiv.offsetWidth / 2); line.setAttribute('y2', childDiv.offsetTop + childDiv.offsetHeight / 2);
                    line.setAttribute('stroke', isPathUnlocked ? treeInfo.color : '#718096');
                    line.setAttribute('stroke-width', '4');
                    svgLines.appendChild(line);
                 });
             });
        });
    });

    const nexoContainer = document.createElement('div');
    nexoContainer.id = 'talentNexoContainer';
    heroData.talent_trees.forEach((treeName) => {
        const treeInfo = TALENT_TREES[treeName];
        if (!treeInfo) return;
        const nexoPie = document.createElement('div');
        nexoPie.className = 'nexo-pie';
        nexoPie.innerHTML = `<span class="nexo-icon">${treeInfo.icon}</span><span class="nexo-name">${treeName}</span>`;
        nexoPie.style.color = treeInfo.color;
        nexoContainer.appendChild(nexoPie);
    });
    canvas.appendChild(nexoContainer);
}
function createNodeElement(heroInstance, treeName, nodeData) {
    const talentDef = TALENT_DEFINITIONS[nodeData.talentId];
    if (!talentDef) return document.createElement('div');

    const playerTalents = heroInstance.talents || {};
    const nodeDiv = document.createElement('div');
    nodeDiv.id = `node-${nodeData.talentId}`;
    nodeDiv.className = `talent-node`;
    
    nodeDiv.style.left = `calc(50% + ${nodeData.position.x}px)`;
    nodeDiv.style.top = `calc(50% + ${nodeData.position.y}px)`;
    nodeDiv.style.transform = 'translate(-50%, -50%)';
    nodeDiv.textContent = TALENT_SPRITES[nodeData.talentId] || '♦';

    const currentLevel = playerTalents[nodeData.talentId] || 0;

    // <<== Y LA CORRECCIÓN CLAVE ESTÁ AQUÍ TAMBIÉN ==>>
    const canAfford = (heroInstance.talent_points_unspent || 0) > 0;

    const prereqsMet = hasPrerequisitesForTalent(treeName, nodeData.id, playerTalents);

    if (currentLevel >= talentDef.maxLevels) {
        nodeDiv.classList.add('maxed');
    } else if (prereqsMet && canAfford) {
        nodeDiv.classList.add('available');
        
        // <<== PRUEBA DE FUEGO: Reemplazamos el onclick con un alert ==>>
        nodeDiv.onclick = () => {
            // He quitado tu alert para que no moleste. La llamada es correcta.
            handleTalentNodeClick(heroInstance.id, nodeData.talentId);
        };
    }
    
    const values = talentDef.values ? `[${talentDef.values.join('/')}]` : '';
    nodeDiv.title = `${talentDef.name}\n${talentDef.description.replace('{X}', values)}`;

    if (currentLevel > 0) {
        const levelSpan = document.createElement('span');
        levelSpan.className = 'talent-node-level';
        levelSpan.textContent = `${currentLevel}/${talentDef.maxLevels}`;
        nodeDiv.appendChild(levelSpan);
    }

    return nodeDiv;
}

/**
 * Función de ayuda para determinar si se cumplen los prerrequisitos para un talento específico.
 */
function hasPrerequisitesForTalent(nodeId, treeName, playerTalents) {
    // ... (Esta función auxiliar no necesita cambios)
    const treeData = TALENT_TREES[treeName]?.tree;
    if (!treeData) return false;
    const nodeData = treeData.nodes.find(n => n.id === nodeId);
    if (!nodeData) return false;
    const parentIds = Array.isArray(nodeData.requires) ? nodeData.requires : [nodeData.requires];
    if (parentIds.length === 1 && parentIds[0] === null) return true;
    return parentIds.every(parentId => {
        const parentNodeData = treeData.nodes.find(n => n.id === parentId);
        if (!parentNodeData) return false;
        const parentTalentId = parentNodeData.talentId;
        return (playerTalents[parentTalentId] || 0) > 0;
    });
}

function handleTalentNodeClick(heroId, talentId) {
    // <<== CORRECCIÓN CLAVE: Llamar al método del objeto PlayerDataManager ==>>
    const success = PlayerDataManager.spendTalentPoint(heroId, talentId);

    if (success) {
        const updatedHeroInstance = PlayerDataManager.currentPlayer.heroes.find(h => h.id === heroId);
        if (updatedHeroInstance) {
            openTalentModalForHero(updatedHeroInstance);
        }
    }
}
// =======================================================================
/**
 * Asigna un héroe a una división y recalcula sus stats.
 * @param {object} unit - La división objetivo.
 * @param {string} commanderId - El ID del héroe a asignar.
 */
function assignHeroToUnit(unit, commanderId) {
    if (!unit || !commanderId) {
        console.error("assignHeroToUnit: Faltan datos de unidad o comandante.");
        return false;
    }
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('hero_assigned'); 
    }

    const playerActiveCommanders = gameState.activeCommanders[unit.player];
    
    // Comprobar que el héroe no esté ya en uso
    if (playerActiveCommanders.includes(commanderId)) {
        logMessage(`Error: El general ${COMMANDERS[commanderId].name} ya está comandando otra división.`);
        return false;
    }
    
    // Si la unidad ya tenía un general, hay que "liberarlo"
    if (unit.commander) {
        const oldCommanderIndex = playerActiveCommanders.indexOf(unit.commander);
        if (oldCommanderIndex > -1) {
            playerActiveCommanders.splice(oldCommanderIndex, 1);
        }
    }

    // Añadir al nuevo héroe a la lista de activos
    playerActiveCommanders.push(commanderId);
    unit.commander = commanderId;
    
    Chronicle.logEvent('commander_assigned', { unit, commander: COMMANDERS[commanderId] });
    logMessage(`¡El general ${COMMANDERS[commanderId].name} ha tomado el mando de la división "${unit.name}"!`);
    
    // Recalcular stats y actualizar UI
    if (typeof recalculateUnitStats === 'function') recalculateUnitStats(unit);
    if (typeof UIManager !== 'undefined') {
        UIManager.updateUnitStrengthDisplay(unit);
        // Si la unidad es la seleccionada, refrescamos el panel principal
        if (selectedUnit && selectedUnit.id === unit.id) {
            UIManager.showUnitContextualInfo(unit, true);
        }
    }

    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('hero_assigned'); 
    }
    
    return true; // Asignación exitosa
}

/**=======================================================================
 * Abre el modal del "Altar de los Deseos" y actualiza los datos.
 =======================================================================*/
function openDeseosModal() {
    const modal = document.getElementById('deseosModal');
    if (!modal || !PlayerDataManager.currentPlayer) return;

    // Actualizar contador de sellos
    document.getElementById('gacha-sellos-count').textContent = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
    
    // Restablecer el área de animación al estado inicial
    const revealArea = document.getElementById('gacha-reveal-area');
    revealArea.innerHTML = `
        <div class="reveal-placeholder">
            <p>Tus premios aparecerán aquí</p>
            <span class="placeholder-icon">✨</span>
        </div>`;

    // Limpiar el historial
    document.getElementById('gacha-history-list').innerHTML = 
        '<li class="history-item-placeholder">Realiza una tirada para ver tus premios.</li>';
    
    // Habilitar los botones al abrir
    document.getElementById('gacha-pull-10').disabled = false;
    document.getElementById('gacha-pull-1').disabled = false;

    modal.style.display = 'flex'; 
}

/**
 * Inicia la secuencia de animación para revelar los premios obtenidos.
 * @param {Array<object>} results - El array de objetos de resultado de GachaManager.
 */
function startGachaAnimation(results) {
    const revealArea = document.getElementById('gacha-reveal-area');
    const historyList = document.getElementById('gacha-history-list');
    if (!revealArea || !historyList) return;
    
    revealArea.innerHTML = '';
    if(historyList.querySelector('.history-item-placeholder')) {
        historyList.innerHTML = '';
    }

    document.getElementById('gacha-pull-10').disabled = true;
    document.getElementById('gacha-pull-1').disabled = true;

    const processResult = (index) => {
        if (index >= results.length) {
            document.getElementById('gacha-pull-10').disabled = false;
            document.getElementById('gacha-pull-1').disabled = false;
            return;
        }
        
        const res = results[index];
        const data = (res.type === 'fragments') ? COMMANDERS[res.heroId] : res.item;
        const rarityKey = res.rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        let iconHTML = '';
        const iconSource = data.sprite || data.icon || '❔';

        if (iconSource.includes('.png') || iconSource.includes('.jpg')) {
            // =======================================================================
            // ==                 ¡AQUÍ ESTÁ LA SOLUCIÓN FINAL!                     ==
            // == Forzamos el tamaño directamente aquí. Es imposible que falle.     ==
            // =======================================================================
            iconHTML = `<img src="${iconSource}" alt="${data.name}" style="width: 180px; height: 180px; border-radius: 10px;">`;
        } else {
            iconHTML = iconSource;
        }
        
        const card = document.createElement('div');
        card.className = 'gacha-reveal-card';

        card.innerHTML = `
            <div class="card-face card-back">${iconHTML}</div> 
            <div class="card-face card-front rarity-${rarityKey}">
                <div class="card-front-icon">${iconHTML}</div>
                <div class="card-front-text">${data.name}</div>
                <div class="card-front-amount">+${res.fragments} Fragmentos</div>
            </div>`;
            
        revealArea.innerHTML = '';
        revealArea.appendChild(card);
        
        const historyItem = document.createElement('li');
        historyItem.className = `history-item rarity-${rarityKey}`;
        if (res.isCrit) historyItem.classList.add('crit');
        
        let historyIconHTML = iconHTML;
        if (iconSource.includes('.png') || iconSource.includes('.jpg')) {
             historyIconHTML = `<img src="${iconSource}" alt="${data.name}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;">`;
        }
        
        historyItem.innerHTML = `${historyIconHTML} ${res.isCrit ? 'CRIT! ' : ''}${data.name} +${res.fragments}`;
        historyList.prepend(historyItem);
        
        const delay = results.length > 1 ? 1200 : 500;
        setTimeout(() => processResult(index + 1), delay);
    };
    
    processResult(0);

    document.getElementById('gacha-sellos-count').textContent = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
}

function handleGachaPullAttempt(type, cost) {
    const currentSeals = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
    
    if (currentSeals < cost) {
        if (confirm(`No tienes suficientes Sellos de Guerra (Tienes ${currentSeals}, necesitas ${cost}).\n\n¿Quieres ir a la Tesorería para comprar más?`)) {
            document.getElementById('deseosModal').style.display = 'none'; // Cerrar Altar
            if (typeof StoreManager !== 'undefined') StoreManager.open();
        }
        return;
    }
    
    // Si tiene fondos, ejecuta el deseo
    GachaManager.executeWish(type, cost);
}

/**
 * Escucha eventos del DOM relacionados con el modal del gacha.
 * Se debe llamar una vez al iniciar la aplicación.
 */
function setupGachaModalListeners() {
    // El botón 'openDeseosBtn' ya no existe en el menú principal,
    // se abre desde el hotspot, así que podemos quitar su listener.

    const closeBtn = document.getElementById('closeDeseosBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('deseosModal');
        if (modal) modal.style.display = 'none';
    });
    
    // Ahora los botones tienen los nuevos IDs
    const wishOnceBtn = document.getElementById('gacha-pull-1');
    const wishTenTimesBtn = document.getElementById('gacha-pull-10');

    if (wishOnceBtn) wishOnceBtn.onclick = () => handleGachaPullAttempt('common', 1);
    if (wishTenTimesBtn) wishTenTimesBtn.onclick = () => handleGachaPullAttempt('common', 10);

    /*
    if (wishOnceBtn) wishOnceBtn.addEventListener('click', () => {
        GachaManager.executeWish('common', 1);
    });
    
    if (wishTenTimesBtn) wishTenTimesBtn.addEventListener('click', () => {
        GachaManager.executeWish('common', 10);
    });
    */

    // Cambiamos `showGachaResults` por `startGachaAnimation` en la lógica de GachaManager
    // ASUMO que tienes una línea como esta en GachaManager.js, debes cambiarla:
    // Antes: showGachaResults(results);
    // Ahora: startGachaAnimation(results); 
}

/**
 * Muestra los resultados de una tirada de gacha en el modal.
 * @param {Array<object>} results - El array de objetos de resultado devuelto por GachaManager.
 */
function showGachaResults(results) {
    const resultContainer = document.getElementById('gachaResultContainer');
    const resultList = document.getElementById('gachaResultList');
    if (!resultContainer || !resultList) return;
    
    resultList.innerHTML = ''; // Limpiar resultados anteriores
    
    // Animar la aparición de cada resultado
    results.forEach((res, index) => {
        setTimeout(() => {
            const heroData = COMMANDERS[res.heroId];
            const li = document.createElement('li');
            const rarityKey = res.rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            li.classList.add(`rarity-${rarityKey}`);

            if (res.type === 'fragments') {
                const heroData = COMMANDERS[res.heroId];
                li.innerHTML = `Has obtenido <strong>${res.fragments} fragmentos</strong> de [${res.rarity}] ${heroData.sprite} ${heroData.name}`;
            } else if (res.type === 'equipment_fragments') { // 
                const itemData = res.item;
                // <<== Mostrar fragmentos
                li.innerHTML = `Has obtenido <strong>${res.fragments} fragmentos</strong> de [${res.rarity}] ${itemData.icon} ${itemData.name}`;
            }
            // Animación simple de entrada
            li.style.opacity = '0';
            li.style.transition = 'opacity 0.3s ease-in-out';
            resultList.appendChild(li);
            requestAnimationFrame(() => li.style.opacity = '1');
            
        }, index * 100); // Aparece un resultado cada 100ms
    });

    resultContainer.style.display = 'block';

    // Actualizar el contador de sellos en la UI después de haberlos gastado.
    document.getElementById('sellosCount').textContent = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
}

/**
 * (NUEVO) Abre el modal para seleccionar una pieza de equipo para un slot específico.
 * @param {object} heroInstance - La instancia del héroe que se está editando.
 * @param {string} slotType - El tipo de slot (ej: 'head', 'weapon').
 
function openEquipmentSelector(heroInstance, slotType) {
    const modal = document.getElementById('equipmentSelectorModal');
    if (!modal) return;

    const allPlayerHeroes = PlayerDataManager.currentPlayer.heroes || [];
    const playerInventory = PlayerDataManager.currentPlayer.inventory.equipment || [];

    // <<== INICIO DE LA LÓGICA DE FILTRADO ==>>

    // 1. Crear una lista de todos los IDs de instancia de equipo que ya están en uso por CUALQUIER héroe.
    const equippedItemInstanceIds = new Set();
    allPlayerHeroes.forEach(hero => {
        if (hero.equipment) {
            Object.values(hero.equipment).forEach(instanceId => {
                if (instanceId) {
                    equippedItemInstanceIds.add(instanceId);
                }
            });
        }
    });

    // 2. Obtener el ID del objeto que el HÉROE ACTUAL tiene equipado en este slot (si lo tiene).
    const currentHeroEquippedInstanceId = heroInstance.equipment[slotType];

    // 3. Filtrar el inventario para obtener solo los items disponibles para ESTE slot.
    // Un item está disponible si:
    //    a) Coincide con el tipo de slot.
    //    b) NO está en la lista de equipo en uso (equippedItemInstanceIds).
    //    c) O es el objeto que el HÉROE ACTUAL ya tiene equipado (para permitir desequiparlo o volver a verlo).
    const availableItems = playerInventory.filter(itemInstance => {
        const itemDef = EQUIPMENT_DEFINITIONS[itemInstance.item_id];
        if (!itemDef || itemDef.slot !== slotType) {
            return false; // No es del tipo de slot correcto.
        }
        
        const isEquippedByAnotherHero = equippedItemInstanceIds.has(itemInstance.instance_id);
        const isEquippedByThisHero = itemInstance.instance_id === currentHeroEquippedInstanceId;

        // Mostrar si NO está equipado por otro héroe, O si está equipado por ESTE héroe.
        return !isEquippedByAnotherHero || isEquippedByThisHero;
    });

    // <<== FIN DE LA LÓGICA DE FILTRADO ==>>

    document.getElementById('equipmentSelectorTitle').textContent = `Seleccionar ${slotType.charAt(0).toUpperCase() + slotType.slice(1)}`;
    const listContainer = document.getElementById('equipmentListContainer');
    const footer = document.getElementById('equipmentSelectorFooter');
    listContainer.innerHTML = '';
    footer.style.display = 'none';

    if (availableItems.length === 0) {
        // <<== MENSAJE MEJORADO: Ahora diferencia entre "no tienes" y "está en uso" ==>>
        const totalItemsForSlot = playerInventory.filter(i => EQUIPMENT_DEFINITIONS[i.item_id]?.slot === slotType).length;
        if (totalItemsForSlot > 0) {
            listContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Todas las piezas para este slot ya están equipadas por otros héroes.</p>';
        } else {
            listContainer.innerHTML = '<p style="text-align:center; padding: 20px;">No tienes equipo para este slot en tu inventario.</p>';
        }
    } else {
        availableItems.forEach(itemInstance => {
            // ... (El resto del código para crear el elemento visual del item se mantiene exactamente igual)
            const itemDef = EQUIPMENT_DEFINITIONS[itemInstance.item_id];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'equipment-item';
            itemDiv.dataset.instanceId = itemInstance.instance_id;
            itemDiv.dataset.itemId = itemInstance.item_id;

            // Formatear las estadísticas para mostrarlas
            const statsString = itemDef.bonuses.map(b => {
                const sign = b.value > 0 ? '+' : '';
                return `${b.stat.replace('_', ' ')} ${sign}${b.value}${b.is_percentage ? '%' : ''}`;
            }).join(', ');

            itemDiv.innerHTML = `
                <span class="item-icon">${itemDef.icon}</span>
                <div class="item-info">
                    <strong class="item-name rarity-${itemDef.rarity}">${itemDef.name}</strong>
                    <span class="item-stats">${statsString}</span>
                </div>
            `;
            
            // Lógica para la selección
            itemDiv.addEventListener('click', () => {
                document.querySelectorAll('.equipment-item').forEach(el => el.classList.remove('selected'));
                itemDiv.classList.add('selected');
                footer.style.display = 'block';
            });

            listContainer.appendChild(itemDiv);
        });
    }

    // Lógica de los botones "Equipar" y "Quitar" (se mantiene igual)
    document.getElementById('equipItemBtn').onclick = () => {
        const selectedItem = listContainer.querySelector('.equipment-item.selected');
        if (selectedItem) {
            const instanceId = selectedItem.dataset.instanceId;
            
            // <<== LÓGICA DE DESEQUIPAMIENTO AUTOMÁTICO ==>>
            // Antes de equipar, buscar si este objeto ya lo tenía otro héroe y quitárselo.
            // (Aunque el filtro previene esto, es una buena salvaguarda).
            allPlayerHeroes.forEach(hero => {
                if(hero.equipment){
                    for(const slot in hero.equipment){
                        if(hero.equipment[slot] === instanceId){
                            hero.equipment[slot] = null;
                        }
                    }
                }
            });

            heroInstance.equipment[slotType] = instanceId;
            PlayerDataManager.saveCurrentPlayer();
            
            modal.style.display = 'none';
            openHeroDetailModal(heroInstance);
        }
    };
    
    // Lógica del botón "Quitar"
    const unequipBtn = document.getElementById('unequipItemBtn');
    // Mostrar el botón solo si ya hay algo equipado en ese slot
    if (heroInstance.equipment[slotType]) {
        unequipBtn.style.display = 'inline-block';
        unequipBtn.onclick = () => {
            heroInstance.equipment[slotType] = null; // Quitar el equipo
            PlayerDataManager.saveCurrentPlayer();

            modal.style.display = 'none';
            openHeroDetailModal(heroInstance);
        };
    } else {
        unequipBtn.style.display = 'none';
    }

    document.getElementById('closeEquipmentSelectorBtn').onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}
*/
function openEquipmentSelector(heroInstance, slotType) {
    const modal = document.getElementById('equipmentSelectorModal');
    if (!modal) return;

    const allPlayerHeroes = PlayerDataManager.currentPlayer.heroes || [];
    const playerInventory = PlayerDataManager.currentPlayer.inventory.equipment || [];

    // 1. Mapeamos qué piezas están ocupadas por otros generales
    const occupiedInstances = new Map();
    allPlayerHeroes.forEach(hero => {
        if (hero.equipment) {
            Object.entries(hero.equipment).forEach(([slot, instId]) => {
                if (instId) occupiedInstances.set(instId, hero.id);
            });
        }
    });

    // 2. Filtramos el inventario para encontrar piezas compatibles con el slot
    const compatibleItems = playerInventory.filter(itemInst => {
        const itemDef = EQUIPMENT_DEFINITIONS[itemInst.item_id];
        return itemDef && itemDef.slot === slotType;
    });

    // 3. Preparamos la UI del Modal
    document.getElementById('equipmentSelectorTitle').textContent = `Asignar: ${slotType.toUpperCase()}`;
    const listContainer = document.getElementById('equipmentListContainer');
    const footer = document.getElementById('equipmentSelectorFooter');
    listContainer.innerHTML = '';
    footer.style.display = 'none';

    if (compatibleItems.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: #ff9999;">No hay equipo disponible para este espacio.</p>';
    } else {
        compatibleItems.forEach(itemInst => {
            const itemDef = EQUIPMENT_DEFINITIONS[itemInst.item_id];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'equipment-item';
            itemDiv.dataset.instanceId = itemInst.instance_id;

            // Verificamos si esta instancia específica la lleva alguien
            const currentOwnerId = occupiedInstances.get(itemInst.instance_id);
            const isOnThisHero = heroInstance.equipment[slotType] === itemInst.instance_id;
            
            let statusText = "";
            if (isOnThisHero) {
                itemDiv.classList.add('selected'); // Marcamos visualmente si es el actual
                statusText = '<small style="color: #2ecc71;">(Equipado)</small>';
            } else if (currentOwnerId) {
                const ownerName = COMMANDERS[currentOwnerId]?.name || "Otro";
                statusText = `<small style="color: #e74c3c;">(En uso por ${ownerName})</small>`;
            }

            const statsStr = itemDef.bonuses.map(b => `${b.value}${b.is_percentage ? '%' : ''} ${b.stat}`).join(', ');

            itemDiv.innerHTML = `
                <span class="item-icon">${itemDef.icon}</span>
                <div class="item-info">
                    <strong class="item-name rarity-${itemDef.rarity}">${itemDef.name} ${statusText}</strong>
                    <span class="item-stats">${statsStr}</span>
                </div>
            `;
            
            // Lógica para la selección
            itemDiv.addEventListener('click', () => {
                document.querySelectorAll('.equipment-item').forEach(el => el.classList.remove('selected'));
                itemDiv.classList.add('selected');
                footer.style.display = 'block';
            });

            listContainer.appendChild(itemDiv);
        });
    }

    // --- CONFIGURACIÓN DE LOS BOTONES DEL FOOTER ---

    // Botón Equipar/Cambiar
    document.getElementById('equipItemBtn').onclick = () => {
        const selected = listContainer.querySelector('.equipment-item.selected');
        if (selected) {
            const instId = selected.dataset.instanceId;
            
            // Si estaba en otro héroe, lo desequipamos de allí (logica de seguridad)
            allPlayerHeroes.forEach(hero => {
                if (hero.equipment) {
                    for (const s in hero.equipment) {
                        if (hero.equipment[s] === instId) hero.equipment[s] = null;
                    }
                }
            });

            heroInstance.equipment[slotType] = instId;
            PlayerDataManager.saveCurrentPlayer();
            
            modal.style.display = 'none';
            openHeroDetailModal(heroInstance);
        }
    };

    // Botón Quitar (Unequip) - Se restaura la visibilidad solo si hay algo puesto
    const unequipBtn = document.getElementById('unequipItemBtn');
    // Mostrar el botón solo si ya hay algo equipado en ese slot
    if (heroInstance.equipment[slotType]) {
        unequipBtn.style.display = 'inline-block';
        unequipBtn.onclick = () => {
            heroInstance.equipment[slotType] = null; // Quitar el equipo
            PlayerDataManager.saveCurrentPlayer();

            modal.style.display = 'none';
            openHeroDetailModal(heroInstance);
        };
    } else {
        unequipBtn.style.display = 'none';
    }

    document.getElementById('closeEquipmentSelectorBtn').onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

//FORJA//

let selectedBlueprintId = null; // Variable global para el modal de forja

/**
 * Abre el modal de la Forja y muestra los planos disponibles.
 */
function openForgeModal() {
    const modal = document.getElementById('forgeModal');
    if (!modal) return;

    populateBlueprintList();
    
    // Mostrar placeholder y ocultar detalles al abrir
    document.getElementById('blueprintDetailPlaceholder').style.display = 'block';
    document.getElementById('blueprintDetailContent').style.display = 'none';
    
    modal.style.display = 'flex';
}

/**
 * Rellena la lista de planos en la Forja basándose en los fragmentos del jugador.
 */
function populateBlueprintList() {
    const listContainer = document.getElementById('blueprintList');
    listContainer.innerHTML = '';
    
    const fragmentInventory = PlayerDataManager.currentPlayer.inventory.equipment_fragments || {};

    if (Object.keys(fragmentInventory).length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding: 20px;">No tienes fragmentos de equipo.</p>';
        return;
    }

    // Ordenar para mostrar los que se pueden forjar primero
    const sortedItemIds = Object.keys(fragmentInventory).sort((a, b) => {
        const itemA = EQUIPMENT_DEFINITIONS[a];
        const itemB = EQUIPMENT_DEFINITIONS[b];
        const canForgeA = fragmentInventory[a] >= itemA.fragments_needed;
        const canForgeB = fragmentInventory[b] >= itemB.fragments_needed;
        return canForgeB - canForgeA; // Pone los `true` (1) antes que los `false` (0)
    });

    sortedItemIds.forEach(itemId => {
        const itemDef = EQUIPMENT_DEFINITIONS[itemId];
        const fragmentsHeld = fragmentInventory[itemId];
        const fragmentsNeeded = itemDef.fragments_needed;
        
        const canForge = fragmentsHeld >= fragmentsNeeded;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'blueprint-item';
        if (canForge) itemDiv.classList.add('can-forge');
        
        itemDiv.innerHTML = `
            <span class="item-icon">${itemDef.icon}</span>
            <div class="item-info">
                <strong class="item-name rarity-${itemDef.rarity}">${itemDef.name}</strong>
                <span class="item-progress">Fragmentos: ${fragmentsHeld} / ${fragmentsNeeded}</span>
            </div>
        `;
        
        itemDiv.addEventListener('click', () => {
            selectedBlueprintId = itemId;
            document.querySelectorAll('.blueprint-item').forEach(el => el.classList.remove('selected'));
            itemDiv.classList.add('selected');
            showBlueprintDetail(itemId);
        });
        
        listContainer.appendChild(itemDiv);
    });
}

/**
 * nuestra los detalles de un plano seleccionado en la columna derecha.
 * @param {string} itemId - El ID del objeto a mostrar.
 */
function showBlueprintDetail(itemId) {
    document.getElementById('blueprintDetailPlaceholder').style.display = 'none';
    document.getElementById('blueprintDetailContent').style.display = 'block';

    const itemDef = EQUIPMENT_DEFINITIONS[itemId];
    const fragmentsHeld = PlayerDataManager.currentPlayer.inventory.equipment_fragments[itemId] || 0;
    const fragmentsNeeded = itemDef.fragments_needed;

    document.getElementById('blueprintItemIcon').textContent = itemDef.icon;
    document.getElementById('blueprintItemName').textContent = itemDef.name;

    const statsString = itemDef.bonuses.map(b => {
        const sign = b.value > 0 ? '+' : '';
        return `${b.stat.replace(/_/g, ' ')} ${sign}${b.value}${b.is_percentage ? '%' : ''}`;
    }).join(', ');
    document.getElementById('blueprintItemStats').textContent = statsString;

    const progressPercent = Math.min(100, (fragmentsHeld / fragmentsNeeded) * 100);
    document.getElementById('blueprintFragmentBar').style.width = `${progressPercent}%`;
    document.getElementById('blueprintFragmentText').textContent = `${fragmentsHeld} / ${fragmentsNeeded}`;
    
    const forgeBtn = document.getElementById('forgeItemBtn');
    forgeBtn.disabled = fragmentsHeld < fragmentsNeeded;
}

/**
 *  Lógica para forjar un objeto.
 */
function handleForgeItem() {
    if (!selectedBlueprintId) return;

    const itemId = selectedBlueprintId;
    const itemDef = EQUIPMENT_DEFINITIONS[itemId];
    const playerInventory = PlayerDataManager.currentPlayer.inventory;
    const fragmentsHeld = playerInventory.equipment_fragments[itemId] || 0;
    const fragmentsNeeded = itemDef.fragments_needed;

    if (fragmentsHeld >= fragmentsNeeded) {
        // 1. Restar los fragmentos
        playerInventory.equipment_fragments[itemId] -= fragmentsNeeded;
        // Si los fragmentos llegan a 0, se elimina la entrada
        if (playerInventory.equipment_fragments[itemId] <= 0) {
            delete playerInventory.equipment_fragments[itemId];
        }

        // 2. Crear y añadir la nueva instancia de equipo al inventario
        const newItemInstance = {
            instance_id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            item_id: itemId
        };
        if (!playerInventory.equipment) playerInventory.equipment = [];
        playerInventory.equipment.push(newItemInstance);

        // 3. Guardar y actualizar UI
        PlayerDataManager.saveCurrentPlayer();
        logMessage(`¡Has forjado [${itemDef.rarity}] ${itemDef.name}!`, "success");

        // Refrescar las dos vistas del modal de la forja
        populateBlueprintList();
        showBlueprintDetail(itemId);
    }
}

// Barra para configurar jugadores al iniciar escaramuza
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('num-players-slider');
    const display = document.getElementById('num-players-display');
    const hiddenSelect = document.getElementById('new-num-players');

    if (slider && display && hiddenSelect) {
        // Función para actualizar todo
        const updatePlayerCount = (value) => {
            display.textContent = value;

            // Limpiar y rellenar el select oculto
            hiddenSelect.innerHTML = '';
            for (let i = 2; i <= 8; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                if (i == value) {
                    option.selected = true;
                }
                hiddenSelect.appendChild(option);
            }
        };

        // Actualizar al mover el slider
        slider.addEventListener('input', () => {
            updatePlayerCount(slider.value);
        });

        // Inicializar con el valor por defecto
        updatePlayerCount(slider.value);
    }
});

//=======================================================================
//== FUNCIONES DE CONFIGURACIÓN DE PARTIDA (SETUP FLOW)                 ==
//=======================================================================

/**
 * Renderiza la interfaz de selección de jugadores/facciones en setupScreen2.
 * @param {number} numPlayers - Número de jugadores a renderizar (obtenido de setupScreen).
 */
/**
 * (NUEVA FUNCIÓN) Actualiza la tarjeta de un jugador para mostrar la información de la facción seleccionada.
 * @param {number} playerIndex - El índice del jugador (1-8) cuya tarjeta se va a actualizar.
 */
function updateFactionDisplay(playerIndex) {
    const playerCard = document.getElementById(`player-card-${playerIndex}`);
    const civSelect = document.getElementById(`player${playerIndex}Civ`);
    if (!playerCard || !civSelect) return;

    const selectedCivKey = civSelect.value;
    const civData = CIVILIZATIONS[selectedCivKey];
    
    const factionImageEl = playerCard.querySelector('.faction-image');
    const factionDescriptionEl = playerCard.querySelector('.faction-description');

    if (civData && factionImageEl && factionDescriptionEl) {
        // Actualizar la imagen de fondo con una transición de fundido
        factionImageEl.style.opacity = 0;
        setTimeout(() => {
            factionImageEl.style.backgroundImage = `url('${civData.factionImage}')`;
            factionImageEl.style.opacity = 1;
        }, 200); // 200ms para la animación

        // Actualizar la descripción
        factionDescriptionEl.textContent = civData.description;
    }
}

/**
 * Renderiza la interfaz de selección de jugadores/facciones en setupScreen2.
 * @param {number} numPlayers - Número de jugadores a renderizar (obtenido de setupScreen).
 */
function renderPlayerSelectionSetup(numPlayers) {
    const playerGrid = document.getElementById('player-setup-grid');
    if (!playerGrid) return;
    playerGrid.innerHTML = '';

    const playerTypeOptions = {
        'human': 'Humano',
        'ai_hard': 'IA',
        'closed': 'Cerrado'
    };

    // Pre-generar el HTML de las opciones de civilización
    const civOptions = Object.keys(CIVILIZATIONS).map(key => 
        `<option value="${key}">${CIVILIZATIONS[key].name}</option>`
    ).join('');

    // Array con un orden de civilizaciones por defecto para cada jugador
    const defaultCivs = ["Roma", "Iberia", "Grecia", "Egipto", "Cartago", "Galia", "Japón", "Vikingos"];

    for (let i = 1; i <= 8; i++) { // Siempre crear 8 slots
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.id = `player-card-${i}`; // ID único para cada tarjeta

        // LÓGICA DE VISIBILIDAD Y VALORES PREDEFINIDOS MEJORADA
        let defaultType;
        if (i === 1) {
            defaultType = 'human';
        } else if (i <= numPlayers) {
            defaultType = 'ai_hard'; // El resto de jugadores activos son IA por defecto
        } else {
            defaultType = 'closed'; // Los slots sobrantes están cerrados
        }

        // Si el slot está más allá del número de jugadores, se oculta
        if (i > numPlayers) {
            playerCard.style.display = 'none';
        }

        let typeSelectHTML = `<select id="player${i}TypeSelect">`;
        for (const [key, name] of Object.entries(playerTypeOptions)) {
            const isSelected = key === defaultType ? 'selected' : '';
            typeSelectHTML += `<option value="${key}" ${isSelected}>${name}</option>`;
        }
        typeSelectHTML += '</select>';

        const isInitiallyDisabled = defaultType === 'closed' ? 'disabled' : '';

        // --- ESTRUCTURA HTML PARA LA TARJETA ---
        playerCard.innerHTML = `
            <div class="faction-image"></div>
            <div class="faction-overlay">
                <div class="player-header">
                    <span class="player-icon player-color-${i}">P${i}</span>
                    ${typeSelectHTML}
                </div>
                <div class="faction-details">
                    <select id="player${i}Civ" ${isInitiallyDisabled}></select>
                    <p class="faction-description"></p>
                </div>
            </div>
        `;
        playerGrid.appendChild(playerCard);

        const typeSelect = document.getElementById(`player${i}TypeSelect`);
        const civSelect = document.getElementById(`player${i}Civ`);
        
        if (typeSelect && civSelect) {
            // Rellenar opciones y seleccionar por defecto
            civSelect.innerHTML = civOptions;
            civSelect.value = defaultCivs[i - 1] || 'ninguna';

            // Listener para el tipo de jugador (Humano/IA/Cerrado)
            typeSelect.addEventListener('change', (event) => {
                civSelect.disabled = event.target.value === 'closed';
            });

            // Listener para el cambio de civilización
            civSelect.addEventListener('change', () => {
                updateFactionDisplay(i); // Llamar a la función de actualización
            });

            // Actualización inicial al crear la tarjeta
            updateFactionDisplay(i);
        }
    }
}

// Funciones de la Banca //

// EN modalLogic.js (puedes añadirlas al final del archivo)

/**
 * Abre el modal de La Banca y configura sus listeners y estado inicial.
 */
function openBankModal() {
    if (!domElements.bankModal) return;

    // Configurar listeners de las pestañas (similar a la Wiki)
    const tabs = domElements.bankModal.querySelectorAll('.bank-tab-btn')
    const pages = domElements.bankModal.querySelectorAll('.wiki-page');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`bank-tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Forzar clic en la primera pestaña por defecto
    domElements.bankModal.querySelector('.bank-tab-btn[data-tab="resources"]').click();
    
    updateBankTradeUI(); // Actualizar la UI con los datos del jugador
    domElements.bankModal.style.display = 'flex';
}

/**
 * Actualiza la interfaz del mercado de recursos con los datos actuales del jugador.
 */
function updateBankTradeUI() {
    const playerRes = gameState.playerResources[gameState.currentPlayer];
    if (!playerRes || !domElements.bankOfferResourceSelect) return;

    const offerResource = domElements.bankOfferResourceSelect.value;
    const parsedOfferAmount = parseInt(domElements.bankOfferAmountInput.value, 10);
    const offerAmount = Number.isFinite(parsedOfferAmount) ? parsedOfferAmount : 0;
    
    // Muestra cuánto tiene el jugador del recurso que está ofreciendo
    domElements.bankPlayerResourceAmount.textContent = playerRes[offerResource] || 0;

    // Calcula y muestra cuánto recibirá
    const requestAmount = Math.floor(offerAmount / 4);
    domElements.bankRequestAmountInput.value = requestAmount;

    // Valida si el jugador puede permitirse el intercambio
    domElements.bankConfirmTradeBtn.disabled = (playerRes[offerResource] || 0) < offerAmount || offerAmount < 4 || requestAmount < 1;
}

/**
 * Maneja la lógica de la UI cuando el jugador confirma un intercambio con La Banca.
 */
function handleBankTrade() {
    const offerResource = domElements.bankOfferResourceSelect.value;
    const parsedOfferAmount = parseInt(domElements.bankOfferAmountInput.value, 10);
    const offerAmount = Number.isFinite(parsedOfferAmount) ? parsedOfferAmount : 0;
    const requestResource = domElements.bankRequestResourceSelect.value;
    const requestAmount = Math.floor(offerAmount / 4);

    const playerRes = gameState.playerResources[gameState.currentPlayer];

    // Doble validación
    if (!playerRes || (playerRes[offerResource] || 0) < offerAmount || offerAmount < 4 || requestAmount < 1) {
        logMessage("Intercambio inválido o fondos insuficientes.", "error");
        return;
    }

    const payload = {
        playerId: gameState.currentPlayer,
        offerResource,
        offerAmount,
        requestResource,
        requestAmount
    };
    
    requestTradeWithBank(payload); // Llama a la función de red/local

    // Opcional: Cerrar el modal después del intercambio
    // domElements.bankModal.style.display = 'none'; 
}

/**
 * [Función Pura de Ejecución] Modifica el estado del juego para un intercambio de recursos.
 */
function _executeTradeWithBank(payload) {
    const { playerId, offerResource, offerAmount, requestResource, requestAmount } = payload;
    const playerRes = gameState.playerResources[playerId];
    
    // --- SOLUCIÓN AL ERROR: Definir playerKey para las estadísticas ---
    const playerKey = `player${playerId}`;
    // -----------------------------------------------------------------

    const safeOfferAmount = Number.isFinite(offerAmount) ? Math.floor(offerAmount) : 0;
    const computedRequestAmount = Math.floor(safeOfferAmount / 4);

    if (!playerRes || safeOfferAmount < 4 || computedRequestAmount < 1 || (playerRes[offerResource] || 0) < safeOfferAmount) {
        return false; // Falló la validación final en el Host
    }

    // 1. Ejecutar el intercambio lógico
    playerRes[offerResource] -= safeOfferAmount;
    playerRes[requestResource] = (playerRes[requestResource] || 0) + computedRequestAmount;

    // 2. Incrementar la estadística de Comercio para los Puntos de Victoria (PV)
    // Usamos el "Escudo" de seguridad por si el objeto no existe
    if (!gameState.playerStats) gameState.playerStats = { sealTrades: {} };
    if (!gameState.playerStats.sealTrades) gameState.playerStats.sealTrades = {};
    
    gameState.playerStats.sealTrades[playerKey] = (gameState.playerStats.sealTrades[playerKey] || 0) + 1;

    logMessage(`Intercambio completado: ${safeOfferAmount} de ${offerResource} por ${computedRequestAmount} de ${requestResource}.`);
    
    // 3. Actualizar la interfaz
    if (UIManager) {
        UIManager.updateAllUIDisplays();
        // Si el modal de la banca sigue abierto, refrescar sus datos
        if (domElements.bankModal && domElements.bankModal.style.display === 'flex') {
            updateBankTradeUI();
        }
    }

    // Otorgar puntos de investigación por transacción con la banca
    if (typeof ResearchRewardsManager !== 'undefined' && ResearchRewardsManager.onBankTransaction) {
        ResearchRewardsManager.onBankTransaction(playerId);
    }
    
    return true;
}

/**
 * [Punto de Entrada de Red] Crea la acción para el intercambio con La Banca.
 */
function requestTradeWithBank(payload) {
    const action = { 
        type: 'tradeWithBank', 
        actionId: `banktrade_${payload.playerId}_${Date.now()}`,
        payload: payload
    };

    if (isNetworkGame()) {
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action });
        }
    } else {
        _executeTradeWithBank(payload);
    }
}

/**
 * Rellena la pestaña de logros en la Wiki consultando Supabase.
 */
async function populateWikiAchievementsTab() {
    const listContainer = document.getElementById('wikiAchievementsList');
    if (!listContainer || !PlayerDataManager.currentPlayer) return;

    // 1. Traer el progreso del jugador desde Supabase
    const { data: userProgress, error } = await supabaseClient
        .from('user_achievements')
        .select('*')
        .eq('player_id', PlayerDataManager.currentPlayer.auth_id);

    if (error) {
        listContainer.innerHTML = '<p>Error conectando con el servicio de logros.</p>';
        return;
    }

    // 2. Limpiar y generar HTML basado en REWARDS_CONFIG
    listContainer.innerHTML = '';
    
    // Iteramos sobre todos los logros que definimos en la configuración
    for (const key in REWARDS_CONFIG.ACHIEVEMENTS) {
        const achievement = REWARDS_CONFIG.ACHIEVEMENTS[key];
        // Buscamos si el usuario tiene progreso guardado para este logro
        const progress = userProgress.find(p => p.achievement_id === key) || { current_progress: 0, is_completed: false };
        
        const percent = Math.min(100, (progress.current_progress / achievement.goal) * 100);

        listContainer.innerHTML += `
            <div class="achievement-item" style="background: rgba(0,0,0,0.3); padding: 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid ${progress.is_completed ? '#f1c40f' : '#7f8c8d'};">
                <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                    <strong>${achievement.title}</strong>
                    <span style="color: ${progress.is_completed ? '#f1c40f' : '#bdc3c7'};">
                        ${progress.current_progress} / ${achievement.goal} ${progress.is_completed ? '✅' : ''}
                    </span>
                </div>
                <p style="font-size: 0.8em; margin: 4px 0; color: #bdc3c7;">${achievement.desc}</p>
                <div class="xp-bar-container" style="height: 6px; background: #1a2a33; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${percent}%; height: 100%; background: ${progress.is_completed ? '#f1c40f' : '#3498db'}; transition: width 0.5s;"></div>
                </div>
                <div style="font-size: 0.7em; margin-top: 5px; color: #2ecc71;">Premio: ${achievement.rewardQty} ${achievement.rewardType}</div>
            </div>
        `;
    }
}

// Landing Page
function openLandingPage(isFromProfile = false) {
    const modal = document.getElementById('landingPageModal');
    const closeBtn = document.getElementById('closeLandingBtn');
    const enterBtn = document.getElementById('landingEnterGameBtn');
    
    if (!modal) return;

    if (isFromProfile) {
        // Modo "Información": Muestra la X para cerrar y volver al perfil
        closeBtn.style.display = 'block';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        // El botón grande también cierra el modal
        enterBtn.textContent = "VOLVER AL JUEGO";
        enterBtn.onclick = () => {
            modal.style.display = 'none';
        };
    } else {
        // Modo "Bienvenida": Sin X, el botón lleva al Login
        closeBtn.style.display = 'none';
        
        enterBtn.textContent = "ENTRAR AL JUEGO";
        enterBtn.onclick = () => {
            modal.style.display = 'none';
            showLoginScreen(); // Llama a tu función existente de login
        };
    }

    modal.style.display = 'flex';
}

async function openProfileModal() {
    const player = PlayerDataManager.currentPlayer;
    if (!player) return;

     //Sincronización
     await PlayerDataManager.saveCurrentPlayer();

    //Alianza
     const alNameLabel = document.getElementById('allianceName');
    if(alNameLabel) {
        alNameLabel.style.cursor = "pointer";
        alNameLabel.style.textDecoration = "underline";
        // Añade listener (usando replace para evitar duplicados es lo más limpio, 
        // o configuralo en setup global)
        alNameLabel.onclick = () => {
             // Cerramos perfil para enfocarnos en la alianza
            document.getElementById('profileModal').style.display = 'none';
            AllianceManager.open();
        };
    }

    // 1. Mostrar el modal inmediatamente
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'flex';

    // 2. IDENTIDAD (Prioridad máxima: nombre, civ, alianza y nivel)
    // Usamos el operador || para que si el dato no existe, no rompa el código
    if (document.getElementById('profileUsername')) 
        document.getElementById('profileUsername').textContent = player.username || "Comandante";
    
    if (document.getElementById('statTopCiv')) 
        document.getElementById('statTopCiv').textContent = player.favorite_civ || "Iberia";
    
    // LÓGICA DE ALIANZA:
    const allianceLabel = document.getElementById('allianceName');
    if (allianceLabel) {
        if (player.alliance_id) {
            // Caso A: Tenemos ID, pero no el nombre guardado -> Lo buscamos
            if (!player.alliance_name) {
                allianceLabel.textContent = "Cargando..."; // Feedback visual inmediato
                
                // Petición silenciosa a Supabase
                supabaseClient
                    .from('alliances')
                    .select('name, tag')
                    .eq('id', player.alliance_id)
                    .single()
                    .then(({ data, error }) => {
                        if (data) {
                            player.alliance_name = `[${data.tag}] ${data.name}`;
                            allianceLabel.textContent = player.alliance_name;
                            // Guardamos para que la próxima vez sea instantáneo
                            PlayerDataManager.saveCurrentPlayer(); 
                        } else {
                            allianceLabel.textContent = "Error de Datos";
                        }
                    });
            } else {
                // Caso B: Ya lo tenemos guardado -> Lo mostramos directo
                allianceLabel.textContent = player.alliance_name;
            }
        } else {
            // Caso C: No hay ID -> Realmente no tiene alianza
            allianceLabel.textContent = "Sin Alianza";
        }
    }

    
    if (document.getElementById('profileLevelNum')) 
        document.getElementById('profileLevelNum').textContent = player.level || 1;

    if (document.getElementById('profileAvatar')) 
        document.getElementById('profileAvatar').textContent = player.avatar_url || '🎖️';


    // 3. BARRA DE EXPERIENCIA (Blindada)
    const xpBar = document.getElementById('profileXpBar');
    if (xpBar) {
        const level = player.level || 1;
        const xpToNext = Math.floor(1000 * Math.pow(1.2, level - 1));
        const currentXp = player.xp || 0;
        const percent = (currentXp / xpToNext) * 100;
        xpBar.style.width = Math.min(100, percent) + '%';
        // Opcional: si quieres ver el % en texto busca un elemento o añade uno
        const xpText = document.getElementById('xpPercentText');
        if (xpText) xpText.textContent = Math.floor(percent) + "%";
    }

    // 4. LOS CONTADORES (Blindados con || 0 para que no fallen)
    // 1. Victorias Totales
    const winsEl = document.getElementById('statWins');
    if (winsEl) winsEl.textContent = (player.total_wins || 0).toLocaleString();

    // 2. Puntos de Muerte (Regimientos enemigos)
    const killsEl = document.getElementById('statKills');
    if (killsEl) killsEl.textContent = (player.total_kills || 0).toLocaleString();

    // 3. Puntos de Tropas (Regimientos creados)
    const troopsEl = document.getElementById('statTroops');
    if (troopsEl) troopsEl.textContent = (player.total_troops_created || 0).toLocaleString();

    // 4. Poder de Comercio (Intercambios)
    const tradesEl = document.getElementById('statTrades');
    if (tradesEl) tradesEl.textContent = (player.total_trades || 0).toLocaleString();

    // 5. Puntos de Infraestructura (Ciudades/Fortalezas)
    const citiesEl = document.getElementById('statCities');
    if (citiesEl) citiesEl.textContent = (player.total_cities || 0).toLocaleString();


    // 5. BOTÓN DE RECOMPENSAS (Estado Abierto/Cerrado)
    const claimBtn = document.getElementById('claimDailyBtn');
    if (claimBtn) {
        const lastClaimStr = player.last_daily_claim || new Date(0).toISOString();
        const lastClaim = new Date(lastClaimStr);
        const isClaimed = lastClaim.toDateString() === new Date().toDateString();
        
        if (isClaimed) {
            claimBtn.textContent = "🎁 BENEFICIO RECLAMADO (ABIERTO)";
            claimBtn.style.background = "#4a5568";
            claimBtn.disabled = true;
        } else {
            claimBtn.textContent = "🎁 RECLAMAR BENEFICIO (CERRADO)";
            claimBtn.style.background = "#f1c40f";
            claimBtn.disabled = false;
            claimBtn.onclick = () => PlayerDataManager.claimDailyReward();
        }
        claimBtn.style.display = 'block';
    }

    // 6. CÓDICE (Carga diferida)
    const codexContainer = document.getElementById('battleCodexList');
    if (codexContainer) {
        codexContainer.innerHTML = '<p style="text-align:center; font-size:10px;">Consultando crónicas...</p>';
        loadCodexData(player.auth_id);
    }
}

// Función Códice corregida
async function loadCodexData(authId) {
    const { data: matches, error } = await supabaseClient
        .from('match_history')
        .select('outcome, turns_played, xp_gained, created_at')
        .eq('player_id', authId)
        .order('created_at', { ascending: false })
        .limit(5);

    const container = document.getElementById('battleCodexList');
    if (error || !matches || matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; font-size:10px; opacity:0.5;">No hay gestas registradas.</p>';
        return;
    }

    container.innerHTML = matches.map(m => `
        <div style="font-size: 11px; border-bottom: 1px solid #5d4037; padding: 5px 0; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: ${m.outcome === 'victoria' ? '#4caf50' : '#ff5252'}; font-weight: bold;">${m.outcome.toUpperCase()}</span>
            <span style="color: #bcaaa4;">Turnos: ${m.turns_played} | XP: +${m.xp_gained}</span>
            <span style="color: #8d6e63;">${new Date(m.created_at).toLocaleDateString()}</span>
        </div>`).join('');
}

/**
 * Edición de Nombre
 */
async function editName() {
    const newName = prompt("Introduce tu nuevo nombre de Comandante:");
    if (newName && newName.length >= 3) {
        PlayerDataManager.currentPlayer.username = newName;
        document.getElementById('profileUsername').textContent = newName;
        await PlayerDataManager.saveCurrentPlayer(); // Sincroniza con Supabase
        logMessage("Nombre de Comandante actualizado.");
    }
}

/**
 * Edición de Emblema (Avatar)
 */
async function changeAvatar() {
    const avatars = ['🎖️', '⚔️', '🦁', '🦅', '🏹', '🏰', '🔱', '🐺'];
    const choice = prompt("Elige tu nuevo emblema militar:\n" + avatars.join(' '));
    if (avatars.includes(choice)) {
        PlayerDataManager.currentPlayer.avatar_url = choice;
        document.getElementById('profileAvatar').textContent = choice;
        await PlayerDataManager.saveCurrentPlayer();
        logMessage("Emblema actualizado.");
    }
}

/**
 * Abre el Códice completo. 
 * Blindado para evitar el error 'innerHTML of null'.
 */
async function openFullCodex() {
    const player = PlayerDataManager.currentPlayer;
    if (!player) return;

    // Usar el nuevo GameHistoryManager
    if (typeof GameHistoryManager !== 'undefined') {
        await GameHistoryManager.open();
        return;
    }

    // Usar ChronicleIntegration como fallback
    if (typeof ChronicleIntegration !== 'undefined') {
        ChronicleIntegration.showReplaysInCodexModal();
        return;
    }

    // Fallback al sistema antiguo
    const modal = document.getElementById('fullCodexModal');
    const listContainer = document.getElementById('fullCodexList');

    // VERIFICACIÓN DE SEGURIDAD
    if (!modal || !listContainer) {
        console.error("Error: No se encontró 'fullCodexModal' o 'fullCodexList' en el HTML. Asegúrate de haber copiado el bloque del modal.");
        alert("El Códice se está restaurando, inténtalo en un momento.");
        return;
    }

    // Mostrar modal y mensaje de carga
    modal.style.display = 'flex';
    listContainer.innerHTML = '<p style="text-align:center; color:#ffd700; font-size:12px;">Abriendo archivos del reino...</p>';

    try {
        // Consulta a Supabase (Igual que antes)
        const { data: matchesRaw, error } = await supabaseClient
            .from('match_history')
            .select('*')
            .eq('player_id', player.auth_id)
            .order('created_at', { ascending: false })
            .limit(50); // Traemos un poco más por si filtramos

        if (error) throw error;

        if (!matchesRaw || matchesRaw.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:12px;">No hay gestas registradas aún.</p>';
            return;
        }

        // --- FILTRO DE DUPLICADOS (NUEVO) ---
        // Filtramos partidas que sean idénticas en resultado y ocurrieran casi al mismo tiempo (error de triple clic)
        const matches = matchesRaw.filter((match, index, self) => {
            if (index === 0) return true; // El primero siempre pasa
            
            const prevMatch = self[index - 1];
            
            // Calculamos diferencia de tiempo
            const timeDiff = new Date(prevMatch.created_at) - new Date(match.created_at);
            
            // Si pasó menos de 5 segundos y el resultado es el mismo, es un duplicado del bug
            const isDuplicate = (timeDiff < 5000) && (prevMatch.outcome === match.outcome) && (prevMatch.turns_played === match.turns_played);
            
            return !isDuplicate; // Solo devolvemos los que NO son duplicados
        });
        // ------------------------------------

        // Dibujar la lista de batallas (Usando la lista filtrada 'matches')
        listContainer.innerHTML = matches.map((m, index) => {
            // ... (Tu código de HTML de la tarjeta se mantiene igual) ...
            const color = m.outcome === 'victoria' ? '#4caf50' : '#ff5252';
            return `
            <div onclick="showMatchDetails(${index})" style="background: rgba(255,255,255,0.05); margin-bottom: 8px; padding: 10px; border-radius: 6px; border-left: 4px solid ${color}; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <strong>Día ${new Date(m.created_at).toLocaleDateString()} ${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                    <span style="color: ${color}; font-weight: bold;">${m.outcome.toUpperCase()}</span>
                </div>
                <div style="font-size: 10px; color: #bcaaa4; margin-top: 3px;">${m.kills} bajas | ${m.turns_played} turnos. (Toca para leer)</div>
                <div id="log-detail-${index}" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid #444; color: #fdf5e6; font-size: 11px; line-height: 1.4;">
                    ${m.match_log ? m.match_log.join('<br>') : 'No hay crónicas disponibles.'}
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error("Error al cargar crónicas:", err);
        listContainer.innerHTML = '<p style="color:red;">Error de conexión con las crónicas.</p>';
    }
}

/**
 * Muestra/Oculta el texto de la crónica de una batalla específica.
 */
function showMatchDetails(index) {
    const detailEl = document.getElementById(`log-detail-${index}`);
    if (detailEl) {
        const isVisible = detailEl.style.display === 'block';
        // Cerramos todos primero para efecto acordeón
        document.querySelectorAll('[id^="log-detail-"]').forEach(el => el.style.display = 'none');
        detailEl.style.display = isVisible ? 'none' : 'block';
    }
}

// --- SISTEMA DE CONFIGURACIÓN ---
const DEFAULT_SETTINGS = {
    music: true,
    sfx: true,
    goldConfirm: true,
    hints: true
};

/**
 * Carga las configuraciones guardadas (localStorage o perfil Supabase)
 * y las aplica inmediatamente al AudioManager
 * Se puede llamar en cualquier momento (al iniciar, abrir modal, etc.)
 */
function loadAndApplySettings() {
    try {
        let settings = null;

        // 1. Intentar cargar del perfil Supabase primero (más actualizado)
        if (PlayerDataManager && PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.settings) {
            settings = PlayerDataManager.currentPlayer.settings;
            console.log('[Settings] Configuración cargada del perfil Supabase:', settings);
        }
        // 2. Si no hay en Supabase, cargar de localStorage
        else if (localStorage.getItem('iberion_settings')) {
            settings = JSON.parse(localStorage.getItem('iberion_settings'));
            console.log('[Settings] Configuración cargada de localStorage:', settings);
        }
        // 3. Si no hay en ningún lado, usar defaults
        else {
            settings = DEFAULT_SETTINGS;
            console.log('[Settings] Usando configuración por defecto:', settings);
        }

        // Validar que settings sea un objeto válido
        if (!settings || typeof settings !== 'object') {
            settings = DEFAULT_SETTINGS;
        }

        // APLICAR INMEDIATAMENTE AL AUDIO MANAGER
        if (typeof AudioManager !== 'undefined') {
            AudioManager.setVolume(
                settings.music ? 0.3 : 0,
                settings.sfx ? 0.7 : 0
            );
            console.log('[Settings] Volúmenes aplicados: Música=' + (settings.music ? '0.3' : '0') + ', SFX=' + (settings.sfx ? '0.7' : '0'));
        }

        return settings;
    } catch (err) {
        console.error('[Settings] Error al cargar configuraciones:', err);
        // Fallback seguro
        if (typeof AudioManager !== 'undefined') {
            AudioManager.setVolume(0.3, 0.7);
        }
        return DEFAULT_SETTINGS;
    }
}

function openSettingsModal() {
    if (!domElements.settingsModal) return;

    // CARGAR Y APLICAR CONFIGURACIÓN USANDO LA NUEVA FUNCIÓN
    const currentSettings = loadAndApplySettings();

    // Reflejar en la UI
    domElements.settingMusicToggle.checked = currentSettings.music;
    domElements.settingSfxToggle.checked = currentSettings.sfx;
    domElements.settingGoldConfirm.checked = currentSettings.goldConfirm;
    domElements.settingHints.checked = currentSettings.hints;

    // AGREGAR EVENT LISTENERS A LOS TOGGLES PARA APLICAR CAMBIOS INMEDIATAMENTE
    // Si ya existen listeners, no agreguemos duplicados
    if (!domElements.settingMusicToggle._hasListener) {
        domElements.settingMusicToggle.addEventListener('change', applySettingsInRealTime);
        domElements.settingMusicToggle._hasListener = true;
    }
    if (!domElements.settingSfxToggle._hasListener) {
        domElements.settingSfxToggle.addEventListener('change', applySettingsInRealTime);
        domElements.settingSfxToggle._hasListener = true;
    }
    if (!domElements.settingGoldConfirm._hasListener) {
        domElements.settingGoldConfirm.addEventListener('change', applySettingsInRealTime);
        domElements.settingGoldConfirm._hasListener = true;
    }
    if (!domElements.settingHints._hasListener) {
        domElements.settingHints.addEventListener('change', applySettingsInRealTime);
        domElements.settingHints._hasListener = true;
    }

    domElements.settingsModal.style.display = 'flex';
}

/**
 * Se llama en tiempo real cuando el usuario cambia un toggle
 * Aplica los cambios inmediatamente sin necesidad de guardar
 */
function applySettingsInRealTime() {
    const newSettings = {
        music: domElements.settingMusicToggle.checked,
        sfx: domElements.settingSfxToggle.checked,
        goldConfirm: domElements.settingGoldConfirm.checked,
        hints: domElements.settingHints.checked
    };

    // APLICAR CAMBIOS INMEDIATAMENTE AL AUDIO
    if (typeof AudioManager !== 'undefined') {
        AudioManager.setVolume(
            newSettings.music ? 0.3 : 0,
            newSettings.sfx ? 0.7 : 0
        );
        console.log('[Settings] Cambios aplicados en tiempo real: Música=' + (newSettings.music ? '0.3' : '0') + ', SFX=' + (newSettings.sfx ? '0.7' : '0'));
        
        // Si la música se activó y no está sonando, reiniciar tema del menú
        if (newSettings.music && !AudioManager.currentMusic && gameState.currentPhase !== 'play') {
            AudioManager.playMusic('menu_theme');
        }
        // Si la música se desactivó, detenerla
        if (!newSettings.music && AudioManager.currentMusic) {
            AudioManager.stopMusic();
        }
    }

    // GUARDAR AUTOMÁTICAMENTE EN BACKGROUND (sin mostrar mensaje)
    saveSettingsInBackground(newSettings);
}

/**
 * Guarda las configuraciones sin cerrar el modal ni mostrar mensajes
 * Se llama automáticamente cuando el usuario cambia un toggle
 */
function saveSettingsInBackground(newSettings) {
    // Guardar en LocalStorage
    localStorage.setItem('iberion_settings', JSON.stringify(newSettings));

    // Guardar en Perfil Nube (Si está logueado)
    if (PlayerDataManager && PlayerDataManager.currentPlayer) {
        PlayerDataManager.currentPlayer.settings = newSettings;
        PlayerDataManager.saveCurrentPlayer().catch(err => {
            console.warn('[Settings] No se pudo guardar en nube, pero se guardó localmente:', err);
        });
    }

    console.log('[Settings] Configuración guardada automáticamente:', newSettings);
}

function saveSettings() {
    // 1. Leer de la UI
    const newSettings = {
        music: domElements.settingMusicToggle.checked,
        sfx: domElements.settingSfxToggle.checked,
        goldConfirm: domElements.settingGoldConfirm.checked,
        hints: domElements.settingHints.checked
    };

    // 2. YA ESTÁN APLICADOS POR applySettingsInRealTime(), 
    //    pero reforzamos por si acaso
    if (typeof AudioManager !== 'undefined') {
        AudioManager.setVolume(
            newSettings.music ? 0.3 : 0, 
            newSettings.sfx ? 0.7 : 0
        );
    }

    // 3. PERSISTENCIA
    saveSettingsInBackground(newSettings);

    logMessage("Configuración guardada.", "success");
    domElements.settingsModal.style.display = 'none';
}

function resetHints() {
    localStorage.removeItem('hexEvolvedDoNotShowHelp'); // Borra la bandera de "no mostrar"
    if (PlayerDataManager.currentPlayer) {
        // Si tuvieras banderas específicas en el perfil, se resetearían aquí
    }
    alert("Las pistas y ayudas se han restablecido y volverán a aparecer.");
}

//---------------------------
// --- SISTEMA DE RANKING ---
//---------------------------

// Shim de compatibilidad para el HTML existente
window.showRanking = function() {
    openRankingModal('xp');
};

let currentRankingMetric = 'xp';

async function openRankingModal(metric = 'xp') {
    if (!domElements.rankingModal) return;

    if (PlayerDataManager.currentPlayer) {
        console.log("Sincronizando mi puntuación antes de ver el ranking...");
        await PlayerDataManager.saveCurrentPlayer(); 
    }

    currentRankingMetric = metric;

    // 1. Mostrar modal (con mensaje de carga que ya está en el HTML)
    domElements.rankingModal.style.display = 'flex';
    
    // 2. Gestionar estado de botones de pestaña
    document.querySelectorAll('.ranking-tab-btn').forEach(btn => {
        if(btn.dataset.metric === metric) btn.classList.add('active');
        else btn.classList.remove('active');
        
        // Listener rápido para cambio de pestaña
        btn.onclick = () => openRankingModal(btn.dataset.metric);
    });

    // 3. Obtener Datos
    const data = await PlayerDataManager.getLeaderboard(metric === 'wins' ? 'total_wins' : 'xp');
    
    // 4. Renderizar
    renderRankingList(data, metric);
}

function renderRankingList(data, metric) {
    const list = domElements.rankingListContainer;
    list.innerHTML = ''; // Limpiar carga

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px;">No se encontraron datos.</p>';
        return;
    }

    const myUsername = PlayerDataManager.currentPlayer?.username;
    let myRankFound = false;

    data.forEach((player, index) => {
        const rank = index + 1;
        const isMe = (player.username === myUsername);
        if (isMe) myRankFound = true;

        // Decidir qué valor mostrar (Nivel+XP o Victorias)
        let displayValue = '';
        if (metric === 'wins') {
            displayValue = `${player.total_wins || 0} Wins`;
        } else {
            // Nivel (Total XP en pequeño)
            displayValue = `Lvl ${player.level || 1} <small style="opacity:0.6">(${Math.floor(player.xp||0)})</small>`;
        }

        const avatar = player.avatar_url || '🎖️';

        const row = document.createElement('div');
        row.className = `ranking-row rank-${rank} ${isMe ? 'highlight-me' : ''}`;
        if(isMe) row.style.backgroundColor = "rgba(0, 243, 255, 0.15)";
        
        row.innerHTML = `
            <span class="rnk-num">${rank}</span>
            <div class="rnk-name" style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.2em;">${avatar}</span> 
                ${player.username}
            </div>
            <span class="rnk-val">${displayValue}</span>
        `;
        list.appendChild(row);
    });

    // 5. Actualizar el "Footer" fijo de Mi Posición
    updateMyFooterRow(myRankFound, metric, data);
}

function updateMyFooterRow(foundInTop50, metric, topData) {
    const footer = document.getElementById('myRankingRow');
    if(!footer || !PlayerDataManager.currentPlayer) {
        if(footer) footer.style.display = 'none';
        return;
    }
    
    footer.style.display = 'flex';
    const me = PlayerDataManager.currentPlayer;
    
    // Valor
    let valStr = '';
    if (metric === 'wins') valStr = `${me.total_wins || 0}`;
    else valStr = `Lvl ${me.level || 1}`;

    // Rango
    // Si no estoy en el top 50 que hemos bajado, ponemos "50+"
    let rankStr = foundInTop50 ? "" : "50+";
    
    // Si estoy en la lista, el footer podría ocultarse o mostrarse para resaltar,
    // pero generalmente se deja para mostrar tu stat rápida.
    // Buscamos el rango real si está en la data:
    const myIndex = topData.findIndex(p => p.username === me.username);
    if(myIndex !== -1) rankStr = (myIndex + 1).toString();

    footer.innerHTML = `
        <span class="rnk-num" style="font-size:0.9em; color:#888;">${rankStr}</span>
        <span class="rnk-name" style="color:#f1c40f;">${me.username} (Tú)</span>
        <span class="rnk-val" style="color:white;">${valStr}</span>
    `;
}


//------------------------------------------
// --- SISTEMA DE continuar partidas     ---
//------------------------------------------

// --- SISTEMA DE GESTIÓN DE PARTIDAS ---
async function openMyGamesModal() {
    const modal = document.getElementById('myGamesModal');
    const list = document.getElementById('myGamesListPanel');
    
    if (!modal || !list) {
        console.error("Error: No se encontró el modal o la lista.");
        return;
    }
    
    // UI Setup (Mantiene tu lógica de pestañas)
    modal.style.display = 'flex';
    document.getElementById('myGamesListPanel').classList.add('active');
    document.getElementById('publicGamesListPanel').classList.remove('active');
    
    document.querySelectorAll('.ranking-tab-btn').forEach(b => b.classList.remove('active'));
    const myTab = document.getElementById('tabMyGames');
    if (myTab) myTab.classList.add('active');
    
    list.innerHTML = '<p style="text-align:center; color:#ccc; font-size:0.9em; margin-top:20px;">Sincronizando operaciones...</p>';

    const uid = PlayerDataManager.currentPlayer?.auth_id;
    const localSaves = (typeof window.getLocalSavedGames === 'function') ? window.getLocalSavedGames() : [];
    if (!uid) {
        list.innerHTML = '';
        if (!localSaves || localSaves.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#e74c3c;">Debes iniciar sesión o no tienes guardados locales.</p>';
            return;
        }

        const separator = document.createElement('div');
        separator.innerHTML = "<small style='color:#555; display:block; margin:10px 0; border-bottom:1px solid #333;'>GUARDADAS / LOCAL</small>";
        list.appendChild(separator);

        localSaves.forEach(save => {
            renderMatchCard(save, list, uid, 'save');
        });
        return;
    }

    try {
        // --- MODIFICACIÓN: CONSULTA PARALELA A AMBAS TABLAS ---
        const [activeRes, savedRes] = await Promise.all([
            // 1. Partidas Online (Lo que ya tenías)
            supabaseClient
                .from('active_matches')
                .select('*')
                .or(`host_id.eq.${uid},guest_id.eq.${uid}`)
                .order('updated_at', { ascending: false }),
            
            // 2. Partidas Guardadas Manualmente / Vs IA (LO NUEVO)
            supabaseClient
                .from('game_saves')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
        ]);

        if (activeRes.error) throw activeRes.error;
        // Ignoramos error en saves por si la tabla está vacía o hay problemas menores

        const activeData = activeRes.data || [];
        const savedData = savedRes.data || [];
        const combinedSaved = [...savedData, ...(localSaves || [])];

        list.innerHTML = ''; // Limpiar mensaje de carga

        if (activeData.length === 0 && combinedSaved.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#888; font-size:0.9em;">No tienes partidas registradas.</p>';
            return;
        }

        // --- RENDERIZADO: PARTIDAS ONLINE---
        activeData.forEach(match => {
            const state = match.game_state?.gameState || {};
            const turn = state.turnNumber || 1;
            const myRole = (match.host_id === uid) ? 1 : 2; 
            const isMyTurn = state.currentPlayer === myRole;
            
            // Lógica de abandono
            const lastMoveTime = new Date(match.updated_at);
            const hoursSinceLastMove = (new Date() - lastMoveTime) / (1000 * 60 * 60);
            const rivalAbandoned = !isMyTurn && hoursSinceLastMove > 24;
            
            let statusIcon = isMyTurn ? '🟢' : (rivalAbandoned ? '⚠️' : '⏳');
            let statusColor = isMyTurn ? '#2ecc71' : (rivalAbandoned ? '#e74c3c' : '#f39c12');
            let statusText = isMyTurn ? 'JUEGA' : (rivalAbandoned ? 'ABANDONO' : 'ESPERA');
            
            // Icono de rival
            const p2Type = state.playerTypes?.player2 || 'human';
            const opponentIcon = (myRole === 1 && p2Type.includes('ai')) ? '🤖' : '👤';

            const card = document.createElement('div');
            card.className = 'save-slot-card';
            // Usamos tu estructura HTML exacta
            card.innerHTML = `
                <div style="font-size:14px;">${statusIcon}</div>
                <div style="overflow:hidden;">
                    <h4 style="color:#f1c40f; font-size:11px; margin:0;">#${match.match_id} 
                        <span style="color:#666; font-weight:normal; font-size:9px;">(Red)</span>
                    </h4>
                </div>
                <div style="font-size:16px; text-align:center;">${opponentIcon}</div>
                <div class="match-status" style="color:${statusColor}; font-size:9px; text-align:center;">${statusText}</div>
                <div style="font-size:10px; color:#aaa; text-align:center;">T${turn}</div>
                <button class="options-btn" style="width:100%; border:none; background:transparent; color:#888; cursor:pointer;" onclick="event.stopPropagation(); showMatchContext(event, '${match.match_id}', ${rivalAbandoned})">⋮</button>
            `;
            
            card.onclick = () => {
                 document.getElementById('myGamesModal').style.display = 'none';
                 if(typeof NetworkManager !== 'undefined') NetworkManager.cargarPartidaDesdeLista(match);
            };
            list.appendChild(card);
        });

        // --- RENDERIZADO: PARTIDAS GUARDADAS / IA LOCAL ---
        if (combinedSaved.length > 0) {
            // Separador visual
            const separator = document.createElement('div');
            separator.innerHTML = "<small style='color:#555; display:block; margin:10px 0; border-bottom:1px solid #333;'>GUARDADAS / IA</small>";
            list.appendChild(separator);

            // CORRECCIÓN: Usar renderMatchCard para tener menú contextual también
            combinedSaved.forEach(save => {
                renderMatchCard(save, list, uid, 'save');
            });
        }

    } catch (error) {
        console.error("Error al cargar lista:", error);
        list.innerHTML = '<p style="text-align:center; color:#e74c3c;">Error recuperando datos.</p>';
    }
}

// En modalLogic.js (reemplaza tu renderMatchCard actual por esta)
// EN modalLogic.js -> Sustituye la función renderMatchCard completa por esta:

function renderMatchCard(match, container, uid, type) {
    const isLocal = (type === 'save');
    const isLocalStorage = isLocal && match.is_local;
    
    // --- 1. DATOS ---
    const rawState = isLocal ? match.game_state : match.game_state;
    const state = rawState?.gameState || rawState || {};
    const turn = state.turnNumber || 1;
    
    // Nombre
    let matchName = isLocal ? match.save_name : `Partida #${match.match_id}`;
    if (isLocal) matchName = matchName.replace("Partida Guardada", "").trim() || "Escaramuza";

    // Fecha (DD/MM/YYYY)
    const dateSource = match.updated_at || match.created_at || new Date();
    const d = new Date(dateSource);
    const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; 

    // --- 2. ESTADO Y COLORES ---
    let icon = '⚔️';
    let statusText = 'ONLINE';
    let statusColor = '#aaa'; // Color base más neutro
    let rowOpacity = '1';
    let isAbandoned = false;

    if (isLocal) {
        icon = '💾';
        statusText = 'LOCAL';
        statusColor = '#f1c40f'; // Dorado
    } else {
        const myRole = (match.host_id === uid) ? 1 : 2; 
        const isMyTurn = state.currentPlayer === myRole;
        
        // Abandono (>24h)
        const lastMove = new Date(dateSource);
        const hours = (new Date() - lastMove) / 36e5;
        isAbandoned = !isMyTurn && hours > 24;

        if (isMyTurn) {
            statusText = 'TU TURNO'; 
            statusColor = '#2ecc71'; // Verde brillante
        } else if (isAbandoned) {
            statusText = 'ABANDONO'; 
            statusColor = '#e74c3c'; // Rojo
            rowOpacity = '0.7';
        } else {
            statusText = 'ESPERA'; 
            statusColor = '#f39c12'; // Naranja
        }
    }

    // --- 3. MAQUETACIÓN (GRID 5 COLUMNAS) ---
    const card = document.createElement('div');
    card.className = 'save-slot-card';
    
    // COLUMNAS:
    // 1. Icono (30px)
    // 2. Nombre (35%)
    // 3. Fecha (Flexible - Llena el hueco central)
    // 4. Estado (Auto - Se ajusta al texto)
    // 5. Menú (30px)
    card.style.cssText = `
        display: grid;
        grid-template-columns: 30px 35% 1fr auto 30px;
        align-items: center;
        gap: 10px;
        background: #1a252f;
        border-left: 3px solid ${statusColor};
        padding: 8px 5px;
        margin-bottom: 5px;
        cursor: pointer;
        opacity: ${rowOpacity};
        font-size: 0.9em;
    `;
    
    card.onmouseover = () => card.style.background = '#253342';
    card.onmouseout = () => card.style.background = '#1a252f';

    // ACCIÓN CARGAR
    card.onclick = () => {
        document.getElementById('myGamesModal').style.display = 'none';
        if (isLocal) {
            let dataToLoad = match.game_state; 
            if (!dataToLoad.board && match.board_state) dataToLoad.board = match.board_state;
            if (dataToLoad.gameState && dataToLoad.gameState.gameState) dataToLoad = dataToLoad.gameState;

            if (typeof reconstruirJuegoDesdeDatos === 'function') {
                logMessage(`Cargando local...`);
                gameState.isCampaignBattle = false; 
                reconstruirJuegoDesdeDatos(dataToLoad);
            }
        } else {
            if(typeof NetworkManager !== 'undefined') NetworkManager.cargarPartidaDesdeLista(match);
        }
    };

    // ACCIÓN MENÚ
    const menuAction = (e) => {
        e.stopPropagation();
        const idParaAccion = isLocal ? match.id : match.match_id;
        if (typeof window.showMatchContext === 'function') {
            window.showMatchContext(e, idParaAccion, isAbandoned, isLocal, isLocalStorage);
        }
    };

    // --- 4. HTML ---
    card.innerHTML = `
        <!-- 1. ICONO -->
        <div style="font-size:18px; text-align:center;">${icon}</div>
        
        <!-- 2. NOMBRE E ID -->
        <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:bold; color:#fff;">
            ${matchName}
        </div>

        <!-- 3. FECHA (CENTRO) -->
        <div style="color:#888; font-size:0.85em; text-align:center;">
            ${dateStr}
        </div>

        <!-- 4. ESTADO Y TURNO -->
        <div style="text-align:right; font-weight:bold; font-size:0.85em; color:${statusColor}; white-space:nowrap;">
            ${statusText} <span style="color:#666; font-weight:normal;">| T${turn}</span>
        </div>

        <!-- 5. BOTÓN (Siempre visible) -->
        <div style="text-align:center;">
            <span class="options-btn" style="color:#bbb; font-weight:bold; font-size:18px; cursor:pointer;">⋮</span>
        </div>
    `;

    // Listener al botón (el span dentro del último div)
    const btnSpan = card.lastElementChild.querySelector('span');
    btnSpan.onclick = menuAction;
    btnSpan.onmouseover = () => btnSpan.style.color = '#fff';
    btnSpan.onmouseout = () => btnSpan.style.color = '#bbb';

    container.appendChild(card);
}

// --- NUEVA FUNCIÓN PARA BORRAR PARTIDAS GUARDADAS ---
async function deleteSavedGame(saveId) {
    if (!saveId) return;

    if (confirm("¿Estás seguro de que quieres borrar esta partida guardada? Esta acción es irreversible.")) {
        const { error } = await supabaseClient
            .from('game_saves')
            .delete()
            .eq('id', saveId);

        if (error) {
            console.error("Error al borrar:", error);
            alert("No se pudo borrar la partida.");
        } else {
            // Refrescar la lista de partidas para que desaparezca la borrada
            openMyGamesModal();
        }
    }
}

// --- GESTIÓN DE PESTAÑAS ---
window.switchGamesTab = function(tab) {
    // 1. Gestión Visual de Botones
    document.querySelectorAll('.ranking-tab-btn').forEach(b => b.classList.remove('active'));
    
    // 2. Gestión de Paneles (Fuerza bruta con display)
    const myPanel = document.getElementById('myGamesListPanel');
    const pubPanel = document.getElementById('publicGamesListPanel');

    if (tab === 'my') {
        document.getElementById('tabMyGames').classList.add('active');
        myPanel.style.display = 'flex';   // MOSTRAR MÍOS
        pubPanel.style.display = 'none';  // OCULTAR PÚBLICO
        openMyGamesModal(); // Recargar datos
    } else {
        document.getElementById('tabPublicGames').classList.add('active');
        myPanel.style.display = 'none';   // OCULTAR MÍOS
        pubPanel.style.display = 'flex';  // MOSTRAR PÚBLICO
        refreshPublicGames(); // Cargar datos del mercado
    }
};

// Cerrar menú al hacer clic fuera
window.addEventListener('click', () => {
    const menu = document.getElementById('matchContextMenu');
    if(menu) menu.style.display = 'none';
});

// --- ACCIONES DE RECUPERACIÓN ---

// 1. Convertir Rival a IA
window.convertToAI = async function(matchId) {
    if (!confirm("¿Reemplazar al rival humano por una IA? Esta acción es irreversible.")) return;

    // Obtener estado actual
    const { data: match } = await supabaseClient.from('active_matches').select('game_state').eq('match_id', matchId).single();
    
    if (match) {
        const newState = match.game_state;
        
        // Asignar IA al hueco del rival (Jugador 2 por defecto, o el que no seas tú)
        // Simplificación: Si soy Host (J1), pongo IA en J2.
        newState.gameState.playerTypes['player2'] = 'ai_normal'; 
        
        await supabaseClient.from('active_matches').update({ 
            game_state: newState,
            status: 'VS_AI',
            guest_id: null // Expulsamos al humano fantasma si lo hubiera
        }).eq('match_id', matchId);

        alert("Rival convertido. Ahora juegas contra la IA.");
        openMyGamesModal();
    }
};

// 2. Publicar en Mercado
window.publishToMarket = async function(matchId) {
    if (!confirm("¿Ofrecer esta partida al público? Otro jugador podrá tomar el control del rival.")) return;

    // ALERTA: La clave es poner guest_id en null para que aparezca en las búsquedas
    const { error } = await supabaseClient.from('active_matches').update({ 
        status: 'OPEN_MARKET',
        guest_id: null, // <--- ESTA ES LA LÍNEA MÁGICA QUE FALTABA
        updated_at: new Date() 
    }).eq('match_id', matchId);

    if (error) {
        console.error("Error publicando:", error);
        alert("Error al publicar en el mercado.");
    } else {
        alert("Partida publicada en el Mercado de Guerra. Esperando nuevo general...");
        openMyGamesModal(); // Refrescar la lista para ver el cambio de estado
    }
};

// 3. Menú Contextual (Lógica visual)
// --- GESTIÓN DE MENÚ CONTEXTUAL (Adaptada para Local y Online) ---
window.showMatchContext = function(event, matchId, rivalIsAbandoned, isLocal = false, isLocalStorage = false) {
    const menu = document.getElementById('matchContextMenu');
    
    // 1. Posicionamiento
    menu.style.display = 'block';
    let left = event.clientX - 140;
    if (left < 10) left = 10;
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${left}px`;
    
    // 2. Referencias a botones
    const btnMainAction = document.getElementById('ctxAbandon'); // Reusamos este botón
    const btnAI = document.getElementById('ctxConvertToAI');
    const btnShare = document.getElementById('ctxShare');

    // 3. Configuración según tipo
    if (isLocal) {
        // --- MODO LOCAL ---
        btnMainAction.style.display = 'block';
        btnMainAction.textContent = "🗑️ Borrar Partida";
        btnMainAction.onclick = () => {
            document.getElementById('matchContextMenu').style.display = 'none';
            if (isLocalStorage && typeof window.deleteLocalSavedGame === 'function') {
                window.deleteLocalSavedGame(matchId);
                openMyGamesModal();
            } else {
                deleteSavedGame(matchId); // Llama a la función de borrado de DB
            }
        };
        
        // Opciones de red (publicar guardado)
        btnAI.style.display = 'none';
        btnShare.style.display = 'block';
        btnShare.textContent = "🌍 Ofrecer en Mercado";
        btnShare.onclick = () => {
            document.getElementById('matchContextMenu').style.display = 'none';
            if (typeof window.publishSavedGameToMarket === 'function') {
                window.publishSavedGameToMarket(matchId, isLocalStorage);
            }
        };

    } else {
        // --- MODO ONLINE ---
        btnMainAction.style.display = 'block';
        btnMainAction.textContent = "❌ Abandonar";
        btnMainAction.onclick = () => {
            document.getElementById('matchContextMenu').style.display = 'none';
            abandonMatch(matchId);
        };

        // Opciones Extra (Solo si rival abandonó)
        if (rivalIsAbandoned) {
            btnAI.style.display = 'block';
            btnAI.textContent = "🤖 Convertir Rival a IA";
            btnAI.onclick = () => {
                document.getElementById('matchContextMenu').style.display = 'none';
                convertToAI(matchId);
            };

            btnShare.style.display = 'block';
            btnShare.textContent = "🌍 Ofrecer en Mercado";
            btnShare.onclick = () => {
                document.getElementById('matchContextMenu').style.display = 'none';
                publishToMarket(matchId);
            };
        } else {
            btnAI.style.display = 'none';
            btnShare.style.display = 'none';
        }
    }
};

// Publicar un guardado (local o nube) como partida en mercado
window.publishSavedGameToMarket = async function(saveId, isLocalStorage = false) {
    if (!confirm("¿Publicar esta partida para que otro jugador tome el control?")) return;

    const uid = PlayerDataManager.currentPlayer?.auth_id;
    if (!uid) {
        alert("Debes iniciar sesión para publicar en el mercado.");
        return;
    }

    let save = null;
    if (isLocalStorage && typeof window.getLocalSavedGames === 'function') {
        const localSaves = window.getLocalSavedGames();
        save = localSaves.find(s => s.id === saveId);
    } else {
        const { data } = await supabaseClient
            .from('game_saves')
            .select('*')
            .eq('id', saveId)
            .single();
        save = data;
    }

    if (!save) {
        alert("No se encontró el guardado.");
        return;
    }

    const matchId = (typeof NetworkManager !== 'undefined' && NetworkManager._generarCodigoCorto)
        ? NetworkManager._generarCodigoCorto()
        : Math.random().toString(36).substring(2, 6).toUpperCase();

    const cloudState = {
        gameState: save.game_state?.gameState || save.game_state || {},
        board: save.board_state || save.game_state?.board,
        units: save.game_state?.units || [],
        unitIdCounter: save.game_state?.unitIdCounter || 0,
        timestamp: Date.now()
    };

    if (!cloudState.board) {
        alert("El guardado no contiene tablero. No se puede publicar.");
        return;
    }

    // Forzar rival humano para mercado
    if (cloudState.gameState?.playerTypes) {
        cloudState.gameState.playerTypes.player2 = 'human';
    }

    const { error } = await supabaseClient
        .from('active_matches')
        .upsert({
            match_id: matchId,
            host_id: uid,
            guest_id: null,
            status: 'OPEN_MARKET',
            current_turn_player: cloudState.gameState?.currentPlayer || 1,
            game_state: cloudState,
            updated_at: new Date()
        });

    if (error) {
        console.error("Error publicando guardado:", error);
        alert("Error al publicar en el mercado.");
        return;
    }

    alert(`Partida publicada. Código: ${matchId}`);
    openMyGamesModal();
};

// --- CORRECCIÓN MERCADO PÚBLICO ---
window.refreshPublicGames = async function() {
    const list = document.getElementById('publicGamesList');
    list.innerHTML = '<p style="text-align:center; color:#ccc; font-size:10px;">Escaneando mercado...</p>';

    const myId = PlayerDataManager.currentPlayer?.auth_id;

    // Buscamos partidas en estado MERCADO y que tengan hueco libre
    let query = supabaseClient
        .from('active_matches')
        .select('*')
        .eq('status', 'OPEN_MARKET')
        .is('guest_id', null)  // IMPORTANTE: Solo las que buscan jugador
        .neq('host_id', myId)  // No mostrar las mías propias (opcional, quítalo si quieres verlas)
        .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) { console.error(error); list.innerHTML = "Error."; return; }

    list.innerHTML = '';
    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888; font-size:10px;">No hay partidas disponibles.</p>';
        return;
    }

    // Renderizado (Tu código de tarjeta de mercado...)
    data.forEach(match => {
        // ... (Usa el mismo código de tarjeta que ya tenías para el mercado) ...
        // ... Asegúrate de que el botón llame a takeOverMatch ...
        const card = document.createElement('div');
        card.className = 'save-slot-card';
        card.innerHTML = `
            <div style="font-size:14px;">🌍</div>
            <h4 style="color:#00f3ff;">#${match.match_id}</h4>
            <div style="flex-grow:1"></div>
            <span style="font-size:9px; color:#666;">Abandonada</span>
            <button onclick="takeOverMatch('${match.match_id}')" style="background:#27ae60; color:white; border:none; padding:4px 8px; font-size:10px; border-radius:3px;">TOMAR</button>
        `;
        list.appendChild(card);
    });
};

// --- ABANDONAR ---
window.abandonMatch = async function(matchId) {
    if(!confirm("¿Abandonar esta batalla? No podrás volver.")) return;
    
    const myId = PlayerDataManager.currentPlayer.auth_id;
    
    // Averiguar si soy Host o Guest
    const { data } = await supabaseClient.from('active_matches').select('host_id, guest_id').eq('match_id', matchId).single();
    
    if (data) {
        if (data.host_id === myId) {
            // Soy Host: La borro para todos (es lo más limpio para evitar partidas zombies)
            await supabaseClient.from('active_matches').delete().eq('match_id', matchId);
        } else {
            // Soy Guest: Me borro a mí mismo. El Host verá que el hueco se liberó.
            await supabaseClient.from('active_matches').update({ guest_id: null }).eq('match_id', matchId);
        }
    }
    
    // Refrescar lista visualmente
    openMyGamesModal(); 
};

// Función para unirse como sustituto
window.takeOverMatch = async function(matchId) {
    if (!confirm("¿Asumir el mando de esta facción?")) return;
    
    const myId = PlayerDataManager.currentPlayer.auth_id;
    
    // Nos ponemos como el 'guest_id' (o host si estaba vacío, pero asumimos guest para simplificar)
    // Y quitamos el estado de mercado
    await supabaseClient.from('active_matches').update({ 
        guest_id: myId,
        status: 'ACTIVE'
    }).eq('match_id', matchId);

    alert("¡Mando transferido! Cargando situación...");
    // Cargar inmediatamente
    const { data } = await supabaseClient.from('active_matches').select('*').eq('match_id', matchId).single();
    if(data && typeof NetworkManager !== 'undefined') {
        document.getElementById('myGamesModal').style.display = 'none';
        NetworkManager.cargarPartidaDesdeLista(data);
    }
};

// Exponer la función globalmente para que main.js la encuentre
window.openMyGamesModal = openMyGamesModal;

// Asegurarse de que los listeners se configuran cuando el DOM está listo
document.addEventListener('DOMContentLoaded', setupGachaModalListeners);