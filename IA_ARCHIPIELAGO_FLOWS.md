# IA_ARCHIPIELAGO - Flujos Teoricos y Seguimiento Empirico

Documento tecnico para auditar IA_ARCHIPIELAGO con logs y resultados observables.
Objetivo: poder rastrear cada flujo con evidencia en consola y cambios reales en juego.

---

## 0) Convenciones de Logs

Prefijo global:
- [IA_ARCHIPIELAGO]
- [IA_SENTIDOS]
- [IA_TACTICA]
- [IA_ECONOMICA]

Formato recomendado (ya implementado en la mayoria de fases):
- INICIO: "INICIO" o "========="
- DECISION: "DECISION" con pesos/criterios
- EJECUCION: "MOVIENDO", "CONSTRUYENDO", "ESTABLECIENDO"
- RESULTADO: "OK" o advertencia

---

## 1) Flujo Maestro por Turno

ESQUEMA

TURN_START
  -> Validaciones de fase y modulos
  -> Senses (ciudades, hexes, recursos, infraestructura)
  -> Tactica (amenazas, frente)
  -> Economica (oro, recursos, vulnerables)
  -> Rutas de victoria (15 rutas con peso)
  -> Ejecutar Plan de Accion (fases 1..6)
  -> EndTurn

LOGS CLAVE
- [IA_ARCHIPIELAGO] ========= TURNO X - JUGADOR Y =========
- [IA_ARCHIPIELAGO] Objetivos totales: N (ciudades, recursos, infraestructura)
- [IA_ARCHIPIELAGO] RESUMEN DE SITUACION (amenazas, frente, oro, recursos)
- [IA_ARCHIPIELAGO] RUTAS DE VICTORIA (top 5 + debug completo)
- [IA_ARCHIPIELAGO] ========= EJECUTANDO PLAN DE ACCION =========
- [IA_ARCHIPIELAGO] Plan de accion completado.
- [IA_ARCHIPIELAGO] Llamando a handleEndTurn()

RESULTADO OBSERVABLE
- Acciones reales: movimientos, fusiones, divisiones, construcciones, rutas comerciales.

---

## 2) Rutas de Victoria (15)

Se calculan en cada turno con pesos. La ruta con mayor peso puede activar acciones especificas.

RUTAS Y METRICAS
1) Conquistar Capital (ruta_capital)
   - Entrada: capital enemiga, distancia, ratio de poder local
2) Eliminar Jugador (ruta_aniquilacion)
   - Entrada: ratio total de regimientos y unidades
3) Control de Ciudades (ruta_emperador)
   - Entrada: ciudades actuales vs objetivo (6 o 50%)
4) Puntos de Victoria (ruta_gloria)
   - Entrada: PV actuales vs objetivo
5) Ruta Larga (ruta_larga)
   - Entrada: ciudades propias >= 2, camino/infrastructura

TITULOS DE PV (10 rutas)
6) Mas Ciudades
7) Ejercito Grande
8) Mas Victorias
9) Mas Avances
10) Mas Heroes
11) Mas Riqueza
12) Mas Comercios
13) Gran Arqueologo
14) Conquistador Barbaro
15) Almirante Supremo

LOGS CLAVE
- [IA_ARCHIPIELAGO] #1 ... peso=... ejecutar=true/false {...}

RESULTADO OBSERVABLE
- Ruta prioritaria aparece en top 1 con peso alto.

---

## 3) Fase 1: Fusion Defensiva

OBJETIVO
- Consolidar unidades en presencia de amenazas o frente.

ESQUEMA
IF amenazas > 0 OR frente > 0
  -> buscar unidades cercanas (dist <= 2)
  -> mover adyacente si es necesario
  -> mergeUnits

LOGS CLAVE
- FASE 1: Detectado peligro. Buscando fusiones defensivas...
- FUSION DEFENSIVA: N amenazas, M frente
- Fusionando A + B
- Fusion completada

RESULTADO OBSERVABLE
- Una unidad desaparece y otra aumenta regimientos.

---

## 4) Fase 2: Division Estrategica

OBJETIVO
- Expandir presencia territorial con unidades grandes.

ESQUEMA
FOR unidad in misUnidades
  IF regimientos > 8
    -> buscar hex adyacente libre
    -> splitUnit 50/50

LOGS CLAVE
- DIVISION ESTRATEGICA: N unidades
- Dividiendo X: a/b regimientos
- Division completada

RESULTADO OBSERVABLE
- Una unidad se divide en dos en hex adyacente.

---

## 5) Fase 3: Movimientos Tacticos

OBJETIVO
- Reaccionar ante amenazas, atacar recursos vulnerables o explorar.

ESQUEMA
IF amenazas
  -> objetivo defensivo
ELSE IF recursos vulnerables
  -> objetivo ofensivo
ELSE IF recursos propios
  -> objetivo exploratorio
MOVE unit -> objetivo

LOGS CLAVE
- MOVIMIENTOS TACTICOS: N unidades
- Objetivo defensivo/ofensivo/exploratorio en (r,c)

RESULTADO OBSERVABLE
- Unidad se mueve hacia objetivo.

---

## 6) Fase 3.5: Fusion Ofensiva Inteligente

OBJETIVO
- Decidir atacar, envolver o retirarse segun poder relativo.

ESQUEMA
FOR enemigo
  poder_relativo = (mis_regs_cercanos / regs_enemigo)
  IF >= 1.3 -> ataque directo
  IF 0.8-1.3 -> envolvimiento
  IF 0.5-0.8 -> retirada/concentrar
  ELSE -> ignorar

LOGS CLAVE
- Enemigo (r,c): Poder A/B = Xx
- ATAQUE DIRECTO / ENVOLVIMIENTO / RETIRADA

RESULTADO OBSERVABLE
- Fusiones puntuales, movimientos de flanqueo o retirada.

---

## 7) Fase 4: Conquista de Ciudades Barbaras

OBJETIVO
- Capturar ciudades neutrales o barbaras.

ESQUEMA
FOR ciudad_barbara
  -> elegir unidad mas cercana
  IF dist <= 3
    -> mover hacia ciudad

LOGS CLAVE
- CONQUISTA: N ciudades barbaras detectadas
- Unidad X conquistando ciudad barbara en (r,c)

RESULTADO OBSERVABLE
- Unidad se mueve a ciudad barbara.

---

## 8) Fase 5: Construccion de Infraestructura

OBJETIVO
- Construir caminos y fortalezas con oro suficiente.

ESQUEMA
IF oro >= 500
  -> caminos cerca de capital
  -> fortaleza en punto estrategico cercano

LOGS CLAVE
- Construyendo camino en (r,c)
- Construyendo fortaleza estrategica en (r,c)

RESULTADO OBSERVABLE
- Estructura creada en hex destino.

---

## 9) Fase 6: Caravanas Comerciales

OBJETIVO
- Crear rutas comerciales si hay 2+ ciudades y oro suficiente.

ESQUEMA
IF oro >= 1000 AND ciudades >= 2
  -> preparar caravana (placeholder actual)

LOGS CLAVE
- CARAVANAS: N ciudades disponibles
- Creando caravana terrestre: A -> B

RESULTADO OBSERVABLE
- En esta fase, depende de integracion con createCaravan.

---

## 10) Ruta Larga (Flujo Ejecutable)

OBJETIVO
- Construir camino entre 2 ciudades y establecer ruta comercial con Columna de Suministro.

ESQUEMA
IF ciudades >= 2
  -> elegir mejor par (cityA, cityB)
  -> encontrar ruta terrestre y ruta de infraestructura
  -> SI NO hay infraestructura completa
       -> construir siguiente tramo de camino
  -> SI hay infraestructura completa
       -> buscar o crear Columna de Suministro
       -> mover columna a ciudad origen
       -> _executeEstablishTradeRoute

LOGS CLAVE
- [Ruta Larga] Ciudades: A -> B | Infra=false | Faltantes=3
- [Ruta Larga] Construyendo camino en (r,c)
- [Ruta Larga] Creando Columna de Suministro...
- [Ruta Larga] Moviendo columna a ciudad origen (r,c)
- [Ruta Larga] Estableciendo ruta: A -> B

RESULTADO OBSERVABLE
- Hex con Camino construido.
- Unidad Columna de Suministro aparece y obtiene tradeRoute.
- Ruta se mueve via updateTradeRoutes.

---

## 11) Resultado Empirico por Ruta

Checklist de verificacion por turno:
- Ruta prioritaria aparece en top 1 o top 3
- Accion ejecutada coincide con ruta (ej: Ruta Larga -> camino o caravana)
- Estado del tablero cambia (estructura, unidad, ruta)
- El turno termina correctamente

---

## 12) Notas para QA

- Si no hay logs de Rutas de Victoria, revisar carga de IA_ARCHIPIELAGO.js
- Si Ruta Larga no construye, verificar recursos y tiles propios
- Si ruta comercial no se establece, revisar _executeEstablishTradeRoute y ocupacion de ciudad
- Si IA no actua, revisar fase actual (debe ser 'play')
