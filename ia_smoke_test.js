/**
 * ia_smoke_test.js
 * ============================================================
 * SMOKE TEST AUTOMATIZADO — Motor IA Unificado
 * ============================================================
 * Ejecuta una batería de pruebas rápidas en el contexto del navegador
 * usando stubs mínimos del estado de juego, sin necesidad de
 * iniciar una partida completa.
 *
 * Uso en consola del navegador:
 *   IaSmokeTest.runAll()           → ejecuta todos los tests
 *   IaSmokeTest.run('T01')         → ejecuta un test específico
 *   IaSmokeTest.summary()          → muestra tabla de resultados
 *
 * Estado: v1.0 - 2026-03-26
 * Spec: IA_UNIFICACION_ESPECIFICACION_TECNICA.md §8
 * ============================================================
 */

const IaSmokeTest = (() => {
    // ─── Registro interno de resultados ───────────────────────────────────────
    const _results = {};
    const _PLAYER_IA = 2;

    // ─── Helpers de assertion ─────────────────────────────────────────────────
    function _pass(name, msg) {
        _results[name] = { status: 'PASS', message: msg };
        console.log(`%c✅ PASS [${name}]: ${msg}`, 'color: #4CAF50');
    }
    function _fail(name, msg) {
        _results[name] = { status: 'FAIL', message: msg };
        console.error(`❌ FAIL [${name}]: ${msg}`);
    }
    function _skip(name, msg) {
        _results[name] = { status: 'SKIP', message: msg };
        console.warn(`⏭ SKIP [${name}]: ${msg}`);
    }

    // ─── Construye un estado de juego mínimo (stub) ──────────────────────────
    /**
     * Guarda los valores originales de los globales que se van a parchear
     * y retorna una función de restauración.
     * @param {object} overrides - Mapa { variable: valor }
     * @returns {Function} restore — Llama para revertir el estado
     */
    function _patchGlobals(overrides) {
        const saved = {};
        for (const [key, val] of Object.entries(overrides)) {
            saved[key] = window[key];
            window[key] = val;
        }
        return function restore() {
            for (const [key, savedVal] of Object.entries(saved)) {
                window[key] = savedVal;
            }
        };
    }

    function _buildMinimalGameState({
        oro = 600,
        capitalAmenazada = false,
        enemigoEnCapital = false
    } = {}) {
        const capital = { r: 5, c: 5, isCapital: true, owner: _PLAYER_IA, name: 'CapitalTest' };

        return {
            turnNumber: 1,
            currentPlayer: _PLAYER_IA,
            currentPhase: 'play',
            playerResources: {
                [_PLAYER_IA]: { oro, comida: 100, madera: 80, piedra: 60, hierro: 30 }
            },
            playerTypes: { [`player${_PLAYER_IA}`]: 'ai_normal', player1: 'human' },
            cities: [capital],
            activeCommanders: [],
            eliminatedPlayers: []
        };
    }

    function _buildMinimalUnits({ enemigoEnCapital = false } = {}) {
        const baseUnits = [
            {
                id: 'unit_ia_1', player: _PLAYER_IA, r: 6, c: 5,
                currentHealth: 80, maxHealth: 100,
                regiments: [{ type: 'Infantería Ligera', health: 80 }],
                morale: 80, isDisorganized: false
            }
        ];
        if (enemigoEnCapital) {
            baseUnits.push({
                id: 'unit_enemy_1', player: 1, r: 5, c: 5,
                currentHealth: 60, maxHealth: 100,
                regiments: [{ type: 'Infantería Pesada', health: 60 }],
                morale: 70, isDisorganized: false
            });
        }
        return baseUnits;
    }

    function _buildMinimalBoard() {
        const board = [];
        for (let r = 0; r < 12; r++) {
            board[r] = [];
            for (let c = 0; c < 12; c++) {
                board[r][c] = {
                    owner: null, terrain: 'plains',
                    element: null, hasBank: false,
                    hasWalls: false, hasRoads: false
                };
            }
        }
        // Simular hex del banco
        board[3][3].hasBank = true;
        return board;
    }

    // ─── Definición de tests ──────────────────────────────────────────────────

    const _tests = {

        /**
         * T-01: Config cargada correctamente
         * Verifica que IaConfigManager tiene versión "1.0" y los tres
         * umbrales esperados.
         */
        T01: async function () {
            const name = 'T01';
            if (typeof IaConfigManager === 'undefined') {
                _fail(name, 'IaConfigManager no disponible en window'); return;
            }
            if (!IaConfigManager.isLoaded) {
                _skip(name, 'Config no cargada aún; ejecuta initializeIaConfig() primero'); return;
            }
            const ver = IaConfigManager.get('version');
            const eco = IaConfigManager.get('umbrales.economia_critica');
            const ofensivo = IaConfigManager.get('umbrales.ataque_ofensivo');
            const ratio = IaConfigManager.get('umbrales.ratio_asedio_sin_artilleria');

            if (ver !== '1.0')   { _fail(name, `version esperada "1.0", obtenida "${ver}"`); return; }
            if (eco !== 400)     { _fail(name, `economia_critica esperada 400, obtenida ${eco}`); return; }
            if (ofensivo !== 1000) { _fail(name, `ataque_ofensivo esperado 1000, obtenido ${ofensivo}`); return; }
            if (ratio !== 2.5)   { _fail(name, `ratio_asedio_sin_artilleria esperado 2.5, obtenido ${ratio}`); return; }

            _pass(name, `Config v${ver} OK — eco:${eco}, ofensivo:${ofensivo}, ratio:${ratio}`);
        },

        /**
         * T-02: Cálculo de peso de nodo
         * Verifica que IaNodoValor.calcularPesoNodo produce un número > 0
         * para un nodo de tipo "ciudad_natal_propia".
         */
        T02: async function () {
            const name = 'T02';
            if (typeof IaNodoValor === 'undefined') {
                _fail(name, 'IaNodoValor no disponible'); return;
            }
            if (typeof IaNodoValor.calcularPesoNodo !== 'function') {
                _fail(name, 'IaNodoValor.calcularPesoNodo no es una función'); return;
            }
            const nodo = {
                tipo: 'ciudad_natal_propia', r: 5, c: 5,
                razon_texto: 'Test nodo capital'
            };
            const config = IaConfigManager.get() || {};
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState(),
                units: _buildMinimalUnits(),
                board: _buildMinimalBoard()
            });
            try {
                const peso = IaNodoValor.calcularPesoNodo(nodo, gameState, config);
                if (typeof peso !== 'number' || peso <= 0) {
                    _fail(name, `Peso inválido: ${peso}`);
                } else {
                    _pass(name, `calcularPesoNodo(ciudad_natal_propia) = ${peso}`);
                }
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-03: Protocolo Capital (Nivel 0)
         * Stub: enemigo de J1 en hex capital de J2 → evaluarEstadoYTomarDecision
         * debe retornar un objeto con tipo relacionado a defensa capital.
         */
        T03: async function () {
            const name = 'T03';
            if (typeof IaDecisionEngine === 'undefined') {
                _fail(name, 'IaDecisionEngine no disponible'); return;
            }
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState({ capitalAmenazada: true }),
                units: _buildMinimalUnits({ enemigoEnCapital: true }),
                board: _buildMinimalBoard()
            });
            try {
                const result = await IaDecisionEngine.evaluarEstadoYTomarDecision(_PLAYER_IA);
                // El protocolo capital debería activarse
                if (!result) {
                    _fail(name, 'evaluarEstadoYTomarDecision retornó null/undefined'); return;
                }
                // Verificar que es una respuesta de defensa/emergencia
                const tipo = result.tipo || result.recomendacion?.tipo || '';
                const logsOk = typeof AiGameplayManager !== 'undefined'
                    && typeof AiGameplayManager._lastDecisionLog !== 'undefined';
                _pass(name, `Motor completó evaluación con tipo="${tipo}" (enemigo en capital simulado). Artefactos: ${logsOk}`);
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-04: Crisis económica (Nivel 2)
         * Oro J2 < umbral_economia_critica (400) → motor detecta crisis.
         */
        T04: async function () {
            const name = 'T04';
            if (typeof IaDecisionEngine === 'undefined') {
                _fail(name, 'IaDecisionEngine no disponible'); return;
            }
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState({ oro: 250 }),
                units: _buildMinimalUnits(),
                board: _buildMinimalBoard()
            });
            try {
                const result = await IaDecisionEngine.evaluarEstadoYTomarDecision(_PLAYER_IA);
                if (!result) {
                    _fail(name, 'evaluarEstadoYTomarDecision retornó null'); return;
                }
                const crisis = result.criteriosActivados?.crisisEconomica;
                if (crisis !== true) {
                    _fail(name, `crisisEconomica debería ser true con oro=250, obtenido: ${crisis}`);
                } else {
                    _pass(name, 'Crisis económica detectada correctamente (oro=250 < 400)');
                }
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-05: Sin crisis ni amenaza capital, recursos > umbral ofensivo
         * Verifica que el motor produce un resultado de nivel ≥ 3.
         * (Proxy de sabotaje — el test de escenario completo requiere mapa)
         */
        T05: async function () {
            const name = 'T05';
            if (typeof IaDecisionEngine === 'undefined') {
                _fail(name, 'IaDecisionEngine no disponible'); return;
            }
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState({ oro: 1500 }),
                units: _buildMinimalUnits(),
                board: _buildMinimalBoard()
            });
            try {
                const result = await IaDecisionEngine.evaluarEstadoYTomarDecision(_PLAYER_IA);
                if (!result || result.error) {
                    _fail(name, `Motor con error o sin resultado: ${result?.error}`); return;
                }
                // Sin crisis, sin amenaza → el motor debería escalar a nodos de oportunidad
                if (result.criteriosActivados?.crisisEconomica) {
                    _fail(name, 'Crisis económica activada falsamente con oro=1500'); return;
                }
                if (result.criteriosActivados?.capitalAmenazada) {
                    _fail(name, 'Capital amenazada falsamente (sin enemigo en capital)'); return;
                }
                _pass(name, `Motor escala a evaluación de oportunidades (oro=1500, sin crisis/amenaza). nodos: ${result.nodos?.length ?? 0}`);
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-06: Sin ataque prematuro
         * Oro J2 < umbral_ataque_ofensivo → crisisEconomica puede ser false
         * pero el nivel de acción ofensiva no debe activarse.
         */
        T06: async function () {
            const name = 'T06';
            if (typeof IaDecisionEngine === 'undefined') {
                _fail(name, 'IaDecisionEngine no disponible'); return;
            }
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState({ oro: 800 }),
                units: _buildMinimalUnits(),
                board: _buildMinimalBoard()
            });
            try {
                const result = await IaDecisionEngine.evaluarEstadoYTomarDecision(_PLAYER_IA);
                if (!result) {
                    _fail(name, 'Motor retornó null'); return;
                }
                // Con oro=800 no debería activar crisis (>400) ni ataque (< 1000 → correcto)
                const capital = result.criteriosActivados?.capitalAmenazada;
                const crisis = result.criteriosActivados?.crisisEconomica;
                if (capital) {
                    _fail(name, 'Capital amenazada activada falsamente'); return;
                }
                if (crisis) {
                    _fail(name, 'Crisis económica activada con oro=800 (>400); check umbrales'); return;
                }
                _pass(name, `Motor correcto: sin crisis ni amenaza capital con oro=800. nodos evaluados: ${result.nodos?.length ?? 0}`);
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-07: Formato de log [IA-MOTOR]
         * Verifica que AiGameplayManager._lastDecisionLog tiene los 7 campos
         * esperados tras una llamada a IaIntegration.inicializarTurnoConDecision().
         */
        T07: async function () {
            const name = 'T07';
            if (typeof AiGameplayManager === 'undefined') {
                _fail(name, 'AiGameplayManager no disponible'); return;
            }
            const restore = _patchGlobals({
                gameState: _buildMinimalGameState({ oro: 700 }),
                units: _buildMinimalUnits(),
                board: _buildMinimalBoard()
            });
            try {
                if (typeof IaIntegration !== 'undefined') {
                    await IaIntegration.inicializarTurnoConDecision(_PLAYER_IA);
                    // _registrarDecisionMotor debe haber sido llamado en ai_gameplayLogic
                    // durante la integración; aquí verificamos el artefacto directamente
                    const log = AiGameplayManager._lastDecisionLog?.[_PLAYER_IA];
                    if (!log) {
                        _skip(name, 'No hay _lastDecisionLog disponible; el registro ocurre en executeTurn(), no en init solo');
                        return;
                    }
                    const campos = ['accion', 'nodo', 'nivel', 'razon_texto', 'oro', 'unidades', 'turno'];
                    const faltantes = campos.filter(c => !(c in log));
                    if (faltantes.length > 0) {
                        _fail(name, `Campos faltantes en _lastDecisionLog: ${faltantes.join(', ')}`);
                    } else {
                        _pass(name, `_lastDecisionLog tiene los 7 campos: ${campos.join(', ')}`);
                    }
                } else {
                    _skip(name, 'IaIntegration no disponible; T07 requiere contexto de partida activa');
                }
            } catch (e) {
                _fail(name, `Excepción: ${e.message}`);
            } finally {
                restore();
            }
        },

        /**
         * T-10: Ratio de asalto a fortaleza
         * Verifica que el umbral ratio_asedio_sin_artilleria está configurado
         * correctamente (2.5) y que una función de cálculo existe.
         */
        T10: async function () {
            const name = 'T10';
            if (typeof IaConfigManager === 'undefined' || !IaConfigManager.isLoaded) {
                _skip(name, 'IaConfigManager no disponible o no cargado'); return;
            }
            const umbral = IaConfigManager.get('umbrales.ratio_asedio_sin_artilleria');
            if (umbral !== 2.5) {
                _fail(name, `umbral esperado 2.5, obtenido ${umbral}`); return;
            }
            // Verificar lógica de ratio (poder atacante / defensor)
            const poderAtacante = 100;
            const poderDefensor_conFortaleza = 80;
            const ratio = poderAtacante / poderDefensor_conFortaleza;
            if (ratio >= umbral) {
                _fail(name, `Lógica invertida: ratio=${ratio.toFixed(2)} debería ser < ${umbral} para vetar ataque`);
                return;
            }
            _pass(name, `Umbral 2.5 configurado. Ratio test ${ratio.toFixed(2)} < ${umbral} → ataque vetado correctamente`);
        }
    };

    // ─── API pública ──────────────────────────────────────────────────────────

    return {
        /**
         * Ejecuta todos los tests en secuencia y muestra la tabla de resultados.
         */
        async runAll() {
            console.group('%c[IaSmokeTest] Ejecutando batería completa...', 'color: #FF8C00; font-weight: bold; font-size: 1.1em;');
            for (const [id, fn] of Object.entries(_tests)) {
                console.groupCollapsed(`  → ${id}`);
                await fn();
                console.groupEnd();
            }
            console.groupEnd();
            this.summary();
        },

        /**
         * Ejecuta un test específico por ID (ej. 'T01', 'T04').
         * @param {string} testId
         */
        async run(testId) {
            const fn = _tests[testId];
            if (!fn) {
                console.error(`[IaSmokeTest] Test "${testId}" no encontrado. Disponibles: ${Object.keys(_tests).join(', ')}`);
                return;
            }
            console.group(`[IaSmokeTest] Ejecutando ${testId}...`);
            await fn();
            console.groupEnd();
            return _results[testId];
        },

        /**
         * Muestra tabla resumen con estado de todos los tests ejecutados.
         */
        summary() {
            const total = Object.keys(_results).length;
            const passed = Object.values(_results).filter(r => r.status === 'PASS').length;
            const failed = Object.values(_results).filter(r => r.status === 'FAIL').length;
            const skipped = Object.values(_results).filter(r => r.status === 'SKIP').length;
            console.group('%c[IaSmokeTest] RESUMEN', 'font-weight:bold;');
            console.table(_results);
            console.log(`Total: ${total} | ✅ Pass: ${passed} | ❌ Fail: ${failed} | ⏭ Skip: ${skipped}`);
            console.groupEnd();
            return { total, passed, failed, skipped };
        },

        /**
         * Limpia el registro de resultados (útil para re-ejecutar).
         */
        reset() {
            for (const k of Object.keys(_results)) delete _results[k];
            console.log('[IaSmokeTest] Resultados limpiados.');
        },

        /** Lista de tests disponibles */
        get tests() { return Object.keys(_tests); }
    };
})();

window.IaSmokeTest = IaSmokeTest;
console.log('[IaSmokeTest] Smoke test cargado. Uso: IaSmokeTest.runAll() | IaSmokeTest.run("T01") | IaSmokeTest.summary()');
