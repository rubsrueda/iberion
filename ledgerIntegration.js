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
        if (this.initialized) {
            return;
        }
        
        // NO crear botón - ya está en index.html
        // El botón se maneja directamente desde el HTML
        
        this.initialized = true;
    },

    /**
     * Agrega botones de acceso a la UI
     */
    _addButtonToUI: function() {
        const topBar = document.getElementById('top-bar-menu');
        if (!topBar) {
            setTimeout(() => this._addButtonToUI(), 500);
            return;
        }
        
        // Verificar si ya existe el botón (evitar duplicados)
        if (document.getElementById('btn-open-ledger')) {
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
            pointer-events: auto;
        `;
        ledgerBtn.addEventListener('mouseover', (e) => {
            e.target.style.background = '#00ddee';
            e.target.style.boxShadow = '0 0 10px rgba(0,243,255,0.5)';
        });
        ledgerBtn.addEventListener('mouseout', (e) => {
            e.target.style.background = '#00f3ff';
            e.target.style.boxShadow = 'none';
        });
        ledgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            try {
                const modal = document.getElementById('ledgerModal');
                
                if (modal) {
                    modal.setAttribute('style', `
                        display: flex !important;
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        z-index: 99999 !important;
                        justify-content: center !important;
                        align-items: center !important;
                        background: rgba(0,0,0,0.95) !important;
                        overflow: auto !important;
                    `);
                }
                
                if (typeof LedgerManager !== 'undefined') {
                    LedgerManager.open();
                }
            } catch (error) {
                console.error('Error al abrir el cuaderno:', error);
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
