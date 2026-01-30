# 🔐 Configuración de OAuth en Supabase - Solución al Problema de Login

## ❌ El Problema

Cuando intentas hacer login con Google, te redirige a la URL de Supabase en lugar de volver a tu aplicación.

**Síntoma**: Después del login, terminas en `https://xxxxx.supabase.co/` en lugar de tu app.

---

## ✅ Solución en 2 Pasos

### PASO 1: Configurar URLs Autorizadas en Supabase Dashboard

1. **Ve al Dashboard de Supabase**
   - Abre: https://app.supabase.com/
   - Selecciona tu proyecto

2. **Ve a Authentication → URL Configuration**
   - En el menú lateral: `Authentication` → `URL Configuration`

3. **Añade tus URLs en "Redirect URLs"**
   
   Añade TODAS estas URLs (según donde estés trabajando):
   
   ```
   http://localhost:8000/
   http://localhost:8000/iberion/
   http://127.0.0.1:8000/
   http://127.0.0.1:8000/iberion/
   https://rubsrueda.github.io/iberion/
   https://rubsrueda.github.io/
   ```

4. **Configura la "Site URL"**
   
   En "Site URL" pon tu URL principal:
   ```
   https://rubsrueda.github.io/iberion/
   ```
   
   O si estás en local:
   ```
   http://localhost:8000/
   ```

5. **Guarda los cambios** → Click en "Save"

---

### PASO 2: Verificar Configuración de Google OAuth

1. **Ve a Authentication → Providers**
2. Click en **Google**
3. Verifica que esté **Enabled**
4. Copia el **Callback URL** (algo como: `https://xxxxx.supabase.co/auth/v1/callback`)
5. **Ve a Google Cloud Console**:
   - https://console.cloud.google.com/
   - Selecciona tu proyecto
   - Ve a "APIs & Services" → "Credentials"
   - Edita tu OAuth 2.0 Client ID
   - En "Authorized redirect URIs" añade el Callback URL de Supabase

---

## 🔍 Verificación

### Probar el Login

1. **Abre la consola del navegador** (F12)
2. Click en el botón de "Login con Google"
3. **Verifica los logs**:
   ```
   🔐 Iniciando login con Google...
   📍 Redirect URL: http://localhost:8000/iberion/
   ✅ Redirigiendo a Google para autenticación...
   ```

4. **Después del login**, deberías ver:
   ```
   🔑 Token OAuth detectado en URL, procesando callback...
   🔔 Evento Supabase: SIGNED_IN
   👤 Usuario autenticado: tu@email.com
   ```

---

## 🛠️ Cambios en el Código (Ya Implementados)

El código ahora:

1. ✅ **Detecta automáticamente la URL correcta**
   - Funciona en localhost
   - Funciona en GitHub Pages
   - Detecta subdirectorios (como `/iberion/`)

2. ✅ **Maneja el callback de OAuth**
   - Lee el token del hash fragment
   - Limpia la URL después de procesar
   - Logs detallados para depuración

3. ✅ **Evita recargas innecesarias**
   - No sobrescribe datos si ya estás autenticado

---

## 🎯 Configuración por Entorno

### Desarrollo Local (localhost)

**En Supabase Dashboard:**
```
Redirect URLs:
  ✓ http://localhost:8000/
  ✓ http://localhost:8000/iberion/
  ✓ http://127.0.0.1:8000/

Site URL:
  http://localhost:8000/
```

### GitHub Pages (Producción)

**En Supabase Dashboard:**
```
Redirect URLs:
  ✓ https://rubsrueda.github.io/iberion/
  ✓ https://rubsrueda.github.io/

Site URL:
  https://rubsrueda.github.io/iberion/
```

---

## 🔧 Debugging

### Ver qué URL está usando el código

Abre la consola (F12) y ejecuta:
```javascript
console.log('Origin:', window.location.origin);
console.log('Pathname:', window.location.pathname);
console.log('Full URL:', window.location.href);
```

### Ver URL de redirect que se está usando

Cuando hagas click en "Login con Google", busca en consola:
```
📍 Redirect URL: [la URL que está usando]
```

### Verificar que el callback funcionó

Después del login, busca:
```
🔑 Token OAuth detectado en URL
```

Si NO ves este mensaje → el redirect URL está mal configurado.

---

## 🆘 Problemas Comunes

### Problema 1: "URL not whitelisted"
**Solución**: Añade la URL exacta a "Redirect URLs" en Supabase

### Problema 2: Redirige a Supabase después del login
**Solución**: 
1. Verifica que "Site URL" esté configurada
2. Añade tu URL a "Redirect URLs"
3. Limpia caché: `./clear-cache.sh` + `Ctrl+Shift+R`

### Problema 3: "Invalid redirect URL"
**Solución**: Asegúrate de que las URLs terminen con `/`
```
✅ http://localhost:8000/
❌ http://localhost:8000
```

### Problema 4: Funciona en local pero no en GitHub Pages
**Solución**: Añade ambas URLs a Supabase:
- Local: `http://localhost:8000/`
- GitHub: `https://rubsrueda.github.io/iberion/`

---

## 📋 Checklist de Configuración

- [ ] Dashboard de Supabase abierto
- [ ] Authentication → URL Configuration abierto
- [ ] Redirect URLs añadidas (todas las URLs donde pruebas)
- [ ] Site URL configurada
- [ ] Cambios guardados ("Save")
- [ ] Google OAuth Provider habilitado
- [ ] Callback URL de Supabase añadido a Google Cloud Console
- [ ] Caché del navegador limpiado (`Ctrl+Shift+R`)
- [ ] Consola del navegador abierta (F12)
- [ ] Login probado
- [ ] Logs verificados (🔐, 📍, 🔑, 🔔)

---

## 🎯 URLs Exactas para Tu Proyecto

Basado en tu repositorio `rubsrueda/iberion`:

### Para Añadir a Supabase:

**Redirect URLs** (añade todas):
```
http://localhost:8000/
http://localhost:8000/iberion/
http://127.0.0.1:8000/
http://127.0.0.1:8000/iberion/
https://rubsrueda.github.io/iberion/
https://rubsrueda.github.io/
```

**Site URL** (la principal):
```
https://rubsrueda.github.io/iberion/
```

---

## 📞 Verificación Final

Después de configurar, ejecuta:

```bash
# 1. Actualiza versión
./version "Corregido problema de OAuth redirect"

# 2. Limpia caché
./clear-cache.sh

# 3. Abre navegador
# 4. F12 (abrir consola)
# 5. Prueba login con Google
# 6. Verifica los logs en consola
```

---

## 🎉 Si Todo Funciona

Deberías ver esta secuencia:

1. Click en "Login con Google"
   ```
   🔐 Iniciando login con Google...
   📍 Redirect URL: https://rubsrueda.github.io/iberion/
   ✅ Redirigiendo a Google para autenticación...
   ```

2. Después de autorizar en Google
   ```
   🔑 Token OAuth detectado en URL, procesando callback...
   🔔 Evento Supabase: SIGNED_IN
   👤 Usuario autenticado: tu@email.com
   ✅ Perfil recuperado de la nube correctamente.
   ```

3. Te lleva al menú principal del juego ✅

---

**Actualizado**: 30 enero 2026  
**Versión**: V1.001  
**Estado**: Problema de OAuth redirect CORREGIDO ✅
