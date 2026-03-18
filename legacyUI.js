/**
 * legacyUI.js
 * Interfaz visual de "La Crónica" (Legacy/End Game Analysis)
 * Modal con gráficos, línea de tiempo narrativa y análisis de combate
 */

const LegacyUI = {
    modalElement: null,
    isVisible: false,

    /**
     * Inicializa la UI
     */
    initialize: function() {
        this.modalElement = document.getElementById('legacyModal');
        
        if (!this.modalElement) {
            console.warn('[LegacyUI] Elemento #legacyModal no encontrado en HTML');
            // Reintentar en 100ms si el DOM no está listo
            setTimeout(() => {
                this.modalElement = document.getElementById('legacyModal');
                if (this.modalElement) {
                    this._setupEventListeners();
                }
            }, 100);
            return;
        }

        this._setupEventListeners();
    },

    /**
     * Configura listeners
     */
    _setupEventListeners: function() {
        if (!this.modalElement) {
            console.error('[LegacyUI._setupEventListeners] modalElement no existe');
            return;
        }
        
        const tabs = this.modalElement.querySelectorAll('[data-legacy-tab]');
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-legacy-tab');
                this._activateTab(tabName);
                if (typeof LegacyManager !== 'undefined') {
                    LegacyManager.switchTab(tabName);
                }
            });
        });

        const closeBtn = this.modalElement.querySelector('.legacy-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }

        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.hideModal();
            }
        });
    },

    /**
     * Muestra el modal
     */
    showModal: function() {
        if (!this.modalElement) {
            console.error('[LegacyUI.showModal] No hay modalElement');
            this.initialize(); // Reintentar inicializar
            if (!this.modalElement) {
                console.error('[LegacyUI.showModal] Aún no hay modalElement después de reinicializar');
                return;
            }
        }
        this.modalElement.style.display = 'flex';
        this.isVisible = true;
    },

    /**
     * Oculta el modal
     */
    hideModal: function() {
        if (!this.modalElement) return;
        this.modalElement.style.display = 'none';
        this.isVisible = false;
        LegacyManager.close();
        
        // Regresar al menú principal después de cerrar la crónica
        if (!gameState.isCampaignBattle && typeof showScreen === 'function' && domElements.mainMenuScreenEl) {
            if (domElements.gameContainer) {
                domElements.gameContainer.style.display = 'none';
            }
            showScreen(domElements.mainMenuScreenEl);
        }
    },

    /**
     * Activa una pestaña
     */
    _activateTab: function(tabName) {
        if (!this.modalElement) {
            console.error('[LegacyUI._activateTab] No hay modalElement');
            return;
        }
        
        const tabs = this.modalElement.querySelectorAll('[data-legacy-tab]');
        const contents = this.modalElement.querySelectorAll('[data-legacy-content]');

        tabs.forEach(tab => {
            const isActive = tab.getAttribute('data-legacy-tab') === tabName;
            tab.classList.toggle('active', isActive);
        });

        contents.forEach(content => {
            const isVisible = content.getAttribute('data-legacy-content') === tabName;
            content.style.display = isVisible ? 'block' : 'none';
        });
    },

    /**
     * PESTAÑA 1: LÍNEA DE TIEMPO (Gráfico XY)
     */
    displayTimeline: function(graphData) {
        const content = this.modalElement.querySelector('[data-legacy-content="timeline"]');
        if (!content) {
            console.error('[LegacyUI.displayTimeline] No se encontró elemento de contenido');
            return;
        }

        // Crear un gráfico SVG simple
        const width = 900;
        const height = 400;
        const padding = 60;
        const maxScore = Math.max(...graphData.series.flatMap(s => s.data)) || 1000;

        let svg = `<svg width="${width}" height="${height}" class="legacy-chart">`;
        
        // Ejes
        svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#fff" stroke-width="2"/>`;
        svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#fff" stroke-width="2"/>`;

        // Eje X (turnos)
        const turnStep = Math.ceil(graphData.turns.length / 10);
        for (let i = 0; i < graphData.turns.length; i += turnStep) {
            const x = padding + (i / graphData.turns.length) * (width - 2 * padding);
            svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" fill="#aaa" font-size="10">T${graphData.turns[i]}</text>`;
        }

        // Eje Y (puntuación)
        for (let i = 0; i <= 5; i++) {
            const score = (maxScore / 5) * i;
            const y = height - padding - (i / 5) * (height - 2 * padding);
            svg += `<text x="${padding - 40}" y="${y}" text-anchor="end" fill="#aaa" font-size="10">${Math.floor(score)}</text>`;
        }

        // Líneas de datos
        graphData.series.forEach(series => {
            let pathData = `M ${padding} ${height - padding - ((series.data[0] || 0) / maxScore) * (height - 2 * padding)}`;
            
            for (let i = 1; i < series.data.length; i++) {
                const x = padding + (i / series.data.length) * (width - 2 * padding);
                const y = height - padding - ((series.data[i] || 0) / maxScore) * (height - 2 * padding);
                pathData += ` L ${x} ${y}`;
            }

            svg += `<path d="${pathData}" fill="none" stroke="${series.color}" stroke-width="2" opacity="0.8"/>`;
            
            // Marcador de ganador
            if (series.isWinner) {
                svg += `<circle cx="${width - padding}" cy="${height - padding - ((series.data[series.data.length-1] || 0) / maxScore) * (height - 2 * padding)}" r="5" fill="${series.color}" stroke="#fff" stroke-width="2"/>`;
            }
        });

        svg += `</svg>`;

        // Leyenda
        let legend = `<div class="legacy-legend">`;
        graphData.series.forEach(series => {
            legend += `<span style="color: ${series.color}; font-weight: ${series.isWinner ? 'bold' : 'normal'};">
                ${series.name} ${series.isWinner ? '👑' : ''}
            </span>`;
        });
        legend += `</div>`;

        const html = `
            <h3>📈 Evolución de cada imperio</h3>
            <p style="color: #aaa; font-size: 0.9em;">Serie compuesta por expansion, poder militar, ciudades, poblacion e hitos. No recompensa simplemente guardar oro.</p>
            ${svg}
            ${legend}
        `;

        content.innerHTML = html;
    },

    /**
     * PESTAÑA 2: MAPA DE CALOR (Timelapse)
     */
    displayHeatmap: function(heatmapData) {
        const content = this.modalElement.querySelector('[data-legacy-content="heatmap"]');
        if (!content) return;

        if (!heatmapData.hexStates || heatmapData.hexStates.length === 0) {
            content.innerHTML = `
                <h3>🗺️ Mapa de Expansión Territorial</h3>
                <p style="color: #aaa; font-size: 0.9em;">No hay datos de territorio para mostrar.</p>
            `;
            return;
        }

        // Crear grid visual de hexagos simplificado
        const hexSize = 20;
        let gridHTML = `<div class="heatmap-grid" style="display: grid; grid-template-columns: repeat(${heatmapData.width}, 1fr); gap: 2px; padding: 20px;">`;

        for (let r = 0; r < heatmapData.height; r++) {
            for (let c = 0; c < heatmapData.width; c++) {
                const hexState = heatmapData.hexStates.find(h => h.r === r && h.c === c);
                const color = hexState ? hexState.color : '#444';
                const tooltip = hexState ? `${hexState.owner} | ${hexState.structure || 'Tierra'}` : 'Tierra neutra';

                gridHTML += `
                    <div class="heatmap-hex" style="
                        width: ${hexSize}px;
                        height: ${hexSize}px;
                        background-color: ${color};
                        border: 1px solid rgba(255,255,255,0.2);
                        border-radius: 4px;
                        cursor: pointer;
                    " title="${tooltip}"></div>
                `;
            }
        }

        gridHTML += `</div>`;

        const html = `
            <h3>🗺️ Mapa de Expansión Territorial</h3>
            <p style="color: #aaa; font-size: 0.9em;">Estado final del mapa - Colores representan a cada imperio</p>
            ${gridHTML}
        `;

        content.innerHTML = html;
    },

    /**
     * PESTAÑA 3: CRÓNICA NARRATIVA
     */
    displayNarrative: function(narrative) {
        const content = this.modalElement.querySelector('[data-legacy-content="narrative"]');
        if (!content) return;

        const events = narrative?.events || [];
        const eventHTML = events.map(e => {
            const icon = e.type === 'battle' ? '⚔️' : '📜';
            return `<div class="narrative-entry ${e.type}">
                <span class="narrative-icon">${icon}</span>
                <span class="narrative-text">${e.text}</span>
            </div>`;
        }).join('');

        const hasEvents = events.length > 0;
        const html = `
            <h3>📖 La Crónica de la Partida</h3>
            <p style="color: #aaa; font-size: 0.9em;">Reseña narrativa de los eventos más importantes (${narrative.totalTurns} turnos)</p>
            <div style="margin: 12px 0 18px; padding: 12px; border: 1px solid rgba(212,165,116,0.4); background: rgba(212,165,116,0.08); color: #f2d3ac; line-height: 1.45;">${narrative.summary || 'Sin resumen narrativo disponible.'}</div>
            <div class="narrative-log" style="
                max-height: 500px;
                overflow-y: auto;
                border-left: 3px solid #00f3ff;
                padding-left: 15px;
            ">
                ${hasEvents ? eventHTML : '<div style="color:#777; padding: 10px 0;">No hay eventos narrativos registrados.</div>'}
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * PESTAÑA 4: ANÁLISIS DE COMBATE
     */
    displayCombatLog: function(combatAnalysis) {
        const content = this.modalElement.querySelector('[data-legacy-content="combat"]');
        if (!content) return;

        if (!combatAnalysis || combatAnalysis.length === 0) {
            content.innerHTML = `
                <h3>⚔️ Análisis de Combates</h3>
                <p style="color: #aaa; font-size: 0.9em;">No hay combates registrados en esta partida.</p>
            `;
            return;
        }

        const rows = combatAnalysis.map(battle => `
            <tr>
                <td class="turn">T${battle.turn}</td>
                <td class="attacker">${battle.attackerName}</td>
                <td class="vs">vs</td>
                <td class="defender">${battle.defenderName}</td>
                <td class="location">${battle.location}</td>
                <td class="terrain">${battle.terrain} ${battle.terrainBonus}</td>
                <td class="winner">${battle.winnerName}</td>
                <td class="casualties">
                    <span class="attacker-losses">-${battle.attackerLosses}</span>
                    <span class="defender-losses">-${battle.defenderLosses}</span>
                </td>
            </tr>
        `).join('');

        const html = `
            <h3>⚔️ Análisis de Combates</h3>
            <p style="color: #aaa; font-size: 0.9em;">Detalles de los últimos 10 combates. La última columna muestra pérdidas del atacante y del defensor, en ese orden.</p>
            <div class="legacy-table-container">
                <table class="legacy-table">
                    <thead>
                        <tr>
                            <th>Turno</th>
                            <th>Atacante</th>
                            <th></th>
                            <th>Defensor</th>
                            <th>Ubicación</th>
                            <th>Terreno</th>
                            <th>Ganador</th>
                            <th>Pérdidas Atacante / Defensor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="8">Sin batallas registradas</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LegacyUI = LegacyUI;
}
