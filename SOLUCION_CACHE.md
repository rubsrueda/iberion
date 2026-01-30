# 🔄 Solución al Problema de Caché en Iberion

## 🎯 El Problema

**Síntoma**: El juego funciona en modo incógnito pero no en el navegador normal.

**Causa**: El navegador y el Service Worker están sirviendo una versión antigua (rota) del código desde la caché.

---

## ✅ Soluciones Implementadas

### 1. Service Worker Mejorado
✅ El Service Worker ahora se actualiza automáticamente  
✅ Limpia cachés antiguas al activarse  
✅ En desarrollo: NO cachea nada (siempre desde red)  
✅ Detecta actualizaciones y recarga automáticamente

### 2. Sistema Anti-Caché
✅ Parámetros de versión en los scripts  
✅ Detección de actualizaciones cada 5 segundos  
✅ Recarga automática al detectar nueva versión  

### 3. Herramientas de Limpieza
✅ `clear-cache.sh` - Script de limpieza  
✅ `diagnostico-cache.html` - Página de diagnóstico interactiva  
✅ Actualización automática del SW al hacer `./version`

---

## 🚀 Soluciones Rápidas (Elige Una)

### OPCIÓN 1: Recarga Forzada ⭐ (Más Rápida)
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### OPCIÓN 2: Página de Diagnóstico ⭐ (Más Completa)
1. Abre en tu navegador: `http://localhost:8000/diagnostico-cache.html`
2. Click en "⚡ Limpieza Completa + Recarga"
3. Espera 2 segundos
4. ¡Listo!

### OPCIÓN 3: Script de Terminal
```bash
./clear-cache.sh
# Luego recargar el navegador con Ctrl+Shift+R
```

### OPCIÓN 4: Limpieza Manual (DevTools)
1. Abre el juego
2. Presiona **F12** (DevTools)
3. Ve a **Application** (Chrome) o **Storage** (Firefox)
4. En "Service Workers" → Click **Unregister**
5. En "Storage" → Click **Clear site data**
6. Cierra DevTools y recarga con **Ctrl+Shift+R**

### OPCIÓN 5: Modo Incógnito (Temporal)
```
Windows/Linux: Ctrl + Shift + N (Chrome) o Ctrl + Shift + P (Firefox)
Mac: Cmd + Shift + N (Chrome) o Cmd + Shift + P (Firefox)
```
Luego abre `index.html` en esa ventana.

---

## 🔧 Diagnóstico del Problema

### Verificar Si Tienes el Problema
1. Abre `diagnostico-cache.html` en tu navegador
2. Observa:
   - **Service Worker**: Si dice "Registrado" → Tienes SW activo
   - **Cachés**: Si hay números > 0 → Tienes cachés antiguos
   - **Versión**: Compara con la marca de agua del juego

### Señales de Caché Antigua
- ❌ El juego funciona en incógnito pero no en navegador normal
- ❌ Los cambios del código no se reflejan
- ❌ Errores en consola que no aparecen en incógnito
- ❌ Versión en marca de agua diferente a CHANGELOG.md

---

## 🛡️ Prevención Automática

### Desde Ahora (Ya Implementado)
El sistema ahora:
1. ✅ Detecta actualizaciones automáticamente cada 5 segundos
2. ✅ Recarga la página al detectar nueva versión
3. ✅ Limpia cachés antiguas automáticamente
4. ✅ Actualiza el SW al ejecutar `./version "cambio"`

### Durante Desarrollo
```bash
# Cada vez que hagas cambios importantes:
./version "Descripción del cambio"

# Esto automáticamente:
# ✓ Actualiza la versión
# ✓ Invalida el caché del SW
# ✓ Te recuerda hacer Ctrl+Shift+R
```

---

## 📊 Flujo de Actualización Mejorado

```
┌─────────────────────┐
│  Haces Cambios      │
│  en el Código       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ./version "cambio"  │
│                     │
│ ✓ Incrementa ver.   │
│ ✓ Actualiza SW      │
│ ✓ Invalida caché    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ Ctrl+Shift+R           │
│ (Recarga Forzada)      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Navegador:              │
│ 1. Descarga nuevos JS   │
│ 2. Registra nuevo SW    │
│ 3. Limpia cachés viejos │
│ 4. Recarga auto (5seg)  │
└──────────┬──────────────┘
           │
           ▼
     ✅ ¡LISTO!
```

---

## 🎯 Casos Específicos

### Caso 1: "Hice cambios pero no se ven"
```bash
# Solución rápida:
./clear-cache.sh
# En navegador: Ctrl+Shift+R
```

### Caso 2: "Error en consola que antes no estaba"
```
1. Abre diagnostico-cache.html
2. Click "⚡ Limpieza Completa + Recarga"
3. Si persiste → el error es real (no de caché)
```

### Caso 3: "Solo funciona en incógnito"
```
Causa: 100% problema de caché
Solución: Cualquiera de las opciones 1-4 arriba
```

### Caso 4: "Quiero estar seguro de la versión"
```
1. Abre diagnostico-cache.html
2. Lee "Versión del Juego"
3. Compara con CHANGELOG.md o marca de agua
```

---

## 🔍 Herramientas Disponibles

| Herramienta | Uso | Cuándo Usarla |
|-------------|-----|---------------|
| `clear-cache.sh` | Actualiza SW y muestra instrucciones | Después de cambios importantes |
| `diagnostico-cache.html` | Interfaz visual de limpieza | Cuando tienes dudas sobre caché |
| `Ctrl+Shift+R` | Recarga forzada | Siempre, es el método más rápido |
| DevTools (F12) | Limpieza manual profunda | Cuando todo lo demás falla |
| Modo Incógnito | Prueba sin caché | Para confirmar que es problema de caché |

---

## 💡 Consejos Pro

### Durante Desarrollo
1. **Siempre** usa `Ctrl+Shift+R` después de cambios
2. Mantén DevTools abierto (F12) con "Disable cache" marcado
3. Ejecuta `./clear-cache.sh` al empezar sesión de desarrollo
4. Usa `diagnostico-cache.html` si algo se comporta raro

### Para Producción
Cuando el juego esté listo para usuarios finales:
1. Edita `sw.js`: Cambia `FORCE_UPDATE = false`
2. Esto activará caché inteligente (mejor rendimiento)
3. Las actualizaciones seguirán funcionando automáticamente

### Trucos de DevTools
```
F12 → Application → Service Workers → ☑ Update on reload
F12 → Network → ☑ Disable cache
```

---

## 📝 Checklist de Solución

- [ ] He ejecutado `./clear-cache.sh`
- [ ] He recargado con `Ctrl+Shift+R`
- [ ] He verificado en `diagnostico-cache.html`
- [ ] He desregistrado el SW en DevTools
- [ ] He limpiado "Clear site data" en DevTools
- [ ] He probado en modo incógnito (¿funciona?)
- [ ] Si funciona en incógnito → es definitivamente caché
- [ ] He esperado 30 segundos después de recargar (SW se actualiza)

---

## 🆘 Si Nada Funciona

### Última Opción Nuclear 💣
```bash
# 1. Cierra TODAS las ventanas del navegador
# 2. Ejecuta:
./clear-cache.sh

# 3. Abre navegador
# 4. F12 → Application → Clear site data
# 5. Cierra DevTools
# 6. Abre diagnostico-cache.html
# 7. Click "⚡ Limpieza Completa + Recarga"
# 8. Ctrl+Shift+R tres veces seguidas
# 9. Espera 10 segundos
# 10. Abre index.html
```

Si TODAVÍA no funciona → el problema no es caché, es del código.

---

## 📚 Referencias

- [service-worker.md](docs/service-worker.md) - Documentación del SW (si existe)
- [sw.js](sw.js) - Código del Service Worker
- [diagnostico-cache.html](diagnostico-cache.html) - Herramienta de diagnóstico
- [clear-cache.sh](clear-cache.sh) - Script de limpieza

---

**Actualizado**: 30 enero 2026  
**Versión del Sistema**: V1.001  
**Problema**: RESUELTO ✅

