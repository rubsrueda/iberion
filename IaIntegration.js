/**
 * IaIntegration.js
 * 
 * Módulo de integración entre DecisionEngine y AiGameplayManager.
 * Actúa como "puente" permitiendo que el motor de decisiones informe
 * la ejecución sin cambiar la estructura existente.
 * 
 * Responsabilidades:
 * 1. Llamar a DecisionEngine antes de ejecutar turno
 * 2. Cachear decisión + nodos prioritarios
 * 3. Proporcionar métodos para acceder a razon_texto durante ejecución
 * 
 * Estado: v1.0 - 2026-03-26
 * Autor: IA Unificación
 */

const IaIntegration = {

    // Cache de decisión actual
    currentDecision: null,
    currentPlayerNumber: null,
    nodosCache: [],

    /**
     * Evalúa el estado actual y cachea la decisión
     * Debe llamarse al inicio de cada turno IA
     * 
     * @param {number} playerNumber - Jugador activo
     * @returns {Promise<object>} Objeto decision cacheado
     */
    async inicializarTurnoConDecision(playerNumber) {
        console.log(`%c[IaIntegration] Inicializando turno ${gameState.turnNumber} para Jugador ${playerNumber}...`, "color: #FF8C00; font-weight: bold;");
        
        try {
            // Asegurar que DecisionEngine está disponible
            if (typeof IaDecisionEngine === 'undefined') {
                console.warn("[IaIntegration] DecisionEngine no disponible, continuando sin decisiones");
                return null;
            }

            // Evaluar estado completo
            const decision = await IaDecisionEngine.evaluarEstadoYTomarDecision(playerNumber);
            
            // Cachear para acceso durante ejecución
            this.currentDecision = decision;
            this.currentPlayerNumber = playerNumber;
            this.nodosCache = decision.nodos || [];

            // Log de situación
            if (decision.recomendacion) {
                console.log(`[IaIntegration] ✓ Decisión: ${decision.recomendacion.tipo} - ${decision.recomendacion.razon_texto}`);
            }

            if (decision.criteriosActivados.capitalAmenazada) {
                console.log(`[IaIntegration] ⚠️ Capital bajo amenaza - Aplicar protocolo`);
            }

            if (decision.criteriosActivados.crisisEconomica) {
                console.log(`[IaIntegration] ⚠️ Crisis económica - Priorizar recursos`);
            }

            console.log(`[IaIntegration] Top 3 prioridades:`, decision.prioritarios.slice(0, 3).map(n => 
                `${n.tipo}(${IaNodoValor.calcularPesoNodo(n, gameState, IaConfigManager.get()).toFixed(1)})`
            ).join(' > '));

            return decision;

        } catch (error) {
            console.error("[IaIntegration] Error inicializando decisión:", error);
            return null;
        }
    },

    /**
     * Obtiene la razón textual de una acción para un nodo
     * Usado durante ejecución de unidades para logging
     * 
     * @param {number} targetR - Fila objetivo
     * @param {number} targetC - Columna objetivo
     * @returns {string} razon_texto o string genérico
     */
    obtenerRazonAccion(targetR, targetC) {
        if (!this.nodosCache || this.nodosCache.length === 0) {
            return "Acción estratégica";
        }

        // Buscar nodo coincidente por coordenadas
        const nodoCoincidente = this.nodosCache.find(n => n.r === targetR && n.c === targetC);
        
        if (nodoCoincidente) {
            return nodoCoincidente.razon_texto;
        }

        // Fallback: encontrar nodo próximo
        const nodoProximo = this.nodosCache.reduce((closest, n) => {
            const dist = hexDistance(targetR, targetC, n.r, n.c);
            const closestDist = hexDistance(targetR, targetC, closest.r, closest.c);
            return dist < closestDist ? n : closest;
        });

        if (nodoProximo && hexDistance(targetR, targetC, nodoProximo.r, nodoProximo.c) <= 2) {
            return nodoProximo.razon_texto;
        }

        return "Movimiento exploratorio";
    },

    /**
     * Obtiene nodo prioritario para un tipo específico
     * 
     * @param {string} tipoNodo - Tipo de nodo (ej: 'ciudad_libre')
     * @returns {NodoValor|null}
     */
    obtenerNodoPrioritarioDelTipo(tipoNodo) {
        if (!this.nodosCache) return null;
        return this.nodosCache.find(n => n.tipo === tipoNodo) || null;
    },

    /**
     * Obtiene todos los nodos prioritarios (top-N)
     * 
     * @param {number} cantidad - Máximo número de nodos a retornar (default: 6)
     * @returns {NodoValor[]}
     */
    obtenerNodosPrioritarios(cantidad = 6) {
        if (!this.currentDecision) return [];
        return this.currentDecision.prioritarios.slice(0, cantidad);
    },

    /**
     * Comprueba si hay situación crítica activa
     * 
     * @returns {boolean} true si hay capital amenazada o crisis económica
     */
    hayEscenarioCritico() {
        if (!this.currentDecision) return false;
        return this.currentDecision.criteriosActivados.capitalAmenazada ||
               this.currentDecision.criteriosActivados.crisisEconomica;
    },

    /**
     * Obtiene la recomendación principal actual
     * 
     * @returns {object|null} Recomendación con tipo, objetivo, razon_texto
     */
    obtenerRecomendacionPrincipal() {
        if (!this.currentDecision) return null;
        return this.currentDecision.recomendacion;
    },

    /**
     * Limpia el cache después del turno
     */
    limpiarCache() {
        this.currentDecision = null;
        this.currentPlayerNumber = null;
        this.nodosCache = [];
    },

    /**
     * Estado de integración (para debugging)
     */
    obtenerStatus() {
        return {
            turnoActual: gameState.turnNumber,
            jugadorActual: this.currentPlayerNumber,
            nodosCacheados: this.nodosCache.length,
            tieneDecision: !!this.currentDecision,
            hayEscenarioCritico: this.hayEscenarioCritico(),
            recomendacion: this.currentDecision?.recomendacion?.tipo || null
        };
    }

};

console.log("[IaIntegration] Módulo de integración cargado. Función principal: inicializarTurnoConDecision(playerNumber)");
