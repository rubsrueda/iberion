// techScreenUI.js
console.log("techScreenUI.js CARGADO (Versión corregida con DOMContentLoaded)");

// ESPERAMOS A QUE TODO EL HTML ESTÉ LISTO ANTES DE EJECUTAR CUALQUIER COSA
document.addEventListener('DOMContentLoaded', () => {

    // Todas tus funciones van DENTRO de este bloque
    function openTechTreeScreen() {
        const screen = document.getElementById('techTreeScreen');
        const container = document.getElementById('techTreeContainer'); 

     console.log("--- LOG ESTADO --- techScreenUI.js -> openTechTreeScreen INICIO: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));

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

            if (isResearched) {
                nodeDiv.classList.add('researched');
            } else if (canBeResearched) {
                nodeDiv.classList.add('available');
            //nodeDiv.onclick = () => attemptToResearch(tech.id);
            //console.error(`¡INTENTO DE ABRIR MODAL DE DETALLE PARA ${techId}!`); 
            //nodeDiv.onclick = () => openTechDetailModal(tech.id);
            // En lugar de .onclick, usamos un addEventListener. Es más robusto.
            // Le damos un ID único al nodo para estar seguros de a qué nos unimos.
                nodeDiv.setAttribute('data-tech-id', tech.id);
            
                nodeDiv.addEventListener('click', function(event) {
                // Detenemos cualquier otro evento que pueda interferir
                    event.stopPropagation();
                
                // Obtenemos el ID de la tecnología desde el atributo que acabamos de poner
                    const techIdToOpen = this.getAttribute('data-tech-id');
                
                console.log(`Clic detectado en el nodo. Abriendo modal para: ${techIdToOpen}`);
                
                // Llamamos a la función
                    openTechDetailModal(techIdToOpen);
                });
            } else {
                nodeDiv.classList.add('locked');
            }
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
    }); 
    }

    function closeTechTreeScreen() {
        const screen = document.getElementById('techTreeScreen');
        if (screen) screen.style.display = 'none';
        console.log("[TechTree] Pantalla del árbol de tecnologías cerrada.");
        console.log("--- LOG ESTADO --- techScreenUI.js -> closeTechTreeScreen FIN: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));
    }

// ===== FUNCIÓN MODIFICADA PARA USAR UIManager.showMessageTemporarily =====
// En techScreenUI.js

    function attemptToResearch(techId) {
        console.log(`[AttemptResearch DEBUG] =======================================`);
        console.log("--- LOG ESTADO --- techScreenUI.js -> attemptToResearch INICIO: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));
        console.log(`[AttemptResearch DEBUG] Iniciando intento para: ${techId}`);
        
        const techToResearch = TECHNOLOGY_TREE_DATA[techId];
        
        if (!techToResearch || !gameState || !gameState.playerResources || !gameState.playerResources[gameState.currentPlayer]) {
            console.error("attemptToResearch: Faltan datos críticos para la investigación.");
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                UIManager.showMessageTemporarily("Error interno al investigar.", 4000, true);
            }
            return;
        }

        if (!techToResearch) {
            console.error(`[AttemptResearch DEBUG] ERROR: Datos de tecnología no encontrados para ID: ${techId}`);
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                UIManager.showMessageTemporarily(`Error: Tecnología ${techId} no encontrada.`, 4000, true);
            }
            return;
        }
        console.log(`[AttemptResearch DEBUG] Datos de techToResearch (${techId}):`, JSON.parse(JSON.stringify(techToResearch)));

        if (!gameState || !gameState.playerResources || !gameState.playerResources[gameState.currentPlayer]) {
            console.error(`[AttemptResearch DEBUG] ERROR: gameState o playerResources o recursos del jugador actual no definidos. gameState:`, gameState);
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                UIManager.showMessageTemporarily("Error interno: No se pueden verificar los recursos del jugador.", 4000, true);
            }
            return;
        }
        const playerResources = gameState.playerResources[gameState.currentPlayer];
        const playerTechs = playerResources.researchedTechnologies || [];
        console.log(`[AttemptResearch DEBUG] Jugador ${gameState.currentPlayer}. Tecnologías actuales:`, JSON.parse(JSON.stringify(playerTechs)));
        console.log(`[AttemptResearch DEBUG] Recursos actuales del jugador:`, JSON.parse(JSON.stringify(playerResources)));

        if (playerTechs.includes(techId)) {
            console.log(`[AttemptResearch DEBUG] Tecnología ${techId} ya investigada.`);
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                UIManager.showMessageTemporarily("Ya has investigado esta tecnología.", 3000, false);
            }
            return;
        }

        const prerequisitesMet = typeof hasPrerequisites === "function" ? hasPrerequisites(playerTechs, techId) : false;
        console.log(`[AttemptResearch DEBUG] Prerrequisitos para ${techId} cumplidos: ${prerequisitesMet}`);
        if (!prerequisitesMet) {
            console.log(`[AttemptResearch DEBUG] Falló prerrequisitos para ${techId}.`);
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                UIManager.showMessageTemporarily("No cumples los prerrequisitos para esta tecnología.", 3000, true);
            }
            return;
        }

        // Verificar costo
        let canAfford = true;
        let missingResourcesMsg = "No tienes suficientes recursos:";
        let detailedMissing = "";

        if (!techToResearch.cost || Object.keys(techToResearch.cost).length === 0) { // Comprobar si .cost existe y tiene claves
            console.warn(`[AttemptResearch DEBUG] La tecnología ${techId} no tiene definido un costo o el costo está vacío. Se investigará gratis.`);
            // No se cambia canAfford, se asume que es gratis si no hay costo
        } else {
            console.log(`[AttemptResearch DEBUG] Verificando costo para ${techId}. Costo definido:`, JSON.parse(JSON.stringify(techToResearch.cost)));
            for (const resourceKey in techToResearch.cost) {
                const costAmount = techToResearch.cost[resourceKey];
                const playerAmount = playerResources[resourceKey] || 0;
                console.log(`[AttemptResearch DEBUG] Recurso: ${resourceKey}, Necesita: ${costAmount}, Tiene: ${playerAmount}`);
                if (playerAmount < costAmount) {
                    canAfford = false;
                    detailedMissing += ` Necesitas ${costAmount} de ${resourceKey} (tienes ${playerAmount}).`;
                }
            }
            if (!canAfford) {
                missingResourcesMsg += detailedMissing;
                console.log(`[AttemptResearch DEBUG] No puede pagar. Mensaje: ${missingResourcesMsg}`);
            }
        }
        
        console.log(`[AttemptResearch DEBUG] ¿Puede pagar ${techId}?: ${canAfford}`);
        if (!canAfford) {
            if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
                console.log(`[AttemptResearch DEBUG] Mostrando mensaje de UI: ${missingResourcesMsg}`);
                UIManager.showMessageTemporarily(missingResourcesMsg, 4000, true);
            } else { 
                console.log(`[AttemptResearch DEBUG] (UIManager no disponible) ${missingResourcesMsg}`);
            }
            return;
        }

        // Si todo OK: Deducir costos y añadir tecnología
        console.log(`[AttemptResearch DEBUG] Procediendo a deducir costos para ${techId}.`);
        if (techToResearch.cost) {
            for (const resourceKey in techToResearch.cost) {
                playerResources[resourceKey] -= techToResearch.cost[resourceKey];
                console.log(`[AttemptResearch DEBUG] Deducido ${techToResearch.cost[resourceKey]} de ${resourceKey}. Nuevo total: ${playerResources[resourceKey]}`);
            }
        }

        playerTechs.push(techId);
        if (gameState.isTutorialActive) gameState.tutorial.techResearched = true;
        logMessage(`¡Has investigado ${techToResearch.name}!`);
        const successMessage = `¡Has investigado ${techToResearch.name}!`;

        console.log(`[AttemptResearch DEBUG] ¡INVESTIGADO! ${techToResearch.name}. Nuevas tecnologías:`,  JSON.parse(JSON.stringify(playerTechs)));
        
        if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) {
            UIManager.showMessageTemporarily(successMessage, 3000, false);
        } else { console.log(successMessage); }
        
        console.log(`[AttemptResearch DEBUG] Refrescando árbol y UI general.`);

        refreshTechTreeContent();

        if (typeof populateAvailableRegimentsForModal === "function") {
            populateAvailableRegimentsForModal();
        }

        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
        console.log("--- LOG ESTADO --- techScreenUI.js -> attemptToResearch DESPUÉS DE PUSH: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));
        console.log(`[AttemptResearch DEBUG] FIN de intento para: ${techId}`);
        console.log(`[AttemptResearch DEBUG] =======================================`);

    }

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

        // --- LA PARTE IMPORTANTE, AHORA ESTÁ IGUAL QUE EN LA OTRA FUNCIÓN ---
        const isResearched = playerResearchedTechs.includes(tech.id);
        const canBeResearched = hasPrerequisites(playerResearchedTechs, tech.id);
        if (isResearched) { 
            nodeDiv.classList.add('researched');
        } else if (canBeResearched) { 
            nodeDiv.classList.add('available');
            
            // Asignamos el Event Listener correcto, igual que en la otra función
            nodeDiv.setAttribute('data-tech-id', tech.id);
            nodeDiv.addEventListener('click', function(event) {
                event.stopPropagation();
                const techIdToOpen = this.getAttribute('data-tech-id');
                openTechDetailModal(techIdToOpen);
            });
        } else { 
            nodeDiv.classList.add('locked');
        }
        
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
}

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
    attemptToResearch(techId);
}
    
    /**
     * Abre el modal de detalle para una tecnología específica.
     * @param {string} techId - El ID de la tecnología en la que se hizo clic.
     */
    function openTechDetailModal(techId) {
        const techData = TECHNOLOGY_TREE_DATA[techId];
    const modal = document.getElementById('techDetailModal');

    // --- LÍNEA AÑADIDA PARA DEPURAR ---
    console.log("Referencia al elemento del modal:", modal);

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
    
    // --- 2. Configurar el botón de "Investigar" ---
    const researchBtn = document.getElementById('researchTechBtn');
    const playerResources = gameState.playerResources[gameState.currentPlayer];
    const canAfford = playerResources.researchPoints >= cost;

    // Habilitar o deshabilitar el botón según si se puede pagar
    researchBtn.disabled = !canAfford;

    // Asignar la acción al botón. Usamos .onclick para reemplazar cualquier listener anterior.
    researchBtn.onclick = () => {
        // Llamar a la función que ya tenías y que funciona perfectamente
        attemptToResearch(techId);
        
        // Cerrar este modal de detalle
        modal.style.display = 'none';

        // NO cerramos el árbol principal, así el jugador ve el cambio.
    };

    // Configurar el botón de cierre (la 'x')
    document.getElementById('closeTechDetailBtn').onclick = () => {
        modal.style.display = 'none';
    };

    // --- 3. Mostrar el modal ---
    console.log("Intentando mostrar el modal de detalle. Elemento:", modal);
        modal.style.display = 'flex';
        console.log("Estilo 'display' cambiado a 'flex'. El modal debería estar visible.");
    }

    // HACEMOS LAS FUNCIONES GLOBALES para que otros scripts puedan llamarlas si es necesario
    window.openTechTreeScreen = openTechTreeScreen;
    window.closeTechTreeScreen = closeTechTreeScreen;
    window.attemptToResearch = attemptToResearch;
    window.refreshTechTreeContent = refreshTechTreeContent;

}); // Fin del DOMContentLoaded