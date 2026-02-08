// allianceManager.js v4.0 (Hub & Chat Realtime)

const AllianceManager = {
    selectedEmblem: "🛡️",
    currentAlliance: null,
    chatSubscription: null,
    isChatMinimized: false,

    init: function() {
        // Inicializar el Widget de Chat si el jugador ya tiene alianza
        if (PlayerDataManager.currentPlayer?.alliance_id) {
            this.initChatWidget(PlayerDataManager.currentPlayer.alliance_id);
        }
    },

    open: async function() {
        const modal = document.getElementById('allianceModal');
        modal.style.display = 'flex';
        this.resetCreateForm();
        
        const player = PlayerDataManager.currentPlayer;
        
        // Determinar vista inicial
        if (player.alliance_id) {
            await this.loadHQ(player.alliance_id);
        } else {
            this.showScreen('Lobby_Search');
            this.searchAlliances(); // Carga inicial
        }
    },

    showScreen: function(mode) {
        document.getElementById('aliView_Lobby').style.display = (mode === 'Lobby_Search') ? 'block' : 'none';
        document.getElementById('aliView_HQ').style.display = (mode === 'HQ') ? 'flex' : 'none';
    },

    // --- LÓGICA DE BÚSQUEDA Y CREACIÓN ---
    
    searchAlliances: async function(term = '') {
        const list = document.getElementById('aliSearchResults');
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Buscando comunicaciones...</div>';
        
        let query = supabaseClient.from('alliances').select('*').limit(20);
        if(term) query = query.ilike('name', `%${term}%`);
        
        const { data, error } = await query;
        if(error) { list.innerHTML = 'Error de conexión.'; return; }
        
        list.innerHTML = '';
        if(!data.length) { list.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No se encontraron alianzas.</div>'; return; }

        data.forEach(ali => {
            // Parse seguro del icono
            let icon = "🛡️";
            try { icon = JSON.parse(ali.description || "{}").icon || icon; } catch(e){}

            const card = document.createElement('div');
            card.className = 'ali-card';
            card.innerHTML = `
                <div class="ali-card-icon">${icon}</div>
                <div class="ali-card-info">
                    <span class="ali-card-name">[${ali.tag}] ${ali.name}</span>
                    <div class="ali-card-meta">
                        <span>⚔️ ${ali.total_power || 0}</span>
                        <span>🌐 ${ali.language || 'Global'}</span>
                        <span style="color:${ali.type==='Open'?'#4ade80':'#facc15'}">${ali.type === 'Open' ? '🔓 Abierta' : '🔒 Solicitud'}</span>
                    </div>
                </div>
                <button class="ali-card-btn">${ali.type === 'Open' ? 'Unirse' : 'Postular'}</button>
            `;
            
            card.querySelector('button').onclick = () => this.handleJoinClick(ali);
            list.appendChild(card);
        });
    },

    handleJoinClick: async function(ali) {
        if(ali.type === 'Open') {
            await this.joinAllianceDirectly(ali.id);
        } else {
            alert("Sistema de solicitudes próximamente. (Solo alianzas abiertas por ahora).");
        }
    },

    createAlliance: async function() {
        const name = document.getElementById('newAliName').value.trim();
        const tag = document.getElementById('newAliTag').value.trim().toUpperCase();
        const type = document.getElementById('newAliType').value;
        const lang = document.getElementById('newAliLang').value;
        
        if(!name || !tag) { alert("Nombre y TAG son obligatorios."); return; }
        
        // Usamos description para guardar metadatos extra como el icono
        const meta = JSON.stringify({ icon: this.selectedEmblem });

        const { data, error } = await supabaseClient
            .from('alliances')
            .insert({
                name: name,
                tag: tag,
                leader_id: PlayerDataManager.currentPlayer.auth_id,
                type: type,
                language: lang,
                description: meta
            })
            .select()
            .single();

        if(error) { alert("Error: " + error.message); return; }

        // Actualizar perfil local y remoto
        await this.joinAllianceDirectly(data.id, 'Leader');
        document.getElementById('aliCreateForm').style.display='none';
    },

    joinAllianceDirectly: async function(aliId, role='Member') {
        const uid = PlayerDataManager.currentPlayer.auth_id;
        
        // 1. Insertar miembro
        await supabaseClient.from('alliance_members').insert({
            user_id: uid, alliance_id: aliId, role: role
        });

        // 2. Actualizar perfil local
        PlayerDataManager.currentPlayer.alliance_id = aliId;
        await PlayerDataManager.saveCurrentPlayer(); // Esto también actualiza la DB profile

        // 3. Inicializar Chat y Cargar HQ
        this.initChatWidget(aliId);
        this.loadHQ(aliId);
    },

    // --- LÓGICA DEL CUARTEL GENERAL (HQ) ---
    loadHQ: async function(aliId) {
        this.showScreen('HQ');
        const listContainer = document.getElementById('membersListCompact');
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Conectando...</div>';

        try {
            const myId = PlayerDataManager.currentPlayer.auth_id;

            // 1. OBTENER DATOS DE LA ALIANZA
            const { data: ali, error: aliError } = await supabaseClient
                .from('alliances')
                .select('*')
                .eq('id', aliId)
                .single();

            if (aliError) throw aliError;
            this.currentAlliance = ali;

            // 2. DETECTAR SI SOY LÍDER (Comparación directa)
            this.isLeader = (ali.leader_id === myId);

            // 3. RENDERIZAR CABECERA
            let icon = "🛡️";
            try { icon = JSON.parse(ali.description).icon || icon; } catch(e){}
            
            if(document.getElementById('hqFlag')) document.getElementById('hqFlag').textContent = icon;
            if(document.getElementById('hqName')) document.getElementById('hqName').textContent = `[${ali.tag}] ${ali.name}`;
            
            // 4. OBTENER MIEMBROS (Desde Perfiles)
            const { data: members, error: membersError } = await supabaseClient
                .from('profiles')
                .select('id, username, level, avatar_url, total_wins, alliance_role')
                .eq('alliance_id', aliId);

            if (membersError) throw membersError;

            // Calcular Poder Total
            let totalPower = 0;
            members.forEach(p => {
                totalPower += (p.level || 1) * 100 + (p.total_wins || 0) * 10;
            });

            if(document.getElementById('hqLevel')) document.getElementById('hqLevel').textContent = Math.floor(totalPower / 1000) + 1;
            if(document.getElementById('hqPower')) document.getElementById('hqPower').textContent = totalPower.toLocaleString();
            if(document.getElementById('memberCountDisplay')) document.getElementById('memberCountDisplay').textContent = `${members.length}/50`;

            // 5. RENDERIZAR LISTA
            listContainer.innerHTML = '';
            
            // Ordenar: Líder arriba
            members.sort((a, b) => {
                if (a.id === ali.leader_id) return -1;
                if (b.id === ali.leader_id) return 1;
                return (b.level || 0) - (a.level || 0);
            });

            members.forEach(p => {
                const div = document.createElement('div');
                div.className = 'member-item';
                div.style.cssText = "display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #334155; align-items: center; background: rgba(255,255,255,0.02);";
                
                const isMemberLeader = (p.id === ali.leader_id);
                const roleColor = isMemberLeader ? '#f1c40f' : '#94a3b8';
                const roleText = isMemberLeader ? 'LÍDER' : (p.alliance_role || 'MIEMBRO');

                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.5em;">${p.avatar_url || '👤'}</span>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold; color:#e2e8f0; font-size:0.95em;">${p.username}</span>
                            <span style="font-size:0.75em; color:#64748b;">Nivel ${p.level || 1} • ${p.total_wins || 0} Wins</span>
                        </div>
                    </div>
                    <span style="font-size:0.7em; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid ${roleColor}; color:${roleColor}; text-transform:uppercase;">
                        ${roleText}
                    </span>
                `;
                listContainer.appendChild(div);
            });

            // 6. GESTIÓN DEL BOTÓN DE ATAQUE / INICIO
            let { data: activeRaid } = await supabaseClient
                .from('alliance_raids')
                .select('*')
                .eq('alliance_id', aliId)
                .eq('status', 'active')
                .maybeSingle();

            const btnAttack = document.getElementById('btnAttackRaid');
            const hpText = document.getElementById('raidBossHpText');
            const hpBar = document.getElementById('raidBossHpBar');
            const stageText = document.getElementById('raidStageText');

            if (btnAttack) {
                // Clonar para limpiar listeners
                const newBtn = btnAttack.cloneNode(true);
                btnAttack.parentNode.replaceChild(newBtn, btnAttack);

                // CASO A: Hay Raid Activo
                if (activeRaid) {
                    // Asignar raid y verificar si cambió de etapa automáticamente
                    RaidManager.currentRaid = activeRaid;
                    await RaidManager.checkAndAdvanceStage();
                    
                    // Recargar datos actualizados después de verificar etapas
                    const { data: updatedRaid } = await supabaseClient
                        .from('alliance_raids')
                        .select('*')
                        .eq('id', activeRaid.id)
                        .single();
                    
                    if (updatedRaid) {
                        RaidManager.currentRaid = updatedRaid;
                        activeRaid = updatedRaid;
                    }
                    
                    const currentHP = activeRaid.stage_data.caravan_hp;
                    const maxHP = activeRaid.stage_data.caravan_max_hp;
                    const pct = (currentHP / maxHP) * 100;
                    const currentStage = activeRaid.current_stage || 1;
                    
                    if(hpText) hpText.textContent = `${currentHP.toLocaleString()} / ${maxHP.toLocaleString()} HP`;
                    if(hpBar) hpBar.style.width = `${pct}%`;
                    if(stageText) stageText.textContent = `ETAPA ${currentStage}/4`;

                    newBtn.textContent = "⚔️ ATACAR";
                    newBtn.style.background = "#dc2626";
                    newBtn.disabled = false;
                    
                    newBtn.addEventListener('click', () => {
                        document.getElementById('allianceModal').style.display = 'none';
                        if (typeof RaidManager !== 'undefined') {
                            RaidManager.enterRaid(); 
                        }
                    });
                } 
                // CASO B: No hay Raid (Líder)
                else if (this.isLeader) { 
                    if(hpText) hpText.textContent = "Sin Incursión Activa";
                    if(hpBar) hpBar.style.width = "0%";
                    if(stageText) stageText.textContent = "";

                    newBtn.textContent = "🚩 INICIAR EVENTO";
                    newBtn.style.background = "#f1c40f"; 
                    newBtn.style.color = "black";
                    newBtn.disabled = false;

                    newBtn.addEventListener('click', () => {
                        if (typeof RaidManager !== 'undefined') {
                            if(confirm("¿Iniciar la Ruta del Oro? Costará 500 de oro del tesoro.")) { // Mensaje ejemplo
                                RaidManager.startNewRaid(aliId);
                                setTimeout(() => this.loadHQ(aliId), 1000);
                            }
                        }
                    });
                }
                // CASO C: No hay Raid (Miembro)
                else {
                    if(hpText) hpText.textContent = "Esperando órdenes...";
                    if(hpBar) hpBar.style.width = "0%";
                    if(stageText) stageText.textContent = "";
                    newBtn.textContent = "⏳ EN ESPERA";
                    newBtn.style.background = "#555";
                    newBtn.disabled = true;
                }
            }

        } catch (err) {
            console.error("Error cargando HQ:", err);
            listContainer.innerHTML = '<p style="text-align:center; color:#ef4444;">Error de conexión.</p>';
        }
    },

    // --- SISTEMA DE CHAT ---
    initChatWidget: function(aliId) {
        const widget = document.getElementById('globalChatWidget');
        if(widget) widget.style.display = 'flex';
        
        // Suscripción Realtime
        if(this.chatSubscription) supabaseClient.removeChannel(this.chatSubscription);
        
        this.chatSubscription = supabaseClient
            .channel(`chat:${aliId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alliance_chat', filter: `alliance_id=eq.${aliId}` }, 
            (payload) => {
                this.displayMessage(payload.new);
            })
            .subscribe();
    },

    sendMessage: async function(text) {
        if(!text.trim()) return;

        // Si no hay alianza, intenta recuperar del perfil o sale
        if (!this.currentAlliance && PlayerDataManager.currentPlayer?.alliance_id) {
            this.currentAlliance = { id: PlayerDataManager.currentPlayer.alliance_id };
        }
        if (!this.currentAlliance) return;
        
        const user = PlayerDataManager.currentPlayer;
        
        // --- CORRECCIÓN: NO PINTAR AQUÍ (Evita duplicados) ---
        // this.displayMessage(...)  <-- ¡ESTA LINEA BORRALA!
        
        // Solo enviamos a la nube. Cuando la nube responda, el "listener" pintará el mensaje.
        await supabaseClient.from('alliance_chat').insert({
            alliance_id: this.currentAlliance.id,
            user_id: user.auth_id,
            username: user.username,
            message: text.trim()
        });
    },

    loadChatHistory: async function(aliId) {
        const { data } = await supabaseClient
            .from('alliance_chat')
            .select('*')
            .eq('alliance_id', aliId)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if(data) {
            // Invertir para mostrar cronológicamente
            data.reverse().forEach(msg => this.displayMessage(msg));
        }
    },

    displayMessage: function(msg) {
        const myId = PlayerDataManager.currentPlayer.auth_id;
        const isMe = msg.user_id === myId;
        
        // HTML del mensaje
        const msgHtml = `
            <span class="chat-author" style="font-size:0.7em; color:#aaa;">${isMe ? 'Tú' : msg.username}</span>
            <div style="color:${isMe ? '#fff' : '#ccc'};">${msg.message}</div>
        `;

        // Añadir al Widget Mini (El que ves en el mapa)
        const miniChat = document.getElementById('miniChatMessages');
        if(miniChat) {
            const div = document.createElement('div');
            div.className = `chat-msg ${isMe ? 'mine' : ''}`;
            div.style.textAlign = isMe ? 'right' : 'left'; // Alinear el texto
            div.innerHTML = msgHtml;
            miniChat.appendChild(div);
            // Auto-scroll al fondo
            miniChat.scrollTop = miniChat.scrollHeight;
        }
        
        // (Opcional) Añadir también al chat grande del modal si está abierto
        // ...
    },

    // --- UTILIDADES ---
    resetCreateForm: function() {
        this.selectedEmblem = "🛡️";
        document.querySelectorAll('.emb-opt').forEach(el => {
            el.classList.remove('selected');
            el.onclick = () => {
                document.querySelectorAll('.emb-opt').forEach(x => x.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedEmblem = el.innerText;
            }
        });
    },

    leaveAlliance: async function() {
        if(!confirm("¿Seguro que quieres abandonar la alianza?")) return;
        const uid = PlayerDataManager.currentPlayer.auth_id;
        
        await supabaseClient.from('alliance_members').delete().eq('user_id', uid);
        
        PlayerDataManager.currentPlayer.alliance_id = null;
        await PlayerDataManager.saveCurrentPlayer();
        
        document.getElementById('globalChatWidget').style.display = 'none';
        if(this.chatSubscription) supabaseClient.removeChannel(this.chatSubscription);
        
        this.open(); // Recargar vista (volverá al Lobby)
    }
};

// --- Lógica del Widget de Chat (Burbuja vs Ventana) ---

// Función para alternar el estado del widget
function toggleChatWidget() {
    const widget = document.getElementById('globalChatWidget');
    if (!widget) return;

    // Si tiene la clase minimized, se la quitamos (Abrir)
    if (widget.classList.contains('minimized')) {
        widget.classList.remove('minimized');
        
        // Auto-foco al input para escribir rápido
        setTimeout(() => {
            const input = document.getElementById('miniChatInput');
            if(input) input.focus();
        }, 100);
        
        // Bajar scroll al fondo
        const content = document.getElementById('miniChatMessages');
        if(content) content.scrollTop = content.scrollHeight;

    } else {
        // Si está abierto, lo minimizamos
        widget.classList.add('minimized');
    }
};

/**
 * (NUEVO) Desplega la "Caravana Imperial" como unidad compartida de la alianza
 * cuando se inicia una misión especial de alianza
 */
AllianceManager.deployImperialCaravan = async function(allianceId) {
    try {
        if (!gameState || !board || !units) {
            console.error("[Alliance] No se puede desplegar: gameState no inicializado.");
            return false;
        }

        // 1. Encontrar una posición válida para desplegar (cerca de la capital del jugador)
        const playerCapital = gameState.cities.find(c => c.isCapital && c.owner === gameState.currentPlayer);
        if (!playerCapital) {
            console.warn("[Alliance] No se encontró capital del jugador para desplegar Caravana.");
            return false;
        }

        // 2. Buscar un hexágono adyacente disponible
        const neighbors = getHexNeighbors(playerCapital.r, playerCapital.c);
        let deploySpot = null;
        for (const neighbor of neighbors) {
            const hexData = board[neighbor.r]?.[neighbor.c];
            if (hexData && !getUnitOnHex(neighbor.r, neighbor.c) && !TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) {
                deploySpot = neighbor;
                break;
            }
        }

        if (!deploySpot) {
            console.warn("[Alliance] No hay espacio adyacente para desplegar Caravana Imperial.");
            return false;
        }

        // 3. Crear la unidad de Caravana Imperial
        const imperialCaravan = {
            id: `u${unitIdCounter++}`,
            player: 0, // Neutral / Alianza (Player 0)
            name: `Caravana Imperial [${PlayerDataManager.currentPlayer?.username || 'Alianza'}]`,
            commander: null,
            regiments: [
                { type: 'Caballería Pesada', id: `r${Date.now()}${Math.random()}`, health: REGIMENT_TYPES['Caballería Pesada'].health },
                { type: 'Caballería Pesada', id: `r${Date.now()}${Math.random()}`, health: REGIMENT_TYPES['Caballería Pesada'].health },
                { type: 'Arqueros', id: `r${Date.now()}${Math.random()}`, health: REGIMENT_TYPES['Arqueros'].health }
            ],
            r: deploySpot.r,
            c: deploySpot.c,
            hasMoved: false,
            hasAttacked: false,
            level: 0,
            experience: 0,
            morale: 100,
            maxMorale: 125,
            allianceId: allianceId,  // Identificar como unidad de alianza
            isAllianceUnit: true     // Flag para tratamiento especial
        };

        // Calcular stats
        calculateRegimentStats(imperialCaravan);
        imperialCaravan.currentHealth = imperialCaravan.maxHealth;
        imperialCaravan.currentMovement = imperialCaravan.movement;

        // 4. Colocar en el tablero
        units.push(imperialCaravan);
        board[deploySpot.r][deploySpot.c].unit = imperialCaravan;
        
        // 5. Crear elemento visual
        const hexElement = board[deploySpot.r][deploySpot.c].element;
        if (hexElement) {
            imperialCaravan.element = createUnitElement(imperialCaravan);
            positionUnitElement(imperialCaravan);
            hexElement.appendChild(imperialCaravan.element);
        }

        logMessage(`¡La Caravana Imperial ha sido desplegada en (${deploySpot.r},${deploySpot.c})!`, "success");
        return true;

    } catch (error) {
        console.error("[Alliance] Error al desplegar Caravana Imperial:", error);
        return false;
    }
};

/**
 * (NUEVO) Habilita el acceso a una fortaleza aliada para el jugador
 */
AllianceManager.enableAllyFortress = function(fortressR, fortressC) {
    try {
        const hexData = board[fortressR]?.[fortressC];
        if (!hexData) {
            console.warn(`[Alliance] Fortaleza inválida en (${fortressR},${fortressC})`);
            return false;
        }

        // Marcar como accesible
        hexData.isAllyFortress = true;
        hexData.canBeUsedBy = gameState.currentPlayer;
        
        logMessage(`¡Ahora puedes usar la fortaleza aliada en (${fortressR},${fortressC})!`, "success");
        
        // Actualizar visualmente
        if (typeof renderSingleHexVisuals === 'function') {
            renderSingleHexVisuals(fortressR, fortressC);
        }

        return true;
    } catch (error) {
        console.error("[Alliance] Error habilitando fortaleza aliada:", error);
        return false;
    }
};

// Inicialización de Listeners del Chat (Llamar en init())
// Asegúrate de que esto no se duplique
document.addEventListener('click', (e) => {
    const t = e.target;
    
    // 1. ABRIR/CERRAR: Detectar clic en la burbuja o en el botón de minimizar
    // Usamos .closest para detectar si se hizo clic en el icono 💬 o en el contenedor
    if (t.id === 'chatBubbleIcon' || t.closest('#chatBubbleIcon') || (t.id === 'globalChatWidget' && t.classList.contains('minimized'))) {
        e.stopPropagation();
        toggleChatWidget();
    }
    
    if (t.id === 'minimizeChatBtn') {
        e.stopPropagation();
        toggleChatWidget();
    }

    // 2. ENVIAR MENSAJE (Mini Chat)
    if (t.id === 'miniChatSendBtn') {
        const inp = document.getElementById('miniChatInput');
        if (inp && inp.value.trim() !== "") {
            AllianceManager.sendMessage(inp.value);
            inp.value = ''; // Limpiar input
        }
    }
});

// Permitir enviar con ENTER en el input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const miniInp = document.getElementById('miniChatInput');
        // Si el foco está en el input del chat mini
        if (document.activeElement === miniInp && miniInp.value.trim() !== "") {
            AllianceManager.sendMessage(miniInp.value);
            miniInp.value = '';
        }
    }
});

// Inicializar al cargar si ya hay jugador
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que PlayerDataManager cargó
    setTimeout(() => AllianceManager.init(), 1000);
});