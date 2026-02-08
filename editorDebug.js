// editorDebug.js
// Script de debugging para el editor de escenarios
// Cargar DESPUÉS de editorUI.js

console.log("editorDebug.js CARGADO - Herramientas de debugging disponibles");

/**
 * Función de debugging: Verificar estado del editor
 */
window.debugEditor = function() {
    console.log("=== DIAGNÓSTICO DEL EDITOR ===");
    
    // 1. Estado del editor
    console.log("\n1. EDITOR STATE:");
    console.log("   - Modo editor activo:", EditorState?.isEditorMode);
    console.log("   - Herramienta actual:", EditorState?.currentTool);
    console.log("   - Dimensiones:", EditorState?.scenarioSettings?.dimensions);
    
    // 2. Contenedores
    console.log("\n2. CONTENEDORES:");
    const editorContainer = document.getElementById('scenarioEditorContainer');
    console.log("   - Editor container:", editorContainer ? "✓ Existe" : "✗ NO EXISTE");
    console.log("   - Display:", editorContainer?.style.display);
    
    const gameContainer = document.querySelector('.game-container');
    console.log("   - Game container:", gameContainer ? "✓ Existe" : "✗ NO EXISTE");
    console.log("   - Display:", gameContainer?.style.display);
    
    // 3. GameBoard
    console.log("\n3. GAMEBOARD:");
    const gameBoard = document.getElementById('gameBoard');
    console.log("   - gameBoard:", gameBoard ? "✓ Existe" : "✗ NO EXISTE");
    console.log("   - Display:", gameBoard?.style.display);
    console.log("   - Z-Index:", gameBoard?.style.zIndex);
    console.log("   - Número de hexágonos:", gameBoard?.children.length);
    
    // 4. Board array
    console.log("\n4. BOARD ARRAY:");
    console.log("   - Board definido:", typeof board !== 'undefined');
    console.log("   - Dimensiones:", board?.length, "x", board?.[0]?.length);
    if (board && board[0] && board[0][0]) {
        console.log("   - Ejemplo hex [0][0]:", {
            terrain: board[0][0].terrain,
            element: board[0][0].element ? "✓" : "✗"
        });
    }
    
    // 5. Visibility
    console.log("\n5. VISIBILIDAD:");
    if (gameBoard) {
        const rect = gameBoard.getBoundingClientRect();
        console.log("   - Posición:", {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        });
        console.log("   - Visible en viewport:", rect.width > 0 && rect.height > 0);
    }
    
    // 6. Resumen
    console.log("\n=== RESUMEN ===");
    const issues = [];
    
    if (!EditorState?.isEditorMode) {
        issues.push("⚠️ Editor no está en modo activo");
    }
    
    if (editorContainer?.style.display === 'none') {
        issues.push("⚠️ Editor container está oculto");
    }
    
    if (gameContainer?.style.display === 'none') {
        issues.push("⚠️ Game container está oculto");
    }
    
    if (!gameBoard || gameBoard.children.length === 0) {
        issues.push("⚠️ GameBoard no tiene hexágonos");
    }
    
    if (issues.length === 0) {
        console.log("✅ TODO PARECE CORRECTO");
        console.log("Si aún no ves el tablero, verifica z-index y capas CSS");
    } else {
        console.log("❌ PROBLEMAS DETECTADOS:");
        issues.forEach(issue => console.log("   " + issue));
    }
    
    console.log("\n=== FIN DIAGNÓSTICO ===");
};

/**
 * Función de debugging: Forzar visibilidad del tablero
 */
window.debugForceShowBoard = function() {
    console.log("Forzando visibilidad del tablero...");
    
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        gameContainer.style.display = 'flex';
        gameContainer.style.visibility = 'visible';
        gameContainer.style.opacity = '1';
        gameContainer.style.zIndex = '1';
        console.log("✓ Game container forzado a visible");
    }
    
    const gameBoard = document.getElementById('gameBoard');
    if (gameBoard) {
        gameBoard.style.display = 'grid';
        gameBoard.style.visibility = 'visible';
        gameBoard.style.opacity = '1';
        gameBoard.style.zIndex = '1';
        console.log("✓ GameBoard forzado a visible");
        console.log("  Hexágonos:", gameBoard.children.length);
    }
    
    console.log("Intenta hacer zoom out (Ctrl + -) si el tablero es muy grande");
};

/**
 * Función de debugging: Recrear tablero desde cero
 */
window.debugRecreateBoard = function(rows = 12, cols = 15) {
    console.log(`Recreando tablero ${rows}x${cols}...`);
    
    if (typeof EditorUI === 'undefined') {
        console.error("❌ EditorUI no está cargado");
        return;
    }
    
    EditorUI.initializeEmptyBoard(rows, cols);
    console.log("✓ Tablero recreado");
    console.log("Ejecuta debugEditor() para verificar");
};

/**
 * Función de debugging: Listar todos los hexágonos
 */
window.debugListHexagons = function(limit = 10) {
    console.log(`Listando primeros ${limit} hexágonos...`);
    
    const gameBoard = document.getElementById('gameBoard');
    if (!gameBoard) {
        console.error("❌ gameBoard no encontrado");
        return;
    }
    
    const hexes = gameBoard.children;
    console.log(`Total de hexágonos: ${hexes.length}`);
    
    for (let i = 0; i < Math.min(limit, hexes.length); i++) {
        const hex = hexes[i];
        console.log(`Hex ${i}:`, {
            r: hex.dataset.r,
            c: hex.dataset.c,
            left: hex.style.left,
            top: hex.style.top,
            className: hex.className
        });
    }
};

/**
 * Atajos rápidos
 */
window.de = window.debugEditor;
window.df = window.debugForceShowBoard;
window.dr = window.debugRecreateBoard;

console.log("\n=== HERRAMIENTAS DE DEBUG DISPONIBLES ===");
console.log("debugEditor()              - Diagnóstico completo (atajo: de())");
console.log("debugForceShowBoard()      - Forzar visibilidad (atajo: df())");
console.log("debugRecreateBoard(r, c)   - Recrear tablero (atajo: dr())");
console.log("debugListHexagons(n)       - Listar hexágonos");
console.log("==========================================\n");
