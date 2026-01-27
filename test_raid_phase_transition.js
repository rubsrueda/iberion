// test_raid_phase_transition.js
// Script de prueba para validar el fix de transición entre fases del raid
// Ejecutar desde la consola del navegador cuando estés en el HQ de tu alianza

async function testRaidPhaseTransition() {
    console.log("%c=== TEST DE TRANSICIÓN DE FASES DEL RAID ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
    
    if (!RaidManager.currentRaid) {
        console.error("❌ No hay raid activo. Por favor carga el HQ de tu alianza primero.");
        return;
    }
    
    const originalStage = RaidManager.currentRaid.current_stage;
    console.log("📍 Etapa inicial:", originalStage);
    
    // Paso 1: Verificar consistencia inicial (incluye HP)
    console.log("\n--- PASO 1: Verificación inicial ---");
    RaidManager.debugCheckConsistency();
    
    const initialHP = RaidManager.currentRaid.stage_data.caravan_hp;
    const initialMaxHP = RaidManager.currentRaid.stage_data.caravan_max_hp;
    console.log("HP inicial:", initialHP, "/", initialMaxHP);
    
    // Paso 2: Si no estamos en la etapa 4, forzar transición
    if (originalStage < 4) {
        console.log("\n--- PASO 2: Forzando transición a la siguiente etapa ---");
        await RaidManager.debugForceNextStage();
        
        // Esperar un momento para que se complete la transición
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Paso 3: Verificar que los datos se actualizaron correctamente
        console.log("\n--- PASO 3: Verificación después de la transición ---");
        
        // Recargar datos desde la BD
        const { data: freshData } = await supabaseClient
            .from('alliance_raids')
            .select('*')
            .eq('id', RaidManager.currentRaid.id)
            .single();
        
        if (freshData) {
            console.log("✅ Datos recargados desde la BD");
            console.log("Etapa actual:", freshData.current_stage);
            console.log("Regimientos:", freshData.stage_data.boss_regiments?.length || 0);
            
            if (freshData.stage_data.boss_regiments && freshData.stage_data.boss_regiments.length > 0) {
                console.log("Tipo de regimiento:", freshData.stage_data.boss_regiments[0].type);
                
                // Verificar sprite correspondiente
                const regType = freshData.stage_data.boss_regiments[0].type;
                const expectedSprite = REGIMENT_TYPES[regType]?.sprite || 'N/A';
                console.log("Sprite esperado:", expectedSprite);
                
                // CRÍTICO: Verificar HP de la nueva fase
                const newHP = freshData.stage_data.caravan_hp;
                const newMaxHP = freshData.stage_data.caravan_max_hp;
                const hpPercent = (newHP / newMaxHP) * 100;
                
                console.log("\n%c=== VERIFICACIÓN DE HP DESPUÉS DE TRANSICIÓN ===", 'background: #ff6600; color: #fff; font-weight: bold;');
                console.log("HP de la nueva fase:", newHP, "/", newMaxHP);
                console.log("Porcentaje:", hpPercent.toFixed(1) + "%");
                
                if (hpPercent < 100) {
                    console.error(
                        "%c❌ ERROR: HERENCIA DE DAÑO DETECTADA!",
                        'background: #ff0000; color: #fff; font-weight: bold; padding: 10px;'
                    );
                    console.error("La nueva caravana NO tiene HP completo");
                    console.error("Esto indica que heredó daño de la fase anterior");
                    console.error("\nPuedes repararlo con: RaidManager.debugRepairCaravanHP()");
                } else {
                    console.log(
                        "%c✅ CORRECTO: La nueva caravana tiene HP completo",
                        'background: #00ff00; color: #000; font-weight: bold; padding: 10px;'
                    );
                }
            }
            
            RaidManager.currentRaid = freshData;
        }
        
        RaidManager.debugCheckConsistency();
        
        // Paso 4: Intentar entrar al raid con los nuevos datos
        console.log("\n--- PASO 4: Entrando al raid ---");
        console.log("Si ves el sprite correcto en el mapa, el fix funciona ✅");
        console.log("Presiona F12 y busca los logs con fondo de color:");
        console.log("  - Verde: Creación del boss");
        console.log("  - Amarillo: Sprite final seleccionado");
        console.log("  - Rojo: Errores (no deberían aparecer)");
        
        // NO entrar automáticamente, dejar que el usuario lo haga manualmente
        console.log("\n⚠️ AHORA: Haz clic en el botón 'ATACAR' y verifica el sprite de la caravana");
        console.log("Debería ser:");
        console.log("  - Fase 1: Barco (barco256.png)");
        console.log("  - Fase 2: Caballería (cab_pesada128.png)");
        console.log("  - Fase 3: Caballería (cab_pesada128.png)");
        console.log("  - Fase 4: Barco (barco256.png)");
        
    } else {
        console.log("ℹ️ Ya estás en la última etapa (4/4)");
        console.log("Para probar el fix, necesitas resetear el raid:");
        console.log("  RaidManager.debugResetRaid('tu-alliance-id')");
        console.log("  Y luego iniciar uno nuevo desde el HQ");
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("%c✅ TEST COMPLETADO", 'background: #00ff00; color: #000; font-weight: bold; padding: 10px;');
}

// Función auxiliar para resetear y probar desde cero
async function testFromScratch(allianceId) {
    console.log("%c=== TEST COMPLETO: RESET + NUEVA INCURSIÓN ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
    
    if (!allianceId) {
        console.error("❌ Debes proporcionar el ID de tu alianza");
        console.log("Uso: testFromScratch('tu-alliance-id')");
        return;
    }
    
    // Paso 1: Resetear raid existente
    console.log("\n--- PASO 1: Reseteando raid existente ---");
    await RaidManager.debugResetRaid(allianceId);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Paso 2: Iniciar nuevo raid
    console.log("\n--- PASO 2: Iniciando nuevo raid ---");
    await RaidManager.startNewRaid(allianceId);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Paso 3: Recargar HQ
    console.log("\n--- PASO 3: Recargando HQ ---");
    if (typeof AllianceManager !== 'undefined') {
        await AllianceManager.loadHQ(allianceId);
    }
    
    console.log("\n✅ Test preparado. Ahora:");
    console.log("  1. Haz clic en 'ATACAR' para entrar a la Fase 1");
    console.log("  2. Ejecuta: testRaidPhaseTransition()");
    console.log("  3. Verifica que el sprite cambie correctamente al avanzar de fase");
}

// Instrucciones de uso
console.log("%c=== SCRIPTS DE PRUEBA DISPONIBLES ===", 'background: #6600ff; color: #fff; font-weight: bold; padding: 10px;');
console.log("\n1. Para probar la transición entre fases:");
console.log("   testRaidPhaseTransition()");
console.log("\n2. Para hacer un test completo desde cero:");
console.log("   testFromScratch('tu-alliance-id')");
console.log("\n3. Para verificar consistencia en cualquier momento:");
console.log("   RaidManager.debugCheckConsistency()");
console.log("\n4. Para ver el estado actual del raid:");
console.log("   RaidManager.debugShowRaidState()");
console.log("\n5. Para reparar HP corrupto (emergencia):");
console.log("   RaidManager.debugRepairCaravanHP()");
