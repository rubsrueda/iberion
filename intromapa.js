// intromapa.js
const INTROMAPA = [
  
        {
            id: '1_CIUDADES',
            message: "Ciudades. Son puntos de control estratégicos. Generan ingresos (oro/comida), permiten reclutamiento y refuerzos. Tu capital está en (3,1) — isla pequeña. El enemigo controla (2,6) — isla grande.",
            duration: 3500,
            onStepStart: () => {
                // Resaltar ambas capitales
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                if (pos.yourCapital) renderSingleHexVisuals(pos.yourCapital.r, pos.yourCapital.c);
                if (pos.enemyCapital) renderSingleHexVisuals(pos.enemyCapital.r, pos.enemyCapital.c);
            }
        },
        {
            id: '2_ECONOMIA',
            message: "Impuestos & Economía. Cada ciudad genera oro/comida cada turno. Puedes Ver tus recursos arriba. Sin economía, no puedes producir/construir.",
            duration: 3500,
            onStepStart: () => {
                // Mostrar panel de recursos
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: '3_Territorio',
            message: "Control de Terreno. Los hexágonos que controlas están marcados por tu color, si tienes una ciudad, estructura o unidad allí. Se despliegan botones adicionales, el Terreno enemigo es rojo. Controlar más = más recursos.",
            duration: 4000,
            onStepStart: () => {
                // Marcar hexágonos alrededor de la capital invasora como propios
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 3, c: 1 };
                const ownHexes = [
                    { r: cap.r-1, c: cap.c }, { r: cap.r+1, c: cap.c },
                    { r: cap.r, c: cap.c-1 }, { r: cap.r, c: cap.c+1 }
                ];
                ownHexes.forEach(hex => {
                    if (board[hex.r]?.[hex.c] && board[hex.r][hex.c].terrain !== 'water') {
                        board[hex.r][hex.c].owner = 1;
                        renderSingleHexVisuals(hex.r, hex.c);
                    }
                });
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
        {
            id: '4_capital',
            message: "Pulsa sobre tu ciudad capital. a la izquierda abajo, Se despliegan botones adicionales, pulsa sobre + para crear una división.",
            duration: 4000,
            onStepStart: () => {
                // Marcar hexágonos alrededor de la capital invasora como propios
                const pos = (gameState.tutorial && gameState.tutorial.positions) || {};
                const cap = pos.yourCapital || { r: 3, c: 1 };
                const ownHexes = [
                    { r: cap.r-1, c: cap.c }, { r: cap.r+1, c: cap.c },
                    { r: cap.r, c: cap.c-1 }, { r: cap.r, c: cap.c+1 }
                ];
                ownHexes.forEach(hex => {
                    if (board[hex.r]?.[hex.c] && board[hex.r][hex.c].terrain !== 'water') {
                        board[hex.r][hex.c].owner = 1;
                        renderSingleHexVisuals(hex.r, hex.c);
                    }
                });
                if (UIManager) UIManager.updateAllUIDisplays();
            }
        },
         {
            id: 5, // 'welcome_creation'
            message: "Reclutemos tu primera división. Haz clic en <strong>'Crear División' (➕)</strong>.",
            highlightElementId: 'floatingCreateDivisionBtn',
            
            onStepStart: () => {
                console.log("[TUTORIAL] Transición a fase de DESPLIEGUE.");
                gameState.currentPhase = "deployment"; // 1. Cambiamos la fase

                // 2. ¡LE DECIMOS A LA UI QUE SE ACTUALICE CON LA NUEVA FASE!
                UIManager.updateActionButtonsBasedOnPhase(); 
            },
            actionCondition: () => domElements.unitManagementModal.style.display === 'flex'
        },
        {
            id: 6,
            message: "La Infantería Ligera es la espina dorsal del ejército. Añade dos regimientos pulsando el <strong>'+'</strong>.",
            highlightElementId: 'availableUnitsList',
            actionCondition: () => typeof currentDivisionBuilder !== 'undefined' && currentDivisionBuilder.length >= 2
        },
        {
            id: 7,
            message: "Has formado una división. Pulsa <strong>'Finalizar y Colocar'</strong>.",
            highlightElementId: 'finalizeUnitManagementBtn',
            actionCondition: () => placementMode.active === true
        },
        {
            id: 8,
            message: "Despliega tus tropas en la <strong>casilla resaltada</strong>.",
            onStepStart: () => { TutorialManager.initialUnitCount = units.length; },
            highlightHexCoords: [{r: 2, c: 2}],
            actionCondition: () => units.length > TutorialManager.initialUnitCount
        },
        {
            id: 9,
            message: "Controlar territorio es más que solo pintarlo de tu color. Haz clic en este hexágono tuyo para ver sus detalles.",
            highlightHexCoords: [{r: 1, c: 1}],
            onStepStart: () => {
                // Preparamos la bandera para este paso.
                gameState.tutorial.hex_selected = false;
            },
            // La condición ahora espera a que la bandera se active.
            actionCondition: () => gameState.tutorial.hex_selected === true
        },
        {
            id: 10,
            message: "<strong>Estabilidad:</strong> Es tu control, afecta a tus ingresos. <strong>Nacionalidad:</strong> Es la lealtad. Solo subirá si la Estabilidad es alta.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 6000))
        },
        {
            id: 11,
            message: "Existen 4 tipos de Terreno, Agua, Llanura, Bosque, Montaña.",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 6000))
        },
        {
            id: 12,
            message: "Existen 7 Recursos: Oro, Piedra, Madera,Hierro, y Comida, Puntos de Investigación y Puntos de Soldadesca",
            actionCondition: () => new Promise(resolve => setTimeout(() => resolve(true), 6000))
        }
];
