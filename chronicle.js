// chronicle.js
// El sistema de narración del juego. El Cronista.

const Chronicle = {
    /**
     * La función principal para registrar y narrar un evento.
     * @param {string} eventType - El tipo de evento (ej: 'turn_start', 'move', 'battle_start').
     * @param {object} data - Un objeto con toda la información contextual del evento.
     */
    logEvent: function(eventType, data) {
        const message = this.generateMessage(eventType, data);
        if (message) {
            // Usamos la función de la consola de depuración que ya existe.
            if (typeof logToConsole === 'function') {
                logToConsole(message, 'chronicle'); // Usaremos un nuevo tipo de estilo
            }
            // También lo mandamos a la consola del navegador para un registro persistente.
            console.log(`[CRÓNICA] ${message}`);
        }
    },

    /**
     * Genera el texto narrativo basado en el tipo de evento y los datos.
     * ¡Aquí es donde ocurre la magia!
     */
    generateMessage: function(eventType, data) {
        // El "año" del juego será el número de turno.
        const year = `Día ${gameState.turnNumber || 1}`;

        switch (eventType) {
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
                return `💥 ¡BATALLA! ${year}: La división "${data.attacker.name}" se lanza al combate contra "${data.defender.name}" en las inmediaciones de ${this.getHexDescription(data.defender.r, data.defender.c)}!`;

            case 'unit_destroyed':
                const casualties = data.destroyedUnit.regiments.length;
                if (data.victorUnit) {
                    return `☠️ ${year}: Tras un feroz combate, la división "${data.destroyedUnit.name}" ha sido aniquilada. Sus ${casualties} regimientos han caído ante el poder de "${data.victorUnit.name}".`;
                } else {
                    return `☠️ ${year}: La división "${data.destroyedUnit.name}", rodeada y sin moral, se rinde. Sus ${casualties} regimientos deponen las armas.`;
                }
            
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