const InventoryManager = {
    currentFilter: 'all',

    init: function() {
        document.getElementById('openInventoryBtn').addEventListener('click', () => this.open());
        document.getElementById('closeInventoryBtn').addEventListener('click', () => this.close());
    },

    open: function() {
        this.render();
        // Opcional: ocultar el panel del engranaje para ganar visibilidad
        if (domElements.floatingMenuPanel) {
            domElements.floatingMenuPanel.style.display = 'none';
        }
        const modal = document.getElementById('inventoryModal');
        modal.style.display = 'flex';
    },

    close: function() {
        document.getElementById('inventoryModal').style.display = 'none';
    },

    filter: function(type) {
        this.currentFilter = type;
        this.render();
    },

    render: function() {
        const grid = document.getElementById('inventoryGrid');
        grid.innerHTML = '';
        const player = PlayerDataManager.currentPlayer;
        if (!player) return;

        let itemsToShow = [];

        // 1. Recolectar Recursos
        if (this.currentFilter === 'all' || this.currentFilter === 'resources') {
            const resources = [
                { id: 'gold', name: 'Oro', icon: '💰', val: player.currencies.gold, desc: 'Dinero contante para tropas y edificios.' },
                { id: 'sellos', name: 'Sellos de Guerra', icon: '💎', val: player.currencies.sellos_guerra, desc: 'Poder sagrado para el Altar de Deseos.' },
                { id: 'comida', name: 'Suministros', icon: '🌾', val: (gameState.playerResources?.[1]?.comida || 0), desc: 'Vital para evitar la atrición en el frente.' }
            ];
            itemsToShow.push(...resources);
        }

        // 2. Recolectar Consumibles
        if (this.currentFilter === 'all' || this.currentFilter === 'consumables') {
            if (player.inventory.xp_books > 0) {
                itemsToShow.push({ 
                    id: 'xp_book', name: 'Libro de Experiencia', icon: '📖', 
                    val: player.inventory.xp_books, desc: 'Otorga 500 XP a un héroe en el Cuartel.' 
                });
            }
        }

        // 3. Recolectar Equipo y Fragmentos
        if (this.currentFilter === 'all' || this.currentFilter === 'equipment') {
            // Fragmentos de equipo
            for (const [id, qty] of Object.entries(player.inventory.equipment_fragments)) {
                const def = EQUIPMENT_DEFINITIONS[id];
                if (def) itemsToShow.push({ 
                    id: id, name: `Frags: ${def.name}`, icon: def.icon, val: qty, 
                    desc: `Fragmentos para forjar este equipo. Necesitas ${def.fragments_needed} para terminarlo.` 
                });
            }
            // Piezas terminadas
            player.inventory.equipment.forEach(inst => {
                const def = EQUIPMENT_DEFINITIONS[inst.item_id];
                if (def) itemsToShow.push({ id: inst.instance_id, name: def.name, icon: def.icon, val: 1, desc: `Objeto [${def.rarity}] listo para equipar.` });
            });
        }

        // 4. NUEVA: Fragmentos de Héroe
        if (this.currentFilter === 'all' || this.currentFilter === 'fragments') {
            player.heroes.forEach(hero => {
                // Obtenemos los fragmentos (pueden ser de un héroe que aún no tiene estrellas)
                if (hero.fragments > 0) {
                    const def = COMMANDERS[hero.id];
                    itemsToShow.push({
                        name: `${def.name}`,
                        icon: '🎖️', 
                        val: hero.fragments,
                        desc: `Fragmentos de general. Úsalos en el Cuartel para evolucionar a ${def.name}.`,
                        color: '#00bcff'
                    });
                }
            });
        }

        // 5. Equipo (Ajuste para ver fragmentos de equipo también)
        if (this.currentFilter === 'all' || this.currentFilter === 'equipment') {
            for (const [id, qty] of Object.entries(player.inventory.equipment_fragments || {})) {
                const def = EQUIPMENT_DEFINITIONS[id];
                itemsToShow.push({ name: def.name, icon: def.icon, val: qty, desc: `Fragmentos de: ${def.name}`, color: '#ff9900' });
            }
        }

        // Modificamos el dibujo de la tarjeta para usar colores de categoría
        itemsToShow.forEach(item => {
            const div = document.createElement('div');
            div.className = 'hero-card';
            if(item.color) div.style.borderLeft = `3px solid ${item.color}`;
            
            // Solo 3 niveles de información para máxima altura
            div.innerHTML = `
                <div>${item.icon}</div>
                <small>${item.name}</small>
                <div style="font-weight:bold; color: #f1c40f;">x${item.val}</div>
            `;
            div.onclick = () => this.showDetail(item);
            grid.appendChild(div);
        });

            
    },

    showDetail: function(item) {
        document.getElementById('itemDetailPlaceholder').style.display = 'none';
        const content = document.getElementById('itemDetailContent');
        content.style.display = 'block';

        document.getElementById('itemDetailIcon').textContent = item.icon;
        document.getElementById('itemDetailName').textContent = item.name;
        document.getElementById('itemDetailDescription').textContent = item.description;
        document.getElementById('itemDetailQuantity').textContent = `Cantidad: ${item.val}`;
    }
};