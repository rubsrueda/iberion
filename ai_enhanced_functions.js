// ai_enhanced_functions.js - Funciones avanzadas de IA
// Este archivo contiene mejoras estratégicas para la IA del juego

console.log("ai_enhanced_functions.js CARGADO - Mejoras Estratégicas de IA v2.0");

// Extensiones para AiGameplayManager
Object.assign(AiGameplayManager, {

    /**
     * Implementa la retirada táctica de una unidad amenazada
     */
    executeRetreat: async function(unit, enemies) {
        console.log(`[IA Retreat] ${unit.name} está en retirada táctica...`);
        
        // Buscar hexágonos seguros (lejos de enemigos, cerca de aliados)
        const safeHexes = [];
        const reachableHexes = this.getReachableHexes(unit);
        const allies = units.filter(u => u.player === unit.player && u.id !== unit.id && u.currentHealth > 0);
        
        for (const hex of reachableHexes) {
            // Calcular distancia mínima a enemigos
            const minEnemyDist = Math.min(...enemies.map(e => hexDistance(hex.r, hex.c, e.r, e.c)));
            
            // Calcular distancia mínima a aliados
            const minAllyDist = allies.length > 0 ? Math.min(...allies.map(a => hexDistance(hex.r, hex.c, a.r, a.c))) : 999;
            
            // Bonus por terreno defensivo
            const hexData = board[hex.r]?.[hex.c];
            const terrainBonus = (hexData?.terrain === 'forest' || hexData?.terrain === 'hills') ? 3 : 0;
            
            // Score: alejarse de enemigos, acercarse a aliados, preferir terreno defensivo
            const score = (minEnemyDist * 10) - (minAllyDist * 2) + terrainBonus;
            safeHexes.push({ ...hex, score, minEnemyDist });
        }
        
        // Ordenar por seguridad
        safeHexes.sort((a, b) => b.score - a.score);
        
        // Intentar retirarse al mejor hexágono
        if (safeHexes.length > 0 && safeHexes[0].minEnemyDist > 1) {
            await _executeMoveUnit(unit, safeHexes[0].r, safeHexes[0].c);
            console.log(`[IA Retreat] ${unit.name} se retiró a (${safeHexes[0].r}, ${safeHexes[0].c})`);
        } else {
            // Si no hay hexágonos seguros, intentar fusionarse con aliado cercano
            const nearbyAlly = allies.find(a => hexDistance(unit.r, unit.c, a.r, a.c) <= (unit.currentMovement || unit.movement));
            if (nearbyAlly && (unit.regiments.length + nearbyAlly.regiments.length) <= MAX_REGIMENTS_PER_DIVISION) {
                console.log(`[IA Retreat] ${unit.name} fusionándose con aliado cercano...`);
                await _executeMoveUnit(unit, nearbyAlly.r, nearbyAlly.c, true);
                mergeUnits(unit, nearbyAlly);
            } else {
                console.log(`[IA Retreat] ${unit.name} sin opciones, manteniéndose.`);
                unit.hasMoved = true;
            }
        }
    },

    /**
     * Lógica avanzada de guerra naval con consideración de Barlovento
     */
    _executeNavalCombat: async function(unit, enemies) {
        // Verificar si es unidad naval
        if (!unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.type === 'Naval')) {
            return false;
        }

        console.log(`[IA Naval] ${unit.name} evaluando combate naval...`);
        
        // Buscar unidades navales enemigas en rango
        const navalEnemies = enemies.filter(e => {
            const distance = hexDistance(unit.r, unit.c, e.r, e.c);
            return distance <= 2 && e.regiments.some(reg => REGIMENT_TYPES[reg.type]?.type === 'Naval');
        });

        if (navalEnemies.length === 0) {
            // Sin enemigos navales, patrullar o explorar
            await this._navalPatrol(unit);
            return true;
        }

        // Evaluar ventaja de Barlovento para cada objetivo
        let bestTarget = null;
        let bestAdvantage = -999;

        for (const enemy of navalEnemies) {
            const combatOutcome = predictCombatOutcome(unit, enemy);
            const advantage = (combatOutcome.damageToDefender - combatOutcome.damageToAttacker);
            
            // Bonus si tenemos Barlovento (posición ventajosa)
            const barloventoBonus = this._hasBarloventoAdvantage(unit, enemy) ? 20 : 0;
            const totalAdvantage = advantage + barloventoBonus;

            if (totalAdvantage > bestAdvantage) {
                bestAdvantage = totalAdvantage;
                bestTarget = enemy;
            }
        }

        // Atacar si tenemos ventaja o retirarse
        if (bestTarget && bestAdvantage > -10) {
            console.log(`[IA Naval] Atacando ${bestTarget.name} con ventaja ${bestAdvantage}`);
            const attackRange = hexDistance(unit.r, unit.c, bestTarget.r, bestTarget.c);
            
            if (attackRange <= 1) {
                await attackUnit(unit, bestTarget);
            } else {
                const path = this.findPathToTarget(unit, bestTarget.r, bestTarget.c);
                if (path && path.length > 1) {
                    const moveHex = path[Math.min(path.length - 1, unit.currentMovement || unit.movement)];
                    await _executeMoveUnit(unit, moveHex.r, moveHex.c);
                }
            }
        } else {
            console.log(`[IA Naval] Desventaja detectada, retirándose...`);
            await this.executeRetreat(unit, navalEnemies);
        }
        
        return true;
    },

    /**
     * Determina si el atacante tiene ventaja de Barlovento (posición elevada/viento a favor)
     */
    _hasBarloventoAdvantage: function(attacker, defender) {
        // Simplificación: basado en posición relativa
        // En naval real: depende del viento, aquí simulamos con posición
        const dr = defender.r - attacker.r;
        const dc = defender.c - attacker.c;
        
        // Atacar desde arriba-izquierda da ventaja (simulando viento predominante)
        return (dr > 0 || (dr === 0 && dc > 0));
    },

    /**
     * Patrullar costas o explorar aguas
     */
    _navalPatrol: async function(unit) {
        // Buscar hexágonos de agua alcanzables
        const waterHexes = this.getReachableHexes(unit).filter(h => {
            const hexData = board[h.r]?.[h.c];
            return hexData?.terrain === 'water';
        });

        if (waterHexes.length > 0) {
            const enemyPlayer = unit.player === 1 ? 2 : 1;
            
            // Priorizar costas enemigas
            const enemyCoastalHexes = waterHexes.filter(wh => {
                return getHexNeighbors(wh.r, wh.c).some(n => {
                    const hex = board[n.r]?.[n.c];
                    return hex && hex.owner === enemyPlayer;
                });
            }).sort((a, b) => {
                // Ordenar por proximidad a ciudades enemigas
                const aCityDist = Math.min(...gameState.cities
                    .filter(c => c.owner === enemyPlayer)
                    .map(c => hexDistance(a.r, a.c, c.r, c.c)));
                const bCityDist = Math.min(...gameState.cities
                    .filter(c => c.owner === enemyPlayer)
                    .map(c => hexDistance(b.r, b.c, c.r, c.c)));
                return aCityDist - bCityDist;
            });

            const targetHex = enemyCoastalHexes[0] || waterHexes[Math.floor(Math.random() * waterHexes.length)];
            await _executeMoveUnit(unit, targetHex.r, targetHex.c);
            console.log(`[IA Naval] ${unit.name} patrullando hacia (${targetHex.r}, ${targetHex.c})`);
        }
    },

    /**
     * Split táctico mejorado - dividir antes de atacar para rodear
     */
    _considerTacticalSplit: async function(unit, target) {
        // Solo dividir si tenemos suficientes regimientos
        if (unit.regiments.length < 6) return false;

        const neighbors = getHexNeighbors(unit.r, unit.c).filter(n => {
            const hex = board[n.r]?.[n.c];
            return hex && !hex.unit && !TERRAIN_TYPES[hex.terrain].isImpassableForLand;
        });

        if (neighbors.length === 0) return false;

        // Encontrar vecino que permita ataque de pinza al objetivo
        const flankingSpots = neighbors.filter(n => {
            const distToTarget = hexDistance(n.r, n.c, target.r, target.c);
            return distToTarget === 1; // Adyacente al enemigo
        });

        if (flankingSpots.length > 0) {
            console.log(`[IA Split] ${unit.name} ejecutando split táctico para flanqueo`);
            
            // Dividir en dos partes aproximadamente iguales
            const splitCount = Math.floor(unit.regiments.length / 2);
            gameState.preparingAction = {
                newUnitRegiments: unit.regiments.slice(0, splitCount),
                remainingOriginalRegiments: unit.regiments.slice(splitCount)
            };
            
            const flankSpot = flankingSpots[0];
            splitUnit(unit, flankSpot.r, flankSpot.c);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
        }

        return false;
    },

    /**
     * Identificar y cortar líneas de suministro enemigas
     */
    _attemptSupplyLineCut: async function(unit) {
        const enemyPlayer = unit.player === 1 ? 2 : 1;
        
        // Buscar capital enemiga
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        if (!enemyCapital) return false;

        const enemyCities = gameState.cities.filter(c => c.owner === enemyPlayer && !c.isCapital);
        const enemyUnits = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);

        // Buscar hexágonos estratégicos en rutas de suministro
        const criticalHexes = [];
        const reachableHexes = this.getReachableHexes(unit);

        for (const hex of reachableHexes) {
            const hexData = board[hex.r]?.[hex.c];
            if (!hexData || hexData.owner === unit.player) continue;

            let strategicValue = 0;

            // Bonus por infraestructura enemiga
            if (hexData.structure === 'Camino' && hexData.owner === enemyPlayer) {
                strategicValue += 30;
            }

            // Bonus si corta acceso a ciudad
            for (const city of enemyCities) {
                const distToCapital = hexDistance(enemyCapital.r, enemyCapital.c, city.r, city.c);
                const distFromUnit = hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c) + 
                                     hexDistance(hex.r, hex.c, city.r, city.c);
                
                // Si estamos aproximadamente en el camino entre capital y ciudad
                if (Math.abs(distFromUnit - distToCapital) <= 2) {
                    strategicValue += 40;
                }
            }

            // Bonus si aísla unidades enemigas
            for (const enemy of enemyUnits) {
                const distToCapital = hexDistance(enemy.r, enemy.c, enemyCapital.r, enemyCapital.c);
                if (distToCapital > 5 && hexDistance(hex.r, hex.c, enemy.r, enemy.c) <= 2) {
                    strategicValue += 25;
                }
            }

            if (strategicValue > 0) {
                criticalHexes.push({ ...hex, value: strategicValue });
            }
        }

        if (criticalHexes.length > 0) {
            criticalHexes.sort((a, b) => b.value - a.value);
            const target = criticalHexes[0];
            console.log(`[IA Corte] ${unit.name} cortando línea enemiga en (${target.r}, ${target.c}) valor: ${target.value}`);
            await _executeMoveUnit(unit, target.r, target.c);
            return true;
        }

        return false;
    },
});

console.log("✓ Funciones avanzadas de IA cargadas correctamente");
