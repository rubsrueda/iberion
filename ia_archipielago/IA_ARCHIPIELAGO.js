// IA_ARCHIPIELAGO.js - PARTE 1 DE 5: NÚCLEO, METAS Y CONSTRUCCIÓN REAL
// Lógica completa sin recortes.

const IAArchipielago = {
  ARCHI_LOG_VERBOSE: true,
  ARCHI_LOG_ROUTE_LIMIT: 3,
  BARBARIAN_CONQUEST_RATIO: 2.2,
  INVADER_FORTRESS_MIN_DISTANCE: 6,
  HUNT_SMALL_DIVISIONS_TARGET: 3,
  BIG_ENEMY_DIVISION_THRESHOLD: 12,
  HEAVY_DIVISION_TARGET: 20,
  WORM_MIN_SPLIT_REGIMENTS: 2,
  WORM_MAX_ACTIONS_PER_TURN: 8,
  CUT_SUPPLY_MAX_TARGETS: 5,

  deployUnitsAI(myPlayer) {
    if (gameState.currentPhase !== 'deployment') return;
    if (typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
      AiDeploymentManager.deployUnitsAI(myPlayer);
    }
    const unidadesIA = IASentidos?.getUnits ? IASentidos.getUnits(myPlayer) : [];
    if (unidadesIA.length === 0) {
      this.crearUnidadInicialDeEmergencia(myPlayer);
    }
  },

  registrarMetaFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals) gameState.iaCompletedGoals = {};
    if (!gameState.iaCompletedGoals[myPlayer]) {
      gameState.iaCompletedGoals[myPlayer] = { ocupacion: [], construccion: [], caravana: [] };
    }
    const goals = gameState.iaCompletedGoals[myPlayer][flujo];
    if (!goals.some(g => g.r === r && g.c === c)) {
      goals.push({ r, c, turno: gameState.turnNumber });
      console.log(`[IA_ARCHIPIELAGO] Meta registrada: ${flujo} en (${r},${c})`);
    }
  },

  isGoalCompletedFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals?.[myPlayer]?.[flujo]) return false;
    return gameState.iaCompletedGoals[myPlayer][flujo].some(g => g.r === r && g.c === c);
  },

  ejecutarTurno(myPlayer) {
    console.log(`\n[IA_ARCHIPIELAGO] ========= TURNO ${gameState.turnNumber} - JUGADOR ${myPlayer} =========`);
    if (typeof IASentidos === 'undefined') return;

    if (!this._turnBuildRetryBlock) this._turnBuildRetryBlock = {};
    this._turnBuildRetryBlock[myPlayer] = { turn: gameState.turnNumber, keys: new Set() };

    const infoTurno = IASentidos.getTurnInfo();
    if (infoTurno.currentPhase !== 'play') return;

    const hexesPropios = IASentidos.getOwnedHexes(myPlayer);
    const ciudades = IASentidos.getCities(myPlayer).filter(c => !this.isGoalCompletedFlujo('ocupacion', c.r, c.c, myPlayer));
    const recursos = hexesPropios.filter(h => h.resourceNode && !this.isGoalCompletedFlujo('ocupacion', h.r, h.c, myPlayer));

    // FLUJO OCUPACIÓN INMEDIATA
    for (const obj of [...ciudades, ...recursos]) {
      if (this._requestMoveOrAttack(obj, obj.r, obj.c)) {
        this.registrarMetaFlujo('ocupacion', obj.r, obj.c, myPlayer);
      }
    }

    const economia = (typeof IAEconomica !== 'undefined') ? IAEconomica.evaluarEconomia(myPlayer) : { oro: 0 };
    const objetivosSiguientes = ciudades.concat(recursos);
    
    const situacion = {
      myPlayer,
      hexesPropios,
      economia,
      ciudades: IASentidos.getCities(myPlayer),
      amenazas: (typeof IATactica !== 'undefined') ? IATactica.detectarAmenazasSobreObjetivos(myPlayer, objetivosSiguientes, 3) : [],
      frente: (typeof IATactica !== 'undefined') ? IATactica.detectarFrente(myPlayer, 2) : [],
      snapshotActividad: this._snapshotTurnActivity(myPlayer)
    };

    situacion.enemyProfile = this._evaluateEnemyExpansionStrategy(myPlayer);

    // Ejecución de Capas Estratégicas (Se inyectan en Partes 2-5)
    if (this._ejecutarCapaEstructuralRed) this._ejecutarCapaEstructuralRed(situacion);
    if (this._procesarEstrategiaVictoria) this._procesarEstrategiaVictoria(situacion);

    this.ejecutarPlanDeAccion(situacion);

    if (this._didMakeProgressThisTurn && !this._didMakeProgressThisTurn(myPlayer, situacion.snapshotActividad)) {
      if (this._ejecutarPlanEmergencia) this._ejecutarPlanEmergencia(situacion);
    }

    if (typeof handleEndTurn === 'function') setTimeout(() => handleEndTurn(), 1500);
    return situacion;
  },

  construirInfraestructura(myPlayer, hexesPropios, economia) {
    const capital = (gameState.cities || []).find(c => c.owner === myPlayer && c.isCapital);
    if (!capital) return;

    const playerRes = gameState.playerResources[myPlayer];
    const piedraActual = playerRes?.piedra || 0;
    const esTurnoVeda = (gameState.turnNumber || 0) < 4;

    // --- PRIORIDAD 1: CAMINOS COMERCIALES (Motor A*) ---
    this._ensureTech(myPlayer, 'ENGINEERING');
    const ciudadesTrade = this._getTradeCityCandidates ? this._getTradeCityCandidates(myPlayer) : [];
    const candidate = this._findBestTradeCityPair ? this._findBestTradeCityPair(ciudadesTrade, myPlayer) : null;
    
    if (candidate && candidate.missingOwnedSegments) {
      for (const hex of candidate.missingOwnedSegments) {
        if (!this._canAffordStructure(myPlayer, 'Camino')) break;
        if (this._requestBuildStructure(myPlayer, hex.r, hex.c, 'Camino')) {
          this.registrarMetaFlujo('construccion', hex.r, hex.c, myPlayer);
        }
      }
    }

    // --- PRIORIDAD 2: FORTALEZAS (Reglas de Veda y Reserva) ---
    if (esTurnoVeda) {
      console.log(`[IA_CONSTRUCCION] Turno ${gameState.turnNumber}: Veda de fortaleza activa.`);
      return;
    }
    if (piedraActual < 500) {
      console.log(`[IA_CONSTRUCCION] Reserva de Piedra insuficiente (${piedraActual}/500).`);
      return;
    }

    const existingForts = board.flat().filter(h => h && h.owner === myPlayer && (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla'));
    if (existingForts.length < 1) {
      const fortCandidates = hexesPropios.filter(h => !h.structure && !h.unit && h.terrain !== 'water');
      const scoredSpots = fortCandidates.map(h => {
        let score = 0;
        if (h.terrain === 'mountain' || h.terrain === 'mountains') score += 50;
        if (h.terrain === 'hills') score += 25;
        // PENALIZACIÓN DE LLANURA
        if (['plains', 'grassland', 'pampa', 'field', 'desert'].includes(h.terrain)) score -= 100;
        // BONO POR CONEXIÓN
        if (getHexNeighbors(h.r, h.c).some(n => board[n.r][n.c]?.structure === 'Camino')) score += 30;
        return { h, score };
      });

      const best = scoredSpots.filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0];
      if (best && this._canAffordStructure(myPlayer, 'Fortaleza')) {
        console.log(`[IA_CONSTRUCCION] Construyendo fortaleza estratégica en (${best.h.r},${best.h.c})`);
        this._requestBuildStructure(myPlayer, best.h.r, best.h.c, 'Fortaleza');
      }
    }
  },

  _requestBuildStructure(p, r, c, type) {
    if (this._turnBuildRetryBlock[p].keys.has(`${type}:${r},${c}`)) return false;
    const blocker = getUnitOnHex(r, c);
    if (blocker) {
      if (blocker.player === p && this._scheduleVacateForBlockedBuild) {
        this._scheduleVacateForBlockedBuild(p, blocker, r, c);
      }
      return false;
    }
    if (typeof handleConfirmBuildStructure === 'function') {
      handleConfirmBuildStructure({ playerId: p, r, c, structureType: type });
      const built = board[r][c].structure === type;
      if (!built) this._turnBuildRetryBlock[p].keys.add(`${type}:${r},${c}`);
      return built;
    }
    return false;
  },

  _canAffordStructure(p, type) {
    const data = STRUCTURE_TYPES[type];
    const res = gameState.playerResources[p];
    if (!data || !res) return false;
    return Object.keys(data.cost || {}).every(k => (res[k] || 0) >= data.cost[k]);
  },

  _snapshotTurnActivity(p) {
    const snap = new Map();
    (IASentidos.getUnits(p) || []).forEach(u => snap.set(u.id, { r: u.r, c: u.c, hp: u.currentHealth, moved: u.hasMoved }));
    return snap;
  },

  _didMakeProgressThisTurn(p, oldSnap) {
    const currentUnits = IASentidos.getUnits(p);
    if (currentUnits.length !== oldSnap.size) return true;
    for (const u of currentUnits) {
      const old = oldSnap.get(u.id);
      if (!old || u.r !== old.r || u.c !== old.c || u.hasMoved !== old.moved) return true;
    }
    return false;
  },

  _ensureTech(p, id) {
    const res = gameState.playerResources[p];
    if (!res || res.researchedTechnologies?.includes(id)) return true;
    const t = TECHNOLOGY_TREE_DATA[id];
    if (t && Object.keys(t.cost || {}).every(k => (res[k] || 0) >= t.cost[k])) {
        if (typeof _executeResearch === 'function') return _executeResearch(id, p);
    }
    return false;
  }
};

// IA_ARCHIPIELAGO.js - PARTE 2 DE 5: TÁCTICA MILITAR Y COMBATE REAL
// INTEGRA: Perfilado de Enemigo, Maniobras de Envolvimiento y Regla de Poder Relativo (1.3x)

Object.assign(window.IAArchipielago, {

  // --- 1. COORDINADOR DE ACCIÓN TÁCTICA ---
  ejecutarPlanDeAccion(situacion) {
    const { myPlayer, amenazas, frente, economia, hexesPropios, enemyProfile } = situacion;
    
    // Iniciar controladores deterministas (Bootstrap)
    if (this._runDeterministicBootstrapController) this._runDeterministicBootstrapController(situacion);
    
    // Si hay un asedio por fortaleza activo, procesar producción
    if (gameState.aiFortressPressure && gameState.aiFortressPressure[myPlayer]) {
      if (this._pressureProduceForFortress && this._pressureProduceForFortress(myPlayer)) {
          delete gameState.aiFortressPressure[myPlayer];
      }
    }

    let misUnidades = IASentidos.getUnits(myPlayer);
    const isNavalMap = !!gameState.setupTempSettings?.navalMap;
    const hasCrisis = amenazas.length > 0 || frente.length >= 3;

    // A. Gestión de Red Comercial (Si no hay crisis activa)
    if (!hasCrisis) {
      if (this._ejecutarRutaLarga) this._ejecutarRutaLarga(situacion);
      if (this._ejecutarGusanoCorredor) this._ejecutarGusanoCorredor(situacion, { maxActions: this.WORM_MAX_ACTIONS_PER_TURN });
    } else {
      // En crisis mantenemos un avance mínimo del corredor para no bloquear la economía a futuro
      if (this._ejecutarGusanoCorredor) this._ejecutarGusanoCorredor(situacion, { maxActions: 1 });
    }

    // B. Reacción Proactiva al Perfil Enemigo (Guerrilla o Tanque)
    if (enemyProfile.mode === 'spread_small') {
      this._ensureHunterDivisions(myPlayer, enemyProfile.targetRegiments);
    } else if (enemyProfile.mode === 'stack_large') {
      this._ensureHeavyDivisions(myPlayer, enemyProfile.maxRegiments);
    }

    // C. Fases Militares: Fusión, División y Evaluación de Combate
    this.ejecutarFusionesDefensivas(myPlayer, misUnidades, enemyProfile);
    this.ejecutarDivisionesEstrategicas(myPlayer, misUnidades);
    
    // Invasión Naval (Módulo en Parte 3)
    if (isNavalMap && this._pressEnemyHomeIsland) {
      if (this._ensureNavalPresence) this._ensureNavalPresence(myPlayer, economia);
      this._pressEnemyHomeIsland(myPlayer);
    }

    // Conquista de ciudades neutrales (Módulo en Parte 3)
    if (this.conquistarCiudadesBarbaras) this.conquistarCiudadesBarbaras(myPlayer, misUnidades);
    
    // Movimiento y Evaluación Ofensiva Basada en Ratio de Poder
    this.ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion);
    this.ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion);

    // D. Construcción y Comercio
    this.construirInfraestructura(myPlayer, hexesPropios, economia);
    if (situacion.ciudades.length > 0 && this.crearCaravanas) {
      this.crearCaravanas(myPlayer, situacion.ciudades);
    }
  },

  // --- 2. LÓGICA DE COMBATE: ATAQUE, ENVOLVIMIENTO O RETIRADA ---
  ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion) {
    const enemigos = IASentidos.getEnemyUnits(myPlayer);
    for (const enemigo of enemigos) {
      this._evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo);
    }
  },

  _evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo) {
    // Buscar nuestras unidades en un radio de 5 hexágonos respecto al enemigo
    const cercanas = misUnidades.filter(u => hexDistance(u.r, u.c, enemigo.r, enemigo.c) <= 5 && u.currentHealth > 0);
    if (cercanas.length === 0) return;

    const poderNuestro = cercanas.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    const poderEnemigo = enemigo.regiments?.length || 1;
    const ratio = poderNuestro / poderEnemigo;

    console.log(`[IA_TACTICA] Evaluación J${myPlayer} vs Enemigo en (${enemigo.r},${enemigo.c}). Poder: ${poderNuestro} vs ${poderEnemigo} (Ratio: ${ratio.toFixed(2)})`);

    // CASO A: ATAQUE CONCENTRADO (Ventaja absoluta >= 1.3x)
    if (ratio >= 1.3) {
      console.log(`[IA_TACTICA] ⚔️ Ventaja 1.3x. Iniciando ataque concentrado.`);
      this._ejecutarAtaqueConcentrado(myPlayer, cercanas, enemigo);
    } 
    // CASO B: ENVOLVIMIENTO / FLANQUEO (Ratio entre 0.8x y 1.3x)
    else if (ratio >= 0.8) {
      console.log(`[IA_TACTICA] 🔄 Combate equilibrado. Iniciando maniobra de flanqueo.`);
      this._ejecutarEnvolvimiento(myPlayer, cercanas, enemigo);
    } 
    // CASO C: RETIRADA ESTRATÉGICA (Ratio < 0.8x)
    else {
      console.log(`[IA_TACTICA] 🔙 Inferioridad detectada. Retirando unidades.`);
      this._ejecutarRetiradaEstrategica(myPlayer, cercanas, enemigo);
    }
  },

  _ejecutarAtaqueConcentrado(p, nuestras, enemigo) {
    // La división más fuerte lidera el ataque
    const lider = nuestras.sort((a,b) => (b.regiments?.length || 0) - (a.regiments?.length || 0))[0];
    
    // Si hay unidades pequeñas cerca, fusionamos una para reforzar al líder si cabe
    if (nuestras.length >= 2) {
      const apoyo = nuestras.find(u => u.id !== lider.id);
      if ((lider.regiments.length + apoyo.regiments.length) <= MAX_REGIMENTS_PER_DIVISION) {
        if (hexDistance(apoyo, lider) <= 2) {
            this._requestMergeUnits(apoyo, lider);
            console.log(`[IA_TACTICA] Reforzando ataque: ${apoyo.name} -> ${lider.name}`);
        }
      }
    }
    this._requestMoveOrAttack(lider, enemigo.r, enemigo.c);
  },

  _ejecutarEnvolvimiento(p, nuestras, enemigo) {
    // Busca hexágonos adyacentes al enemigo que estén vacíos
    const flancos = getHexNeighbors(enemigo.r, enemigo.c).filter(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit);
    
    for (let i = 0; i < Math.min(nuestras.length, flancos.length); i++) {
      const unidad = nuestras[i];
      const posicion = flancos[i];
      console.log(`[IA_TACTICA] Flanqueando: ${unidad.name} se mueve a (${posicion.r},${posicion.c})`);
      this._requestMoveUnit(unidad, posicion.r, posicion.c);
    }
  },

  _ejecutarRetiradaEstrategica(p, nuestras, enemigo) {
    // Busca la ciudad o fortaleza propia más cercana
    const bases = (gameState.cities || []).filter(c => c.owner === p);
    const fortificaciones = board.flat().filter(h => h && h.owner === p && h.structure === 'Fortaleza');
    const refugios = [...bases, ...fortificaciones];
    
    for (const unit of nuestras) {
      const mejorRefugio = refugios.sort((a,b) => hexDistance(unit, a) - hexDistance(unit, b))[0];
      if (mejorRefugio) {
        console.log(`[IA_TACTICA] Retirando ${unit.name} hacia refugio en (${mejorRefugio.r},${mejorRefugio.c})`);
        this._requestMoveUnit(unit, mejorRefugio.r, mejorRefugio.c);
      } else {
        // Si no hay bases, moverse en dirección opuesta al enemigo
        const neighbors = getHexNeighbors(unit.r, unit.c);
        const escape = neighbors.sort((a,b) => hexDistance(b, enemigo) - hexDistance(a, enemigo))[0];
        if (escape) this._requestMoveUnit(unit, escape.r, escape.c);
      }
    }
  },

  // --- 3. GESTIÓN DE FUSIONES DEFENSIVAS ---
  ejecutarFusionesDefensivas(myPlayer, misUnidades, enemyProfile) {
    if (misUnidades.length < 2) return;
    const targetSize = Math.min(MAX_REGIMENTS_PER_DIVISION, Math.max(12, enemyProfile.maxRegiments));

    for (let i = 0; i < misUnidades.length; i++) {
      const u1 = misUnidades[i];
      if (this._isCorridorPioneer && this._isCorridorPioneer(u1)) continue;
      if (u1.regiments.length >= targetSize) continue;

      const cercana = misUnidades.find(u2 => 
        u1.id !== u2.id && 
        hexDistance(u1.r, u1.c, u2.r, u2.c) <= 2 &&
        (u1.regiments.length + u2.regiments.length) <= MAX_REGIMENTS_PER_DIVISION
      );

      if (cercana) {
        console.log(`[IA_TACTICA] Fusionando para defensa: ${u1.name} + ${cercana.name}`);
        this._requestMergeUnits(cercana, u1);
        break; 
      }
    }
  },

  // --- 4. GESTIÓN DE DIVISIONES ESTRATÉGICAS ---
  ejecutarDivisionesEstrategicas(myPlayer, misUnidades) {
    for (const unit of misUnidades) {
      // Dividir unidades pesadas (> 4) para ocupar más nodos si no están bajo fuego
      if (unit.regiments.length <= 4 || unit.iaExpeditionTarget || unit.hasMoved) continue;

      const spot = getHexNeighbors(unit.r, unit.c).find(n => 
        board[n.r]?.[n.c] && !board[n.r][n.c].unit && board[n.r][n.c].terrain !== 'water'
      );

      if (spot) {
        const mitad = Math.ceil(unit.regiments.length / 2);
        gameState.preparingAction = { 
          type: 'split_unit', unitId: unit.id, 
          newUnitRegiments: unit.regiments.slice(0, mitad), 
          remainingOriginalRegiments: unit.regiments.slice(mitad) 
        };
        console.log(`[IA_TACTICA] División de expansión: ${unit.name} crea división en (${spot.r},${spot.c})`);
        this._requestSplitUnit(unit, spot.r, spot.c);
      }
    }
  },

  // --- 5. MOVIMIENTOS TÁCTICOS PRIORIZADOS ---
  ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion) {
    const { amenazas, recursos, enemyProfile } = situacion;
    const enemyUnits = IASentidos.getEnemyUnits(myPlayer);

    for (const unit of misUnidades) {
      if (unit.hasMoved || unit.iaExpeditionTarget || !unit.currentMovement) continue;

      let objetivo = null;

      // 1. Exploradores: Buscar ruinas no saqueadas
      if (unit.regiments.some(r => r.type === 'Explorador')) {
        const ruins = this._getUnexploredRuins ? this._getUnexploredRuins() : [];
        objetivo = this._pickObjective(ruins, unit, myPlayer);
      }

      // 2. Si el enemigo es disperso (guerrilla), buscar unidades enemigas de 1-2 regimientos
      if (!objetivo && enemyProfile.mode === 'spread_small') {
        const preys = enemyUnits.filter(e => e.regiments.length <= 2);
        objetivo = this._pickObjective(preys, unit, myPlayer);
      }

      // 3. Capturar recursos o acudir a puntos de amenaza
      if (!objetivo) {
        const pool = amenazas.length > 0 ? amenazas : recursos;
        objetivo = this._pickObjective(pool, unit, myPlayer);
      }

      if (objetivo) {
        this._requestMoveOrAttack(unit, objetivo.r, objetivo.c);
      }
    }
  },

  // --- 6. PERFILADO DE ESTRATEGIA ENEMIGA ---
  _evaluateEnemyExpansionStrategy(myPlayer) {
    const enemyId = this._getEnemyPlayerId(myPlayer);
    const eUnits = IASentidos.getUnits(enemyId) || [];
    if (eUnits.length === 0) return { mode: 'normal', maxRegiments: 0 };

    const totalRegs = eUnits.reduce((s, u) => s + u.regiments.length, 0);
    const avgSize = totalRegs / eUnits.length;
    const maxRegs = Math.max(...eUnits.map(u => u.regiments.length));

    // Si tiene unidades de más de 12 regimientos -> stack_large (Tanques)
    if (maxRegs >= this.BIG_ENEMY_DIVISION_THRESHOLD) return { mode: 'stack_large', maxRegiments: maxRegs };
    // Si tiene muchas unidades de 1-2 regimientos -> spread_small (Guerrilla)
    if (avgSize <= 2.2) return { mode: 'spread_small', maxRegiments: maxRegs, targetRegiments: 4 };

    return { mode: 'mixed', maxRegiments: maxRegs, targetRegiments: 6 };
  },

  _ensureHunterDivisions(myPlayer, targetRegs) {
    const hunters = IASentidos.getUnits(myPlayer).filter(u => u.regiments.length >= 3 && u.regiments.length <= 6);
    if (hunters.length < this.HUNT_SMALL_DIVISIONS_TARGET) {
      if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
          AiGameplayManager.produceUnit(myPlayer, ['Infantería Ligera', 'Infantería Ligera', 'Arqueros'], 'attacker', 'Cazador IA');
      }
    }
  },

  _ensureHeavyDivisions(myPlayer, maxEnemyRegs) {
    const units = IASentidos.getUnits(myPlayer);
    const heavy = units.find(u => u.regiments.length >= this.HEAVY_DIVISION_TARGET);
    if (!heavy && units.length >= 2) {
      const sorted = units.sort((a,b) => b.regiments.length - a.regiments.length);
      // Forzar reunión de las dos divisiones más fuertes si están a distancia de marcha (4)
      if (hexDistance(sorted[0], sorted[1]) <= 4) {
          this._requestMoveUnit(sorted[1], sorted[0].r, sorted[0].c);
          this._requestMergeUnits(sorted[1], sorted[0]);
      }
    }
  },

  // --- 7. MÉTODOS DE SOPORTE ---
  _pickObjective(list, unit, myPlayer) {
    if (!list || list.length === 0) return null;
    return list.sort((a, b) => hexDistance(unit, a) - hexDistance(unit, b))[0];
  },

  _getUnexploredRuins() {
    const ruins = [];
    board.forEach(row => row.forEach(hex => {
      if (hex?.feature === 'ruins' && !hex.looted) ruins.push(hex);
    }));
    return ruins;
  },

  _requestMergeUnits(u1, u2) { if (typeof RequestMergeUnits === 'function') { RequestMergeUnits(u1, u2, true); return true; } return false; },
  _requestSplitUnit(u, r, c) { if (typeof RequestSplitUnit === 'function') { RequestSplitUnit(u, r, c); return true; } return false; },
  _getEnemyPlayerId(p) { return units.find(u => u.player !== p && u.player > 0)?.player || 1; },
  _isCorridorPioneer(u) { return (u.name || '').includes('Pionero') || (u.name || '').includes('Suministro'); },

// IA_EXPANSION.js - PARTE 3 DE 5
// INTEGRA: Conquista de Ciudades Bárbaras, Detección de Islas (Flood Fill) y Logística Naval de Invasión.

  // --- 1. COORDINADOR DE EXPANSIÓN Y LOGÍSTICA NAVAL ---
  ejecutarExpansionYNaval(situacion, misUnidades) {
    const { myPlayer, economia } = situacion;
    const isNavalMap = !!gameState.setupTempSettings?.navalMap;

    // A. Conquista de ciudades neutrales (Bárbaras)
    // Buscamos expandir el territorio antes de asaltar al jugador humano.
    this.conquistarCiudadesBarbaras(myPlayer, misUnidades);

    // B. Gestión de Invasión Ultramar (Solo en mapas de Archipiélago)
    if (isNavalMap) {
      console.log(`[IA_EXPANSION] Mapa de islas detectado. Iniciando protocolos de invasión naval.`);
      this._ensureNavalPresence(myPlayer, economia);
      this._pressEnemyHomeIsland(myPlayer);
    }
  },

  // --- 2. CONQUISTA BÁRBARA (EXPEDICIONES) ---
  conquistarCiudadesBarbaras(myPlayer, misUnidades) {
    const ciudadesBarbaras = (gameState.cities || []).filter(c => 
      c.owner === null || c.owner === 9 || c.isBarbarianCity || c.isBarbaric
    );
    if (ciudadesBarbaras.length === 0) return;

    // Seleccionamos la ciudad más atractiva (Balance entre guarnición y distancia)
    const targetCity = ciudadesBarbaras.sort((a, b) => {
      const distA = this._minUnitDistance(myPlayer, a);
      const distB = this._minUnitDistance(myPlayer, b);
      return distA - distB;
    })[0];

    // Cálculo de poder necesario: (Guarnición de la ciudad * Ratio de Conquista)
    const requiredPower = Math.ceil((targetCity.garrison?.length || 4) * this.BARBARIAN_CONQUEST_RATIO);
    const expedicion = this._selectExpeditionUnits(myPlayer, targetCity, requiredPower);
    
    const powerActual = expedicion.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);

    if (powerActual >= requiredPower) {
      console.log(`[IA_EXPANSION] Lanzando expedición contra ciudad bárbara en (${targetCity.r},${targetCity.c}) con poder ${powerActual}/${requiredPower}`);
      for (const unit of expedicion) {
          unit.iaExpeditionTarget = `${targetCity.r},${targetCity.c}`;
          this._requestMoveOrAttack(unit, targetCity.r, targetCity.c);
      }
    } else {
        // Si no hay poder suficiente, el Grupo 2 (Táctica) se encargará de producir unidades pesadas
        console.log(`[IA_EXPANSION] Poder insuficiente para asediar (${targetCity.r},${targetCity.c}). Requerido: ${requiredPower}`);
    }
  },

  // --- 3. MOTOR DE INVASIÓN NAVAL (ASEDIO DE ISLAS) ---
  _pressEnemyHomeIsland(myPlayer) {
    const enemyId = this._getEnemyPlayerId(myPlayer);
    const enemyCapital = (gameState.cities || []).find(c => c.owner === enemyId && c.isCapital);
    if (!enemyCapital) return false;

    // REGLA: Detectar la masa de tierra (isla) donde reside el enemigo mediante Flood Fill
    const enemyLandmass = this._getLandmassFromHex(enemyCapital.r, enemyCapital.c);
    
    // Verificar si ya tenemos una cabeza de playa propia en esa isla
    const basePropiaEnIslaEnemiga = board.flat().find(h => 
      h && h.owner === myPlayer && enemyLandmass.has(`${h.r},${h.c}`)
    );
    
    if (basePropiaEnIslaEnemiga) {
      // Si ya desembarcamos, priorizamos construir una fortaleza de presión cerca de su capital
      console.log(`[IA_NAVAL] Posición establecida en isla enemiga. Iniciando asedio terrestre.`);
      return this._buildPressureFortressOnEnemyIsland(myPlayer, enemyLandmass, enemyCapital);
    }

    // Si no estamos en la isla, buscamos transporte naval
    let transport = this._findTransportShip(myPlayer);
    if (!transport) {
      console.log(`[IA_NAVAL] No se detecta transporte. Solicitando creación de flota.`);
      return !!this._createTransportShip(myPlayer);
    }

    // Localizar el punto de desembarco óptimo (Scoring de costa)
    const landing = this._findEnemyLandingTarget(enemyLandmass, enemyCapital);
    if (!landing) return false;

    // Lógica de Embarque: Si el transporte no lleva soldados, cargamos una división de tierra cercana
    const tieneTropasTierra = transport.regiments.some(r => !REGIMENT_TYPES[r.type]?.is_naval);
    if (!tieneSoldadosTierra) {
      const candidato = this._selectEmbarkUnit(myPlayer, transport);
      if (candidato) {
        console.log(`[IA_NAVAL] Cargando división ${candidato.name} en ${transport.name} para invasión.`);
        return this._requestMergeUnits(candidato, transport);
      }
    }

    // Movimiento: Navegar hacia la costa o ejecutar el desembarco (split_unit)
    if (transport.r === landing.water.r && transport.c === landing.water.c) {
      console.log(`[IA_NAVAL] ¡Playa alcanzada en (${landing.land.r},${landing.land.c})! Desembarcando tropas.`);
      return this._requestDisembark(transport, landing.land);
    }
    
    return this._requestMoveUnit(transport, landing.water.r, landing.water.c);
  },

  // --- 4. ESCANEO GEOMÉTRICO DE COSTAS (SCORING) ---
  _findEnemyLandingTarget(enemyLandmass, enemyCapital) {
    let bestSpot = null;
    let maxScore = -9999;

    for (const hexKey of enemyLandmass) {
      const [r, c] = hexKey.split(',').map(Number);
      const hex = board[r][c];
      if (hex.unit || hex.structure) continue; // No desembarcar sobre obstáculos

      // Debe haber agua adyacente para que el transporte pueda atracar
      const waterNeighbor = getHexNeighbors(r, c).find(n => 
        board[n.r]?.[n.c]?.terrain === 'water' && !board[n.r][n.c].unit
      );
      if (!waterNeighbor) continue;

      // Puntuación estratégica: Cercanía a capital enemiga + bono defensivo del terreno
      const distToCapital = hexDistance({r, c}, enemyCapital);
      let score = 100 - (distToCapital * 6); 

      // Preferir montañas o colinas para asegurar la supervivencia de la primera división
      if (hex.terrain === 'mountain') score += 50;
      if (hex.terrain === 'hills') score += 25;
      if (hex.terrain === 'forest') score += 15;

      if (score > maxScore) {
        maxScore = score;
        bestSpot = { land: {r, c}, water: waterNeighbor };
      }
    }
    return bestSpot;
  },

  // --- 5. LOGICA DE DESEMBARCO (SPLIT UNIT) ---
  _requestDisembark(transport, landHex) {
    if (!transport || !landHex) return false;
    
    // Separar regimientos de tierra de los marineros
    const landRegs = transport.regiments.filter(r => !REGIMENT_TYPES[r.type]?.is_naval);
    const navalRegs = transport.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_naval);
    
    if (landRegs.length > 0) {
      gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: transport.id, 
        newUnitRegiments: landRegs, 
        remainingOriginalRegiments: navalRegs 
      };
      console.log(`[IA_NAVAL] Ejecutando comando de desembarco táctico en (${landHex.r},${landHex.c})`);
      return this._requestSplitUnit(transport, landHex.r, landHex.c);
    }
    return false;
  },

  // --- 6. DETECCIÓN DE ISLAS (BFS FLOOD FILL) ---
  _getLandmassFromHex(startR, startC) {
    const landmass = new Set();
    const queue = [{r: startR, c: startC}];
    
    while (queue.length > 0) {
      const curr = queue.shift();
      const key = `${curr.r},${curr.c}`;
      if (landmass.has(key)) continue;

      const hex = board[curr.r]?.[curr.c];
      if (hex && hex.terrain !== 'water') {
        landmass.add(key);
        queue.push(...getHexNeighbors(curr.r, curr.c));
      }
    }
    return landmass;
  },

  // --- 7. MOTOR DE CAMINOS A* (OPTIMIZACIÓN DE RED COMERCIAL) ---
  // Este motor busca la ruta más eficiente hacia la Banca evitando el agua.
  _findRoadBuildPath({ myPlayer, start, goal }) {
    const queue = [{ r: start.r, c: start.c, path: [], cost: 0 }];
    const visited = new Set();
    const target = { r: goal.r, c: goal.c };

    while (queue.length > 0) {
      // Ordenar por F = Coste real (G) + Distancia estimada (H)
      queue.sort((a, b) => (a.cost + hexDistance(a, target)) - (b.cost + hexDistance(b, target)));
      
      const curr = queue.shift();
      const key = `${curr.r},${curr.c}`;

      if (curr.r === target.r && curr.c === target.c) return curr.path;
      if (visited.has(key)) continue;
      visited.add(key);

      for (const neighbor of getHexNeighbors(curr.r, curr.c)) {
        const hex = board[neighbor.r]?.[neighbor.c];
        if (!hex || hex.terrain === 'water') continue;
        
        // Priorizar tierras propias o neutrales (Evitar invasión de tierras enemigas solo para un camino)
        if (hex.owner !== myPlayer && hex.owner !== null) continue;

        queue.push({
          r: neighbor.r, c: neighbor.c,
          path: [...curr.path, neighbor],
          cost: curr.cost + 1
        });
      }
    }
    return null;
  },

  // --- HELPERS ESTRATÉGICOS ---
  _findBestTradeCityPair(ciudades, myPlayer) {
    const banca = ciudades.find(c => c.isBank || c.owner === 0);
    const propias = ciudades.filter(c => c.owner === myPlayer);
    if (!banca || propias.length === 0) return null;

    // Evaluamos qué ciudad propia tiene el camino más corto a la Banca usando A*
    const candidatas = propias.map(p => {
        const path = this._findRoadBuildPath({ myPlayer, start: p, goal: banca });
        return { city: p, path: path, length: path ? path.length : 999 };
    }).filter(x => x.path !== null).sort((a, b) => a.length - b.length);

    if (candidatas.length > 0) {
        const mejor = candidatas[0];
        return {
            cityA: mejor.city,
            cityB: banca,
            missingOwnedSegments: mejor.path.filter(s => board[s.r][s.c].owner === myPlayer && !board[s.r][s.c].structure)
        };
    }
    return null;
  },

  _findTransportShip(p) {
    return units.find(u => 
      u.player === p && 
      u.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval && (REGIMENT_TYPES[r.type]?.transportCapacity || 0) > 0)
    );
  },

  _createTransportShip(p) {
    const res = gameState.playerResources[p];
    // Priorizamos Barco de Guerra como transporte por su defensa
    if (res.oro >= 600 && typeof AiGameplayManager !== 'undefined') {
        return AiGameplayManager.produceUnit(p, ['Barco de Guerra'], 'navy', 'Transporte de Invasión');
    }
    return null;
  },

  _selectEmbarkUnit(p, transport) {
    const cap = Math.max(0, ...transport.regiments.map(r => REGIMENT_TYPES[r.type]?.transportCapacity || 0));
    return IASentidos.getUnits(p).find(u => 
        this._isLandUnit(u) && u.regiments.length <= cap && !u.hasMoved && !u.iaExpeditionTarget
    );
  },

  _buildPressureFortressOnEnemyIsland(p, landmass, capital) {
      const ownInIsland = IASentidos.getOwnedHexes(p).filter(h => landmass.has(`${h.r},${h.c}`));
      const bestSpot = ownInIsland.sort((a, b) => hexDistance(a, capital) - hexDistance(b, capital))[0];
      if (bestSpot && hexDistance(bestSpot, capital) <= 5 && this._canAffordStructure(p, 'Fortaleza')) {
          console.log(`[IA_NAVAL] Asegurando territorio en isla enemiga con Fortaleza en (${bestSpot.r},${bestSpot.c})`);
          return this._requestBuildStructure(p, bestSpot.r, bestSpot.c, 'Fortaleza');
      }
      return false;
  },

// IA_ESTRATEGIA.js - PARTE 4 DE 5
// INTEGRA: Sistema de Puntuación de 10 Rutas de Victoria y Lógica de Decisión de Alto Nivel.

  // --- 1. COORDINADOR DE ESTRATEGIA ALTA ---
  _procesarEstrategiaVictoria(situacion) {
    const { myPlayer } = situacion;
    const rutas = this._evaluarRutasDeVictoria(situacion);
    
    if (!rutas || rutas.length === 0) return;

    // La ruta con el peso (weight) más alto define qué tipo de comportamiento prioriza la IA este turno.
    const rutaGanadora = rutas[0];
    
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`[IA_ESTRATEGIA] Evaluando prioridades. Ganadora: ${rutaGanadora.label} (Peso: ${rutaGanadora.weight.toFixed(1)})`);
    }

    if (rutaGanadora.canExecute) {
      this._ejecutarAccionPorRuta(rutaGanadora, situacion);
    }
  },

  // --- 2. EL MOTOR DE PUNTUACIÓN (SCORING) DE LAS 10 RUTAS ---
  _evaluarRutasDeVictoria(situacion) {
    const { myPlayer, economia } = situacion;
    const m = this._collectVictoryMetrics(myPlayer);
    const holders = gameState.victoryPoints?.holders || {};
    const rutas = [];

    // RUTA 1: EL EMPERADOR (Dominio de Ciudades)
    const totalCitiesMap = gameState.cities?.length || 10;
    const citiesNeeded = Math.max(0, Math.ceil(totalCitiesMap * 0.6) - m.cities);
    rutas.push({
      id: 'ruta_emperador', label: 'Emperador',
      weight: 150 + (citiesNeeded * 55), // Sube drásticamente si faltan muchas ciudades
      canExecute: citiesNeeded > 0
    });

    // RUTA 2: GRAN ARQUEÓLOGO (Exploración de Ruinas)
    const ruins = this._getUnexploredRuins ? this._getUnexploredRuins() : [];
    let archWeight = 110 + (ruins.length * 30);
    // Si ya somos líderes en ruinas, bajamos la prioridad para centrarnos en otros frentes
    if (holders.mostRuins === `player${myPlayer}`) archWeight *= 0.6; 
    rutas.push({
      id: 'ruta_gran_arqueologo', label: 'Arqueólogo',
      weight: archWeight,
      canExecute: ruins.length > 0
    });

    // RUTA 3: MÁS RIQUEZA (Tesoro y Banca)
    let wealthWeight = 120;
    if (economia.oro < 600) wealthWeight += 180; // Prioridad crítica si no hay dinero
    if (holders.mostResources === `player${myPlayer}`) wealthWeight -= 50;
    rutas.push({
      id: 'ruta_mas_riqueza', label: 'Banquero',
      weight: wealthWeight,
      canExecute: true
    });

    // RUTA 4: ALMIRANTE SUPREMO (Poder Naval)
    const isNaval = !!gameState.setupTempSettings?.navalMap;
    rutas.push({
      id: 'ruta_almirante_supremo', label: 'Almirante',
      weight: isNaval ? (180 + (m.killsNavales * 25)) : 0,
      canExecute: isNaval
    });

    // RUTA 5: ANIQUILACIÓN (Eliminar al Jugador Humano)
    const powerRatio = this._estimateLocalPowerRatio(myPlayer, {r:0, c:0}, 99);
    rutas.push({
      id: 'ruta_aniquilacion', label: 'Aniquilador',
      weight: powerRatio > 1.3 ? 240 : 40,
      canExecute: powerRatio > 1.1
    });

    // RUTA 6: EJÉRCITO GRANDE (Militarismo Masivo)
    rutas.push({
      id: 'ruta_ejercito_grande', label: 'Militarista',
      weight: m.totalRegiments < 18 ? 170 : 70,
      canExecute: true
    });

    // RUTA 7: MÁS AVANCES (Ciencia)
    rutas.push({
      id: 'ruta_mas_avances', label: 'Sabio',
      weight: 100 + (m.techs * 12),
      canExecute: true
    });

    // RUTA 8: MÁS HÉROES (Liderazgo)
    rutas.push({
      id: 'ruta_mas_heroes', label: 'Legendario',
      weight: m.heroes < 2 ? 130 : 50,
      canExecute: true
    });

    // RUTA 9: CONQUISTADOR BÁRBARO (Expansión Neutral)
    const barbs = this._getBarbarianCities ? this._getBarbarianCities() : [];
    rutas.push({
      id: 'ruta_conquistador_barbaro', label: 'Conquistador',
      weight: barbs.length > 0 ? 160 : 0,
      canExecute: barbs.length > 0
    });

    // RUTA 10: LA GLORIA (Puntos de Victoria Directos)
    const vp = gameState.victoryPoints?.[`player${myPlayer}`] || 0;
    rutas.push({
      id: 'ruta_gloria', label: 'Glorioso',
      weight: 140 + (vp * 8),
      canExecute: true
    });

    // Ordenar de mayor a menor peso para obtener la prioridad actual
    return rutas.sort((a, b) => b.weight - a.weight);
  },

  // --- 3. ACCIONES ESPECÍFICAS SEGÚN LA ESTRATEGIA ---
  _ejecutarAccionPorRuta(ruta, situacion) {
    const { myPlayer, economia } = situacion;

    switch (ruta.id) {
      case 'ruta_mas_riqueza':
        // Forzar prioridad a la Banca y Caravanas (Segmento 5)
        if (this.crearCaravanas) this.crearCaravanas(myPlayer, situacion.ciudades);
        break;

      case 'ruta_gran_arqueologo':
        // Si no hay explorador, intentar reclutar uno inmediatamente
        const unitConExplorador = IASentidos.getUnits(myPlayer).find(u => u.regiments.some(r => r.type === 'Explorador'));
        if (!unitConExplorador && economia.oro >= 250) {
            this._producirDivisiones(myPlayer, 1, 1, 'Explorador');
        }
        break;

      case 'ruta_ejercito_grande':
        // Si el objetivo es militar, producir una división estándar de refuerzo
        if (economia.oro >= 500) {
            this._producirDivisiones(myPlayer, 1, 4);
        }
        break;

      case 'ruta_emperador':
      case 'ruta_conquistador_barbaro':
        // Forzar al sistema de expansión a buscar objetivos neutrales (Segmento 3)
        if (this.conquistarCiudadesBarbaras) this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
        break;

      case 'ruta_mas_avances':
        // Invertir puntos de investigación si el módulo existe
        this._investResearch(myPlayer, ['ARCHITECTURE', 'PHILOSOPHY', 'MATHEMATICS'], 1);
        break;
        
      case 'ruta_almirante_supremo':
        if (this._ensureNavalPresence) this._ensureNavalPresence(myPlayer, economia);
        break;
    }
  },

  // --- 4. BOOTSTRAP DETERMINISTA (PLAN DE APERTURA TURNOS 1-3) ---
  // Evita que la IA dude al principio: va directo a capturar nodos de recursos.
  _runDeterministicBootstrapController(situacion) {
    const { myPlayer } = situacion;
    if (gameState.turnNumber > 3) return;

    console.log(`[IA_ESTRATEGIA] Modo Bootstrap: Asegurando recursos críticos.`);
    
    const misUnidades = IASentidos.getUnits(myPlayer).filter(u => !u.hasMoved);
    const recursosLibres = board.flat().filter(h => h && h.resourceNode && h.owner === null);

    for (const unit of misUnidades) {
      const meta = this._pickObjective(recursosLibres, unit, myPlayer);
      if (meta) {
        console.log(`[IA_BOOTSTRAP] ${unit.name} enviado a capturar nodo en (${meta.r},${meta.c})`);
        this._requestMoveOrAttack(unit, meta.r, meta.c);
      }
    }
  },

  // --- 5. RECOPILADOR DE MÉTRICAS (DATOS REALES) ---
  _collectVictoryMetrics(p) {
    const pKey = `player${p}`;
    const res = gameState.playerResources?.[p] || {};
    const stats = gameState.playerStats || {};
    const myUnits = IASentidos.getUnits(p);

    return {
      cities: board.flat().filter(h => h && h.owner === p && (h.isCity || h.structure === 'Aldea')).length,
      totalRegiments: myUnits.reduce((s, u) => s + (u.regiments?.length || 0), 0),
      techs: res.researchedTechnologies?.length || 0,
      kills: stats.unitsDestroyed?.[pKey] || 0,
      killsNavales: stats.navalVictories?.[pKey] || 0,
      heroes: myUnits.filter(u => u.commander).length,
      oro: res.oro || 0
    };
  },

// IA_COMERCIO.js - PARTE 5 DE 5
// INTEGRA: Sistema de Caravanas, Algoritmo de Gusano Corredor y Logística de Suministros.

  // --- 1. GESTIÓN DE CARAVANAS (INGRESOS PASIVOS) ---
  crearCaravanas(myPlayer, ciudades) {
    const tradeCities = ciudades.filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));
    if (tradeCities.length < 2) return;

    // A. Buscar unidad disponible con capacidad de suministro (Columna o Caravana)
    let trader = units.find(u => u.player === myPlayer && !u.tradeRoute && 
      u.regiments.some(r => (REGIMENT_TYPES[r.type].abilities || []).includes('provide_supply')));

    // B. Si no existe la unidad, intentar reclutarla si hay oro suficiente
    if (!trader) {
      const res = gameState.playerResources[myPlayer];
      if (res.oro >= 300 && res.madera >= 100) {
        console.log(`[IA_COMERCIO] Reclutando Columna de Suministro para activar la red.`);
        this._producirDivisiones(myPlayer, 1, 1, 'Columna de Suministro');
      }
      return;
    }

    // C. Buscar la mejor ruta comercial disponible (Priorizando la Banca)
    const existingKeys = this._getExistingTradeRouteKeys(myPlayer);
    const candidate = this._pickNextTradeRouteCandidate(myPlayer, existingKeys);
    
    if (candidate) {
      console.log(`[IA_COMERCIO] Estableciendo ruta: ${candidate.cityA.name} -> ${candidate.cityB.name}`);
      this._requestEstablishTradeRoute(trader, candidate.cityA, candidate.cityB, candidate.infraPath);
    }
  },

  // --- 2. SELECCIÓN DE RUTA ÓPTIMA ---
  _pickNextTradeRouteCandidate(myPlayer, existingKeys) {
    const cities = this._getTradeCityCandidates(myPlayer);
    const ownCities = cities.filter(c => c.owner === myPlayer);
    const bank = this._getBankCity();
    const tradeCities = cities.filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));

    let bestCandidate = null;
    let minPathLength = 999;

    for (const start of ownCities) {
      for (const end of tradeCities) {
        if (start === end) continue;
        const key = this._getTradePairKey(start, end);
        if (existingKeys.has(key)) continue;

        // Trazar ruta real A* (Definida en Parte 3)
        const path = this._findRoadBuildPath({ myPlayer, start, goal: end });
        if (path) {
          // Bono: Priorizar rutas que conectan con la Banca (owner 0)
          let score = path.length;
          if (end === bank || end.owner === 0) score -= 5; 

          if (score < minPathLength) {
            minPathLength = score;
            bestCandidate = { cityA: start, cityB: end, infraPath: path };
          }
        }
      }
    }
    return bestCandidate;
  },

  // --- 3. LÓGICA DE GUSANO CORREDOR (OCUPAR CAMINOS) ---
  // Esta maniobra usa la división de tropas para ir ocupando los hexágonos del corredor comercial uno a uno.
  _ejecutarGusanoCorredor(situacion, opts = {}) {
    const { myPlayer } = situacion;
    const maxActions = opts.maxActions || this.WORM_MAX_ACTIONS_PER_TURN;
    
    // Obtener los hexágonos que forman parte de la red de caminos planificada
    const plan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    if (plan.length === 0) return 0;

    let actionsDone = 0;
    // Tomamos la ruta comercial más corta pendiente
    const bestRoute = plan[0];

    for (const hexPos of bestRoute.landPath) {
      if (actionsDone >= maxActions) break;

      const unit = this._findClosestUnitToTarget(myPlayer, hexPos);
      if (!unit || unit.hasMoved) continue;

      // Si la unidad tiene más del mínimo para dividir, "estiramos" la unidad ocupando el siguiente hex
      if (unit.regiments.length >= this.WORM_MIN_SPLIT_REGIMENTS) {
        if (this._splitUnitTowardsObjective(unit, hexPos)) {
          actionsDone++;
          console.log(`[IA_CORREDOR] Gusano avanzando mediante división hacia (${hexPos.r},${hexPos.c})`);
        }
      } else {
        // Si no puede dividir, simplemente mueve al hexágono del corredor para asegurar posesión
        if (this._requestMoveOrAttack(unit, hexPos.r, hexPos.c)) {
          actionsDone++;
        }
      }
    }
    return actionsDone;
  },

  // --- 4. MANIOBRA DE DIVISIÓN PARA CORREDORES ---
  _splitUnitTowardsObjective(unit, objective) {
    const neighbors = getHexNeighbors(unit.r, unit.c).sort((a,b) => hexDistance(a, objective) - hexDistance(b, objective));
    const targetHex = neighbors.find(n => board[n.r][n.c] && !board[n.r][n.c].unit && board[n.r][n.c].terrain !== 'water');
    
    if (targetHex) {
      const mitad = Math.ceil(unit.regiments.length / 2);
      gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: unit.id, 
        newUnitRegiments: unit.regiments.slice(0, mitad), 
        remainingOriginalRegiments: unit.regiments.slice(mitad) 
      };
      return this._requestSplitUnit(unit, targetHex.r, targetHex.c);
    }
    return false;
  },

  // --- 5. LÓGICA DE RECLUTAMIENTO DINÁMICO ---
  _producirDivisiones(p, count, size, forcedType = null) {
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.produceUnit) return 0;
    
    const techs = this._getPlayerTechs(p);
    let created = 0;

    for (let i = 0; i < count; i++) {
      let comp = [];
      if (forcedType) {
          comp = Array(size).fill(forcedType);
      } else {
          // Composición inteligente según avances tecnológicos (Hierro, Flechas, Establos)
          const base = techs.includes('IRON_WORKING') ? 'Infantería Pesada' : 'Infantería Ligera';
          comp = Array(size).fill(base);
          if (techs.includes('FLETCHING') && size >= 2) comp[comp.length - 1] = 'Arqueros';
          if (techs.includes('ANIMAL_HUSBANDRY') && size >= 3) comp[0] = 'Caballería Ligera';
      }

      const newUnit = AiGameplayManager.produceUnit(p, comp, 'auto', 'Legión IA');
      if (newUnit) created++;
    }
    return created;
  },

  // --- 6. LOGICA DE COMERCIO LARGO ---
  _ejecutarRutaLarga(situacion) {
    const { myPlayer, ciudades } = situacion;
    const ownCities = ciudades.filter(c => c.owner === myPlayer);
    const bank = this._getBankCity();

    if (ownCities.length >= 1 && bank) {
      const plan = this._findRoadConnection(ownCities[0], bank, myPlayer);
      if (plan && plan.missingOwnedSegments.length === 0) {
          // Si el camino está totalmente construido y es seguro, forzar caravana
          this.crearCaravanas(myPlayer, ciudades);
      }
    }
  },

  // --- 7. MÉTODOS DE APOYO Y COMUNICACIÓN ---
  _getMoveStepTowards(unit, r, c) {
    const path = this._findRoadBuildPath({ myPlayer: unit.player, start: unit, goal: {r, c} });
    return (path && path.length > 0) ? path[0] : null;
  },

  _findClosestUnitToTarget(p, target) {
    const available = IASentidos.getUnits(p).filter(u => u.currentHealth > 0 && !u.hasMoved);
    if (!available.length) return null;
    return available.sort((a,b) => hexDistance(a, target) - hexDistance(b, target))[0];
  },

  _getExistingTradeRouteKeys(p) {
    const keys = new Set();
    units.forEach(u => { 
        if (u.player === p && u.tradeRoute) {
            keys.add(this._getTradePairKey(u.tradeRoute.origin, u.tradeRoute.destination));
        } 
    });
    return keys;
  },

  _getTradePairKey(a, b) { 
    const idA = `${a.r},${a.c}`; 
    const idB = `${b.r},${b.c}`; 
    return [idA, idB].sort().join('|'); 
  },

  _getTradeCityCandidates(p) { 
    return (gameState.cities || []).filter(c => c.owner === p || c.owner === 0 || c.isBank || c.owner === 9); 
  },

  _getBankCity() { 
    return (gameState.cities || []).find(c => c.isBank || c.owner === 0); 
  },

  _isAllowedTradeDestinationForCaravan(c, p) { 
    if (c.owner === p || c.owner === 0 || c.isBank || c.owner === 9) return true;
    if (typeof isTradeBlockedBetweenPlayers === 'function') return !isTradeBlockedBetweenPlayers(p, c.owner);
    return true;
  },

  _requestEstablishTradeRoute(u, a, b, path) { 
    if (typeof _executeEstablishTradeRoute === 'function') {
        _executeEstablishTradeRoute({ unitId: u.id, origin: a, destination: b, path }); 
    }
  },

  _ejecutarCapaEstructuralRed(situacion) {
    const { myPlayer } = situacion;
    if (typeof AiGameplayManager !== 'undefined') {
      if (typeof AiGameplayManager._ensureTradeInfrastructureOrganic === 'function') {
        try { AiGameplayManager._ensureTradeInfrastructureOrganic(myPlayer); } catch (e) {}
      }
      if (typeof AiGameplayManager._ensureCityExpansionOrganic === 'function') {
        try { AiGameplayManager._ensureCityExpansionOrganic(myPlayer); } catch (e) {}
      }
    }
  }

}); // FIN DEL OBJETO IAArchipielago

console.log("[IA_ARCHIPIELAGO] Inteligencia Estratégica Completa. Todos los sistemas operativos.");
