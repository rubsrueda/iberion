// autoResearchManager.js
// Sistema de Auto-Investigación: planifica y ejecuta automáticamente un camino de investigación

const AutoResearchManager = {
    // Estado del sistema
    activeResearchPlans: {}, // { playerId: { targetTech, plannedPath: [], currentStep: 0 } }
    
    /**
     * Inicializa el sistema
     */
    init() {
    },
    
    /**
     * Activa un plan de investigación para llegar a una tecnología objetivo
     */
    activateResearchPlan(playerId, targetTechId) {
        if (!TECHNOLOGY_TREE_DATA[targetTechId]) {
            console.error(`[AutoResearch] ❌ Tecnología ${targetTechId} no existe`);
            logMessage("Tecnología no encontrada", "error");
            return false;
        }
        
        const playerResources = gameState.playerResources[playerId];
        if (!playerResources) {
            console.error(`[AutoResearch] ❌ Recursos del jugador ${playerId} no encontrados`);
            return false;
        }
        
        const playerTechs = playerResources.researchedTechnologies || [];
        
        // Verificar si ya está investigada
        if (playerTechs.includes(targetTechId)) {
            logMessage("Esta tecnología ya está investigada", "info");
            return false;
        }
        
        // Calcular el camino de investigación necesario
        const researchPath = this.calculateResearchPath(playerTechs, targetTechId);
        
        if (!researchPath || researchPath.length === 0) {
            logMessage("No se puede alcanzar esta tecnología", "error");
            console.error(`[AutoResearch] ❌ No se encontró camino válido para ${targetTechId}`);
            return false;
        }
        
        // Guardar el plan
        this.activeResearchPlans[playerId] = {
            targetTech: targetTechId,
            plannedPath: researchPath,
            currentStep: 0,
            activated: true
        };

        logMessage(`Plan de investigación activado: ${researchPath.length} tecnología${researchPath.length > 1 ? 's' : ''} hasta ${TECHNOLOGY_TREE_DATA[targetTechId].name}`, "success");
        
        // Actualizar UI del árbol tecnológico si está abierto
        this.updateTechTreeVisualization(playerId);
        
        return true;
    },
    
    /**
     * Calcula el camino de investigación necesario desde el estado actual hasta el objetivo
     */
    calculateResearchPath(currentTechs, targetTechId) {
        const visited = new Set(currentTechs);
        const path = [];
        
        // BFS para encontrar todas las tecnologías necesarias
        const queue = [targetTechId];
        const parents = {}; // Para reconstruir el camino
        const allNeeded = new Set();
        
        while (queue.length > 0) {
            const techId = queue.shift();
            
            if (visited.has(techId)) continue;
            
            allNeeded.add(techId);
            const tech = TECHNOLOGY_TREE_DATA[techId];
            
            if (tech && tech.prerequisites && tech.prerequisites.length > 0) {
                for (const prereqId of tech.prerequisites) {
                    if (!visited.has(prereqId)) {
                        queue.push(prereqId);
                        if (!parents[prereqId]) {
                            parents[prereqId] = techId;
                        }
                    }
                }
            }
        }
        
        // Ordenar las tecnologías por dependencias (de prerequisitos a objetivo)
        const sortedPath = this.topologicalSort([...allNeeded]);
        return sortedPath;
    },
    
    /**
     * Ordena topológicamente las tecnologías (prerequisitos primero)
     */
    topologicalSort(techIds) {
        const result = [];
        const visited = new Set();
        const visiting = new Set();
        
        const visit = (techId) => {
            if (visited.has(techId)) return;
            if (visiting.has(techId)) {
                console.warn(`[AutoResearch] ⚠️ Dependencia circular detectada en ${techId}`);
                return;
            }
            
            visiting.add(techId);
            const tech = TECHNOLOGY_TREE_DATA[techId];
            
            if (tech && tech.prerequisites) {
                for (const prereqId of tech.prerequisites) {
                    if (techIds.includes(prereqId)) {
                        visit(prereqId);
                    }
                }
            }
            
            visiting.delete(techId);
            visited.add(techId);
            result.push(techId);
        };
        
        for (const techId of techIds) {
            visit(techId);
        }
        
        return result;
    },
    
    /**
     * Cancela el plan de investigación activo
     */
    cancelResearchPlan(playerId) {
        if (!this.activeResearchPlans[playerId]) {
            return;
        }
        
        const plan = this.activeResearchPlans[playerId];
        logMessage("Plan de investigación cancelado", "info");
        
        delete this.activeResearchPlans[playerId];
        this.updateTechTreeVisualization(playerId);
    },
    
    /**
     * Procesa los planes de investigación activos al inicio de cada turno
     */
    processAutoResearch(playerId) {
        const plan = this.activeResearchPlans[playerId];
        if (!plan || !plan.activated) return;
        
        const playerResources = gameState.playerResources[playerId];
        if (!playerResources) return;
        
        const playerTechs = playerResources.researchedTechnologies || [];
        
        // Verificar si el plan ya se completó
        if (playerTechs.includes(plan.targetTech)) {
            logMessage(`¡Plan de investigación completado! ${TECHNOLOGY_TREE_DATA[plan.targetTech].name} investigada`, "success");
            delete this.activeResearchPlans[playerId];
            this.updateTechTreeVisualization(playerId);
            return;
        }
        
        // Encontrar la siguiente tecnología a investigar
        let nextTech = null;
        for (const techId of plan.plannedPath) {
            if (!playerTechs.includes(techId)) {
                // Verificar que tenga los prerequisitos
                if (hasPrerequisites(playerTechs, techId)) {
                    nextTech = techId;
                    break;
                }
            }
        }
        
        if (!nextTech) {
            console.warn(`[AutoResearch] ⚠️ No se encontró siguiente tecnología en el plan`);
            return;
        }
        
        // Verificar si tenemos recursos suficientes
        const tech = TECHNOLOGY_TREE_DATA[nextTech];
        let canAfford = true;
        
        for (const resourceKey in tech.cost) {
            if ((playerResources[resourceKey] || 0) < tech.cost[resourceKey]) {
                canAfford = false;
                break;
            }
        }
        
        if (!canAfford) {
            // No hay suficientes recursos, esperar al próximo turno
            return;
        }
        
        // ¡Investigar!
        // Restar recursos
        for (const resourceKey in tech.cost) {
            playerResources[resourceKey] -= tech.cost[resourceKey];
        }
        
        // Agregar tecnología
        playerTechs.push(nextTech);
        
        // Actualizar plan
        plan.currentStep++;
        
        // Notificar al jugador
        logMessage(`Auto-investigación: ${tech.name} completada (${plan.currentStep}/${plan.plannedPath.length})`, "success");
        
        // Actualizar UI
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
        
        this.updateTechTreeVisualization(playerId);
    },
    
    /**
     * Actualiza la visualización del árbol tecnológico para mostrar el plan activo
     */
    updateTechTreeVisualization(playerId) {
        const plan = this.activeResearchPlans[playerId];
        const techTreeScreen = document.getElementById('techTreeScreen');
        
        // Solo actualizar si el árbol está visible
        if (!techTreeScreen || techTreeScreen.style.display !== 'flex') {
            return;
        }
        
        // Limpiar marcadores previos
        document.querySelectorAll('.auto-research-marker').forEach(el => el.remove());
        
        if (!plan) return;
        
        // Marcar las tecnologías en el plan
        const playerTechs = gameState.playerResources[playerId]?.researchedTechnologies || [];
        
        plan.plannedPath.forEach((techId, index) => {
            const nodeEl = document.getElementById(`tech-node-${techId}`);
            if (!nodeEl) return;
            
            const isCompleted = playerTechs.includes(techId);
            
            // Crear marcador
            const marker = document.createElement('div');
            marker.classList.add('auto-research-marker');
            marker.style.position = 'absolute';
            marker.style.top = '-10px';
            marker.style.right = '-10px';
            marker.style.width = '24px';
            marker.style.height = '24px';
            marker.style.borderRadius = '50%';
            marker.style.display = 'flex';
            marker.style.alignItems = 'center';
            marker.style.justifyContent = 'center';
            marker.style.fontSize = '12px';
            marker.style.fontWeight = 'bold';
            marker.style.zIndex = '10';
            marker.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            
            if (isCompleted) {
                marker.style.background = '#4CAF50';
                marker.style.color = 'white';
                marker.textContent = '✓';
            } else if (techId === plan.targetTech) {
                marker.style.background = '#FF9800';
                marker.style.color = 'white';
                marker.textContent = '🎯';
                marker.style.animation = 'pulse 2s infinite';
            } else {
                marker.style.background = '#2196F3';
                marker.style.color = 'white';
                marker.textContent = (index + 1).toString();
            }
            
            nodeEl.style.position = 'relative';
            nodeEl.appendChild(marker);
        });
        
        // NO mostrar el banner de información del plan (ocupa mucho espacio en móviles)
        // this.showPlanInfo(playerId);
    },
    
    /**
     * Muestra información del plan activo en la pantalla del árbol tecnológico
     */
    showPlanInfo(playerId) {
        const plan = this.activeResearchPlans[playerId];
        if (!plan) {
            // Remover info si existe
            const existingInfo = document.getElementById('autoResearchPlanInfo');
            if (existingInfo) existingInfo.remove();
            return;
        }
        
        let infoDiv = document.getElementById('autoResearchPlanInfo');
        if (!infoDiv) {
            infoDiv = document.createElement('div');
            infoDiv.id = 'autoResearchPlanInfo';
            infoDiv.style.position = 'fixed';
            infoDiv.style.top = '80px';
            infoDiv.style.left = '50%';
            infoDiv.style.transform = 'translateX(-50%)';
            infoDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            infoDiv.style.color = 'white';
            infoDiv.style.padding = '15px 25px';
            infoDiv.style.borderRadius = '10px';
            infoDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            infoDiv.style.zIndex = '1001';
            infoDiv.style.fontSize = '14px';
            infoDiv.style.fontWeight = 'bold';
            infoDiv.style.maxWidth = '600px';
            infoDiv.style.textAlign = 'center';
            document.body.appendChild(infoDiv);
        }
        
        const targetTech = TECHNOLOGY_TREE_DATA[plan.targetTech];
        const playerTechs = gameState.playerResources[playerId]?.researchedTechnologies || [];
        const completed = plan.plannedPath.filter(t => playerTechs.includes(t)).length;
        
        infoDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
                🔬 <strong>Plan de Investigación Activo</strong>
            </div>
            <div style="font-size: 13px; margin-bottom: 8px;">
                Objetivo: ${targetTech.name} ${targetTech.sprite}
            </div>
            <div style="font-size: 12px; opacity: 0.9;">
                Progreso: ${completed}/${plan.plannedPath.length} tecnologías completadas
            </div>
            <button onclick="AutoResearchManager.cancelResearchPlan(${playerId})" style="
                margin-top: 10px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
            ">❌ Cancelar Plan</button>
        `;
    },
    
    /**
     * Verifica si hay un plan activo para un jugador
     */
    hasActivePlan(playerId) {
        return !!this.activeResearchPlans[playerId];
    },
    
    /**
     * Obtiene el plan activo de un jugador
     */
    getActivePlan(playerId) {
        return this.activeResearchPlans[playerId];
    }
};

// CSS para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
    
    .auto-research-marker {
        pointer-events: none;
    }
`;
document.head.appendChild(style);

