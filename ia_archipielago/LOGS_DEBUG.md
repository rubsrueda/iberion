# Logs de IA Archipiélago - Guía de Debugging

## Estructura de Logs

Todos los módulos de la IA Archipiélago imprimen logs detallados con prefijos identificables:

### Prefijos por Módulo

- `[IA_SENTIDOS]` - Funciones de percepción (datos crudos del juego)
- `[IA_ECONOMICA]` - Análisis económico
- `[IA_TACTICA]` - Análisis táctico
- `[IA_ARCHIPIELAGO]` - Cerebro principal y flujo de decisión

## Flujo de Logs por Turno

Cuando la IA ejecuta su turno en modo Archipiélago, verás:

```
========================================
[IA_ARCHIPIELAGO] ========= TURNO X - JUGADOR Y =========
========================================

[IA_SENTIDOS] getTurnInfo: {...}
[IA_ARCHIPIELAGO] Recopilando objetivos propios...
[IA_SENTIDOS] getCities(Y): N ciudades [(r,c), ...]
[IA_SENTIDOS] getOwnedHexes(Y): M hexes
[IA_ARCHIPIELAGO] Objetivos totales: X (N ciudades, R recursos, I infraestructura)

[IA_ARCHIPIELAGO] Analizando situación táctica...
[IA_SENTIDOS] getUnits(Y): N unidades vivas
[IA_SENTIDOS] getUnits(X): M unidades vivas
[IA_TACTICA] detectarAmenazasSobreObjetivos(...): N amenazas
[IA_TACTICA] detectarFrente(...): M puntos de contacto

[IA_ARCHIPIELAGO] Analizando situación económica...
[IA_SENTIDOS] getResources(Y): oro=X, comida=Y, madera=Z
[IA_ECONOMICA] Economía evaluada: {...}
[IA_ECONOMICA] contarRecursosEnMapa(Y): {...}
[IA_ECONOMICA] detectarRecursosVulnerables(...): N recursos

[IA_ARCHIPIELAGO] ========= RESUMEN DE SITUACIÓN =========
Amenazas detectadas: N
Puntos de frente: M
Oro disponible: X
Recursos en mapa: Y
Objetivos enemigos vulnerables: Z
========================================

[IA_ARCHIPIELAGO] Turno finalizado
```

## Qué Verificar en los Logs

### 1. Sentidos Básicos
- ¿Se detectan las ciudades correctas?
- ¿El conteo de hexes propios es correcto?
- ¿Los recursos se reportan correctamente?

### 2. Detección de Unidades
- ¿Se cuentan todas las unidades vivas?
- ¿Se distinguen correctamente propias vs enemigas?

### 3. Análisis Táctico
- ¿El frente se detecta correctamente (unidades en rango 2)?
- ¿Las amenazas incluyen solo enemigos cerca de objetivos (rango 3)?

### 4. Análisis Económico
- ¿Los recursos en mapa se cuentan bien?
- ¿Los recursos vulnerables del enemigo se identifican (guardias <= 1)?

## Errores Comunes a Buscar

1. **"hex no existe"** en evaluarDefensaHex → Coordenadas inválidas
2. **0 unidades detectadas** cuando deberían existir → Problema con `units[]` o filtros
3. **0 ciudades** cuando deberían existir → Problema con `gameState.cities`
4. **Recursos undefined** → `gameState.playerResources` no inicializado

## Para Agregar Más Logs

Usa el patrón:
```javascript
console.log(`[MODULO] Acción: descripción`, datos);
```

Donde:
- `MODULO` = IA_SENTIDOS, IA_ECONOMICA, IA_TACTICA, IA_ARCHIPIELAGO
- `Acción` = Nombre de la función o paso
- `descripción` = Lo que está pasando
- `datos` = Objetos relevantes (opcional)
