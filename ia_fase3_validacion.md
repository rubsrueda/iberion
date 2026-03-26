# FASE 3: Validacion y No-Regresion

Estado: completado parcialmente con instrumentacion y protocolo de pruebas
Fecha: 2026-03-26

## Alcance de esta fase

Esta fase cierra la integracion de la IA unificada con tres objetivos verificables:

1. Exponer artefactos de debug exigidos por la especificacion.
2. Estandarizar el log del motor con prefijo [IA-MOTOR].
3. Integrar eventos ia_decision en Chronicle para trazabilidad tutorial y replay.

## Cambios validados

### Artefactos de debug disponibles

Tras ejecutar un turno IA, deben existir:

- AiGameplayManager._config
- AiGameplayManager._lastNodeList[playerNumber]
- AiGameplayManager._lastDecisionLog[playerNumber]

Estos artefactos se escriben desde la integracion y desde el registro del motor.

### Formato de log del motor

Cada decision principal del turno escribe una linea con este formato:

```text
[IA-MOTOR] TURNO:X JUGADOR:Y NIVEL:Z ACCION:... NODO:... PRIORIDAD:... RAZON:...
```

Campos cubiertos:

- TURNO
- JUGADOR
- NIVEL
- ACCION
- NODO
- PRIORIDAD
- RAZON

### Integracion con Chronicle

Las decisiones de nivel 0 y 1, o decisiones de prioridad CRITICA/ALTA, generan:

```javascript
Chronicle.logEvent('ia_decision', {
  playerNumber,
  nivel,
  accion,
  nodo,
  prioridad,
  razon_texto
});
```

## Verificacion tecnica realizada

Se verifico que no hay errores de analisis en:

- ai_gameplayLogic.js
- IaIntegration.js
- IaDecisionEngine.js
- IaDetectorNodos.js
- chronicle.js
- index.html

## Matriz de aceptacion aplicable en esta iteracion

### T-01 Carga de configuracion

Cobertura: implementada.

Evidencia:

- IaIntegration sincroniza AiGameplayManager._config.
- gameFlow carga IaConfigManager antes del turno IA.

### T-02 Calculo de peso de nodo

Cobertura: implementada en FASE 2a.

Validacion manual sugerida en debug console:

```javascript
AiGameplayManager._lastNodeList[2][0]
IaNodoValor.calcularPesoNodo(AiGameplayManager._lastNodeList[2][0], gameState, AiGameplayManager._config)
```

### T-03 Protocolo defensa capital

Cobertura: implementada.

Evidencia:

- IaDecisionEngine activa protocolo nivel 0.
- AiGameplayManager registra NIVEL:0 en [IA-MOTOR].
- Chronicle registra ia_decision cuando aplica.

### T-04 Crisis economica

Cobertura: implementada a nivel de evaluacion y logging.

Evidencia:

- IaDecisionEngine detecta crisisEconomica.
- AiGameplayManager registra NIVEL:2 cuando la recomendacion principal nace de crisis.

### T-07 Formato de log

Cobertura: implementada.

Evidencia:

- El prefijo [IA-MOTOR] se emite desde un unico punto.
- Los campos exigidos se consolidan en _lastDecisionLog.

## Escenarios del repo recomendados para smoke test manual

- scenarios/test_A1_SplitExpansion_scenario.js
- scenarios/test_B1_FavorableCombat_scenario.js
- scenarios/test_B2_TacticalRetreat_scenario.js

Estos escenarios permiten validar que la linea base tactica sigue operativa mientras la nueva capa de decision registra nodos, razones y eventos.

## Procedimiento manual sugerido

1. Abrir una partida de prueba con J2 en modo ai.
2. Forzar o esperar el turno de J2.
3. Revisar en consola:

```javascript
AiGameplayManager._config
AiGameplayManager._lastNodeList[2]
AiGameplayManager._lastDecisionLog[2]
Chronicle.getLogsByType('ia_decision')
IaValidationTools.verificarArtefactosBasicos(2)
IaValidationTools.imprimirResumenIA(2)
```

4. Confirmar que aparece al menos una linea [IA-MOTOR].
5. Confirmar que no hay errores de referencia ni ruptura del turno.

## Partida de referencia recomendada

Para humo funcional rapido, usar estos escenarios ya presentes en el repo:

1. scenarios/test_A1_SplitExpansion_scenario.js
2. scenarios/test_B1_FavorableCombat_scenario.js
3. scenarios/test_B2_TacticalRetreat_scenario.js

Orden recomendado de validacion:

1. Expansion sin combate.
2. Combate favorable.
3. Retirada tactica.

Si en los tres casos se mantiene la conducta tactica previa y ademas aparecen _config, _lastNodeList, _lastDecisionLog y eventos ia_decision, se considera superado el smoke test de no-regresion de esta fase.

## Riesgos pendientes

- No se ejecuto un harness automatizado de browser end-to-end desde terminal en esta iteracion.
- Los tests T-05, T-06 y T-10 requieren escenarios dedicados o preparacion manual adicional del mapa.
- La integracion actual registra la decision principal, pero aun no reasigna toda la tactica unitaria a partir de la mision formal; eso sigue siendo una integracion progresiva para fases posteriores.

## Conclusiones

FASE 3 queda cerrada para esta iteracion en cuanto a trazabilidad, debug, compatibilidad y criterios de aceptacion instrumentables en el repo actual.

La validacion automatizada completa IA vs IA sigue siendo un siguiente paso recomendable, pero no bloquea esta entrega de integracion porque la linea base no fue sustituida, solo observada e instrumentada.