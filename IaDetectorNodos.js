/**
 * IaDetectorNodos.js
 * 
 * Módulo détector formal de Nodos de Valor desde el estado del juego.
 * Implementa: IA_UNIFICACION_ESPECIFICACION_TECNICA.md §4
 * 
 * Responsabilidades:
 * 1. Escanear board[] y units[]
 * 2. Identificar cada tipo de nodo según catálogo §4.1
 * 3. Asignar valores iniciales §4 tabla
 * 4. Calcular métricas (distancia, riesgo, conectividad)
 * 5. Retornar NodoValor[] ordenado por peso
 * 
 * Estado: v1.0 - 2026-03-26
 * Autor: IA Unificación
 */

const IaDetectorNodos = {

    /**
     * Función principal: Detecta TODOS los nodos de valor del mapa actual
     * Especificación: §4.2 Funciones de detección
     * 
     * @param {number} playerNumber - Jugador para el que detectar nodos
     * @param {object} config - Config de ia_config.json (de IaConfigManager)
     * @returns {NodoValor[]} Array ordenado por peso descendente
     */
    detectarNodosDeValor(playerNumber, config) {
        console.group(`%c[IaDetector] Detectando nodos para Jugador ${playerNumber}`, "color: #FF6B6B; font-weight: bold;");
        
        if (!config || !IaConfigManager.isLoaded) {
            console.error("[IaDetector] Configuración no cargada");
            console.groupEnd();
            return [];
        }

        // Guardia: si config llegó sin nodos (fallback incompleto), recargar defaults
        if (!config.nodos) {
            console.warn("[IaDetector] config.nodos ausente — recargando defaults");
            IaConfigManager._loadDefaults();
            config = IaConfigManager.get();
        }

        const nodos = [];
        const estado = { playerNumber, gameState, config };

        // PASO 1: Detectar amenazas críticas a capital
        console.log(`[IaDetector] PASO 1: Detectando amenaza a capital...`);
        const nodosCapital = this._detectarCapitalYUltimaUnidad(playerNumber, config);
        nodos.push(...nodosCapital);

        // PASO 2: Detectar red propia (ciudades conectadas/desconectadas)
        console.log(`[IaDetector] PASO 2: Detectando red propia...`);
        const nodosRed = this._detectarRedPropia(playerNumber, config);
        nodos.push(...nodosRed);

        // PASO 3: Detectar acceso a economía (Banca, ciudades libres)
        console.log(`[IaDetector] PASO 3: Detectando acceso a economía...`);
        const nodosEconomia = this._detectarNodosEconomicos(playerNumber, config);
        nodos.push(...nodosEconomia);

        // PASO 4: Detectar infraestructura propia (caminos, fortalezas)
        console.log(`[IaDetector] PASO 4: Detectando infraestructura propia...`);
        const nodosInfraestructura = this._detectarInfraestructuraPropia(playerNumber, config);
        nodos.push(...nodosInfraestructura);

        // PASO 5: Detectar caravanas (propias y enemigas)
        console.log(`[IaDetector] PASO 5: Detectando caravanas...`);
        const nodosCaravanas = this._detectarCaravanas(playerNumber, config);
        nodos.push(...nodosCaravanas);

        // PASO 6: Detectar sabotaje (rutas enemigas, caravanas)
        console.log(`[IaDetector] PASO 6: Detectando objetivos de sabotaje...`);
        const nodosSabotaje = this._detectarObjetivosSabotaje(playerNumber, config);
        nodos.push(...nodosSabotaje);

        // PASO 7: Detectar expansión (ciudades libres, recursos, cuellos de botella)
        console.log(`[IaDetector] PASO 7: Detectando oportunidades de expansión...`);
        const nodosExpansion = this._detectarExpansion(playerNumber, config);
        nodos.push(...nodosExpansion);

        // PASO 8: Detectar operaciones especiales (desembarcos, expediciones)
        console.log(`[IaDetector] PASO 8: Detectando operaciones especiales...`);
        const nodosEspeciales = this._detectarOperacionesEspeciales(playerNumber, config);
        nodos.push(...nodosEspeciales);

        // PASO 9: Calcular metrics comunes a todos los nodos
        console.log(`[IaDetector] PASO 9: Calculando métricas de nodos...`);
        this._calcularMetricasNodos(nodos, playerNumber);

        // PASO 10: Ordenar por peso
        console.log(`[IaDetector] PASO 10: Ordenando por peso...`);
        const nodosOrdenados = IaNodoValor.ordenarNodosPorPeso(nodos, estado, config);

        console.log(`[IaDetector] ✓ ${nodosOrdenados.length} nodos detectados y ordenados`);
        console.log(`[IaDetector] Top 3: ${nodosOrdenados.slice(0, 3).map(n => `${n.tipo}(peso=${IaNodoValor.calcularPesoNodo(n, estado, config).toFixed(1)})`).join(' > ')}`);
        console.groupEnd();

        return nodosOrdenados;
    },

    /**
     * PASO 1: Detectar capital y última unidad
     * @private
     */
    _detectarCapitalYUltimaUnidad(playerNumber, config) {
        const nodos = [];
        const nodosConfig = config?.nodos || {};

        // Capital propia
        const capital = gameState.cities?.find(c => c.isCapital && c.owner === playerNumber);
        if (capital) {
            const cfg = nodosConfig.ciudad_natal_propia || {};
            const enemigos = units.filter(u => u.player !== playerNumber && u.currentHealth > 0);
            let amenazaCapital = 0;
            let nearestEnemyDist = Infinity;
            let enemigosMuyCerca = 0;
            for (const enemigo of enemigos) {
                const dist = hexDistance(capital.r, capital.c, enemigo.r, enemigo.c);
                nearestEnemyDist = Math.min(nearestEnemyDist, dist);
                if (dist <= 2) {
                    amenazaCapital += 220;
                    enemigosMuyCerca++;
                } else if (dist === 3) {
                    amenazaCapital += 55;
                } else if (dist === 4) {
                    amenazaCapital += 15;
                }
            }
            if (enemigosMuyCerca >= 2) amenazaCapital += 80;

            const amenazaNormalizada = Math.min(500, Math.max(0, amenazaCapital));
            const amenazaCritica = nearestEnemyDist <= 2 || amenazaNormalizada >= 220;
            const amenazaMedia = !amenazaCritica && nearestEnemyDist <= 3;
            const amenazaBaja = !amenazaCritica && !amenazaMedia && nearestEnemyDist <= 4;

            let valorSupervivencia = 5;
            let valorBase = 10;
            let valorControl = 0;

            if (amenazaCritica) {
                valorSupervivencia = 320 + Math.min(160, amenazaNormalizada);
                valorBase = Math.min(cfg.peso_base ?? 500, 140 + Math.floor(amenazaNormalizada * 0.12));
                valorControl = 70;
            } else if (amenazaMedia) {
                valorSupervivencia = 70 + Math.floor(amenazaNormalizada * 0.2);
                valorBase = 30;
                valorControl = 20;
            } else if (amenazaBaja) {
                valorSupervivencia = 20;
                valorBase = 15;
                valorControl = 5;
            }

            nodos.push(IaNodoValor.crearNodo({
                tipo: 'ciudad_natal_propia',
                propietario: playerNumber,
                valor_base: valorBase,
                valor_economico: amenazaCritica ? 20 : 0,
                valor_supervivencia: valorSupervivencia,
                valor_sabotaje: 0,
                valor_control: valorControl,
                r: capital.r,
                c: capital.c,
                razon_texto: `Capital propia (${capital.name || 'Capital'}) - Amenaza=${amenazaNormalizada} distMin=${Number.isFinite(nearestEnemyDist) ? nearestEnemyDist : 'inf'}`
            }));
        }

        // Última unidad propia
        const unidadesVivas = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
        if (unidadesVivas.length === 1) {
            const ultimaUnidad = unidadesVivas[0];
            const cfg = nodosConfig.ultima_unidad_propia || {};
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'ultima_unidad_propia',
                propietario: playerNumber,
                valor_base: cfg.peso_base ?? 400,
                valor_economico: 0,
                valor_supervivencia: 400,
                valor_sabotaje: 0,
                valor_control: 0,
                r: ultimaUnidad.r,
                c: ultimaUnidad.c,
                razon_texto: `Última unidad: ${ultimaUnidad.name} - PRESERVACIÓN CRÍTICA`
            }));
        }

        return nodos;
    },

    /**
     * PASO 2: Detectar red propia (ciudades conexas/aisladas)
     * @private
     */
    _detectarRedPropia(playerNumber, config) {
        const nodos = [];
        const ciudadesPropia = gameState.cities?.filter(c => c.owner === playerNumber && !c.isCapital) || [];

        for (const ciudad of ciudadesPropia) {
            const tipoConectividad = this._esCiudadConectada(ciudad, playerNumber) 
                ? 'ciudad_propia_conectada' 
                : 'ciudad_propia_desconectada';

            nodos.push(IaNodoValor.crearNodo({
                tipo: tipoConectividad,
                propietario: playerNumber,
                valor_base: (config?.nodos?.[tipoConectividad]?.peso_base ?? 80),
                valor_economico: tipoConectividad === 'ciudad_propia_conectada' ? 80 : 20,
                valor_supervivencia: tipoConectividad === 'ciudad_propia_desconectada' ? 50 : 0,
                valor_sabotaje: 0,
                valor_control: tipoConectividad === 'ciudad_propia_conectada' ? 60 : 40,
                r: ciudad.r,
                c: ciudad.c,
                conectividad: this._calcularConectividad(ciudad, playerNumber),
                razon_texto: `Ciudad propia: ${ciudad.name} - ${tipoConectividad === 'ciudad_propia_conectada' ? 'Conectada' : 'Desconectada'}`
            }));
        }

        return nodos;
    },

    /**
     * PASO 3: Detectar Banca, ciudades libres
     * @private
     */
    _detectarNodosEconomicos(playerNumber, config) {
        const nodos = [];

        // Banca (si existe)
        const bancos = board.flat().filter(h => h && h.owner === 0 && h.isBank);
        for (const banco of bancos) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'banca',
                propietario: 0,
                valor_base: (config?.nodos?.banca?.peso_base ?? 200),
                valor_economico: 200,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 50,
                r: banco.r,
                c: banco.c,
                razon_texto: `Banca - Ingreso económico pasivo`
            }));
        }

        // Ciudades libres
        const ciudadesLibres = gameState.cities?.filter(c => c.owner === null || c.owner === 0) || [];
        for (const ciudad of ciudadesLibres) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'ciudad_libre',
                propietario: 0,
                valor_base: (config?.nodos?.ciudad_libre?.peso_base ?? 60),
                valor_economico: 60,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 80,
                r: ciudad.r,
                c: ciudad.c,
                razon_texto: `Ciudad libre: ${ciudad.name} - Captura económica`
            }));
        }

        return nodos;
    },

    /**
     * PASO 4: Detectar infraestructura propia
     * @private
     */
    _detectarInfraestructuraPropia(playerNumber, config) {
        const nodos = [];

        // Caminos propios críticos (detectar cuales son cuello de botella)
        const caminosPropia = board.flat().filter(h => 
            h && h.owner === playerNumber && h.structure === 'Camino'
        );

        for (const camino of caminosPropia) {
            const esCritico = this._esCaminoCritico(camino, playerNumber);
            if (esCritico) {
                nodos.push(IaNodoValor.crearNodo({
                    tipo: 'camino_propio_critico',
                    propietario: playerNumber,
                    valor_base: (config?.nodos?.camino_propio_critico?.peso_base ?? 90),
                    valor_economico: 90,
                    valor_supervivencia: 30,
                    valor_sabotaje: 0,
                    valor_control: 20,
                    r: camino.r,
                    c: camino.c,
                    razon_texto: `Camino crítico propio en (${camino.r}, ${camino.c}) - Red defensa`
                }));
            }
        }

        // Sitios para construir fortalezas (hills sin estructura)
        const sitiuFortaleza = board.flat().filter(h => 
            h && h.owner === playerNumber && h.terrain === 'hills' && !h.structure && !h.unit
        ).slice(0, 5); // Limitar a 5 candidatos

        for (const sitio of sitiuFortaleza) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'fortaleza_a_construir',
                propietario: playerNumber,
                valor_base: (config?.nodos?.fortaleza_a_construir?.peso_base ?? 50),
                valor_economico: 50,
                valor_supervivencia: 20,
                valor_sabotaje: 0,
                valor_control: 60,
                r: sitio.r,
                c: sitio.c,
                razon_texto: `Sitio fortaleza en hills (${sitio.r}, ${sitio.c})`
            }));
        }

        return nodos;
    },

    /**
     * PASO 5: Detectar caravanas
     * @private
     */
    _detectarCaravanas(playerNumber, config) {
        const nodos = [];
        const corredorOperativo = !!gameState.ai_corridor_status?.[playerNumber]?.operational;

        // Caravanas propias
        const caravanasPropia = units.filter(u => 
            u.player === playerNumber && (u.tradeRoute || u.regiments?.some(r => r.type === 'Caravana'))
        );

        for (const caravana of caravanasPropia) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'caravana_propia',
                propietario: playerNumber,
                valor_base: (config?.nodos?.caravana_propia?.peso_base ?? 100) + (corredorOperativo ? 80 : 0),
                valor_economico: 100 + (corredorOperativo ? 120 : 0),
                valor_supervivencia: 20 + (corredorOperativo ? 40 : 0),
                valor_sabotaje: 0,
                valor_control: corredorOperativo ? 40 : 0,
                r: caravana.r,
                c: caravana.c,
                razon_texto: `Caravana propia "${caravana.name}" - Defensa económica${corredorOperativo ? ' (corredor operativo)' : ''}`
            }));
        }

        // Caravanas enemigas
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const caravanasEnemiga = units.filter(u => 
            u.player === enemyPlayer && (u.tradeRoute || u.regiments?.some(r => r.type === 'Caravana'))
        );

        for (const caravana of caravanasEnemiga) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'caravana_enemiga',
                propietario: enemyPlayer,
                valor_base: (config?.nodos?.caravana_enemiga?.peso_base ?? 0),
                valor_economico: 0,
                valor_supervivencia: 0,
                valor_sabotaje: 90,
                valor_control: 0,
                r: caravana.r,
                c: caravana.c,
                razon_texto: `Caravana enemiga "${caravana.name}" - Sabotaje económico`
            }));
        }

        return nodos;
    },

    /**
     * PASO 6: Detectar objetivos de sabotaje
     * @private
     */
    _detectarObjetivosSabotaje(playerNumber, config) {
        const nodos = [];
        const enemyPlayer = playerNumber === 1 ? 2 : 1;

        // Caminos enemigos críticos
        const caminosEnemigo = board.flat().filter(h => 
            h && h.owner === enemyPlayer && h.structure === 'Camino'
        );

        for (const camino of caminosEnemigo) {
            if (this._esCaminoCritico(camino, enemyPlayer)) {
                nodos.push(IaNodoValor.crearNodo({
                    tipo: 'camino_enemigo_critico',
                    propietario: enemyPlayer,
                    valor_base: (config?.nodos?.camino_enemigo_critico?.peso_base ?? 0),
                    valor_economico: 0,
                    valor_supervivencia: 0,
                    valor_sabotaje: 80,
                    valor_control: 0,
                    r: camino.r,
                    c: camino.c,
                    riesgo: 0.3,
                    razon_texto: `Camino enemigo crítico (${camino.r}, ${camino.c}) - Sabotaje RED`
                }));
            }
        }

        return nodos;
    },

    /**
     * PASO 7: Detectar oportunidades de expansión
     * @private
     */
    _detectarExpansion(playerNumber, config) {
        const nodos = [];
        const enemyPlayer = playerNumber === 1 ? 2 : 1;

        // Ciudades enemigas
        const ciudadesEnemiga = gameState.cities?.filter(c => c.owner === enemyPlayer) || [];
        for (const ciudad of ciudadesEnemiga) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'ciudad_enemiga',
                propietario: enemyPlayer,
                valor_base: (config?.nodos?.ciudad_enemiga?.peso_base ?? 30),
                valor_economico: 30,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 100,
                r: ciudad.r,
                c: ciudad.c,
                riesgo: 0.6,
                razon_texto: `Ciudad enemiga "${ciudad.name}" - Asedio final`
            }));
        }

        // Recursos estratégicos
        const recursos = board.flat().filter(h => 
            h && h.resourceNode && h.owner === null && !h.unit
        ).slice(0, 8);

        for (const recurso of recursos) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'recurso_estrategico',
                propietario: 0,
                valor_base: (config?.nodos?.recurso_estrategico?.peso_base ?? 60),
                valor_economico: 100,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 40,
                r: recurso.r,
                c: recurso.c,
                razon_texto: `Recurso ${recurso.resourceNode} en (${recurso.r}, ${recurso.c})`
            }));
        }

        // Cuellos de botella geográficos
        const cuellos = this._detectarCuellosDeBottella(playerNumber, config);
        nodos.push(...cuellos);

        return nodos;
    },

    /**
     * PASO 8: Detectar operaciones especiales (desembarcos, aldeas)
     * @private
     */
    _detectarOperacionesEspeciales(playerNumber, config) {
        const nodos = [];

        // Sitios para aldeas (terreno plano, neutro)
        const sitiosAldea = board.flat().filter(h => 
            h && h.owner === null && h.terrain === 'plains' && !h.unit && !h.structure
        ).slice(0, 4);

        for (const sitio of sitiosAldea) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'sitio_aldea',
                propietario: 0,
                valor_base: (config?.nodos?.sitio_aldea?.peso_base ?? 60),
                valor_economico: 70,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 60,
                r: sitio.r,
                c: sitio.c,
                razon_texto: `Sitio Aldea en (${sitio.r}, ${sitio.c})`
            }));
        }

        // Ciudades bárbara (si existen)
        const ciudadBarbara = gameState.cities?.filter(c => c.owner === 0 && c.hasBarbarianGarrison) || [];
        for (const barbara of ciudadBarbara) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'ciudad_barbara',
                propietario: 0,
                valor_base: (config?.nodos?.ciudad_barbara?.peso_base ?? 70),
                valor_economico: 70,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 80,
                r: barbara.r,
                c: barbara.c,
                riesgo: 0.5,
                razon_texto: `Ciudad bárbara "${barbara.name}" - Expedición`
            }));
        }

        // Sitios de desembarco (costa neutra o enemiga)
        const desembarcos = board.flat().filter(h => 
            h && h.terrain === 'coast' && h.owner !== playerNumber && !h.unit
        ).slice(0, 3);

        for (const desembarco of desembarcos) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'sitio_desembarco',
                propietario: 0,
                valor_base: (config?.nodos?.sitio_desembarco?.peso_base ?? 50),
                valor_economico: 50,
                valor_supervivencia: 0,
                valor_sabotaje: 0,
                valor_control: 80,
                r: desembarco.r,
                c: desembarco.c,
                riesgo: 0.7,
                razon_texto: `Sitio desembarco en costa (${desembarco.r}, ${desembarco.c})`
            }));
        }

        return nodos;
    },

    /**
     * PASO 9: Calcular métricas comunes de todos los nodos
     * Distancia, conectividad, turnos estimados, etc.
     * @private
     */
    _calcularMetricasNodos(nodos, playerNumber) {
        const unidadesPropia = units.filter(u => 
            u.player === playerNumber && u.currentHealth > 0
        );

        for (const nodo of nodos) {
            // Distancia al nodo más cercano propio
            if (unidadesPropia.length > 0) {
                nodo.distancia = Math.min(
                    ...unidadesPropia.map(u => hexDistance(u.r, u.c, nodo.r, nodo.c))
                );
            } else {
                nodo.distancia = 999; // inaccesible
            }

            // Conectividad (nodos propios accesibles desde este)
            nodo.conectividad = this._calcularConectividadDesde(nodo, playerNumber);

            // Turnos estimados para afectar
            nodo.turnos_estimados = Math.ceil((nodo.distancia || 0) / 2) + 1;

            // Asignar riesgo por defecto si no está set
            if (!nodo.riesgo || nodo.riesgo === 0) {
                nodo.riesgo = this._calcularRiesgoNodo(nodo, playerNumber);
            }
        }
    },

    /**
     * Helper: Detectar cuellos de botella (pasos únicos)
     * @private
     */
    _detectarCuellosDeBottella(playerNumber, config) {
        const nodos = [];
        // Simplificado: buscar hexes con ≤1 vecino accesible
        const cuellos = board.flat().filter(h => {
            if (!h || h.isImpassableForLand) return false;
            const vecinosacc = getHexNeighbors(h.r, h.c).filter(n => 
                board[n.r]?.[n.c] && !TERRAIN_TYPES[board[n.r][n.c].terrain]?.isImpassableForLand
            ).length;
            return vecinosacc <= 2;
        }).slice(0, 3);

        for (const cuello of cuellos) {
            nodos.push(IaNodoValor.crearNodo({
                tipo: 'cuello_botella',
                propietario: 0,
                valor_base: (config?.nodos?.cuello_botella?.peso_base ?? 40),
                valor_economico: 40,
                valor_supervivencia: 10,
                valor_sabotaje: 20,
                valor_control: 50,
                r: cuello.r,
                c: cuello.c,
                razon_texto: `Cuello de botella geográfico (${cuello.r}, ${cuello.c})`
            }));
        }

        return nodos;
    },

    /**
     * Helper: ¿Es una ciudad conectada por caminos?
     * @private
     */
    _esCiudadConectada(ciudad, playerNumber) {
        // Simplificado: si hay caminos en hexes adyacentes
        const vecinos = getHexNeighbors(ciudad.r, ciudad.c);
        return vecinos.some(n => {
            const hex = board[n.r]?.[n.c];
            return hex && hex.owner === playerNumber && hex.structure === 'Camino';
        });
    },

    /**
     * Helper: ¿Es un camino crítico (cuello botella de red)?
     * @private
     */
    _esCaminoCritico(camino, playerNumber) {
        // Simplificado: si conecta dos ciudades o es paso único
        const vecinos = getHexNeighbors(camino.r, camino.c);
        const ciudadesCercanas = vecinos.filter(n => {
            const hex = board[n.r]?.[n.c];
            return hex && (hex.isCity || hex.isCapital) && hex.owner === playerNumber;
        }).length;
        return ciudadesCercanas >= 2;
    },

    /**
     * Helper: Calcular conectividad (nodos propios alcanzables)
     * @private
     */
    _calcularConectividad(nodo, playerNumber) {
        if (!Array.isArray(board)) return 0;
        const vecinos = getHexNeighbors(nodo.r, nodo.c);
        return vecinos.filter(n => {
            const hex = board[n.r]?.[n.c];
            return hex && hex.owner === playerNumber;
        }).length;
    },

    /**
     * Helper: Calcular conectividad desde un nodo
     * @private
     */
    _calcularConectividadDesde(nodo, playerNumber) {
        // BFS simplificado dentro de 3 pasos
        let conectados = new Set();
        let queue = [{ r: nodo.r, c: nodo.c, dist: 0 }];
        let visited = new Set([`${nodo.r},${nodo.c}`]);

        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.dist > 3) continue;

            const vecinos = getHexNeighbors(curr.r, curr.c);
            for (const v of vecinos) {
                const key = `${v.r},${v.c}`;
                if (visited.has(key)) continue;
                visited.add(key);

                const hex = board[v.r]?.[v.c];
                if (hex && hex.owner === playerNumber) {
                    conectados.add(key);
                    queue.push({ r: v.r, c: v.c, dist: curr.dist + 1 });
                }
            }
        }

        return Math.min(10, conectados.size);
    },

    /**
     * Helper: Calcular riesgo de tomar un nodo
     * @private
     */
    _calcularRiesgoNodo(nodo, playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemigosNearby = units.filter(u => 
            u.player === enemyPlayer && u.currentHealth > 0 &&
            hexDistance(u.r, u.c, nodo.r, nodo.c) <= 3
        ).length;

        let riesgo = Math.min(1, enemigosNearby * 0.2);
        
        // Bonus de riesgo si es ciudad defendida
        if ((nodo.tipo === 'ciudad_enemiga' || nodo.tipo === 'ciudad_barbara') && 
            this._tieneGuarnicion(nodo.r, nodo.c)) {
            riesgo += 0.3;
        }

        return Math.min(1, riesgo);
    },

    /**
     * Helper: ¿Tiene guarnición?
     * @private
     */
    _tieneGuarnicion(r, c) {
        const hex = board[r]?.[c];
        return hex && !!hex.unit;
    }

};

console.log("[IaDetector] Módulo Detector de Nodos cargado. Función principal: detectarNodosDeValor(playerNumber, config)");
