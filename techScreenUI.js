// techScreenUI.js
// DEFINIR FUNCIONES GLOBALMENTE (fuera de DOMContentLoaded para que estén disponibles inmediatamente)
function openTechTreeScreen() {
    const screen = document.getElementById('techTreeScreen');
    const container = document.getElementById('techTreeContainer'); 

    if (!screen || !container || !TECHNOLOGY_TREE_DATA || !gameState || !gameState.playerResources) {
        console.error("openTechTreeScreen: Faltan dependencias.");
        return;
    }

    container.innerHTML = ''; 
    const currentPlayer = gameState.currentPlayer;
    const playerResearchedTechs = gameState.playerResources[currentPlayer]?.researchedTechnologies || [];

    // 1. CREAR Y POSICIONAR TODOS LOS NODOS TECNOLÓGICOS (VUELVE A LA NORMALIDAD)
        for (const techId in TECHNOLOGY_TREE_DATA) {
            const tech = TECHNOLOGY_TREE_DATA[techId];
            const nodeDiv = document.createElement('div');
            nodeDiv.classList.add('tech-node');
            nodeDiv.id = `tech-node-${tech.id}`; 
            
            const nodeWidth = 100; 
            const nodeHeight = 100; 
            nodeDiv.style.left = `calc(50% + ${tech.position.x}px - ${nodeWidth / 2}px)`; 
            nodeDiv.style.top = `calc(50% + ${tech.position.y}px - ${nodeHeight / 2}px)`;  
            
            const spriteSpan = document.createElement('span');
            spriteSpan.classList.add('tech-sprite');
            spriteSpan.textContent = tech.sprite || tech.name.substring(0, 3);
            nodeDiv.appendChild(spriteSpan);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = tech.name;
            nodeDiv.appendChild(nameSpan);

            const isResearched = playerResearchedTechs.includes(tech.id);
            const canBeResearched = typeof hasPrerequisites === "function" ? hasPrerequisites(playerResearchedTechs, tech.id) : false;

            // Asignar clases CSS según estado
            if (isResearched) {
                nodeDiv.classList.add('researched');
            } else if (canBeResearched) {
                nodeDiv.classList.add('available');
            } else {
                nodeDiv.classList.add('locked');
            }
            
            // TODAS las tecnologías son clickeables y abren el modal
            nodeDiv.setAttribute('data-tech-id', tech.id);
            nodeDiv.style.cursor = 'pointer';
            
            nodeDiv.addEventListener('click', function(event) {
                event.stopPropagation();
                const techIdToOpen = this.getAttribute('data-tech-id');
                openTechDetailModal(techIdToOpen);
            });
            
        let tooltipText = `${tech.description || 'Sin descripción.'}\nCosto: `;
        if (tech.cost) {
            if (tech.cost.researchPoints) tooltipText += `${tech.cost.researchPoints} Puntos Inv.`;
            else if (tech.cost.oro) tooltipText += `${tech.cost.oro} Oro`;
            else tooltipText += "N/A";
        } else { tooltipText += "N/A"; }
            nodeDiv.title = tooltipText;
            container.appendChild(nodeDiv);
        }

    // HACER VISIBLE LA PANTALLA ANTES DEL RAF
        screen.style.display = 'flex';

    requestAnimationFrame(() => {
        const liveContainer = document.getElementById('techTreeContainer');
        const modalContent = document.querySelector('#techTreeScreen .modal-content.tech-tree-content');

        if (!liveContainer || !modalContent) {
            console.error("[TechTree RAF] liveContainer o modalContent no encontrado.");
            return;
        }

        // 2. DIBUJAR LÍNEAS DE CONEXIÓN SVG
        const svgNS = "http://www.w3.org/2000/svg";
        let svgLines = document.getElementById('techTreeLinesSVG');
        if (svgLines) {
            svgLines.innerHTML = '';
        } else {
            svgLines = document.createElementNS(svgNS, "svg");
            svgLines.setAttribute('id', 'techTreeLinesSVG');
            svgLines.style.position = 'absolute';
            svgLines.style.top = '0';
            svgLines.style.left = '0';
            svgLines.style.pointerEvents = 'none'; 
            liveContainer.insertBefore(svgLines, liveContainer.firstChild);
        }
        
        // --- CAMBIO CLAVE EN Z-INDEX ---
        svgLines.style.zIndex = '0'; // Un z-index positivo para ponerlo encima de los nodos por defecto
        
        svgLines.style.width = `${liveContainer.offsetWidth}px`; 
        svgLines.style.height = `${liveContainer.offsetHeight}px`;

        for (const techId_line_raf in TECHNOLOGY_TREE_DATA) {
            const tech_line_raf = TECHNOLOGY_TREE_DATA[techId_line_raf];
            const nodeCenterX_raf = (liveContainer.offsetWidth / 2) + tech_line_raf.position.x;
            const nodeCenterY_raf = (liveContainer.offsetHeight / 2) + tech_line_raf.position.y;

            if (tech_line_raf.prerequisites && tech_line_raf.prerequisites.length > 0) {
                tech_line_raf.prerequisites.forEach(prereqId_raf => {
                    const prereqTech_raf = TECHNOLOGY_TREE_DATA[prereqId_raf];
                    if (prereqTech_raf) {
                        const prereqCenterX_raf = (liveContainer.offsetWidth / 2) + prereqTech_raf.position.x;
                        const prereqCenterY_raf = (liveContainer.offsetHeight / 2) + prereqTech_raf.position.y;
                        const line = document.createElementNS(svgNS, "line");
                        line.setAttribute('x1', prereqCenterX_raf.toString());
                        line.setAttribute('y1', prereqCenterY_raf.toString());
                        line.setAttribute('x2', nodeCenterX_raf.toString());
                        line.setAttribute('y2', nodeCenterY_raf.toString());
                        let strokeColor = '#6c757d'; 
                        if (playerResearchedTechs.includes(tech_line_raf.id) && playerResearchedTechs.includes(prereqId_raf)) {
                            strokeColor = '#e9c46a'; 
                        } else if (playerResearchedTechs.includes(prereqId_raf) && (typeof hasPrerequisites === "function" && hasPrerequisites(playerResearchedTechs, tech_line_raf.id))) {
                            strokeColor = '#2a9d8f'; 
                        }
                        line.setAttribute('stroke', strokeColor);
                        line.setAttribute('stroke-width', '3');
                        svgLines.appendChild(line);
                    }
                });
            }
        }
        
        // 3. CENTRAR EL ÁRBOL USANDO SCROLL
        if (liveContainer.scrollWidth > modalContent.clientWidth || liveContainer.scrollHeight > modalContent.clientHeight) {
            const treeLogicalCenterX = liveContainer.offsetWidth / 2; 
            const treeLogicalCenterY = liveContainer.offsetHeight / 2;
            modalContent.scrollLeft = treeLogicalCenterX - (modalContent.clientWidth / 2);
            modalContent.scrollTop = treeLogicalCenterY - (modalContent.clientHeight / 2);
        } else {
            modalContent.scrollLeft = 0;
            modalContent.scrollTop = 0;
        }
        
        // 4. ACTUALIZAR VISUALIZACIÓN DEL PLAN DE INVESTIGACIÓN
        if (typeof AutoResearchManager !== 'undefined') {
            AutoResearchManager.updateTechTreeVisualization(currentPlayer);
        }
    }); 
    }
    
// Exportar openTechTreeScreen a window
window.openTechTreeScreen = openTechTreeScreen;

    function closeTechTreeScreen() {
        const screen = document.getElementById('techTreeScreen');
        if (screen) screen.style.display = 'none';
    }
    
    // Exportar a window
    window.closeTechTreeScreen = closeTechTreeScreen;

// ===== FUNCIÓN MODIFICADA PARA USAR UIManager.showMessageTemporarily =====
// En techScreenUI.js

    // En techScreenUI.js
    function _executeResearch(techId, playerId) {
        const techToResearch = TECHNOLOGY_TREE_DATA[techId];
        // Usamos el playerId que nos pasan, no el global.
        const playerResources = gameState.playerResources[playerId];

        if (!techToResearch || !playerResources) {
            console.error("Faltan datos para ejecutar la investigación.");
            return false; // Fallo
        }

        if (!Array.isArray(playerResources.researchedTechnologies)) {
            playerResources.researchedTechnologies = [];
        }
        const playerTechs = playerResources.researchedTechnologies;

        // --- Validaciones (sin tocar la UI) ---
        if (playerTechs.includes(techId)) return false;
        if (typeof hasPrerequisites === "function" && !hasPrerequisites(playerTechs, techId)) return false;
        for (const resourceKey in techToResearch.cost) {
            if ((playerResources[resourceKey] || 0) < techToResearch.cost[resourceKey]) {
                return false;
            }
        }

        // --- Ejecución (solo modifica datos) ---
        for (const resourceKey in techToResearch.cost) {
            playerResources[resourceKey] -= techToResearch.cost[resourceKey];
        }
        playerTechs.push(techId);

        // Si llegamos hasta aquí, la investigación fue un éxito.
        return true; 
    }
    
    // Exportar a window
    window._executeResearch = _executeResearch;

    function refreshTechTreeContent() {
    const container = document.getElementById('techTreeContainer');
    if (!container || !TECHNOLOGY_TREE_DATA || !gameState || !gameState.playerResources) {
        console.error("refreshTechTreeContent: Faltan dependencias.");
        return;
    }

    container.innerHTML = ''; // Limpiar contenido previo
    const currentPlayer = gameState.currentPlayer;
    const playerResearchedTechs = gameState.playerResources[currentPlayer]?.researchedTechnologies || [];

    const svgNS = "http://www.w3.org/2000/svg";
    const svgLines = document.createElementNS(svgNS, "svg");
    svgLines.setAttribute('id', 'techTreeLinesSVG');
    svgLines.style.position = 'absolute';
    svgLines.style.top = '0';
    svgLines.style.left = '0';
    svgLines.style.width = '100%';
    svgLines.style.height = '100%';
    svgLines.style.pointerEvents = 'none';
    container.appendChild(svgLines);

    // Repoblar nodos
    for (const techId in TECHNOLOGY_TREE_DATA) { // <<< EMPIEZA A REEMPLAZAR DESDE AQUÍ
        const tech = TECHNOLOGY_TREE_DATA[techId];
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('tech-node');
        nodeDiv.id = `tech-node-${tech.id}`; 
        
        // ... (todo el código que crea los elementos del nodo, sprites, texto, etc.) ...
        const nodeWidth = 100; const nodeHeight = 100;
        nodeDiv.style.left = `calc(50% + ${tech.position.x}px - ${nodeWidth / 2}px)`; 
        nodeDiv.style.top = `calc(50% + ${tech.position.y}px - ${nodeHeight / 2}px)`;  
        
        const spriteSpan = document.createElement('span');
        spriteSpan.classList.add('tech-sprite');
        spriteSpan.textContent = tech.sprite || tech.name.substring(0, 3);
        nodeDiv.appendChild(spriteSpan);
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = tech.name;
        nodeDiv.appendChild(nameSpan);

        // --- Asignar clases CSS según estado ---
        const isResearched = playerResearchedTechs.includes(tech.id);
        const canBeResearched = hasPrerequisites(playerResearchedTechs, tech.id);
        if (isResearched) { 
            nodeDiv.classList.add('researched');
        } else if (canBeResearched) { 
            nodeDiv.classList.add('available');
        } else { 
            nodeDiv.classList.add('locked');
        }
        
        // TODAS las tecnologías son clickeables
        nodeDiv.setAttribute('data-tech-id', tech.id);
        nodeDiv.style.cursor = 'pointer';
        nodeDiv.addEventListener('click', function(event) {
            event.stopPropagation();
            const techIdToOpen = this.getAttribute('data-tech-id');
            openTechDetailModal(techIdToOpen);
        });
        
        let tooltipText = `${tech.name}\n${tech.description || ''}\n\nCosto: ...`; // Asume que tienes tu lógica aquí
        nodeDiv.title = tooltipText;
        container.appendChild(nodeDiv);
    }

    // Repoblar líneas
    requestAnimationFrame(() => { // Usar requestAnimationFrame para asegurar que los nodos están renderizados
        const liveContainer = document.getElementById('techTreeContainer');
        const modalContent = document.querySelector('#techTreeScreen .modal-content.tech-tree-content');
        if (!liveContainer || !modalContent) return;

        svgLines.innerHTML = ''; // Limpiar SVG para redibujar líneas
        svgLines.style.width = `${liveContainer.offsetWidth}px`; 
        svgLines.style.height = `${liveContainer.offsetHeight}px`;

        for (const techId_line_raf in TECHNOLOGY_TREE_DATA) {
            const tech_line_raf = TECHNOLOGY_TREE_DATA[techId_line_raf];
            const targetNode = document.getElementById(`tech-node-${tech_line_raf.id}`);
            if (!targetNode) continue; // Asegurar que el nodo objetivo existe

            const nodeCenterX_raf = targetNode.offsetLeft + targetNode.offsetWidth / 2;
            const nodeCenterY_raf = targetNode.offsetTop + targetNode.offsetHeight / 2;

            if (tech_line_raf.prerequisites && tech_line_raf.prerequisites.length > 0) {
                tech_line_raf.prerequisites.forEach(prereqId_raf => {
                    const prereqTech_raf = TECHNOLOGY_TREE_DATA[prereqId_raf];
                    const sourceNode = document.getElementById(`tech-node-${prereqId_raf}`);
                    if (prereqTech_raf && sourceNode) {
                        const prereqCenterX_raf = sourceNode.offsetLeft + sourceNode.offsetWidth / 2;
                        const prereqCenterY_raf = sourceNode.offsetTop + sourceNode.offsetHeight / 2;
                        const line = document.createElementNS(svgNS, "line");
                        line.setAttribute('x1', prereqCenterX_raf.toString());
                        line.setAttribute('y1', prereqCenterY_raf.toString());
                        line.setAttribute('x2', nodeCenterX_raf.toString());
                        line.setAttribute('y2', nodeCenterY_raf.toString());
                        let strokeColor = '#6c757d'; 
                        if (playerResearchedTechs.includes(tech_line_raf.id) && playerResearchedTechs.includes(prereqId_raf)) {
                            strokeColor = '#e9c46a'; 
                        } else if (playerResearchedTechs.includes(prereqId_raf) && (typeof hasPrerequisites === "function" && hasPrerequisites(playerResearchedTechs, tech_line_raf.id))) {
                            strokeColor = '#2a9d8f'; 
                        }
                        line.setAttribute('stroke', strokeColor);
                        line.setAttribute('stroke-width', '3');
                        svgLines.appendChild(line);
                    }
                });
            }
        }
    });

    // Centrar scroll del modal
    const modalContent = document.querySelector('#techTreeScreen .modal-content.tech-tree-content');
    if (modalContent) { // Asegurarse de que modalContent existe antes de intentar scroll
        if (container.scrollWidth > modalContent.clientWidth || container.scrollHeight > modalContent.clientHeight) {
            const treeLogicalCenterX = container.offsetWidth / 2; 
            const treeLogicalCenterY = container.offsetHeight / 2;
            modalContent.scrollLeft = treeLogicalCenterX - (modalContent.clientWidth / 2);
            modalContent.scrollTop = treeLogicalCenterY - (modalContent.clientHeight / 2);
        } else {
            modalContent.scrollLeft = 0;
            modalContent.scrollTop = 0;
        }
    }
    
    // Actualizar visualización del plan de investigación si existe
    if (typeof AutoResearchManager !== 'undefined') {
        AutoResearchManager.updateTechTreeVisualization(currentPlayer);
    }
}

// Exportar a window
window.refreshTechTreeContent = refreshTechTreeContent;

function RequestAttemptToResearch(techId) {
    // Toda la validación local (prerrequisitos, coste) se hace PRIMERO
    const techToResearch = TECHNOLOGY_TREE_DATA[techId];
    if (!techToResearch || /*...el resto de validaciones...*/ !canAfford) {
        // Muestra mensaje de error y para
        return;
    }

    if (isNetworkGame()) {
        NetworkManager.enviarDatos({
            type: 'actionRequest',
            action: {
                type: 'researchTech',
                payload: {
                    playerId: gameState.currentPlayer,
                    techId: techId
                }
            }
        });
        closeTechTreeScreen();
        logMessage("Petición de investigación enviada...");
        return;
    }

    // Si es juego local, ejecuta la lógica
    _executeResearch(techId);
}

function RequestResearchTech(techId) {
    if (isNetworkGame()) {
        const action = {
            type: 'researchTech',
            actionId: `research_${gameState.myPlayerNumber}_${techId}_${Date.now()}`,
            payload: {
                playerId: gameState.myPlayerNumber,
                techId: techId
            }
        };
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
            refreshTechTreeContent(); // Actualizamos la UI en red
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
        logMessage("Petición de investigación enviada...");
    } else {
        // Juego Local:
        const success = _executeResearch(techId, gameState.currentPlayer);
        if (success) {
            const techToResearch = TECHNOLOGY_TREE_DATA[techId];
            logMessage(`¡Has investigado ${techToResearch.name}!`);
            refreshTechTreeContent(); // Actualizamos la UI localmente
            if (UIManager) UIManager.updateAllUIDisplays();
        }
    }
}
    
    /**
     * Abre el modal de detalle para una tecnología específica.
     * @param {string} techId - El ID de la tecnología en la que se hizo clic.
     */
    function openTechDetailModal(techId) {
        const techData = TECHNOLOGY_TREE_DATA[techId];
        const modal = document.getElementById('techDetailModal');

            if (!techData || !modal) {
                console.error("Error en openTechDetailModal:", {techData, modal});
                return;
            }

            // --- Rellenar el contenido del modal ---
            document.getElementById('techDetailIcon').textContent = techData.sprite || '💡';
            document.getElementById('techDetailName').textContent = techData.name;
            document.getElementById('techDetailDescription').textContent = techData.description;

        // Rellenar Costo
            const cost = techData.cost.researchPoints || 0;
            document.getElementById('techDetailCost').textContent = `${cost} Puntos de Inv.`;

        // Rellenar Prerrequisitos
        const prereqs = techData.prerequisites
            .map(id => TECHNOLOGY_TREE_DATA[id]?.name)
            .join(', ') || 'Ninguno';
        document.getElementById('techDetailPrereqs').textContent = prereqs;

        // Rellenar Desbloqueos
        const unlocks = [
            ...(techData.unlocksUnits || []),
            ...(techData.unlocksStructures || [])
        ].join(', ') || 'Ninguno';
        document.getElementById('techDetailUnlocks').textContent = unlocks;
        
        // --- 2. Configurar el botón de "Investigar" o "Activar Plan" ---
        const researchBtn = document.getElementById('researchTechBtn');
        const playerResources = gameState.playerResources[gameState.currentPlayer];
        const playerTechs = playerResources.researchedTechnologies || [];
        const canAfford = playerResources.researchPoints >= cost;
        const hasPrereqs = hasPrerequisites(playerTechs, techId);
        const isResearched = playerTechs.includes(techId);

        // Verificar si ya hay un plan activo para esta tecnología
        const hasActivePlan = typeof AutoResearchManager !== 'undefined' && 
                             AutoResearchManager.hasActivePlan(gameState.currentPlayer);
        const currentPlan = hasActivePlan ? AutoResearchManager.getActivePlan(gameState.currentPlayer) : null;
        const isPlanTarget = currentPlan && currentPlan.targetTech === techId;

        if (isResearched) {
            // Ya investigada
            researchBtn.textContent = '✓ Ya Investigada';
            researchBtn.disabled = true;
            researchBtn.style.background = '#4CAF50';
        } else if (isPlanTarget) {
            // Es el objetivo del plan activo
            researchBtn.textContent = '🔬 Plan Activo';
            researchBtn.disabled = true;
            researchBtn.style.background = '#FF9800';
        } else if (!hasPrereqs) {
            // No tiene prerequisitos - mostrar botón "Activar Plan"
            researchBtn.textContent = '🎯 Activar Plan';
            researchBtn.disabled = false;
            researchBtn.style.background = '#2196F3';
            researchBtn.onclick = () => {
                if (typeof AutoResearchManager !== 'undefined') {
                    AutoResearchManager.activateResearchPlan(gameState.currentPlayer, techId);
                    modal.style.display = 'none';
                    // Actualizar visualización
                    if (typeof refreshTechTreeContent === 'function') {
                        refreshTechTreeContent();
                    }
                } else {
                    console.error('AutoResearchManager no está disponible');
                }
            };
        } else {
            // Puede investigarse ahora
            researchBtn.textContent = canAfford ? '🔬 Investigar' : '❌ Sin Recursos';
            researchBtn.disabled = !canAfford;
            researchBtn.style.background = canAfford ? '#4CAF50' : '#9e9e9e';
            researchBtn.onclick = () => {
                RequestResearchTech(techId);
                modal.style.display = 'none';
            };
        }

        // Configurar el botón de cierre (la 'x')
        document.getElementById('closeTechDetailBtn').onclick = () => {
            modal.style.display = 'none';
        };

        // --- 3. Mostrar el modal ---
        modal.style.display = 'flex';
    }
    
    // Exportar a window
    window.openTechDetailModal = openTechDetailModal;

// Todas las funciones principales están exportadas a window
