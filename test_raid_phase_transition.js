// test_raid_phase_transition.js
// Script de prueba para validar el fix de transición entre fases del raid
// Ejecutar desde la consola del navegador cuando estés en el HQ de tu alianza

async function testRaidPhaseTransition() {
    0 && console.log("%c=== TEST DE TRANSICIÓN DE FASES DEL RAID ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
    
    if (!RaidManager.currentRaid) {
        console.error("❌ No hay raid activo. Por favor carga el HQ de tu alianza primero.");
        return;
    }
    
    const originalStage = RaidManager.currentRaid.current_stage;
    0 && console.log("📍 Etapa inicial:", originalStage);
    
    // Paso 1: Verificar consistencia inicial (incluye HP)
    0 && console.log("\n--- PASO 1: Verificación inicial ---");
    RaidManager.debugCheckConsistency();
    
    const initialHP = RaidManager.currentRaid.stage_data.caravan_hp;
    const initialMaxHP = RaidManager.currentRaid.stage_data.caravan_max_hp;
    0 && console.log("HP inicial:", initialHP, "/", initialMaxHP);
    
    // Paso 2: Si no estamos en la etapa 4, forzar transición
    if (originalStage < 4) {
        0 && console.log("\n--- PASO 2: Forzando transición a la siguiente etapa ---");
        await RaidManager.debugForceNextStage();
        
        // Esperar un momento para que se complete la transición
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Paso 3: Verificar que los datos se actualizaron correctamente
        0 && console.log("\n--- PASO 3: Verificación después de la transición ---");
        
        // Recargar datos desde la BD
        const { data: freshData } = await supabaseClient
            .from('alliance_raids')
            .select('*')
            .eq('id', RaidManager.currentRaid.id)
            .single();
        
        if (freshData) {
            0 && console.log("✅ Datos recargados desde la BD");
            0 && console.log("Etapa actual:", freshData.current_stage);
            0 && console.log("Regimientos:", freshData.stage_data.boss_regiments?.length || 0);
            
            if (freshData.stage_data.boss_regiments && freshData.stage_data.boss_regiments.length > 0) {
                0 && console.log("Tipo de regimiento:", freshData.stage_data.boss_regiments[0].type);
                
                // Verificar sprite correspondiente
                const regType = freshData.stage_data.boss_regiments[0].type;
                const expectedSprite = REGIMENT_TYPES[regType]?.sprite || 'N/A';
                0 && console.log("Sprite esperado:", expectedSprite);
                
                // CRÍTICO: Verificar HP de la nueva fase
                const newHP = freshData.stage_data.caravan_hp;
                const newMaxHP = freshData.stage_data.caravan_max_hp;
                const hpPercent = (newHP / newMaxHP) * 100;
                
                0 && console.log("\n%c=== VERIFICACIÓN DE HP DESPUÉS DE TRANSICIÓN ===", 'background: #ff6600; color: #fff; font-weight: bold;');
                0 && console.log("HP de la nueva fase:", newHP, "/", newMaxHP);
                0 && console.log("Porcentaje:", hpPercent.toFixed(1) + "%");
                
                if (hpPercent < 100) {
                    console.error(
                        "%c❌ ERROR: HERENCIA DE DAÑO DETECTADA!",
                        'background: #ff0000; color: #fff; font-weight: bold; padding: 10px;'
                    );
                    console.error("La nueva caravana NO tiene HP completo");
                    console.error("Esto indica que heredó daño de la fase anterior");
                    console.error("\nPuedes repararlo con: RaidManager.debugRepairCaravanHP()");
                } else {
                    0 && console.log(
                        "%c✅ CORRECTO: La nueva caravana tiene HP completo",
                        'background: #00ff00; color: #000; font-weight: bold; padding: 10px;'
                    );
                }
            }
            
            RaidManager.currentRaid = freshData;
        }
        
        RaidManager.debugCheckConsistency();
        
        // Paso 4: Intentar entrar al raid con los nuevos datos
        0 && console.log("\n--- PASO 4: Entrando al raid ---");
        0 && console.log("Si ves el sprite correcto en el mapa, el fix funciona ✅");
        0 && console.log("Presiona F12 y busca los logs con fondo de color:");
        0 && console.log("  - Verde: Creación del boss");
        0 && console.log("  - Amarillo: Sprite final seleccionado");
        0 && console.log("  - Rojo: Errores (no deberían aparecer)");
        
        // NO entrar automáticamente, dejar que el usuario lo haga manualmente
        0 && console.log("\n⚠️ AHORA: Haz clic en el botón 'ATACAR' y verifica el sprite de la caravana");
        0 && console.log("Debería ser:");
        0 && console.log("  - Fase 1: Barco (barco256.png)");
        0 && console.log("  - Fase 2: Caballería (cab_pesada128.png)");
        0 && console.log("  - Fase 3: Caballería (cab_pesada128.png)");
        0 && console.log("  - Fase 4: Barco (barco256.png)");
        
    } else {
        0 && console.log("ℹ️ Ya estás en la última etapa (4/4)");
        0 && console.log("Para probar el fix, necesitas resetear el raid:");
        0 && console.log("  RaidManager.debugResetRaid('tu-alliance-id')");
        0 && console.log("  Y luego iniciar uno nuevo desde el HQ");
    }
    
    0 && console.log("\n" + "=".repeat(80));
    0 && console.log("%c✅ TEST COMPLETADO", 'background: #00ff00; color: #000; font-weight: bold; padding: 10px;');
}

// Función auxiliar para resetear y probar desde cero
async function testFromScratch(allianceId) {
    0 && console.log("%c=== TEST COMPLETO: RESET + NUEVA INCURSIÓN ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
    
    if (!allianceId) {
        console.error("❌ Debes proporcionar el ID de tu alianza");
        0 && console.log("Uso: testFromScratch('tu-alliance-id')");
        return;
    }
    
    // Paso 1: Resetear raid existente
    0 && console.log("\n--- PASO 1: Reseteando raid existente ---");
    await RaidManager.debugResetRaid(allianceId);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Paso 2: Iniciar nuevo raid
    0 && console.log("\n--- PASO 2: Iniciando nuevo raid ---");
    await RaidManager.startNewRaid(allianceId);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Paso 3: Recargar HQ
    0 && console.log("\n--- PASO 3: Recargando HQ ---");
    if (typeof AllianceManager !== 'undefined') {
        await AllianceManager.loadHQ(allianceId);
    }
    
    0 && console.log("\n✅ Test preparado. Ahora:");
    0 && console.log("  1. Haz clic en 'ATACAR' para entrar a la Fase 1");
    0 && console.log("  2. Ejecuta: testRaidPhaseTransition()");
    0 && console.log("  3. Verifica que el sprite cambie correctamente al avanzar de fase");
}

// Instrucciones de uso
0 && console.log("%c=== SCRIPTS DE PRUEBA DISPONIBLES ===", 'background: #6600ff; color: #fff; font-weight: bold; padding: 10px;');
0 && console.log("\n1. Para probar la transición entre fases:");
0 && console.log("   testRaidPhaseTransition()");
0 && console.log("\n2. Para hacer un test completo desde cero:");
0 && console.log("   testFromScratch('tu-alliance-id')");
0 && console.log("\n3. Para verificar consistencia en cualquier momento:");
0 && console.log("   RaidManager.debugCheckConsistency()");
0 && console.log("\n4. Para ver el estado actual del raid:");
0 && console.log("   RaidManager.debugShowRaidState()");
0 && console.log("\n5. Para reparar HP corrupto (emergencia):");
0 && console.log("   RaidManager.debugRepairCaravanHP()");
