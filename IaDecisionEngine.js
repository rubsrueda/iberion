/**
 * IaDecisionEngine.js
 * 
 * Motor integrado de decisiones basado en Nodos de Valor.
 * Conecta: Detector → Calculador → Matriz de Desempates → Recomendación
 * 
 * Implementa: IA_UNIFICACION_ESPECIFICACION_TECNICA.md §2.3 Fases Internas
 * 
 * Estado: v1.0 - 2026-03-26
 * Autor: IA Unificación
 */

const IaDecisionEngine = {

    /**
     * Función principal: Evalúa el estado y retorna los mejores nodos prioritarios
     * Este es el "cerebro" de la IA unificada.
     * 
     * Fases (según §2.3):
     * FASE A — Lectura de estado
     * FASE B — Evaluación estratégica
     * FASE C — Planificación
     * FASE D — Ejecución (delegada a AiGameplayManager)
     * FASE E — Cierre
     * 
     * @param {number} playerNumber - Jugador activo
     * @returns {Promise<object>} Objeto con recomendaciones y estado
     */
    async evaluarEstadoYTomarDecision(playerNumber) {
        console.group(`%c[IaDecision] Evaluando estado para Jugador ${playerNumber}...`, "color: #4CAF50; font-weight: bold;");

        try {
            // FASE A: Lectura de estado
            console.log("[IaDecision] === FASE A: Lectura de Estado ===");
            const config = IaConfigManager.get() || {};
            const snapshot = {
                turnNumber: gameState.turnNumber,
                playerNumber,
                oro: gameState.playerResources?.[playerNumber]?.oro || 0,
                unidades: units.filter(u => u.player === playerNumber && u.currentHealth > 0).length,
                ciudades: gameState.cities?.filter(c => c.owner === playerNumber).length || 0
            };
            console.log(`[IaDecision] Snapshot: oro=${snapshot.oro}, unidades=${snapshot.unidades}, ciudades=${snapshot.ciudades}`);

            // FASE B: Evaluación estratégica
            console.log("[IaDecision] === FASE B: Evaluación Estratégica ===");
            
            // B1. Detectar amenaza a ciudad natal
            console.log("[IaDecision] B1. Detectando amenaza a capital...");
            const capitalAmenazada = IaNodoValor.esCiudadNatalAmenazada(playerNumber);
            if (capitalAmenazada) {
                console.log("[IaDecision] ⚠️ CRÍTICO: Capital bajo amenaza. Activando Protocolo Nivel 0");
                const recomendacion = this._ejecutarProtocoloCapital(playerNumber);
                console.groupEnd();
                return recomendacion;
            }

            // B2. Evaluar salud económica
            console.log("[IaDecision] B2. Evaluando economía...");
            const umbralEconomica = config.umbrales?.economia_critica || 400;
            const estaEnCrisisEconomica = snapshot.oro < umbralEconomica;
            if (estaEnCrisisEconomica) {
                console.log(`[IaDecision] ⚠️ CRISIS: Oro=${snapshot.oro} < umbral=${umbralEconomica}`);
            }

            // B3. Identificar nodos de valor
            console.log("[IaDecision] B3. Identificando Nodos de Valor...");
            const nodosDetectados = IaDetectorNodos.detectarNodosDeValor(playerNumber, config);
            const nodosConCorredor = this._agregarNodoDerivadoCorredor(nodosDetectados, playerNumber, config);
            const nodos = this._agregarNodoCrearCaravana(nodosConCorredor, playerNumber, config);
            if (nodos.length === 0) {
                console.warn("[IaDecision] ⚠️ No se detectaron nodos de valor");
                console.groupEnd();
                return { 
                    recomendacion: null, 
                    razon: "Sin nodos detectados",
                    nodos: [],
                    prioritarios: []
                };
            }

            // FASE C: Planificación
            console.log("[IaDecision] === FASE C: Planificación ===");
            
            // C1. Ordenar nodos (ya hecho en detectarNodosDeValor)
            console.log(`[IaDecision] C1. Nodos ordenados: ${nodos.length} totales`);

            // C2. Generar misiones desde nodos top-N
            const maxMisiones = config.max_misiones_por_turno || 6;
            const nodosTop = nodos.slice(0, maxMisiones);
            console.log(`[IaDecision] C2. Generando misiones de top-${nodosTop.length} nodos`);
            
            // C3. Generar recomendación principal
            const nodoPrincipal = nodosTop[0];
            const recomendacionPrincipal = this._generarMisionDesdeNodo(nodoPrincipal, playerNumber);

            // FASE D: Ejecución (se delega a AiGameplayManager, no aquí)
            console.log("[IaDecision] === FASE D: Preparación para Ejecución ===");
            console.log(`[IaDecision] Recomendación: ${recomendacionPrincipal.tipo} - ${recomendacionPrincipal.razon_texto}`);

            // FASE E: Cierre
            console.log("[IaDecision] === FASE E: Cierre ===");
            console.log("[IaDecision] ✓ Evaluación completada");

            console.groupEnd();

            return {
                recomendacion: recomendacionPrincipal,
                nodos,
                prioritarios: nodosTop,
                snapshot,
                criteriosActivados: {
                    capitalAmenazada,
                    crisisEconomica: estaEnCrisisEconomica
                }
            };

        } catch (error) {
            console.error("[IaDecision] Error en evaluación:", error);
            console.groupEnd();
            return { 
                error: error.message,
                recomendacion: null 
            };
        }
    },

    /**
     * Protocolo de defensa capital (Nivel 0 — Matriz §3.2)
     * @private
     */
    _ejecutarProtocoloCapital(playerNumber) {
        console.group("%c[IaDecision] PROTOCOLO DEFENSA CAPITAL", "color: #FF0000; font-weight: bold;");
        
        const capital = gameState.cities?.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital) {
            console.log("[IaDecision] Capital no encontrada (error crítico)");
            console.groupEnd();
            return null;
        }

        // Evaluar opción 1: Cambiar capital
        const capitalAlternativa = gameState.cities?.find(c => 
            c.owner === playerNumber && !c.isCapital && 
            hexDistance(c.r, c.c, ...this._encontrarAmenaza(playerNumber)) > 3
        );

        if (capitalAlternativa) {
            console.log(`[IaDecision] Opción 1: Cambiar capital a ${capitalAlternativa.name}`);
            console.groupEnd();
            return {
                tipo: 'cambiar_capital',
                objetivo: capitalAlternativa,
                razon_texto: `Cambiar capital a ${capitalAlternativa.name} - Alejarse de amenaza`,
                accion: 'CAMBIAR_CAPITAL',
                prioridad: 'CRÍTICA'
            };
        }

        // Opción 2: Producir emergencia
        console.log(`[IaDecision] Opción 2: Producir defensa emergencia`);
        console.groupEnd();
        return {
            tipo: 'defensa_emergencia',
            objetivo: capital,
            razon_texto: `Producir división de emergencia en capital`,
            accion: 'PRODUCIR_EMERGENCIA',
            prioridad: 'CRÍTICA'
        };
    },

    /**
     * Encuentra ubicación de amenaza
     * @private
     */
    _encontrarAmenaza(playerNumber) {
        const enemigos = units.filter(u => u.player !== playerNumber && u.currentHealth > 0);
        if (enemigos.length === 0) return [0, 0];
        return [enemigos[0].r, enemigos[0].c];
    },

    /**
     * Genera una misión desde un nodo prioritario
     * @private
     */
    _generarMisionDesdeNodo(nodo, playerNumber) {
        if (!nodo) return null;

        // Categorizar nodo en tipo de misión
        const tipoMision = this._clasificarMision(nodo);

        return {
            // Información del nodo
            nodo_id: nodo.id,
            nodo_tipo: nodo.tipo,
            
            // Información de misión
            tipo: tipoMision,
            objetivo: { r: nodo.r, c: nodo.c },
            razon_texto: nodo.razon_texto,
            
            // Metadata
            turnCreated: gameState.turnNumber,
            prioridad: this._calcularPrioridad(nodo),
            peso: IaNodoValor.calcularPesoNodo(nodo, gameState, IaConfigManager.get())
        };
    },

    /**
     * Clasifica tipo de misión según tipo de nodo
     * @private
     */
    _clasificarMision(nodo) {
        const mapaTipos = {
            'ciudad_natal_propia': 'DEFENDC',
            'ultima_unidad_propia': 'PRESERV',
            'ciudad_propia_conectada': 'MANTENER',
            'ciudad_propia_desconectada': 'RECONECTAR',
            'banca': 'ACCEDER',
            'ciudad_libre': 'CAPTURAR',
            'camino_propio_critico': 'DEFENDER',
            'camino_enemigo_critico': 'SABOTAJE',
            'caravana_propia': 'ESCUNDAR',
            'crear_caravana': 'COMERCIAR',
            'caravana_enemiga': 'DESTRUIR',
            'recurso_estrategico': 'MINAR',
            'ciudad_enemiga': 'ASEDIAR',
            'cuello_botella': 'CONTROLAR',
            'sitio_aldea': 'FUNDAR',
            'sitio_desembarco': 'DESEMBARCAR',
            'fortaleza_a_construir': 'FORTIFICAR',
            'ciudad_barbara': 'EXPEDICIONAR'
        };
        return mapaTipos[nodo.tipo] || 'EXPLORAR';
    },

    /**
     * Calcula prioridad (CRÍTICA, ALTA, MEDIA, BAJA)
     * @private
     */
    _calcularPrioridad(nodo) {
        if (nodo.tipo === 'crear_caravana') return 'ALTA';
        if (nodo.valor_supervivencia > 400) return 'CRÍTICA';
        if (nodo.valor_supervivencia > 50 || nodo.valor_control > 80) return 'ALTA';
        if (nodo.valor_economico > 80 || nodo.valor_sabotaje > 70) return 'MEDIA';
        return 'BAJA';
    },

    _agregarNodoDerivadoCorredor(nodos, playerNumber, config) {
        if (!Array.isArray(nodos) || nodos.length === 0) return nodos || [];

        const topN = Math.min(5, nodos.length);
        const top = nodos.slice(0, topN);
        const capital = top.find(n => n.tipo === 'ciudad_natal_propia');
        const economia = top.find(n => n.tipo === 'banca' || n.tipo === 'ciudad_libre');
        if (!capital || !economia) return nodos;

        const distancia = hexDistance(capital.r, capital.c, economia.r, economia.c);
        const yaConectados = distancia <= 2;
        if (yaConectados) return nodos;

        const pesoBase = config?.nodos?.corredor_comercial?.peso_base ?? 170;
        const corredor = IaNodoValor.crearNodo({
            tipo: 'corredor_comercial',
            propietario: playerNumber,
            valor_base: pesoBase,
            valor_economico: 150,
            valor_supervivencia: 20,
            valor_sabotaje: 0,
            valor_control: 120,
            r: economia.r,
            c: economia.c,
            origen: { r: capital.r, c: capital.c },
            destino: { r: economia.r, c: economia.c },
            razon_texto: `Corredor comercial: ${capital.tipo} -> ${economia.tipo}`
        });

        return IaNodoValor.ordenarNodosPorPeso([...nodos, corredor], { playerNumber, gameState, config }, config);
    },

    _agregarNodoCrearCaravana(nodos, playerNumber, config) {
        if (!Array.isArray(nodos) || nodos.length === 0) return nodos || [];

        const corredor = gameState.ai_corridor_status?.[playerNumber];
        if (!corredor?.operational) return nodos;

        const yaTieneRuta = units.some(u => u.player === playerNumber && !!u.tradeRoute);
        if (yaTieneRuta) return nodos;

        const capital = gameState.cities?.find(c => c.isCapital && c.owner === playerNumber);
        const banco = gameState.cities?.find(c => c.owner === 0);
        const ciudadesPropias = gameState.cities?.filter(c => c.owner === playerNumber) || [];
        const tieneDestinoComercial = !!banco || ciudadesPropias.length >= 2;
        if (!capital || !tieneDestinoComercial) return nodos;

        const crearCaravana = IaNodoValor.crearNodo({
            tipo: 'crear_caravana',
            propietario: playerNumber,
            valor_base: config?.nodos?.crear_caravana?.peso_base ?? 190,
            valor_economico: 220,
            valor_supervivencia: 10,
            valor_sabotaje: 0,
            valor_control: 90,
            r: capital.r,
            c: capital.c,
            razon_texto: 'Corredor operativo - activar nueva caravana comercial'
        });

        return IaNodoValor.ordenarNodosPorPeso([...nodos, crearCaravana], { playerNumber, gameState, config }, config);
    }

};

console.log("[IaDecision] Motor de Decisiones cargado. Función principal: evaluarEstadoYTomarDecision(playerNumber)");
