# Sistema de Estaciones del Año — Guía

## Resumen

Las estaciones cambian automáticamente cada **10 turnos** y afectan el movimiento y la atrición de todas las unidades. Son transparentes para el jugador: no requieren acción, simplemente condicionan la táctica.

---

## Ciclo

| Turno | Estación | Movimiento | Atrición (sin suministro) |
|-------|----------|:----------:|:-------------------------:|
| 1–10   | 🌱 Primavera | 100% (normal) | 100% (normal) |
| 11–20  | ☀️ Verano    | 110% (+1 hex aprox.) | 90% (menor penalización) |
| 21–30  | 🍂 Otoño     | 95%  (−5%)  | 110% (algo más dura) |
| 31–40  | ❄️ Invierno  | 80%  (−20%) | 140% (muy dura) |
| 41–50  | 🌱 Primavera | ciclo infinito... | |

> Los valores de movimiento se aplican sobre el valor calculado de la unidad **después** de aplicar bonificaciones de comandante y terreno.  
> La atrición afecta solo a las unidades **sin suministro** (incomunicadas de capital o ciudades).

---

## Efecto de Invierno en detalle

En invierno las unidades incomunicadas pierden **×1.4** de moral por turno en lugar del valor base (10 → 14 puntos de moral por turno sin suministro).

**Implicación táctica**: en invierno, una unidad aislada se desorganiza mucho más rápido. No dejes flancos expuestos.

---

## Dónde ver la estación actual

Aparece en **dos lugares** de la UI:

1. **Panel flotante** (menú lateral durante la partida):
   ```
   Fase: En Juego
   Turno 14 — Jugador 2 (Humano)
   Estacion: Verano
   ```

2. **Top bar** (barra superior):
   ```
   Fase: play | Turno: 14 | Estacion: Verano | J2 (Humano)
   ```

---

## Cambio de estación

Cuando la estación cambia (ej. turno 11), aparece un mensaje en el log de la partida:

> `Cambio de estacion: Verano. Mov 110% | Atricion 90%.`

---

## Configuración técnica

En `constants.js` → `GAMEPLAY_SEASON_CONFIG`:

```js
TURNS_PER_SEASON: 10,     // Turnos antes de cambiar estación
CYCLE: [
  { key: 'spring', name: 'Primavera', movementMultiplier: 1.0, attritionMultiplier: 1.0 },
  { key: 'summer', name: 'Verano',    movementMultiplier: 1.1, attritionMultiplier: 0.9 },
  { key: 'autumn', name: 'Otono',     movementMultiplier: 0.95, attritionMultiplier: 1.1 },
  { key: 'winter', name: 'Invierno',  movementMultiplier: 0.8, attritionMultiplier: 1.4 }
]
```

Para ajustar la intensidad de los efectos, edita los valores `movementMultiplier` / `attritionMultiplier` directamente aquí.

---

## Compatibilidad con red / guardado

- El campo `currentSeasonKey`, `currentSeasonName` y `currentSeasonEffects` se guardan en `gameState` y se sincronizan por Supabase al guardar en nube.
- Las partidas guardadas antes de este sistema arrancan en Primavera (valores por defecto).

---

## Balance recomendado (primera iteración)

| Parámetro | Valor actual | Mínimo sugerido | Máximo sugerido |
|-----------|:------------:|:---------------:|:---------------:|
| Turnos por estación | 10 | 5 | 20 |
| Mov. verano | 1.10 | 1.05 | 1.20 |
| Mov. invierno | 0.80 | 0.65 | 0.90 |
| Atrición invierno | 1.40 | 1.20 | 2.00 |

Los valores actuales son conservadores a propósito para no romper el balance existente en la primera prueba.
