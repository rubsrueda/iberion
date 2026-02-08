// IA_ARCHIPIELAGO.js
// Cerebro principal para Archipiélago. Coordina sentidos + módulos.
// EJECUTA ACCIONES REALES: Movimiento, fusión, división, conquista, construcción, caravanas

const IAArchipielago = {
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
  },

  ejecutarTurno(myPlayer) {
    console.log(`\n========================================`);
    console.log(`[IA_ARCHIPIELAGO] ========= TURNO ${gameState.turnNumber} - JUGADOR ${myPlayer} =========`);
    console.log(`========================================\n`);

    // Verificaciones de módulos disponibles
    if (typeof IASentidos === 'undefined') {
      console.error(`[IA_ARCHIPIELAGO] ERROR CRÍTICO: IASentidos no está disponible. Abortando.`);
      if (typeof handleEndTurn === 'function') {
        setTimeout(() => handleEndTurn(), 500);
      }
      return;
    }

    const infoTurno = IASentidos.getTurnInfo();
    if (infoTurno.currentPhase !== 'play') {
      console.log(`[IA_ARCHIPIELAGO] Fase incorrecta: ${infoTurno.currentPhase}, abortando`);

      // Fallback: si por algún motivo se llamó en despliegue, intentar desplegar con IA clásica
      if (infoTurno.currentPhase === 'deployment' && typeof AiDeploymentManager !== 'undefined' && AiDeploymentManager.deployUnitsAI) {
        console.log(`[IA_ARCHIPIELAGO] Fallback de despliegue: llamando a AiDeploymentManager.deployUnitsAI(${myPlayer})`);
        AiDeploymentManager.deployUnitsAI(myPlayer);
        return;
      }

      if (typeof handleEndTurn === 'function') {
        setTimeout(() => handleEndTurn(), 500);
      }
      return;
    }

    // Fallback crítico: si la IA no tiene unidades en el primer turno de Archipiélago, crear una unidad mínima
    const isArchipelago = !!gameState.setupTempSettings?.navalMap;
    if (isArchipelago && (gameState.turnNumber || 1) <= 1) {
      const unidadesIA = IASentidos.getUnits(myPlayer);
      if (!unidadesIA || unidadesIA.length === 0) {
        console.warn(`[IA_ARCHIPIELAGO] ⚠️ IA sin unidades en turno inicial. Creando unidad de emergencia...`);
        this.crearUnidadInicialDeEmergencia(myPlayer);
      }
    }

    // Verificaciones de otros módulos
    if (typeof IATactica === 'undefined') {
      console.warn(`[IA_ARCHIPIELAGO] ADVERTENCIA: IATactica no está disponible`);
    }
    if (typeof IAEconomica === 'undefined') {
      console.warn(`[IA_ARCHIPIELAGO] ADVERTENCIA: IAEconomica no está disponible`);
    }

    console.log(`[IA_ARCHIPIELAGO] Recopilando objetivos propios...`);
    const ciudades = IASentidos.getCities(myPlayer);
    const hexesPropios = IASentidos.getOwnedHexes(myPlayer);
    const recursos = hexesPropios.filter(h => h.resourceNode);
    const infraestructura = hexesPropios.filter(h => h.structure);
    const objetivos = ciudades.concat(recursos).concat(infraestructura);
    console.log(`[IA_ARCHIPIELAGO] Objetivos totales: ${objetivos.length} (${ciudades.length} ciudades, ${recursos.length} recursos, ${infraestructura.length} infraestructura)`);

    console.log(`\n[IA_ARCHIPIELAGO] Analizando situación táctica...`);
    const amenazas = (typeof IATactica !== 'undefined') ? IATactica.detectarAmenazasSobreObjetivos(myPlayer, objetivos, 3) : [];
    const frente = (typeof IATactica !== 'undefined') ? IATactica.detectarFrente(myPlayer, 2) : [];
    
    console.log(`\n[IA_ARCHIPIELAGO] Analizando situación económica...`);
    const economia = (typeof IAEconomica !== 'undefined') ? IAEconomica.evaluarEconomia(myPlayer) : { oro: 0 };
    const recursosEnMapa = (typeof IAEconomica !== 'undefined') ? IAEconomica.contarRecursosEnMapa(myPlayer) : { total: 0 };
    const recursosVulnerables = (typeof IAEconomica !== 'undefined') ? IAEconomica.detectarRecursosVulnerables(myPlayer === 1 ? 2 : 1) : [];

    console.log(`\n[IA_ARCHIPIELAGO] ========= RESUMEN DE SITUACIÓN =========`);
    console.log(`Amenazas detectadas: ${amenazas.length}`);
    console.log(`Puntos de frente: ${frente.length}`);
    console.log(`Oro disponible: ${economia.oro}`);
    console.log(`Recursos en mapa: ${recursosEnMapa.total}`);
    console.log(`Objetivos enemigos vulnerables: ${recursosVulnerables.length}`);
    console.log(`========================================\n`);

    const situacion = {
      amenazas,
      frente,
      economia,
      recursosEnMapa,
      recursosVulnerables,
      myPlayer,
      ciudades,
      hexesPropios,
      recursos: recursos,
      infraestructura: infraestructura
    };

    const rutas = this._evaluarRutasDeVictoria(situacion);
    situacion.rutas = rutas;
    this._logRutasDeVictoria(rutas);

    // <<==== IMPLEMENTACIÓN DE ACCIONES DE IA ====>>
    console.log(`[IA_ARCHIPIELAGO] ========= EJECUTANDO PLAN DE ACCIÓN =========`);
    this.ejecutarPlanDeAccion(situacion);
    console.log(`[IA_ARCHIPIELAGO] Plan de acción completado.`);
    console.log(`========================================\n`);

    if (typeof handleEndTurn === 'function') {
      console.log(`[IA_ARCHIPIELAGO] Llamando a handleEndTurn()`);
      setTimeout(() => handleEndTurn(), 1500);
    } else {
      console.error(`[IA_ARCHIPIELAGO] ERROR: handleEndTurn no está disponible`);
    }

    return situacion;
  },

  /**
   * PLAN DE ACCIÓN PRINCIPAL
   * Prioridad de acciones:
   * 1. Fusión de unidades para defensa
   * 2. División estratégica de unidades
   * 3. Movimiento ofensivo/defensivo
   * 4. Conquista de ciudades bárbaras
   * 5. Construcción de infraestructura
   * 6. Creación de caravanas
   */
  ejecutarPlanDeAccion(situacion) {
    const { myPlayer, amenazas, frente, economia, ciudades, hexesPropios } = situacion;
    const misUnidades = IASentidos.getUnits(myPlayer);
    
    console.log(`[IA_ARCHIPIELAGO] PLAN: Ejecutando con ${misUnidades.length} unidades disponibles`);

    const rutaPrioritaria = situacion.rutas?.[0];
    if (rutaPrioritaria?.id === 'ruta_larga') {
      this._ejecutarRutaLarga(situacion);
    }

    // FASE 1: FUSIÓN DEFENSIVA (El latido del corazón)
    if (amenazas.length > 0 || frente.length > 0) {
      console.log(`[IA_ARCHIPIELAGO] FASE 1: Detectado peligro. Buscando fusiones defensivas...`);
      this.ejecutarFusionesDefensivas(myPlayer, misUnidades, amenazas, frente);
    }

    // FASE 2: DIVISIÓN ESTRATÉGICA (Para expandir presencia)
    console.log(`[IA_ARCHIPIELAGO] FASE 2: Evaluando divisiones estratégicas...`);
    this.ejecutarDivisionesEstrategicas(myPlayer, misUnidades, hexesPropios);

    // FASE 3: MOVIMIENTO TÁCTICO
    console.log(`[IA_ARCHIPIELAGO] FASE 3: Ejecutando movimientos tácticos...`);
    this.ejecutarMovimientosTacticos(myPlayer, misUnidades, situacion);

    // FASE 3.5: FUSIÓN OFENSIVA (Antes de atacar)
    console.log(`[IA_ARCHIPIELAGO] FASE 3.5: Preparando fusiones ofensivas para ataque...`);
    this.ejecutarFusionesOfensivas(myPlayer, misUnidades, situacion);

    // FASE 4: CONQUISTA DE CIUDADES BÁRBARAS
    console.log(`[IA_ARCHIPIELAGO] FASE 4: Buscando ciudades bárbaras para conquistar...`);
    this.conquistarCiudadesBarbaras(myPlayer, misUnidades);

    // FASE 5: CONSTRUCCIÓN DE INFRAESTRUCTURA
    if (economia.oro >= 500) {
      console.log(`[IA_ARCHIPIELAGO] FASE 5: Construyendo infraestructura (Oro: ${economia.oro})...`);
      this.construirInfraestructura(myPlayer, hexesPropios, economia);
    }

    // FASE 6: CARAVANAS COMERCIALES
    if (economia.oro >= 1000 && ciudades.length > 0) {
      console.log(`[IA_ARCHIPIELAGO] FASE 6: Creando caravanas comerciales...`);
      this.crearCaravanas(myPlayer, ciudades);
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

      // Buscar capital o ciudad del jugador
      const capital = gameState.cities?.find(c => c.owner === myPlayer && c.isCapital) ||
                      gameState.cities?.find(c => c.owner === myPlayer);
      if (!capital) {
        console.warn(`[IA_ARCHIPIELAGO] No se encontró capital/ciudad para jugador ${myPlayer}.`);
        return;
      }

      const candidateHexes = [
        { r: capital.r, c: capital.c },
        ...getHexNeighbors(capital.r, capital.c)
      ];

      const spot = candidateHexes.find(h => {
        const hex = board[h.r]?.[h.c];
        return hex && !hex.unit && hex.terrain !== 'water';
      });

      if (!spot) {
        console.warn(`[IA_ARCHIPIELAGO] No se encontró hex libre para crear unidad de emergencia.`);
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
  ejecutarFusionesDefensivas(myPlayer, misUnidades, amenazas, frente) {
    if (misUnidades.length < 2) return;

    console.log(`[IA_ARCHIPIELAGO] FUSIÓN DEFENSIVA: ${amenazas.length} amenazas, ${frente.length} puntos de frente`);

    // Buscar unidades cercanas que puedan fusionarse
    for (let i = 0; i < misUnidades.length; i++) {
      const unit1 = misUnidades[i];
      const regimentosActuales = unit1.regiments?.length || 0;

      // Si la unidad ya está fuerte, no fusionar
      if (regimentosActuales > 12) continue;

      // Buscar otra unidad cercana para fusionar
      for (let j = i + 1; j < misUnidades.length; j++) {
        const unit2 = misUnidades[j];
        const distancia = hexDistance(unit1.r, unit1.c, unit2.r, unit2.c);

        // Si están muy cerca y la suma no excede el máximo
        if (distancia <= 2 && regimentosActuales + (unit2.regiments?.length || 0) <= MAX_REGIMENTS_PER_DIVISION) {
          console.log(`[IA_ARCHIPIELAGO] Fusionando ${unit1.name} + ${unit2.name} en (${unit1.r},${unit1.c})`);
          
          // Primero mover unit2 adyacente a unit1
          if (distancia > 1) {
            const moveTarget = getHexNeighbors(unit1.r, unit1.c).find(n => !board[n.r]?.[n.c]?.unit);
            if (moveTarget && typeof _executeMoveUnit === 'function') {
              _executeMoveUnit(unit2, moveTarget.r, moveTarget.c, true);
            }
          }

          // Luego fusionar
          if (typeof mergeUnits === 'function') {
            mergeUnits(unit2, unit1);
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
  ejecutarDivisionesEstrategicas(myPlayer, misUnidades, hexesPropios) {
    console.log(`[IA_ARCHIPIELAGO] DIVISIÓN ESTRATÉGICA: ${misUnidades.length} unidades`);

    for (const unit of misUnidades) {
      const regimientosActuales = unit.regiments?.length || 0;

      // Solo dividir unidades GRANDES (más de 8 regimientos)
      if (regimientosActuales <= 8) continue;

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
      
      if (typeof splitUnit === 'function') {
        splitUnit(unit, hexoLibre.r, hexoLibre.c);
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
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const unidadesEnemigas = IASentidos.getUnits(enemyPlayer);

    console.log(`[IA_ARCHIPIELAGO] MOVIMIENTOS TÁCTICOS: ${misUnidades.length} unidades`);

    for (const unit of misUnidades) {
      if (!unit.currentMovement || unit.currentMovement <= 0) continue;

      let objetivo = null;

      // PRIORIDAD 1: Defender si hay amenaza cercana
      if (amenazas.length > 0) {
        const amenazaMasCercana = amenazas.reduce((prev, curr) => 
          hexDistance(unit.r, unit.c, prev.r, prev.c) < hexDistance(unit.r, unit.c, curr.r, curr.c) ? prev : curr
        );
        objetivo = amenazaMasCercana;
        console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo defensivo en (${objetivo.r},${objetivo.c})`);
      }
      // PRIORIDAD 2: Atacar recurso vulnerable
      else if (situacion.recursosVulnerables.length > 0) {
        objetivo = situacion.recursosVulnerables[0];
        console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo ofensivo (recurso vulnerable) en (${objetivo.r},${objetivo.c})`);
      }
      // PRIORIDAD 3: Expandir hacia recursos propios descubiertos
      else if (recursosEnHexes.length > 0) {
        objetivo = recursosEnHexes[0];
        console.log(`[IA_ARCHIPIELAGO] ${unit.name}: Objetivo exploratorio en (${objetivo.r},${objetivo.c})`);
      }

      if (objetivo) {
        if (typeof _executeMoveUnit === 'function') {
          _executeMoveUnit(unit, objetivo.r, objetivo.c, true);
        }
      }
    }
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
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const unidadesEnemigas = IASentidos.getUnits(enemyPlayer);
    
    console.log(`[IA_ARCHIPIELAGO] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE`);
    if (unidadesEnemigas.length === 0) return;

    // EVALUAR CADA ENEMIGO COMO OBJETIVO
    for (const enemigo of unidadesEnemigas) {
      this._evaluarYActuarContraEnemigoAislado(myPlayer, misUnidades, enemigo);
    }

    // EVALUAR CIUDADES BÁRBARAS
    const ciudadesBarbaras = gameState.cities.filter(c => c.owner === null || c.isBarbarianCity);
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
            if (moveTarget && typeof _executeMoveUnit === 'function') {
              _executeMoveUnit(unit, moveTarget.r, moveTarget.c, true);
            }
          }
          if (typeof mergeUnits === 'function') {
            mergeUnits(unit, unitPrincipal);
            console.log(`[IA_ARCHIPIELAGO] + Refuerzo: ${unit.name} →${unitPrincipal.name}`);
          }
        }
      }
    }

    // Atacar
    if (typeof _executeMoveUnit === 'function') {
      _executeMoveUnit(unitPrincipal, enemigo.r, enemigo.c, true);
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

      if (typeof _executeMoveUnit === 'function') {
        _executeMoveUnit(unit, posDestino.r, posDestino.c, true);
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
    if (capital && typeof _executeMoveUnit === 'function') {
      for (const unit of unidadesNuestras) {
        const distEnemigo = hexDistance(unit.r, unit.c, enemigo.r, enemigo.c);
        const distCapital = hexDistance(unit.r, unit.c, capital.r, capital.c);

        if (distEnemigo < distCapital + 5) {
          _executeMoveUnit(unit, capital.r, capital.c, true);
          console.log(`[IA_ARCHIPIELAGO] Retirando a capital (${capital.r},${capital.c})`);
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
        if (moveTarget && typeof _executeMoveUnit === 'function') {
          _executeMoveUnit(unit, moveTarget.r, moveTarget.c, true);
        }
      }

      if (typeof mergeUnits === 'function') {
        mergeUnits(unit, unitPrincipal);
        console.log(`[IA_ARCHIPIELAGO] ✓ Fusionado: ${unit.name}`);
      }
    }
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

    const poderTotal = unidadesCercanas.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    const poderMinimo = (ciudad.garrison?.length || 4) * 1.2;

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
    const ciudadesBarbaras = gameState.cities.filter(c => c.owner === null || c.isBarbarianCity);
    
    if (ciudadesBarbaras.length === 0) {
      console.log(`[IA_ARCHIPIELAGO] No hay ciudades bárbaras disponibles`);
      return;
    }

    console.log(`[IA_ARCHIPIELAGO] CONQUISTA: ${ciudadesBarbaras.length} ciudades bárbaras detectadas`);

    for (const ciudad of ciudadesBarbaras) {
      // Buscar unidad más cercana
      const unidadMasCercana = misUnidades.reduce((prev, curr) =>
        hexDistance(prev.r, prev.c, ciudad.r, ciudad.c) < hexDistance(curr.r, curr.c, ciudad.r, ciudad.c) ? prev : curr
      );

      const distancia = hexDistance(unidadMasCercana.r, unidadMasCercana.c, ciudad.r, ciudad.c);
      
      if (distancia <= 3) {
        console.log(`[IA_ARCHIPIELAGO] ${unidadMasCercana.name} conquistando ciudad bárbara en (${ciudad.r},${ciudad.c})`);
        
        // Mover hacia la ciudad
        if (typeof _executeMoveUnit === 'function') {
          _executeMoveUnit(unidadMasCercana, ciudad.r, ciudad.c, true);
        }
      }
    }
  },

  /**
   * FASE 5: CONSTRUCCIÓN DE INFRAESTRUCTURA
   * Construye caminos, fortalezas y ciudades
   */
  construirInfraestructura(myPlayer, hexesPropios, economia) {
    const capital = gameState.cities.find(c => c.owner === myPlayer && c.isCapital);
    if (!capital) return;

    console.log(`[IA_ARCHIPIELAGO] CONSTRUCCIÓN: Oro disponible: ${economia.oro}`);

    // PRIORIDAD 1: Construir caminos hacia recursos
    const hexesCercanos = getHexNeighbors(capital.r, capital.c).filter(n => 
      board[n.r]?.[n.c] && 
      board[n.r][n.c].owner === myPlayer && 
      !board[n.r][n.c].structure &&
      board[n.r][n.c].terrain !== 'water'
    );

    for (const hex of hexesCercanos.slice(0, 2)) {
      console.log(`[IA_ARCHIPIELAGO] Construyendo camino en (${hex.r},${hex.c})`);
      if (typeof handleConfirmBuildStructure === 'function') {
        handleConfirmBuildStructure({ playerId: myPlayer, r: hex.r, c: hex.c, structureType: 'Camino' });
      }
    }

    // PRIORIDAD 2: Construir fortalezas en puntos estratégicos
    const puntosEstrategicos = hexesPropios.filter(h => 
      (h.terrain === 'hills' || h.terrain === 'forest') && 
      !h.structure &&
      hexDistance(h.r, h.c, capital.r, capital.c) <= 4
    );

    for (const punto of puntosEstrategicos.slice(0, 1)) {
      console.log(`[IA_ARCHIPIELAGO] Construyendo fortaleza estratégica en (${punto.r},${punto.c})`);
      if (typeof handleConfirmBuildStructure === 'function') {
        handleConfirmBuildStructure({ playerId: myPlayer, r: punto.r, c: punto.c, structureType: 'Fortaleza' });
      }
    }
  },

  /**
   * FASE 6: CARAVANAS COMERCIALES
   * Crea caravanas para ingresos pasivos
   */
  crearCaravanas(myPlayer, ciudades) {
    if (ciudades.length < 2) {
      console.log(`[IA_ARCHIPIELAGO] No hay suficientes ciudades para caravanas`);
      return;
    }

    console.log(`[IA_ARCHIPIELAGO] CARAVANAS: ${ciudades.length} ciudades disponibles`);

    // Crear caravana terrestre entre dos ciudades
    const ciudad1 = ciudades[0];
    const ciudad2 = ciudades[Math.min(1, ciudades.length - 1)];

    if (ciudad1 && ciudad2) {
      console.log(`[IA_ARCHIPIELAGO] Creando caravana terrestre: (${ciudad1.r},${ciudad1.c}) -> (${ciudad2.r},${ciudad2.c})`);
      
      // Aquí se llamaría a BankManager.createCaravan si existe
      if (typeof BankManager !== 'undefined' && BankManager.createCaravan) {
        // BankManager.createCaravan(...);
      }
    }
  }
  ,

  _evaluarRutasDeVictoria(situacion) {
    const { myPlayer, ciudades } = situacion;
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const myMetrics = this._collectVictoryMetrics(myPlayer);
    const enemyMetrics = this._collectVictoryMetrics(enemyPlayer);
    const holders = gameState.victoryPoints?.holders || {};
    const myKey = `player${myPlayer}`;
    const enemyKey = `player${enemyPlayer}`;
    const rutas = [];

    const pushTitleRoute = (id, label, metricKey, holderKey, baseWeight = 120) => {
      const myVal = myMetrics[metricKey] || 0;
      const enemyVal = enemyMetrics[metricKey] || 0;
      const holder = holders[holderKey] || null;
      const delta = enemyVal - myVal;
      let weight = baseWeight + Math.max(0, delta) * 8;

      if (holder === myKey) weight *= 0.4;
      if (holder === enemyKey) weight *= 1.3;

      rutas.push({
        id,
        label,
        weight,
        canExecute: true,
        meta: { myVal, enemyVal, holder }
      });
    };

    const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
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

    rutas.sort((a, b) => b.weight - a.weight);
    return rutas;
  },

  _evaluarRutaLarga(situacion, myMetrics, enemyMetrics, holders) {
    const { myPlayer, ciudades } = situacion;
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const myKey = `player${myPlayer}`;
    const enemyKey = `player${enemyPlayer}`;

    if (!ciudades || ciudades.length < 2) {
      return {
        id: 'ruta_larga',
        label: 'Ruta Larga',
        weight: 0,
        canExecute: false,
        meta: { reason: 'sin_ciudades' }
      };
    }

    const candidate = this._findBestTradeCityPair(ciudades, myPlayer);
    if (!candidate) {
      return {
        id: 'ruta_larga',
        label: 'Ruta Larga',
        weight: 0,
        canExecute: false,
        meta: { reason: 'sin_ruta' }
      };
    }

    const { cityA, cityB, infraPath, missingOwnedSegments } = candidate;
    const hasInfra = !!infraPath;
    const missingCount = missingOwnedSegments.length;
    let weight = 170 + (hasInfra ? 90 : 0) + Math.max(0, 3 - missingCount) * 25;

    if (holders.mostRoutes === myKey) weight *= 0.5;
    if (holders.mostRoutes === enemyKey) weight *= 1.4;

    return {
      id: 'ruta_larga',
      label: 'Ruta Larga',
      weight,
      canExecute: true,
      meta: {
        cityA: cityA?.name,
        cityB: cityB?.name,
        hasInfra,
        missingCount
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

    console.log(`[IA_ARCHIPIELAGO] ========= RUTAS DE VICTORIA =========`);
    const top = rutas.slice(0, 5);
    top.forEach((ruta, idx) => {
      const metaText = ruta.meta ? JSON.stringify(ruta.meta) : '';
      console.log(`[IA_ARCHIPIELAGO] #${idx + 1} ${ruta.label} | peso=${ruta.weight.toFixed(1)} | ejecutar=${!!ruta.canExecute} ${metaText}`);
    });

    console.groupCollapsed('[IA_ARCHIPIELAGO] Rutas completas (debug)');
    rutas.forEach(ruta => {
      console.log(`${ruta.label} | peso=${ruta.weight.toFixed(1)} | ejecutar=${!!ruta.canExecute}`, ruta.meta || {});
    });
    console.groupEnd();
    console.log(`========================================\n`);
  },

  _minUnitDistance(myPlayer, target) {
    const myUnits = IASentidos.getUnits(myPlayer);
    if (!myUnits.length) return 99;
    return myUnits.reduce((min, unit) => Math.min(min, hexDistance(unit.r, unit.c, target.r, target.c)), 99);
  },

  _estimateLocalPowerRatio(myPlayer, target, radius = 5) {
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const myUnits = IASentidos.getUnits(myPlayer).filter(u => hexDistance(u.r, u.c, target.r, target.c) <= radius);
    const enemyUnits = IASentidos.getUnits(enemyPlayer).filter(u => hexDistance(u.r, u.c, target.r, target.c) <= radius);
    const myRegs = myUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    const enemyRegs = enemyUnits.reduce((sum, u) => sum + (u.regiments?.length || 0), 0);
    return (myRegs + 1) / (enemyRegs + 1);
  },

  _findBestTradeCityPair(ciudades, myPlayer) {
    let best = null;
    const dummyUnit = { player: myPlayer, regiments: [{ type: 'Infantería Ligera' }] };

    for (let i = 0; i < ciudades.length; i++) {
      for (let j = i + 1; j < ciudades.length; j++) {
        const cityA = ciudades[i];
        const cityB = ciudades[j];
        const landPath = findPath_A_Star(dummyUnit, { r: cityA.r, c: cityA.c }, { r: cityB.r, c: cityB.c });
        if (!landPath) continue;

        const infraPath = findInfrastructurePath(cityA, cityB);
        const missingOwnedSegments = landPath.filter(step => {
          const hex = board[step.r]?.[step.c];
          if (!hex || hex.isCity || hex.structure || hex.terrain === 'water') return false;
          return hex.owner === myPlayer;
        });

        const missingCount = missingOwnedSegments.length;
        const score = (missingCount * 10) + landPath.length;
        if (!best || score < best.score) {
          best = { cityA, cityB, landPath, infraPath, missingOwnedSegments, score };
        }
      }
    }

    return best;
  },

  _ejecutarRutaLarga(situacion) {
    const { myPlayer, ciudades } = situacion;
    if (!ciudades || ciudades.length < 2) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay suficientes ciudades.');
      return;
    }

    const candidate = this._findBestTradeCityPair(ciudades, myPlayer);
    if (!candidate) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No se encontro ruta terrestre valida entre ciudades.');
      return;
    }

    const { cityA, cityB, infraPath, landPath, missingOwnedSegments } = candidate;
    console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Ciudades: ${cityA.name} -> ${cityB.name} | Infra=${!!infraPath} | Faltantes=${missingOwnedSegments.length}`);

    if (!infraPath) {
      const roadCost = STRUCTURE_TYPES['Camino']?.cost || {};
      const playerRes = gameState.playerResources[myPlayer] || {};
      const canAfford = (playerRes.piedra || 0) >= (roadCost.piedra || 0) && (playerRes.madera || 0) >= (roadCost.madera || 0);
      const nextHex = missingOwnedSegments[0];

      if (!nextHex) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] No hay segmentos propios disponibles para construir camino.');
        return;
      }

      if (!canAfford) {
        console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Recursos insuficientes para construir camino.');
        return;
      }

      if (typeof handleConfirmBuildStructure === 'function') {
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Construyendo camino en (${nextHex.r},${nextHex.c})`);
        handleConfirmBuildStructure({ playerId: myPlayer, r: nextHex.r, c: nextHex.c, structureType: 'Camino' });
      }
      return;
    }

    const existingRouteKeys = new Set();
    units.forEach(u => {
      if (u.player === myPlayer && u.tradeRoute?.origin && u.tradeRoute?.destination) {
        const key = [u.tradeRoute.origin.name, u.tradeRoute.destination.name].sort().join('-');
        existingRouteKeys.add(key);
      }
    });

    const routeKey = [cityA.name, cityB.name].sort().join('-');
    if (existingRouteKeys.has(routeKey)) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Ya existe una ruta comercial activa entre estas ciudades.');
      return;
    }

    let supplyUnit = units.find(u => u.player === myPlayer && !u.tradeRoute && u.regiments?.some(reg => (REGIMENT_TYPES[reg.type].abilities || []).includes('provide_supply')));

    if (!supplyUnit && typeof AiGameplayManager !== 'undefined' && AiGameplayManager.produceUnit) {
      console.log('[IA_ARCHIPIELAGO] [Ruta Larga] Creando Columna de Suministro...');
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
      if (typeof _executeMoveUnit === 'function') {
        console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Moviendo columna a ciudad origen (${origin.r},${origin.c})`);
        _executeMoveUnit(supplyUnit, origin.r, origin.c, true);
      }
    }

    if (typeof _executeEstablishTradeRoute === 'function') {
      console.log(`[IA_ARCHIPIELAGO] [Ruta Larga] Estableciendo ruta: ${origin.name} -> ${destination.name}`);
      _executeEstablishTradeRoute({ unitId: supplyUnit.id, origin, destination, path: infraPath });
    } else {
      console.warn('[IA_ARCHIPIELAGO] [Ruta Larga] _executeEstablishTradeRoute no disponible.');
    }
  }
};

window.IAArchipielago = IAArchipielago;

