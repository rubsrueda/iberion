/**
 * IaNodoValor.js
 * 
 * Módulo formal de cálculo de pesos y detección de Nodos de Valor para el motor IA unificado.
 * Implementa la especificación técnica: IA_UNIFICACION_ESPECIFICACION_TECNICA.md
 * - §2.4 — Contrato de calcularPesoNodo()
 * - §3.1-3.3 — Matriz de Desempates
 * - §4 — Catálogo de tipos de nodo
 * 
 * Estado: v1.0 - 2026-03-26
 * Autor: IA Unificación
 */

const IaNodoValor = {

    /**
     * Calcula el peso final de un nodo según la fórmula formal de §2.4
     * 
     * Fórmula:
     *   peso_final = (base + econ + surv + sab + ctrl) × dist_factor × riesgo_factor
     * 
     * Donde:
     *   - base = config.nodos[tipo].peso_base
     *   - econ = nodo.valor_economico × config.multiplicadores.economia
     *   - surv = nodo.valor_supervivencia × config.multiplicadores.supervivencia
     *   - sab = nodo.valor_sabotaje × config.multiplicadores.sabotaje
     *   - ctrl = nodo.valor_control × config.multiplicadores.control
     *   - dist_factor = 1 / (1 + distancia × config.penalizacion_distancia)
     *   - riesgo_factor = 1 - (riesgo × config.penalizacion_riesgo)
     * 
     * @param {NodoValor} nodo - Objeto nodo con estructura formal
     * @param {object} estado - Snapshot del gameState relevante
     * @param {object} config - Contenido parseado de ia_config.json (de IaConfigManager.get())
     * @returns {number} Peso final ≥ 0. Mayor = más prioritario.
     */
    calcularPesoNodo(nodo, estado, config) {
        if (!nodo || !config) {
            console.warn("[IaNodoValor] Argumentos inválidos en calcularPesoNodo:", { nodo, config });
            return 0;
        }

        // Paso 1: Obtener pesos base según tipo de nodo
        const nodoConfig = config.nodos?.[nodo.tipo];
        if (!nodoConfig) {
            console.warn(`[IaNodoValor] Tipo de nodo no configurado: '${nodo.tipo}'`);
            return 0;
        }

        // Paso 2: Aplicar multiplicadores por eje de valor
        const multiplicadores = config.multiplicadores || {};
        const base = nodoConfig.peso_base || 0;
        const econ = (nodo.valor_economico || 0) * (multiplicadores.economia || 1);
        const surv = (nodo.valor_supervivencia || 0) * (multiplicadores.supervivencia || 1);
        const sab = (nodo.valor_sabotaje || 0) * (multiplicadores.sabotaje || 1);
        const ctrl = (nodo.valor_control || 0) * (multiplicadores.control || 1);

        // Paso 3: Factores moduladores
        const penalizaciones = {
            distancia: config.penalizacion_distancia || 0.1,
            riesgo: config.penalizacion_riesgo || 0.5
        };

        const distancia = nodo.distancia || 0;
        const riesgo = Math.min(1, Math.max(0, nodo.riesgo || 0)); // Clamped 0-1
        
        const factorDistancia = 1 / (1 + distancia * penalizaciones.distancia);
        const factorRiesgo = 1 - (riesgo * penalizaciones.riesgo);

        // Paso 4: Fórmula final
        const suma = base + econ + surv + sab + ctrl;
        const pesoFinal = suma * factorDistancia * factorRiesgo;

        return Math.max(0, pesoFinal);
    },

    /**
     * Desempata dos nodos de igual peso usando matriz formal (§3.3)
     * 
     * Orden de desempate estricto:
     * 1. valor_supervivencia mayor gana
     * 2. distancia menor gana
     * 3. valor_economico mayor gana
     * 4. conectividad mayor gana
     * 5. Prioridad de tipo (tabla en §3.3)
     * 
     * @param {NodoValor} nodoA
     * @param {NodoValor} nodoB
     * @returns {number} <0 si A gana, >0 si B gana, 0 si empate total
     */
    aplicarMatrizDesempate(nodoA, nodoB) {
        // 1. Supervivencia: mayor mejor
        if (nodoA.valor_supervivencia !== nodoB.valor_supervivencia) {
            return nodoB.valor_supervivencia - nodoA.valor_supervivencia;
        }

        // 2. Distancia: menor mejor
        if (nodoA.distancia !== nodoB.distancia) {
            return nodoA.distancia - nodoB.distancia;
        }

        // 3. Economía: mayor mejor
        if (nodoA.valor_economico !== nodoB.valor_economico) {
            return nodoB.valor_economico - nodoA.valor_economico;
        }

        // 4. Conectividad: mayor mejor
        if (nodoA.conectividad !== nodoB.conectividad) {
            return nodoB.conectividad - nodoA.conectividad;
        }

        // 5. Prioridad de tipo (tabla §3.3)
        return this._getPrioridadTipo(nodoA.tipo) - this._getPrioridadTipo(nodoB.tipo);
    },

    /**
     * Retorna la prioridad de desempate según tipo de nodo (§3.3)
     * Menor número = mayor prioridad en desempate
     * @private
     */
    _getPrioridadTipo(tipo) {
        const prioridades = {
            'ciudad_natal_propia': 1,
            'ultima_unidad_propia': 2,
            'banca': 3,
            'ciudad_propia_desconectada': 4,
            'camino_propio_critico': 5,
            'fortaleza_a_construir': 6,
            'sitio_aldea': 7,
            'caravana_propia': 8,
            'ciudad_libre': 9,
            'ciudad_barbara': 10,
            'camino_enemigo_critico': 11,
            'caravana_enemiga': 12,
            'ciudad_enemiga': 13,
            'recurso_estrategico': 14,
            'cuello_botella': 15,
            'sitio_desembarco': 16
        };
        return prioridades[tipo] || 999;
    },

    /**
     * Ordena un array de nodos por peso calculado, aplicando desempates formales
     * 
     * @param {NodoValor[]} nodos - Array de nodos a ordenar
     * @param {object} estado - Snapshot del gameState
     * @param {object} config - Configuración de ia_config.json
     * @returns {NodoValor[]} Array ordenado descendente por peso
     */
    ordenarNodosPorPeso(nodos, estado, config) {
        if (!Array.isArray(nodos) || nodos.length === 0) return [];

        // Calcular peso para cada nodo
        const nodosConPeso = nodos.map(nodo => ({
            nodo,
            peso: this.calcularPesoNodo(nodo, estado, config)
        }));

        // Ordenar: primero por peso descendente, luego aplicar desempates
        nodosConPeso.sort((a, b) => {
            const diffPeso = b.peso - a.peso;
            if (Math.abs(diffPeso) > 0.01) {
                return diffPeso; // Diferencia clara de peso
            }
            // Pesos iguales: aplicar matriz desempate
            return this.aplicarMatrizDesempate(a.nodo, b.nodo);
        });

        return nodosConPeso.map(item => item.nodo);
    },

    /**
     * Valida que un nodo tenga estructura correcta según interface NodoValor (§4)
     * 
     * @param {object} nodo - Objeto a validar
     * @returns {string[]} Array de errores (vacío si válido)
     */
    validarNodo(nodo) {
        const errores = [];
        const camposRequeridos = [
            'id', 'tipo', 'propietario', 'valor_base', 'valor_economico',
            'valor_supervivencia', 'valor_sabotaje', 'valor_control',
            'distancia', 'riesgo', 'conectividad', 'turnos_estimados',
            'r', 'c', 'razon_texto'
        ];

        for (const campo of camposRequeridos) {
            if (!(campo in nodo)) {
                errores.push(`Campo requerido faltante: '${campo}'`);
            }
        }

        // Validar tipos numéricos
        const camposNumericos = [
            'propietario', 'valor_base', 'valor_economico', 'valor_supervivencia',
            'valor_sabotaje', 'valor_control', 'distancia', 'riesgo',
            'conectividad', 'turnos_estimados', 'r', 'c'
        ];
        for (const campo of camposNumericos) {
            if (typeof nodo[campo] !== 'number') {
                errores.push(`Campo '${campo}' debe ser number, encontré ${typeof nodo[campo]}`);
            }
        }

        // Validar rango de riesgo (0-1)
        if (nodo.riesgo < 0 || nodo.riesgo > 1) {
            errores.push(`Campo 'riesgo' debe estar entre 0-1, encontré ${nodo.riesgo}`);
        }

        // Validar tipo de nodo existe
        const tiposValidos = [
            'ciudad_natal_propia', 'ultima_unidad_propia', 'ciudad_propia_conectada',
            'ciudad_propia_desconectada', 'banca', 'ciudad_libre', 'camino_propio_critico',
            'camino_enemigo_critico', 'caravana_propia', 'caravana_enemiga', 'recurso_estrategico',
            'ciudad_enemiga', 'cuello_botella', 'sitio_aldea', 'sitio_desembarco',
            'fortaleza_a_construir', 'ciudad_barbara'
        ];
        if (!tiposValidos.includes(nodo.tipo)) {
            errores.push(`Tipo de nodo inválido: '${nodo.tipo}'`);
        }

        return errores;
    },

    /**
     * Crea un objeto NodoValor con estructura formal (para futuro uso)
     * 
     * @param {object} datos - Datos del nodo (propiedades parciales o completas)
     * @returns {NodoValor} Nodo validado
     */
    crearNodo(datos = {}) {
        const nodo = {
            id: datos.id || crypto.randomUUID(),
            tipo: datos.tipo || 'ciudad_libre',
            propietario: datos.propietario !== undefined ? datos.propietario : 0,
            valor_base: datos.valor_base || 0,
            valor_economico: datos.valor_economico || 0,
            valor_supervivencia: datos.valor_supervivencia || 0,
            valor_sabotaje: datos.valor_sabotaje || 0,
            valor_control: datos.valor_control || 0,
            distancia: datos.distancia || 0,
            riesgo: Math.min(1, Math.max(0, datos.riesgo || 0)),
            conectividad: datos.conectividad || 0,
            turnos_estimados: datos.turnos_estimados || 1,
            r: datos.r !== undefined ? datos.r : 0,
            c: datos.c !== undefined ? datos.c : 0,
            razon_texto: datos.razon_texto || 'Nodo de valor',
            timestamp: Date.now()
        };

        return nodo;
    },

    /**
     * Comprueba si hay amenaza crítica a ciudad natal (para protocolo Nivel 0)
     * 
     * @param {number} playerNumber - Jugador a evaluar
     * @returns {boolean} true si ciudad natal tiene enemigo en rango ≤ 2
     */
    esCiudadNatalAmenazada(playerNumber) {
        if (!gameState || !gameState.cities) return false;

        const capitalPropia = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capitalPropia) return false;

        const enemigos = units.filter(u => u.player !== playerNumber && u.currentHealth > 0);
        for (const enemigo of enemigos) {
            const distancia = hexDistance(capitalPropia.r, capitalPropia.c, enemigo.r, enemigo.c);
            if (distancia <= 2) {
                return true;
            }
        }

        return false;
    },

    /**
     * Comprueba si existe ruta activa de caminos desde ciudad a Banca
     * 
     * @param {number} playerNumber
     * @returns {boolean} true si existe conexión de caminos
     */
    existeRutaActivaABanca(playerNumber) {
        if (!gameState || !gameState.cities) return false;

        const ciudadesPropia = gameState.cities.filter(c => c.owner === playerNumber);
        if (ciudadesPropia.length === 0) return false;

        // Buscar si alguna ciudad tiene ruta a Banca
        for (const ciudad of ciudadesPropia) {
            if (this._tieneRutaACeldaEspecial(ciudad, 'banca', playerNumber)) {
                return true;
            }
        }

        return false;
    },

    /**
     * Helper: verifica si hay ruta de caminos desde punto A a punto B
     * @private
     */
    _tieneRutaACeldaEspecial(ciudad, tipoEspecial, playerNumber) {
        // Esta es una versión simplificada de demostración
        // En producción, usaría BFS/Dijkstra sobre la red de caminos
        const bancos = board.flat().filter(h => 
            h && h.owner === 0 && h.isBank && hexDistance(ciudad.r, ciudad.c, h.r, h.c) <= 5
        );
        return bancos.length > 0;
    },

    /**
     * Encuentra el eslabón rompible más cercano de ruta enemiga crítica
     * 
     * @param {number} playerNumber - Jugador activo
     * @returns {NodoValor|null} Nodo de camino enemigo o null
     */
    encontrarEslabonRompible(playerNumber) {
        if (!Array.isArray(board) || board.length === 0) return null;

        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        
        // Buscar caminos del enemigo que aislen a sus ciudades
        const caminosEnemigos = board.flat().filter(h => 
            h && h.owner === enemyPlayer && h.structure === 'Camino' && !h.unit
        );

        if (caminosEnemigos.length === 0) return null;

        // Encontrar el más cercano a una unidad propia
        let mejor = null;
        let minDistancia = Infinity;

        for (const camino of caminosEnemigos) {
            const unidadesPropia = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
            if (unidadesPropia.length === 0) continue;

            const distMin = Math.min(...unidadesPropia.map(u => hexDistance(u.r, u.c, camino.r, camino.c)));
            
            if (distMin < minDistancia) {
                minDistancia = distMin;
                mejor = this.crearNodo({
                    tipo: 'camino_enemigo_critico',
                    propietario: enemyPlayer,
                    valor_sabotaje: 80,
                    distancia: distMin,
                    r: camino.r,
                    c: camino.c,
                    razon_texto: `Camino enemigo en (${camino.r}, ${camino.c}) - Sabotaje`
                });
            }
        }

        return mejor;
    }

};

console.log("[IaNodoValor] Módulo de Nodos de Valor cargado. Funciones disponibles: calcularPesoNodo(), ordenarNodosPorPeso(), aplicarMatrizDesempate()");
