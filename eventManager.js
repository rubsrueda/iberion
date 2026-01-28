/**
 * EventManager - Sistema centralizado para gestión de event listeners
 * Previene memory leaks al rastrear y limpiar listeners automáticamente
 * 
 * @author Iberion Development Team
 * @date Enero 2026
 */

class EventManager {
    constructor() {
        this.listeners = new Map();
        console.log('[EventManager] Inicializado');
    }
    
    /**
     * Añade un event listener con ID único para tracking
     * Si ya existe un listener con el mismo ID, lo elimina antes de añadir el nuevo
     * 
     * @param {HTMLElement} element - Elemento DOM al que añadir el listener
     * @param {string} event - Tipo de evento ('click', 'mouseover', etc.)
     * @param {Function} handler - Función callback
     * @param {string} id - ID único para el listener
     * @param {Object} options - Opciones opcionales del addEventListener
     */
    addListener(element, event, handler, id, options = {}) {
        if (!element || !event || !handler || !id) {
            console.error('[EventManager] Parámetros inválidos:', { element, event, handler, id });
            return;
        }

        const key = `${id}_${event}`;
        
        // Eliminar listener previo si existe
        this.removeListener(element, event, id);
        
        // Almacenar referencia
        this.listeners.set(key, { element, event, handler, options });
        
        // Añadir listener
        element.addEventListener(event, handler, options);
        
        console.log(`[EventManager] Listener añadido: ${key}`);
    }
    
    /**
     * Elimina un event listener específico por su ID
     * 
     * @param {HTMLElement} element - Elemento DOM del que eliminar el listener
     * @param {string} event - Tipo de evento
     * @param {string} id - ID del listener a eliminar
     */
    removeListener(element, event, id) {
        const key = `${id}_${event}`;
        const listener = this.listeners.get(key);
        
        if (listener) {
            listener.element.removeEventListener(event, listener.handler, listener.options);
            this.listeners.delete(key);
            console.log(`[EventManager] Listener eliminado: ${key}`);
        }
    }
    
    /**
     * Elimina todos los listeners asociados a un ID específico
     * Útil cuando se destruye un componente completo
     * 
     * @param {string} id - ID base del componente
     */
    removeAllByID(id) {
        let count = 0;
        const keysToDelete = [];
        
        for (const [key, listener] of this.listeners) {
            if (key.startsWith(id + '_')) {
                listener.element.removeEventListener(listener.event, listener.handler, listener.options);
                keysToDelete.push(key);
                count++;
            }
        }
        
        keysToDelete.forEach(key => this.listeners.delete(key));
        
        if (count > 0) {
            console.log(`[EventManager] Eliminados ${count} listeners con ID: ${id}`);
        }
    }
    
    /**
     * Limpia TODOS los event listeners registrados
     * Usar con precaución - típicamente al salir del juego completamente
     */
    cleanup() {
        console.log(`[EventManager] Limpiando ${this.listeners.size} listeners...`);
        
        for (const [key, listener] of this.listeners) {
            try {
                listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            } catch (error) {
                console.warn(`[EventManager] Error limpiando ${key}:`, error);
            }
        }
        
        this.listeners.clear();
        console.log('[EventManager] Todos los listeners eliminados');
    }
    
    /**
     * Devuelve información sobre los listeners activos
     * Útil para debugging
     */
    getStats() {
        const stats = {
            total: this.listeners.size,
            byEvent: {},
            byID: {}
        };
        
        for (const [key, listener] of this.listeners) {
            // Contar por tipo de evento
            stats.byEvent[listener.event] = (stats.byEvent[listener.event] || 0) + 1;
            
            // Contar por ID base
            const idBase = key.split('_')[0];
            stats.byID[idBase] = (stats.byID[idBase] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Muestra estadísticas en consola para debugging
     */
    logStats() {
        const stats = this.getStats();
        console.log('[EventManager] Estadísticas:');
        console.log('  Total listeners:', stats.total);
        console.log('  Por evento:', stats.byEvent);
        console.log('  Por ID base:', stats.byID);
    }
}

// Instancia global - único EventManager en la aplicación
window.eventManager = new EventManager();

// Cleanup automático al cerrar/recargar página
window.addEventListener('beforeunload', () => {
    if (window.eventManager) {
        window.eventManager.cleanup();
    }
});
