/**
 * replayUI.js
 * Interfaz de usuario para el visor de replays
 * Modal para ver crónicas, timeline, controles de reproducción
 */

const ReplayUI = {
    currentReplay: null,
    renderer: null,

    /**
     * Abre el modal del visor de replay
     */
    openReplayModal: function(replayData, boardData) {
        this.currentReplay = replayData;

        const modal = document.getElementById('replayModal');
        if (!modal) {
            console.error('[ReplayUI] replayModal no existe en el DOM');
            return;
        }

        modal.style.display = 'flex';

        // Inicializar encabezado
        document.getElementById('replayTitle').textContent = `CRÓNICA DE BATALLA #${replayData.match_id}`;

        // Inicializar canvas
        const canvas = document.getElementById('replayCanvas');
        if (canvas) {
            this.renderer = Object.create(window.ReplayRenderer || {});
            this.renderer.initialize(canvas, replayData, boardData);
        }

        // Cargar lista de eventos
        this.updateEventList(replayData);

        // Configurar controles
        this.setupControls();
    },

    /**
     * Configurar event listeners de controles
     */
    setupControls: function() {
        // Botón Play
        document.getElementById('replayPlayBtn').onclick = () => {
            if (this.renderer) this.renderer.play();
        };

        // Botón Stop
        document.getElementById('replayStopBtn').onclick = () => {
            if (this.renderer) this.renderer.stop();
        };

        // Botón Previous Turn
        document.getElementById('replayPrevTurnBtn').onclick = () => {
            if (this.renderer) this.renderer.previousTurn();
            this.updateTurnDisplay();
        };

        // Botón Next Turn
        document.getElementById('replayNextTurnBtn').onclick = () => {
            if (this.renderer) this.renderer.nextTurn();
            this.updateTurnDisplay();
        };

        // Timeline scrubber
        document.getElementById('replayTimeline').oninput = (e) => {
            const progress = parseFloat(e.target.value) / 100;
            if (this.renderer) this.renderer.seek(progress);
            this.updateTurnDisplay();
        };

        // Botones de velocidad
        document.querySelectorAll('.replay-speed-btn').forEach(btn => {
            btn.onclick = (e) => {
                // Remover clase active de todos
                document.querySelectorAll('.replay-speed-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#4a7a9f';
                    b.style.color = 'white';
                });
                // Añadir a clickeado
                e.target.classList.add('active');
                e.target.style.background = '#00f3ff';
                e.target.style.color = '#000';
                
                const speed = parseFloat(e.target.dataset.speed);
                if (this.renderer) this.renderer.setPlaybackSpeed(speed);
            };
        });
    },

    /**
     * Actualizar display del turno
     */
    updateTurnDisplay: function() {
        if (!this.renderer) return;
        
        const current = this.renderer.currentTurn || 0;
        const total = (this.currentReplay?.timeline?.length || 1) - 1;
        
        document.getElementById('replayTurnDisplay').textContent = `T${current}/${total}`;
        
        // Actualizar slider
        const progress = total > 0 ? (current / total) * 100 : 0;
        document.getElementById('replayTimeline').value = progress;
    },

    /**
     * Cierra el modal
     */
    closeReplayModal: function() {
        const modal = document.getElementById('replayModal');
        if (modal) modal.style.display = 'none';
        
        if (this.renderer && this.renderer.stop) {
            this.renderer.stop();
        }
    },

    /**
     * Actualiza la lista de eventos en el panel izquierdo
     * Incluye tanto timeline como crónica narrativa
     */
    updateEventList: function(replayData) {
        const eventList = document.getElementById('replayEventLog');
        if (!eventList) return;

        eventList.innerHTML = '';

        // Si hay chronicle_logs, mostrarlos primero
        if (replayData.chronicle_logs && replayData.chronicle_logs.length > 0) {
            const chronicleSection = document.createElement('div');
            chronicleSection.className = 'replay-chronicle-section';
            chronicleSection.innerHTML = '<strong style="color: #ffd700; display: block; margin-bottom: 10px;">📖 CRÓNICA</strong>';
            
            for (const log of replayData.chronicle_logs) {
                const logElement = document.createElement('div');
                logElement.className = 'replay-chronicle-entry';
                logElement.style.cssText = 'font-size: 0.85em; color: #ddd; margin-bottom: 8px; line-height: 1.3; padding: 5px; background: rgba(255,215,0,0.05); border-left: 2px solid #ffd700; padding-left: 8px;';
                
                // Mostrar tipo de evento y mensaje
                const typeEmoji = this.getEventEmoji(log.type);
                logElement.textContent = `${typeEmoji} ${log.message || log.text || JSON.stringify(log).substring(0, 50)}`;
                
                chronicleSection.appendChild(logElement);
            }
            
            eventList.appendChild(chronicleSection);
            
            // Agregar separador
            const separator = document.createElement('div');
            separator.style.cssText = 'border-bottom: 1px solid #444; margin: 15px 0;';
            eventList.appendChild(separator);
        }

        // Mostrar timeline de eventos
        if (!replayData || !replayData.timeline) {
            eventList.innerHTML = '<p>No hay datos de eventos disponibles</p>';
            return;
        }
        
        // Agrupar eventos por turno si es necesario
        let timelineByTurn = replayData.timeline;
        
        // Si el timeline es un array simple de eventos, agrupar por turno
        if (replayData.timeline.length > 0 && !replayData.timeline[0].events) {
            timelineByTurn = {};
            for (const event of replayData.timeline) {
                const turnNum = event.turn || 1;
                if (!timelineByTurn[turnNum]) {
                    timelineByTurn[turnNum] = { turn: turnNum, events: [] };
                }
                timelineByTurn[turnNum].events.push(event);
            }
            timelineByTurn = Object.values(timelineByTurn);
        }
        
        for (const turnData of timelineByTurn) {
            if (!turnData) continue;
            
            const turnElement = document.createElement('div');
            turnElement.className = 'replay-turn-block';
            turnElement.innerHTML = `<strong>Turno ${turnData.turn}</strong>`;

            // Validar que events existe y es iterable
            const events = turnData.events || [];
            if (!Array.isArray(events)) {
                0 && console.warn('[ReplayUI] events no es un array:', turnData);
                continue;
            }
            
            for (const event of events) {
                const eventElement = document.createElement('div');
                eventElement.className = 'replay-event';
                eventElement.textContent = this.eventToText(event);
                turnElement.appendChild(eventElement);
            }

            eventList.appendChild(turnElement);
        }
    },

    /**
     * Retorna emoji para cada tipo de evento en crónica
     */
    getEventEmoji: function(type) {
        const emojis = {
            'battle_start': '⚔️',
            'unit_destroyed': '💀',
            'construction': '🏗️',
            'conquest': '🏴',
            'turn_start': '➡️',
            'MOVE': '📍',
            'BATTLE': '⚔️',
            'UNIT_DEATH': '💀',
            'CONQUEST': '🏴',
            'BUILD': '🏗️'
        };
        return emojis[type] || '📝';
    },

    /**
     * Convierte un evento estructurado a texto narrativo
     */
    eventToText: function(event) {
        switch (event.type) {
            case 'MOVE':
                return `📍 ${event.unitName} se movió a (${event.to[0]},${event.to[1]})`;
            
            case 'BATTLE':
                const winner = event.winner === event.attackerId ? event.attackerName : event.defenderName;
                return `⚔️ Batalla en (${event.location[0]},${event.location[1]}): ${winner} gana`;
            
            case 'UNIT_DEATH':
                return `💀 ${event.unitName} fue destruida`;
            
            case 'CONQUEST':
                return `🏴 Territorio conquistado en (${event.location[0]},${event.location[1]})`;
            
            case 'BUILD':
                return `🏗️ ${event.structureType} construida en (${event.location[0]},${event.location[1]})`;
            
            default:
                return `? Evento desconocido`;
        }
    },

    /**
     * Configura los listeners de los controles del reproductor
     */
    setupControls: function() {
        const playBtn = document.getElementById('replayPlayBtn');
        const stopBtn = document.getElementById('replayStopBtn');
        const prevTurnBtn = document.getElementById('replayPrevTurnBtn');
        const nextTurnBtn = document.getElementById('replayNextTurnBtn');
        const speedButtons = document.querySelectorAll('.replay-speed-btn');
        const timeline = document.getElementById('replayTimeline');

        if (playBtn) {
            playBtn.onclick = () => {
                if (this.renderer) this.renderer.togglePlayPause();
                playBtn.textContent = this.renderer?.isPlaying ? '⏸ PAUSE' : '▶️ PLAY';
            };
        }

        if (stopBtn) {
            stopBtn.onclick = () => {
                if (this.renderer) this.renderer.stop();
                if (playBtn) playBtn.textContent = '▶️ PLAY';
            };
        }

        if (prevTurnBtn) {
            prevTurnBtn.onclick = () => {
                if (this.renderer && this.renderer.currentTurn > 0) {
                    this.renderer.goToTurn(this.renderer.currentTurn - 1);
                    this.updateTimelineDisplay();
                }
            };
        }

        if (nextTurnBtn) {
            nextTurnBtn.onclick = () => {
                if (this.renderer && this.renderer.currentTurn < this.currentReplay.timeline.length - 1) {
                    this.renderer.goToTurn(this.renderer.currentTurn + 1);
                    this.updateTimelineDisplay();
                }
            };
        }

        speedButtons.forEach(btn => {
            btn.onclick = () => {
                speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const speed = parseInt(btn.dataset.speed);
                if (this.renderer) this.renderer.setPlaybackSpeed(speed);
            };
        });

        if (timeline) {
            timeline.oninput = (e) => {
                const turn = parseInt(e.target.value);
                if (this.renderer) {
                    this.renderer.goToTurn(turn);
                    this.updateTimelineDisplay();
                }
            };
            
            // Establecer rango máximo
            if (this.currentReplay) {
                timeline.max = this.currentReplay.timeline.length - 1;
            }
        }
    },

    /**
     * Actualiza la visualización del timeline y turno actual
     */
    updateTimelineDisplay: function() {
        if (!this.renderer) return;

        const timeline = document.getElementById('replayTimeline');
        const turnDisplay = document.getElementById('replayTurnDisplay');

        if (timeline) {
            timeline.value = this.renderer.currentTurn;
        }

        if (turnDisplay) {
            turnDisplay.textContent = `T${this.renderer.currentTurn}/${this.currentReplay.timeline.length}`;
        }
    },

    /**
     * Genera un enlace compartible para el replay
     */
    generateShareLink: function() {
        if (!this.currentReplay) return null;

        // Generar token único
        const token = `${this.currentReplay.match_id}_${Date.now()}`;
        
        // URL del juego + parámetro de replay
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/replay?id=${token}`;

        // Copiar al portapapeles
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`Enlace copiado: ${shareUrl}`);
        });

        return shareUrl;
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ReplayUI = ReplayUI;
}
