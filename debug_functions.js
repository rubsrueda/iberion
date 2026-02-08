// debug_functions.js
// Funciones de utilidad para pruebas y debugging
// Ejecutar desde la consola del navegador (F12)

const DebugTools = {
    // ===== MONEDAS =====
    
    /**
     * Agregar oro al jugador actual
     * Uso: DebugTools.addGold(5000)
     */
    addGold: function(amount = 1000) {
        return PlayerDataManager.debugAddGold(amount);
    },

    /**
     * Agregar gemas al jugador actual
     * Uso: DebugTools.addGems(500)
     */
    addGems: function(amount = 100) {
        return PlayerDataManager.debugAddGems(amount);
    },

    /**
     * Agregar todas las monedas
     * Uso: DebugTools.addAllCurrencies(2) - multiplica x2 las cantidades base
     */
    addAllCurrencies: function(multiplier = 1) {
        return PlayerDataManager.debugAddAllCurrencies(multiplier);
    },

    /**
     * Ver monedas actuales
     * Uso: DebugTools.showCurrencies()
     */
    showCurrencies: function() {
        return PlayerDataManager.debugShowCurrencies();
    },

    // ===== RAID =====
    
    /**
     * Ver estado completo del raid
     * Uso: DebugTools.raidStatus()
     */
    raidStatus: function() {
        RaidManager.debugShowRaidState();
    },

    /**
     * Verificar consistencia del raid (incluye HP, regimientos, etc)
     * Uso: DebugTools.checkRaid()
     */
    checkRaid: function() {
        RaidManager.debugCheckConsistency();
    },

    /**
     * Forzar transición a la siguiente fase
     * Uso: DebugTools.nextPhase()
     */
    nextPhase: async function() {
        await RaidManager.debugForceNextStage();
    },

    /**
     * Reparar HP corrupto de la caravana
     * Uso: DebugTools.repairHP()
     */
    repairHP: async function() {
        await RaidManager.debugRepairCaravanHP();
    },

    /**
     * Resetear raid completamente
     * Uso: DebugTools.resetRaid('alliance-id')
     */
    resetRaid: async function(allianceId) {
        await RaidManager.debugResetRaid(allianceId);
    },

    /**
     * Ver HP actual de la caravana en tiempo real
     * Uso: DebugTools.checkHP()
     */
    checkHP: async function() {
        if (!RaidManager.currentRaid) {
            console.error("No hay raid activo");
            return;
        }

        console.log("%c=== HP DE LA CARAVANA ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
        
        // HP local
        const localHP = RaidManager.currentRaid.stage_data.caravan_hp;
        const localMaxHP = RaidManager.currentRaid.stage_data.caravan_max_hp;
        console.log("HP Local (en memoria):", localHP, "/", localMaxHP);
        
        // HP en la BD
        const { data: raid } = await supabaseClient
            .from('alliance_raids')
            .select('stage_data')
            .eq('id', RaidManager.currentRaid.id)
            .single();
            
        if (raid) {
            const remoteHP = raid.stage_data.caravan_hp;
            const remoteMaxHP = raid.stage_data.caravan_max_hp;
            console.log("HP Remoto (en BD):", remoteHP, "/", remoteMaxHP);
            
            if (localHP !== remoteHP) {
                console.warn("%c⚠️ DESINCRONIZACIÓN DETECTADA", 'background: #ff0000; color: #fff; font-weight: bold;');
                console.warn("Diferencia:", remoteHP - localHP);
            } else {
                console.log("%c✅ HP sincronizado correctamente", 'background: #00ff00; color: #000;');
            }
            
            // HP del boss en el mapa
            const bossUnit = units.find(u => u.id === 'boss_caravan' || u.isBoss);
            if (bossUnit) {
                console.log("HP del Boss (visual):", bossUnit.currentHealth, "/", bossUnit.maxHealth);
                
                if (bossUnit.currentHealth !== remoteHP) {
                    console.warn("⚠️ HP visual no coincide con la BD");
                }
            }
        }
    },

    /**
     * Detener monitoreo de HP (si causa problemas)
     * Uso: DebugTools.stopMonitoring()
     */
    stopMonitoring: function() {
        RaidManager.stopHPMonitoring();
        console.log("✅ Monitoreo de HP detenido");
    },

    /**
     * Reiniciar monitoreo de HP
     * Uso: DebugTools.startMonitoring()
     */
    startMonitoring: function() {
        RaidManager.startHPMonitoring();
        console.log("✅ Monitoreo de HP iniciado");
    },

    /**
     * Verificar estado del monitoreo
     * Uso: DebugTools.monitoringStatus()
     */
    monitoringStatus: function() {
        const isMonitoring = !!RaidManager.hpMonitoringInterval;
        const isUpdating = RaidManager.isUpdatingHP;
        
        console.log("%c=== ESTADO DEL MONITOREO ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
        console.log("🔄 Monitoreo activo:", isMonitoring ? "SÍ" : "NO");
        console.log("🔒 Actualización en progreso:", isUpdating ? "SÍ" : "NO");
        
        if (isMonitoring) {
            console.log("⏰ Intervalo ejecutándose cada 3 segundos");
        }
        
        return { isMonitoring, isUpdating };
    },

    // ===== JUEGO =====
    
    /**
     * Ver gameState completo
     * Uso: DebugTools.gameState()
     */
    gameState: function() {
        console.log("%c=== GAME STATE ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log(gameState);
        return gameState;
    },

    /**
     * Ver jugador actual
     * Uso: DebugTools.player()
     */
    player: function() {
        console.log("%c=== JUGADOR ACTUAL ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log(PlayerDataManager.currentPlayer);
        return PlayerDataManager.currentPlayer;
    },

    /**
     * Ver unidades en el tablero
     * Uso: DebugTools.units()
     */
    units: function() {
        console.log("%c=== UNIDADES EN EL TABLERO ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log("Total de unidades:", units.length);
        console.table(units.map(u => ({
            id: u.id,
            player: u.player,
            name: u.name,
            hp: u.currentHealth + " / " + u.maxHealth,
            pos: `(${u.r}, ${u.c})`,
            regiments: u.regiments?.length || 0
        })));
        return units;
    },

    /**
     * Ver boss de la caravana
     * Uso: DebugTools.boss()
     */
    boss: function() {
        const bossUnit = units.find(u => u.id === 'boss_caravan' || u.isBoss);
        if (bossUnit) {
            console.log("%c=== BOSS CARAVANA ===", 'background: #ff6600; color: #fff; font-weight: bold; padding: 10px;');
            console.log("Nombre:", bossUnit.name);
            console.log("HP:", bossUnit.currentHealth, "/", bossUnit.maxHealth);
            console.log("Posición:", `(${bossUnit.r}, ${bossUnit.c})`);
            console.log("Regimientos:", bossUnit.regiments?.length || 0);
            if (bossUnit.regiments?.[0]) {
                console.log("Tipo:", bossUnit.regiments[0].type);
            }
            console.log("Sprite:", bossUnit.sprite);
            return bossUnit;
        } else {
            console.error("No se encontró el boss de la caravana");
            return null;
        }
    },

    // ===== UTILIDADES =====
    
    /**
     * Limpiar consola
     * Uso: DebugTools.clear()
     */
    clear: function() {
        console.clear();
        console.log("%c=== CONSOLA LIMPIA ===", 'background: #00ff00; color: #000; font-weight: bold; padding: 10px;');
    },

    /**
     * Mostrar ayuda con todos los comandos disponibles
     * Uso: DebugTools.help()
     */
    help: function() {
        console.log("%c=== COMANDOS DISPONIBLES ===", 'background: #6600ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log("\n💰 MONEDAS:");
        console.log("  DebugTools.addGold(cantidad)           - Agregar oro");
        console.log("  DebugTools.addGems(cantidad)           - Agregar gemas");
        console.log("  DebugTools.addAllCurrencies(mult)      - Agregar todas las monedas");
        console.log("  DebugTools.showCurrencies()            - Ver monedas actuales");
        
        console.log("\n⚔️ RAID:");
        console.log("  DebugTools.raidStatus()                - Ver estado del raid");
        console.log("  DebugTools.checkRaid()                 - Verificar consistencia");
        console.log("  DebugTools.checkHP()                   - Ver HP de la caravana");
        console.log("  DebugTools.nextPhase()                 - Forzar siguiente fase");
        console.log("  DebugTools.repairHP()                  - Reparar HP corrupto");
        console.log("  DebugTools.resetRaid(allianceId)       - Resetear raid");
        console.log("  DebugTools.stopMonitoring()            - Detener monitoreo de HP");
        console.log("  DebugTools.startMonitoring()           - Iniciar monitoreo de HP");
        console.log("  DebugTools.monitoringStatus()          - Ver estado del monitoreo");
        
        console.log("\n🎮 JUEGO:");
        console.log("  DebugTools.gameState()                 - Ver gameState");
        console.log("  DebugTools.player()                    - Ver jugador actual");
        console.log("  DebugTools.units()                     - Ver unidades en tablero");
        console.log("  DebugTools.boss()                      - Ver boss de la caravana");
        
        console.log("\n🔧 UTILIDADES:");
        console.log("  DebugTools.clear()                     - Limpiar consola");
        console.log("  DebugTools.help()                      - Mostrar esta ayuda");
        
        console.log("\n💡 TIP: También puedes usar las funciones directamente:");
        console.log("  PlayerDataManager.debugAddGold(5000)");
        console.log("  RaidManager.debugCheckConsistency()");
    }
};

// Hacer disponible globalmente
window.DebugTools = DebugTools;

// Mostrar ayuda inicial
console.log("\n📚 Usa DebugTools.help() para ver todos los comandos disponibles");
console.log("📚 Ejemplo rápido: DebugTools.addGold(5000)\n");
