/**
 * ledgerIntegration.js
 * Integración del Cuaderno de Estado en la UI existente
 * Agrega botón de acceso sin modificar archivos existentes
 */

console.log('%c🔥🔥🔥 LEDGER INTEGRATION CARGADO 🔥🔥🔥', 'background: purple; color: yellow; font-size: 20px; padding: 10px;');
console.log('[ledgerIntegration.js] Archivo cargado en:', new Date().toISOString());

const LedgerIntegration = {
    initialized: false,

    /**
     * Inicializa la integración - llamar después de que DOM esté listo
     */
    initialize: function() {
        console.log('%c[LedgerIntegration.initialize] 🚀 INICIANDO INTEGRACIÓN', 'background: blue; color: white; font-size: 16px; padding: 5px;');
        if (this.initialized) {
            console.log('[LedgerIntegration.initialize] Ya inicializado, saliendo...');
            return;
        }
        
        console.log('[LedgerIntegration.initialize] Primera inicialización...');
        
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
            console.warn('[LedgerIntegration] top-bar-menu no encontrado - reintentando en 500ms');
            setTimeout(() => this._addButtonToUI(), 500);
            return;
        }
        
        // Verificar si ya existe el botón (evitar duplicados)
        if (document.getElementById('btn-open-ledger')) {
            console.log('[LedgerIntegration] Botón ya existe, omitiendo creación');
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
        console.log('%c[LedgerIntegration._addButtonToUI] 🎨 CREANDO BOTÓN...', 'background: cyan; color: black; font-size: 14px;');
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
        console.log('[LedgerIntegration._addButtonToUI] Botón creado:', ledgerBtn);
        console.log('[LedgerIntegration._addButtonToUI] Botón ID:', ledgerBtn.id);
        console.log('[LedgerIntegration._addButtonToUI] Botón textContent:', ledgerBtn.textContent);
        ledgerBtn.addEventListener('mouseover', (e) => {
            e.target.style.background = '#00ddee';
            e.target.style.boxShadow = '0 0 10px rgba(0,243,255,0.5)';
        });
        ledgerBtn.addEventListener('mouseout', (e) => {
            e.target.style.background = '#00f3ff';
            e.target.style.boxShadow = 'none';
        });
        ledgerBtn.addEventListener('click', (e) => {
            console.log('%c🚨🚨🚨 CLICK DETECTADO EN BOTÓN CUADERNO 🚨🚨🚨', 'background: red; color: yellow; font-size: 24px; padding: 20px; border: 5px solid yellow;');
            console.log('[LedgerIntegration.onclick] Event:', e);
            console.log('[LedgerIntegration.onclick] Timestamp:', new Date().toISOString());
            console.log('[LedgerIntegration.onclick] Target:', e.target);
            
            // PARAR TODO PROPAGACIÓN
            e.stopPropagation();
            e.preventDefault();
            
            try {
                console.log('[LedgerIntegration.onclick] Buscando modal...');
                const modal = document.getElementById('ledgerModal');
                console.log('[LedgerIntegration.onclick] Modal encontrado:', !!modal);
                console.log('[LedgerIntegration.onclick] Modal object:', modal);
                
                if (modal) {
                    console.log('[LedgerIntegration.onclick] Aplicando estilos NUCLEARES...');
                    // MÉTODO NUCLEAR: Reescribir el atributo style completamente
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
                    console.log('[LedgerIntegration.onclick] ✅ Modal mostrado (NUCLEAR)');
                    alert('MODAL MOSTRADO - VERIFICAR PANTALLA');
                } else {
                    console.error('[LedgerIntegration.onclick] ❌ Modal no encontrado');
                    alert('ERROR: Modal no encontrado');
                }
                
                console.log('[LedgerIntegration.onclick] Verificando LedgerManager...');
                console.log('[LedgerIntegration.onclick] LedgerManager definido?', typeof LedgerManager !== 'undefined');
                if (typeof LedgerManager !== 'undefined') {
                    console.log('[LedgerIntegration.onclick] ✅ LedgerManager disponible');
                    console.log('[LedgerIntegration.onclick] Llamando a LedgerManager.open()...');
                    LedgerManager.open();
                    console.log('[LedgerIntegration.onclick] ✅ LedgerManager.open() ejecutado');
                } else {
                    console.error('[LedgerIntegration.onclick] ❌ LedgerManager NO DISPONIBLE');
                }
            } catch (error) {
                console.error('%c[LedgerIntegration.onclick] ❌ ERROR FATAL', 'background: red; color: white; font-size: 16px; padding: 5px;');
                console.error('[LedgerIntegration.onclick] Error:', error);
                console.error('[LedgerIntegration.onclick] Stack:', error.stack);
            }
        });

        ledgerButtonsDiv.appendChild(ledgerBtn);
        
        // Insertar al inicio del top-bar-menu (o antes de otros elementos)
        const infoContainer = topBar.querySelector('#top-bar-info');
        if (infoContainer) {
            console.log('[LedgerIntegration._addButtonToUI] Insertando antes de #top-bar-info');
            topBar.insertBefore(ledgerButtonsDiv, infoContainer);
        } else {
            console.log('[LedgerIntegration._addButtonToUI] Insertando al inicio de top-bar-menu');
            topBar.insertBefore(ledgerButtonsDiv, topBar.firstChild);
        }

        console.log('%c[LedgerIntegration._addButtonToUI] ✅ BOTÓN CREADO Y AÑADIDO', 'background: green; color: white; font-size: 14px; padding: 5px;');
        console.log('[LedgerIntegration._addButtonToUI] Botón ID:', ledgerBtn.id);
        console.log('[LedgerIntegration._addButtonToUI] Botón en DOM:', document.getElementById('btn-open-ledger'));
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
