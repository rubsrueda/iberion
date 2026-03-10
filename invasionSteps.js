// invasionSteps.js
export const INVASION_STEPS = [
    {
        id: 'ARCHI_TUT_00_MAPA_FIJO',
        message: "Paso 1: Cargando mapa fijo...",
        onStepStart: () => {
            console.log("Cargando lógica de mapa...");
            // ... (todo el código de fetch y setup que ya tienes)
        },
        actionCondition: () => gameState.tutorial.step1_complete
    },
    // ... el resto de tus fases (Fase 0C, 0D, etc.)
];
