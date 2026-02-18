// --- Inicialización del juego normal ---
if (!(window.gameState && window.gameState.isTutorialActive)) {
  if (typeof initializeNewGameBoardDOMAndData === 'function') {
    initializeNewGameBoardDOMAndData('min', 'small', false, 'development');
  }
  // No ejecutar nada más: tutorialBoard.js no afecta el juego normal
  return;
}

// --- Inicialización del board[][] tutorial igual que boardManager.js ---
if (window.tutorialBoard && Array.isArray(window.tutorialBoard) && window.tutorialBoard.length > 0 && window.tutorialBoardResources && Array.isArray(window.tutorialBoardResources)) {
  window.board = [];
  for (let r = 0; r < window.tutorialBoard.length; r++) {
    window.board[r] = [];
    for (let c = 0; c < window.tutorialBoard[0].length; c++) {
      let terrainType = 'water', structure = null, isCity = false, isCapital = false, owner = null, resourceNode = null;
      const ch = window.tutorialBoard[r][c];
      const resource = window.tutorialBoardResources[r][c];
      if (ch === 'L') terrainType = 'plains';
      else if (ch === 'H') terrainType = 'hills';
      else if (ch === 'F') terrainType = 'forest';
      else if (ch === 'A') { terrainType = 'plains'; structure = 'Capital'; isCapital = true; owner = 1; }
      else if (ch === 'B') { terrainType = 'plains'; structure = 'Capital'; isCapital = true; owner = 2; }
      else if (ch === 'K') { terrainType = 'plains'; structure = 'Banca'; owner = BankManager ? BankManager.PLAYER_ID : null; }
      else if (ch === 'X') { terrainType = 'plains'; structure = 'Ciudad Bárbara'; isCity = true; owner = 3; }
      else if (ch === 'Y') { terrainType = 'plains'; structure = 'Ciudad'; isCity = true; owner = 2; }
      else if (ch === 'W') terrainType = 'water';
      // Reglas de recursos tutorial
      if (resource === 'O') resourceNode = 'oro';
      else if (resource === 'I') resourceNode = 'hierro';
      else if (resource === 'P') resourceNode = 'piedra';
      else if (resource === 'tree') resourceNode = 'madera';
      window.board[r][c] = {
        r,
        c,
        terrain: terrainType,
        structure,
        isCity,
        isCapital,
        owner,
        resourceNode,
        element: null,
        visibility: { player1: 'visible', player2: 'visible' },
        unit: null
      };
    }
  }
  // Render DOM igual que boardManager.js
  if (typeof domElements !== 'undefined' && domElements.gameBoard) {
    domElements.gameBoard.innerHTML = '';
    for (let r = 0; r < window.board.length; r++) {
      for (let c = 0; c < window.board[0].length; c++) {
        const hexData = window.board[r][c];
        const hexEl = document.createElement('div');
        hexEl.className = 'hex';
        hexData.element = hexEl;
        hexEl.style.gridRow = r + 1;
        hexEl.style.gridColumn = c + 1;
        window.board[r][c].element = hexEl;
        if (typeof renderSingleHexVisuals === 'function') renderSingleHexVisuals(r, c);
        domElements.gameBoard.appendChild(hexEl);
      }
    }
  }
}
// Solo inicializar el mapa normal si NO es tutorial
if (window.gameState && !window.gameState.isTutorialActive) {
  if (typeof initializeNewGameBoardDOMAndData === 'function') {
    initializeNewGameBoardDOMAndData('min', 'small', false, 'development');
  }
}
// Solo renderizar el tutorial si ES tutorial
if (window.gameState && window.gameState.isTutorialActive) {
  if (typeof renderFullBoardVisualState === 'function') {
    renderFullBoardVisualState();
  } else if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
    UIManager.updateAllUIDisplays();
  }
}
// tutorialBoard.js
// Mapa fijo para el tutorial de Iberion

window.tutorialBoardLoaded = true;
console.log("tutorialBoard.js CARGADO - mapa fijo disponible");

// Variables para elementos clave
// Islas irregulares, más grandes (~50 casillas cada una)
const ISLA_IZQ = [
  ["W","W","A","L","F","L","L","W"],
  ["W","L","H","L","F","L","L","W"],
  ["L","L","L","L","O","L","L","W"],
  ["L","F","L","L","L","H","L","L"],
  ["L","L","L","L","L","L","I","W"],
  ["L","L","L","L","L","L","L","W"],
  ["W","L","L","H","L","L","P","W"],
  ["W","W","L","L","L","L","W","W"]
];

const ISLA_DER = [
  ["W","W","F","L","L","B","L","W"],
  ["W","L","L","L","H","F","L","W"],
  ["W","L","L","L","L","L","L","L"],
  ["L","F","L","L","L","H","L","W"],
  ["W","L","L","L","L","L","L","L"],
  ["W","L","L","L","L","L","L","L"],
  ["W","L","L","H","L","L","O","W"],
  ["W","W","L","L","I","L","W","W"]
];

const BANCA = "K";
// Ciudades bárbaras y banca dentro de las islas
const CIUDADES_BARBARAS = [
  [2,2], [4,5], // en isla izquierda
  [2,12], [5,11] // en isla derecha
];

// Recursos: O=Oro, I=Hierro, P=Piedra, F=Árbol (bosque)
// Banca: B
// Colinas: H
// Bosques: F

// Construcción del mapa con dos capas: terreno y recurso
window.tutorialBoard = [];
window.tutorialBoardResources = [];
for(let r=0; r<12; r++) {
  let fila = [];
  let recursos = [];
  for(let c=0; c<15; c++) {
    // Centro: banca
    if(r===5 && c===7) {
      fila.push(BANCA);
      recursos.push(null);
    }
    // Isla izquierda (irregular, más grande)
    else if(r<8 && c<8 && Array.isArray(ISLA_IZQ[r]) && typeof ISLA_IZQ[r][c] !== 'undefined') {
      let val = ISLA_IZQ[r][c];
      if(["O","P","I"].includes(val)) {
        fila.push("H");
        recursos.push(val);
      } else if(val === "H") {
        fila.push("H");
        recursos.push(null);
      } else if(val === "F") {
        fila.push("F");
        recursos.push("tree");
      } else {
        fila.push(val);
        recursos.push(null);
      }
    }
    // Isla derecha (irregular, más grande)
    else if(r<8 && c>6 && Array.isArray(ISLA_DER[r]) && typeof ISLA_DER[r][c-7] !== 'undefined') {
      let val = ISLA_DER[r][c-7];
      if(["O","P","I"].includes(val)) {
        fila.push("H");
        recursos.push(val);
      } else if(val === "H") {
        fila.push("H");
        recursos.push(null);
      } else if(val === "F") {
        fila.push("F");
        recursos.push("tree");
      } else {
        fila.push(val);
        recursos.push(null);
      }
    }
    // Ciudades bárbaras
    else if(CIUDADES_BARBARAS.some(([rb,cb])=>rb===r&&cb===c)) {
      fila.push("X");
      recursos.push(null);
    }
    // Agua
    else {
      fila.push("W");
      recursos.push(null);
    }
  }
  window.tutorialBoard.push(fila);
  window.tutorialBoardResources.push(recursos);
}
// Forzar visualización del mapa tutorial SOLO después de definir board y resources
if (typeof renderFullBoardVisualState === 'function') {
  renderFullBoardVisualState();
} else if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
  UIManager.updateAllUIDisplays();
}
