// mailboxManager.js
// Base de datos de ejemplo. En un juego real, esto vendría de un servidor.
const INBOX_DATA = {
    missions: [
        {
            id: 'm001',
            title: '¡Primeros Pasos!',
            description: '¡Felicidades por completar el tutorial, General! Reclama esta recompensa para empezar tu aventura.',
            headerImage: 'images/world_map_risk_style.png', // Usa una de tus imágenes existentes
            timestamp: new Date().toISOString(),
            read: false,
            claimed: false,
            rewards: [
                { type: 'sellos_guerra', amount: 5 },
                { type: 'xp_books', amount: 10 }
            ]
        },
        {
            id: 'm002',
            title: 'Conquista tu primer territorio',
            description: 'La expansión es la clave de la victoria. ¡Buen trabajo al asegurar nuevas tierras!',
            headerImage: 'images/IIBERION.png', // Otra imagen
            timestamp: new Date().toISOString(),
            read: false,
            claimed: true, // Ejemplo de una ya reclamada
            rewards: [
                { type: 'oro', amount: 1000 }
            ]
        }
    ],
    banners: [
        {
            id: 'b001',
            title: '¡Estandarte de El Cid!',
            description: '¡Una oportunidad única! Durante este evento, las probabilidades de obtener fragmentos del legendario Rodrigo Díaz de Vivar en el Altar de los Deseos están aumentadas. ¡No dejes pasar la oportunidad!',
            headerImage: 'images/world_map_risk_style.png',
            timestamp: new Date().toISOString(),
            read: false,
            claimed: false, // Los banners no se "reclaman", sino que te llevan al gacha
            rewards: [],
            action: { type: 'GOTO_GACHA', bannerId: 'evento_cid' } // Acción especial
        }
    ],
    messages: [
        {
            id: 'msg001',
            title: 'Bienvenido, General',
            description: 'El Consejo te da la bienvenida a estas tierras. Esperamos grandes proezas de tu parte. ¡Guía a tu pueblo hacia la gloria!',
            headerImage: '', // Sin imagen
            timestamp: new Date().toISOString(),
            read: false,
            claimed: true, // Los mensajes informativos se marcan como reclamados al leerlos
            rewards: []
        }
    ]
};

const MailboxManager = {
    
    activeTab: 'missions',

    init: function() {
        // Mantiene tus listeners originales
        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.inbox-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.activeTab = e.target.dataset.tab;
                this.renderList();
            });
        });

        // Botón cerrar
        const closeBtn = document.getElementById('closeInboxBtn');
        if(closeBtn) closeBtn.onclick = () => this.close();
    },

    open: function() {
        const modal = document.getElementById('inboxModal');
        if(modal) {
            modal.style.display = 'flex';
            this.renderList();
        }
    },

    close: function() {
        document.getElementById('inboxModal').style.display = 'none';
    },

    /**
     * Rellena la lista (32% ancho) con micro-tipografía y barra neón
     */
    renderList: function() {
        const listContainer = document.getElementById('inboxListContainer');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        const data = INBOX_DATA[this.activeTab];

        data.forEach(item => {
            const itemEl = document.createElement('div');
            // Aplicamos clase 'read' si ya se leyó
            itemEl.className = `inbox-list-item ${item.read ? 'read' : ''}`;
            
            itemEl.innerHTML = `
                <div class="inbox-status-bar"></div>
                <div style="overflow:hidden; margin-left: 8px;">
                    <strong style="display:block; font-size:9px; color:#fff; white-space:nowrap; text-overflow:ellipsis;">${item.title.toUpperCase()}</strong>
                    <span style="font-size:8px; color:#4b6b7a;">REPORTE RECIBIDO</span>
                </div>
            `;
            
            itemEl.addEventListener('click', () => {
                // Marcar como leído lógicamente y visualmente
                item.read = true; 
                this.renderDetail(item.id);
                document.querySelectorAll('.inbox-list-item').forEach(el => el.classList.remove('selected'));
                itemEl.classList.add('selected', 'read');
            });
            listContainer.appendChild(itemEl);
        });
    },

    /**
     * Rellena el detalle (68% ancho) con el sistema de burbujas y premios neón
     */
    renderDetail: function(itemId) {
        const detailContainer = document.getElementById('inboxDetailContent');
        const placeholder = document.getElementById('inboxDetailPlaceholder');
        const rewardSection = document.getElementById('inboxRewardSection');
        const claimBtn = document.getElementById('inboxClaimBtn');

        const item = INBOX_DATA[this.activeTab].find(i => i.id === itemId);
        if (!item) return;
        
        placeholder.style.display = 'none';
        detailContainer.style.display = 'flex';

        // Imagen de cabecera opcional
        const headerImg = document.getElementById('inboxDetailHeaderImage');
        if (item.headerImage) {
            headerImg.style.display = 'block';
            headerImg.style.backgroundImage = `url(${item.headerImage})`;
        } else {
            headerImg.style.display = 'none';
        }

        // Título y cuerpo neón
        document.getElementById('inboxDetailTitle').textContent = item.title.toUpperCase();
        document.getElementById('inboxDetailBody').textContent = item.description;
        
        // Rellenar recompensas con el nuevo diseño de slots
        rewardSection.innerHTML = '';
        if (item.rewards && item.rewards.length > 0) {
            const rewardLabel = document.createElement('div');
            rewardLabel.style.fontSize = "8px";
            rewardLabel.style.color = "#4b6b7a";
            rewardLabel.style.marginBottom = "5px";
            rewardLabel.textContent = "OBJETOS DISPONIBLES";
            rewardSection.appendChild(rewardLabel);

            item.rewards.forEach(r => {
                const icon = r.type === 'oro' ? '💰' : (r.type === 'sellos_guerra' ? '💎' : '📖');
                rewardSection.innerHTML += `
                    <div class="reward-slot">
                        <span style="font-size:14px;">${icon}</span>
                        <div style="font-size:8px; color:#f1c40f; font-weight:bold;">x${r.amount}</div>
                    </div>`;
            });
        }
        
        // Configurar el botón de acción según tu lógica original de GOTO_GACHA o Recursos
        if (item.action?.type === 'GOTO_GACHA') {
            claimBtn.textContent = "ACCEDER AL ALTAR";
            claimBtn.disabled = false;
            claimBtn.onclick = () => { this.close(); openDeseosModal(); };
        } else if (item.rewards.length > 0) {
            claimBtn.textContent = item.claimed ? "CONTENIDO RECLAMADO" : "RECLAMAR RECOMPENSA";
            claimBtn.disabled = item.claimed;
            claimBtn.onclick = () => this.claimReward(item.id);
        } else {
            claimBtn.textContent = "CERRAR INFORME";
            claimBtn.disabled = false;
            claimBtn.onclick = () => this.close();
        }
    },

    /**
     * Lógica para reclamar las recompensas de un item.
     * @param {string} itemId - El ID del item cuyas recompensas se reclaman.
     */
    claimReward: function(itemId) {
        const item = INBOX_DATA[this.activeTab].find(i => i.id === itemId);
        if (!item || item.claimed) return;

        item.claimed = true;

        // Ejecuta el intercambio de recursos real de tu lógica original
        item.rewards.forEach(reward => {
            switch(reward.type) {
                case 'sellos_guerra':
                    PlayerDataManager.addWarSeals(reward.amount);
                    break;
                case 'oro':
                    PlayerDataManager.currentPlayer.currencies.gold += reward.amount;
                    break;
                case 'xp_books':
                    PlayerDataManager.currentPlayer.inventory.xp_books += reward.amount;
                    break;
            }
        });
        
        PlayerDataManager.saveCurrentPlayer();
        logMessage("Logística: Suministros integrados al tesoro.");
        this.renderDetail(item.id); // Refresca para mostrar botón deshabilitado
    }
};