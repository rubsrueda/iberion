// tutorialManager.js
console.log("tutorialManager.js CARGADO - v.Final Estable");

let tutorialCheckInterval = null;

const TutorialManager = {
    currentSteps: [],
    currentIndex: -1,
    initialUnitCount: 0,

    start: function(steps) {
        // hERRAMIENTA DE DIAGNÓSTICO DEFINITIVA ==>>
        // Esta línea te mostrará en la consola exactamente QUÉ archivo y QUÉ línea de código
        // está llamando a esta función. Si la llamada es incorrecta, la traza te lo dirá.
        console.trace("TutorialManager.start() ha sido llamado. Esta es la pila de llamadas:");

        if (!steps || steps.length === 0) { console.error("TutorialManager.start: No se proporcionaron pasos."); return; }
        
        // <<== REINICIO FORZADO ==>>
        // Nos aseguramos de que el tutorial SIEMPRE comience desde el primer paso,
        // sin importar el estado anterior.
        this.currentIndex = -1; 
        
        this.currentSteps = steps;
        this.advanceToNextStep();
    },
    
advanceToNextStep: function() {
    if (tutorialCheckInterval) clearInterval(tutorialCheckInterval);
    if (typeof UIManager !== 'undefined') UIManager.clearTutorialHighlights();

    this.currentIndex++;
    if (this.currentIndex >= this.currentSteps.length) {
        this.stop();
        return;
    }

    const step = this.currentSteps[this.currentIndex];
    console.log(`[TUTORIAL] Ejecutando paso #${this.currentIndex + 1}: ${step.id}`);

    // 1. Ejecuta la lógica del paso (crear unidades, cambiar estado, etc.)
    if (step.onStepStart) step.onStepStart();

    // 2. Ordena a la UI que actualice la visibilidad de los botones AHORA.
    if (typeof UIManager !== 'undefined' && UIManager.refreshActionButtons) {
        UIManager.refreshActionButtons();
    }

    // 3. Muestra el mensaje del tutorial.
    if (typeof UIManager !== 'undefined' && UIManager.showTutorialMessage) {
        UIManager.showTutorialMessage(step.message);
    }

    // 4. AHORA que los botones correctos están visibles, los resalta.
    // <<<< VERSIÓN CORREGIDA >>>>
    if (typeof UIManager !== 'undefined' && UIManager.highlightTutorialElement) {
        if (step.highlightElementId) UIManager.highlightTutorialElement(step.highlightElementId);
        if (step.highlightHexCoords) UIManager.highlightTutorialElement(null, step.highlightHexCoords);
    }
    
    // El resto de la lógica de control se mantiene.
    if (step.duration && !step.actionCondition) {
        setTimeout(() => {
            if (step.onStepComplete) step.onStepComplete();
            this.advanceToNextStep();
        }, step.duration);
    } 
    else if (step.actionCondition) {
        this._startCompletionCheck(step);
    }
},

_startCompletionCheck: function(step) {
    // Guarda de seguridad
    if (!step || typeof step.actionCondition !== 'function') {
        console.error(`[TutorialManager] El paso #${step.id} no tiene una condition a comprobar. El tutorial no puede avanzar.`);
        return;
    }

    // Limpiamos cualquier intervalo anterior por si acaso.
    if (tutorialCheckInterval) {
        clearInterval(tutorialCheckInterval);
    }

    console.log(`[TutorialManager] Iniciando comprobación para el paso #${step.id}...`);

    // <<== CAMBIO CLAVE: El interior del intervalo ahora es una función 'async' ==>>
    tutorialCheckInterval = setInterval(async () => {
        try {
            // <<== CAMBIO CLAVE: Usamos 'await' para esperar el resultado ==>>
            // Esto funciona tanto para condiciones normales (devuelven true/false)
            // como para promesas (espera a que se resuelvan).
            if (await step.actionCondition()) {
                console.log(`%c[TutorialManager] ¡Condición CUMPLIDA para el paso #${step.id}!`, "color: lightgreen; font-weight: bold;");
                
                clearInterval(tutorialCheckInterval);
                
                if (step.onStepComplete) {
                    step.onStepComplete();
                }
                
                this.advanceToNextStep();
            }
        } catch (e) {
            console.error(`Error al evaluar la condición del paso #${step.id}:`, e);
            clearInterval(tutorialCheckInterval);
        }
    }, 500); // Comprueba cada medio segundo.
},

    stop: function() {
        console.log("[TUTORIAL] Finalizado.");
        if (tutorialCheckInterval) clearInterval(tutorialCheckInterval);
        
        window.TUTORIAL_MODE_ACTIVE = false;
        gameState.isTutorialActive = false;

        if (typeof UIManager !== 'undefined') UIManager.updateAllUIDisplays();

        UIManager.hideTutorialMessage();
        UIManager.clearHighlights();
        UIManager.restoreEndTurnButton();
        logMessage("¡Has completado el tutorial!");
        showScreen(domElements.mainMenuScreenEl);
    },

    notifyActionCompleted: function(actionType) {
        if (!gameState.isTutorialActive || !gameState.tutorial) return;
        if (actionType in gameState.tutorial) {
            console.log(`[TUTORIAL] Flag activado: ${actionType}`);
            gameState.tutorial[actionType] = true;
            if (actionType === 'turnEnded') gameState.tutorial.unitHasMoved = false;
        }
    }
};