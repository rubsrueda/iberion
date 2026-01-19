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
        
        // Carga paralela de datos y miembros
        const [aliRes, membersRes] = await Promise.all([
            supabaseClient.from('alliances').select('*').eq('id', aliId).single(),
            supabaseClient.from('alliance_members')
                .select('user_id, role, profiles(username, level, avatar_url)')
                .eq('alliance_id', aliId)
        ]);

        if(aliRes.error) return; // Manejar error
        
        const ali = aliRes.data;
        this.currentAlliance = ali;

        // Render Header
        let icon = "🛡️";
        try { icon = JSON.parse(ali.description).icon || icon; } catch(e){}
        document.getElementById('hqFlag').textContent = icon;
        document.getElementById('hqName').textContent = `[${ali.tag}] ${ali.name}`;
        document.getElementById('hqLevel').textContent = ali.level;
        document.getElementById('hqLanguage').textContent = ali.language || 'Global';
        document.getElementById('hqPower').textContent = ali.total_power || 0;
        document.getElementById('hqMembers').textContent = `${membersRes.data.length}/50`;

        // Render Members
        const mList = document.getElementById('membersListCompact');
        mList.innerHTML = '';
        membersRes.data.forEach(m => {
            const div = document.createElement('div');
            div.className = 'member-item';
            // Fallback si profiles es null (integridad referencial)
            const uname = m.profiles?.username || 'Usuario';
            const lvl = m.profiles?.level || 1;
            div.innerHTML = `
                <span>${m.profiles?.avatar_url || '👤'} ${uname} <span style="color:#aaa; font-size:9px;">(Lvl ${lvl})</span></span>
                <span class="role-badge role-${m.role}">${m.role}</span>
            `;
            mList.appendChild(div);
        });

        // Cargar historial de chat reciente
        this.loadChatHistory(aliId);
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
        if(!text.trim() || !this.currentAlliance) return;
        const user = PlayerDataManager.currentPlayer;
        
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
            <span class="chat-author">${isMe ? 'Tú' : msg.username}</span>
            ${msg.message}
        `;

        // 1. Añadir al Chat Grande (HQ)
        const fullChat = document.getElementById('fullChatMessages');
        if(fullChat) {
            const div = document.createElement('div');
            div.className = `chat-msg ${isMe ? 'mine' : ''}`;
            div.innerHTML = msgHtml;
            fullChat.appendChild(div);
            fullChat.scrollTop = fullChat.scrollHeight;
        }

        // 2. Añadir al Widget Mini
        const miniChat = document.getElementById('miniChatMessages');
        if(miniChat) {
            const div = document.createElement('div');
            div.className = `chat-msg ${isMe ? 'mine' : ''}`;
            div.innerHTML = msgHtml;
            miniChat.appendChild(div);
            miniChat.scrollTop = miniChat.scrollHeight;
        }
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

// Función para alternar el estado
function toggleChatWidget() {
    const widget = document.getElementById('globalChatWidget');
    const content = document.getElementById('chatWindowContent');
    const bubble = document.getElementById('chatBubbleIcon');
    
    // Si tiene la clase 'minimized', lo abrimos
    if (widget.classList.contains('minimized')) {
        widget.classList.remove('minimized');
        bubble.style.display = 'none';
        content.style.display = 'flex'; // Usamos flex para mantener la estructura vertical
        
        // Ocultar notificación al abrir
        const badge = document.getElementById('chatNotificationBadge');
        if(badge) badge.style.display = 'none';
        
        // Auto-foco al input
        setTimeout(() => document.getElementById('miniChatInput').focus(), 100);
    } 
    // Si está abierto, lo minimizamos
    else {
        widget.classList.add('minimized');
        content.style.display = 'none';
        bubble.style.display = 'block';
    }
}

// LISTENERS
document.addEventListener('click', (e) => {
    const t = e.target;
    // Abrir modal
    if(t.dataset.action === 'openAlliance') AllianceManager.open();
    
    // Navegación interna
    if(t.id === 'aliCreateModeBtn') document.getElementById('aliCreateForm').style.display = 'flex';
    if(t.id === 'aliCreateConfirmBtn') AllianceManager.createAlliance();
    if(t.id === 'aliSearchBtn') AllianceManager.searchAlliances(document.getElementById('aliSearchInput').value);
    if(t.id === 'closeAllianceBtn') document.getElementById('allianceModal').style.display='none';
    if(t.id === 'aliLeaveBtn') AllianceManager.leaveAlliance();

    // 1. Clic en la Burbuja para ABRIR
    // Usamos closest porque el icono (💬) está dentro del div
    if (t.id === 'globalChatWidget' || t.closest('#chatBubbleIcon')) {
        // Solo si está minimizado
        const widget = document.getElementById('globalChatWidget');
        if (widget && widget.classList.contains('minimized')) {
            toggleChatWidget();
        }
    }

    // 2. Clic en la flecha ▼ para MINIMIZAR
    if (t.id === 'minimizeChatBtn') {
        e.stopPropagation(); // Evitar rebote
        toggleChatWidget();
    }

    const chatWidget = document.getElementById('globalChatWidget');
    if (chatWidget) {
        // Esto evita que los clics dentro del chat activen cosas detrás (como moverse en el mapa)
        chatWidget.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // También prevenimos que se active el movimiento del mapa al arrastrar dentro del chat
        chatWidget.addEventListener('mousedown', (e) => e.stopPropagation());
        chatWidget.addEventListener('touchstart', (e) => e.stopPropagation());
    }

    // Chat
    if(t.id === 'fullChatSendBtn') {
        const inp = document.getElementById('fullChatInput');
        AllianceManager.sendMessage(inp.value);
        inp.value = '';
    }
    if(t.id === 'miniChatSendBtn') {
        const inp = document.getElementById('miniChatInput');
        AllianceManager.sendMessage(inp.value);
        inp.value = '';
    }
    if(t.id === 'toggleChatSizeBtn') {
        document.getElementById('globalChatWidget').classList.toggle('collapsed');
        t.textContent = t.textContent === '▲' ? '▼' : '▲';
    }
});



// Inicializar al cargar si ya hay jugador
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que PlayerDataManager cargó
    setTimeout(() => AllianceManager.init(), 1000);
});