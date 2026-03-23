/**
 * diplomaticManager.js
 * Manage diplomatic relations UI and trade blocking
 */

const DiplomaticManager = {
    
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
        const activePlayerIds = gameState.playerTypes 
            ? Object.keys(gameState.playerTypes).map(Number).filter(id => {
                // Exclude: self, eliminated players, bank
                return id !== gameState.currentPlayer && 
                       !gameState.eliminatedPlayers?.includes(id) &&
                       id !== BankManager.PLAYER_ID &&
                       id !== 9; // barbarians
            })
            : [];

        if (activePlayerIds.length === 0) {
            playerList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No hay otros jugadores activos.</p>';
        } else {
            activePlayerIds.forEach(playerId => {
                const playerCiv = gameState.playerCivilizations?.[playerId];
                const civilizationName = playerCiv?.name || `Jugador ${playerId}`;
                
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
                    <div style="color: #00f3ff; font-weight: bold; font-size: 14px;">
                        👑 ${civilizationName}
                    </div>
                    <div style="color: #888; font-size: 11px;">
                        Jugador #${playerId}
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
