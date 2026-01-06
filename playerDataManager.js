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

    /**
     * Guarda los datos del jugador actual en localStorage y en Supabase.
     */
    saveCurrentPlayer: async function() {
        if (!this.currentPlayer || !this.currentPlayer.auth_id) return;

        try {
            const { error } = await supabaseClient
                .from('profiles')
                .upsert({
                    id: this.currentPlayer.auth_id,
                    username: this.currentPlayer.username,
                    profile_data: this.currentPlayer, // JSON sin limpiar para mayor velocidad
                    last_sync: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) {
                console.error("❌ Error de red Supabase:", error.message);
            } else {
                console.log("✅ Sincronizado con la nube (Nivel: " + (this.currentPlayer.heroes[0]?.level || 0) + ")");
            }
        } catch (err) {
            console.error("💥 Error crítico de conexión:", err);
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

};