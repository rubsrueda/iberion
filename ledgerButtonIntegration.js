/**
 * ledgerButtonIntegration.js
 * Agregador del botón "Cuaderno de Estado" a la UI
 * Se ejecuta en el documento listo
 */

const LedgerButtonIntegration = {
    initialize: function() {
        console.log('[LedgerButtonIntegration] Inicializando botón del cuaderno...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._createLedgerButton();
            });
        } else {
            this._createLedgerButton();
        }
    },

    _createLedgerButton: function() {
        // Si ya existe, no crear duplicado
        if (document.getElementById('ledger-button')) return;

        const button = document.createElement('button');
        button.id = 'ledger-button';
        button.className = 'ledger-button';
        button.innerHTML = '📖';
        button.title = 'Abrir Cuaderno de Estado (L)';
        
        button.style.cssText = `
            position: fixed;
            bottom: 150px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00f3ff, #0088ff);
            border: 2px solid #00f3ff;
            color: #000;
            font-size: 24px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 0 15px rgba(0,243,255,0.5);
            transition: all 0.3s;
            display: none; /* Se muestra cuando hay partida activa */
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 0 25px rgba(0,243,255,0.8)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 0 15px rgba(0,243,255,0.5)';
        });

        button.addEventListener('click', () => {
            if (typeof LedgerManager !== 'undefined') {
                LedgerManager.open();
            }
        });

        document.body.appendChild(button);

        // Listener para mostrar/ocultar el botón según si hay partida activa
        this._setupVisibilityListener();

        // Atajo de teclado (L)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey) {
                const ledgerModal = document.getElementById('ledgerModal');
                if (gameState && gameState.currentPlayer && gameState.currentPhase === 'play' && !LedgerUI?.isVisible) {
                    if (typeof LedgerManager !== 'undefined') {
                        LedgerManager.open();
                    }
                }
            }
        });

        console.log('[LedgerButtonIntegration] Botón del cuaderno agregado');
    },

    _setupVisibilityListener: function() {
        setInterval(() => {
            const button = document.getElementById('ledger-button');
            if (!button) return;

            // Mostrar solo si hay partida activa
            const isGameActive = gameState && gameState.currentPlayer && gameState.currentPhase === 'play';
            button.style.display = isGameActive ? 'flex' : 'none';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
        }, 500);
    }
};

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        LedgerButtonIntegration.initialize();
    });
} else {
    LedgerButtonIntegration.initialize();
}
