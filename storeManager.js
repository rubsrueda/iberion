// storeManager.js

// CLAVE PÚBLICA DE STRIPE (Asegúrate de que sea la tuya, pk_test...)
const STRIPE_PUBLIC_KEY = 'pk_test_51SrUqM2KsNopK2NTFPJRU7gZGxTGLJ2wh5ZTjaRvMSCI0hJeWOG6LZfYFkULNL1VLH1Ec84ryL6cIyz8M4eH92f400sdlL2JIo'; 
let stripe = null;
const SINGLE_CIV_GEM_COST = 300;

const STORE_ITEMS = [

    { 
        id: 'battle_pass_s1', 
        name: 'Pase de Batalla (T1)', 
        cost: 4.99, 
        currency: 'USD', 
        icon: '🎫', 
        type: 'battle_pass', 
        premium: true 
    },
    {
        id: 'premium_civ_pack_1',
        name: 'Pack Imperios Premium',
        cost: 3.99,
        currency: 'USD',
        icon: '👑',
        type: 'faction_pack',
        premium: true,
        description: 'Desbloquea todas las civilizaciones premium',
        amountLabel: 'Desbloqueo premium completo'
    },
    {
        id: 'premium_civ_pack_gems',
        name: 'Pack Imperios Premium (Gemas)',
        costGems: 3000,
        icon: '👑',
        type: 'faction_pack',
        premium: true,
        description: 'Desbloquea todas las civilizaciones premium sin pago USD',
        amountLabel: 'Desbloqueo premium completo'
    },
    
    // --- SECCIÓN 1: DINERO REAL (Gemas) ---
    { id: 'gems_pouch', name: 'Bolsa de Gemas', cost: 0.99, currency: 'USD', amount: 100, icon: '💎', type: 'gems' },
    { id: 'gems_chest', name: 'Cofre de Gemas', cost: 4.99, currency: 'USD', amount: 550, icon: '💎💎', type: 'gems' },
    { id: 'gems_vault', name: 'Bóveda Real', cost: 0.99, currency: 'USD', amount: 2000, icon: '💰', type: 'gems', premium: true },
    
    // --- SECCIÓN 2: GASTO DE GEMAS (Premium) ---
    { id: 'war_seals_1', name: 'Sello de Guerra', costGems: 50, amount: 1, icon: '🎟️', type: 'item' },
    { id: 'war_seals_10', name: '10 Sellos', costGems: 450, amount: 10, icon: '🎟️🎟️', type: 'item' },
    { id: 'xp_book_pack', name: 'Pack Sabiduría', costGems: 100, amount: 5, icon: '📖', type: 'item_xp' },

    // --- SECCIÓN 3: MERCADO DEL PUEBLO (Gasto de Oro de Perfil) ---
    { id: 'war_seal_gold', name: 'Sello (Mercado)', costGold: 1000, amount: 1, icon: '🎟️', type: 'item' },
    { id: 'war_seals_10', name: '10 Sellos', costGold: 9000, amount: 10, icon: '🎟️🎟️', type: 'item' },
    { id: 'xp_book_gold', name: 'Libro (Mercado)', costGold: 500, amount: 1, icon: '📘', type: 'item_xp' },
    { id: 'xp_book_pack', name: 'Pack Sabiduría', costGold: 2000, amount: 5, icon: '📖', type: 'item_xp' },
];

const StoreManager = {
    init: function() {
        if (typeof Stripe !== 'undefined') {
            stripe = Stripe(STRIPE_PUBLIC_KEY);
        }
    },

    open: function() {
        this.renderStore();
        document.getElementById('storeModal').style.display = 'flex';
        this.updateHeader();
    },

    close: function() {
        document.getElementById('storeModal').style.display = 'none';
    },

    updateHeader: function() {
        const p = PlayerDataManager.currentPlayer;
        if(p) {
            document.getElementById('storeGemCount').textContent = p.currencies.gems || 0;
            document.getElementById('storeGoldCount').textContent = p.currencies.gold || 0;
        }
    },

    isOwned: function(item) {
        if (!item) return false;
        if (item.type === 'faction_pack') {
            if (typeof PlayerDataManager === 'undefined') return false;
            const premiumCivs = PlayerDataManager.getPremiumCivilizationPack();
            if (!premiumCivs.length) return false;
            return premiumCivs.every(civKey => PlayerDataManager.isCivilizationUnlocked(civKey));
        }
        if (item.type === 'single_civilization') {
            return typeof PlayerDataManager !== 'undefined' && PlayerDataManager.isCivilizationUnlocked(item.civKey);
        }
        return false;
    },

    getStoreItems: function() {
        return [...STORE_ITEMS, ...this.createSingleCivilizationOffers()];
    },

    createSingleCivilizationOffers: function() {
        if (typeof CIVILIZATIONS === 'undefined') return [];
        const special = new Set(['ninguna', 'Bárbaros']);
        const free = new Set(
            typeof PlayerDataManager !== 'undefined' && PlayerDataManager.getFreeCivilizations
                ? PlayerDataManager.getFreeCivilizations()
                : ['Britania', 'Arábiga']
        );

        return Object.keys(CIVILIZATIONS)
            .filter(civKey => !special.has(civKey) && !free.has(civKey))
            .map(civKey => {
                const civName = CIVILIZATIONS[civKey]?.name || civKey;
                return {
                    id: `single_civ_${civKey}`,
                    name: `Desbloquear ${civName}`,
                    costGems: SINGLE_CIV_GEM_COST,
                    icon: '🏛️',
                    type: 'single_civilization',
                    premium: true,
                    civKey,
                    description: `Compra individual de ${civName}`,
                    amountLabel: 'Desbloqueo individual'
                };
            });
    },

    refreshFactionSelectors: function() {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('[id^="player"][id$="Civ"]').forEach(selectEl => {
            const match = selectEl.id.match(/^player(\d+)Civ$/);
            const playerIndex = match ? Number(match[1]) : null;
            if (!playerIndex) return;
            if (typeof refreshFactionSelectOptions === 'function') refreshFactionSelectOptions(playerIndex);
            if (typeof updateFactionDisplay === 'function') updateFactionDisplay(playerIndex);
        });
    },

    renderStore: function() {
        const container = document.getElementById('storeGrid');
        container.innerHTML = '';

        // Tarjeta de Anuncio
        const adCard = document.createElement('div');
        adCard.className = 'store-card special';
        adCard.innerHTML = `
            <div class="card-icon">🎬</div>
            <h4>Gemas Gratis</h4>
            <p>Ve un anuncio corto</p>
            <button class="btn-buy free" onclick="StoreManager.watchAdForGems()">VER (+10 💎)</button>
        `;
        container.appendChild(adCard);

        this.getStoreItems().forEach(item => {
            const card = document.createElement('div');
            card.className = `store-card ${item.premium ? 'premium' : ''}`;
            
            let btnHtml = '';
            const alreadyOwned = this.isOwned(item);
            
            if (alreadyOwned) {
                btnHtml = `<button class="btn-buy owned" disabled>ADQUIRIDO</button>`;
            } else if (item.currency) {
                btnHtml = `<button class="btn-buy real" onclick="StoreManager.buyWithRealMoney('${item.id}', this)">${item.cost} ${item.currency}</button>`;
            } else if (item.costGems) {
                btnHtml = `<button class="btn-buy gems" onclick="StoreManager.buyWithGems('${item.id}')">${item.costGems} 💎</button>`;
            } else if (item.costGold) {
                btnHtml = `<button class="btn-buy gold" onclick="StoreManager.buyWithGold('${item.id}')">${item.costGold} 💰</button>`;
            }

            const subtitle = item.description || item.amountLabel || (typeof item.amount !== 'undefined' ? `x${item.amount}` : 'Compra única');
            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <h4>${item.name}</h4>
                <p>${subtitle}</p>
                ${btnHtml}
            `;
            container.appendChild(card);
        });
    },

    // --- COMPRA CON ORO (NUEVA FUNCIÓN) ---
    buyWithGold: function(itemId) {
        const item = this.getStoreItems().find(i => i.id === itemId);
        const player = PlayerDataManager.currentPlayer;

        if (player.currencies.gold >= item.costGold) {
            // Cobrar
            player.currencies.gold -= item.costGold;
            this.deliverItem(item);
            this.saveAndNotify(item, 'gold');
            // CORRECCIÓN: Actualizar UI global
            if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
                UIManager.updateAllUIDisplays();
            }
        } else {
            showToast("No tienes suficiente Oro de Perfil.", "error");
        }
    },

    // --- COMPRA CON GEMAS ---
    buyWithGems: async function(itemId) {
        const item = this.getStoreItems().find(i => i.id === itemId);
        const player = PlayerDataManager.currentPlayer;

        if (player.currencies.gems >= item.costGems) {
            player.currencies.gems -= item.costGems;
            if (item.type === 'faction_pack') {
                await PlayerDataManager.unlockCivilizationPack(PlayerDataManager.getPremiumCivilizationPack());
            } else if (item.type === 'single_civilization') {
                await PlayerDataManager.unlockCivilization(item.civKey);
            } else {
                this.deliverItem(item);
            }
            this.saveAndNotify(item, 'gems');
            // CORRECCIÓN: Actualizar UI global
            if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
                UIManager.updateAllUIDisplays();
            }
            if ((item.type === 'faction_pack' || item.type === 'single_civilization') && typeof document !== 'undefined') {
                this.renderStore();
                this.refreshFactionSelectors();
            }
        } else {
            showToast("No tienes suficientes Gemas.", "error");
        }
    },

    // --- DINERO REAL (Simulación) ---
    buyWithRealMoney: async function(itemId, btnEl) {
        const item = this.getStoreItems().find(i => i.id === itemId);
        if (!item) {
            console.error("Item no encontrado: " + itemId);
            return;
        }

        const btn = btnEl || (typeof event !== 'undefined' ? event.target : null);
        const originalText = btn ? btn.textContent : '';
        if (btn) {
            btn.textContent = "Procesando...";
            btn.disabled = true;
        }

        setTimeout(async () => {
            if (confirm(`[STRIPE SIMULADO] Pagar $${item.cost} por ${item.name}?`)) {
                
                // CASO ESPECIAL: PASE DE BATALLA
                if (item.type === 'battle_pass') {
                    if (typeof BattlePassManager !== 'undefined') {
                        await BattlePassManager.activatePremium();
                        alert("¡Pase de Batalla Activado! Disfruta tus recompensas.");
                    } else {
                        console.error("BattlePassManager no está disponible.");
                    }
                } else if (item.type === 'faction_pack') {
                    await PlayerDataManager.unlockCivilizationPack(PlayerDataManager.getPremiumCivilizationPack());
                    if (typeof showToast === 'function') {
                        showToast('Pack de Imperios Premium desbloqueado.', 'success');
                    }
                } 
                // CASO NORMAL: GEMAS
                else {
                    PlayerDataManager.currentPlayer.currencies.gems += item.amount;
                    if (!PlayerDataManager.currentPlayer.is_premium) {
                        PlayerDataManager.currentPlayer.is_premium = true;
                        if(typeof AdManager !== 'undefined') AdManager.isPremium = true;
                        alert("¡Gracias! Eres PREMIUM (No Ads).");
                    }
                    await PlayerDataManager.saveCurrentPlayer();
                    if(typeof showToast === 'function') showToast(`¡Compra exitosa! +${item.amount} Gemas`, "success");
                }

                this.updateHeader();
                this.renderStore();
                if (item.type === 'faction_pack' && typeof document !== 'undefined') {
                    this.refreshFactionSelectors();
                }
                if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
                    UIManager.updateAllUIDisplays();
                }
            } else {
                if(typeof showToast === 'function') showToast("Compra cancelada.", "info");
            }
            
            if (btn) {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }, 1000);
    },

    // --- Helpers de Entrega ---
    deliverItem: function(item) {
        const player = PlayerDataManager.currentPlayer;
        if (item.type === 'item') {
            // Asumimos que son sellos por ahora, o añadir lógica si hay más items
            PlayerDataManager.addWarSeals(item.amount);
        } else if (item.type === 'item_xp') {
            player.inventory.xp_books = (player.inventory.xp_books || 0) + item.amount;
        }
    },

    saveAndNotify: function(item, currencyType) {
        PlayerDataManager.saveCurrentPlayer();
        this.updateHeader();
        if(typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
        showToast(`¡Comprado! ${item.name}`, "success");
    },

    watchAdForGems: function() {
        AdManager.showRewardedAd(() => {
            PlayerDataManager.currentPlayer.currencies.gems += 10;
            PlayerDataManager.saveCurrentPlayer();
            this.updateHeader();
            showToast("¡Recompensa! +10 Gemas", "success");
        });
    }
};