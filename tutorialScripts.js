// En tutorialScripts.js
import { INTRO_STEPS } from './introTutorial.js';
import { INVASION_STEPS } from './invasionSteps.js';

console.log("tutorialScripts.js CARGADO - v12 (Estructura Modular)");

const TUTORIAL_SCRIPTS = {
    archipelagoInvasor: [
        ...INTRO_STEPS,    // Viene de introTutorial.js
        ...INVASION_STEPS  // Viene de invasionSteps.js
    ]
};




