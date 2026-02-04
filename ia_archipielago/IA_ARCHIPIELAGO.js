// IA_ARCHIPIELAGO.js
// Cerebro principal para Archipiélago. Coordina sentidos + módulos.

const IAArchipielago = {
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
      if (typeof handleEndTurn === 'function') {
        setTimeout(() => handleEndTurn(), 500);
      }
      return;
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

    const resultado = {
      amenazas,
      frente,
      economia,
      recursosEnMapa,
      recursosVulnerables
    };

    console.log(`[IA_ARCHIPIELAGO] Turno finalizado (sin acciones implementadas aún)`);
    console.log(`========================================\n`);

    // TODO: Aquí se implementarán las decisiones y acciones
    if (typeof handleEndTurn === 'function') {
      console.log(`[IA_ARCHIPIELAGO] Llamando a handleEndTurn()`);
      setTimeout(() => handleEndTurn(), 1500);
    } else {
      console.error(`[IA_ARCHIPIELAGO] ERROR: handleEndTurn no está disponible`);
    }

    return resultado;
  }
};

window.IAArchipielago = IAArchipielago;

