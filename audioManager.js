// audioManager.js

const AudioManager = {
    sounds: {},
    currentMusic: null,
    musicVolume: 0.3, // Volumen por defecto para la música (más bajo)
    sfxVolume: 0.7,   // Volumen por defecto para los efectos (más alto)

    
    // Lista de todos los archivos de audio que usará el juego
    // Añade aquí todas tus pistas de música y efectos de sonido
    _audioSources: {
        // Música (debe estar en la carpeta audio/music/)
        'menu_theme': 'audio/music/segovia_Gavotte from 4th Lute Suite.mp3', // Reemplaza 'main_theme.mp3' con tu archivo
        'battle_theme': 'audio/music/Dvorak_New_World.mp3', // Reemplaza 'battle_theme.mp3' con tu archivo

        // Efectos de Sonido (deben estar en la carpeta audio/sfx/)
        'ui_click': 'audio/sfx/click.wav',       // Reemplaza 'click.wav' con tu archivo
        'turn_start': 'audio/sfx/horn.wav',      // Reemplaza 'horn.wav' con tu archivo
        'attack_swords': 'audio/sfx/explosion.WAV',   // Reemplaza 'swords.wav' con tu archivo
        'unit_destroyed': 'audio/sfx/swords.WAV', // Reemplaza 'explosion.wav' con tu archivo
        'structure_built': 'audio/sfx/build.WAV' // Reemplaza 'build.wav' con tu archivo
    },
    
    /**
     * Precarga todos los sonidos definidos en _audioSources.
     * Se debe llamar al iniciar la aplicación.
     */
    preload: function() {
        for (const key in this._audioSources) {
            const audio = new Audio();
            audio.src = this._audioSources[key];
            this.sounds[key] = audio;
        }
    },

    /**
     * Reproduce un efecto de sonido una vez.
     * @param {string} soundName - El nombre clave del sonido (ej: 'ui_click').
     */
    playSound: function(soundName) {
        if (this.sounds[soundName]) {
            // Clonamos el nodo para permitir que el mismo sonido se reproduzca varias veces simultáneamente
            const soundToPlay = this.sounds[soundName].cloneNode();
            soundToPlay.volume = this.sfxVolume;
            soundToPlay.play().catch(e => console.warn(`[AudioManager] No se pudo reproducir el sonido '${soundName}'. El usuario debe interactuar con la página primero.`));
        } else {
            console.warn(`[AudioManager] Sonido no encontrado: ${soundName}`);
        }
    },

    /**
     * Reproduce una pista de música, opcionalmente en bucle.
     * Detiene la música anterior si la hubiera.
     * @param {string} musicName - El nombre clave de la música (ej: 'menu_theme').
     * @param {boolean} loop - Si la música debe repetirse. Por defecto es true.
     */
    playMusic: function(musicName, loop = true) {
        if (this.currentMusic && this.currentMusic.src.includes(this._audioSources[musicName])) {
            // Si ya está sonando la misma pista, no hacer nada.
            return;
        }

        this.stopMusic(); // Detiene la música actual antes de empezar la nueva

        if (this.sounds[musicName]) {
            this.currentMusic = this.sounds[musicName];
            this.currentMusic.volume = this.musicVolume;
            this.currentMusic.loop = loop;
            this.currentMusic.play().catch(e => console.warn(`[AudioManager] No se pudo reproducir la música '${musicName}'. El usuario debe interactuar con la página primero.`));
        } else {
            console.warn(`[AudioManager] Pista de música no encontrada: ${musicName}`);
        }
    },

    /**
     * Detiene la música que se está reproduciendo actualmente.
     */
    stopMusic: function() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0; // Reinicia la pista
            this.currentMusic = null;
        }
    },
    
    /**
     * Ajusta el volumen de la música y los efectos.
     * @param {number} musicVol - Nivel de volumen para la música (0.0 a 1.0).
     * @param {number} sfxVol - Nivel de volumen para los efectos (0.0 a 1.0).
     */
    setVolume: function(musicVol, sfxVol) {
        this.musicVolume = Math.max(0, Math.min(1, musicVol));
        this.sfxVolume = Math.max(0, Math.min(1, sfxVol));
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume;
        }
    }
};