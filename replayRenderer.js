/**
 * replayRenderer.js
 * Renderizador visual para replay - dibuja eventos sin ejecutar lógica de juego
 * Desacoplado completamente de la lógica de combate
 */

const ReplayRenderer = {
    canvas: null,
    ctx: null,
    boardData: null,
    replayData: null,
    currentTurn: 0,
    isPlaying: false,
    playbackSpeed: 1, // 1x, 2x, 4x
    unitsOnMap: {}, // Posición actual de cada unidad
    animationFrameId: null,
    eventsToAnimate: [], // Cola de eventos con animaciones pendientes
    hexWidth: 50,
    hexHeight: 58,
    currentBoardState: null,  // ⭐ DELTA: Estado reconstruido del board
    currentUnitsState: {},    // ⭐ DELTA: Estado reconstruido de unidades

    /**
     * Inicializa el renderizador con datos de replay
     */
    initialize: function(canvasElement, replayData, boardData) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.replayData = replayData;
        this.boardData = boardData;
        this.currentTurn = 0;
        this.isPlaying = false;
        this.unitsOnMap = {};
        this.eventsToAnimate = [];
        
        // ⭐ DELTA: Inicializar estados reconstruidos
        this.currentBoardState = null;
        this.currentUnitsState = {};

        // VALIDACIONES CRÍTICAS
        if (!this.canvas || !this.ctx) {
            console.error('[ReplayRenderer] Canvas o contexto 2D no disponible');
            return;
        }
        
        if (!replayData || !replayData.timeline) {
            console.warn('[ReplayRenderer] replayData.timeline no disponible. Usando timeline vacío.');
            this.replayData = replayData || { timeline: [] };
        }
        
        const timelineLength = (replayData?.timeline?.length) || 0;
        console.log(`[ReplayRenderer] Inicializado para replay de ${timelineLength} turnos`);
        
        // ⭐ DELTA: Cargar snapshot inicial (turno 0 - deployment)
        this._loadInitialSnapshot();
        
        // Dibujar estado inicial
        this.drawFrame();
    },

    /**
     * ⭐ DELTA: Carga el snapshot inicial completo (turno 0)
     */
    _loadInitialSnapshot: function() {
        if (!this.replayData || !this.replayData.timeline || this.replayData.timeline.length === 0) {
            console.warn('[ReplayRenderer] No hay timeline para cargar snapshot inicial');
            return;
        }
        
        const firstTurn = this.replayData.timeline[0];
        
        if (firstTurn && firstTurn.isFullSnapshot) {
            console.log('[ReplayRenderer] Cargando snapshot inicial completo...');
            
            // Cargar board state completo
            if (firstTurn.boardState) {
                this.currentBoardState = this._cloneBoardSnapshot(firstTurn.boardState);
                this.applyBoardState(this.currentBoardState);
            }
            
            // Cargar units state completo
            if (firstTurn.unitsState) {
                this._reconstructUnitsFromSnapshot(firstTurn.unitsState);
            }
            
            console.log('[ReplayRenderer] ✅ Snapshot inicial cargado');
        } else {
            console.warn('[ReplayRenderer] Primer turno no es un snapshot completo');
        }
    },

    /**
     * ⭐ DELTA: Clona un board snapshot
     */
    _cloneBoardSnapshot: function(snapshot) {
        return snapshot.map(hex => ({ ...hex }));
    },

    /**
     * ⭐ DELTA: Reconstruye el estado de unidades desde snapshot completo
     */
    _reconstructUnitsFromSnapshot: function(snapshot) {
        if (!Array.isArray(snapshot)) return;
        
        this.currentUnitsState = {};
        
        for (const unit of snapshot) {
            this.currentUnitsState[unit.id] = {
                unitId: unit.id,
                name: unit.n,
                playerId: unit.p,
                r: unit.r,
                c: unit.c,
                regiments: unit.reg,
                regimentType: unit.rt || 'Infantería Ligera',      // ⭐ NUEVO: tipo de regimiento
                sprite: unit.spr || '🚶',                         // ⭐ NUEVO: ícono
                health: unit.h,
                maxHealth: unit.mh,
                morale: unit.m,
                isDead: false
            };
        }
        
        this.unitsOnMap = { ...this.currentUnitsState };
    },

    /**
     * Dibuja el mapa base + unidades + efectos actuales
     */
    drawFrame: function() {
        if (!this.canvas || !this.ctx) return;

        // Limpiar canvas
        this.ctx.fillStyle = '#1a252f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar hexágonos del terreno
        this.drawTerrain();

        // Dibujar unidades
        this.drawUnits();

        // Dibujar efectos de eventos (explosiones, batalla, etc)
        this.drawEventEffects();
    },

    /**
     * Dibuja el terreno base (estático durante toda la partida)
     * ⭐ MEJORADO: Muestra tipos de terreno con íconos
     */
    drawTerrain: function() {
        if (!this.boardData) {
            console.warn('[ReplayRenderer] boardData es null, no se puede dibujar terreno');
            return;
        }

        for (let r = 0; r < this.boardData.length; r++) {
            for (let c = 0; c < this.boardData[r].length; c++) {
                const hex = this.boardData[r][c];
                if (!hex) continue;
                
                const pos = this.hexToPixel(r, c);

                // ⭐ MEJORADO: Colores más diferenciados según terreno
                let color = '#3a4a5f'; // default
                let terrainIcon = '';
                
                if (hex.terrain === 'water') {
                    color = '#1e5a96';
                    terrainIcon = '🌊'; // Agua
                } else if (hex.terrain === 'forest') {
                    color = '#2d5a2d';
                    terrainIcon = '🌲'; // Bosque
                } else if (hex.terrain === 'hills') {
                    color = '#6b5c47';
                    terrainIcon = '⛰️'; // Montaña
                } else if (hex.terrain === 'plains') {
                    color = '#4a6b3a';
                    terrainIcon = '🌾'; // Llanura
                }

                this.drawHexagon(pos.x, pos.y, color);

                // ⭐ NUEVO: Dibujar ícono de terreno (pequeño, en esquina)
                if (terrainIcon && (r + c) % 3 === 0) { // Solo en algunos hex para no saturar
                    this.ctx.fillStyle = '#ffffffaa';
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'right';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(terrainIcon, pos.x + 20, pos.y - 20);
                }

                // ⭐ MEJORADO: Dibujar propietario (overlay ligero)
                if (hex.owner && hex.owner !== null) {
                    const playerColor = this.getPlayerColor(hex.owner);
                    this.ctx.fillStyle = playerColor + '40'; // Transparencia
                    this.drawHexagon(pos.x, pos.y, playerColor + '40');
                }

                // ⭐ MEJORADO: Dibujar estructura usando STRUCTURE_TYPES
                if (hex.structure) {
                    this.drawStructure(pos.x, pos.y, hex.structure);
                }
                // Si es ciudad pero no tiene structure definida
                else if (hex.isCity) {
                    const structureType = hex.isCapital ? 'Metrópoli' : 'Ciudad';
                    this.drawStructure(pos.x, pos.y, structureType);
                }
            }
        }
    },

    /**
     * ⭐ NUEVO: Helper para obtener color de un jugador desde metadata
     */
    getPlayerColor: function(playerId) {
        if (!playerId) return '#ffffff';
        
        // Intentar obtener desde metadata
        try {
            if (this.replayData && this.replayData.metadata) {
                let metadata = this.replayData.metadata;
                
                if (typeof metadata === 'string') {
                    metadata = JSON.parse(metadata);
                }
                
                if (metadata && metadata.players && Array.isArray(metadata.players)) {
                    const player = metadata.players.find(p => 
                        p && (p.id === playerId || p.player_number === playerId)
                    );
                    if (player && player.color) {
                        return player.color;
                    }
                }
            }
        } catch (err) {
            // Silenciar error y usar fallback
        }
        
        // Colores por defecto
        const defaultColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#ff9ff3', '#95e1d3', '#feca57', '#a29bfe'];
        return defaultColors[((playerId || 1) - 1) % defaultColors.length];
    },

    /**
     * Dibuja todas las unidades en sus posiciones actuales
     * ⭐ MEJORADO: Muestra número de regimientos y color del jugador
     */
    drawUnits: function() {
        for (const unitId in this.unitsOnMap) {
            const unit = this.unitsOnMap[unitId];
            if (!unit || unit.isDead) continue;

            const pos = this.hexToPixel(unit.r, unit.c);
            const playerColor = this.getPlayerColor(unit.playerId);

            // ⭐ MEJORADO: Pasar sprite de la unidad en lugar del nombre
            this.drawUnit(pos.x, pos.y, unit.sprite || '🚶', playerColor, unit.regiments, unit.regimentType);
        }
    },

    /**
     * Dibuja efectos visuales de eventos (batallas, muertes, etc)
     */
    drawEventEffects: function() {
        // Los efectos tienen duración temporal
        const now = Date.now();
        this.eventsToAnimate = this.eventsToAnimate.filter(effect => {
            if (now - effect.startTime > effect.duration) {
                return false; // Remover efecto expirado
            }

            const pos = this.hexToPixel(effect.location[0], effect.location[1]);
            const progress = (now - effect.startTime) / effect.duration;

            if (effect.type === 'BATTLE') {
                this.drawBattleEffect(pos.x, pos.y, progress);
            } else if (effect.type === 'DEATH') {
                this.drawDeathEffect(pos.x, pos.y, progress);
            }

            return true;
        });
    },

    /**
     * Reproduce los eventos del turno actual
     * ⭐ OPTIMIZADO: Aplica deltas en lugar de snapshots completos
     */
    playTurn: function() {
        if (!this.replayData || !this.replayData.timeline) {
            console.error('[ReplayRenderer] No hay timeline disponible');
            return;
        }

        const turnData = this.replayData.timeline[this.currentTurn];
        if (!turnData) {
            console.warn(`[ReplayRenderer] Turno ${this.currentTurn} no encontrado o fin de replay`);
            return;
        }

        // Validar estructura del turno
        if (!Array.isArray(turnData.events)) {
            console.error(`[ReplayRenderer] Turno ${this.currentTurn} no tiene array de eventos:`, turnData);
            this.currentTurn++;
            return;
        }

        console.log(`[ReplayRenderer] Reproduciendo turno ${turnData.turn || this.currentTurn} (${turnData.events.length} eventos)`);

        // ⭐ DELTA: Aplicar cambios según el tipo de snapshot
        if (turnData.isFullSnapshot) {
            // Es un snapshot completo (turno 0 - deployment)
            if (turnData.boardState) {
                this.currentBoardState = this._cloneBoardSnapshot(turnData.boardState);
                this.applyBoardState(this.currentBoardState);
            }
            if (turnData.unitsState) {
                this._reconstructUnitsFromSnapshot(turnData.unitsState);
            }
        } else {
            // Es un delta, aplicar cambios incrementales
            if (turnData.boardDelta) {
                this._applyBoardDelta(turnData.boardDelta);
            }
            if (turnData.unitsDelta) {
                this._applyUnitsDelta(turnData.unitsDelta);
            }
        }

        // Procesar cada evento del turno
        if (turnData.events.length > 0) {
            for (const event of turnData.events) {
                this.processEvent(event);
            }
        }

        this.currentTurn++;
    },

    /**
     * ⭐ DELTA: Aplica cambios incrementales al board
     */
    _applyBoardDelta: function(boardDelta) {
        if (!boardDelta || !this.boardData) return;
        
        // Si no tenemos estado previo, usar el delta como estado completo
        if (!this.currentBoardState) {
            this.currentBoardState = this._cloneBoardSnapshot(boardDelta);
        } else {
            // Aplicar cambios al estado actual
            for (const hexChange of boardDelta) {
                // Buscar y actualizar en currentBoardState
                const existingIndex = this.currentBoardState.findIndex(
                    h => h.r === hexChange.r && h.c === hexChange.c
                );
                
                if (existingIndex >= 0) {
                    this.currentBoardState[existingIndex] = { ...hexChange };
                } else {
                    this.currentBoardState.push({ ...hexChange });
                }
            }
        }
        
        // Aplicar al boardData para renderizado
        this.applyBoardState(this.currentBoardState);
    },

    /**
     * ⭐ DELTA: Aplica cambios incrementales a las unidades
     */
    _applyUnitsDelta: function(unitsDelta) {
        if (!unitsDelta) return;
        
        // Si es array (snapshot completo), reconstruir
        if (Array.isArray(unitsDelta)) {
            this._reconstructUnitsFromSnapshot(unitsDelta);
            return;
        }
        
        // Si es objeto con added/modified/removed, aplicar deltas
        if (unitsDelta.added) {
            for (const unit of unitsDelta.added) {
                this.currentUnitsState[unit.id] = {
                    unitId: unit.id,
                    name: unit.n,
                    playerId: unit.p,
                    r: unit.r,
                    c: unit.c,
                    regiments: unit.reg,
                    regimentType: unit.rt || 'Infantería Ligera',      // ⭐ NUEVO
                    sprite: unit.spr || '🚶',                         // ⭐ NUEVO
                    health: unit.h,
                    maxHealth: unit.mh,
                    morale: unit.m,
                    isDead: false
                };
            }
        }
        
        if (unitsDelta.modified) {
            for (const unit of unitsDelta.modified) {
                if (this.currentUnitsState[unit.id]) {
                    // Actualizar solo los campos que cambiaron
                    this.currentUnitsState[unit.id].r = unit.r;
                    this.currentUnitsState[unit.id].c = unit.c;
                    this.currentUnitsState[unit.id].regiments = unit.reg;
                    this.currentUnitsState[unit.id].regimentType = unit.rt || this.currentUnitsState[unit.id].regimentType;
                    this.currentUnitsState[unit.id].sprite = unit.spr || this.currentUnitsState[unit.id].sprite;
                    this.currentUnitsState[unit.id].health = unit.h;
                    this.currentUnitsState[unit.id].morale = unit.m;
                } else {
                    // Si no existe, crearla (fallback)
                    this.currentUnitsState[unit.id] = {
                        unitId: unit.id,
                        name: unit.n,
                        playerId: unit.p,
                        r: unit.r,
                        c: unit.c,
                        regiments: unit.reg,
                        regimentType: unit.rt || 'Infantería Ligera',
                        sprite: unit.spr || '🚶',
                        health: unit.h,
                        maxHealth: unit.mh,
                        morale: unit.m,
                        isDead: false
                    };
                }
            }
        }
        
        if (unitsDelta.removed) {
            for (const unitId of unitsDelta.removed) {
                if (this.currentUnitsState[unitId]) {
                    this.currentUnitsState[unitId].isDead = true;
                }
            }
        }
        
        // Actualizar unitsOnMap para renderizado
        this.unitsOnMap = { ...this.currentUnitsState };
    },

    /**
     * ⭐ MEJORADO: Aplica el estado del tablero capturado (incluye terrain)
     */
    applyBoardState: function(boardState) {
        if (!this.boardData || !boardState) return;
        
        // Aplicar cada hexágono del snapshot
        for (const hexSnapshot of boardState) {
            const hex = this.boardData[hexSnapshot.r]?.[hexSnapshot.c];
            if (!hex) continue;
            
            hex.owner = hexSnapshot.o !== undefined ? hexSnapshot.o : null;
            hex.structure = hexSnapshot.s || null;
            hex.isCity = hexSnapshot.iC || false;
            hex.isCapital = hexSnapshot.iCa || false;
            hex.terrain = hexSnapshot.t || hex.terrain || 'plains'; // ⭐ NUEVO: Actualizar terrain
        }
    },

    /**
     * ⭐ NUEVO: Aplica el estado de las unidades capturado
     * Wrapper para compatibilidad - usa _reconstructUnitsFromSnapshot
     */
    applyUnitsState: function(unitsState) {
        if (!unitsState) return;
        
        this._reconstructUnitsFromSnapshot(unitsState);
    },

    /**
     * Procesa un evento individual
     */
    processEvent: function(event) {
        switch (event.type) {
            case 'MOVE':
                this.processMove(event);
                break;
            case 'BATTLE':
                this.processBattle(event);
                break;
            case 'UNIT_DEATH':
                this.processUnitDeath(event);
                break;
            case 'CONQUEST':
                this.processConquest(event);
                break;
            case 'BUILD':
                this.processBuild(event);
                break;
        }
    },

    /**
     * Procesa evento de movimiento
     */
    processMove: function(event) {
        // Actualizar posición de la unidad
        this.unitsOnMap[event.unitId] = {
            unitId: event.unitId,
            name: event.unitName,
            playerId: event.playerId,
            r: event.to[0],
            c: event.to[1],
            isDead: false
        };
    },

    /**
     * Procesa evento de batalla
     */
    processBattle: function(event) {
        // Agregar efecto visual
        this.eventsToAnimate.push({
            type: 'BATTLE',
            location: event.location,
            startTime: Date.now(),
            duration: 1000 // 1 segundo
        });

        // Si el defensor murió, marcarlo
        if (event.casualties && event.casualties.defender >= 100) {
            if (this.unitsOnMap[event.defenderId]) {
                this.unitsOnMap[event.defenderId].isDead = true;
            }
        }
    },

    /**
     * Procesa evento de muerte de unidad
     */
    processUnitDeath: function(event) {
        if (this.unitsOnMap[event.unitId]) {
            this.unitsOnMap[event.unitId].isDead = true;
        }

        // Efecto visual de desvanecimiento
        this.eventsToAnimate.push({
            type: 'DEATH',
            location: event.location,
            startTime: Date.now(),
            duration: 500 // 0.5 segundos
        });
    },

    /**
     * Procesa evento de conquista
     */
    processConquest: function(event) {
        // Actualizar color del territorio en boardData
        if (this.boardData[event.location[0]] && this.boardData[event.location[0]][event.location[1]]) {
            this.boardData[event.location[0]][event.location[1]].owner = event.playerId;
        }
    },

    /**
     * Procesa evento de construcción
     */
    processBuild: function(event) {
        if (this.boardData[event.location[0]] && this.boardData[event.location[0]][event.location[1]]) {
            this.boardData[event.location[0]][event.location[1]].structure = event.structureType;
        }
    },

    // ====== FUNCIONES DE DIBUJO BÁSICO ======

    drawHexagon: function(x, y, color) {
        const size = 25;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + size * Math.cos(angle);
            const hy = y + size * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(hx, hy);
            else this.ctx.lineTo(hx, hy);
        }
        this.ctx.closePath();
        this.ctx.fill();
    },

    /**
     * ⭐ MEJORADO: Dibuja una unidad con su ícono del juego y número de regimientos
     */
    drawUnit: function(x, y, sprite, color, regiments, regimentType) {
        // Círculo de fondo con color del jugador
        this.ctx.fillStyle = color + '99'; // Semi-transparente
        this.ctx.beginPath();
        this.ctx.arc(x, y, 14, 0, Math.PI * 2);
        this.ctx.fill();

        // Borde blanco
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // ⭐ NUEVO: Mostrar ícono del tipo de regimiento
        // Si el sprite es una imagen, mostrar emoji genérico basado en el tipo
        let displayIcon = sprite;
        
        // Si es una ruta de imagen, usar emoji basado en el tipo
        if (typeof sprite === 'string' && sprite.includes('images/')) {
            // Mapeo de tipos a emojis
            const typeToEmoji = {
                'Infantería Ligera': '🚶',
                'Infantería Pesada': '🛡️',
                'Caballería Ligera': '🐎',
                'Caballería Pesada': '🏇',
                'Arqueros a Caballo': '🏹',
                'Arqueros': '🏹',
                'Arcabuceros': '🔫',
                'Artillería': '🎯',
                'Cuartel General': '⭐',
                'Ingenieros': '👷',
                'Hospital de Campaña': '⚕️',
                'Columna de Suministro': '📦',
                'Patache': '⛵',
                'Barco de Guerra': '🚢',
                'Colono': '🏘️',
                'Explorador': '🔭',
                'Pueblo': '🏡'
            };
            displayIcon = typeToEmoji[regimentType] || '⚔️';
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(displayIcon, x, y);
        
        // ⭐ Mostrar número de regimientos debajo de la unidad
        if (regiments !== undefined && regiments > 0) {
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            
            // Fondo oscuro para mejor legibilidad
            const text = `${regiments}R`;
            const textWidth = this.ctx.measureText(text).width;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(x - textWidth/2 - 2, y + 16, textWidth + 4, 12);
            
            // Texto del número de regimientos
            this.ctx.fillStyle = '#00f3ff'; // Color cyan brillante
            this.ctx.fillText(text, x, y + 17);
        }
    },

    /**
     * ⭐ MEJORADO: Dibuja estructura usando STRUCTURE_TYPES del juego
     */
    drawStructure: function(x, y, structureType) {
        // Usar STRUCTURE_TYPES si está disponible
        let icon = '🏛️'; // Default: edificio clásico
        
        if (typeof STRUCTURE_TYPES !== 'undefined' && STRUCTURE_TYPES[structureType]) {
            const structData = STRUCTURE_TYPES[structureType];
            icon = structData.sprite || icon;
        } else {
            // Fallback a íconos manuales si STRUCTURE_TYPES no está disponible
            const iconMap = {
                'Camino': '🞰',
                'Fortaleza': '🏰',
                'Fortaleza con Muralla': '🧱',
                'Aldea': '🏡',
                'Ciudad': '🏫️',
                'Metrópoli': '🏙️',
                'Atalaya': '🔭'
            };
            icon = iconMap[structureType] || icon;
        }

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icon, x, y);
    },

    drawBattleEffect: function(x, y, progress) {
        // Iconos de espadas que aparecen y desaparecen
        this.ctx.globalAlpha = 1 - progress; // Fade out
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⚔️', x, y - 10 * progress);
        this.ctx.globalAlpha = 1;
    },

    drawDeathEffect: function(x, y, progress) {
        // Desvanecimiento hacia transparencia
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.fillStyle = '#999';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    },

    hexToPixel: function(r, c) {
        const x = c * this.hexWidth + (r % 2) * (this.hexWidth / 2);
        const y = r * (this.hexHeight * 0.75);
        return { x: x + 50, y: y + 50 }; // Offset
    },

    /**
     * Control: Ir a turno específico
     */
    goToTurn: function(turnNumber) {
        this.currentTurn = Math.max(0, Math.min(turnNumber, this.replayData.timeline.length - 1));
        this.unitsOnMap = {}; // Reset de unidades
        this.eventsToAnimate = [];

        // Reproducir turnos hasta el objetivo
        for (let i = 0; i < this.currentTurn; i++) {
            const turnData = this.replayData.timeline[i];
            for (const event of turnData.events) {
                this.processEvent(event);
            }
        }

        this.drawFrame();
    },

    /**
     * Control: Play/Pause
     */
    togglePlayPause: function() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.playLoop();
        }
    },

    /**
     * Loop de reproducción automática
     */
    playLoop: function() {
        if (!this.isPlaying) return;

        // Calcular delay según velocidad
        const baseDelay = 1000 / this.playbackSpeed; // 1 segundo por turno / velocidad
        
        if (this.currentTurn < this.replayData.timeline.length) {
            this.playTurn();
            this.drawFrame();
            this.animationFrameId = setTimeout(() => this.playLoop(), baseDelay);
        } else {
            this.isPlaying = false;
            console.log('[ReplayRenderer] Replay finalizado');
        }
    },

    /**
     * Control: Cambiar velocidad
     */
    setPlaybackSpeed: function(speed) {
        this.playbackSpeed = speed; // 1, 2, 4
    },

    /**
     * Control: Stop
     */
    stop: function() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            clearTimeout(this.animationFrameId);
        }
        this.currentTurn = 0;
        this.unitsOnMap = {};
        this.eventsToAnimate = [];
        this.drawFrame();
    },

    /**
     * INTERFAZ PÚBLICA - Métodos alias para ReplayUI
     */

    /**
     * Play: Inicia reproducción
     */
    play: function() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.playLoop();
        }
    },

    /**
     * Seek: Salta a un momento en el replay (0.0 - 1.0)
     */
    seek: function(progress) {
        // Convertir progreso (0-1) a número de turno
        const maxTurns = this.replayData?.timeline?.length || 1;
        const targetTurn = Math.floor(progress * maxTurns);
        this.goToTurn(targetTurn);
    },

    /**
     * Previous Turn: Retrocede un turno
     */
    previousTurn: function() {
        if (this.currentTurn > 0) {
            this.currentTurn--;
        }
        this.drawFrame();
    },

    /**
     * Next Turn: Avanza un turno
     */
    nextTurn: function() {
        if (this.currentTurn < (this.replayData?.timeline?.length || 0)) {
            this.currentTurn++;
        }
        this.drawFrame();
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayRenderer = ReplayRenderer;
}
