// IA_TACTICA.js
// Módulo táctico para IA en Archipiélago. No decide economía.

const IATactica = {
  detectarFrente(myPlayer, contactRange = 2) {
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const misUnidades = IASentidos.getUnits(myPlayer);
    const unidadesEnemigas = IASentidos.getUnits(enemyPlayer);
    const frente = [];
    const seen = new Set();

    for (const mi of misUnidades) {
      for (const en of unidadesEnemigas) {
        if (hexDistance(mi.r, mi.c, en.r, en.c) <= contactRange) {
          const key = `${mi.r},${mi.c}->${en.r},${en.c}`;
          if (!seen.has(key)) {
            frente.push({ r: mi.r, c: mi.c, enemigo: { r: en.r, c: en.c } });
            seen.add(key);
          }
        }
      }
    }

    // Tambien considerar enemigos que ya estan dentro o cerca de nuestro territorio.
    for (const en of unidadesEnemigas) {
      const hex = board[en.r]?.[en.c];
      const inTerritory = hex?.owner === myPlayer;
      const nearTerritory = getHexNeighbors(en.r, en.c).some(n => board[n.r]?.[n.c]?.owner === myPlayer);
      if (inTerritory || nearTerritory) {
        const key = `intrusion:${en.r},${en.c}`;
        if (!seen.has(key)) {
          frente.push({ r: en.r, c: en.c, enemigo: { r: en.r, c: en.c } });
          seen.add(key);
        }
      }
    }
    return frente;
  },

  detectarAmenazasSobreObjetivos(myPlayer, objetivos, threatRange = 3) {
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const amenazas = units.filter(u =>
      u.player === enemyPlayer &&
      u.currentHealth > 0 &&
      objetivos.some(o => hexDistance(u.r, u.c, o.r, o.c) <= threatRange)
    );
    return amenazas;
  },

  evaluarDefensaHex(r, c) {
    const hex = board[r]?.[c];
    if (!hex) {
      console.warn(`[IA_TACTICA] evaluarDefensaHex(${r},${c}): hex no existe`);
      return 0;
    }
    let score = 1.0;
    if (hex.terrain === 'hills') score += 0.3;
    if (hex.terrain === 'forest') score += 0.2;
    if (hex.terrain === 'mountains') score += 0.5;
    if (hex.structure === 'Fortaleza') score += 3.0;
    if (hex.structure === 'Muralla') score += 2.0;
    if (hex.structure === 'Campamento') score += 1.0;
    if (hex.isCity) score += 1.5;
    if (hex.isCapital) score += 2.0;
    return score;
  },

  /**
   * ORGANIZAR FRENTE: Posiciona defensores en puntos clave del frente
   */
  organizarFrente(myPlayer, unidades, frente) {
    if (frente.length === 0) {
      return;
    }
    
    for (const pf of frente) {
      // Buscar punto de defensa cercano (colinas, bosque)
      const defendersNearby = unidades.filter(u => hexDistance(u.r, u.c, pf.r, pf.c) <= 3);
      
      if (defendersNearby.length > 0) {
        const mejorDefensor = defendersNearby[0];
        // Mover hacia el punto de frente
        if (typeof _executeMoveUnit === 'function') {
          _executeMoveUnit(mejorDefensor, pf.r, pf.c, true);
        }
      }
    }
  },

  /**
   * IDENTIFICAR PUNTOS DÉBILES EN EL FRENTE
   */
  identificarPuntosDebiles(myPlayer, frente) {
    const puntosDebiles = [];
    
    for (const pf of frente) {
      const defensaScore = this.evaluarDefensaHex(pf.r, pf.c);
      if (defensaScore < 2.0) { // Poco terreno defensivo
        puntosDebiles.push({ r: pf.r, c: pf.c, score: defensaScore });
      }
    }
    
    return puntosDebiles;
  }
};

window.IATactica = IATactica;
