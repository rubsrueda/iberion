// spatialIndex.js
// Índice espacial para búsquedas rápidas de unidades por posición
console.log("spatialIndex.js CARGADO - Índice Espacial de Unidades v1.0");

/**
 * Sistema de índice espacial para búsquedas O(1) en lugar de O(n)
 * Reemplaza búsquedas lineales con .find() por lookups directos en Map
 */
const SpatialIndex = {
    grid: new Map(), // Key: "r,c", Value: unit
    unitToPos: new Map(), // Key: unitId, Value: "r,c" (para actualizaciones rápidas)
    
    /**
     * Genera clave de posición
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {string} Clave
     */
    _key(r, c) {
        return `${r},${c}`;
    },
    
    /**
     * Indexa una unidad en su posición actual
     * @param {Object} unit - Unidad a indexar
     */
    index(unit) {
        if (!unit || typeof unit.r !== 'number' || typeof unit.c !== 'number') {
            if (typeof Logger !== 'undefined') {
                Logger.warn('SpatialIndex', 'Intento de indexar unidad con coordenadas inválidas', unit);
            }
            return false;
        }
        
        const key = this._key(unit.r, unit.c);
        
        // Eliminar índice anterior si la unidad ya estaba indexada en otra posición
        this.unindex(unit.id);
        
        // Añadir a índices
        this.grid.set(key, unit);
        this.unitToPos.set(unit.id, key);
        
        return true;
    },
    
    /**
     * Elimina una unidad del índice
     * @param {string|number} unitId - ID de la unidad
     */
    unindex(unitId) {
        const oldKey = this.unitToPos.get(unitId);
        if (oldKey) {
            this.grid.delete(oldKey);
            this.unitToPos.delete(unitId);
            return true;
        }
        return false;
    },
    
    /**
     * Mueve una unidad en el índice
     * @param {Object} unit - Unidad a mover
     * @param {number} oldR - Fila anterior
     * @param {number} oldC - Columna anterior
     * @param {number} newR - Nueva fila
     * @param {number} newC - Nueva columna
     */
    move(unit, oldR, oldC, newR, newC) {
        const oldKey = this._key(oldR, oldC);
        const newKey = this._key(newR, newC);
        
        // Eliminar de posición antigua
        this.grid.delete(oldKey);
        
        // Añadir a nueva posición
        this.grid.set(newKey, unit);
        this.unitToPos.set(unit.id, newKey);
    },
    
    /**
     * Obtiene la unidad en una posición específica
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {Object|null} Unidad o null
     */
    get(r, c) {
        const key = this._key(r, c);
        return this.grid.get(key) || null;
    },
    
    /**
     * Verifica si hay una unidad en una posición
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {boolean} True si hay unidad
     */
    has(r, c) {
        const key = this._key(r, c);
        return this.grid.has(key);
    },
    
    /**
     * Obtiene todas las unidades en un radio
     * @param {number} r - Fila central
     * @param {number} c - Columna central
     * @param {number} radius - Radio de búsqueda
     * @returns {Array} Array de unidades
     */
    getInRadius(r, c, radius) {
        const results = [];
        
        // Buscar en área cuadrada (más eficiente que calcular distancia hexagonal para cada celda)
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const unit = this.get(r + dr, c + dc);
                if (unit) {
                    // Verificar distancia hexagonal real
                    const dist = hexDistance(r, c, unit.r, unit.c);
                    if (dist <= radius) {
                        results.push(unit);
                    }
                }
            }
        }
        
        return results;
    },
    
    /**
     * Reconstruye todo el índice desde el array global de unidades
     */
    rebuild() {
        this.clear();
        
        if (typeof units !== 'undefined' && Array.isArray(units)) {
            let indexed = 0;
            for (const unit of units) {
                if (unit && unit.currentHealth > 0) {
                    if (this.index(unit)) {
                        indexed++;
                    }
                }
            }
            
            if (typeof Logger !== 'undefined') {
                Logger.info('SpatialIndex', `Índice reconstruido: ${indexed} unidades indexadas`);
            }
            
            return indexed;
        }
        
        return 0;
    },
    
    /**
     * Limpia completamente el índice
     */
    clear() {
        this.grid.clear();
        this.unitToPos.clear();
    },
    
    /**
     * Obtiene estadísticas del índice
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            unidadesIndexadas: this.grid.size,
            posicionesOcupadas: this.grid.size,
            consistencia: this.grid.size === this.unitToPos.size
        };
    },
    
    /**
     * Verifica la consistencia del índice
     * @returns {Object} Resultado de la verificación
     */
    verify() {
        const issues = [];
        
        // Verificar que el array global coincide con el índice
        if (typeof units !== 'undefined' && Array.isArray(units)) {
            for (const unit of units) {
                if (unit && unit.currentHealth > 0) {
                    const indexed = this.get(unit.r, unit.c);
                    if (!indexed) {
                        issues.push(`Unidad ${unit.id} en (${unit.r},${unit.c}) no está indexada`);
                    } else if (indexed.id !== unit.id) {
                        issues.push(`Posición (${unit.r},${unit.c}) tiene unidad incorrecta: ${indexed.id} en lugar de ${unit.id}`);
                    }
                }
            }
        }
        
        // Verificar que el índice no tiene unidades muertas
        for (const [key, unit] of this.grid) {
            if (unit.currentHealth <= 0) {
                issues.push(`Unidad muerta ${unit.id} todavía indexada en ${key}`);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues
        };
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SpatialIndex = SpatialIndex;
}
