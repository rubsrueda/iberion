// battlePassManager.js (Lógica Pura conectada a seasonsData)

const BattlePassManager = {
    currentSeasonData: null,
    userProgress: null,

    open: async function() {
        const modal = document.getElementById('battlePassModal');
        if(!modal) { console.error("No hay modal"); return; }
        
        modal.style.display = 'flex';

        // --- BLOQUE DE SEGURIDAD ANTIGUO "PANTALLA VACÍA" ---
        
        // 1. Verificar si existen los datos externos
        const configExists = (typeof SEASON_CONFIG !== 'undefined');
        const dataExists = (typeof BATTLE_PASS_SEASONS !== 'undefined');

        if (!configExists || !dataExists) {
            console.warn("⚠️ FALTAN DATOS EN CONSTANTS O SEASONSDATA. USANDO MODO EMERGENCIA.");
            
            // Crear datos ficticios para que no se quede vacío
            this.currentSeasonData = {
                name: "T1: EMERGENCIA (Faltan Datos)",
                levels: []
            };
            // Generar 10 niveles simples
            for(let i=1; i<=10; i++) this.currentSeasonData.levels.push({
                lvl: i, req_xp: i*500, free: {type:'oro',qty:100}, prem: {type:'sellos',qty:1}
            });
        } else {
            // Carga Normal
            const key = SEASON_CONFIG.ACTIVE_SEASON_KEY;
            this.currentSeasonData = BATTLE_PASS_SEASONS[key];
        }

        // 2. Cargar/Crear usuario
        if(!this.userProgress) {
            this.userProgress = { current_level: 1, current_xp: 0, is_premium: false, claimed_rewards: [] };
        }
        
        // 3. Pintar
        try {
            this.render();
        } catch (e) {
            console.error("Error pintando el pase:", e);
            document.getElementById('bpScrollContainer').innerHTML = `<p style='padding:20px; color:red'>Error de Renderizado: ${e.message}</p>`;
        }
    },

    render: function() {
        if(!this.userProgress || !this.currentSeasonData) return;

        const currentLvl = this.userProgress.current_level;
        const isPremium = this.userProgress.is_premium;
        const levels = this.currentSeasonData.levels;

        // --- HEADER ---
        const seasonDurationMs = SEASON_CONFIG.SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
        // Simulación visual del tiempo (restando días aleatorios o fijos para la beta)
        const daysLeft = SEASON_CONFIG.SEASON_DURATION_DAYS; 

        setText('bpSeasonName', this.currentSeasonData.name);
        setText('bpSeasonTimer', `Termina en: ${daysLeft}d 23h`);
        
        setText('bpLvlLeft', currentLvl);
        setText('bpLvlRight', currentLvl + 1);

        // Barra de progreso
        const nextLevelData = levels.find(l => l.lvl === currentLvl + 1);
        const prevLevelData = levels.find(l => l.lvl === currentLvl);
        
        let xpRequired = nextLevelData ? nextLevelData.req_xp : 99999;
        let baseXp = prevLevelData ? prevLevelData.req_xp : 0;
        
        // XP relativa al nivel actual para la barra
        const relativeXpTotal = xpRequired - baseXp;
        const relativeXpCurrent = this.userProgress.current_xp - baseXp;
        // Ajuste defensivo por si los datos no cuadran
        const safeTotal = relativeXpTotal > 0 ? relativeXpTotal : 500;
        const safeCurrent = Math.max(0, this.userProgress.current_xp - baseXp); // Asumimos XP acumulada absoluta

        setText('bpXpText', `${this.userProgress.current_xp} / ${xpRequired} XP Total`);
        
        // Nota: Si usas XP acumulada global en tus datos, el cálculo de % es diferente. 
        // Simplificado para la beta:
        const percent = Math.min(100, Math.max(0, (this.userProgress.current_xp % 500) / 5)); // Hardcodeado para test visual
        document.getElementById('bpHeaderProgressBar').style.width = `${percent}%`;

        // Botón Premium
        updatePremiumButton(isPremium);


        // --- SCROLL CONTAINER ---
        const container = document.getElementById('bpScrollContainer');
        container.innerHTML = ''; 

        levels.forEach(lvl => {
            const isReached = currentLvl >= lvl.lvl;
            
            const col = document.createElement('div');
            col.className = `bp-col ${isReached ? 'reached' : ''}`;
            
            // Fila Premium
            const topBox = createRewardBox(lvl.lvl, 'prem', lvl.prem, isReached, !isPremium);
            topBox.classList.add('prem');
            
            // Centro
            const node = document.createElement('div');
            node.className = "bp-ball";
            node.textContent = lvl.lvl;
            
            const connector = document.createElement('div');
            connector.className = "bp-connector";
            
            // Fila Gratis
            const botBox = createRewardBox(lvl.lvl, 'free', lvl.free, isReached, false);
            botBox.classList.add('free');

            col.append(topBox, connector, node, botBox);
            container.appendChild(col);
        });
        
        // Auto Scroll
        setTimeout(() => {
            const nodes = container.querySelectorAll('.reached');
            if(nodes.length > 0) nodes[nodes.length-1].scrollIntoView({inline: 'center', behavior: 'smooth'});
        }, 100);
    },

    buyLevel: function() {
        const cost = SEASON_CONFIG.LEVEL_COST_GEMS;
        // Aquí validarías contra currencies.gems
        if(confirm(`¿Comprar Nivel ${this.userProgress.current_level + 1} por ${cost} Gemas? (Gratis en Beta)`)) {
            this.userProgress.current_level++;
            this.userProgress.current_xp += 500; // Simulación de salto
            this.render();
            if(typeof showToast === 'function') showToast("¡Nivel Comprado!", "success");
        }
    }
};

// --- HELPERS INTERNOS PARA RENDERIZADO LIMPIO ---

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

function updatePremiumButton(isPremium) {
    const btn = document.getElementById('buyPremiumBtn');
    const modal = document.getElementById('battlePassModal');
    
    if (btn) {
        if (isPremium) {
            btn.style.background = "#2ecc71";
            btn.innerHTML = `<span style="font-size:0.7em">ESTADO</span><span>ACTIVO</span>`;
            btn.disabled = true;
            if (modal) modal.classList.add('premium-active');
        } else {
            btn.style.background = ""; 
            btn.innerHTML = `<span style="font-size:0.7em">ACTIVAR</span><span>DORADO</span>`;
            btn.disabled = false;
            if (modal) modal.classList.remove('premium-active');
        }
    }
}

function createRewardBox(lvlNum, trackType, reward, isLevelReached, isLocked) {
    const box = document.createElement('div');
    box.className = "bp-box";
    const claimKey = `${lvlNum}_${trackType}`;
    
    // Chequeo contra el array de rewards del usuario en BattlePassManager
    const isClaimed = BattlePassManager.userProgress.claimed_rewards.includes(claimKey);

    if (isClaimed) {
        box.style.opacity = "0.5";
        box.innerHTML = `<div style="font-size:20px">✅</div>`;
    } 
    else if (isLocked) {
        box.innerHTML = `
            <div style="font-size:24px; opacity:0.3">${reward.icon}</div>
            <div class="bp-lock">🔒</div>
        `;
    } 
    else if (!isLevelReached) {
        box.innerHTML = `
            <div style="font-size:24px; opacity:0.5; filter:grayscale(1);">${reward.icon}</div>
            <div style="font-size:10px; opacity:0.7">${reward.qty}</div>
        `;
    }
    else {
        // RECLAMABLE
        box.innerHTML = `
            <div style="font-size:28px; animation: pulse-gold 1s infinite">${reward.icon}</div>
            <div style="font-size:11px; font-weight:bold; color:#fff;">${reward.qty}</div>
        `;
        box.classList.add('bp-claimable');
        
        box.onclick = () => {
            // Lógica de reclamo directa
            BattlePassManager.userProgress.claimed_rewards.push(claimKey);
            
            // Sumar recurso real
            if(reward.type === 'oro' && PlayerDataManager?.currentPlayer) 
                PlayerDataManager.currentPlayer.currencies.gold += reward.qty;
            if(reward.type === 'sellos' && PlayerDataManager?.currentPlayer) 
                PlayerDataManager.addWarSeals(reward.qty);

            // Guardar
            if(PlayerDataManager?.saveCurrentPlayer) PlayerDataManager.saveCurrentPlayer();

            // Refrescar
            BattlePassManager.render();
            if(typeof showToast === 'function') showToast(`Recogido: ${reward.qty} ${reward.type}`, "success");
        };
    }
    return box;
}

// LISTENERS UNIFICADOS
document.addEventListener('click', (e) => {
    // Cerrar
    if(e.target.closest('#closeBattlePassBtn')) {
        document.getElementById('battlePassModal').style.display = 'none';
    }
    // Comprar Premium
    if(e.target.closest('#buyPremiumBtn') && !e.target.closest('#buyPremiumBtn').disabled) {
        if(confirm("¿Activar Pase Dorado?")) {
            BattlePassManager.userProgress.is_premium = true;
            BattlePassManager.render();
            if(typeof showToast === 'function') showToast("¡Pase Dorado Activado!", "special");
        }
    }
    // Comprar Niveles
    if(e.target.closest('#buyLevelsBtn')) {
        BattlePassManager.buyLevel();
    }
});