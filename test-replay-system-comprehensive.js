/**
 * test-replay-system-comprehensive.js
 * Test completo del sistema de replays
 * 
 * Uso:
 * 1. Abre la consola del navegador (F12)
 * 2. Ejecuta: testReplaySystemComprehensive()
 * 3. Revisa los logs
 */

window.testReplaySystemComprehensive = async function() {
    console.log('='.repeat(80));
    console.log('🎬 INICIANDO TEST COMPLETO DEL SISTEMA DE REPLAYS');
    console.log('='.repeat(80));
    
    // 1. VERIFICAR QUE LOS MÓDULOS ESTÁN CARGADOS
    console.log('\n✅ 1. VERIFICANDO CARGA DE MÓDULOS:');
    const modules = [
        'ReplayEngine',
        'ReplayStorage',
        'ReplayIntegration',
        'ReplayUI',
        'Chronicle',
        'ChronicleIntegration'
    ];
    
    for (const module of modules) {
        const exists = typeof window[module] !== 'undefined';
        console.log(`  ${exists ? '✅' : '❌'} ${module}: ${exists ? 'CARGADO' : 'FALTA'}`);
    }
    
    // 2. VERIFICAR ESTADO ACTUAL DEL REPLAY ENGINE
    console.log('\n✅ 2. ESTADO DEL REPLAY ENGINE:');
    console.log(`  - isEnabled: ${ReplayEngine?.isEnabled}`);
    console.log(`  - matchId: ${ReplayEngine?.matchId}`);
    console.log(`  - Eventos en turno actual: ${ReplayEngine?.currentTurnEvents?.length || 0}`);
    console.log(`  - Turnos grabados: ${ReplayEngine?.timeline?.length || 0}`);
    
    // 3. VERIFICAR LOCALSTORAGE
    console.log('\n✅ 3. ESTADO DE LOCALSTORAGE:');
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        console.log(`  - Replays en localStorage: ${localReplays.length}`);
        
        if (localReplays.length > 0) {
            console.log('\n  📋 Replays encontrados:');
            localReplays.forEach((replay, idx) => {
                const metadata = typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata;
                console.log(`    ${idx + 1}. Match ID: ${replay.match_id}`);
                console.log(`       - Share Token: ${replay.share_token || 'FALTA'}`);
                console.log(`       - Timeline: ${replay.timeline?.length || 0} turnos`);
                console.log(`       - Crónica: ${replay.chronicle_logs?.length || 0} eventos`);
                console.log(`       - Guardado en: ${replay.savedAt ? new Date(replay.savedAt).toLocaleString() : 'N/A'}`);
            });
        }
    } catch (err) {
        console.error('❌ Error leyendo localStorage:', err);
    }
    
    // 4. PROBAR CARGAR UN REPLAY
    console.log('\n✅ 4. PROBANDO CARGA DE REPLAY:');
    try {
        const replays = await ReplayStorage.getUserReplays();
        console.log(`  - Replays obtenidos: ${replays?.length || 0}`);
        
        if (replays && replays.length > 0) {
            const testReplay = replays[0];
            console.log(`  - Probando carga del replay: ${testReplay.match_id}`);
            const loaded = await ReplayStorage.loadReplay(testReplay.match_id);
            
            if (loaded) {
                console.log('  ✅ Replay cargado correctamente');
                console.log(`    - Timeline: ${loaded.timeline?.length || 0} turnos`);
                console.log(`    - Chronicle logs: ${loaded.chronicle_logs?.length || 0} eventos`);
                console.log(`    - Share token: ${loaded.share_token || 'FALTA'}`);
                
                // 5. VERIFICAR ESTRUCTURA
                console.log('\n✅ 5. ESTRUCTURA DEL REPLAY:');
                console.log('  Campos presentes:');
                const fields = ['match_id', 'metadata', 'timeline', 'chronicle_logs', 'share_token', 'savedLocally', 'savedAt'];
                for (const field of fields) {
                    const exists = field in loaded;
                    console.log(`    ${exists ? '✅' : '❌'} ${field}`);
                }
                
                // 6. VERIFICAR TIMELINE
                if (loaded.timeline && loaded.timeline.length > 0) {
                    console.log('\n✅ 6. ESTRUCTURA DEL TIMELINE:');
                    const turn1 = loaded.timeline[0];
                    console.log(`  Turno 1:`);
                    console.log(`    - turn: ${turn1.turn}`);
                    console.log(`    - currentPlayer: ${turn1.currentPlayer}`);
                    console.log(`    - events: ${turn1.events?.length || 0}`);
                    
                    if (turn1.events && turn1.events.length > 0) {
                        console.log(`  Evento 1:`);
                        const evt = turn1.events[0];
                        console.log(`    - type: ${evt.type}`);
                        console.log(`    - timestamp: ${new Date(evt.timestamp).toLocaleString()}`);
                    }
                }
                
                // 7. VERIFICAR CHRONICLE
                if (loaded.chronicle_logs && loaded.chronicle_logs.length > 0) {
                    console.log('\n✅ 7. ESTRUCTURA DE CHRONICLE:');
                    const log1 = loaded.chronicle_logs[0];
                    console.log(`  Evento 1:`);
                    console.log(`    - type: ${log1.type}`);
                    console.log(`    - message: ${log1.message}`);
                    console.log(`    - turn: ${log1.turn}`);
                }
                
            } else {
                console.error('❌ No se pudo cargar el replay');
            }
        } else {
            console.log('  ⚠️ No hay replays disponibles');
        }
    } catch (err) {
        console.error('❌ Error cargando replay:', err);
    }
    
    // 8. VERIFICAR CHRONICLE EN MEMORIA
    console.log('\n✅ 8. ESTADO DE CHRONICLE EN MEMORIA:');
    console.log(`  - Eventos en memoria: ${Chronicle?.currentMatchLogs?.length || 0}`);
    if (Chronicle?.currentMatchLogs && Chronicle.currentMatchLogs.length > 0) {
        console.log('  Primeros 3 eventos:');
        Chronicle.currentMatchLogs.slice(0, 3).forEach((log, idx) => {
            console.log(`    ${idx + 1}. ${log.type}: ${log.message?.substring(0, 60)}...`);
        });
    }
    
    // 9. TEST DE SHARE TOKEN
    console.log('\n✅ 9. GENERACIÓN DE SHARE TOKEN:');
    try {
        const testToken = `replay_test_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;
        console.log(`  - Token generado: ${testToken}`);
        console.log(`  - Longitud: ${testToken.length}`);
        console.log(`  - URL de compartir: /index.html?replay=${testToken}`);
    } catch (err) {
        console.error('❌ Error generando token:', err);
    }
    
    // 10. RESUMEN FINAL
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL:');
    console.log('='.repeat(80));
    console.log(`✅ Módulos cargados: ${modules.filter(m => typeof window[m] !== 'undefined').length}/${modules.length}`);
    
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        console.log(`✅ Replays en localStorage: ${localReplays.length}`);
        
        if (localReplays.length > 0) {
            const withToken = localReplays.filter(r => r.share_token).length;
            const withLogs = localReplays.filter(r => r.chronicle_logs && r.chronicle_logs.length > 0).length;
            console.log(`   - Con share_token: ${withToken}/${localReplays.length}`);
            console.log(`   - Con chronicle_logs: ${withLogs}/${localReplays.length}`);
        }
    } catch (err) {
        console.warn('⚠️ No se pudo verificar localStorage');
    }
    
    console.log('\n🎬 TEST COMPLETADO');
    console.log('='.repeat(80));
};

// Hacer disponible también en global scope
window.testReplay = window.testReplaySystemComprehensive;

console.log('📝 Test script cargado. Usa testReplaySystemComprehensive() para ejecutar.');
