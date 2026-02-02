/**
 * test-replay-system.js
 * Script de prueba para verificar que el sistema de replays funciona
 * Abre la consola del navegador y ejecuta:
 * testReplaySystem()
 */

async function testReplaySystem() {
    console.log('%c=== TEST REPLAY SYSTEM ===', 'background: #1976d2; color: white; padding: 10px; font-size: 14px;');
    
    // 1. Verificar que los componentes existen
    console.log('\n📦 Verificando componentes globales:');
    const components = [
        'ReplayEngine',
        'ReplayStorage',
        'ReplayIntegration',
        'ReplayUI',
        'ReplayRenderer',
        'Chronicle',
        'ChronicleIntegration'
    ];
    
    components.forEach(comp => {
        const exists = typeof window[comp] !== 'undefined';
        console.log(`   ${exists ? '✅' : '❌'} ${comp}: ${exists ? 'Disponible' : 'NO DISPONIBLE'}`);
    });

    // 2. Verificar localStorage
    console.log('\n💾 Verificando localStorage:');
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        console.log(`   ✅ LocalReplays: ${localReplays.length} replays guardados`);
        if (localReplays.length > 0) {
            console.log('   Primeros replays:', localReplays.slice(0, 2));
        }
    } catch (err) {
        console.log(`   ❌ Error accediendo localStorage: ${err.message}`);
    }

    // 3. Verificar autenticación
    console.log('\n🔐 Verificando autenticación:');
    if (typeof PlayerDataManager !== 'undefined') {
        console.log(`   Jugador actual: ${PlayerDataManager.currentPlayer?.email || 'Desconocido'}`);
        console.log(`   Auth ID: ${PlayerDataManager.currentPlayer?.auth_id || 'No autenticado'}`);
    }

    // 4. Intentar cargar replays
    console.log('\n📂 Intentando cargar replays:');
    if (typeof ReplayStorage !== 'undefined' && ReplayStorage.getUserReplays) {
        try {
            const replays = await ReplayStorage.getUserReplays();
            console.log(`   ✅ Replays cargados: ${replays.length}`);
            if (replays.length > 0) {
                console.log('   Primer replay:', {
                    match_id: replays[0].match_id,
                    metadata: replays[0].metadata,
                    created_at: replays[0].created_at,
                    savedLocally: replays[0].savedLocally
                });
            }
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
        }
    }

    // 5. Crear un replay de prueba
    console.log('\n🧪 Creando replay de prueba:');
    if (typeof ReplayEngine !== 'undefined') {
        try {
            ReplayEngine.initialize('test_match_' + Date.now(), 'test_seed_123', [
                { id: 'p1', name: 'Jugador 1', player_number: 1 },
                { id: 'p2', name: 'Jugador 2', player_number: 2 }
            ]);
            
            // Simular algunos eventos
            ReplayEngine.recordMove('unit1', 'Legión 1', 1, 0, 0, 1, 1);
            ReplayEngine.recordBattle('unit1', 'Legión 1', 'unit2', 'Tropas Enemigas', [1, 1], 1, 'plains', {});
            ReplayEngine.recordTurnEnd(1, 2);
            
            const testReplay = ReplayEngine.finalize(1, 1);
            console.log(`   ✅ Replay de prueba creado:`, testReplay);
            
            // Intentar guardar
            if (typeof ReplayStorage !== 'undefined') {
                const saved = await ReplayStorage.saveReplay(testReplay);
                console.log(`   ${saved ? '✅' : '❌'} Guardado: ${saved ? 'Exitoso' : 'Fallido'}`);
                
                // Verificar que se guardó localmente
                const updated = JSON.parse(localStorage.getItem('localReplays') || '[]');
                console.log(`   📝 LocalReplays después: ${updated.length} replays`);
            }
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
        }
    }

    console.log('\n%c=== FIN DEL TEST ===', 'background: #4caf50; color: white; padding: 10px; font-size: 14px;');
    console.log('💡 Tip: Abre el Códice de Batallas para ver los replays cargados');
}

// Ejecutar automáticamente si estamos en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('ℹ️ Modo desarrollo detectado. Para test: testReplaySystem()');
}
