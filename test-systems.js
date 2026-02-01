/**
 * test-systems.js
 * Script de diagnóstico para verificar el estado de los sistemas
 * Ejecutar en consola: copiar y pegar este código
 */

console.log('%c=== DIAGNÓSTICO DE SISTEMAS ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');

// 1. Verificar que los objetos existen
console.log('\n%c1. VERIFICACIÓN DE OBJETOS CARGADOS', 'color: #00f3ff; font-weight: bold;');
console.log('LedgerManager:', typeof LedgerManager !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('LedgerUI:', typeof LedgerUI !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('LedgerIntegration:', typeof LedgerIntegration !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('StatTracker:', typeof StatTracker !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('ReplayEngine:', typeof ReplayEngine !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('ReplayStorage:', typeof ReplayStorage !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('ReplayIntegration:', typeof ReplayIntegration !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');
console.log('Chronicle:', typeof Chronicle !== 'undefined' ? '✅ Existe' : '❌ NO EXISTE');

// 2. Verificar elementos DOM
console.log('\n%c2. VERIFICACIÓN DE ELEMENTOS HTML', 'color: #00f3ff; font-weight: bold;');
const topBarMenu = document.getElementById('top-bar-menu');
const ledgerModal = document.getElementById('ledgerModal');
const btnOpenLedger = document.getElementById('btn-open-ledger');
const fullCodexModal = document.getElementById('fullCodexModal');
const fullCodexList = document.getElementById('fullCodexList');

console.log('top-bar-menu:', topBarMenu ? '✅ Existe' : '❌ NO EXISTE');
console.log('ledgerModal:', ledgerModal ? '✅ Existe' : '❌ NO EXISTE');
console.log('btn-open-ledger:', btnOpenLedger ? '✅ Existe (Botón Cuaderno)' : '❌ NO EXISTE (Botón no creado)');
console.log('fullCodexModal:', fullCodexModal ? '✅ Existe (Crónicas Históricas)' : '❌ NO EXISTE');
console.log('fullCodexList:', fullCodexList ? '✅ Existe (Lista de replays)' : '❌ NO EXISTE');

// 3. Verificar estado de inicialización
console.log('\n%c3. ESTADO DE INICIALIZACIÓN', 'color: #00f3ff; font-weight: bold;');
if (typeof LedgerIntegration !== 'undefined') {
    console.log('LedgerIntegration.initialized:', LedgerIntegration.initialized ? '✅ Inicializado' : '❌ NO inicializado');
}
if (typeof LedgerUI !== 'undefined') {
    console.log('LedgerUI.isVisible:', LedgerUI.isVisible ? '✅ Visible' : '⚪ Oculto (normal)');
    console.log('LedgerUI.modalElement:', LedgerUI.modalElement ? '✅ Conectado' : '❌ NO conectado');
}
if (typeof StatTracker !== 'undefined') {
    console.log('StatTracker.isEnabled:', StatTracker.isEnabled ? '✅ Habilitado' : '❌ NO habilitado');
}
if (typeof ReplayEngine !== 'undefined') {
    console.log('ReplayEngine.isEnabled:', ReplayEngine.isEnabled ? '✅ Habilitado' : '❌ NO habilitado');
    console.log('ReplayEngine.matchId:', ReplayEngine.matchId || '(ninguno)');
    console.log('ReplayEngine.timeline.length:', ReplayEngine.timeline?.length || 0);
}

// 4. Verificar PlayerDataManager (necesario para guardar replays)
console.log('\n%c4. AUTENTICACIÓN (Requerido para replays)', 'color: #00f3ff; font-weight: bold;');
if (typeof PlayerDataManager !== 'undefined') {
    console.log('PlayerDataManager.currentPlayer:', PlayerDataManager.currentPlayer ? '✅ Autenticado' : '❌ NO autenticado');
    if (PlayerDataManager.currentPlayer) {
        console.log('  - auth_id:', PlayerDataManager.currentPlayer.auth_id || '(ninguno)');
        console.log('  - displayName:', PlayerDataManager.currentPlayer.displayName || '(ninguno)');
    }
}

// 5. Pruebas de funcionalidad
console.log('\n%c5. PRUEBAS RÁPIDAS', 'color: #00f3ff; font-weight: bold;');
console.log('Para probar el Cuaderno de Estado, ejecuta:');
console.log('%cLedgerIntegration.openLedger()', 'background: #444; padding: 5px; color: #0f0;');

console.log('\nPara ver eventos de Chronicle:');
console.log('%cChronicle.currentMatchLogs', 'background: #444; padding: 5px; color: #0f0;');

console.log('\nPara verificar replays guardados:');
console.log('%cawait ReplayStorage.listReplays()', 'background: #444; padding: 5px; color: #0f0;');

console.log('\n%c=== FIN DEL DIAGNÓSTICO ===', 'background: #222; color: #00ff00; font-size: 16px; font-weight: bold; padding: 10px;');
