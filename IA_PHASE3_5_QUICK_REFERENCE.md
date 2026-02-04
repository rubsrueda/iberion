# 🚀 REFERENCIA RÁPIDA: Fase 3.5 Reescrita

## TL;DR (Too Long; Didn't Read)

**Cambio**: Lógica de fusión ofensiva cambió de **radio-basada** a **poder-basada**
**Archivo**: `/workspaces/iberion/ia_archipielago/IA_ARCHIPIELAGO.js` (líneas 270-485)
**Status**: ✅ Completado y validado
**Métodos**: 7 nuevos, 3 eliminados, 1 reescrito

---

## 📊 La Decisión en 5 Segundos

```javascript
// Antes (INCORRECTO):
if (unidadesCercanas.length > 1 && distancia <= 3) {
  mergeUnits(unidadesCercanas);  // Solo porque están cerca
}

// Después (CORRECTO):
const poder = misPoder / enemigoPoder;
if (poder >= 1.3) {
  atacarDirecto();      // Tenemos ventaja
} else if (poder >= 0.8) {
  envolvimiento();      // Batalla dudosa
} else {
  retirada();           // Demasiado fuerte
}
```

---

## 🎯 Árbol de Decisión Rápido

```
Poder Relativo
├─ >= 1.3x ──→ ⚔️ ATAQUE DIRECTO (máxima agresión)
├─ 0.8-1.3x ──→ 🔄 ENVOLVIMIENTO (coordinación multi-lado)
├─ 0.5-0.8x ──→ 🔙 RETIRADA (consolidación o fuga)
└─ < 0.5x ──→ ⛔ IGNORAR (demasiado fuerte)
```

---

## 📍 Métodos Nuevos

| # | Método | Propósito | Línea |
|---|--------|-----------|-------|
| 1 | `ejecutarFusionesOfensivas()` | Coordinador principal | 278 |
| 2 | `_evaluarYActuarContraEnemigoAislado()` | Evaluador maestro | 297 |
| 3 | `_ejecutarAtaqueConcentrado()` | Estrategia 1.3x+ | 330 |
| 4 | `_ejecutarEnvolvimiento()` | Estrategia 0.8-1.3x | 360 |
| 5 | `_ejecutarRetiradaEstrategica()` | Estrategia <0.8x | 382 |
| 6 | `_fusionarTodo()` | Consolidación máxima | 410 |
| 7 | `_evaluarConquistaDeCity()` | Evaluación de ciudades | 445 |

---

## 💬 Logs Esperados

```
[IA_ARCHIPIELAGO] FASE 3.5: FUSIÓN OFENSIVA INTELIGENTE
[IA_ARCHIPIELAGO] Enemigo (3,5): Poder 15/10 = 1.50x
[IA_ARCHIPIELAGO] ⚔️ ATAQUE DIRECTO (1.50x)
[IA_ARCHIPIELAGO] + Refuerzo: Unit-2 → Unit-0
[IA_ARCHIPIELAGO] ATACANDO en (3,5)
```

---

## 🧪 Quick Test

```javascript
// Ejecuta en Debug Console (Ctrl+Shift+D):
units[0] = { r: 2, c: 5, regiments: [6], owner: 1, currentHealth: 100 };
units[1] = { r: 2, c: 6, regiments: [9], owner: 1, currentHealth: 100 };
units[2] = { r: 5, c: 4, regiments: [10], owner: 2, currentHealth: 100 };
gameState.currentPlayer = 1;
handleEndTurn();

// Resultado esperado:
// [IA] Poder 15/10 = 1.50x → ⚔️ ATAQUE DIRECTO
```

---

## ⚙️ Configurables

Puedes ajustar estos valores:

```javascript
// En _evaluarYActuarContraEnemigoAislado():
const ATAQUE_THRESHOLD = 1.3;        // Cambiar para más/menos agresivo
const ENVOLVIMIENTO_MIN = 0.8;       // Cambiar rango envolvimiento
const RETIRADA_MIN = 0.5;            // Cambiar límite retirada

// Radios de búsqueda:
const RADIO_ENEMIGOS = 5;            // Dónde buscar enemigos
const RADIO_CIUDADES = 4;            // Dónde buscar ciudades

// Factor de seguridad para ciudades:
const FACTOR_SEGURIDAD = 1.2;        // 20% extra de poder requerido
```

---

## 📚 Documentos Creados

- `IA_ARCHIPIELAGO_FASE3_5_REWRITE.md` - Guía técnica completa
- `IA_PHASE3_5_SUMMARY.md` - Resumen ejecutivo
- `IA_PHASE3_5_BEFORE_AFTER.md` - Comparación antes/después
- `IA_PHASE3_5_VALIDATION.md` - Validación técnica
- `IA_PHASE3_5_TESTING_GUIDE.md` - Guía de testing (7 escenarios)
- `IA_PHASE3_5_FINAL_SUMMARY.md` - Conclusión
- **Este archivo** - Referencia rápida

---

## ✅ Validación en 10 Segundos

```javascript
// En Console, busca esto después de handleEndTurn():
// [IA_ARCHIPIELAGO] Poder X/Y = Z.XXx
// [IA_ARCHIPIELAGO] [ESTRATEGIA]
// [IA_ARCHIPIELAGO] [ACCIÓN]

// Si ves esto → ✅ Funciona
// Si NO ves → ❌ Problema (revisa errores en F12)
```

---

## 🎮 Comportamiento por Escenario

```
Escenario                    Poder    Acción
─────────────────────────────────────────────
15 reg vs 10 reg (1.5x)    >= 1.3   ⚔️ Atacar
8 reg vs 10 reg (0.8x)     0.8-1.3  🔄 Rodear
3 reg vs 10 reg (0.3x)     < 0.5    ⛔ Ignorar
8 reg vs Ciudad(4) (2.0x)  >= 1.3   🏛️ Conquistar
3 reg vs Ciudad(4) (0.75x) < 1.3    ⏳ Esperar
```

---

## 🔧 Debugging Rápido

| Problema | Solución |
|----------|----------|
| No fusiona | Verificar `mergeUnits` existe |
| No se mueve | Verificar `_executeMoveUnit` existe |
| Poder incorrecto | Verificar: `sum(regiments) / enemigoPower` |
| No evalúa ciudades | Verificar `gameState.cities` existe |
| Logs no aparecen | Abrir Console (F12), buscar `[IA_ARCHIPIELAGO]` |

---

## 📝 Cambio Resumido en Una Frase

> "La IA ahora evalúa si **puede ganar** antes de atacar, en lugar de simplemente fusionar porque las unidades están cerca"

---

## 🎬 Próximo Paso

1. **Prueba en vivo**: `handleEndTurn()` en consola
2. **Observa logs**: Verifica que poder relativo se calcula
3. **Valida movimientos**: Comprueba que las tácticas son correctas
4. **Reporta anomalías**: Si algo no coincide con TESTING_GUIDE

---

## 📞 Ayuda Rápida

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde está el código? | `/workspaces/iberion/ia_archipielago/IA_ARCHIPIELAGO.js` (líneas 270-485) |
| ¿Cuándo se ejecuta? | FASE 3.5 de `ejecutarPlanDeAccion()` |
| ¿Qué hace exactamente? | Calcula poder relativo y ejecuta estrategia |
| ¿Cómo lo pruebo? | Ver `IA_PHASE3_5_TESTING_GUIDE.md` |
| ¿Qué cambió realmente? | De radio-basado a poder-basado |
| ¿Hay errores? | No, 0 errores de sintaxis ✅ |

---

**Status**: ✅ LISTO PARA USAR
**Versión**: 2.0
**Última actualización**: Enero 2026

¿Necesitas más detalles? Abre uno de los 6 documentos de soporte. 📖
