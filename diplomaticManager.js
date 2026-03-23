/**
 * diplomaticManager.js
 * Manage diplomatic relations UI and trade blocking
 */

const DiplomaticManager = {

    _playerPalette: ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#4ade80'],

    _extractPlayerId(rawKey) {
        if (Number.isInteger(rawKey)) return rawKey;
        if (typeof rawKey === 'number' && Number.isFinite(rawKey)) return Math.trunc(rawKey);
        if (typeof rawKey !== 'string') return null;

        const numeric = Number(rawKey);
        if (Number.isFinite(numeric)) return Math.trunc(numeric);

        const match = rawKey.match(/(\d+)/);
        if (!match) return null;
        const parsed = Number(match[1]);
        return Number.isFinite(parsed) ? parsed : null;
    },

    _getPlayerColor(playerId) {
        return this._playerPalette[(Math.max(1, playerId) - 1) % this._playerPalette.length];
    },

    _collectActiveRivalIds() {
        const idSet = new Set();
        const selfId = Number(gameState.currentPlayer);
        const eliminated = new Set((gameState.eliminatedPlayers || []).map(v => Number(v)).filter(Number.isFinite));
        const barbarianId = (typeof BARBARIAN_PLAYER_ID !== 'undefined') ? BARBARIAN_PLAYER_ID : 9;

        const pushIfValid = (candidate) => {
            const id = this._extractPlayerId(candidate);
            if (!Number.isFinite(id)) return;
            if (id === selfId) return;
            if (id === BankManager.PLAYER_ID || id === barbarianId) return;
            if (eliminated.has(id)) return;
            idSet.add(id);
        };

        if (gameState.playerTypes && typeof gameState.playerTypes === 'object') {
            Object.keys(gameState.playerTypes).forEach(pushIfValid);
        }

        if (idSet.size === 0 && gameState.playerCivilizations && typeof gameState.playerCivilizations === 'object') {
            Object.keys(gameState.playerCivilizations).forEach(pushIfValid);
        }

        if (idSet.size === 0 && gameState.playerResources && typeof gameState.playerResources === 'object') {
            Object.keys(gameState.playerResources).forEach(pushIfValid);
        }

        return Array.from(idSet).sort((a, b) => a - b);
    },
    
    /**
     * Open diplomacy modal and populate with current players
     */
    openModal() {
        if (!gameState || gameState.currentPlayer === undefined) {
            console.warn('DiplomaticManager: gameState not ready');
            return;
        }

        const modal = document.getElementById('diplomacyModal');
        if (!modal) return;

        // Clear previous list
        const playerList = document.getElementById('diplomacyPlayersList');
        playerList.innerHTML = '';

        // Get all active players except current player
        const activePlayerIds = this._collectActiveRivalIds();

        if (activePlayerIds.length === 0) {
            playerList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No hay otros jugadores activos.</p>';
        } else {
            activePlayerIds.forEach(playerId => {
                const civKey = gameState.playerCivilizations?.[playerId];
                const civData = CIVILIZATIONS[civKey] || null;
                const civilizationName = civData?.name || `Jugador ${playerId}`;
                const nationality = civData?.name || 'Nacionalidad desconocida';
                const playerColor = this._getPlayerColor(playerId);
                
                // Check if trade is blocked
                const isBlocked = isTradeBlockedBetweenPlayers(gameState.currentPlayer, playerId);
                
                const playerRow = document.createElement('div');
                playerRow.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px;
                    background: rgba(0, 243, 255, 0.05);
                    border: 1px solid rgba(0, 243, 255, 0.2);
                    border-radius: 4px;
                    gap: 10px;
                `;

                const playerInfo = document.createElement('div');
                playerInfo.style.cssText = 'flex: 1; min-width: 0;';
                playerInfo.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px; color: #00f3ff; font-weight: bold; font-size: 14px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:${playerColor}; box-shadow:0 0 6px ${playerColor}; display:inline-block;"></span>
                        👑 ${civilizationName}
                    </div>
                    <div style="color: #888; font-size: 11px;">
                        Jugador #${playerId} • ${nationality}
                    </div>
                `;

                const toggleBtn = document.createElement('button');
                toggleBtn.style.cssText = `
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: bold;
                    border: 1px solid ${isBlocked ? '#dc2626' : '#00f3ff'};
                    background: ${isBlocked ? 'rgba(220, 38, 38, 0.2)' : 'rgba(0, 243, 255, 0.1)'};
                    color: ${isBlocked ? '#fca5a5' : '#00f3ff'};
                    border-radius: 4px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.3s ease;
                `;
                toggleBtn.textContent = isBlocked ? '🚫 BLOQUEADO' : '✅ PERMITIDO';

                toggleBtn.addEventListener('mouseover', () => {
                    toggleBtn.style.background = isBlocked 
                        ? 'rgba(220, 38, 38, 0.4)' 
                        : 'rgba(0, 243, 255, 0.2)';
                });
                toggleBtn.addEventListener('mouseout', () => {
                    toggleBtn.style.background = isBlocked 
                        ? 'rgba(220, 38, 38, 0.2)' 
                        : 'rgba(0, 243, 255, 0.1)';
                });

                toggleBtn.addEventListener('click', () => {
                    RequestToggleTradeBlock(playerId);
                    // Refresh modal after action
                    setTimeout(() => DiplomaticManager.openModal(), 200);
                });

                playerRow.appendChild(playerInfo);
                playerRow.appendChild(toggleBtn);
                playerList.appendChild(playerRow);
            });
        }

        // Show modal
        modal.style.display = 'flex';
    },

    /**
     * Close diplomacy modal
     */
    closeModal() {
        const modal = document.getElementById('diplomacyModal');
        if (modal) modal.style.display = 'none';
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const closBtn = document.getElementById('closeDiplomacyBtn');
    if (closBtn) {
        closBtn.addEventListener('click', () => DiplomaticManager.closeModal());
    }

    const modal = document.getElementById('diplomacyModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) DiplomaticManager.closeModal();
        });
    }
});
