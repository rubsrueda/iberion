createUnitObject: function(definition, playerNumber, spot) {
        const newUnit = {
            id: `u${unitIdCounter++}`,
            player: playerNumber,
            name: `${definition.name} IA`,
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            r: spot.r, c: spot.c,
            hasMoved: false, hasAttacked: false, level: 0,
            experience: 0, morale: 50, maxMorale: 125
        };

        // Llama a la nueva función central para añadir los stats
        calculateRegimentStats(newUnit);

        // Asigna la vida y movimiento usando los stats recién añadidos
        newUnit.currentHealth = newUnit.maxHealth;
        newUnit.currentMovement = newUnit.movement;
        
        console.log(`[IA DEPLOY] Unidad ${newUnit.name} creada con stats: Atk=${newUnit.attack}, Def=${newUnit.defense}`);
        return newUnit;
    },