/**
 * UnitGrid - Sistema de indexación espacial para unidades
 * Optimiza búsquedas de unidades por coordenadas de O(n) a O(1)
 * 
 * @author Iberion Development Team
 * @date Enero 2026
 */

const UnitGrid = {
    // Grid espacial: Mapa de "r,c" -> unidad
    grid: new Map(),
    
    // Índice inverso: Mapa de unitId -> "r,c" para actualización rápida
    unitPositions: new Map(),
    
    // Estadísticas para monitoring
    stats: {
        totalIndexed: 0,
        totalQueries: 0,
        totalMoves: 0,
        cacheHits: 0
    },
    
    /**
     * Convierte coordenadas a key string
     * @private
     */
    _toKey(r, c) {
        return `${r},${c}`;
    },
    
    /**
     * Convierte key string a coordenadas
     * @private
     */
    _fromKey(key) {
        const [r, c] = key.split(',').map(Number);
        return { r, c };
    },
    
    /**
     * Inicializa el grid con todas las unidades existentes
     * Debe llamarse al inicio del juego o tras cargar partida
     */
    initialize() {
        this.clear();
        
        if (typeof units === 'undefined' || !Array.isArray(units)) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 'Array units no disponible, no se puede indexar');
            }
            return;
        }
        
        let indexed = 0;
        for (const unit of units) {
            if (this._isValidUnit(unit)) {
                this.index(unit);
                indexed++;
            }
        }
        
        if (typeof Logger !== 'undefined') {
            Logger.info('UnitGrid', `Grid inicializado con ${indexed} unidades`);
        } else {
            console.log(`[UnitGrid] Grid inicializado con ${indexed} unidades`);
        }
    },
    
    /**
     * Valida que un objeto sea una unidad válida
     * @private
     */
    _isValidUnit(unit) {
        return unit && 
               typeof unit.id !== 'undefined' &&
               typeof unit.r === 'number' && 
               typeof unit.c === 'number' &&
               !isNaN(unit.r) && !isNaN(unit.c);
    },
    
    /**
     * Añade una unidad al grid
     * @param {Object} unit - Unidad a indexar
     */
    index(unit) {
        if (!this._isValidUnit(unit)) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 'Intento de indexar unidad inválida', unit);
            }
            return false;
        }
        
        const key = this._toKey(unit.r, unit.c);
        
        // Si ya hay una unidad en esa posición, advertir
        const existing = this.grid.get(key);
        if (existing && existing.id !== unit.id) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 
                    `Ya existe unidad ${existing.id} en (${unit.r}, ${unit.c}). Reemplazando con ${unit.id}`);
            }
            this.unindex(existing);
        }
        
        this.grid.set(key, unit);
        this.unitPositions.set(unit.id, key);
        this.stats.totalIndexed++;
        
        if (typeof Logger !== 'undefined') {
            Logger.debug('UnitGrid', `Unidad ${unit.id} indexada en (${unit.r}, ${unit.c})`);
        }
        
        return true;
    },
    
    /**
     * Elimina una unidad del grid
     * @param {Object} unit - Unidad a des-indexar
     */
    unindex(unit) {
        if (!unit || typeof unit.id === 'undefined') {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 'Intento de des-indexar unidad sin ID', unit);
            }
            return false;
        }
        
        const oldKey = this.unitPositions.get(unit.id);
        if (oldKey) {
            this.grid.delete(oldKey);
            this.unitPositions.delete(unit.id);
            
            if (typeof Logger !== 'undefined') {
                Logger.debug('UnitGrid', `Unidad ${unit.id} des-indexada de ${oldKey}`);
            }
            
            return true;
        }
        
        return false;
    },
    
    /**
     * Actualiza la posición de una unidad en el grid
     * Debe llamarse DESPUÉS de cambiar unit.r y unit.c
     * 
     * @param {Object} unit - Unidad que se movió
     * @param {number} oldR - Fila anterior
     * @param {number} oldC - Columna anterior
     */
    move(unit, oldR, oldC) {
        if (!this._isValidUnit(unit)) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 'Intento de mover unidad inválida', unit);
            }
            return false;
        }
        
        const oldKey = this._toKey(oldR, oldC);
        const newKey = this._toKey(unit.r, unit.c);
        
        // Verificar que la unidad estaba en la posición antigua
        const unitAtOldPos = this.grid.get(oldKey);
        if (!unitAtOldPos || unitAtOldPos.id !== unit.id) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 
                    `Unidad ${unit.id} no encontrada en posición antigua (${oldR}, ${oldC})`);
            }
            // Re-indexar de todas formas
            this.grid.delete(oldKey);
        } else {
            this.grid.delete(oldKey);
        }
        
        // Añadir en nueva posición
        this.grid.set(newKey, unit);
        this.unitPositions.set(unit.id, newKey);
        this.stats.totalMoves++;
        
        if (typeof Logger !== 'undefined') {
            Logger.debug('UnitGrid', 
                `Unidad ${unit.id} movida de (${oldR}, ${oldC}) a (${unit.r}, ${unit.c})`);
        }
        
        return true;
    },
    
    /**
     * Obtiene la unidad en unas coordenadas específicas (O(1))
     * Esta es la función principal que reemplaza units.find()
     * 
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {Object|null} Unidad en esa posición o null
     */
    get(r, c) {
        this.stats.totalQueries++;
        
        const key = this._toKey(r, c);
        const unit = this.grid.get(key);
        
        if (unit) {
            this.stats.cacheHits++;
        }
        
        return unit || null;
    },
    
    /**
     * Obtiene todas las unidades en un área rectangular
     * @param {number} r1 - Fila inicio
     * @param {number} c1 - Columna inicio
     * @param {number} r2 - Fila fin
     * @param {number} c2 - Columna fin
     * @returns {Array<Object>} Array de unidades en el área
     */
    getInArea(r1, c1, r2, c2) {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        
        const unitsInArea = [];
        
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const unit = this.get(r, c);
                if (unit) {
                    unitsInArea.push(unit);
                }
            }
        }
        
        return unitsInArea;
    },
    
    /**
     * Obtiene todas las unidades adyacentes a unas coordenadas
     * @param {number} r - Fila central
     * @param {number} c - Columna central
     * @returns {Array<Object>} Array de unidades vecinas
     */
    getNeighbors(r, c) {
        if (typeof getHexNeighbors !== 'function') {
            if (typeof Logger !== 'undefined') {
                Logger.warn('UnitGrid', 'getHexNeighbors no disponible, usando búsqueda 3x3');
            }
            return this.getInArea(r - 1, c - 1, r + 1, c + 1)
                       .filter(u => u.r !== r || u.c !== c);
        }
        
        const neighbors = getHexNeighbors(r, c);
        const units = [];
        
        for (const neighbor of neighbors) {
            const unit = this.get(neighbor.r, neighbor.c);
            if (unit) {
                units.push(unit);
            }
        }
        
        return units;
    },
    
    /**
     * Obtiene todas las unidades de un jugador específico
     * Nota: Esto sigue siendo O(n), pero útil para operaciones batch
     * 
     * @param {number} playerId - ID del jugador
     * @returns {Array<Object>}
     */
    getByPlayer(playerId) {
        const playerUnits = [];
        
        for (const unit of this.grid.values()) {
            if (unit.owner === playerId) {
                playerUnits.push(unit);
            }
        }
        
        return playerUnits;
    },
    
    /**
     * Obtiene una unidad por su ID
     * @param {number} unitId - ID de la unidad
     * @returns {Object|null}
     */
    getById(unitId) {
        const key = this.unitPositions.get(unitId);
        if (key) {
            return this.grid.get(key);
        }
        return null;
    },
    
    /**
     * Verifica si hay una unidad en unas coordenadas
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {boolean}
     */
    has(r, c) {
        return this.grid.has(this._toKey(r, c));
    },
    
    /**
     * Limpia completamente el grid
     */
    clear() {
        this.grid.clear();
        this.unitPositions.clear();
        
        if (typeof Logger !== 'undefined') {
            Logger.debug('UnitGrid', 'Grid limpiado');
        }
    },
    
    /**
     * Re-sincroniza el grid con el array units global
     * Útil si units se modifica externamente
     */
    resync() {
        if (typeof Logger !== 'undefined') {
            Logger.info('UnitGrid', 'Re-sincronizando grid...');
        }
        
        this.initialize();
    },
    
    /**
     * Valida la integridad del grid vs el array units
     * Útil para debugging
     * @returns {Object} Resultado de validación
     */
    validate() {
        if (typeof units === 'undefined') {
            return { valid: false, error: 'Array units no disponible' };
        }
        
        const issues = [];
        
        // Verificar que todas las unidades en units estén en el grid
        for (const unit of units) {
            if (!this._isValidUnit(unit)) continue;
            
            const gridUnit = this.get(unit.r, unit.c);
            if (!gridUnit) {
                issues.push(`Unidad ${unit.id} en (${unit.r}, ${unit.c}) no está en el grid`);
            } else if (gridUnit.id !== unit.id) {
                issues.push(`Mismatch en (${unit.r}, ${unit.c}): grid tiene ${gridUnit.id}, units tiene ${unit.id}`);
            }
        }
        
        // Verificar que todas las unidades en el grid existan en units
        for (const [key, gridUnit] of this.grid) {
            const { r, c } = this._fromKey(key);
            const unitExists = units.some(u => u.id === gridUnit.id);
            if (!unitExists) {
                issues.push(`Unidad ${gridUnit.id} en grid (${r}, ${c}) no existe en array units`);
            }
        }
        
        const valid = issues.length === 0;
        
        return {
            valid,
            issues,
            totalInGrid: this.grid.size,
            totalInUnits: units.length
        };
    },
    
    /**
     * Devuelve estadísticas del grid
     * @returns {Object}
     */
    getStats() {
        const hitRate = this.stats.totalQueries > 0
            ? (this.stats.cacheHits / this.stats.totalQueries * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            currentSize: this.grid.size,
            hitRate: `${hitRate}%`
        };
    },
    
    /**
     * Muestra estadísticas en consola
     */
    logStats() {
        const stats = this.getStats();
        console.log('[UnitGrid] Estadísticas:', stats);
        return stats;
    }
};

// Exponer globalmente
window.UnitGrid = UnitGrid;

// Comandos de debug en consola
window.unitGridDebug = {
    stats: () => UnitGrid.logStats(),
    validate: () => UnitGrid.validate(),
    resync: () => UnitGrid.resync(),
    get: (r, c) => UnitGrid.get(r, c),
    getNeighbors: (r, c) => UnitGrid.getNeighbors(r, c),
    getByPlayer: (playerId) => UnitGrid.getByPlayer(playerId)
};

if (typeof Logger !== 'undefined') {
    Logger.info('UnitGrid', 'Sistema de indexación espacial inicializado');
    Logger.debug('UnitGrid', 'Comandos disponibles en window.unitGridDebug');
} else {
    console.log('[UnitGrid] Sistema inicializado. Comandos en window.unitGridDebug');
}
