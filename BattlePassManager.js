// BattlePassManager.js v3.0 (Completo con Misiones)

console.log("[BattlePassManager] Iniciando carga...");

const BattlePassManager = {
    currentSeason: null,
    userProgress: null,
    dailyMissions: [], // Array en memoria de las misiones
    currentTab: 'rewards', // 'rewards' o 'missions'

    open: async function() {
        const modal = document.getElementById('battlePassModal');
        if(!modal) return;
        
        modal.style.display = 'flex';
        
        // --- CORRECCIÓN DE CARGA DE CONFIGURACIÓN ---
        // Verificamos explícitamente si las constantes existen antes de leerlas
        let activeKey = 'SEASON_1'; // Valor por defecto seguro
        
        if (typeof SEASON_CONFIG !== 'undefined' && SEASON_CONFIG.ACTIVE_SEASON_KEY) {
            activeKey = SEASON_CONFIG.ACTIVE_SEASON_KEY;
        } else {
            console.warn("BattlePassManager: SEASON_CONFIG no encontrado. Usando 'SEASON_1' por defecto.");
        }

        // Cargamos los datos de la temporada
        if (typeof BATTLE_PASS_SEASONS !== 'undefined' && BATTLE_PASS_SEASONS[activeKey]) {
            this.currentSeason = BATTLE_PASS_SEASONS[activeKey];
        } else {
            console.error(`BattlePassManager CRÍTICO: No se encontraron datos para la temporada '${activeKey}' en seasonsData.js`);
            // Detenemos aquí para no pintar sobre vacío
            return;
        }

        // Cargar Usuario + Misiones (Tu lógica original)
        // SIEMPRE recargar para asegurar sincronización
        await this.loadAllData();
        
        // --- PARCHE DE SEGURIDAD VISUAL ---
        // Si la carga de datos falló (ej: red lenta), inicializamos un objeto vacío
        // para que la ventana se dibuje aunque sea con datos a cero.
        if (!this.userProgress) {
            this.userProgress = { 
                current_level: 1, 
                current_xp: 0, 
                is_premium: false, 
                claimed_rewards: [] 
            };
        }

        // Renderizado
        this.renderHeader();
        this.switchTab('rewards'); 
    },

    loadAllData: async function() {
        // Verificar si el usuario está autenticado
        if (!PlayerDataManager.currentPlayer?.auth_id) {
            console.warn("[BattlePassManager] Usuario no autenticado. Usando datos locales.");
            
            // Intentar cargar desde localStorage
            const localData = localStorage.getItem('battlePassProgress');
            if (localData) {
                try {
                    this.userProgress = JSON.parse(localData);
                    console.log("[BattlePassManager] Datos cargados desde localStorage.");
                } catch (e) {
                    console.error("Error al parsear datos locales:", e);
                }
            }
            
            // Si no hay datos locales, crear estructura inicial
            if (!this.userProgress) {
                this.userProgress = {
                    user_id: 'local_user',
                    season_id: 1,
                    current_level: 1,
                    current_xp: 0,
                    is_premium: false,
                    claimed_rewards: []
                };
                localStorage.setItem('battlePassProgress', JSON.stringify(this.userProgress));
            }
            
            // Inicializar misiones vacías
            this.dailyMissions = [];
            return;
        }
        
        const uid = PlayerDataManager.currentPlayer.auth_id;

        // 1. CARGAR PROGRESO DEL PASE
        let { data: passData } = await supabaseClient
            .from('user_battle_pass')
            .select('*')
            .eq('user_id', uid)
            .eq('season_id', 1)
            .single();

        if (!passData) {
            console.log("[BattlePassManager] Creando nuevo registro de pase para usuario.");
            const { data: newPass } = await supabaseClient
                .from('user_battle_pass')
                .insert({ 
                    user_id: uid, 
                    season_id: 1,
                    current_level: 1,
                    current_xp: 0,
                    is_premium: false,
                    claimed_rewards: []
                })
                .select().single();
            passData = newPass;
        }
        this.userProgress = passData;

        if (this.userProgress && !this.userProgress.claimed_rewards) {
            this.userProgress.claimed_rewards = [];
        }
        
        console.log("[BattlePassManager] Progreso cargado:", this.userProgress);

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

    switchTab: function(tabName) {
        this.currentTab = tabName;
        
        // 1. Obtener el contenedor del carril (Scroll)
        const trackContainer = document.getElementById('bpScrollContainer');
        
        if (!trackContainer) { 
            console.error("Error: No se encontró #bpScrollContainer en el HTML"); 
            return; 
        }

        trackContainer.innerHTML = ''; // Limpiar lo que hubiera antes

        if (tabName === 'rewards') {
            // Dibujar el camino
            this.renderRewardsView(trackContainer);
        } else {
            // Placeholder para misiones
            trackContainer.innerHTML = "<div style='color:white; padding:20px; width:100%; text-align:center;'>Misiones disponibles próximamente.</div>";
        }
    },

    render: function() {
        // Método conveniente que renderiza header y tab actual
        this.renderHeader();
        this.switchTab(this.currentTab);
    },
    
    renderHeader: function() {
        // Aseguramos que existan los datos mínimos para pintar, si no, salimos
        if (!this.userProgress || !this.currentSeason) return;

        // CORRECCIÓN: Auto-avance de nivel al renderizar
        // Verificar si el XP actual debería estar en un nivel superior
        if (this.currentSeason.levels) {
            let correctLevel = 1;
            for (const level of this.currentSeason.levels) {
                if (this.userProgress.current_xp >= level.req_xp) {
                    correctLevel = level.lvl;
                } else {
                    break;
                }
            }
            
            // Si detectamos que el nivel no coincide, lo corregimos automáticamente
            if (correctLevel > this.userProgress.current_level) {
                console.log(`[BattlePassManager] Auto-corrección de nivel: ${this.userProgress.current_level} → ${correctLevel}`);
                this.userProgress.current_level = correctLevel;
                // Guardar inmediatamente
                this.saveUserProgress();
            }
        }

        const currentLvl = this.userProgress.current_level;
        const isPremium = this.userProgress.is_premium;
        
        // 1. Textos Generales
        if(document.getElementById('bpSeasonName')) document.getElementById('bpSeasonName').textContent = this.currentSeason.name;
        if(document.getElementById('bpLvlLeft')) document.getElementById('bpLvlLeft').textContent = currentLvl;
        if(document.getElementById('bpLvlRight')) document.getElementById('bpLvlRight').textContent = currentLvl + 1;
        
        // 2. Barra de XP y Botón de Compra de Niveles (+)
        const xpTextEl = document.getElementById('bpXpText');
        if(xpTextEl) {
            xpTextEl.innerHTML = `${this.userProgress.current_xp} XP <button id="btnBuyXP" class="bp-buy-xp-btn">+</button>`;
            // Listener para comprar niveles
            document.getElementById('btnBuyXP').onclick = (e) => {
                e.stopPropagation();
                this.showXpPurchaseOptions();
            };
        }

        // 3. Barra de Progreso Visual (Header)
        // CORRECCIÓN: Usar datos reales de la temporada en lugar de asumir 500xp
        let prevLvlReq = 0;
        let nextLvlReq = 500;
        
        if (this.currentSeason.levels) {
            const currentLevelData = this.currentSeason.levels.find(l => l.lvl === currentLvl);
            const nextLevelData = this.currentSeason.levels.find(l => l.lvl === currentLvl + 1);
            
            if (currentLevelData) prevLvlReq = currentLevelData.req_xp;
            if (nextLevelData) nextLvlReq = nextLevelData.req_xp;
        }
        
        const progressInLevel = this.userProgress.current_xp - prevLvlReq;
        const xpNeededForNext = nextLvlReq - prevLvlReq;
        const percent = Math.min(100, Math.max(0, (progressInLevel / xpNeededForNext) * 100));
        
        const progressBar = document.getElementById('bpHeaderProgressBar');
        if (progressBar) progressBar.style.width = `${percent}%`;

        // 4. Timer
        if (this.currentSeason.endDate) {
            const end = new Date(this.currentSeason.endDate);
            const now = new Date();
            const diff = end - now;
            
            // CORRECCIÓN: Cálculo correcto de días (dividir entre milisegundos en un día)
            const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            
            if(document.getElementById('bpSeasonTimer')) {
                document.getElementById('bpSeasonTimer').textContent = `${daysRemaining} días restantes`;
            }
        }

        // 5. >>> CORRECCIÓN: BOTÓN "ACTIVAR DORADO" <<<
        const premiumBtn = document.getElementById('buyPremiumBtn');
        if (premiumBtn) {
            if (isPremium) {
                // Si ya lo tiene, cambiamos el estilo
                premiumBtn.textContent = "✓ PASE ACTIVO";
                premiumBtn.classList.add('active-pass-btn'); // (Estilo opcional)
                premiumBtn.style.background = "#2ecc71";
                premiumBtn.style.cursor = "default";
                premiumBtn.onclick = null; // Quitar click
            } else {
                // Si no lo tiene, conectamos a la Tienda
                premiumBtn.textContent = "ACTIVAR DORADO";
                premiumBtn.style.background = "linear-gradient(180deg, #f1c40f, #ff8c00)";
                premiumBtn.style.cursor = "pointer";
                
                premiumBtn.onclick = () => {
                    // Cierra el modal del pase para que no estorbe
                    document.getElementById('battlePassModal').style.display = 'none';
                    // Abre la simulación de compra directa del item 'battle_pass_s1'
                    if (typeof StoreManager !== 'undefined') {
                        StoreManager.buyWithRealMoney('battle_pass_s1');
                    } else {
                        console.error("StoreManager no encontrado.");
                    }
                };
            }
        }
    },

    // --- Mostrar opciones de compra ---
    showXpPurchaseOptions: function() {
        // Creamos un modal flotante rápido con JS (para no ensuciar el HTML)
        const overlay = document.createElement('div');
        overlay.id = 'xpPurchaseOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 20050;
            display: flex; align-items: center; justify-content: center;
        `;
        
        overlay.innerHTML = `
            <div style="background: #2c3e50; padding: 20px; border: 2px solid #f1c40f; border-radius: 10px; text-align: center; color: white; min-width: 300px;">
                <h3 style="color: #f1c40f; margin-top: 0;">COMPRAR 1 NIVEL (500 XP)</h3>
                <p>Acelera tu progreso en la temporada.</p>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button id="buyXpGems" style="background: #3498db; border: 1px solid #2980b9; color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        150 💎
                    </button>
                    <button id="buyXpGold" style="background: #f1c40f; border: 1px solid #d4ac0d; color: #3e2723; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        3,000 💰
                    </button>
                </div>
                <button id="cancelXpBuy" style="margin-top: 15px; background: transparent; border: none; color: #aaa; cursor: pointer; text-decoration: underline;">Cancelar</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Listeners del modal temporal
        document.getElementById('buyXpGems').onclick = () => { this.processXpPurchase('gems'); document.body.removeChild(overlay); };
        document.getElementById('buyXpGold').onclick = () => { this.processXpPurchase('gold'); document.body.removeChild(overlay); };
        document.getElementById('cancelXpBuy').onclick = () => document.body.removeChild(overlay);
    },

    // --- Procesar la compra ---
    processXpPurchase: async function(currency) {
        const COST_GEMS = 150;
        const COST_GOLD = 3000;
        const XP_AMOUNT = 500; // Cantidad estándar para subir 1 nivel aprox

        const player = PlayerDataManager.currentPlayer;
        
        if (currency === 'gems') {
            if (player.currencies.gems >= COST_GEMS) {
                player.currencies.gems -= COST_GEMS;
                this.executeXpAdd(XP_AMOUNT, "💎");
            } else {
                if(typeof showToast === 'function') showToast("Gemas insuficientes.", "error");
            }
        } else if (currency === 'gold') {
            if (player.currencies.gold >= COST_GOLD) {
                player.currencies.gold -= COST_GOLD;
                this.executeXpAdd(XP_AMOUNT, "💰");
            } else {
                if(typeof showToast === 'function') showToast("Oro insuficiente.", "error");
            }
        }
    },

    executeXpAdd: async function(amount, icon) {
        // Guardar el gasto de moneda
        await PlayerDataManager.saveCurrentPlayer();
        
        // Sumar la XP (esto también recalcula nivel y guarda el pase)
        const result = await this.addMatchXp(amount);
        
        if (typeof showToast === 'function') showToast(`Compra exitosa: +${amount} XP ${icon}`, "success");
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('ui_click');
        
        // Refrescar la UI
        this.renderHeader();
        this.render(); // Refrescar el camino visual
    },

    // VISTA 1: CAMINO (Lo que arreglamos antes)
    renderRewardsView: function(container) {
        if (!this.currentSeason || !this.currentSeason.levels) return;

        const currentLvl = this.userProgress.current_level;
        const isPremium = this.userProgress.is_premium;

        // Iterar sobre los niveles cargados desde seasonsData.js
        this.currentSeason.levels.forEach(lvl => {
            const isReached = currentLvl >= lvl.lvl;
            
            // Crear la columna vertical
            const col = document.createElement('div');
            col.className = `bp-col ${isReached ? 'reached' : ''}`;

            // --- FILA SUPERIOR (Premium) ---
            // Nota: Pasamos el objeto 'lvl.prem' que contiene {icon: '...', qty: ...}
            const topBox = this.createBox(lvl.lvl, 'prem', lvl.prem, isReached, !isPremium);
            topBox.classList.add('prem');
            
            // --- CENTRO (Conector y Bola) ---
            const node = document.createElement('div'); 
            node.className = "bp-ball"; 
            node.textContent = lvl.lvl;
            
            const conn = document.createElement('div'); 
            conn.className = "bp-connector";
            
            // --- FILA INFERIOR (Gratis) ---
            const botBox = this.createBox(lvl.lvl, 'free', lvl.free, isReached, false);
            botBox.classList.add('free');

            // Ensamblar
            col.append(topBox, conn, node, botBox);
            container.appendChild(col);
        });

        // Auto-scroll al final (o al nivel actual)
        setTimeout(() => {
            // Intentar buscar el último alcanzado
            const reachedNodes = container.querySelectorAll('.reached');
            if(reachedNodes.length > 0) {
                reachedNodes[reachedNodes.length-1].scrollIntoView({ inline: 'center', behavior: 'smooth' });
            }
        }, 100);
    },

    createBox: function(lvlNum, trackType, reward, isLevelReached, isLocked) {
        const box = document.createElement('div');
        box.className = "bp-box";
        
        // Clave única para saber si ya se reclamó (ej: "1_free")
        const claimKey = `${lvlNum}_${trackType}`;
        const isClaimed = this.userProgress.claimed_rewards && this.userProgress.claimed_rewards.includes(claimKey);

        // Icono: Usar el del JSON o un interrogante por defecto
        const iconDisplay = reward.icon || '📦';

        if (isClaimed) {
            // Estado: Reclamado
            box.style.opacity = "0.5";
            box.innerHTML = `<div style="font-size:20px">✅</div>`;
            
        } else if (isLocked) {
            // Estado: Bloqueado (Solo Premium sin comprar)
            box.innerHTML = `
                <div style="font-size:24px; opacity:0.3">${iconDisplay}</div>
                <div class="bp-lock">🔒</div>`;
                
        } else if (!isLevelReached) {
            // Estado: Aún no alcanzado (Gris)
            box.innerHTML = `
                <div style="font-size:24px; opacity:0.5; filter:grayscale(1);">${iconDisplay}</div>
                <div style="font-size:10px; opacity:0.7; color:#aaa;">${reward.qty}</div>`;
                
        } else {
            // Estado: ¡LISTO PARA RECLAMAR! (Brillante)
            box.classList.add('bp-claimable'); // Activa la animación CSS
            box.innerHTML = `
                <div style="font-size:28px;">${iconDisplay}</div>
                <div style="font-size:11px; font-weight:bold; color:#fff;">${reward.qty}</div>`;
            
            // Añadir evento de clic
            box.onclick = () => this.claimReward(claimKey, reward);
        }
        return box;
    },

    claimReward: function(key, reward) {
        // Entregar recursos
        if(reward.type === 'oro' && PlayerDataManager?.currentPlayer) PlayerDataManager.currentPlayer.currencies.gold += reward.qty;
        if(reward.type === 'sellos' && PlayerDataManager?.currentPlayer) PlayerDataManager.addWarSeals(reward.qty);
        if(reward.type === 'madera' && gameState.playerResources[1]) gameState.playerResources[1].madera += reward.qty; // Ejemplo recursos blandos
        // ... (resto de lógica de entrega) ...

        // --- CORRECCIÓN AQUÍ (BLINDAJE DE ARRAY) ---
        // Si la lista no existe (es null), la creamos como vacía antes de empujar nada.
        if (!this.userProgress.claimed_rewards) {
            this.userProgress.claimed_rewards = [];
        }
        
        this.userProgress.claimed_rewards.push(key);
        // -------------------------------------------

        // Guardar progreso completo
        this.saveUserProgress(); 
        
        if(typeof showToast === 'function') showToast(`Recogido: ${reward.qty} ${reward.type}`, "success");
        
        // Refrescar vista actual usando switchTab para asegurar redibujado
        this.switchTab('rewards'); 
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
        try {
            if (!PlayerDataManager.currentPlayer?.auth_id) {
                console.warn("[BattlePassManager] No hay usuario autenticado. Guardando en localStorage.");
                // Fallback a localStorage para debug
                localStorage.setItem('battlePassProgress', JSON.stringify(this.userProgress));
                return;
            }

            // --- Carga de seguridad si la temporada no está inicializada ---
            if (!this.currentSeason) {
                const activeKey = (typeof SEASON_CONFIG !== 'undefined') ? SEASON_CONFIG.ACTIVE_SEASON_KEY : 'SEASON_1';
                this.currentSeason = BATTLE_PASS_SEASONS[activeKey];
                
                if (!this.currentSeason) {
                    console.warn("[BattlePassManager] No se pudo cargar la temporada para guardar progreso.");
                    return;
                }
            }
            
            const seasonId = this.currentSeason.id || 1;
            
            const { error } = await supabaseClient.from('user_battle_pass')
                .update({ 
                    claimed_rewards: this.userProgress.claimed_rewards || [],
                    current_level: this.userProgress.current_level || 1,
                    current_xp: this.userProgress.current_xp || 0,
                    is_premium: this.userProgress.is_premium || false
                })
                .eq('user_id', PlayerDataManager.currentPlayer.auth_id)
                .eq('season_id', seasonId);
            
            if (error) {
                console.error("[BattlePassManager] Error al guardar en Supabase:", error);
                // Guardar localmente como respaldo
                localStorage.setItem('battlePassProgress', JSON.stringify(this.userProgress));
            } else {
                console.log("[BattlePassManager] Progreso guardado exitosamente en Supabase.");
            }
        } catch (error) {
            console.error("[BattlePassManager] Error en saveUserProgress:", error);
            localStorage.setItem('battlePassProgress', JSON.stringify(this.userProgress));
        }
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
         try {
             // Validación de seguridad
             if (!this.userProgress) {
                 console.warn("[BattlePassManager] userProgress no inicializado. Cargando datos...");
                 await this.loadAllData();
                 if (!this.userProgress) {
                     console.error("[BattlePassManager] No se pudo inicializar userProgress.");
                     return { xpAdded: 0, levelsGained: 0, currentLevel: 1, success: false };
                 }
             }

             const oldLvl = this.userProgress.current_level;
             const oldXp = this.userProgress.current_xp;
             this.userProgress.current_xp += xpAmount;
             
             // Usar datos reales de temporada si existen
             let leveledUp = false;
             if (this.currentSeason && this.currentSeason.levels) {
                 // Encontrar el nivel actual basado en el XP
                 let newLevel = oldLvl;
                 for (const level of this.currentSeason.levels) {
                     if (this.userProgress.current_xp >= level.req_xp) {
                         newLevel = level.lvl;
                     } else {
                         break;
                     }
                 }
                 
                 if (newLevel > oldLvl) {
                     this.userProgress.current_level = newLevel;
                     leveledUp = true;
                 }
             }
             
             // Guardar en DB y en PlayerDataManager
             await this.saveUserProgress();
             
             // Actualizar en PlayerDataManager también
             if (PlayerDataManager.currentPlayer) {
                 if (!PlayerDataManager.currentPlayer.battlePass) {
                     PlayerDataManager.currentPlayer.battlePass = {};
                 }
                 PlayerDataManager.currentPlayer.battlePass.current_xp = this.userProgress.current_xp;
                 PlayerDataManager.currentPlayer.battlePass.current_level = this.userProgress.current_level;
                 PlayerDataManager.currentPlayer.battlePass.is_premium = this.userProgress.is_premium;
                 await PlayerDataManager.saveCurrentPlayer();
             }
             
             console.log(`[BattlePassManager] XP agregado: +${xpAmount}. XP Total: ${oldXp} → ${this.userProgress.current_xp}. Nivel: ${oldLvl} → ${this.userProgress.current_level}`);
             
             // Actualizar visualización si el modal está abierto
             const modal = document.getElementById('battlePassModal');
             if (modal && modal.style.display === 'flex') {
                 this.renderHeader();
             }
             
             return { 
                 xpAdded: xpAmount, 
                 levelsGained: this.userProgress.current_level - oldLvl,
                 currentLevel: this.userProgress.current_level,
                 success: true
             };
         } catch (error) {
             console.error("[BattlePassManager] Error en addMatchXp:", error);
             return { xpAdded: 0, levelsGained: 0, currentLevel: 1, success: false, error: error.message };
         }
    },

    //Activar el Premium
    activatePremium: async function() {
        if (!this.userProgress) {
            await this.loadAllData();
        }
        
        this.userProgress.is_premium = true;
        await this.saveUserProgress();
        
        // Guardar en PlayerDataManager también
        if (PlayerDataManager.currentPlayer) {
            if (!PlayerDataManager.currentPlayer.battlePass) {
                PlayerDataManager.currentPlayer.battlePass = {};
            }
            PlayerDataManager.currentPlayer.battlePass.is_premium = true;
            await PlayerDataManager.saveCurrentPlayer();
        }
        
        this.renderHeader();      // Actualiza la cabecera
        this.switchTab('rewards');// Redibuja el camino de premios
        // -----------------------
        
        if(typeof showToast === 'function') showToast("¡Pase Premium Desbloqueado!", "success");
    },
};

console.log("[BattlePassManager] Carga completada. Objeto definido:", typeof BattlePassManager);

// LISTENERS UNIFICADOS (Importante actualizar para los Tabs)
document.addEventListener('click', (e) => {
    if (!e.target) return; // Seguridad
    
    // TABS (Pestañas)
    if (e.target.classList && e.target.classList.contains('bp-mini-btn')) {
        // Detectar cuál es
        if (e.target.textContent.includes('Recomp')) {
            if (typeof BattlePassManager !== 'undefined') BattlePassManager.switchTab('rewards');
        }
        if (e.target.textContent.includes('Hazañas')) {
            if (typeof BattlePassManager !== 'undefined') BattlePassManager.switchTab('missions');
        }
    }
    
    const closeBtn = e.target.closest ? e.target.closest('#closeBattlePassBtn') : null;
    if (closeBtn) {
        const modal = document.getElementById('battlePassModal');
        if (modal) modal.style.display = 'none';
    }
});