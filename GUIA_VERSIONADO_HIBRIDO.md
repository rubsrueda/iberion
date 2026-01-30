# Guía de Versionado Híbrido - Iberion

## Sistema de Versionado

Iberion usa un **sistema híbrido** que equilibra trazabilidad con claridad:

### Formato de Versiones

```
V1.XXX     → Features/cambios funcionales completos
V1.XXXa    → Hotfix/debugging de la versión base
V1.XXXb    → Segundo hotfix de la misma versión
```

### ¿Cuándo crear una versión?

#### ✅ NUEVA VERSIÓN (V1.001 → V1.002)
- Nueva funcionalidad completa y probada
- Cambio significativo en mecánicas del juego
- Feature solicitado por el usuario
- Integración de múltiples componentes
- Deploy a producción de algo funcional

**Ejemplos:**
- "Sistema de versionado completo"
- "Nuevo sistema de alianzas"
- "Implementado modo raid"
- "Agregado tutorial interactivo"

#### 🔧 HOTFIX (V1.001 → V1.001a)
- Bug crítico que rompe funcionalidad
- Crash o error bloqueante
- Problema de seguridad
- Ajuste menor post-deploy

**Ejemplos:**
- "Corregido crash en combate"
- "Fix loop infinito de login"
- "Arreglado cálculo de recursos"

#### 🚫 NO VERSIONAR (commit directo)
- WIP (work in progress)
- Refactoring interno
- Cambios en comentarios/docs
- Ajustes de estilo/formato
- Commits intermedios de desarrollo

## Comandos

### Feature completo
```bash
./version "Nueva funcionalidad de batalla"
# V1.001 → V1.002
```

### Hotfix/debugging
```bash
./version --hotfix "Corregido crash en red"
# V1.001 → V1.001a
```

### Segundo hotfix
```bash
./version --hotfix "Ajustado cálculo de morale"
# V1.001a → V1.001b
```

## Flujo de Trabajo

### Desarrollo normal
1. Usuario pide feature: "Quiero X funcionalidad"
2. Desarrollas, haces commits intermedios (sin versionar)
3. Cuando está completo y funciona: `./version "X funcionalidad"`
4. Push y deploy

### Debugging post-deploy
1. Usuario reporta bug
2. Investigas, pruebas (commits sin versionar)
3. Cuando encuentras la solución: `./version --hotfix "Descripción fix"`
4. Push y deploy hotfix

### Iteraciones múltiples
Si necesitas 7 intentos para arreglar algo:
- **Commits 1-6**: Sin versionar (o en rama feature)
- **Commit 7**: Cuando funciona → `./version --hotfix "Descripción"`

## Changelog

El `CHANGELOG.md` muestra:
- **Versiones principales** como secciones
- **Hotfixes** como subsecciones o notas

Ejemplo:
```markdown
## V1.002 - 2026-02-01
Nueva funcionalidad de alianzas

### Hotfixes
- V1.002a: Corregido bug de invitaciones
- V1.002b: Ajustado límite de miembros
```

## Ventajas del Sistema Híbrido

✅ **Versiones limpias** reflejan cambios reales  
✅ **Hotfixes diferenciados** de features  
✅ **Trazabilidad completa** en Git  
✅ **CHANGELOG legible** sin ruido  
✅ **Flexible** para desarrollo iterativo  

---

**Última actualización:** 2026-01-30
