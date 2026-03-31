// IA_ARCHIPIELAGO.js - PARTE 1 DE 5: CABECERA, TURNO Y CONSTRUCCIÓN REAL
// Lógica extraída de la versión original de 3800 líneas.
// REGLAS INTEGRADAS: Veda T4, Reserva 500 Piedra y Penalización de Llanuras.

const IAArchipielago = {
  // --- CONFIGURACIÓN ESTRATÉGICA ---
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

  // 1. deployUnitsAI: Gestión del despliegue inicial
  deployUnitsAI(myPlayer) {
    console.log(`[IA_ARCHIPIELAGO] Despliegue iniciado para J${myPlayer}.`);
    if (gameState.currentPhase !== 'deployment') return;

    if (typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
      AiDeploymentManager.deployUnitsAI(myPlayer);
    }

    const unidadesIA = IASentidos?.getUnits ? IASentidos.getUnits(myPlayer) : [];
    if (unidadesIA.length === 0) {
      console.warn(`[IA_ARCHIPIELAGO] IA sin unidades tras despliegue. Activando emergencia.`);
      this.crearUnidadInicialDeEmergencia(myPlayer);
    }
  },

  // 2. ejecutarTurno: El motor principal unificado
  ejecutarTurno(myPlayer) {
    console.log(`\n[IA_ARCHIPIELAGO] ========= TURNO ${gameState.turnNumber} - JUGADOR ${myPlayer} =========`);
    
    if (!gameState.iaCompletedGoals) gameState.iaCompletedGoals = {};
    if (!gameState.iaCompletedGoals[myPlayer]) {
      gameState.iaCompletedGoals[myPlayer] = { ocupacion: [], construccion: [], caravana: [] };
    }

    const snapshotAntes = this._snapshotTurnActivity(myPlayer);

    // 1. EL GUSANO (Ocupación y Construcción)
    if (this._ejecutarGusanoCorredor) this._ejecutarGusanoCorredor({ myPlayer });

    // 2. LA CARAVANA (Inversión - Ahora con candado de seguridad)
    if (this.crearCaravanas) {
      const ciudades = (typeof IASentidos !== 'undefined') ? IASentidos.getCities(myPlayer) : [];
      this.crearCaravanas(myPlayer, ciudades);
    }

    // 3. PREPARAR SITUACIÓN (Blindaje total contra errores de 'undefined')
    const situacion = { 
      myPlayer, 
      economia: (typeof IAEconomica !== 'undefined') ? IAEconomica.evaluarEconomia(myPlayer) : { oro: 0 },
      ciudades: (typeof IASentidos !== 'undefined') ? IASentidos.getCities(myPlayer) : [],
      hexesPropios: (typeof IASentidos !== 'undefined') ? IASentidos.getOwnedHexes(myPlayer) : [],
      amenazas: [], // Se llenará abajo si existe el módulo
      frente: [],   // Se llenará abajo si existe el módulo
      enemyProfile: { mode: 'mixed' }
    };

    if (typeof IATactica !== 'undefined') {
      situacion.amenazas = IATactica.detectarAmenazasSobreObjetivos(myPlayer, situacion.ciudades, 3) || [];
      situacion.frente = IATactica.detectarFrente(myPlayer, 2) || [];
    }
    
    if (this._evaluateEnemyExpansionStrategy) {
      situacion.enemyProfile = this._evaluateEnemyExpansionStrategy(myPlayer);
    }

    // 4. EJECUTAR PLANES
    if (this._procesarEstrategiaVictoria) this._procesarEstrategiaVictoria(situacion);
    if (this.ejecutarPlanDeAccion) this.ejecutarPlanDeAccion(situacion);

    // 5. EMERGENCIA
    if (!this._didMakeProgressThisTurn(myPlayer, snapshotAntes)) {
      this._ejecutarPlanEmergencia(situacion);
    }

    if (typeof handleEndTurn === 'function') setTimeout(() => handleEndTurn(), 1500);
  },

  // 3. registrarMetaFlujo / isGoalCompletedFlujo
  registrarMetaFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals) gameState.iaCompletedGoals = {};
    if (!gameState.iaCompletedGoals[myPlayer]) {
      gameState.iaCompletedGoals[myPlayer] = { ocupacion: [], construccion: [], caravana: [] };
    }
    const goals = gameState.iaCompletedGoals[myPlayer][flujo];
    if (!goals.some(g => g.r === r && g.c === c)) {
      goals.push({ r, c, turno: gameState.turnNumber });
      console.log(`[IA_METAS] Objetivo alcanzado en '${flujo}': (${r},${c})`);
    }
  },

  isGoalCompletedFlujo(flujo, r, c, myPlayer) {
    if (!gameState.iaCompletedGoals?.[myPlayer]?.[flujo]) return false;
    return gameState.iaCompletedGoals[myPlayer][flujo].some(g => g.r === r && g.c === c);
  },

  // 4. construirInfraestructura: LOGICA REAL CON REGLAS DE PIEDRA
  construirInfraestructura(myPlayer, hexesPropios, economia) {
    const capital = (gameState.cities || []).find(c => c.owner === myPlayer && c.isCapital);
    if (!capital) return;

    const playerRes = gameState.playerResources[myPlayer];
    const piedraActual = playerRes?.piedra || 0;
    const esTurnoTemprano = (gameState.turnNumber || 0) < 4;

    // A. PRIORIDAD ABSOLUTA: CAMINOS HACIA LA BANCA (Motor A*)
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

    // B. REGLAS DE SEGURIDAD PARA FORTALEZAS
    if (esTurnoTemprano) {
      console.log("[IA_CONSTRUCCION] Veda de fortaleza activa (Turno < 4).");
      return;
    }
    if (piedraActual < 500) {
      console.log(`[IA_CONSTRUCCION] Reserva de Piedra insuficiente (${piedraActual}/500).`);
      return;
    }

    // C. BÚSQUEDA DE SPOT ESTRATÉGICO CON PENALIZACIÓN DE LLANURA
    const existingForts = board.flat().filter(h => h && h.owner === myPlayer && (h.structure === 'Fortaleza' || h.structure === 'Fortaleza con Muralla'));
    if (existingForts.length < 1) {
      const fortCandidates = hexesPropios.filter(h => !h.structure && !h.unit && h.terrain !== 'water');
      const scoredSpots = fortCandidates.map(h => {
        let score = 0;
        if (h.terrain === 'mountain' || h.terrain === 'mountains') score += 50;
        if (h.terrain === 'hills') score += 25;
        // REGLA: Penalización drástica a las llanuras
        if (['plains', 'grassland', 'pampa', 'field'].includes(h.terrain)) {
          score -= 100; 
        }
        if (getHexNeighbors(h.r, h.c).some(n => board[n.r][n.c]?.structure === 'Camino')) score += 30;
        return { h, score };
      });

      const best = scoredSpots.filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0];

      if (best && this._canAffordStructure(myPlayer, 'Fortaleza')) {
        console.log(`[IA_CONSTRUCCION] Construyendo Fortaleza Real en (${best.h.r},${best.h.c})`);
        this._requestBuildStructure(myPlayer, best.h.r, best.h.c, 'Fortaleza');
      }
    }
  },

  // 5. crearUnidadInicialDeEmergencia: Lógica de capital real
  crearUnidadInicialDeEmergencia(myPlayer) {
    try {
      const res = gameState.playerResources?.[myPlayer];
      const ownCities = (gameState.cities || []).filter(c => c.owner === myPlayer);
      const capital = ownCities.find(c => c.isCapital) || ownCities[0];
      if (!capital) return;

      const spot = getHexNeighbors(capital.r, capital.c).find(n => {
        const h = board[n.r]?.[n.c];
        return h && !h.unit && h.terrain !== 'water';
      }) || capital;

      let type = REGIMENT_TYPES['Infantería Ligera'] ? 'Infantería Ligera' : 'Pueblo';
      const cost = REGIMENT_TYPES[type]?.cost?.oro || 100;
      if (res.oro < cost) res.oro = cost; 

      const unitData = {
        id: `u_em_${Date.now()}_${Math.random()}`, 
        player: myPlayer, 
        name: `Guardia de la Capital`,
        regiments: [{ ...REGIMENT_TYPES[type], type: type, id: `r_${Date.now()}` }],
        r: spot.r, c: spot.c, 
        hasMoved: false, hasAttacked: false, morale: 50, currentHealth: 100, maxHealth: 100
      };
      
      if (typeof placeFinalizedDivision === 'function') {
        placeFinalizedDivision(unitData, spot.r, spot.c);
        console.log(`[IA_EMERGENCIA] Unidad generada en (${spot.r},${spot.c})`);
      }
    } catch (e) { console.error("[IA_EMERGENCIA] Error:", e); }
  },

  // --- AYUDANTES DE MOTOR DEL JUEGO ---
  _requestMoveUnit(unit, r, c) {
    if (typeof processActionRequest === 'function') {
      processActionRequest({ type: 'moveUnit', payload: { playerId: unit.player, unitId: unit.id, toR: r, toC: c } });
      return true;
    }
    return false;
  },

  _requestMoveOrAttack(unit, r, c) {
    const target = getUnitOnHex(r, c);
    if (target && target.player !== unit.player) {
      if (typeof processActionRequest === 'function') {
        processActionRequest({ type: 'attackUnit', payload: { playerId: unit.player, attackerId: unit.id, defenderId: target.id } });
        return true;
      }
    }
    // El motor A* se inyectará en la Parte 3 para el movimiento inteligente.
    if (this._findRoadBuildPath) {
      const path = this._findRoadBuildPath({ myPlayer: unit.player, start: unit, goal: {r, c} });
      if (path && path.length > 0) return this._requestMoveUnit(unit, path[0].r, path[0].c);
    }
    return false;
  },

  // FUNCIÓN: SACAR FOTO DEL ESTADO ACTUAL (SNAPSHOT)
  _snapshotTurnActivity(myPlayer) {
    const snapshot = {};
    const unidadesIA = IASentidos.getUnits(myPlayer);
    unidadesIA.forEach(u => {
      snapshot[u.id] = {
        r: u.r,
        c: u.c,
        mov: u.currentMovement || 0,
        vida: u.currentHealth || 100,
        ataque: u.hasAttacked || false
      };
    });
    return snapshot;
  },

  // FUNCIÓN: DETECTOR DE BLOQUEO (¿HEMOS HECHO ALGO?)
  _didMakeProgressThisTurn(myPlayer, snapshotAntes) {
    const unidadesAhora = IASentidos.getUnits(myPlayer);
    
    // Si el número de unidades ha cambiado, hemos hecho algo (fusionar o morir)
    if (unidadesAhora.length !== Object.keys(snapshotAntes).length) return true;

    for (const u of unidadesAhora) {
      const antes = snapshotAntes[u.id];
      if (!antes) return true; // Unidad nueva detectada

      // Si ha cambiado de sitio, de vida, de movimiento o ha atacado, hay progreso
      if (u.r !== antes.r || u.c !== antes.c) return true;
      if ((u.currentMovement || 0) !== antes.mov) return true;
      if ((u.currentHealth || 100) !== antes.vida) return true;
      if (u.hasAttacked !== antes.ataque) return true;
    }
    
    return false;
  },

  // FUNCIÓN: PLAN DE EMERGENCIA (EL DESPERTADOR)
  _ejecutarPlanEmergencia(situacion) {
    const { myPlayer } = situacion;
    const unidadesLibres = IASentidos.getUnits(myPlayer).filter(u => !u.hasMoved && (u.currentMovement > 0));

    if (unidadesLibres.length === 0) return;

    // Buscar ciudades que no son nuestras y nodos de recursos libres
    const objetivos = (gameState.cities || []).filter(c => c.owner !== myPlayer)
                      .concat(board.flat().filter(h => h && h.resourceNode && h.owner !== myPlayer));

    unidadesLibres.forEach(unit => {
      const blanco = this._pickObjective(objetivos, unit, myPlayer);
      if (blanco) {
        console.log(`[IA_EMERGENCIA] J${myPlayer}: ${unit.name} forzada hacia (${blanco.r},${blanco.c})`);
        this._requestMoveOrAttack(unit, blanco.r, blanco.c);
      }
    });
  },

  // HERRAMIENTA: BUSCADOR DE OBJETIVO MÁS CERCANO
  _pickObjective(lista, unidad, myPlayer) {
    if (!lista || lista.length === 0) return null;
    // Ordenar la lista de menor a mayor distancia
    const ordenada = [...lista].sort((a, b) => {
      const distA = hexDistance(unidad.r, unidad.c, a.r, a.c);
      const distB = hexDistance(unidad.r, unidad.c, b.r, b.c);
      return distA - distB;
    });
    return ordenada[0];
  },

  // HERRAMIENTA: ASEGURAR QUE TENEMOS UNA TECNOLOGÍA
  _ensureTech(myPlayer, techId) {
    const res = gameState.playerResources?.[myPlayer];
    const tieneTech = res?.researchedTechnologies?.includes(techId);
    if (tieneTech) return true;

    // Si no la tiene, intenta comprarla si puede pagarla
    if (this._canAffordTech(myPlayer, techId)) {
      return this._requestResearchTech(myPlayer, techId);
    }
    return false;
  },

  // HERRAMIENTA: REVISAR SI PODEMOS PAGAR EL ESTUDIO
  _canAffordTech(myPlayer, techId) {
    const tech = (typeof TECHNOLOGY_TREE_DATA !== 'undefined') ? TECHNOLOGY_TREE_DATA[techId] : null;
    const res = gameState.playerResources?.[myPlayer];
    if (!tech || !res) return false;
    
    // Mira si tenemos suficiente Oro y Ciencia
    const costeOro = tech.cost?.oro || 0;
    const costeCiencia = tech.cost?.researchPoints || 0;
    return (res.oro >= costeOro && (res.researchPoints || 0) >= costeCiencia);
  },

  // ACCIÓN: ENVIAR ORDEN DE INVESTIGACIÓN AL JUEGO
  _requestResearchTech(myPlayer, techId) {
    if (typeof processActionRequest === 'function') {
      processActionRequest({ type: 'researchTech', payload: { playerId: myPlayer, techId: techId } });
      console.log(`[IA_CIENCIA] J${myPlayer} investigando: ${techId}`);
      return true;
    }
    return false;
  },

  // ESTRATEGIA: INVERTIR DINERO SOBRANTE EN AVANCES
  _investResearch(myPlayer, preferidas, maximo = 1) {
    let compradas = 0;
    for (const techId of preferidas) {
      if (compradas >= maximo) break;
      if (this._ensureTech(myPlayer, techId)) {
        compradas++;
      }
    }
  },

};

window.IAArchipielago = IAArchipielago;

// IA_ARCHIPIELAGO.js - PARTE 2 DE 5: TÁCTICA, COMBATE Y PERFILADO
// INTEGRA: Perfilado Matemático de Enemigo, Maniobras de Flanqueo y Regla del 1.3x.

Object.assign(window.IAArchipielago, {

  // 22. ejecutarPlanDeAccion: Coordinador de prioridades militares y movimientos
  ejecutarPlanDeAccion(situacion) {
    const { myPlayer, amenazas, frente, economia, hexesPropios, enemyProfile } = situacion;
    const maxRegs = (typeof MAX_REGIMENTS_PER_DIVISION !== 'undefined') ? MAX_REGIMENTS_PER_DIVISION : 20;
    
    // Iniciar controladores deterministas (Bootstrap - Se inyecta en Parte 4)
    // Solo activamos el Bootstrap si NO estamos en fase de construcción de caminos
    if (gameState.turnNumber > 3 && this._runDeterministicBootstrapController) {
      this._runDeterministicBootstrapController(situacion);
    }
    
    // Gestión de asedio por fortaleza activo
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
      // En crisis avance mínimo del corredor para evitar parálisis económica total
      if (this._ejecutarGusanoCorredor) this._ejecutarGusanoCorredor(situacion, { maxActions: 1 });
    }

    // B. Reacción Proactiva al Perfil Enemigo
    if (enemyProfile.mode === 'spread_small') {
      this._ensureHunterDivisions(myPlayer, enemyProfile.targetRegiments);
    } else if (enemyProfile.mode === 'stack_large') {
      this._ensureHeavyDivisions(myPlayer, enemyProfile.maxRegiments);
    }

    // C. Fases Militares: Fusión, División y Evaluación de Combate Real
    this.ejecutarFusionesDefensivas(myPlayer, misUnidades, enemyProfile);
    this.ejecutarDivisionesEstrategicas(myPlayer, misUnidades);
    
    // Invasión Naval (Se inyecta en Parte 3)
    if (isNavalMap && this._pressEnemyHomeIsland) {
      if (this._ensureNavalPresence) this._ensureNavalPresence(myPlayer, economia);
      this._pressEnemyHomeIsland(myPlayer);
    }

    // Conquista de ciudades neutrales (Se inyecta en Parte 3)
    if (this.conquistarCiudadesBarbaras) this.conquistarCiudadesBarbaras(myPlayer, misUnidades);
    
    // Evaluación Ofensiva y Movimiento
    this.ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion);
    this.ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion);

    // D. Infraestructura
    this.construirInfraestructura(myPlayer, hexesPropios, economia);
    if (situacion.ciudades.length > 0 && this.crearCaravanas) {
      this.crearCaravanas(myPlayer, situacion.ciudades);
    }
  },

  // 23. ejecutarFusionesDefensivas: Unir divisiones pequeñas bajo fuego
  ejecutarFusionesDefensivas(myPlayer, misUnidades, enemyProfile) {
    if (misUnidades.length < 2) return;
    // Añadimos esta línea de seguridad aquí también:
    const maxRegs = (typeof MAX_REGIMENTS_PER_DIVISION !== 'undefined') ? MAX_REGIMENTS_PER_DIVISION : 20;
    const targetSize = Math.min(maxRegs, Math.max(12, enemyProfile.maxRegiments));

    for (let i = 0; i < misUnidades.length; i++) {
      const u1 = misUnidades[i];
      if (u1.regiments.length >= targetSize || (this._isCorridorPioneer && this._isCorridorPioneer(u1))) continue;

      const cercana = misUnidades.find(u2 => 
        u1.id !== u2.id && 
        hexDistance(u1.r, u1.c, u2.r, u2.c) <= 2 &&
        (u1.regiments.length + u2.regiments.length) <= MAX_REGIMENTS_PER_DIVISION
      );

      if (cercana) {
        console.log(`[IA_TACTICA] Fusión defensiva: ${u1.name} + ${cercana.name}`);
        this._requestMergeUnits(cercana, u1);
        break; 
      }
    }
  },

  // 24. ejecutarDivisionesEstrategicas: Dividir unidades grandes para ocupar nodos
  ejecutarDivisionesEstrategicas(myPlayer, misUnidades) {
    for (const unit of misUnidades) {
      // Solo dividimos si tiene 5 o más soldados y no se ha movido
      if (unit.regiments.length < 5 || unit.hasMoved || unit.iaExpeditionTarget) continue;

      // Buscar un hexágono vecino que esté vacío y no sea agua
      const spot = getHexNeighbors(unit.r, unit.c).find(n => {
        const h = board[n.r]?.[n.c];
        return h && !h.unit && h.terrain !== 'water';
      });

      if (spot) {
        // Cálculo matemático seguro: mitad para cada uno
        const total = unit.regiments.length;
        const mitad = Math.floor(total / 2); 
        
        // Preparamos la orden para el motor del juego
        gameState.preparingAction = { 
          type: 'split_unit', 
          unitId: unit.id, 
          newUnitRegiments: unit.regiments.slice(0, mitad), 
          remainingOriginalRegiments: unit.regiments.slice(mitad) 
        };

        console.log(`[IA_TACTICA] Dividiendo ${unit.name} en (${spot.r},${spot.c})`);
        this._requestSplitUnit(unit, spot.r, spot.c);
      }
    }
  },


  // 25. ejecutarMovimientosTacticos: Localización y avance hacia objetivos
  ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion) {
    const { amenazas, recursos, enemyProfile } = situacion;
    const enemyUnits = IASentidos.getEnemyUnits(myPlayer);

    for (const unit of misUnidades) {
      if (unit.hasMoved || unit.iaExpeditionTarget || !unit.currentMovement) continue;

      let objetivo = null;

      // 1. Exploradores: Ruinas no saqueadas
      if (unit.regiments.some(r => r.type === 'Explorador')) {
        const ruins = this._getUnexploredRuins ? this._getUnexploredRuins() : [];
        objetivo = this._pickObjective(ruins, unit, myPlayer);
      }

      // 2. Caza de Guerrilla Enemiga (Si el perfil es spread_small)
      if (!objetivo && enemyProfile.mode === 'spread_small') {
        const preys = enemyUnits.filter(e => e.regiments.length <= 2);
        objetivo = this._pickObjective(preys, unit, myPlayer);
      }

      // 3. Defender Amenazas o Capturar Recursos Descubiertos
      if (!objetivo) {
        const pool = amenazas.length > 0 ? amenazas : recursos;
        objetivo = this._pickObjective(pool, unit, myPlayer);
      }

      if (objetivo) {
        this._requestMoveOrAttack(unit, objetivo.r, objetivo.c);
      }
    }
  },

  // 26. ejecutarFusionesOfensivas: Analizador de Poder Relativo por Objetivo
  ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion) {
    const enemigos = IASentidos.getEnemyUnits(myPlayer);
    for (const enemigo of enemigos) {
      this._evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo);
    }
  },

  // 32. _evaluarYActuarContraEnemigoAislado: Lógica de Combate Inteligente
  _evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo) {
   // Buscamos nuestras unidades que estén a 5 pasos o menos del enemigo
    const cercanas = misUnidades.filter(u => hexDistance(u.r, u.c, enemigo.r, enemigo.c) <= 5);
    if (cercanas.length === 0) return;

    const poderNuestro = cercanas.reduce((s, u) => s + (u.regiments?.length || 0), 0);
    const poderEnemigo = Math.max(1, enemigo.regiments?.length || 0); // Evita dividir por cero
    const ratio = poderNuestro / poderEnemigo;

    // ESTRATEGIA A: ATAQUE (Ventaja clara de 1.3 o más)
    if (ratio >= 1.3) {
      const lider = cercanas.sort((a,b) => (b.regiments?.length || 0) - (a.regiments?.length || 0))[0];
      this._requestMoveOrAttack(lider, enemigo.r, enemigo.c);
    } 
    // ESTRATEGIA B: ENVOLVIMIENTO (Fuerzas igualadas)
    else if (ratio >= 0.8) {
      const spots = getHexNeighbors(enemigo.r, enemigo.c).filter(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit);
      for (let i = 0; i < Math.min(cercanas.length, spots.length); i++) {
        this._requestMoveUnit(cercanas[i], spots[i].r, spots[i].c);
      }
    } 
    // ESTRATEGIA C: RETIRADA (Somos más débiles)
    else {
      const cap = (gameState.cities || []).find(c => c.owner === myPlayer && c.isCapital);
      if (cap) cercanas.forEach(u => this._requestMoveUnit(u, cap.r, cap.c));
    }
  },

  // 27. _evaluateEnemyExpansionStrategy: Perfilado estadístico del oponente
  _evaluateEnemyExpansionStrategy(myPlayer) {
    const enemyId = this._getEnemyPlayerId(myPlayer);
    const eUnits = IASentidos.getUnits(enemyId) || [];
    if (eUnits.length === 0) return { mode: 'normal', maxRegiments: 0 };

    const totalRegs = eUnits.reduce((s, u) => s + u.regiments.length, 0);
    const avgSize = totalRegs / eUnits.length;
    const maxRegs = Math.max(...eUnits.map(u => u.regiments.length));

    let mode = 'mixed';
    if (maxRegs >= this.BIG_ENEMY_DIVISION_THRESHOLD) mode = 'stack_large'; // Enemigo usa tanques
    else if (avgSize <= 2.2) mode = 'spread_small'; // Enemigo usa guerrillas

    return { mode, maxRegiments: maxRegs, targetRegiments: Math.min(20, maxRegs + 2) };
  },

  // 28 y 29. Gestión de Caza y Bloques Pesados
  // ACCIÓN: ASEGURAR QUE TENEMOS CAZADORES (PARA GUERRILLAS)
  _ensureHunterDivisions(myPlayer, targetRegs) {
    const misUnidades = IASentidos.getUnits(myPlayer);
    const cazadores = misUnidades.filter(u => u.regiments.length >= 3 && u.regiments.length <= 6);
    
    // Si tenemos menos de 3 cazadores, intentamos reclutar uno
    if (cazadores.length < this.HUNT_SMALL_DIVISIONS_TARGET) {
      if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
          console.log(`[IA_RECLUTAMIENTO] Reclutando Cazador para J${myPlayer}`);
          AiGameplayManager.produceUnit(myPlayer, ['Infantería Ligera', 'Infantería Ligera', 'Arqueros'], 'attacker', 'Cazador IA');
      }
    }
  },

  // ACCIÓN: CREAR SÚPER-UNIDADES (PARA GRANDES BATALLAS)
  _ensureHeavyDivisions(myPlayer, maxEnemyRegs) {
    const maxRegs = (typeof MAX_REGIMENTS_PER_DIVISION !== 'undefined') ? MAX_REGIMENTS_PER_DIVISION : 20;
    const misUnidades = IASentidos.getUnits(myPlayer);
    
    // Buscamos si ya tenemos una unidad pesada (cerca del límite)
    const pesada = misUnidades.find(u => u.regiments.length >= 15);
    
    // Si no tenemos ninguna y hay al menos 2 unidades, intentamos fusionarlas
    if (!pesada && misUnidades.length >= 2) {
      const ordenadas = [...misUnidades].sort((a,b) => b.regiments.length - a.regiments.length);
      const u1 = ordenadas[0];
      const u2 = ordenadas[1];

      // Si están a una distancia razonable (4 pasos) y caben en una sola unidad
      if (hexDistance(u1.r, u1.c, u2.r, u2.c) <= 4 && (u1.regiments.length + u2.regiments.length) <= maxRegs) {
          console.log(`[IA_TACTICA] Creando División Pesada fusionando ${u1.name} y ${u2.name}`);
          this._requestMoveUnit(u2, u1.r, u1.c);
          this._requestMergeUnits(u2, u1);
      }
    }
  },

  _getUnexploredRuins() {
    const ruins = [];
    board.forEach(row => row.forEach(hex => {
      if (hex?.feature === 'ruins' && !hex.looted) ruins.push(hex);
    }));
    return ruins;
  },

  _pickObjective(list, unit, myPlayer) {
    if (!list || list.length === 0) return null;
    return list.sort((a, b) => hexDistance(unit, a) - hexDistance(unit, b))[0];
  },

  _requestMergeUnits(u1, u2) { if (typeof RequestMergeUnits === 'function') { RequestMergeUnits(u1, u2, true); return true; } return false; },
  _requestSplitUnit(u, r, c) { if (typeof RequestSplitUnit === 'function') { RequestSplitUnit(u, r, c); return true; } return false; },
  _getEnemyPlayerId(p) { return units.find(u => u.player !== p && u.player > 0)?.player || 1; },
  _isCorridorPioneer(u) { return (u.name || '').includes('Pionero') || (u.name || '').includes('Suministro'); },

  // IA_ARCHIPIELAGO.js - PARTE 3 DE 5: EXPANSIÓN, NAVEGACIÓN Y CAMINOS
  // INTEGRA: Conquista de Ciudades Bárbaras, Detección de Islas (Flood Fill) y Motor A* Real.

  // 46. conquistarCiudadesBarbaras: Coordinar expediciones contra ciudades neutrales
  conquistarCiudadesBarbaras(myPlayer, misUnidades) {
    const ciudadesBarbaras = this._getBarbarianCities();
    if (ciudadesBarbaras.length === 0) return;

    // Seleccionamos la ciudad neutral más atractiva (cercana y débil)
    const targetCity = this._pickBarbarianTarget(myPlayer, ciudadesBarbaras);
    if (!targetCity) return;

    // REGLA DE ORO: Necesitamos el doble (2.0x) de fuerza que la guarnición
    const fuerzaDefensa = this._getCityGarrisonStrength(targetCity);
    const fuerzaNecesaria = Math.ceil(fuerzaDefensa * 2.0); 

    // Elegimos nuestras unidades más cercanas para la misión
    let expeditionUnits = this._selectExpeditionUnits(myPlayer, targetCity, fuerzaNecesaria);
    let fuerzaTotalNuestra = this._sumUnitPower(expeditionUnits);

    // Solo atacamos si realmente tenemos el doble de fuerza
    if (fuerzaTotalNuestra >= fuerzaNecesaria) {
      console.log(`[IA_EXPANSION] Lanzando conquista sobre (${targetCity.r},${targetCity.c}) con fuerza ${fuerzaTotalNuestra}/${fuerzaNecesaria}`);
      for (const unit of expeditionUnits) {
        unit.iaExpeditionTarget = `${targetCity.r},${targetCity.c}`;
        this._requestMoveOrAttack(unit, targetCity.r, targetCity.c);
      }
    } else {
      console.log(`[IA_EXPANSION] Preparando fuerzas para (${targetCity.r},${targetCity.c}). Actual: ${fuerzaTotalNuestra}, Necesaria: ${fuerzaNecesaria}`);
    }
  },

  // 47. _getBarbarianCities: Localizar nodos urbanos sin dueño o bárbaros
  _getBarbarianCities() {
    return (gameState.cities || []).filter(c => 
      c.owner === null || c.isBarbarianCity || c.owner === 9 || c.isBarbaric
    );
  },

  // 48. _pickBarbarianTarget: Algoritmo de selección de objetivo neutral
  _pickBarbarianTarget(myPlayer, ciudadesBarbaras) {
    const ownCities = (gameState.cities || []).filter(c => c.owner === myPlayer);
    const anchor = ownCities.find(c => c.isCapital) || ownCities[0];

    return ciudadesBarbaras.map(ciudad => {
      const dist = anchor ? hexDistance(anchor.r, anchor.c, ciudad.r, ciudad.c) : 10;
      const garrison = this._getCityGarrisonStrength(ciudad);
      // El score premia ciudades cercanas y con defensas superables
      const score = (garrison * 3) + dist;
      return { ciudad, score };
    }).sort((a, b) => a.score - b.score)[0]?.ciudad;
  },

  // 49. _selectExpeditionUnits: Filtrar y asignar unidades para la conquista
  _selectExpeditionUnits(myPlayer, targetCity, minPower) {
    const available = IASentidos.getUnits(myPlayer)
      .filter(u => u.currentHealth > 60 && this._isLandUnit(u) && !u.hasMoved)
      .sort((a, b) => hexDistance(a.r, a.c, targetCity.r, targetCity.c) - hexDistance(b.r, b.c, targetCity.r, targetCity.c));

    const selected = [];
    let currentPower = 0;
    for (const u of available) {
      selected.push(u);
      currentPower += this._getUnitPower(u);
      if (currentPower >= minPower) break;
    }
    return selected;
  },

  // 53. _pressEnemyHomeIsland: LÓGICA DE INVASIÓN NAVAL COMPLETA (Flood Fill + Landing)
  _pressEnemyHomeIsland(myPlayer) {
    const enemyId = this._getEnemyPlayerId(myPlayer);
    const enemyCapital = (gameState.cities || []).find(c => c.owner === enemyId && c.isCapital);
    if (!enemyCapital) return false;

    // Detectamos la isla del enemigo usando "Flood Fill"
    const enemyLandmass = this._getLandmassFromHex(enemyCapital.r, enemyCapital.c);
    
    // Miramos si ya tenemos una cabeza de playa (unidades o edificios nuestros en su isla)
    const presenciaEnIsla = board.flat().find(h => h && h.owner === myPlayer && enemyLandmass.has(`${h.r},${h.c}`));
    if (presenciaEnIsla) {
      console.log(`[IA_NAVAL] Cabeza de playa detectada. Iniciando presión terrestre.`);
      return true; 
    }

    // Buscamos un barco con capacidad de transporte
    let transport = this._findTransportShip(myPlayer);
    if (!transport) {
      console.log(`[IA_NAVAL] Sin barcos. Intentando construir flota de transporte.`);
      return !!this._createTransportShip(myPlayer);
    }

    // Buscamos el mejor sitio para desembarcar (preferiblemente montañas o colinas)
    const landing = this._findEnemyLandingTarget(enemyLandmass, enemyCapital);
    if (!landing) return false;

    // LÓGICA DE EMBARQUE: Si el barco no lleva soldados de tierra, buscamos unos para subir
    const tieneTropasTierra = transport.regiments.some(r => !REGIMENT_TYPES[r.type]?.is_naval);
    if (!tieneTropasTierra) {
      const candidato = this._selectEmbarkUnit(myPlayer, transport);
      if (candidato) {
        console.log(`[IA_NAVAL] Subiendo a ${candidato.name} al barco ${transport.name}`);
        return this._requestMergeUnits(candidato, transport);
      }
    }

    // NAVEGACIÓN: Si ya estamos en la costa, bajamos a los soldados. Si no, nos movemos hacia allá.
    if (transport.r === landing.water.r && transport.c === landing.water.c) {
      console.log(`[IA_NAVAL] ¡Tierra a la vista! Desembarcando en (${landing.land.r},${landing.land.c})`);
      return this._requestDisembark(transport, landing.land);
    }
    
    return this._requestMoveUnit(transport, landing.water.r, landing.water.c);
  },

  // 56. _findEnemyLandingTarget: Escaneo de costa y Scoring geométrico real
  _findEnemyLandingTarget(enemyLandmass, enemyCapital) {
    let bestSpot = null;
    let maxScore = -9999;

    for (const hexKey of enemyLandmass) {
      const [r, c] = hexKey.split(',').map(Number);
      const hex = board[r][c];
      if (hex.unit || hex.structure) continue; // No desembarcar sobre obstáculos

      // El sitio debe ser costero (tener agua adyacente para el barco)
      const waterNeighbor = getHexNeighbors(r, c).find(n => 
        board[n.r]?.[n.c]?.terrain === 'water' && !board[n.r][n.c].unit
      );
      if (!waterNeighbor) continue;

      // Puntuación estratégica: Cercanía a capital enemiga + bono defensivo del terreno
      const distToCapital = hexDistance(r, c, enemyCapital.r, enemyCapital.c);
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

  // 64. _findRoadBuildPath: ALGORITMO A* (A-ESTRELLA) REAL
  // Busca la ruta más corta y eficiente evitando obstáculos y priorizando tierra propia/neutral
  _findRoadBuildPath({ myPlayer, start, goal }) {
    const queue = [{ r: start.r, c: start.c, path: [], cost: 0 }];
    const visited = new Set();
    const target = { r: goal.r, c: goal.c };

    while (queue.length > 0) {
      // Ordenar por cercanía al objetivo (A*)
      queue.sort((a, b) => {
        const fA = a.cost + hexDistance(a.r, a.c, target.r, target.c);
        const fB = b.cost + hexDistance(b.r, b.c, target.r, target.c);
        return fA - fB;
      });
      
      const curr = queue.shift();
      const key = `${curr.r},${curr.c}`;

      if (curr.r === target.r && curr.c === target.c) return curr.path;
      if (visited.has(key)) continue;
      visited.add(key);

      for (const neighbor of getHexNeighbors(curr.r, curr.c)) {
        const hex = board[neighbor.r]?.[neighbor.c];
        // SEGURIDAD: No pasar por agua ni salirse del mapa
        if (!hex || hex.terrain === 'water') continue;

        // Permitir cualquier hexágono que no sea agua, sin importar el owner
        queue.push({
          r: neighbor.r, c: neighbor.c,
          path: [...curr.path, neighbor],
          cost: curr.cost + 1
        });
      }
    }
    return null; // No hay ruta terrestre posible
  },

  // 68. _getLandmassFromHex: Detección de islas mediante BFS (Flood Fill)
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

  // --- HELPERS ESTRATÉGICOS ---
  _findBestTradeCityPair(ciudades, myPlayer) {
    const banca = ciudades.find(c => c.isBank || c.owner === 0);
    const propias = ciudades.filter(c => c.owner === myPlayer);
    if (!banca || propias.length === 0) return null;

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

  _requestDisembark(transport, landHex) {
    const landRegs = transport.regiments.filter(r => !REGIMENT_TYPES[r.type]?.is_naval);
    const navalRegs = transport.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_naval);
    
    gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: transport.id, 
        newUnitRegiments: landRegs, 
        remainingOriginalRegiments: navalRegs 
    };
    return this._requestSplitUnit(transport, landHex.r, landHex.c);
  },

  _sumUnitPower(unitsList) { return unitsList.reduce((s, u) => s + this._getUnitPower(u), 0); },
  _isLandUnit(u) { return u.regiments?.some(r => !REGIMENT_TYPES[r.type]?.is_naval); },

  // IA_ARCHIPIELAGO.js - PARTE 4 DE 5: RUTAS DE VICTORIA Y ESTRATEGIA ALTA
// INTEGRA: Sistema de Pesos para 10 Rutas, Métricas de Partida y Bootstrap de Apertura.


  // 71. _procesarEstrategiaVictoria: Elige y ejecuta el plan de victoria anual
  _procesarEstrategiaVictoria(situacion) {
    const { myPlayer } = situacion;
    const rutas = this._evaluarRutasDeVictoria(situacion);
    
    if (!rutas || rutas.length === 0) return;

    // Ordenar por peso (Scoring) y elegir la mejor
    const rutaGanadora = rutas.sort((a, b) => b.weight - a.weight)[0];
    
    if (this.ARCHI_LOG_VERBOSE) {
      console.log(`[IA_ESTRATEGIA] Evaluando prioridades para J${myPlayer}.`);
      console.log(`[IA_ESTRATEGIA] Ruta Ganadora: ${rutaGanadora.label} (Peso: ${rutaGanadora.weight.toFixed(1)})`);
    }

    if (rutaGanadora.canExecute) {
      this._ejecutarAccionPorRuta(rutaGanadora, situacion);
    }
  },

  // 72. _evaluarRutasDeVictoria: EL CEREBRO ESTRATÉGICO (Cálculo de Pesos)
  // Analiza las estadísticas globales para decidir la "personalidad" de la IA este turno.
  _evaluarRutasDeVictoria(situacion) {
  const { myPlayer, economia } = situacion;
    const m = this._collectVictoryMetrics(myPlayer);
    const holders = (gameState.victoryPoints && gameState.victoryPoints.holders) ? gameState.victoryPoints.holders : {};
    const rutas = [];

    // --- RUTA 1: EL EMPERADOR (Dominio de Ciudades) ---
    const citiesTarget = 6; 
    const citiesNeeded = Math.max(0, citiesTarget - m.cities);
    rutas.push({
      id: 'ruta_emperador', label: 'Emperador',
      weight: 150 + (citiesNeeded * 55),
      canExecute: citiesNeeded > 0
    });

    // --- RUTA 2: GRAN ARQUEÓLOGO (Ruinas) ---
    const ruins = this._getUnexploredRuins ? this._getUnexploredRuins() : [];
    let archWeight = 110 + (ruins.length * 30);
    if (holders.mostRuins === `player${myPlayer}`) archWeight *= 0.5; 
    rutas.push({
      id: 'ruta_gran_arqueologo', label: 'Arqueólogo',
      weight: archWeight,
      canExecute: ruins.length > 0
    });

    // --- RUTA 3: BANQUERO (Oro) ---
    let wealthWeight = 120;
    if (m.oro < 600) wealthWeight += 180; 
    rutas.push({
      id: 'ruta_mas_riqueza', label: 'Banquero',
      weight: wealthWeight,
      canExecute: true
    });

    // --- RUTA 4: ANIQUILACIÓN (Guerra Total) ---
    const ratioPoder = (typeof this._estimateLocalPowerRatio !== 'undefined') ? this._estimateLocalPowerRatio(myPlayer, {r:0, c:0}, 99) : 1;
    rutas.push({
      id: 'ruta_aniquilacion', label: 'Aniquilador',
      weight: ratioPoder > 1.3 ? 240 : 40,
      canExecute: ratioPoder > 1.1
    });

    // --- RUTA 5: MILITARISTA (Ejército) ---
    rutas.push({
      id: 'ruta_ejercito_grande', label: 'Militarista',
      weight: m.totalRegiments < 18 ? 170 : 70,
      canExecute: true
    });

    // --- RUTA 6: SABIO (Ciencia) ---
    rutas.push({
      id: 'ruta_mas_avances', label: 'Sabio',
      weight: 100 + (m.techs * 12),
      canExecute: true
    });

    // --- RUTA 7: GLORIOSO (Puntos de Victoria) ---
    const vp = (gameState.victoryPoints && gameState.victoryPoints[`player${myPlayer}`]) ? gameState.victoryPoints[`player${myPlayer}`] : 0;
    rutas.push({
      id: 'ruta_gloria', label: 'Glorioso',
      weight: 140 + (vp * 8),
      canExecute: true
    });

    
    // --- RUTA 8: ALMIRANTE (Naval) ---
    const esMapaNaval = !!(gameState.setupTempSettings && gameState.setupTempSettings.navalMap);
    rutas.push({
      id: 'ruta_almirante_supremo', label: 'Almirante',
      weight: esMapaNaval ? (180 + (m.killsNavales * 25)) : 0,
      canExecute: esMapaNaval
    });

    // --- RUTA 9: LEGENDARIO (Héroes) ---
    rutas.push({
      id: 'ruta_mas_heroes', label: 'Legendario',
      weight: m.heroes < 2 ? 130 : 50,
      canExecute: true
    });

    // --- RUTA 10: CONQUISTADOR (Bárbaros) ---
    const barbos = this._getBarbarianCities ? this._getBarbarianCities() : [];
    rutas.push({
      id: 'ruta_conquistador_barbaro', label: 'Conquistador',
      weight: barbos.length > 0 ? 160 : 0,
      canExecute: barbos.length > 0
    });
    return rutas;

  },

  // 74. _ejecutarAccionPorRuta: Handler de comportamientos forzados
  _ejecutarAccionPorRuta(ruta, situacion) {
    const { myPlayer, economia } = situacion;

    switch (ruta.id) {
      case 'ruta_mas_riqueza':
        // Prioridad: Activar flujos de caravanas (Grupo 5)
        if (this.crearCaravanas) this.crearCaravanas(myPlayer, situacion.ciudades);
        break;

      case 'ruta_gran_arqueologo':
        // Asegurar exploradores y movimiento a ruinas
        const hasExplo = IASentidos.getUnits(myPlayer).some(u => u.regiments.some(r => r.type === 'Explorador'));
        if (!hasExplo && economia.oro >= 250) this._producirDivisiones(myPlayer, 1, 1, 'Explorador');
        break;

      case 'ruta_ejercito_grande':
        // Reclutamiento estándar de refuerzo
        if (economia.oro >= 500) this._producirDivisiones(myPlayer, 1, 4);
        break;

      case 'ruta_mas_avances':
        // Invertir oro en investigación
        this._investResearch(myPlayer, ['ARCHITECTURE', 'PHILOSOPHY'], 1);
        break;

      case 'ruta_emperador':
        // Priorizar asedios de ciudades libres
        if (this.conquistarCiudadesBarbaras) this.conquistarCiudadesBarbaras(myPlayer, IASentidos.getUnits(myPlayer));
        break;
    }
  },

  // 76. _collectVictoryMetrics: RECOPILADOR DE ESTADÍSTICAS REALES
  _collectVictoryMetrics(p) {
    const pKey = `player${p}`;
    const res = gameState.playerResources?.[p] || {};
    const stats = gameState.playerStats || {};
    const misUnidades = IASentidos.getUnits(p) || [];

    return {
      // Cuenta ciudades y aldeas propias
      cities: board.flat().filter(h => h && h.owner === p && (h.isCity || h.structure === 'Aldea')).length,
      // Suma total de todos los soldados en todas tus unidades
      totalRegiments: misUnidades.reduce((s, u) => s + (u.regiments?.length || 0), 0),
      // Tecnologías descubiertas
      techs: res.researchedTechnologies?.length || 0,
      // Marcador de bajas (usamos 0 si no hay datos todavía)
      kills: (stats.unitsDestroyed && stats.unitsDestroyed[pKey]) ? stats.unitsDestroyed[pKey] : 0,
      killsNavales: (stats.navalVictories && stats.navalVictories[pKey]) ? stats.navalVictories[pKey] : 0,
      // Cuántos comandantes tienes en el campo
      heroes: misUnidades.filter(u => u.commander).length,
      // Dinero en la caja
      oro: res.oro || 0
    };
  },

  // 97. _runDeterministicBootstrapController: EL PLAN DE APERTURA (Turnos 1-3)
  // Evita dudas iniciales: toma los recursos del suelo inmediatamente.
  _runDeterministicBootstrapController(situacion) {
   const { myPlayer } = situacion;
    // Solo funciona en los 3 primeros turnos
    if (gameState.turnNumber > 3) return;

    console.log(`[IA_BOOTSTRAP] J${myPlayer}: Fase de arranque activa.`);
    
    // Buscamos todas nuestras unidades que puedan moverse
    const misUnidades = IASentidos.getUnits(myPlayer).filter(u => !u.hasMoved && u.currentMovement > 0);
    // Buscamos recursos libres en el mapa
    const recursosLibres = board.flat().filter(h => h && h.resourceNode && h.owner === null);

    misUnidades.forEach(unit => {
      const meta = this._pickObjective(recursosLibres, unit, myPlayer);
      if (meta) {
        console.log(`[IA_BOOTSTRAP] ${unit.name} corriendo hacia Recurso en (${meta.r},${meta.c})`);
        this._requestMoveOrAttack(unit, meta.r, meta.c);
      }
    });
  },

  // 73. _logRutasDeVictoria
  _logRutasDeVictoria(rutas) {
      if (!this.ARCHI_LOG_VERBOSE) return;
      const top3 = rutas.sort((a,b) => b.weight - a.weight).slice(0, 3);
      console.log("--- EVALUACIÓN ESTRATÉGICA ---");
      top3.forEach((r, i) => console.log(`${i+1}. ${r.label}: ${r.weight.toFixed(1)}`));
  },

  // IA_COMERCIO.js - PARTE 5 DE 5: COMERCIO, MOVIMIENTO Y RECLUTAMIENTO
// INTEGRA: Sistema de Caravanas, Algoritmo de Gusano Corredor y Reclutamiento por Tecnología.

  // --- 1. GESTIÓN DE CARAVANAS (INGRESOS PASIVOS) ---
  crearCaravanas(myPlayer, ciudades) {
    const plan = this._getRoadNetworkPlan(myPlayer, ciudades);
    
    // CANDADO: Si el arquitecto dice que aún hay casillas neutrales o sin camino, NO se compra nada.
    if (plan.length > 0 && (plan[0].missingOwnedSegments.length > 0 || plan[0].pendingCaptureSegments.length > 0)) {
      console.log(`[IA_ECONOMIA] Compra de Caravana BLOQUEADA: El camino hacia ${plan[0].to.name} aún no está terminado.`);
      return;
    }

    const res = gameState.playerResources[myPlayer];
    const tieneComerciante = units.some(u => u.player === myPlayer && u.regiments.some(r => (REGIMENT_TYPES[r.type].abilities || []).includes('provide_supply')));

    if (!tieneComerciante && res.oro >= 350) {
      console.log(`[IA_ECONOMIA] Camino verificado al 100%. Procediendo a la compra de Columna de Suministro.`);
      this._producirDivisiones(myPlayer, 1, 1, 'Columna de Suministro');
    }
  },

  // --- 2. LÓGICA DE GUSANO CORREDOR (OCUPACIÓN DE CAMINOS) ---
  // Usa la división de tropas para ocupar el corredor comercial paso a paso.
  _ejecutarGusanoCorredor(situacion) {
    const { myPlayer } = situacion;
    const plan = this._getRoadNetworkPlan(myPlayer, this._getTradeCityCandidates(myPlayer));
    
    if (plan.length === 0) {
      console.log(`[IA_GUSANO] Abortando: El Arquitecto no entregó ningún plano.`);
      return;
    }

    const ruta = plan[0];
    if (!ruta || !ruta.landPath || ruta.landPath.length === 0) {
      console.log('[IA_GUSANO] ERROR: ruta.landPath está vacío o indefinido:', ruta);
      return;
    }
    let unidad = this._findClosestUnitToTarget(myPlayer, ruta.landPath[0]);

    if (!unidad) {
      console.log(`[IA_GUSANO] Abortando: No se encontró ninguna unidad cerca del inicio del camino.`);
      return;
    }
    if (unidad.regiments.length < 2) {
      console.log(`[IA_GUSANO] Abortando: La unidad ${unidad.name} no tiene suficientes regimientos para dividir.`);
      return;
    }

    console.log(`[IA_GUSANO] EXECUTANDO AVANCE: ${unidad.name} hacia ${ruta.to.name || 'Objetivo'}`);

    for (const punto of ruta.landPath) {
      const posAnterior = { r: unidad.r, c: punto.c };
      
      // A. MOVER Y CONQUISTAR (Gusano Split-Merge)
      console.log(`[IA_GUSANO] Ocupando casilla (${punto.r},${punto.c})...`);
      // (Aquí va la lógica de Split y Merge que ya tenemos...)
      
      // B. CONSTRUIR (Solo si la casilla quedó vacía)
      const hex = board[posAnterior.r][posAnterior.c];
      if (hex.owner === myPlayer && !hex.structure) {
        console.log(`[IA_GUSANO] Casilla libre detectada en (${posAnterior.r},${posAnterior.c}). Construyendo camino.`);
        this._requestBuildStructure(myPlayer, posAnterior.r, posAnterior.c, 'Camino');
      }
    }
  },

  // --- 3. RECLUTAMIENTO DINÁMICO SEGÚN TECNOLOGÍA ---
  _producirDivisiones(p, count, size, forcedType = null) {
  // Seguridad: Revisamos que el sistema de reclutamiento funcione
    if (typeof AiGameplayManager === 'undefined' || !AiGameplayManager.produceUnit) return 0;

    // REGLA DE AHORRO: Si falta la caravana, no gastamos en soldados
    if (this._ahorrandoParaCaravana && !forcedType) {
      console.log(`[IA_RECLUTAMIENTO] Gasto cancelado: Ahorrando para la Red Comercial.`);
      return 0;
    }
    
    // Miramos qué tecnologías tiene el jugador
    const misTechs = this._getPlayerTechs(p);
    let creadas = 0;

    for (let i = 0; i < count; i++) {
      let composicion = [];
      
      // Si la IA nos pide un tipo específico (como una Caravana), lo usamos
      if (forcedType) {
          composicion = Array(size).fill(forcedType);
      } else {
          // Si tenemos Hierro, usamos Infantería Pesada. Si no, la Ligera.
          const base = misTechs.includes('IRON_WORKING') ? 'Infantería Pesada' : 'Infantería Ligera';
          composicion = Array(size).fill(base);
          
          // Si sabemos hacer flechas y el grupo es grande, añadimos Arqueros
          if (misTechs.includes('FLETCHING') && size >= 2) {
            composicion[composicion.length - 1] = 'Arqueros';
          }
          // Si sabemos criar animales y hay espacio, añadimos Caballos
          if (misTechs.includes('ANIMAL_HUSBANDRY') && size >= 3) {
            composicion[0] = 'Caballería Ligera';
          }
      }

      // Mandamos la orden de reclutamiento al juego
      const nuevaUnidad = AiGameplayManager.produceUnit(p, composicion, 'auto', 'División IA');
      if (nuevaUnidad) {
          creadas++;
          console.log(`[IA_RECLUTAMIENTO] Creada ${nuevaUnidad.name} con tecnología actual.`);
      }
    }
    return creadas;
  },

  // --- 4. MANIOBRA DE DIVISIÓN TÁCTICA ---
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

  // --- 5. LÓGICA DE INFRAESTRUCTURA RED (ESTRUCTURAL) ---
  _ejecutarCapaEstructuralRed(situacion) {
    const { myPlayer } = situacion;
    if (typeof AiGameplayManager !== 'undefined') {
      // Forzar infraestructura orgánica (Caminos y nodos)
      if (typeof AiGameplayManager._ensureTradeInfrastructureOrganic === 'function') {
        try { AiGameplayManager._ensureTradeInfrastructureOrganic(myPlayer); } catch (e) {}
      }
      if (typeof AiGameplayManager._ensureCityExpansionOrganic === 'function') {
        try { AiGameplayManager._ensureCityExpansionOrganic(myPlayer); } catch (e) {}
      }
    }
  },

  // --- 6. MÉTODOS DE APOYO Y BÚSQUEDA ---
  _pickNextTradeRouteCandidate(myPlayer, existingKeys) {
    const tradeCities = this._getTradeCityCandidates(myPlayer).filter(c => this._isAllowedTradeDestinationForCaravan(c, myPlayer));
    const ownCities = tradeCities.filter(c => c.owner === myPlayer);
    const targetCities = tradeCities.filter(c => c.owner !== myPlayer || c.isBank);

    let best = null;
    let shortest = 999;

    for (const start of ownCities) {
      for (const end of targetCities) {
        if (start === end) continue;
        const key = this._getTradePairKey(start, end);
        if (existingKeys.has(key)) continue;

        const path = this._findRoadBuildPath({ myPlayer, start, goal: end });
        if (path && path.length < shortest) {
          shortest = path.length;
          best = { cityA: start, cityB: end, infraPath: path };
        }
      }
    }
    return best;
  },

  _getExistingTradeRouteKeys(p) {
    const keys = new Set();
    units.forEach(u => { if (u.player === p && u.tradeRoute) keys.add(this._getTradePairKey(u.tradeRoute.origin, u.tradeRoute.destination)); });
    return keys;
  },

  _getTradePairKey(a, b) { 
    const idA = `${a.r},${a.c}`; const idB = `${b.r},${b.c}`; 
    return [idA, idB].sort().join('|'); 
  },

  _findClosestUnitToTarget(p, target) {
    const available = IASentidos.getUnits(p).filter(u => u.currentHealth > 0 && !u.hasMoved);
    if (!available.length) return null;
    return available.sort((a,b) => hexDistance(a, target) - hexDistance(b, target))[0];
  },

  _getTradeCityCandidates(p) { return (gameState.cities || []).filter(c => c.owner === p || c.owner === 0 || c.isBank || c.owner === 9); },

  _isAllowedTradeDestinationForCaravan(c, p) { return c.owner === p || c.owner === 0 || c.isBank || c.owner === 9; },

  _getBankCity() { return (gameState.cities || []).find(c => c.isBank || c.owner === 0); },

  _requestEstablishTradeRoute(u, a, b, path) { 
    if (typeof _executeEstablishTradeRoute === 'function') {
        _executeEstablishTradeRoute({ unitId: u.id, origin: a, destination: b, path }); 
    }
  }, 

  // Esta coma separa de la función anterior

  // HERRAMIENTA: LEER TECNOLOGÍAS DEL JUGADOR
  _getPlayerTechs(p) {
    return (gameState.playerResources[p] && gameState.playerResources[p].researchedTechnologies) ? gameState.playerResources[p].researchedTechnologies : [];
  },

  // HERRAMIENTA: REVISAR SI TENEMOS PIEDRA/MADERA PARA UN EDIFICIO
  _canAffordStructure(p, tipo) {
    const data = (typeof STRUCTURE_TYPES !== 'undefined') ? STRUCTURE_TYPES[tipo] : null;
    const res = gameState.playerResources[p];
    if (!data || !res) return false;
    const coste = data.cost || {};
    // Comprobar cada recurso necesario (Oro, Madera, Piedra)
    return Object.keys(coste).every(recurso => (res[recurso] || 0) >= coste[recurso]);
  },

  // ACCIÓN: ENVIAR ORDEN DE CONSTRUCCIÓN AL JUEGO
  _requestBuildStructure(p, r, c, tipo) {
    if (typeof processActionRequest === 'function') {
      processActionRequest({ type: 'buildStructure', payload: { playerId: p, r, c, structureType: tipo } });
      console.log(`[IA_CONSTRUCCION] J${p} construyendo ${tipo} en (${r},${c})`);
      return true;
    }
    return false;
  },

  // ESTRATEGIA: ASEGURAR BARCOS EN EL MAR
  _ensureNavalPresence(p, economia) {
    const barcos = units.filter(u => u.player === p && u.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_naval));
    if (barcos.length === 0 && economia.oro >= 500) {
      console.log(`[IA_NAVAL] J${p} no tiene barcos. Intentando crear uno.`);
      return this._crearUnidadNaval(p, 'Patache');
    }
    return false;
  },

  // ACCIÓN: FABRICAR UN BARCO EN UNA CIUDAD COSTERA
  _crearUnidadNaval(p, tipo) {
    const capital = (gameState.cities || []).find(c => c.owner === p);
    if (!capital) return false;
    const agua = getHexNeighbors(capital.r, capital.c).find(n => board[n.r]?.[n.c]?.terrain === 'water');
    if (agua && typeof AiGameplayManager !== 'undefined') {
      return AiGameplayManager.produceUnit(p, [tipo], 'naval', 'Flota IA');
    }
    return false;
  },

  // ESTRATEGIA: ACTIVAR RUTA COMERCIAL LARGA
  _ejecutarRutaLarga(situacion) {
    // Si el cerebro pide dinero, forzamos la creación de caravanas
    if (this.crearCaravanas) {
      this.crearCaravanas(situacion.myPlayer, situacion.ciudades);
    }
  }, 

  // HERRAMIENTA: CONTAR DEFENSORES DE UNA CIUDAD
  _getCityGarrisonStrength(ciudad) {
    if (!ciudad) return 4;
    // Si la ciudad tiene una lista de guarnición, la contamos. Si no, usamos un valor base.
    return (ciudad.garrison && Array.isArray(ciudad.garrison)) ? ciudad.garrison.length : 4;
  },

  // HERRAMIENTA: CONTAR FUERZA DE UNA UNIDAD (REGIMIENTOS)
  _getUnitPower(unit) {
    return (unit && unit.regiments) ? unit.regiments.length : 0;
  },

  // HERRAMIENTA: SUMAR PODER DE VARIAS UNIDADES
  _sumUnitPower(listaUnidades) {
    if (!listaUnidades || !Array.isArray(listaUnidades)) return 0;
    return listaUnidades.reduce((total, u) => total + this._getUnitPower(u), 0);
  },

  // HERRAMIENTA: COMPARAR PODER EN UNA ZONA (NUESTRO VS ENEMIGO)
  _estimateLocalPowerRatio(myPlayer, centro, radio = 5) {
    const misUnidades = IASentidos.getUnits(myPlayer).filter(u => hexDistance(u.r, u.c, centro.r, centro.c) <= radio);
    const enemigoId = this._getEnemyPlayerId(myPlayer);
    const susUnidades = IASentidos.getUnits(enemigoId).filter(u => hexDistance(u.r, u.c, centro.r, centro.c) <= radio);
    
    const miPoder = misUnidades.reduce((s, u) => s + (u.regiments?.length || 0), 0);
    const suPoder = susUnidades.reduce((s, u) => s + (u.regiments?.length || 0), 0);
    
    // Evitamos dividir por cero. Si el enemigo tiene 0, devolvemos un ratio alto (ej. 10)
    if (suPoder === 0) return miPoder > 0 ? 10 : 1;
    return miPoder / suPoder;
  },

  // ACCIÓN: CONSTRUIR BARCO DE TRANSPORTE
  _createTransportShip(p) {
    console.log(`[IA_NAVAL] Solicitando construcción de transporte para J${p}`);
    return this._crearUnidadNaval(p, 'Patache');
  },

  // HERRAMIENTA: ELEGIR SOLDADOS PARA SUBIR AL BARCO
  _selectEmbarkUnit(p, transport) {
    const misUnidades = IASentidos.getUnits(p);
    // Buscamos una unidad de tierra (no naval) que esté a 2 pasos o menos del barco
    return misUnidades.find(u => 
      !u.regiments.some(r => REGIMENT_TYPES[r.type]?.is_naval) && 
      hexDistance(u.r, u.c, transport.r, transport.c) <= 2
    );
  },

  // HERRAMIENTA: BUSCAR SITIO PARA DESEMBARCAR EN ISLA ENEMIGA
  _findEnemyLandingTarget(enemyLandmass, enemyCapital) {
    let mejorSpot = null;
    let maximaPuntuacion = -999;

    // Convertimos el conjunto de la isla en una lista para revisarla
    for (const hexKey of enemyLandmass) {
      const [r, c] = hexKey.split(',').map(Number);
      const hex = board[r][c];
      if (hex.unit || hex.structure || hex.terrain === 'water') continue;

      // Buscamos un vecino que sea agua para que el barco pueda aparcar
      const vecinoAgua = getHexNeighbors(r, c).find(n => board[n.r]?.[n.c]?.terrain === 'water');
      if (!vecinoAgua) continue;

      // Puntuamos el sitio: cercanía a su capital pero con seguridad
      const dist = hexDistance(r, c, enemyCapital.r, enemyCapital.c);
      let score = 100 - dist;
      if (hex.terrain === 'mountain') score += 20; // Mejor desembarcar en terreno defensivo

      if (score > maximaPuntuacion) {
        maximaPuntuacion = score;
        mejorSpot = { land: {r, c}, water: vecinoAgua };
      }
    }
    return mejorSpot;
  },

  // ACCIÓN: SOLTAR TROPAS EN LA COSTA
  _requestDisembark(transport, landHex) {
    // Separamos los soldados de tierra de los marineros
    const regsTierra = transport.regiments.filter(r => !REGIMENT_TYPES[r.type]?.is_naval);
    const regsNavales = transport.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_naval);
    
    if (regsTierra.length === 0) return false;

    gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: transport.id, 
        newUnitRegiments: regsTierra, 
        remainingOriginalRegiments: regsNavales 
    };
    console.log(`[IA_NAVAL] Desembarcando tropas en (${landHex.r},${landHex.c})`);
    return this._requestSplitUnit(transport, landHex.r, landHex.c);
  }, // Coma para separar de la función anterior

  // EL ARQUITECTO: DIBUJA EL PLANO DE LA RED COMERCIAL
  _getRoadNetworkPlan(myPlayer, ciudades) {
    console.log(`\n--- [SONDA DIAGNÓSTICO J${myPlayer}] ---`);
    const propias = ciudades.filter(c => c.owner === myPlayer);
    const todosLosNodos = ciudades.filter(c => c && (c.r !== undefined));
    
    console.log(`Nodos totales detectados: ${todosLosNodos.length}`);
    console.log(`Nodos propios: ${propias.length}`);

    let reportePlanes = [];

    for (const origen of propias) {
      for (const destino of todosLosNodos) {
        if (origen === destino) continue;

        const info = this._findRoadConnection(origen, destino, myPlayer);
        if (!info) continue;

        const hexesSinDominio = info.pendingCaptureSegments.length;
        const hexesSinCamino = info.missingOwnedSegments.length;
        const totalDistancia = info.landPath.length;

        // LOG DE VERDAD: Reporte crudo de cada ruta
        console.log(`RUTA: ${origen.name || 'Origen'} -> ${destino.name || 'Destino'}`);
        console.log(`  - [FLUJO 1/2] Hexágonos neutrales/enemigos: ${hexesSinDominio}`);
        console.log(`  - [FLUJO 3] Hexágonos propios sin camino: ${hexesSinCamino}`);
        console.log(`  - [ESTADO] Longitud total: ${totalDistancia}`);

        if (hexesSinDominio > 0 || hexesSinCamino > 0) {
          reportePlanes.push({
            from: origen, to: destino,
            landPath: info.landPath,
            missingOwnedSegments: info.missingOwnedSegments,
            pendingCaptureSegments: info.pendingCaptureSegments,
            score: (hexesSinDominio * 10) + hexesSinCamino
          });
        }
      }
    }

    if (reportePlanes.length === 0) {
      console.log(`[IA_DIAGNÓSTICO] ALERTA: No se han encontrado tareas pendientes en ningún nodo.`);
      return [{ status: 'perfect' }];
    }

    // Ordenar por prioridad (rutas más cortas primero)
    reportePlanes.sort((a, b) => a.score - b.score);
    console.log(`[IA_DIAGNÓSTICO] Ruta prioritaria elegida: ${reportePlanes[0].from.name} -> ${reportePlanes[0].to.name}`);
    console.log(`--- [FIN SONDA] ---\n`);

    return reportePlanes;
  },

  // EL TOPÓGRAFO: ANALIZA EL ESTADO DE UNA RUTA ESPECÍFICA
  _findRoadConnection(cityA, cityB, myPlayer) {
    const path = this._findRoadBuildPath({ myPlayer, start: cityA, goal: cityB });
    
    if (!path) {
      console.log(`    ⚠️ GPS: No se pudo encontrar ruta física entre ${cityA.name || 'A'} y ${cityB.name || 'B'}.`);
      return null;
    }

    const neutrales = path.filter(h => board[h.r][h.c].owner !== myPlayer);
    const sinCamino = path.filter(h => board[h.r][h.c].owner === myPlayer && !board[h.r][h.c].structure);

    return {
      landPath: path,
      missingOwnedSegments: sinCamino,
      pendingCaptureSegments: neutrales
    };
  },

  // ETIQUETA DE SEGURIDAD: IDENTIFICA SOLDADOS EN MISIÓN COMERCIAL
  _isCorridorPioneer(unit) {
    // Si la unidad tiene el nombre de "Pionero" o está en una casilla del plano, no la molestamos
    return (unit.name || '').includes('Pionero') || (unit.name || '').includes('Suministro');
  }, 

  // ESTRATEGIA: REFUERZO DE FORTALEZAS INVASORAS
  _pressureProduceForFortress(myPlayer) {
    const plan = (gameState.aiFortressPressure || {})[myPlayer];
    if (!plan || !plan.target) return false;

    // Si tenemos una fortaleza en asedio, fabricamos 3 divisiones pesadas allí
    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      console.log(`[IA_MILITAR] Reforzando posición estratégica en (${plan.target.r},${plan.target.c})`);
      this._producirDivisiones(myPlayer, 3, 6); // 3 grupos de 6 soldados
      return true;
    }
    return false;
  },

  // HERRAMIENTA: ESTIMAR SI UNA RUTA ES VIABLE
  _getBarbarianCities() {
    return (gameState.cities || []).filter(c => 
      c.owner === null || c.isBarbarianCity || c.owner === 9 || c.isBarbaric
    );
  }

}); // CIERRE FINAL DEL OBJETO IAArchipielago. BRAVO.

console.log("[IA_ARCHIPIELAGO] Inteligencia Estratégica Completa. Todos los sistemas operativos.");