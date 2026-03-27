/**
 * ledgerUI.js
 * Interfaz visual del Cuaderno de Estado
 * Modal con 4 pestañas con diseño premium
 */
// Helper para escapar HTML en atributos
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const LedgerUI = {
    modalElement: null,
    isVisible: false,

    /**
     * Inicializa la UI (llamar tras cargar index.html)
     */
    initialize: function() {
        // El modal ya existe en index.html, solo obtener referencia
        this.modalElement = document.getElementById('ledgerModal');
        
        if (!this.modalElement) {
            console.error('[LedgerUI] ❌ Elemento #ledgerModal no encontrado en HTML. Reintentando en 500ms...');
            setTimeout(() => this.initialize(), 500);
            return;
        }

        // Asegurar que exista la pestaña de Comercio (si el HTML no la incluye)
        const firstTab = this.modalElement.querySelector('[data-tab]');
        if (firstTab) {
            const tabsContainer = firstTab.parentNode;
            if (!this.modalElement.querySelector('[data-tab="comercio"]')) {
                const comercioBtn = document.createElement('button');
                comercioBtn.setAttribute('data-tab', 'comercio');
                comercioBtn.className = 'ledger-tab-btn';
                comercioBtn.textContent = '🛒 Comercio';
                tabsContainer.appendChild(comercioBtn);
            }

            // Añadir contenedor de contenido para la pestaña si falta
            const firstContent = this.modalElement.querySelector('[data-content]');
            if (firstContent) {
                const contentsContainer = firstContent.parentNode;
                if (!this.modalElement.querySelector('[data-content="comercio"]')) {
                    const comercioContent = document.createElement('div');
                    comercioContent.setAttribute('data-content', 'comercio');
                    comercioContent.style.display = 'none';
                    contentsContainer.appendChild(comercioContent);
                }
            }
        }

        this._setupEventListeners();
    },

    /**
     * Configura listeners para botones de pestañas
     */
    _setupEventListeners: function() {
        const tabs = this.modalElement.querySelectorAll('[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this._activateTab(tabName);
                LedgerManager.switchTab(tabName);
            });
        });

        // Botón cerrar
        const closeBtn = this.modalElement.querySelector('.ledger-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        // Cerrar al hacer clic fuera
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
            console.error('[LedgerUI] ❌ modalElement es null. initialize() probablemente no se ejecutó correctamente.');
            return;
        }
        this.modalElement.style.display = 'flex';
        this.modalElement.style.visibility = 'visible';
        this.modalElement.style.opacity = '1';
        this.isVisible = true;
    },

    /**
     * Oculta el modal
     */
    hideModal: function() {
        if (!this.modalElement) return;
        this.modalElement.style.display = 'none';
        this.isVisible = false;
        LedgerManager.close();
    },

    /**
     * Activa una pestaña visualmente
     */
    _activateTab: function(tabName) {
        const tabs = this.modalElement.querySelectorAll('[data-tab]');
        const contents = this.modalElement.querySelectorAll('[data-content]');

        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        contents.forEach(content => {
            content.style.display = content.getAttribute('data-content') === tabName ? 'block' : 'none';
        });
    },

    /**
     * Muestra PESTAÑA 1: RESUMEN NACIONAL
     */
    displayResumenNacional: function(resumen) {
        const content = this.modalElement.querySelector('[data-content="resumen"]');
        if (!content) return;

        const html = `
            <div class="ledger-section">
                <h3>💰 TESORERÍA</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Ingresos / Turno</span>
                        <span class="value income">+${resumen.tesoreria.ingresos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Gastos / Turno</span>
                        <span class="value expense">-${resumen.tesoreria.gastos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Balance Neto</span>
                        <span class="value ${resumen.tesoreria.balance >= 0 ? 'income' : 'expense'}">
                            ${resumen.tesoreria.balance > 0 ? '+' : ''}${resumen.tesoreria.balance}
                        </span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Oro Actual</span>
                        <span class="value">${resumen.tesoreria.oro}</span>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>⚔️ CAPACIDAD MILITAR (Condensada)</h3>
                <div class="ledger-military-condensed">
                    <div class="military-bar-container">
                        <div class="military-bar-label">Regimientos: ${resumen.capacidadMilitar.regimentosActivos}/${resumen.capacidadMilitar.limiteSuministros}</div>
                        <div class="military-bar-track">
                            <div class="military-bar-fill" style="width:${Math.min(resumen.capacidadMilitar.porcentajeUso, 100)}%; background:${resumen.capacidadMilitar.porcentajeUso > 85 ? '#ff5252' : resumen.capacidadMilitar.porcentajeUso > 60 ? '#ffb74d' : '#4caf50'};"></div>
                        </div>
                        <div class="military-bar-status">${resumen.capacidadMilitar.porcentajeUso}% (${resumen.capacidadMilitar.porcentajeUso > 85 ? '⚠️ Crítica' : resumen.capacidadMilitar.porcentajeUso > 60 ? '⚡ Media' : '✅ Normal'})</div>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>🛡️ ESTABILIDAD</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Nivel de Estabilidad</span>
                        <span class="value status-${resumen.estabilidad.nivelEstabilidad.toLowerCase().replace(' ', '-')}">${resumen.estabilidad.nivelEstabilidad}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Corrupción</span>
                        <span class="value">${resumen.estabilidad.corrupcion}%</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Orden Público</span>
                        <span class="value">${resumen.estabilidad.ordenPublico}%</span>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>📦 RECURSOS ESTRATÉGICOS</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">🔨 Hierro</span>
                        <span class="value">${resumen.recursosEstrategicos.hierro}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">🌳 Madera</span>
                        <span class="value">${resumen.recursosEstrategicos.madera}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">🍖 Comida</span>
                        <span class="value">${resumen.recursosEstrategicos.comida}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">🪨 Piedra</span>
                        <span class="value">${resumen.recursosEstrategicos.piedra}</span>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Muestra PESTAÑA: COMERCIO (Rutas usadas y disponibles)
     */
    displayComercio: function(comercio) {
        const content = this.modalElement.querySelector('[data-content="comercio"]');
        if (!content) return;

        const activeRows = (comercio.activeRoutes || []).map(r => `
            <tr>
                <td>${r.originName}</td>
                <td>${r.destinationName}</td>
                <td>${r.unitName || ('Unidad ' + r.unitId)}</td>
                <td>${r.goldCarried ?? 0}/${r.cargoCapacity ?? '—'}</td>
                <td>${r.pathLength ?? '—'}</td>
                <td>${r.isOperational === false ? '⚠️ Revisar ruta' : '✅ En curso'}</td>
            </tr>
        `).join('') || '<tr><td colspan="6">No hay rutas comerciales activas</td></tr>';

        const freeRows = (comercio.freeRoutes || []).map(r => `
            <tr>
                <td>${r.aName}</td>
                <td>${r.bName}</td>
                <td>${r.isConnected ? 'Sí' : 'No'}</td>
                <td style="width:120px; text-align:center;">
                    <button class="start-trade-btn" data-a="${escapeHtml(r.aName)}" data-b="${escapeHtml(r.bName)}" ${r.isConnected ? '' : 'disabled'}>
                        Iniciar
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="4">No hay pares de ciudades disponibles</td></tr>';

        const html = `
            <div class="ledger-section">
                <h3>🛒 Rutas Comerciales Activas (${comercio.activeCount || 0})</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr><th>Origen</th><th>Destino</th><th>Unidad</th><th>Carga</th><th>Longitud</th><th>Estado</th></tr>
                        </thead>
                        <tbody>${activeRows}</tbody>
                    </table>
                </div>
            </div>

            <div class="ledger-section">
                <h3>📍 Pares de Ciudades Disponibles (${comercio.freeCount || 0})</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr><th>Ciudad A</th><th>Ciudad B</th><th>Conectadas</th></tr>
                        </thead>
                        <tbody>${freeRows}</tbody>
                    </table>
                </div>
            </div>
        `;

        content.innerHTML = html;

        // Adjuntar listeners a botones de inicio de ruta
        const startBtns = content.querySelectorAll('.start-trade-btn');
        startBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const a = btn.getAttribute('data-a');
                const b = btn.getAttribute('data-b');
                if (typeof LedgerManager !== 'undefined' && LedgerManager.startTradeRoute) {
                    LedgerManager.startTradeRoute(a, b);
                } else {
                    console.error('[LedgerUI] LedgerManager.startTradeRoute no disponible');
                }
            });
        });
    },

    /**
     * Muestra PESTAÑA 2: DEMOGRAFÍA
     */
    displayDemografia: function(tabla) {
        const content = this.modalElement.querySelector('[data-content="demografia"]');
        if (!content) return;

        // Validar que tabla sea un array
        if (!Array.isArray(tabla) || tabla.length === 0) {
            content.innerHTML = `
                <div class="ledger-section">
                    <h3>Rankings - Situación Global</h3>
                    <div style="text-align: center; padding: 40px; color: #888;">
                        <p>No hay datos de ranking disponibles.</p>
                    </div>
                </div>
            `;
            return;
        }

        const rows = tabla.map((row, idx) => `
            <tr class="${row.isMe ? 'highlight-row' : ''}">
                <td class="rank">${row.isMe ? '👤' : '🤖'} #${row.rango || idx + 1}</td>
                <td class="civ">${row.civilization || 'Desconocida'}${row.isMe ? ' (Tú)' : ''}</td>
                <td class="score">${row.score ?? '—'}</td>
                <td class="military">⚔️ ${row.power ?? '—'}</td>
                <td class="gold">💰 ${row.gold ?? '—'}</td>
                <td class="territory">🗺️ ${row.territory ?? '—'}</td>
                <td class="cities">🏰 ${row.cities ?? '—'}</td>
                <td class="population">👥 ${row.population ?? '—'}</td>
            </tr>
        `).join('');

        const html = `
            <div class="ledger-section">
                <h3>Rankings - Situación Global</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Rango</th>
                                <th>Civilización</th>
                                <th>Puntuación</th>
                                <th>Militar</th>
                                <th>Oro</th>
                                <th>Territorio</th>
                                <th>Ciudades</th>
                                <th>Población</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Muestra PESTAÑA 3: MILITAR
     */
    displayMilitar: function(militar) {
        const content = this.modalElement.querySelector('[data-content="militar"]');
        if (!content) return;

        const supplyClass = (militar.supplyStatus || 'N/A').toLowerCase().replace(/[^a-z0-9_-]/g, '');

        const tierraRows = militar.tierra.map(unit => {
            // Mostrar desglose de regimientos si hay
            const regimentDetails = unit.regiments && unit.regiments.length > 0
                ? unit.regiments.map(r => `${r.count}x ${r.type}`).join(', ')
                : 'Sin regimientos';
            
            return `
            <tr>
                <td>${unit.name}</td>
                <td>${unit.location.r},${unit.location.c}</td>
                <td><div class="progress-mini" style="width: ${unit.morale}%"></div>${unit.morale}%</td>
                <td>${regimentDetails}</td>
                <td>${unit.supplies}%</td>
                <td>${unit.isDisorganized ? '🔴 Desorganizada' : '✅ Lista'}</td>
            </tr>
        `;
        }).join('');

        const navalRows = militar.naval.map(unit => {
            const regimentDetails = unit.regiments && unit.regiments.length > 0
                ? unit.regiments.map(r => `${r.count}x ${r.type}`).join(', ')
                : 'Sin barcos';
            
            return `
            <tr>
                <td>${unit.name}</td>
                <td>${unit.location.r},${unit.location.c}</td>
                <td><div class="progress-mini" style="width: ${unit.morale}%"></div>${unit.morale}%</td>
                <td>${regimentDetails}</td>
                <td>⚓</td>
            </tr>
        `;
        }).join('');

        // Crear resumen de regimientos por tipo
        const regimentSummaryRows = Object.entries(militar.regimentTotals || {})
            .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
            .map(([type, count]) => `
                <tr>
                    <td>${type}</td>
                    <td class="value">${count}</td>
                </tr>
            `).join('');

        const html = `
            <div class="ledger-section">
                <h3>🏛️ EJÉRCITO DE TIERRA</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Ubicación</th>
                                <th>Moral</th>
                                <th>Composición</th>
                                <th>Suministros</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tierraRows || '<tr><td colspan="6">No hay unidades</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ledger-section">
                <h3>⚓ ARMADA REAL</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Ubicación</th>
                                <th>Moral</th>
                                <th>Composición</th>
                                <th>Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${navalRows || '<tr><td colspan="5">No hay flotas</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ledger-section">
                <h3>📊 RESUMEN DE REGIMIENTOS POR TIPO</h3>
                <div class="ledger-table-container">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Tipo de Regimiento</th>
                                <th>Cantidad Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${regimentSummaryRows || '<tr><td colspan="2">No hay regimientos</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="ledger-section">
                <h3>👥 MANPOWER (Estado de Suministros)</h3>
                <div class="ledger-military-condensed">
                    <div class="military-bar-container">
                        <div class="military-bar-label">Suministrados: ${militar.suppliedRegiments ?? 0}/${militar.manpower}</div>
                        <div class="military-bar-track">
                            <div class="military-bar-fill supplied" style="width:${militar.manpower > 0 ? Math.round(((militar.suppliedRegiments ?? 0) / militar.manpower) * 100) : 0}%; background:#4caf50;"></div>
                            <div class="military-bar-fill unsupplied" style="width:${militar.manpower > 0 ? Math.round(((militar.unsuppliedRegiments ?? 0) / militar.manpower) * 100) : 0}%; background:#ff5252;"></div>
                        </div>
                        <div class="military-bar-status">${militar.supplyStatus} (${militar.unsuppliedRegiments ?? 0} en riesgo)</div>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Muestra PESTAÑA 4: ECONOMÍA
     */
    displayEconomia: function(economia) {
        const content = this.modalElement.querySelector('[data-content="economia"]');
        if (!content) return;

        const html = `
            <div class="ledger-section">
                <h3>� INGRESOS</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Impuestos (Territorio)</span>
                        <span class="value income">+${economia.ingresos.impuestos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Comercio (Caravanas)</span>
                        <span class="value income">+${economia.ingresos.comercio}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Militares (Saqueos)</span>
                        <span class="value income">+${economia.ingresos.militares || 0}</span>
                    </div>
                    <div class="ledger-card full-width" style="background: linear-gradient(135deg, #2a5f3f, #1a3f2f);">
                        <span class="label">TOTAL INGRESOS</span>
                        <span class="value income" style="font-size: 1.3em;">+${economia.ingresos.total}</span>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>💸 GASTOS</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Ejército (Upkeep)</span>
                        <span class="value expense">-${economia.gastos.ejercito}</span>
                    </div>
                    <div class="ledger-card full-width" style="background: linear-gradient(135deg, #5f2a2a, #3f1a1a);">
                        <span class="label">TOTAL GASTOS</span>
                        <span class="value expense" style="font-size: 1.3em;">-${economia.gastos.total}</span>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>⚖️ BALANCE</h3>
                <div class="ledger-grid">
                    <div class="ledger-card full-width" style="background: linear-gradient(135deg, #1a3a5f, #0f2540);">
                        <span class="label">Balance Neto (Ingresos - Gastos)</span>
                        <span class="value ${economia.balance >= 0 ? 'income' : 'expense'}" style="font-size: 1.4em;">
                            ${economia.balance > 0 ? '+' : ''}${economia.balance}
                        </span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Oro Actual en Tesorera</span>
                        <span class="value">${economia.oroActual}</span>
                    </div>
                </div>
            </div>

            <div class="ledger-section">
                <h3>📈 DISTRIBUCIÓN DE INGRESOS</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Impuestos</span>
                        <span class="value">${economia.desglosePorcentual.impuestos}%</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Comercio</span>
                        <span class="value">${economia.desglosePorcentual.comercio}%</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Militares</span>
                        <span class="value">${economia.desglosePorcentual.militares || 0}%</span>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    },

    /**
     * Muestra PESTAÑA 5: CRÓNICA
     */
    displayCronica: function(cronica) {
        const content = this.modalElement.querySelector('[data-content="cronica"]');
        if (!content) return;

        // Función para obtener icono según tipo de evento
        const getEventIcon = (type) => {
            const icons = {
                'turn_start': '📅',
                'move': '🚶',
                'conquest': '⚔️',
                'battle_start': '💥',
                'unit_destroyed': '☠️',
                'construction': '🏗️',
                'commander_assigned': '👑',
                'consolidate': '🔄'
            };
            return icons[type] || '📜';
        };

        // Función para obtener clase CSS según tipo
        const getEventClass = (type) => {
            const classes = {
                'turn_start': 'event-turn',
                'conquest': 'event-conquest',
                'battle_start': 'event-battle',
                'unit_destroyed': 'event-death',
                'construction': 'event-construction'
            };
            return classes[type] || 'event-default';
        };

        if (cronica.totalEvents === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <h2 style="color: #00f3ff;">📜 La Crónica está vacía</h2>
                    <p>Los eventos de la partida aparecerán aquí conforme sucedan.</p>
                    <p style="margin-top: 20px;">Comienza a jugar para que el Cronista registre tus hazañas.</p>
                </div>
            `;
            return;
        }

        // Agrupar eventos por turno (más reciente primero)
        const turns = Object.keys(cronica.logsByTurn).sort((a, b) => b - a);
        
        const turnSections = turns.map(turn => {
            const turnLogs = cronica.logsByTurn[turn];
            const turnRows = turnLogs.map(log => `
                <div class="chronicle-event ${getEventClass(log.type)}" style="
                    padding: 12px;
                    margin: 8px 0;
                    background: rgba(0, 243, 255, 0.05);
                    border-left: 3px solid #00f3ff;
                    border-radius: 4px;
                    transition: all 0.2s;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <span style="font-size: 24px;">${getEventIcon(log.type)}</span>
                        <div style="flex: 1;">
                            <div style="color: #fff; line-height: 1.6;">${log.message}</div>
                            <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Tipo: ${log.type}</div>
                        </div>
                    </div>
                </div>
            `).join('');

            return `
                <div class="chronicle-turn-section" style="margin-bottom: 30px;">
                    <h3 style="
                        color: #00f3ff;
                        padding: 10px;
                        background: rgba(0, 243, 255, 0.1);
                        border-radius: 4px;
                        margin-bottom: 10px;
                        text-shadow: 0 0 10px #00f3ff;
                    ">📆 Turno ${turn} (${turnLogs.length} eventos)</h3>
                    <div style="padding-left: 10px;">
                        ${turnRows}
                    </div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="ledger-section">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: linear-gradient(135deg, rgba(0, 243, 255, 0.1), rgba(0, 243, 255, 0.05));
                    border-radius: 8px;
                ">
                    <div>
                        <h2 style="color: #00f3ff; margin: 0; text-shadow: 0 0 10px #00f3ff;">📜 LA CRÓNICA DE LA PARTIDA</h2>
                        <p style="color: #888; margin: 5px 0 0 0;">Registro narrativo de los acontecimientos</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #00f3ff; font-size: 1.5em; font-weight: bold;">${cronica.totalEvents}</div>
                        <div style="color: #888; font-size: 0.9em;">Eventos registrados</div>
                    </div>
                </div>

                <div style="
                    max-height: calc(95vh - 300px);
                    overflow-y: auto;
                    padding-right: 10px;
                ">
                    ${turnSections}
                </div>
            </div>

            <style>
                .chronicle-event:hover {
                    background: rgba(0, 243, 255, 0.1) !important;
                    transform: translateX(5px);
                }
                .event-conquest { border-left-color: #ff4444 !important; }
                .event-battle { border-left-color: #ff8800 !important; }
                .event-death { border-left-color: #aa0000 !important; }
                .event-construction { border-left-color: #44ff44 !important; }
                .event-turn { border-left-color: #00f3ff !important; background: rgba(0, 243, 255, 0.08) !important; }
            </style>
        `;

        content.innerHTML = html;
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LedgerUI = LedgerUI;
}
