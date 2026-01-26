# 🔧 Guía Debug - Caravana Imperial

## Para validar cambios en Fase 2

### Opción 1: Forzar avance de fase (Recomendado)
1. Abre la consola del navegador (F12)
2. Ejecuta: `RaidManager.debugForceNextStage()`
3. Esto forzará el avance a la siguiente fase inmediatamente

### Opción 2: Desde consola debug del juego
1. Dentro del juego, presiona `Ctrl+Shift+D` para abrir la consola debug
2. En el campo de comandos, escribe: `RaidManager.debugForceNextStage()`
3. Presiona Enter

### Verificar cambios
Después de forzar el avance a Fase 2:
- ✅ Deberías ver **Caballería Pesada** en lugar de barcos
- ✅ El tipo de terreno debería ser **plains** (llanuras)
- ✅ Los regimientos de la caravana deben ser terrestres

### Notas importantes
- Esta función solo funciona si hay un raid activo
- Puedes llamarla múltiples veces para avanzar por todas las fases (1→2→3→4)
- Si llegas a la fase 4, la función te avisará que ya estás en la última

## Logs para seguimiento
Busca estos mensajes en la consola:
```
[Raid Debug] Forzando transición: Etapa X → Y
[Raid] Etapa Y iniciada con Caballería Pesada.
[Raid Debug] ✅ Transición completada
```
