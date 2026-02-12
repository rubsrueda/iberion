// tutorialArchipelagoInvasor.js
// Tutorial completo para jugador humano invasor (Jugador 2) en modo Archipiélago
// Enseña todos los procesos que ejecuta automáticamente la IA

console.log("tutorialArchipelagoInvasor.js CARGADO");

const TUTORIAL_ARCHIPELAGO_VASSOR = {
  pasos: [
    {
      id: 'ARCHI_TUT_00_INTRO',
      message: "¡Bienvenido, Invasor! Eres el Jugador 2. Tu objetivo: invadir la isla del enemigo paso a paso, como lo haría la IA.",
      duration: 3000,
      onStepStart: () => {
        gameState.currentPhase = "play";
        gameState.currentPlayer = 2;
        gameState.myPlayerNumber = 2;
        gameState.setupTempSettings = { navalMap: true };

        // Crear isla enemiga con capital en (5, 5)
        addCityToBoardData(5, 5, 1, "Capital Enemiga", true);

        // Crear isla invasora con capital en (2, 2)
        addCityToBoardData(2, 2, 2, "Tu Capital Invasora", true);

        // Recursos abundantes para el jugador invasor
        gameState.playerResources[2].oro = 1500;
        gameState.playerResources[2].piedra = 800;
        gameState.playerResources[2].madera = 800;
        gameState.playerResources[2].hierro = 500;
        gameState.playerResources[2].comida = 500;
        gameState.playerResources[2].researchPoints = 200;

        // Tecnologías iniciales
        const techs = gameState.playerResources[2].researchedTechnologies || [];
        if (!techs.includes('ENGINEERING')) techs.push('ENGINEERING');
        if (!techs.includes('FORTIFICATIONS')) techs.push('FORTIFICATIONS');
        if (!techs.includes('NAVIGATION')) techs.push('NAVIGATION');
        if (!techs.includes('LEADERSHIP')) techs.push('LEADERSHIP');
        if (!techs.includes('DRILL_TACTICS')) techs.push('DRILL_TACTICS');
        gameState.playerResources[2].researchedTechnologies = techs;

        if (UIManager) {
          UIManager.updateActionButtonsBasedOnPhase();
          UIManager.updateAllUIDisplays();
        }
      },
      highlightHexCoords: [{ r: 2, c: 2 }]
    },

    {
      id: 'ARCHI_TUT_01_DEFENSIVE_MERGE',
      message: "FASE 1 - FUSIÓN DEFENSIVA: Crea 2 divisiones pequeñas, luego fúsionalas para defenderte de amenazas. La IA lo hace automáticamente cuando detecta peligro.",
      onStepStart: () => {
        // Crear una unidad enemiga cercana para simular amenaza
        const enemy1 = AiGameplayManager?.createUnitObject ? AiGameplayManager.createUnitObject({
          name: "Patrulla Enemiga",
          regiments: [
            { ...REGIMENT_TYPES["Infantería Ligera"], type: 'Infantería Ligera' },
            { ...REGIMENT_TYPES["Arqueros"], type: 'Arqueros' }
          ]
        }, 1, { r: 1, c: 2 }) : null;

        if (enemy1) placeFinalizedDivision(enemy1, 1, 2);

        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.merged_units = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.merged_units === true;
      }
    },

    {
      id: 'ARCHI_TUT_02_STRATEGIC_SPLIT',
      message: "FASE 2 - DIVISIÓN ESTRATÉGICA: Para ocupar más territorio, divide tu unidad grande. La IA expande presencia constantemente.",
      onStepStart: () => {
        const unit = units.find(u => u.player === 2 && u.r === 2 && u.c === 2);
        if (unit && (unit.regiments?.length || 0) <= 5) {
          const comp = ['Infantería Pesada', 'Infantería Pesada', 'Arqueros', 'Caballería Ligera', 'Infantería Pesada'];
          for (let i = 0; i < 2; i++) {
            if (AiGameplayManager?.produceUnit) {
              AiGameplayManager.produceUnit(2, comp, 'attacker', `Cuerpo-${i}`);
            }
          }
        }
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.unit_split_archi = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.unit_split_archi === true;
      }
    },

    {
      id: 'ARCHI_TUT_03_BARBARIAN_CONQUEST',
      message: "FASE 3 - CONQUISTA BÁRBARA: Localiza ciudades bárbaras (neutras). Son objetivos fáciles para expandir. Mira al tablero: verás puntos sin dueño.",
      duration: 3500,
      onStepStart: () => {
        // Crear ciudades bárbaras visibles
        addCityToBoardData(4, 4, null, "Hamlet Bárbaro", false);
        addCityToBoardData(3, 4, null, "Pueblito Bárbaro", false);
      }
    },

    {
      id: 'ARCHI_TUT_04_EXPEDITION_POWER',
      message: "FASE 4 - FORMAR EXPEDICIÓN: Reúne 2x el poder de la guarnición bárbara. Conquista (4,4). La IA calcula esto automáticamente.",
      highlightHexCoords: [{ r: 4, c: 4 }],
      onStepStart: () => {
        resetUnitsForNewTurn(2);
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.barbarian_conquered = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.barbarian_conquered === true;
      }
    },

    {
      id: 'ARCHI_TUT_05_INFRASTRUCTURE',
      message: "FASE 5 - INFRAESTRUCTURA: Construye Caminos y Fortalezas en territorios clave. Conectan ciudades, abren rutas comerciales y permiten refuerzos.",
      highlightHexCoords: [{ r: 3, c: 3 }],
      onStepStart: () => {
        gameState.playerResources[2].piedra += 300;
        gameState.playerResources[2].madera += 300;
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.infrastructure_built = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.infrastructure_built === true;
      }
    },

    {
      id: 'ARCHI_TUT_06_TRADE_ROUTES',
      message: "FASE 6 - CARAVANAS COMERCIALES: Crea rutas entre ciudades. Generan oro pasivo para financiar la guerra. Essencial para mantener producción.",
      onStepStart: () => {
        let supply = units.find(u => u.player === 2 && u.regiments?.some(r => r.type === 'Columna de Suministro'));
        if (!supply && AiGameplayManager?.createUnitObject) {
          supply = AiGameplayManager.createUnitObject({
            name: "Columna de Comercio",
            regiments: [{ ...REGIMENT_TYPES["Columna de Suministro"], type: 'Columna de Suministro' }]
          }, 2, { r: 2, c: 2 });
          placeFinalizedDivision(supply, 2, 2);
        }
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.trade_route_created = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.trade_route_created === true;
      }
    },

    {
      id: 'ARCHI_TUT_07_PRESSURE_FORTRESS',
      message: "FASE 7 - FORTALEZA DE PRESIÓN: Ocupa territorio enemigo y construye una Fortaleza. Esto activa automáticamente producción de refuerzos masivos.",
      onStepStart: () => {
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.invasion_fortress_built = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.invasion_fortress_built === true;
      }
    },

    {
      id: 'ARCHI_TUT_08_MASS_PRODUCTION',
      message: "FASE 8 - PRODUCCIÓN EN MASA: Con la fortaleza construida, la IA produce múltiples divisiones grandes (6+ regimientos) cada turno para presionar.",
      onStepStart: () => {
        gameState.playerResources[2].oro += 1000;
        gameState.playerResources[2].comida += 500;
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.heavy_divisions_created = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.heavy_divisions_created === true;
      }
    },

    {
      id: 'ARCHI_TUT_09_NAVAL_PRESENCE',
      message: "FASE 9 - PRESENCIA NAVAL: Crea Barcos de Guerra para (1) bombardear, (2) transportar tropas a la retaguardia enemiga.",
      onStepStart: () => {
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.naval_unit_created = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.naval_unit_created === true;
      }
    },

    {
      id: 'ARCHI_TUT_10_AMPHIBIOUS_LANDING',
      message: "FASE 10 - DESEMBARCO ANFIBIO: Embarca tropas en un barco, navega a aguas costeras enemigas y desembarca para golpes de mano en la retaguardia.",
      onStepStart: () => {
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.amphibious_landing_done = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.amphibious_landing_done === true;
      }
    },

    {
      id: 'ARCHI_TUT_11_ECONOMIC_WARFARE',
      message: "FASE 11 - GUERRA ECONÓMICA: Saquea ruinas enemigas y arrastra infraestructura enemiga. Debilita su economía y rutas comerciales.",
      onStepStart: () => {
        gameState.tutorial = gameState.tutorial || {};
        gameState.tutorial.economic_warfare_started = false;
      },
      actionCondition: () => {
        const tutState = gameState.tutorial || {};
        return tutState.economic_warfare_started === true;
      }
    },

    {
      id: 'ARCHI_TUT_12_HUNTER_DIVISIONS',
      message: "FASE 12 - DIVISIONES CAZADORAS: Si el enemigo crea divisiones pequeñas (1-2 regimientos), crea divisiones de 3 regimientos para cazarlas.",
      duration: 3500
    },

    {
      id: 'ARCHI_TUT_13_HEAVY_RESPONSE',
      message: "FASE 13 - RESPUESTA PESADA: Si el enemigo crea una división grande (10+), fusiona o produce divisiones para igualar su poder combativo.",
      duration: 3500
    },

    {
      id: 'ARCHI_TUT_14_SUPPLY_LINES',
      message: "FASE 14 - LÍNEAS DE SUMINISTRO: Mantén caminos conectados. Las unidades solo se refuerzan desde ciudades/fortalezas propias o estructuras aliadas.",
      duration: 3500
    },

    {
      id: 'ARCHI_TUT_15_CYCLE_REPEAT',
      message: "FASE 15 - CICLO INFINITO: Repite: defender → expandir → conquistar → construir → producir → presionar. La IA lo hace cada turno sin piedad. ¡Buena suerte, General!",
      duration: 4000,
      onStepStart: () => {
        if (UIManager && UIManager.showRewardToast) {
          UIManager.showRewardToast("¡TUTORIAL DE INVASIÓN COMPLETADO!", "⚔️");
          if (UIManager.setEndTurnButtonToFinalizeTutorial) {
            UIManager.setEndTurnButtonToFinalizeTutorial();
          }
        }
      },
      actionCondition: () => false
    }
  ]
};

// Exportar para uso en TutorialManager
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TUTORIAL_ARCHIPELAGO_VASSOR };
}
