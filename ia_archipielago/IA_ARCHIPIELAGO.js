// IA_ARCHIPIELAGO.js
// Cerebro principal para Archipiélago. Coordina sentidos + módulos.
// EJECUTA ACCIONES REALES: Movimiento, fusión, división, conquista, construcción, caravanas

const IAArchipielago = {
  ARCHI_LOG_VERBOSE: false,
  IMPORTANT_LOG_VERBOSE: false,
  ARCHI_LOG_ROUTE_LIMIT: 3,
  BARBARIAN_CONQUEST_RATIO: 2.0,
  INVADER_FORTRESS_MIN_DISTANCE: 6,
  HUNT_SMALL_DIVISIONS_TARGET: 3,
  BIG_ENEMY_DIVISION_THRESHOLD: 12,
  HEAVY_DIVISION_TARGET: 20,
  WORM_MIN_SPLIT_REGIMENTS: 2,
  WORM_MAX_ACTIONS_PER_TURN: 12,
  CUT_SUPPLY_MAX_TARGETS: 4,
  EARLY_STONE_HILLS_TURN_LIMIT: 10,
  EARLY_STONE_HILLS_MIN_STONE: 100,
  ORGANIC_LAYER_SAFE_MODE: true,
  ORGANIC_LAYER_INTERVAL_TURNS: 1,
  ORGANIC_LAYER_MAX_OWN_CITIES: 99,
  TURN_CPU_BUDGET_MS: 90000,
  MAX_OCCUPATION_OBJECTIVES_PER_TURN: 12,
  MAX_ROUTE_ACTIONS_PER_TURN: 6,
  HERO_FIX_START_TURN: 3,
  HERO_CAPABILITY_PUSH_START_TURN: 5,
  INFRA_FIX_START_TURN: 3,
  IDEAL_VILLAGES_TARGET: 2,
  EXPLORER_RUINS_STRICT_START_TURN: 3,
  POINT_SUPREMACY_RUSH_START_TURN: 4,
  POINT_SUPREMACY_RUSH_END_TURN: 7,
  POINT_SUPREMACY_MIN_READY_ROUTES: 1,
  POINT_SUPREMACY_ROUTE_ACTION_BONUS: 2,
  ACTION_DISPATCH_COOLDOWN_MS: 250,
  MAX_RUTA_LARGA_CALLS_PER_TURN: 3,
  MAX_ROAD_BUILDS_PER_CYCLE: 3,
  ENABLE_ORGANIC_TRADE_LAYER: true,
  COMMERCIAL_SPLIT_MERGE_MANDATORY_TURN_LIMIT: 2,
  COMMERCIAL_MIN_SPLIT_MERGE_BEFORE_ROAD_BUILD: 3,
  LOG_ONLY_EARLY_TURN_EVENTS: true,
  WORM_HUMAN_TRACE: true,
  WORM_HUMAN_TRACE_INCLUDE_IDS: false,
  WORM_LOG_ONLY_HUMAN_TRACE: true,
  WORM_DETAILED_TRACE: false,
  CORRIDOR_SUMMARY_SAMPLE_LIMIT: 3,
  EARLY_TURN_WORM_NODE_STATUS_LIMIT: 1,
  EARLY_TURN_IMPORTANT_EVENTS: Object.freeze([
    'OCCUPATION_LIMIT_CONFIG',
    'TURN_START',
    'MISSION_OBJECTIVE_SKIPPED',
    'CORRIDOR_OBJECTIVES',
    'CORRIDOR_OBJECTIVES_DIAG',
    'OCCUPATION_PLAN',
    'WORM_PLAN',
    'WORM_NODE_STATUS',
    'WORM_STEP_START',
    'WORM_SPLIT',
    'WORM_MERGE',
    'WORM_RELAY_MOVE',
    'WORM_ACTION',
    'WORM_DECISION',
    'WORM_STEP_SKIPPED',
    'WORM_NODE_RESULT'
  ]),
  EARLY_TURN_METRIC_EVENTS: Object.freeze([
    'IA_METRIC_TURN_START'
  ]),
  MISSION_TYPE_COMMERCIAL_CORRIDOR: 'COMERCIAL_CORREDOR',
  MISSION_TYPE_CONQUEST_CITY: 'CONQUISTA_CIUDAD',
  deployUnitsAI(myPlayer) {
    console.log(`[IA_ARCHIPIELAGO] Despliegue IA iniciado para Jugador ${myPlayer}.`);
    if (gameState.currentPhase !== 'deployment') {
      console.warn(`[IA_ARCHIPIELAGO] Fase incorrecta para despliegue: ${gameState.currentPhase}`);
      return;
    }

    if (typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
      AiDeploymentManager.deployUnitsAI(myPlayer);
    } else {
      console.warn(`[IA_ARCHIPIELAGO] AiDeploymentManager no disponible. Usando emergencia.`);
    }

    // Salvaguarda: asegurar al menos una unidad en despliegue
    const unidadesIA = IASentidos?.getUnits ? IASentidos.getUnits(myPlayer) : units.filter(u => u.player === myPlayer);
    if (!unidadesIA || unidadesIA.length === 0) {
      console.warn(`[IA_ARCHIPIELAGO] ⚠️ IA sin unidades tras despliegue. Creando unidad de emergencia...`);
      this.crearUnidadInicialDeEmergencia(myPlayer);
    }

    console.log(`[IA_ARCHIPIELAGO] Despliegue IA finalizado. Las rutas se procesan en fase 'play'.`);
  },

  // === Helpers globales para metas ===
// === Helpers globales para metas ===
  registrarMetaFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals) gameState.iaCompletedGoals = {};
    if (!gameState.iaCompletedGoals[myPlayer]) gameState.iaCompletedGoals[myPlayer] = { ocupacion: [], construccion: [], caravana: [] };
    const goals = gameState.iaCompletedGoals[myPlayer][flujo];
    if (!goals.some(g => g.r === r && g.c === c)) {
      goals.push({ r, c, turno: gameState.turnNumber });
      console.log(`[IA_ARCHIPIELAGO] Meta registrada en '${flujo}': (${r},${c})`);
    }
  },

  isGoalCompletedFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals?.[myPlayer]?.[flujo]) return false;
    return gameState.iaCompletedGoals[myPlayer][flujo].some(g => g.r === r && g.c === c);
  },

  _metricLog(event, payload = {}) {
    if (this._shouldSuppressByEarlyTurnFilter(event, payload, 'metric')) return;
    try {
      console.log(`[IA_METRIC] ${JSON.stringify({ event, ...payload })}`);
    } catch (e) {
      console.log(`[IA_METRIC] ${event}`);
    }
  },

  _importantLog(event, payload = {}) {
    if (this._shouldSuppressByEarlyTurnFilter(event, payload, 'important')) return;
    if (this._shouldSuppressImportantEvent(event, payload)) return;
    const normalizedPayload = this._normalizeImportantPayload(event, payload);
    try {
      console.log(`[IA_IMPORTANTE] ${JSON.stringify({ event, turn: gameState.turnNumber, ...normalizedPayload })}`);
    } catch (e) {
      console.log(`[IA_IMPORTANTE] ${event}`);
    }
  },

  _normalizeImportantPayload(event, payload = {}) {
    if (this.IMPORTANT_LOG_VERBOSE) return payload;

    if (event === 'CORRIDOR_OBJECTIVES' && Array.isArray(payload.objectives)) {
      const groups = new Map();
      for (const obj of payload.objectives) {
        const key = obj?.objective || 'unknown';
        if (!groups.has(key)) {
          groups.set(key, {
            objective: key,
            pendingType: obj?.pendingType || 'capture',
            minLayer: Number.isInteger(obj?.layer) ? obj.layer : 0,
            maxLayer: Number.isInteger(obj?.layer) ? obj.layer : 0,
            pairCount: 0,
            pairSample: []
          });
        }
        const g = groups.get(key);
        g.pairCount += 1;
        if (Number.isInteger(obj?.layer)) {
          g.minLayer = Math.min(g.minLayer, obj.layer);
          g.maxLayer = Math.max(g.maxLayer, obj.layer);
        }
        const pair = `${obj?.from || '?'}->${obj?.to || '?'}`;
        if (g.pairSample.length < 3 && !g.pairSample.includes(pair)) g.pairSample.push(pair);
      }
      return {
        ...payload,
        objectives: undefined,
        uniqueObjectiveCount: groups.size,
        objectivesCompact: Array.from(groups.values())
      };
    }

    return payload;
  },

  _shouldSuppressImportantEvent(event, payload = {}) {
    const repeatable = new Set(['WORM_STEP_SKIPPED', 'WORM_DECISION']);
    if (!repeatable.has(event)) return false;

    if (!this._importantEventSeen) this._importantEventSeen = {};
    const turn = Number(gameState.turnNumber || 0);
    const keyBase = `${event}|${payload.playerId || '?'}|${payload.pair || '?'}|${payload.objective || '?'}|${payload.reason || '?'}|${payload.split || '?'}`;

    if (!this._importantEventSeen[turn]) this._importantEventSeen = { [turn]: new Set() };
    const seen = this._importantEventSeen[turn];
    if (seen.has(keyBase)) return true;
    seen.add(keyBase);
    return false;
  },

  _getEarlyTurnLogState(turn) {
    if (!this._earlyTurnLogState) this._earlyTurnLogState = {};
    if (!this._earlyTurnLogState[turn]) {
      this._earlyTurnLogState = {
        [turn]: {
          wormNodeStatusCount: 0
        }
      };
    }
    return this._earlyTurnLogState[turn];
  },

  _shouldSuppressByEarlyTurnFilter(event, payload = {}, channel = 'important') {
    if (!this.LOG_ONLY_EARLY_TURN_EVENTS) return false;

    if (channel === 'important' && this.WORM_LOG_ONLY_HUMAN_TRACE) {
      const noisyWormEvents = new Set([
        'WORM_PLAN',
        'WORM_NODE_STATUS',
        'WORM_STEP_START',
        'WORM_SPLIT',
        'WORM_MERGE',
        'WORM_RELAY_MOVE',
        'WORM_ACTION',
        'WORM_DECISION',
        'WORM_STEP_SKIPPED',
        'WORM_NODE_RESULT'
      ]);
      if (noisyWormEvents.has(event)) return true;
    }

    if (channel === 'important' && !this.WORM_DETAILED_TRACE) {
      if (event === 'WORM_ACTION' || event === 'WORM_DECISION' || event === 'WORM_STEP_SKIPPED') {
        return true;
      }
    }

    const allowedImportant = this.EARLY_TURN_IMPORTANT_EVENTS || [];
    const allowedMetric = this.EARLY_TURN_METRIC_EVENTS || [];
    const allowed = channel === 'metric' ? allowedMetric : allowedImportant;
    if (!allowed.includes(event)) return true;

    if (channel === 'important' && event === 'WORM_NODE_STATUS') {
      const turn = Number(gameState.turnNumber || 0);
      const state = this._getEarlyTurnLogState(turn);
      state.wormNodeStatusCount += 1;
      const limit = Math.max(1, Number(this.EARLY_TURN_WORM_NODE_STATUS_LIMIT) || 1);
      return state.wormNodeStatusCount > limit;
    }

    return false;
  },

  _inferCanonicalMissionType(unit) {
    const assignments = (typeof AiGameplayManager !== 'undefined') ? AiGameplayManager.missionAssignments : null;
    const mission = assignments?.get ? assignments.get(unit?.id) : null;
    const raw = String(mission?.type || '').toUpperCase();
    if (raw.includes('OCCUPY') || raw.includes('CORRIDOR') || raw.includes('NODE') || raw.includes('CARAVAN')) {
      return this.MISSION_TYPE_COMMERCIAL_CORRIDOR;
    }
    if (raw.includes('CONQUER') || raw.includes('CITY') || raw.includes('EMPERADOR')) {
      return this.MISSION_TYPE_CONQUEST_CITY;
    }
    if (this._isCorridorPioneer(unit)) return this.MISSION_TYPE_COMMERCIAL_CORRIDOR;
    return null;
  },

  _selectExecutionMission({ unit = null, target = null, candidateMissionType = null }) {
    const inferred = this._inferCanonicalMissionType(unit);
    const fromCandidate = candidateMissionType || inferred;
    const targetHex = target ? board[target.r]?.[target.c] : null;
    const isBankObjective = !!(target && this._isBankCityByCoords(target.r, target.c));
    if (isBankObjective) {
      const fallbackMission = fromCandidate === this.MISSION_TYPE_CONQUEST_CITY
        ? this.MISSION_TYPE_COMMERCIAL_CORRIDOR
        : (fromCandidate || this.MISSION_TYPE_COMMERCIAL_CORRIDOR);
      return {
        candidateMissionType: fromCandidate || 'UNSPECIFIED',
        selectedMissionType: fallbackMission,
        switched: !!fromCandidate && fallbackMission !== fromCandidate,
        reason: 'banca_inconquistable'
      };
    }
    const isCityObjective = !!(target?.type === 'city' || targetHex?.isCity);
    const selectedMissionType = isCityObjective
      ? this.MISSION_TYPE_CONQUEST_CITY
      : (fromCandidate || this.MISSION_TYPE_COMMERCIAL_CORRIDOR);
    const switched = !!fromCandidate && selectedMissionType !== fromCandidate;
    const reason = switched
      ? 'oportunidad_tactica_superior'
      : 'mantener_mision_candidata';
    return {
      candidateMissionType: fromCandidate || 'UNSPECIFIED',
      selectedMissionType,
      switched,
      reason
    };
  },

  _metricGetTurnState(playerId) {
    if (!this._metricTurnState) this._metricTurnState = {};
    const currentTurn = Number(gameState.turnNumber || 0);
    const existing = this._metricTurnState[playerId];
    if (!existing || existing.turn !== currentTurn) {
      this._metricTurnState[playerId] = {
        turn: currentTurn,
        playerId,
        actionUsefulCommercial: false,
        usefulActionType: null,
        pendingNoOwn: 0,
        pendingOwnNoRoad: 0,
        pendingBlocked: 0,
        dominantBlocker: null,
        nextPlannedAction: null,
        objectiveCommercialMode: 'unknown'
      };
    }
    return this._metricTurnState[playerId];
  },

  _isCommercialSplitMergeMandatoryTurn() {
    const turn = Number(gameState.turnNumber || 0);
    const limit = Math.max(1, Number(this.COMMERCIAL_SPLIT_MERGE_MANDATORY_TURN_LIMIT) || 2);
    return turn <= limit;
  },

  _getCommercialSplitMergeTurnState(playerId) {
    if (!this._commercialSplitMergeState) this._commercialSplitMergeState = {};
    const currentTurn = Number(gameState.turnNumber || 0);
    const existing = this._commercialSplitMergeState[playerId];
    if (!existing || existing.turn !== currentTurn) {
      this._commercialSplitMergeState[playerId] = {
        turn: currentTurn,
        playerId,
        successfulRelays: 0
      };
    }
    return this._commercialSplitMergeState[playerId];
  },

  _registerCommercialSplitMergeSuccess(playerId) {
    const st = this._getCommercialSplitMergeTurnState(playerId);
    st.successfulRelays += 1;
    return st.successfulRelays;
  },

  _hasCommercialSplitMergeQuotaForRoadBuild(playerId) {
    if (!this._isCommercialSplitMergeMandatoryTurn()) return true;
    const minRequired = Math.max(1, Number(this.COMMERCIAL_MIN_SPLIT_MERGE_BEFORE_ROAD_BUILD) || 3);
    const st = this._getCommercialSplitMergeTurnState(playerId);
    return st.successfulRelays >= minRequired;
  },

  _metricStartTurn(playerId, phase = 'unknown') {
    const st = this._metricGetTurnState(playerId);
    const routesCount = (units || []).filter(u => u.player === playerId && !!u.tradeRoute).length;
    st.objectiveCommercialMode = routesCount > 0 ? 'maintenance' : 'bootstrap';
    this._importantLog('TURN_START', {
      playerId,
      phase,
      commercialMode: st.objectiveCommercialMode,
      activeRoutes: routesCount
    });
    this._metricLog('IA_METRIC_TURN_START', {
      turn: st.turn,
      playerId,
      phase,
      commercialPriorityMode: st.objectiveCommercialMode,
      activeRoutes: routesCount
    });
  },

  _metricMarkCommercialUseful(playerId, usefulActionType, extra = {}) {
    const st = this._metricGetTurnState(playerId);
    st.actionUsefulCommercial = true;
    st.usefulActionType = usefulActionType;
    this._metricLog('IA_COMMERCIAL_USEFUL_ACTION', {
      turn: st.turn,
      playerId,
      usefulActionType,
      ...extra
    });
  },

  _metricSetCommercialBlocker(playerId, blocker, nextPlannedAction = null, extra = {}) {
    const st = this._metricGetTurnState(playerId);
    // Si todavía faltan segmentos de camino, el bloqueo dominante no debe degradarse a "sin candidata de ruta".
    if (blocker === 'no_new_trade_route_candidate' && (st.pendingOwnNoRoad || 0) > 0) {
      blocker = 'road_pending_segments';
      if (!nextPlannedAction) nextPlannedAction = 'continue_road_building';
    }
    st.dominantBlocker = blocker;
    if (nextPlannedAction) st.nextPlannedAction = nextPlannedAction;
    this._metricLog('IA_COMMERCIAL_BLOCKER', {
      turn: st.turn,
      playerId,
      blocker,
      nextPlannedAction: st.nextPlannedAction,
      ...extra
    });
  },

  _metricSetCommercialPending(playerId, counts = {}) {
    const st = this._metricGetTurnState(playerId);
    st.pendingNoOwn = Number(counts.pendingNoOwn ?? st.pendingNoOwn ?? 0);
    st.pendingOwnNoRoad = Number(counts.pendingOwnNoRoad ?? st.pendingOwnNoRoad ?? 0);
    st.pendingBlocked = Number(counts.pendingBlocked ?? st.pendingBlocked ?? 0);
  },

  _metricEndTurn(playerId, reason = 'normal') {
    const st = this._metricGetTurnState(playerId);
    this._metricLog('IA_METRIC_TURN_END', {
      turn: st.turn,
      playerId,
      reason,
      actionUsefulCommercial: !!st.actionUsefulCommercial,
      usefulActionType: st.usefulActionType,
      pendingNoOwn: st.pendingNoOwn,
      pendingOwnNoRoad: st.pendingOwnNoRoad,
      pendingBlocked: st.pendingBlocked,
      dominantBlocker: st.dominantBlocker,
      nextPlannedAction: st.nextPlannedAction
    });
  },

  _isRepeatedInvalidMoveThisTurn(playerId, unitId, r, c) {
    if (!this._invalidMoveAttempts) this._invalidMoveAttempts = {};
    const turn = Number(gameState.turnNumber || 0);
    const st = this._invalidMoveAttempts[playerId];
    if (!st || st.turn !== turn) {
      this._invalidMoveAttempts[playerId] = { turn, keys: new Set() };
      return false;
    }
    const key = `${unitId}:${r},${c}`;
    return st.keys.has(key);
  },

  _registerInvalidMoveThisTurn(playerId, unitId, r, c) {
    if (!this._invalidMoveAttempts) this._invalidMoveAttempts = {};
    const turn = Number(gameState.turnNumber || 0);
    if (!this._invalidMoveAttempts[playerId] || this._invalidMoveAttempts[playerId].turn !== turn) {
      this._invalidMoveAttempts[playerId] = { turn, keys: new Set() };
    }
    const key = `${unitId}:${r},${c}`;
    this._invalidMoveAttempts[playerId].keys.add(key);
  },

  // Método principal unificado
  ejecutarTurno(myPlayer) {
    console.log(`[IA_ARCHIPIELAGO] ========= TURNO ${gameState.turnNumber} - JUGADOR ${myPlayer} =========`);

    let didScheduleEnd = false;
    const scheduleAiEndTurn = (delayMs = 1500, reason = 'normal') => {
      if (didScheduleEnd) return;
      didScheduleEnd = true;

      setTimeout(() => {
        if (gameState.currentPlayer !== myPlayer || gameState.currentPhase !== 'play') return;
        if (typeof handleEndTurn === 'function') {
          console.log(`[IA_ARCHIPIELAGO] Finalizando turno IA (motivo=${reason}).`);
          handleEndTurn();
        } else {
          console.error('[IA_ARCHIPIELAGO] handleEndTurn no disponible; no se puede cerrar el turno IA.');
        }
      }, delayMs);
    };

    try {
      // Variables para metas y filtrado
      let totalMetas = 0;
      let totalFiltradas = 0;
      const turnStartTs = Date.now();
      const turnBudgetMs = Math.max(40, Number(this.TURN_CPU_BUDGET_MS) || 120);
      const maxOccupationObjectives = Math.max(1, Number(this.MAX_OCCUPATION_OBJECTIVES_PER_TURN) || 8);
      this._importantLog('OCCUPATION_LIMIT_CONFIG', {
        playerId: myPlayer,
        configuredMaxOccupationObjectives: Number(this.MAX_OCCUPATION_OBJECTIVES_PER_TURN) || null,
        effectiveMaxOccupationObjectives: maxOccupationObjectives,
        turnBudgetMs
      });

      if (typeof IASentidos === 'undefined') {
        console.error(`[IA_ARCHIPIELAGO] ERROR CRÍTICO: IASentidos no disponible.`);
        scheduleAiEndTurn(500, 'iasentidos_missing');
        return;
      }

      if (!this._turnBuildRetryBlock) this._turnBuildRetryBlock = {};
      this._turnBuildRetryBlock[myPlayer] = { turn: gameState.turnNumber, keys: new Set() };

      const infoTurno = IASentidos.getTurnInfo();
      this._metricStartTurn(myPlayer, infoTurno.currentPhase || 'unknown');
      if (infoTurno.currentPhase !== 'play') {
        console.warn(`[IA_ARCHIPIELAGO] Turno IA invocado fuera de fase play (${infoTurno.currentPhase}). Forzando cierre seguro.`);
        this._metricEndTurn(myPlayer, 'phase_mismatch');
        scheduleAiEndTurn(250, 'phase_mismatch');
        return;
      }

      // Antes de planificar construcciones, intentar liberar casillas que quedaron bloqueadas el turno anterior.
      this._procesarDesbloqueoConstruccionesPendientes(myPlayer);

      // Captura oportunista temprana: ciudades/fortalezas vacías adyacentes no deben perderse.
      this._executeOpportunisticCapture(myPlayer);
      this._forceExplorerRuinsAction(myPlayer);

      // --- 1. RECOPILACIÓN DE DATOS ---
      const hexesPropios = IASentidos.getOwnedHexes(myPlayer);
      const ciudades = IASentidos.getCities(myPlayer);
      const ciudadesPropiasPendientes = ciudades.filter(c => !this.isGoalCompletedFlujo('ocupacion', c.r, c.c, myPlayer));
      const recursosPropiosPendientes = hexesPropios.filter(h => h.resourceNode && !this.isGoalCompletedFlujo('ocupacion', h.r, h.c, myPlayer));
      const infraestructura = hexesPropios.filter(h => h.structure);

      // --- 2. FLUJO 1: OCUPACIÓN ---
      console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Iniciando...`);
      let ocupacionesRealizadas = 0;
      const earlyCorridorPush = (Number(gameState.turnNumber || 0) <= (Number(this.COMMERCIAL_SPLIT_MERGE_MANDATORY_TURN_LIMIT || 2) + 1));
      const corridorObjectiveBudget = earlyCorridorPush
        ? maxOccupationObjectives
        : Math.max(1, Math.floor(maxOccupationObjectives / 2));
      const corredoresTop = this._getTopCorridorObjectives(myPlayer, corridorObjectiveBudget);
      const uniqueCorridorObjectives = [];
      const uniqueCorridorSet = new Set();
      for (const node of corredoresTop) {
        const key = `${node.objective.r},${node.objective.c}`;
        if (uniqueCorridorSet.has(key)) continue;
        uniqueCorridorSet.add(key);
        uniqueCorridorObjectives.push(node.objective);
      }
      if (corredoresTop.length > 0) {
        const sampleLimit = Math.max(1, Number(this.CORRIDOR_SUMMARY_SAMPLE_LIMIT) || 3);
        const uniqueNodes = new Set();
        for (const node of corredoresTop) {
          if (node?.from) uniqueNodes.add(`${node.from.r},${node.from.c}`);
          if (node?.to) uniqueNodes.add(`${node.to.r},${node.to.c}`);
        }
        const sample = corredoresTop
          .slice(0, sampleLimit)
          .map(node => `${node.from?.name || 'NODO_A'}(${node.from?.r},${node.from?.c})->${node.to?.name || 'NODO_B'}(${node.to?.r},${node.to?.c}) via (${node.objective.r},${node.objective.c})`)
          .join(' | ');
        const summaryBase = `[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Corredores objetivo: pares=${corredoresTop.length} objetivos=${uniqueCorridorObjectives.length} nodosUnicos=${uniqueNodes.size}`;
        if (this.WORM_DETAILED_TRACE) {
          const detalleCompleto = corredoresTop
            .map(node => `${node.from?.name || 'NODO_A'}(${node.from?.r},${node.from?.c})->${node.to?.name || 'NODO_B'}(${node.to?.r},${node.to?.c}) via (${node.objective.r},${node.objective.c})`)
            .join(' | ');
          console.log(`${summaryBase} | detalle=${detalleCompleto}`);
        } else {
          console.log(`${summaryBase} | muestra=${sample}`);
        }
        this._importantLog('CORRIDOR_OBJECTIVES', {
          playerId: myPlayer,
          count: uniqueCorridorObjectives.length,
          pairCount: corredoresTop.length,
          uniqueObjectiveCount: uniqueCorridorObjectives.length,
          objectives: corredoresTop.map(node => ({
            from: `${node.from?.r},${node.from?.c}`,
            to: `${node.to?.r},${node.to?.c}`,
            objective: `${node.objective.r},${node.objective.c}`,
            pendingType: node.pendingType || 'capture',
            layer: Number.isInteger(node.layer) ? node.layer : 0
          }))
        });
      } else {
        console.log('[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Sin corredores pendientes detectados en red comercial.');
        const diag = this._diagnoseCorridorObjectives(myPlayer, 8);
        this._importantLog('CORRIDOR_OBJECTIVES_DIAG', {
          playerId: myPlayer,
          ownNodes: diag.ownNodes,
          tradeNodes: diag.tradeNodes,
          analyzedPairs: diag.analyzedPairs,
          sample: diag.sample
        });
      }

      const mapaRecursosNoPropios = Array.isArray(board)
        ? board.flat().filter(h => h && h.resourceNode && h.owner !== myPlayer)
        : [];
      const ciudadesNoPropias = (gameState.cities || []).filter(c => c && c.owner !== myPlayer);
      const objetivosCorredor = uniqueCorridorObjectives;
      // Regla estricta: este flujo solo ocupa casillas de corredor entre nodos.
      const objetivosOcupacion = [...objetivosCorredor]
        .filter(o => Number.isInteger(o?.r) && Number.isInteger(o?.c))
        .filter(o => !this.isGoalCompletedFlujo('ocupacion', o.r, o.c, myPlayer))
        .filter((o, idx, arr) => arr.findIndex(x => x.r === o.r && x.c === o.c) === idx);
      this._importantLog('OCCUPATION_PLAN', {
        playerId: myPlayer,
        objectivesTotal: objetivosOcupacion.length,
        corridorObjectives: objetivosCorredor.length,
        foreignCities: 0,
        foreignResources: 0,
        missionMode: 'corridor_capture_only'
      });

      const occupationMode = (earlyCorridorPush || objetivosOcupacion.length > 3) ? 'bootstrap' : 'maintenance';
      this._importantLog('OCCUPATION_MODE', {
        playerId: myPlayer,
        mode: occupationMode,
        earlyCorridorPush,
        objectiveBudget: corridorObjectiveBudget,
        objectivesPending: objetivosOcupacion.length
      });

      // Prioridad operativa: ejecutar gusano antes de la ocupación global para no gastar sus unidades en tareas generales.
      const wormActionBudget = occupationMode === 'bootstrap'
        ? Math.max(1, Math.min(maxOccupationObjectives, Number(this.WORM_MAX_ACTIONS_PER_TURN) || maxOccupationObjectives))
        : Math.max(1, Math.min(4, objetivosOcupacion.length, Number(this.WORM_MAX_ACTIONS_PER_TURN) || 4));
      const accionesGusano = this._ejecutarGusanoCorredor({ myPlayer }, {
        maxActions: wormActionBudget
      });
      console.log(`[IA_ARCHIPIELAGO][GUSANO] Modo=${occupationMode} Acciones ejecutadas: ${accionesGusano}`);

      const objetivosPendientesPostGusano = objetivosOcupacion.filter(obj => {
        if (!Number.isInteger(obj?.r) || !Number.isInteger(obj?.c)) return false;
        const hex = board[obj.r]?.[obj.c];
        const occ = getUnitOnHex(obj.r, obj.c);
        if (!hex) return false;
        if (hex.owner === myPlayer) return false;
        if (occ && occ.player === myPlayer) return false;
        return true;
      });

      if (occupationMode === 'bootstrap' && accionesGusano >= maxOccupationObjectives) {
        this._importantLog('OCCUPATION_POST_WORM', {
          playerId: myPlayer,
          mode: occupationMode,
          skippedGlobalOccupation: true,
          reason: 'worm_budget_full',
          wormActions: accionesGusano,
          pendingAfterWorm: objetivosPendientesPostGusano.length
        });
      }

      let ocupacionProcesadas = 0;
      let ocupacionObjetivosEvaluados = 0;
      const objetivosParaBucleGlobal = (occupationMode === 'bootstrap' && accionesGusano >= maxOccupationObjectives)
        ? []
        : objetivosPendientesPostGusano;
      for (const obj of objetivosParaBucleGlobal) {
        if (ocupacionProcesadas >= maxOccupationObjectives) {
          console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Límite de objetivos alcanzado (${maxOccupationObjectives}).`);
          break;
        }
        if ((Date.now() - turnStartTs) >= turnBudgetMs) {
          console.warn(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Presupuesto de tiempo agotado (${turnBudgetMs}ms).`);
          break;
        }

        ocupacionObjetivosEvaluados++;
        if (this._requestMoveOrAttack) {
          const candidateUnit = (IASentidos.getUnits(myPlayer) || [])
            .filter(u => u && u.currentHealth > 0)
            .filter(u => !u.hasMoved && (u.currentMovement || u.movement || 0) > 0)
            .filter(u => this._isLandUnit(u))
            .filter(u => occupationMode === 'bootstrap' ? true : !this._isCorridorPioneer(u))
            .sort((a, b) => hexDistance(a.r, a.c, obj.r, obj.c) - hexDistance(b.r, b.c, obj.r, obj.c))
            .find(u => !!this._findPathForUnit(u, obj.r, obj.c));

          if (!candidateUnit) continue;
          const beforeOwner = board[obj.r]?.[obj.c]?.owner;
          let result = false;
          const fallbackAllowed = occupationMode === 'bootstrap' || !this._isCommercialSplitMergeMandatoryTurn();

          if (occupationMode === 'bootstrap') {
            result = this._requestMoveOrAttack(candidateUnit, obj.r, obj.c, { missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR });
          } else {
            const relayAttempt = this._attemptSplitMergeRelayToObjective(
              myPlayer,
              candidateUnit,
              obj,
              { from: { name: 'OCUPACION_GENERAL' }, to: { name: 'OBJETIVO_CORREDOR' } },
              this.MISSION_TYPE_COMMERCIAL_CORRIDOR
            );
            if (relayAttempt.ok && (relayAttempt.moved || relayAttempt.progressed)) {
              result = true;
            } else if (fallbackAllowed) {
              result = this._requestMoveOrAttack(candidateUnit, obj.r, obj.c, { missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR });
            }
          }

          if (result) {
            ocupacionProcesadas++;
            const afterOwner = board[obj.r]?.[obj.c]?.owner;
            const conquered = beforeOwner !== myPlayer && afterOwner === myPlayer;
            if (conquered) {
              this.registrarMetaFlujo('ocupacion', obj.r, obj.c, myPlayer);
              ocupacionesRealizadas++;
              console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Conquista confirmada en (${obj.r},${obj.c}). ownerAntes=${beforeOwner} ownerDespues=${afterOwner}`);
              this._importantLog('OCCUPATION_RESULT', {
                playerId: myPlayer,
                unitId: candidateUnit.id,
                objective: `${obj.r},${obj.c}`,
                result: 'conquered',
                ownerBefore: beforeOwner,
                ownerAfter: afterOwner
              });
            } else {
              console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Movimiento táctico a (${obj.r},${obj.c}) sin conquista. ownerAntes=${beforeOwner} ownerDespues=${afterOwner}`);
              this._importantLog('OCCUPATION_RESULT', {
                playerId: myPlayer,
                unitId: candidateUnit.id,
                objective: `${obj.r},${obj.c}`,
                result: 'reposition_only',
                ownerBefore: beforeOwner,
                ownerAfter: afterOwner
              });
            }
          }
        }
      }
      this._importantLog('OCCUPATION_QUOTA_STATUS', {
        playerId: myPlayer,
        quotaMode: 'success_only',
        objectivesEvaluated: ocupacionObjetivosEvaluados,
        quotaConsumedByActions: ocupacionProcesadas,
        quotaMax: maxOccupationObjectives,
        conquistas: ocupacionesRealizadas
      });
      console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Finalizado. Conquistas: ${ocupacionesRealizadas}`);

      // Tras ocupar corredores, forzar una capa de misiones tácticas para evitar divisiones inertes:
      // 1) desalojar casillas de camino pendientes, 2) empujar conquistas de ciudad, 3) capturar hills rentables.
      const postCorridorMissionBudget = Math.max(2, Math.min(6, maxOccupationObjectives));
      this._executePostCorridorMissionLayer(myPlayer, { maxActions: postCorridorMissionBudget });
      this._executeStrategicProtocolBundle(myPlayer, { phase: 'post_worm' });

      // --- 3. FLUJO 2: CONSTRUCCIÓN EXHAUSTIVA ---
      if (typeof this.construirInfraestructura === 'function') {
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Ejecutando construcción preventiva...`);
        this.construirInfraestructura(myPlayer, hexesPropios, { oro: 99999 });
      }

      // --- 4. ANÁLISIS ECONÓMICO Y TÁCTICO ---
      const economia = (typeof IAEconomica !== 'undefined') ? IAEconomica.evaluarEconomia(myPlayer) : { oro: 0 };
      const objetivosSiguientes = ciudadesPropiasPendientes.concat(recursosPropiosPendientes);
      const amenazas = (typeof IATactica !== 'undefined') ? IATactica.detectarAmenazasSobreObjetivos(myPlayer, objetivosSiguientes, 3) : [];
      const frente = (typeof IATactica !== 'undefined') ? IATactica.detectarFrente(myPlayer, 2) : [];
      const recursosEnMapa = (typeof IAEconomica !== 'undefined') ? IAEconomica.contarRecursosEnMapa(myPlayer) : { total: 0 };
      const enemyPlayer = this._getEnemyPlayerId(myPlayer);
      const recursosVulnerables = (typeof IAEconomica !== 'undefined' && enemyPlayer != null) ? IAEconomica.detectarRecursosVulnerables(enemyPlayer) : [];

      const situacion = {
        amenazas,
        frente,
        economia,
        recursosEnMapa,
        recursosVulnerables,
        myPlayer,
        ciudades,
        hexesPropios,
        recursos: recursosPropiosPendientes,
        infraestructura,
        snapshotActividad: this._snapshotTurnActivity(myPlayer),
        turnStartTs,
        turnBudgetMs
      };

      situacion.enemyProfile = this._evaluateEnemyExpansionStrategy(myPlayer);

      // --- 5. EJECUCIÓN DE PLANES ESTRATÉGICOS ---
      this._ejecutarCapaEstructuralRed(situacion);
      this._executeEasyVictoryPointOpportunities(situacion);

      const rutas = this._evaluarRutasDeVictoria(situacion);
      situacion.rutas = rutas;
      this._logRutasDeVictoria(rutas);
      this._procesarRutasDeVictoria(situacion);
      this._forceHeroProgressWhenPossible(situacion);
      this._ensureMinimumCommercialAction(situacion);
      this._executeStrategicProtocolBundle(myPlayer, { phase: 'post_routes' });

      // Plan de emergencia si no hubo progreso
      if (!this._didMakeProgressThisTurn(myPlayer, situacion.snapshotActividad)) {
        console.warn('[IA_ARCHIPIELAGO] Turno inerte detectado. Activando emergencia...');
        this._ejecutarPlanEmergencia(situacion);
      }

      // --- 6. FINALIZACIÓN ---
      console.log(`[IA_ARCHIPIELAGO] Turno completado para Jugador ${myPlayer}.`);
      this._metricEndTurn(myPlayer, 'normal');
      scheduleAiEndTurn(1500, 'normal');
      return situacion;
    } catch (err) {
      console.error('[IA_ARCHIPIELAGO] Error no controlado en ejecutarTurno:', err);
      this._metricEndTurn(myPlayer, 'exception');
      scheduleAiEndTurn(250, 'exception');
      return null;
    }
  },
  _runDeterministicBootstrapController(situacion) {
    const { myPlayer } = situacion;
    if (gameState.currentPhase !== 'play') return;
    if (typeof AiDeploymentManager === 'undefined') return;
    if (typeof AiGameplayManager === 'undefined') return;

    const analysis = typeof AiDeploymentManager.analyzeEnvironment === 'function'
      ? AiDeploymentManager.analyzeEnvironment(myPlayer)
      : null;
    const stages = typeof AiDeploymentManager._buildDeterministicBootstrapStages === 'function'
      ? AiDeploymentManager._buildDeterministicBootstrapStages(analysis, myPlayer)
      : [];
    if (!stages.length) return;

    if (!gameState.aiDeterministicBootstrap) gameState.aiDeterministicBootstrap = {};
    if (!gameState.aiDeterministicBootstrap[myPlayer]) {
      gameState.aiDeterministicBootstrap[myPlayer] = { stageIndex: 0, completed: [], createdStages: [] };
    }

    const state = gameState.aiDeterministicBootstrap[myPlayer];
    state.createdStages = Array.isArray(state.createdStages) ? state.createdStages : [];
    state.completed = Array.isArray(state.completed) ? state.completed : [];

    const stageIndex = Math.max(0, Math.min(state.stageIndex || 0, stages.length - 1));
    const stage = stages[stageIndex];
    if (!stage) return;

    const stageUnits = IASentidos.getUnits(myPlayer).filter(u =>
      u && u.currentHealth > 0 && u.iaBootstrapObjective && Number(u.iaBootstrapObjective.stageIndex) === stageIndex
    );

    // Si no existe división de la etapa actual, crearla en una ciudad/fortaleza propia libre.
    if (stageUnits.length === 0 && !state.createdStages.includes(stageIndex)) {
      const newUnit = AiGameplayManager.produceUnit(
        myPlayer,
        ['Infantería Ligera', 'Infantería Ligera'],
        'builder',
        `Pionero Bootstrap S${stageIndex + 1}`
      );
      if (newUnit) {
        newUnit.iaBootstrapObjective = {
          r: stage.objectiveHex.r,
          c: stage.objectiveHex.c,
          stageIndex,
          stageLabel: stage.label,
          fromNode: stage.fromNode,
          toNode: stage.toNode
        };
        state.createdStages.push(stageIndex);
        console.log(`[IA BOOTSTRAP] J${myPlayer} creada division etapa ${stageIndex + 1}: ${stage.label} objetivo=(${stage.objectiveHex.r},${stage.objectiveHex.c})`);
      }
    }

    const refreshedStageUnits = IASentidos.getUnits(myPlayer).filter(u =>
      u && u.currentHealth > 0 && u.iaBootstrapObjective && Number(u.iaBootstrapObjective.stageIndex) === stageIndex
    );
    const actor = refreshedStageUnits
      .slice()
      .sort((a, b) => hexDistance(a.r, a.c, stage.objectiveHex.r, stage.objectiveHex.c) - hexDistance(b.r, b.c, stage.objectiveHex.r, stage.objectiveHex.c))[0];

    if (actor) {
      AiGameplayManager.missionAssignments.set(actor.id, {
        type: 'IA_NODE',
        objective: { r: stage.objectiveHex.r, c: stage.objectiveHex.c },
        nodoTipo: 'corredor_comercial',
        axisName: `bootstrap_stage_${stageIndex}`,
        bootstrapStageLabel: stage.label
      });

      if (!actor.hasMoved && (actor.currentMovement || 0) > 0) {
        this._requestMoveOrAttack(actor, stage.objectiveHex.r, stage.objectiveHex.c);
        console.log(`[IA BOOTSTRAP] J${myPlayer} etapa ${stageIndex + 1} movimiento hacia (${stage.objectiveHex.r},${stage.objectiveHex.c})`);
      }
    }

    const objectiveHex = board[stage.objectiveHex.r]?.[stage.objectiveHex.c];
    const occupiedByUs = !!(objectiveHex && objectiveHex.owner === myPlayer);
    const unitOnObjective = getUnitOnHex(stage.objectiveHex.r, stage.objectiveHex.c);
    const reached = occupiedByUs || !!(unitOnObjective && unitOnObjective.player === myPlayer);

    if (reached) {
      const alreadyCompleted = state.completed.some(c => c && c.stageIndex === stageIndex && c.reached === true);
      if (!alreadyCompleted) {
        state.completed.push({ stageIndex, stageLabel: stage.label, objectiveHex: stage.objectiveHex, turn: gameState.turnNumber, reached: true });
      }
      if (stageIndex < stages.length - 1) {
        state.stageIndex = stageIndex + 1;
      }
      console.log(`[IA BOOTSTRAP] J${myPlayer} etapa ${stageIndex + 1} completada (${stage.label}).`);
    }
  },

  _ejecutarCapaEstructuralRed(situacion) {
    const { myPlayer } = situacion || {};
    if (!myPlayer) return;

    // Mantiene el bootstrap determinista de apertura para evitar turnos IA inertes.
    if (typeof this._runDeterministicBootstrapController === 'function') {
      try {
        this._runDeterministicBootstrapController(situacion);
      } catch (e) {
        console.warn('[IA_ARCHIPIELAGO] Error en bootstrap estructural:', e);
      }
    }

    // Compatibilidad con capas orgánicas antiguas si están disponibles.
    // Modo seguro: estas capas son costosas en mapas grandes y pueden bloquear el hilo UI.
    const ownCitiesCount = (gameState.cities || []).filter(c => c && c.owner === myPlayer).length;
    const safeModeEnabled = this.ORGANIC_LAYER_SAFE_MODE !== false;
    const intervalTurns = Math.max(1, Number(this.ORGANIC_LAYER_INTERVAL_TURNS) || 1);
    const maxCities = Math.max(1, Number(this.ORGANIC_LAYER_MAX_OWN_CITIES) || 7);
    const activeRoutes = (units || []).filter(u => u.player === myPlayer && !!u.tradeRoute).length;
    const forceOrganicBootstrap = activeRoutes === 0;

    if (!gameState.aiOrganicLayerLastRun) gameState.aiOrganicLayerLastRun = {};
    const lastRun = Number(gameState.aiOrganicLayerLastRun[myPlayer] || 0);
    const turnsSinceLastRun = Math.max(0, (gameState.turnNumber || 0) - lastRun);
    const allowByInterval = !safeModeEnabled || turnsSinceLastRun >= intervalTurns;
    const allowByScale = !safeModeEnabled || ownCitiesCount <= maxCities;
    const shouldRunOrganicLayer = forceOrganicBootstrap || (allowByInterval && allowByScale);

    if (!shouldRunOrganicLayer) {
      console.log(`[IA_ARCHIPIELAGO] Capa orgánica omitida (safeMode=${safeModeEnabled}, ciudades=${ownCitiesCount}, rutas=${activeRoutes}, desdeUltEjec=${turnsSinceLastRun}).`);
      return;
    }

    if (typeof AiGameplayManager !== 'undefined') {
      if (this.ENABLE_ORGANIC_TRADE_LAYER !== false && typeof AiGameplayManager._ensureTradeInfrastructureOrganic === 'function') {
        try {
          AiGameplayManager._ensureTradeInfrastructureOrganic(myPlayer);
        } catch (e) {
          console.warn('[IA_ARCHIPIELAGO] Error en infraestructura comercial orgánica:', e);
        }
      } else if (this.ENABLE_ORGANIC_TRADE_LAYER === false) {
        console.log('[IA_ARCHIPIELAGO] Capa orgánica de comercio desactivada para evitar conflictos con Ruta Larga.');
      }
      if (typeof AiGameplayManager._ensureCityExpansionOrganic === 'function') {
        try {
          AiGameplayManager._ensureCityExpansionOrganic(myPlayer);
        } catch (e) {
          console.warn('[IA_ARCHIPIELAGO] Error en expansión urbana orgánica:', e);
        }
      }

      gameState.aiOrganicLayerLastRun[myPlayer] = gameState.turnNumber;
    }
  },

  _ensureMinimumCommercialAction(situacion) {
    const myPlayer = situacion?.myPlayer;
    if (!myPlayer) return false;

    const st = this._metricGetTurnState(myPlayer);
    if (st.actionUsefulCommercial) return true;

    this._metricLog('IA_COMMERCIAL_MIN_ACTION_GUARD', {
      turn: gameState.turnNumber,
      playerId: myPlayer,
      status: 'triggered',
      reason: 'no_useful_commercial_action_yet'
    });

    let progressed = false;
    try {
      progressed = !!this._ejecutarRutaLarga(situacion);
    } catch (e) {
      console.warn('[IA_ARCHIPIELAGO] Guard de acción comercial mínima falló en Ruta Larga:', e);
    }

    if (!progressed && this.ENABLE_ORGANIC_TRADE_LAYER !== false && typeof AiGameplayManager !== 'undefined' && typeof AiGameplayManager._ensureTradeInfrastructureOrganic === 'function') {
      try {
        const beforeRoutes = (units || []).filter(u => u.player === myPlayer && !!u.tradeRoute).length;
        AiGameplayManager._ensureTradeInfrastructureOrganic(myPlayer);
        const afterRoutes = (units || []).filter(u => u.player === myPlayer && !!u.tradeRoute).length;
        progressed = afterRoutes > beforeRoutes;
      } catch (e) {
        console.warn('[IA_ARCHIPIELAGO] Guard de acción comercial mínima falló en capa orgánica:', e);
      }
    }

    if (!progressed && !st.actionUsefulCommercial) {
      this._metricSetCommercialBlocker(myPlayer, st.dominantBlocker || 'min_action_guard_no_progress', 'retry_next_turn_guard');
    }

    this._metricLog('IA_COMMERCIAL_MIN_ACTION_GUARD', {
      turn: gameState.turnNumber,
      playerId: myPlayer,
      status: progressed || st.actionUsefulCommercial ? 'satisfied' : 'unsatisfied',
      actionUsefulCommercial: this._metricGetTurnState(myPlayer).actionUsefulCommercial
    });

    return progressed || this._metricGetTurnState(myPlayer).actionUsefulCommercial;
  },

  /**
   * Crea una unidad mínima en Archipiélago si la IA no tiene ninguna.
   * Evita partidas “muertas” en el primer turno.
   */
  crearUnidadInicialDeEmergencia(myPlayer) {
    try {
      const playerResources = gameState.playerResources?.[myPlayer];
      if (!playerResources) return;

      // Buscar capital o ciudad del jugador y usar solo casillas de reclutamiento validas.
      const ownCities = (gameState.cities || []).filter(c => c.owner === myPlayer);
      const fortressHexes = board.flat().filter(h => h && h.owner === myPlayer && ['Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli'].includes(h.structure));
      const capital = ownCities.find(c => c.isCapital) || ownCities[0];
      if (!capital) {
        console.warn(`[IA_ARCHIPIELAGO] No se encontró capital/ciudad para jugador ${myPlayer}.`);
        return;
      }

      const centers = [...ownCities, ...fortressHexes];
      const spot = centers.find(c => {
        const hex = board[c.r]?.[c.c];
        return hex && !hex.unit && hex.terrain !== 'water';
      });

      if (!spot) {
        console.warn(`[IA_ARCHIPIELAGO] No se encontró ciudad/fortaleza libre para crear unidad de emergencia.`);
        return;
      }

      // Definir unidad mínima
      let regType = 'Infantería Ligera';
      if (!REGIMENT_TYPES[regType] && REGIMENT_TYPES['Pueblo']) {
        regType = 'Pueblo';
      }
      const regData = REGIMENT_TYPES[regType];
      if (!regData) {
        console.error(`[IA_ARCHIPIELAGO] REGIMENT_TYPES inválido. Abortando creación de emergencia.`);
        return;
      }

      const cost = regData.cost?.oro || (regType === 'Pueblo' ? 80 : 150);
      if (playerResources.oro < cost) {
        // Permitir una unidad “gratuita” si la IA no puede pagar y no tiene unidades
        console.warn(`[IA_ARCHIPIELAGO] Oro insuficiente (${playerResources.oro}). Creando unidad gratis para evitar bloqueo.`);
      } else {
        playerResources.oro -= cost;
      }

      const unitData = {
        id: `u${unitIdCounter++}`,
        player: myPlayer,
        name: `Guardia Inicial IA`,
        regiments: [{ ...regData, type: regType, id: `r${Date.now()}${Math.random()}`}],
        r: spot.r,
        c: spot.c,
        hasMoved: false,
        hasAttacked: false,
        level: 0,
        experience: 0,
        morale: 50,
        maxMorale: 125
      };

      if (typeof calculateRegimentStats === 'function') {
        calculateRegimentStats(unitData);
        unitData.currentHealth = unitData.maxHealth;
        unitData.currentMovement = unitData.movement;
      }

      if (typeof placeFinalizedDivision === 'function') {
        placeFinalizedDivision(unitData, spot.r, spot.c);
        console.log(`[IA_ARCHIPIELAGO] ✓ Unidad de emergencia creada en (${spot.r},${spot.c}).`);
      } else {
        console.error(`[IA_ARCHIPIELAGO] placeFinalizedDivision no está disponible.`);
      }
    } catch (err) {
      console.error(`[IA_ARCHIPIELAGO] Error creando unidad de emergencia:`, err);
    }
  },

  /**
   * FASE 1: FUSIÓN DEFENSIVA
   * Fusiona unidades cuando hay amenaza para formar "cuerpos de ejército"
   */
  ejecutarFusionesDefensivas(myPlayer, misUnidades, amenazas, frente, enemyProfile) {
    if (misUnidades.length < 2) return;

    console.log(`[IA_ARCHIPIELAGO] FUSIÓN DEFENSIVA: ${amenazas.length} amenazas, ${frente.length} puntos de frente`);

    // Buscar unidades cercanas que puedan fusionarse
    for (let i = 0; i < misUnidades.length; i++) {
      const unit1 = misUnidades[i];
      if (amenazas.length === 0 && this._isCorridorPioneer(unit1)) continue;
      // No fundir unidades con misiones activas de expansión o corredor.
      const mission1 = (typeof AiGameplayManager !== 'undefined') ? AiGameplayManager.missionAssignments?.get(unit1.id) : null;
      if (mission1 && ['OCCUPY_THEN_BUILD', 'IA_NODE', 'AXIS_ADVANCE', 'STONE_HILLS_EMERGENCY'].includes(mission1.type)) continue;
      const regimentosActuales = unit1.regiments?.length || 0;

      const targetSize = Math.min(
        MAX_REGIMENTS_PER_DIVISION,
        Math.max(12, enemyProfile?.maxRegiments || 0)
      );
      if (regimentosActuales >= targetSize) continue;

      // Buscar otra unidad cercana para fusionar
      for (let j = i + 1; j < misUnidades.length; j++) {
        const unit2 = misUnidades[j];
        if (amenazas.length === 0 && this._isCorridorPioneer(unit2)) continue;
        const mission2 = (typeof AiGameplayManager !== 'undefined') ? AiGameplayManager.missionAssignments?.get(unit2.id) : null;
        if (mission2 && ['OCCUPY_THEN_BUILD', 'IA_NODE', 'AXIS_ADVANCE', 'STONE_HILLS_EMERGENCY'].includes(mission2.type)) continue;
        const distancia = hexDistance(unit1.r, unit1.c, unit2.r, unit2.c);

        // Si están muy cerca y la suma no excede el máximo
        if (distancia <= 2 && regimentosActuales + (unit2.regiments?.length || 0) <= MAX_REGIMENTS_PER_DIVISION) {
          console.log(`[IA_ARCHIPIELAGO] Fusionando ${unit1.name} + ${unit2.name} en (${unit1.r},${unit1.c})`);
          
          // Primero mover unit2 adyacente a unit1
          if (distancia > 1) {
            const moveTarget = getHexNeighbors(unit1.r, unit1.c).find(n => !board[n.r]?.[n.c]?.unit);
            if (moveTarget) {
              this._requestMoveUnit(unit2, moveTarget.r, moveTarget.c);
            }
          }

          // Luego fusionar
          if (this._requestMergeUnits(unit2, unit1)) {
            console.log(`[IA_ARCHIPIELAGO] ✓ Fusión completada: ${unit1.name}`);
          }
          break; // Pasar a la siguiente unidad
        }
      }
    }
  },

  /**
   * FASE 2: DIVISIÓN ESTRATÉGICA
   * Divide unidades grandes para ocupar más territorio
   * COMO LOS LATIDOS DEL CORAZÓN: Continuo y automático
   */
  ejecutarDivisionesEstrategicas(myPlayer, misUnidades, hexesPropios, enemyProfile) {
    console.log(`[IA_ARCHIPIELAGO] DIVISIÓN ESTRATÉGICA: ${misUnidades.length} unidades`);

    for (const unit of misUnidades) {
      const regimientosActuales = unit.regiments?.length || 0;

      // Dividir unidades con más de 4 regimientos para expandir presencia en el mapa.
      if (regimientosActuales <= 4) continue;

      // Buscar un hexágono adyacente desocupado
      const hexesCercanos = getHexNeighbors(unit.r, unit.c);
      const hexoLibre = hexesCercanos.find(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit && board[n.r][n.c].terrain !== 'water');

      if (!hexoLibre) {
        console.log(`[IA_ARCHIPIELAGO] No hay espacio para dividir ${unit.name} en (${unit.r},${unit.c})`);
        continue;
      }

      // Preparar la división (50% en cada lado)
      const mitad = Math.ceil(regimientosActuales / 2);
      gameState.preparingAction = {
        type: 'split_unit',
        unitId: unit.id,
        newUnitRegiments: unit.regiments.slice(0, mitad),
        remainingOriginalRegiments: unit.regiments.slice(mitad)
      };

      console.log(`[IA_ARCHIPIELAGO] Dividiendo ${unit.name}: ${mitad} vs ${regimientosActuales - mitad} regimientos en (${hexoLibre.r},${hexoLibre.c})`);
      
      if (this._requestSplitUnit(unit, hexoLibre.r, hexoLibre.c)) {
        console.log(`[IA_ARCHIPIELAGO] ✓ División completada`);
      }
    }
  },

  /**
   * FASE 3: MOVIMIENTOS TÁCTICOS
   * Mueve unidades hacia objetivos estratégicos
   */
  ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion) {
    const { amenazas, frente, recursos: recursosEnHexes } = situacion;
    const unidadesEnemigas = IASentidos.getEnemyUnits(myPlayer);
    const enemyProfile = situacion.enemyProfile;
    const ruins = this._getUnexploredRuins();
    const canExploreRuins = ruins.length > 0 && this._ensureTech(myPlayer, 'RECONNAISSANCE');
    const supplyCutTargets = this._collectSupplyCutTargets(myPlayer, this.CUT_SUPPLY_MAX_TARGETS);
    const sabotageTargets = this._collectSabotageTargets(myPlayer);

    console.log(`[IA_ARCHIPIELAGO] MOVIMIENTOS TÁCTICOS: ${misUnidades.length} unidades`);

    const huntAssignments = enemyProfile?.mode === 'spread_small'
      ? this._planHuntSmallDivisions(myPlayer, misUnidades, unidadesEnemigas)
      : new Set();

    for (const unit of misUnidades) {
      if (!unit.currentMovement || unit.currentMovement <= 0) continue;
      if (unit.iaExpeditionTarget) continue;
      if (huntAssignments.has(unit.id)) continue;

      let objetivo = null;

      // PRIORIDAD 0: Explorar ruinas con exploradores
      const hasExplorer = unit.regiments?.some(reg => reg.type === 'Explorador');
      if (hasExplorer && canExploreRuins) {
        const ruinTarget = this._pickObjective(ruins, unit, myPlayer);
        if (ruinTarget) {
          if (unit.r === ruinTarget.r && unit.c === ruinTarget.c) {
            this._requestExploreRuins(unit);
            continue;
          }
          objetivo = ruinTarget;
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Ruina objetivo en (${objetivo.r},${objetivo.c})`);
        }
      }

      // PRIORIDAD 1: Cazar divisiones ligeras si el enemigo se expande en regimientos sueltos
      if (enemyProfile?.mode === 'spread_small' && unidadesEnemigas.length > 0) {
        const huntMax = enemyProfile.huntMaxReg || 1;
        const objetivosDebiles = unidadesEnemigas.filter(u => (u.regiments?.length || 0) <= huntMax);
        if (!objetivo) objetivo = this._pickObjective(objetivosDebiles, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Cazando unidad débil en (${objetivo.r},${objetivo.c})`);
        }
      }

      // PRIORIDAD 2: Defender si hay amenaza cercana
      if (amenazas.length > 0) {
        if (!objetivo) objetivo = this._pickObjective(amenazas, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo defensivo en (${objetivo.r},${objetivo.c})`);
        }
      }
      // PRIORIDAD 3: Cortar suministro enemigo
      else if (supplyCutTargets.length > 0) {
        if (!objetivo) objetivo = this._pickObjective(supplyCutTargets, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Cortando suministro en (${objetivo.r},${objetivo.c})`);
        }
      }
      // PRIORIDAD 4: Sabotaje de progreso enemigo (caravanas/exploradores/rutas)
      else if (sabotageTargets.length > 0) {
        if (!objetivo) objetivo = this._pickObjective(sabotageTargets, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Sabotaje en (${objetivo.r},${objetivo.c})`);
        }
      }
      // PRIORIDAD 5: Atacar recurso vulnerable
      else if (situacion.recursosVulnerables.length > 0) {
        if (!objetivo) objetivo = this._pickObjective(situacion.recursosVulnerables, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo ofensivo (recurso vulnerable) en (${objetivo.r},${objetivo.c})`);
        }
      }
      // PRIORIDAD 6: Expandir hacia recursos propios descubiertos
      else if (recursosEnHexes.length > 0) {
        if (!objetivo) objetivo = this._pickObjective(recursosEnHexes, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo exploratorio en (${objetivo.r},${objetivo.c})`);
        }
      }
      // PRIORIDAD 7: Expansión de frontera — ocupar casillas vacías adyacentes al territorio propio.
      // Igual que el humano: siempre hay espacio que tomar en el mapa.
      else if (!objetivo) {
        const frontierHexes = board.flat().filter(h =>
          h && (h.owner === null || h.owner === undefined) &&
          !h.unit && !h.isCity &&
          (h.terrain !== 'water') &&
          getHexNeighbors(h.r, h.c).some(n => board[n.r]?.[n.c]?.owner === myPlayer)
        );
        if (frontierHexes.length > 0) {
          objetivo = this._pickObjective(frontierHexes, unit, myPlayer);
          if (objetivo) {
            console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Expansión de frontera en (${objetivo.r},${objetivo.c})`);
          }
        }
      }

      // PRIORIDAD 8: Presión directa al enemigo cuando no hay frontera libre.
      if (!objetivo && unidadesEnemigas.length > 0) {
        objetivo = this._pickObjective(unidadesEnemigas, unit, myPlayer);
        if (objetivo) {
          console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Presionando enemigo en (${objetivo.r},${objetivo.c})`);
        }
      }

      if (this._isValidTarget(objetivo)) {
        this._requestMoveOrAttack(unit, objetivo.r, objetivo.c);
      } else if (objetivo) {
        console.warn(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo invalido. Movimiento omitido.`);
      }
    }

    if (huntAssignments.size > 0) {
      this._mergeHuntersIntoReserve(myPlayer, misUnidades, huntAssignments);
    }
  },

  _planHuntSmallDivisions(myPlayer, misUnidades, unidadesEnemigas) {
    const used = new Set();
    const prey = unidadesEnemigas
      .filter(u => (u.regiments?.length || 0) <= 2)
      .sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));

    if (!prey.length) return used;

    const available = misUnidades
      .filter(u => u.currentHealth > 0)
      .filter(u => !u.iaExpeditionTarget);

    for (const target of prey) {
      const attackers = available
        .filter(u => !used.has(u.id))
        .sort((a, b) => hexDistance(a.r, a.c, target.r, target.c) - hexDistance(b.r, b.c, target.r, target.c))
        .slice(0, 2);

      if (!attackers.length) break;

      for (const unit of attackers) {
        if (this._requestMoveOrAttack(unit, target.r, target.c)) {
          used.add(unit.id);
        }
      }
    }

    return used;
  },

  _mergeHuntersIntoReserve(myPlayer, misUnidades, usedSet) {
    const reserve = misUnidades
      .filter(u => !usedSet.has(u.id))
      .sort((a, b) => (b.regiments?.length || 0) - (a.regiments?.length || 0))[0];
    if (!reserve) return false;

    let total = reserve.regiments?.length || 0;
    const hunters = misUnidades
      .filter(u => usedSet.has(u.id))
      .sort((a, b) => hexDistance(reserve.r, reserve.c, a.r, a.c) - hexDistance(reserve.r, reserve.c, b.r, b.c));

    for (const unit of hunters) {
      const regCount = unit.regiments?.length || 0;
      if (total + regCount > MAX_REGIMENTS_PER_DIVISION) continue;
      const dist = hexDistance(reserve.r, reserve.c, unit.r, unit.c);
      if (dist > 2) continue;
      if (dist > 1) {
        const moveTarget = getHexNeighbors(reserve.r, reserve.c).find(n => !board[n.r]?.[n.c]?.unit);
        if (moveTarget) {
          this._requestMoveUnit(unit, moveTarget.r, moveTarget.c);
        }
      }
      if (this._requestMergeUnits(unit, reserve)) {
        total += regCount;
      }
    }

    return true;
  },

  _canAffordStructure(playerId, structureType) {
    const data = STRUCTURE_TYPES?.[structureType];
    const res = gameState.playerResources?.[playerId];
    if (!data || !res) return false;
    const cost = data.cost || {};
    return Object.keys(cost).every(key => key === 'Colono' || (res[key] || 0) >= cost[key]);
  },

  /**
   * FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
   * 
   * Estrategia basada en PODER RELATIVO, no en radio
   * - Si poder >= 1.3x → ATAQUE DIRECTO (fusión mínima)
   * - Si poder 0.8-1.3x → ENVOLVIMIENTO (flanqueo)
   * - Si poder < 0.8x → RETIRADA O FUSIONAR TODO
   */
  ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion) {
    const unidadesEnemigas = IASentidos.getEnemyUnits(myPlayer);
    
    console.log(`[IA_ARCHIPIELAGO] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE`);
    if (unidadesEnemigas.length === 0) return;

    // EVALUAR CADA ENEMIGO COMO OBJETIVO
    for (const enemigo of unidadesEnemigas) {
      this._evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo);
    }

    // EVALUAR CIUDADES BÁRBARAS
    const ciudadesBarbaras = this._getBarbarianCities();
    for (const ciudad of ciudadesBarbaras) {
      this._evaluarConquistaDeCity(myPlayer, misUnidades, ciudad);
    }
  },

  /**
   * EVALUAR Y ACTUAR CONTRA ENEMIGO AISLADO
   * Calcula poder relativo e ejecuta estrategia correspondiente
   */
  _evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo) {
    // Encontrar nuestras unidades cercanas (radio 5)
    const nuestrasUnidadesCercanas = misUnidades.filter(u =>
      hexDistance(u.r, u.c, enemigo.r, enemigo.c) <= 5 &&
      u.currentHealth > 0
    );

    if (nuestrasUnidadesCercanas.length === 0) return;

    // Calcular poder relativo
    const poderNuestro = nuestrasUnidadesCercanas.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    const poderEnemigo = enemigo.regiments?.length || 0;
    const poderRelativo = poderNuestro / Math.max(1, poderEnemigo);

    console.log(`[IA_ARCHIPIELAGO] Enemigo (${enemigo.r},${enemigo.c}): Poder ${poderNuestro}/${poderEnemigo} = ${poderRelativo.toFixed(2)}x`);

    if (poderRelativo >= 1.3) {
      console.log(`[IA_ARCHIPIELAGO] ⚔️ ATAQUE DIRECTO (${poderRelativo.toFixed(2)}x)`);
      this._ejecutarAtaqueConcentrado(myPlayer, nuestrasUnidadesCercanas, enemigo);
    } else if (poderRelativo >= 0.8) {
      console.log(`[IA_ARCHIPIELAGO] 🔄 ENVOLVIMIENTO (${poderRelativo.toFixed(2)}x)`);
      this._ejecutarEnvolvimiento(myPlayer, nuestrasUnidadesCercanas, enemigo);
    } else if (poderRelativo >= 0.5) {
      console.log(`[IA_ARCHIPIELAGO] 🔙 RETIRADA O CONCENTRAR (${poderRelativo.toFixed(2)}x)`);
      this._ejecutarRetiradaEstrategica(myPlayer, nuestrasUnidadesCercanas, enemigo);
    } else {
      console.log(`[IA_ARCHIPIELAGO] ⛔ IGNORAR (${poderRelativo.toFixed(2)}x - demasiado fuerte)`);
    }
  },

  /**
   * ATAQUE CONCENTRADO
   * Cuando tenemos ventaja clara (1.3x+), atacamos directamente
   * Fusionamos MÍNIMAMENTE solo para refuerzo
   */
  _ejecutarAtaqueConcentrado(myPlayer, unidadesNuestras, enemigo) {
    unidadesNuestras.sort((a, b) =>
      hexDistance(a.r, a.c, enemigo.r, enemigo.c) - hexDistance(b.r, b.c, enemigo.r, enemigo.c)
    );

    const unitPrincipal = unidadesNuestras[0];

    // Fusionar solo 1-2 unidades más cercanas si es necesario
    if (unidadesNuestras.length >= 2) {
      const toMerge = unidadesNuestras.slice(1, 2); // Solo 1 máximo

      for (const unit of toMerge) {
        const dist = hexDistance(unitPrincipal.r, unitPrincipal.c, unit.r, unit.c);
        const regAct = unitPrincipal.regiments?.length || 0;
        const regMerge = unit.regiments?.length || 0;

        if (regAct + regMerge <= MAX_REGIMENTS_PER_DIVISION && dist <= 2) {
          if (dist > 1) {
            const moveTarget = getHexNeighbors(unitPrincipal.r, unitPrincipal.c).find(n => !board[n.r]?.[n.c]?.unit);
            if (moveTarget) {
              this._requestMoveUnit(unit, moveTarget.r, moveTarget.c);
            }
          }
          if (this._requestMergeUnits(unit, unitPrincipal)) {
            console.log(`[IA_ARCHIPIELAGO] + Refuerzo: ${unit.name} →${unitPrincipal.name}`);
          }
        }
      }
    }

    // Atacar
    if (this._requestMoveOrAttack(unitPrincipal, enemigo.r, enemigo.c)) {
      console.log(`[IA_ARCHIPIELAGO] ATACANDO en (${enemigo.r},${enemigo.c})`);
    }
  },

  /**
   * ENVOLVIMIENTO
   * Batalla dudosa (0.8-1.3x): posicionamos en múltiples hexes alrededor
   */
  _ejecutarEnvolvimiento(myPlayer, unidadesNuestras, enemigo) {
    const posicionesAlrededor = getHexNeighbors(enemigo.r, enemigo.c).filter(n => !board[n.r]?.[n.c]?.unit);
    
    unidadesNuestras.sort((a, b) =>
      hexDistance(a.r, a.c, enemigo.r, enemigo.c) - hexDistance(b.r, b.c, enemigo.r, enemigo.c)
    );

    for (let i = 0; i < Math.min(unidadesNuestras.length, posicionesAlrededor.length); i++) {
      const unit = unidadesNuestras[i];
      const posDestino = posicionesAlrededor[i];

      if (this._requestMoveUnit(unit, posDestino.r, posDestino.c)) {
        console.log(`[IA_ARCHIPIELAGO] Flanqueando desde (${posDestino.r},${posDestino.c})`);
      }
    }
  },

  /**
   * RETIRADA ESTRATÉGICA
   * Cuando somos débiles (< 0.5x), nos reagrupamos o huimos
   */
  _ejecutarRetiradaEstrategica(myPlayer, unidadesNuestras, enemigo) {
    // Opción 1: Fusionar TODO lo disponible
    if (unidadesNuestras.length >= 2) {
      console.log(`[IA_ARCHIPIELAGO] Fusionando TODO para concentración...`);
      this._fusionarTodo(unidadesNuestras);
    }

    // Opción 2: Mover hacia capital para defensa
    const capital = gameState.cities.find(c => c.owner === myPlayer && c.isCapital);
    if (capital) {
      for (const unit of unidadesNuestras) {
        const distEnemigo = hexDistance(unit.r, unit.c, enemigo.r, enemigo.c);
        const distCapital = hexDistance(unit.r, unit.c, capital.r, capital.c);

        if (distEnemigo < distCapital + 5) {
          if (this._requestMoveUnit(unit, capital.r, capital.c)) {
            console.log(`[IA_ARCHIPIELAGO] Retirando a capital (${capital.r},${capital.c})`);
          }
        }
      }
    }
  },

  /**
   * FUSIONAR TODO DISPONIBLE
   * Crea una súper-unidad para defensa concentrada
   */
  _fusionarTodo(unidades) {
    if (unidades.length < 2) return;

    const unitPrincipal = unidades[0];
    const poderTotal = unidades.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);

    console.log(`[IA_ARCHIPIELAGO] CONCENTRACIÓN: Fusionando ${unidades.length} unidades (${poderTotal} regimientos)`);

    for (let i = 1; i < unidades.length; i++) {
      const unit = unidades[i];
      const regAct = unitPrincipal.regiments?.length || 0;
      const regFusionar = unit.regiments?.length || 0;

      if (regAct + regFusionar > MAX_REGIMENTS_PER_DIVISION) {
        console.log(`[IA_ARCHIPIELAGO] ⚠️ ${unit.name} no cabe (${regAct}+${regFusionar} > ${MAX_REGIMENTS_PER_DIVISION})`);
        break;
      }

      const dist = hexDistance(unitPrincipal.r, unitPrincipal.c, unit.r, unit.c);
      if (dist > 1) {
        const moveTarget = getHexNeighbors(unitPrincipal.r, unitPrincipal.c).find(n => !board[n.r]?.[n.c]?.unit);
        if (moveTarget) {
          this._requestMoveUnit(unit, moveTarget.r, moveTarget.c);
        }
      }

      if (this._requestMergeUnits(unit, unitPrincipal)) {
        console.log(`[IA_ARCHIPIELAGO] ✓ Fusionado: ${unit.name}`);
      }
    }
  },

  _getBarbarianCities() {
    const barbarianId = (typeof BARBARIAN_PLAYER_ID !== 'undefined') ? BARBARIAN_PLAYER_ID : 9;
    return (gameState.cities || []).filter(c => c && (
      c.owner === null ||
      c.isBarbarianCity ||
      c.isBarbaric ||
      c.owner === barbarianId
    ));
  },

  _getCityGarrisonStrength(ciudad) {
    return ciudad?.garrison?.length || 4;
  },

  _getUnitPower(unit) {
    return unit?.regiments?.length || 0;
  },

  _isLandUnit(unit) {
    if (!unit?.regiments?.length) return false;
    return unit.regiments.some(reg => !REGIMENT_TYPES?.[reg.type]?.is_naval);
  },

  _isTerrainPassableForUnit(unit, terrain) {
    if (!unit?.regiments?.length || !terrain) return false;
    const isNaval = unit.regiments.some(reg => REGIMENT_TYPES?.[reg.type]?.is_naval);
    if (isNaval) return terrain === 'water';

    const unitCategory = REGIMENT_TYPES[unit.regiments[0]?.type]?.category;
    if (!unitCategory) return false;
    if (TERRAIN_TYPES[terrain]?.isImpassableForLand) return false;
    if (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land?.includes(terrain)) return false;
    if ((IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(terrain)) return false;
    return true;
  },

  _findPathForUnit(unit, targetR, targetC) {
    if (!unit || typeof targetR === 'undefined' || typeof targetC === 'undefined') return null;
    if (unit.r === targetR && unit.c === targetC) return [{ r: unit.r, c: unit.c }];

    const queue = [{ r: unit.r, c: unit.c, path: [{ r: unit.r, c: unit.c }], f: hexDistance(unit.r, unit.c, targetR, targetC) }];
    const visited = new Set([`${unit.r},${unit.c}`]);

    while (queue.length > 0) {
      queue.sort((a, b) => a.f - b.f);
      const current = queue.shift();

      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const key = `${neighbor.r},${neighbor.c}`;
        if (visited.has(key)) continue;

        const hex = board[neighbor.r]?.[neighbor.c];
        if (!hex || !this._isTerrainPassableForUnit(unit, hex.terrain)) continue;

        const unitOnNeighbor = hex.unit;
        const isTarget = neighbor.r === targetR && neighbor.c === targetC;
        if (unitOnNeighbor && !isTarget) continue;

        visited.add(key);
        const newPath = [...current.path, neighbor];
        if (isTarget) return newPath;

        const g = current.path.length;
        const h = hexDistance(neighbor.r, neighbor.c, targetR, targetC);
        queue.push({ ...neighbor, path: newPath, f: g + h });
      }
    }
    return null;
  },

  _getMoveStepTowards(unit, targetR, targetC) {
    const movement = unit?.currentMovement || unit?.movement || 0;
    if (!unit || movement <= 0) return null;

    const path = this._findPathForUnit(unit, targetR, targetC);
    if (!path || path.length <= 1) return null;

    let bestStep = null;
    for (let i = 1; i < path.length; i++) {
      const step = path[i];
      if (getUnitOnHex(step.r, step.c)) break;
      const cost = getMovementCost(unit, unit.r, unit.c, step.r, step.c);
      if (cost !== Infinity && cost <= movement) {
        bestStep = step;
      }
    }

    return bestStep;
  },

  _pickBarbarianTarget(myPlayer, ciudadesBarbaras) {
    if (!ciudadesBarbaras.length) return null;
    const ownCities = (gameState.cities || []).filter(c => c.owner === myPlayer);
    const anchor = ownCities.find(c => c.isCapital) || ownCities[0];

    const reachable = ciudadesBarbaras.filter(ciudad => {
      return IASentidos.getUnits(myPlayer).some(u => this._isLandUnit(u) && this._findPathForUnit(u, ciudad.r, ciudad.c));
    });
    const candidates = reachable.length ? reachable : ciudadesBarbaras;

    return candidates
      .map(ciudad => {
        const dist = anchor ? hexDistance(anchor.r, anchor.c, ciudad.r, ciudad.c) : 10;
        const garrison = this._getCityGarrisonStrength(ciudad);
        const score = (garrison * 2) + dist;
        return { ciudad, score };
      })
      .sort((a, b) => a.score - b.score)[0].ciudad;
  },

  _selectExpeditionUnits(myPlayer, targetCity, minPower) {
    const myUnits = IASentidos.getUnits(myPlayer)
      .filter(u => u.currentHealth > 0 && this._isLandUnit(u))
      .filter(u => !!this._findPathForUnit(u, targetCity.r, targetCity.c))
      .sort((a, b) => hexDistance(a.r, a.c, targetCity.r, targetCity.c) - hexDistance(b.r, b.c, targetCity.r, targetCity.c));

    const selected = [];
    let totalPower = 0;
    for (const unit of myUnits) {
      selected.push(unit);
      totalPower += this._getUnitPower(unit);
      if (totalPower >= minPower || selected.length >= 4) break;
    }

    return selected;
  },

  _sumUnitPower(unitsList) {
    return (unitsList || []).reduce((sum, u) => sum + this._getUnitPower(u), 0);
  },

  /**
   * EVALUAR CONQUISTA DE CIUDAD BÁRBARA
   * ¿Tenemos suficiente poder para ganar?
   */
  _evaluarConquistaDeCity(myPlayer, unidades, ciudad) {
    const unidadesCercanas = unidades.filter(u =>
      hexDistance(u.r, u.c, ciudad.r, ciudad.c) <= 4 &&
      u.currentHealth > 0
    );

    if (unidadesCercanas.length === 0) return;

    const poderTotal = this._sumUnitPower(unidadesCercanas);
    const poderMinimo = this._getCityGarrisonStrength(ciudad) * this.BARBARIAN_CONQUEST_RATIO;

    console.log(`[IA_ARCHIPIELAGO] Ciudad (${ciudad.r},${ciudad.c}): Poder=${poderTotal} Necesario=${poderMinimo.toFixed(0)}`);

    if (poderTotal >= poderMinimo) {
      console.log(`[IA_ARCHIPIELAGO] ✓ CONQUISTABLE: Concentrando...`);
      this._fusionarTodo(unidadesCercanas);
    } else {
      console.log(`[IA_ARCHIPIELAGO] ✗ AÚN DÉBIL: ${(poderMinimo - poderTotal).toFixed(0)} regimientos más necesarios`);
    }
  },

  /**
   * FASE 4: CONQUISTA DE CIUDADES BÁRBARAS
   * Identifica y conquista ciudades sin dueño
   */
  conquistarCiudadesBarbaras(myPlayer, misUnidades) {
    const ciudadesBarbaras = this._getBarbarianCities();
    if (ciudadesBarbaras.length === 0) {
      console.log(`[IA_ARCHIPIELAGO] No hay ciudades bárbaras disponibles`);
      return 0;
    }

    console.log(`[IA_ARCHIPIELAGO] CONQUISTA: ${ciudadesBarbaras.length} ciudades bárbaras detectadas`);

    const barbarianKeys = new Set(ciudadesBarbaras.map(c => `${c.r},${c.c}`));
    for (const unit of misUnidades) {
      if (unit.iaExpeditionTarget && !barbarianKeys.has(unit.iaExpeditionTarget)) {
        delete unit.iaExpeditionTarget;
      }
    }

    const targetCity = this._pickBarbarianTarget(myPlayer, ciudadesBarbaras);
    if (!targetCity) return 0;

    const requiredPower = Math.ceil(this._getCityGarrisonStrength(targetCity) * this.BARBARIAN_CONQUEST_RATIO);
    let expeditionUnits = this._selectExpeditionUnits(myPlayer, targetCity, requiredPower);
    let totalPower = this._sumUnitPower(expeditionUnits);

    if (totalPower < requiredPower) {
      const regimentsPerDivision = 3;
      const neededDivisions = Math.min(3, Math.ceil((requiredPower - totalPower) / regimentsPerDivision));
      if (neededDivisions > 0) {
        const created = this._producirDivisiones(myPlayer, neededDivisions, regimentsPerDivision, targetCity);
        if (created > 0) {
          expeditionUnits = this._selectExpeditionUnits(myPlayer, targetCity, requiredPower);
          totalPower = this._sumUnitPower(expeditionUnits);
        }
      }
    }

    if (totalPower < requiredPower) {
      console.log(`[IA_ARCHIPIELAGO] CONQUISTA: expedición insuficiente (${totalPower}/${requiredPower}).`);
      return 0;
    }

    // Si la ciudad ya es nuestra, registrar meta cumplida
    const cityObj = board[targetCity.r]?.[targetCity.c];
    if (cityObj && cityObj.owner === myPlayer) {
      this.registrarMetaFlujo('ocupacion', targetCity.r, targetCity.c, myPlayer);
      return 0;
    }

    console.log(`[IA_ARCHIPIELAGO] CONQUISTA: expedición lista (${totalPower}/${requiredPower}) hacia (${targetCity.r},${targetCity.c}).`);
    let actions = 0;
    for (const unit of expeditionUnits) {
      unit.iaExpeditionTarget = `${targetCity.r},${targetCity.c}`;
      if (this._requestMoveOrAttack(unit, targetCity.r, targetCity.c, { missionType: this.MISSION_TYPE_CONQUEST_CITY })) {
        actions += 1;
      }
    }
    return actions;
  },

  /**
   * FASE 5: CONSTRUCCIÓN DE INFRAESTRUCTURA
   * Construye caminos, fortalezas y ciudades
   */
  construirInfraestructura(myPlayer, hexesPropios, economia) {
    const capital = gameState.cities.find(c => c.owner === myPlayer && c.isCapital);
    if (!capital) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] No hay capital, no se puede construir.');
      return;
    }

    console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Oro disponible: ${economia.oro}`);
    const esTurnoTemprano = (gameState.turnNumber || 0) < 4;
    const infraFixEnabled = Number(gameState.turnNumber || 0) >= Math.max(3, Number(this.INFRA_FIX_START_TURN) || 3);
    const reservaPiedraMinima = 500;
    let hizoAlgo = false;

    const invaderFortSpot = this._findInvaderIslandFortressSpot(myPlayer, hexesPropios);
    if (invaderFortSpot) {
      if (!this._ensureTech(myPlayer, 'FORTIFICATIONS')) {
        console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Falta FORTIFICATIONS para fortaleza invasora.');
        return;
      }
      if (!this._canAffordStructure(myPlayer, 'Fortaleza')) {
        console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Recursos insuficientes para fortaleza invasora.');
        return;
      }
      console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Construyendo fortaleza (Camino 16) en (${invaderFortSpot.r},${invaderFortSpot.c})`);
      const built = this._requestBuildStructure(myPlayer, invaderFortSpot.r, invaderFortSpot.c, 'Fortaleza');
      if (built) {
        this._startFortressPressure(myPlayer, invaderFortSpot);
        this.registrarMetaFlujo('construccion', invaderFortSpot.r, invaderFortSpot.c, myPlayer);
        hizoAlgo = true;
      }
      return;
    }

    // PRIORIDAD 1: Construir caminos útiles entre ciudades
    this._ensureTech(myPlayer, 'ENGINEERING');
    const roadBuildable = STRUCTURE_TYPES['Camino']?.buildableOn || [];
    const ciudades = this._getTradeCityCandidates(myPlayer);
    const existingRouteKeys = this._getExistingTradeRouteKeys(myPlayer);
    const candidate = this._findBestTradeCityPair(ciudades, myPlayer, existingRouteKeys);
    // Construir todos los segmentos de camino pendientes mientras haya recursos (no solo 1 por turno).
    const missingSegments = candidate?.missingOwnedSegments || [];
    if (missingSegments.length === 0) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] No hay segmentos de camino pendientes.');
    }
    for (const nextHex of missingSegments) {
      if (!this._canAffordStructure(myPlayer, 'Camino')) break;
      const nextHexData = board[nextHex.r]?.[nextHex.c];
      const blocksRoad = !!(nextHexData?.isCity || (nextHexData?.structure && nextHexData.structure !== 'Camino'));
      if (blocksRoad) {
        continue;
      }
      const terrainOk = !roadBuildable.length || roadBuildable.includes(nextHexData?.terrain);
      if (terrainOk) {
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Construyendo camino en (${nextHex.r},${nextHex.c})`);
        const built = this._requestBuildStructure(myPlayer, nextHex.r, nextHex.c, 'Camino');
        if (built) {
          this.registrarMetaFlujo('construccion', nextHex.r, nextHex.c, myPlayer);
          hizoAlgo = true;
        }
      }
    }

    // PRIORIDAD 2: Fortalezas estratégicas en el corredor comercial.
    const piedraTrasCaminos = gameState.playerResources?.[myPlayer]?.piedra || 0;
    const fortBlockedByTurn = esTurnoTemprano;
    const fortBlockedByStone = piedraTrasCaminos < reservaPiedraMinima;
    const fortBlockedByTech = !this._ensureTech(myPlayer, 'FORTIFICATIONS');

    if (fortBlockedByTurn) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Veda de fortalezas activa (turno < 4).');
    } else if (fortBlockedByStone) {
      console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Reserva de piedra insuficiente para fortaleza (${piedraTrasCaminos}/${reservaPiedraMinima}).`);
    } else if (fortBlockedByTech) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Falta FORTIFICATIONS para fortaleza estratégica.');
    }

    const MAX_EXPANSION_FORTS = this._getFortressLimitByHuman(myPlayer);
    const MIN_FORT_SPACING = 5;
    const existingExpandForts = board.flat().filter(h =>
      h && h.owner === myPlayer && (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
    );

    const canBuildFortress = !fortBlockedByTurn && !fortBlockedByStone && !fortBlockedByTech;
    if (canBuildFortress && existingExpandForts.length < MAX_EXPANSION_FORTS) {
      const allOccupied = [...existingExpandForts];

      // Segmentos del corredor → candidatos preferidos (serán ciudades conectadas).
      const corridorSegments = new Set();
      try {
        if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager._getCommercialNetworkPlan) {
          const netPlan = AiGameplayManager._getCommercialNetworkPlan(myPlayer);
          for (const conn of netPlan.connections || []) {
            const path = conn.path || [];
            for (let i = 1; i < path.length - 1; i++) {
              corridorSegments.add(`${path[i].r},${path[i].c}`);
            }
          }
        }
      } catch (_) {}

      const fortBuildable = STRUCTURE_TYPES['Fortaleza']?.buildableOn || [];
      const fortCandidates = hexesPropios.filter(h => {
        if (h.structure || h.unit) return false;
        if (fortBuildable.length > 0 && !fortBuildable.includes(h.terrain)) return false;
        if (h.terrain === 'water') return false;
        return allOccupied.every(pos => hexDistance(h.r, h.c, pos.r, pos.c) >= MIN_FORT_SPACING);
      });

      const scoreFortSpot = (hex) => {
        let score = 0;
        if (hex.terrain === 'mountain' || hex.terrain === 'mountains') score += 8;
        if (hex.terrain === 'hills') score += 5;
        if (hex.terrain === 'plains' || hex.terrain === 'grassland' || hex.terrain === 'pampa') score -= 50;
        if (corridorSegments.has(`${hex.r},${hex.c}`)) score += 10; // Futuro nodo comercial
        const nearRoad = getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.structure === 'Camino');
        if (nearRoad) score += 4;
        return score;
      };

      const bestFort = fortCandidates
        .map(h => ({ h, score: scoreFortSpot(h) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)[0];

      if (bestFort && this._canAffordStructure(myPlayer, 'Fortaleza')) {
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Construyendo fortaleza estratégica en (${bestFort.h.r},${bestFort.h.c}) score=${bestFort.score}`);
        const built = this._requestBuildStructure(myPlayer, bestFort.h.r, bestFort.h.c, 'Fortaleza');
        if (built) {
          this.registrarMetaFlujo('construccion', bestFort.h.r, bestFort.h.c, myPlayer);
          hizoAlgo = true;
        }
      }
    }

    // PRIORIDAD 3 (fix desde turno 3): asegurar mínimo de aldeas para puntos fáciles.
    if (infraFixEnabled) {
      const villagesBuilt = this._buildIdealVillages(myPlayer, hexesPropios);
      if (villagesBuilt > 0) hizoAlgo = true;
    }

    if (!hizoAlgo) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] No se realizó ninguna acción de construcción este turno.');
    }
  },

  /**
   * FASE 6: CARAVANAS COMERCIALES
   * Crea caravanas para ingresos pasivos
   */
  crearCaravanas(myPlayer, ciudades) {
    if (ciudades.length < 2) {
      console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] No hay suficientes ciudades para crear rutas/caravanas (actual: ${ciudades.length})`);
      return;
    }

    console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intentando crear rutas/caravanas entre ${ciudades.length} ciudades`);

    const antes = JSON.stringify(gameState.tradeRoutes || []);
    this._ejecutarRutaLarga({ myPlayer, ciudades });
    const despues = JSON.stringify(gameState.tradeRoutes || []);
    if (antes === despues) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CARAVANA] No se creó ninguna ruta/caravana nueva este turno.');
    } else {
      console.log('[IA_ARCHIPIELAGO][FLUJO CARAVANA] Se creó al menos una ruta/caravana nueva.');
    }
  }
  ,

  _isValidTarget(target) {
    return !!(target && Number.isInteger(target.r) && Number.isInteger(target.c) && board[target.r]?.[target.c]);
  },

  _getActionDispatchState(playerId) {
    if (!this._actionDispatchState) this._actionDispatchState = {};
    const turn = Number(gameState.turnNumber || 0);
    const current = this._actionDispatchState[playerId];
    if (!current || current.turn !== turn) {
      this._actionDispatchState[playerId] = {
        turn,
        lastByUnit: new Map(),
        lastByPair: new Map()
      };
    }
    return this._actionDispatchState[playerId];
  },

  _isUnitActionCoolingDown(playerId, unitId, actionKind = 'generic') {
    if (!unitId) return false;
    const state = this._getActionDispatchState(playerId);
    const key = `${actionKind}:${unitId}`;
    const lastTs = Number(state.lastByUnit.get(key) || 0);
    const cooldown = Math.max(0, Number(this.ACTION_DISPATCH_COOLDOWN_MS) || 0);
    return cooldown > 0 && (Date.now() - lastTs) < cooldown;
  },

  _markUnitActionDispatch(playerId, unitId, actionKind = 'generic') {
    if (!unitId) return;
    const state = this._getActionDispatchState(playerId);
    const key = `${actionKind}:${unitId}`;
    state.lastByUnit.set(key, Date.now());
  },

  _isMergePairCoolingDown(playerId, unitAId, unitBId) {
    if (!unitAId || !unitBId) return false;
    const ordered = [unitAId, unitBId].sort();
    const pairKey = `${ordered[0]}|${ordered[1]}`;
    const state = this._getActionDispatchState(playerId);
    const lastTs = Number(state.lastByPair.get(pairKey) || 0);
    const cooldown = Math.max(0, Number(this.ACTION_DISPATCH_COOLDOWN_MS) || 0);
    return cooldown > 0 && (Date.now() - lastTs) < cooldown;
  },

  _markMergePairDispatch(playerId, unitAId, unitBId) {
    if (!unitAId || !unitBId) return;
    const ordered = [unitAId, unitBId].sort();
    const pairKey = `${ordered[0]}|${ordered[1]}`;
    const state = this._getActionDispatchState(playerId);
    state.lastByPair.set(pairKey, Date.now());
  },

  _requestMoveUnit(unit, r, c, ctx = {}) {
    if (!unit) return false;
    if (this._isUnitActionCoolingDown(unit.player, unit.id, 'move')) {
      return false;
    }
    const mission = (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.missionAssignments?.get)
      ? AiGameplayManager.missionAssignments.get(unit.id)
      : null;
    const missionType = ctx.missionType || this._inferCanonicalMissionType(unit) || mission?.type || null;
    if (this._isRepeatedInvalidMoveThisTurn(unit.player, unit.id, r, c)) {
      this._metricLog('IA_ACTION_MOVE', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        unitId: unit.id,
        from: `${unit.r},${unit.c}`,
        to: `${r},${c}`,
        missionType,
        success: false,
        failReason: 'repeated_invalid_move_suppressed'
      });
      return false;
    }
    if (typeof isValidMove === 'function' && !isValidMove(unit, r, c)) {
      this._registerInvalidMoveThisTurn(unit.player, unit.id, r, c);
      this._metricLog('IA_ACTION_MOVE', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        unitId: unit.id,
        from: `${unit.r},${unit.c}`,
        to: `${r},${c}`,
        missionType,
        success: false,
        failReason: 'invalid_move'
      });
      return false;
    }
    const action = {
      type: 'moveUnit',
      actionId: `move_${unit.id}_${r}_${c}_${Date.now()}`,
      payload: { playerId: unit.player, unitId: unit.id, toR: r, toC: c }
    };

    const hasNetworkMatch = typeof NetworkManager !== 'undefined' && !!NetworkManager.miId;
    if (typeof isNetworkGame === 'function' && isNetworkGame() && hasNetworkMatch && typeof NetworkManager !== 'undefined' && !NetworkManager.esAnfitrion) {
      if (NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        if (!this.LOG_ONLY_EARLY_TURN_EVENTS) {
          console.log(`[IA_ARCHIPIELAGO][MOVE] Unidad ${unit.id} movida a (${r},${c})`);
        }
        this._metricLog('IA_ACTION_MOVE', {
          turn: gameState.turnNumber,
          playerId: unit.player,
          unitId: unit.id,
          from: `${unit.r},${unit.c}`,
          to: `${r},${c}`,
          missionType,
          success: true,
          mode: 'network_client'
        });
        return true;
      }
      this._metricLog('IA_ACTION_MOVE', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        unitId: unit.id,
        from: `${unit.r},${unit.c}`,
        to: `${r},${c}`,
        missionType,
        success: false,
        failReason: 'network_send_unavailable'
      });
      return false;
    }

    if (typeof RequestMoveUnit === 'function') {
      this._markUnitActionDispatch(unit.player, unit.id, 'move');
      RequestMoveUnit(unit, r, c);
      if (!this.LOG_ONLY_EARLY_TURN_EVENTS) {
        console.log(`[IA_ARCHIPIELAGO][MOVE] Unidad ${unit.id} movida a (${r},${c})`);
      }
      this._metricLog('IA_ACTION_MOVE', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        unitId: unit.id,
        from: `${unit.r},${unit.c}`,
        to: `${r},${c}`,
        missionType,
        success: true,
        mode: 'RequestMoveUnit'
      });
      return true;
    }

    if (typeof processActionRequest === 'function') {
      this._markUnitActionDispatch(unit.player, unit.id, 'move');
      processActionRequest(action);
      if (!this.LOG_ONLY_EARLY_TURN_EVENTS) {
        console.log(`[IA_ARCHIPIELAGO][MOVE] Unidad ${unit.id} movida a (${r},${c})`);
      }
      this._metricLog('IA_ACTION_MOVE', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        unitId: unit.id,
        from: `${unit.r},${unit.c}`,
        to: `${r},${c}`,
        missionType,
        success: true,
        mode: 'processActionRequest'
      });
      return true;
    }

    console.warn('[IA_ARCHIPIELAGO] RequestMoveUnit no disponible.');
    this._metricLog('IA_ACTION_MOVE', {
      turn: gameState.turnNumber,
      playerId: unit.player,
      unitId: unit.id,
      from: `${unit.r},${unit.c}`,
      to: `${r},${c}`,
      missionType,
      success: false,
      failReason: 'move_api_unavailable'
    });
    return false;
  },

  _requestMoveOrAttack(unit, r, c, ctx = {}) {
    if (!unit) return false;
    if (!Number.isInteger(unit.r) || !Number.isInteger(unit.c) || !Array.isArray(unit.regiments) || unit.regiments.length === 0) {
      const resolved = getUnitOnHex(unit.r, unit.c);
      if (resolved && resolved.player === unit.player && Array.isArray(resolved.regiments) && resolved.regiments.length > 0) {
        unit = resolved;
      } else {
        return false;
      }
    }
    const targetUnit = getUnitOnHex(r, c);
    if (targetUnit && targetUnit.player !== unit.player) {
      if (this._isUnitActionCoolingDown(unit.player, unit.id, 'attack')) {
        return false;
      }
      let canAttack = false;
      if (typeof isValidAttack === 'function') {
        try {
          canAttack = isValidAttack(unit, targetUnit);
        } catch (e) {
          console.warn('[IA_ARCHIPIELAGO] isValidAttack lanzó error. Se usa fallback de distancia.', e);
          canAttack = hexDistance(unit.r, unit.c, targetUnit.r, targetUnit.c) <= (unit.attackRange || 1);
        }
      } else {
        canAttack = hexDistance(unit.r, unit.c, targetUnit.r, targetUnit.c) <= (unit.attackRange || 1);
      }

      if (!canAttack) {
        const step = this._getMoveStepTowards(unit, r, c);
        if (step) return this._requestMoveUnit(unit, step.r, step.c, ctx);
        return false;
      }

      const action = {
        type: 'attackUnit',
        actionId: `attack_${unit.id}_${targetUnit.id}_${Date.now()}`,
        payload: { playerId: unit.player, attackerId: unit.id, defenderId: targetUnit.id }
      };

      const hasNetworkMatch = typeof NetworkManager !== 'undefined' && !!NetworkManager.miId;
      if (typeof isNetworkGame === 'function' && isNetworkGame() && hasNetworkMatch && typeof NetworkManager !== 'undefined' && !NetworkManager.esAnfitrion) {
        if (NetworkManager.enviarDatos) {
          NetworkManager.enviarDatos({ type: 'actionRequest', action });
          return true;
        }
        return false;
      }

      // En local/hotseat o siendo anfitrión, processActionRequest evita bloqueos por "mi jugador"
      // en RequestAttackUnit y garantiza que la IA pueda resolver capturas adyacentes.
      if (typeof processActionRequest === 'function') {
        this._markUnitActionDispatch(unit.player, unit.id, 'attack');
        processActionRequest(action);
        return true;
      }

      if (typeof RequestAttackUnit === 'function') {
        this._markUnitActionDispatch(unit.player, unit.id, 'attack');
        RequestAttackUnit(unit, targetUnit);
        return true;
      }

      if (typeof processActionRequest === 'function') {
        this._markUnitActionDispatch(unit.player, unit.id, 'attack');
        processActionRequest(action);
        return true;
      }

      console.warn('[IA_ARCHIPIELAGO] RequestAttackUnit no disponible.');
      return false;
    }
    const step = this._getMoveStepTowards(unit, r, c);
    if (step) return this._requestMoveUnit(unit, step.r, step.c, ctx);
    return false;
  },

  _getUnexploredRuins() {
    const ruins = [];
    if (!Array.isArray(board)) return ruins;
    for (const row of board) {
      if (!Array.isArray(row)) continue;
      for (const hex of row) {
        if (hex?.feature === 'ruins' && !hex.looted) ruins.push(hex);
      }
    }
    return ruins;
  },

  _ensureNavalPresence(myPlayer, economia) {
    const hasNavigation = this._ensureTech(myPlayer, 'NAVIGATION');
    if (!hasNavigation) return false;

    const navalUnits = units.filter(u => u.player === myPlayer && u.regiments?.some(r => REGIMENT_TYPES[r.type]?.is_naval));
    if (navalUnits.length > 0) return false;

    const navalType = REGIMENT_TYPES['Patache'] ? 'Patache' : Object.keys(REGIMENT_TYPES || {}).find(t => REGIMENT_TYPES[t]?.is_naval);
    if (!navalType) return false;

    return !!this._crearUnidadNaval(myPlayer, navalType);
  },

  _requestMergeUnits(mergingUnit, targetUnit, opts = {}) {
    if (!mergingUnit || !targetUnit) return false;
    const bypassCooldown = !!opts.bypassCooldown;
    const preferImmediateLocal = !!opts.preferImmediateLocal;
    const networkActive = (typeof isNetworkGame === 'function' && isNetworkGame());
    if (!bypassCooldown && this._isUnitActionCoolingDown(mergingUnit.player, mergingUnit.id, 'merge')) return false;
    if (!bypassCooldown && this._isUnitActionCoolingDown(targetUnit.player, targetUnit.id, 'merge')) return false;
    if (!bypassCooldown && this._isMergePairCoolingDown(mergingUnit.player, mergingUnit.id, targetUnit.id)) return false;

    if (opts && opts.kind === 'worm') {
      this._registerMergeContext(mergingUnit, targetUnit, opts);
    }

    // En local, el gusano necesita merge inmediato para que el relay conserve masa
    // y pueda encadenar múltiples objetivos en el mismo turno.
    if (preferImmediateLocal && !networkActive && typeof mergeUnits === 'function') {
      mergeUnits(mergingUnit, targetUnit);
      return true;
    }

    if (typeof RequestMergeUnits !== 'function') {
      console.warn('[IA_ARCHIPIELAGO] RequestMergeUnits no disponible.');
      return false;
    }
    if (!bypassCooldown) {
      this._markUnitActionDispatch(mergingUnit.player, mergingUnit.id, 'merge');
      this._markUnitActionDispatch(targetUnit.player, targetUnit.id, 'merge');
      this._markMergePairDispatch(mergingUnit.player, mergingUnit.id, targetUnit.id);
    }
    RequestMergeUnits(mergingUnit, targetUnit, true);
    return true;
  },

  _requestSplitUnit(unit, r, c) {
    if (!unit) return false;
    if (this._isUnitActionCoolingDown(unit.player, unit.id, 'split')) return false;
    if (typeof RequestSplitUnit !== 'function') {
      console.warn('[IA_ARCHIPIELAGO] RequestSplitUnit no disponible.');
      return false;
    }
    this._markUnitActionDispatch(unit.player, unit.id, 'split');
    RequestSplitUnit(unit, r, c);
    return true;
  },

  _resolveVacateObjectiveForRoad(playerId, blockedR, blockedC) {
    if ((gameState.turnNumber || 0) <= 1 && typeof AiDeploymentManager !== 'undefined') {
      const analysis = typeof AiDeploymentManager.analyzeEnvironment === 'function'
        ? AiDeploymentManager.analyzeEnvironment(playerId)
        : null;
      const stages = typeof AiDeploymentManager._buildDeterministicBootstrapStages === 'function'
        ? AiDeploymentManager._buildDeterministicBootstrapStages(analysis, playerId)
        : [];

      const prioritized = [stages[1]?.objectiveHex, stages[2]?.objectiveHex].filter(Boolean);
      const selected = prioritized.find(o => o.r !== blockedR || o.c !== blockedC);
      if (selected) return { r: selected.r, c: selected.c, reason: 'nodo2_nodo3_t1' };
    }

    const bank = this._getBankCity();
    if (bank) return { r: bank.r, c: bank.c, reason: 'fallback_banca' };

    const ownCity = (gameState.cities || []).find(c => c && c.owner === playerId);
    if (ownCity) return { r: ownCity.r, c: ownCity.c, reason: 'fallback_ciudad' };

    return null;
  },

  _scheduleVacateForBlockedBuild(playerId, blockerUnit, r, c) {
    if (!blockerUnit || blockerUnit.player !== playerId) return false;
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.missionAssignments?.set) return false;

    const objective = this._resolveVacateObjectiveForRoad(playerId, r, c);
    if (!objective) return false;

    blockerUnit.iaVacateBuild = {
      blockedR: r,
      blockedC: c,
      objectiveR: objective.r,
      objectiveC: objective.c,
      reason: objective.reason,
      createdTurn: gameState.turnNumber
    };

    AiGameplayManager.missionAssignments.set(blockerUnit.id, {
      type: 'IA_NODE',
      objective: { r: objective.r, c: objective.c },
      nodoTipo: 'corredor_comercial',
      axisName: 'vacate_blocked_build',
      nodoRazon: 'VACATE_BLOCKED_BUILD'
    });

    this._metricLog('IA_MISSION_ASSIGNED', {
      turn: gameState.turnNumber,
      playerId,
      missionType: 'vacate_blocked_build',
      unitId: blockerUnit.id,
      objectiveParent: 'commercial_corridor',
      priority: 'high',
      ttl: 1,
      reason: objective.reason,
      blockedHex: `${r},${c}`,
      objectiveHex: `${objective.r},${objective.c}`
    });

    if (!blockerUnit.hasMoved && (blockerUnit.currentMovement || blockerUnit.movement || 0) > 0) {
      const step = this._getMoveStepTowards(blockerUnit, objective.r, objective.c);
      if (step && !getUnitOnHex(step.r, step.c)) {
        this._requestMoveUnit(blockerUnit, step.r, step.c);
      }
    }

    console.log(`[IA_ARCHIPIELAGO] [VACATE] J${playerId}: ${blockerUnit.name} libera (${r},${c}) -> (${objective.r},${objective.c}) motivo=${objective.reason}`);
    return true;
  },

  _tryImmediateVacateForBuild(blockerUnit, blockedHex, objective = null) {
    if (!blockerUnit || !blockedHex) return false;
    const mobility = (blockerUnit.currentMovement || blockerUnit.movement || 0);
    if (blockerUnit.hasMoved || mobility <= 0) return false;

    let step = null;
    if (objective) {
      step = this._getMoveStepTowards(blockerUnit, objective.r, objective.c);
      if (step && getUnitOnHex(step.r, step.c)) step = null;
    }

    if (!step) {
      step = getHexNeighbors(blockedHex.r, blockedHex.c).find(n => {
        const h = board[n.r]?.[n.c];
        if (!h || h.owner !== blockerUnit.player || h.terrain === 'water') return false;
        if (getUnitOnHex(n.r, n.c)) return false;
        return true;
      }) || null;
    }

    if (!step) return false;
    this._requestMoveUnit(blockerUnit, step.r, step.c);
    const stillBlocking = getUnitOnHex(blockedHex.r, blockedHex.c);
    return !(stillBlocking && stillBlocking.id === blockerUnit.id);
  },

  _procesarDesbloqueoConstruccionesPendientes(myPlayer) {
    const ownUnits = IASentidos.getUnits(myPlayer) || [];
    if (!ownUnits.length) return;

    let moved = 0;
    for (const unit of ownUnits) {
      const vacate = unit?.iaVacateBuild;
      if (!vacate) continue;

      // Si ya no bloquea la casilla original, limpiar marca para evitar ciclos.
      if (unit.r !== vacate.blockedR || unit.c !== vacate.blockedC) {
        delete unit.iaVacateBuild;
        continue;
      }

      if (unit.hasMoved || (unit.currentMovement || 0) <= 0) continue;

      let step = this._getMoveStepTowards(unit, vacate.objectiveR, vacate.objectiveC);
      if (!step || getUnitOnHex(step.r, step.c)) {
        step = getHexNeighbors(unit.r, unit.c).find(n => {
          const h = board[n.r]?.[n.c];
          if (!h || h.terrain === 'water') return false;
          if (h.owner !== myPlayer) return false;
          if (getUnitOnHex(n.r, n.c)) return false;
          return true;
        }) || null;
      }

      if (!step) continue;

      const didMove = this._requestMoveUnit(unit, step.r, step.c);
      this._metricLog('IA_MISSION_PROGRESS', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        unitId: unit.id,
        missionType: 'vacate_blocked_build',
        status: didMove ? 'completed' : 'blocked',
        blockedReason: didMove ? null : 'move_failed',
        from: `${unit.r},${unit.c}`,
        to: didMove ? `${step.r},${step.c}` : null
      });
      if (didMove) {
        moved += 1;
        delete unit.iaVacateBuild;
      }
    }

    if (moved > 0) {
      console.log(`[IA_ARCHIPIELAGO] [VACATE] J${myPlayer}: desbloqueos ejecutados=${moved}`);
    }
  },

  _requestBuildStructure(playerId, r, c, structureType) {
    if (!this._turnBuildRetryBlock) this._turnBuildRetryBlock = {};
    if (!this._turnBuildRetryBlock[playerId] || this._turnBuildRetryBlock[playerId].turn !== gameState.turnNumber) {
      this._turnBuildRetryBlock[playerId] = { turn: gameState.turnNumber, keys: new Set() };
    }

    const retryKey = `${structureType}:${r},${c}`;
    const playerRetryState = this._turnBuildRetryBlock[playerId];
    if (playerRetryState.keys.has(retryKey)) {
      this._metricLog('IA_BUILD_ATTEMPT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'retry_blocked'
      });
      return false;
    }

    const hex = board[r]?.[c];
    if (!hex || hex.owner !== playerId) {
      this._metricLog('IA_BUILD_ATTEMPT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'not_owned_or_invalid_hex'
      });
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const data = STRUCTURE_TYPES?.[structureType];
    if (!data) {
      this._metricLog('IA_BUILD_ATTEMPT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'structure_unknown'
      });
      playerRetryState.keys.add(retryKey);
      return false;
    }

    // Regla dura: nunca construir camino sobre fortalezas/ciudades u otra estructura no-camino.
    if (structureType === 'Camino') {
      const occupiedByBlockingStructure = !!(hex.isCity || (hex.structure && hex.structure !== 'Camino'));
      if (occupiedByBlockingStructure) {
        this._metricLog('IA_BUILD_ATTEMPT', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          structureType,
          success: false,
          failReason: 'blocked_by_existing_structure'
        });
        playerRetryState.keys.add(retryKey);
        return false;
      }
    }

    // Guardrail IA: fortalezas <= fortalezas humanas + 2 y separación mínima de 5.
    if (structureType === 'Fortaleza') {
      const infraFixEnabled = Number(gameState.turnNumber || 0) >= Math.max(3, Number(this.INFRA_FIX_START_TURN) || 3);
      if (infraFixEnabled && hex.structure === 'Camino') {
        playerRetryState.keys.add(retryKey);
        return false;
      }

      const MIN_FORT_SPACING = 5;
      const existingForts = board.flat().filter(h =>
        h &&
        h.owner === playerId &&
        (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
      );

      const fortLimit = this._getFortressLimitByHuman(playerId);

      if (existingForts.length >= fortLimit) {
        playerRetryState.keys.add(retryKey);
        return false;
      }

      const tooClose = existingForts.some(f => hexDistance(r, c, f.r, f.c) < MIN_FORT_SPACING);
      if (tooClose) {
        playerRetryState.keys.add(retryKey);
        return false;
      }
    }

    const playerRes = gameState.playerResources?.[playerId] || {};
    const playerTechs = playerRes.researchedTechnologies || [];
    if (data.requiredTech && !playerTechs.includes(data.requiredTech)) {
      if (this._ensureTech) this._ensureTech(playerId, data.requiredTech);
      this._metricLog('IA_BUILD_ATTEMPT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'missing_tech',
        requiredTech: data.requiredTech
      });
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const blocker = getUnitOnHex(r, c);
    if (blocker) {
      if (blocker.player !== playerId) {
        this._metricLog('IA_HEX_DECISION_BLOCKED', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          reason: 'occupied_by_enemy'
        });
        playerRetryState.keys.add(retryKey);
        return false;
      }

      const hasMovement = !blocker.hasMoved && ((blocker.currentMovement || blocker.movement || 0) > 0);
      this._scheduleVacateForBlockedBuild(playerId, blocker, r, c);

      if (!hasMovement) {
        console.log(`[IA_ARCHIPIELAGO] [BUILD DESCARTADA] J${playerId} ${structureType} (${r},${c}) motivo=aliado_sin_movimiento`);
        this._metricLog('IA_HEX_DECISION_FREE_BY_MISSION', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          blockerUnit: blocker.id,
          blockerHasMovement: false,
          assignedMission: 'vacate_blocked_build',
          deferToNextCycle: true
        });
        return false;
      }

      const objective = this._resolveVacateObjectiveForRoad(playerId, r, c);
      const vacatedNow = this._tryImmediateVacateForBuild(blocker, { r, c }, objective);
      if (!vacatedNow) {
        console.log(`[IA_ARCHIPIELAGO] [BUILD POSPUESTA] J${playerId} ${structureType} (${r},${c}) motivo=aliado_no_pudo_despejar`);
        this._metricLog('IA_HEX_DECISION_FREE_BY_MISSION', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          blockerUnit: blocker.id,
          blockerHasMovement: true,
          assignedMission: 'vacate_blocked_build',
          deferToNextCycle: true,
          failReason: 'ally_could_not_vacate_now'
        });
        return false;
      }

      console.log(`[IA_ARCHIPIELAGO] [BUILD REINTENTO] J${playerId} ${structureType} (${r},${c}) motivo=casilla_despejada`);
    }

    const cost = data.cost || {};
    const canPay = Object.keys(cost).every(res => res === 'Colono' || (playerRes[res] || 0) >= (cost[res] || 0));
    if (!canPay) {
      this._metricLog('IA_BUILD_ATTEMPT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'insufficient_resources'
      });
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const action = {
      type: 'buildStructure',
      actionId: `build_${playerId}_${r}_${c}_${Date.now()}`,
      payload: { playerId, r, c, structureType }
    };

    if (typeof isNetworkGame === 'function' && isNetworkGame()) {
      if (typeof NetworkManager !== 'undefined' && NetworkManager.esAnfitrion && typeof processActionRequest === 'function') {
        processActionRequest(action);
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Intento construir ${structureType} en (${r},${c})`);
        if (typeof this.registrarMetaFlujo === 'function') {
          this.registrarMetaFlujo('construccion', r, c, playerId);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
        this._metricLog('IA_BUILD_RESULT', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          structureType,
          success: true,
          mode: 'network_host'
        });
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Intento construir ${structureType} en (${r},${c})`);
        if (typeof this.registrarMetaFlujo === 'function') {
          this.registrarMetaFlujo('construccion', r, c, playerId);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
        this._metricLog('IA_BUILD_RESULT', {
          turn: gameState.turnNumber,
          playerId,
          hex: `${r},${c}`,
          structureType,
          success: true,
          mode: 'network_client'
        });
        return true;
      }
      this._metricLog('IA_BUILD_RESULT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: false,
        failReason: 'network_send_unavailable'
      });
      return false;
    }

    if (typeof handleConfirmBuildStructure === 'function') {
      handleConfirmBuildStructure(action.payload);
      const built = board[r]?.[c]?.structure === structureType;
      if (built) {
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Construido ${structureType} en (${r},${c})`);
        if (typeof this.registrarMetaFlujo === 'function') {
          this.registrarMetaFlujo('construccion', r, c, playerId);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
      }
      this._metricLog('IA_BUILD_RESULT', {
        turn: gameState.turnNumber,
        playerId,
        hex: `${r},${c}`,
        structureType,
        success: !!built,
        mode: 'local_execute',
        failReason: built ? null : 'local_build_not_reflected'
      });
      if (!built) playerRetryState.keys.add(retryKey);
      return built;
    }

    this._metricLog('IA_BUILD_RESULT', {
      turn: gameState.turnNumber,
      playerId,
      hex: `${r},${c}`,
      structureType,
      success: false,
      failReason: 'build_api_unavailable'
    });
    playerRetryState.keys.add(retryKey);
    return false;
  },

  _requestExploreRuins(unit) {
    if (!unit) return false;
    const action = {
      type: 'exploreRuins',
      actionId: `explore_${unit.id}_${Date.now()}`,
      payload: { playerId: unit.player, unitId: unit.id, r: unit.r, c: unit.c }
    };

    if (typeof isNetworkGame === 'function' && isNetworkGame()) {
      if (typeof NetworkManager !== 'undefined' && NetworkManager.esAnfitrion && typeof processActionRequest === 'function') {
        processActionRequest(action);
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        return true;
      }
      return false;
    }

    if (typeof _executeExploreRuins === 'function') {
      _executeExploreRuins(action.payload);
      return true;
    }

    return false;
  },

  _requestEstablishTradeRoute(unit, origin, destination, path) {
    if (!unit) return false;
    const action = {
      type: 'establishTradeRoute',
      actionId: `trade_${unit.id}_${Date.now()}`,
      payload: { unitId: unit.id, origin, destination, path }
    };

    if (typeof isNetworkGame === 'function' && isNetworkGame()) {
      if (typeof NetworkManager !== 'undefined' && NetworkManager.esAnfitrion && typeof processActionRequest === 'function') {
        processActionRequest(action);
        console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intento crear ruta comercial de (${origin.r},${origin.c}) a (${destination.r},${destination.c})`);
        if (typeof this.registrarMetaFlujo === 'function') {
          this.registrarMetaFlujo('caravana', origin.r, origin.c, unit.player);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
        }
        this._metricLog('IA_COMMERCIAL_CONVERT_RESULT', {
          turn: gameState.turnNumber,
          playerId: unit.player,
          pair: `${origin.r},${origin.c}|${destination.r},${destination.c}`,
          unitId: unit.id,
          success: true,
          mode: 'network_host'
        });
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intento crear ruta comercial de (${origin.r},${origin.c}) a (${destination.r},${destination.c})`);
        if (typeof this.registrarMetaFlujo === 'function') {
          this.registrarMetaFlujo('caravana', origin.r, origin.c, unit.player);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
        }
        this._metricLog('IA_COMMERCIAL_CONVERT_RESULT', {
          turn: gameState.turnNumber,
          playerId: unit.player,
          pair: `${origin.r},${origin.c}|${destination.r},${destination.c}`,
          unitId: unit.id,
          success: true,
          mode: 'network_client'
        });
        return true;
      }
      this._metricLog('IA_COMMERCIAL_CONVERT_RESULT', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        pair: `${origin.r},${origin.c}|${destination.r},${destination.c}`,
        unitId: unit.id,
        success: false,
        failReason: 'network_send_unavailable'
      });
      return false;
    }

    if (typeof _executeEstablishTradeRoute === 'function') {
      _executeEstablishTradeRoute(action.payload);
      console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intento crear ruta comercial de (${origin.r},${origin.c}) a (${destination.r},${destination.c})`);
      if (typeof this.registrarMetaFlujo === 'function') {
        this.registrarMetaFlujo('caravana', origin.r, origin.c, unit.player);
        console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
      }
      this._metricLog('IA_COMMERCIAL_CONVERT_RESULT', {
        turn: gameState.turnNumber,
        playerId: unit.player,
        pair: `${origin.r},${origin.c}|${destination.r},${destination.c}`,
        unitId: unit.id,
        success: true,
        mode: 'local_execute'
      });
      return true;
    }

    this._metricLog('IA_COMMERCIAL_CONVERT_RESULT', {
      turn: gameState.turnNumber,
      playerId: unit.player,
      pair: `${origin.r},${origin.c}|${destination.r},${destination.c}`,
      unitId: unit.id,
      success: false,
      failReason: 'trade_api_unavailable'
    });
    return false;
  },

  _getTradeCityCandidates(myPlayer) {
    const cities = (gameState.cities || []).filter(c => c && Number.isInteger(c.r) && Number.isInteger(c.c));
    const bankCity = this._getBankCity();
    if (!bankCity) return cities;
    const alreadyIncluded = cities.some(c => c.r === bankCity.r && c.c === bankCity.c);
    return alreadyIncluded ? cities : cities.concat([bankCity]);
  },

  _isBarbarianTradeCity(city) {
    if (!city) return false;
    if (city.isBarbarianCity) return true;
    if (typeof BARBARIAN_PLAYER_ID !== 'undefined' && city.owner === BARBARIAN_PLAYER_ID) return true;
    return Number(city.owner) === 9;
  },

  _isAllowedTradeDestinationForCaravan(city, myPlayer) {
    if (!city) return false;
    if (city.owner === null || city.owner === undefined) return false;
    if (city.owner === myPlayer) return true;
    if (city.owner === 0 || city.isBank) return true;
    if (this._isBarbarianTradeCity(city)) return true;
    if (typeof isTradeBlockedBetweenPlayers === 'function') {
      return !isTradeBlockedBetweenPlayers(myPlayer, city.owner);
    }
    return true;
  },

  _getBankCity() {
    const bankId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : 0;
    return (gameState.cities || []).find(c => c && c.owner === bankId) || null;
  },

  _isBankCityByCoords(r, c) {
    if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
    const bank = this._getBankCity();
    if (bank && bank.r === r && bank.c === c) return true;
    const city = (gameState.cities || []).find(ct => ct && ct.r === r && ct.c === c);
    if (!city) return false;
    const bankId = typeof BankManager !== 'undefined' ? BankManager.PLAYER_ID : 0;
    if (city.isBank) return true;
    if (city.owner === bankId) return true;
    return String(city.name || '').toLowerCase().includes('banca');
  },

  _getEnemyPlayerIds(myPlayer) {
    if (typeof IASentidos !== 'undefined' && typeof IASentidos.getEnemyPlayerIds === 'function') {
      const ids = IASentidos.getEnemyPlayerIds(myPlayer);
      if (ids.length) return ids;
    }

    const ids = new Set();
    (units || []).forEach(u => {
      if (!u || u.player === myPlayer) return;
      if (!Number.isFinite(Number(u.player)) || Number(u.player) <= 0) return;
      ids.add(Number(u.player));
    });
    (gameState.cities || []).forEach(c => {
      if (!c || c.owner == null || c.owner === myPlayer) return;
      if (!Number.isFinite(Number(c.owner)) || Number(c.owner) <= 0) return;
      ids.add(Number(c.owner));
    });

    return Array.from(ids).sort((a, b) => a - b);
  },

  _getEnemyPlayerId(myPlayer) {
    const enemies = this._getEnemyPlayerIds(myPlayer);
    if (!enemies.length) return null;

    const withDistance = enemies.map(id => {
      const enemyUnits = IASentidos.getUnits(id);
      if (!enemyUnits.length) return { id, dist: 99, power: 0 };

      const dist = enemyUnits.reduce((best, enemyUnit) => {
        const d = this._minUnitDistance(myPlayer, enemyUnit);
        return Math.min(best, d);
      }, 99);
      const power = enemyUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
      return { id, dist, power };
    });

    withDistance.sort((a, b) => (a.dist - b.dist) || (b.power - a.power));
    return withDistance[0].id;
  },

  _getPlayerType(playerId) {
    const types = gameState.playerTypes || {};
    return types[`player${playerId}`] ?? types[playerId] ?? types[Number(playerId)] ?? null;
  },

  _isHumanType(type) {
    if (!type) return true;
    if (type === 'human') return true;
    return !type.includes('ai');
  },

  _getLandmassFromHex(startR, startC) {
    const startHex = board[startR]?.[startC];
    if (!startHex || startHex.terrain === 'water') return new Set();

    const visited = new Set();
    const queue = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);

    while (queue.length) {
      const current = queue.shift();
      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const key = `${neighbor.r},${neighbor.c}`;
        if (visited.has(key)) continue;
        const hex = board[neighbor.r]?.[neighbor.c];
        if (!hex || hex.terrain === 'water') continue;
        visited.add(key);
        queue.push(neighbor);
      }
    }

    return visited;
  },

  _findInvaderIslandFortressSpot(myPlayer, hexesPropios) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const enemyType = this._getPlayerType(enemyPlayer);
    const isHumanEnemy = this._isHumanType(enemyType);
    const enemyCapital = (gameState.cities || []).find(c => c.owner === enemyPlayer && c.isCapital);
    if (!enemyCapital) return null;

    const enemyLandmass = this._getLandmassFromHex(enemyCapital.r, enemyCapital.c);
    if (!enemyLandmass.size) return null;

    const fortBuildable = STRUCTURE_TYPES['Fortaleza']?.buildableOn || [];
    let minDist = this.INVADER_FORTRESS_MIN_DISTANCE;
    if (isHumanEnemy) {
      minDist = Math.min(3, minDist);
    }

    const alreadyBuilt = hexesPropios.some(h => {
      if (!h.structure) return false;
      if (h.structure !== 'Fortaleza' && h.structure !== 'Fortaleza con Muralla') return false;
      return enemyLandmass.has(`${h.r},${h.c}`);
    });

    if (alreadyBuilt) return null;

    let candidates = hexesPropios.filter(h => {
      if (h.structure || h.unit) return false;
      if (!enemyLandmass.has(`${h.r},${h.c}`)) return false;
      if (fortBuildable.length > 0 && !fortBuildable.includes(h.terrain)) return false;
      const dist = hexDistance(h.r, h.c, enemyCapital.r, enemyCapital.c);
      return dist >= minDist;
    });

    if (!candidates.length && minDist > 2) {
      candidates = hexesPropios.filter(h => {
        if (h.structure || h.unit) return false;
        if (!enemyLandmass.has(`${h.r},${h.c}`)) return false;
        if (fortBuildable.length > 0 && !fortBuildable.includes(h.terrain)) return false;
        const dist = hexDistance(h.r, h.c, enemyCapital.r, enemyCapital.c);
        return dist >= 2;
      });
    }

    if (!candidates.length) return null;

    const scoreFortressSpot = (hex) => {
      const dist = hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c);
      let score = isHumanEnemy ? Math.max(0, 20 - dist) : dist;
      if (hex.terrain === 'mountain' || hex.terrain === 'mountains') score += 1000;
      else if (hex.terrain === 'hills') score += 300;
      return score;
    };

    const best = candidates
      .map(h => ({ h, score: scoreFortressSpot(h) }))
      .sort((a, b) => b.score - a.score)[0];

    return best?.h || null;
  },

  _evaluateEnemyExpansionStrategy(myPlayer) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const enemyUnits = IASentidos.getUnits(enemyPlayer) || [];
    const landUnits = enemyUnits.filter(u => this._isLandUnit(u));
    if (!landUnits.length) {
      return { mode: 'unknown', targetRegiments: 3, huntMaxReg: 1, minRegiments: 0, maxRegiments: 0 };
    }

    const smallUnits = landUnits.filter(u => (u.regiments?.length || 0) <= 2);
    const largeUnits = landUnits.filter(u => (u.regiments?.length || 0) >= 4);

    const smallRatio = smallUnits.length / landUnits.length;
    const largeRatio = largeUnits.length / landUnits.length;
    const minRegiments = landUnits.reduce((min, u) => Math.min(min, u.regiments?.length || 0), Infinity);
    const maxRegiments = landUnits.reduce((max, u) => Math.max(max, u.regiments?.length || 0), 0);

    let mode = 'mixed';
    if (maxRegiments >= this.BIG_ENEMY_DIVISION_THRESHOLD) mode = 'stack_large';
    else if (smallRatio >= 0.5 || maxRegiments <= 2) mode = 'spread_small';
    else if (largeRatio >= 0.5 && landUnits.length <= 3) mode = 'slow_large';

    const maxSmallReg = smallUnits.reduce((max, u) => Math.max(max, u.regiments?.length || 0), 1);
    const desired = Math.max(3, maxSmallReg * 2);
    const targetRegiments = Math.min(desired, MAX_REGIMENTS_PER_DIVISION || desired);

    return {
      mode,
      targetRegiments,
      huntMaxReg: Math.max(1, Math.min(2, maxSmallReg)),
      minRegiments,
      maxRegiments
    };
  },

  _isHumanOpponent(myPlayer) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    return this._isHumanType(this._getPlayerType(enemyPlayer));
  },

  _getFortressLimitByHuman(myPlayer) {
    const enemyIds = this._getEnemyPlayerIds(myPlayer) || [];
    const humanEnemyId = enemyIds.find(id => this._isHumanType(this._getPlayerType(id))) || enemyIds[0] || null;
    const humanFortresses = humanEnemyId == null
      ? 0
      : board.flat().filter(h =>
          h &&
          h.owner === humanEnemyId &&
          (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
        ).length;
    return Math.max(1, humanFortresses + 2);
  },

  _ensureHeavyDivisions(myPlayer, targetRegiments) {
    const desired = Math.min(
      MAX_REGIMENTS_PER_DIVISION,
      Math.max(6, Math.min(this.HEAVY_DIVISION_TARGET, targetRegiments || this.HEAVY_DIVISION_TARGET))
    );

    const myUnits = IASentidos.getUnits(myPlayer).filter(u => this._isLandUnit(u));
    if (!myUnits.length) return false;

    const existing = myUnits.find(u => (u.regiments?.length || 0) >= desired);
    if (existing) return false;

    const anchor = myUnits
      .slice()
      .sort((a, b) => (b.regiments?.length || 0) - (a.regiments?.length || 0))[0];
    if (!anchor) return false;

    let total = anchor.regiments?.length || 0;
    const candidates = myUnits
      .filter(u => u.id !== anchor.id)
      .sort((a, b) => hexDistance(anchor.r, anchor.c, a.r, a.c) - hexDistance(anchor.r, anchor.c, b.r, b.c));

    for (const unit of candidates) {
      const regCount = unit.regiments?.length || 0;
      if (total + regCount > desired) continue;
      const dist = hexDistance(anchor.r, anchor.c, unit.r, unit.c);
      if (dist > 4) continue;
      if (dist > 1) {
        const moveTarget = getHexNeighbors(anchor.r, anchor.c).find(n => !board[n.r]?.[n.c]?.unit);
        if (moveTarget) {
          this._requestMoveUnit(unit, moveTarget.r, moveTarget.c);
        }
      }
      if (this._requestMergeUnits(unit, anchor)) {
        total += regCount;
        console.log(`[IA_ARCHIPIELAGO] + Refuerzo pesado: ${unit.name} →${anchor.name}`);
      }
      if (total >= desired) break;
    }

    // Si con fusiones no alcanzamos el tamaño deseado, intentar producir divisiones complementarias.
    if (total < desired) {
      const missing = desired - total;
      const per = Math.min(MAX_REGIMENTS_PER_DIVISION || missing, missing);
      const divisionsNeeded = Math.ceil(missing / per);
      console.log(`[IA_ARCHIPIELAGO] Refuerzo pesado incompleto (${total}/${desired}). Produciendo ${divisionsNeeded} divisiones de ${per} regimientos.`);
      const created = this._producirDivisiones(myPlayer, divisionsNeeded, per);
      if (created > 0) {
        console.log(`[IA_ARCHIPIELAGO] Producción completada: creadas ${created} divisiones para reforzar.`);
        // Opcional: intentar fusionar recién creadas hacia el ancla en el mismo turno
        const freshUnits = IASentidos.getUnits(myPlayer).filter(u => (u.regiments?.length || 0) <= per && hexDistance(u.r, u.c, anchor.r, anchor.c) <= 4);
        for (const fu of freshUnits) {
          if (total >= desired) break;
          const regCount = fu.regiments?.length || 0;
          if (this._requestMergeUnits(fu, anchor)) {
            total += regCount;
            console.log(`[IA_ARCHIPIELAGO] Fusionada nueva unidad ${fu.name} → ${anchor.name}`);
          }
        }
      }
    }

    return total >= desired;
  },

  _ensureHunterDivisions(myPlayer, targetRegiments) {
    const desired = Math.max(3, targetRegiments || 3);
    const maxRegs = MAX_REGIMENTS_PER_DIVISION || desired;
    const regimentsPerDivision = Math.min(desired, maxRegs);
    const myUnits = IASentidos.getUnits(myPlayer).filter(u => this._isLandUnit(u));
    const hunterUnits = myUnits.filter(u => (u.regiments?.length || 0) >= regimentsPerDivision);
    const missing = Math.max(0, this.HUNT_SMALL_DIVISIONS_TARGET - hunterUnits.length);
    if (missing <= 0) return 0;

    const createCount = Math.min(2, missing);
    return this._producirDivisiones(myPlayer, createCount, regimentsPerDivision);
  },

  _pressEnemyHomeIsland(myPlayer) {
    const isNavalMap = !!gameState.setupTempSettings?.navalMap || gameState.gameMode === 'invasion';
    if (!isNavalMap) return false;

    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const enemyType = this._getPlayerType(enemyPlayer);
    if (!this._isHumanType(enemyType)) return false;

    const enemyCapital = (gameState.cities || []).find(c => c.owner === enemyPlayer && c.isCapital);
    if (!enemyCapital) return false;

    const enemyLandmass = this._getLandmassFromHex(enemyCapital.r, enemyCapital.c);
    if (!enemyLandmass.size) return false;

    const ownsEnemyIsland = board.some(row => row.some(h => h && h.owner === myPlayer && enemyLandmass.has(`${h.r},${h.c}`)));
    if (ownsEnemyIsland) {
      return this._buildPressureFortressOnEnemyIsland(myPlayer, enemyLandmass, enemyCapital);
    }

    const frente = (typeof IATactica !== 'undefined') ? IATactica.detectarFrente(myPlayer, 2) : [];
    const enemyUnits = IASentidos.getUnits(enemyPlayer) || [];
    const landing = this._findEnemyLandingTarget(enemyLandmass, enemyCapital, frente, enemyUnits);
    if (!landing) return false;

    let transport = this._findTransportShip(myPlayer);
    if (!transport) {
      transport = this._createTransportShip(myPlayer);
      if (!transport) return false;
      console.log('[IA_ARCHIPIELAGO] Armada creada para invasion. Intentando embarcar inmediatamente.');

      // Intentar embarcar una unidad cercana inmediatamente
      const embarkUnit = this._selectEmbarkUnit(myPlayer, transport);
      if (embarkUnit) {
        console.log(`[IA_ARCHIPIELAGO] Embarcando tropas en ${transport.name || transport.id}.`);
        if (this._requestMergeUnits(embarkUnit, transport)) return true;
      }

      // Si no hay unidad cercana, intentar producir una unidad pequeña y embarcarla
      if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
        const comp = this._getArmyComposition(myPlayer, 3, null);
        const newUnit = AiGameplayManager.produceUnit(myPlayer, comp, 'attacker', 'TropaEmb');
        if (newUnit) {
          // si la nueva unidad no está adyacente, intentar moverla junto al barco
          const dist = hexDistance(newUnit.r, newUnit.c, transport.r, transport.c);
          if (dist > 1) {
            const moveTarget = getHexNeighbors(transport.r, transport.c).find(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit && board[n.r][n.c].terrain !== 'water');
            if (moveTarget) this._requestMoveUnit(newUnit, moveTarget.r, moveTarget.c);
          }
          if (this._requestMergeUnits(newUnit, transport)) return true;
        }
      }

      // No se pudo embarcar ahora: devolver true para indicar progreso (barco creado)
      return true;
    }

    const hasLandRegs = transport.regiments?.some(r => !REGIMENT_TYPES?.[r.type]?.is_naval);
    const hasNavalRegs = transport.regiments?.some(r => REGIMENT_TYPES?.[r.type]?.is_naval);
    if (!hasNavalRegs) return false;

    if (!hasLandRegs) {
      const embarkUnit = this._selectEmbarkUnit(myPlayer, transport);
      if (!embarkUnit) return false;
      console.log(`[IA_ARCHIPIELAGO] Embarcando tropas en ${transport.name || transport.id}.`);
      return this._requestMergeUnits(embarkUnit, transport);
    }

    if (transport.r === landing.water.r && transport.c === landing.water.c) {
      return this._requestDisembark(transport, landing.land);
    }

    return this._requestMoveUnit(transport, landing.water.r, landing.water.c);
  },

  _buildPressureFortressOnEnemyIsland(myPlayer, enemyLandmass, enemyCapital) {
    const hexesPropios = IASentidos?.getOwnedHexes ? IASentidos.getOwnedHexes(myPlayer) : [];
    if (!hexesPropios.length) return false;

    const turn = gameState.turnNumber || 1;
    if (turn < 2) return false;

    const spot = this._findInvaderIslandFortressSpot(myPlayer, hexesPropios);
    if (!spot) return false;

    if (!this._ensureTech(myPlayer, 'FORTIFICATIONS')) {
      return false;
    }

    if (!this._canAffordStructure(myPlayer, 'Fortaleza')) {
      return false;
    }

    console.log(`[IA_ARCHIPIELAGO] Fortaleza de presion en isla enemiga (${spot.r},${spot.c}).`);
    return this._requestBuildStructure(myPlayer, spot.r, spot.c, 'Fortaleza');
  },

  _findEnemyLandingTarget(enemyLandmass, enemyCapital, frente = [], enemyUnits = []) {
    let best = null;

    const frontPoints = Array.isArray(frente) ? frente : [];
    const enemyUnitList = Array.isArray(enemyUnits) ? enemyUnits : [];

    for (const row of board) {
      for (const hex of row) {
        if (!hex || hex.terrain === 'water') continue;
        if (!enemyLandmass.has(`${hex.r},${hex.c}`)) continue;
        if (hex.unit) continue;

        const waterNeighbor = getHexNeighbors(hex.r, hex.c).find(n => {
          const wHex = board[n.r]?.[n.c];
          return wHex && wHex.terrain === 'water' && !wHex.unit;
        });
        if (!waterNeighbor) continue;

        const distToCapital = hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c);
        const distToFront = frontPoints.length
          ? Math.min(...frontPoints.map(fp => hexDistance(hex.r, hex.c, fp.r, fp.c)))
          : 6;
        const distToEnemy = enemyUnitList.length
          ? Math.min(...enemyUnitList.map(u => hexDistance(hex.r, hex.c, u.r, u.c)))
          : 6;

        let score = (distToFront * 3) + (distToEnemy * 2) - distToCapital;
        if (distToCapital > 10) score -= (distToCapital - 10) * 2;

        if (!best || score > best.score) {
          best = { land: hex, water: waterNeighbor, score, distToCapital, distToFront, distToEnemy };
        }
      }
    }

    if (!best) return null;
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`[IA_ARCHIPIELAGO] Landing elegido: land=(${best.land.r},${best.land.c}) water=(${best.water.r},${best.water.c}) score=${best.score.toFixed(2)} distCap=${best.distToCapital} distFront=${best.distToFront} distEnemy=${best.distToEnemy}`);
    }
    return { land: best.land, water: best.water };
  },

  _getTransportCapacity(unit) {
    if (!unit?.regiments?.length) return 0;
    return unit.regiments.reduce((max, reg) => {
      const cap = REGIMENT_TYPES?.[reg.type]?.transportCapacity || 0;
      return Math.max(max, cap);
    }, 0);
  },

  _findTransportShip(myPlayer) {
    // Preferir barcos que ya llevan regimientos de tierra (capacidad usada), luego cualquiera con capacidad
    const withLand = units.find(u => u.player === myPlayer && u.regiments?.some(r => REGIMENT_TYPES?.[r.type] && !REGIMENT_TYPES[r.type].is_naval) && this._getTransportCapacity(u) > 0);
    if (withLand) return withLand;
    return units.find(u => u.player === myPlayer && u.regiments?.some(r => REGIMENT_TYPES?.[r.type]?.is_naval) && this._getTransportCapacity(u) > 0) || null;
  },

  _createTransportShip(myPlayer) {
    const preferred = REGIMENT_TYPES['Barco de Guerra'] ? 'Barco de Guerra' : null;
    if (preferred) return this._crearUnidadNaval(myPlayer, preferred);

    const fallback = Object.keys(REGIMENT_TYPES || {}).find(t => {
      const data = REGIMENT_TYPES[t];
      return data?.is_naval && (data.transportCapacity || 0) > 0;
    });
    if (!fallback) return null;
    return this._crearUnidadNaval(myPlayer, fallback);
  },

  _selectEmbarkUnit(myPlayer, transport) {
    const maxRegs = Number.isFinite(MAX_REGIMENTS_PER_DIVISION) ? MAX_REGIMENTS_PER_DIVISION : 20;
    const transportRegs = transport?.regiments?.length || 0;
    const capacityLeft = Math.max(0, maxRegs - transportRegs);
    if (capacityLeft <= 0) return null;

    const candidates = IASentidos.getUnits(myPlayer)
      .filter(u => this._isLandUnit(u))
      .filter(u => (u.regiments?.length || 0) <= capacityLeft)
      .sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));

    return candidates[0] || null;
  },

  _requestDisembark(transport, landHex) {
    if (!transport || !landHex) return false;
    if (landHex.terrain === 'water' || landHex.unit) return false;

    const landRegs = transport.regiments.filter(r => !REGIMENT_TYPES?.[r.type]?.is_naval);
    const navalRegs = transport.regiments.filter(r => REGIMENT_TYPES?.[r.type]?.is_naval);
    if (!landRegs.length || !navalRegs.length) return false;

    gameState.preparingAction = {
      type: 'split_unit',
      unitId: transport.id,
      newUnitRegiments: landRegs,
      remainingOriginalRegiments: navalRegs
    };

    console.log(`[IA_ARCHIPIELAGO] Desembarcando en (${landHex.r},${landHex.c}).`);
    return this._requestSplitUnit(transport, landHex.r, landHex.c);
  },

  _getTradePairKey(cityA, cityB) {
    if (!cityA || !cityB) return null;
    const aKey = Number.isInteger(cityA.r) && Number.isInteger(cityA.c) ? `${cityA.r},${cityA.c}` : cityA.name;
    const bKey = Number.isInteger(cityB.r) && Number.isInteger(cityB.c) ? `${cityB.r},${cityB.c}` : cityB.name;
    if (!aKey || !bKey) return null;
    return [aKey, bKey].sort().join('|');
  },

  _getExistingTradeRouteKeys(playerFilter = null) {
    const keys = new Set();
    (units || []).forEach(u => {
      if (playerFilter !== null && (u.player ?? u.playerId) !== playerFilter) return;
      if (u.tradeRoute?.origin && u.tradeRoute?.destination) {
        const key = this._getTradePairKey(u.tradeRoute.origin, u.tradeRoute.destination);
        if (key) keys.add(key);
      }
    });
    return keys;
  },


  _pickNextTradeRouteCandidate(myPlayer, existingRouteKeys) {
    const cities = this._getTradeCityCandidates(myPlayer);
    const ownCities = cities.filter(c => c.owner === myPlayer);
    const tradeCities = cities.filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));

    if (tradeCities.length < 2) return null;

    const candidates = [];
    for (let i = 0; i < tradeCities.length; i++) {
      for (let j = i + 1; j < tradeCities.length; j++) {
        const cityA = tradeCities[i];
        const cityB = tradeCities[j];
        if (!cityA || !cityB) continue;
        if ((cityA.isBank || cityA.owner === 0) && (cityB.isBank || cityB.owner === 0)) continue;

        const routeKey = this._getTradePairKey(cityA, cityB);
        if (routeKey && existingRouteKeys?.has(routeKey)) continue;

        const infraPath = findInfrastructurePath(cityA, cityB, { allowForeignInfrastructure: true, requireRoadCorridor: true });
        if (!infraPath) continue;

        const hasBank = !!(cityA.isBank || cityB.isBank || cityA.owner === 0 || cityB.owner === 0);
        candidates.push({ cityA, cityB, infraPath, hasBank });
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      return a.infraPath.length - b.infraPath.length;
    });

    return candidates[0];
  },

  _pickObjective(list, unit, myPlayer) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const valid = list.filter(item => this._isValidTarget(item));
    if (!valid.length) return null;

    const candidates = valid.filter(item => {
      const hex = board[item.r]?.[item.c];
      return !(hex?.unit && hex.unit.player === myPlayer);
    });

    const pool = candidates.length ? candidates : valid;
    if (!unit) return pool[0];

    const reachable = pool.filter(item => this._findPathForUnit(unit, item.r, item.c));
    const pickFrom = reachable.length ? reachable : pool;

    return pickFrom.reduce((best, curr) => {
      const bestDist = hexDistance(unit.r, unit.c, best.r, best.c);
      const currDist = hexDistance(unit.r, unit.c, curr.r, curr.c);
      return currDist < bestDist ? curr : best;
    });
  },

  _isCorridorPioneer(unit) {
    if (!unit) return false;
    if ((unit.name || '').includes('Pionero de Corredor')) return true;
    const assignments = typeof AiGameplayManager !== 'undefined' ? AiGameplayManager.missionAssignments : null;
    const mission = assignments?.get ? assignments.get(unit.id) : null;
    return !!(mission && (mission.type === 'OCCUPY_THEN_BUILD' || mission.nodoRazon === 'ORGANIC_CARAVAN_CORRIDOR'));
  },

  _formatWormUnitForHumanTrace(unitLike) {
    if (!unitLike) return 'Division desconocida (?,?)';
    const name = unitLike.name || 'Division';
    const coords = (Number.isInteger(unitLike.r) && Number.isInteger(unitLike.c))
      ? `(${unitLike.r},${unitLike.c})`
      : '(?,?)';
    const regs = Number.isInteger(unitLike.regimentsCount)
      ? unitLike.regimentsCount
      : (unitLike.regiments?.length || 0);
    const includeIds = !!this.WORM_HUMAN_TRACE_INCLUDE_IDS;
    const idText = includeIds && unitLike.id ? ` [${unitLike.id}]` : '';
    return `${name}${idText} ${coords} ${regs} reg`;
  },

  _emitWormHumanStepTrace({ myPlayer, pair, objective, sourceBefore, created, mergeRequested, mergeConfirmed = false, mergeRejectReason = null, relayUnit, moved, progressed, reason }) {
    if (!this.WORM_HUMAN_TRACE) return;
    const sourceText = this._formatWormUnitForHumanTrace(sourceBefore);
    const createdText = created ? this._formatWormUnitForHumanTrace(created) : 'sin nueva division';
    const relayText = this._formatWormUnitForHumanTrace(relayUnit);
    const mergeText = created
      ? (mergeConfirmed
        ? 'Merge=CONFIRMADO'
        : (mergeRequested
          ? `Merge=PENDIENTE${mergeRejectReason ? `(${mergeRejectReason})` : ''}`
          : `Merge=FALLO${mergeRejectReason ? `(${mergeRejectReason})` : ''}`))
      : 'Merge=N/A';
    const resultText = `Resultado=${reason || 'desconocido'} moved=${!!moved} progressed=${!!progressed}`;
    console.log(`[IA_ARCHIPIELAGO][GUSANO TRAZA] J${myPlayer} ${pair} objetivo=(${objective?.r},${objective?.c}) | Inicio=${sourceText} | Split=${createdText} | ${mergeText} | Relay=${relayText} | ${resultText}`);
  },

  _registerMergeContext(mergingUnit, targetUnit, context = null) {
    if (!mergingUnit?.id || !targetUnit?.id || !context) return;
    if (!this._pendingMergeContexts) this._pendingMergeContexts = new Map();
    const now = Date.now();
    for (const [k, v] of this._pendingMergeContexts.entries()) {
      if ((now - Number(v?.ts || 0)) > 15000) this._pendingMergeContexts.delete(k);
    }
    this._pendingMergeContexts.set(`${mergingUnit.id}->${targetUnit.id}`, { ...context, ts: now });
  },

  _markWormMergeConfirmed(sourceId, targetId, payload = null) {
    if (!sourceId || !targetId) return;
    if (!this._wormMergeConfirmations) this._wormMergeConfirmations = new Map();
    const now = Date.now();
    for (const [k, v] of this._wormMergeConfirmations.entries()) {
      if ((now - Number(v?.ts || 0)) > 15000) this._wormMergeConfirmations.delete(k);
    }
    this._wormMergeConfirmations.set(`${sourceId}->${targetId}`, { ts: now, payload: payload || null });
  },

  _consumeWormMergeConfirmed(sourceId, targetId) {
    if (!sourceId || !targetId || !this._wormMergeConfirmations) return null;
    const key = `${sourceId}->${targetId}`;
    const entry = this._wormMergeConfirmations.get(key);
    if (!entry) return null;
    this._wormMergeConfirmations.delete(key);
    return entry;
  },

  _notifyMergeCompleted(payload = {}) {
    const sourceId = payload.sourceId;
    const targetId = payload.targetId;
    if (!sourceId || !targetId || !this._pendingMergeContexts) return;

    const key = `${sourceId}->${targetId}`;
    const ctx = this._pendingMergeContexts.get(key);
    if (!ctx) return;
    this._pendingMergeContexts.delete(key);
    if (ctx.kind !== 'worm') return;
    this._markWormMergeConfirmed(sourceId, targetId, payload);

    const sourceName = payload.sourceName || sourceId;
    const targetName = payload.targetName || targetId;
    const pair = ctx.pair || 'NODO_A->NODO_B';
    const objective = ctx.objective || '?,?';
    const beforeSource = Number(payload.sourceRegsBefore || 0);
    const beforeTarget = Number(payload.targetRegsBefore || 0);
    const afterTarget = Number(payload.targetRegsAfter || 0);

    console.log(`[IA_ARCHIPIELAGO][GUSANO MERGE CONFIRMADO] J${payload.playerId ?? '?'} ${pair} objetivo=${objective} | ${sourceName} -> ${targetName} | reg(${beforeSource}+${beforeTarget}=>${afterTarget})`);
  },

  _splitUnitTowardsObjective(unit, objective) {
    if (!unit || !objective) return false;
    const regimientosActuales = unit.regiments?.length || 0;
    if (regimientosActuales < this.WORM_MIN_SPLIT_REGIMENTS) return false;

    const splitCandidates = getHexNeighbors(unit.r, unit.c)
      .filter(n => {
        const hex = board[n.r]?.[n.c];
        if (!hex || hex.terrain === 'water' || hex.unit) return false;
        return this._isTerrainPassableForUnit(unit, hex.terrain);
      })
      .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c));

    const splitHex = splitCandidates[0];
    if (!splitHex) return false;

    const mitad = Math.ceil(regimientosActuales / 2);
    gameState.preparingAction = {
      type: 'split_unit',
      unitId: unit.id,
      newUnitRegiments: unit.regiments.slice(0, mitad),
      remainingOriginalRegiments: unit.regiments.slice(mitad)
    };

    return this._requestSplitUnit(unit, splitHex.r, splitHex.c);
  },

  _splitMergeWormStep(myPlayer, unit, objective, node) {
    if (!unit || !objective) return { ok: false, reason: 'invalid_input' };
    const sourceBefore = {
      id: unit.id,
      name: unit.name,
      r: unit.r,
      c: unit.c,
      regimentsCount: unit.regiments?.length || 0
    };
    this._importantLog('WORM_STEP_START', {
      playerId: myPlayer,
      pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
      objective: `${objective.r},${objective.c}`,
      sourceUnitId: unit.id,
      sourceAt: `${unit.r},${unit.c}`,
      sourceRegiments: unit.regiments?.length || 0
    });

    const beforeUnits = IASentidos.getUnits(myPlayer) || [];
    const beforeIds = new Set(beforeUnits.map(u => u.id));
    const splitOk = this._splitUnitTowardsObjective(unit, objective);
    if (!splitOk) return { ok: false, reason: 'split_failed' };

    const afterUnits = IASentidos.getUnits(myPlayer) || [];
    const created = afterUnits
      .filter(u => !beforeIds.has(u.id))
      .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c))[0] || null;

    this._importantLog('WORM_SPLIT', {
      playerId: myPlayer,
      pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
      objective: `${objective.r},${objective.c}`,
      sourceUnitId: unit.id,
      createdUnitId: created?.id || null,
      createdAt: created ? `${created.r},${created.c}` : null,
      sourceAfterSplitRegiments: (afterUnits.find(u => u.id === unit.id)?.regiments?.length || 0),
      createdRegiments: created?.regiments?.length || 0
    });

    let relay = created || (afterUnits.find(u => u.id === unit.id) || unit);
    let merged = false;
    let mergeRequested = false;
    let mergeConfirmed = false;
    let mergeRejectReason = null;
    if (created) {
      const original = afterUnits.find(u => u.id === unit.id);
      if (original && original.id !== created.id) {
        if (typeof RequestMergeUnits !== 'function') {
          mergeRejectReason = 'merge_api_unavailable';
        } else {
          merged = this._requestMergeUnits(original, created, {
            bypassCooldown: true,
            preferImmediateLocal: true,
            kind: 'worm',
            pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
            objective: `${objective.r},${objective.c}`,
            sourceUnitId: original.id,
            targetUnitId: created.id
          });
          mergeRequested = !!merged;
          if (!merged) {
            mergeRejectReason = 'merge_request_rejected_worm';
          } else {
            mergeConfirmed = !!this._consumeWormMergeConfirmed(original.id, created.id);

            // En local, mergeUnits es async y el callback de confirmacion puede llegar tarde.
            // Si el estado de unidades ya refleja la fusion (target crece o source desaparece),
            // tomamos el merge como confirmado para no cortar la cadena del gusano.
            if (!mergeConfirmed) {
              const liveUnits = IASentidos.getUnits(myPlayer) || [];
              const liveTarget = liveUnits.find(u => u.id === created.id);
              const liveSource = liveUnits.find(u => u.id === original.id);
              const targetRegsAfter = liveTarget?.regiments?.length || 0;
              const sourceStillAlive = !!liveSource;
              const sourceRegsBefore = original.regiments?.length || 0;
              const targetRegsBefore = created.regiments?.length || 0;

              if (!sourceStillAlive || targetRegsAfter > targetRegsBefore || targetRegsAfter >= (sourceRegsBefore + targetRegsBefore)) {
                mergeConfirmed = true;
              }
            }

            if (!mergeConfirmed) mergeRejectReason = 'merge_not_confirmed_yet';
          }
        }
        this._importantLog('WORM_MERGE', {
          playerId: myPlayer,
          pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
          objective: `${objective.r},${objective.c}`,
          fromUnitId: original.id,
          fromAt: `${original.r},${original.c}`,
          toUnitId: created.id,
          toAt: `${created.r},${created.c}`,
          mergeRequested: !!merged,
          mergeConfirmed,
          mergeRejectReason: mergeRejectReason || null
        });
      }
      relay = afterUnits.find(u => u.id === created.id) || created;
    }

    this._importantLog('WORM_ACTION', {
      playerId: myPlayer,
      action: 'split_merge_relay',
      missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR,
      pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
      objective: `${objective.r},${objective.c}`,
      sourceUnitId: unit.id,
      createdUnitId: created?.id || null,
      mergedOriginal: !!merged,
      relayUnitId: relay?.id || unit.id
    });

    return {
      ok: true,
      relayUnitId: relay?.id || unit.id,
      trace: {
        pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        sourceBefore,
        created: created || null,
        mergeRequested,
        mergeConfirmed,
        mergeRejectReason
      }
    };
  },

  _attemptSplitMergeRelayToObjective(myPlayer, unit, objective, node = null, missionType = null) {
    if (!unit || !objective) return { ok: false, moved: false, reason: 'invalid_input' };
    if ((unit.regiments?.length || 0) < this.WORM_MIN_SPLIT_REGIMENTS) {
      return { ok: false, moved: false, reason: 'insufficient_regiments' };
    }

    const relay = this._splitMergeWormStep(myPlayer, unit, objective, node || {
      from: { name: 'OCUPACION' },
      to: { name: 'OBJETIVO' }
    });
    if (!relay.ok) return { ok: false, moved: false, reason: relay.reason || 'split_failed' };

    const splitMergeReady = !!relay.trace?.mergeConfirmed;
    if (!splitMergeReady) {
      this._importantLog('WORM_RELAY_MOVE', {
        playerId: myPlayer,
        pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective: `${objective.r},${objective.c}`,
        relayUnitId: relay.relayUnitId,
        moved: false,
        reason: 'relay_merge_not_completed',
        mergeRequested: !!relay.trace?.mergeRequested,
        mergeRejectReason: relay.trace?.mergeRejectReason || null
      });
      this._emitWormHumanStepTrace({
        myPlayer,
        pair: relay.trace?.pair || `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective,
        sourceBefore: relay.trace?.sourceBefore,
        created: relay.trace?.created,
        mergeRequested: relay.trace?.mergeRequested,
        mergeConfirmed: relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason,
        relayUnit: (IASentidos.getUnits(myPlayer) || []).find(u => u.id === relay.relayUnitId) || null,
        moved: false,
        progressed: false,
        reason: 'relay_merge_not_completed'
      });
      return {
        ok: true,
        moved: false,
        progressed: false,
        relayUnitId: relay.relayUnitId,
        mergeRequested: !!relay.trace?.mergeRequested,
        mergeConfirmed: !!relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason || null,
        reason: 'relay_merge_not_completed'
      };
    }

    const relayUnit = (IASentidos.getUnits(myPlayer) || []).find(u => u.id === relay.relayUnitId);
    if (relayUnit && (relayUnit.regiments?.length || 0) < this.WORM_MIN_SPLIT_REGIMENTS) {
      this._importantLog('WORM_RELAY_MOVE', {
        playerId: myPlayer,
        pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective: `${objective.r},${objective.c}`,
        relayUnitId: relayUnit.id,
        relayAt: `${relayUnit.r},${relayUnit.c}`,
        relayRegiments: relayUnit.regiments?.length || 0,
        moved: false,
        reason: 'relay_understrength_after_merge'
      });
      this._emitWormHumanStepTrace({
        myPlayer,
        pair: relay.trace?.pair || `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective,
        sourceBefore: relay.trace?.sourceBefore,
        created: relay.trace?.created,
        mergeRequested: relay.trace?.mergeRequested,
        mergeConfirmed: relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason || 'relay_understrength_after_merge',
        relayUnit,
        moved: false,
        progressed: false,
        reason: 'relay_understrength_after_merge'
      });
      return {
        ok: true,
        moved: false,
        progressed: false,
        relayUnitId: relayUnit.id,
        mergeRequested: !!relay.trace?.mergeRequested,
        mergeConfirmed: !!relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason || 'relay_understrength_after_merge',
        reason: 'relay_understrength_after_merge'
      };
    }

    if (!relayUnit || (relayUnit.currentMovement || 0) <= 0) {
      this._importantLog('WORM_RELAY_MOVE', {
        playerId: myPlayer,
        pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective: `${objective.r},${objective.c}`,
        relayUnitId: relay.relayUnitId,
        relayAt: relayUnit ? `${relayUnit.r},${relayUnit.c}` : null,
        relayMovement: relayUnit?.currentMovement ?? 0,
        moved: false,
        reason: 'relay_without_movement'
      });
      this._emitWormHumanStepTrace({
        myPlayer,
        pair: relay.trace?.pair || `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective,
        sourceBefore: relay.trace?.sourceBefore,
        created: relay.trace?.created,
        mergeRequested: relay.trace?.mergeRequested,
        mergeConfirmed: relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason,
        relayUnit,
        moved: false,
        progressed: false,
        reason: 'relay_without_movement'
      });
      return {
        ok: true,
        moved: false,
        progressed: false,
        relayUnitId: relay.relayUnitId,
        mergeRequested: !!relay.trace?.mergeRequested,
        mergeConfirmed: !!relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason || null,
        reason: 'relay_without_movement'
      };
    }

    // Si el relay ya quedó sobre el objetivo tras split/merge, lo contamos como progreso.
    // Esto evita cortar la cadena en el primer hex y permite encadenar al siguiente paso del corredor.
    if (relayUnit.r === objective.r && relayUnit.c === objective.c) {
      this._importantLog('WORM_RELAY_MOVE', {
        playerId: myPlayer,
        pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective: `${objective.r},${objective.c}`,
        relayUnitId: relayUnit.id,
        relayAt: `${relayUnit.r},${relayUnit.c}`,
        relayMovement: relayUnit.currentMovement || 0,
        moved: false,
        progressed: true,
        reason: 'relay_objective_reached'
      });
      if (missionType === this.MISSION_TYPE_COMMERCIAL_CORRIDOR) {
        this._registerCommercialSplitMergeSuccess(myPlayer);
      }
      this._emitWormHumanStepTrace({
        myPlayer,
        pair: relay.trace?.pair || `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
        objective,
        sourceBefore: relay.trace?.sourceBefore,
        created: relay.trace?.created,
        mergeRequested: relay.trace?.mergeRequested,
        mergeConfirmed: relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason,
        relayUnit,
        moved: false,
        progressed: true,
        reason: 'relay_objective_reached'
      });
      return {
        ok: true,
        moved: false,
        progressed: true,
        relayUnitId: relayUnit.id,
        mergeRequested: !!relay.trace?.mergeRequested,
        mergeConfirmed: !!relay.trace?.mergeConfirmed,
        mergeRejectReason: relay.trace?.mergeRejectReason || null,
        reason: 'relay_objective_reached'
      };
    }

    const moved = this._requestMoveOrAttack(relayUnit, objective.r, objective.c, { missionType });
    this._importantLog('WORM_RELAY_MOVE', {
      playerId: myPlayer,
      pair: `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
      objective: `${objective.r},${objective.c}`,
      relayUnitId: relayUnit.id,
      relayAt: `${relayUnit.r},${relayUnit.c}`,
      relayMovement: relayUnit.currentMovement || 0,
      moved: !!moved,
      progressed: !!moved,
      reason: moved ? 'relay_move_success' : 'relay_move_failed'
    });
    if (missionType === this.MISSION_TYPE_COMMERCIAL_CORRIDOR) {
      this._registerCommercialSplitMergeSuccess(myPlayer);
    }
    this._emitWormHumanStepTrace({
      myPlayer,
      pair: relay.trace?.pair || `${node?.from?.name || 'NODO_A'}->${node?.to?.name || 'NODO_B'}`,
      objective,
      sourceBefore: relay.trace?.sourceBefore,
      created: relay.trace?.created,
      mergeRequested: relay.trace?.mergeRequested,
      mergeConfirmed: relay.trace?.mergeConfirmed,
      mergeRejectReason: relay.trace?.mergeRejectReason,
      relayUnit,
      moved: !!moved,
      progressed: !!moved,
      reason: moved ? 'relay_move_success' : 'relay_move_failed'
    });
    return {
      ok: true,
      moved: !!moved,
      progressed: !!moved,
      relayUnitId: relayUnit.id,
      mergeRequested: !!relay.trace?.mergeRequested,
      mergeConfirmed: !!relay.trace?.mergeConfirmed,
      mergeRejectReason: relay.trace?.mergeRejectReason || null,
      reason: moved ? 'relay_move_success' : 'relay_move_failed'
    };
  },

  _getTopCorridorObjectives(myPlayer, maxObjectives = 3) {
    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (!roadPlan.connections?.length) return [];

    const normalized = roadPlan.connections
      .map(conn => {
        const pendingCaptureSegments = (conn.pendingCaptureSegments || [])
          .filter(step => {
            const hex = board[step.r]?.[step.c];
            if (!hex) return false;
            if (hex.owner === myPlayer) return false;
            const occ = getUnitOnHex(step.r, step.c);
            if (occ && occ.player === myPlayer) return false;
            return true;
          });
        if (!pendingCaptureSegments.length) return null;
        return {
          from: conn.from,
          to: conn.to,
          pairKey: conn.pairKey || this._getTradePairKey(conn.from, conn.to),
          pendingCaptureSegments,
          scoreBase: (pendingCaptureSegments.length * 3) + (conn.landPath?.length || 0)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.scoreBase - b.scoreBase);

    if (!normalized.length) return [];

    // Expansión por capas: primero la 1ra casilla pendiente de cada par, luego la 2da, etc.
    // Esto evita quedarnos en solo 1-2 casillas y permite llenar hasta maxObjectives con objetivos recurrentes.
    const candidates = [];
    const seenHex = new Set();
    let layer = 0;
    while (candidates.length < maxObjectives) {
      let addedInLayer = 0;
      for (const conn of normalized) {
        if (candidates.length >= maxObjectives) break;
        const objective = conn.pendingCaptureSegments[layer];
        if (!objective) continue;
        const key = `${objective.r},${objective.c}`;
        if (seenHex.has(key)) continue;
        seenHex.add(key);
        candidates.push({
          objective,
          score: conn.scoreBase + layer,
          pendingType: 'capture',
          pendingCaptureCount: conn.pendingCaptureSegments.length,
          pairKey: conn.pairKey,
          from: conn.from,
          to: conn.to,
          layer
        });
        addedInLayer += 1;
      }
      if (addedInLayer === 0) break;
      layer += 1;
    }

    return candidates;
  },

  _diagnoseCorridorObjectives(myPlayer, maxPairs = 8) {
    const cities = this._getTradeCityCandidates(myPlayer);
    const ownCities = cities.filter(c => c && c.owner === myPlayer);
    const tradeCities = cities.filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));
    const sample = [];
    const permissiveOwners = new Set([myPlayer, 0, 9, null, undefined]);

    for (const origin of ownCities) {
      for (const dest of tradeCities) {
        if (!origin || !dest) continue;
        if (origin.r === dest.r && origin.c === dest.c) continue;
        if (sample.length >= maxPairs) break;

        const strict = this._findRoadConnection(origin, dest, myPlayer, null);
        const permissive = this._findRoadConnection(origin, dest, myPlayer, permissiveOwners);
        let status = 'no_path';
        if (strict) {
          if ((strict.pendingCaptureSegments?.length || 0) > 0) status = 'pending_capture';
          else if ((strict.missingOwnedSegments?.length || 0) > 0) status = 'pending_build';
          else status = 'ready_no_pending';
        } else if (permissive) {
          status = 'blocked_by_owner_filter';
        }

        sample.push({
          from: `${origin.r},${origin.c}`,
          to: `${dest.r},${dest.c}`,
          status,
          pendingCapture: strict?.pendingCaptureSegments?.length || 0,
          pendingBuild: strict?.missingOwnedSegments?.length || 0,
          pathLen: strict?.landPath?.length || permissive?.landPath?.length || 0
        });
      }
      if (sample.length >= maxPairs) break;
    }

    return {
      ownNodes: ownCities.length,
      tradeNodes: tradeCities.length,
      analyzedPairs: sample.length,
      sample
    };
  },

  _ejecutarGusanoCorredor(situacion, opts = {}) {
    const { myPlayer } = situacion;
    const maxActions = Math.max(1, Number(opts.maxActions || this.WORM_MAX_ACTIONS_PER_TURN));
    const corridorObjectives = this._getTopCorridorObjectives(myPlayer, maxActions);
    if (!corridorObjectives.length) {
      console.log(`[IA_ARCHIPIELAGO][GUSANO] Sin objetivos de corredor pendientes para J${myPlayer}.`);
      return 0;
    }
    const bankCity = this._getBankCity();
    const bankObjectives = corridorObjectives.filter(node =>
      bankCity && node?.to?.r === bankCity.r && node?.to?.c === bankCity.c
    ).length;
    this._importantLog('WORM_PLAN', {
      playerId: myPlayer,
      objectives: corridorObjectives.length,
      bankObjectives,
      maxActions
    });

    let actions = 0;
    let passIndex = 0;
    const preferredRelayByPair = new Map();
    let abortWormFlow = false;
    let abortReason = null;

    while (actions < maxActions) {
      let passProgress = false;

      for (const node of corridorObjectives) {
        if (actions >= maxActions) break;

        let objective = node.objective;
        const nodePair = `${node.from?.name || 'NODO_A'}->${node.to?.name || 'NODO_B'}`;
        const relayStateKey = node.pairKey || `${nodePair}:${node.objective?.r},${node.objective?.c}`;
        let preferredRelayUnitId = preferredRelayByPair.get(relayStateKey) || null;
        const nodeActionsBefore = actions;
        let nodeTerminalReason = 'not_set';
        let nodeObjectiveHex = board[objective.r]?.[objective.c];
        const nodeUnits = IASentidos.getUnits(myPlayer)
          .filter(u => this._isLandUnit(u))
          .filter(u => (u.currentMovement || 0) > 0)
          .filter(u => !u.iaExpeditionTarget);
        this._importantLog('WORM_NODE_STATUS', {
          playerId: myPlayer,
          pair: nodePair,
          objective: `${objective.r},${objective.c}`,
          objectiveOwner: nodeObjectiveHex?.owner ?? null,
          objectiveHasUnit: !!getUnitOnHex(objective.r, objective.c),
          availableUnits: nodeUnits.length,
          splitCandidates: nodeUnits.filter(u => (u.regiments?.length || 0) >= this.WORM_MIN_SPLIT_REGIMENTS).length,
          pathCandidates: nodeUnits.filter(u => !!this._findPathForUnit(u, objective.r, objective.c)).length,
          passIndex
        });
        const maxNodeSteps = 1;
        let nodeActed = false;

        for (let stepIndex = 0; stepIndex < maxNodeSteps && actions < maxActions; stepIndex++) {
        const liveConn = this._findRoadConnection(node.from, node.to, myPlayer, 'ANY');
        const livePending = (liveConn?.pendingCaptureSegments || [])
          .filter(step => {
            const hex = board[step.r]?.[step.c];
            if (!hex) return false;
            if (hex.owner === myPlayer) return false;
            const occ = getUnitOnHex(step.r, step.c);
            if (occ && occ.player === myPlayer) return false;
            return true;
          });

        if (!livePending.length) {
          nodeTerminalReason = 'no_pending_capture_for_pair';
          this._importantLog('WORM_STEP_SKIPPED', {
            playerId: myPlayer,
            pair: nodePair,
            objective: `${objective.r},${objective.c}`,
            stepIndex,
            reason: 'no_pending_capture_for_pair'
          });
          break;
        }

        objective = livePending[0];
        nodeObjectiveHex = board[objective.r]?.[objective.c];
        const objectiveHex = nodeObjectiveHex;
        if (objectiveHex?.owner === myPlayer || (getUnitOnHex(objective.r, objective.c)?.player === myPlayer)) {
          nodeTerminalReason = 'objective_already_owned_or_occupied';
          this._importantLog('WORM_STEP_SKIPPED', {
            playerId: myPlayer,
            pair: nodePair,
            objective: `${objective.r},${objective.c}`,
            stepIndex,
            reason: 'objective_already_owned_or_occupied',
            owner: objectiveHex?.owner ?? null,
            occupiedBy: getUnitOnHex(objective.r, objective.c)?.player ?? null
          });
          break;
        }

        const myUnits = IASentidos.getUnits(myPlayer)
          .filter(u => this._isLandUnit(u))
          .filter(u => (u.currentMovement || 0) > 0)
          .filter(u => !u.iaExpeditionTarget)
          .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c));

        const preferredRelayUnit = preferredRelayUnitId
          ? myUnits.find(u => u.id === preferredRelayUnitId)
          : null;
        const orderedUnits = preferredRelayUnit
          ? [preferredRelayUnit, ...myUnits.filter(u => u.id !== preferredRelayUnitId)]
          : myUnits;

        if (!myUnits.length) {
          console.log(`[IA_ARCHIPIELAGO][GUSANO] Sin unidades aptas para objetivo (${objective.r},${objective.c}) ${nodePair}.`);
          nodeTerminalReason = 'no_available_units_with_movement';
          this._importantLog('WORM_STEP_SKIPPED', {
            playerId: myPlayer,
            pair: nodePair,
            objective: `${objective.r},${objective.c}`,
            stepIndex,
            reason: 'no_available_units_with_movement'
          });
          break;
        }

        let acted = false;
        const splitCandidate = orderedUnits.find(u => (u.regiments?.length || 0) >= this.WORM_MIN_SPLIT_REGIMENTS);
        const fallbackAllowed = !this._isCommercialSplitMergeMandatoryTurn();
        let controlledFallbackAllowed = false;
        if (splitCandidate) {
          const relay = this._attemptSplitMergeRelayToObjective(
            myPlayer,
            splitCandidate,
            objective,
            node,
            this.MISSION_TYPE_COMMERCIAL_CORRIDOR
          );
          if (relay.ok) {
            actions += relay.progressed ? 1 : 0;
            acted = !!(relay.moved || relay.progressed);
            controlledFallbackAllowed = !relay.progressed && (relay.reason === 'relay_without_movement' || relay.reason === 'relay_merge_not_completed');
            nodeTerminalReason = (relay.moved || relay.progressed) ? 'relay_progress' : (relay.reason || 'relay_partial');
            if (relay.relayUnitId) preferredRelayUnitId = relay.relayUnitId;
            if (relay.reason === 'relay_merge_not_completed') {
              abortWormFlow = true;
              abortReason = 'merge_tardio_detectado';
              nodeTerminalReason = 'worm_aborted_merge_tardio';
              this._importantLog('WORM_ABORT', {
                playerId: myPlayer,
                pair: nodePair,
                objective: `${objective.r},${objective.c}`,
                passIndex,
                reason: 'merge_tardio_detectado'
              });
            }
          } else {
            nodeTerminalReason = relay.reason || 'split_failed';
            this._importantLog('WORM_DECISION', {
              playerId: myPlayer,
              objective: `${objective.r},${objective.c}`,
              pair: nodePair,
              split: 'rejected',
              reason: relay.reason || 'split_failed',
              unitId: splitCandidate.id,
              regiments: splitCandidate.regiments?.length || 0
            });
          }
        } else {
          const maxRegs = myUnits.reduce((m, u) => Math.max(m, u.regiments?.length || 0), 0);
          nodeTerminalReason = 'insufficient_regiments';
          this._importantLog('WORM_DECISION', {
            playerId: myPlayer,
            objective: `${objective.r},${objective.c}`,
            pair: nodePair,
            split: 'not_possible',
            reason: 'insufficient_regiments',
            maxRegimentsSeen: maxRegs,
            minRequired: this.WORM_MIN_SPLIT_REGIMENTS
          });
        }

        if (!acted) {
          if (!fallbackAllowed && !controlledFallbackAllowed) {
            nodeTerminalReason = 'split_merge_required_no_fallback';
            this._importantLog('WORM_STEP_SKIPPED', {
              playerId: myPlayer,
              pair: nodePair,
              objective: `${objective.r},${objective.c}`,
              stepIndex,
              reason: 'split_merge_required_no_fallback'
            });
            break;
          }
          const mover = orderedUnits.find(u => {
            if (splitCandidate && u.id === splitCandidate.id) return false;
            return !!this._findPathForUnit(u, objective.r, objective.c);
          }) || orderedUnits.find(u => this._findPathForUnit(u, objective.r, objective.c));
          if (mover && this._requestMoveOrAttack(mover, objective.r, objective.c, { missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR })) {
            this._importantLog('WORM_ACTION', {
              playerId: myPlayer,
              action: 'move_or_attack',
              missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR,
              objective: `${objective.r},${objective.c}`,
              pair: nodePair,
              unitId: mover.id,
              regiments: mover.regiments?.length || 0
            });
            actions += 1;
            acted = true;
            preferredRelayUnitId = mover.id;
            nodeTerminalReason = 'move_or_attack_progress';
          } else {
            nodeTerminalReason = mover ? 'move_or_attack_failed' : 'no_path_to_objective';
            this._importantLog('WORM_STEP_SKIPPED', {
              playerId: myPlayer,
              pair: nodePair,
              objective: `${objective.r},${objective.c}`,
              stepIndex,
              reason: mover ? 'move_or_attack_failed' : 'no_path_to_objective'
            });
          }
        }

        if (acted) nodeActed = true;

        if (abortWormFlow) break;
        if (!acted) break;
      }

      if (preferredRelayUnitId) preferredRelayByPair.set(relayStateKey, preferredRelayUnitId);
      this._importantLog('WORM_NODE_RESULT', {
        playerId: myPlayer,
        pair: nodePair,
        objective: `${objective.r},${objective.c}`,
        passIndex,
        actionsDelta: actions - nodeActionsBefore,
        reason: nodeTerminalReason === 'not_set' ? 'no_progress_recorded' : nodeTerminalReason
      });

      if (nodeActed) passProgress = true;
      if (abortWormFlow) break;
    }

      if (abortWormFlow) break;
      if (!passProgress) break;
      passIndex += 1;
      if (passIndex > (maxActions * 2)) break;
    }

    if (abortWormFlow) {
      this._importantLog('WORM_ABORT_RESULT', {
        playerId: myPlayer,
        actions,
        maxActions,
        reason: abortReason || 'merge_tardio_detectado'
      });
    }

    console.log(`[IA DIAG][GUSANO] J${myPlayer} objetivos=${corridorObjectives.length} bankObj=${bankObjectives} acciones=${actions}/${maxActions}`);

    return actions;
  },

  _collectSupplyCutTargets(myPlayer, limit = null) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    if (enemyPlayer == null || typeof getSupplyPath !== 'function') return [];

    const enemyUnits = IASentidos.getUnits(enemyPlayer) || [];
    const scoreByHex = new Map();

    for (const unit of enemyUnits) {
      const path = getSupplyPath(unit.r, unit.c, enemyPlayer);
      if (!Array.isArray(path) || path.length < 3) continue;

      const middlePath = path.slice(1, -1);
      const take = Math.min(2, middlePath.length);
      for (let i = 0; i < take; i++) {
        const step = middlePath[i];
        const key = `${step.r},${step.c}`;
        const hex = board[step.r]?.[step.c];
        if (!hex) continue;
        const base = hex.structure === 'Camino' ? 4 : 2;
        scoreByHex.set(key, (scoreByHex.get(key) || 0) + base);
      }
    }

    const roadNodes = board.flat().filter(h => h && h.owner === enemyPlayer && h.structure === 'Camino');
    for (const road of roadNodes) {
      const key = `${road.r},${road.c}`;
      scoreByHex.set(key, (scoreByHex.get(key) || 0) + 1);
    }

    const effectiveLimit = Math.max(1, Number(limit || this.CUT_SUPPLY_MAX_TARGETS));
    return Array.from(scoreByHex.entries())
      .map(([key, score]) => {
        const [r, c] = key.split(',').map(Number);
        return { r, c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveLimit);
  },

  _collectSabotageTargets(myPlayer) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    if (enemyPlayer == null) return [];

    const enemyUnits = IASentidos.getUnits(enemyPlayer) || [];
    const caravans = enemyUnits.filter(u => !!u.tradeRoute).map(u => ({ r: u.r, c: u.c, score: 9 }));
    const explorers = enemyUnits
      .filter(u => u.regiments?.some(r => r.type === 'Explorador'))
      .map(u => ({ r: u.r, c: u.c, score: 6 }));
    const supplyCuts = this._collectSupplyCutTargets(myPlayer, 3).map(t => ({ ...t, score: (t.score || 0) + 5 }));

    return caravans.concat(explorers).concat(supplyCuts)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  },

  _snapshotTurnActivity(myPlayer) {
    const snapshot = new Map();
    const myUnits = IASentidos.getUnits(myPlayer);
    for (const unit of myUnits) {
      snapshot.set(unit.id, {
        r: unit.r,
        c: unit.c,
        hasMoved: !!unit.hasMoved,
        hasAttacked: !!unit.hasAttacked,
        currentMovement: unit.currentMovement || 0
      });
    }
    return snapshot;
  },

  _didMakeProgressThisTurn(myPlayer, snapshot) {
    const myUnits = IASentidos.getUnits(myPlayer);
    for (const unit of myUnits) {
      const prev = snapshot.get(unit.id);
      if (!prev) {
        return true;
      }
      if (unit.r !== prev.r || unit.c !== prev.c) return true;
      if (!!unit.hasAttacked && !prev.hasAttacked) return true;
      if (!!unit.hasMoved && !prev.hasMoved) return true;
      if ((unit.currentMovement || 0) < (prev.currentMovement || 0)) return true;
    }
    return false;
  },

  _executeOpportunisticCapture(myPlayer) {
    const myUnits = IASentidos.getUnits(myPlayer)
      .filter(u => u && u.currentHealth > 0)
      .filter(u => !u.hasMoved && (u.currentMovement || u.movement || 0) > 0)
      .filter(u => this._isLandUnit(u));

    if (!myUnits.length) return 0;

    const cityTargets = [];
    for (const c of (gameState.cities || [])) {
      if (!c || c.owner === myPlayer) continue;
      if (this._isBankCityByCoords(c.r, c.c)) {
        this._importantLog('MISSION_OBJECTIVE_SKIPPED', {
          playerId: myPlayer,
          objective: `${c.r},${c.c}`,
          targetType: 'city',
          targetName: c.name || 'La Banca',
          reason: 'banca_inconquistable'
        });
        continue;
      }
      if (getUnitOnHex(c.r, c.c)) continue;
      cityTargets.push({ r: c.r, c: c.c, type: 'city', name: c.name || 'Ciudad' });
    }

    const fortLike = new Set(['Fortaleza', 'Fortaleza con Muralla', 'Aldea', 'Ciudad', 'Metrópoli']);
    const structureTargets = board.flat()
      .filter(h => h && h.owner !== myPlayer && fortLike.has(h.structure) && !h.isCity)
      .filter(h => !getUnitOnHex(h.r, h.c))
      .map(h => ({ r: h.r, c: h.c, type: 'structure', name: h.structure }));

    const uniqueTargets = [];
    const seen = new Set();
    for (const t of cityTargets.concat(structureTargets)) {
      const key = `${t.r},${t.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueTargets.push(t);
    }

    if (!uniqueTargets.length) return 0;

    let captures = 0;
    const maxCapturesPerTurn = 2;
    for (const target of uniqueTargets) {
      if (captures >= maxCapturesPerTurn) break;

      const candidate = myUnits
        .filter(u => !u.hasMoved && (u.currentMovement || u.movement || 0) > 0)
        .sort((a, b) => hexDistance(a.r, a.c, target.r, target.c) - hexDistance(b.r, b.c, target.r, target.c))
        .find(u => hexDistance(u.r, u.c, target.r, target.c) <= 1 && this._findPathForUnit(u, target.r, target.c));

      if (!candidate) continue;

      const arbitration = this._selectExecutionMission({
        unit: candidate,
        target,
        candidateMissionType: this._inferCanonicalMissionType(candidate) || this.MISSION_TYPE_COMMERCIAL_CORRIDOR
      });
      this._importantLog('MISSION_ARBITRATION', {
        playerId: myPlayer,
        unitId: candidate.id,
        objective: `${target.r},${target.c}`,
        targetType: target.type,
        missionCandidate: arbitration.candidateMissionType,
        missionSelected: arbitration.selectedMissionType,
        switched: arbitration.switched,
        reason: arbitration.reason
      });

      const ok = this._requestMoveOrAttack(candidate, target.r, target.c, { missionType: arbitration.selectedMissionType });
      if (!ok) continue;

      captures += 1;
      console.log(`[IA_ARCHIPIELAGO] [EMERGENCIA CAPTURA] J${myPlayer}: ${candidate.name} toma ${target.type} en (${target.r},${target.c}) ${target.name ? `- ${target.name}` : ''}`);
      this._importantLog('MISSION_ACTION_EXECUTED', {
        playerId: myPlayer,
        unitId: candidate.id,
        missionType: arbitration.selectedMissionType,
        action: 'capture_opportunistic',
        targetType: target.type,
        objective: `${target.r},${target.c}`,
        targetName: target.name || null,
        result: 'success'
      });
      this._metricLog('IA_OPPORTUNISTIC_CAPTURE', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        unitId: candidate.id,
        missionType: arbitration.selectedMissionType,
        targetType: target.type,
        hex: `${target.r},${target.c}`,
        targetName: target.name || null,
        success: true
      });
    }

    return captures;
  },

  _executeStrategicProtocolBundle(myPlayer, opts = {}) {
    const phase = String(opts.phase || 'generic');
    const totalLand = Array.isArray(board)
      ? board.flat().filter(h => h && h.terrain !== 'water').length
      : 0;
    const ownLand = Array.isArray(board)
      ? board.flat().filter(h => h && h.terrain !== 'water' && h.owner === myPlayer).length
      : 0;
    const neutralRatio = totalLand > 0 ? ((totalLand - ownLand) / totalLand) : 0;

    let actions = 0;
    actions += this._executeGiftCityCaptureProtocol(myPlayer, { maxActions: phase === 'post_routes' ? 3 : 2 });
    actions += this._executeDedicatedExplorerProtocol(myPlayer, { maxActions: phase === 'post_routes' ? 2 : 1 });

    const expansionActions = neutralRatio >= 0.55
      ? this._executeLightExpansionProtocol(myPlayer, { maxActions: phase === 'post_routes' ? 4 : 2 })
      : this._executeLightExpansionProtocol(myPlayer, { maxActions: 1 });
    actions += expansionActions;

    if (actions > 0) {
      console.log(`[IA_ARCHIPIELAGO][PROTOCOLOS] J${myPlayer} fase=${phase} acciones=${actions} neutralRatio=${neutralRatio.toFixed(2)}`);
    }

    return actions;
  },

  _collectGiftCityTargets(myPlayer) {
    const targets = [];
    for (const c of (gameState.cities || [])) {
      if (!c || c.owner === myPlayer) continue;
      if (this._isBankCityByCoords(c.r, c.c)) continue;
      if (getUnitOnHex(c.r, c.c)) continue;
      targets.push({
        r: c.r,
        c: c.c,
        priority: (c.owner != null && c.owner !== 9) ? 280 : 240,
        name: c.name || 'Ciudad'
      });
    }
    return targets;
  },

  _executeGiftCityCaptureProtocol(myPlayer, opts = {}) {
    const maxActions = Math.max(1, Number(opts.maxActions || 2));
    const targets = this._collectGiftCityTargets(myPlayer);
    if (!targets.length) return 0;

    let actions = 0;
    const claimed = new Set();

    while (actions < maxActions) {
      const availableUnits = this._getAvailableMissionUnits(myPlayer);
      if (!availableUnits.length) break;

      let best = null;
      for (const unit of availableUnits) {
        for (const target of targets) {
          const key = `${target.r},${target.c}`;
          if (claimed.has(key)) continue;
          if (!this._findPathForUnit(unit, target.r, target.c)) continue;
          const dist = hexDistance(unit.r, unit.c, target.r, target.c);
          const score = Number(target.priority || 0) - (dist * 14);
          if (!best || score > best.score) best = { unit, target, score };
        }
      }

      if (!best) break;

      this._assignMissionIfAvailable(best.unit, {
        type: 'GIFT_CITY_CAPTURE',
        objective: { r: best.target.r, c: best.target.c },
        reason: 'CITY_UNGUARDED_HIGH_VALUE'
      });

      const moved = this._requestMoveOrAttack(best.unit, best.target.r, best.target.c, {
        missionType: this.MISSION_TYPE_CONQUEST_CITY
      });
      claimed.add(`${best.target.r},${best.target.c}`);
      if (!moved) continue;

      actions += 1;
      this._importantLog('MISSION_ACTION_EXECUTED', {
        playerId: myPlayer,
        unitId: best.unit.id,
        missionType: this.MISSION_TYPE_CONQUEST_CITY,
        action: 'gift_city_capture_protocol',
        objective: `${best.target.r},${best.target.c}`,
        targetName: best.target.name || null,
        result: 'success'
      });
    }

    return actions;
  },

  _collectExpansionTargets(myPlayer) {
    const targets = [];
    if (!Array.isArray(board)) return targets;

    for (const row of board) {
      if (!Array.isArray(row)) continue;
      for (const hex of row) {
        if (!hex || hex.terrain === 'water') continue;
        if (hex.owner !== null && hex.owner !== undefined) continue;
        if (hex.isCity) continue;
        if (getUnitOnHex(hex.r, hex.c)) continue;

        const nearOwn = getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.owner === myPlayer);
        if (!nearOwn) continue;
        targets.push({ r: hex.r, c: hex.c, priority: 120 });
      }
    }

    return targets;
  },

  _executeLightExpansionProtocol(myPlayer, opts = {}) {
    const maxActions = Math.max(1, Number(opts.maxActions || 2));
    const targets = this._collectExpansionTargets(myPlayer);
    if (!targets.length) return 0;

    let actions = 0;
    const claimed = new Set();

    while (actions < maxActions) {
      const availableUnits = this._getAvailableMissionUnits(myPlayer)
        .filter(u => (u.regiments?.length || 0) <= 2)
        .sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));
      if (!availableUnits.length) break;

      let best = null;
      for (const unit of availableUnits) {
        for (const target of targets) {
          const key = `${target.r},${target.c}`;
          if (claimed.has(key)) continue;
          if (!this._findPathForUnit(unit, target.r, target.c)) continue;
          const dist = hexDistance(unit.r, unit.c, target.r, target.c);
          const score = Number(target.priority || 0) - (dist * 10) - ((unit.regiments?.length || 0) * 6);
          if (!best || score > best.score) best = { unit, target, score };
        }
      }

      if (!best) break;

      this._assignMissionIfAvailable(best.unit, {
        type: 'LIGHT_MAP_EXPANSION',
        objective: { r: best.target.r, c: best.target.c },
        reason: 'HIGH_NEUTRAL_MAP_CONTROL'
      });

      const moved = this._requestMoveOrAttack(best.unit, best.target.r, best.target.c, {
        missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR
      });
      claimed.add(`${best.target.r},${best.target.c}`);
      if (!moved) continue;

      actions += 1;
      this._importantLog('MISSION_ACTION_EXECUTED', {
        playerId: myPlayer,
        unitId: best.unit.id,
        missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR,
        action: 'light_map_expansion_protocol',
        objective: `${best.target.r},${best.target.c}`,
        result: 'success'
      });
    }

    return actions;
  },

  _executeDedicatedExplorerProtocol(myPlayer, opts = {}) {
    const maxActions = Math.max(1, Number(opts.maxActions || 1));
    let actions = 0;

    const ruins = this._getUnexploredRuins();
    let explorers = (IASentidos.getUnits(myPlayer) || [])
      .filter(u => u && u.currentHealth > 0)
      .filter(u => !u.hasMoved && (u.currentMovement || 0) > 0)
      .filter(u => u.regiments?.some(reg => reg.type === 'Explorador'));

    if (!explorers.length && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      const createdExplorer = AiGameplayManager.produceUnit(myPlayer, ['Explorador'], 'scout', 'Explorador Protocolo');
      if (createdExplorer) {
        explorers = (IASentidos.getUnits(myPlayer) || [])
          .filter(u => u && u.currentHealth > 0)
          .filter(u => !u.hasMoved && (u.currentMovement || 0) > 0)
          .filter(u => u.regiments?.some(reg => reg.type === 'Explorador'));
      }
    }

    if (!explorers.length) return 0;

    const hasRecon = this._ensureTech(myPlayer, 'RECONNAISSANCE');
    for (const explorer of explorers) {
      if (actions >= maxActions) break;

      const ruinTarget = ruins.length ? this._pickObjective(ruins, explorer, myPlayer) : null;
      if (ruinTarget) {
        this._assignMissionIfAvailable(explorer, {
          type: 'EXPLORER_SPECIALIST_RUINS',
          objective: { r: ruinTarget.r, c: ruinTarget.c },
          reason: 'DEDICATED_EXPLORER_CIRCUIT'
        });

        if (explorer.r === ruinTarget.r && explorer.c === ruinTarget.c && hasRecon) {
          if (this._requestExploreRuins(explorer)) {
            actions += 1;
          }
          continue;
        }

        const movedToRuin = this._requestMoveOrAttack(explorer, ruinTarget.r, ruinTarget.c, {
          missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR
        });
        if (movedToRuin) {
          actions += 1;
          continue;
        }
      }

      const fallbackExpansion = this._collectExpansionTargets(myPlayer);
      const fallbackTarget = fallbackExpansion.length ? this._pickObjective(fallbackExpansion, explorer, myPlayer) : null;
      if (!fallbackTarget) continue;

      this._assignMissionIfAvailable(explorer, {
        type: 'EXPLORER_SPECIALIST_EXPANSION',
        objective: { r: fallbackTarget.r, c: fallbackTarget.c },
        reason: 'EXPLORER_FALLBACK_EXPANSION'
      });

      if (this._requestMoveOrAttack(explorer, fallbackTarget.r, fallbackTarget.c, {
        missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR
      })) {
        actions += 1;
      }
    }

    return actions;
  },

  _getAvailableMissionUnits(myPlayer) {
    return IASentidos.getUnits(myPlayer)
      .filter(u => u && u.currentHealth > 0)
      .filter(u => this._isLandUnit(u))
      .filter(u => !u.hasMoved && (u.currentMovement || u.movement || 0) > 0)
      .filter(u => !u.iaExpeditionTarget);
  },

  _assignMissionIfAvailable(unit, mission) {
    if (!unit || !mission) return;
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.missionAssignments?.set) return;
    AiGameplayManager.missionAssignments.set(unit.id, mission);
  },

  _executePostCorridorRoadVacate(myPlayer, maxActions = 2) {
    if (maxActions <= 0) return 0;
    const roadMissions = this._getPriorityRoadInfrastructureMissions(myPlayer);
    if (!roadMissions.length) return 0;

    let actions = 0;
    const seenUnits = new Set();

    for (const mission of roadMissions) {
      for (const step of mission.missingRoads || []) {
        if (actions >= maxActions) return actions;
        const blocker = getUnitOnHex(step.r, step.c);
        if (!blocker || blocker.player !== myPlayer) continue;
        if (seenUnits.has(blocker.id)) continue;
        if (blocker.hasMoved || (blocker.currentMovement || blocker.movement || 0) <= 0) continue;

        const vacated = this._scheduleVacateForBlockedBuild(myPlayer, blocker, step.r, step.c);
        if (!vacated) continue;

        actions += 1;
        seenUnits.add(blocker.id);
      }
    }

    return actions;
  },

  _collectPostCorridorCityTargets(myPlayer) {
    const targets = [];
    for (const c of (gameState.cities || [])) {
      if (!c || c.owner === myPlayer) continue;
      if (this._isBankCityByCoords(c.r, c.c)) continue;
      targets.push({
        r: c.r,
        c: c.c,
        owner: c.owner,
        isBarbarian: !!c.isBarbarianCity || c.owner === 9 || c.owner == null,
        priority: (c.owner != null && c.owner !== 9) ? 220 : 150,
        name: c.name || 'Ciudad'
      });
    }

    return targets;
  },

  _collectPostCorridorHillTargets(myPlayer) {
    if (!Array.isArray(board)) return [];
    const targets = [];

    for (const row of board) {
      if (!Array.isArray(row)) continue;
      for (const hex of row) {
        if (!hex || hex.owner === myPlayer) continue;
        if (hex.terrain !== 'hills' || !hex.resourceNode) continue;

        let rawResource = '';
        if (typeof hex.resourceNode === 'string') {
          rawResource = hex.resourceNode.toLowerCase();
        } else if (typeof hex.resourceNode === 'object') {
          try {
            rawResource = JSON.stringify(hex.resourceNode).toLowerCase();
          } catch (e) {
            rawResource = '';
          }
        }

        const stoneLike = rawResource.includes('piedra') || rawResource.includes('stone');
        targets.push({
          r: hex.r,
          c: hex.c,
          stoneLike,
          priority: stoneLike ? 170 : 120
        });
      }
    }

    return targets;
  },

  _executePostCorridorCityPush(myPlayer, maxActions = 2) {
    if (maxActions <= 0) return 0;
    const targets = this._collectPostCorridorCityTargets(myPlayer);
    if (!targets.length) return 0;

    let actions = 0;
    const claimed = new Set();

    while (actions < maxActions) {
      const availableUnits = this._getAvailableMissionUnits(myPlayer);
      if (!availableUnits.length) break;

      let best = null;
      for (const unit of availableUnits) {
        for (const target of targets) {
          const key = `${target.r},${target.c}`;
          if (claimed.has(key)) continue;
          if (!this._findPathForUnit(unit, target.r, target.c)) continue;
          const dist = hexDistance(unit.r, unit.c, target.r, target.c);
          const score = Number(target.priority || 0) - (dist * 12);
          if (!best || score > best.score) {
            best = { unit, target, score };
          }
        }
      }

      if (!best) break;

      this._assignMissionIfAvailable(best.unit, {
        type: 'POST_CORRIDOR_CITY_PUSH',
        objective: { r: best.target.r, c: best.target.c },
        reason: best.target.isBarbarian ? 'POST_CORRIDOR_BARBARIAN_CITY' : 'POST_CORRIDOR_HUMAN_CITY'
      });

      const moved = this._requestMoveOrAttack(best.unit, best.target.r, best.target.c, {
        missionType: this.MISSION_TYPE_CONQUEST_CITY
      });
      claimed.add(`${best.target.r},${best.target.c}`);
      if (!moved) continue;

      actions += 1;
      this._importantLog('MISSION_ACTION_EXECUTED', {
        playerId: myPlayer,
        unitId: best.unit.id,
        missionType: this.MISSION_TYPE_CONQUEST_CITY,
        action: 'post_corridor_city_push',
        objective: `${best.target.r},${best.target.c}`,
        targetName: best.target.name || null,
        result: 'success'
      });
    }

    return actions;
  },

  _executePostCorridorHillPush(myPlayer, maxActions = 2) {
    if (maxActions <= 0) return 0;
    const targets = this._collectPostCorridorHillTargets(myPlayer);
    if (!targets.length) return 0;

    let actions = 0;
    const claimed = new Set();

    while (actions < maxActions) {
      const availableUnits = this._getAvailableMissionUnits(myPlayer);
      if (!availableUnits.length) break;

      let best = null;
      for (const unit of availableUnits) {
        for (const target of targets) {
          const key = `${target.r},${target.c}`;
          if (claimed.has(key)) continue;
          if (!this._findPathForUnit(unit, target.r, target.c)) continue;
          const dist = hexDistance(unit.r, unit.c, target.r, target.c);
          const score = Number(target.priority || 0) - (dist * 10);
          if (!best || score > best.score) {
            best = { unit, target, score };
          }
        }
      }

      if (!best) break;

      this._assignMissionIfAvailable(best.unit, {
        type: 'STONE_HILLS_EMERGENCY',
        objective: { r: best.target.r, c: best.target.c },
        reason: best.target.stoneLike ? 'POST_CORRIDOR_STONE_HILLS' : 'POST_CORRIDOR_HILLS'
      });

      const moved = this._requestMoveOrAttack(best.unit, best.target.r, best.target.c, {
        missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR
      });
      claimed.add(`${best.target.r},${best.target.c}`);
      if (!moved) continue;

      actions += 1;
      this._importantLog('MISSION_ACTION_EXECUTED', {
        playerId: myPlayer,
        unitId: best.unit.id,
        missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR,
        action: 'post_corridor_hills_push',
        objective: `${best.target.r},${best.target.c}`,
        hillPriority: best.target.stoneLike ? 'stone' : 'generic',
        result: 'success'
      });
    }

    return actions;
  },

  _executePostCorridorMissionLayer(myPlayer, opts = {}) {
    const maxActions = Math.max(1, Number(opts.maxActions || 4));
    if (maxActions <= 0) return 0;

    let actions = 0;
    actions += this._executePostCorridorRoadVacate(myPlayer, Math.min(2, maxActions - actions));
    if (actions < maxActions) {
      actions += this._executePostCorridorCityPush(myPlayer, Math.min(3, maxActions - actions));
    }
    if (actions < maxActions) {
      actions += this._executePostCorridorHillPush(myPlayer, Math.min(2, maxActions - actions));
    }

    if (actions > 0) {
      console.log(`[IA_ARCHIPIELAGO][POST_CORRIDOR] J${myPlayer} acciones ejecutadas: ${actions}/${maxActions}`);
    }

    return actions;
  },

  _ejecutarPlanEmergencia(situacion) {
    const { myPlayer, ciudades } = situacion;
    const myUnits = IASentidos.getUnits(myPlayer).filter(u => (u.currentMovement || 0) > 0 && !u.iaExpeditionTarget);
    if (!myUnits.length) {
      console.warn('[IA_ARCHIPIELAGO] Plan emergencia: sin unidades con movimiento.');
      return;
    }

    const enemyUnits = IASentidos.getEnemyUnits(myPlayer);
    const cityThreats = [];
    for (const city of (ciudades || [])) {
      const threats = enemyUnits.filter(e => hexDistance(e.r, e.c, city.r, city.c) <= 4);
      cityThreats.push(...threats);
    }

    const uniqueByPos = (list) => {
      const map = new Map();
      for (const item of list) {
        if (!item) continue;
        map.set(`${item.r},${item.c}`, item);
      }
      return Array.from(map.values());
    };

    const defenseTargets = uniqueByPos(cityThreats);
    const neutralCities = this._getBarbarianCities();
    const enemyCities = (gameState.cities || []).filter(c => c.owner != null && c.owner !== myPlayer && !c.isBarbarianCity);
    const fallbackTargets = defenseTargets.length
      ? defenseTargets
      : (enemyUnits.length ? enemyUnits : (neutralCities.length ? neutralCities : enemyCities));

    if (!fallbackTargets.length) {
      console.warn('[IA_ARCHIPIELAGO] Plan emergencia: sin objetivos disponibles.');
      return;
    }

    let acciones = 0;
    for (const unit of myUnits) {
      if ((unit.currentMovement || 0) <= 0) continue;
      const objetivo = this._pickObjective(fallbackTargets, unit, myPlayer);
      if (!objetivo) continue;
      if (this._requestMoveOrAttack(unit, objetivo.r, objetivo.c)) {
        acciones++;
      }
    }

    console.log(`[IA_ARCHIPIELAGO] Plan emergencia ejecutado. Acciones=${acciones}`);
  },

  _getPlayerTechs(myPlayer) {
    return gameState.playerResources?.[myPlayer]?.researchedTechnologies || [];
  },

  _hasTech(myPlayer, techId) {
    return this._getPlayerTechs(myPlayer).includes(techId);
  },

  _canAffordTech(myPlayer, techId) {
    const tech = TECHNOLOGY_TREE_DATA?.[techId];
    const res = gameState.playerResources?.[myPlayer];
    if (!tech || !res) return false;
    return Object.keys(tech.cost || {}).every(key => (res[key] || 0) >= tech.cost[key]);
  },

  _requestResearchTech(myPlayer, techId) {
    if (!TECHNOLOGY_TREE_DATA?.[techId]) return false;

    if (typeof isNetworkGame === 'function' && isNetworkGame()) {
      const action = {
        type: 'researchTech',
        actionId: `research_${myPlayer}_${techId}_${Date.now()}`,
        payload: { playerId: myPlayer, techId }
      };
      if (typeof NetworkManager !== 'undefined' && NetworkManager.esAnfitrion && typeof processActionRequest === 'function') {
        processActionRequest(action);
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        return true;
      }
      return false;
    }

    if (typeof _executeResearch === 'function') {
      return _executeResearch(techId, myPlayer);
    }

    return false;
  },

  _ensureTech(myPlayer, techId) {
    if (this._hasTech(myPlayer, techId)) return true;
    if (this._canAffordTech(myPlayer, techId)) {
      return this._requestResearchTech(myPlayer, techId);
    }
    if (typeof AutoResearchManager !== 'undefined' && AutoResearchManager.activateResearchPlan) {
      AutoResearchManager.activateResearchPlan(myPlayer, techId);
    }
    return false;
  },

  _investResearch(myPlayer, preferredTechs, maxCount = 3) {
    let researched = 0;
    const techs = this._getPlayerTechs(myPlayer);

    const tryTech = (techId) => {
      if (researched >= maxCount) return false;
      if (techs.includes(techId)) return false;
      if (typeof hasPrerequisites === 'function' && !hasPrerequisites(techs, techId)) return false;
      if (!this._canAffordTech(myPlayer, techId)) return false;
      if (this._requestResearchTech(myPlayer, techId)) {
        researched += 1;
        return true;
      }
      return false;
    };

    if (Array.isArray(preferredTechs)) {
      preferredTechs.forEach(techId => tryTech(techId));
    }

    if (researched >= maxCount) return researched;

    const fallback = Object.keys(TECHNOLOGY_TREE_DATA || {})
      .filter(techId => !techs.includes(techId))
      .filter(techId => (typeof hasPrerequisites !== 'function' || hasPrerequisites(techs, techId)))
      .filter(techId => this._canAffordTech(myPlayer, techId))
      .sort((a, b) => (TECHNOLOGY_TREE_DATA[b].cost?.researchPoints || 0) - (TECHNOLOGY_TREE_DATA[a].cost?.researchPoints || 0));

    for (const techId of fallback) {
      if (researched >= maxCount) break;
      tryTech(techId);
    }

    return researched;
  },

  _ensureActiveCommanders(myPlayer) {
    if (!gameState.activeCommanders) gameState.activeCommanders = {};
    if (!gameState.activeCommanders[myPlayer]) gameState.activeCommanders[myPlayer] = [];
  },

  _selectCommanderId(myPlayer) {
    this._ensureActiveCommanders(myPlayer);
    const active = gameState.activeCommanders[myPlayer];
    const turn = Number(gameState.turnNumber || 0);
    const robustEnabled = turn >= Math.max(3, Number(this.HERO_FIX_START_TURN) || 3);
    if (!robustEnabled) {
      const commanderIds = Object.keys(COMMANDERS || {});
      for (const commanderId of commanderIds) {
        if (!active.includes(commanderId)) return commanderId;
      }
      return null;
    }

    const fallen = gameState.fallenCommanders?.[myPlayer] || [];
    const assignedNow = new Set(
      (units || [])
        .filter(u => u && u.player === myPlayer && !!u.commander)
        .map(u => String(u.commander))
    );
    const commanderIds = Object.keys(COMMANDERS || {});

    // Prioridad: comandante no activo, no caído y no usado actualmente.
    for (const commanderId of commanderIds) {
      if (fallen.includes(commanderId)) continue;
      if (active.includes(commanderId)) continue;
      if (assignedNow.has(String(commanderId))) continue;
      return commanderId;
    }

    // Fallback defensivo ante desincronización de activeCommanders.
    for (const commanderId of commanderIds) {
      if (fallen.includes(commanderId)) continue;
      if (!assignedNow.has(String(commanderId))) return commanderId;
    }

    for (const commanderId of commanderIds) {
      if (!active.includes(commanderId)) return commanderId;
    }
    return null;
  },

  _getArmyComposition(myPlayer, regimentsPerDivision = 3, targetCity = null) {
    const techs = this._getPlayerTechs(myPlayer);
    const hasHeavy = techs.includes('DRILL_TACTICS') && REGIMENT_TYPES['Infantería Pesada'];
    const hasArchers = techs.includes('FLETCHING') && REGIMENT_TYPES['Arqueros'];
    const hasCavalry = techs.includes('ANIMAL_HUSBANDRY') && REGIMENT_TYPES['Caballería Ligera'];
    const targetTerrain = targetCity ? board[targetCity.r]?.[targetCity.c]?.terrain : null;
    const roughTerrain = ['hills', 'forest', 'mountain', 'mountains'].includes(targetTerrain);
    const base = (hasHeavy && !roughTerrain) ? 'Infantería Pesada' : 'Infantería Ligera';

    const composition = Array(regimentsPerDivision).fill(base);
    if (hasArchers && composition.length >= 3) composition[composition.length - 1] = 'Arqueros';
    if (hasCavalry && composition.length >= 3 && !roughTerrain) composition[0] = 'Caballería Ligera';
    return composition;
  },

  _producirDivisiones(myPlayer, targetDivisions = 5, regimentsPerDivision = 3, targetCity = null) {
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.produceUnit) return 0;
    let created = 0;
    const composition = this._getArmyComposition(myPlayer, regimentsPerDivision, targetCity);

    for (let i = 0; i < targetDivisions; i++) {
      const newUnit = AiGameplayManager.produceUnit(myPlayer, composition, 'attacker', `Cuerpo-${i + 1}`);
      if (!newUnit) break;
      created += 1;
    }

    return created;
  },

  _startFortressPressure(myPlayer, spot) {
    if (!gameState.aiFortressPressure) gameState.aiFortressPressure = {};
    // Si ya hay un plan, ampliar objetivo
    const existing = gameState.aiFortressPressure[myPlayer];
    if (existing) {
      existing.target = spot;
      existing.attemptsLeft = Math.max(existing.attemptsLeft || 3, 3);
      existing.targetDivisions = Math.max(existing.targetDivisions || 3, 3);
      console.log(`[IA_ARCHIPIELAGO] Actualizando plan de presión de fortaleza para ${myPlayer}`);
      return;
    }

    gameState.aiFortressPressure[myPlayer] = {
      target: spot,
      attemptsLeft: 3,
      targetDivisions: 3,
      regimentsPerDivision: Math.min(6, this.HEAVY_DIVISION_TARGET || 6)
    };
    console.log(`[IA_ARCHIPIELAGO] Iniciando plan de presión por fortaleza para jugador ${myPlayer} en (${spot.r},${spot.c})`);
  },

  _pressureProduceForFortress(myPlayer) {
    const plan = (gameState.aiFortressPressure || {})[myPlayer];
    if (!plan) return false;
    const target = plan.target || null;
    const want = plan.targetDivisions || 3;
    const per = plan.regimentsPerDivision || 6;

    console.log(`[IA_ARCHIPIELAGO] Fortaleza presión: intentando producir ${want} divisiones de ${per} regimientos para ${myPlayer}. Intentos restantes: ${plan.attemptsLeft}`);

    const created = this._producirDivisiones(myPlayer, want, per, target);
    if (created >= want) {
      console.log(`[IA_ARCHIPIELAGO] Fortaleza presión: objetivo alcanzado (${created}/${want}).`);
      return true; // plan completo
    }

    if (created > 0) {
      // Reducir objetivo y seguir intentando en siguientes turnos
      plan.targetDivisions = Math.max(0, plan.targetDivisions - created);
      console.log(`[IA_ARCHIPIELAGO] Fortaleza presión: creadas ${created}, quedan ${plan.targetDivisions} divisiones por crear.`);
      // keep attemptsLeft the same to allow more production
      if (plan.targetDivisions <= 0) return true;
      return false;
    }

    // No se pudo producir nada este turno
    plan.attemptsLeft = (plan.attemptsLeft || 1) - 1;
    if (plan.attemptsLeft <= 0) {
      console.log(`[IA_ARCHIPIELAGO] Fortaleza presión: intentos agotados para jugador ${myPlayer}.`);
      return true; // abandonar plan
    }
    console.log(`[IA_ARCHIPIELAGO] Fortaleza presión: sin producción este turno, quedarán ${plan.attemptsLeft} intentos.`);
    return false;
  },

  _findClosestUnitToTarget(myPlayer, target) {
    const myUnits = IASentidos.getUnits(myPlayer);
    if (!myUnits.length) return null;
    const movable = myUnits.filter(u => u.currentHealth > 0 && (u.currentMovement || 0) > 0 && !u.hasMoved);
    const pool = movable.length ? movable : myUnits;
    const reachable = pool.filter(u => !!this._findPathForUnit(u, target.r, target.c));
    const candidates = reachable.length ? reachable : pool;
    return candidates.reduce((best, curr) => {
      const bestDist = hexDistance(best.r, best.c, target.r, target.c);
      const currDist = hexDistance(curr.r, curr.c, target.r, target.c);
      return currDist < bestDist ? curr : best;
    });
  },

  _findNearestCityTarget(myPlayer) {
    const cities = gameState.cities || [];
    const neutral = cities.filter(c => c.owner === null || c.isBarbarianCity);
    if (neutral.length) return neutral[0];
    const enemyPlayers = this._getEnemyPlayerIds(myPlayer);
    const enemyCities = cities.filter(c => enemyPlayers.includes(c.owner));
    return enemyCities[0] || null;
  },

  _ejecutarRutaMasRiqueza(situacion) {
    const { myPlayer, hexesPropios, economia, ciudades } = situacion;
    this._ejecutarRutaLarga(situacion);
    if (economia?.oro >= 500) {
      this.construirInfraestructura(myPlayer, hexesPropios, economia);
    }
    if (economia?.oro >= 1000 && ciudades?.length >= 2) {
      this.crearCaravanas(myPlayer, ciudades);
    }
    return { action: 'economia_expandida', executed: true };
  },

  _ejecutarRutaEjercitoGrande(situacion) {
    const { myPlayer } = situacion;
    const created = this._producirDivisiones(myPlayer, 5, 3);
    if (created > 0) {
      return { action: 'produccion_ejercito', executed: true, note: `divisiones=${created}` };
    }
    return { action: 'produccion_ejercito', executed: false, reason: 'sin_recursos_o_espacio' };
  },

  _ejecutarRutaMasAvances(situacion) {
    const { myPlayer } = situacion;
    const preferred = ['LEADERSHIP', 'DRILL_TACTICS', 'ENGINEERING', 'RECONNAISSANCE', 'NAVIGATION', 'FORTIFICATIONS'];
    const researched = this._investResearch(myPlayer, preferred, 3);
    if (researched > 0) {
      return { action: 'investigar', executed: true, note: `tecnologias=${researched}` };
    }
    return { action: 'investigar', executed: false, reason: 'sin_puntos_o_prerrequisitos' };
  },

  _ejecutarRutaMasCiudades(situacion) {
    const { myPlayer } = situacion;
    this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
    const targetCity = this._findNearestCityTarget(myPlayer);
    if (!targetCity) {
      return { action: 'expandir_ciudades', executed: false, reason: 'sin_objetivos' };
    }
    const unit = this._findClosestUnitToTarget(myPlayer, targetCity);
    if (unit && this._requestMoveOrAttack(unit, targetCity.r, targetCity.c)) {
      return { action: 'expandir_ciudades', executed: true, note: `objetivo=${targetCity.name}` };
    }
    return { action: 'expandir_ciudades', executed: false, reason: 'sin_unidades' };
  },

  _ejecutarRutaMasVictorias(situacion) {
    return this._ejecutarPresionMilitar(situacion, 'buscar_batallas');
  },

  _ejecutarRutaMasHeroes(situacion) {
    const { myPlayer } = situacion;
    const hasLeadership = this._ensureTech(myPlayer, 'LEADERSHIP');
    if (!hasLeadership) {
      return { action: 'heroes', executed: false, reason: 'faltan_tecnologias' };
    }

    const unitWithHQ = units.find(u =>
      u.player === myPlayer &&
      u.currentHealth > 0 &&
      !u.commander &&
      u.regiments?.some(r => r.type === 'Cuartel General')
    );
    let hqUnit = unitWithHQ;

    if (!hqUnit && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      const composition = ['Cuartel General', 'Infantería Pesada', 'Infantería Ligera'].filter(type => REGIMENT_TYPES[type]);
      hqUnit = AiGameplayManager.produceUnit(myPlayer, composition, 'leader', 'Cuartel General');
    }

    if (!hqUnit) {
      return { action: 'heroes', executed: false, reason: 'sin_cuartel_general' };
    }

    const commanderId = this._selectCommanderId(myPlayer);
    if (!commanderId || typeof RequestAssignGeneral !== 'function') {
      return { action: 'heroes', executed: false, reason: 'sin_comandante_disponible' };
    }

    RequestAssignGeneral(hqUnit, commanderId);
    return { action: 'heroes', executed: true, note: commanderId };
  },

  _buildIdealVillages(myPlayer, hexesPropios = []) {
    const turn = Number(gameState.turnNumber || 0);
    const minTurn = Math.max(3, Number(this.INFRA_FIX_START_TURN) || 3);
    if (turn < minTurn) return 0;

    const targetVillages = Math.max(0, Number(this.IDEAL_VILLAGES_TARGET) || 2);
    if (targetVillages <= 0) return 0;

    const currentVillages = board.flat().filter(h => h && h.owner === myPlayer && h.structure === 'Aldea').length;
    const needed = Math.max(0, targetVillages - currentVillages);
    if (needed <= 0) return 0;

    const fortLikeOrigins = (hexesPropios || []).filter(h =>
      h && !h.unit && (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
    );
    if (!fortLikeOrigins.length) return 0;

    let built = 0;
    for (const spot of fortLikeOrigins) {
      if (built >= needed) break;
      if (!this._canAffordStructure(myPlayer, 'Aldea')) break;
      if (this._requestBuildStructure(myPlayer, spot.r, spot.c, 'Aldea')) {
        this.registrarMetaFlujo('construccion', spot.r, spot.c, myPlayer);
        built += 1;
      }
    }

    if (built > 0) {
      this._metricLog('IA_VILLAGE_EXPANSION', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        builtVillages: built,
        targetVillages,
        villagesAfter: currentVillages + built
      });
    }

    return built;
  },

  _ejecutarRutaMasComercios(situacion) {
    const existingRouteKeys = this._getExistingTradeRouteKeys(situacion.myPlayer);
    const candidate = this._findBestTradeCityPair(this._getTradeCityCandidates(situacion.myPlayer), situacion.myPlayer, existingRouteKeys);
    if (!candidate) {
      return { action: 'comercios', executed: false, reason: 'sin_ruta' };
    }
    this._ejecutarRutaLarga(situacion);
    return { action: 'comercios', executed: true };
  },

  _ejecutarRutaGranArqueologo(situacion) {
    const { myPlayer } = situacion;
    const hasRecon = this._ensureTech(myPlayer, 'RECONNAISSANCE');
    if (!hasRecon) {
      // Forzar tempranamente la investigación si hay ruinas pendientes.
      this._investResearch(myPlayer, ['RECONNAISSANCE', 'LEADERSHIP', 'ENGINEERING'], 1);
    }

    let explorerUnit = units.find(u =>
      u.player === myPlayer &&
      u.currentHealth > 0 &&
      (u.currentMovement || 0) > 0 &&
      !u.hasMoved &&
      u.regiments?.some(r => r.type === 'Explorador')
    );
    if (!explorerUnit && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      explorerUnit = AiGameplayManager.produceUnit(myPlayer, ['Explorador'], 'scout', 'Explorador');
    }

    if (!explorerUnit) {
      return { action: 'explorar_ruinas', executed: false, reason: 'sin_explorador' };
    }

    const ruins = [];
    board.forEach(row => row.forEach(hex => {
      if (hex?.feature === 'ruins' && !hex.looted) ruins.push(hex);
    }));

    const target = this._pickObjective(ruins, explorerUnit, myPlayer);
    if (!target) {
      return { action: 'explorar_ruinas', executed: false, reason: 'sin_ruinas' };
    }

    if (explorerUnit.r === target.r && explorerUnit.c === target.c && hasRecon) {
      if (this._requestExploreRuins(explorerUnit)) {
        return { action: 'explorar_ruinas', executed: true, note: 'ruina_explorada' };
      }
    }

    if (this._requestMoveOrAttack(explorerUnit, target.r, target.c)) {
      return { action: 'explorar_ruinas', executed: true, note: 'moviendo_explorador' };
    }

    return { action: 'explorar_ruinas', executed: false, reason: 'sin_movimiento' };
  },

  _ejecutarRutaConquistadorBarbaro(situacion) {
    const { myPlayer } = situacion;
    this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
    const targetCity = this._findNearestCityTarget(myPlayer);
    if (!targetCity) {
      return { action: 'conquista_barbara', executed: false, reason: 'sin_objetivos' };
    }
    const unit = this._findClosestUnitToTarget(myPlayer, targetCity);
    if (unit && this._requestMoveOrAttack(unit, targetCity.r, targetCity.c)) {
      return { action: 'conquista_barbara', executed: true };
    }
    return { action: 'conquista_barbara', executed: false, reason: 'sin_unidades' };
  },

  _forceExplorerRuinsAction(myPlayer) {
    const ruins = this._getUnexploredRuins();
    if (!ruins.length) return 0;

    const currentTurn = Number(gameState.turnNumber || 0);
    const strictRuinsFocus = currentTurn >= Math.max(3, Number(this.EXPLORER_RUINS_STRICT_START_TURN) || 3);

    let hasRecon = this._ensureTech(myPlayer, 'RECONNAISSANCE');
    if (!hasRecon && typeof this._investResearch === 'function') {
      this._investResearch(myPlayer, ['RECONNAISSANCE', 'LEADERSHIP', 'ENGINEERING'], 1);
      // Desde turno 3, revalidar tras invertir para permitir explorar en el mismo turno si ya quedó habilitado.
      if (strictRuinsFocus) {
        hasRecon = this._ensureTech(myPlayer, 'RECONNAISSANCE');
      }
    }

    const explorers = (IASentidos.getUnits(myPlayer) || [])
      .filter(u => u && u.currentHealth > 0)
      .filter(u => !u.hasMoved && (u.currentMovement || 0) > 0)
      .filter(u => u.regiments?.some(reg => reg.type === 'Explorador'));

    if (!explorers.length) return 0;

    let actions = 0;
    for (const explorer of explorers) {
      const reachableRuins = strictRuinsFocus
        ? ruins.filter(ruin => !!this._findPathForUnit(explorer, ruin.r, ruin.c))
        : [];
      const targetPool = (strictRuinsFocus && reachableRuins.length > 0) ? reachableRuins : ruins;
      const target = this._pickObjective(targetPool, explorer, myPlayer);
      if (!target) continue;

      if (explorer.r === target.r && explorer.c === target.c && hasRecon) {
        if (this._requestExploreRuins(explorer)) {
          actions += 1;
        }
        continue;
      }

      if (strictRuinsFocus) {
        const step = this._getMoveStepTowards(explorer, target.r, target.c);
        if (step && this._requestMoveUnit(explorer, step.r, step.c)) {
          actions += 1;
          continue;
        }
      }

      if (this._requestMoveOrAttack(explorer, target.r, target.c)) {
        actions += 1;
      }
    }

    if (actions > 0) {
      this._metricLog('IA_FORCED_EXPLORER_RUINS', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        actions,
        ruins: ruins.length,
        recon: !!hasRecon,
        strictRuinsFocus
      });
    }

    return actions;
  },

  _ejecutarRutaAlmiranteSupremo(situacion) {
    const { myPlayer } = situacion;
    const hasNavigation = this._ensureTech(myPlayer, 'NAVIGATION');
    if (!hasNavigation) {
      return { action: 'naval', executed: false, reason: 'sin_tecnologia' };
    }

    const navalUnits = units.filter(u => u.player === myPlayer && u.regiments?.some(r => REGIMENT_TYPES[r.type]?.is_naval));
    if (navalUnits.length === 0) {
      const created = this._crearUnidadNaval(myPlayer, 'Patache');
      return created ? { action: 'naval', executed: true, note: 'unidad_naval_creada' } : { action: 'naval', executed: false, reason: 'sin_spawn_naval' };
    }

    const enemyPlayers = this._getEnemyPlayerIds(myPlayer);
    const enemyUnits = units.filter(u => enemyPlayers.includes(u.player) && u.regiments?.some(r => REGIMENT_TYPES[r.type]?.is_naval));
    let target = enemyUnits[0] || this._findNearestCityTarget(myPlayer);
    if (target && board[target.r]?.[target.c]?.terrain !== 'water') {
      const waterNeighbor = getHexNeighbors(target.r, target.c).find(n => board[n.r]?.[n.c]?.terrain === 'water' && !board[n.r][n.c].unit);
      if (waterNeighbor) target = waterNeighbor;
    }
    if (this._isValidTarget(target) && this._requestMoveOrAttack(navalUnits[0], target.r, target.c)) {
      return { action: 'naval', executed: true, note: 'moviendo_flotas' };
    }

    return { action: 'naval', executed: false, reason: 'sin_objetivos' };
  },

  _executeEasyVictoryPointOpportunities(situacion) {
    const myPlayer = situacion?.myPlayer;
    if (!myPlayer) return;

    const myKey = `player${myPlayer}`;
    const currentPoints = Number(gameState.victoryPoints?.[myKey] || 0);
    const remainingPoints = Math.max(0, Number(VICTORY_POINTS_TO_WIN || 10) - currentPoints);
    if (remainingPoints <= 0) return;

    const turn = Number(gameState.turnNumber || 0);
    if (turn > 8) return;

    const ruinsResult = this._ejecutarRutaGranArqueologo(situacion);
    const heroResult = this._ejecutarRutaMasHeroes(situacion);

    this._metricLog('IA_EASY_VP_OPPORTUNITIES', {
      turn,
      playerId: myPlayer,
      currentPoints,
      remainingPoints,
      ruinsAction: ruinsResult?.executed ? 'executed' : (ruinsResult?.reason || 'skipped'),
      heroesAction: heroResult?.executed ? 'executed' : (heroResult?.reason || 'skipped')
    });
  },

  _forceHeroProgressWhenPossible(situacion) {
    const myPlayer = situacion?.myPlayer;
    if (!myPlayer) return false;

    const turn = Number(gameState.turnNumber || 0);
    const startTurn = Math.max(5, Number(this.HERO_CAPABILITY_PUSH_START_TURN) || 5);
    if (turn < startTurn) return false;

    const commanderId = this._selectCommanderId(myPlayer);
    if (!commanderId) return false;

    const hasFreeHQ = (units || []).some(u =>
      u &&
      u.player === myPlayer &&
      u.currentHealth > 0 &&
      !u.commander &&
      u.regiments?.some(r => r.type === 'Cuartel General')
    );
    const canProduceHQ = typeof AiGameplayManager !== 'undefined' && typeof AiGameplayManager.produceUnit === 'function';

    if (!hasFreeHQ && !canProduceHQ) return false;

    const heroResult = this._ejecutarRutaMasHeroes(situacion);
    this._metricLog('IA_HERO_CAPABILITY_PUSH', {
      turn,
      playerId: myPlayer,
      commanderCandidate: commanderId,
      hasFreeHQ,
      canProduceHQ,
      executed: !!heroResult?.executed,
      reason: heroResult?.reason || null
    });

    return !!heroResult?.executed;
  },

  _ejecutarRutaCapital(situacion) {
    const { myPlayer } = situacion;
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
    if (!enemyCapital) {
      return { action: 'evaluar_capital', executed: false, reason: 'sin_capital_enemiga' };
    }
    const unit = this._findClosestUnitToTarget(myPlayer, enemyCapital);
    if (unit && this._requestMoveOrAttack(unit, enemyCapital.r, enemyCapital.c)) {
      return { action: 'evaluar_capital', executed: true };
    }
    return { action: 'evaluar_capital', executed: false, reason: 'sin_unidades' };
  },

  _ejecutarRutaAniquilacion(situacion) {
    return this._ejecutarPresionMilitar(situacion, 'aniquilacion');
  },

  _ejecutarRutaGloria(situacion) {
    const combat = this._ejecutarPresionMilitar(situacion, 'gloria');
    const ruins = this._ejecutarRutaGranArqueologo(situacion);
    const tech = this._ejecutarRutaMasAvances(situacion);
    const cities = this._ejecutarRutaMasCiudades(situacion);
    const executed = !!(combat.executed || ruins.executed || tech.executed || cities.executed);
    const executedCount = [combat, ruins, tech, cities].filter(r => r?.executed).length;
    return {
      action: 'victoria_por_puntos',
      executed,
      note: `acciones_utiles=${executedCount}`
    };
  },

  _ejecutarPresionMilitar(situacion, reason) {
    const { myPlayer } = situacion;
    const enemyUnits = IASentidos.getEnemyUnits(myPlayer).slice().sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));
    if (!enemyUnits.length) {
      return { action: 'presion_militar', executed: false, reason: 'sin_enemigos' };
    }

    const target = enemyUnits[0];
    const attacker = this._findClosestUnitToTarget(myPlayer, target);
    if (!attacker) {
      return { action: 'presion_militar', executed: false, reason: 'sin_unidades' };
    }

    const myPower = attacker.regiments?.length || 0;
    const enemyPower = target.regiments?.length || 0;
    if (myPower < Math.max(1, enemyPower * 0.8)) {
      return { action: 'presion_militar', executed: false, reason: 'poder_bajo' };
    }

    this._requestMoveOrAttack(attacker, target.r, target.c);
    return { action: 'presion_militar', executed: true, note: reason };
  },

  _ejecutarRutaSabotaje(situacion) {
    const { myPlayer } = situacion;
    const targets = this._collectSabotageTargets(myPlayer);
    if (!targets.length) {
      return { action: 'sabotaje', executed: false, reason: 'sin_objetivos' };
    }

    const raiders = IASentidos.getUnits(myPlayer)
      .filter(u => this._isLandUnit(u))
      .filter(u => (u.currentMovement || 0) > 0)
      .sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));

    const unit = raiders[0] || this._findClosestUnitToTarget(myPlayer, targets[0]);
    if (!unit) {
      return { action: 'sabotaje', executed: false, reason: 'sin_unidades' };
    }

    const objective = this._pickObjective(targets, unit, myPlayer);
    if (!objective) {
      return { action: 'sabotaje', executed: false, reason: 'objetivo_invalido' };
    }

    return this._requestMoveOrAttack(unit, objective.r, objective.c)
      ? { action: 'sabotaje', executed: true, note: `${objective.r},${objective.c}` }
      : { action: 'sabotaje', executed: false, reason: 'sin_movimiento' };
  },

  _ejecutarRutaCortarSuministro(situacion) {
    const { myPlayer } = situacion;
    const targets = this._collectSupplyCutTargets(myPlayer, this.CUT_SUPPLY_MAX_TARGETS);
    if (!targets.length) {
      return { action: 'cortar_suministro', executed: false, reason: 'sin_objetivos' };
    }

    const attacker = this._findClosestUnitToTarget(myPlayer, targets[0]);
    if (!attacker) {
      return { action: 'cortar_suministro', executed: false, reason: 'sin_unidades' };
    }

    const objective = this._pickObjective(targets, attacker, myPlayer);
    if (!objective) {
      return { action: 'cortar_suministro', executed: false, reason: 'objetivo_invalido' };
    }

    return this._requestMoveOrAttack(attacker, objective.r, objective.c)
      ? { action: 'cortar_suministro', executed: true, note: `${objective.r},${objective.c}` }
      : { action: 'cortar_suministro', executed: false, reason: 'sin_movimiento' };
  },

  _ejecutarRutaDominarCasillas(situacion) {
    const { myPlayer } = situacion;
    const enemyPlayers = this._getEnemyPlayerIds(myPlayer);
    const frontier = [];

    for (const row of board) {
      for (const hex of row) {
        if (!hex || hex.owner === myPlayer || hex.terrain === 'water') continue;
        if (!enemyPlayers.includes(hex.owner) && hex.owner !== null) continue;
        const nearOwn = getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.owner === myPlayer);
        if (nearOwn) frontier.push({ r: hex.r, c: hex.c });
      }
    }

    if (!frontier.length) {
      return { action: 'dominar_casillas', executed: false, reason: 'sin_frontera' };
    }

    const unit = this._findClosestUnitToTarget(myPlayer, frontier[0]);
    if (!unit) {
      return { action: 'dominar_casillas', executed: false, reason: 'sin_unidades' };
    }

    const objective = this._pickObjective(frontier, unit, myPlayer);
    if (!objective) {
      return { action: 'dominar_casillas', executed: false, reason: 'objetivo_invalido' };
    }

    return this._requestMoveOrAttack(unit, objective.r, objective.c)
      ? { action: 'dominar_casillas', executed: true, note: `${objective.r},${objective.c}` }
      : { action: 'dominar_casillas', executed: false, reason: 'sin_movimiento' };
  },

  _ejecutarRutaFrenteHumano(situacion) {
    const { myPlayer, ciudades } = situacion;
    const enemyUnits = IASentidos.getEnemyUnits(myPlayer);
    const threats = enemyUnits.filter(e => (ciudades || []).some(c => hexDistance(e.r, e.c, c.r, c.c) <= 4));

    if (threats.length) {
      const target = threats.sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0))[0];
      const defender = this._findClosestUnitToTarget(myPlayer, target);
      if (defender && this._requestMoveOrAttack(defender, target.r, target.c)) {
        return { action: 'frente_humano', executed: true, note: 'intercepcion' };
      }
    }

    const enemyCity = this._findNearestCityTarget(myPlayer);
    if (!enemyCity) {
      return { action: 'frente_humano', executed: false, reason: 'sin_objetivos' };
    }

    const attacker = this._findClosestUnitToTarget(myPlayer, enemyCity);
    if (!attacker) {
      return { action: 'frente_humano', executed: false, reason: 'sin_unidades' };
    }

    return this._requestMoveOrAttack(attacker, enemyCity.r, enemyCity.c)
      ? { action: 'frente_humano', executed: true, note: 'presion_ciudad' }
      : { action: 'frente_humano', executed: false, reason: 'sin_movimiento' };
  },

  _ejecutarRutaCazaEnvolvente(situacion) {
    const { myPlayer } = situacion;
    const enemyUnits = IASentidos.getEnemyUnits(myPlayer)
      .filter(u => (u.regiments?.length || 0) <= Math.max(6, this.BIG_ENEMY_DIVISION_THRESHOLD))
      .sort((a, b) => (a.regiments?.length || 0) - (b.regiments?.length || 0));

    if (!enemyUnits.length) {
      return { action: 'caza_envolvente', executed: false, reason: 'sin_enemigos' };
    }

    const target = enemyUnits[0];
    const attackers = IASentidos.getUnits(myPlayer)
      .filter(u => this._isLandUnit(u))
      .filter(u => hexDistance(u.r, u.c, target.r, target.c) <= 6);

    if (!attackers.length) {
      return { action: 'caza_envolvente', executed: false, reason: 'sin_unidades' };
    }

    this._ejecutarEnvolvimiento(myPlayer, attackers, target);
    return { action: 'caza_envolvente', executed: true, note: `${target.r},${target.c}` };
  },

  _crearUnidadNaval(myPlayer, unitType) {
    if (!REGIMENT_TYPES?.[unitType]) return null;
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.createUnitObject) return null;

    const coastalCities = (gameState.cities || []).filter(c => c.owner === myPlayer);
    let spawn = null;
    for (const city of coastalCities) {
      const waterNeighbor = getHexNeighbors(city.r, city.c).find(n => {
        const hex = board[n.r]?.[n.c];
        return hex && hex.terrain === 'water' && !hex.unit;
      });
      if (waterNeighbor) {
        spawn = waterNeighbor;
        break;
      }
    }

    if (!spawn) return null;

    const reg = { ...REGIMENT_TYPES[unitType], type: unitType };
    const cost = reg.cost || {};
    const res = gameState.playerResources?.[myPlayer];
    if (!res) return null;
    if ((res.oro || 0) < (cost.oro || 0) || (res.madera || 0) < (cost.madera || 0) || (res.puntosReclutamiento || 0) < (cost.puntosReclutamiento || 0)) {
      return null;
    }

    res.oro -= cost.oro || 0;
    res.madera -= cost.madera || 0;
    res.puntosReclutamiento -= cost.puntosReclutamiento || 0;

    const unitDef = { regiments: [reg], name: unitType };
    const newUnit = AiGameplayManager.createUnitObject(unitDef, myPlayer, spawn);
    placeFinalizedDivision(newUnit, spawn.r, spawn.c);
    return newUnit;
  },

  _getCorridorOccupationAssignments(myPlayer) {
    if (typeof IASentidos === 'undefined' || typeof IASentidos.getNearestCorridorMissionForUnit !== 'function') {
      return [];
    }

    return IASentidos.getUnits(myPlayer)
      .filter(unit => this._isLandUnit(unit))
      .filter(unit => !unit.hasMoved && (unit.currentMovement || 0) > 0)
      .filter(unit => !unit.iaExpeditionTarget)
      .map(unit => {
        const mission = IASentidos.getNearestCorridorMissionForUnit(myPlayer, unit);
        if (!mission || !mission.objectiveHex) return null;
        return {
          unit,
          mission,
          score: (mission.distanceBetweenNodes * 10) + mission.pendingCaptureSegments.length + hexDistance(unit.r, unit.c, mission.objectiveHex.r, mission.objectiveHex.c)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
  },

  _getCorridorOccupationPressure(myPlayer) {
    const assignments = this._getCorridorOccupationAssignments(myPlayer);
    if (!assignments.length) {
      return { canExecute: false, weight: 0, assignments: [] };
    }

    const uniqueObjectives = new Set(assignments.map(entry => `${entry.mission.objectiveHex.r},${entry.mission.objectiveHex.c}`));
    const earlyBonus = gameState.turnNumber <= 10 ? 190 : 0;

    return {
      canExecute: true,
      weight: 155 + earlyBonus + Math.min(90, uniqueObjectives.size * 18),
      assignments
    };
  },

  _executeCorridorOccupationMission(myPlayer) {
    const assignments = this._getCorridorOccupationAssignments(myPlayer);
    if (!assignments.length) return 0;

    const claimedObjectives = new Set();
    let actions = 0;

    for (const entry of assignments) {
      const { unit, mission } = entry;
      const objective = mission.pendingCaptureSegments.find(hex => !claimedObjectives.has(`${hex.r},${hex.c}`)) || mission.objectiveHex;
      if (!objective) continue;

      const objectiveKey = `${objective.r},${objective.c}`;
      if (claimedObjectives.has(objectiveKey)) continue;

      const acted = this._requestMoveOrAttack(unit, objective.r, objective.c);
      if (!acted) continue;

      claimedObjectives.add(objectiveKey);
      actions += 1;

      console.log(`[IA_CORREDOR] ${unit.name} asignada a ocupar (${objective.r},${objective.c}) desde nodo (${mission.anchorNode.r},${mission.anchorNode.c}) hacia nodo (${mission.targetNode.r},${mission.targetNode.c})`);
    }

    return actions;
  },

  _canAffordRoadResources(myPlayer) {
    const res = gameState.playerResources?.[myPlayer] || {};
    const roadCost = STRUCTURE_TYPES?.Camino?.cost || {};
    const piedraReq = roadCost.piedra || 0;
    const maderaReq = roadCost.madera || 0;
    return (res.piedra || 0) >= piedraReq && (res.madera || 0) >= maderaReq;
  },

  _getPriorityRoadInfrastructureMissions(myPlayer) {
    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    const conexiones = roadPlan?.connections || [];
    if (!conexiones.length) return [];

    return conexiones
      .filter(conn => (conn.pendingCaptureSegments?.length || 0) === 0)
      .map(conn => {
        const missingRoads = (conn.missingOwnedSegments || []).filter(step => {
          const hex = board[step.r]?.[step.c];
          if (!hex) return false;
          if (hex.isCity) return false;
          if (hex.structure && hex.structure !== 'Camino') return false;
          return true;
        });

        if (!missingRoads.length) return null;

        return {
          from: conn.from,
          to: conn.to,
          missingRoads,
          score: (conn.landPath?.length || 0) + missingRoads.length
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);
  },

  _getPriorityRoadInfrastructurePressure(myPlayer) {
    const missions = this._getPriorityRoadInfrastructureMissions(myPlayer);
    const canAffordNow = this._canAffordRoadResources(myPlayer) && this._canAffordStructure(myPlayer, 'Camino');

    if (!missions.length || !canAffordNow) {
      return { canExecute: false, weight: 0, missions: [] };
    }

    const totalMissing = missions.reduce((sum, m) => sum + m.missingRoads.length, 0);
    return {
      canExecute: true,
      weight: 430 + Math.min(120, totalMissing * 8),
      missions
    };
  },

  _executePriorityRoadInfrastructureMission(myPlayer) {
    const missions = this._getPriorityRoadInfrastructureMissions(myPlayer);
    if (!missions.length) return 0;

    const maxRoadsPerTurn = 12;
    let builds = 0;

    for (const mission of missions) {
      for (const step of mission.missingRoads) {
        if (builds >= maxRoadsPerTurn) return builds;

        if (!this._canAffordRoadResources(myPlayer) || !this._canAffordStructure(myPlayer, 'Camino')) {
          return builds;
        }

        const built = this._requestBuildStructure(myPlayer, step.r, step.c, 'Camino');
        if (!built) continue;

        builds += 1;
        console.log(`[IA_INFRA_PRIO] Camino directo en (${step.r},${step.c}) para conectar nodo (${mission.from.r},${mission.from.c}) -> (${mission.to.r},${mission.to.c})`);
      }
    }

    return builds;
  },

  _getEarlyStoneHillsAssignments(myPlayer, maxAssignments = 1) {
    const resources = gameState.playerResources?.[myPlayer] || {};
    const stone = resources.piedra || 0;
    if (gameState.turnNumber > this.EARLY_STONE_HILLS_TURN_LIMIT) return [];
    if (stone >= this.EARLY_STONE_HILLS_MIN_STONE) return [];

    const targets = board.flat().filter(hex => {
      if (!hex) return false;
      if (hex.terrain !== 'hills') return false;
      if (hex.owner === myPlayer) return false;
      return true;
    });
    if (!targets.length) return [];

    const availableUnits = IASentidos.getUnits(myPlayer)
      .filter(unit => unit && unit.currentHealth > 0)
      .filter(unit => this._isLandUnit(unit))
      .filter(unit => !unit.hasMoved && (unit.currentMovement || 0) > 0)
      .filter(unit => !unit.iaExpeditionTarget);

    if (!availableUnits.length) return [];

    const assignments = [];
    const usedUnits = new Set();
    const claimedTargets = new Set();

    for (let i = 0; i < maxAssignments; i++) {
      let best = null;

      for (const unit of availableUnits) {
        if (usedUnits.has(unit.id)) continue;

        for (const target of targets) {
          const targetKey = `${target.r},${target.c}`;
          if (claimedTargets.has(targetKey)) continue;
          if (!this._findPathForUnit(unit, target.r, target.c)) continue;

          const distance = hexDistance(unit.r, unit.c, target.r, target.c);
          if (!best || distance < best.distance) {
            best = { unit, objective: target, distance };
          }
        }
      }

      if (!best) break;
      assignments.push(best);
      usedUnits.add(best.unit.id);
      claimedTargets.add(`${best.objective.r},${best.objective.c}`);
    }

    return assignments;
  },

  _getEarlyStoneHillsPressure(myPlayer) {
    const assignments = this._getEarlyStoneHillsAssignments(myPlayer, 1);
    if (!assignments.length) {
      return { canExecute: false, weight: 0, assignments: [] };
    }

    const stone = gameState.playerResources?.[myPlayer]?.piedra || 0;
    const stoneDeficit = Math.max(0, this.EARLY_STONE_HILLS_MIN_STONE - stone);
    const earlyBonus = Math.max(0, this.EARLY_STONE_HILLS_TURN_LIMIT - gameState.turnNumber) * 25;

    return {
      canExecute: true,
      weight: 1000 + (stoneDeficit * 3) + earlyBonus,
      assignments,
      stone,
      stoneDeficit
    };
  },

  _buildPointSupremacyContext(situacion, myMetrics = {}, enemyMetrics = {}, rutaLargaMeta = {}) {
    const turn = Number(gameState.turnNumber || 0);
    const startTurn = Math.max(1, Number(this.POINT_SUPREMACY_RUSH_START_TURN) || 4);
    const endTurn = Math.max(startTurn, Number(this.POINT_SUPREMACY_RUSH_END_TURN) || 7);
    const inWindow = turn >= startTurn && turn <= endTurn;
    const routeCount = Number(myMetrics.routesCount || 0);
    const minRoutes = Math.max(0, Number(this.POINT_SUPREMACY_MIN_READY_ROUTES) || 1);
    const hasTradeRoutes = routeCount >= minRoutes;
    const infraReady = !!rutaLargaMeta?.hasInfra;
    const currentPoints = Number(rutaLargaMeta?.currentPoints || 0);
    const remainingPoints = Math.max(0, Number(rutaLargaMeta?.remainingPoints || VICTORY_POINTS_TO_WIN));
    const enemyUnits = Number(enemyMetrics.unitCount || 0);
    const militarySafe = enemyUnits <= Math.max(1, (myMetrics.unitCount || 0) * 1.15);

    const active = inWindow && hasTradeRoutes && (infraReady || routeCount >= minRoutes) && remainingPoints > 0;
    return {
      active,
      turn,
      inWindow,
      routeCount,
      hasTradeRoutes,
      infraReady,
      currentPoints,
      remainingPoints,
      militarySafe
    };
  },

  _applyPointSupremacyWeights(rutas, context) {
    if (!context?.active || !Array.isArray(rutas)) return rutas;

    const boostById = {
      ruta_gloria: 950,
      ruta_mas_ciudades: 360,
      ruta_ejercito_grande: 320,
      ruta_mas_victorias: 320,
      ruta_mas_avances: 280,
      ruta_mas_heroes: 320,
      ruta_gran_arqueologo: 260,
      ruta_conquistador_barbaro: 260,
      ruta_frente_humano: 180,
      ruta_dominar_casillas: 170,
      ruta_caza_envolvente: 160,
      ruta_capital: context.militarySafe ? 110 : 40,
      ruta_aniquilacion: context.militarySafe ? 100 : 25,
      ruta_sabotaje: 90,
      ruta_cortar_suministro: 85
    };

    const penalties = {
      ruta_larga: 0.2,
      ruta_infraestructura_prioritaria: 0.15,
      ruta_corredor_nodos: 0.25,
      ruta_mas_comercios: 0.15,
      ruta_mas_riqueza: 0.2,
      ruta_piedra_hills_urgente: 0.2
    };

    return rutas.map(ruta => {
      if (!ruta) return ruta;
      let weight = Number(ruta.weight || 0);

      if (boostById[ruta.id]) {
        weight += boostById[ruta.id];
      }

      if (penalties[ruta.id]) {
        weight *= penalties[ruta.id];
      }

      if (ruta.id === 'ruta_gloria' && context.remainingPoints <= 3) {
        weight += 240;
      }

      return {
        ...ruta,
        weight,
        meta: {
          ...(ruta.meta || {}),
          pointSupremacyRush: true,
          rushTurn: context.turn,
          rushRemainingPoints: context.remainingPoints
        }
      };
    });
  },

  _executeEarlyStoneHillsMission(myPlayer) {
    const assignments = this._getEarlyStoneHillsAssignments(myPlayer, 1);
    if (!assignments.length) return 0;

    let actions = 0;
    for (const { unit, objective } of assignments) {
      if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.missionAssignments?.set) {
        AiGameplayManager.missionAssignments.set(unit.id, {
          type: 'STONE_HILLS_EMERGENCY',
          objective: { r: objective.r, c: objective.c },
          reason: 'LOW_STONE_EARLY_GAME'
        });
      }

      const acted = this._requestMoveOrAttack(unit, objective.r, objective.c);
      if (!acted) continue;

      actions += 1;
      console.log(`[IA_PIEDRA_HILLS] ${unit.name} asignada a ocupar hills en (${objective.r},${objective.c}) por piedra baja.`);
    }

    return actions;
  },

  _evaluarRutasDeVictoria(situacion) {
    const { myPlayer, ciudades } = situacion;
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const myMetrics = this._collectVictoryMetrics(myPlayer);
    const enemyMetrics = enemyPlayer != null ? this._collectVictoryMetrics(enemyPlayer) : {};
    const holders = gameState.victoryPoints?.holders || {};
    const myKey = `player${myPlayer}`;
    const enemyKey = enemyPlayer != null ? `player${enemyPlayer}` : null;
    const rutas = [];
    const infraPressure = this._getPriorityRoadInfrastructurePressure(myPlayer);
    const corridorPressure = this._getCorridorOccupationPressure(myPlayer);
    const earlyStonePressure = this._getEarlyStoneHillsPressure(myPlayer);

    rutas.push({
      id: 'ruta_piedra_hills_urgente',
      label: 'Piedra Temprana Hills',
      weight: earlyStonePressure.weight,
      canExecute: earlyStonePressure.canExecute,
      meta: {
        assignments: earlyStonePressure.assignments?.length || 0,
        stone: earlyStonePressure.stone ?? (gameState.playerResources?.[myPlayer]?.piedra || 0),
        stoneDeficit: earlyStonePressure.stoneDeficit ?? 0,
        turnNumber: gameState.turnNumber
      }
    });

    rutas.push({
      id: 'ruta_infraestructura_prioritaria',
      label: 'Infraestructura Prioritaria',
      weight: infraPressure.weight,
      canExecute: infraPressure.canExecute,
      meta: { pendingMissions: infraPressure.missions?.length || 0 }
    });

    rutas.push({
      id: 'ruta_corredor_nodos',
      label: 'Corredor',
      weight: corridorPressure.weight,
      canExecute: corridorPressure.canExecute,
      meta: { assignments: corridorPressure.assignments?.length || 0 }
    });

    const pushTitleRoute = (id, label, metricKey, holderKey, baseWeight = 120) => {
      const myVal = myMetrics[metricKey] || 0;
      const enemyVal = enemyMetrics[metricKey] || 0;
      const holder = holders[holderKey] || null;
      const delta = enemyVal - myVal;
      let weight = baseWeight + Math.max(0, delta) * 8;

      if (holder === myKey) weight *= 0.4;
      if (enemyKey && holder === enemyKey) weight *= 1.3;

      rutas.push({
        id,
        label,
        weight,
        canExecute: true,
        meta: { myVal, enemyVal, holder }
      });
    };

    const enemyCapital = enemyPlayer != null ? gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer) : null;
    if (enemyCapital) {
      const powerRatio = this._estimateLocalPowerRatio(myPlayer, enemyCapital, 5);
      const nearestDist = this._minUnitDistance(myPlayer, enemyCapital);
      const canExecute = powerRatio >= 0.9 && nearestDist <= 10;
      const weight = 220 + Math.max(0, 10 - Math.min(nearestDist, 10)) * 12 + powerRatio * 40;

      rutas.push({
        id: 'ruta_capital',
        label: 'Conquistar Capital',
        weight,
        canExecute,
        meta: { nearestDist, powerRatio: Number(powerRatio.toFixed(2)) }
      });
    }

    const totalEnemyUnits = enemyMetrics.unitCount || 0;
    const totalMyUnits = myMetrics.unitCount || 0;
    if (totalEnemyUnits > 0) {
      const powerRatio = (myMetrics.totalRegiments + 1) / (enemyMetrics.totalRegiments + 1);
      const weight = 200 + Math.max(0, powerRatio - 1) * 120;
      rutas.push({
        id: 'ruta_aniquilacion',
        label: 'Eliminar Jugador',
        weight,
        canExecute: powerRatio >= 1.1,
        meta: { powerRatio: Number(powerRatio.toFixed(2)), totalMyUnits, totalEnemyUnits }
      });
    }

    const totalCities = gameState.cities?.length || 0;
    const targetCities = Math.max(6, Math.ceil(totalCities * 0.5));
    const remainingCities = Math.max(0, targetCities - (myMetrics.cities || 0));
    rutas.push({
      id: 'ruta_emperador',
      label: 'Control de Ciudades',
      weight: 160 + remainingCities * 60,
      canExecute: remainingCities > 0,
      meta: { targetCities, remainingCities }
    });

    const victoryPointsEnabled = gameState.victoryByPointsEnabled ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
    const currentPoints = gameState.victoryPoints?.[myKey] || 0;
    const remainingPoints = Math.max(0, VICTORY_POINTS_TO_WIN - currentPoints);
    const rutaLarga = this._evaluarRutaLarga(situacion, myMetrics, enemyMetrics, holders);
    const pointContextSeed = { hasInfra: !!rutaLarga?.meta?.hasInfra, currentPoints, remainingPoints };
    rutas.push({
      id: 'ruta_gloria',
      label: 'Puntos de Victoria',
      weight: victoryPointsEnabled ? 150 + remainingPoints * 35 : 0,
      canExecute: victoryPointsEnabled && remainingPoints > 0,
      meta: { currentPoints, remainingPoints }
    });

    rutas.push(rutaLarga);

    pushTitleRoute('ruta_mas_ciudades', 'Mas Ciudades', 'cities', 'mostCities');
    pushTitleRoute('ruta_ejercito_grande', 'Ejercito Grande', 'armySize', 'largestArmy');
    pushTitleRoute('ruta_mas_victorias', 'Mas Victorias', 'kills', 'mostKills');
    pushTitleRoute('ruta_mas_avances', 'Mas Avances', 'techs', 'mostTechs');
    pushTitleRoute('ruta_mas_heroes', 'Mas Heroes', 'heroes', 'mostHeroes');
    pushTitleRoute('ruta_mas_riqueza', 'Mas Riqueza', 'wealthSum', 'mostResources');
    pushTitleRoute('ruta_mas_comercios', 'Mas Comercios', 'trades', 'mostTrades');
    pushTitleRoute('ruta_gran_arqueologo', 'Gran Arqueologo', 'ruinsCount', 'mostRuins');
    pushTitleRoute('ruta_conquistador_barbaro', 'Conquistador Barbaro', 'barbaraCities', 'mostBarbaraCities');
    pushTitleRoute('ruta_almirante_supremo', 'Almirante Supremo', 'navalVictories', 'mostNavalVictories');

    const enemyCities = (gameState.cities || []).filter(c => c.owner != null && c.owner === enemyPlayer);
    const enemyThreatOnOurCities = (IASentidos.getEnemyUnits(myPlayer) || []).filter(e => ciudades.some(c => hexDistance(e.r, e.c, c.r, c.c) <= 4)).length;
    const supplyCuts = this._collectSupplyCutTargets(myPlayer, this.CUT_SUPPLY_MAX_TARGETS).length;
    const sabotageTargets = this._collectSabotageTargets(myPlayer).length;
    const territoryDelta = (enemyMetrics.territoryHexes || 0) - (myMetrics.territoryHexes || 0);

    rutas.push({
      id: 'ruta_sabotaje',
      label: 'Sabotaje al Humano',
      weight: 165 + (sabotageTargets * 25),
      canExecute: sabotageTargets > 0,
      meta: { sabotageTargets }
    });

    rutas.push({
      id: 'ruta_cortar_suministro',
      label: 'Cortar Suministro',
      weight: 170 + (supplyCuts * 30),
      canExecute: supplyCuts > 0,
      meta: { supplyCuts }
    });

    rutas.push({
      id: 'ruta_dominar_casillas',
      label: 'Dominar Casillas',
      weight: 150 + Math.max(0, territoryDelta) * 2,
      canExecute: true,
      meta: { territoryDelta }
    });

    rutas.push({
      id: 'ruta_frente_humano',
      label: 'Gestionar Frente Humano',
      weight: 175 + (enemyThreatOnOurCities * 18),
      canExecute: enemyThreatOnOurCities > 0 || enemyCities.length > 0,
      meta: { enemyThreatOnOurCities, enemyCities: enemyCities.length }
    });

    rutas.push({
      id: 'ruta_caza_envolvente',
      label: 'Envolver y Cazar',
      weight: 160 + (enemyMetrics.unitCount || 0) * 6,
      canExecute: (enemyMetrics.unitCount || 0) > 0,
      meta: { enemyUnits: enemyMetrics.unitCount || 0 }
    });

    const pointSupremacyContext = this._buildPointSupremacyContext(situacion, myMetrics, enemyMetrics, pointContextSeed);
    let normalizedRoutes = this._applyPointSupremacyWeights(rutas, pointSupremacyContext);

    if (pointSupremacyContext.active) {
      this._importantLog('POINT_SUPREMACY_RUSH', {
        playerId: myPlayer,
        turn: pointSupremacyContext.turn,
        currentPoints: pointSupremacyContext.currentPoints,
        remainingPoints: pointSupremacyContext.remainingPoints,
        routeCount: pointSupremacyContext.routeCount,
        infraReady: pointSupremacyContext.infraReady
      });
    }

    normalizedRoutes.sort((a, b) => b.weight - a.weight);
    return normalizedRoutes;
  },

  _evaluarRutaLarga(situacion, myMetrics, enemyMetrics, holders) {
    const { myPlayer } = situacion;
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    const myKey = `player${myPlayer}`;
    const enemyKey = enemyPlayer != null ? `player${enemyPlayer}` : null;
    const ownCities = (gameState.cities || []).filter(c => c && c.owner === myPlayer);
    const tradeCities = this._getTradeCityCandidates(myPlayer).filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));

    if (ownCities.length < 1 || tradeCities.length < 2) {
      return {
        id: 'ruta_larga',
        label: 'Ruta Larga',
        weight: 0,
        canExecute: false,
        meta: { reason: 'sin_nodos_comerciales' }
      };
    }

    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (!roadPlan.connections.length) {
      return {
        id: 'ruta_larga',
        label: 'Ruta Larga',
        weight: 0,
        canExecute: false,
        meta: { reason: 'sin_ruta' }
      };
    }

    const missingCount = roadPlan.connections.reduce((sum, conn) => sum + (conn.missingOwnedSegments?.length || 0), 0);
    const hasInfra = missingCount === 0 && roadPlan.connections.length >= (roadPlan.nodes.length - 1);
    let weight = 190 + (hasInfra ? 80 : 0) + Math.min(80, missingCount * 6);

    if (holders.mostRoutes === myKey) weight *= 0.5;
    if (enemyKey && holders.mostRoutes === enemyKey) weight *= 1.4;

    return {
      id: 'ruta_larga',
      label: 'Ruta Larga',
      weight,
      canExecute: true,
      meta: {
        nodes: roadPlan.nodes.length,
        hasInfra,
        missingCount,
        connections: roadPlan.connections.length
      }
    };
  },

  _collectVictoryMetrics(playerNumber) {
    const pKey = `player${playerNumber}`;
    const res = gameState.playerResources[playerNumber] || {};
    const playerUnits = units.filter(u => u.player === playerNumber && u.currentHealth > 0);
    const barbaraCitiesConquered = gameState.cities.filter(c => {
      return c.owner === playerNumber && (c.isBarbaric === true || (c.owner === 9 && board[c.r]?.[c.c]?.owner === playerNumber));
    }).length;

    return {
      unitCount: playerUnits.length,
      totalRegiments: playerUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0),
      routesCount: playerUnits.filter(u => u.tradeRoute).length,
      wealthSum: (res.oro || 0) + (res.hierro || 0) + (res.piedra || 0) + (res.madera || 0) + (res.comida || 0),
      cities: board.flat().filter(h => h && h.owner === playerNumber && (h.isCity || h.structure === 'Aldea')).length,
      territoryHexes: board.flat().filter(h => h && h.owner === playerNumber).length,
      armySize: playerUnits.reduce((sum, u) => sum + (u.maxHealth || 0), 0),
      kills: gameState.playerStats?.unitsDestroyed?.[pKey] || 0,
      techs: (res.researchedTechnologies || []).length,
      heroes: playerUnits.filter(u => u.commander).length,
      trades: gameState.playerStats?.sealTrades?.[pKey] || 0,
      ruinsCount: gameState.playerStats?.ruinsExplored?.[pKey] || 0,
      barbaraCities: barbaraCitiesConquered,
      navalVictories: gameState.playerStats?.navalVictories?.[pKey] || 0
    };
  },

  _logRutasDeVictoria(rutas) {
    if (!rutas || rutas.length === 0) return;

    if (!this.ARCHI_LOG_VERBOSE) {
      const top = rutas[0];
      const metaText = top?.meta ? JSON.stringify(top.meta) : '';
      console.log(`[IA_ARCHIPIELAGO] RUTA PRINCIPAL: ${top?.id || 'n/a'} | peso=${top?.weight?.toFixed(1) || '0.0'} ${metaText}`);
      return;
    }

    console.log(`[IA_ARCHIPIELAGO] ========= RUTAS DE VICTORIA =========`);
    rutas.forEach((ruta, idx) => {
      const metaText = ruta.meta ? JSON.stringify(ruta.meta) : '';
      console.log(`[IA_ARCHIPIELAGO] #${idx + 1} ${ruta.label} | peso=${ruta.weight.toFixed(1)} | ejecutar=${!!ruta.canExecute} ${metaText}`);
    });
    console.log(`========================================\n`);
  },

  _procesarRutasDeVictoria(situacion) {
    const rutas = situacion.rutas || [];
    if (!rutas.length) return;

    const logLimit = this.ARCHI_LOG_VERBOSE ? rutas.length : (this.ARCHI_LOG_ROUTE_LIMIT || 3);
    const pointRushActive = rutas.some(r => r?.meta?.pointSupremacyRush === true);
    const pointRushBonus = pointRushActive ? Math.max(0, Number(this.POINT_SUPREMACY_ROUTE_ACTION_BONUS) || 0) : 0;
    const maxRouteActions = Math.max(1, (Number(this.MAX_ROUTE_ACTIONS_PER_TURN) || 4) + pointRushBonus);
    const turnStartTs = Number(situacion.turnStartTs || Date.now());
    const turnBudgetMs = Math.max(40, Number(situacion.turnBudgetMs || this.TURN_CPU_BUDGET_MS || 120));
    let executedRoutes = 0;

    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`[IA_ARCHIPIELAGO] ========= PROCESO RUTAS (DETALLE) =========`);
    }
    for (let idx = 0; idx < rutas.length; idx++) {
      const ruta = rutas[idx];
      if (executedRoutes >= maxRouteActions) {
        console.log(`[IA_ARCHIPIELAGO] Límite de acciones de ruta alcanzado (${maxRouteActions}).`);
        break;
      }
      if ((Date.now() - turnStartTs) >= turnBudgetMs) {
        console.warn(`[IA_ARCHIPIELAGO] Presupuesto de tiempo agotado durante rutas (${turnBudgetMs}ms).`);
        break;
      }

      const shouldLog = idx < logLimit;
      const metaText = ruta.meta ? JSON.stringify(ruta.meta) : '';
      if (shouldLog) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta ${idx + 1}] ${ruta.id} | peso=${ruta.weight.toFixed(1)} | ejecutar=${!!ruta.canExecute} ${metaText}`);
      }

      if (!ruta.canExecute) {
        const reason = this._diagnosticarRutaNoEjecutable(ruta, situacion);
        const reasonText = reason ? ` (razon: ${reason})` : '';
        if (shouldLog) {
          console.log(`[IA_ARCHIPIELAGO] [Ruta ${idx + 1}] ${ruta.id} -> omitida${reasonText}`);
        }
        continue;
      }

      const action = this._ejecutarAccionPorRuta(ruta, situacion);
      if (action?.executed) executedRoutes++;
      const resultText = action?.executed ? 'ejecutada' : 'no ejecutada';
      const reasonText = action?.reason ? ` (razon: ${action.reason})` : '';
      const noteText = action?.note ? ` (nota: ${action.note})` : '';
      if (shouldLog) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta ${idx + 1}] ${ruta.id} -> accion: ${action?.action || 'desconocida'} | ${resultText}${reasonText}${noteText}`);
      }
    }
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`========================================\n`);
    }
  },

  _ejecutarAccionPorRuta(ruta, situacion) {
    const { myPlayer } = situacion;
    switch (ruta.id) {
      case 'ruta_piedra_hills_urgente': {
        const moves = this._executeEarlyStoneHillsMission(myPlayer);
        return { action: 'piedra_hills_urgente', executed: moves > 0, note: `acciones=${moves}` };
      }
      case 'ruta_infraestructura_prioritaria': {
        const builds = this._executePriorityRoadInfrastructureMission(myPlayer);
        return { action: 'infraestructura_prioritaria', executed: builds > 0, note: `caminos=${builds}` };
      }
      case 'ruta_corredor_nodos': {
        const moves = this._executeCorridorOccupationMission(myPlayer);
        return { action: 'corredor_nodos', executed: moves > 0, note: `acciones=${moves}` };
      }
      case 'ruta_larga':
        this._ejecutarRutaLarga(situacion);
        return { action: 'ruta_larga', executed: true, note: 'ver logs de Ruta Larga para resultado' };
      case 'ruta_emperador': {
        const actions = this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
        return { action: 'conquistar_ciudades_barbaras', executed: actions > 0, note: `acciones=${actions}` };
      }
      case 'ruta_capital':
        return this._ejecutarRutaCapital(situacion);
      case 'ruta_aniquilacion':
        return this._ejecutarRutaAniquilacion(situacion);
      case 'ruta_gloria':
        return this._ejecutarRutaGloria(situacion);
      case 'ruta_mas_riqueza':
        return this._ejecutarRutaMasRiqueza(situacion);
      case 'ruta_ejercito_grande':
        return this._ejecutarRutaEjercitoGrande(situacion);
      case 'ruta_mas_avances':
        return this._ejecutarRutaMasAvances(situacion);
      case 'ruta_mas_ciudades':
        return this._ejecutarRutaMasCiudades(situacion);
      case 'ruta_mas_victorias':
        return this._ejecutarRutaMasVictorias(situacion);
      case 'ruta_mas_heroes':
        return this._ejecutarRutaMasHeroes(situacion);
      case 'ruta_mas_comercios':
        return this._ejecutarRutaMasComercios(situacion);
      case 'ruta_gran_arqueologo':
        return this._ejecutarRutaGranArqueologo(situacion);
      case 'ruta_conquistador_barbaro':
        return this._ejecutarRutaConquistadorBarbaro(situacion);
      case 'ruta_almirante_supremo':
        return this._ejecutarRutaAlmiranteSupremo(situacion);
      case 'ruta_sabotaje':
        return this._ejecutarRutaSabotaje(situacion);
      case 'ruta_cortar_suministro':
        return this._ejecutarRutaCortarSuministro(situacion);
      case 'ruta_dominar_casillas':
        return this._ejecutarRutaDominarCasillas(situacion);
      case 'ruta_frente_humano':
        return this._ejecutarRutaFrenteHumano(situacion);
      case 'ruta_caza_envolvente':
        return this._ejecutarRutaCazaEnvolvente(situacion);
      default:
        return { action: 'sin_accion_directa', executed: false, reason: 'sin_handler_ruta' };
    }
  },

  _diagnosticarRutaNoEjecutable(ruta, situacion) {
    const meta = ruta.meta || {};
    switch (ruta.id) {
      case 'ruta_piedra_hills_urgente': {
        if ((gameState.turnNumber || 0) > this.EARLY_STONE_HILLS_TURN_LIMIT) {
          return `turno_fuera_de_ventana:${gameState.turnNumber}`;
        }
        const stone = gameState.playerResources?.[situacion.myPlayer]?.piedra || 0;
        if (stone >= this.EARLY_STONE_HILLS_MIN_STONE) {
          return `piedra_suficiente:${stone}`;
        }
        if ((meta.assignments || 0) <= 0) {
          return 'sin_divisiones_o_hills_objetivo';
        }
        return 'condiciones_no_cumplidas';
      }
      case 'ruta_larga':
        if (meta.reason) return meta.reason;
        return 'condiciones_no_cumplidas';
      case 'ruta_capital': {
        const ratio = meta.powerRatio;
        const dist = meta.nearestDist;
        if (typeof ratio === 'number' && ratio < 0.9) return `powerRatio_bajo:${ratio}`;
        if (typeof dist === 'number' && dist > 10) return `distancia_alta:${dist}`;
        return 'condiciones_no_cumplidas';
      }
      case 'ruta_aniquilacion': {
        const ratio = meta.powerRatio;
        if (typeof ratio === 'number' && ratio < 1.1) return `powerRatio_bajo:${ratio}`;
        return 'condiciones_no_cumplidas';
      }
      case 'ruta_emperador': {
        if (typeof meta.remainingCities === 'number' && meta.remainingCities <= 0) {
          return `objetivo_cumplido:remainingCities=${meta.remainingCities}`;
        }
        return 'condiciones_no_cumplidas';
      }
      case 'ruta_gloria': {
        const victoryPointsEnabled = gameState.victoryByPointsEnabled ?? VICTORY_BY_POINTS_ENABLED_DEFAULT;
        if (!victoryPointsEnabled) return 'victoria_por_puntos_desactivada';
        if (typeof meta.remainingPoints === 'number' && meta.remainingPoints <= 0) {
          return `objetivo_cumplido:remainingPoints=${meta.remainingPoints}`;
        }
        return 'condiciones_no_cumplidas';
      }
      default:
        return meta.reason || 'condiciones_no_cumplidas';
    }
  },

  _minUnitDistance(myPlayer, target) {
    const myUnits = IASentidos.getUnits(myPlayer);
    if (!myUnits.length) return 99;
    return myUnits.reduce((min, unit) => Math.min(min, hexDistance(unit.r, unit.c, target.r, target.c)), 99);
  },

  _estimateLocalPowerRatio(myPlayer, target, radius = 5) {
    const enemyPlayer = this._getEnemyPlayerId(myPlayer);
    if (enemyPlayer == null) return 1;
    const myUnits = IASentidos.getUnits(myPlayer).filter(u => hexDistance(u.r, u.c, target.r, target.c) <= radius);
    const enemyUnits = IASentidos.getUnits(enemyPlayer).filter(u => hexDistance(u.r, u.c, target.r, target.c) <= radius);
    const myRegs = myUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    const enemyRegs = enemyUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    return (myRegs + 1) / (enemyRegs + 1);
  },

  _findRoadConnection(cityA, cityB, myPlayer, allowedOwners) {
    if (!cityA || !cityB) return null;
    const roadBuildable = STRUCTURE_TYPES['Camino']?.buildableOn || [];
    const landPath = this._findRoadBuildPath({
      myPlayer,
      start: { r: cityA.r, c: cityA.c },
      goal: { r: cityB.r, c: cityB.c },
      allowedOwners,
      roadBuildable
    });
    if (!landPath) return null;

    const missingOwnedSegments = landPath.filter(step => {
      const hex = board[step.r]?.[step.c];
      if (!hex || hex.isCity || hex.structure || hex.terrain === 'water' || hex.terrain === 'forest') return false;
      if (hex.owner !== myPlayer) return false;
      if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
      return true;
    });

    const pendingCaptureSegments = landPath.filter((step, idx) => {
      const isEndpoint = idx === 0 || idx === landPath.length - 1;
      if (isEndpoint) return false;
      const hex = board[step.r]?.[step.c];
      if (!hex || hex.isCity || hex.terrain === 'water' || hex.terrain === 'forest') return false;
      if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
      return hex.owner !== myPlayer;
    });

    return { landPath, missingOwnedSegments, pendingCaptureSegments };
  },

  _prioritizeBuildableRoadSegments(connection) {
    const landPath = Array.isArray(connection?.landPath) ? connection.landPath : [];
    const missingOwnedSegments = Array.isArray(connection?.missingOwnedSegments) ? connection.missingOwnedSegments : [];
    if (!landPath.length || !missingOwnedSegments.length) return missingOwnedSegments;

    const indexByKey = new Map();
    for (let i = 0; i < landPath.length; i++) {
      indexByKey.set(`${landPath[i].r},${landPath[i].c}`, i);
    }

    const connected = new Set();
    for (const step of landPath) {
      const hex = board[step.r]?.[step.c];
      if (!hex) continue;
      if (hex.isCity || hex.structure === 'Camino') {
        connected.add(`${step.r},${step.c}`);
      }
    }

    const remaining = new Map();
    for (const seg of missingOwnedSegments) {
      remaining.set(`${seg.r},${seg.c}`, seg);
    }

    const ordered = [];
    const to = connection?.to || null;
    while (remaining.size > 0) {
      const ready = [];
      for (const [key, seg] of remaining) {
        const hasConnectedNeighbor = getHexNeighbors(seg.r, seg.c).some(n => connected.has(`${n.r},${n.c}`));
        if (!hasConnectedNeighbor) continue;
        const pathIndex = indexByKey.get(key) ?? 999;
        const distanceToTarget = to ? hexDistance(seg.r, seg.c, to.r, to.c) : 99;
        ready.push({ key, seg, pathIndex, distanceToTarget });
      }

      if (!ready.length) break;

      ready.sort((a, b) => {
        if (a.distanceToTarget !== b.distanceToTarget) return a.distanceToTarget - b.distanceToTarget;
        return b.pathIndex - a.pathIndex;
      });

      const chosen = ready[0];
      ordered.push(chosen.seg);
      remaining.delete(chosen.key);
      connected.add(chosen.key);
    }

    if (!ordered.length) return missingOwnedSegments;

    // Fallback defensivo: no perder segmentos si algún tramo quedó sin conectar en este cálculo.
    for (const seg of missingOwnedSegments) {
      if (!ordered.some(x => x.r === seg.r && x.c === seg.c)) ordered.push(seg);
    }

    return ordered;
  },

  _findRoadBuildPath({ myPlayer, start, goal, allowedOwners, roadBuildable }) {
    if (!start || !goal) return null;
    const startKey = `${start.r},${start.c}`;
    const goalKey = `${goal.r},${goal.c}`;
    const open = [{ r: start.r, c: start.c, key: startKey, cost: 0 }];
    const dist = new Map([[startKey, 0]]);
    const prev = new Map();

    const canTraverse = (hex, isEndpoint) => {
      if (!hex) return false;
      if (isEndpoint) return true;
      if (hex.isCity) return true;
      if (allowedOwners && allowedOwners !== 'ANY' && !allowedOwners.has(hex.owner)) return false;
      if (!allowedOwners && hex.owner !== myPlayer) return false;
      if (hex.terrain === 'water' || hex.terrain === 'forest') return false;
      if (roadBuildable?.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
      return true;
    };

    while (open.length > 0) {
      open.sort((a, b) => a.cost - b.cost);
      const current = open.shift();
      const key = current.key;
      if ((dist.get(key) ?? Infinity) < current.cost) continue;
      if (key === goalKey) break;

      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const nKey = `${neighbor.r},${neighbor.c}`;
        const hex = board[neighbor.r]?.[neighbor.c];
        const isEndpoint = nKey === goalKey;
        if (!canTraverse(hex, isEndpoint)) continue;

        const stepCost = this._roadPathStepCost(hex, myPlayer, isEndpoint);
        const nextCost = current.cost + stepCost;
        if (nextCost >= (dist.get(nKey) ?? Infinity)) continue;

        dist.set(nKey, nextCost);
        prev.set(nKey, key);
        open.push({ r: neighbor.r, c: neighbor.c, key: nKey, cost: nextCost });
      }
    }

    if (!dist.has(goalKey)) return null;

    const path = [];
    let cursor = goalKey;
    while (cursor) {
      const [r, c] = cursor.split(',').map(Number);
      path.push({ r, c });
      cursor = prev.get(cursor);
    }
    path.reverse();
    return path;
  },

  _roadPathStepCost(hex, myPlayer, isEndpoint = false) {
    if (!hex) return 999;
    if (isEndpoint || hex.isCity) return 0.1;

    let cost = 1.0;

    // Reutilizar caminos ya construidos es más barato que abrir trazado nuevo.
    if (hex.structure === 'Camino') {
      cost -= 0.85;
    } else if (hex.structure) {
      cost += 0.8;
    }

    if (hex.owner === myPlayer) {
      cost -= 0.25;
    } else if (hex.owner == null || hex.owner === 0 || Number(hex.owner) === 9) {
      cost += 0.15;
    } else {
      cost += 0.45;
    }

    if (hex.terrain === 'hills') cost += 0.15;
    if (hex.terrain === 'mountain' || hex.terrain === 'mountains') cost += 0.35;

    return Math.max(0.05, cost);
  },

  _getRoadNetworkPlan(myPlayer, ciudades) {
    const ownCities = (ciudades || []).filter(c => c && c.owner === myPlayer);
    const connections = [];
    const seenPairs = new Set();
    const bankCity = this._getBankCity();

    for (const origin of ownCities) {
      const candidates = (ciudades || [])
        .filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer))
        .filter(dest => !(dest.r === origin.r && dest.c === origin.c))
        .map(dest => {
          const pairKey = this._getTradePairKey(origin, dest);
          if (!pairKey || seenPairs.has(pairKey)) return null;
          let conn = this._findRoadConnection(origin, dest, myPlayer, null);
          let planningMode = 'strict_owned_only';
          if (!conn) {
            // Fallback para misión corredor: detectar conectividad potencial aunque haya hexes no propios.
            conn = this._findRoadConnection(origin, dest, myPlayer, 'ANY');
            planningMode = conn ? 'permissive_corridor_detection' : planningMode;
          }
          if (!conn) return null;
          return {
            from: origin,
            to: dest,
            pairKey,
            landPath: conn.landPath,
            missingOwnedSegments: conn.missingOwnedSegments,
            pendingCaptureSegments: conn.pendingCaptureSegments,
            planningMode,
            distance: hexDistance(origin.r, origin.c, dest.r, dest.c)
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aBank = !!(bankCity && a.to.r === bankCity.r && a.to.c === bankCity.c);
          const bBank = !!(bankCity && b.to.r === bankCity.r && b.to.c === bankCity.c);
          if (aBank !== bBank) return aBank ? -1 : 1;
          const aState = a.pendingCaptureSegments?.length ? 0 : (a.missingOwnedSegments?.length ? 1 : 2);
          const bState = b.pendingCaptureSegments?.length ? 0 : (b.missingOwnedSegments?.length ? 1 : 2);
          if (aState !== bState) return aState - bState;
          return a.distance - b.distance;
        });

      for (const candidate of candidates) {
        if (!candidate?.pairKey || seenPairs.has(candidate.pairKey)) continue;
        seenPairs.add(candidate.pairKey);
        connections.push(candidate);
      }
    }

    return { nodes: ownCities, connections };
  },

  _findBestTradeCityPair(ciudades, myPlayer, existingRouteKeys = new Set()) {
    let best = null;
    const dummyUnit = { player: myPlayer, regiments: [{ type: 'Infantería Ligera' }] };
    const roadBuildable = STRUCTURE_TYPES['Camino']?.buildableOn || [];
    const bankCity = this._getBankCity();

    for (let i = 0; i < ciudades.length; i++) {
      for (let j = i + 1; j < ciudades.length; j++) {
        const cityA = ciudades[i];
        const cityB = ciudades[j];
        const pairKey = this._getTradePairKey(cityA, cityB);
        if (pairKey && existingRouteKeys.has(pairKey)) continue;
        if (cityA.owner !== myPlayer && cityB.owner !== myPlayer) continue;
        const landPath = findPath_A_Star(dummyUnit, { r: cityA.r, c: cityA.c }, { r: cityB.r, c: cityB.c });
        if (!landPath) continue;

        const pathIsValid = landPath.every(step => {
          const hex = board[step.r]?.[step.c];
          if (!hex) return false;
          if (hex.isCity) return true;
          if (hex.owner !== myPlayer) return false;
          if (hex.terrain === 'water' || hex.terrain === 'forest') return false;
          if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
          return true;
        });
        if (!pathIsValid) continue;

        const infraPath = findInfrastructurePath(cityA, cityB);
        const missingOwnedSegments = landPath.filter(step => {
          const hex = board[step.r]?.[step.c];
          if (!hex || hex.isCity || hex.structure || hex.terrain === 'water' || hex.terrain === 'forest') return false;
          if (hex.owner !== myPlayer) return false;
          if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
          return true;
        });

        const missingCount = missingOwnedSegments.length;
        const touchesBank = !!(
          bankCity &&
          ((cityA.r === bankCity.r && cityA.c === bankCity.c) || (cityB.r === bankCity.r && cityB.c === bankCity.c))
        );
        const bankBonus = touchesBank ? -10000 : 0;
        const score = bankBonus + (missingCount * 10) + landPath.length;
        if (!best || score < best.score) {
          best = { cityA, cityB, landPath, infraPath, missingOwnedSegments, score, touchesBank };
        }
      }
    }

    return best;
  },

  _ejecutarRutaLarga(situacion) {
    const { myPlayer } = situacion;
    this._metricLog('IA_COMMERCIAL_CONTROLLER_START', {
      turn: gameState.turnNumber,
      playerId: myPlayer
    });
    // Reiniciar pendientes por llamada para no arrastrar estado viejo entre subflujos.
    this._metricSetCommercialPending(myPlayer, {
      pendingNoOwn: 0,
      pendingOwnNoRoad: 0,
      pendingBlocked: 0
    });
    if (!this._rutaLargaCallState) this._rutaLargaCallState = {};
    const prevState = this._rutaLargaCallState[myPlayer];
    const maxCalls = Math.max(1, Number(this.MAX_RUTA_LARGA_CALLS_PER_TURN) || 1);
    if (prevState && prevState.turn === gameState.turnNumber && prevState.calls >= maxCalls) {
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Omitida por límite de llamadas en turno (${maxCalls}).`);
      this._metricSetCommercialBlocker(myPlayer, 'ruta_larga_call_limit', 'retry_next_cycle', { maxCalls });
      return false;
    }
    this._rutaLargaCallState[myPlayer] = {
      turn: gameState.turnNumber,
      calls: (prevState && prevState.turn === gameState.turnNumber) ? (prevState.calls + 1) : 1
    };

    const ownCities = (gameState.cities || []).filter(c => c && c.owner === myPlayer);
    const tradeCities = this._getTradeCityCandidates(myPlayer).filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));

    if (ownCities.length < 1 || tradeCities.length < 2) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay nodos comerciales suficientes.');
      this._metricSetCommercialBlocker(myPlayer, 'insufficient_trade_nodes', 'expand_trade_nodes', {
        ownCities: ownCities.length,
        tradeCities: tradeCities.length
      });
      return false;
    }

    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (!roadPlan.connections.length) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No se encontro ruta de caminos construible.');
      this._metricSetCommercialBlocker(myPlayer, 'no_buildable_road_connections', 'analyze_alternative_pairs');
      return false;
    }

    this._metricLog('IA_COMMERCIAL_PAIR_ANALYZED', {
      turn: gameState.turnNumber,
      playerId: myPlayer,
      evaluatedPairs: roadPlan.connections.length,
      routeNodes: roadPlan.nodes?.length || 0
    });

    const pendingCapture = roadPlan.connections
      .filter(conn => conn.pendingCaptureSegments && conn.pendingCaptureSegments.length > 0)
      .sort((a, b) => (a.pendingCaptureSegments.length - b.pendingCaptureSegments.length) || (a.landPath.length - b.landPath.length));

    if (pendingCapture.length > 0) {
      const target = pendingCapture[0];
      const objective = target.pendingCaptureSegments[0];
      this._importantLog('TRADE_CHAIN_STEP', {
        playerId: myPlayer,
        step: 'occupy_pending_segment',
        pair: `${target.from?.name || 'NODO_A'}->${target.to?.name || 'NODO_B'}`,
        objective: `${objective.r},${objective.c}`,
        pendingCaptureSegments: target.pendingCaptureSegments.length
      });
      this._metricSetCommercialPending(myPlayer, {
        pendingNoOwn: target.pendingCaptureSegments.length,
        pendingOwnNoRoad: 0,
        pendingBlocked: 0
      });
      this._metricLog('IA_HEX_DECISION_OCCUPY', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        hex: `${objective.r},${objective.c}`,
        owner: board[objective.r]?.[objective.c]?.owner ?? null,
        reason: 'hex_not_owned_or_not_ready'
      });
      const freeUnits = IASentidos.getUnits(myPlayer)
        .filter(u => u.currentHealth > 0 && !u.hasMoved && this._isLandUnit(u));

      let actingUnit = freeUnits
        .slice()
        .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c))
        .find(unit => this._findPathForUnit(unit, objective.r, objective.c));

      if (!actingUnit && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
        const infCost = REGIMENT_TYPES['Infantería Ligera']?.cost || {};
        const res = gameState.playerResources[myPlayer] || {};
        const canAffordPair = Object.keys(infCost).every(key => (res[key] || 0) >= ((infCost[key] || 0) * 2));

        if (canAffordPair) {
          actingUnit = AiGameplayManager.produceUnit(
            myPlayer,
            ['Infantería Ligera', 'Infantería Ligera'],
            'corridor_pioneer',
            `Pionero de Corredor ${target.from.name}`,
            target.from
          );
          if (actingUnit) {
            console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 1 (OCUPAR CASILLAS): creado ${actingUnit.name} para ocupar corredor.`);
          }
        }
      }

      if (actingUnit) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 1 (OCUPAR CASILLAS): ocupando (${objective.r},${objective.c}) para ${target.from.name} -> ${target.to.name}`);
        const relayAttempt = this._attemptSplitMergeRelayToObjective(
          myPlayer,
          actingUnit,
          objective,
          { from: target.from, to: target.to },
          this.MISSION_TYPE_COMMERCIAL_CORRIDOR
        );
        if (relayAttempt.ok && (relayAttempt.moved || relayAttempt.progressed)) {
          this._metricMarkCommercialUseful(myPlayer, 'occupy_hex_split_merge_relay', {
            hex: `${objective.r},${objective.c}`,
            unitId: relayAttempt.relayUnitId || actingUnit.id,
            pair: `${target.from.r},${target.from.c}|${target.to.r},${target.to.c}`
          });
          return true;
        }

        const controlledFallbackAllowed = relayAttempt.ok && !relayAttempt.moved && relayAttempt.reason === 'relay_without_movement';
        if (this._isCommercialSplitMergeMandatoryTurn() && !controlledFallbackAllowed) {
          this._metricSetCommercialBlocker(myPlayer, 'split_merge_required_no_fallback', 'split_merge_only_occupy', {
            turn: gameState.turnNumber,
            objective: `${objective.r},${objective.c}`,
            relayReason: relayAttempt.reason || 'relay_not_available'
          });
          return false;
        }

        const moved = this._requestMoveOrAttack(actingUnit, objective.r, objective.c, { missionType: this.MISSION_TYPE_COMMERCIAL_CORRIDOR });
        if (moved) {
          this._metricMarkCommercialUseful(myPlayer, 'occupy_hex', {
            hex: `${objective.r},${objective.c}`,
            unitId: actingUnit.id,
            pair: `${target.from.r},${target.from.c}|${target.to.r},${target.to.c}`
          });
          return true;
        }
      }

      // Regla estricta: si aún hay segmentos por ocupar entre nodos, no avanzar a construcción.
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] PASO 1 (OCUPAR CASILLAS) bloqueado: sin unidad disponible. Se pospone PASO 2.');
      this._metricSetCommercialBlocker(myPlayer, 'no_eligible_division_for_occupy', 'produce_or_reassign_division', {
        hex: `${objective.r},${objective.c}`
      });
      return false;
    }

    if (!this._hasCommercialSplitMergeQuotaForRoadBuild(myPlayer)) {
      const st = this._getCommercialSplitMergeTurnState(myPlayer);
      const minRequired = Math.max(1, Number(this.COMMERCIAL_MIN_SPLIT_MERGE_BEFORE_ROAD_BUILD) || 12);
      this._metricSetCommercialBlocker(myPlayer, 'road_blocked_by_split_merge_quota', 'continue_split_merge_occupy', {
        turn: gameState.turnNumber,
        splitMergeSuccess: st.successfulRelays,
        splitMergeRequired: minRequired
      });
      return false;
    }

    const pending = roadPlan.connections
      .filter(conn => conn.missingOwnedSegments && conn.missingOwnedSegments.length > 0)
      .sort((a, b) => (a.missingOwnedSegments.length - b.missingOwnedSegments.length) || (a.landPath.length - b.landPath.length));

    if (pending.length > 0) {
      const target = pending[0];
      this._importantLog('TRADE_CHAIN_STEP', {
        playerId: myPlayer,
        step: 'build_pending_road',
        pair: `${target.from?.name || 'NODO_A'}->${target.to?.name || 'NODO_B'}`,
        pendingRoadSegments: target.missingOwnedSegments?.length || 0
      });
      this._metricSetCommercialPending(myPlayer, {
        pendingNoOwn: 0,
        pendingOwnNoRoad: target.missingOwnedSegments.length,
        pendingBlocked: 0
      });
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Red caminos: nodos=${roadPlan.nodes.length} | Faltantes=${target.missingOwnedSegments.length}`);

      if (!this._hasTech(myPlayer, 'ENGINEERING')) {
        const requested = this._ensureTech(myPlayer, 'ENGINEERING');
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Falta ENGINEERING. Investigando=${!!requested}`);
        this._metricSetCommercialBlocker(myPlayer, 'missing_tech_engineering', 'research_engineering', { requested: !!requested });
        return;
      }

      const roadCost = STRUCTURE_TYPES['Camino']?.cost || {};
      const playerRes = gameState.playerResources[myPlayer] || {};
      const canAfford = (playerRes.piedra || 0) >= (roadCost.piedra || 0) && (playerRes.madera || 0) >= (roadCost.madera || 0);
      const candidateSegments = this._prioritizeBuildableRoadSegments(target);

      if (!candidateSegments.length) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay segmentos propios disponibles para construir camino.');
        this._metricSetCommercialBlocker(myPlayer, 'no_owned_segments_to_build', 'occupy_more_segments');
        return;
      }

      if (!canAfford) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Recursos insuficientes para construir camino.');
        this._metricSetCommercialBlocker(myPlayer, 'insufficient_resources_for_road', 'accumulate_resources');
        return false;
      }

      let builtRoad = false;
      let blockedByAlly = 0;
      let builtRoadCount = 0;
      const maxRoadBuildsThisCycle = Math.max(1, Number(this.MAX_ROAD_BUILDS_PER_CYCLE) || 1);
      for (const segment of candidateSegments) {
        if (builtRoadCount >= maxRoadBuildsThisCycle) break;
        const blocker = getUnitOnHex(segment.r, segment.c);
        if (blocker) {
          if (blocker.player === myPlayer) {
            this._scheduleVacateForBlockedBuild(myPlayer, blocker, segment.r, segment.c);
            const stillBlocking = getUnitOnHex(segment.r, segment.c);
            if (stillBlocking && stillBlocking.player === myPlayer) {
              blockedByAlly += 1;
              continue;
            }
          } else {
            continue;
          }
        }

        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 2 (CONSTRUIR CAMINOS): construyendo en (${segment.r},${segment.c})`);
        const builtNow = this._requestBuildStructure(myPlayer, segment.r, segment.c, 'Camino');
        if (builtNow) {
          builtRoad = true;
          builtRoadCount += 1;
          this._metricMarkCommercialUseful(myPlayer, 'build_road', { hex: `${segment.r},${segment.c}` });
        }
      }

      if (!builtRoad && blockedByAlly > 0) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Segmentos bloqueados por aliados: ${blockedByAlly}. Reintentará tras vaciar casillas.`);
        this._metricSetCommercialPending(myPlayer, { pendingBlocked: blockedByAlly });
        this._procesarDesbloqueoConstruccionesPendientes(myPlayer);
        for (const segment of candidateSegments) {
          if (builtRoadCount >= maxRoadBuildsThisCycle) break;
          if (getUnitOnHex(segment.r, segment.c)) continue;
          console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 2B (CONSTRUIR CAMINOS): reintentando en (${segment.r},${segment.c}) tras vacate`);
          const builtNow = this._requestBuildStructure(myPlayer, segment.r, segment.c, 'Camino');
          this._metricLog('IA_CHAIN_RELEASE_THEN_BUILD', {
            turn: gameState.turnNumber,
            playerId: myPlayer,
            hex: `${segment.r},${segment.c}`,
            releasedThisTurn: true,
            buildAttemptedSameTurn: true,
            buildSuccess: !!builtNow
          });
          if (builtNow) {
            builtRoad = true;
            builtRoadCount += 1;
            this._metricMarkCommercialUseful(myPlayer, 'release_then_build', { hex: `${segment.r},${segment.c}` });
          }
        }
      }

      if (!builtRoad) {
        this._metricSetCommercialBlocker(myPlayer, 'road_build_not_completed', 'retry_segments_next_cycle', { blockedByAlly });
        this._importantLog('TRADE_CHAIN_RESULT', {
          playerId: myPlayer,
          result: 'no_road_built',
          blockedByAlly,
          pendingRoadSegments: target.missingOwnedSegments?.length || 0
        });
        return false;
      }

      this._importantLog('TRADE_CHAIN_RESULT', {
        playerId: myPlayer,
        result: 'road_built',
        builtRoadCount,
        remainingPendingRoadSegments: Math.max(0, (target.missingOwnedSegments?.length || 0) - builtRoadCount)
      });

      // Prioridad: si hubo construcción de camino en este ciclo, continuar infraestructura antes de evaluar caravana.
      return true;
    }

    const existingRouteKeys = this._getExistingTradeRouteKeys();
    const candidate = this._pickNextTradeRouteCandidate(myPlayer, existingRouteKeys);
    if (!candidate) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay nuevas rutas comerciales disponibles.');
      this._metricSetCommercialBlocker(myPlayer, 'no_new_trade_route_candidate', 'maintain_or_expand_network');
      return false;
    }

    const { cityA, cityB, infraPath } = candidate;
    console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Objetivo comercial listo: ${cityA.name} -> ${cityB.name}`);

    // PASO 3: Crear (o reutilizar) Columna de Suministro.
    let supplyUnit = units.find(u =>
      u.player === myPlayer &&
      !u.tradeRoute &&
      u.regiments?.some(reg => (REGIMENT_TYPES[reg.type].abilities || []).includes('provide_supply'))
    );

    if (supplyUnit) {
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 3 (CREAR COLUMNA): reutilizando ${supplyUnit.name}.`);
      this._metricLog('IA_COMMERCIAL_COLUMN_STATUS', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        columnState: 'reused',
        unitId: supplyUnit.id
      });
    } else if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] PASO 3 (CREAR COLUMNA): creando Columna de Suministro...');
      supplyUnit = AiGameplayManager.produceUnit(myPlayer, ['Columna de Suministro'], 'trader', 'Columna de Suministro', cityA)
        || AiGameplayManager.produceUnit(myPlayer, ['Columna de Suministro'], 'trader', 'Columna de Suministro', cityB)
        || AiGameplayManager.produceUnit(myPlayer, ['Columna de Suministro'], 'trader', 'Columna de Suministro');
      this._metricLog('IA_COMMERCIAL_COLUMN_STATUS', {
        turn: gameState.turnNumber,
        playerId: myPlayer,
        columnState: supplyUnit ? 'created' : 'failed_create',
        unitId: supplyUnit?.id || null
      });
    }

    if (!supplyUnit) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] PASO 3 (CREAR COLUMNA) falló: no se pudo crear/obtener columna.');
      this._metricSetCommercialBlocker(myPlayer, 'no_supply_column', 'produce_supply_column');
      return false;
    }

    // PASO 4: Convertir en caravana (establecer ruta comercial).
    // Regla vinculante: este paso SOLO puede usar la columna validada en PASO 3.
    let okRoute = !!this._requestEstablishTradeRoute(supplyUnit, cityA, cityB, infraPath);
    if (!okRoute) {
      okRoute = !!this._requestEstablishTradeRoute(supplyUnit, cityB, cityA, infraPath);
    }

    if (okRoute) {
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 4 (CONVERTIR EN CARAVANA): ruta establecida ${cityA.name} <-> ${cityB.name}.`);
      this._metricMarkCommercialUseful(myPlayer, 'create_caravan', {
        pair: `${cityA.r},${cityA.c}|${cityB.r},${cityB.c}`,
        supplyUnitId: supplyUnit.id
      });
      return true;
    }

    console.log('[IA_ARCHIPIELAGO] [Ruta Larga] PASO 4 (CONVERTIR EN CARAVANA) falló.');
    this._metricSetCommercialBlocker(myPlayer, 'caravan_conversion_failed', 'retry_conversion_next_cycle', {
      pair: `${cityA.r},${cityA.c}|${cityB.r},${cityB.c}`
    });
    return false;
  }
};

window.IAArchipielago = IAArchipielago;
console.log('[IA_ARCHIPIELAGO] Asignado a window.IAArchipielago:', typeof window.IAArchipielago, window.IAArchipielago);
