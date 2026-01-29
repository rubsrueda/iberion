/**
 * Logger - Sistema de logging condicional centralizado
 * Permite controlar niveles de logging según entorno (desarrollo/producción)
 * 
 * @author Iberion Development Team
 * @date Enero 2026
 */

const Logger = {
    // Niveles de logging
    LEVELS: {
        DEBUG: 0,    // Máximo detalle - solo desarrollo
        INFO: 1,     // Información general - desarrollo y staging
        WARN: 2,     // Advertencias - siempre mostrar
        ERROR: 3,    // Errores - siempre mostrar
        NONE: 4      // Sin logs - producción extrema
    },
    
    // Nivel actual (se configura según entorno)
    currentLevel: 1, // INFO por defecto
    
    // Módulos habilitados para logging (vacío = todos)
    enabledModules: [],
    
    // Configuración
    config: {
        showTimestamp: true,
        showModule: true,
        colorize: true,
        saveToStorage: false,
        maxStoredLogs: 100
    },
    
    // Buffer de logs para debugging posterior
    logBuffer: [],
    
    /**
     * Configura el nivel de logging
     * @param {string} level - 'debug', 'info', 'warn', 'error', 'none'
     */
    setLevel(level) {
        const upperLevel = level.toUpperCase();
        if (this.LEVELS.hasOwnProperty(upperLevel)) {
            this.currentLevel = this.LEVELS[upperLevel];
            console.log(`[Logger] Nivel configurado a: ${level}`);
        } else {
            console.error(`[Logger] Nivel inválido: ${level}`);
        }
    },
    
    /**
     * Configura qué módulos mostrar logs (filtro)
     * @param {Array<string>} modules - Array de nombres de módulos ['network', 'combat', etc.]
     */
    setEnabledModules(modules) {
        this.enabledModules = modules || [];
        console.log('[Logger] Módulos habilitados:', this.enabledModules);
    },
    
    /**
     * Habilita/deshabilita opciones de configuración
     * @param {Object} options - Opciones a modificar
     */
    configure(options) {
        Object.assign(this.config, options);
        console.log('[Logger] Configuración actualizada:', this.config);
    },
    
    /**
     * Formatea el mensaje con timestamp y módulo
     * @private
     */
    _formatMessage(module, message, level) {
        let formatted = '';
        
        // Timestamp
        if (this.config.showTimestamp) {
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES', { hour12: false });
            formatted += `[${time}] `;
        }
        
        // Nivel
        formatted += `[${level}] `;
        
        // Módulo
        if (this.config.showModule && module) {
            formatted += `[${module}] `;
        }
        
        formatted += message;
        return formatted;
    },
    
    /**
     * Verifica si debe mostrar el log según nivel y módulo
     * @private
     */
    _shouldLog(module, level) {
        // Verificar nivel
        if (level < this.currentLevel) {
            return false;
        }
        
        // Verificar filtro de módulos (si está configurado)
        if (this.enabledModules.length > 0 && !this.enabledModules.includes(module)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Guarda log en buffer para debugging posterior
     * @private
     */
    _saveToBuffer(module, message, level) {
        const entry = {
            timestamp: Date.now(),
            module,
            message,
            level,
            formatted: this._formatMessage(module, message, level)
        };
        
        this.logBuffer.push(entry);
        
        // Limitar tamaño del buffer
        if (this.logBuffer.length > this.config.maxStoredLogs) {
            this.logBuffer.shift();
        }
        
        // Guardar en localStorage si está habilitado
        if (this.config.saveToStorage) {
            try {
                localStorage.setItem('iberion_logs', JSON.stringify(this.logBuffer));
            } catch (e) {
                // Ignorar errores de localStorage lleno
            }
        }
    },
    
    /**
     * Logging nivel DEBUG (máximo detalle)
     * Solo se muestra en desarrollo
     * 
     * @param {string} module - Nombre del módulo/componente
     * @param {string} message - Mensaje a loggear
     * @param {*} data - Datos adicionales opcionales
     */
    debug(module, message, data = null) {
        if (!this._shouldLog(module, this.LEVELS.DEBUG)) return;
        
        const formatted = this._formatMessage(module, message, 'DEBUG');
        this._saveToBuffer(module, message, 'DEBUG');
        
        if (this.config.colorize) {
            console.log(`%c${formatted}`, 'color: #888');
        } else {
            console.log(formatted);
        }
        
        if (data !== null) {
            console.log(data);
        }
    },
    
    /**
     * Logging nivel INFO (información general)
     * Se muestra en desarrollo y staging
     * 
     * @param {string} module - Nombre del módulo/componente
     * @param {string} message - Mensaje a loggear
     * @param {*} data - Datos adicionales opcionales
     */
    info(module, message, data = null) {
        if (!this._shouldLog(module, this.LEVELS.INFO)) return;
        
        const formatted = this._formatMessage(module, message, 'INFO');
        this._saveToBuffer(module, message, 'INFO');
        
        if (this.config.colorize) {
            console.log(`%c${formatted}`, 'color: #2196F3');
        } else {
            console.log(formatted);
        }
        
        if (data !== null) {
            console.log(data);
        }
    },
    
    /**
     * Logging nivel WARN (advertencias)
     * Siempre se muestra excepto en NONE
     * 
     * @param {string} module - Nombre del módulo/componente
     * @param {string} message - Mensaje a loggear
     * @param {*} data - Datos adicionales opcionales
     */
    warn(module, message, data = null) {
        if (!this._shouldLog(module, this.LEVELS.WARN)) return;
        
        const formatted = this._formatMessage(module, message, 'WARN');
        this._saveToBuffer(module, message, 'WARN');
        
        if (this.config.colorize) {
            console.warn(`%c${formatted}`, 'color: #FF9800; font-weight: bold');
        } else {
            console.warn(formatted);
        }
        
        if (data !== null) {
            console.warn(data);
        }
    },
    
    /**
     * Logging nivel ERROR (errores)
     * Siempre se muestra excepto en NONE
     * 
     * @param {string} module - Nombre del módulo/componente
     * @param {string} message - Mensaje a loggear
     * @param {*} error - Error object o datos adicionales
     */
    error(module, message, error = null) {
        if (!this._shouldLog(module, this.LEVELS.ERROR)) return;
        
        const formatted = this._formatMessage(module, message, 'ERROR');
        this._saveToBuffer(module, message, 'ERROR');
        
        if (this.config.colorize) {
            console.error(`%c${formatted}`, 'color: #F44336; font-weight: bold');
        } else {
            console.error(formatted);
        }
        
        if (error !== null) {
            console.error(error);
        }
    },
    
    /**
     * Logging de grupos (colapsa múltiples logs relacionados)
     * 
     * @param {string} module - Nombre del módulo
     * @param {string} groupName - Nombre del grupo
     * @param {Function} callback - Función que contiene los logs del grupo
     * @param {boolean} collapsed - Si debe aparecer colapsado
     */
    group(module, groupName, callback, collapsed = false) {
        if (!this._shouldLog(module, this.currentLevel)) return;
        
        const formatted = this._formatMessage(module, groupName, 'GROUP');
        
        if (collapsed) {
            console.groupCollapsed(formatted);
        } else {
            console.group(formatted);
        }
        
        callback();
        console.groupEnd();
    },
    
    /**
     * Devuelve logs guardados en el buffer
     * @param {number} limit - Número máximo de logs a devolver
     * @returns {Array}
     */
    getLogs(limit = null) {
        if (limit) {
            return this.logBuffer.slice(-limit);
        }
        return [...this.logBuffer];
    },
    
    /**
     * Limpia el buffer de logs
     */
    clearLogs() {
        this.logBuffer = [];
        if (this.config.saveToStorage) {
            localStorage.removeItem('iberion_logs');
        }
        console.log('[Logger] Buffer de logs limpiado');
    },
    
    /**
     * Exporta logs a archivo de texto
     */
    exportLogs() {
        const logsText = this.logBuffer
            .map(entry => entry.formatted)
            .join('\n');
        
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iberion_logs_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('[Logger] Logs exportados');
    },
    
    /**
     * Muestra estadísticas de logging
     */
    showStats() {
        const stats = {
            total: this.logBuffer.length,
            byLevel: {},
            byModule: {},
            currentLevel: Object.keys(this.LEVELS).find(
                key => this.LEVELS[key] === this.currentLevel
            )
        };
        
        this.logBuffer.forEach(entry => {
            // Por nivel
            stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
            // Por módulo
            stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
        });
        
        console.log('[Logger] Estadísticas:', stats);
        return stats;
    }
};

// Configuración según entorno
// Permite forzar nivel vía query (?log=debug|info|warn|error|none) o localStorage (iberion_log_level)
let forcedLevel = null;
try {
    const urlParams = new URLSearchParams(window.location.search);
    forcedLevel = urlParams.get('log') || localStorage.getItem('iberion_log_level');
} catch (e) {
    forcedLevel = null;
}

if (forcedLevel) {
    Logger.setLevel(forcedLevel);
    Logger.configure({ colorize: true, saveToStorage: true });
    console.log(`[Logger] Nivel forzado: ${forcedLevel}`);
} else if (window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('dev') ||
    window.location.hostname.includes('staging')) {
    Logger.setLevel('debug');
    Logger.configure({ colorize: true, saveToStorage: true });
    console.log('%c[Logger] Modo DESARROLLO activado', 'color: #4CAF50; font-weight: bold');
} else {
    Logger.setLevel('warn');
    Logger.configure({ colorize: false, saveToStorage: false });
    console.log('[Logger] Modo PRODUCCIÓN activado');
}

// Exponer globalmente
window.Logger = Logger;

// Comandos de consola para debugging
window.loggerDebug = {
    showStats: () => Logger.showStats(),
    exportLogs: () => Logger.exportLogs(),
    clearLogs: () => Logger.clearLogs(),
    setLevel: (level) => Logger.setLevel(level),
    enableModule: (module) => Logger.setEnabledModules([module]),
    enableAll: () => Logger.setEnabledModules([])
};

console.log('[Logger] Sistema inicializado. Comandos disponibles en window.loggerDebug');
