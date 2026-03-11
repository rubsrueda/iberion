// invasionSteps.js
export const INVASION_STEPS = [
    {
        id: 'ARCHI_TUT_00_MAPA_FIJO',
        message: "Paso 1: Cargando mapa fijo del archipiélago...",
        duration: 2000,
        onStepStart: () => {
            console.log("=== PASO 1: SETUP INICIAL ===");
            // ... (todo el código que ya tenías)
        },
        actionCondition: () => gameState.tutorial.step1_complete
    },
    // ... el resto de tus pasos del archivo original
];
