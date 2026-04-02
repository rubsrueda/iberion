// IA_SENTIDOS.js
// Funciones de percepción para IA en modo Archipiélago.
// Este módulo NO toma decisiones. Solo expone datos del estado real del juego.

const IASentidos = {
  // Identidad
  getPlayerIds(myPlayer) {
    const enemyPlayers = this.getEnemyPlayerIds(myPlayer);
    return { myPlayer, enemyPlayer: enemyPlayers[0] || null, enemyPlayers };
  },

  getEnemyPlayerIds(player) {
    const rawIds = new Set();

    const addIfEnemy = (value) => {
      const id = Number(value);
      if (!Number.isFinite(id)) return;
      if (id <= 0 || id === player) return;
      const type = gameState.playerTypes?.[`player${id}`] ?? gameState.playerTypes?.[id] ?? gameState.playerTypes?.[String(id)] ?? null;
      if (type === 'barbarian') return;
      rawIds.add(id);
    };

    (gameState.cities || []).forEach(c => addIfEnemy(c?.owner));
    (units || []).forEach(u => addIfEnemy(u?.player));

    return Array.from(rawIds).sort((a, b) => a - b);
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

  getSessionPlayerId() {
    const id = Number(gameState.currentPlayer);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  },

  // Territorio y mapa
  getBoardDimensions() {
    return { rows: board.length, cols: board[0]?.length || 0 };
  },

  getHex(r, c) {
    return board[r]?.[c] || null;
  },

  getOwnedHexes(player = this.getSessionPlayerId()) {
    if (!Number.isFinite(player) || player <= 0) return [];
    const owned = [];
    board.forEach(row => row.forEach(hex => {
      if (hex.owner === player) owned.push(hex);
    }));
    return owned;
  },

  getSessionOwnedHexes() {
    return this.getOwnedHexes(this.getSessionPlayerId());
  },

  // Infraestructura
  hasRoad(r, c) {
    const hex = board[r]?.[c];
    if (!hex) return false;
    return !!hex.hasRoad || hex.structure === 'Camino';
  },

  getRoadHexes() {
    const roadHexes = [];
    board.forEach(row => row.forEach(hex => {
      if (!!hex.hasRoad || hex.structure === 'Camino') roadHexes.push(hex);
    }));
    return roadHexes;
  },

  getOwnedRoadHexes(player = this.getSessionPlayerId()) {
    if (!Number.isFinite(player) || player <= 0) return [];
    const ownedRoadHexes = [];
    board.forEach(row => row.forEach(hex => {
      if (hex.owner !== player) return;
      if (!!hex.hasRoad || hex.structure === 'Camino') ownedRoadHexes.push(hex);
    }));
    return ownedRoadHexes;
  },

  getSessionOwnedRoadHexes() {
    return this.getOwnedRoadHexes(this.getSessionPlayerId());
  },

  isNodeStructure(structureType) {
    return structureType === 'Aldea' || structureType === 'Ciudad' || structureType === 'Metrópoli';
  },

  getNationalityByOwner(ownerId) {
    const id = Number(ownerId);
    if (!Number.isFinite(id)) return 'Sin nacionalidad';

    const bankId = (typeof BankManager !== 'undefined' && Number.isFinite(Number(BankManager.PLAYER_ID)))
      ? Number(BankManager.PLAYER_ID)
      : 0;
    const barbarianId = (typeof BARBARIAN_PLAYER_ID !== 'undefined' && Number.isFinite(Number(BARBARIAN_PLAYER_ID)))
      ? Number(BARBARIAN_PLAYER_ID)
      : 9;

    if (id === bankId) return 'Banca';
    if (id === barbarianId) return 'Bárbaros';

    const civ = gameState.playerCivilizations?.[id]
      ?? gameState.playerCivilizations?.[String(id)]
      ?? gameState.playerCivilizations?.['player' + id]
      ?? null;
    if (civ && civ !== 'ninguna') return civ;

    return 'Jugador ' + id;
  },

  getInfrastructureNodes() {
    const nodes = [];
    board.forEach(row => row.forEach(hex => {
      if (!this.isNodeStructure(hex?.structure)) return;
      const ownerId = Number(hex.owner);
      nodes.push({
        r: hex.r,
        c: hex.c,
        structure: hex.structure,
        ownerId,
        nacionalidad: this.getNationalityByOwner(ownerId)
      });
    }));
    return nodes;
  },

  _getRoadBuildableTerrains() {
    return STRUCTURE_TYPES?.Camino?.buildableOn || [];
  },

  _isAllowedCorridorNode(node, player) {
    if (!node) return false;
    return node.ownerId === player || node.ownerId === 0 || node.ownerId === 9;
  },

  _isTraversableCorridorHex(hex, player, roadBuildable, isEndpoint = false) {
    if (!hex) return false;
    if (isEndpoint) return true;
    if (hex.terrain === 'water' || hex.terrain === 'forest') return false;
    if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
    return true;
  },

  _isOwnNodeHex(hex, player) {
    if (!hex) return false;
    return Number(hex.owner) === Number(player) && this.isNodeStructure(hex.structure);
  },

  _isNodeHex(hex) {
    if (!hex) return false;
    return this.isNodeStructure(hex.structure);
  },

  _isOwnRoadHex(hex, player) {
    if (!hex) return false;
    return Number(hex.owner) === Number(player) && (!!hex.hasRoad || hex.structure === 'Camino');
  },

  _getRoadConnectionToOwnNode(player, originNode) {
    const startR = Number(originNode?.r);
    const startC = Number(originNode?.c);
    if (![startR, startC].every(Number.isFinite)) {
      return { connected: false, ownNode: null };
    }

    const startHex = board[startR]?.[startC];
    if (!this._isNodeHex(startHex)) {
      return { connected: false, ownNode: null };
    }

    const ownNodes = this.getInfrastructureNodes().filter(node => Number(node.ownerId) === Number(player));
    if (ownNodes.length < 1) {
      return { connected: false, ownNode: null };
    }

    const startKey = `${startR},${startC}`;
    const queue = [{ r: startR, c: startC, usedRoad: false }];
    const visited = new Set([`${startKey}|0`]);

    while (queue.length > 0) {
      const current = queue.shift();

      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const hex = board[neighbor.r]?.[neighbor.c];
        if (!hex) continue;

        const isNode = this._isOwnNodeHex(hex, player);
        const isRoad = this._isOwnRoadHex(hex, player);
        const isStartNode = neighbor.r === startR && neighbor.c === startC;
        if (!isNode && !isRoad && !isStartNode) continue;

        const usedRoad = current.usedRoad || isRoad;
        const key = `${neighbor.r},${neighbor.c}`;
        const visitKey = `${key}|${usedRoad ? 1 : 0}`;
        if (visited.has(visitKey)) continue;

        // Debe enlazar con OTRO nodo propio usando al menos un tramo de camino.
        if (isNode && key !== startKey && usedRoad) {
          return {
            connected: true,
            ownNode: { r: neighbor.r, c: neighbor.c, ownerId: player }
          };
        }

        visited.add(visitKey);
        queue.push({ r: neighbor.r, c: neighbor.c, usedRoad });
      }
    }

    return { connected: false, ownNode: null };
  },

  isOriginNodeConnectedToOwnNationality(player, originNode) {
    return this._getRoadConnectionToOwnNode(player, originNode).connected;
  },

  getShortestPathBetweenNodes(fromNode, toNode) {
    const startR = Number(fromNode?.r);
    const startC = Number(fromNode?.c);
    const goalR = Number(toNode?.r);
    const goalC = Number(toNode?.c);

    if (![startR, startC, goalR, goalC].every(Number.isFinite)) return [];
    if (!board[startR]?.[startC] || !board[goalR]?.[goalC]) return [];

    const startKey = `${startR},${startC}`;
    const goalKey = `${goalR},${goalC}`;
    if (startKey === goalKey) return [{ r: startR, c: startC }];

    const queue = [{ r: startR, c: startC }];
    const visited = new Set([startKey]);
    const previous = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = getHexNeighbors(current.r, current.c);

      for (const n of neighbors) {
        if (!board[n.r]?.[n.c]) continue;

        const key = `${n.r},${n.c}`;
        if (visited.has(key)) continue;

        visited.add(key);
        previous.set(key, `${current.r},${current.c}`);

        if (key === goalKey) {
          const path = [];
          let cursor = key;
          while (cursor) {
            const [r, c] = cursor.split(',').map(Number);
            path.push({ r, c });
            cursor = previous.get(cursor);
          }
          path.reverse();
          return path;
        }

        queue.push({ r: n.r, c: n.c });
      }
    }

    return [];
  },

  getClosestInfrastructureNode(player, source, filterFn = null) {
    const sourceR = Number(source?.r);
    const sourceC = Number(source?.c);
    if (![sourceR, sourceC].every(Number.isFinite)) return null;

    return this.getInfrastructureNodes()
      .filter(node => this._isAllowedCorridorNode(node, player))
      .filter(node => !filterFn || filterFn(node))
      .sort((a, b) => this.distance(sourceR, sourceC, a.r, a.c) - this.distance(sourceR, sourceC, b.r, b.c))[0] || null;
  },

  getCorridorPathBetweenNodes(player, fromNode, toNode) {
    const startR = Number(fromNode?.r);
    const startC = Number(fromNode?.c);
    const goalR = Number(toNode?.r);
    const goalC = Number(toNode?.c);
    if (![startR, startC, goalR, goalC].every(Number.isFinite)) return null;
    if (!board[startR]?.[startC] || !board[goalR]?.[goalC]) return null;

    const roadBuildable = this._getRoadBuildableTerrains();
    const startKey = `${startR},${startC}`;
    const goalKey = `${goalR},${goalC}`;
    const queue = [{ r: startR, c: startC }];
    const visited = new Set([startKey]);
    const previous = new Map();

    while (queue.length > 0) {
      const current = queue.shift();
      const currentKey = `${current.r},${current.c}`;
      if (currentKey === goalKey) break;

      for (const neighbor of getHexNeighbors(current.r, current.c)) {
        const key = `${neighbor.r},${neighbor.c}`;
        if (visited.has(key)) continue;

        const hex = board[neighbor.r]?.[neighbor.c];
        const isEndpoint = key === goalKey;
        if (!this._isTraversableCorridorHex(hex, player, roadBuildable, isEndpoint)) continue;

        visited.add(key);
        previous.set(key, currentKey);
        queue.push({ r: neighbor.r, c: neighbor.c });
      }
    }

    if (!visited.has(goalKey)) return null;

    const path = [];
    let cursor = goalKey;
    while (cursor) {
      const [r, c] = cursor.split(',').map(Number);
      path.push({ r, c });
      cursor = previous.get(cursor);
    }

    return path.reverse();
  },

  getPendingCorridorSegments(player, path) {
    if (!Array.isArray(path) || path.length < 3) return [];
    const roadBuildable = this._getRoadBuildableTerrains();

    return path.filter((step, index) => {
      const isEndpoint = index === 0 || index === path.length - 1;
      if (isEndpoint) return false;

      const hex = board[step.r]?.[step.c];
      if (!hex) return false;
      if (hex.isCity || hex.structure) return false;
      if (hex.terrain === 'water' || hex.terrain === 'forest') return false;
      if (roadBuildable.length > 0 && !roadBuildable.includes(hex.terrain)) return false;
      return Number(hex.owner) !== Number(player);
    });
  },

  getNearestCorridorMissionForUnit(player, unit) {
    if (!unit) return null;

    const connectedOriginCandidates = this.getInfrastructureNodes()
      .map(node => {
        const connection = this._getRoadConnectionToOwnNode(player, node);
        return {
          node,
          connected: connection.connected,
          linkedOwnNode: connection.ownNode
        };
      })
      .filter(entry => entry.connected)
      .sort((a, b) => this.distance(unit.r, unit.c, a.r, a.c) - this.distance(unit.r, unit.c, b.r, b.c))[0] || null;

    const anchorNode = connectedOriginCandidates?.node || null;
    if (!anchorNode) return null;

    const candidateNodes = this.getInfrastructureNodes()
      .filter(node => this._isAllowedCorridorNode(node, player))
      .filter(node => !(node.r === anchorNode.r && node.c === anchorNode.c))
      .map(node => {
        const path = this.getCorridorPathBetweenNodes(player, anchorNode, node);
        if (!path) return null;

        const pendingCaptureSegments = this.getPendingCorridorSegments(player, path);
        if (!pendingCaptureSegments.length) return null;

        return {
          anchorNode,
          targetNode: node,
          path,
          pendingCaptureSegments,
          distanceFromUnitToAnchor: this.distance(unit.r, unit.c, anchorNode.r, anchorNode.c),
          distanceBetweenNodes: this.distance(anchorNode.r, anchorNode.c, node.r, node.c)
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.distanceBetweenNodes !== b.distanceBetweenNodes) {
          return a.distanceBetweenNodes - b.distanceBetweenNodes;
        }
        if (a.pendingCaptureSegments.length !== b.pendingCaptureSegments.length) {
          return a.pendingCaptureSegments.length - b.pendingCaptureSegments.length;
        }
        return a.distanceFromUnitToAnchor - b.distanceFromUnitToAnchor;
      });

    if (!candidateNodes.length) return null;

    const best = candidateNodes[0];
    const linkedOwn = connectedOriginCandidates?.linkedOwnNode || null;

    console.log(`[IA_SENTIDOS][CORREDOR] Unidad (${unit.r},${unit.c}) -> origen (${anchorNode.r},${anchorNode.c}) conectado=SI${linkedOwn ? ` enlacePropio=(${linkedOwn.r},${linkedOwn.c})` : ''} -> destino (${best.targetNode.r},${best.targetNode.c}) -> ocupar (${best.pendingCaptureSegments[0].r},${best.pendingCaptureSegments[0].c})`);

    return {
      ...best,
      linkedOwnNode: linkedOwn,
      objectiveHex: best.pendingCaptureSegments[0]
    };
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
    const enemies = this.getEnemyPlayerIds(player);
    const enemyUnits = units.filter(u => enemies.includes(u.player) && u.currentHealth > 0);
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
