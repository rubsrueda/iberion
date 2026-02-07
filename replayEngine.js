/**
 * replayEngine.js
 * Motor de captura y almacenamiento de eventos de replay
 * Registra todos los eventos que ocurren durante la partida sin afectar la lógica de juego
 * 
 * ⭐ OPTIMIZADO CON DELTA ENCODING:
 * - Turno 0: Snapshot completo (baseline)
 * - Turnos siguientes: Solo cambios (85-90% reducción de tamaño)
 * 
 * TESTING DELTA ENCODING:
 * En la consola después de una partida:
 * ```javascript
 * // Ver estadísticas de compresión
 * const timeline = ReplayEngine.timeline;
 * const t0Size = JSON.stringify(timeline[0]).length;
 * const t1Size = JSON.stringify(timeline[1]).length;
 * console.log('Turno 0:', (t0Size/1024).toFixed(2), 'KB (completo)');
 * console.log('Turno 1:', (t1Size/1024).toFixed(2), 'KB (delta)');
 * console.log('Reducción:', ((1-t1Size/t0Size)*100).toFixed(1), '%');
 * ```
 */

const ReplayEngine = {
    isEnabled: false,
    matchId: null,
    mapSeed: null,
    players: [],
    timeline: [], // Array de eventos por turno
    currentTurnEvents: [],
    startTime: null,
    boardInfo: null, // NUEVO: Información básica del board para reconstrucción
    lastBoardSnapshot: null, // ⭐ DELTA: Último snapshot para comparar
    lastUnitsSnapshot: null, // ⭐ DELTA: Últimas unidades para comparar

    /**
     * Inicializa el motor de replay al comenzar una partida
     */
    initialize: function(matchId, mapSeed, playersInfo) {
        console.log('[ReplayEngine] initialize() llamado con matchId:', matchId);
        
        let safeMatchId = matchId;
        if (!safeMatchId || typeof safeMatchId !== 'string') {
            try {
                safeMatchId = `match_${crypto.randomUUID().substring(0, 8)}`;
            } catch (e) {
                safeMatchId = `match_${Date.now()}`;
            }
        }
        
        this.matchId = safeMatchId;
        this.mapSeed = mapSeed;
        this.players = playersInfo || [];
        this.timeline = [];
        this.currentTurnEvents = [];
        this.isEnabled = true;
        this.startTime = Date.now();
        
        // ⭐ NUEVO: Capturar información básica del board para poder reconstruirlo
        if (typeof board !== 'undefined' && board && board.length > 0) {
            this.boardInfo = {
                rows: board.length,
                cols: board[0]?.length || 0,
                seed: mapSeed
            };
            console.log('[ReplayEngine] BoardInfo capturado:', this.boardInfo);
        } else {
            this.boardInfo = { rows: 20, cols: 20, seed: null }; // Defaults
            console.warn('[ReplayEngine] Board no disponible, usando dimensiones por defecto');
        }
        
        console.log(`[ReplayEngine] ✅ Inicializado. isEnabled=${this.isEnabled}, matchId=${safeMatchId}, players=${this.players.length}`);
    },

    /**
     * ⭐ NUEVO: Registra el estado inicial de la fase de despliegue
     * Captura ciudades de origen, posicionamiento y unidades iniciales
     */
    recordDeploymentSnapshot: function() {
        if (!this.isEnabled) return;
        
        console.log('[ReplayEngine] Capturando snapshot de despliegue...');
        
        const boardSnapshot = this._captureBoardSnapshot();
        const unitsSnapshot = this._captureUnitsSnapshot();
        
        // Guardar como referencia para delta encoding
        this.lastBoardSnapshot = boardSnapshot;
        this.lastUnitsSnapshot = unitsSnapshot;
        
        // Agregar al inicio de timeline (snapshot COMPLETO)
        this.timeline.unshift({
            turn: 0,
            currentPlayer: 0,
            events: [{ type: 'DEPLOYMENT', data: 'Estado inicial de despliegue' }],
            boardState: boardSnapshot,
            unitsState: unitsSnapshot,
            isFullSnapshot: true, // ⭐ Marca como snapshot completo
            timestamp: Date.now()
        });
        
        console.log('[ReplayEngine] ✅ Snapshot de despliegue capturado (completo)');
    },

    /**
     * Registra un evento de movimiento
     */
    recordMove: function(unitId, unitName, playerId, fromR, fromC, toR, toC) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'MOVE',
            unitId: unitId,
            unitName: unitName,
            playerId: playerId,
            from: [fromR, fromC],
            to: [toR, toC],
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de construcción
     */
    recordBuild: function(structureType, r, c, playerId, playerId_name) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'BUILD',
            structureType: structureType,
            location: [r, c],
            playerId: playerId,
            playerName: playerId_name,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de batalla
     */
    recordBattle: function(attackerId, attackerName, defenderId, defenderName, location, winner, terrain, casualties) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'BATTLE',
            attackerId: attackerId,
            attackerName: attackerName,
            defenderId: defenderId,
            defenderName: defenderName,
            location: location,
            winner: winner,
            terrain: terrain,
            casualties: casualties || {},
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de muerte de unidad
     */
    recordUnitDeath: function(unitId, unitName, playerId, location) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'UNIT_DEATH',
            unitId: unitId,
            unitName: unitName,
            playerId: playerId,
            location: location,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de conquista de territorio
     */
    recordConquest: function(r, c, playerId, playerId_name) {
        if (!this.isEnabled) return;
        
        this.currentTurnEvents.push({
            type: 'CONQUEST',
            location: [r, c],
            playerId: playerId,
            playerName: playerId_name,
            timestamp: Date.now()
        });
    },

    /**
     * Registra un evento de fin de turno
     * ⭐ OPTIMIZADO: Usa delta encoding para reducir tamaño
     */
    recordTurnEnd: function(turnNumber, currentPlayer) {
        if (!this.isEnabled) return;
        
        // Capturar snapshot actual
        const boardSnapshot = this._captureBoardSnapshot();
        const unitsSnapshot = this._captureUnitsSnapshot();
        
        // ⭐ DELTA ENCODING: Calcular solo los cambios
        const boardDelta = this._calculateBoardDelta(boardSnapshot);
        const unitsDelta = this._calculateUnitsDelta(unitsSnapshot);
        
        // Actualizar referencias para próximo turno
        this.lastBoardSnapshot = boardSnapshot;
        this.lastUnitsSnapshot = unitsSnapshot;
        
        // Si hay eventos en el turno actual, guardarlos
        if (this.currentTurnEvents.length > 0 || turnNumber === 1) {
            this.timeline.push({
                turn: turnNumber,
                currentPlayer: currentPlayer,
                events: [...this.currentTurnEvents],
                boardDelta: boardDelta,        // ⭐ Solo cambios del board
                unitsDelta: unitsDelta,        // ⭐ Solo cambios de unidades
                isFullSnapshot: false,         // Es un delta
                timestamp: Date.now()
            });
            
            this.currentTurnEvents = [];
        }
    },

    /**
     * ⭐ MEJORADO: Captura el estado actual del tablero de forma compacta
     * Guarda: owner, structure, isCity, terrain (tipo de terreno)
     */
    _captureBoardSnapshot: function() {
        if (typeof board === 'undefined' || !board || board.length === 0) {
            return null;
        }

        const snapshot = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const hex = board[r][c];
                if (!hex) continue;
                
                // Guardamos todos los hexágonos para mantener info de terreno
                snapshot.push({
                    r: r,
                    c: c,
                    o: hex.owner || null,              // owner
                    s: hex.structure || null,          // structure
                    iC: hex.isCity || false,           // isCity
                    iCa: hex.isCapital || false,       // isCapital
                    t: hex.terrain || 'plains'         // ⭐ NUEVO: terrain type
                });
            }
        }
        
        return snapshot;
    },

    /**
     * ⭐ NUEVO: Captura el estado de todas las unidades en el tablero
     * Incluye posición, jugador, nombre y número de regimientos
     */
    _captureUnitsSnapshot: function() {
        if (typeof units === 'undefined' || !Array.isArray(units)) {
            return [];
        }
        
        const unitsSnapshot = [];
        
        for (const unit of units) {
            if (!unit || unit.currentHealth <= 0) continue;
            
            unitsSnapshot.push({
                id: unit.id,
                n: unit.name || 'Unidad',                          // name
                p: unit.player,                                     // player
                r: unit.r,
                c: unit.c,
                reg: unit.regiments ? unit.regiments.length : 0,   // ⭐ número de regimientos
                h: unit.currentHealth || 0,                        // health actual
                mh: unit.maxHealth || 0,                           // max health
                m: unit.morale || 100                              // morale
            });
        }
        
        return unitsSnapshot;
    },

    /**
     * ⭐ DELTA ENCODING: Calcula solo los cambios en el tablero
     */
    _calculateBoardDelta: function(currentSnapshot) {
        if (!this.lastBoardSnapshot || !currentSnapshot) {
            return currentSnapshot; // Primera vez, retornar todo
        }
        
        const delta = [];
        const lastMap = new Map();
        
        // Crear mapa del snapshot anterior
        for (const hex of this.lastBoardSnapshot) {
            lastMap.set(`${hex.r},${hex.c}`, hex);
        }
        
        // Buscar cambios
        for (const hex of currentSnapshot) {
            const key = `${hex.r},${hex.c}`;
            const oldHex = lastMap.get(key);
            
            // Si no existía o cambió algo, incluir en delta
            if (!oldHex || 
                oldHex.o !== hex.o || 
                oldHex.s !== hex.s || 
                oldHex.iC !== hex.iC || 
                oldHex.iCa !== hex.iCa) {
                delta.push(hex);
            }
        }
        
        console.log(`[ReplayEngine] Board delta: ${delta.length}/${currentSnapshot.length} hexágonos cambiaron`);
        return delta;
    },

    /**
     * ⭐ DELTA ENCODING: Calcula solo los cambios en las unidades
     */
    _calculateUnitsDelta: function(currentSnapshot) {
        if (!this.lastUnitsSnapshot || !currentSnapshot) {
            return currentSnapshot; // Primera vez, retornar todo
        }
        
        const delta = {
            added: [],      // Unidades nuevas
            modified: [],   // Unidades que cambiaron
            removed: []     // Unidades eliminadas (IDs)
        };
        
        const lastMap = new Map();
        const currentMap = new Map();
        
        // Mapear unidades anteriores
        for (const unit of this.lastUnitsSnapshot) {
            lastMap.set(unit.id, unit);
        }
        
        // Mapear unidades actuales
        for (const unit of currentSnapshot) {
            currentMap.set(unit.id, unit);
        }
        
        // Buscar unidades añadidas o modificadas
        for (const unit of currentSnapshot) {
            const oldUnit = lastMap.get(unit.id);
            
            if (!oldUnit) {
                // Unidad nueva
                delta.added.push(unit);
            } else {
                // Verificar si cambió
                if (oldUnit.r !== unit.r || 
                    oldUnit.c !== unit.c || 
                    oldUnit.h !== unit.h || 
                    oldUnit.m !== unit.m || 
                    oldUnit.reg !== unit.reg) {
                    delta.modified.push(unit);
                }
            }
        }
        
        // Buscar unidades eliminadas
        for (const oldUnit of this.lastUnitsSnapshot) {
            if (!currentMap.has(oldUnit.id)) {
                delta.removed.push(oldUnit.id);
            }
        }
        
        console.log(`[ReplayEngine] Units delta: +${delta.added.length} ~${delta.modified.length} -${delta.removed.length}`);
        return delta;
    },

    /**
     * Finaliza el registro al terminar la partida
     */
    finalize: function(winner, totalTurns) {
        console.log('[ReplayEngine] finalize() llamado con:', { winner, totalTurns, isEnabled: this.isEnabled });
        
        if (!this.isEnabled) {
            console.warn('[ReplayEngine] ReplayEngine NO ESTÁ HABILITADO');
            return null;
        }
        
        // ⭐ NUEVO: Capturar información de jugadores con colores
        const playersData = this._capturePlayersInfo();
        
        // Crear metadata ULTRA-MINIMALISTA para caber en VARCHAR(255)
        const metadataObj = {
            w: winner,                                          // winner_id (muy corto)
            t: totalTurns,                                      // total_turns
            d: new Date().toISOString().substring(0, 10),      // date (YYYY-MM-DD)
            m: Math.round((Date.now() - this.startTime) / 60000), // duration_minutes
            b: this.boardInfo || { rows: 20, cols: 20, seed: null }, // ⭐ boardInfo para reconstrucción
            players: playersData                                // ⭐ NUEVO: Info de jugadores
        };
        
        // Serializar metadata a string
        const metadataStr = JSON.stringify(metadataObj);
        
        console.log(`[ReplayEngine] Tamaño de metadata: ${metadataStr.length} bytes`);
        console.log(`[ReplayEngine] matchId: ${this.matchId}, timeline.length: ${this.timeline.length}`);
        
        // Incluir logs de la crónica si están disponibles
        const chronicleLogs = (typeof Chronicle !== 'undefined' && Chronicle.getLogs) ? Chronicle.getLogs() : [];
        
        const replayData = {
            match_id: this.matchId,
            metadata: metadataStr,  // Guardar como STRING, no como objeto
            timeline: this.timeline,
            chronicle_logs: chronicleLogs  // Incluir crónica para referencia
        };
        
        console.log(`[ReplayEngine] ✅ Replay finalizado: ${this.timeline.length} turnos registrados, ${chronicleLogs.length} eventos en crónica`);
        console.log('[ReplayEngine] replayData completo:', replayData);
        
        this.isEnabled = false;
        return replayData;
    },

    /**
     * ⭐ NUEVO: Captura información de jugadores (nombre, color, civilización)
     */
    _capturePlayersInfo: function() {
        if (typeof gameState === 'undefined' || !gameState) {
            return [];
        }

        const playersInfo = [];
        const numPlayers = gameState.numPlayers || 2;
        
        for (let i = 1; i <= numPlayers; i++) {
            const civilizationKey = gameState.playerCivilizations?.[`player${i}`];
            const civilization = typeof CIVILIZATIONS !== 'undefined' && civilizationKey
                ? CIVILIZATIONS[civilizationKey]
                : null;
            
            playersInfo.push({
                id: i,
                player_number: i,
                name: `Jugador ${i}`,
                civilization: civilizationKey || 'Unknown',
                color: this._getPlayerColor(i) // Helper para obtener color
            });
        }
        
        return playersInfo;
    },

    /**
     * ⭐ NUEVO: Obtiene el color de un jugador
     */
    _getPlayerColor: function(playerNumber) {
        // Colores por defecto del juego
        const defaultColors = {
            1: '#ff6b6b',  // Rojo
            2: '#4ecdc4',  // Cian
            3: '#45b7d1',  // Azul
            4: '#f9ca24',  // Amarillo
            5: '#ff9ff3',  // Rosa
            6: '#95e1d3',  // Verde agua
            7: '#feca57',  // Naranja
            8: '#a29bfe'   // Violeta
        };
        
        return defaultColors[playerNumber] || '#ffffff';
    },

    /**
     * Obtiene el estado actual del replay
     */
    getState: function() {
        return {
            matchId: this.matchId,
            turnsRecorded: this.timeline.length,
            eventsInCurrentTurn: this.currentTurnEvents.length,
            isEnabled: this.isEnabled
        };
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayEngine = ReplayEngine;
}
