// IA_SENTIDOS.js
// Funciones de percepción para IA en modo Archipiélago.
// Este módulo NO toma decisiones. Solo expone datos del estado real del juego.

const IASentidos = {
  // Identidad
  getPlayerIds(myPlayer) {
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    return { myPlayer, enemyPlayer };
  },

  // Estado global
  getTurnInfo() {
    const info = {
      turnNumber: gameState.turnNumber,
      currentPlayer: gameState.currentPlayer,
      currentPhase: gameState.currentPhase,
      gameMode: gameState.gameMode
    };
    return info;
  },

  // Territorio y mapa
  getBoardDimensions() {
    return { rows: board.length, cols: board[0]?.length || 0 };
  },

  getHex(r, c) {
    return board[r]?.[c] || null;
  },

  getOwnedHexes(player) {
    const owned = [];
    board.forEach(row => row.forEach(hex => {
      if (hex.owner === player) owned.push(hex);
    }));
    return owned;
  },

  // Ciudades
  getCities(player) {
    const cities = gameState.cities.filter(c => c.owner === player);
    return cities;
  },

  getCapital(player) {
    return gameState.cities.find(c => c.owner === player && c.isCapital);
  },

  // Recursos
  getResources(player) {
    const res = gameState.playerResources[player] || {};
    return res;
  },

  // Unidades
  getUnits(player) {
    const myUnits = units.filter(u => u.player === player && u.currentHealth > 0);
    return myUnits;
  },

  getEnemyUnits(player) {
    const enemy = player === 1 ? 2 : 1;
    const enemyUnits = units.filter(u => u.player === enemy && u.currentHealth > 0);
    return enemyUnits;
  },

  // Archipiélago: islas y mar
  getWaterHexes() {
    const water = [];
    board.forEach(row => row.forEach(hex => {
      if (hex.terrain === 'water') water.push(hex);
    }));
    return water;
  },

  getCoastalHexes() {
    const coastal = [];
    board.forEach(row => row.forEach(hex => {
      if (hex.terrain === 'water') return;
      const neighbors = getHexNeighbors(hex.r, hex.c);
      if (neighbors.some(n => board[n.r]?.[n.c]?.terrain === 'water')) coastal.push(hex);
    }));
    return coastal;
  },

  // Utilidades básicas
  distance(r1, c1, r2, c2) {
    return hexDistance(r1, c1, r2, c2);
  }
};

window.IASentidos = IASentidos;
