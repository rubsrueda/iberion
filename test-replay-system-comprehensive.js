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
    0 && console.log('='.repeat(80));
    0 && console.log('🎬 INICIANDO TEST COMPLETO DEL SISTEMA DE REPLAYS');
    0 && console.log('='.repeat(80));
    
    // 1. VERIFICAR QUE LOS MÓDULOS ESTÁN CARGADOS
    0 && console.log('\n✅ 1. VERIFICANDO CARGA DE MÓDULOS:');
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
        0 && console.log(`  ${exists ? '✅' : '❌'} ${module}: ${exists ? 'CARGADO' : 'FALTA'}`);
    }
    
    // 2. VERIFICAR ESTADO ACTUAL DEL REPLAY ENGINE
    0 && console.log('\n✅ 2. ESTADO DEL REPLAY ENGINE:');
    0 && console.log(`  - isEnabled: ${ReplayEngine?.isEnabled}`);
    0 && console.log(`  - matchId: ${ReplayEngine?.matchId}`);
    0 && console.log(`  - Eventos en turno actual: ${ReplayEngine?.currentTurnEvents?.length || 0}`);
    0 && console.log(`  - Turnos grabados: ${ReplayEngine?.timeline?.length || 0}`);
    
    // 3. VERIFICAR LOCALSTORAGE
    0 && console.log('\n✅ 3. ESTADO DE LOCALSTORAGE:');
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        0 && console.log(`  - Replays en localStorage: ${localReplays.length}`);
        
        if (localReplays.length > 0) {
            0 && console.log('\n  📋 Replays encontrados:');
            localReplays.forEach((replay, idx) => {
                const metadata = typeof replay.metadata === 'string' ? JSON.parse(replay.metadata) : replay.metadata;
                0 && console.log(`    ${idx + 1}. Match ID: ${replay.match_id}`);
                0 && console.log(`       - Share Token: ${replay.share_token || 'FALTA'}`);
                0 && console.log(`       - Timeline: ${replay.timeline?.length || 0} turnos`);
                0 && console.log(`       - Crónica: ${replay.chronicle_logs?.length || 0} eventos`);
                0 && console.log(`       - Guardado en: ${replay.savedAt ? new Date(replay.savedAt).toLocaleString() : 'N/A'}`);
            });
        }
    } catch (err) {
        console.error('❌ Error leyendo localStorage:', err);
    }
    
    // 4. PROBAR CARGAR UN REPLAY
    0 && console.log('\n✅ 4. PROBANDO CARGA DE REPLAY:');
    try {
        const replays = await ReplayStorage.getUserReplays();
        0 && console.log(`  - Replays obtenidos: ${replays?.length || 0}`);
        
        if (replays && replays.length > 0) {
            const testReplay = replays[0];
            0 && console.log(`  - Probando carga del replay: ${testReplay.match_id}`);
            const loaded = await ReplayStorage.loadReplay(testReplay.match_id);
            
            if (loaded) {
                0 && console.log('  ✅ Replay cargado correctamente');
                0 && console.log(`    - Timeline: ${loaded.timeline?.length || 0} turnos`);
                0 && console.log(`    - Chronicle logs: ${loaded.chronicle_logs?.length || 0} eventos`);
                0 && console.log(`    - Share token: ${loaded.share_token || 'FALTA'}`);
                
                // 5. VERIFICAR ESTRUCTURA
                0 && console.log('\n✅ 5. ESTRUCTURA DEL REPLAY:');
                0 && console.log('  Campos presentes:');
                const fields = ['match_id', 'metadata', 'timeline', 'chronicle_logs', 'share_token', 'savedLocally', 'savedAt'];
                for (const field of fields) {
                    const exists = field in loaded;
                    0 && console.log(`    ${exists ? '✅' : '❌'} ${field}`);
                }
                
                // 6. VERIFICAR TIMELINE
                if (loaded.timeline && loaded.timeline.length > 0) {
                    0 && console.log('\n✅ 6. ESTRUCTURA DEL TIMELINE:');
                    const turn1 = loaded.timeline[0];
                    0 && console.log(`  Turno 1:`);
                    0 && console.log(`    - turn: ${turn1.turn}`);
                    0 && console.log(`    - currentPlayer: ${turn1.currentPlayer}`);
                    0 && console.log(`    - events: ${turn1.events?.length || 0}`);
                    
                    if (turn1.events && turn1.events.length > 0) {
                        0 && console.log(`  Evento 1:`);
                        const evt = turn1.events[0];
                        0 && console.log(`    - type: ${evt.type}`);
                        0 && console.log(`    - timestamp: ${new Date(evt.timestamp).toLocaleString()}`);
                    }
                }
                
                // 7. VERIFICAR CHRONICLE
                if (loaded.chronicle_logs && loaded.chronicle_logs.length > 0) {
                    0 && console.log('\n✅ 7. ESTRUCTURA DE CHRONICLE:');
                    const log1 = loaded.chronicle_logs[0];
                    0 && console.log(`  Evento 1:`);
                    0 && console.log(`    - type: ${log1.type}`);
                    0 && console.log(`    - message: ${log1.message}`);
                    0 && console.log(`    - turn: ${log1.turn}`);
                }
                
            } else {
                console.error('❌ No se pudo cargar el replay');
            }
        } else {
            0 && console.log('  ⚠️ No hay replays disponibles');
        }
    } catch (err) {
        console.error('❌ Error cargando replay:', err);
    }
    
    // 8. VERIFICAR CHRONICLE EN MEMORIA
    0 && console.log('\n✅ 8. ESTADO DE CHRONICLE EN MEMORIA:');
    0 && console.log(`  - Eventos en memoria: ${Chronicle?.currentMatchLogs?.length || 0}`);
    if (Chronicle?.currentMatchLogs && Chronicle.currentMatchLogs.length > 0) {
        0 && console.log('  Primeros 3 eventos:');
        Chronicle.currentMatchLogs.slice(0, 3).forEach((log, idx) => {
            0 && console.log(`    ${idx + 1}. ${log.type}: ${log.message?.substring(0, 60)}...`);
        });
    }
    
    // 9. TEST DE SHARE TOKEN
    0 && console.log('\n✅ 9. GENERACIÓN DE SHARE TOKEN:');
    try {
        const testToken = `replay_test_${crypto.getRandomValues(new Uint8Array(8)).join('')}`;
        0 && console.log(`  - Token generado: ${testToken}`);
        0 && console.log(`  - Longitud: ${testToken.length}`);
        0 && console.log(`  - URL de compartir: /index.html?replay=${testToken}`);
    } catch (err) {
        console.error('❌ Error generando token:', err);
    }
    
    // 10. RESUMEN FINAL
    0 && console.log('\n' + '='.repeat(80));
    0 && console.log('📊 RESUMEN FINAL:');
    0 && console.log('='.repeat(80));
    0 && console.log(`✅ Módulos cargados: ${modules.filter(m => typeof window[m] !== 'undefined').length}/${modules.length}`);
    
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        0 && console.log(`✅ Replays en localStorage: ${localReplays.length}`);
        
        if (localReplays.length > 0) {
            const withToken = localReplays.filter(r => r.share_token).length;
            const withLogs = localReplays.filter(r => r.chronicle_logs && r.chronicle_logs.length > 0).length;
            0 && console.log(`   - Con share_token: ${withToken}/${localReplays.length}`);
            0 && console.log(`   - Con chronicle_logs: ${withLogs}/${localReplays.length}`);
        }
    } catch (err) {
        0 && console.warn('⚠️ No se pudo verificar localStorage');
    }
    
    0 && console.log('\n🎬 TEST COMPLETADO');
    0 && console.log('='.repeat(80));
};

// Hacer disponible también en global scope
window.testReplay = window.testReplaySystemComprehensive;

0 && console.log('📝 Test script cargado. Usa testReplaySystemComprehensive() para ejecutar.');
