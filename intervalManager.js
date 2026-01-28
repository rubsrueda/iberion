/**
 * IntervalManager - Sistema centralizado para gestión de setInterval/setTimeout
 * Previene memory leaks y conflictos entre intervalos duplicados
 * 
 * @author Iberion Development Team
 * @date Enero 2026
 */

class IntervalManager {
    constructor() {
        this.intervals = new Map();
        this.timeouts = new Map();
        console.log('[IntervalManager] Inicializado');
    }
    
    /**
     * Crea o reemplaza un setInterval con ID único
     * Si ya existe un interval con el mismo ID, lo limpia antes de crear el nuevo
     * 
     * @param {string} id - ID único para el interval
     * @param {Function} callback - Función a ejecutar periódicamente
     * @param {number} delay - Retraso en milisegundos
     * @returns {number} ID del interval (para compatibilidad)
     */
    setInterval(id, callback, delay) {
        if (!id || typeof callback !== 'function' || typeof delay !== 'number') {
            console.error('[IntervalManager] Parámetros inválidos:', { id, callback, delay });
            return null;
        }

        // Limpiar interval previo si existe
        this.clearInterval(id);
        
        // Crear nuevo interval
        const intervalId = setInterval(callback, delay);
        this.intervals.set(id, {
            intervalId,
            callback,
            delay,
            createdAt: Date.now()
        });
        
        console.log(`[IntervalManager] Interval creado: ${id} (cada ${delay}ms)`);
        return intervalId;
    }
    
    /**
     * Limpia un interval específico por su ID
     * 
     * @param {string} id - ID del interval a limpiar
     * @returns {boolean} true si se eliminó, false si no existía
     */
    clearInterval(id) {
        const interval = this.intervals.get(id);
        
        if (interval) {
            clearInterval(interval.intervalId);
            this.intervals.delete(id);
            console.log(`[IntervalManager] Interval eliminado: ${id}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Crea o reemplaza un setTimeout con ID único
     * Si ya existe un timeout con el mismo ID, lo limpia antes de crear el nuevo
     * 
     * @param {string} id - ID único para el timeout
     * @param {Function} callback - Función a ejecutar una vez
     * @param {number} delay - Retraso en milisegundos
     * @returns {number} ID del timeout (para compatibilidad)
     */
    setTimeout(id, callback, delay) {
        if (!id || typeof callback !== 'function' || typeof delay !== 'number') {
            console.error('[IntervalManager] Parámetros inválidos:', { id, callback, delay });
            return null;
        }

        // Limpiar timeout previo si existe
        this.clearTimeout(id);
        
        // Wrapper que auto-limpia después de ejecutar
        const wrappedCallback = () => {
            callback();
            this.timeouts.delete(id);
        };
        
        // Crear nuevo timeout
        const timeoutId = setTimeout(wrappedCallback, delay);
        this.timeouts.set(id, {
            timeoutId,
            callback,
            delay,
            createdAt: Date.now()
        });
        
        console.log(`[IntervalManager] Timeout creado: ${id} (en ${delay}ms)`);
        return timeoutId;
    }
    
    /**
     * Limpia un timeout específico por su ID
     * 
     * @param {string} id - ID del timeout a limpiar
     * @returns {boolean} true si se eliminó, false si no existía
     */
    clearTimeout(id) {
        const timeout = this.timeouts.get(id);
        
        if (timeout) {
            clearTimeout(timeout.timeoutId);
            this.timeouts.delete(id);
            console.log(`[IntervalManager] Timeout eliminado: ${id}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Limpia todos los intervals con un prefijo específico
     * Útil para limpiar todos los intervals de un módulo
     * 
     * @param {string} prefix - Prefijo del ID (ej: 'network_', 'tutorial_')
     */
    clearIntervalsByPrefix(prefix) {
        let count = 0;
        const keysToDelete = [];
        
        for (const [id, interval] of this.intervals) {
            if (id.startsWith(prefix)) {
                clearInterval(interval.intervalId);
                keysToDelete.push(id);
                count++;
            }
        }
        
        keysToDelete.forEach(id => this.intervals.delete(id));
        
        if (count > 0) {
            console.log(`[IntervalManager] Eliminados ${count} intervals con prefijo: ${prefix}`);
        }
    }
    
    /**
     * Limpia todos los timeouts con un prefijo específico
     * 
     * @param {string} prefix - Prefijo del ID
     */
    clearTimeoutsByPrefix(prefix) {
        let count = 0;
        const keysToDelete = [];
        
        for (const [id, timeout] of this.timeouts) {
            if (id.startsWith(prefix)) {
                clearTimeout(timeout.timeoutId);
                keysToDelete.push(id);
                count++;
            }
        }
        
        keysToDelete.forEach(id => this.timeouts.delete(id));
        
        if (count > 0) {
            console.log(`[IntervalManager] Eliminados ${count} timeouts con prefijo: ${prefix}`);
        }
    }
    
    /**
     * Limpia TODOS los intervals y timeouts registrados
     * Usar al salir del juego o cambiar de pantalla principal
     */
    clearAll() {
        console.log(`[IntervalManager] Limpiando ${this.intervals.size} intervals y ${this.timeouts.size} timeouts...`);
        
        // Limpiar intervals
        for (const [id, interval] of this.intervals) {
            try {
                clearInterval(interval.intervalId);
            } catch (error) {
                console.warn(`[IntervalManager] Error limpiando interval ${id}:`, error);
            }
        }
        
        // Limpiar timeouts
        for (const [id, timeout] of this.timeouts) {
            try {
                clearTimeout(timeout.timeoutId);
            } catch (error) {
                console.warn(`[IntervalManager] Error limpiando timeout ${id}:`, error);
            }
        }
        
        this.intervals.clear();
        this.timeouts.clear();
        console.log('[IntervalManager] Todos los intervals y timeouts eliminados');
    }
    
    /**
     * Verifica si existe un interval con el ID dado
     * 
     * @param {string} id - ID del interval
     * @returns {boolean}
     */
    hasInterval(id) {
        return this.intervals.has(id);
    }
    
    /**
     * Verifica si existe un timeout con el ID dado
     * 
     * @param {string} id - ID del timeout
     * @returns {boolean}
     */
    hasTimeout(id) {
        return this.timeouts.has(id);
    }
    
    /**
     * Devuelve información sobre intervals y timeouts activos
     * Útil para debugging
     */
    getStats() {
        const stats = {
            totalIntervals: this.intervals.size,
            totalTimeouts: this.timeouts.size,
            intervals: {},
            timeouts: {}
        };
        
        // Info de intervals
        for (const [id, interval] of this.intervals) {
            const age = Math.floor((Date.now() - interval.createdAt) / 1000);
            stats.intervals[id] = {
                delay: interval.delay,
                ageSeconds: age
            };
        }
        
        // Info de timeouts
        for (const [id, timeout] of this.timeouts) {
            const age = Math.floor((Date.now() - timeout.createdAt) / 1000);
            stats.timeouts[id] = {
                delay: timeout.delay,
                ageSeconds: age
            };
        }
        
        return stats;
    }
    
    /**
     * Muestra estadísticas en consola para debugging
     */
    logStats() {
        const stats = this.getStats();
        console.log('[IntervalManager] Estadísticas:');
        console.log('  Total intervals:', stats.totalIntervals);
        console.log('  Total timeouts:', stats.totalTimeouts);
        console.log('  Intervals activos:', stats.intervals);
        console.log('  Timeouts activos:', stats.timeouts);
    }
}

// Instancia global - único IntervalManager en la aplicación
window.intervalManager = new IntervalManager();

// Cleanup automático al cerrar/recargar página
window.addEventListener('beforeunload', () => {
    if (window.intervalManager) {
        window.intervalManager.clearAll();
    }
});
