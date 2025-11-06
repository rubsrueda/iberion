// mailboxManager.js
console.log("mailboxManager.js CARGADO - Sistema de Buzón del General listo.");

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
    
    activeTab: 'missions', // La pestaña por defecto

    init: function() {
        // Listeners para las pestañas
        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.inbox-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.activeTab = e.target.dataset.tab;
                this.renderList();
            });
        });

        // Listener para el botón de cerrar
        document.getElementById('closeInboxBtn').addEventListener('click', this.close);
    },

    open: function() {
        // Ya no usamos showScreen. Simplemente hacemos visible el modal del buzón.
        document.getElementById('inboxModal').style.display = 'flex'; 
        
        // Y luego, como siempre, renderizamos su contenido interno.
        this.renderList();
    },

    close: function() {
        document.getElementById('inboxModal').style.display = 'none';
    },

    /**
     * Rellena la lista de la izquierda según la pestaña activa.
     */
    renderList: function() {
        const listContainer = document.getElementById('inboxListContainer');
        const detailContainer = document.getElementById('inboxDetailContent');
        const placeholder = document.getElementById('inboxDetailPlaceholder');

        listContainer.innerHTML = '';
        detailContainer.style.display = 'none';
        placeholder.style.display = 'block';
        
        const data = INBOX_DATA[this.activeTab];

        data.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inbox-list-item'; // Estilos en CSS
            itemEl.style.cssText = `
                padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;
                background-color: ${item.read ? '#fff' : '#f0f8ff'};
            `;
            itemEl.innerHTML = `
                <strong style="display: block; font-size: 1.1em;">${item.title}</strong>
                <span>${item.description.substring(0, 40)}...</span>
                <small style="display: block; color: #888; margin-top: 5px;">Hace poco</small>
            `;
            itemEl.addEventListener('click', () => {
                item.read = true; // Marcar como leído
                this.renderDetail(item.id);
                itemEl.style.backgroundColor = '#fff';
            });
            listContainer.appendChild(itemEl);
        });
    },

    /**
     * Rellena el panel de detalles de la derecha.
     * @param {string} itemId - El ID del item a mostrar.
     */
    renderDetail: function(itemId) {
        const detailContainer = document.getElementById('inboxDetailContent');
        const placeholder = document.getElementById('inboxDetailPlaceholder');
        const rewardSection = document.getElementById('inboxRewardSection');
        const claimBtn = document.getElementById('inboxClaimBtn');

        const item = INBOX_DATA[this.activeTab].find(i => i.id === itemId);
        if (!item) return;
        
        // Mostrar contenido, ocultar placeholder
        placeholder.style.display = 'none';
        detailContainer.style.display = 'flex';

        // Rellenar datos
        document.getElementById('inboxDetailTitle').textContent = item.title;
        document.getElementById('inboxDetailBody').textContent = item.description;
        document.getElementById('inboxDetailHeaderImage').style.backgroundImage = `url(${item.headerImage})`;
        
        // Rellenar recompensas
        rewardSection.innerHTML = '';
        if (item.rewards.length > 0) {
            item.rewards.forEach(reward => {
                // Lógica para mostrar la recompensa
                rewardSection.innerHTML += `<p><strong>${reward.amount} x </strong> ${reward.type.replace('_', ' ')}</p>`;
            });
        }
        
        // Configurar el botón de acción
        if (item.action?.type === 'GOTO_GACHA') {
            claimBtn.textContent = "IR AL ALTAR";
            claimBtn.onclick = () => {
                this.close();
                // Aquí se podría pasar el item.action.bannerId a openDeseosModal
                openDeseosModal(); 
            };
            claimBtn.disabled = false;
        } else if (item.rewards.length > 0) {
            claimBtn.textContent = item.claimed ? "RECLAMADO" : "RECLAMAR";
            claimBtn.disabled = item.claimed;
            claimBtn.onclick = () => this.claimReward(item.id);
        } else {
            claimBtn.textContent = "OK";
            claimBtn.onclick = () => {
                this.close();
            };
            claimBtn.disabled = false;
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

        item.rewards.forEach(reward => {
            console.log(`Reclamando ${reward.amount} de ${reward.type}`);
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
                // Se pueden añadir más tipos de recompensas aquí...
            }
        });
        
        PlayerDataManager.saveCurrentPlayer();
        logMessage("¡Recompensas reclamadas!", "success");
        this.renderDetail(itemId); // Re-renderizar para actualizar el botón
    }
};