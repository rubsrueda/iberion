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
                return `🎮 ¡NUEVA PARTIDA! Se ha iniciado una batalla ${mapType} con ${data.numPlayers} jugadores en un mapa de ${data.boardSize}. Recursos: ${resourceLevelText}.`;
            
            case 'turn_start':
                return `--- ${year}, Estación de Campaña ---`;
            
            case 'move':
                const hexDesc = this.getHexDescription(data.toR, data.toC);
                return `📜 ${year}: La división "${data.unit.name}" avanza con paso firme hacia ${hexDesc}.`;

            case 'conquest':
                const cityConquered = gameState.cities.find(c => c.r === data.toR && c.c === data.toC);
                if (cityConquered) {
                    return `⚔️ ¡CONQUISTA! ${year}: Las tropas de "${data.unit.name}" entran triunfantes en la ciudad de ${cityConquered.name}, que cae bajo nuestro estandarte.`;
                } else {
                    return `⚔️ ¡CONQUISTA! ${year}: El territorio en ${this.getHexDescription(data.toR, data.toC)} ha sido asegurado por la división "${data.unit.name}".`;
                }
            
            case 'battle_start':
                const defenderLoc = this.getHexDescription(data.defender.r, data.defender.c);
                return `💥 ¡BATALLA! ${year}: La división "${data.attacker.name}" (J${data.attacker.player}) se lanza al combate contra "${data.defender.name}" (J${data.defender.player}) en ${defenderLoc}!`;

            case 'unit_destroyed':
                if (data.victorUnit) {
                    const numRegiments = data.destroyedUnit.regiments?.length || 0;
                    return `☠️ ${year}: Tras un feroz combate, la división "${data.destroyedUnit.name}" (J${data.destroyedUnit.player}) ha sido aniquilada. Sus ${numRegiments} regimientos han caído ante el poder de "${data.victorUnit.name}" (J${data.victorUnit.player}).`;
                } else {
                    const numRegiments = data.destroyedUnit.regiments?.length || 0;
                    return `☠️ ${year}: La división "${data.destroyedUnit.name}" (J${data.destroyedUnit.player}), rodeada y sin moral, se rinde. Sus ${numRegiments} regimientos deponen las armas.`;
                }

            case 'construction':
                if (data.isCity) {
                    return `🏛️ ¡CIUDAD FUNDADA! ${year}: La ciudad de ${data.name} ha sido fundada en (${data.location[0]},${data.location[1]}) por el Jugador ${data.playerId}.`;
                } else {
                    return `🏗️ ${year}: Se ha construido una ${data.name} en (${data.location[0]},${data.location[1]}).`;
                }
            
            case 'commander_assigned':
                return `👑 ${year}: El comandante ${data.commander?.name || 'desconocido'} ha tomado el mando de la división "${data.unit.name}".`;
            
            case 'consolidate':
                return `🔄 ${year}: La división "${data.unit.name}" ha consolidado sus fuerzas, recuperando moral y reorganizando sus regimientos.`;
            
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
        },
    },
        _setupMinimizeButton: function() {
            if (!this._minBtn) return;
            this._minBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMinimize();
            });
        },

        toggleMinimize: function() {
            if (!this._panel) this.init();
            this._panel.classList.toggle('minimized');
            // Cambiar el ícono del botón
            if (this._minBtn) {
                this._minBtn.textContent = this._panel.classList.contains('minimized') ? '+' : '−';
            }
            // Guardar preferencia en localStorage
            localStorage.setItem('eventFeedMinimized', this._panel.classList.contains('minimized'));
        },
    show: function() {
        restoreMinimizePreference: function() {
            if (!this._panel) this.init();
            const isMinimized = localStorage.getItem('eventFeedMinimized') === 'true';
            if (isMinimized) {
                this._panel.classList.add('minimized');
                if (this._minBtn) this._minBtn.textContent = '+';
            }
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
