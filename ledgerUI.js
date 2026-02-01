/**
 * ledgerUI.js
 * Interfaz visual del Cuaderno de Estado
 * Modal con 4 pestañas con diseño premium
 */

console.log('%c🔥🔥🔥 LEDGER UI CARGADO 🔥🔥🔥', 'background: green; color: yellow; font-size: 20px; padding: 10px;');
console.log('[ledgerUI.js] Archivo cargado en:', new Date().toISOString());

const LedgerUI = {
    modalElement: null,
    isVisible: false,

    /**
     * Inicializa la UI (llamar tras cargar index.html)
     */
    initialize: function() {
        console.log('[LedgerUI] Inicializando interfaz del cuaderno...');
        
        // El modal ya existe en index.html, solo obtener referencia
        this.modalElement = document.getElementById('ledgerModal');
        console.log('[LedgerUI] Elemento encontrado:', !!this.modalElement);
        
        if (!this.modalElement) {
            console.error('[LedgerUI] ❌ Elemento #ledgerModal no encontrado en HTML. Reintentando en 500ms...');
            setTimeout(() => this.initialize(), 500);
            return;
        }

        console.log('[LedgerUI] ✅ Modal encontrado. Z-index:', this.modalElement.style.zIndex || 'heredado');
        this._setupEventListeners();
        console.log('[LedgerUI] ✅ Inicialización completada');
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
        console.log('[LedgerUI] showModal() llamado');
        console.log('[LedgerUI] modalElement existe:', !!this.modalElement);
        if (!this.modalElement) {
            console.error('[LedgerUI] ❌ modalElement es null. initialize() probablemente no se ejecutó correctamente.');
            return;
        }
        console.log('[LedgerUI] Mostrando modal. Z-index:', this.modalElement.style.zIndex || 'heredado');
        this.modalElement.style.display = 'flex';
        this.modalElement.style.visibility = 'visible';
        this.modalElement.style.opacity = '1';
        this.isVisible = true;
        console.log('[LedgerUI] ✅ Modal mostrado');
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
                <h3>⚔️ CAPACIDAD MILITAR</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Regimientos Activos</span>
                        <span class="value">${resumen.capacidadMilitar.regimentosActivos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Límite de Suministros</span>
                        <span class="value">${resumen.capacidadMilitar.limiteSuministros}</span>
                    </div>
                    <div class="ledger-card full-width">
                        <span class="label">Uso de Capacidad</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(resumen.capacidadMilitar.porcentajeUso, 100)}%"></div>
                        </div>
                        <span class="value">${resumen.capacidadMilitar.porcentajeUso}%</span>
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
     * Muestra PESTAÑA 2: DEMOGRAFÍA
     */
    displayDemografia: function(tabla) {
        const content = this.modalElement.querySelector('[data-content="demografia"]');
        if (!content) return;

        const rows = tabla.map((row, idx) => `
            <tr class="${row.isMe ? 'highlight-row' : ''}">
                <td class="rank">${row.isMe ? '👤' : '🤖'} #${row.rango}</td>
                <td class="civ">${row.civilization}${row.isMe ? ' (Tú)' : ''}</td>
                <td class="score">${row.score}</td>
                <td class="military">⚔️ ${row.power}</td>
                <td class="gold">💰 ${row.gold}</td>
                <td class="territory">🗺️ ${row.territory}</td>
                <td class="cities">🏰 ${row.cities}</td>
                <td class="population">👥 ${row.population}</td>
            </tr>
        `).join('');

        const html = `
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
        `;

        content.innerHTML = html;
    },

    /**
     * Muestra PESTAÑA 3: MILITAR
     */
    displayMilitar: function(militar) {
        const content = this.modalElement.querySelector('[data-content="militar"]');
        if (!content) return;

        const tierraRows = militar.tierra.map(unit => `
            <tr>
                <td>${unit.name}</td>
                <td>${unit.location.r},${unit.location.c}</td>
                <td><div class="progress-mini" style="width: ${unit.morale}%"></div>${unit.morale}%</td>
                <td>${unit.regiments}</td>
                <td>${unit.supplies}%</td>
                <td>${unit.isDisorganized ? '🔴 Desorganizada' : '✅ Lista'}</td>
            </tr>
        `).join('');

        const navalRows = militar.naval.map(unit => `
            <tr>
                <td>${unit.name}</td>
                <td>${unit.location.r},${unit.location.c}</td>
                <td><div class="progress-mini" style="width: ${unit.morale}%"></div>${unit.morale}%</td>
                <td>${unit.regiments}</td>
                <td>⚓</td>
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
                                <th>Regimientos</th>
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
                                <th>Barcos</th>
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
                <h3>👥 MANPOWER (Reclutas)</h3>
                <div class="ledger-grid">
                    <div class="ledger-card full-width">
                        <span class="label">Soldados Disponibles en Reserva</span>
                        <span class="value">${militar.manpower}</span>
                    </div>
                    <div class="ledger-card full-width">
                        <span class="label">Estado de Suministros</span>
                        <span class="value status-${militar.supplyStatus.toLowerCase()}">${militar.supplyStatus}</span>
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
                <h3>📊 INGRESOS</h3>
                <div class="ledger-grid">
                    <div class="ledger-card">
                        <span class="label">Impuestos</span>
                        <span class="value income">+${economia.ingresos.impuestos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Comercio</span>
                        <span class="value income">+${economia.ingresos.comercio}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Saqueos</span>
                        <span class="value income">+${economia.ingresos.saqueos}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Tratados</span>
                        <span class="value income">+${economia.ingresos.tratados}</span>
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
                        <span class="label">Edificios</span>
                        <span class="value expense">-${economia.gastos.edificios}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Ejército (Upkeep)</span>
                        <span class="value expense">-${economia.gastos.ejercito}</span>
                    </div>
                    <div class="ledger-card">
                        <span class="label">Corrupción</span>
                        <span class="value expense">-${economia.gastos.corrupcion}</span>
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
                        <span class="label">Oro Actual</span>
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
                        <span class="label">Saqueos</span>
                        <span class="value">${economia.desglosePorcentual.saqueos}%</span>
                    </div>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.LedgerUI = LedgerUI;
}
