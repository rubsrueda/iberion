// version.js - Sistema de control de versiones de Iberion

const VERSION_CONFIG = {
    // Versión actual del juego
    current: "1.002",
    
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
     * Establece una versión específica
     * @param {string} version - Nueva versión
     */
    set(version) {
        this.current = version;
    }
};

// Exportar para uso global
window.VERSION_CONFIG = VERSION_CONFIG;
