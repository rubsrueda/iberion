// IA_SENTIDOS.js
// Funciones de percepción para IA en modo Archipiélago.
// Este módulo NO toma decisiones. Solo expone datos del estado real del juego.

const IASentidos = {
  // Identidad
  getPlayerIds(myPlayer) {
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    console.log(`[IA_SENTIDOS] getPlayerIds: myPlayer=${myPlayer}, enemyPlayer=${enemyPlayer}`);
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
    console.log(`[IA_SENTIDOS] getTurnInfo:`, info);
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
    console.log(`[IA_SENTIDOS] getOwnedHexes(${player}): ${owned.length} hexes`);
    return owned;
  },

  // Ciudades
  getCities(player) {
    const cities = gameState.cities.filter(c => c.owner === player);
    console.log(`[IA_SENTIDOS] getCities(${player}): ${cities.length} ciudades`, cities.map(c => `(${c.r},${c.c})`));
    return cities;
  },

  getCapital(player) {
    return gameState.cities.find(c => c.owner === player && c.isCapital);
  },

  // Recursos
  getResources(player) {
    const res = gameState.playerResources[player] || {};
    console.log(`[IA_SENTIDOS] getResources(${player}): oro=${res.oro}, comida=${res.comida}, madera=${res.madera}`);
    return res;
  },

  // Unidades
  getUnits(player) {
    const myUnits = units.filter(u => u.player === player && u.currentHealth > 0);
    console.log(`[IA_SENTIDOS] getUnits(${player}): ${myUnits.length} unidades vivas`);
    return myUnits;
  },

  getEnemyUnits(player) {
    const enemy = player === 1 ? 2 : 1;
    const enemyUnits = units.filter(u => u.player === enemy && u.currentHealth > 0);
    console.log(`[IA_SENTIDOS] getEnemyUnits(${player}): ${enemyUnits.length} unidades enemigas detectadas`);
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
