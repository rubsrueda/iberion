/**
 * IaConfigManager
 * 
 * Módulo responsable de cargar, validar y exponer la configuración del motor IA unificado.
 * Especificación: IA_UNIFICACION_ESPECIFICACION_TECNICA.md §5
 * 
 * Estado: v1.0 - 2026-03-26
 * Autor: IA Unificación
 */

const IaConfigManager = {
    config: null,
    isLoaded: false,
    errors: [],

    /**
     * Carga ia_config.json y valida su estructura
     * @returns {Promise<boolean>} true si se cargó correctamente, false en error
     */
    async loadConfig() {
        console.group("%c[IaConfig] Cargando configuración", "color: #4CAF50; font-weight: bold;");
        
        try {
            // En GitHub Pages este recurso puede no publicarse en raíz; evitar 404 ruidoso.
            if (typeof location !== 'undefined' && location.hostname.includes('github.io')) {
                console.log("[IaConfig] Entorno GitHub Pages detectado. Usando configuración por defecto local.");
                this._loadDefaults();
                console.groupEnd();
                return true;
            }

            // Intentar cargar desde raíz local PRIMERO
            let response = await fetch('/ia_config.json');
            if (!response.ok) {
                console.warn(`[IaConfig] No encontrado en /ia_config.json (${response.status}), intentando fallback`);
                // Si no está en raíz, usar defaults inline en lugar de fallar
                this._loadDefaults();
                return true;
            }
            
            const rawConfig = await response.json();
            console.log(`[IaConfig] Archivo cargado exitosamente. Tamaño: ${JSON.stringify(rawConfig).length} bytes`);
            
            // Validar estructura
            const validationErrors = this._validateConfigSchema(rawConfig);
            if (validationErrors.length > 0) {
                console.error("[IaConfig] Errores de validación:");
                validationErrors.forEach(err => console.error(`  ✗ ${err}`));
                this.errors = validationErrors;
                console.warn("[IaConfig] Usando defaults como fallback");
                this._loadDefaults();
                console.groupEnd();
                return true;
            }
            
            this.config = rawConfig;
            this.isLoaded = true;
            console.log(`[IaConfig] ✓ Configuración validada. Versión: ${this.config.version}`);
            console.groupEnd();
            return true;
            
        } catch (error) {
            console.error("[IaConfig] Error cargando archivo:", error.message);
            console.warn("[IaConfig] Usando configuración por defecto");
            this._loadDefaults();
            this.errors = [error.message];
            console.groupEnd();
            return true; // Retorna true porque usamos defaults
        }
    },

    /**
     * Carga configuración por defecto inline (fallback)
     */
    _loadDefaults() {
        this.config = {
            version: "1.0",
            max_misiones_por_turno: 6,
            penalizacion_distancia: 0.1,
            penalizacion_riesgo: 0.5,
            multiplicadores: {
                economia: 1.2,
                supervivencia: 2.0,
                sabotaje: 0.9,
                control: 0.7
            },
            umbrales: {
                economia_critica: 400,
                ataque_ofensivo: 1000,
                salud_critica_unidad: 35,
                ratio_asedio_sin_artilleria: 2.5
            }
        };
        this.isLoaded = true;
        console.log("[IaConfig] ✓ Configuración por defecto loaded");
    },

    /**
     * Valida que la configuración tenga la estructura correcta según schema
     * @private
     * @param {object} config - Configuración a validar
     * @returns {string[]} Array de errores (vacío si válido)
     */
    _validateConfigSchema(config) {
        const errors = [];
        
        // Propiedades requeridas de nivel superior
        const required = ['version', 'multiplicadores', 'penalizacion_distancia', 'penalizacion_riesgo', 'umbrales', 'nodos', 'victoria_puntos'];
        for (const key of required) {
            if (!(key in config)) {
                errors.push(`Propiedad requerida faltante: '${key}'`);
            }
        }
        
        // Validar version (formato "X.Y")
        if (config.version && !/^\d+\.\d+$/.test(config.version)) {
            errors.push(`Campo 'version' debe tener formato 'X.Y', encontré: '${config.version}'`);
        }
        
        // Validar max_misiones_por_turno
        if (config.max_misiones_por_turno && (typeof config.max_misiones_por_turno !== 'number' || config.max_misiones_por_turno < 1 || config.max_misiones_por_turno > 20)) {
            errors.push(`Campo 'max_misiones_por_turno' debe ser número entre 1-20, encontré: ${config.max_misiones_por_turno}`);
        }
        
        // Validar multiplicadores
        if (!config.multiplicadores || typeof config.multiplicadores !== 'object') {
            errors.push("Campo 'multiplicadores' debe ser un objeto");
        } else {
            const multiplierKeys = ['economia', 'supervivencia', 'sabotaje', 'control'];
            for (const key of multiplierKeys) {
                if (!(key in config.multiplicadores) || typeof config.multiplicadores[key] !== 'number' || config.multiplicadores[key] < 0) {
                    errors.push(`Multiplicador '${key}' inválido o faltante`);
                }
            }
        }
        
        // Validar umbrales
        if (!config.umbrales || typeof config.umbrales !== 'object') {
            errors.push("Campo 'umbrales' debe ser un objeto");
        } else {
            const thresholdKeys = ['economia_critica', 'ataque_ofensivo', 'salud_critica_unidad'];
            for (const key of thresholdKeys) {
                if (!(key in config.umbrales) || typeof config.umbrales[key] !== 'number' || config.umbrales[key] < 0) {
                    errors.push(`Umbral '${key}' inválido o faltante`);
                }
            }
        }
        
        // Validar nodos
        if (!config.nodos || typeof config.nodos !== 'object') {
            errors.push("Campo 'nodos' debe ser un objeto");
        } else {
            const requiredNodeTypes = [
                'ciudad_natal_propia', 'ultima_unidad_propia', 'ciudad_propia_conectada',
                'ciudad_propia_desconectada', 'banca', 'ciudad_libre', 'camino_propio_critico',
                'camino_enemigo_critico', 'caravana_propia', 'caravana_enemiga', 'recurso_estrategico',
                'ciudad_enemiga', 'cuello_botella'
            ];
            for (const nodeType of requiredNodeTypes) {
                if (!(nodeType in config.nodos)) {
                    errors.push(`Tipo de nodo requerido faltante: '${nodeType}'`);
                } else {
                    const nodeConfig = config.nodos[nodeType];
                    const weightsKeys = ['peso_base', 'peso_economico', 'peso_supervivencia', 'peso_sabotaje', 'peso_control'];
                    for (const key of weightsKeys) {
                        if (!(key in nodeConfig) || typeof nodeConfig[key] !== 'number' || nodeConfig[key] < 0) {
                            errors.push(`Nodo '${nodeType}': campo '${key}' inválido o faltante`);
                        }
                    }
                }
            }
        }
        
        // Validar victoria_puntos
        if (!config.victoria_puntos || typeof config.victoria_puntos !== 'object') {
            errors.push("Campo 'victoria_puntos' debe ser un objeto");
        } else {
            const pointKeys = ['puntos_por_ciudad', 'puntos_por_unidad_destruida', 'puntos_por_tecnologia', 'multiplicador_recurso_comida', 'multiplicador_recurso_hierro', 'multiplicador_recurso_oro'];
            for (const key of pointKeys) {
                if (!(key in config.victoria_puntos) || typeof config.victoria_puntos[key] !== 'number' || config.victoria_puntos[key] < 0) {
                    errors.push(`Campo 'victoria_puntos.${key}' inválido o faltante`);
                }
            }
        }
        
        return errors;
    },

    /**
     * Obtiene un valor de configuración con fallback seguro
     * @param {string} path - Ruta del valor (ej: "multiplicadores.economia", "nodos.banca.peso_base")
     * @param {*} defaultValue - Valor por defecto si no existe
     * @returns {*} El valor o defaultValue
     */
    get(path, defaultValue = undefined) {
        if (!this.isLoaded || !this.config) {
            console.warn(`[IaConfig] Config no cargada. Retornando valor por defecto para '${path}'`);
            return defaultValue;
        }
        
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                console.warn(`[IaConfig] Ruta no encontrada: '${path}'. Retornando valor por defecto.`);
                return defaultValue;
            }
        }
        
        return value;
    },

    /**
     * Obtiene todo el objeto config (para debugging)
     * @returns {object|null}
     */
    getAll() {
        return this.config;
    },

    /**
     * Recarga la configuración desde archivo
     * @returns {Promise<boolean>}
     */
    async reload() {
        console.log("[IaConfig] Recargando configuración...");
        this.config = null;
        this.isLoaded = false;
        this.errors = [];
        return this.loadConfig();
    },

    /**
     * Retorna estado de carga
     * @returns {object}
     */
    getStatus() {
        return {
            isLoaded: this.isLoaded,
            version: this.config?.version || null,
            errors: this.errors,
            errorCount: this.errors.length
        };
    }
};

/**
 * Inicializa el módulo (debe llamarse una sola vez desde initApp)
 * @static
 * @returns {Promise<void>}
 */
async function initializeIaConfig() {
    if (IaConfigManager.isLoaded || IaConfigManager._initializationInProgress) {
        return; // Ya está cargada o se está cargando
    }
    
    IaConfigManager._initializationInProgress = true;
    console.log("[IaConfig] Iniciando carga de configuración del motor IA...");
    await IaConfigManager.loadConfig();
    IaConfigManager._initializationInProgress = false;
}

// Marca de control para evitar cargas duplicadas
IaConfigManager._initializationInProgress = false;

console.log("[IaConfig] Módulo inicializado. Llamar a initializeIaConfig() desde main.js/gameFlow.js.");
