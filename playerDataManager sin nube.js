// playerDataManager.js (CORREGIDO PARA LOGIN)

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


    // Dentro de PlayerDataManager en playerDataManager.js
    loginWithGoogle: async function() {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Esto redirigirá al usuario de vuelta a tu web tras loguearse
                redirectTo: window.location.origin 
            }
        });

        if (error) {
            logMessage("Error al conectar con Google: " + error.message, "error");
        }
    },

    // respuesta de Google
    initAuthListener: function() {
        // Escuchamos cualquier cambio en la sesión (Login, Logout, vuelta de Google)
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Evento de Autenticación:", event);

            if (event === "SIGNED_IN" && session) {
                console.log("¡Usuario detectado!", session.user);
                
                // 1. Intentamos cargar el perfil desde la tabla 'profiles'
                const { data: cloudProfile, error } = await supabaseClient
                    .from('profiles')
                    .select('profile_data')
                    .eq('id', session.user.id)
                    .single();

                if (cloudProfile) {
                    // Si ya tiene datos en la nube, los cargamos
                    this.currentPlayer = cloudProfile.profile_data;
                    console.log("Perfil cargado desde la nube.");
                } else {
                    // Si es un usuario nuevo de Google, le creamos un perfil inicial
                    console.log("Creando nuevo perfil para usuario de Google...");
                    const defaultUsername = session.user.email.split('@')[0];
                    this.currentPlayer = this.createNewPlayer(defaultUsername, "google-auth");
                    
                    // Guardamos en la nube por primera vez
                    await this.saveCurrentPlayer();
                }

                // 2. Guardamos su ID de Supabase para futuras sincronizaciones
                this.currentPlayer.auth_id = session.user.id;

                // 3. Una vez los datos están listos, pasamos al menú principal
                if (typeof showScreen === "function") {
                    showScreen(null); // Oculta modales
                    showMainMenu();  // Muestra el menú del juego
                }
            }
        });
    },

    // Función de "hash" simple para no guardar contraseñas en texto plano.
    // En un entorno real, esto sería una librería criptográfica.
    _hash: function(str) {
        return btoa(str);
    },

    /**
     * (NUEVO Y MEJORADO) Intenta iniciar sesión, valida o crea un usuario.
     * @param {string} username - El nombre del jugador.
     * @param {string} password - La contraseña del jugador.
     * @returns {object} Un objeto con { success: boolean, message: string }
     */
    login: function(username, password) {
        if (!username || !password) {
            return { success: false, message: "Usuario y contraseña no pueden estar vacíos." };
        }

        const playerDataKey = `player_${username.trim().toLowerCase()}`;
        let playerDataString = localStorage.getItem(playerDataKey);

        // CASO 1: El usuario NO existe
        if (!playerDataString) {
            if (confirm(`El General "${username}" no existe. ¿Quieres crear un nuevo perfil con esta contraseña?`)) {
                this.currentPlayer = this.createNewPlayer(username, password);
                this.saveCurrentPlayer();
                localStorage.setItem('lastUser', username.trim());
                return { success: true, message: "Nuevo perfil creado con éxito." };
            } else {
                // <<== CORRECCIÓN: Devolver un objeto de fallo aquí ==>>
                return { success: false, message: "Creación de perfil cancelada." };
            }
        }
        // CASO 2: El usuario SÍ existe
        else {
            const loadedPlayer = JSON.parse(playerDataString);
            const hashedPassword = this._hash(password);

            if (loadedPlayer.credentials.passwordHash !== hashedPassword) {
                return { success: false, message: "Contraseña incorrecta." };
            }

            // Si la contraseña es correcta, procedemos
            let profileUpdated = false;

            // --- Lógica de actualización de perfil (tu código, sin cambios) ---
            if (loadedPlayer.heroes) {
                loadedPlayer.heroes.forEach(hero => {
                    if (typeof hero.equipment === 'undefined') {
                        hero.equipment = { head: null, weapon: null, chest: null, legs: null, gloves: null, boots: null };
                        profileUpdated = true;
                    }
                    if (typeof hero.talent_points_unspent === 'undefined') {
                        const hasNoTalentsSpent = !hero.talents || Object.keys(hero.talents).length === 0;
                        hero.talent_points_unspent = hasNoTalentsSpent ? 1 : 0;
                        profileUpdated = true;
                    }
                    if (typeof hero.talents === 'undefined') hero.talents = {};
                    if (!Array.isArray(hero.skill_levels)) hero.skill_levels = [1, 0, 0, 0];
                });
            }

            if (loadedPlayer.inventory) {
                if (typeof loadedPlayer.inventory.equipment === 'undefined') {
                    loadedPlayer.inventory.equipment = [];
                    profileUpdated = true;
                }
                if (typeof loadedPlayer.inventory.equipment_fragments === 'undefined') {
                    loadedPlayer.inventory.equipment_fragments = {};
                    profileUpdated = true;
                }
            } else {
                loadedPlayer.inventory = { xp_books: 0, ascension_materials: {}, equipment: [], equipment_fragments: {} };
                profileUpdated = true;
            }
            // --- Fin de la lógica de actualización ---

            // Asignamos el jugador cargado (y potencialmente actualizado)
            this.currentPlayer = loadedPlayer;

            // Si el perfil fue modificado, lo guardamos
            if (profileUpdated) {
                console.log("Perfil de jugador actualizado a la nueva versión.");
                this.saveCurrentPlayer();
            }

            // Guardamos el último usuario que ha iniciado sesión
            localStorage.setItem('lastUser', username.trim());

            // <<== ¡LA CORRECCIÓN CLAVE! ==>>
            // Devolvemos el objeto de éxito DESPUÉS de todas las comprobaciones.
            return { success: true, message: "Inicio de sesión exitoso." };
        }
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

    logout: function() {
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
     * @param {string} itemId - El ID del equipo (ej: "common_sword_1").
     * @param {number} amount - La cantidad de fragmentos a añadir.
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
            
            // --- INICIALIZACIÓN SEGURA DE PUNTOS (se mantiene) ---
            if (typeof hero.skill_points_unspent !== 'number') hero.skill_points_unspent = 0;
            if (typeof hero.talent_points_unspent !== 'number') hero.talent_points_unspent = 0;

            // <<== LÓGICA DE PUNTOS CORREGIDA Y SEPARADA ==>>

            // 1. Puntos de Talento: Se otorga 1 en CADA nivel.
            hero.talent_points_unspent += 1;
            let logMessageText = `¡${COMMANDERS[hero.id].name} ha subido al nivel ${hero.level}! Ganas +1 Punto de Talento.`;

            // 2. Puntos de Habilidad: Se otorga 1 SÓLO en niveles pares.
            if (hero.level % 2 === 0) {
                hero.skill_points_unspent += 1;
                logMessageText += ` Y +1 Punto de Habilidad.`;
            }
            
            logMessage(logMessageText, 'success');
            // <<== FIN DE LA CORRECCIÓN ==>>
        }
        this.saveCurrentPlayer();
    },

    upgradeHeroSkill: function(heroId, skillIndex) {
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        // <<== USA 'skill_points_unspent' ==>>
        if (!hero || (hero.skill_points_unspent || 0) <= 0) {
            logMessage("No tienes puntos de habilidad para gastar.", "warning");
            return false;
        }
        if (!Array.isArray(hero.skill_levels)) hero.skill_levels = [1, 0, 0, 0];
        const currentLevel = hero.skill_levels[skillIndex] || 0;
        if (currentLevel >= 5) return false;
        const starsRequired = skillIndex + 1;
        if (hero.stars < starsRequired) return false;

        hero.skill_points_unspent--; // <<== GASTA 'skill_points_unspent'
        hero.skill_levels[skillIndex]++;
        
        this.saveCurrentPlayer();
        logMessage(`¡Habilidad mejorada a nivel ${hero.skill_levels[skillIndex]}!`, "success");
        return true;
    },
    
    spendTalentPoint: function(heroId, talentId) {
    const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
    
    alert(`INTENTANDO GASTAR PUNTO DE TALENTO.\n\nPuntos de Talento disponibles: ${hero.talent_points_unspent}\nPuntos de Habilidad disponibles: ${hero.skill_points_unspent}`);
    
    // El resto de la función se mantiene igual
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
        let resourceSource = (gameState && (gameState.currentPhase === 'play' || gameState.currentPhase === 'deployment')) ? gameState.playerResources[gameState.currentPlayer] : this.currentPlayer.currencies;
        if (!resourceSource || (resourceSource.oro || 0) < cost) {
            logMessage(`Oro insuficiente. Se necesitan ${cost} para reiniciar.`, "warning");
            return false;
        }
        resourceSource.oro -= cost;

        const totalPointsSpent = hero.talents ? Object.values(hero.talents).reduce((sum, level) => sum + level, 0) : 0;
        
        // <<== DEVUELVE A 'talent_points_unspent' ==>>
        hero.talent_points_unspent = (hero.talent_points_unspent || 0) + totalPointsSpent;
        hero.talents = {};
        
        this.saveCurrentPlayer();
        if (gameState && (gameState.currentPhase === 'play' || gameState.currentPhase === 'deployment')) {
            UIManager.updatePlayerAndPhaseInfo();
        }
        logMessage(`Talentos reiniciados. Puntos recuperados: ${totalPointsSpent}.`, "success");
        return true;
    },

    /**
     * Evoluciona a un héroe al siguiente nivel de estrellas si tiene suficientes fragmentos.
     * @param {string} heroId - El ID del héroe a evolucionar.
     */
    evolveHero: function(heroId) {
        if (!this.currentPlayer) return;
        const hero = this.currentPlayer.heroes.find(h => h.id === heroId);
        if (!hero) return;

        const isUnlocking = hero.stars === 0;
        const nextStar = hero.stars + 1;
        const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar];

        if (!fragmentsNeeded) {
            logMessage(`${COMMANDERS[hero.id].name} ya ha alcanzado la evolución máxima.`);
            return;
        }

        if ((hero.fragments || 0) >= fragmentsNeeded) {
            hero.fragments -= fragmentsNeeded;
            hero.stars = nextStar;

            // <<== INICIO DE LA CORRECCIÓN ==>>
            // Después de aumentar las estrellas, comprobamos qué habilidades están desbloqueadas.
            // El índice de la habilidad en el array es `nivel_de_estrella - 1`.
            // Ejemplo: 2 estrellas desbloquea la habilidad en el índice 1.
            const newSkillIndex = hero.stars - 1; 

            // Si el array de niveles de habilidad no existe, lo creamos.
            if (!Array.isArray(hero.skill_levels)) {
                hero.skill_levels = [0, 0, 0, 0];
            }

            // Si el nivel de la habilidad recién desbloqueada es 0, lo ponemos en 1.
            // Esto solo se ejecutará la primera vez que se alcance este nivel de estrellas.
            if (hero.skill_levels[newSkillIndex] === 0) {
                hero.skill_levels[newSkillIndex] = 1;
                console.log(`[Evolve] Habilidad en el índice ${newSkillIndex} desbloqueada y establecida en Nivel 1.`);
            }
            // <<== FIN DE LA CORRECCIÓN ==>>

            if (isUnlocking) {
                hero.level = 1;
                hero.xp = 0;
                // La corrección anterior ya se encarga de poner la primera habilidad en 1,
                // así que podemos simplificar esta línea.
                hero.skill_levels[0] = 1; 
                hero.talent_points_unspent = 1;
                hero.skill_points_unspent = 0;
                // Nos aseguramos de que el objeto talents exista
                if(!hero.talents) hero.talents = {};

                logMessage(`¡Has desbloqueado a ${COMMANDERS[hero.id].name}!`, 'success');
            } else {
                logMessage(`¡${COMMANDERS[hero.id].name} ha evolucionado a ${hero.stars} estrellas!`, 'success');
            }
            
            this.saveCurrentPlayer();
        } else {
            logMessage(`No tienes suficientes fragmentos.`, 'warning');
        }
    },

    /**
     * Guarda los datos del jugador actual en localStorage.
     */
    saveCurrentPlayer: function() {
        if (this.currentPlayer) {
            const playerDataKey = `player_${this.currentPlayer.username.toLowerCase()}`;
            localStorage.setItem(playerDataKey, JSON.stringify(this.currentPlayer));
            console.log(`Datos de ${this.currentPlayer.username} guardados.`);
        }
    },

    getCurrentPlayer: function() {
        return this.currentPlayer;
    }, 

    /**
     * Añade Sellos de Guerra al inventario del jugador actual.
     * @param {number} amount - La cantidad de sellos a añadir.
     */
    addWarSeals: function(amount) {
        if (!this.currentPlayer) return;
        this.currentPlayer.currencies.sellos_guerra = (this.currentPlayer.currencies.sellos_guerra || 0) + amount;
        logMessage(`Has obtenido ${amount} Sellos de Guerra. Total: ${this.currentPlayer.currencies.sellos_guerra}.`, "success");
        this.saveCurrentPlayer();
    },

    /**
     * Gasta Sellos de Guerra, validando si el jugador tiene suficientes.
     * @param {number} amount - La cantidad a gastar.
     * @returns {boolean} True si se pudieron gastar, false en caso contrario.
     */
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

    getBattleHistory: async function() {
        if (!this.currentPlayer?.auth_id) return [];

        const { data, error } = await supabaseClient
            .from('match_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10); // Traemos las últimas 10 batallas

        if (error) {
            console.error("Error cargando historial:", error);
            return [];
        }
        return data;
    },

};
