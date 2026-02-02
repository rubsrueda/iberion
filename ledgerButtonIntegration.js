/**
 * ledgerButtonIntegration.js
 * Agregador del botón "Cuaderno de Estado" a la UI
 * Se ejecuta en el documento listo
 * 
 * DESHABILITADO: El botón ya existe en la barra superior (index.html línea 185)
 * No se necesita crear un botón flotante redundante
 */

const LedgerButtonIntegration = {
    initialize: function() {
        console.log('[LedgerButtonIntegration] Botón deshabilitado - ya existe en barra superior');
        
        // Solo configurar atajo de teclado (L)
        this._setupKeyboardShortcut();
    },

    _setupKeyboardShortcut: function() {
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
        console.log('[LedgerButtonIntegration] Atajo de teclado "L" configurado');
    }
};

// Auto-inicializar solo para configurar el atajo de teclado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        LedgerButtonIntegration.initialize();
    });
} else {
    LedgerButtonIntegration.initialize();
}

// Exponer globalmente para compatibilidad
if (typeof window !== 'undefined') {
    window.LedgerButtonIntegration = LedgerButtonIntegration;
}
