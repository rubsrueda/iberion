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

    // En allianceManager.js

    loadHQ: async function(aliId) {
        this.showScreen('HQ');
        const listContainer = document.getElementById('membersListCompact');
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Contactando con el Cuartel General...</div>';

        try {
            // 1. CARGA PARALELA: Datos de la Alianza + Lista de Miembros (con perfiles unidos)
            const [aliRes, membersRes] = await Promise.all([
                // A. Datos de la Alianza
                supabaseClient
                    .from('alliances')
                    .select('*')
                    .eq('id', aliId)
                    .single(),

                // B. Miembros + Datos de Perfil (JOIN)
                supabaseClient
                    .from('alliance_members')
                    .select(`
                        role,
                        user_id,
                        profiles (
                            username,
                            level,
                            avatar_url,
                            total_wins
                        )
                    `)
                    .eq('alliance_id', aliId)
            ]);

            if (aliRes.error) throw aliRes.error;
            if (membersRes.error) throw membersRes.error;

            const ali = aliRes.data;
            const members = membersRes.data;
            this.currentAlliance = ali;

            // 2. CALCULAR PODER TOTAL (Suma de Niveles * 100 + Victorias * 10)
            let totalPower = 0;
            members.forEach(m => {
                const p = m.profiles;
                if (p) {
                    totalPower += (p.level || 1) * 100 + (p.total_wins || 0) * 10;
                }
            });

            // 3. RENDERIZAR CABECERA (HEADER)
            let icon = "🛡️";
            try { icon = JSON.parse(ali.description).icon || icon; } catch(e){}
            
            if(document.getElementById('hqFlag')) document.getElementById('hqFlag').textContent = icon;
            if(document.getElementById('hqName')) document.getElementById('hqName').textContent = `[${ali.tag}] ${ali.name}`;
            if(document.getElementById('hqLevel')) document.getElementById('hqLevel').textContent = Math.floor(totalPower / 1000) + 1; // Nivel basado en poder
            if(document.getElementById('hqPower')) document.getElementById('hqPower').textContent = totalPower.toLocaleString();
            if(document.getElementById('memberCountDisplay')) document.getElementById('memberCountDisplay').textContent = `${members.length}/50`;

            // 4. RENDERIZAR LISTA DE MIEMBROS
            listContainer.innerHTML = '';
            
            // Ordenar: Líder primero, luego por nivel
            members.sort((a, b) => {
                if (a.role === 'Leader') return -1;
                if (b.role === 'Leader') return 1;
                return (b.profiles?.level || 0) - (a.profiles?.level || 0);
            });

            members.forEach(m => {
                const p = m.profiles || { username: 'Desconocido', level: 1, avatar_url: '👤' };
                
                const div = document.createElement('div');
                div.className = 'member-item';
                div.style.cssText = "display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #334155; align-items: center; background: rgba(255,255,255,0.02);";
                
                // Color del rol
                const roleColor = m.role === 'Leader' ? '#f1c40f' : '#94a3b8';
                const roleText = m.role === 'Leader' ? 'LÍDER' : 'MIEMBRO';

                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.5em;">${p.avatar_url}</span>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold; color:#e2e8f0; font-size:0.95em;">${p.username}</span>
                            <span style="font-size:0.75em; color:#64748b;">Nivel ${p.level} • ${p.total_wins || 0} Wins</span>
                        </div>
                    </div>
                    <span style="font-size:0.7em; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid ${roleColor}; color:${roleColor};">
                        ${roleText}
                    </span>
                `;
                listContainer.appendChild(div);
            });

        } catch (err) {
            console.error("Error cargando HQ:", err);
            listContainer.innerHTML = '<p style="text-align:center; color:#ef4444;">Error al cargar los datos de la alianza.</p>';
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
}

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