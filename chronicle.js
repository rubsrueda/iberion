// chronicle.js
// El sistema de narración del juego. El Cronista.

const Chronicle = {
    /**
     * La función principal para registrar y narrar un evento.
     * @param {string} eventType - El tipo de evento (ej: 'turn_start', 'move', 'battle_start').
     * @param {object} data - Un objeto con toda la información contextual del evento.
     */

    currentMatchLogs: [], // <--- Almacén de eventos de la partida actual

    logEvent: function(eventType, data) {
        const message = this.generateMessage(eventType, data);
        if (message) {
            // Almacenar en el array para persistencia
            this.currentMatchLogs.push({
                turn: gameState.turnNumber || 1,
                type: eventType,
                message: message,
                data: data,
                timestamp: Date.now()
            });

            // Usamos la función de la consola de depuración que ya existe.
            if (typeof logToConsole === 'function') {
                logToConsole(message, 'chronicle');
            }
                    // Enviar al Event Feed visual
                    if (typeof EventFeed !== 'undefined') EventFeed.push(eventType, message);
        }
    },

    clearLogs: function() { this.currentMatchLogs = []; }, // Limpiar al empezar partida

    /**
     * Obtiene todos los logs actuales para mostrar en la UI
     */
    getLogs: function() {
        return this.currentMatchLogs;
    },

    /**
     * Filtra logs por tipo de evento
     */
    getLogsByType: function(eventType) {
        return this.currentMatchLogs.filter(log => log.type === eventType);
    },

    _getEmpireName: function(playerId) {
        const civKey = gameState?.playerCivilizations?.[playerId];
        return CIVILIZATIONS?.[civKey]?.name || `Jugador ${playerId}`;
    },

    _getDivisionName: function(unit) {
        return unit?.name || 'una división sin nombre';
    },

    _getCityNameAt: function(r, c) {
        return gameState?.cities?.find(city => city.r === r && city.c === c)?.name || null;
    },

    /**
     * Genera el texto narrativo basado en el tipo de evento y los datos.
     * ¡Aquí es donde ocurre la magia!
     */
    generateMessage: function(eventType, data) {
        // El "año" del juego será el número de turno.
        const year = `Día ${gameState.turnNumber || 1}`;

        switch (eventType) {
            case 'game_start':
                const mapType = data.isNaval ? 'Naval' : 'Terrestre';
                const resourceLevelText = data.resourceLevel === 'max' ? 'abundantes' : data.resourceLevel === 'min' ? 'escasos' : 'moderados';
                return `📜 ${year}: Comienza una campaña ${mapType.toLowerCase()} entre ${data.numPlayers} potencias sobre un mapa ${data.boardSize}. Los recursos del mundo son ${resourceLevelText} y el destino de los imperios queda abierto.`;
            
            case 'turn_start':
                return `🕰️ ${year}: Se abre una nueva jornada de campaña bajo el signo de ${gameState?.currentSeasonName || 'tiempos inciertos'}.`;
            
            case 'move':
                return null;

            case 'conquest':
                const cityConquered = gameState.cities.find(c => c.r === data.toR && c.c === data.toC);
                const empireName = this._getEmpireName(data.unit?.player);
                if (cityConquered) {
                    return `⚔️ ${year}: ${empireName} rompe las defensas de ${cityConquered.name}. La división "${this._getDivisionName(data.unit)}" alza su estandarte sobre la ciudad caída.`;
                } else {
                    return `⚔️ ${year}: ${empireName} extiende sus fronteras y asegura ${this.getHexDescription(data.toR, data.toC)} mediante la división "${this._getDivisionName(data.unit)}".`;
                }
            
            case 'battle_start':
                const defenderLoc = this.getHexDescription(data.defender.r, data.defender.c);
                return `💥 ${year}: En ${defenderLoc}, "${this._getDivisionName(data.attacker)}" de ${this._getEmpireName(data.attacker?.player)} embiste a "${this._getDivisionName(data.defender)}" de ${this._getEmpireName(data.defender?.player)}.`;

            case 'unit_destroyed':
                if (data.victorUnit) {
                    const numRegiments = data.destroyedUnit.regiments?.length || 0;
                    return `☠️ ${year}: La división "${this._getDivisionName(data.destroyedUnit)}" es borrada del campo. ${numRegiments} regimientos sucumben ante "${this._getDivisionName(data.victorUnit)}" de ${this._getEmpireName(data.victorUnit?.player)}.`;
                } else {
                    const numRegiments = data.destroyedUnit.regiments?.length || 0;
                    return `☠️ ${year}: Cercada y sin esperanza, la división "${this._getDivisionName(data.destroyedUnit)}" se derrumba. ${numRegiments} regimientos depusieron las armas.`;
                }

            case 'construction':
                if (data.isCity) {
                    return `🏛️ ${year}: ${this._getEmpireName(data.playerId)} funda la ciudad de ${data.name}, un nuevo faro de poder en (${data.location[0]},${data.location[1]}).`;
                } else {
                    return `🏗️ ${year}: Los ingenieros de ${this._getEmpireName(data.playerId)} levantan ${data.name} en (${data.location[0]},${data.location[1]}), reforzando la campaña.`;
                }
            
            case 'commander_assigned':
                return `👑 ${year}: ${data.commander?.name || 'Un comandante'} toma el mando de "${this._getDivisionName(data.unit)}", y el ejército ajusta filas bajo su autoridad.`;
            
            case 'consolidate':
                return null;

            case 'trade_route_started':
                return `🛤️ ${year}: Se abre una ruta de comercio entre ${data.originName || 'dos plazas aliadas'} y ${data.destinationName || 'un mercado lejano'}, prometiendo riqueza para ${this._getEmpireName(data.player)}.`;

            case 'trade_route_failed':
                return `⚠️ ${year}: Los mercaderes de ${this._getEmpireName(data.player)} no logran asegurar una ruta estable${data.destination ? ` hacia ${data.destination}` : ''}. El camino sigue siendo incierto.`;

            case 'ia_decision':
                return null;
            
            // Podemos añadir muchos más tipos de eventos aquí...
            
            default:
                return null; // No generar mensaje si el tipo de evento no se reconoce
        }
    },

    /**
     * Función de ayuda para describir una ubicación de forma narrativa.
     */
    getHexDescription: function(r, c) {
        const hex = board[r]?.[c];
        if (!hex) return `tierras desconocidas (${r},${c})`;
        const city = gameState.cities.find(city => city.r === r && city.c === c);
        const terrainName = TERRAIN_TYPES[hex.terrain]?.name || "terreno";
        
        if (city) return `la ciudad de ${city.name}`;
        return `las ${terrainName.toLowerCase()}s en (${r},${c})`;
    }
};
// =============================================================================
// EventFeed — Panel lateral de eventos durante la partida
// =============================================================================
const EventFeed = {
    _panel: null,
    _list: null,
    _minBtn: null,
    _maxItems: 7,

    _typeMap: {
        battle_start:       'feed-battle',
        unit_destroyed:     'feed-battle',
        conquest:           'feed-conquest',
        construction:       'feed-build',
        commander_assigned: 'feed-milestone',
        game_start:         'feed-milestone',
    },

    _skip: new Set(['move', 'turn_start', 'consolidate']),

    init: function() {
        this._panel = document.getElementById('event-feed');
        this._list  = document.getElementById('event-feed-list');
        this._minBtn = document.getElementById('event-feed-minimize-btn');
        this._setupMinimizeButton();
        this.restoreMinimizePreference();
    },

    _setupMinimizeButton: function() {
        if (!this._minBtn || this._minBtn.dataset.bound === '1') return;
        this._minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMinimize();
        });
        this._minBtn.dataset.bound = '1';
    },

    toggleMinimize: function() {
        if (!this._panel) this.init();
        if (!this._panel) return;

        this._panel.classList.toggle('minimized');
        const minimized = this._panel.classList.contains('minimized');
        if (this._minBtn) this._minBtn.textContent = minimized ? '+' : '−';
        localStorage.setItem('eventFeedMinimized', minimized ? 'true' : 'false');
    },

    restoreMinimizePreference: function() {
        if (!this._panel) return;
        const isMinimized = localStorage.getItem('eventFeedMinimized') === 'true';
        this._panel.classList.toggle('minimized', isMinimized);
        if (this._minBtn) this._minBtn.textContent = isMinimized ? '+' : '−';
    },

    show: function() {
        if (!this._panel) this.init();
        if (this._panel) this._panel.style.display = 'flex';
    },

    hide: function() {
        if (this._panel) this._panel.style.display = 'none';
    },

    push: function(eventType, message) {
        if (this._skip.has(eventType)) return;
        if (!this._list) this.init();
        if (!this._list) return;

        while (this._list.children.length >= this._maxItems) {
            this._list.removeChild(this._list.lastChild);
        }

        const item = document.createElement('div');
        item.className = 'event-feed-item ' + (this._typeMap[eventType] || '');
        item.textContent = message.length > 90 ? message.slice(0, 87) + '\u2026' : message;
        this._list.insertBefore(item, this._list.firstChild);

        if (this._panel && this._panel.style.display === 'none') this.show();
    },

    clear: function() {
        if (this._list) this._list.innerHTML = '';
        this.hide();
    }
};
