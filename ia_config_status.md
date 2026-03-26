# Estado de Configuración IA Unificada

**Fecha**: 2026-03-26  
**Versión**: 1.0  
**Estado**: ✅ FASE 1 COMPLETADA

---

## 📋 Resumen de Cambios

### Archivos Creados

| Archivo | Propósito | Status |
|---------|-----------|--------|
| `ia_config.json` | Configuración centralizada del motor IA | ✅ Creado y validado |
| `IaConfigManager.js` | Módulo de carga y validación de config | ✅ Creado |

---

## 🔍 Contenido de ia_config.json

### Estructura General
```
✓ version: "1.0"  
✓ max_misiones_por_turno: 6  
✓ penalizacion_distancia: 0.1  
✓ penalizacion_riesgo: 0.5  
✓ multiplicadores: {economia, supervivencia, sabotaje, control}  
✓ umbrales: {economia_critica, ataque_ofensivo, salud_critica_unidad}  
✓ nodos: 17 tipos de nodos ✓ victoria_puntos: pesos finales dePartida
✓ protocolo_defensa_capital: parámetros  
✓ gran_apertura: configuración de oleadas
```

### Nodos Configurados (17 tipos)
1. ✅ `ciudad_natal_propia` — Defensa crítica (peso_base: 500)
2. ✅ `ultima_unidad_propia` — Preservación (peso_base: 400)
3. ✅ `ciudad_propia_conectada` — Economía activa (peso_base: 120)
4. ✅ `ciudad_propia_desconectada` — Reconexión (peso_base: 80)
5. ✅ `banca` — Ingreso pasivo (peso_base: 200)
6. ✅ `ciudad_libre` — Captura (peso_base: 60)
7. ✅ `camino_propio_critico` — Red crítica (peso_base: 90)
8. ✅ `camino_enemigo_critico` — Sabotaje (peso_base: 0, sabotaje: 80)
9. ✅ `caravana_propia` — Defensa económica (peso_base: 100)
10. ✅ `caravana_enemiga` — Sabotaje (peso_base: 0, sabotaje: 90)
11. ✅ `recurso_estrategico` — Minería (peso_base: 60)
12. ✅ `ciudad_enemiga` — Asedio final (peso_base: 30, control: 100)
13. ✅ `cuello_botella` — Paso geográfico (peso_base: 40)
14. ✅ `sitio_aldea` — Expansión (peso_base: 60)
15. ✅ `sitio_desembarco` — Operación anfibia (peso_base: 50)
16. ✅ `fortaleza_a_construir` — Defensa (peso_base: 50)
17. ✅ `ciudad_barbara` — Expedición (peso_base: 70)

---

## ✅ Validación Realizada

### Verificaciones Efectuadas
```
✓ Sintaxis JSON válida
✓ Estructura de objeto raíz correcta
✓ Todos los campos requeridos presentes
✓ Tipos de datos correctos (numbers, objects, strings)
✓ Restricciones numéricas respetadas (≥ 0)
✓ Versión en formato correcto (X.Y)
✓ Todos los 17 nodos incluyen 5 pesos cada uno
✓ 6 puntos de victoria presentes
✓ Umbrales y multiplicadores válidos
```

### Resultado
```
✅ JSON VÁLIDO - Sin errores de estructura
✅ 17 nodos cargados correctamente
✅ Multiplicadores: {economia: 1.2, supervivencia: 2.0, sabotaje: 0.9, control: 0.7}
✅ Umbrales: {economia_critica: 400, ataque_ofensivo: 1000, salud_critica_unidad: 35}
```

---

## 🔌 Integración Próxima

### Paso 1: Añadir llamada de carga a initApp()
```javascript
// En main.js o gameFlow.js
if (!IaConfigManager.isLoaded) {
    const configLoaded = await IaConfigManager.loadConfig();
    if (!configLoaded) {
        console.error("CRÍTICO: Configuración IA no pudo cargarse");
    }
}
```

### Paso 2: Refactorizar ai_gameplayLogic.js
Cuando se implemente el motor refactorizado, `AiGameplayManager` leerá valores desde `IaConfigManager.get()` en lugar de hardcodearlos.

**Ejemplo de cambio futuro**:
```javascript
// ANTES: hardcoded
const economyThreshold = 400;

// DESPUÉS: desde config
const economyThreshold = IaConfigManager.get('umbrales.economia_critica', 400);
```

### Paso 3: Función de cálculo de peso (futura)
```javascript
/**
 * Calcula peso de un nodo según especificación §2.4
 */
function calcularPesoNodo(nodo, estado, config) {
    const base   = config.nodos[nodo.tipo]?.peso_base ?? 0;
    const econ   = nodo.valor_economico   * config.multiplicadores.economia;
    const surv   = nodo.valor_supervivencia * config.multiplicadores.supervivencia;
    const sab    = nodo.valor_sabotaje    * config.multiplicadores.sabotaje;
    const ctrl   = nodo.valor_control     * config.multiplicadores.control;
    const dist   = 1 / (1 + nodo.distancia * config.penalizacion_distancia);
    const riesgo = 1 - (nodo.riesgo       * config.penalizacion_riesgo);
    return (base + econ + surv + sab + ctrl) * dist * riesgo;
}
```

---

## 📊 Métricas de Configuración

| Métrica | Valor |
|---------|-------|
| Total de nodos tipo | 17 |
| Puntos de victoria tipo | 6 |
| Multiplicadores | 4 |
| Umbrales | 3 (+ protocolo + gran_apertura) |
| Tamaño archivo JSON | ~8.5 KB |
| Parámetros ajustables | 60+ |

---

## 🚀 Próximos Pasos (FASE 2)

1. **Cargar config en initApp()** — Asegurar que `IaConfigManager` se inicializa antes de cualquier turno IA
2. **Extraer pesos de ai_gameplayLogic.js** — Migrar números hardcoded a `IaConfigManager.get()`
3. **Implementar `calcularPesoNodo()` formal** — Según §2.4 de especificación
4. **Crear detector de NodoValor** — Según catálogo §4
5. **Implementar Matriz de Desempates** — Según §3.1–3.3
6. **Agregar logging de razon_texto** — Para depuración e tutorial

---

## 📝 Nota de No-Regresión

✅ **Protegido**: Línea base de especificación §0.2  
- No se ha modificado `ai_gameplayLogic.js` aún  
- Motor actual sigue funcionando como siempre  
- `ia_config.json` es auxiliar (standby) hasta refactor FASE 2

---

## 📖 Referencias

- **Especificación técnica**: [IA_UNIFICACION_ESPECIFICACION_TECNICA.md](IA_UNIFICACION_ESPECIFICACION_TECNICA.md)
- **Base conceptual**: [IA_INVASION_UNIFICACION_BASE.md](IA_INVASION_UNIFICACION_BASE.md)
- **Módulo de config**: [IaConfigManager.js](IaConfigManager.js)
- **Archivo config**: [ia_config.json](ia_config.json)

---

**Generad por**: IA Unificación v1.0  
**Estado**: LISTO PARA FASE 2
