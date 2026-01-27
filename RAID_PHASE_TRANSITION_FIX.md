# Fix: Visualización Incorrecta de Caravana entre Fases del Raid

## Problema Reportado
Cuando el jugador completa la Fase 1 del raid (barcos) y la Fase 2 inicia automáticamente (caballería), al volver a entrar al raid se ven los **barcos de la fase anterior en la meta** en lugar de la **nueva caravana de caballería en su punto de avance inicial**.

## Causa Raíz
El problema ocurría porque:

1. **Datos cacheados**: Al entrar al raid, se usaba `this.currentRaid` que podía contener datos antiguos de la fase anterior
2. **Falta de validación**: No había verificación de consistencia entre la etapa actual y los regimientos del boss
3. **Timing de actualización**: La posición de la caravana se actualizaba después de renderizar el mapa

## Soluciones Implementadas

### 1. Recarga de Datos Frescos (raidManager.js)
**Línea ~218**: Antes de mostrar el mapa, ahora se recargan los datos más recientes desde la base de datos:

```javascript
// B2. CRÍTICO: Recargar datos FRESCOS desde la BD antes de renderizar
const { data: freshRaidData, error: refreshError } = await supabaseClient
    .from('alliance_raids')
    .select('*')
    .eq('id', this.currentRaid.id)
    .single();

if (freshRaidData && !refreshError) {
    this.currentRaid = freshRaidData;
    // Logging para verificar los datos actualizados
}
```

**Por qué funciona**: Asegura que siempre se use el estado más reciente del raid, incluyendo los regimientos correctos de la fase actual.

### 2. Validación de Consistencia (boardManager.js)
**Línea ~1905**: Se agregó validación para detectar inconsistencias entre la etapa actual y los datos del boss:

```javascript
// VALIDACIÓN DE CONSISTENCIA
if (bossRegiments && bossRegiments.length > 0) {
    const expectedType = stageConfig.regimentType;
    const actualType = bossRegiments[0].type;
    if (expectedType !== actualType) {
        console.error("ERROR DE CONSISTENCIA DETECTADO!");
        // Forzar regeneración de regimientos correctos
        bossRegiments = null;
    }
}
```

**Por qué funciona**: Si se detectan datos obsoletos (ej: regimientos de "Barco de Guerra" en una fase de "Caballería"), fuerza la regeneración con los datos correctos.

### 3. Logging Mejorado (boardManager.js)
**Línea ~1948**: Se agregó logging detallado para facilitar el debug:

```javascript
console.log("%c[Raid Map] CREANDO BOSS DE LA CARAVANA", 'background: #00ff00; ...');
console.log("Tipo de regimiento:", firstType);
console.log("Etapa actual:", RaidManager?.currentRaid?.current_stage);
console.log("%c[Raid Map] SPRITE FINAL:", 'background: #ffff00; ...', bossSprite);
```

**Por qué ayuda**: Permite identificar rápidamente si el sprite y los regimientos son los correctos para la fase actual.

### 4. Función de Debug (raidManager.js)
**Nueva función `debugCheckConsistency()`**: Verifica la integridad de los datos del raid:

```javascript
RaidManager.debugCheckConsistency();
```

Esto comprueba:
- ✅ Tipo y cantidad de regimientos vs configuración de la etapa
- ✅ Posición válida de la caravana
- ✅ HP dentro de rangos esperados
- ✅ Detecta inconsistencias y sugiere soluciones

## Cómo Probar el Fix

### Escenario de Prueba
1. Inicia un raid y completa la Fase 1 (barcos)
2. Espera a que la Fase 2 inicie automáticamente (o usa `RaidManager.debugForceNextStage()`)
3. Sal del mapa y vuelve a entrar desde el HQ de la alianza
4. **Resultado esperado**: Deberías ver la nueva caravana de caballería en columna 1, NO los barcos antiguos

### Comandos de Debug Útiles

```javascript
// Ver estado completo del raid actual
RaidManager.debugShowRaidState();

// Verificar consistencia de datos
RaidManager.debugCheckConsistency();

// Forzar transición a la siguiente fase (para testing)
RaidManager.debugForceNextStage();

// Ver logs detallados en la consola del navegador
// Buscar los mensajes con fondo de color:
// - Verde: Creación exitosa del boss
// - Amarillo: Sprite final seleccionado
// - Rojo: Errores de consistencia detectados
```

## Notas Técnicas

### Flujo de Creación del Boss
1. `raidManager.enterRaid()` → Recarga datos frescos
2. `raidManager.showRaidMap()` → Llama a `initializeRaidMap()`
3. `initializeRaidMap()` → Valida consistencia de regimientos
4. `placeBossUnitDirectly()` → Crea el elemento DOM con el sprite correcto

### Sprites por Fase
- **Fase 1** (Naval): `images/sprites/barco256.png` (Barco de Guerra)
- **Fase 2** (Tierra): `images/sprites/cab_pesada128.png` (Caballería Pesada)
- **Fase 3** (Tierra): `images/sprites/cab_pesada128.png` (Caballería Pesada)
- **Fase 4** (Naval): `images/sprites/barco256.png` (Barco de Guerra)

### Configuración de Fases (constants.js)
```javascript
RAID_CONFIG.STAGES = {
    1: { regimentType: "Barco de Guerra", regimentCount: 30 },
    2: { regimentType: "Caballería Pesada", regimentCount: 30 },
    3: { regimentType: "Caballería Pesada", regimentCount: 40 },
    4: { regimentType: "Barco de Guerra", regimentCount: 40 }
}
```

## Posibles Mejoras Futuras

1. **Transición suave**: Agregar animación cuando la caravana cambia de tipo entre fases
2. **Notificación push**: Avisar a los jugadores cuando una nueva fase inicia
3. **Persistencia de progreso**: Mantener a los jugadores en sus slots entre fases (actualmente se expulsan)
4. **Validación en servidor**: Mover la validación de consistencia a un stored procedure de Supabase

## Changelog
- **2026-01-27**: Implementado fix para el problema de visualización entre fases
  - Agregada recarga de datos frescos antes de renderizar
  - Agregada validación de consistencia de regimientos
  - Mejorado logging para debugging
  - Agregada función `debugCheckConsistency()`

---

**Contacto**: Si el problema persiste, ejecuta `RaidManager.debugCheckConsistency()` y comparte los logs de la consola.
