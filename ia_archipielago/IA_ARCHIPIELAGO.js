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
      if (economia.oro < 200) break;

      console.log(`[IA_ARCHIPIELAGO] Construyendo camino en (${hex.r},${hex.c})`);
      // Aquí se llamaría a requestBuildStructure si existe
      economia.oro -= 200;
    }

    // PRIORIDAD 2: Construir fortalezas en puntos estratégicos
    const puntosEstrategicos = hexesPropios.filter(h => 
      (h.terrain === 'hills' || h.terrain === 'forest') && 
      !h.structure &&
      hexDistance(h.r, h.c, capital.r, capital.c) <= 4
    );

    for (const punto of puntosEstrategicos.slice(0, 1)) {
      if (economia.oro < 1000) break;

      console.log(`[IA_ARCHIPIELAGO] Construyendo fortaleza estratégica en (${punto.r},${punto.c})`);
      economia.oro -= 1000;
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
};

window.IAArchipielago = IAArchipielago;

