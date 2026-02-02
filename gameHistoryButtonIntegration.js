/**
 * gameHistoryButtonIntegration.js
 * Agrega botón de "Historial de Partidas" al menú principal
 */

const GameHistoryButtonIntegration = {
    initialize: function() {
        console.log('[GameHistoryButtonIntegration] Inicializando...');
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this._addButton();
            });
        } else {
            this._addButton();
        }
    },

    _addButton: function() {
        // Buscar el menú principal o area de botones
        let menuContainer = document.querySelector('.main-menu') || 
                           document.querySelector('#mainMenu') ||
                           document.querySelector('.menu-buttons');

        // Si no existe un container, crear uno o agregarlo al body como overlay
        if (!menuContainer) {
            this._createFloatingButton();
            return;
        }

        // Si existe, agregar el botón ahí
        const button = document.createElement('button');
        button.id = 'history-button';
        button.className = 'history-button';
        button.innerHTML = '📚 Historial';
        button.style.cssText = `
            padding: 12px 24px;
            background: linear-gradient(135deg, #00f3ff, #0088ff);
            border: 2px solid #00f3ff;
            color: #000;
            font-size: 1em;
            cursor: pointer;
            border-radius: 4px;
            font-weight: bold;
            margin: 10px;
            transition: all 0.2s;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 0 15px rgba(0,243,255,0.7)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = 'none';
        });

        button.addEventListener('click', async () => {
            if (typeof GameHistoryManager !== 'undefined') {
                await GameHistoryManager.open();
            }
        });

        menuContainer.appendChild(button);
        console.log('[GameHistoryButtonIntegration] Botón agregado al menú');
    },

    _createFloatingButton: function() {
        // Crear botón flotante en la esquina inferior izquierda
        const button = document.createElement('button');
        button.id = 'history-floating-button';
        button.className = 'history-floating-button';
        button.innerHTML = '📚';
        button.title = 'Historial de Partidas';
        
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00f3ff, #0088ff);
            border: 2px solid #00f3ff;
            color: #000;
            font-size: 24px;
            cursor: pointer;
            z-index: 999;
            box-shadow: 0 0 15px rgba(0,243,255,0.5);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 0 25px rgba(0,243,255,0.8)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 0 15px rgba(0,243,255,0.5)';
        });

        button.addEventListener('click', async () => {
            if (typeof GameHistoryManager !== 'undefined') {
                await GameHistoryManager.open();
            }
        });

        document.body.appendChild(button);
        console.log('[GameHistoryButtonIntegration] Botón flotante agregado');
    }
};

// Auto-inicializar
GameHistoryButtonIntegration.initialize();
