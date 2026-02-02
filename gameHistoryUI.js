/**
 * gameHistoryUI.js
 * Interfaz visual del Historial de Partidas
 */

const GameHistoryUI = {
    modalElement: null,
    isVisible: false,

    /**
     * Inicializa la UI
     */
    initialize: function() {
        console.log('[GameHistoryUI] Inicializando...');
        
        this.modalElement = document.getElementById('gameHistoryModal');
        
        if (!this.modalElement) {
            console.warn('[GameHistoryUI] Modal no encontrado');
            return;
        }

        this._setupEventListeners();
    },

    /**
     * Configura listeners
     */
    _setupEventListeners: function() {
        const closeBtn = this.modalElement.querySelector('.history-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
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
            this.initialize();
            if (!this.modalElement) {
                console.warn('[GameHistoryUI] Modal no disponible al mostrar');
                return;
            }
        }
        this.modalElement.style.display = 'flex';
        this.modalElement.style.zIndex = '10100';
        this.isVisible = true;
    },

    /**
     * Oculta el modal
     */
    hideModal: function() {
        if (!this.modalElement) return;
        this.modalElement.style.display = 'none';
        this.isVisible = false;
    },

    /**
     * Muestra lista de partidas
     */
    displayGamesList: function(games) {
        if (!this.modalElement) {
            this.initialize();
            if (!this.modalElement) {
                console.warn('[GameHistoryUI] Modal no disponible al renderizar lista');
                return;
            }
        }
        const content = this.modalElement.querySelector('.history-content');
        if (!content) return;

        if (games.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #aaa;">
                    <p style="font-size: 3em; margin-bottom: 20px;">📭</p>
                    <p>No hay partidas guardadas aún.</p>
                    <p style="font-size: 0.9em; color: #777;">Completa una partida para verla aquí.</p>
                </div>
            `;
            return;
        }

        const rows = games.map((game, idx) => `
            <tr>
                <td class="date">${game.date || '?'}</td>
                <td class="turns">T${game.totalTurns || '?'}</td>
                <td class="duration">${game.duration}</td>
                <td class="actions">
                    <button class="history-btn view-btn" data-index="${idx}" title="Ver crónica">
                        👁️ Ver
                    </button>
                    <button class="history-btn share-btn" data-index="${idx}" title="Compartir replay">
                        🔗 Compartir
                    </button>
                    <button class="history-btn delete-btn" data-index="${idx}" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');

        const html = `
            <div class="history-table-container">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Turnos</th>
                            <th>Duración</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;

        // Agregar listeners a botones
        this.modalElement.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.target.dataset.index);
                await GameHistoryManager.openGameLegacy(idx);
            });
        });

        this.modalElement.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.target.dataset.index);
                const url = await GameHistoryManager.shareReplay(idx);
                if (url) {
                    alert(`Enlace copiado: ${url}`);
                    navigator.clipboard.writeText(url).catch(() => {});
                }
            });
        });

        this.modalElement.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.target.dataset.index);
                const success = await GameHistoryManager.deleteGame(idx);
                if (success) {
                    await GameHistoryManager.loadHistory();
                    this.displayGamesList(GameHistoryManager.games);
                }
            });
        });
    },

    /**
     * Muestra detalles de una partida
     */
    showGameDetails: function(game) {
        const content = this.modalElement.querySelector('.history-content');
        if (!content) return;

        const html = `
            <div class="game-details">
                <h3>📖 Crónica de la Partida</h3>
                <div class="game-info-grid">
                    <div class="info-card">
                        <span class="label">Fecha</span>
                        <span class="value">${game.date}</span>
                    </div>
                    <div class="info-card">
                        <span class="label">Turnos</span>
                        <span class="value">${game.totalTurns}</span>
                    </div>
                    <div class="info-card">
                        <span class="label">Duración</span>
                        <span class="value">${game.duration}</span>
                    </div>
                    <div class="info-card">
                        <span class="label">Ganador</span>
                        <span class="value">Jugador ${game.winner}</span>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <button style="
                        padding: 10px 20px;
                        background: #00f3ff;
                        color: #000;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                    " onclick="GameHistoryManager.loadHistory().then(() => {
                        GameHistoryUI.displayGamesList(GameHistoryManager.games);
                    })">
                        ← Volver al Listado
                    </button>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.GameHistoryUI = GameHistoryUI;
}
