# Registro de Cambios - Iberion

Todas las modificaciones importantes al juego serán documentadas en este archivo.

**Sistema de versionado híbrido:**
- **V1.001, V1.002, V1.003...** = Features completos o cambios funcionales
- **V1.001a, V1.001b...** = Hotfixes o debugging de la versión base

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

