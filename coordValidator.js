/**
 * CoordValidator - Sistema centralizado de validación de coordenadas hexagonales
 * Previene errores por coordenadas inválidas y mejora debugging
 * 
 * @author Iberion Development Team
 * @date Enero 2026
 */

const CoordValidator = {
    /**
     * Verifica si las coordenadas son válidas
     * @param {number} r - Fila (row)
     * @param {number} c - Columna (column)
     * @returns {boolean}
     */
    isValid(r, c) {
        // Validar que sean números
        if (typeof r !== 'number' || typeof c !== 'number') {
            return false;
        }
        
        // Validar que no sean NaN
        if (isNaN(r) || isNaN(c)) {
            return false;
        }
        
        // Validar que sean enteros
        if (!Number.isInteger(r) || !Number.isInteger(c)) {
            return false;
        }
        
        // Validar que sean no negativos
        if (r < 0 || c < 0) {
            return false;
        }
        
        // Validar que estén dentro del tablero (si board existe)
        if (typeof board !== 'undefined' && board.length > 0) {
            if (r >= board.length) {
                return false;
            }
            if (!board[r] || c >= board[r].length) {
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * Lanza un error si las coordenadas son inválidas
     * Útil para funciones críticas que NO deben continuar con coords inválidas
     * 
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {string} context - Contexto de la llamada (nombre de función, módulo, etc.)
     * @throws {Error} Si las coordenadas son inválidas
     */
    assert(r, c, context = '') {
        if (!this.isValid(r, c)) {
            const errorMsg = `[${context}] Coordenadas inválidas: (${r}, ${c})`;
            
            // Usar Logger si está disponible
            if (typeof Logger !== 'undefined') {
                Logger.error('CoordValidator', errorMsg, {
                    r, c, context,
                    boardDimensions: board ? `${board.length}x${board[0]?.length || 0}` : 'undefined'
                });
            } else {
                console.error(errorMsg);
            }
            
            throw new Error(errorMsg);
        }
    },
    
    /**
     * Versión no-crítica: retorna false y loggea advertencia si coords inválidas
     * Útil para funciones que pueden continuar o tomar acción alternativa
     * 
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @param {string} context - Contexto de la llamada
     * @returns {boolean} true si válidas, false si inválidas
     */
    check(r, c, context = '') {
        const valid = this.isValid(r, c);
        
        if (!valid) {
            const warnMsg = `[${context}] Coordenadas inválidas detectadas: (${r}, ${c})`;
            
            if (typeof Logger !== 'undefined') {
                Logger.warn('CoordValidator', warnMsg, {
                    r, c, context,
                    boardDimensions: board ? `${board.length}x${board[0]?.length || 0}` : 'undefined'
                });
            } else {
                console.warn(warnMsg);
            }
        }
        
        return valid;
    },
    
    /**
     * Valida un array de coordenadas
     * @param {Array<{r: number, c: number}>} coords - Array de objetos con coordenadas
     * @param {string} context - Contexto
     * @returns {boolean} true si TODAS son válidas
     */
    isValidArray(coords, context = '') {
        if (!Array.isArray(coords)) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('CoordValidator', `[${context}] Se esperaba un array de coordenadas`, coords);
            }
            return false;
        }
        
        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];
            if (!coord || !this.isValid(coord.r, coord.c)) {
                if (typeof Logger !== 'undefined') {
                    Logger.warn('CoordValidator', 
                        `[${context}] Coordenada inválida en índice ${i}: (${coord?.r}, ${coord?.c})`);
                }
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * Normaliza coordenadas (clamp a límites del tablero)
     * Útil para mouse events que pueden salirse del tablero
     * 
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {{r: number, c: number}} Coordenadas normalizadas
     */
    normalize(r, c) {
        if (typeof board === 'undefined' || !board.length) {
            return { r: 0, c: 0 };
        }
        
        const maxR = board.length - 1;
        const maxC = (board[0]?.length || 1) - 1;
        
        return {
            r: Math.max(0, Math.min(r, maxR)),
            c: Math.max(0, Math.min(c, maxC))
        };
    },
    
    /**
     * Calcula la distancia Manhattan entre dos coordenadas
     * Solo para validación rápida (la distancia hex real está en utils.js)
     * 
     * @param {number} r1 - Fila 1
     * @param {number} c1 - Columna 1
     * @param {number} r2 - Fila 2
     * @param {number} c2 - Columna 2
     * @returns {number} Distancia Manhattan
     */
    manhattanDistance(r1, c1, r2, c2) {
        this.assert(r1, c1, 'manhattanDistance_coord1');
        this.assert(r2, c2, 'manhattanDistance_coord2');
        
        return Math.abs(r1 - r2) + Math.abs(c1 - c2);
    },
    
    /**
     * Verifica si dos coordenadas son adyacentes (vecinas directas)
     * @param {number} r1 - Fila 1
     * @param {number} c1 - Columna 1
     * @param {number} r2 - Fila 2
     * @param {number} c2 - Columna 2
     * @returns {boolean}
     */
    areAdjacent(r1, c1, r2, c2) {
        if (!this.isValid(r1, c1) || !this.isValid(r2, c2)) {
            return false;
        }
        
        // Usar getHexNeighbors si está disponible
        if (typeof getHexNeighbors === 'function') {
            const neighbors = getHexNeighbors(r1, c1);
            return neighbors.some(n => n.r === r2 && n.c === c2);
        }
        
        // Fallback a distancia Manhattan <= 1
        return this.manhattanDistance(r1, c1, r2, c2) <= 1;
    },
    
    /**
     * Devuelve información de debug sobre unas coordenadas
     * @param {number} r - Fila
     * @param {number} c - Columna
     * @returns {Object} Información de debug
     */
    getDebugInfo(r, c) {
        const info = {
            coords: { r, c },
            valid: this.isValid(r, c),
            typeR: typeof r,
            typeC: typeof c,
            isNaNR: isNaN(r),
            isNaNC: isNaN(c),
            isIntegerR: Number.isInteger(r),
            isIntegerC: Number.isInteger(c)
        };
        
        if (typeof board !== 'undefined' && board.length > 0) {
            info.boardDimensions = {
                rows: board.length,
                cols: board[0]?.length || 0
            };
            info.withinBounds = r >= 0 && r < board.length && 
                               c >= 0 && c < (board[r]?.length || 0);
            
            if (info.withinBounds && board[r]?.[c]) {
                info.hexData = {
                    owner: board[r][c].owner,
                    terrain: board[r][c].terrain,
                    hasUnit: units?.some(u => u.r === r && u.c === c) || false
                };
            }
        }
        
        return info;
    },
    
    /**
     * Muestra información de debug en consola
     * @param {number} r - Fila
     * @param {number} c - Columna
     */
    logDebugInfo(r, c) {
        const info = this.getDebugInfo(r, c);
        console.log('[CoordValidator] Debug Info:', info);
        return info;
    },
    
    /**
     * Valida que una ruta/path sea válida
     * @param {Array} path - Array de coordenadas [{r, c}, ...]
     * @param {string} context - Contexto
     * @returns {boolean}
     */
    isValidPath(path, context = '') {
        if (!Array.isArray(path)) {
            if (typeof Logger !== 'undefined') {
                Logger.warn('CoordValidator', `[${context}] Path no es un array`, path);
            }
            return false;
        }
        
        if (path.length === 0) {
            return true; // Path vacío es técnicamente válido
        }
        
        // Validar cada coordenada
        for (let i = 0; i < path.length; i++) {
            const step = path[i];
            if (!this.isValid(step.r, step.c)) {
                if (typeof Logger !== 'undefined') {
                    Logger.warn('CoordValidator', 
                        `[${context}] Coordenada inválida en path índice ${i}: (${step.r}, ${step.c})`);
                }
                return false;
            }
            
            // Validar que cada paso sea adyacente al anterior
            if (i > 0) {
                const prev = path[i - 1];
                if (!this.areAdjacent(prev.r, prev.c, step.r, step.c)) {
                    if (typeof Logger !== 'undefined') {
                        Logger.warn('CoordValidator', 
                            `[${context}] Path no es continuo entre índices ${i-1} y ${i}: ` +
                            `(${prev.r}, ${prev.c}) -> (${step.r}, ${step.c})`);
                    }
                    return false;
                }
            }
        }
        
        return true;
    }
};

// Exponer globalmente
window.CoordValidator = CoordValidator;

// Comandos de debug en consola
window.coordDebug = {
    check: (r, c) => CoordValidator.getDebugInfo(r, c),
    validate: (r, c) => CoordValidator.isValid(r, c),
    normalize: (r, c) => CoordValidator.normalize(r, c),
    areAdjacent: (r1, c1, r2, c2) => CoordValidator.areAdjacent(r1, c1, r2, c2)
};

if (typeof Logger !== 'undefined') {
    Logger.info('CoordValidator', 'Sistema de validación de coordenadas inicializado');
    Logger.debug('CoordValidator', 'Comandos disponibles en window.coordDebug');
} else {
    console.log('[CoordValidator] Sistema inicializado. Comandos en window.coordDebug');
}
