/**
 * ledgerIntegration.js
 * Integración del Cuaderno de Estado en la UI existente
 * Agrega botón de acceso sin modificar archivos existentes
 */

const LedgerIntegration = {
    initialized: false,

    /**
     * Inicializa la integración - llamar después de que DOM esté listo
     */
    initialize: function() {
        if (this.initialized) return;
        
        console.log('[LedgerIntegration] Inicializando...');
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._addButtonToUI());
        } else {
            this._addButtonToUI();
        }
        
        this.initialized = true;
    },

    /**
     * Agrega botones de acceso a la UI
     */
    _addButtonToUI: function() {
        const topBar = document.getElementById('top-bar-menu');
        if (!topBar) {
            console.warn('[LedgerIntegration] top-bar-menu no encontrado');
            return;
        }

        // Crear contenedor para botones del Cuaderno
        const ledgerButtonsDiv = document.createElement('div');
        ledgerButtonsDiv.id = 'ledger-buttons-container';
        ledgerButtonsDiv.style.cssText = `
            display: flex;
            gap: 10px;
            margin-right: 20px;
        `;

        // Botón del Cuaderno de Estado
        const ledgerBtn = document.createElement('button');
        ledgerBtn.id = 'btn-open-ledger';
        ledgerBtn.textContent = '📖 Cuaderno';
        ledgerBtn.style.cssText = `
            background: #00f3ff;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9em;
            transition: all 0.2s;
        `;
        ledgerBtn.addEventListener('mouseover', (e) => {
            e.target.style.background = '#00ddee';
            e.target.style.boxShadow = '0 0 10px rgba(0,243,255,0.5)';
        });
        ledgerBtn.addEventListener('mouseout', (e) => {
            e.target.style.background = '#00f3ff';
            e.target.style.boxShadow = 'none';
        });
        ledgerBtn.addEventListener('click', () => {
            if (typeof LedgerManager !== 'undefined') {
                LedgerManager.open();
            }
        });

        ledgerButtonsDiv.appendChild(ledgerBtn);
        
        // Insertar al inicio del top-bar-menu (o antes de otros elementos)
        const infoContainer = topBar.querySelector('#top-bar-info');
        if (infoContainer) {
            topBar.insertBefore(ledgerButtonsDiv, infoContainer);
        } else {
            topBar.insertBefore(ledgerButtonsDiv, topBar.firstChild);
        }

        console.log('[LedgerIntegration] Botón del Cuaderno agregado al menú superior');
    },

    /**
     * Permite abrir el Cuaderno desde consola: LedgerIntegration.openLedger()
     */
    openLedger: function() {
        if (typeof LedgerManager !== 'undefined') {
            LedgerManager.open();
        }
    }
};

// Inicializar cuando se carga el script
if (typeof window !== 'undefined') {
    window.LedgerIntegration = LedgerIntegration;
    
    // Auto-inicializar si el documento está listo
    if (document.readyState !== 'loading') {
        LedgerIntegration.initialize();
    } else {
        document.addEventListener('DOMContentLoaded', () => LedgerIntegration.initialize());
    }
}
