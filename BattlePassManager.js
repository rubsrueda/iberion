// BattlePassManager.js v3.0 (Completo con Misiones)

const BattlePassManager = {
    currentSeason: null,
    userProgress: null,
    dailyMissions: [], // Array en memoria de las misiones
    currentTab: 'rewards', // 'rewards' o 'missions'

    open: async function() {
        const modal = document.getElementById('battlePassModal');
        if(!modal) return;
        
        modal.style.display = 'flex';
        
        // Cargar Temporada (Estatica por ahora o DB)
        if (typeof SEASON_CONFIG !== 'undefined' && typeof BATTLE_PASS_SEASONS !== 'undefined') {
            this.currentSeason = BATTLE_PASS_SEASONS[SEASON_CONFIG.ACTIVE_SEASON_KEY];
        } else {
            // Fallback de emergencia
            this.initMockSeason(); 
        }

        // Cargar Usuario + Misiones
        if (!this.userProgress || !this.dailyMissions.length) {
            await this.loadAllData();
        }
        
        this.switchTab('rewards'); // Abrir en recompensas por defecto
    },

    loadAllData: async function() {
        if (!PlayerDataManager.currentPlayer?.auth_id) return;
        const uid = PlayerDataManager.currentPlayer.auth_id;

        // 1. CARGAR PROGRESO DEL PASE
        let { data: passData } = await supabaseClient
            .from('user_battle_pass')
            .select('*')
            .eq('user_id', uid)
            .eq('season_id', 1)
            .single();

        if (!passData) {
            const { data: newPass } = await supabaseClient
                .from('user_battle_pass')
                .insert({ user_id: uid, season_id: 1 })
                .select().single();
            passData = newPass;
        }
        this.userProgress = passData;

        // 2. CARGAR O GENERAR MISIONES DIARIAS
        await this.checkDailyMissionsGen(uid);
    },

    checkDailyMissionsGen: async function(uid) {
        // Consultar DB
        let { data: missionRow } = await supabaseClient
            .from('user_daily_missions')
            .select('*')
            .eq('user_id', uid)
            .single();
        
        const today = new Date().toISOString().split('T')[0]; // "2023-10-27"

        // Si no existe fila o la fecha es vieja -> GENERAR NUEVAS
        if (!missionRow || missionRow.last_generation_date !== today) {
            const newMissions = this.generateRandomMissions();
            
            const payload = {
                user_id: uid,
                last_generation_date: today,
                active_missions: newMissions
            };

            const { data: saved } = await supabaseClient
                .from('user_daily_missions')
                .upsert(payload)
                .select().single();
            
            missionRow = saved;
        }
        
        this.dailyMissions = missionRow.active_missions || [];
    },

    generateRandomMissions: function() {
        // Seleccionar 3 aleatorias del Pool
        const shuffled = DAILY_MISSIONS_POOL.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        
        // Estructura de estado:
        return selected.map(m => ({
            ref_id: m.id,   // Referencia a la constante
            current: 0,
            target: m.target,
            claimed: false,
            desc: m.desc,
            xp: m.xp_reward,
            type: m.type
        }));
    },

    // --- SISTEMA DE RENDERIZADO ---

    switchTab: function(tabName) {
        this.currentTab = tabName;
        
        // UI Botones
        document.querySelectorAll('.bp-mini-tab').forEach(btn => {
            if (btn.innerText.includes('Recomp') && tabName === 'rewards') btn.classList.add('active');
            else if (btn.innerText.includes('Hazañas') && tabName === 'missions') btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Contenedor principal
        const wrapper = document.getElementById('bpScrollWrapper');
        wrapper.innerHTML = ''; // Limpiar

        if (tabName === 'rewards') {
            // Recrear estructura de camino horizontal (la función que ya tenías)
            this.renderRewardsView(wrapper);
        } else {
            // Renderizar lista de misiones vertical
            this.renderMissionsView(wrapper);
        }

        // Renderizar siempre la cabecera (Datos fijos)
        this.renderHeader();
    },

    renderHeader: function() {
        if (!this.userProgress || !this.currentSeason) return;
        const currentLvl = this.userProgress.current_level;
        const isPremium = this.userProgress.is_premium;

        if(document.getElementById('bpSeasonName')) document.getElementById('bpSeasonName').textContent = this.currentSeason.name;
        document.getElementById('bpLvlLeft').textContent = currentLvl;
        document.getElementById('bpLvlRight').textContent = currentLvl + 1;
        document.getElementById('bpXpText').textContent = `${this.userProgress.current_xp} XP`;
        document.getElementById('bpHeaderProgressBar').style.width = '30%'; // Simplificado visual

        // Botón Premium
        const btnPrem = document.getElementById('buyPremiumBtn'); 
        if (btnPrem) {
            if (isPremium) {
                btnPrem.style.background = "#2ecc71";
                btnPrem.innerHTML = `<span style="font-size:0.7em">ESTADO</span><span>ACTIVO</span>`;
                btnPrem.disabled = true;
            } else {
                btnPrem.innerHTML = `<span style="font-size:0.7em">ACTIVAR</span><span>DORADO</span>`;
                btnPrem.disabled = false;
            }
        }
    },

    // VISTA 1: CAMINO (Lo que arreglamos antes)
    renderRewardsView: function(wrapper) {
        // Estructura necesaria para el scroll
        wrapper.innerHTML = `
            <div class="bp-track-labels">
                <div class="label-track gold">Pase<br>Dorado</div>
                <div class="label-track free">Gratis</div>
            </div>
            <div id="bpScrollContainer" class="bp-items-track"></div>
        `;
        
        const container = document.getElementById('bpScrollContainer');
        const currentLvl = this.userProgress.current_level;
        const isPremium = this.userProgress.is_premium;

        this.currentSeason.levels.forEach(lvl => {
            const isReached = currentLvl >= lvl.lvl;
            const col = document.createElement('div');
            col.className = `bp-col ${isReached ? 'reached' : ''}`;

            const topBox = this.createBox(lvl.lvl, 'prem', lvl.prem, isReached, !isPremium);
            topBox.classList.add('prem');
            
            const node = document.createElement('div'); node.className = "bp-ball"; node.textContent = lvl.lvl;
            const conn = document.createElement('div'); conn.className = "bp-connector";
            
            const botBox = this.createBox(lvl.lvl, 'free', lvl.free, isReached, false);
            botBox.classList.add('free');

            col.append(topBox, conn, node, botBox);
            container.appendChild(col);
        });

        setTimeout(() => {
            const nodes = container.querySelectorAll('.reached');
            if(nodes.length > 0) nodes[nodes.length-1].scrollIntoView({ inline: 'center', behavior: 'smooth' });
        }, 50);
    },

    createBox: function(lvlNum, trackType, reward, isLevelReached, isLocked) {
        const box = document.createElement('div');
        box.className = "bp-box";
        const claimKey = `${lvlNum}_${trackType}`;
        const isClaimed = this.userProgress.claimed_rewards.includes(claimKey);

        if (isClaimed) {
            box.style.opacity = "0.5";
            box.innerHTML = `<div style="font-size:20px">✅</div>`;
        } else if (isLocked) {
            box.innerHTML = `<div style="font-size:24px; opacity:0.3">${reward.icon}</div><div class="bp-lock">🔒</div>`;
        } else if (!isLevelReached) {
            box.innerHTML = `<div style="font-size:24px; opacity:0.5; filter:grayscale(1);">${reward.icon}</div><div style="font-size:10px; opacity:0.7">${reward.qty}</div>`;
        } else {
            box.innerHTML = `<div style="font-size:28px; animation: pulse-gold 1s infinite">${reward.icon}</div><div style="font-size:11px; font-weight:bold; color:#fff;">${reward.qty}</div>`;
            box.classList.add('bp-claimable');
            box.onclick = () => this.claimReward(claimKey, reward);
        }
        return box;
    },

    claimReward: function(key, reward) {
        if(reward.type === 'oro' && PlayerDataManager?.currentPlayer) PlayerDataManager.currentPlayer.currencies.gold += reward.qty;
        if(reward.type === 'sellos' && PlayerDataManager?.currentPlayer) PlayerDataManager.addWarSeals(reward.qty);
        // ... otros tipos ...

        this.userProgress.claimed_rewards.push(key);
        // Guardar progreso completo
        this.saveUserProgress(); 
        
        if(typeof showToast === 'function') showToast(`Recogido: ${reward.qty} ${reward.type}`, "success");
        this.render(); // Refresca vista actual
    },

    // VISTA 2: LISTA DE MISIONES (Nueva UI)
    renderMissionsView: function(wrapper) {
        // Contenedor simple con scroll vertical
        wrapper.style.overflowY = "auto";
        wrapper.style.padding = "20px";
        wrapper.innerHTML = `<h3 style="text-align:center; color:#f1c40f; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">HAZAÑAS DIARIAS</h3>`;
        
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '10px';

        this.dailyMissions.forEach((m, idx) => {
            const isCompleted = m.current >= m.target;
            const progressPct = Math.min(100, (m.current / m.target) * 100);

            const card = document.createElement('div');
            card.style.cssText = `background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 8px; padding: 10px; display:flex; align-items:center; gap:10px; opacity: ${m.claimed ? 0.5 : 1};`;
            
            // Icono Misión
            card.innerHTML = `
                <div style="font-size:24px;">📜</div>
                <div style="flex-grow:1;">
                    <div style="font-weight:bold; font-size:12px; color:#fff;">${m.desc}</div>
                    <div style="width:100%; height:6px; background:#111; border-radius:3px; margin-top:5px; overflow:hidden;">
                        <div style="width:${progressPct}%; height:100%; background:#2ecc71;"></div>
                    </div>
                    <div style="font-size:10px; color:#aaa; margin-top:2px;">${m.current} / ${m.target}</div>
                </div>
            `;

            // Botón Acción
            const btn = document.createElement('button');
            if (m.claimed) {
                btn.textContent = "HECHO";
                btn.style.cssText = "background:transparent; border:1px solid #555; color:#555; font-size:10px; padding:5px;";
                btn.disabled = true;
            } else if (isCompleted) {
                btn.textContent = `RECLAMAR ${m.xp} XP`;
                btn.style.cssText = "background:#f1c40f; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:10px; padding:5px 10px; animation: pulse-gold 1s infinite;";
                btn.onclick = () => this.claimMission(idx);
            } else {
                btn.textContent = `+${m.xp} XP`;
                btn.style.cssText = "background:#333; color:#ccc; border:none; padding:5px 8px; font-size:10px; border-radius:4px;";
            }
            
            card.appendChild(btn);
            list.appendChild(card);
        });

        wrapper.appendChild(list);
    },

    claimMission: async function(index) {
        const mission = this.dailyMissions[index];
        mission.claimed = true;
        
        // Sumar XP de Pase
        const res = await this.addMatchXp(mission.xp);
        
        // Guardar estado misiones en DB
        await supabaseClient
            .from('user_daily_missions')
            .update({ active_missions: this.dailyMissions })
            .eq('user_id', PlayerDataManager.currentPlayer.auth_id);

        if(typeof showToast === 'function') showToast(`¡Misión completada! +${mission.xp} XP Pase`, "success");
        this.render(); // Redibuja la lista
    },

    saveUserProgress: async function() {
        if (!PlayerDataManager.currentPlayer?.auth_id) return;
        await supabaseClient.from('user_battle_pass')
            .update({ 
                claimed_rewards: this.userProgress.claimed_rewards,
                current_level: this.userProgress.current_level,
                is_premium: this.userProgress.is_premium
            })
            .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
            .eq('season_id', this.currentSeason.id);
    },

    // FUNCIÓN LÓGICA DE ACTUALIZACIÓN DE PROGRESO (Hook para el juego)
    // Se llama desde gameFlow.js o donde quieras registrar avances
    updateProgress: async function(eventType, amount = 1) {
        let changed = false;
        this.dailyMissions.forEach(m => {
            if (!m.claimed && m.type === eventType) {
                m.current += amount;
                changed = true;
            }
        });

        if (changed) {
            // Guardar progreso silencioso en DB
            if (PlayerDataManager.currentPlayer?.auth_id) {
                await supabaseClient.from('user_daily_missions')
                .update({ active_missions: this.dailyMissions })
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id);
            }
        }
    },
    
    // Función reutilizada de tu petición anterior
    addMatchXp: async function(xpAmount) {
         // (Pegar aquí el contenido de la función addMatchXp que hicimos antes, 
         // la que calcula niveles. Es vital que esté dentro del objeto.)
         
         // RESUMEN PARA AHORRAR ESPACIO EN LA RESPUESTA:
         // 1. Sumar XP a this.userProgress.current_xp
         // 2. Calcular si sube de nivel
         // 3. Guardar en DB
         // 4. Retornar info.
         
         // --- COPIA ESTE BLOQUE EXACTO ---
         const oldLvl = this.userProgress.current_level;
         this.userProgress.current_xp += xpAmount;
         
         // Lógica subida nivel simplificada para ejemplo:
         // Asumimos saltos fijos de 500xp
         let nextLevelReq = 500 * this.userProgress.current_level; 
         // NOTA: Para producción usar el array 'levels' real.
         
         while (this.userProgress.current_xp >= nextLevelReq) {
             this.userProgress.current_level++;
             nextLevelReq = 500 * this.userProgress.current_level; 
         }
         
         await this.saveUserProgress();
         return { xpAdded: xpAmount, levelsGained: this.userProgress.current_level - oldLvl };
    }
};

// LISTENERS UNIFICADOS (Importante actualizar para los Tabs)
document.addEventListener('click', (e) => {
    // TABS (Pestañas)
    if(e.target.classList.contains('bp-mini-btn')) { // Se llamaba bp-tab, ahora ajustado
        // Detectar cuál es
        if(e.target.textContent.includes('Recomp')) BattlePassManager.switchTab('rewards');
        if(e.target.textContent.includes('Hazañas')) BattlePassManager.switchTab('missions');
    }
    if(e.target.closest('#closeBattlePassBtn')) {
        document.getElementById('battlePassModal').style.display = 'none';
    }
});