// playerDataManager.js (SINCRONIZADO CON NUBE)

function getXpForNextLevel(currentLevel) {
    if (currentLevel >= HERO_PROGRESSION_CONFIG.MAX_LEVEL) {
        return 'Max';
    }
    const { BASE_XP, POWER } = HERO_PROGRESSION_CONFIG;
    const xpNeeded = Math.floor(BASE_XP * Math.pow(currentLevel, POWER));
    return xpNeeded === 0 ? BASE_XP : xpNeeded;
}

const PlayerDataManager = {
    currentPlayer: null,

    loginWithGoogle: async function() {
    // Detecta automáticamente si estás en LOCAL o en GITHUB
        const siteUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: siteUrl
            }
        });

        if (error) {
            logMessage("Error al conectar con Google: " + error.message, "error");
        }
    },

    // respuesta de Google
    // Busca initAuthListener en playerDataManager.js y cámbiala por esta:
    initAuthListener: function() {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Evento Supabase detectado:", event);

            if (session && session.user) {
                const userId = session.user.id;

                // 🛡️ ESCUDO: Si ya tenemos el jugador cargado y es el mismo ID,
                // NO descargues nada de la nube. Deja que el flujo local mande.
                if (this.currentPlayer && this.currentPlayer.auth_id === userId) {
                    console.log("Refresco de sesión detectado. Escudo activo: No se sobreescribirán los datos locales.");
                    return;
                }

                // Solo entramos aquí si es la PRIMERA vez que carga o si no hay datos en memoria
                console.log("Carga inicial o cambio de usuario. Buscando perfil...");
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('profile_data')
                    .eq('id', userId)
                    .maybeSingle();

                if (profile && profile.profile_data) {
                    this.currentPlayer = profile.profile_data;
                    this.currentPlayer.auth_id = userId;
                    console.log("✅ Perfil recuperado de la nube correctamente.");
                    
                    // Verificar recompensas pendientes de raids
                    if (typeof RaidManager !== 'undefined' && RaidManager.checkPendingRewards) {
                        setTimeout(() => {
                            RaidManager.checkPendingRewards().catch(err => 
                                console.error("[Login] Error verificando recompensas:", err)
                            );
                        }, 2000); // Esperar 2s para que todo se cargue
                    }
                } else {
                    console.log("Creando nuevo perfil de General...");
                    const username = session.user.email.split('@')[0];
                    this.currentPlayer = this.createNewPlayer(username, "google-auth");
                    this.currentPlayer.auth_id = userId;
                    await this.saveCurrentPlayer();
                }

                if (typeof showMainMenu === "function") showMainMenu();
            }
        });
    },

    // Función de "hash" simple para no guardar contraseñas en texto plano.
    // En un entorno real, esto sería una librería criptográfica.
    _hash: function(str) {
        return btoa(str);
    },

    /**
     * (NUEVO Y MEJORADO) Intenta iniciar sesión en Supabase o crear un usuario.
     */
    login: async function(email, password) { // <--- Convertida a ASYNC para Supabase
        if (!email || !password) {
            return { success: false, message: "Email y contraseña no pueden estar vacíos." };
        }

        // 1. Intentamos entrar en Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // 2. Si el usuario no existe, intentamos registrarlo
        if (authError) {
            if (authError.message.includes("Invalid login credentials")) {
                if (confirm(`No existe una cuenta con este email. ¿Quieres crear un nuevo perfil de General?`)) {
                    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password,
                    });

                    if (signUpError) return { success: false, message: "Error al registrar: " + signUpError.message };

                    // Creamos el perfil inicial
                    const username = email.split('@')[0];
                    this.currentPlayer = this.createNewPlayer(username, password);
                    this.currentPlayer.auth_id = signUpData.user.id;
                    
                    await this.saveCurrentPlayer();
                    return { success: true, message: "Perfil creado. Revisa tu email para confirmar." };
                }
                return { success: false, message: "Acceso cancelado." };
            }
            return { success: false, message: authError.message };
        }

        // El listener (initAuthListener) se encargará de cargar los datos de la nube
        return { success: true, message: "Iniciando sesión..." };
    },
    
    /**
     * (NUEVO) Carga un perfil sin validación de contraseña, para el auto-login.
     */
    autoLogin: function(username) {
        const playerDataKey = `player_${username.trim().toLowerCase()}`;
        let playerDataString = localStorage.getItem(playerDataKey);
        if(playerDataString){
            this.currentPlayer = JSON.parse(playerDataString);
            return true;
        }
        return false;
    },

    logout: async function() { // <--- Convertida a ASYNC para Supabase

        this.saveCurrentPlayer(); 

        await supabaseClient.auth.signOut();
        this.currentPlayer = null;
        localStorage.removeItem('lastUser');
        console.log("Sesión cerrada.");
    },

    createNewPlayer: function(username, password) {
        return {
            username: username.trim(),
            credentials: {
                passwordHash: this._hash(password)
            },
            stats: { battlesWon: 0, battlesLost: 0, campaignsCompleted: 0 },
            // (MODIFICADO) Añadimos la nueva moneda
            currencies: { gold: 500, gems: 100, edicts: 10, influence: 0, sellos_guerra: 10 },
            heroes: [{ 
                id: "g_fabius", 
                level: 1, 
                xp: 0, 
                stars: 1, 
                fragments: 0, 
                skill_levels: [1, 0, 0, 0], // Habilidad 1 (nivel 1), Habilidades 2, 3, 4 (nivel 0)
                skill_points_unspent: 0, 
                talent_points_unspent: 1,
                // <<== NUEVO: Objeto de equipo del héroe
                equipment: {
                    head: null, weapon: null, chest: null,
                    legs: null, gloves: null, boots: null
                }
            }],
            inventory: { 
                xp_books: 10, 
                ascension_materials: {},
                equipment: [], // El inventario de equipo completo
                equipment_fragments: {} // El inventario de fragmentos
            },
            // (NUEVO) Añadimos el objeto para rastrear el pity system del gacha
            gacha_state: {
                pulls_since_last_legendary: 0,
                pulls_since_last_epic: 0
            }
        };
    },

    /**
     * (NUEVO) Añade fragmentos de una pieza de equipo al inventario del jugador.
     */
    addEquipmentFragments: function(itemId, amount) {
        if (!this.currentPlayer) return;
        
        const inventory = this.currentPlayer.inventory;
        if (!inventory.equipment_fragments) {
            inventory.equipment_fragments = {};
        }

        inventory.equipment_fragments[itemId] = (inventory.equipment_fragments[itemId] || 0) + amount;
        
        const itemDef = EQUIPMENT_DEFINITIONS[itemId];
        logMessage(`Has obtenido ${amount} fragmentos de [${itemDef.rarity}] ${itemDef.name}.`);

        this.saveCurrentPlayer();
    },
    
    addFragmentsToHero: function(heroId, amount) {
        if (!this.currentPlayer) return;

        let heroInstance = this.currentPlayer.heroes.find(h => h.id === heroId);
        
        // Si el jugador no tiene al héroe en absoluto (ni siquiera como "fantasma")
        if (!heroInstance) {
            console.log(`Creando nueva entrada "fantasma" para ${heroId}`);
            heroInstance = {
                id: heroId,
                level: 0,
                xp: 0,
                stars: 0,
                fragments: 0, 
                skill_levels: [0, 0, 0, 0], // Inicializar a 0
                skill_points_unspent: 0,
                talent_points_unspent: 0,
                talents: {},
                // <<== CORRECCIÓN CLAVE: Añadir el objeto de equipo aquí ==>>
                equipment: {
                    head: null, weapon: null, chest: null,
                    legs: null, gloves: null, boots: null
                }
            };
            this.currentPlayer.heroes.push(heroInstance);
        }
        
        if (typeof heroInstance.fragments === 'undefined') {
            heroInstance.fragments = 0;
        }
        
        heroInstance.fragments += amount;
        logMessage(`Has obtenido ${amount} fragmentos de ${COMMANDERS[heroId].name}. Total: ${heroInstance.fragments}.`);
        
        this.saveCurrentPlayer();
    },

    useXpBook: function(heroId) {
        if (!this.currentPlayer) return;
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero || (this.currentPlayer.inventory.xp_books || 0) <= 0 || hero.level >= HERO_PROGRESSION_CONFIG.MAX_LEVEL) {
            return;
        }
        this.currentPlayer.inventory.xp_books--;
        hero.xp += HERO_PROGRESSION_CONFIG.XP_PER_BOOK;

        let xpNeeded = getXpForNextLevel(hero.level);
        while (xpNeeded !== 'Max' && hero.xp >= xpNeeded) {
            hero.level++;
            hero.xp -= xpNeeded; 
            
            // --- INICIALIZACIÓN SEGURA DE PUNTOS ---
            if (typeof hero.skill_points_unspent !== 'number') hero.skill_points_unspent = 0;
            if (typeof hero.talent_points_unspent !== 'number') hero.talent_points_unspent = 0;

            // 1. Puntos de Talento: Se otorga 1 en CADA nivel.
            hero.talent_points_unspent += 1;
            let logMessageText = `¡${COMMANDERS[hero.id].name} ha subido al nivel ${hero.level}! Ganas +1 Punto de Talento.`;

            // 2. Puntos de Habilidad: Se otorga 1 SÓLO en niveles pares.
            if (hero.level % 2 === 0) {
                hero.skill_points_unspent += 1;
                logMessageText += ` Y +1 Punto de Habilidad.`;
            }
            
            logMessage(logMessageText, 'success');
            xpNeeded = getXpForNextLevel(hero.level);
        }
        this.saveCurrentPlayer();
    },

    upgradeHeroSkill: function(heroId, skillIndex) {
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero || (hero.skill_points_unspent || 0) <= 0) {
            logMessage("No tienes puntos de habilidad para gastar.", "warning");
            return false;
        }
        if (!Array.isArray(hero.skill_levels)) hero.skill_levels = [1, 0, 0, 0];
        const currentLevel = hero.skill_levels[skillIndex] || 0;
        if (currentLevel >= 5) return false;
        const starsRequired = skillIndex + 1;
        if (hero.stars < starsRequired) return false;

        hero.skill_points_unspent--; 
        hero.skill_levels[skillIndex]++;
        
        this.saveCurrentPlayer();
        logMessage(`¡Habilidad mejorada a nivel ${hero.skill_levels[skillIndex]}!`, "success");
        return true;
    },
    
    spendTalentPoint: function(heroId, talentId) {
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero || (hero.talent_points_unspent || 0) <= 0) {
            logMessage("No tienes puntos de talento para gastar.", "warning");
            return false;
        }
        const talentDef = TALENT_DEFINITIONS[talentId];
        if (typeof hero.talents !== 'object' || hero.talents === null) hero.talents = {};
        const currentLevel = hero.talents[talentId] || 0;
        if (!talentDef || currentLevel >= talentDef.maxLevels) return false;
        
        hero.talent_points_unspent--;
        hero.talents[talentId] = currentLevel + 1;
        
        this.saveCurrentPlayer();
        logMessage(`Has aprendido "${talentDef.name}"`);
        return true;
    },

    resetTalents: function(heroId) {
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        const cost = 500;
        if (!hero) return false;
        let resourceSource = (gameState && gameState.playerResources) ? gameState.playerResources[gameState.currentPlayer] : this.currentPlayer.currencies;
        if (!resourceSource || (resourceSource.oro || 0) < cost) {
            logMessage(`Oro insuficiente.`, "warning");
            return false;
        }
        resourceSource.oro -= cost;

        const totalPointsSpent = hero.talents ? Object.values(hero.talents).reduce((sum, level) => sum + level, 0) : 0;
        
        hero.talent_points_unspent = (hero.talent_points_unspent || 0) + totalPointsSpent;
        hero.talents = {};
        
        this.saveCurrentPlayer();
        logMessage(`Talentos reiniciados. Puntos recuperados: ${totalPointsSpent}.`, "success");
        return true;
    },

    evolveHero: function(heroId) {
        if (!this.currentPlayer) return;
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero) return;

        const isUnlocking = hero.stars === 0;
        const nextStar = hero.stars + 1;
        const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar];

        if (!fragmentsNeeded) return;

        if ((hero.fragments || 0) >= fragmentsNeeded) {
            hero.fragments -= fragmentsNeeded;
            hero.stars = nextStar;
            const newSkillIndex = hero.stars - 1; 

            if (!Array.isArray(hero.skill_levels)) {
                hero.skill_levels = [0, 0, 0, 0];
            }

            if (hero.skill_levels[newSkillIndex] === 0) {
                hero.skill_levels[newSkillIndex] = 1;
            }

            if (isUnlocking) {
                hero.level = 1;
                hero.xp = 0;
                hero.skill_levels[0] = 1; 
                hero.talent_points_unspent = 1;
                if(!hero.talents) hero.talents = {};
            }
            this.saveCurrentPlayer();
        }
    },
    
    saveCurrentPlayer: async function() {
        // Validación de seguridad
        if (!this.currentPlayer || !this.currentPlayer.auth_id) {
            console.warn("[Save] No hay jugador activo o ID para guardar.");
            return;
        }

        try {
            const p = this.currentPlayer;
            const uid = p.auth_id;

            // DIAGNÓSTICO
            console.log(`[Cloud Save] Guardando ID: ${uid} | Alianza: ${p.alliance_id}`);

            // Preparamos el paquete forzando tipos y columnas externas
            const cleanPayload = {
                id: uid,
                username: p.username || "Jugador",
                last_sync: new Date().toISOString(),
                
                // COLUMNAS EXTERNAS (Para Ranking y Alianzas)
                level: parseInt(p.level || 1),
                xp: parseInt(p.xp || 0),
                total_wins: parseInt(p.total_wins || 0),
                total_kills: parseInt(p.total_kills || 0),
                avatar_url: p.avatar_url || '🎖️',
                
                // --- CORRECCIÓN CRÍTICA: Guardar ID de Alianza en columna externa ---
                alliance_id: p.alliance_id || null, 
                // -------------------------------------------------------------------

                // EL JSON COMPLETO (Datos internos)
                profile_data: p 
            };

            // Ejecutamos la llamada a Supabase
            const { data, error } = await supabaseClient
                .from('profiles')
                .upsert(cleanPayload, { onConflict: 'id' })
                .select();

            if (error) {
                console.error("❌ ERROR CRÍTICO GUARDANDO EN NUBE:", error);
                console.error("Detalle:", error.details, error.message);
                logMessage("Error de sincronización con la nube.", "error");
            } else {
                console.log(`✅ Perfil guardado. Alianza vinculada: ${cleanPayload.alliance_id}`);
            }

        } catch (err) {
            console.error("💥 Excepción al guardar:", err);
        }
    },

    getCurrentPlayer: function() {
        return this.currentPlayer;
    }, 

    addWarSeals: function(amount) {
        if (!this.currentPlayer) return;
        this.currentPlayer.currencies.sellos_guerra = (this.currentPlayer.currencies.sellos_guerra || 0) + amount;
        this.saveCurrentPlayer();
    },

    spendWarSeals: function(amount) {
        if (!this.currentPlayer) return false;
        if ((this.currentPlayer.currencies.sellos_guerra || 0) < amount) {
            logMessage("No tienes suficientes Sellos de Guerra.", "warning");
            return false;
        }
        this.currentPlayer.currencies.sellos_guerra -= amount;
        this.saveCurrentPlayer();
        return true;
    },

    /**
     * Calcula cuánta XP gana el jugador basado en la partida
     */
    calculateMatchXP: function(isWinner, turns, unitsKilled) {
        const XP_BASE = isWinner ? 500 : 200; // Bonus por ganar
        const XP_POR_TURNO = turns * 5;      // Recompensar partidas épicas largas
        const XP_POR_BAJA = unitsKilled * 15;
        
        return XP_BASE + XP_POR_TURNO + XP_POR_BAJA;
    },

    /**
     * Guarda el progreso en Supabase y actualiza el nivel si es necesario
     */
    syncMatchResult: async function(xpGained, matchData) {
        if (!this.currentPlayer) return;

        // 1. Actualizar XP y Nivel localmente
        this.currentPlayer.xp = (this.currentPlayer.xp || 0) + xpGained;
        this.currentPlayer.level = this.currentPlayer.level || 1;
        
        // Fórmula: Cada nivel pide un 20% más que el anterior
        let xpToNext = Math.floor(1000 * Math.pow(1.2, this.currentPlayer.level - 1));

        while (this.currentPlayer.xp >= xpToNext) {
            this.currentPlayer.xp -= xpToNext;
            this.currentPlayer.level++;
            xpToNext = Math.floor(1000 * Math.pow(1.2, this.currentPlayer.level - 1));
            logMessage(`¡NIVEL DE CUENTA SUBIDO A ${this.currentPlayer.level}!`, 'success');
        }

        // 2. Guardar en la tabla de HISTORIAL (para el Códice)
        const { error: matchError } = await supabaseClient
            .from('match_history')
            .insert([{
                player_id: this.currentPlayer.auth_id,
                outcome: matchData.outcome,
                duration_minutes: matchData.duration,
                turns_played: matchData.turns,
                xp_gained: xpGained,
                hero_ids: matchData.heroes,
                created_at: new Date().toISOString()
            }]);

        // 3. Sincronizar el Perfil completo (JSON) en la nube
        await this.saveCurrentPlayer();

        return { 
            level: this.currentPlayer.level, 
            xp: this.currentPlayer.xp, 
            xpNext: xpToNext 
        };
    },

    updateAchievements: async function(matchStats) {
        if (!this.currentPlayer?.auth_id) return;

        // 1. Ejemplo: Actualizar logro de bajas
        const { data, error } = await supabaseClient
            .from('user_achievements')
            .select('*')
            .eq('player_id', this.currentPlayer.auth_id)
            .eq('achievement_id', 'SLAYER_1')
            .maybeSingle();

        let current = data ? data.current_progress : 0;
        let newProgress = current + matchStats.kills;
        let goal = REWARDS_CONFIG.ACHIEVEMENTS['SLAYER_1'].goal;

        await supabaseClient.from('user_achievements').upsert({
            player_id: this.currentPlayer.auth_id,
            achievement_id: 'SLAYER_1',
            current_progress: newProgress,
            is_completed: newProgress >= goal
        }, { onConflict: 'player_id, achievement_id' });

        if (newProgress >= goal && (!data || !data.is_completed)) {
            logMessage(`¡LOGRO COMPLETADO: ${REWARDS_CONFIG.ACHIEVEMENTS['SLAYER_1'].title}!`, 'success');
            // Aquí podrías disparar un sonido o animación
        }
    },

    // En PlayerDataManager
    checkDailyReward: async function() {
        if (!this.currentPlayer?.auth_id) return;

        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('last_daily_claim, level')
            .eq('id', this.currentPlayer.auth_id)
            .single();

        const lastClaim = profile.last_daily_claim ? new Date(profile.last_daily_claim) : new Date(0);
        const today = new Date();

        // Comprobar si ha pasado el día (misma fecha no cuenta)
        if (lastClaim.toDateString() !== today.toDateString()) {
            const reward = REWARDS_CONFIG.getDailyReward(profile.level);
            
            // Entregar premio
            if (reward.type === 'oro') this.currentPlayer.currencies.gold += reward.qty;
            if (reward.type === 'sellos') PlayerDataManager.addWarSeals(reward.qty);

            // Guardar en Supabase
            await supabaseClient
                .from('profiles')
                .update({ last_daily_claim: today.toISOString(), profile_data: this.currentPlayer })
                .eq('id', this.currentPlayer.auth_id);

            logMessage(`¡RECOMPENSA DIARIA RECIBIDA: ${reward.label}!`, 'success');
            return reward;
        }
        return null;
    },
    
    /**
     * Función Maestra de Progresión: Se ejecuta UNA SOLA VEZ al final de la batalla.
     * Su misión es recolectar los 5 pilares del jugador y guardarlos en la nube.
     */
    processEndGameProgression: async function(winningPlayerNumber) {
        // SEGURIDAD: Si no hay jugador identificado, no podemos guardar su carrera.
        if (!this.currentPlayer || !this.currentPlayer.auth_id) return;

        // Calculamos si el usuario local es el que ha ganado la partida.
        const playerWon = (winningPlayerNumber === gameState.myPlayerNumber);
        // pKey nos sirve para leer las estadísticas temporales (ej: 'player1').
        const pKey = `player${gameState.myPlayerNumber}`;

        // --- 1. RECUENTO DE TROPAS SOBREVIVIENTES (Punto de Tropas) ---
        // Recorremos todas las unidades del mapa, filtramos las que son nuestras y están vivas,
        // y sumamos cuántos regimientos (la "carne" de la división) han quedado en pie.
        const survivingTroops = units
            .filter(u => u.player === gameState.myPlayerNumber && u.currentHealth > 0)
            .reduce((sum, u) => sum + (u.regiments ? u.regiments.length : 0), 0);


        // ========================================================================
        // === GUARDADO DE LAS 5 MÉTRICAS EN EL OBJETO LOCAL (CAREER STATS) ===
        // ========================================================================

        // MÉTRICA 1: VICTORIAS. Si el General ganó, sumamos 1 al contador histórico.
        if (playerWon) {
            this.currentPlayer.total_wins = (this.currentPlayer.total_wins || 0) + 1;
        }

        // MÉTRICA 2: MUERTE (KILLS). Sumamos los regimientos enemigos destruidos en este juego al total de por vida.
        const matchKills = (gameState.playerStats?.unitsDestroyed?.[pKey] || 0);
        this.currentPlayer.total_kills = (this.currentPlayer.total_kills || 0) + matchKills;

        // MÉTRICA 3: TROPAS (SOBREVIVIENTES). Sumamos los regimientos que el General logró mantener vivos.
        // Esto premia la calidad del mando sobre el sacrificio inútil.
        this.currentPlayer.total_troops_created = (this.currentPlayer.total_troops_created || 0) + survivingTroops;

        // MÉTRICA 4: COMERCIO (TRADES). Sumamos los intercambios con la Banca hechos en esta partida.
        const matchTrades = (gameState.playerStats?.sealTrades?.[pKey] || 0);
        this.currentPlayer.total_trades = (this.currentPlayer.total_trades || 0) + matchTrades;

        // MÉTRICA 5: INFRAESTRUCTURA (CIUDADES). Contamos cuántas ciudades y fortalezas posees en el mapa
        // en el momento final y las añadimos a tu récord de constructor.
        const matchCities = board.flat().filter(h => 
            h && h.owner === gameState.myPlayerNumber && (h.isCity || h.structure === 'Fortaleza')
        ).length;
        this.currentPlayer.total_cities = (this.currentPlayer.total_cities || 0) + matchCities;

        // Guardamos la civilización usada como la "favorita" o última usada.
        this.currentPlayer.favorite_civ = gameState.playerCivilizations[gameState.myPlayerNumber] || 'Iberia';

        // SINCRONIZACIÓN FINAL
        await this.saveCurrentPlayer();

        // ========================================================================
        // === PREPARACIÓN DEL ENVÍO ÚNICO A SUPABASE (HISTORIAL Y CRÓNICA) ===
        // ========================================================================

        // Creamos el paquete de datos que se convertirá en una fila en la tabla 'match_history'.
        const matchData = {
            outcome: playerWon ? 'victoria' : 'derrota',
            turns: gameState.turnNumber || 0,
            kills: matchKills,
            // INTEGRACIÓN CRÓNICA: Metemos todo el array de textos de Chronicle.js aquí.
            match_log: Chronicle.currentMatchLogs, 
            created_at: new Date().toISOString()
        };

        // Calculamos la XP ganada (500 por victoria / 200 derrota + bonus por bajas).
        const xpGained = (playerWon ? 500 : 200) + (matchKills * 15);

        // LLAMADA A SINCRONIZACIÓN: Esta función sube el perfil actualizado (con los 5 puntos)
        // y crea el registro en el historial en una sola operación de red.
        const progress = await this.syncMatchResult(xpGained, matchData);
        
        // LIMPIEZA: Borramos los mensajes de la crónica local para que la próxima partida empiece de cero.
        Chronicle.clearLogs(); 

        // UI: Finalmente, abrimos el modal de resumen para que el jugador vea su recompensa inmediata.
        if (UIManager?.showPostMatchSummary) {
            UIManager.showPostMatchSummary(playerWon, xpGained, progress, matchData);
        }
    },

    // 2. Lógica del botón con estados (Abierto/Cerrado)
    claimDailyReward: async function() {
        if (!this.currentPlayer) return;

        const lastClaim = this.currentPlayer.last_daily_claim ? new Date(this.currentPlayer.last_daily_claim) : new Date(0);
        if (lastClaim.toDateString() === new Date().toDateString()) {
            showToast("Ya has reclamado el beneficio de hoy.", "info");
            return;
        }

        // Entregar premio según REWARDS_CONFIG
        const reward = REWARDS_CONFIG.getDailyReward(this.currentPlayer.level || 1);
        if (reward.type === 'oro') this.currentPlayer.currencies.gold += reward.qty;
        if (reward.type === 'sellos') this.currentPlayer.currencies.sellos_guerra += reward.qty;

        this.currentPlayer.last_daily_claim = new Date().toISOString();
        await this.saveCurrentPlayer();
        
        showToast(`¡Has reclamado ${reward.label}!`, "success");
        openProfileModal(); // Refrescar para cambiar estado del botón
    },

    // Progreso
    applyCareerProgression: async function(winningPlayerNumber) {
        if (!this.currentPlayer) return;

        const playerWon = (winningPlayerNumber === gameState.myPlayerNumber);
        const pKey = `player${gameState.myPlayerNumber}`;

        // 1. Recolección de méritos de la partida actual
        const killsInMatch = gameState.playerStats?.unitsDestroyed?.[pKey] || 0;
        const citiesInMatch = board.flat().filter(h => h && h.owner === gameState.myPlayerNumber && h.isCity).length;
        const tradesInMatch = gameState.playerStats?.sealTrades?.[pKey] || 0;

        // 2. Actualización del Perfil Global (Suma a lo que ya tenía)
        this.currentPlayer.total_kills = (this.currentPlayer.total_kills || 0) + killsInMatch;
        this.currentPlayer.total_cities = (this.currentPlayer.total_cities || 0) + citiesInMatch;
        this.currentPlayer.total_trades = (this.currentPlayer.total_trades || 0) + tradesInMatch;
        
        // 3. Registrar civilización favorita (la actual)
        this.currentPlayer.favorite_civ = gameState.playerCivilizations[gameState.myPlayerNumber] || 'Iberia';

        // 4. Cálculo de Experiencia de Cuenta (Nivel de Comandante)
        const xpBase = playerWon ? 500 : 200;
        const xpBonus = (killsInMatch * 10) + (citiesInMatch * 50);
        const totalXpGained = xpBase + xpBonus;

        // 5. Sincronizar Nivel y Guardar en Historial (Usando tus funciones previas)
        const progress = await this.syncMatchResult(totalXpGained, {
            outcome: playerWon ? 'victoria' : 'derrota',
            turns: gameState.turnNumber,
            kills: killsInMatch
        });

        // 6. Lanzar la pantalla de resultados (El modal que ya tienes en el index)
        if (UIManager && UIManager.showPostMatchSummary) {
            UIManager.showPostMatchSummary(playerWon, totalXpGained, progress, {
                turns: gameState.turnNumber, 
                kills: killsInMatch
            });
        }
        
        console.log("Progreso de carrera aplicado con éxito.");
    },

    analyzeMatchEmotion: function() {
        const history = gameState.matchSnapshots || [];
        if (!history || history.length < 2) return "Batalla relámpago.";

        // Buscamos el turno donde la diferencia de poder cambió más a tu favor
        let bestTurn = 0;
        let maxJump = -Infinity;

        for (let i = 1; i < history.length; i++) {
            const growth = (history[i].p1 - history[i-1].p1);
            if (growth > maxJump) {
                maxJump = growth;
                bestTurn = history[i].turn;
            }
        }

        if (maxJump > 500) return `Turno ${bestTurn}: El contraataque que cambió el destino.`;
        return "Mando constante y victoria estratégica.";
    },

    /**
     * Obtiene el Top 50 jugadores ordenados correctamente.
     */
    getLeaderboard: async function(metric = 'xp') {
        try {
            // Iniciamos la consulta base
            let query = supabaseClient
                .from('profiles')
                .select('username, level, xp, total_wins, avatar_url');

            // --- LÓGICA DE ORDENAMIENTO CORREGIDA ---
            if (metric === 'xp') {
                // Si buscamos los mejores generales, ordenamos:
                // 1º Por NIVEL (Lo más importante)
                // 2º Por XP (Desempate dentro del mismo nivel)
                query = query
                    .order('level', { ascending: false })
                    .order('xp', { ascending: false });
            } else {
                // Para victorias (total_wins) u otras métricas simples
                query = query.order(metric, { ascending: false });
            }
            // ----------------------------------------

            const { data, error } = await query.limit(50);

            if (error) {
                console.error("Error al obtener ranking:", error);
                return [];
            }
            return data;
        } catch (err) {
            console.error("Fallo de red en ranking:", err);
            return [];
        }
    },

    // ===== FUNCIONES DE DEBUG =====
    
    /**
     * Agregar oro al perfil del jugador actual (para pruebas)
     * @param {number} amount - Cantidad de oro a agregar (puede ser negativo para quitar)
     */
    debugAddGold: async function(amount = 1000) {
        if (!this.currentPlayer) {
            console.error("%c[Debug] No hay jugador activo", 'background: #ff0000; color: #fff; font-weight: bold;');
            console.log("Inicia sesión primero");
            return;
        }

        const before = this.currentPlayer.currencies.gold;
        this.currentPlayer.currencies.gold += amount;
        const after = this.currentPlayer.currencies.gold;

        console.log("%c=== AGREGAR ORO (DEBUG) ===", 'background: #ffcc00; color: #000; font-weight: bold; padding: 10px;');
        console.log("Jugador:", this.currentPlayer.username);
        console.log("Oro antes:", before.toLocaleString());
        console.log("Cantidad agregada:", amount.toLocaleString());
        console.log("Oro después:", after.toLocaleString());

        // Guardar en la BD
        await this.saveCurrentPlayer();
        console.log("%c✅ Oro actualizado y guardado", 'background: #00ff00; color: #000; font-weight: bold;');

        // Actualizar UI si está visible
        if (typeof UIManager !== 'undefined' && UIManager.updateResourceDisplays) {
            UIManager.updateResourceDisplays();
        }

        return after;
    },

    /**
     * Agregar gemas al perfil del jugador actual (para pruebas)
     * @param {number} amount - Cantidad de gemas a agregar
     */
    debugAddGems: async function(amount = 100) {
        if (!this.currentPlayer) {
            console.error("%c[Debug] No hay jugador activo", 'background: #ff0000; color: #fff; font-weight: bold;');
            return;
        }

        const before = this.currentPlayer.currencies.gems;
        this.currentPlayer.currencies.gems += amount;
        const after = this.currentPlayer.currencies.gems;

        console.log("%c=== AGREGAR GEMAS (DEBUG) ===", 'background: #9966ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log("Jugador:", this.currentPlayer.username);
        console.log("Gemas antes:", before);
        console.log("Cantidad agregada:", amount);
        console.log("Gemas después:", after);

        await this.saveCurrentPlayer();
        console.log("%c✅ Gemas actualizadas y guardadas", 'background: #00ff00; color: #000; font-weight: bold;');

        if (typeof UIManager !== 'undefined' && UIManager.updateResourceDisplays) {
            UIManager.updateResourceDisplays();
        }

        return after;
    },

    /**
     * Agregar todos los tipos de moneda al jugador (para pruebas)
     * @param {number} multiplier - Multiplicador para las cantidades base
     */
    debugAddAllCurrencies: async function(multiplier = 1) {
        if (!this.currentPlayer) {
            console.error("%c[Debug] No hay jugador activo", 'background: #ff0000; color: #fff; font-weight: bold;');
            return;
        }

        console.log("%c=== AGREGAR TODAS LAS MONEDAS (DEBUG) ===", 'background: #00ccff; color: #000; font-weight: bold; padding: 10px;');
        
        const before = { ...this.currentPlayer.currencies };
        
        this.currentPlayer.currencies.gold += 10000 * multiplier;
        this.currentPlayer.currencies.gems += 500 * multiplier;
        this.currentPlayer.currencies.edicts += 50 * multiplier;
        this.currentPlayer.currencies.influence += 1000 * multiplier;
        this.currentPlayer.currencies.sellos_guerra += 20 * multiplier;

        const after = this.currentPlayer.currencies;

        console.log("Jugador:", this.currentPlayer.username);
        console.table({
            "Oro": { antes: before.gold, agregado: 10000 * multiplier, después: after.gold },
            "Gemas": { antes: before.gems, agregado: 500 * multiplier, después: after.gems },
            "Edictos": { antes: before.edicts, agregado: 50 * multiplier, después: after.edicts },
            "Influencia": { antes: before.influence, agregado: 1000 * multiplier, después: after.influence },
            "Sellos de Guerra": { antes: before.sellos_guerra, agregado: 20 * multiplier, después: after.sellos_guerra }
        });

        await this.saveCurrentPlayer();
        console.log("%c✅ Todas las monedas actualizadas y guardadas", 'background: #00ff00; color: #000; font-weight: bold;');

        if (typeof UIManager !== 'undefined' && UIManager.updateResourceDisplays) {
            UIManager.updateResourceDisplays();
        }

        return after;
    },

    /**
     * Ver el estado actual de las monedas del jugador
     */
    debugShowCurrencies: function() {
        if (!this.currentPlayer) {
            console.error("%c[Debug] No hay jugador activo", 'background: #ff0000; color: #fff; font-weight: bold;');
            return;
        }

        console.log("%c=== MONEDAS DEL JUGADOR ===", 'background: #0066ff; color: #fff; font-weight: bold; padding: 10px;');
        console.log("Jugador:", this.currentPlayer.username);
        console.log("ID:", this.currentPlayer.auth_id);
        console.log("\nMonedas actuales:");
        console.table(this.currentPlayer.currencies);

        return this.currentPlayer.currencies;
    }

};