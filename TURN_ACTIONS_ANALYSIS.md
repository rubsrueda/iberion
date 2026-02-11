# Analisis de acciones del jugador por turno

Este documento resume lo que un jugador puede hacer en su turno en el modo tactico. Se centra en acciones reales del juego y en sus condiciones principales.

## Contexto de turno
- El turno se ejecuta por fases: despliegue y juego ("deployment" y "play").
- La mayoria de acciones tacticas solo se permiten en fase "play".
- En red, las acciones se envian como peticiones y se validan antes de aplicarse.

## Acciones durante despliegue (deployment)
1) Crear division y colocarla
- Abres el panel de creacion y preparas la division.
- La colocas en un hex valido de despliegue (no agua para unidades terrestres).
- Se respeta el limite de despliegue por jugador.

2) Finalizar despliegue
- Termina la fase de despliegue y pasa a la fase de juego.

## Acciones durante juego (play)
1) Seleccionar unidad
- Seleccionas una unidad propia para habilitar acciones posibles.

2) Mover unidad
- Requiere puntos de movimiento disponibles y que la unidad no haya movido.
- No puede moverse a hex ocupado (salvo fusiones/embarques con unidad aliada).
- El coste depende del terreno y puede bloquearse por zonas de control.

3) Atacar
- Requiere unidad enemiga en rango valido.
- Consume la accion de ataque de la unidad.
- El rango y la validez dependen de tipo de unidad, terreno y habilidades.

4) Dividir unidad
- Requiere mas de un regimiento en la division.
- La nueva division se coloca en un hex adyacente valido.

5) Unir unidades (fusionar)
- Requiere dos unidades aliadas compatibles.
- Se combina fuerza y se recalculan estadisticas.

6) Reforzar regimientos
- Requiere suministro: capital propia o adyacente, o fortaleza propia.
- Consume recursos y puede impedir mas acciones en ese turno.

7) Consolidar regimientos
- Requiere regimientos duplicados con dano en la misma division.
- Restaura integridad combinando efectivos.

8) Construir estructura
- Requiere territorio propio y tecnologia adecuada.
- Camino: requiere ENGINEERING.
- Fortaleza: requiere FORTIFICATIONS y suele ser mejora del Camino.
- Aldea/Ciudad/Metropoli: requiere COLONY y Colono.
- Se aplican costes y validaciones de terreno.

9) Reclutar unidad (en ciudad/fortaleza)
- Se inicia desde un hex de reclutamiento propio.
- La colocacion suele ser a distancia 1 del hex de reclutamiento.

10) Saquear
- Requiere que la unidad este sobre territorio enemigo.
- Consume acciones del turno para esa unidad.

11) Explorar ruinas
- Requiere regimiento de Explorador en la division.
- Solo en hex con ruinas no saqueadas.

12) Crear ruta comercial
- Requiere unidad con habilidad de suministro (por ejemplo, columna de suministro).
- Une dos ciudades propias siguiendo infraestructura valida.

13) Asignar comandante
- Requiere tecnologia de liderazgo y unidad en punto de reclutamiento.
- Activa habilidades y progresion del heroe.

14) Deshacer ultimo movimiento
- Si esta disponible, revierte el ultimo movimiento de la unidad.

15) Arrasar estructura
- Requiere una estructura en el hex objetivo y condiciones de accion.

16) Disolver unidad
- Permite recuperar parte del coste y retirar la unidad.

17) Fin de turno
- Termina el turno del jugador actual.
- Aplica mantenimiento, recursos, curacion y prepara el siguiente turno.

## Reglas transversales importantes
- Suministro: sin suministro, algunas acciones se bloquean y la unidad puede sufrir penalizaciones.
- Terreno: afecta movimiento, combate y construccion.
- Propiedad del hex: construir y reclutar dependen de control territorial.
- Tecnologia: muchas acciones exigen investigaciones previas.

## Notas para QA del turno
- Verificar que cada accion tenga un mensaje claro si no se puede ejecutar.
- Validar que los botones contextuales aparecen solo cuando procede.
- Asegurar que el tutorial no pida acciones fuera de estas reglas.
