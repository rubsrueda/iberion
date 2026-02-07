/**
 * clear-battle-history.js
 * Script para limpiar completamente el historial de batallas del navegador
 * 
 * USO:
 * 1. Abre la consola del navegador (F12)
 * 2. Copia y pega este script completo
 * 3. Ejecuta: clearAllBattleHistory()
 */

async function clearAllBattleHistory() {
    console.log('%c🗑️ LIMPIEZA DE HISTORIAL DE BATALLAS', 'background: #ff0000; color: white; font-size: 20px; padding: 10px;');
    console.log('Iniciando limpieza completa del historial de batallas...\n');

    let cleaned = {
        localStorage: false,
        supabase: false,
        errors: []
    };

    // ========================================================================
    // PASO 1: Limpiar localStorage
    // ========================================================================
    try {
        console.log('%c1️⃣ Limpiando localStorage...', 'color: #0080ff; font-weight: bold;');
        
        // Ver cuántos replays hay antes
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        console.log(`   📊 Replays locales encontrados: ${localReplays.length}`);
        
        if (localReplays.length > 0) {
            console.log('   📋 Algunos ejemplos:', localReplays.slice(0, 3).map(r => ({
                match_id: r.match_id,
                savedAt: r.savedAt
            })));
        }
        
        // Eliminar
        localStorage.removeItem('localReplays');
        console.log('   ✅ localStorage limpiado correctamente');
        cleaned.localStorage = true;
        
    } catch (err) {
        console.error('   ❌ Error limpiando localStorage:', err);
        cleaned.errors.push({ step: 'localStorage', error: err.message });
    }

    // ========================================================================
    // PASO 2: Limpiar Supabase (solo replays del usuario actual)
    // ========================================================================
    try {
        console.log('\n%c2️⃣ Limpiando Supabase...', 'color: #0080ff; font-weight: bold;');
        
        // Verificar autenticación
        if (typeof supabaseClient === 'undefined') {
            throw new Error('supabaseClient no está definido');
        }

        // Verificar usuario autenticado
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            console.warn('   ⚠️ No hay usuario autenticado. Solo se limpió localStorage.');
            cleaned.errors.push({ step: 'supabase', error: 'No autenticado' });
        } else {
            console.log(`   👤 Usuario autenticado: ${user.email || user.id}`);
            
            // Contar replays antes de eliminar
            const { data: replaysBefore, error: countError } = await supabaseClient
                .from('game_replays')
                .select('match_id, created_at', { count: 'exact', head: false })
                .eq('user_id', user.id);

            if (countError) {
                throw countError;
            }

            console.log(`   📊 Replays en Supabase: ${replaysBefore?.length || 0}`);
            
            if (replaysBefore && replaysBefore.length > 0) {
                console.log('   📋 Algunos ejemplos:', replaysBefore.slice(0, 3));
                
                // ELIMINAR replays del usuario
                const { error: deleteError } = await supabaseClient
                    .from('game_replays')
                    .delete()
                    .eq('user_id', user.id);

                if (deleteError) {
                    throw deleteError;
                }

                // Verificar que se eliminaron
                const { count: replaysAfter } = await supabaseClient
                    .from('game_replays')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                console.log(`   📊 Replays restantes: ${replaysAfter || 0}`);
                console.log('   ✅ Supabase limpiado correctamente');
                cleaned.supabase = true;
            } else {
                console.log('   ℹ️ No hay replays en Supabase para eliminar');
                cleaned.supabase = true;
            }
        }

    } catch (err) {
        console.error('   ❌ Error limpiando Supabase:', err);
        cleaned.errors.push({ step: 'supabase', error: err.message });
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('%c📊 RESUMEN DE LIMPIEZA', 'background: #4CAF50; color: white; font-size: 16px; padding: 5px;');
    console.log('='.repeat(60));
    console.log(`✅ localStorage:  ${cleaned.localStorage ? 'LIMPIADO' : '❌ ERROR'}`);
    console.log(`✅ Supabase:      ${cleaned.supabase ? 'LIMPIADO' : '❌ ERROR'}`);
    
    if (cleaned.errors.length > 0) {
        console.log('\n⚠️ Errores encontrados:');
        cleaned.errors.forEach((err, idx) => {
            console.log(`   ${idx + 1}. [${err.step}] ${err.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    
    if (cleaned.localStorage && cleaned.supabase) {
        console.log('%c🎉 ¡LIMPIEZA COMPLETA! Borrón y cuenta nueva exitoso', 'background: #4CAF50; color: white; font-size: 14px; padding: 10px;');
        console.log('\n💡 Ahora el sistema de guardado funcionará correctamente desde cero.');
    } else if (cleaned.localStorage && !cleaned.supabase) {
        console.log('%c⚠️ Limpieza parcial: localStorage limpiado, pero hubo problemas con Supabase', 'background: #ff9800; color: white; font-size: 14px; padding: 10px;');
        console.log('\n💡 Considera ejecutar el script SQL manualmente en Supabase.');
    } else {
        console.log('%c❌ Limpieza incompleta: revisa los errores arriba', 'background: #f44336; color: white; font-size: 14px; padding: 10px;');
    }

    return cleaned;
}

// ============================================================================
// FUNCIÓN DE VERIFICACIÓN (sin eliminar nada)
// ============================================================================
async function verifyBattleHistoryStatus() {
    console.log('%c🔍 VERIFICACIÓN DE HISTORIAL', 'background: #2196F3; color: white; font-size: 16px; padding: 10px;');
    
    const status = {
        localStorage: 0,
        supabase: 0,
        authenticated: false
    };

    // Verificar localStorage
    try {
        const localReplays = JSON.parse(localStorage.getItem('localReplays') || '[]');
        status.localStorage = localReplays.length;
        console.log(`📦 localStorage: ${status.localStorage} replays`);
    } catch (err) {
        console.error('❌ Error leyendo localStorage:', err);
    }

    // Verificar Supabase
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (user) {
            status.authenticated = true;
            const { data: replays } = await supabaseClient
                .from('game_replays')
                .select('match_id', { count: 'exact', head: false })
                .eq('user_id', user.id);
            
            status.supabase = replays?.length || 0;
            console.log(`☁️ Supabase: ${status.supabase} replays (usuario: ${user.email || user.id})`);
        } else {
            console.log('⚠️ No autenticado en Supabase');
        }
    } catch (err) {
        console.error('❌ Error verificando Supabase:', err);
    }

    console.log('\n📊 Total de replays:', status.localStorage + status.supabase);
    return status;
}

// ============================================================================
// INSTRUCCIONES DE USO
// ============================================================================
console.log('%c📖 SCRIPTS DE LIMPIEZA CARGADOS', 'background: #673AB7; color: white; font-size: 14px; padding: 5px;');
console.log(`
Comandos disponibles:

1️⃣ Verificar historial actual (sin cambios):
   verifyBattleHistoryStatus()

2️⃣ Limpiar TODO el historial de batallas:
   clearAllBattleHistory()

⚠️ La limpieza es IRREVERSIBLE. Usa con precaución.
`);
