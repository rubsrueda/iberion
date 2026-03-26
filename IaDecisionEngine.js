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
                ciudades: gameState.cities?.filter(c => c.owner === playerNumber).length || 0,
                rutasComerciales: units.filter(u => u.player === playerNumber && !!u.tradeRoute).length
            };
            console.log(`[IaDecision] Snapshot: oro=${snapshot.oro}, unidades=${snapshot.unidades}, ciudades=${snapshot.ciudades}, rutas=${snapshot.rutasComerciales}`);

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

            const contextoEstrategico = this._construirContextoEstrategico(snapshot, {
                capitalAmenazada,
                crisisEconomica: estaEnCrisisEconomica
            });
            const configEvaluacion = this._construirConfigContextual(config, contextoEstrategico);
            console.log(`[IaDecision] Contexto=${contextoEstrategico.fase} mult={econ:${configEvaluacion.contexto_actual.multiplicadores.economia}, sab:${configEvaluacion.contexto_actual.multiplicadores.sabotaje}, surv:${configEvaluacion.contexto_actual.multiplicadores.supervivencia}}`);

            // B3. Identificar nodos de valor
            console.log("[IaDecision] B3. Identificando Nodos de Valor...");
            const nodosDetectados = IaDetectorNodos.detectarNodosDeValor(playerNumber, configEvaluacion);
            const nodosConCorredor = this._agregarNodoDerivadoCorredor(nodosDetectados, playerNumber, configEvaluacion, contextoEstrategico);
            const nodos = this._agregarNodoCrearCaravana(nodosConCorredor, playerNumber, configEvaluacion, contextoEstrategico);
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
            const nodosTopConPeso = nodosTop.map(nodo => ({
                ...nodo,
                peso: IaNodoValor.calcularPesoNodo(nodo, { playerNumber, gameState, config: configEvaluacion, contextoEstrategico }, configEvaluacion)
            }));
            console.log(`[IaDecision] C2. Generando misiones de top-${nodosTop.length} nodos`);
            
            // C3. Generar recomendación principal
            const nodoPrincipal = this._seleccionarNodoPrincipal(nodosTopConPeso, {
                capitalAmenazada,
                crisisEconomica: estaEnCrisisEconomica,
                fase: contextoEstrategico.fase
            });
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
                prioritarios: nodosTopConPeso,
                snapshot,
                contextoEstrategico,
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
            peso: IaNodoValor.calcularPesoNodo(nodo, { playerNumber, gameState, config: IaConfigManager.get() }, IaConfigManager.get())
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

    _agregarNodoDerivadoCorredor(nodos, playerNumber, config, contextoEstrategico = null) {
        if (!Array.isArray(nodos) || nodos.length === 0) return nodos || [];

        const capitalCity = gameState.cities?.find(c => c.isCapital && c.owner === playerNumber);
        if (!capitalCity) return nodos;

        const capital = nodos.find(n => n.tipo === 'ciudad_natal_propia') || IaNodoValor.crearNodo({
            tipo: 'ciudad_natal_propia',
            propietario: playerNumber,
            valor_base: 10,
            valor_economico: 0,
            valor_supervivencia: 0,
            valor_sabotaje: 0,
            valor_control: 0,
            r: capitalCity.r,
            c: capitalCity.c,
            razon_texto: `Capital propia (${capitalCity.name || 'Capital'})`
        });

        const candidatosEconomicos = nodos.filter(n => n.tipo === 'banca' || n.tipo === 'ciudad_libre');
        if (candidatosEconomicos.length === 0) {
            console.log('[IaDecision] Corredor comercial descartado: sin candidatos economicos');
            return nodos;
        }

        const economia = candidatosEconomicos
            .slice()
            .sort((a, b) => this._scoreEconomicTargetForCorridor(playerNumber, b, capital, contextoEstrategico) - this._scoreEconomicTargetForCorridor(playerNumber, a, capital, contextoEstrategico))[0];
        if (!economia) {
            console.log('[IaDecision] Corredor comercial descartado: sin objetivo economico elegido');
            return nodos;
        }

        const distancia = hexDistance(capital.r, capital.c, economia.r, economia.c);
        const yaConectados = distancia <= 2;
        if (yaConectados) {
            console.log(`[IaDecision] Corredor comercial descartado: capital ya conectada a ${economia.tipo} en dist=${distancia}`);
            return nodos;
        }

        const faseApertura = contextoEstrategico?.fase === 'apertura';
        const pesoBase = config?.nodos?.corredor_comercial?.peso_base ?? 170;
        const destinoTipo = economia.tipo;
        const corredor = IaNodoValor.crearNodo({
            tipo: 'corredor_comercial',
            propietario: playerNumber,
            valor_base: pesoBase + (faseApertura ? 60 : 0),
            valor_economico: 150 + (faseApertura ? 90 : 0),
            valor_supervivencia: 20,
            valor_sabotaje: 0,
            valor_control: 120 + (faseApertura ? 40 : 0),
            r: economia.r,
            c: economia.c,
            origen: { r: capital.r, c: capital.c },
            destino: { r: economia.r, c: economia.c },
            destino_tipo: destinoTipo,
            razon_texto: `Corredor comercial: ${capital.tipo} -> ${economia.tipo}`
        });

        console.log(`[IaDecision] Corredor comercial generado: destino=${economia.tipo} (${economia.r},${economia.c}) dist=${distancia} fase=${contextoEstrategico?.fase || 'normal'}`);

        return IaNodoValor.ordenarNodosPorPeso([...nodos, corredor], { playerNumber, gameState, config }, config);
    },

    _scoreEconomicTargetForCorridor(playerNumber, nodoEconomico, capital, contextoEstrategico) {
        const distancia = hexDistance(capital.r, capital.c, nodoEconomico.r, nodoEconomico.c);
        const rutasActivas = units.filter(u => u.player === playerNumber && !!u.tradeRoute).length;
        const ciudadesPropias = gameState.cities?.filter(c => c.owner === playerNumber).length || 0;
        const rutaConstruible = this._isRoadPathConstructible(
            { r: capital.r, c: capital.c },
            { r: nodoEconomico.r, c: nodoEconomico.c }
        );
        if (!rutaConstruible) return -99999;

        const baseTipo = nodoEconomico.tipo === 'banca'
            ? (rutasActivas === 0 ? 620 : 160)
            : (ciudadesPropias < 2 ? 320 : 240);
        const bonusApertura = contextoEstrategico?.fase === 'apertura' ? 120 : 0;
        const bonusPersistencia = rutasActivas > 0 && nodoEconomico.tipo === 'ciudad_libre' ? 120 : 0;
        return baseTipo + bonusApertura + bonusPersistencia - distancia * 12 + (nodoEconomico.valor_control || 0) * 0.5;
    },

    _agregarNodoCrearCaravana(nodos, playerNumber, config, contextoEstrategico = null) {
        if (!Array.isArray(nodos) || nodos.length === 0) return nodos || [];

        const corredor = gameState.ai_corridor_status?.[playerNumber];
        if (!corredor?.operational) return nodos;

        const ciudadesPropias = gameState.cities?.filter(c => c.owner === playerNumber) || [];
        const banco = gameState.cities?.find(c => c.owner === 0);
        const endpoints = ciudadesPropias.length + (banco ? 1 : 0);
        const maxRutasPosibles = endpoints >= 2 ? (endpoints * (endpoints - 1)) / 2 : 0;
        const rutasActivas = units.filter(u => u.player === playerNumber && !!u.tradeRoute).length;
        if (rutasActivas >= maxRutasPosibles) return nodos;

        const capital = gameState.cities?.find(c => c.isCapital && c.owner === playerNumber);
        const tieneDestinoComercial = !!banco || ciudadesPropias.length >= 2;
        if (!capital || !tieneDestinoComercial) return nodos;

        const crearCaravana = IaNodoValor.crearNodo({
            tipo: 'crear_caravana',
            propietario: playerNumber,
            valor_base: (config?.nodos?.crear_caravana?.peso_base ?? 190) + (contextoEstrategico?.fase === 'apertura' ? 40 : 0),
            valor_economico: 220 + (contextoEstrategico?.crisisEconomica ? 40 : 0),
            valor_supervivencia: 10,
            valor_sabotaje: 0,
            valor_control: 90,
            r: capital.r,
            c: capital.c,
            razon_texto: 'Corredor operativo - activar nueva caravana comercial'
        });

        return IaNodoValor.ordenarNodosPorPeso([...nodos, crearCaravana], { playerNumber, gameState, config }, config);
    },

    _seleccionarNodoPrincipal(nodosTop, contexto) {
        if (!Array.isArray(nodosTop) || nodosTop.length === 0) return null;

        const capital = nodosTop.find(n => n.tipo === 'ciudad_natal_propia');
        const corredor = nodosTop.find(n => n.tipo === 'corredor_comercial');
        const crearCaravana = nodosTop.find(n => n.tipo === 'crear_caravana');
        const ciudadBarbara = nodosTop.find(n => n.tipo === 'ciudad_barbara');
        const sitioAldea = nodosTop.find(n => n.tipo === 'sitio_aldea');

        // Jerarquía económica dura en apertura:
        // 1) Si la banca es conectable por camino construible, construir corredor a banca.
        // 2) Si no, conquistar ciudad bárbara.
        // 3) Si no, fundar ciudad (sitio_aldea).
        // 4) Después, activar/expandir rutas comerciales.
        if (contexto?.fase === 'apertura' && !contexto?.capitalAmenazada) {
            if (corredor && corredor.destino_tipo === 'banca') return corredor;
            if (ciudadBarbara) return ciudadBarbara;
            if (sitioAldea) return sitioAldea;
            if (crearCaravana) return crearCaravana;
            if (corredor) return corredor;
        }

        if (contexto?.fase === 'apertura' && contexto?.crisisEconomica && !contexto?.capitalAmenazada) {
            if (crearCaravana) return crearCaravana;
            if (corredor && (capital?.valor_supervivencia || 0) < 220) return corredor;
        }

        if (corredor && capital && (capital.valor_supervivencia || 0) < 180 && (corredor.peso || 0) >= (capital.peso || 0) * 0.7) {
            return corredor;
        }

        return nodosTop[0];
    },

    _isRoadPathConstructible(origen, destino) {
        if (!origen || !destino) return false;

        const startKey = `${origen.r},${origen.c}`;
        const goalKey = `${destino.r},${destino.c}`;
        const queue = [{ r: origen.r, c: origen.c }];
        const visited = new Set([startKey]);
        let safety = 0;

        while (queue.length > 0 && safety < 1200) {
            safety++;
            const cur = queue.shift();
            const curKey = `${cur.r},${cur.c}`;
            if (curKey === goalKey) return true;

            const neighbors = typeof getHexNeighbors === 'function' ? getHexNeighbors(cur.r, cur.c) : [];
            for (const next of neighbors) {
                const key = `${next.r},${next.c}`;
                if (visited.has(key)) continue;

                const hex = board[next.r]?.[next.c];
                if (!hex) continue;
                if (hex.terrain === 'forest' || hex.terrain === 'water') continue;
                if (TERRAIN_TYPES?.[hex.terrain]?.isImpassableForLand) continue;

                visited.add(key);
                queue.push({ r: next.r, c: next.c });
            }
        }

        return false;
    },

    _construirContextoEstrategico(snapshot, flags) {
        const fase = snapshot.turnNumber <= 5 ? 'apertura' : snapshot.turnNumber <= 10 ? 'temprano' : 'medio';
        return {
            fase,
            capitalAmenazada: !!flags?.capitalAmenazada,
            crisisEconomica: !!flags?.crisisEconomica,
            turno: snapshot.turnNumber,
            ciudades: snapshot.ciudades,
            rutasComerciales: snapshot.rutasComerciales
        };
    },

    _construirConfigContextual(configBase, contextoEstrategico) {
        const contextual = JSON.parse(JSON.stringify(configBase || {}));
        const baseMultiplicadores = contextual.multiplicadores || {};
        const bonusTipos = {};
        const penalizacionTipos = {};
        let multiplicadores = { ...baseMultiplicadores };

        if (contextoEstrategico?.fase === 'apertura') {
            multiplicadores = {
                ...multiplicadores,
                economia: 2.2,
                sabotaje: 1.8,
                control: 1.0,
                supervivencia: contextoEstrategico.capitalAmenazada ? 2.5 : 0.8
            };
            bonusTipos.corredor_comercial = 260;
            bonusTipos.banca = 140;
            bonusTipos.ciudad_libre = 100;
            bonusTipos.sitio_aldea = 140;
            bonusTipos.camino_enemigo_critico = 160;
            bonusTipos.caravana_enemiga = 180;
            bonusTipos.crear_caravana = 150;
            penalizacionTipos.recurso_estrategico = 180;
            penalizacionTipos.ciudad_natal_propia = contextoEstrategico.capitalAmenazada ? 0 : 220;
            contextual.penalizacion_distancia = 0.08;
        }

        if ((contextoEstrategico?.ciudades || 0) < 2) {
            bonusTipos.ciudad_libre = (bonusTipos.ciudad_libre || 0) + 160;
            bonusTipos.sitio_aldea = (bonusTipos.sitio_aldea || 0) + 120;
        }

        if ((contextoEstrategico?.rutasComerciales || 0) > 0) {
            bonusTipos.ciudad_libre = (bonusTipos.ciudad_libre || 0) + 100;
            bonusTipos.sitio_aldea = (bonusTipos.sitio_aldea || 0) + 80;
            bonusTipos.crear_caravana = (bonusTipos.crear_caravana || 0) + 100;
            bonusTipos.banca = Math.max(0, (bonusTipos.banca || 0) - 80);
        }

        if (contextoEstrategico?.crisisEconomica) {
            multiplicadores.economia = Math.max(multiplicadores.economia || 1, 2.4);
            bonusTipos.corredor_comercial = (bonusTipos.corredor_comercial || 0) + 120;
            bonusTipos.banca = (bonusTipos.banca || 0) + 80;
            bonusTipos.ciudad_libre = (bonusTipos.ciudad_libre || 0) + 60;
            bonusTipos.crear_caravana = (bonusTipos.crear_caravana || 0) + 120;
            penalizacionTipos.recurso_estrategico = (penalizacionTipos.recurso_estrategico || 0) + 60;
        }

        if (contextoEstrategico?.capitalAmenazada) {
            penalizacionTipos.ciudad_natal_propia = 0;
            bonusTipos.ciudad_natal_propia = 240;
        }

        contextual.contexto_actual = {
            fase: contextoEstrategico?.fase || 'normal',
            multiplicadores,
            bonus_tipos: bonusTipos,
            penalizacion_tipos: penalizacionTipos,
            penalizacion_distancia: contextual.penalizacion_distancia,
            penalizacion_riesgo: contextual.penalizacion_riesgo
        };

        return contextual;
    }

};

console.log("[IaDecision] Motor de Decisiones cargado. Función principal: evaluarEstadoYTomarDecision(playerNumber)");
