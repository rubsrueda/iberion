// version.js - Sistema de control de versiones de Iberion

const VERSION_CONFIG = {
    // Versión actual del juego
    current: "1.202.060",
    // Hito estable para restauración rápida en regresiones de IA
    milestone: "corridor-capture-stable-v1.154",
    
    /**
     * Incrementa la versión automáticamente
     * @returns {string} Nueva versión
     */
    increment() {
        const parts = this.current.split('.');
        const major = parseInt(parts[0]);
        const minor = parseInt(parts[1]);
        
        const newMinor = minor + 1;
        this.current = `${major}.${newMinor.toString().padStart(3, '0')}`;
        return this.current;
    },
    
    /**
     * Obtiene la versión actual
     * @returns {string} Versión actual
     */
    get() {
        return this.current;
    },

    /**
     * Obtiene el milestone actual de estabilidad
     * @returns {string} Milestone estable
     */
    getMilestone() {
        return this.milestone;
    },
    
    /**
     * Establece una versión específica
     * @param {string} version - Nueva versión
     */
    set(version) {
        this.current = version;
    }
};

// Exportar para uso global
window.VERSION_CONFIG = VERSION_CONFIG;
