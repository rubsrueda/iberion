// pathCache.js
// Sistema de caché para cálculos de pathfinding costosos
console.log("pathCache.js CARGADO - Sistema de Caché de Rutas v1.0");

/**
 * Sistema de caché para pathfinding
 * Evita recalcular rutas idénticas múltiples veces
 */
const PathCache = {
    cache: new Map(), // Key: "r1,c1->r2,c2", Value: {path, timestamp}
    maxSize: 500, // Máximo de rutas en caché
    maxAge: 5000, // Máximo 5 segundos de vigencia (para adaptarse a cambios del mapa)
    hits: 0,
    misses: 0,
    
    /**
     * Genera una clave única para una ruta
     * @param {number} fromR - Fila origen
     * @param {number} fromC - Columna origen
     * @param {number} toR - Fila destino
     * @param {number} toC - Columna destino
     * @returns {string} Clave única
     */
    _generateKey(fromR, fromC, toR, toC) {
        return `${fromR},${fromC}->${toR},${toC}`;
    },
    
    /**
     * Obtiene una ruta del caché si existe y es válida
     * @param {number} fromR - Fila origen
     * @param {number} fromC - Columna origen
     * @param {number} toR - Fila destino
     * @param {number} toC - Columna destino
     * @returns {Array|null} Ruta cacheada o null
     */
    get(fromR, fromC, toR, toC) {
        const key = this._generateKey(fromR, fromC, toR, toC);
        const cached = this.cache.get(key);
        
        if (!cached) {
            this.misses++;
            return null;
        }
        
        // Verificar si el caché expiró
        const now = Date.now();
        if (now - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        
        this.hits++;
        return cached.path;
    },
    
    /**
     * Almacena una ruta en el caché
     * @param {number} fromR - Fila origen
     * @param {number} fromC - Columna origen
     * @param {number} toR - Fila destino
     * @param {number} toC - Columna destino
     * @param {Array} path - Ruta calculada
     */
    set(fromR, fromC, toR, toC, path) {
        // Si el caché está lleno, eliminar la entrada más antigua
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        const key = this._generateKey(fromR, fromC, toR, toC);
        this.cache.set(key, {
            path: path,
            timestamp: Date.now()
        });
    },
    
    /**
     * Invalida todo el caché (llamar cuando el mapa cambie)
     */
    invalidate() {
        if (typeof Logger !== 'undefined') {
            Logger.debug('PathCache', `Invalidando caché (${this.cache.size} entradas)`);
        }
        this.cache.clear();
    },
    
    /**
     * Invalida rutas que pasan por un hexágono específico
     * @param {number} r - Fila del hexágono modificado
     * @param {number} c - Columna del hexágono modificado
     */
    invalidateAround(r, c) {
        const toDelete = [];
        
        for (const [key, value] of this.cache) {
            // Verificar si la ruta pasa por esta posición
            if (value.path.some(step => step.r === r && step.c === c)) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.cache.delete(key));
        
        if (typeof Logger !== 'undefined' && toDelete.length > 0) {
            Logger.debug('PathCache', `Invalidadas ${toDelete.length} rutas alrededor de (${r},${c})`);
        }
    },
    
    /**
     * Limpia entradas expiradas del caché
     */
    cleanup() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [key, value] of this.cache) {
            if (now - value.timestamp > this.maxAge) {
                toDelete.push(key);
            }
        }
        
        toDelete.forEach(key => this.cache.delete(key));
        
        return toDelete.length;
    },
    
    /**
     * Obtiene estadísticas del caché
     * @returns {Object} Estadísticas
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : 0;
        
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`,
            maxAge: this.maxAge
        };
    },
    
    /**
     * Resetea estadísticas
     */
    resetStats() {
        this.hits = 0;
        this.misses = 0;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PathCache = PathCache;
}

// Limpieza automática cada minuto
if (typeof window !== 'undefined' && window.intervalManager) {
    window.intervalManager.setInterval('pathCacheCleanup', () => {
        const cleaned = PathCache.cleanup();
        if (cleaned > 0 && typeof Logger !== 'undefined') {
            Logger.debug('PathCache', `Limpiadas ${cleaned} entradas expiradas`);
        }
    }, 60000);
}
