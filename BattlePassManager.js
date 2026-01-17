// battlePassManager.js
const BattlePassManager = {
    currentSeason: null,
    userProgress: null,

    open: async function() {
        if (!domElements.battlePassModal) return; // Asegúrate de referenciarlo en domElements
        
        domElements.battlePassModal.style.display = 'flex';
        await this.loadData();
    },

    loadData: async function() {
        if (!PlayerDataManager.currentPlayer?.auth_id) return;
        const uid = PlayerDataManager.currentPlayer.auth_id;

        // 1. Obtener la definición de la temporada (hardcodeado a season_id = 1 para pruebas)
        const { data: seasonDef, error: err1 } = await supabaseClient
            .from('battle_pass_definitions')
            .select('*')
            .eq('season_id', 1)
            .single();

        if (err1) { console.error("Error cargando Temporada:", err1); return; }
        this.currentSeason = seasonDef;

        // 2. Obtener (o crear) el progreso del usuario
        let { data: userProg, error: err2 } = await supabaseClient
            .from('user_battle_pass')
            .select('*')
            .eq('user_id', uid)
            .eq('season_id', 1)
            .maybeSingle();

        // Si no existe, crear registro inicial
        if (!userProg) {
            const { data: created, error: insertErr } = await supabaseClient
                .from('user_battle_pass')
                .insert({ user_id: uid, season_id: 1 })
                .select()
                .single();
            if (insertErr) { console.error("Error creando pase usuario:", insertErr); return; }
            userProg = created;
        }

        this.userProgress = userProg;
        this.render();
    },

    render: function() {
        document.getElementById('bpSeasonName').textContent = this.currentSeason.name;
        document.getElementById('bpCurrentLevelDisplay').textContent = `Nivel ${this.userProgress.current_level}`;
        
        // Manejar el botón Premium
        const header = document.querySelector('.bp-header');
        if (this.userProgress.is_premium) header.classList.add('premium-active');
        else header.classList.remove('premium-active');

        // Renderizar niveles
        const container = document.getElementById('bpLevelsList');
        container.innerHTML = '';

        // El JSON 'levels' de la DB
        const levels = this.currentSeason.levels; 
        
        // Calcular XP para el nivel actual
        // (Nota: para simplicidad visual, barra = progreso hacia el siguiente nivel global)
        const xpReqForNext = levels.find(l => l.lvl === this.userProgress.current_level + 1)?.req_xp || 9999;
        
        levels.forEach(lvlData => {
            const isReached = this.userProgress.current_level >= lvlData.lvl;
            
            const row = document.createElement('div');
            row.className = `bp-level-row ${isReached ? 'reached' : 'locked'}`;
            
            // Columna 1: Número Nivel
            const levelCol = `<div class="bp-level-indicator"><span>LVL</span><span style="font-size:1.5em">${lvlData.lvl}</span></div>`;

            // Columna 2: Recompensa Gratis
            const freeContent = this.renderRewardCell(lvlData.lvl, 'free', lvlData.free, isReached, true);

            // Columna 3: Recompensa Premium
            const hasPremium = this.userProgress.is_premium;
            const premContent = this.renderRewardCell(lvlData.lvl, 'prem', lvlData.prem, isReached && hasPremium, hasPremium);

            row.innerHTML = levelCol + freeContent + premContent;
            container.appendChild(row);
        });
    },

    renderRewardCell: function(level, trackType, rewardData, isClaimableState, isTrackUnlocked) {
        // ¿Ya se reclamó? (Buscamos "NVL_TIPO" en el array de reclamados, ej: "2_free")
        const claimId = `${level}_${trackType}`;
        const isClaimed = this.userProgress.claimed_rewards && this.userProgress.claimed_rewards.includes(claimId);

        let actionHtml = '';
        
        if (isClaimed) {
            actionHtml = '<span class="bp-reward-claimed">✅</span>';
        } else if (isClaimableState) {
            // Pasamos los argumentos JSON de forma segura en el onclick
            // Nota: Un stringify aquí es delicado, mejor usar data attributes en un listener real.
            // Para simplificar ahora, usaré una función helper global o atada.
            actionHtml = `<button class="bp-claim-btn" onclick="BattlePassManager.claim('${claimId}', '${rewardData.type}', '${rewardData.qty}', '${rewardData.id}')">RECLAMAR</button>`;
        } else if (!isTrackUnlocked) {
            actionHtml = '<span class="bp-lock-icon">🔒</span>'; 
        } else {
            // Nivel no alcanzado aun
            actionHtml = '<span style="color:#555; font-size:0.8em">...</span>';
        }

        let rewardText = "";
        if(rewardData.type === 'oro') rewardText = `💰 ${rewardData.qty}`;
        if(rewardData.type === 'sellos') rewardText = `💎 ${rewardData.qty}`;
        if(rewardData.type === 'fragmentos') rewardText = `🧩 Frags ${rewardData.id}`;
        
        return `<div class="bp-reward-card bp-card-${trackType === 'free' ? 'free' : 'premium'}">
            <span>${rewardText}</span>
            ${actionHtml}
        </div>`;
    },

    claim: async function(claimId, type, qty, id) {
        if (!this.userProgress) return;

        // 1. Dar Recompensa Local
        qty = parseInt(qty);
        if (type === 'oro') PlayerDataManager.currentPlayer.currencies.gold += qty;
        if (type === 'sellos') PlayerDataManager.addWarSeals(qty);
        // ... (añadir otros tipos como fragmentos o equipo aquí)

        // 2. Actualizar estado "Reclamado"
        if (!this.userProgress.claimed_rewards) this.userProgress.claimed_rewards = [];
        this.userProgress.claimed_rewards.push(claimId);

        // 3. Guardar en Supabase (Solo la tabla del pase y el perfil)
        await supabaseClient.from('user_battle_pass')
            .update({ claimed_rewards: this.userProgress.claimed_rewards })
            .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
            .eq('season_id', this.currentSeason.season_id);

        PlayerDataManager.saveCurrentPlayer();

        showToast("¡Recompensa Reclamada!", "success");
        this.render(); // Refrescar visualmente
    }
};

// Activar compra simulada (Premium)
document.addEventListener('click', (e) => {
    if(e.target && e.target.id === 'buyPremiumBtn') {
        if(confirm("¿Desbloquear Pase Premium por 100 Gemas? (Simulación: Será gratis ahora)")) {
            // En real restaríamos gemas
            BattlePassManager.userProgress.is_premium = true;
            // Guardar en DB
             supabaseClient.from('user_battle_pass')
            .update({ is_premium: true })
            .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
            .eq('season_id', 1)
            .then(() => {
                BattlePassManager.render();
                showToast("¡Pase Premium Activado!", "special");
            });
        }
    }
    
    // Cierre
    if(e.target && e.target.id === 'closeBattlePassBtn') {
        document.getElementById('battlePassModal').style.display = 'none';
    }
});