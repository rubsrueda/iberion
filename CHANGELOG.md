# Registro de Cambios - Iberion

Todas las modificaciones importantes al juego serán documentadas en este archivo.

**Sistema de versionado híbrido:**
- **V1.001, V1.002, V1.003...** = Features completos o cambios funcionales
- **V1.001a, V1.001b...** = Hotfixes o debugging de la versión base

---

## V1.154 - 2026-04-06
### Baseline Estable: Ocupación de Casillas por Corredor (Split+Merge Gusano)
- Se consolida como baseline estable el flujo de ocupación inicial/mantenimiento de corredor.
- Modo `bootstrap` operativo con tope de 12 acciones para primeras capas de expansión.
- Confirmación de merge en trazas humanas (`Merge=CONFIRMADO`) y recuperación de encadenado gusano.
- Se añade traza de versión/milestone para facilitar restauración en futuras regresiones.

**Criterios de aceptación del baseline (referencia):**
- Log `IA_DIAG[GUSANO]` alcanzando `acciones=12/12` en turno de arranque bajo condiciones normales.
- Trazas de gusano con `Merge=CONFIRMADO` en vez de estado pendiente permanente.
- Menor trabajo redundante post-gusano cuando ya se agotó presupuesto de ocupación.

**Objetivo de este hito:**
- Proveer un punto de restauración confiable antes de iterar sobre capas de victoria (puntos/aniquilación).

---

## V1.001 - 2026-01-30
### Sistema de Versionado + OAuth Funcional
- Implementado sistema de versionado automático (V1.XXX)
- Script `update-version.sh` para incrementar versión con soporte de hotfixes
- Marca de agua en pantalla con versión actual
- Login con Google OAuth completamente funcional
- Redirect URLs configuradas para GitHub Pages
- Prevención de loops infinitos en autenticación
- Service Worker temporalmente deshabilitado
- Herramientas de diagnóstico: hola.html, diagnostico-cache.html, emergencia.html, debug-oauth.html

**Iteraciones de debugging consolidadas:**
- Mejorada detección de URL de redirect OAuth
- Agregados flags para prevenir loops de autenticación (isProcessingAuth, authInitialized, oauthCallbackDetected)
- Mejorada lógica de startup con verificación de sesión
- Service Worker deshabilitado temporalmente por bugs de cache
- URL de redirect fija según configuración Supabase
- Flujo OAuth completo sin volver a pantalla de login

---

## V1.000 - Versión Inicial
Sistema base del juego implementado antes de versionado automatizado.

