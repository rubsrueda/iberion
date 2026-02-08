// IA_ECONOMICA.js
// Módulo económico para IA en Archipiélago. No decide tácticas de combate.

const IAEconomica = {
  evaluarEconomia(myPlayer) {
    const recursos = IASentidos.getResources(myPlayer);
    const economia = {
      oro: recursos.oro || 0,
      comida: recursos.comida || 0,
      madera: recursos.madera || 0,
      piedra: recursos.piedra || 0,
      hierro: recursos.hierro || 0,
      researchPoints: recursos.researchPoints || 0,
      puntosReclutamiento: recursos.puntosReclutamiento || 0
    };
    return economia;
  },

  contarRecursosEnMapa(myPlayer) {
    const owned = IASentidos.getOwnedHexes(myPlayer);
    const nodes = owned.filter(h => h.resourceNode);
    const byType = {};
    nodes.forEach(n => {
      byType[n.resourceNode] = (byType[n.resourceNode] || 0) + 1;
    });
    const result = { total: nodes.length, byType };
    return result;
  },

  detectarRecursosVulnerables(enemyPlayer, maxGuards = 1, guardRange = 4) {
    const vulnerables = [];
    board.forEach(row => row.forEach(hex => {
      if (!hex.resourceNode || hex.owner !== enemyPlayer) return;
      const guards = units.filter(u => u.player === enemyPlayer && hexDistance(u.r, u.c, hex.r, hex.c) <= guardRange);
      if (guards.length <= maxGuards) {
        vulnerables.push({ r: hex.r, c: hex.c, resourceNode: hex.resourceNode, guards: guards.length });
      }
    }));
    return vulnerables;
  }
};

window.IAEconomica = IAEconomica;
