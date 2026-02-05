/**
 * Script de prueba para verificar estructura de replay
 * Ejecutar en consola del navegador cuando hay un replay cargado
 */

function testReplayStructure() {
    console.log('=== TEST DE ESTRUCTURA DE REPLAY ===');
    
    // 1. Verificar que ReplayEngine esté disponible
    if (typeof ReplayEngine === 'undefined') {
        console.error('❌ ReplayEngine no está definido');
        return;
    }
    console.log('✅ ReplayEngine disponible');
    
    // 2. Verificar estructura de sample timeline
    const sampleTimeline = [
        {
            turn: 1,
            currentPlayer: 1,
            events: [
                {
                    type: 'MOVE',
                    unitId: 'unit_1',
                    unitName: 'Legión I',
                    playerId: 1,
                    from: [5, 5],
                    to: [6, 5],
                    timestamp: Date.now()
                },
                {
                    type: 'CONQUEST',
                    location: [6, 5],
                    playerId: 1,
                    playerName: 'Jugador 1',
                    timestamp: Date.now()
                }
            ],
            timestamp: Date.now()
        },
        {
            turn: 2,
            currentPlayer: 2,
            events: [
                {
                    type: 'BATTLE',
                    attackerId: 1,
                    attackerName: 'Legión I',
                    defenderId: 2,
                    defenderName: 'Infantería II',
                    location: [7, 5],
                    winner: 1,
                    terrain: 'plains',
                    casualties: {},
                    timestamp: Date.now()
                }
            ],
            timestamp: Date.now()
        }
    ];
    
    console.log('✅ Timeline de muestra creado con', sampleTimeline.length, 'turnos');
    
    // 3. Probar serialización
    try {
        const serialized = JSON.stringify(sampleTimeline);
        console.log('✅ Timeline serializado:', serialized.length, 'bytes');
        
        // 4. Probar deserialización
        const deserialized = JSON.parse(serialized);
        console.log('✅ Timeline deserializado:', deserialized.length, 'turnos');
        
        // 5. Verificar estructura después de deserialización
        const turn1 = deserialized[0];
        if (turn1.turn && turn1.currentPlayer && Array.isArray(turn1.events)) {
            console.log('✅ Estructura del turno correcta');
            
            const event1 = turn1.events[0];
            if (event1.type) {
                console.log('✅ Evento tiene type:', event1.type);
                
                // 6. Probar mapeo en replayUI.js
                const eventText = ReplayUI.eventToText(event1);
                console.log('✅ Texto del evento:', eventText);
                
                if (eventText.includes('desconocido')) {
                    console.error('❌ Evento no reconocido por ReplayUI.eventToText()');
                } else {
                    console.log('✅ Evento reconocido correctamente');
                }
            } else {
                console.error('❌ Evento no tiene campo type');
            }
        } else {
            console.error('❌ Estructura del turno incorrecta');
        }
        
    } catch (err) {
        console.error('❌ Error en serialización/deserialización:', err);
    }
    
    console.log('=== TEST COMPLETADO ===');
}

// Auto-ejecutar si se carga en consola
if (typeof window !== 'undefined' && window.location.pathname.includes('.html')) {
    console.log('Script de test cargado. Ejecuta testReplayStructure() para probar.');
}
