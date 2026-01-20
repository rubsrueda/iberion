// storeManager.js
console.log("storeManager.js CARGADO - Tesorería Real (Multidivisa).");

// CLAVE PÚBLICA DE STRIPE (Asegúrate de que sea la tuya, pk_test...)
const STRIPE_PUBLIC_KEY = 'pk_test_51SrUqM2KsNopK2NTFPJRU7gZGxTGLJ2wh5ZTjaRvMSCI0hJeWOG6LZfYFkULNL1VLH1Ec84ryL6cIyz8M4eH92f400sdlL2JIo'; 
let stripe = null;

const STORE_ITEMS = [
    // --- SECCIÓN 1: DINERO REAL (Gemas) ---
    { id: 'gems_pouch', name: 'Bolsa de Gemas', cost: 0.99, currency: 'USD', amount: 100, icon: '💎', type: 'gems' },
    { id: 'gems_chest', name: 'Cofre de Gemas', cost: 4.99, currency: 'USD', amount: 550, icon: '💎💎', type: 'gems' },
    { id: 'gems_vault', name: 'Bóveda Real', cost: 0.99, currency: 'USD', amount: 2500, icon: '💰', type: 'gems', premium: true },
    
    // --- SECCIÓN 2: GASTO DE GEMAS (Premium) ---
    { id: 'war_seals_1', name: 'Sello de Guerra', costGems: 50, amount: 1, icon: '🎟️', type: 'item' },
    { id: 'war_seals_10', name: '10 Sellos', costGems: 450, amount: 10, icon: '🎟️🎟️', type: 'item' },
    { id: 'xp_book_pack', name: 'Pack Sabiduría', costGems: 100, amount: 5, icon: '📖', type: 'item_xp' },

    // --- SECCIÓN 3: MERCADO DEL PUEBLO (Gasto de Oro de Perfil) ---
    { id: 'war_seal_gold', name: 'Sello (Mercado)', costGold: 2500, amount: 1, icon: '🎟️', type: 'item' },
    { id: 'xp_book_gold', name: 'Libro (Mercado)', costGold: 1000, amount: 1, icon: '📘', type: 'item_xp' }
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

        STORE_ITEMS.forEach(item => {
            const card = document.createElement('div');
            card.className = `store-card ${item.premium ? 'premium' : ''}`;
            
            let btnHtml = '';
            
            // Decidir qué botón mostrar según la moneda
            if (item.currency) {
                // Dinero Real
                btnHtml = `<button class="btn-buy real" onclick="StoreManager.buyWithRealMoney('${item.id}')">${item.cost} ${item.currency}</button>`;
            } else if (item.costGems) {
                // Gemas
                btnHtml = `<button class="btn-buy gems" onclick="StoreManager.buyWithGems('${item.id}')">${item.costGems} 💎</button>`;
            } else if (item.costGold) {
                // Oro de Perfil (NUEVO)
                btnHtml = `<button class="btn-buy gold" onclick="StoreManager.buyWithGold('${item.id}')">${item.costGold} 💰</button>`;
            }

            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <h4>${item.name}</h4>
                <p>x${item.amount}</p>
                ${btnHtml}
            `;
            container.appendChild(card);
        });
    },

    // --- COMPRA CON ORO (NUEVA FUNCIÓN) ---
    buyWithGold: function(itemId) {
        const item = STORE_ITEMS.find(i => i.id === itemId);
        const player = PlayerDataManager.currentPlayer;

        if (player.currencies.gold >= item.costGold) {
            // Cobrar
            player.currencies.gold -= item.costGold;
            this.deliverItem(item);
            this.saveAndNotify(item, 'gold');
        } else {
            showToast("No tienes suficiente Oro de Perfil.", "error");
        }
    },

    // --- COMPRA CON GEMAS ---
    buyWithGems: function(itemId) {
        const item = STORE_ITEMS.find(i => i.id === itemId);
        const player = PlayerDataManager.currentPlayer;

        if (player.currencies.gems >= item.costGems) {
            player.currencies.gems -= item.costGems;
            this.deliverItem(item);
            this.saveAndNotify(item, 'gems');
        } else {
            showToast("No tienes suficientes Gemas.", "error");
        }
    },

    // --- DINERO REAL (Simulación) ---
    buyWithRealMoney: async function(itemId) {
        const item = STORE_ITEMS.find(i => i.id === itemId);
        // Simulación segura para frontend
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = "Procesando...";
        btn.disabled = true;

        setTimeout(async () => {
            if (confirm(`[STRIPE SIMULADO]\nCobrar $${item.cost} a tarjeta terminada en 4242.\n¿Confirmar pago?`)) {
                PlayerDataManager.currentPlayer.currencies.gems += item.amount;
                if (!PlayerDataManager.currentPlayer.is_premium) {
                    PlayerDataManager.currentPlayer.is_premium = true;
                    AdManager.isPremium = true;
                    alert("¡Gracias! Eres PREMIUM (No Ads).");
                }
                await PlayerDataManager.saveCurrentPlayer();
                this.updateHeader();
                showToast(`¡Compra exitosa! +${item.amount} Gemas`, "success");
            }
            btn.textContent = originalText;
            btn.disabled = false;
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