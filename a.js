createUnitObject: function(definition, playerNumber, spot) {
        const newUnit = {
            id: `u${unitIdCounter++}`,
            player: playerNumber,
            name: definition.name, // Eliminamos el " IA" que rompía el tutorial
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            r: spot.r, c: spot.c,
            hasMoved: false, hasAttacked: false, level: 0,
            experience: 0, morale: 50, maxMorale: 125
        };

        // Llamamos a la función para que rellene las estadísticas en el objeto
        calculateRegimentStats(newUnit);

        // Ahora que ya tiene estadísticas, inicializamos los valores actuales
        newUnit.currentHealth = newUnit.maxHealth;
        newUnit.currentMovement = newUnit.movement;
        
        return newUnit;
    },