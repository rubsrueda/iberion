// introTutorial.js
const INTRO_STEPS = [
    { 
        id: 'TUT_01', 
        message: "¡Saludos, General! El Reino te ha confiado la conquista de este archipiélago. Toca el mapa para continuar.", 
        onStepStart: () => {
            // Inicializamos o reseteamos el flag de clic para este paso
            if (!gameState.tutorial) gameState.tutorial = {};
            gameState.tutorial.map_clicked = false;
        },
        // Solo avanzará cuando main.js ponga esto en true tras un clic
        actionCondition: () => gameState.tutorial && gameState.tutorial.map_clicked === true 
    },
    { 
        id: 'TUT_02', 
        message: "Tu objetivo es capturar la Capital enemiga o lograr la victoria por puntos. Toca el mapa para continuar.", 
        onStepStart: () => {
            centerMapOn(2, 6);
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    },
    { 
        id: 'TUT_03', 
        message: "Empecemos por preparar tu panel de mando. Toca el mapa para continuar.", 
        onStepStart: () => {
            centerMapOn(3, 1);
            gameState.tutorial.map_clicked = false;
        },
        actionCondition: () => gameState.tutorial.map_clicked === true 
    }
];
