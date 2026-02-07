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

        // CRÍTICO: Asegurar que el modal sea visible y esté al frente
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '10500'; // Mayor que otros modales
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';

        // Inicializar encabezado
        const titleEl = document.getElementById('replayTitle');
        if (titleEl) {
            titleEl.textContent = `CRÓNICA DE BATALLA #${replayData.match_id || 'DESCONOCIDO'}`;
        } else {
            console.warn('[ReplayUI] replayTitle no encontrado');
        }

        // Verificar que ReplayRenderer esté disponible
        if (!window.ReplayRenderer) {
            console.error('[ReplayUI] ReplayRenderer no está cargado globalmente');
            alert('Error: El renderizador de replays no está disponible.');
            return;
        }

        // ⭐ NUEVO: Si no hay boardData, intentar reconstruir desde metadata
        if (!boardData) {
            console.log('[ReplayUI] boardData es null, intentando reconstruir desde metadata...');
            boardData = this._reconstructBasicBoard(replayData);
        }

        // Inicializar canvas y renderer
        const canvas = document.getElementById('replayCanvas');
        if (canvas) {
            try {
                // Validar que haya datos de timeline
                if (!replayData.timeline || replayData.timeline.length === 0) {
                    console.error('[ReplayUI] Replay no tiene eventos. Timeline vacío o corrompido.');
                    alert('Error: El replay no contiene eventos válidos. Los datos pueden estar corrompidos.');
                    return;
                }

                // Usar ReplayRenderer directamente
                this.renderer = window.ReplayRenderer;
                
                if (this.renderer && typeof this.renderer.initialize === 'function') {
                    this.renderer.initialize(canvas, replayData, boardData);
                    console.log('[ReplayUI] Renderer inicializado correctamente con', replayData.timeline?.length || 0, 'turnos');
                } else {
                    console.error('[ReplayUI] ReplayRenderer no tiene método initialize');
                    alert('Error: El renderizador no está configurado correctamente.');
                    return;
                }
            } catch (err) {
                console.error('[ReplayUI] Error al inicializar renderer:', err);
                alert('Error al inicializar el visor de replay: ' + err.message);
                return;
            }
        } else {
            console.error('[ReplayUI] replayCanvas no encontrado en el DOM');
            return;
        }

        // Cargar lista de eventos
        try {
            this.updateEventList(replayData);
        } catch (err) {
            console.warn('[ReplayUI] Error al actualizar lista de eventos:', err);
        }

        // Configurar controles
        try {
            this.setupControls();
            console.log('[ReplayUI] Controles configurados exitosamente');
        } catch (err) {
            console.error('[ReplayUI] Error al configurar controles:', err);
            alert('Error al configurar controles: ' + err.message);
            return;
        }

        console.log('[ReplayUI] Modal abierto exitosamente');
    },

    /**
     * ⭐ NUEVO: Reconstruye un board básico desde metadata para visualización
     */
    _reconstructBasicBoard: function(replayData) {
        console.log('[ReplayUI] Reconstruyendo board básico desde metadata...');
        
        try {
            // Parsear metadata si es string
            let metadata = replayData.metadata;
            if (typeof metadata === 'string') {
                metadata = JSON.parse(metadata);
            }
            
            // Obtener dimensiones del board (nuevo formato con boardInfo)
            const boardInfo = metadata.b || { rows: 20, cols: 20 };
            const rows = boardInfo.rows || 20;
            const cols = boardInfo.cols || 20;
            
            console.log(`[ReplayUI] Creando board básico de ${rows}x${cols}`);
            
            // Crear array 2D básico
            const basicBoard = [];
            for (let r = 0; r < rows; r++) {
                basicBoard[r] = [];
                for (let c = 0; c < cols; c++) {
                    basicBoard[r][c] = {
                        r: r,
                        c: c,
                        terrain: 'plains', // Terreno por defecto
                        owner: null,
                        structure: null,
                        isCity: false,
                        isCapital: false
                    };
                }
            }
            
            console.log('[ReplayUI] ✅ Board básico reconstruido exitosamente');
            return basicBoard;
            
        } catch (err) {
            console.error('[ReplayUI] Error reconstruyendo board:', err);
            // Fallback: board 20x20
            console.log('[ReplayUI] Usando board por defecto 20x20');
            const defaultBoard = [];
            for (let r = 0; r < 20; r++) {
                defaultBoard[r] = [];
                for (let c = 0; c < 20; c++) {
                    defaultBoard[r][c] = {
                        r: r, c: c, terrain: 'plains', owner: null,
                        structure: null, isCity: false, isCapital: false
                    };
                }
            }
            return defaultBoard;
        }
    },

    /**
     * Configurar event listeners de controles
     */
    setupControls: function() {
        // Botón Play
        const playBtn = document.getElementById('replayPlayBtn');
        if (playBtn) {
            playBtn.onclick = () => {
                if (this.renderer && typeof this.renderer.play === 'function') {
                    this.renderer.play();
                }
            };
        }

        // Botón Stop
        const stopBtn = document.getElementById('replayStopBtn');
        if (stopBtn) {
            stopBtn.onclick = () => {
                if (this.renderer && typeof this.renderer.stop === 'function') {
                    this.renderer.stop();
                }
            };
        }

        // Botón Previous Turn
        const prevBtn = document.getElementById('replayPrevTurnBtn');
        if (prevBtn) {
            prevBtn.onclick = () => {
                if (this.renderer && typeof this.renderer.previousTurn === 'function') {
                    this.renderer.previousTurn();
                }
                this.updateTurnDisplay();
            };
        }

        // Botón Next Turn
        const nextBtn = document.getElementById('replayNextTurnBtn');
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (this.renderer && typeof this.renderer.nextTurn === 'function') {
                    this.renderer.nextTurn();
                }
                this.updateTurnDisplay();
            };
        }

        // Timeline scrubber
        const timeline = document.getElementById('replayTimeline');
        if (timeline) {
            timeline.oninput = (e) => {
                const progress = parseFloat(e.target.value) / 100;
                if (this.renderer && typeof this.renderer.seek === 'function') {
                    this.renderer.seek(progress);
                }
                this.updateTurnDisplay();
            };
        }

        // Botones de velocidad
        const speedBtns = document.querySelectorAll('.replay-speed-btn');
        if (speedBtns && speedBtns.length > 0) {
            speedBtns.forEach(btn => {
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
                    if (this.renderer && typeof this.renderer.setPlaybackSpeed === 'function') {
                        this.renderer.setPlaybackSpeed(speed);
                    }
                };
            });
        }

        console.log('[ReplayUI.setupControls] Controles configurados correctamente');
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
                console.warn('[ReplayUI] events no es un array:', turnData);
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

