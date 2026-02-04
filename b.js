processEndGameProgression: async function(winningPlayerNumber) {
        // 1. Verificación de seguridad: ¿Hay un jugador logueado?
        if (!this.currentPlayer || !this.currentPlayer.auth_id) {
            0 && console.warn("[PROGRESIÓN] No hay sesión activa para guardar progreso.");
            return;
        }

        const playerWon = (winningPlayerNumber === gameState.myPlayerNumber);
        const pKey = `player${gameState.myPlayerNumber}`;

        // 2. Recolección de méritos de la partida actual
        // Obtenemos bajas del sistema de estadísticas
        const matchKills = (gameState.playerStats && gameState.playerStats.unitsDestroyed) 
            ? (gameState.playerStats.unitsDestroyed[pKey] || 0) 
            : 0;

        // Contamos ciudades controladas en el mapa final
        const matchCities = board.flat().filter(h => h && h.owner === gameState.myPlayerNumber && h.isCity).length;
        
        // Obtenemos comercios realizados
        const matchTrades = (gameState.playerStats && gameState.playerStats.sealTrades)
            ? (gameState.playerStats.sealTrades[pKey] || 0)
            : 0;

        // 3. Actualización de las estadísticas de CARRERA (Histórico acumulado)
        this.currentPlayer.total_kills = (this.currentPlayer.total_kills || 0) + matchKills;
        this.currentPlayer.total_cities = (this.currentPlayer.total_cities || 0) + matchCities;
        this.currentPlayer.total_trades = (this.currentPlayer.total_trades || 0) + matchTrades;
        this.currentPlayer.favorite_civ = gameState.playerCivilizations[gameState.myPlayerNumber] || 'Iberia';

        // 4. Cálculo de XP para el Nivel de Comandante
        // Fórmula: 500 por ganar, 200 por perder + 15 por cada regimiento destruido
        const xpGained = (playerWon ? 500 : 200) + (matchKills * 15);

        // 5. Preparar objeto de métricas para el Historial y la UI
        // Aquí incluimos 'outcome' explícitamente para evitar el error 'toUpperCase'
        const matchData = {
            outcome: playerWon ? 'victoria' : 'derrota',
            turns: gameState.turnNumber || 0,
            kills: matchKills,
            xp_gained: xpGained,
            heroes: units.filter(u => u.player === gameState.myPlayerNumber && u.commander).map(u => u.commander)
        };

        // 6. Sincronizar Nivel en Supabase y Guardar en Historial (Tabla match_history)
        // Esta llamada actualiza localmente el XP y Level y lo sube a la nube.
        const progress = await this.syncMatchResult(xpGained, matchData);

        // 7. Lanzar el Resumen Visual (El modal postMatchModal)
        // Pasamos 'matchData' que ahora SÍ contiene el campo 'outcome'
        if (UIManager && UIManager.showPostMatchSummary) {
            UIManager.showPostMatchSummary(playerWon, xpGained, progress, matchData);
        }

        0 && console.log(`%c[PROGRESIÓN] Finalizada con éxito. XP: +${xpGained}`, "color: #2ecc71; font-weight: bold;");
    },

    // FUNCIÓN PARA EL BOTÓN DE RECLAMAR
    claimDailyReward: async function() {
        if (!this.currentPlayer) return;
        
        const reward = REWARDS_CONFIG.getDailyReward(this.currentPlayer.level || 1);
        
        if (reward.type === 'oro') this.currentPlayer.currencies.gold += reward.qty;
        if (reward.type === 'sellos') this.currentPlayer.currencies.sellos_guerra += reward.qty;

        this.currentPlayer.last_daily_claim = new Date().toISOString();
        await this.saveCurrentPlayer();
        
        showToast(`¡Has reclamado ${reward.label}!`, "success");
        openProfileModal(); // Refrescar pantalla
    },