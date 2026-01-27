# Fix: Herencia de Daño entre Fases del Raid

## Problema Crítico Reportado
Cuando el jugador completa la Fase 1 (barcos) y la Fase 2 inicia automáticamente (caballería), **la nueva caravana aparece con el daño heredado de la fase anterior**. Esto es un error grave porque cada fase debería tener una caravana completamente nueva con HP completo.

## Ejemplo del Problema
- **Fase 1**: Caravana de barcos con 30,000 HP, recibe 10,000 de daño → queda con 20,000 HP
- **Fase 2 (incorrecta)**: Nueva caravana de caballería aparece con 20,000 HP en lugar de 60,000 HP completos
- **Fase 2 (correcta)**: Nueva caravana de caballería debería tener 60,000 HP completos

## Causa Raíz del Bug

### 1. Referencia Obsoleta a `stageData`
En [raidManager.js](raidManager.js), línea ~72, se crea una referencia:
```javascript
const stageData = this.currentRaid.stage_data;
```

Luego, en línea ~197-209, se recargan datos frescos desde la BD:
```javascript
this.currentRaid = freshRaidData; // Actualiza this.currentRaid
// PERO: stageData sigue siendo una referencia al objeto VIEJO
```

### 2. Uso de Referencia Obsoleta
En línea ~267, se llama a `calculateCaravanPath(stageData)` con la referencia **obsoleta** que contiene el HP dañado de la fase anterior.

### 3. Sobrescritura de Datos Correctos
En `calculateCaravanPath` (línea ~621-625), se guarda **todo** el `stage_data` en la BD:
```javascript
await supabaseClient
    .from('alliance_raids')
    .update({ stage_data: stageData }) // Sobrescribe con datos obsoletos
```

Esto sobrescribe el HP correcto que se estableció en `transitionToStage` con el HP dañado del objeto viejo.

## Soluciones Implementadas

### 1. Actualización de Referencia (raidManager.js ~210)
**Antes:**
```javascript
if (freshRaidData && !refreshError) {
    this.currentRaid = freshRaidData;
    // stageData sigue siendo referencia al objeto viejo ❌
}
```

**Después:**
```javascript
if (freshRaidData && !refreshError) {
    this.currentRaid = freshRaidData;
    // CRÍTICO: Actualizar la referencia para que apunte a los datos frescos
    stageData = this.currentRaid.stage_data; ✅
    console.log("✅ Referencia de stageData actualizada a datos frescos");
}
```

### 2. Validación en calculateCaravanPath (raidManager.js ~630)
Se agregó validación antes de guardar en la BD:
```javascript
// VALIDACIÓN CRÍTICA: Verificar que el HP no se haya corrompido
const expectedMaxHp = stageData.caravan_max_hp;
const currentHp = stageData.caravan_hp;

if (currentHp > expectedMaxHp) {
    console.error("ERROR: HP actual excede el máximo!");
    stageData.caravan_hp = expectedMaxHp; // Corregir
}
```

### 3. Logging Mejorado (boardManager.js ~2003)
Se agregó logging detallado al crear el boss para detectar herencia de daño:
```javascript
console.log("%c[Raid Map] === ASIGNACIÓN DE HP DEL BOSS ===", ...);
console.log("HP máximo calculado desde regimientos:", bossUnit.maxHealth);
console.log("HP actual desde stageData.caravan_hp:", stageData.caravan_hp);

const hpPercentage = (stageData.caravan_hp / stageData.caravan_max_hp) * 100;
if (hpPercentage < 100) {
    console.warn("⚠️ ADVERTENCIA: La caravana ya tiene daño!");
    console.warn("Esto puede indicar herencia de daño de la fase anterior");
}
```

### 4. Función de Reparación de Emergencia
Nueva función `debugRepairCaravanHP()` que:
- Recalcula el HP correcto basado en la configuración de la etapa actual
- Regenera los regimientos con HP completo
- Guarda los datos corregidos en la BD

## Verificación y Testing

### 1. Ejecutar Verificación de Consistencia
```javascript
RaidManager.debugCheckConsistency();
```

Esto mostrará:
- ✅ HP completo: "La caravana tiene HP completo (sin daño heredado)"
- ⚠️ Herencia de daño: "HERENCIA DE DAÑO DETECTADA" con detalles del HP faltante

### 2. Reparar HP si es Necesario
Si se detecta herencia de daño:
```javascript
RaidManager.debugRepairCaravanHP();
```

Luego sal y vuelve a entrar al raid.

### 3. Logs en la Consola del Navegador
Al entrar al raid, busca estos mensajes:

**✅ Correcto (sin herencia de daño):**
```
[Raid] HP de caravana: 60000 / 60000
[Raid Map] Porcentaje de HP: 100.0%
[Raid Map] ✅ La caravana tiene HP completo
```

**❌ Incorrecto (con herencia de daño):**
```
[Raid] HP de caravana: 45000 / 60000
[Raid Map] Porcentaje de HP: 75.0%
[Raid Map] ⚠️ ADVERTENCIA: La caravana ya tiene daño!
[Raid Map] HP faltante: 15000
```

## HP Esperado por Fase

| Fase | Tipo | Cantidad | HP por Regimiento | HP Total Esperado |
|------|------|----------|-------------------|-------------------|
| 1 | Barco de Guerra | 30 | 200 | **6,000** |
| 2 | Caballería Pesada | 30 | 200 | **6,000** |
| 3 | Caballería Pesada | 40 | 200 | **8,000** |
| 4 | Barco de Guerra | 40 | 200 | **8,000** |

**Nota**: Si ves valores diferentes a estos, hay herencia de daño.

## Comandos de Debug Útiles

```javascript
// Ver estado completo del raid
RaidManager.debugShowRaidState();

// Verificar consistencia (incluye check de HP)
RaidManager.debugCheckConsistency();

// Reparar HP corrupto (emergencia)
RaidManager.debugRepairCaravanHP();

// Forzar transición a la siguiente fase (testing)
RaidManager.debugForceNextStage();
```

## Escenario de Prueba

1. **Inicia un raid nuevo** desde el HQ de tu alianza
2. **Entra a la Fase 1** y haz daño a la caravana (ej: déjala en 50% HP)
3. **Fuerza la transición** a Fase 2:
   ```javascript
   RaidManager.debugForceNextStage();
   ```
4. **Sal del raid** y vuelve a entrar desde el HQ
5. **Verifica el HP** de la caravana:
   ```javascript
   RaidManager.debugCheckConsistency();
   ```

**✅ Resultado esperado**: La caravana de Fase 2 debe tener 100% HP (6,000 / 6,000)
**❌ Bug confirmado**: La caravana de Fase 2 tiene menos de 100% HP

## Notas Técnicas

### Por qué ocurría el Bug
JavaScript pasa objetos por **referencia**, no por valor:
```javascript
const stageData = this.currentRaid.stage_data; // Referencia al objeto A
this.currentRaid = newData; // Cambia a objeto B
// Pero stageData sigue apuntando al objeto A (obsoleto)
```

### La Solución
Actualizar explícitamente la referencia después de recargar datos:
```javascript
this.currentRaid = freshRaidData; // Objeto B
stageData = this.currentRaid.stage_data; // Actualizar referencia a objeto B
```

## Mejoras Futuras

1. **Inmutabilidad**: Usar `Object.freeze()` para prevenir mutaciones accidentales
2. **Validación en servidor**: Mover validaciones críticas a stored procedures de Supabase
3. **Snapshots de HP**: Guardar historial de HP por fase para auditoría
4. **Tests automatizados**: Crear tests unitarios para verificar transiciones entre fases

## Changelog
- **2026-01-27 (v2)**: Fix crítico para herencia de daño entre fases
  - Actualizada referencia de stageData después de recargar datos frescos
  - Agregada validación de HP en calculateCaravanPath
  - Mejorado logging para detectar herencia de daño
  - Agregada función `debugRepairCaravanHP()` para emergencias
  - Expandida función `debugCheckConsistency()` para verificar HP

---

**Prioridad**: 🔴 CRÍTICA - Este bug afecta directamente la jugabilidad del raid
