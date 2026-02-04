/**
 * test-systems.js
 * Script de diagnóstico para verificar el estado de los sistemas
 * Ejecutar en consola: copiar y pegar este código
 */

0 && console.log('%c=== DIAGNÓSTICO DE SISTEMAS ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');

// 1. Verificar que los objetos existen
0 && console.log('\n%c1. VERIFICACIÓN DE OBJETOS CARGADOS', 'color: #00f3ff; font-weight: bold;');
0 && console.log('LedgerManager:', typeof LedgerManager !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('LedgerUI:', typeof LedgerUI !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('LedgerIntegration:', typeof LedgerIntegration !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('StatTracker:', typeof StatTracker !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('ReplayEngine:', typeof ReplayEngine !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('ReplayStorage:', typeof ReplayStorage !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('ReplayIntegration:', typeof ReplayIntegration !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('Chronicle:', typeof Chronicle !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');

// 2. Verificar elementos DOM
0 && console.log('\n%c2. VERIFICACIÓN DE ELEMENTOS HTML', 'color: #00f3ff; font-weight: bold;');
const topBarMenu = document.getElementById('top-bar-menu');
const ledgerModal = document.getElementById('ledgerModal');
const btnOpenLedger = document.getElementById('btn-open-ledger');
const fullCodexModal = document.getElementById('fullCodexModal');
const fullCodexList = document.getElementById('fullCodexList');

0 && console.log('top-bar-menu:', topBarMenu ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('ledgerModal:', ledgerModal ? '✅ Existe' : '❌ NO EXISTE');
0 && console.log('btn-open-ledger:', btnOpenLedger ? '✅ Existe (Botón Cuaderno)' : '❌ NO EXISTE (Botón no creado)');
0 && console.log('fullCodexModal:', fullCodexModal ? '✅ Existe (Crónicas Históricas)' : '❌ NO EXISTE');
0 && console.log('fullCodexList:', fullCodexList ? '✅ Existe (Lista de replays)' : '❌ NO EXISTE');

// 3. Verificar estado de inicialización
0 && console.log('\n%c3. ESTADO DE INICIALIZACIÓN', 'color: #00f3ff; font-weight: bold;');
if (typeof LedgerIntegration !== 'undefined') {
    0 && console.log('LedgerIntegration.initialized:', LedgerIntegration.initialized ? '✅ Inicializado' : '❌ NO inicializado');
}
if (typeof LedgerUI !== 'undefined') {
    0 && console.log('LedgerUI.isVisible:', LedgerUI.isVisible ? '✅ Visible' : '⚪ Oculto (normal)');
    0 && console.log('LedgerUI.modalElement:', LedgerUI.modalElement ? '✅ Conectado' : '❌ NO conectado');
}
if (typeof StatTracker !== 'undefined') {
    0 && console.log('StatTracker.isEnabled:', StatTracker.isEnabled ? '✅ Habilitado' : '❌ NO habilitado');
}
if (typeof ReplayEngine !== 'undefined') {
    0 && console.log('ReplayEngine.isEnabled:', ReplayEngine.isEnabled ? '✅ Habilitado' : '❌ NO habilitado');
    0 && console.log('ReplayEngine.matchId:', ReplayEngine.matchId || '(ninguno)');
    0 && console.log('ReplayEngine.timeline.length:', ReplayEngine.timeline?.length || 0);
}

// 4. Verificar PlayerDataManager (necesario para guardar replays)
0 && console.log('\n%c4. AUTENTICACIÓN (Requerido para replays)', 'color: #00f3ff; font-weight: bold;');
if (typeof PlayerDataManager !== 'undefined') {
    0 && console.log('PlayerDataManager.currentPlayer:', PlayerDataManager.currentPlayer ? '✅ Autenticado' : '❌ NO autenticado');
    if (PlayerDataManager.currentPlayer) {
        0 && console.log('  - auth_id:', PlayerDataManager.currentPlayer.auth_id || '(ninguno)');
        0 && console.log('  - displayName:', PlayerDataManager.currentPlayer.displayName || '(ninguno)');
    }
}

// 5. Pruebas de funcionalidad
0 && console.log('\n%c5. PRUEBAS RÁPIDAS', 'color: #00f3ff; font-weight: bold;');
0 && console.log('Para probar el Cuaderno de Estado, ejecuta:');
0 && console.log('%cLedgerIntegration.openLedger()', 'background: #444; padding: 5px; color: #0f0;');

0 && console.log('\nPara ver eventos de Chronicle:');
0 && console.log('%cChronicle.currentMatchLogs', 'background: #444; padding: 5px; color: #0f0;');

0 && console.log('\nPara verificar replays guardados:');
0 && console.log('%cawait ReplayStorage.listReplays()', 'background: #444; padding: 5px; color: #0f0;');

0 && console.log('\n%c=== FIN DEL DIAGNÓSTICO ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');
