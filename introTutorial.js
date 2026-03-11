// introTutorial.js

export const INTRO_STEPS = [
    { id: 'TUT_01', message: "¡Saludos, General! El Reino te ha confiado la conquista de este archipiélago. Toca para continuar.", actionCondition: () => true },
    { id: 'TUT_02', message: "Tu objetivo es capturar la Capital enemiga o lograr la victoria por puntos. Toca para continuar.", onStepStart: () => centerMapOn(2, 6), actionCondition: () => true },
    { id: 'TUT_03', message: "Empecemos por preparar tu panel de mando. Toca para continuar.", onStepStart: () => centerMapOn(3, 1), actionCondition: () => true },
];
