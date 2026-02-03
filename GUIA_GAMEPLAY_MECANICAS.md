# IBERION: Guía Gameplay y Mecánicas de Juego

**Versión:** 1.0 | **Para:** Game Designers, Community Managers, QA, Jugadores Avanzados

---

## 📑 Índice Rápido

1. [Cómo Ganar](#cómo-ganar)
2. [Recursos y Economía](#recursos-y-economía)
3. [Mecánicas de Combate](#mecánicas-de-combate)
4. [Sistema de Unidades](#sistema-de-unidades)
5. [Civilizaciones](#civilizaciones)
6. [Progression y Leveling](#progression-y-leveling)
7. [Modos de Juego](#modos-de-juego)
8. [Estrategia Avanzada](#estrategia-avanzada)
9. [Balance y Tunning](#balance-y-tunning)

---

## Cómo Ganar

### Condiciones de Victoria

En IBERION hay **3 formas de ganar**:

#### 1. **Aniquilación** (Método clásico)
- Destruir todas las unidades del enemigo
- El enemigo es eliminado
- **Duración:** 15-45 minutos según mapa
- **Dificultad:** ⭐⭐⭐ (Media)

#### 2. **Control de Ciudades** (Método territorial)
- Controlar 6+ ciudades (en mapa 12×15)
- O 50% de ciudades totales
- Requiere 3 turnos consecutivos sin perder ninguna
- **Duración:** 30-90 minutos
- **Dificultad:** ⭐⭐⭐⭐ (Alta - requiere defensa)

#### 3. **Puntos de Victoria** (Método puntajes)
- Alcanzar 100 puntos
- Se ganan controlando Ruinas y estructuras especiales
- O derrotando unidades enemigas
- **Duración:** 20-60 minutos
- **Dificultad:** ⭐⭐ (Baja - agregar puntos constantemente)

### Árbol de Decisión de Victoria

```
¿VICTORIA?
    ↓
┌───────────┬───────────────┬──────────────────┐
│           │               │                  │
v           v               v                  v
¿Enemigo    ¿Control        ¿100 Puntos?      ¿Alianza
sin         de 6+ ciudades  (Puntos Victoria)  Controlada?
unidades?   por 3 turnos?                      (Magna)
│           │               │                  │
YES→        YES→            YES→               YES→
ANIQUILACIÓN TERRITORIAL    PUNTOS            DOMINIO
```

---

## Recursos y Economía

### Los 7 Recursos Clave

```
┌────────────────────────────────────────────────────────────┐
│ RECURSO    │ SÍMBOLO │ USO PRINCIPAL    │ GENERACIÓN/TURNO │
├────────────────────────────────────────────────────────────┤
│ ORO        │ 💰     │ Entrenar unidades │ +50 por ciudad   │
│            │        │ Equipo            │ +50-100 comercio │
│            │        │ Investigación     │                  │
├────────────────────────────────────────────────────────────┤
│ COMIDA     │ 🌾     │ Alimentar unidades│ +30 por ciudad   │
│            │        │ (Upkeep)          │ -1 a -5 por unit │
│            │        │ Morale (si hay)   │                  │
├────────────────────────────────────────────────────────────┤
│ MADERA     │ 🌲     │ Construcción      │ +20 bosques      │
│            │        │ Barcos            │                  │
│            │        │ Equipamiento      │                  │
├────────────────────────────────────────────────────────────┤
│ PIEDRA     │ 🪨     │ Fortifications    │ +20 montañas     │
│            │        │ Muros             │                  │
│            │        │ Templos           │                  │
├────────────────────────────────────────────────────────────┤
│ HIERRO     │ ⛓️     │ Armas mejores     │ +15 minas        │
│            │        │ Armaduras         │                  │
│            │        │ Equipo legendario │                  │
├────────────────────────────────────────────────────────────┤
│ INVESTIGACIÓN │ 💡   │ Árbol tecnológico │ +5 base         │
│            │        │ Mejoras unitarias │ +10 laboratorio  │
│            │        │ Bonificaciones    │                  │
├────────────────────────────────────────────────────────────┤
│ RECLUTAMIENTO │ 🎖️   │Crear Regimientos │ Específico       │
│            │        │ Solo ciertos tipos│ (Varía por tipo) │
└────────────────────────────────────────────────────────────┘
```

### Ciclo Económico (Cada Turno)

```
┌─────────────────────────────────┐
│ INGRESOS                        │
├─────────────────────────────────┤
│ • Ciudades controladas          │
│   ├─ +50 oro por ciudad         │
│   ├─ +30 comida por ciudad      │
│   └─ +5 investigación           │
│                                 │
│ • Rutas comerciales             │
│   └─ +50-150 oro (depende civ)  │
│                                 │
│ • Terreno                       │
│   ├─ +20 madera (bosques)       │
│   ├─ +20 piedra (montañas)      │
│   └─ +15 hierro (minas)         │
│                                 │
│ • Pasivo                        │
│   └─ +5 investigación           │
└─────────────────────────────────┘
            ↓
┌─────────────────────────────────┐
│ GASTOS (UPKEEP)                 │
├─────────────────────────────────┤
│ • Mantenimiento de unidades     │
│   ├─ 20-80 oro por regimiento   │
│   ├─ 1-2 comida por regimiento  │
│   └─ Aumenta con nivel          │
│                                 │
│ • Estructuras                   │
│   └─ -5 a -20 oro / turno       │
└─────────────────────────────────┘
            ↓
┌─────────────────────────────────┐
│ NETO = INGRESOS - GASTOS        │
└─────────────────────────────────┘
```

### Estrategia Económica

**Jugador Adinerado**
- Controlar muchas ciudades temprano
- Generar riqueza pasiva
- Después gastar en unidades elite
- ✅ Mejor a largo plazo
- ❌ Vulnerable en tempranos turnos

**Economía de Guerra**
- Pocos recursos en construcción
- Máximo en entrenar soldados pronto
- Conquistar por la fuerza
- ✅ Ganar temprano (turnos 5-15)
- ❌ Se agota recursos rápido

**Poder Comercial**
- Enfatizar rutas comerciales
- Usar civilización con bonos (ej: Cartago +30%)
- Ganar ingresos exponenciales
- ✅ Escalable infinitamente
- ❌ Requiere tierra conectada

---

## Mecánicas de Combate

### Cálculo de Daño (Fórmula Simplificada)

```
ATAQUE = Attack_Stat + Talento_Bonus + Equipment_Bonus + Random(-20 a +20)

DEFENSA = Defense_Stat + Terreno_Bonus + Morale_Bonus + Equipment_Bonus

RESULTADO:
    if (ATAQUE > DEFENSA) {
        DAÑO = ATAQUE - DEFENSA
        defender.health -= DAÑO
    } else {
        DAÑO = random(0-1)  // Golpe sin impacto
        defender.health -= DAÑO
    }

CRÍTICO:
    roll = random(1-100)
    if (roll < ATTACK_INITIATIVE) {
        DAÑO *= 1.5  // 50% más daño
    }
```

### Ejemplo de Combate Real

```
ATACANTE: Caballería Pesada (Nivel 2, Morale 75)
├─ Ataque Base: 100
├─ Bonus de Talento (Charge): +30
├─ Bonus de Equipo (Lanza): +15
├─ Penalty Moral (-25 morale): -10
└─ ATAQUE FINAL: 135

DEFENSOR: Infantería Pesada (Nivel 1, Morale 50)
├─ Defensa Base: 100
├─ Bonus de Terreno (Montaña): +30
├─ Bonus de Morale (50): +5
├─ Penalty Desorganizado: -10
└─ DEFENSA FINAL: 125

RESOLUCIÓN:
    Ataque (135) vs Defensa (125)
    → Diferencia = 10 puntos
    → Infantería sufre -10 damage
    → Infantería: 200 HP → 190 HP

CRÍTICO:
    Initiative del Caballo = 12
    Roll = 8 → No crítico
    (Si hubiera sido ≤ 12, daño × 1.5 = -15 HP)
```

### Tipos de Combate

#### Combate Cuerpo a Cuerpo
- Rango de ataque: 1 hexágono
- Bonus terreno: Montañas +30 defensa
- Unidades: Infantería, Caballería, Generales
- Ventaja: Sin penalización a distancia

#### Combate a Distancia
- Rango de ataque: 2-4 hexágonos
- Penalty: -10 por cada hexágono > 1
- Unidades: Arqueros, Arcabuceros, Artillería
- Ventaja: No te contraataca

#### Combate Naval
- Solo en agua (mapas con agua)
- Unidades: Pataches, Barcos de Guerra
- Mecánicas especiales: "Barlovento" (ventaja posicional)

---

## Sistema de Unidades

### Tabla de Unidades

```
┌──────────────────┬────────┬────────┬──────┬──────┬────────────────┐
│ UNIDAD           │ ATAQUE │ DEFENSA│ SALUD│ MOV  │ ESPECIALIDAD   │
├──────────────────┼────────┼────────┼──────┼──────┼────────────────┤
│ Infantería Ligera│  40    │  60    │ 200  │  2   │ Versátil       │
│ Infantería Pesad │  60    │ 100    │ 200  │  1   │ Defensa        │
│ Caballería Lig.  │  80    │  60    │ 200  │  4   │ Movilidad      │
│ Caballería Pesad │ 100    │ 100    │ 200  │  3   │ Golpe frontal  │
│ Arqueros         │  70    │  20    │ 150  │  2   │ Rango          │
│ Arcabuceros      │ 100    │  40    │ 200  │  1   │ Daño alto      │
│ Artillería       │ 250    │  20    │ 150  │  1   │ Asedio/Rango 3 │
│ Cuartel General  │  10    │  40    │ 200  │  3   │ Morale +15     │
│ Ingenieros       │  10    │  80    │ 200  │  2   │ Construcción   │
│ Hospital Campo   │   0    │  40    │ 200  │  2   │ Heal +60/turno │
│ Barcos de Guerra │ 180    │ 120    │ 200  │  4   │ Naval          │
└──────────────────┴────────┴────────┴──────┴──────┴────────────────┘

CURVA DE COSTE:
├─ Unidades baratas (200-400 oro): Infantería Ligera, Arqueros
├─ Unidades medias (500-700 oro): Caballería Pesada, Arcabuceros
├─ Unidades caras (800-1000 oro): Artillería, Generales
└─ Unidades militares (2000+ oro): Barcos, Fortalezas
```

### Progresión de Unidad

```
                            NIVEL 5
                            ↑
                       ×1.5 STATS
                            ↑
                    [250 XP POR NIVEL]
                            ↑
                         NIVEL 1
                         [0 XP]
                            ↓
                    [+1 XP POR TURNO]
                    [+10 XP POR KILL]
                    [+5 XP POR DEFENDERSE]
                            ↓
                         MÁXIMO
                         [1500 XP]
                            ↓
                       NIVEL 5 MAX
                       (+75% STATS)
```

### Moral en Detalle

```
FACTOR                          │  EFECTO
────────────────────────────────┼──────────────────
Suministrada (supplies)         │ +20
Aliados cercanos (3 hex)        │ +5 cada uno
Ciudad amiga (2 hex)            │ +15
Rodeada (6 hex enemigos)        │ -30
Hospital cercano                │ +10
Derrota reciente (combat loss)  │ -10
Nivel de unidad (cada nivel)    │ +5
────────────────────────────────┼──────────────────
RANGO: 0-100
  0-20: Destruida (se desintegra)
  20-50: Baja (movimiento 50%, ataque -30%)
  50-80: Normal
  80-100: Alta (ataque +20%, crítico +5%)
```

### Habilidades Especiales (Talents)

```
TALENT NAME       │ EFECTO MECÁNICO
──────────────────┼──────────────────────────────────
"Charge"          │ +50 ataque si hay movimiento > 0
                  │ -10 defensa (comete)
──────────────────┼──────────────────────────────────
"Fortified"       │ +30 defensa en colina/montaña
                  │ -20% movimiento
──────────────────┼──────────────────────────────────
"Archer's Eye"    │ +1 rango de visión y ataque
                  │ +20 ataque a distancia
──────────────────┼──────────────────────────────────
"Shield Wall"     │ Dividir daño entre 2 unidades
                  │ Movimiento 0
──────────────────┼──────────────────────────────────
"Evasion"         │ 20% de esquivar ataque
                  │ -20 defensa si lo permite
──────────────────┼──────────────────────────────────
"Morale Boost"    │ +15 morale para aliados (2 hex)
──────────────────┼──────────────────────────────────
"Assassination"   │ +80% crítico
                  │ Solo si enemigo > 2 hex
```

---

## Civilizaciones

### Tabla Comparativa

```
┌──────────┬────────────────────────────────┬──────────────────────────┐
│ CIV      │ BONIFICACIÓN PRINCIPAL         │ DEBILIDAD                │
├──────────┼────────────────────────────────┼──────────────────────────┤
│ IBERIA   │ +20% Defensa en Montaña        │ -30% velocidad en Llanura│
│          │ +50% Movimiento en Montaña     │                          │
│          │ +10% Investigación             │                          │
├──────────┼────────────────────────────────┼──────────────────────────┤
│ ROMA     │ -20% Costo Construcción        │ +10% Upkeep (más caro)   │
│          │ +30% Defensa en Fortifications │                          │
│          │ +15% Generación de Oro         │                          │
├──────────┼────────────────────────────────┼──────────────────────────┤
│ CARTAGO  │ +30% Ingresos Comercio         │ -20% Defensa Tierra      │
│          │ -15% Costo Naval               │                          │
│          │ +50% Visión Naval              │                          │
├──────────┼────────────────────────────────┼──────────────────────────┤
│ GRECIA   │ +20% XP Generado               │ -20% Oro generado        │
│          │ +2 Talento slots               │ +30% Upkeep              │
│          │ +30% Crítico                   │                          │
├──────────┼────────────────────────────────┼──────────────────────────┤
│ PERSIA   │ +40% Morale                    │ -20% Ataque              │
│          │ +2 Movimiento                  │ Más lento en combate     │
│          │ Habilidad: "Retiro Estratégico"│                          │
└──────────┴────────────────────────────────┴──────────────────────────┘
```

### Matchups de Civilizaciones

```
        IBERIA  ROMA  CARTAGO  GRECIA  PERSIA
IBERIA    -     50%    40%     60%     70%
ROMA      50%    -     45%     55%     65%
CARTAGO   60%   55%     -      50%     60%
GRECIA    40%   45%    50%      -      55%
PERSIA    30%   35%    40%     45%      -

NOTAS:
- IBERIA domina en terreno montañoso
- ROMA es versátil y equilibrada
- CARTAGO gana con agua/comercio
- GRECIA gana turnos largos (leveling)
- PERSIA es defensiva (mantiene territorio)
```

---

## Progression y Leveling

### Battle Pass (Sistema de Temporadas)

```
TEMPORADA 1 (28 días)
├─ 50 niveles (Free)
├─ 50 niveles (Premium)
└─ Cada nivel:
   ├─ 1000 XP de batalla
   ├─ Reward: Skin/Equipo/Gemas
   └─ Tiempo: ~1.5 horas

VELOCIDAD XP:
├─ Victoria: +500 XP
├─ Derrota: +200 XP
├─ Cada turno jugado: +20 XP
└─ Misiones diarias: +300 XP
```

### Equipo y Forja

```
RAREZA              │ BONUS        │ COSTO
────────────────────┼──────────────┼──────────────
Común (Gris)        │ +5 ataque    │ 100 oro
Poco Común (Verde)  │ +15 ataque   │ 300 oro
Raro (Azul)         │ +25 defensa  │ 800 oro
Legendario (Dorado) │ +40 crítico  │ 2000 oro + 10 Gemas
Mítico (Púrpura)    │ Habilidad    │ 5000 oro + 50 Gemas
```

### Árbol de Tecnologías

```
NIVEL 1 (Básico)
├─ ORGANIZATION (Base)
├─ IRON_WORKING (+10% ataque)
└─ LEATHER_ARMOR (+5% defensa)

NIVEL 2 (Avanzado)
├─ STEEL_WORKS (requisito: IRON_WORKING)
│  └─ +20% ataque total
├─ ADVANCED_TACTICS
│  └─ +1 movimiento todas unidades
└─ TRADE_ROUTES (+20% ingresos)

NIVEL 3 (Épico)
├─ LEGENDARY_FORGE (requisito: STEEL_WORKS)
│  └─ Puede crear equipo legendario
├─ MILITARY_DOCTRINE (requisito: ADVANCED_TACTICS)
│  └─ +15% morale, +1 talento slot
└─ EMPIRE_EXPANSION (requisito: TRADE_ROUTES)
    └─ Controla 10 ciudades sin penalización
```

---

## Modos de Juego

### 1. Escaramuza (Skirmish)

```
CONFIGURACIÓN:
├─ Tamaño: Pequeño (12×15) o Medio (18×25)
├─ Jugadores: 2-4
├─ Duración: 10-30 minutos
├─ Dificultad IA: Fácil / Normal / Difícil
└─ Recursos iniciales: Estándar (800 oro, etc.)

FLUJO:
1. Seleccionar civilización
2. Desplegar unidades (5-10)
3. Jugar hasta victoria
4. Ver Crónica
5. Replay disponible
```

### 2. Campaña (Campaign)

```
ESTRUCTURA:
├─ 8 territorios capturables
├─ Progresión lineal: Territorio 1 → 2 → 3 → ... → 8
├─ Cada territorio es escaramuza diferente
├─ Unidades sobreviven si ganan (progresión de XP)
└─ Final: Enfrentarse a Boss (General Enemigo)

RECOMPENSAS:
├─ Cada territorio: +500 oro, +100 XP
├─ Cada Victoria: +Equipo aleatorio
└─ Campaña completa: +5000 oro + Skin exclusiva
```

### 3. Tronos de Iberia (Magna)

```
MAPA: Península Ibérica (75×120)
JUGADORES: 8 (Alianzas de 2 o 4)
DURACIÓN: 30-120 minutos

DINÁMICAS:
├─ Alianzas: Teams de 2-4 jugadores
├─ Territorio persistente entre batallas
├─ Sistema de Raids: Caravanas de tesoro
├─ Diplomacia: Declarar guerra / Paz
└─ Fin: Conquista del 70% del territorio

MODOS:
├─ Conquista Rápida (30 min)
├─ Épica (120 min, 8 jugadores)
└─ Torneo (bracketing automático)
```

### 4. Multijugador Local

```
SETUP:
├─ 1 pantalla, 2 teclados/controles
├─ Jugador 1 configura partida
├─ Jugador 2 se une
└─ Turno alterno (A juega, después B)

CARACTERÍSTICAS:
✓ Guardado local automático
✓ Pausa entre turnos
✓ Chat local
✗ No sincroniza en nube
```

### 5. Multijugador Online

```
CONEXIÓN:
├─ Jugador 1 (Host): Crea sala → obtiene código (ej: "HGEF")
├─ Jugador 2 (Guest): Introduce código
├─ P2P vía PeerJS (Conexión directa)
└─ Supabase como fallback si se cae P2P

SINCRONIZACIÓN:
├─ Cada acción se envía al otro jugador
├─ Verificación de integridad cada turno
├─ Autosave cada 5 turnos
└─ Replay guardado automáticamente

LATENCIA TÍPICA:
├─ Excelente: < 50ms (acción inmediata)
├─ Buena: 50-200ms (pequeño delay visible)
├─ Aceptable: 200-500ms (notorio pero jugable)
└─ Pobre: > 500ms (requiere optimización)
```

---

## Estrategia Avanzada

### Opening Estratégicos (Primeros 5 Turnos)

#### "Blitzkrieg" (Ataque Rápido)
```
Turno 1: Desplegar Caballería x3
Turno 2: Mover hacia enemigo
Turno 3: Ataque frontal (buscar ventaja)
Turno 4: Consolidar posición, capturar ciudad
Turno 5: Gastar recursos en más unidades

✓ Ganas si: Enemigo débil, mapa pequeño
✗ Fallas si: Enemigo tiene defensa, tienes pocos ingresos
```

#### "Economic Build" (Construcción Económica)
```
Turno 1: 1 unidad defensiva
Turno 2-3: Dejar que la economía crezca
Turno 4: Con +1000 oro, crear 3-4 unidades elite
Turno 5: Ataque masivo con superioridad

✓ Ganas si: Juego largo (30+ turnos)
✗ Fallas si: Enemigo ataca fuerte antes turno 5
```

#### "Mercenary" (Mercenario / Comercio)
```
Turno 1: Posicionar en territorio comercial
Turno 2-5: Enfatizar rutas comerciales (Cartago)
Turno 6+: Con ingresos pasivos masivos, comprar ejército

✓ Ganas si: Tienes ruta comercial libre
✗ Fallas si: Bloqueado, necesitas tropas rápido
```

### Tácticas de Combate

#### "Hammer & Anvil" (Yunque y Martillo)
```
┌─────────────────────┐
│    ENEMIGO          │
├─────────────────────┤
│ Flanco débil        │ ← MARTILLO (Caballería rápida)
│ Centro fuerte       │ ← YUNQUE (Infantería pesada)
│ Flanco débil        │ ← MARTILLO (Arqueros)
└─────────────────────┘

1. Infantería presiona centro
2. Caballería rodea flancos
3. Enemigo se ve forzado a retirarse
→ Victoria con baja pérdida
```

#### "Wall Formation" (Formación de Muro)
```
┌──────────────────────────┐
│ ⚔️ ⚔️ ⚔️ (Primera línea)   │
│ 🏹 🏹 (Segunda línea)     │
│ 💪 (Soporte)             │
└──────────────────────────┘

- Infantería Pesada adelante
- Arqueros atrás (sin bloqueo)
- Hospital detrás (regeneración)

→ Muy defensiva, baja movilidad
```

#### "Surgical Strike" (Ataque Quirúrgico)
```
Identificar: Unidad enemiga CLAVE (General, Artillería)
Rodearla: Con 2-3 unidades
Destruirla: Antes que refuerzos lleguen
Retirarse: Inmediatamente

→ Rápido, riesgoso, requiere precisión
```

### Gestión de Recursos

**Pregunta crítica cada turno:** ¿Cuánto oro tengo?

```
0-200 oro:        ❌ En riesgo → Economía = prioridad
200-500 oro:      ⚠️ Bajo → Gastar solo en mantenimiento
500-1000 oro:     ✓ Normal → Puedo expandir ligeramente
1000-2000 oro:    💰 Bueno → Crear nuevas unidades
2000+ oro:        🤑 Excelente → Ofensiva masiva posible
```

**Árbol de Decisiones:**

```
¿Tengo suficiente oro para mi próxima acción?
    ├─ SÍ → ¿Es momento adecuado tácticamente?
    │   ├─ SÍ → Ejecutar acción
    │   └─ NO → Esperar 1-2 turnos
    └─ NO → ¿Cuánto me falta?
        ├─ < 200 (un turno) → Esperar sin miedo
        ├─ 200-500 (2-3 turnos) → Defensivo, ahorrar
        └─ > 500 (5+ turnos) → Cambiar estrategia (vender equipo, etc.)
```

---

## Balance y Tunning

### Métricas de Balance Esperadas

```
MÉTRICA                     │ META
────────────────────────────┼──────────────────────
Winrate Civs (cada una)     │ 48-52%
Tiempo promedio partida     │ 20-30 min
Civs más pickeadas          │ < 60% del total
Civs menos pickeadas        │ > 20% del total
Unidades obsoletas          │ 0 (todas usables)
Winrate por Civ + Modo      │ 40-60%
────────────────────────────┼──────────────────────

PROBLEMA: Si "Cartago" tiene 65% winrate
CAUSA: +30% comercio es demasiado
SOLUCIÓN: Reducir a +20% o aumentar debilidad
```

### Cambios de Patch Común

#### Ejemplo 1: "Infantería Pesada es OP"
```
ANTES:
  Attack: 60, Defense: 100, Health: 200
  Winrate: 58%

DESPUÉS:
  Attack: 50, Defense: 100, Health: 180
  Health reduction: -10% (menos bulk)
  
RESULTADO: Winrate → 52% ✓
```

#### Ejemplo 2: "Cartago domina en agua"
```
ANTES:
  +30% Ingresos Comercio (sin límite)
  -15% Naval (muy barato)

DESPUÉS:
  +20% Ingresos Comercio (reducido)
  -10% Naval (menos descuento)
  +Limitación: Solo 3 rutas simultáneas

RESULTADO: Winrate general → 50% ✓
```

### Rotaciones de Contenido

```
TEMPORADA 1 (Jan-Feb):
├─ Enfoque: Civs 1-4 balanceadas
├─ Escenarios: Básicos
└─ Meta: Económico vs Militar

TEMPORADA 2 (Mar-Apr):
├─ Nueva Civ: Cartago (comercio)
├─ Nuevo Modo: Tronos de Iberia
├─ Cambio Meta: Rutas comerciales + Alianzas
└─ Nerf: Infantería Pesada -5 ataque

TEMPORADA 3 (May-Jun):
├─ Nueva Civ: Grecia (leveling)
├─ Nuevo Escenario: Montañas vs Llanura
├─ Buff: Civs débiles (Roma +10% oro)
└─ Cambio Meta: Multiplicidad (muchas pequeñas unidades)
```

---

## Tablas de Referencia Rápida

### Costos de Unidades

```
UNIDAD              │ ORO │ UPKEEP │ COMIDA │ RECLUTAMIENTO
────────────────────┼─────┼────────┼────────┼──────────────
Infantería Ligera   │ 200 │  20    │   1    │     200
Arqueros            │ 360 │  20    │   1    │     200
Caballería Ligera   │ 400 │  40    │   2    │     200
Caballería Pesada   │ 600 │  60    │   2    │     200
Arcabuceros         │ 480 │  40    │   1    │     200
Artillería          │1000 │  80    │   2    │     200
Cuartel General     │ 800 │ 100    │   2    │      50
Hospital de Campaña │ 600 │  60    │   1    │      50
Barco de Guerra     │2000 │ 100    │   1    │     100
```

### Terrenos y Bonificaciones

```
TERRENO     │ DEFENSA │ MOV      │ RECURSO  │ PASABLE
────────────┼─────────┼──────────┼──────────┼─────────
Llanura     │  +0     │ 1.0x     │ Comida   │ ✓
Bosque      │  +20    │ 0.5x     │ Madera   │ ✓
Montaña     │  +30    │ 0.5x     │ Piedra   │ ✓
Agua        │  +0     │ 2.0x     │ Pesca    │ ✓ Naval
Colina      │  +10    │ 0.75x    │ Piedra   │ ✓
Desierto    │  +0     │ 1.5x     │ Nada     │ ✓
Volcán      │  +40    │ 0.2x     │ Hierro   │ ✗ (muy lento)
Pantano     │  +10    │ 0.3x     │ Madera   │ ✗ (atascado)
```

---

## Glossario

| Término | Definición |
|---------|-----------|
| **Blitz** | Ataque rápido y sorpresivo |
| **Crítico** | Golpe que hace x1.5 daño |
| **Morale** | Estado psicológico (0-100) |
| **Supply** | Suministro (conectado a ciudad amiga) |
| **Upkeep** | Costo de mantenimiento por turno |
| **Fortiication** | Estructura defensiva |
| **Ruina** | Estructura neutral, da puntos de victoria |
| **Talent** | Habilidad especial de unidad |
| **Hex** | Hexágono en el tablero |
| **Métaagame** | Cómo se juega a nivel estratégico |
| **Nerf** | Reducir poder de algo |
| **Buff** | Aumentar poder de algo |
| **Winrate** | % de victorias (meta) |
| **Op** | "Overpowered" - muy fuerte |
| **Patch** | Actualización de balance |

---

**Este documento se actualiza semanalmente.**  
**Última actualización:** 2 de febrero de 2026
