# Baseline de Restauracion - Ocupacion de Corredor IA

Fecha: 2026-04-06
Version objetivo: 1.154
Milestone: corridor-capture-stable-v1.154

## Que protege este baseline
Esta linea base protege el sistema de ocupacion de casillas de corredor (split+merge tipo gusano) para evitar regresiones al introducir nuevas capas de IA.

No representa la victoria final de la IA por si sola. Es una capa subyacente de expansion y mantenimiento logistico.

## Comportamiento esperado
- En turnos tempranos, la IA prioriza ocupacion de corredor en modo bootstrap.
- El sistema puede alcanzar hasta 12 acciones de ocupacion por turno cuando hay objetivos disponibles.
- La traza de gusano debe mostrar merge confirmado en cadena operativa.

## Señales de salud (checklist)
- IA_ARCHIPIELAGO.js log: "[IA DIAG][GUSANO] ... acciones=12/12" (escenario de arranque con objetivos suficientes).
- Trazas: "Merge=CONFIRMADO" como patron dominante durante la cadena.
- Sin atasco permanente en "merge_not_confirmed_yet".

## Señales de regresion
- Gusano se queda en 0-4 acciones en arranque con objetivos disponibles.
- Reaparicion persistente de "Merge=PENDIENTE(merge_not_confirmed_yet)".
- Ocupacion general repite trabajo sobre casillas ya propias tras completar presupuesto de gusano.

## Archivos clave del baseline
- ia_archipielago/IA_ARCHIPIELAGO.js
- index.html
- version.js
- CHANGELOG.md

## Restauracion rapida
1. Identificar el tag de baseline asociado a este hito.
2. Probar rapidamente con el escenario de arranque y revisar logs de acciones gusano.
3. Si hay regresion critica, volver temporalmente al tag para recuperar operatividad.

Comandos utiles:
- Ver tags de baseline:
  git tag -l "baseline-*"
- Mostrar commit del tag:
  git rev-list -n 1 <tag>
- Revisar diff contra baseline:
  git --no-pager diff <tag>..HEAD -- ia_archipielago/IA_ARCHIPIELAGO.js index.html version.js

## Nota de evolucion
Despues de este baseline, las mejoras de victoria (puntos/aniquilacion) deben construirse sin romper esta capa de ocupacion de corredor.
