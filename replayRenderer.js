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
        
        // Dibujar estado inicial
        this.drawFrame();
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
     */
    drawTerrain: function() {
        if (!this.boardData) return;

        for (let r = 0; r < this.boardData.length; r++) {
            for (let c = 0; c < this.boardData[r].length; c++) {
                const hex = this.boardData[r][c];
                const pos = this.hexToPixel(r, c);

                // Color según terreno
                let color = '#3a4a5f'; // default
                if (hex.terrain === 'water') color = '#1e5a96';
                else if (hex.terrain === 'forest') color = '#2d5a2d';
                else if (hex.terrain === 'hills') color = '#6b5c47';
                else if (hex.terrain === 'plains') color = '#4a6b3a';

                this.drawHexagon(pos.x, pos.y, color);

                // Dibujar propietario (overlay ligero)
                if (hex.owner && hex.owner !== null) {
                    const player = this.replayData.metadata.players.find(p => p.id === hex.owner || p.player_number === hex.owner);
                    if (player) {
                        this.ctx.fillStyle = player.color + '40'; // Transparencia
                        this.drawHexagon(pos.x, pos.y, player.color + '40');
                    }
                }

                // Dibujar estructura si existe
                if (hex.structure || hex.isCity) {
                    this.drawStructure(pos.x, pos.y, hex.structure || 'ciudad');
                }
            }
        }
    },

    /**
     * Dibuja todas las unidades en sus posiciones actuales
     */
    drawUnits: function() {
        for (const unitId in this.unitsOnMap) {
            const unit = this.unitsOnMap[unitId];
            if (!unit || unit.isDead) continue;

            const pos = this.hexToPixel(unit.r, unit.c);
            const player = this.replayData.metadata.players.find(p => p.id === unit.playerId || p.player_number === unit.playerId);

            if (player) {
                this.drawUnit(pos.x, pos.y, unit.name, player.color);
            }
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
     */
    playTurn: function() {
        const turnData = this.replayData.timeline[this.currentTurn];
        if (!turnData) return;

        console.log(`[ReplayRenderer] Reproduciendo turno ${turnData.turn}`);

        // Procesar cada evento del turno
        for (const event of turnData.events) {
            this.processEvent(event);
        }

        this.currentTurn++;
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

    drawUnit: function(x, y, name, color) {
        // Círculo con inicial
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // Texto
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(name.substring(0, 1), x, y);
    },

    drawStructure: function(x, y, structureType) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let icon = '🏛️';
        if (structureType === 'Fortaleza') icon = '🏰';
        else if (structureType === 'Camino') icon = '🛣️';

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
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayRenderer = ReplayRenderer;
}
