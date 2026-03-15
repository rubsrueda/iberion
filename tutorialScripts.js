// En tutorialScripts.js

console.log("tutorialScripts.js CARGADO - v12 (Estructura Modular)");

const TUTORIAL_SCRIPTS = {
    archipelagoInvasor: [
        ...INTRO_STEPS,    // Viene de introTutorial.js
        ...INVASION_STEPS  // Viene de invasionSteps.js
    ]
};




