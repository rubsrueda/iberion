# Flujo de IA Archipielago (Guia rapida para programadores)

Objetivo: mostrar en forma secuencial que hace la IA en un turno y en que orden lo hace.

Leyenda:
- `->` paso siguiente
- `[CONDICION]` bifurcacion
- `(metodo)` referencia al metodo principal
- `*` efecto esperado

------------------------------------------------------------
FLUJO PRINCIPAL DE TURNO
------------------------------------------------------------

Inicio turno IA
-> (ejecutarTurno)
-> Validar fase actual
-> [fase != play]
   -> log + cierre seguro de turno
-> [fase == play]
   -> Inicializar metricas/cooldowns/reintentos
   -> Lock de exploradores desde inicio
   -> Desbloqueo de casillas bloqueadas para construir
   -> Captura oportunista temprana (ciudades/fortalezas vacias)

-> Recopilar contexto
   -> hexes propios
   -> ciudades
   -> recursos
   -> infraestructura

-> FLUJO 1: Ocupacion de corredor
   -> Calcular objetivos de corredor
   -> Ejecutar gusano primero (split/merge relay)
   -> [quedan objetivos pendientes]
      -> Ocupacion global de objetivos restantes
   -> Capa post-corredor
      -> vacate de caminos
      -> push de ciudad
      -> push de hills

-> FLUJO 2: Construccion
   -> (construirInfraestructura)
   -> caminos prioritarios
   -> fortalezas/aldeas segun turno y economia

-> Analisis tactico/economico
   -> amenazas, frente, recursos vulnerables

-> Capa estructural + rutas de victoria
   -> (_ejecutarCapaEstructuralRed)
   -> (_executeEasyVictoryPointOpportunities)
   -> Evaluar rutas (pesos)
   -> Procesar rutas por prioridad y presupuesto

-> Protocolos estrategicos post-rutas
   -> ciudades sin guarnicion (prioridad dura)
   -> explorador dedicado
   -> activacion de unidades ociosas

-> [no hubo progreso]
   -> plan de emergencia

-> Final sweep obligatorio
   -> mover/accionar unidades con movimiento restante
   -> reporte de unidades inactivas (diagnostico)

-> Fin turno IA
   -> metrica de cierre
   -> schedule end turn seguro


------------------------------------------------------------
SUBFLUJO: GUSANO DE CORREDOR (split/merge relay)
------------------------------------------------------------

Objetivo corredor
-> Seleccionar unidad candidata
-> [unidad apta]
   -> Split hacia objetivo parcial
   -> Merge para conservar masa de combate
   -> Relay move/attack
   -> Verificar progreso real
-> [sin progreso]
   -> fallback controlado o siguiente objetivo

Notas operativas:
- El gusano se ejecuta antes de rutas generales para evitar que otras capas consuman esas unidades.
- Tiene presupuesto de acciones por turno para no monopolizar CPU.


------------------------------------------------------------
SUBFLUJO: EXPLORADOR DEDICADO
------------------------------------------------------------

Inicio turno
-> Lock de explorador activo
-> Solo fuentes explorer_* pueden moverlo

(_executeDedicatedExplorerProtocol)
-> Buscar exploradores vivos
-> [no hay explorador]
   -> intentar producir explorador

Para cada explorador:
-> [esta parado sobre ruina no saqueada]
   -> _requestExploreRuins
   -> registrar intento + resultado
-> [no esta sobre ruina]
   -> planear avance hacia ruina
   -> mover segun presupuesto de movimiento
-> [no hay ruinas accionables]
   -> fallback de expansion ligera

Resultado:
- explorador no se usa en ocupacion general
- trazas separadas IA_EXPLORER_* para debugging


------------------------------------------------------------
SUBFLUJO: WRAPPERS DE ACCION (seguridad de ejecucion)
------------------------------------------------------------

Decision IA
-> _requestMoveUnit / _requestMoveOrAttack / _requestBuildStructure / _requestExploreRuins
-> Validaciones
   -> lock de explorador
   -> cooldown
   -> validacion de movimiento/objetivo
-> Dispatch local o red
-> Confirmacion de aplicacion real (estado mutado)
-> Log estructurado obligatorio (IA_UNIT_EXEC / IA_EXPLORER_EXEC)

Objetivo de estos wrappers:
- evitar falsos success
- evitar loops de reintento ciego
- unificar diagnostico de fallos


------------------------------------------------------------
SUBFLUJO: RUTAS DE VICTORIA (priorizadas)
------------------------------------------------------------

Construir lista de rutas
-> calcular peso de cada ruta
-> ordenar de mayor a menor

Procesar rutas
-> [limite de acciones de rutas alcanzado]
   -> cortar
-> [presupuesto de tiempo agotado]
   -> cortar
-> [ruta ejecutable]
   -> dispatch por id en _ejecutarAccionPorRuta
-> registrar resultado (executed / reason / note)

Regla fuerte:
- si hay ciudad sin guarnicion alcanzable, se prioriza antes de varias rutas agresivas.


------------------------------------------------------------
CHECKLIST RAPIDO DE DEPURACION
------------------------------------------------------------

Si la IA "no hace nada":
-> revisar IA_METRIC_TURN_START
-> revisar OCCUPATION_PLAN + acciones gusano
-> revisar rutas evaluadas y limite de acciones
-> revisar FINAL_SWEEP + IA_IDLE_REPORT

Si explorador no explora:
-> revisar IA_EXPLORER_PLAN
-> revisar IA_EXPLORER_EXPLORE_ATTEMPT
-> revisar IA_EXPLORER_EXEC reason
-> validar que este sobre ruina no saqueada

Si acciones parecen ejecutadas pero no aplican:
-> revisar reason=request_not_applied en wrappers
-> revisar conflictos UnitGrid / estado de red
