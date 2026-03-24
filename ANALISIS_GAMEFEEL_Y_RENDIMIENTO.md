ANALISIS_GAMEFEEL_Y_RENDIMIENTO.md

# Analisis de game feel, ritmo y rendimiento (Iberion)

Fecha: 2026-03-18
Objetivo: tener una base de trabajo incremental para mejorar sensacion de vida, hitos y fluidez.

## Diagnostico

1. Falta de vida visual continua en mapa
- El terreno se percibe estatico.
- Hay animaciones puntuales de combate, pero no una capa ambiental persistente.

2. Audio funcional pero plano
- Hay sonidos base de interfaz/combate/turno.
- Falta variacion por contexto (evento raro, racha, clima, temporada de batalla).

3. Hitos existentes pero poco impactantes
- Existen eventos ricos (por ejemplo ruinas), cronica y toasts.
- El jugador no siente avance emocional porque el feedback no tiene suficiente peso visual/sonoro.

4. Lentitud percibida
- Se observan puntos con coste potencial alto: repintado completo del tablero, calculo amplio de niebla y prediccion de combate ligada al mousemove.
- Aunque no siempre baje FPS de forma dramatica, incrementa friccion y cansancio visual.

5. Estaciones de juego no implementadas en tactica
- Hay temporadas del Battle Pass, pero no estaciones climatico-estrategicas en partida.

## Evidencias tecnicas relevantes (archivos)

- Audio y reproduccion:
  - audioManager.js
  - main.js
  - unit_Actions.js

- Render y tablero:
  - boardManager.js
  - style.css

- Niebla y flujo de turno:
  - gameFlow.js

- Feedback/UI:
  - uiUpdates.js
  - utils.js (toasts)
  - chronicle.js
  - statTracker.js

- Eventos de ruinas y recompensas:
  - constants.js
  - unit_Actions.js
  - researchRewardsManager.js

- Temporadas actuales (solo battle pass):
  - seasonsData.js

## Roadmap recomendado (priorizado)

### Sprint A (1-2 semanas): vida visual + feedback inmediato
Impacto: alto
Riesgo: bajo

- Capa ambiental ligera por terreno:
  - agua con ondulacion,
  - bosque con balanceo,
  - polvo al mover tropas terrestres.
- Microsecuencia de combate mas expresiva:
  - flash de impacto,
  - particulas breves,
  - dano flotante con variacion visual por tipo.
- Mejorar toasts con niveles:
  - normal,
  - destacado,
  - epico (estilo, sonido, duracion).

### Sprint B (1 semana): hitos que se sientan
Impacto: alto
Riesgo: bajo-medio

- Crear Event Feed de partida (lateral/superior) alimentado por eventos de cronica y tracker.
- Hitos de alto valor emocional:
  - descubrimiento de mina de oro,
  - aviso de ruinas cercanas,
  - racha militar.
- Recompensa audiovisual por hito:
  - fanfarria corta,
  - glow temporal,
  - sello visual tipo logro.

### Sprint C (1-2 semanas): estaciones con efecto jugable
Impacto: alto
Riesgo: medio

- Ciclo estacional por turnos:
  - primavera,
  - verano,
  - otono,
  - invierno.
- Efectos iniciales (MVP):
  - modificador de movimiento,
  - modificador de suministro/atricion.
- Banner y ambientacion sonora por estacion.

### Sprint D (1 semana): rendimiento perceptible
Impacto: alto
Riesgo: bajo-medio

- Throttle de prediccion de combate a 1 calculo por frame.
- Cache por hex objetivo para evitar recalculo redundante.
- Reducir repintados completos; priorizar dirty updates por hex afectado.
- Optimizacion del calculo de niebla segun cambios reales de fuentes de vision.
- Modo grafico:
  - Completo,
  - Equilibrado,
  - Rendimiento.

## Orden de ejecucion recomendado (quick wins)

1. Event Feed + hitos destacados.
2. Animacion ambiental minima (agua/bosque/polvo).
3. Throttle de mousemove y cache de prediccion.
4. MVP de estaciones (movimiento + suministro).

## Metricas para validar mejora

- Tiempo medio por turno (humano) antes/despues.
- Numero de eventos significativos visibles por turno.
- Frecuencia de interacciones voluntarias (explorar ruinas, construir, comerciar).
- FPS promedio y picos de frame time en combate y desplazamiento.
- Retencion subjetiva: encuesta rapida postpartida (diversion, tension, claridad de progreso).

## Riesgos y mitigaciones

- Riesgo: sobrecargar visualmente la UI.
  - Mitigacion: intensidad configurable y modo rendimiento.

- Riesgo: introducir desync en partidas de red.
  - Mitigacion: separar feedback visual local de logica sincronizada.

- Riesgo: deuda tecnica por CSS/estilos duplicados.
  - Mitigacion: consolidar bloques criticos de animacion y notificaciones en fases.

## Siguiente paso sugerido

Definir MVP de 5 dias con tareas por archivo:
- Dia 1: Event Feed + wiring de eventos actuales.
- Dia 2: toasts por severidad y preset visual/sonoro.
- Dia 3: polvo de movimiento + agua animada.
- Dia 4: throttle/caching de prediccion.
- Dia 5: pruebas locales + checklist de no regresion en red.
