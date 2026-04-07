// techScreenUI.js
// DEFINIR FUNCIONES GLOBALMENTE (fuera de DOMContentLoaded para que estén disponibles inmediatamente)
const TECH_TREE_NODE_SIZE = 64;

function _computeTechTreeLayout(container) {
    const techEntries = Object.values(TECHNOLOGY_TREE_DATA || {});
    if (techEntries.length === 0) {
        return { scale: 1, centerX: 0, centerY: 0, width: container.clientWidth || 620, height: container.clientHeight || 260 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    techEntries.forEach(tech => {
        minX = Math.min(minX, tech.position.x);
        maxX = Math.max(maxX, tech.position.x);
        minY = Math.min(minY, tech.position.y);
        maxY = Math.max(maxY, tech.position.y);
    });

    const width = container.clientWidth || 620;
    const height = container.clientHeight || 260;
    const margin = TECH_TREE_NODE_SIZE;

    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);
    const scaleX = (width - margin * 2) / rangeX;
    const scaleY = (height - margin * 2) / rangeY;
    const scale = Math.max(0.22, Math.min(scaleX, scaleY, 1));

    return {
        scale,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        width,
        height
    };
}

function _toScreenPosition(tech, layout) {
    const x = (tech.position.x - layout.centerX) * layout.scale + layout.width / 2;
    const y = (tech.position.y - layout.centerY) * layout.scale + layout.height / 2;
    return { x, y };
}

function _drawTechTreeConnections(container, playerResearchedTechs, layout) {
    const svgNS = "http://www.w3.org/2000/svg";
    let svgLines = document.getElementById('techTreeLinesSVG');
    if (!svgLines) {
        svgLines = document.createElementNS(svgNS, "svg");
        svgLines.setAttribute('id', 'techTreeLinesSVG');
        svgLines.style.position = 'absolute';
        svgLines.style.top = '0';
        svgLines.style.left = '0';
        svgLines.style.pointerEvents = 'none';
        svgLines.style.zIndex = '0';
        container.insertBefore(svgLines, container.firstChild);
    }

    svgLines.innerHTML = '';
    svgLines.style.width = `${layout.width}px`;
    svgLines.style.height = `${layout.height}px`;

    for (const techId in TECHNOLOGY_TREE_DATA) {
        const tech = TECHNOLOGY_TREE_DATA[techId];
        const targetPos = _toScreenPosition(tech, layout);

        (tech.prerequisites || []).forEach(prereqId => {
            const prereqTech = TECHNOLOGY_TREE_DATA[prereqId];
            if (!prereqTech) return;
            const sourcePos = _toScreenPosition(prereqTech, layout);

            const line = document.createElementNS(svgNS, "line");
            line.setAttribute('x1', sourcePos.x.toString());
            line.setAttribute('y1', sourcePos.y.toString());
            line.setAttribute('x2', targetPos.x.toString());
            line.setAttribute('y2', targetPos.y.toString());

            let strokeColor = '#6c757d';
            if (playerResearchedTechs.includes(tech.id) && playerResearchedTechs.includes(prereqId)) {
                strokeColor = '#e9c46a';
            } else if (playerResearchedTechs.includes(prereqId) && (typeof hasPrerequisites === "function" && hasPrerequisites(playerResearchedTechs, tech.id))) {
                strokeColor = '#2a9d8f';
            }

            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', '2');
            svgLines.appendChild(line);
        });
    }
}

function _renderTechTreeNodes(container, playerResearchedTechs, layout) {
    for (const techId in TECHNOLOGY_TREE_DATA) {
        const tech = TECHNOLOGY_TREE_DATA[techId];
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('tech-node');
        nodeDiv.id = `tech-node-${tech.id}`;

        const screenPos = _toScreenPosition(tech, layout);
        nodeDiv.style.left = `${screenPos.x - (TECH_TREE_NODE_SIZE / 2)}px`;
        nodeDiv.style.top = `${screenPos.y - (TECH_TREE_NODE_SIZE / 2)}px`;

        const spriteSpan = document.createElement('span');
        spriteSpan.classList.add('tech-sprite');
        spriteSpan.textContent = tech.sprite || tech.name.substring(0, 3);
        nodeDiv.appendChild(spriteSpan);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = tech.name;
        nodeDiv.appendChild(nameSpan);

        const isResearched = playerResearchedTechs.includes(tech.id);
        const canBeResearched = typeof hasPrerequisites === "function" ? hasPrerequisites(playerResearchedTechs, tech.id) : false;
        if (isResearched) {
            nodeDiv.classList.add('researched');
        } else if (canBeResearched) {
            nodeDiv.classList.add('available');
        } else {
            nodeDiv.classList.add('locked');
        }

        nodeDiv.setAttribute('data-tech-id', tech.id);
        nodeDiv.style.cursor = 'pointer';
        nodeDiv.addEventListener('click', function(event) {
            event.stopPropagation();
            const techIdToOpen = this.getAttribute('data-tech-id');
            openTechDetailModal(techIdToOpen);
        });

        let tooltipText = `${tech.description || 'Sin descripcion.'}\nCosto: `;
        if (tech.cost) {
            if (tech.cost.researchPoints) tooltipText += `${tech.cost.researchPoints} Puntos Inv.`;
            else if (tech.cost.oro) tooltipText += `${tech.cost.oro} Oro`;
            else tooltipText += "N/A";
        } else {
            tooltipText += "N/A";
        }
        nodeDiv.title = tooltipText;
        container.appendChild(nodeDiv);
    }
}

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
    const layout = _computeTechTreeLayout(container);

    _renderTechTreeNodes(container, playerResearchedTechs, layout);
    _drawTechTreeConnections(container, playerResearchedTechs, layout);

    screen.style.display = 'flex';

    if (typeof AutoResearchManager !== 'undefined') {
        AutoResearchManager.updateTechTreeVisualization(currentPlayer);
    }
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

        if (techId === 'STATE_CENSUS') {
            gameState.censusActive = true;
        }
        if (techId === 'CONTRACT_CODIFICATION') {
            gameState.contractsCodified = true;
            gameState.corruptionModifier = 0.85;
        }

        // Refrescar impacto visual de tecnologías en el mapa (ej: caminos avanzados).
        if (typeof renderFullBoardVisualState === 'function') {
            renderFullBoardVisualState();
        }

        if (typeof UIManager !== 'undefined' && typeof UIManager.showMessageTemporarily === 'function') {
            UIManager.showMessageTemporarily(`Impacto visual activo: ${techToResearch.name}`, 2400, false);
        }

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

    const layout = _computeTechTreeLayout(container);
    _renderTechTreeNodes(container, playerResearchedTechs, layout);
    _drawTechTreeConnections(container, playerResearchedTechs, layout);
    
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
        const effectDescriptions = {
            STATE_CENSUS: 'Elimina variabilidad fiscal y muestra oro T+1',
            FORGE_STANDARDIZATION: 'Preparacion de refuerzo automatico cerca de infraestructura',
            CENTRAL_EQUIPMENT_POOL: 'Activa refuerzo automatico de regimientos (20%)',
            CONTRACT_CODIFICATION: 'Eventos de lealtad mayormente positivos y menor corrupcion',
            INFRASTRUCTURE_LOGISTICS: 'Recuperacion parcial de bajas en combate cerca de ciudad/fortaleza'
        };

        const unlocks = [
            ...(techData.unlocksUnits || []),
            ...(techData.unlocksStructures || [])
        ];
        if (effectDescriptions[techId]) unlocks.push(effectDescriptions[techId]);
        const unlocksText = unlocks.join(', ') || 'Ninguno';
        document.getElementById('techDetailUnlocks').textContent = unlocksText;
        
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
