/**
 * legacyUI.js
 * Interfaz visual de "La Crónica" (Legacy/End Game Analysis)
 * Modal con gráficos, línea de tiempo narrativa y análisis de combate
 */

const LegacyUI = {
    modalElement: null,
    isVisible: false,

    _isCompactMobile: function() {
        return window.matchMedia('(max-width: 480px)').matches;
    },

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

        const safeTurns = Array.isArray(graphData?.turns) && graphData.turns.length > 0
            ? graphData.turns
            : [1];
        const safeSeries = Array.isArray(graphData?.series)
            ? graphData.series.filter(s => s && Array.isArray(s.data))
            : [];

        if (safeSeries.length === 0) {
            content.innerHTML = `
                <h3>📈 Evolución de cada imperio</h3>
                <p style="color: #aaa; font-size: 0.9em;">No hay suficientes datos de turnos para dibujar la gráfica en esta partida.</p>
                <div style="height: 180px; display:flex; align-items:center; justify-content:center; border:1px solid #444; background:rgba(0,0,0,0.3); color:#888;">Sin datos de timeline</div>
            `;
            return;
        }

        // ── Gráfico principal: poder total por jugador ──────────────────────
        const isCompactMobile = this._isCompactMobile();
        const width = isCompactMobile ? 320 : 900;
        const height = isCompactMobile ? 210 : 400;
        const padding = isCompactMobile ? 34 : 60;
        const allValues = safeSeries.flatMap(s => s.data).filter(v => Number.isFinite(v));
        const maxScore = Math.max(1, ...(allValues.length > 0 ? allValues : [1]));

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="legacy-chart">`;
        svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#fff" stroke-width="2"/>`;
        svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#fff" stroke-width="2"/>`;

        const turnStep = Math.max(1, Math.ceil(safeTurns.length / 10));
        for (let i = 0; i < safeTurns.length; i += turnStep) {
            const x = padding + (i / Math.max(1, safeTurns.length - 1)) * (width - 2 * padding);
            svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" fill="#aaa" font-size="10">T${safeTurns[i]}</text>`;
        }
        for (let i = 0; i <= 5; i++) {
            const score = (maxScore / 5) * i;
            const y = height - padding - (i / 5) * (height - 2 * padding);
            svg += `<text x="${padding - 40}" y="${y}" text-anchor="end" fill="#aaa" font-size="10">${Math.floor(score)}</text>`;
        }

        safeSeries.forEach(series => {
            const firstValue = Number.isFinite(series.data[0]) ? series.data[0] : 0;
            let pathData = `M ${padding} ${height - padding - (firstValue / maxScore) * (height - 2 * padding)}`;
            for (let i = 1; i < series.data.length; i++) {
                const x = padding + (i / Math.max(1, series.data.length - 1)) * (width - 2 * padding);
                const value = Number.isFinite(series.data[i]) ? series.data[i] : 0;
                const y = height - padding - (value / maxScore) * (height - 2 * padding);
                pathData += ` L ${x} ${y}`;
            }
            svg += `<path d="${pathData}" fill="none" stroke="${series.color}" stroke-width="2" opacity="0.8"/>`;
            if (series.isWinner) {
                const lastValue = Number.isFinite(series.data[series.data.length - 1]) ? series.data[series.data.length - 1] : 0;
                svg += `<circle cx="${width - padding}" cy="${height - padding - (lastValue / maxScore) * (height - 2 * padding)}" r="5" fill="${series.color}" stroke="#fff" stroke-width="2"/>`;
            }
        });
        svg += `</svg>`;

        let legend = `<div class="legacy-legend">`;
        safeSeries.forEach(series => {
            legend += `<span style="color: ${series.color}; font-weight: ${series.isWinner ? 'bold' : 'normal'};">
                ${series.name} ${series.isWinner ? '👑' : ''}
            </span>`;
        });
        legend += `</div>`;

        // ── Sección de desglose por rubro ──────────────────────────────────
        const safeBreakdown = Array.isArray(graphData?.breakdown)
            ? graphData.breakdown.filter(bd => bd && Array.isArray(bd.subSeries) && bd.subSeries.length > 0)
            : [];

        let breakdownHtml = '';
        if (safeBreakdown.length > 0) {
            const tabButtons = safeBreakdown.map((bd, i) =>
                `<button class="breakdown-tab ${i === 0 ? 'active' : ''}" data-breakdown-idx="${i}"
                    style="background: ${i === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${bd.color}; color: #eee; padding: ${isCompactMobile ? '4px 7px' : '5px 12px'}; margin: 3px; border-radius: 4px; cursor: pointer; font-size: ${isCompactMobile ? '0.66em' : '0.82em'};">
                    <span style="color: ${bd.color};">■</span> ${bd.name}
                </button>`
            ).join('');

            const firstBd = safeBreakdown[0];
            breakdownHtml = `
                <div class="breakdown-section" style="margin-top: 32px; border-top: 1px solid #444; padding-top: 20px;">
                    <h3 style="margin-bottom: 6px;">⚖️ Desglose de poder por componente</h3>
                    <p style="color: #aaa; font-size: 0.85em; margin-bottom: 10px;">
                        Evolución de los distintos rubros de poder de cada jugador por turno.
                        Las escalas están normalizadas para poder compararlos en la misma gráfica
                        (Oro ÷10, Ciudades ×30, Territorio ×5).
                    </p>
                    <div class="breakdown-player-tabs" style="margin-bottom: 12px;">${tabButtons}</div>
                    <div id="legacyBreakdownChart">${this._renderBreakdownChartHTML(firstBd.subSeries, safeTurns)}</div>
                    <div id="legacyBreakdownLegend">${this._renderBreakdownLegendHTML(firstBd.subSeries)}</div>
                </div>
            `;
        }

        content.innerHTML = `
            <h3>📈 Evolución de cada imperio</h3>
            <p style="color: #aaa; font-size: 0.9em;">Serie histórica real por turno del poder militar total (tierra + naval) de cada jugador.</p>
            ${svg}
            ${legend}
            ${breakdownHtml}
        `;

        // Listeners para los botones de selección de jugador en el desglose
        if (safeBreakdown.length > 0) {
            const tabs = content.querySelectorAll('.breakdown-tab[data-breakdown-idx]');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const idx = Number(tab.dataset.breakdownIdx);
                    const bd = safeBreakdown[idx];
                    if (!bd) return;
                    const chartEl  = content.querySelector('#legacyBreakdownChart');
                    const legendEl = content.querySelector('#legacyBreakdownLegend');
                    if (chartEl)  chartEl.innerHTML  = this._renderBreakdownChartHTML(bd.subSeries, safeTurns);
                    if (legendEl) legendEl.innerHTML = this._renderBreakdownLegendHTML(bd.subSeries);
                    tabs.forEach(t => {
                        t.style.background = t === tab ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
                        t.classList.toggle('active', t === tab);
                    });
                });
            });
        }
    },

    /**
     * Genera el SVG del gráfico de desglose para un jugador.
     */
    _renderBreakdownChartHTML: function(subSeries, turns) {
        if (!Array.isArray(subSeries) || subSeries.length === 0) {
            return '<div style="color: #777; padding: 10px 0;">Sin datos de desglose disponibles para este jugador.</div>';
        }

        const isCompactMobile = this._isCompactMobile();
        const width = isCompactMobile ? 320 : 900;
        const height = isCompactMobile ? 185 : 280;
        const padding = isCompactMobile ? 34 : 60;
        const allValues = subSeries.flatMap(s => s.data).filter(v => Number.isFinite(v));
        const maxVal = Math.max(1, ...(allValues.length > 0 ? allValues : [1]));

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="legacy-chart">`;
        svg += `<line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#fff" stroke-width="1.5"/>`;
        svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#fff" stroke-width="1.5"/>`;

        const turnStep = Math.max(1, Math.ceil(turns.length / 10));
        for (let i = 0; i < turns.length; i += turnStep) {
            const x = padding + (i / Math.max(1, turns.length - 1)) * (width - 2 * padding);
            svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" fill="#aaa" font-size="10">T${turns[i]}</text>`;
        }
        for (let i = 0; i <= 5; i++) {
            const val = (maxVal / 5) * i;
            const y = height - padding - (i / 5) * (height - 2 * padding);
            svg += `<text x="${padding - 10}" y="${y + 4}" text-anchor="end" fill="#aaa" font-size="10">${Math.floor(val)}</text>`;
        }

        subSeries.forEach(series => {
            if (!series.data || series.data.length === 0) return;
            const firstVal = Number.isFinite(series.data[0]) ? series.data[0] : 0;
            let pathData = `M ${padding} ${height - padding - (firstVal / maxVal) * (height - 2 * padding)}`;
            for (let i = 1; i < series.data.length; i++) {
                const x = padding + (i / Math.max(1, series.data.length - 1)) * (width - 2 * padding);
                const val = Number.isFinite(series.data[i]) ? series.data[i] : 0;
                const y = height - padding - (val / maxVal) * (height - 2 * padding);
                pathData += ` L ${x} ${y}`;
            }
            svg += `<path d="${pathData}" fill="none" stroke="${series.color}" stroke-width="2" opacity="0.9"/>`;
        });

        svg += `</svg>`;
        return svg;
    },

    /**
     * Genera el HTML de la leyenda del gráfico de desglose.
     */
    _renderBreakdownLegendHTML: function(subSeries) {
        if (!Array.isArray(subSeries) || subSeries.length === 0) return '';
        const items = subSeries.map(s =>
            `<span style="color: ${s.color}; margin-right: 14px; white-space: nowrap;">— ${s.label}</span>`
        ).join('');
        return `<div class="legacy-legend" style="flex-wrap: wrap; gap: 6px; margin-top: 8px;">${items}</div>`;
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
        const isCompactMobile = this._isCompactMobile();
        const hexSize = isCompactMobile ? 11 : 20;
        let gridHTML = `<div class="heatmap-grid" style="display: grid; grid-template-columns: repeat(${heatmapData.width}, 1fr); gap: ${isCompactMobile ? 1 : 2}px; padding: ${isCompactMobile ? 6 : 20}px;">`;

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
        const highlights = narrative?.highlightedEvents || [];
        const eventHTML = events.map(e => {
            const icon = e.type === 'battle' ? '⚔️' : '📜';
            return `<div class="narrative-entry ${e.type}">
                <span class="narrative-icon">${icon}</span>
                <span class="narrative-text">${e.text}</span>
            </div>`;
        }).join('');
        const highlightHTML = highlights.map((event, index) => `
            <div style="padding: 10px 12px; border: 1px solid rgba(212,165,116,0.25); background: rgba(212,165,116,0.06); border-radius: 6px; margin-bottom: 8px;">
                <div style="color: #d4a574; font-size: 0.78em; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">Hito ${index + 1}</div>
                <div style="line-height: 1.45; color: #f2d3ac;">${event.text}</div>
            </div>
        `).join('');

        const hasEvents = events.length > 0;
        const html = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom: 8px;">
                <div>
                    <h3 style="margin:0 0 6px;">📖 La Crónica de la Partida</h3>
                    <p style="color: #aaa; font-size: 0.9em; margin:0;">Reseña narrativa de los eventos más importantes (${narrative.totalTurns} turnos)</p>
                </div>
                <button class="legacy-export-btn" onclick="LegacyManager.exportNarrativePoster()" style="padding: 10px 16px; background: linear-gradient(135deg, #d4a574, #8b5e3c); color: #1b120b; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; cursor: pointer; font-weight: bold;">🖼️ EXPORTAR FOTO FINAL</button>
            </div>
            <div style="margin: 12px 0 18px; padding: 12px; border: 1px solid rgba(212,165,116,0.4); background: rgba(212,165,116,0.08); color: #f2d3ac; line-height: 1.45;">${narrative.summary || 'Sin resumen narrativo disponible.'}</div>
            ${highlights.length > 0 ? `
                <div style="margin: 0 0 18px;">
                    <div style="color:#d4a574; font-size:0.82em; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:8px;">Hitos épicos</div>
                    ${highlightHTML}
                </div>
            ` : ''}
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
