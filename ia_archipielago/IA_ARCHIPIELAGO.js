// IA_ARCHIPIELAGO.js
// Cerebro principal para Archipiélago. Coordina sentidos + módulos.
// EJECUTA ACCIONES REALES: Movimiento, fusión, división, conquista, construcción, caravanas

const IAArchipielago = {
  ARCHI_LOG_VERBOSE: false,
  ARCHI_LOG_ROUTE_LIMIT: 3,
  BARBARIAN_CONQUEST_RATIO: 2.0,
  INVADER_FORTRESS_MIN_DISTANCE: 6,
  HUNT_SMALL_DIVISIONS_TARGET: 3,
  BIG_ENEMY_DIVISION_THRESHOLD: 12,
  HEAVY_DIVISION_TARGET: 20,
  WORM_MIN_SPLIT_REGIMENTS: 2,
  WORM_MAX_ACTIONS_PER_TURN: 8,
  CUT_SUPPLY_MAX_TARGETS: 4,
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

  // Método principal unificado
  ejecutarTurno(myPlayer) {

    console.log(`[IA_ARCHIPIELAGO] ========= TURNO ${gameState.turnNumber} - JUGADOR ${myPlayer} =========`);
    // Variables para metas y filtrado
    let totalMetas = 0;
    let totalFiltradas = 0;

    if (typeof IASentidos === 'undefined') {
      console.error(`[IA_ARCHIPIELAGO] ERROR CRÍTICO: IASentidos no disponible.`);
      if (typeof handleEndTurn === 'function') setTimeout(() => handleEndTurn(), 500);
      return;
    }

    if (!this._turnBuildRetryBlock) this._turnBuildRetryBlock = {};
    this._turnBuildRetryBlock[myPlayer] = { turn: gameState.turnNumber, keys: new Set() };

    const infoTurno = IASentidos.getTurnInfo();
    if (infoTurno.currentPhase !== 'play') return;

    // --- 1. RECOPILACIÓN DE DATOS ---
    const hexesPropios = IASentidos.getOwnedHexes(myPlayer);
    const ciudades = IASentidos.getCities(myPlayer).filter(c => !this.isGoalCompletedFlujo('ocupacion', c.r, c.c, myPlayer));
    const recursos = hexesPropios.filter(h => h.resourceNode && !this.isGoalCompletedFlujo('ocupacion', h.r, h.c, myPlayer));
    const infraestructura = hexesPropios.filter(h => h.structure);

    // --- 2. FLUJO 1: OCUPACIÓN ---
    console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Iniciando...`);
    let ocupacionesRealizadas = 0;
    const objetivosOcupacion = [...ciudades, ...recursos];
    for (const obj of objetivosOcupacion) {
      if (this._requestMoveOrAttack) {
        const result = this._requestMoveOrAttack({ r: obj.r, c: obj.c, player: myPlayer }, obj.r, obj.c);
        if (result) {
          this.registrarMetaFlujo('ocupacion', obj.r, obj.c, myPlayer);
          ocupacionesRealizadas++;
        }
      }
    }
    console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Finalizado. Conquistas: ${ocupacionesRealizadas}`);

    // --- 3. FLUJO 2: CONSTRUCCIÓN EXHAUSTIVA ---
    if (typeof this.construirInfraestructura === 'function') {
      console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Ejecutando construcción preventiva...`);
      this.construirInfraestructura(myPlayer, hexesPropios, { oro: 99999 }); 
    }

    // --- 4. ANÁLISIS ECONÓMICO Y TÁCTICO ---
    const economia = (typeof IAEconomica !== 'undefined') ? IAEconomica.evaluarEconomia(myPlayer) : { oro: 0 };
    const objetivosSiguientes = ciudades.concat(recursos);
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
      recursos,
      infraestructura,
      snapshotActividad: this._snapshotTurnActivity(myPlayer)
    };

    situacion.enemyProfile = this._evaluateEnemyExpansionStrategy(myPlayer);

    // --- 5. EJECUCIÓN DE PLANES ESTRATÉGICOS ---
    this._ejecutarCapaEstructuralRed(situacion);

    const rutas = this._evaluarRutasDeVictoria(situacion);
    situacion.rutas = rutas;
    this._logRutasDeVictoria(rutas);
    this._procesarRutasDeVictoria(situacion);

    this.ejecutarPlanDeAccion(situacion);

    // Plan de emergencia si no hubo progreso
    if (!this._didMakeProgressThisTurn(myPlayer, situacion.snapshotActividad)) {
      console.warn('[IA_ARCHIPIELAGO] Turno inerte detectado. Activando emergencia...');
      this._ejecutarPlanEmergencia(situacion);
    }

    // --- 6. FINALIZACIÓN ---
    console.log(`[IA_ARCHIPIELAGO] Turno completado para Jugador ${myPlayer}.`);
    if (typeof handleEndTurn === 'function') {
      setTimeout(() => handleEndTurn(), 1500);
    }
    return situacion;
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
      if (mission1 && ['OCCUPY_THEN_BUILD', 'IA_NODE', 'AXIS_ADVANCE'].includes(mission1.type)) continue;
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
        if (mission2 && ['OCCUPY_THEN_BUILD', 'IA_NODE', 'AXIS_ADVANCE'].includes(mission2.type)) continue;
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
      return;
    }

    console.log(`[IA_ARCHIPIELAGO] CONQUISTA: ${ciudadesBarbaras.length} ciudades bárbaras detectadas`);

    const barbarianKeys = new Set(ciudadesBarbaras.map(c => `${c.r},${c.c}`));
    for (const unit of misUnidades) {
      if (unit.iaExpeditionTarget && !barbarianKeys.has(unit.iaExpeditionTarget)) {
        delete unit.iaExpeditionTarget;
      }
    }

    const targetCity = this._pickBarbarianTarget(myPlayer, ciudadesBarbaras);
    if (!targetCity) return;

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
      return;
    }

    // Si la ciudad ya es nuestra, registrar meta cumplida
    const cityObj = board[targetCity.r]?.[targetCity.c];
    if (cityObj && cityObj.owner === myPlayer) {
      this.registrarMetaFlujo('ocupacion', targetCity.r, targetCity.c, myPlayer);
      return;
    }

    console.log(`[IA_ARCHIPIELAGO] CONQUISTA: expedición lista (${totalPower}/${requiredPower}) hacia (${targetCity.r},${targetCity.c}).`);
    for (const unit of expeditionUnits) {
      unit.iaExpeditionTarget = `${targetCity.r},${targetCity.c}`;
      this._requestMoveOrAttack(unit, targetCity.r, targetCity.c);
    }
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
    if (esTurnoTemprano) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Veda de fortalezas activa (turno < 4).');
      return;
    }
    if (piedraTrasCaminos < reservaPiedraMinima) {
      console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Reserva de piedra insuficiente para fortaleza (${piedraTrasCaminos}/${reservaPiedraMinima}).`);
      return;
    }

    if (!this._ensureTech(myPlayer, 'FORTIFICATIONS')) {
      console.log('[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Falta FORTIFICATIONS para fortaleza estratégica.');
      return;
    }

    const MAX_EXPANSION_FORTS = 1;
    const MIN_FORT_SPACING = 5;
    const existingExpandForts = board.flat().filter(h =>
      h && h.owner === myPlayer && (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
    );

    if (existingExpandForts.length < MAX_EXPANSION_FORTS) {
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

  _requestMoveUnit(unit, r, c) {
    if (!unit) return false;
    if (typeof isValidMove === 'function' && !isValidMove(unit, r, c)) {
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
        // Log de flujo ocupación
        console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Unidad ${unit.id} movida a (${r},${c})`);
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('ocupacion', r, c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Meta registrada en (${r},${c})`);
        }
        return true;
      }
      return false;
    }

    if (typeof processActionRequest === 'function') {
      processActionRequest(action);
      console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Unidad ${unit.id} movida a (${r},${c})`);
      if (typeof registrarMetaFlujo === 'function') {
        registrarMetaFlujo('ocupacion', r, c);
        console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Meta registrada en (${r},${c})`);
      }
      return true;
    }

    if (typeof RequestMoveUnit === 'function') {
      RequestMoveUnit(unit, r, c);
      console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Unidad ${unit.id} movida a (${r},${c})`);
      if (typeof registrarMetaFlujo === 'function') {
        registrarMetaFlujo('ocupacion', r, c);
        console.log(`[IA_ARCHIPIELAGO][FLUJO OCUPACIÓN] Meta registrada en (${r},${c})`);
      }
      return true;
    }

    console.warn('[IA_ARCHIPIELAGO] RequestMoveUnit no disponible.');
    return false;
  },

  _requestMoveOrAttack(unit, r, c) {
    if (!unit) return false;
    const targetUnit = getUnitOnHex(r, c);
    if (targetUnit && targetUnit.player !== unit.player) {
      const canAttack = typeof isValidAttack === 'function'
        ? isValidAttack(unit, targetUnit)
        : hexDistance(unit.r, unit.c, targetUnit.r, targetUnit.c) <= (unit.attackRange || 1);

      if (!canAttack) {
        const step = this._getMoveStepTowards(unit, r, c);
        if (step) return this._requestMoveUnit(unit, step.r, step.c);
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

      if (typeof processActionRequest === 'function') {
        processActionRequest(action);
        return true;
      }

      if (typeof RequestAttackUnit === 'function') {
        RequestAttackUnit(unit, targetUnit);
        return true;
      }

      console.warn('[IA_ARCHIPIELAGO] RequestAttackUnit no disponible.');
      return false;
    }
    const step = this._getMoveStepTowards(unit, r, c);
    if (step) return this._requestMoveUnit(unit, step.r, step.c);
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

  _requestMergeUnits(mergingUnit, targetUnit) {
    if (typeof RequestMergeUnits !== 'function') {
      console.warn('[IA_ARCHIPIELAGO] RequestMergeUnits no disponible.');
      return false;
    }
    RequestMergeUnits(mergingUnit, targetUnit, true);
    return true;
  },

  _requestSplitUnit(unit, r, c) {
    if (typeof RequestSplitUnit !== 'function') {
      console.warn('[IA_ARCHIPIELAGO] RequestSplitUnit no disponible.');
      return false;
    }
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

    AiGameplayManager.missionAssignments.set(blockerUnit.id, {
      type: 'IA_NODE',
      objective: { r: objective.r, c: objective.c },
      nodoTipo: 'corredor_comercial',
      axisName: 'vacate_blocked_build',
      nodoRazon: 'VACATE_BLOCKED_BUILD'
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

  _requestBuildStructure(playerId, r, c, structureType) {
    if (!this._turnBuildRetryBlock) this._turnBuildRetryBlock = {};
    if (!this._turnBuildRetryBlock[playerId] || this._turnBuildRetryBlock[playerId].turn !== gameState.turnNumber) {
      this._turnBuildRetryBlock[playerId] = { turn: gameState.turnNumber, keys: new Set() };
    }

    const retryKey = `${structureType}:${r},${c}`;
    const playerRetryState = this._turnBuildRetryBlock[playerId];
    if (playerRetryState.keys.has(retryKey)) {
      return false;
    }

    const hex = board[r]?.[c];
    if (!hex || hex.owner !== playerId) {
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const data = STRUCTURE_TYPES?.[structureType];
    if (!data) {
      playerRetryState.keys.add(retryKey);
      return false;
    }

    // Guardrail global IA: nunca más de 1 fortaleza y mantener separación mínima de 5.
    if (structureType === 'Fortaleza') {
      const MIN_FORT_SPACING = 5;
      const existingForts = board.flat().filter(h =>
        h &&
        h.owner === playerId &&
        (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla')
      );

      if (existingForts.length >= 1) {
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
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const blocker = getUnitOnHex(r, c);
    if (blocker) {
      if (blocker.player === playerId) {
        this._scheduleVacateForBlockedBuild(playerId, blocker, r, c);
      }
      playerRetryState.keys.add(retryKey);
      return false;
    }

    const cost = data.cost || {};
    const canPay = Object.keys(cost).every(res => res === 'Colono' || (playerRes[res] || 0) >= (cost[res] || 0));
    if (!canPay) {
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
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('construccion', r, c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Intento construir ${structureType} en (${r},${c})`);
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('construccion', r, c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
        return true;
      }
      return false;
    }

    if (typeof handleConfirmBuildStructure === 'function') {
      handleConfirmBuildStructure(action.payload);
      const built = board[r]?.[c]?.structure === structureType;
      if (built) {
        console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Construido ${structureType} en (${r},${c})`);
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('construccion', r, c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CONSTRUCCIÓN] Meta registrada en (${r},${c})`);
        }
      }
      if (!built) playerRetryState.keys.add(retryKey);
      return built;
    }

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
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('caravana', origin.r, origin.c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
        }
        return true;
      }
      if (typeof NetworkManager !== 'undefined' && NetworkManager.enviarDatos) {
        NetworkManager.enviarDatos({ type: 'actionRequest', action });
        console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intento crear ruta comercial de (${origin.r},${origin.c}) a (${destination.r},${destination.c})`);
        if (typeof registrarMetaFlujo === 'function') {
          registrarMetaFlujo('caravana', origin.r, origin.c);
          console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
        }
        return true;
      }
      return false;
    }

    if (typeof _executeEstablishTradeRoute === 'function') {
      _executeEstablishTradeRoute(action.payload);
      console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Intento crear ruta comercial de (${origin.r},${origin.c}) a (${destination.r},${destination.c})`);
      if (typeof registrarMetaFlujo === 'function') {
        registrarMetaFlujo('caravana', origin.r, origin.c);
        console.log(`[IA_ARCHIPIELAGO][FLUJO CARAVANA] Meta registrada en (${origin.r},${origin.c})`);
      }
      return true;
    }

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

  _getTopCorridorObjectives(myPlayer, maxObjectives = 3) {
    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (!roadPlan.connections?.length) return [];

    const candidates = roadPlan.connections
      .map(conn => {
        const pending = conn.pendingCaptureSegments?.[0] || null;
        const missing = conn.missingOwnedSegments?.[0] || null;
        const objective = pending || missing || null;
        if (!objective) return null;
        return {
          objective,
          score: (pending ? 0 : 10) + (conn.landPath?.length || 0),
          from: conn.from,
          to: conn.to
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .slice(0, maxObjectives);

    return candidates;
  },

  _ejecutarGusanoCorredor(situacion, opts = {}) {
    const { myPlayer } = situacion;
    const maxActions = Math.max(1, Number(opts.maxActions || this.WORM_MAX_ACTIONS_PER_TURN));
    const corridorObjectives = this._getTopCorridorObjectives(myPlayer, maxActions);
    if (!corridorObjectives.length) return 0;
    const bankCity = this._getBankCity();
    const bankObjectives = corridorObjectives.filter(node =>
      bankCity && node?.to?.r === bankCity.r && node?.to?.c === bankCity.c
    ).length;

    let actions = 0;
    for (const node of corridorObjectives) {
      if (actions >= maxActions) break;
      const objective = node.objective;
      const myUnits = IASentidos.getUnits(myPlayer)
        .filter(u => this._isLandUnit(u))
        .filter(u => (u.currentMovement || 0) > 0)
        .filter(u => !u.iaExpeditionTarget)
        .sort((a, b) => hexDistance(a.r, a.c, objective.r, objective.c) - hexDistance(b.r, b.c, objective.r, objective.c));

      if (!myUnits.length) break;

      let acted = false;
      const splitCandidate = myUnits.find(u => (u.regiments?.length || 0) >= this.WORM_MIN_SPLIT_REGIMENTS);
      if (splitCandidate && this._splitUnitTowardsObjective(splitCandidate, objective)) {
        console.log(`[IA_ARCHIPIELAGO] [Gusano] Split corredor hacia (${objective.r},${objective.c}) para ${node.from?.name} -> ${node.to?.name}`);
        actions += 1;
        acted = true;
      }

      if (actions >= maxActions) break;

      if (!acted) {
        const mover = myUnits.find(u => this._findPathForUnit(u, objective.r, objective.c));
        if (mover && this._requestMoveOrAttack(mover, objective.r, objective.c)) {
          console.log(`[IA_ARCHIPIELAGO] [Gusano] Avance corredor hacia (${objective.r},${objective.c}) para ${node.from?.name} -> ${node.to?.name}`);
          actions += 1;
        }
      }
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
    const commanderIds = Object.keys(COMMANDERS || {});
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
    const hasDrill = this._ensureTech(myPlayer, 'DRILL_TACTICS');

    if (!hasLeadership || !hasDrill) {
      return { action: 'heroes', executed: false, reason: 'faltan_tecnologias' };
    }

    const unitWithHQ = units.find(u => u.player === myPlayer && u.regiments?.some(r => r.type === 'Cuartel General'));
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
    if (!this._ensureTech(myPlayer, 'RECONNAISSANCE')) {
      return { action: 'explorar_ruinas', executed: false, reason: 'sin_tecnologia' };
    }

    let explorerUnit = units.find(u => u.player === myPlayer && u.regiments?.some(r => r.type === 'Explorador'));
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

    if (explorerUnit.r === target.r && explorerUnit.c === target.c) {
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
    return { action: 'victoria_por_puntos', executed: combat.executed || ruins.executed };
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
    rutas.push({
      id: 'ruta_gloria',
      label: 'Puntos de Victoria',
      weight: victoryPointsEnabled ? 150 + remainingPoints * 35 : 0,
      canExecute: victoryPointsEnabled && remainingPoints > 0,
      meta: { currentPoints, remainingPoints }
    });

    rutas.push(this._evaluarRutaLarga(situacion, myMetrics, enemyMetrics, holders));

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

    rutas.sort((a, b) => b.weight - a.weight);
    return rutas;
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
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`[IA_ARCHIPIELAGO] ========= PROCESO RUTAS (DETALLE) =========`);
    }
    rutas.forEach((ruta, idx) => {
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
        return;
      }

      const action = this._ejecutarAccionPorRuta(ruta, situacion);
      const resultText = action?.executed ? 'ejecutada' : 'no ejecutada';
      const reasonText = action?.reason ? ` (razon: ${action.reason})` : '';
      const noteText = action?.note ? ` (nota: ${action.note})` : '';
      if (shouldLog) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta ${idx + 1}] ${ruta.id} -> accion: ${action?.action || 'desconocida'} | ${resultText}${reasonText}${noteText}`);
      }
    });
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`========================================\n`);
    }
  },

  _ejecutarAccionPorRuta(ruta, situacion) {
    const { myPlayer } = situacion;
    switch (ruta.id) {
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
      case 'ruta_emperador':
        this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
        return { action: 'conquistar_ciudades_barbaras', executed: true, note: 'ver logs de conquista' };
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

  _findRoadBuildPath({ myPlayer, start, goal, allowedOwners, roadBuildable }) {
    if (!start || !goal) return null;
    const startKey = `${start.r},${start.c}`;
    const goalKey = `${goal.r},${goal.c}`;
    const queue = [start];
    const visited = new Set([startKey]);
    const prev = new Map();

    const canTraverse = (hex, isEndpoint) => {
      if (!hex) return false;
      if (isEndpoint) return true;
      if (hex.isCity) return true;
      if (allowedOwners && !allowedOwners.has(hex.owner)) return false;
      if (!allowedOwners && hex.owner !== myPlayer) return false;
      if (hex.terrain === 'water' || hex.terrain === 'forest') return false;
      if (roadBuildable?.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
      return true;
    };

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.r},${current.c}`;
      if (key === goalKey) break;

      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const nKey = `${neighbor.r},${neighbor.c}`;
        if (visited.has(nKey)) continue;
        const hex = board[neighbor.r]?.[neighbor.c];
        const isEndpoint = nKey === goalKey;
        if (!canTraverse(hex, isEndpoint)) continue;
        visited.add(nKey);
        prev.set(nKey, key);
        queue.push({ r: neighbor.r, c: neighbor.c });
      }
    }

    if (!visited.has(goalKey)) return null;

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

  _getRoadNetworkPlan(myPlayer, ciudades) {
    const ownCities = (ciudades || []).filter(c => c && c.owner === myPlayer);
    const connections = [];
    const bankCity = this._getBankCity();

    for (const origin of ownCities) {
      const candidate = (ciudades || [])
        .filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer))
        .filter(dest => !(dest.r === origin.r && dest.c === origin.c))
        .map(dest => {
          const conn = this._findRoadConnection(origin, dest, myPlayer, null);
          if (!conn) return null;
          return {
            from: origin,
            to: dest,
            landPath: conn.landPath,
            missingOwnedSegments: conn.missingOwnedSegments,
            pendingCaptureSegments: conn.pendingCaptureSegments,
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
        })[0];

      if (candidate) {
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
    const ownCities = (gameState.cities || []).filter(c => c && c.owner === myPlayer);
    const tradeCities = this._getTradeCityCandidates(myPlayer).filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));

    if (ownCities.length < 1 || tradeCities.length < 2) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay nodos comerciales suficientes.');
      return;
    }

    const roadPlan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (!roadPlan.connections.length) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No se encontro ruta de caminos construible.');
      return;
    }

    const pendingCapture = roadPlan.connections
      .filter(conn => conn.pendingCaptureSegments && conn.pendingCaptureSegments.length > 0)
      .sort((a, b) => (a.pendingCaptureSegments.length - b.pendingCaptureSegments.length) || (a.landPath.length - b.landPath.length));

    if (pendingCapture.length > 0) {
      const target = pendingCapture[0];
      const objective = target.pendingCaptureSegments[0];
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
            console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 0: creado ${actingUnit.name} para ocupar corredor.`);
          }
        }
      }

      if (actingUnit) {
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 1: ocupando (${objective.r},${objective.c}) para ${target.from.name} -> ${target.to.name}`);
        this._requestMoveOrAttack(actingUnit, objective.r, objective.c);
        return;
      }
    }

    const pending = roadPlan.connections
      .filter(conn => conn.missingOwnedSegments && conn.missingOwnedSegments.length > 0)
      .sort((a, b) => (a.missingOwnedSegments.length - b.missingOwnedSegments.length) || (a.landPath.length - b.landPath.length));

    if (pending.length > 0) {
      const target = pending[0];
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Red caminos: nodos=${roadPlan.nodes.length} | Faltantes=${target.missingOwnedSegments.length}`);

      if (!this._hasTech(myPlayer, 'ENGINEERING')) {
        const requested = this._ensureTech(myPlayer, 'ENGINEERING');
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Falta ENGINEERING. Investigando=${!!requested}`);
        return;
      }

      const roadCost = STRUCTURE_TYPES['Camino']?.cost || {};
      const playerRes = gameState.playerResources[myPlayer] || {};
      const canAfford = (playerRes.piedra || 0) >= (roadCost.piedra || 0) && (playerRes.madera || 0) >= (roadCost.madera || 0);
      const nextHex = target.missingOwnedSegments[0];

      if (!nextHex) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay segmentos propios disponibles para construir camino.');
        return;
      }

      if (!canAfford) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Recursos insuficientes para construir camino.');
        return;
      }

      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 2: construyendo camino en (${nextHex.r},${nextHex.c})`);
      this._requestBuildStructure(myPlayer, nextHex.r, nextHex.c, 'Camino');
      return;
    }

    const existingRouteKeys = this._getExistingTradeRouteKeys();
    const candidate = this._pickNextTradeRouteCandidate(myPlayer, existingRouteKeys);
    if (!candidate) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay nuevas rutas comerciales disponibles.');
      return;
    }

    const { cityA, cityB, infraPath } = candidate;
    console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Nueva caravana: ${cityA.name} -> ${cityB.name}`);

    let supplyUnit = units.find(u => u.player === myPlayer && !u.tradeRoute && u.regiments?.some(reg => (REGIMENT_TYPES[reg.type].abilities || []).includes('provide_supply')));

    if (!supplyUnit && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] PASO 3: creando Columna de Suministro...');
      supplyUnit = AiGameplayManager.produceUnit(myPlayer, ['Columna de Suministro'], 'trader', 'Columna de Suministro');
    }

    if (!supplyUnit) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No se pudo crear o encontrar Columna de Suministro.');
      return;
    }

    let origin = cityA;
    let destination = cityB;
    const originHex = board[origin.r]?.[origin.c];
    const destHex = board[destination.r]?.[destination.c];
    const originBlocked = originHex?.unit && originHex.unit.id !== supplyUnit.id;
    const destBlocked = destHex?.unit && destHex.unit.id !== supplyUnit.id;

    if (originBlocked && !destBlocked) {
      origin = cityB;
      destination = cityA;
    } else if (originBlocked && destBlocked) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Ambas ciudades estan ocupadas.');
      return;
    }

    if (supplyUnit.r !== origin.r || supplyUnit.c !== origin.c) {
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Moviendo columna a ciudad origen (${origin.r},${origin.c})`);
      this._requestMoveUnit(supplyUnit, origin.r, origin.c);
    }

    console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] PASO 4: estableciendo ruta: ${origin.name} -> ${destination.name}`);
    this._requestEstablishTradeRoute(supplyUnit, origin, destination, infraPath);
  }
};

window.IAArchipielago = IAArchipielago;
console.log('[IA_ARCHIPIELAGO] Asignado a window.IAArchipielago:', typeof window.IAArchipielago, window.IAArchipielago);
