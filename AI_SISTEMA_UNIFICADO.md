--

# 🤖 Sistema de IA (Unificado) — Panorama integral con valores actuales

## 1) Fórmula de decisión (IA)
La IA prioriza acciones con esta fórmula:

```
PESO_FINAL = PESO_BASE(acción)
           × MULTIPLICADOR_CIV(civilización, acción)
           × MULTIPLICADOR_MODO(modo, acción)
           × MULTIPLICADOR_ORO(tramo)
```

### 1.1 Estructura de decisión (construcción FLUIDA de regimientos)

La IA NO construye "divisiones". Construye **regimientos individuales** que se agrupan dinámicamente según necesidad del momento.

**Pool de regimientos disponibles:**
```javascript
let regimientos_disponibles = {
  infanteria_pesada: 5,        // Acumulados en stock
  caballeria_pesada: 2,
  infanteria_ligera: 8,
  caballeria_ligera: 3,
  arqueros: 4,
  arqueros_caballo: 1,
  artilleria: 1,
  exploradores: 2,
  ingenieros: 1,
  pataches: 0,
  barcos_guerra: 0
};

// Evaluación de necesidad ACTUAL
let necesidad_actual = evaluar_contexto_actual();

// Agrupar regimientos disponibles en formación táctica TEMPORAL
let formacion_actual = agrupar_para_necesidad(regimientos_disponibles, necesidad_actual);

// Si necesidad cambia → reagrupar mismos regimientos
// Si necesidad requiere regimientos que NO tengo → construir
```

**Ciclo de decisión:**

```javascript
function decidir_construccion_regimiento() {
  // PASO 1: Analizar necesidades ACTUALES
  let contexto = {
    enemigo_en_tierra: detectar_enemigo_en_tierra(),
    enemigo_tiene_flota: detectar_flota_enemiga().length > 0,
    tengo_oportunidad_raid: detectar_objetivos_raid().length > 0,
    enemigo_en_fortaleza: detectar_fortaleza_enemiga(),
    territorio_desconocido: detectar_zona_no_explorada().length > 0,
    necesito_defensa: evaluar_defensa_base(),
    linea_combate_debil: evaluar_linea_combate()
  };
  
  // PASO 2: Calcular DEFICIT de regimientos para necesidades
  let deficit = {};
  
  if (contexto.enemigo_en_tierra) {
    // Formación de línea necesita 3 infantería pesada + 2 caballería + 2 arqueros
    deficit.infanteria_pesada = Math.max(0, 3 - regimientos.infanteria_pesada.length);
    deficit.caballeria_pesada = Math.max(0, 2 - regimientos.caballeria_pesada.length);
    deficit.arqueros = Math.max(0, 2 - regimientos.arqueros.length);
  }
  
  if (contexto.tengo_oportunidad_raid) {
    // Raid necesita 2-3 caballería ligera + 1 explorador
    deficit.caballeria_ligera = Math.max(0, 3 - regimientos.caballeria_ligera.length);
    deficit.exploradores = Math.max(0, 1 - regimientos.exploradores.length);
  }
  
  if (contexto.enemigo_en_fortaleza) {
    // Asedio necesita 2 artillería + 3 infantería pesada
    deficit.artilleria = Math.max(0, 2 - regimientos.artilleria.length);
    deficit.infanteria_pesada = Math.max(0, 3 - regimientos.infanteria_pesada.length);
  }
  
  if (contexto.enemigo_tiene_flota && tengo_puerto) {
    // Naval necesita 2-3 pataches + 1 barco guerra
    deficit.pataches = Math.max(0, 3 - regimientos.pataches.length);
    deficit.barcos_guerra = Math.max(0, 1 - regimientos.barcos_guerra.length);
  }
  
  if (contexto.territorio_desconocido) {
    // Exploración necesita 1-2 caballería ligera + 1-2 exploradores
    deficit.caballeria_ligera = Math.max(0, 2 - regimientos.caballeria_ligera.length);
    deficit.exploradores = Math.max(0, 1 - regimientos.exploradores.length);
  }
  
  // PASO 3: Priorizar déficit por urgencia
  let prioridades = [
    { regimiento: 'infanteria_pesada', deficit: deficit.infanteria_pesada, urgencia: 2.0 },
    { regimiento: 'artilleria', deficit: deficit.artilleria, urgencia: 2.0 },
    { regimiento: 'caballeria_ligera', deficit: deficit.caballeria_ligera, urgencia: 1.8 },
    { regimiento: 'exploradores', deficit: deficit.exploradores, urgencia: 1.4 },
    { regimiento: 'pataches', deficit: deficit.pataches, urgencia: 1.6 }
  ];
  
  // Construir primer regimiento con déficit
  let siguiente = prioridades.find(p => p.deficit > 0);
  
  if (siguiente && oro >= costo[siguiente.regimiento]) {
    return {
      accion: 'construir',
      regimiento: siguiente.regimiento,
      razon: 'deficit_' + siguiente.regimiento
    };
  }
  
  // Si no hay deficit urgente, construir para flexibilidad
  return decidir_construccion_para_flexibilidad();
}
```

**Evaluación de flexibilidad (si no hay déficit urgente):**

```javascript
function decidir_construccion_para_flexibilidad() {
  // Mantener stock balanceado para poder responder rápido
  
  // ¿Tengo pocos exploradores? Construir (baratos, flexibles)
  if (regimientos.exploradores.length < 2) {
    return { regimiento: 'exploradores', razon: 'flexibilidad_exploración' };
  }
  
  // ¿Tengo pocos regimientos ligeros? Construir (baratos, rápidos)
  if (regimientos.caballeria_ligera.length < 3 && oro > 1200) {
    return { regimiento: 'caballeria_ligera', razon: 'flexibilidad_raid' };
  }
  
  // ¿Tengo pocos regimientos pesados? Construir (defensa sólida)
  if (regimientos.infanteria_pesada.length < 4 && oro > 1000) {
    return { regimiento: 'infanteria_pesada', razon: 'flexibilidad_defensa' };
  }
  
  // Default: construir lo más barato disponible
  return { regimiento: 'exploradores', razon: 'default_flexibilidad' };
}
```

### 1.2 Agrupación dinámica de regimientos en formaciones

**Formación de línea combate (tierra vs tierra):**
```
Tomar de stock: 3 Infantería Pesada + 2 Caballería Pesada + 2 Arqueros + 1 Caballería Ligera
Resultado: poder ~1800, defensivo, formación sólida
Si cambio necesidad → disolver y reagrupar mismos regimientos
```

**Formación de asedio (vs fortaleza):**
```
Tomar de stock: 2 Artillería + 1 Ingeniero + 3 Infantería Pesada
Resultado: poder ~1100, especializado en romper
No es fuerte en campo abierto, PERO es letal en fortaleza
Si enemigo se retira → reagrupar en línea combate
```

**Formación de raid económico (infiltración):**
```
Tomar de stock: 2-3 Caballería Ligera + 1 Explorador
Resultado: poder ~400, velocidad máxima, infiltración
Objetivo: NO ganar combate directo, robar recursos/destruir infraestructura
Si necesito combate → llamar refuerzos de línea de combate
```

**Formación de exploración (fase temprana):**
```
Tomar de stock: 1-2 Caballería Ligera + 1-2 Exploradores
Resultado: máxima visión, movimiento rápido
Después disolver y reintegrar a divisiones reales
```

**Formación naval (si existe teatro naval):**
```
Tomar de stock: 2-3 Pataches + 1 Barco de Guerra
SOLO si: enemigo tiene flota O tengo 2+ puertos
Si enemigo no tiene flota, no gasto recursos en esto
```

### 1.3 Sensores mínimos (frente y amenazas)

La IA **no puede** decidir si no define **dónde está el frente** y **qué objetivos están amenazados**.
Estos sensores deben existir como funciones explícitas:

```javascript
/**
 * Objetivos propios prioritarios (frente basado en objetivos)
 */
function obtener_objetivos_propios(myPlayer) {
  const ciudades = gameState.cities.filter(c => c.owner === myPlayer);
  const recursos = board.flat().filter(h => h.owner === myPlayer && h.resourceNode);
  const infra = board.flat().filter(h => h.owner === myPlayer && h.structure);
  return [...ciudades, ...recursos, ...infra];
}

/**
 * Enemigos cerca de objetivos propios (no cerca de la capital)
 */
function detectar_enemigos_cerca_de_objetivos(myPlayer, objetivos, threatRange = 3) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  return units.filter(u =>
    u.player === enemyPlayer &&
    u.currentHealth > 0 &&
    objetivos.some(o => hexDistance(u.r, u.c, o.r, o.c) <= threatRange)
  );
}

/**
 * Frente real = contacto entre unidades (no una dirección abstracta)
 */
function detectar_frente_de_batalla(myPlayer, contactRange = 2) {
  const enemyPlayer = myPlayer === 1 ? 2 : 1;
  const misUnidades = units.filter(u => u.player === myPlayer && u.currentHealth > 0);
  const unidadesEnemigas = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);

  let frente = [];
  for (let mi of misUnidades) {
    for (let en of unidadesEnemigas) {
      if (hexDistance(mi.r, mi.c, en.r, en.c) <= contactRange) {
        frente.push({ r: mi.r, c: mi.c, enemigo: { r: en.r, c: en.c } });
      }
    }
  }
  return frente;
}
```

### 1.4 Terreno y Caravanas: Eje Económico

- El terreno determina quién obtiene los recursos básicos (comida, madera, piedra, hierro). Controlar hexágonos clave, ciudades y rutas de acceso es esencial para la economía a largo plazo.
- Las caravanas son el motor del comercio y la obtención de Oro. La IA debe priorizar la protección, movimiento y comercio de caravanas, así como la interrupción de las enemigas.
- Ninguna de estas variables es antagónica a la táctica militar: dominar recursos y comercio es lo que determina la victoria a largo plazo, mientras que el frente y la táctica determinan el éxito inmediato.
- La IA debe equilibrar ambos ejes: defender y expandir el terreno para recursos, y asegurar rutas/caravanas para el Oro, sin descuidar el frente militar.
- El jugador que entiende y domina el recurso (terreno + caravanas) probablemente será el vencedor.

### 1.5 Geografía y logística (dinámicas según enemigo + bottlenecks)

**Principio:** Las zonas NO son "norte/sur/este/oeste" fijas. Son **donde está el enemigo** (frente activo) + **dónde puedo ser vulnerado** (puntos de invasión).

**Definición de frente dinámico:**

```javascript
function identificar_frente_actual() {
  // Frente = donde está el enemigo MÁS CERCANO a mi territorio
  
  let unidades_enemigas = units.filter(u => u.owner !== MI_PLAYER);
  
  if (unidades_enemigas.length === 0) {
    return { existe: false, razon: 'no_hay_enemigos' };
  }
  
  // Encontrar punto de contacto más cercano
  let frente_primario = unidades_enemigas.reduce((closest, unit) => {
    let distancia = hexDistance(unit, mi_capital);
    return distancia < hexDistance(closest, mi_capital) ? unit : closest;
  });
  
  let distancia_frente = hexDistance(frente_primario, mi_capital);
  let direccion_frente = calcular_direccion(mi_capital, frente_primario);  // norte/sur/este/oeste
  
  return {
    existe: true,
    posicion: frente_primario,
    distancia: distancia_frente,
    direccion: direccion_frente,
    urgencia: distancia_frente <= 5 ? 'CRÍTICA' : distancia_frente <= 10 ? 'ALTA' : 'NORMAL'
  };
}
```

**Identificación de bottlenecks geográficos (CRÍTICOS vs IRRELEVANTES):**

```javascript
function identificar_bottlenecks() {
  // Bottleneck = punto singular por donde DEBE pasar enemigo
  // NO bottleneck = área abierta por donde puede pasar de 100 maneras
  
  let bottlenecks = [];
  
  // Analizar cada frontera de contacto enemigo-yo
  let zonas_contacto = detectar_hexes_frontera_enemiga();
  
  for (let hex of zonas_contacto) {
    let vecinos = getHexNeighbors(hex.r, hex.c);
    
    // ¿Cuántas alternativas tiene enemigo para pasar?
    let pasos_posibles = vecinos.filter(v => {
      let puede_pasar_por_v = !esta_defendido(v) || 
                              es_terreno_negociable(v);  // no es agua/montaña impasable
      return puede_pasar_por_v;
    }).length;
    
    if (pasos_posibles === 1) {
      // BOTTLENECK CRÍTICO: solo 1 opción
      bottlenecks.push({
        ubicacion: hex,
        criticidad: 'CRÍTICA',
        alternativas: 1,
        tipo_terreno: hex.terrain,
        razon: 'paso_unico'
      });
    } else if (pasos_posibles <= 3 && hex.terrain === 'forest') {
      // BOTTLENECK MODERADO: pocos pasos, terreno restrictivo
      bottlenecks.push({
        ubicacion: hex,
        criticidad: 'MEDIA',
        alternativas: pasos_posibles,
        tipo_terreno: hex.terrain,
        razon: 'terreno_restrictivo'
      });
    } else if (pasos_posibles >= 5 && hex.terrain === 'plains') {
      // NO ES BOTTLENECK: llanura abierta, muchas opciones
      bottlenecks.push({
        ubicacion: hex,
        criticidad: 'BAJA',
        alternativas: pasos_posibles,
        tipo_terreno: hex.terrain,
        razon: 'llanura_abierta'
      });
    }
  }
  
  return bottlenecks.sort((a, b) => {
    let criticidad_valor = { 'CRÍTICA': 3, 'MEDIA': 2, 'BAJA': 1 };
    return criticidad_valor[b.criticidad] - criticidad_valor[a.criticidad];
  });
}
```

**Estrategia defensiva según bottleneck:**

```javascript
function estrategia_defensa_por_bottleneck(bottleneck) {
  
  if (bottleneck.criticidad === 'CRÍTICA') {
    // Paso único = DEFENSA FUERTE
    // Un regimiento en el paso detiene a múltiples
    return {
      estrategia: 'defensa_concentrada',
      regimientos_necesarios: 1,  // Con terreno defensivo basta
      bonus_defensa: bottleneck.tipo_terreno === 'forest' ? 1.25 : 1.0,
      razon: 'paso_unico_impide_desvio'
    };
  }
  
  if (bottleneck.criticidad === 'MEDIA') {
    // Pocos pasos = DEFENSA MODERADA
    // Necesito cubrir alternativas
    return {
      estrategia: 'defensa_distribuida',
      regimientos_necesarios: Math.ceil(bottleneck.alternativas / 2),
      ubicaciones: distribuir_defensores_en_pasos(bottleneck),
      razon: 'terreno_restrictivo_requiere_multiples_puntos'
    };
  }
  
  if (bottleneck.criticidad === 'BAJA') {
    // Llanura abierta = NO defiendo el paso
    // Defiendo DETRÁS del paso
    return {
      estrategia: 'defensa_profunda',
      regimientos_en_paso: 0,  // NO pongo nada en llanura
      regimientos_detras: calcular_defensa_linea_detras(),
      razon: 'llanura_abierta_enemigo_puede_flanquear'
    };
  }
}
```

**Análisis de zonas DINÁMICA (basado en enemigo actual):**

```javascript
function analizar_zonas_dinamicas() {
  let frente = identificar_frente_actual();
  let bottlenecks = identificar_bottlenecks();
  
  if (!frente.existe) {
    // No hay enemigo → proteger expansión, no frente
    return {
      modo: 'expansion',
      prioridad_zonas: 'territorio_desconocido',
      regimientos: 'móviles_multiples'
    };
  }
  
  // Hay enemigo → estrategia defensiva específica
  let zonas = {};
  
  // ZONA 1: Frente primario (donde está enemigo)
  zonas.frente = {
    ubicacion: frente.posicion,
    distancia: frente.distancia,
    urgencia: frente.urgencia,
    bottleneck: bottlenecks.find(b => b.criticidad === 'CRÍTICA'),
    defensa_necesaria: frente.urgencia === 'CRÍTICA' ? 'MÁXIMA' : 'NORMAL',
    razon: 'donde_esta_el_enemigo'
  };
  
  // ZONA 2: Retaguardia (si frente está lejos, proteger capital)
  zonas.retaguardia = {
    ubicacion: mi_capital,
    distancia: 0,
    urgencia: frente.distancia <= 5 ? 'CRÍTICA' : 'BAJA',
    razon: 'proteger_capital_si_enemigo_cerca'
  };
  
  // ZONA 3: Puntos de invasión secundarios
  let invasiones_alternas = detectar_caminos_alternativos_enemigo();
  zonas.invasiones_alternas = invasiones_alternas.map(inv => ({
    ubicacion: inv,
    distancia: hexDistance(inv, mi_capital),
    urgencia: frente.distancia <= 3 ? 'ALTA' : 'MEDIA',
    razon: 'ruta_alterna_si_frente_rompe'
  }));
  
  return zonas;
}
```

**Decisión de construcción/posicionamiento basada en geografía:**

```javascript
function decidir_defensa_geografica() {
  let zonas = analizar_zonas_dinamicas();
  let bottlenecks = identificar_bottlenecks();
  
  let plan = {
    defensa_frente: {},
    defensa_retaguardia: {},
    acciones_inmediatas: []
  };
  
  // FRENTE PRIMARIO
  if (zonas.frente.bottleneck && zonas.frente.bottleneck.criticidad === 'CRÍTICA') {
    // Paso único = concentrar 1-2 regimientos AHÍ
    plan.defensa_frente = {
      ubicacion: zonas.frente.bottleneck.ubicacion,
      regimientos: ['infanteria_pesada', 'arqueros'],  // Defensa + rango
      razon: 'bottleneck_paso_unico_impide_desvio'
    };
    plan.acciones_inmediatas.push({
      prioridad: 'CRÍTICA',
      accion: 'posicionar_regimientos_en_bottleneck'
    });
  } else if (zonas.frente.bottleneck && zonas.frente.bottleneck.criticidad === 'MEDIA') {
    // Múltiples pasos = defensa distribuida
    plan.defensa_frente = {
      ubicacion: zonas.frente.bottleneck.ubicacion,
      regimientos: ['infanteria_ligera', 'caballeria_ligera', 'arqueros'],  // Flexible
      distribuir_en: zonas.frente.bottleneck.alternativas,
      razon: 'terreno_restrictivo_pero_multiples_pasos'
    };
  } else {
    // Llanura abierta = defensa profunda detrás
    plan.defensa_frente = {
      ubicacion: 'no_defender_paso_abierto',
      razon: 'llanura_enemigo_puede_flanquear'
    };
    plan.acciones_inmediatas.push({
      prioridad: 'ALTA',
      accion: 'construir_linea_defensa_detras_llanura'
    });
  }
  
  // RETAGUARDIA
  if (zonas.frente.distancia <= 5) {
    plan.defensa_retaguardia = {
      prioridad: 'CRÍTICA',
      razon: 'enemigo_muy_cercano_capital_en_peligro'
    };
  } else {
    plan.defensa_retaguardia = {
      prioridad: 'BAJA',
      razon: 'enemigo_lejano_enfoque_en_frente'
    };
  }
  
  return plan;
}
```

**Ejemplo: Sur es mío (irrelevante) vs Norte es frente (crítico):**

```
TURNO 10:
- SUR: 0 enemigos, 5 hexes nuestros
  → NO necesito defensa
  → Puedo dejar patrulla token (1 explorador)
  
- NORTE: 1 enemigo (180 poder) a 3 hexes
  → Bottleneck único: solo 1 paso por bosque para invadirme
  → Necesidad: Infantería Pesada + Arqueros en ese paso
  → Bonus terreno bosque 1.25 = mi defensa 300 × 1.25 = 375 vs 180 = GANO

DECISIÓN:
- SUR: 0 regimientos (no hay amenaza)
- NORTE: 2 regimientos concentrados en bottleneck
- No defiendo por defenderme, defiendo donde el ENEMIGO está
```

| Regimiento | Costo | Peso base | Cuándo construir | Prioridad |
|---|---:|---:|---|---|
| **Explorador** | 150 | 300 | Siempre hay déficit | MÁXIMA flexibilidad |
| **Caballería Ligera** | 400 | 400 | Oportunidad raid / exploración | Alta flexibilidad |
| **Infantería Ligera** | 200 | 350 | Ocupación territorial rápida | Expansión |
| **Infantería Pesada** | 350 | 500 | Déficit en línea combate | Defensa/combate |
| **Caballería Pesada** | 600 | 600 | Déficit en línea combate | Combate decisivo |
| **Arqueros** | 360 | 400 | Déficit en línea combate | Rango/daño |
| **Artillería** | 1000 | 900 | Enemigo en fortaleza | Asedio prioritario |
| **Ingenieros** | 500 | 300 | Apoyo asedio / movimiento | Asedio secundario |
| **Pataches** | 1000 | 800 | Enemigo tiene flota | SOLO si necesario |
| **Barco Guerra** | 2000 | 1000 | Tengo 2+ pataches + dominio | SOLO si necesario |

### 1.4 Composición de divisiones (MEZCLA TÁCTICA)

La IA NO construye "un barco" o "unos arqueros". Construye **regimientos individuales** que se agrupan dinámicamente en formaciones según necesidad del momento:

**División de línea de combate (tierra vs tierra):**
```
Regimientos asignados: 3 Infantería Pesada + 2 Caballería Pesada + 2 Arqueros + 1 Caballería Ligera

Poder combinado: 
  - 3 × (60+100+200) = 1080
  - 2 × (100+100) = 400
  - 2 × (70+20) = 180
  - 1 × (80+60) = 140
  Total: 1800

Movilidad: variada (infantería 1, caballería 3-4)
Especialidad: frente sólido + daño a distancia + flanqueo

Si necesidad cambia a "asedio" → desasignar 2 caballería, asignar artillería
Si necesidad cambia a "raid" → desasignar infantería, asignar caballería ligera extra
```

**División de asedio (vs fortaleza):**
```
Regimientos asignados: 2 Artillería + 1 Ingeniero + 3 Infantería Pesada

Poder combinado: 
  - 2 × (250+20) = 540
  - 1 × (10+80) = 90
  - 3 × (60+100) = 480
  Total: 1110

Especialidad: rompe fortalezas, NO es fuerte en campo abierto
Ventaja: rango 3, ignora distancia

Si enemigo se retira → reagrupar en línea combate rápidamente
```

**División de raid económico (infiltración):**
```
Regimientos asignados: 2-3 Caballería Ligera + 1 Explorador + (opcional) 1 Arquero a Caballo

Poder combinado: ~420 (NO es para ganar combate)

Objetivo:
  - Destruir caminos (riesgo bajo)
  - Atacar caravanas desprotegidas
  - Capturar nodos recursos
  - Infiltrar retaguardia
  - Retirarse antes que enemigo reaccione

Si enemigo responde → llamar refuerzos de línea combate
Si éxito → volver a base, desasignar para otras necesidades
```

**División de exploración (fase temprana):**
```
Regimientos asignados: 2 Caballería Ligera + 2 Exploradores

Poder combinado: ~200 (solo para autodefensa)
Visión expandida: mov 4 + rango visión 3 = alcance 7 hexes

Después que mapee zona → disolver, reintegrar exploradores a flexibilidad
```

**División naval (si existe teatro naval):**
```
Regimientos asignados: 2-3 Pataches + 1 Barco de Guerra

ACTIVACIÓN: SOLO si:
  - Enemigo tiene flota (detectada) O
  - Tengo 2+ puertos (beneficio comercial) O
  - Necesito bombardear costa enemiga

Si NO se cumple: NO gastar recursos, mantener regimientos en tierra
```

### 1.3 Multiplicadores económicos (oro + territorio)

**Sistema de 2 variables:** la IA evalúa su situación combinando oro disponible Y territorio relativo.

#### A) Tramos de oro (realistas según economía del juego)

| Tramo oro | Multiplicador | Capacidad militar |
|---|---:|---|
| 0-500 | 0.3 | Crisis: <2 unidades básicas |
| 500-1000 | 0.6 | Bajo: 2-4 unidades |
| 1000-2000 | 1.0 | Medio: pequeño ejército (5-10 unidades) |
| 2000-5000 | 1.4 | Alto: ejército grande (10-20 unidades) |
| 5000+ | 1.8 | Dominio: ejército masivo (20+ unidades) |

**Nota:** valores basados en costes reales (Infantería Ligera 200, Caballería Pesada 600, Artillería 1000)

#### B) Ventaja territorial (análisis táctico inteligente)

```
RATIO_TERRITORIO = mis_hexágonos_controlados / hexágonos_enemigo_controlados
```

**Principio fundamental:** Si enemigo tiene MÁS territorio, sus unidades están LEJOS de su capital → líneas de comunicación largas → vulnerables.

**Mecánica de suministro REAL del juego:**
- Unidades necesitan **cadena de hexágonos propios** conectando a Capital/Ciudad
- Si capturo 1 hex enemigo → ese hex ya no comunica (rompo cadena)
- Si posiciono unidad en hex enemigo → ese hex queda "contestado" (bloqueo temporal)
- Unidad sin suministro → pierde 50% efectividad en combate
- **NO existen "columnas destructibles"** → el suministro es TERRITORIAL

| Ratio | Situación | Análisis táctico | Prioridades |
|---|---|---|---|
| <0.3 | **Muy inferior** | Enemigo tiene territorio masivo → unidades distribuidas lejos de capital | 1. **Identificar hex críticos** (bottlenecks) que rompen comunicación (×2.0)<br>2. **Capturar hex clave** con unidad rápida → desconecta múltiples unidades (×1.8)<br>3. **Dividir unidades** para ocupar territorio vacío enemigo (×1.5)<br>4. **Atacar unidades desconectadas** (50% débiles) (×1.6)<br>5. Evitar atacar unidades conectadas cerca de ciudades (×0.3) |
| 0.3-0.7 | **Inferior** | Enemigo ventaja moderada, buscar debilidades en su red territorial | 1. **Detectar ciudades enemigas**: si no hay ciudad en rango 10 → sus unidades vulnerables<br>2. Si unidades enemigas SIN ciudad cerca: **capturar hexes de conexión** (×1.5)<br>3. Si unidades CON ciudad cerca: **evitar frontal**, buscar flanqueo (×1.2)<br>4. **Capturar recursos desprotegidos** (oro/hierro) en territorio vacío (×1.3)<br>5. Usar infantería ligera barata para **ocupar hexes** (bloqueo territorial) |
| 0.7-1.3 | **Equilibrio** | Territorio balanceado → evaluar conectividad de ambos bandos | 1. Calcular `poder_militar_ratio` (más crítico que territorio)<br>2. **Verificar mi propia conexión**: si mis unidades desconectadas → construir caminos (×1.4)<br>3. Si enemigo tiene hex débil en su línea → capturar para romper (×1.3)<br>4. Combate solo si ventaja táctica clara (terreno, suministro, flanqueo) |
| 1.3-2.5 | **Superior** | Control territorial sólido → CONSOLIDAR conexiones | 1. **Construir caminos** en territorio recién capturado (×1.4)<br>2. **Asegurar ciudades** con guarniciones (evitar infiltración) (×1.3)<br>3. **Identificar hexes frontera** críticos → posicionar defensa fuerte (×1.2)<br>4. Atacar SOLO si mantengo conexión segura (×1.1)<br>5. NO extenderse más allá de capacidad logística (×0.7) |
| >2.5 | **Dominante** | Enemigo acorralado → sus unidades TODAS conectadas (cerca capital) | 1. **Capturar hexes alrededor** de capital enemiga (cerco) (×1.8)<br>2. **Bloquear TODAS las salidas** con unidades (ZOC) (×1.6)<br>3. **NO atacar directo** si enemigo en ciudad fortificada (×0.6)<br>4. Artillería para asedio seguro desde distancia (×1.5)<br>5. Esperar que enemigo salga (pierde bonus ciudad) o muera de atrición |

**Algoritmo de detección de hex críticos:**

```javascript
function identificar_hexes_criticos_enemigo(enemigo_id) {
  // 1. Encontrar capital/ciudades enemigas (fuentes de suministro)
  let fuentes_suministro = board.flat().filter(hex => 
    hex.isCity && hex.owner === enemigo_id
  );
  
  // 2. Para cada unidad enemiga, calcular su ruta de conexión a ciudad más cercana
  let unidades_enemigas = units.filter(u => u.owner === enemigo_id);
  let mapa_conexiones = {};
  
  for (unidad of unidades_enemigas) {
    let ruta = encontrar_ruta_suministro(unidad.r, unidad.c, fuentes_suministro, enemigo_id);
    if (ruta.length > 0) {
      // Cada hex en la ruta es "usado" por esta unidad
      for (hex of ruta) {
        let key = `${hex.r},${hex.c}`;
        if (!mapa_conexiones[key]) {
          mapa_conexiones[key] = { hex: hex, unidades_dependientes: [] };
        }
        mapa_conexiones[key].unidades_dependientes.push(unidad);
      }
    }
  }
  
  // 3. Identificar hexes que si capturo, desconecto MÚLTIPLES unidades
  let hexes_criticos = [];
  for (key in mapa_conexiones) {
    let info = mapa_conexiones[key];
    if (info.unidades_dependientes.length >= 3) {
      // Este hex es crítico: 3+ unidades dependen de él
      hexes_criticos.push({
        hex: info.hex,
        valor: info.unidades_dependientes.length * 500,  // Valor por unidad desconectada
        unidades_afectadas: info.unidades_dependientes.length,
        prioridad: 'CRÍTICA'
      });
    }
  }
  
  return hexes_criticos.sort((a, b) => b.valor - a.valor);
}

function encontrar_ruta_suministro(r, c, ciudades, owner) {
  // BFS para encontrar camino más corto a ciudad propia
  // Solo atravesando hexes propios (owner === owner)
  // Si no hay ruta → unidad desconectada
  
  let visited = new Set();
  let queue = [{ r, c, ruta: [] }];
  
  while (queue.length > 0) {
    let current = queue.shift();
    let key = `${current.r},${current.c}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // ¿Es ciudad propia?
    let hex = board[current.r][current.c];
    if (hex.isCity && hex.owner === owner) {
      return current.ruta;  // Encontré conexión
    }
    
    // Expandir a vecinos propios
    let vecinos = getHexNeighbors(current.r, current.c);
    for (vecino of vecinos) {
      let hex_vecino = board[vecino.r][vecino.c];
      if (hex_vecino.owner === owner) {
        queue.push({
          r: vecino.r,
          c: vecino.c,
          ruta: [...current.ruta, hex_vecino]
        });
      }
    }
  }
  
  return [];  // No hay conexión → desconectada
}
```

**Ejemplos de decisión inteligente (MECÁNICAS REALES):**

**Ejemplo 1: Perdiendo territorio (ratio 0.2) — Ataque ECONÓMICO SEGURO**
```
Situación: Enemigo controla 80 hexes, yo controlo 16 hexes.

Detección de objetivos:
1. Hex (45,45) CRÍTICO → desconecta 5 unidades (sin protección)
2. Camino en (44,44) → conecta unidades al frente (sin unidades cercanas)
3. Columna de Suministro en (55,55) → costo 300 oro, guardia de 1 Explorador (poder 5)
4. Nodo oro en (58,58) → sin protección

Táctica DIFERENCIADA por riesgo:

OPCIÓN A (BAJO RIESGO):
1. Caballería → capturar hex (45,45) 
   Riesgo: BAJO, efecto: desconecta 5 unidades
2. Explorador → destruir camino (44,44)
   Riesgo: BAJO (costo 0), efecto: movimiento lento enemigo
3. Infantería ligera → capturar nodo oro (58,58)
   Riesgo: BAJO, efecto: +100/-100 oro/turno

OPCIÓN B (RIESGO MEDIO):
4. Caballería pesada → atacar Columna de Suministro (55,55)
   Riesgo: BAJO (guardia = 1 Explorador), efecto: -300 oro/turno enemigo

Evaluación de Columna:
- Guardia: 1 Explorador (poder 5)
- Mi poder disponible: Caballería Pesada (poder 100)
- Ratio: 100/5 = 20.0 >> 1.3 ✓
- Decisión: ATACAR (riesgo mínimo, daño máximo)

RESULTADO COMBINADO:
- Táctico: 5 unidades desconectadas (50% débiles)
- Logístico: camino destruido (movimiento -1)
- Económico: -300 oro/turno (caravana)
- Income: +100/-100 (nodo capturado)
- Costo total: 0 (solo movimiento)
- Daño enemigo: -400 oro/turno equivalente
```

**Ejemplo 2: Ganando territorio (ratio 2.8)**
```
Situación: Yo controlo 70 hexes, enemigo controla 25 hexes (acorralado en capital).
Análisis mecánico:
- Capital enemiga en (20,20) con fortaleza (defensa 3.0)
- TODAS sus unidades (8) están en hexes (18-22, 18-22) → cerca capital
- Todas conectadas (distancia <5 a capital)

Táctica REAL:
1. NO atacar directo (fortaleza + suministro completo = masacre)
2. Capturar hexes alrededor: ocupar (15-25, 15-25) con infantería ligera
3. Crear "cerco territorial": todos los hexes vecinos son míos
4. Enemigo ya NO puede expandirse (todos sus vecinos ocupados)
5. Construir 3 artillerías en hexes (15,20), (25,20), (20,15) → rango 3
6. Bombardear desde distancia segura (fuera de rango enemigo)
7. Resultado: enemigo pierde unidades SIN poder contraatacar

Pesos:
- capturarHexCerco: 1200 × 1.8 = 2160 (cerrar todas las salidas)
- construirArtillería: 600 × 1.5 = 900 (asedio seguro)
- atacarEnemy (directo en fortaleza): 1500 × 0.6 = 900 (EVITAR pérdidas)
```

**Ejemplo 3: Bloqueo temporal con unidad (mecánica nueva sugerida)**
```
Situación: Enemigo tiene línea de 10 hexes propios conectando su ejército (40,40) a ciudad (20,20).
Táctica:
1. Posicionar mi unidad en hex enemigo (30,30) → hex "contestado"
2. Mientras mi unidad esté ahí, ese hex NO comunica
3. Unidades enemigas en (40,40) quedan temporalmente desconectadas
4. Si enemigo NO reacciona → mantener bloqueo y atacar con otras unidades
5. Si enemigo envía refuerzos → he forzado dividir sus fuerzas (éxito táctico)

Nota: Esto requeriría implementar mecánica "hex contestado bloquea comunicación"
```

**Sistemas de guerra económica (múltiples vectores simultáneos - PERFILES DIFERENTES):**

| Sistema | Mecánica | Riesgo | Costo | Efecto | Peso |
|---|---|---|---|---|---|
| **1. Destruir caminos** | Atacar infraestructura (Camino) | BAJO (no tiene defensa propia) | BAJO (300-500 oro) | Enemigo: movimiento lento, logística complicada | `destruirInfraestructura` 1700 |
| **2. Atacar Columnas** | Combatir Columna de Suministro (unidad) | ALTO (si está defendida) | MEDIO (300-600 oro) | Enemigo: -300 oro/turno ingresos | `cortarSuministro` 1900 |
| **3. Romper conexión** | Capturar hex crítico en línea comunicación | MEDIO (depende ubicación) | BAJO (0 oro, solo movimiento) | Unidades enemigas: 50% efectividad | `capturarHexCritico` × 2.0 |
| **4. Captura recursos** | Tomar nodos oro/hierro | BAJO (si están desprotegidos) | BAJO (0 oro) | Income swing +100/-100 | `capturarRecurso` 1200 |

**Matriz de decisión por riesgo:**

```javascript
function evaluar_objetivo_economico(objetivo) {
  
  // OBJETIVO 1: Destruir camino (BAJO RIESGO)
  if (objetivo.tipo === 'camino') {
    // Análisis: ¿hay unidades enemigas cerca del camino?
    let unidades_protegiendo = units.filter(u => 
      u.owner === enemigo && distancia(u, objetivo) <= 2
    ).length;
    
    if (unidades_protegiendo === 0) {
      // Camino indefenso → DESTRUIR (bajo riesgo, bajo costo)
      return {
        objetivo: objetivo,
        tactica: 'destruir_camino',
        riesgo: 'BAJO',
        costo: 300,  // Solo movimiento
        efecto: 'logistica_reducida',
        peso: 1700,
        condicion: 'SIEMPRE que pueda alcanzarlo'
      };
    } else {
      // Camino defendido → considerar si vale la pena arriesgar
      return {
        objetivo: objetivo,
        tactica: 'evitar',
        riesgo: 'BAJO-MEDIO',
        razon: 'defender_camino_es_cheap_para_enemigo'
      };
    }
  }
  
  // OBJETIVO 2: Atacar Columna de Suministro (ALTO RIESGO)
  if (objetivo.tipo === 'columna_suministro') {
    // Análisis: ¿Columna tiene guardia?
    let tiene_guardia = detectar_guardia_caravana(objetivo);
    
    if (tiene_guardia) {
      // Caravana defendida → ALTO RIESGO
      // Necesito ventaja táctica clara
      let mi_poder_total = calcular_poder_total(mis_unidades_cercanas);
      let poder_guardia = tiene_guardia.poder;
      let poder_ratio = mi_poder_total / poder_guardia;
      
      if (poder_ratio >= 1.3) {
        // Tengo superioridad → ATACAR (vale la pena el riesgo)
        return {
          objetivo: objetivo,
          tactica: 'atacar_caravana_defendida',
          riesgo: 'ALTO',
          costo: 600,  // Pérdidas en combate
          efecto: 'enemigo_-300_oro_turno',
          peso: 1900,
          condicion: 'SOLO si poder_ratio >= 1.3'
        };
      } else {
        // No tengo superioridad → EVITAR
        return {
          objetivo: objetivo,
          tactica: 'evitar',
          riesgo: 'ALTO',
          razon: 'guardia_demasiado_fuerte'
        };
      }
    } else {
      // Caravana indefensa → ATACAR (bajo riesgo, alto daño económico)
      return {
        objetivo: objetivo,
        tactica: 'atacar_caravana_indefensa',
        riesgo: 'BAJO',
        costo: 300,
        efecto: 'enemigo_-300_oro_turno',
        peso: 1900,
        condicion: 'SIEMPRE que sea accesible'
      };
    }
  }
  
  // OBJETIVO 3: Capturar hex crítico (RIESGO VARIABLE)
  if (objetivo.tipo === 'hex_critico') {
    let unidades_cercanas = units.filter(u => 
      u.owner === enemigo && distancia(u, objetivo) <= 3
    ).length;
    
    if (unidades_cercanas === 0) {
      // Hex crítico sin protección → CAPTURAR
      return {
        objetivo: objetivo,
        tactica: 'capturar_hex_critico',
        riesgo: 'BAJO',
        costo: 0,
        efecto: 'desconectar_multiples_unidades',
        peso: 1200 * 2.0,
        condicion: 'SIEMPRE'
      };
    } else if (unidades_cercanas <= 2) {
      // Hex con protección moderada → evaluar poder
      return {
        objetivo: objetivo,
        tactica: 'capturar_hex_critico_defendido',
        riesgo: 'MEDIO',
        costo: 400,
        efecto: 'desconectar_multiples_unidades',
        peso: 1200 * 1.5,
        condicion: 'SI puedo ganar combate'
      };
    } else {
      // Demasiado defendido → EVITAR
      return {
        objetivo: objetivo,
        tactica: 'evitar',
        riesgo: 'ALTO'
      };
    }
  }
}
```

**Categorización de objetivos por coste-beneficio:**

| Objetivo | Costo | Riesgo | ROI | Prioridad | Cuándo atacar |
|---|---|---|---|---|---|
| Camino indefenso | 0 | BAJO | Alto (lentitud permanente) | ALTA | Siempre que sea alcanzable |
| Columna indefensa | 300 | BAJO | Muy alto (-300 oro/turno) | MÁXIMA | Siempre que sea alcanzable |
| Hex crítico indefenso | 0 | BAJO | Crítico (desconecta unidades) | MÁXIMA | PRIMER OBJETIVO |
| Nodo oro/hierro | 0 | BAJO | Alto (+100/-100) | ALTA | Siempre que sea alcanzable |
| Camino defendido | 300-600 | MEDIO | Bajo (enemigo lo repara rápido) | BAJA | Solo si militarmente superior |
| Columna defendida | 600-1000 | ALTO | Medio (-300 ore/turno vs pérdidas) | MEDIA | SOLO si poder_ratio >= 1.3 |
| Hex crítico defendido | 400-800 | ALTO | Crítico si gano, desastre si pierdo | VARIABLE | Evaluar antes de atacar |

#### C) Fórmula completa (2 variables)

```
PESO_FINAL = PESO_BASE(acción)
           × MULTIPLICADOR_CIV
           × MULTIPLICADOR_MODO
           × MULTIPLICADOR_ORO
           × MULTIPLICADOR_TERRITORIO
```

**Ejemplo 1: IA con ventaja territorial pero sin oro**
```
Roma quiere atacar:
- Oro: 400 (mult. 0.6)
- Territorio: 50 hexes yo, 20 hexes enemigo → ratio 2.5 (mult. 1.3)
- Decisión: 0.6 × 1.3 = 0.78 → cauteloso pero con presión territorial
```

**Ejemplo 2: IA con oro pero perdiendo territorio**
```
Roma quiere atacar:
- Oro: 3000 (mult. 1.4)
- Territorio: 10 hexes yo, 50 hexes enemigo → ratio 0.2 (mult. 1.4)
- Decisión: 1.4 × 1.4 = 1.96 → ATAQUE DESESPERADO, gastar todo el oro en ofensiva
- Razón: si no recupero territorio AHORA, pierdo por asfixia económica
```

**Ejemplo 3: IA domina ambos**
```
Roma quiere atacar:
- Oro: 6000 (mult. 1.8)8)
- Decisión: 1.8 × 1.8 = 3.24 → AHOGAR, no dejar recuperar
- Razón: enemigo está en las cuerdas, rematar antes que se recupere.0 (mult. 1.6)
- Decisión: 1.8 × 1.6 = 2.88 → APLASTAR, ataque total
```

---

## 2) Civilizaciones (todas) — Bonos actuales
Listado completo (claves reales + bonos):

1. **Roma** → Infantería Pesada: +20 defensa, +1 movimiento
2. **Grecia** → Infantería Ligera: +20 defensa, +1 movimiento
3. **Cartago** → Artillería: +20 ataque; Patache: +10 defensa, +1 movimiento; Barco de Guerra: +20 defensa, +1 alcance
4. **Egipto** → Arqueros: +20 ataque, +1 alcance
5. **Galia** → Infantería Ligera: +20 ataque; Caballería Pesada: +20 ataque
6. **Germania** → Infantería Ligera: +20 defensa
7. **Britania** → Arqueros: +20 defensa; Barco de Guerra: +1 ganancia XP
8. **Iberia** → Infantería Ligera: +40 ataque; Caballería Ligera: +20 ataque; Artillería: +20 ataque
9. **Persia** → Arcabuceros: +20 ataque; Barco de Guerra: curación pasiva 0.25; global: sin upkeep de oro
10. **China** → Arqueros +20 ataque; Arcabuceros +20 ataque; Barco de Guerra: +1 ganancia XP
11. **Vikingos** → Infantería Ligera: +20 ataque, +1 movimiento
12. **Mongol** (nombre visible: Mongolia) → Caballería Ligera: +1 movimiento; Arqueros a Caballo: +1 movimiento
13. **Arábiga** (nombre visible: Arabia) → Caballería Ligera: +20 ataque
14. **Mameluca** (nombre visible: Sultanato Mameluco) → global: sin upkeep de oro ni comida
15. **Otomana** → Arcabuceros: +20 ataque; Artillería: +20 ataque
16. **Maya** → Arqueros: +20 ataque; Barco de Guerra: +1 ganancia XP
17. **ninguna** → Sin bonus
18. **Asiria** → Artillería: +40 ataque, coste construcción -10%; Infantería Pesada: +2 daño a moral
19. **Babilonia** → economía: +25% research; Arqueros: +20 defensa
20. **Japón** → Infantería Pesada: +5 iniciativa; Arqueros: +20 ataque; global: -25% pérdida de moral
21. **Bárbaros** (nombre visible: Reinos Independientes) → Sin bonus

---

## 3) Unidades (todas) — Valores actuales
Regimientos definidos con valores clave (ataque, defensa, salud, movimiento, rango y coste):

| Unidad | Categoría | Ataque | Defensa | Salud | Mov | Rango | Visión | Coste |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Infantería Ligera | light_infantry | 40 | 60 | 200 | 2 | 1 | 2 | oro 200, upkeep 20 |
| Infantería Pesada | heavy_infantry | 60 | 100 | 200 | 1 | 1 | 1 | oro 350, upkeep 40 |
| Caballería Ligera | light_cavalry | 80 | 60 | 200 | 4 | 0 | 3 | oro 400, upkeep 40 |
| Caballería Pesada | heavy_cavalry | 100 | 100 | 200 | 3 | 0 | 2 | oro 600, upkeep 60 |
| Arqueros a Caballo | light_cavalry | 80 | 60 | 200 | 4 | 2 | 3 | oro 720, upkeep 60 |
| Arqueros | light_infantry | 70 | 20 | 150 | 2 | 2 | 2 | oro 360, upkeep 20 |
| Arcabuceros | light_infantry | 100 | 40 | 200 | 1 | 2 | 2 | oro 480, upkeep 40 |
| Artillería | artillery | 250 | 20 | 150 | 1 | 3 | 1 | oro 1000, upkeep 80 |
| Cuartel General | support | 10 | 40 | 200 | 3 | 0 | 3 | oro 800, upkeep 100 |
| Ingenieros | support | 10 | 80 | 200 | 2 | 0 | 1 | oro 500, upkeep 40 |
| Hospital de Campaña | support | 0 | 40 | 200 | 2 | 0 | 1 | oro 600, upkeep 60 |
| Columna de Suministro | support | 0 | 20 | 200 | 3 | 0 | 2 | oro 300, upkeep 20 |
| Patache | naval | 80 | 50 | 100 | 5 | 3 | 4 | oro 1000, upkeep 100, madera 500 |
| Barco de Guerra | naval | 180 | 120 | 200 | 4 | 3 | 3 | oro 2000, upkeep 100, madera 1000 |
| Colono | support | 0 | 20 | 200 | 2 | 0 | 1 | oro 4000, comida 50 |
| Explorador | support | 5 | 10 | 150 | 3 | 0 | 3 | oro 150, upkeep 10 |
| Pueblo | support | 15 | 60 | 150 | 1 | 0 | 1 | oro 80, upkeep 5 |

---

## 4) Recursos (todos) — Valores actuales

### 4.1 Recursos del jugador
- `oro`
- `comida`
- `madera`
- `piedra`
- `hierro`
- `researchPoints`
- `puntosReclutamiento`

### 4.2 Nodos de recurso (mapa)
Ingreso base por nodo: 100.

| Nodo | Nombre | Sprite | Ingreso |
|---|---|---|---:|
| `hierro` | Hierro | ⛏️ | 100 |
| `madera` | Madera | 🌲 | 100 |
| `piedra` | Piedra | ⛰️ | 100 |
| `comida` | Comida | 🌾 | 100 |
| `oro_mina` | Oro | 💰 | 100 |
| `Puerto` | Oro (puerto) | ⚓ | 100 |

---

## 5) Terrenos (todos) — Valores actuales

| Terreno (clave) | Nombre | Coste mov | Bonus defensa | Bonus defensa dist | Bonus ataque melé | Mult. recursos | Penal. visión | Impasable tierra | Impasable naval |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| `plains` | Llanura | 1.0 | 0 | 0 | 0 | 1.0 | 0 | No | Sí |
| `forest` | Bosque | 2.0 | 1.25 | 2 | 0 | 1.0 | 0.5 | No | Sí |
| `hills` | Colinas | 2.0 | 1.5 | 0 | 1 | 1.1 | 0 | No | Sí |
| `water` | Agua | 1.0 | 0 | 0 | 0 | 0 | 0 | Sí | No |

---

## 6) Infraestructuras (todas) — Valores actuales

| Infraestructura | Coste | Defensa | Coste mov | Recluta | Upkeep | Construible en | Tech requerida | Ciudad |
|---|---|---:|---:|---|---|---|---|---|
| Camino | piedra 100, madera 100 | 0 | 0.5 | No | — | plains, hills | ENGINEERING | No |
| Fortaleza | piedra 1000, hierro 400, oro 600 | 3 | 1.0 | Sí | comida 40, oro 20 | — | FORTIFICATIONS | No |
| Fortaleza con Muralla | piedra 2000, oro 1000 | 5 | 1.0 | Sí | oro 40 | — | SIEGE_CRAFT | No |
| Aldea | Colono 1, oro 2000 | 1 | 1.0 | Sí | oro 60 | plains, hills | COLONY | Sí |
| Ciudad | Colono 1, oro 5000 | 2 | 1.0 | Sí | oro 100 | plains, hills | COLONY | Sí |
| Metrópoli | Colono 1, oro 10000 | 3 | 1.0 | Sí | oro 200 | plains, hills | COLONY | Sí |
| Atalaya | madera 300, oro 100 | 0 | 1.0 | No | oro 5 | plains, hills, forest | RECONNAISSANCE | No |

### 6.1 Capacidad militar por infraestructura

| Infraestructura | Límite regimientos |
|---|---:|
| Metrópoli | 40 |
| Ciudad | 20 |
| Aldea | 10 |
| Fortaleza | 5 |
| Hexágono Libre | 1 |

---

## 7) Influencia de hexágonos (definición)

```
INFLUENCIA(hex) =
  VALOR_RECURSOS
+ VALOR_CIUDADES
+ VALOR_AMENAZAS
+ BONO_TERRENO
+ BONO_CONECTIVIDAD
+ BONO_ESTRATÉGICO
```

**Interpretación simple:** recursos y ciudades suben el valor; amenazas suben la prioridad defensiva; terreno y conectividad ajustan la decisión final.

---

## 8) Motor de Ambición (Victory Engine)
**Objetivo:** cada turno la IA elige el camino de victoria más corto **considerando su situación actual**.

### 8.1 Evaluación de situación (antes de elegir ruta)

```
SITUACION_IA = {
  oro: actual,
  territorio_ratio: mis_hexes / hexes_enemigo,
  ciudades_ratio: mis_ciudades / ciudades_enemigo,
  poder_militar_ratio: calcular_poder_total() / poder_enemigo_total()
}
```

#### A) Cálculo de poder militar

```javascript
function calcular_poder_total(unidades) {
  let poder = 0;
  for (unidad of unidades) {
    // Poder base = ataque + defensa + salud_restante
    let poder_base = unidad.attack + unidad.defense + (unidad.health_actual / unidad.health_max) * 100;
    
    // Bonus por terreno
    let terreno = board[unidad.r][unidad.c].terrain;
    let bonus_terreno = 1.0;
    if (terreno === 'hills') bonus_terreno = 1.5;
    if (terreno === 'forest') bonus_terreno = 1.25;
    if (terreno === 'plains') bonus_terreno = 1.0;
    
    // Penalización por falta de suministro
    let tiene_suministro = isHexSupplied(unidad.r, unidad.c, unidad.owner);
    let bonus_suministro = tiene_suministro ? 1.0 : 0.5;
    
    // Bonus por moral
    let bonus_moral = unidad.morale / 100;
    
    poder += poder_base * bonus_terreno * bonus_suministro * bonus_moral;
  }
  return poder;
}
```

#### B) Decisión contextual (basada en poder militar)

**Ratio de poder militar:**
- `poder_ratio > 1.5` → **ULTRAAGRESIVO:** puedo ganar fácil, atacar con todo
- `poder_ratio 1.1-1.5` → **AGRESIVO:** ventaja táctica, presionar
- `poder_ratio 0.9-1.1` → **EQUILIBRADO:** combates selectivos, buscar ventajas
- `poder_ratio 0.6-0.9` → **DEFENSIVO:** retroceder a terreno favorable, esperar refuerzos
- `poder_ratio < 0.6` → **RETIRADA:** no puedo ganar ahora, consolidar y reagrupar

**Modificadores adicionales:**
- Si tengo ventaja de suministro (+30% poder): atacar líneas enemigas desconectadas
- Si enemigo sin suministro: presión total (sus unidades pierden 50% efectividad)
- Si puedo flanquear (2+ unidades desde lados distintos): +40% poder efectivo

### 8.2 Rutas de victoria (definición)

**Ruta de Sangre (Aniquilación)**
- **Meta:** eliminar todas las unidades enemigas clave.
- **Prioriza:** `atacarEnemy`, daño concentrado, colisiones rápidas.
- **Ignora:** recursos secundarios y banderas si no aceleran la victoria.

**Ruta del Emperador (Territorio)**
- **Meta:** controlar ciudades/territorio suficientes.
- **Cálculo:** (Ciudades necesarias - Ciudades controladas) + distancia media a ciudades neutrales/enemigas.
- **Prioriza:** `conquistarCiudad`, `expandirTerritorio`, dividir fuerzas.

**Ruta de la Gloria (Puntos)**
- **Meta:** alcanzar puntos de victoria antes que el rival.
- **Prioriza:** ruinas/objetivos, `expandirTerritorio` hacia puntos.

### 8.2 “Distancia a la Meta” (heurística)
- Se calcula un coste estimado por ruta.
- La IA elige la ruta con coste mínimo **cada turno**.

---

## 9) Jugadas tácticas múltiples (definiciones)

### 9.1 Jugada “Martillo” (Concentración de fuerza)
- **Condición:** unidad enemiga aislada O ciudad mal defendida O puedo ganar combate 3v1.
- **Cálculo:** poder_3_unidades > poder_enemigo_1_unidad × 1.5
- **Acción:** enviar 3 unidades coordinadas (bloqueo + daño + flanqueo).
- **Objetivo:** eliminar en 1 turno para evitar contraataques.

### 9.2 Jugada "Muralla" (Defensa posicional)
- **Condición:** poder_militar_ratio < 0.9 (no puedo ganar combate directo).
- **Cálculo:** buscar terreno con bonus_defensa > 1.25 (colinas, bosque, montaña).
- **Acción:** retroceder a terreno ventajoso, formar línea defensiva.
- **Objetivo:** igualar poder efectivo con bonus de terreno. Ejemplo: poder 0.7 × terreno 1.5 = 1.05 (ventaja).

### 9.3 Jugada "Saqueo" (Disrupción económica)
- **Condición:** detecto objetivos económicos enemigos sin protección O débilmente protegidos.
- **Objetivos válidos con PERFILES DIFERENTES:**

  **A) Destruir camino (BAJO RIESGO, BAJO COSTO)**
  - Camino cuesta 200 oro al enemigo (piedra 100 + madera 100)
  - Destruir es gratis (solo movimiento)
  - Efecto: enemigo movimiento lento en esa ruta
  - **Siempre atacar si: camino está sin unidades cercanas (<2 hexes)**

  **B) Atacar Columna de Suministro (ALTO RIESGO, MEDIO COSTO)**
  - Columna es unidad: Columna de Suministro (defensa 20, salud 200)
  - Efecto: enemigo pierde -300 oro/turno
  - **SOLO atacar si: poder_ratio >= 1.3 Y no hay unidades enemigas en rango 2**
  - Si está defendida: PELIGRO, puede costar 600+ oro en pérdidas

  **C) Capturar nodo oro/hierro (BAJO RIESGO, BAJO COSTO)**
  - Nodo indefenso: +100 oro/turno mío, -100 enemigo (swing 200)
  - **Siempre atacar si: nodo desprotegido**

  **D) Capturar hex crítico en cadena comunicación (CRÍTICO)**
  - Sin protección: desconecta unidades enemigas (50% efectividad)
  - Con protección: riesgo muy alto
  - **PRIORIDAD MÁXIMA si: está desprotegido**

- **Acción:** enviar unidad rápida (Caballería Ligera mov=4) para raid.
- **Objetivo:** negar recursos/logística al enemigo sin arriesgar ejército principal.

### 9.4 Jugada "Cuchillo en la Espalda" (Guerra en retaguardia) — NUEVA
- **Condición:** enemigo tiene ejército en el frente PERO su retaguardia está desprotegida.
- **Cálculo de valor (objetivos DIFERENTES, efectos DIFERENTES):**
  ```
  VALOR_OBJETIVO = {
    // Sistema 1: Suministro táctico (territorial)
    Hex_critico_comunicacion: 500 × unidades_desconectadas,
    
    // Sistema 2: Guerra económica (unidades/infraestructura)
    Columna_Suministro: 400 (oro 300 + upkeep 20 = -320/turno para enemigo),
    Ciudad_sin_guarnicion: 1000 + ingresos_ciudad_turno,
    Nodo_oro: 300 (capturar = +100/turno mío, -100/turno enemigo),
    Camino: 200 (destruir = lentitud enemiga, no afecta suministro táctico)
  }
  ```
- **Acción (ataque múltiple simultáneo):**
  1. **Vector táctico**: Capturar hex crítico → desconectar unidades frente
  2. **Vector económico**: Atacar Columna de Suministro → negar oro
  3. **Vector territorial**: Capturar nodos recursos → income swap
  4. **Vector logístico**: Destruir caminos → lentitud movimiento enemigo
  5. Retirarse antes que enemigo reaccione
  
- **Efecto combinado (NO es uno u otro, es TODO):**
  - Unidades enemigas en frente: desconectadas (50% débiles)
  - Economía enemiga: -320 oro/turno (sin caravana)
  - Recursos: enemigo pierde nodos oro/hierro
  - Movilidad: enemigo sin caminos = movimiento lento

**Prioridad alta si:**
- Ejército enemigo está a >5 hexes de su capital
- Detecto ruta de suministro crítica (solo 1 camino conecta frente con capital)
- Tengo unidad rápida disponible (mov ≥3)

### 9.5 Jugada "Pinza" (Flanqueo)
- **Condición:** puedo atacar unidad enemiga desde 2+ direcciones diferentes.
- **Cálculo:** `flanqueo_bonus = 0.4 × número_unidades_flanqueando`
- **Acción:** coordinar ataque simultáneo desde múltiples lados.
- **Objetivo:** +40% poder efectivo por flanqueo completo (anula bonus de terreno enemigo).

**Ejemplo:**
```
Unidad enemiga en colinas (bonus 1.5 defensa):
- Ataque frontal: mi poder 100 vs enemigo 150 (por terreno) = pierdo
- Flanqueo (2 unidades): mi poder 100 × 1.4 (flanqueo) = 140 vs enemigo 150 (terreno anulado) = empate
- Flanqueo (3 unidades): mi poder 100 × 1.8 = 180 vs 150 = GANO
```

### 9.6 Jugada "Concentración" (Fusión de unidades) — NUEVA
- **Condición:** tengo 2+ unidades débiles cerca que juntas pueden vencer enemigo fuerte.
- **Cálculo de fusión:**
  ```javascript
  poder_unidad_A = (attack_A + defense_A + health_A) = 60
  poder_unidad_B = (attack_B + defense_B + health_B) = 55
  poder_enemigo = 150
  
  // Separadas: cada una pierde (60 < 150, 55 < 150)
  // Fusionadas: poder_combinado = 115 vs 150 = sigo perdiendo
  // PERO si sumo regimientos: 60 + 55 = 115 (más regimientos = más poder en combate)
  ```

- **Cuándo fusionar:**
  1. **Combate decisivo inminente:** enemigo fuerte se acerca, necesito concentrar poder
  2. **Asedio de fortaleza:** necesito stack máximo para romper defensas (bonus defensa 1.5-2.0)
  3. **Defensa desesperada:** pierdo territorio, fusionar todo en última línea
  4. **Push final:** tengo ventaja, fusionar ejército para golpe letal

- **Fórmula de urgencia:**
  ```javascript
  urgencia_fusion = 1.0;  // base
  
  if (poder_enemigo > suma_poderes_individuales) {
    urgencia_fusion *= 2.0;  // No puedo ganar separado
  }
  
  if (enemigo_en_fortaleza && !tengo_artilleria) {
    urgencia_fusion *= 1.8;  // Necesito stack para romper
  }
  
  if (estoy_perdiendo_territorio) {
    urgencia_fusion *= 1.5;  // Defensa concentrada
  }
  
  if (voy_ganando && puedo_finalizar_enemigo) {
    urgencia_fusion *= 2.5;  // Push final decisivo
  }
  
  peso_fusion = 400 × urgencia_fusion;
  // Máximo: 400 × 2.5 = 1000 (prioridad MUY alta)
  ```

**Ejemplo práctico:**
```
Situación: Tengo 3 Infanterías Ligeras (poder 60 cada una) dispersas.
           Enemigo tiene 1 Infantería Pesada (poder 180) avanzando.

Análisis:
- 1v1: 60 vs 180 = pierdo (cada unidad muere)
- Fusión: crear 1 unidad con 3 regimientos = poder efectivo 180
- Resultado: 180 vs 180 = empate, PERO si ataco en terreno favorable = GANO

Decisión: FUSIONAR las 3 unidades en 1 stack → peso 400 × 2.0 = 800
```

### 9.7 Jugada "Dispersión" (División de unidades) — NUEVA
- **Condición:** tengo 1 unidad fuerte con múltiples regimientos que puede dividirse para ventaja táctica.
- **Cálculo de división:**
  ```javascript
  unidad_actual = {
    regimientos: 4,
    poder_total: 200,
    hexes_controlados: 1
  }
  
  // Opción: dividir en 2 unidades de 2 regimientos cada una
  division_opcion = {
    unidad_1: { regimientos: 2, poder: 100 },
    unidad_2: { regimientos: 2, poder: 100 },
    hexes_controlados: 2,  // Duplicado
    puede_flanquear: true   // Ahora ataco desde 2 lados
  }
  ```

- **Cuándo dividir:**
  1. **Control territorial:** necesito ocupar más hexes (expandir zona influencia)
  2. **Flanqueo táctico:** dividir para atacar desde múltiples ángulos (+40% bonus)
  3. **Captura de recursos:** dividir para tomar 2-3 nodos simultáneamente
  4. **Interceptación:** dividir para cubrir múltiples rutas de escape enemigo
  5. **Zona de Control (ZOC):** crear red de unidades que bloquea movimiento enemigo

- **Fórmula de valor territorial:**
  ```javascript
  valor_division = 0;
  
  // Valor por cada hex adicional que puedo controlar
  hexes_adicionales = numero_unidades_division - 1;
  valor_division += hexes_adicionales × 50;
  
  // Bonus si hay recursos valiosos cerca
  recursos_alcanzables = contar_recursos_en_rango(3);
  valor_division += recursos_alcanzables × 100;
  
  // Bonus MASIVO si puedo crear flanqueo
  if (puede_flanquear_dividiendo) {
    valor_division += 300;  // Flanqueo es crítico
  }
  
  // Bonus si corto múltiples caminos enemigos
  caminos_cortables = detectar_caminos_enemigos();
  valor_division += caminos_cortables × 150;
  
  // PENALIZACIÓN si enemigo fuerte cerca (necesito concentración)
  if (enemigo_fuerte_en_rango_3) {
    valor_division *= 0.3;  // NO dividir si peligroso
  }
  
  peso_division = 300 + valor_division;
  // Máximo: 300 + 300 (flanqueo) + 300 (recursos) = 900
  ```

**Ejemplo práctico:**
```
Situación: Tengo 1 Caballería Pesada con 5 regimientos (poder 250).
           Enemigo tiene 1 Infantería Pesada (poder 180) en fortaleza.
           Hay 3 nodos de hierro cerca sin protección.

Análisis:
- Atacar directo: 250 vs 180×1.5 (fortaleza) = 250 vs 270 = PIERDO
- Dividir en 3 unidades:
  * Unidad 1 (2 reg): flanquea por izquierda
  * Unidad 2 (2 reg): flanquea por derecha
  * Unidad 3 (1 reg): captura 3 nodos hierro
  * Flanqueo: +40% bonus = 200×1.4 = 280 vs 270 = GANO
  * Bonus: +300 hierro/turno capturado

Decisión: DIVIDIR → peso 300 + 300 (flanqueo) + 300 (recursos) = 900
```

---

## 9.8 Algoritmo maestro: ¿Fusionar o Dividir?

**Árbol de decisión:**

```javascript
function decidir_fusion_o_division() {
  
  // PASO 1: Evaluar amenaza inmediata
  let amenaza_cercana = detectar_enemigos_en_rango(3);
  
  if (amenaza_cercana.length > 0) {
    let poder_enemigo_total = amenaza_cercana.reduce((sum, u) => sum + u.poder, 0);
    let mi_poder_total = mis_unidades.reduce((sum, u) => sum + u.poder, 0);
    
    if (poder_enemigo_total > mi_poder_total × 1.2) {
      // Enemigo más fuerte → FUSIONAR para defensa
      return { accion: 'FUSIONAR', razon: 'defensa_contra_superior', urgencia: 2.0 };
    }
  }
  
  // PASO 2: Evaluar oportunidades territoriales
  let recursos_disponibles = detectar_recursos_sin_proteger(5);
  let puede_flanquear = detectar_oportunidad_flanqueo();
  let caminos_cortables = detectar_caminos_enemigos_vulnerables();
  
  let valor_territorial = recursos_disponibles.length × 100 
                        + (puede_flanquear ? 300 : 0)
                        + caminos_cortables.length × 150;
  
  if (valor_territorial > 400) {
    // Alta oportunidad territorial → DIVIDIR
    return { accion: 'DIVIDIR', razon: 'expansion_tactica', valor: valor_territorial };
  }
  
  // PASO 3: Evaluar situación estratégica
  if (territorio_ratio < 0.7 && !hay_amenaza_inmediata) {
    // Perdiendo territorio pero no hay peligro → DIVIDIR para expandir
    return { accion: 'DIVIDIR', razon: 'recuperar_territorio', valor: 500 };
  }
  
  if (poder_militar_ratio > 1.5 && enemigo_fortificado) {
    // Tengo ventaja militar pero enemigo en fortaleza → FUSIONAR para push
    return { accion: 'FUSIONAR', razon: 'romper_defensas', urgencia: 1.8 };
  }
  
  // PASO 4: Default según fase del juego
  if (turnNumber < 20) {
    // Early game: expandir es clave
    return { accion: 'DIVIDIR', razon: 'early_expansion', valor: 300 };
  } else if (turnNumber > 60) {
    // Late game: combates decisivos
    return { accion: 'FUSIONAR', razon: 'combate_final', urgencia: 1.5 };
  }
  
  // Por defecto: mantener formación actual
  return { accion: 'MANTENER', razon: 'situacion_equilibrada' };
}
```

**Reglas heurísticas simplificadas:**

| Situación | Acción | Peso | Razón |
|-----------|--------|------|-------|
| Enemigo superior cerca | FUSIONAR | 800 | Necesito concentrar poder |
| Asedio de fortaleza | FUSIONAR | 720 | Romper defensas fortificadas |
| 3+ recursos desprotegidos cerca | DIVIDIR | 600 | Captura múltiple rentable |
| Puedo flanquear dividiendo | DIVIDIR | 900 | Bonus flanqueo crítico (+40%) |
| Perdiendo territorio (ratio <0.7) | DIVIDIR | 500 | Expandir rápido |
| Ganando (ratio >1.5) y enemigo fortificado | FUSIONAR | 700 | Push final concentrado |
| Enemigo tiene unidades dispersas | DIVIDIR | 450 | Interceptar múltiples objetivos |
| Late game (turno >60) | FUSIONAR | 600 | Combates decisivos |
| Early game (turno <20) | DIVIDIR | 450 | Expansión territorial |

---

## 9.6 Sistema de detección de retaguardia vulnerable

**Algoritmo para identificar oportunidades:**

```javascript
function detectar_retaguardia_vulnerable(enemigo) {
  // 1. Identificar todas las unidades enemigas
  let unidades_frente = units.filter(u => u.owner === enemigo && distancia_a_mi_capital(u) < 10);
  let unidades_retaguardia = units.filter(u => u.owner === enemigo && distancia_a_mi_capital(u) >= 10);
  
  // 2. Si >70% ejército enemigo está en frente → retaguardia vulnerable
  if (unidades_frente.length / total_unidades_enemigo > 0.7) {
    
    // 3. Identificar infraestructura crítica
    let objetivos = [];
    
    // Caminos que conectan frente con capital
    for (hex of board.flat()) {
      if (hex.structure === 'Camino' && hex.owner === enemigo) {
        let conecta_frente_capital = verificar_si_camino_critico(hex);
        if (conecta_frente_capital) {
          objetivos.push({
            tipo: 'camino_critico',
            valor: 500,
            hex: hex,
            prioridad: 'ALTA'
          });
        }
      }
    }
    
    // Columnas de suministro
    for (unit of units) {
      if (unit.type === 'Columna de Suministro' && unit.owner === enemigo) {
        objetivos.push({
          tipo: 'caravana',
          valor: 800,
          unidad: unit,
          prioridad: 'CRÍTICA'
        });
      }
    }
    
    // Ciudades sin guarnición
    for (hex of board.flat()) {
      if (hex.isCity && hex.owner === enemigo) {
        let tiene_guarnicion = units.some(u => u.r === hex.r && u.c === hex.c);
        if (!tiene_guarnicion) {
          objetivos.push({
            tipo: 'ciudad_indefensa',
            valor: 1000 + hex.ingresos_por_turno,
            hex: hex,
            prioridad: 'CRÍTICA'
          });
        }
      }
    }
    
    return objetivos.sort((a, b) => b.valor - a.valor);
  }
  
  return [];
}
```

**Decisión:**
- Si detecto 1+ objetivos de prioridad CRÍTICA → desviar 1-2 unidades rápidas para ataque retaguardia
- Si enemigo reacciona y envía defensa → he logrado dividir sus fuerzas (ventaja táctica)

---

# 🤖 ARQUITECTURA COMPLETA DE IA
Juego de Estrategia Hexagonal — IA Sistémica de Guerra

Esta IA no usa scripts rígidos. Funciona como un sistema de decisión estratégico unificado donde:
- **Economía, guerra y logística** son un mismo sistema de presión.
- El objetivo no es “ganar batallas”, sino **colapsar el sistema enemigo**.

## 🧠 1. ESTRUCTURA JERÁRQUICA

| Nivel | Frecuencia | Función |
|---|---|---|
| Estratégico | cada 5 turnos | Definir enfoque global |
| Operacional | cada 2 turnos | Elegir zonas prioritarias |
| Táctico | cada turno | Movimientos concretos |
| Psicológico | continuo | Manipular al jugador |

## 🎯 2. FUNCIÓN DE UTILIDAD GLOBAL

**Variables de estado:**

```
S = Seguridad
E = Economía
M = Poder militar relativo
T = Territorio relativo
C = Conectividad logística
```

```
U_total = wS*S + wE*E + wM*M + wT*T + wC*C
```

Los pesos se ajustan según doctrina, pero **nunca separan economía y guerra**.

## 🌍 3. NIVEL OPERACIONAL — VALOR DE ZONAS

```
V_zona =
  recursos*1.5
+ cercanía_capital*1.2
+ presencia_enemiga*1.8
+ bottleneck*2.0
+ ciudad*2.5
```

Las zonas con mayor valor → foco de operaciones.

## ⚔️ 4. NIVEL TÁCTICO

**Ataque**

```
V_ataque =
  debilidad_enemiga
× desconexión_logística
× valor_hex
× ventaja_terreno
```

**Defensa**

```
V_defensa =
  valor_hex_propio
× cercanía_capital
× bottleneck
× amenaza_enemiga
```

## 🔥 5. SISTEMA CENTRAL — PRESIÓN ESTRATÉGICA

La IA mantiene presión constante.

```
PRESIÓN =
  daño_económico_infligido
+ territorio_disputado
+ unidades_enemigas_sin_suministro
+ amenazas_cerca_de_ciudades_enemigas
```

**Estados de presión**

| Nivel | Comportamiento |
|---|---|
| Baja | Expandir base económica |
| Media | Hostigar y preparar |
| Alta | Intensificar ataques sistémicos |
| Crítica | Ofensiva decisiva |

**Decisión final de acciones**

```
Valor_final =
  Valor_militar
+ Valor_económico
+ Valor_logístico
```

Cada acción debe aumentar la presión total.

## 🧠 6. CAPA PSICOLÓGICA

**Modelo del jugador:**

```
perfil_jugador = {
  reactividad,
  defensa_económica,
  velocidad_respuesta,
  dependencia_ejército_grande,
  sobreexpansión
}
```

Tácticas: **señuelos**, **falsas debilidades**, **presión invisible**, **sobrecarga cognitiva**.

## 🧭 7. IA DE CAMPAÑA (GUERRA COMPLETA)

**Tipos de guerra:**

| Condición | Tipo |
|---|---|
| Superioridad militar | Aniquilación |
| Equilibrio | Desgaste |
| Inferioridad | Guerra indirecta |

**Modelo enemigo**

```
nodos = ciudades + recursos + puertos
conexiones = rutas logísticas
```

**Plan por fases**
1. Cortar logística
2. Dañar economía
3. Aislar ciudades
4. Capturarlas
5. Golpe final

**Métrica de colapso enemigo**

```
Colapso =
  economía_ratio
× conectividad_ratio
× ciudades_ratio
× suministro_unidades_ratio
```

## 🔁 8. ADAPTACIÓN

Cada 5 turnos:

```
Si presión no aumenta → cambiar eje de campaña
```

## 🧠 9. APRENDIZAJE SIMPLE

Ajuste dinámico de pesos según resultados efectivos.

---

## 🧩 APRENDIZAJE POR REFUERZO (COMPLEMENTO)

Esto **no sustituye** la lógica actual; la complementa como capa de mejora continua basada en historial de partidas. Es **válido**, pero requiere un pipeline controlado.

### 1) Qué guardar en la base de datos (mínimo viable)

Por cada turno/acción:
- Estado compacto (features: oro, territorio_ratio, poder_ratio, conectividad, fase, civ, turno)
- Acción elegida (tipo y objetivo)
- Resultado corto (win/lose, daño económico infligido, unidades perdidas/ganadas, ciudades capturadas)

### 2) Recompensa (reward) alineada con el diseño

```
reward =
  + 2.0 * ciudades_capturadas
  + 1.5 * daño_económico
  + 1.0 * unidades_enemigas_eliminadas
  - 1.2 * unidades_propias_perdidas
  - 1.5 * oro_ahorrado_inútil
  + 3.0 * victoria
```

### 3) Estrategia práctica (sin romper el sistema)

**Opción A (rápida):** ajustar pesos con aprendizaje supervisado (imitar humanos)

**Opción B (intermedia):** bandits para elegir entre doctrinas ya definidas

**Opción C (avanzada):** RL offline con historial + evaluación segura

### 4) Salvaguardas

- Nunca ejecutar acciones no viables por tecnología o economía.
- Si el modelo empeora métricas clave, revertir a pesos base.
- Versionar políticas y registrar cambios.

**Resultado:** la IA aprende patrones efectivos sin perder coherencia sistémica ni violar restricciones del juego.

---

# 🌳 ÁRBOL DE DECISIÓN — FLUJO OPERATIVO COMPLETO

Este es el **guión ejecutable** que instrumentaliza todo el documento. La IA ejecuta este ciclo cada turno.

## INICIO DE TURNO — FLUJOS PARALELOS

La IA opera con **DOS FLUJOS SIMULTÁNEOS** cada turno:

```
┌─────────────────────────────────────┐
│  TURNO N — JUGADOR IA               │
└─────────────────────────────────────┘
           ↓
     ┌─────────────┐
     │  EVALUAR    │
     │  ESTADO     │
     │  GLOBAL     │
     └─────────────┘
           ↓
    ╔═════════════════════════╗
    ║   EJECUCIÓN PARALELA    ║
    ╚═════════════════════════╝
           ↓
    ┌──────────────┬──────────────┐
    │              │              │
    ▼              ▼              │
┌────────────┐ ┌────────────┐    │
│  FLUJO A   │ │  FLUJO B   │    │
│  ECONÓMICO │ │  TÁCTICO-  │    │
│  (largo    │ │  MILITAR   │    │
│   plazo)   │ │  (corto    │    │
│            │ │   plazo)   │    │
└────────────┘ └────────────┘    │
    │              │              │
    └──────────────┴──────────────┘
           ↓
    ┌─────────────┐
    │  COORDINAR  │
    │  & EJECUTAR │
    └─────────────┘
```

### EVALUACIÓN INICIAL (común a ambos flujos)

```
┌─────────────────────────────────────┐
│  1. EVALUAR ESTADO GLOBAL           │
│  - oro actual + proyección 3T       │
│  - territorio_ratio (mis/enemigo)   │
│  - poder_militar_ratio              │
│  - ciudades_ratio                   │
│  - conectividad (rutas activas)     │
│  - investigación (techs desbloqueadas)│
│  - caravanas activas / objetivo     │
│  - hexes controlados vs totales     │
└─────────────────────────────────────┘
```

---

## FLUJO A: ECONÓMICO (DOMINIO Y CIRCUITO ORO)

**Objetivo:** Controlar el mapa completo, negar recursos al enemigo, establecer circuito oro sostenible.

Este flujo **NUNCA se detiene**, incluso durante guerra total.

```
┌─────────────────────────────────────┐
│  A1. EVALUAR DOMINIO TERRITORIAL    │
│  hexes_controlados / hexes_totales  │
│  objetivo: 100% del mapa            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A2. IDENTIFICAR HEXES SIN CONTROLAR│
│  - hexes neutrales (prioridad)      │
│  - hexes enemigos (según seguridad) │
│  - recursos valiosos primero        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A3. PLANIFICAR EXPANSIÓN           │
│  - ¿Tengo unidades disponibles?     │
│  - ¿Hex está seguro? (sin enemigos) │
│  - Enviar unidad más cercana        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A4. EVALUAR CIRCUITO ORO ACTUAL    │
│  Por cada ciudad:                   │
│  - ¿Está conectada a Banca/Capital? │
│  - ¿Tiene camino completo?          │
│  - ¿Tiene caravana activa?          │
└─────────────────────────────────────┘
           ↓
     ¿Todas ciudades conectadas?
      NO ↓              SÍ ↓
    ┌──────────┐    ┌──────────┐
    │ PRIORIZAR│    │ OPTIMIZAR│
    │ CONEXIÓN │    │ INGRESOS │
    └──────────┘    └──────────┘
           ↓
┌─────────────────────────────────────┐
│  A5. CIRCUITO DE CONEXIÓN           │
│  Para ciudad sin conexión:          │
│  1. Calcular ruta más corta         │
│  2. ¿Ruta segura? (sin enemigos)    │
│  3. Construir caminos faltantes     │
│  4. Producir Columna Suministro     │
│  5. Crear caravana a Banca          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A6. PROTECCIÓN INFRAESTRUCTURA     │
│  - Identificar caminos vulnerables  │
│  - Identificar caravanas expuestas  │
│  - Asignar escolta (1-2 unidades)   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A7. FUNDACIÓN DE NUEVAS CIUDADES   │
│  SI oro_proyectado > 6000 Y         │
│     zonas con 3+ recursos Y         │
│     seguras (sin amenaza):          │
│  - Producir Colono                  │
│  - Mover a ubicación óptima         │
│  - Fundar ciudad                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A8. MEJORA DE CIUDADES EXISTENTES  │
│  SI ciudad rentable (>200 oro/turno)│
│  Y oro disponible:                  │
│  - Aldea → Ciudad (oro 5000)        │
│  - Ciudad → Metrópoli (oro 10000)   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A9. CONSTRUCCIÓN INFRAESTRUCTURA   │
│  - Puertos (costa + comercio)       │
│  - Atalayas (visión territorial)    │
│  - Caminos (logística)              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  A10. MÉTRICAS DE ÉXITO ECONÓMICO   │
│  - % mapa controlado                │
│  - N° caravanas activas             │
│  - Oro/turno proyectado             │
│  - Ciudades conectadas / totales    │
└─────────────────────────────────────┘
```

### Reglas críticas del Flujo Económico

1. **Dominio territorial = negación enemiga:** Cada hex que controlo, el enemigo NO puede usarlo.
2. **Circuito oro es prioridad absoluta:** Sin oro sostenido, el ejército colapsa.
3. **Protección activa:** Un camino destruido = -50 oro/turno. Una caravana perdida = -300 oro/turno.
4. **Expansión continua:** Siempre tener 1-2 unidades dedicadas SOLO a capturar hexes neutrales.
5. **Largo plazo > corto plazo:** Invertir en ciudades/caminos aunque la guerra sea intensa.

---

## FLUJO B: TÁCTICO-MILITAR (PRESIÓN Y COMBATE)

**Objetivo:** Mantener presión constante, proteger el flujo económico, colapsar sistema enemigo.

```
┌─────────────────────────────────────┐
│  B1. ¿TURNO % 5 == 0?               │
│     (Revisión estratégica)          │
└─────────────────────────────────────┘
      Sí ↓           No ↓
    ┌────────┐    (continuar)
    │ NIVEL  │
    │ESTRATÉG│
    │  ICO   │
    └────────┘

## NIVEL ESTRATÉGICO (cada 5 turnos)

```
┌─────────────────────────────────────┐
│  CALCULAR RUTAS DE VICTORIA         │
│  - Sangre: eliminar unidades clave  │
│  - Emperador: controlar ciudades    │
│  crear caminos, tener caravanas.    │
│  - Gloria: alcanzar puntos          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  ELEGIR RUTA MÁS CORTA              │
│  distancia_meta = f(estado)         │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  DEFINIR DOCTRINA                   │
│  - Aniquilación (poder_ratio > 1.5) │
│  - Desgaste (0.9 < ratio < 1.5)     │
│  - Guerra indirecta (ratio < 0.9)   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  AJUSTAR PESOS GLOBALES             │
│  wS, wE, wM, wT, wC, wR             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  EVALUAR PRESIÓN ACTUAL             │
│  presión = daño_eco + territorio_   │
│           disputado + unidades_sin_ │
│           suministro + amenazas     │
└─────────────────────────────────────┘
           ↓
           SI presión no aumentó → CAMBIAR EJE
```

## NIVEL OPERACIONAL (cada 2 turnos)

```
┌─────────────────────────────────────┐
│  3. ¿TURNO % 2 == 0?                │
│     (Revisión operacional)          │
└─────────────────────────────────────┘
      Sí ↓           No ↓
    ┌────────┐    (continuar)
    │ NIVEL  │
    │OPERACI.│
    └────────┘
           ↓
┌─────────────────────────────────────┐
│  IDENTIFICAR FRENTE ACTIVO          │
│  - donde_esta_enemigo()             │
│  - distancia_a_capital              │
│  - urgencia (crítica/alta/normal)   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  EVALUAR ZONAS DEL MAPA             │
│  V_zona = recursos*1.5              │
│         + cercanía_capital*1.2      │
│         + presencia_enemiga*1.8     │
│         + bottleneck*2.0            │
│         + ciudad*2.5                │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  IDENTIFICAR BOTTLENECKS            │
│  - CRÍTICO: 1 solo paso             │
│  - MEDIO: 2-3 pasos                 │
│  - BAJO: llanura abierta            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  DETECTAR RETAGUARDIA VULNERABLE    │
│  SI >70% ejército enemigo en frente │
│    → oportunidad "Cuchillo Espalda" │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  PRIORIZAR ZONAS (top 3)            │
│  zona_1, zona_2, zona_3             │
└─────────────────────────────────────┘
```

## NIVEL TÁCTICO (cada turno)

```
┌─────────────────────────────────────┐
│  4. GENERAR ACCIONES CANDIDATAS     │
└─────────────────────────────────────┘
           ↓
    ┌──────────────────────────────┐
    │ Por cada unidad propia:      │
    │  - mover                     │
    │  - atacar                    │
    │  - fusionar                  │
    │  - dividir                   │
    │  - defender                  │
    │                              │
    │ Acciones estratégicas:       │
    │  - construir_unidad          │
    │  - construir_infra           │
    │  - investigar                │
    │  - crear_caravana            │
    │  - fundar_ciudad             │
    │  - mejorar_ciudad            │
    └──────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  5. VALIDAR VIABILIDAD              │
│  Por cada acción:                   │
│  ¿Requiere tech? → verificar        │
│  ¿Requiere oro? → verificar         │
│  ¿Requiere recursos? → verificar    │
└─────────────────────────────────────┘
           ↓
     NO viable ↓         SÍ viable ↓
    ┌────────────┐    ┌─────────────┐
    │ DEGRADAR   │    │  PUNTUAR    │
    │ acción →   │    │  acción     │
    │ investigar │    └─────────────┘
    │ tech       │
    └────────────┘
           ↓
┌─────────────────────────────────────┐
│  6. CALCULAR PESO FINAL             │
│  PESO_FINAL = PESO_BASE             │
│             × MULT_CIV              │
│             × MULT_MODO             │
│             × MULT_ORO              │
│             × MULT_TERRITORIO       │
│             × FACTOR_TECH           │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  7. APLICAR JUGADAS TÁCTICAS        │
│  - Martillo (3v1 concentrado)       │
│  - Muralla (defensa posicional)     │
│  - Saqueo (disrupción económica)    │
│  - Cuchillo (retaguardia vulnerable)│
│  - Pinza (flanqueo)                 │
│  - Concentración (fusión urgente)   │
│  - Dispersión (división táctica)    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  8. EVALUAR VALOR FINAL             │
│  Valor_final = Valor_militar        │
│              + Valor_económico      │
│              + Valor_logístico      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  9. ORDENAR ACCIONES POR PESO       │
│  accion_top = max(peso_final)       │
└─────────────────────────────────────┘
```

## DECISIÓN FINAL

```
┌─────────────────────────────────────┐
│  10. ¿ACCIÓN TOP ES INVESTIGAR?     │
└─────────────────────────────────────┘
      Sí ↓                    No ↓
    ┌──────────┐         ┌──────────┐
    │ Investigar│         │ Ejecutar │
    │ tech      │         │ acción   │
    │ requerida │         └──────────┘
    └──────────┘
           ↓                    ↓
┌─────────────────────────────────────┐
│  11. VERIFICAR DÉFICIT REGIMIENTOS  │
│  - Línea combate (3 inf + 2 cab)    │
│  - Asedio (2 art + 1 ing)           │
│  - Raid (2-3 cab ligera)            │
│  - Exploración (2 exploradores)     │
│  - Naval (si enemigo tiene flota)   │
└─────────────────────────────────────┘
           ↓
     ¿Hay déficit? 
      Sí ↓           No ↓
    ┌──────────┐    (continuar)
    │ Construir│
    │ regimiento│
    │ faltante │
    └──────────┘
           ↓
┌─────────────────────────────────────┐
│  12. EJECUTAR ACCIÓN                │
│  - Registrar estado + acción + reward│
│  - Actualizar gameState             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  13. CAPA PSICOLÓGICA               │
│  - Señuelo (unidad débil expuesta)  │
│  - Falsa debilidad (retirada táctica)│
│  - Presión invisible (caravanas)    │
│  - Sobrecarga cognitiva (múltiples  │
│    frentes simultáneos)             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  14. REGISTRAR PARA APRENDIZAJE     │
│  - Estado (oro, ratios, turno)      │
│  - Acción elegida                   │
│  - Resultado (win, daño, unidades)  │
└─────────────────────────────────────┘
```

---

## COORDINACIÓN ENTRE FLUJOS A Y B

```
┌─────────────────────────────────────┐
│  PRIORIDAD DE RECURSOS              │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  ¿Infraestructura económica         │
│   está bajo ataque?                 │
└─────────────────────────────────────┘
      Sí ↓                    No ↓
    ┌──────────┐         ┌──────────┐
    │ FLUJO B  │         │ BALANCE  │
    │ prioridad│         │ 60% A    │
    │ MÁXIMA   │         │ 40% B    │
    │ (defensa)│         └──────────┘
    └──────────┘
           ↓
┌─────────────────────────────────────┐
│  ASIGNACIÓN DE ORO                  │
│  - 50% construcción militar (B)     │
│  - 30% infraestructura (A)          │
│  - 20% reserva emergencias          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  ASIGNACIÓN DE UNIDADES             │
│  - Unidades rápidas → expansión (A) │
│  - Unidades fuertes → frente (B)    │
│  - Unidades escolta → caravanas (A) │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  SINCRONIZACIÓN                     │
│  SI Flujo A construye ciudad nueva  │
│    → Flujo B asigna defensa         │
│  SI Flujo B captura territorio      │
│    → Flujo A construye caminos      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  FIN DE TURNO → pasar al siguiente  │
└─────────────────────────────────────┘
```

### Reglas de Coordinación

1. **Si infraestructura económica atacada → Flujo B protege con prioridad absoluta**
2. **Si oro < 1000 → Flujo A suspende construcciones, Flujo B reduce producción**
3. **Si capturamos ciudad enemiga → Flujo A inmediatamente conecta a red comercial**
4. **Si Flujo B avanza frente → Flujo A expande territorio en retaguardia**
5. **Nunca detener Flujo A completamente, incluso en guerra total**

## ÁRBOL DE DECISIÓN ESPECÍFICA: CONSTRUCCIÓN DE REGIMIENTOS

```
┌─────────────────────────────────────┐
│  NECESITO CONSTRUIR REGIMIENTO?     │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  ANALIZAR CONTEXTO ACTUAL           │
│  - enemigo_en_tierra?               │
│  - enemigo_tiene_flota?             │
│  - tengo_oportunidad_raid?          │
│  - enemigo_en_fortaleza?            │
│  - territorio_desconocido?          │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  CALCULAR DÉFICIT                   │
│  - Línea combate: ¿tengo 3 inf      │
│    pesada + 2 cab + 2 arqueros?     │
│  - Asedio: ¿tengo 2 artillería?     │
│  - Raid: ¿tengo 2-3 cab ligera?     │
│  - Naval: ¿tengo 2-3 pataches?      │
└─────────────────────────────────────┘
           ↓
     ¿Hay déficit urgente?
      Sí ↓           No ↓
    ┌──────────┐    ┌──────────┐
    │ Construir│    │ Evaluar  │
    │ primer   │    │ flexibi- │
    │ déficit  │    │ lidad    │
    └──────────┘    └──────────┘
           ↓              ↓
    ┌──────────┐    ┌──────────┐
    │ ¿Tengo   │    │ ¿Tengo <2│
    │ oro?     │    │ explora- │
    │          │    │ dores?   │
    └──────────┘    └──────────┘
      Sí↓  No↓       Sí↓  No↓
    CONSTRUIR  SKIP  CONSTRUIR  ...
```

## ÁRBOL DE DECISIÓN ESPECÍFICA: FUSIONAR vs DIVIDIR

```
┌─────────────────────────────────────┐
│  TENGO UNIDAD CON MÚLTIPLES REG?    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  DETECTAR AMENAZA INMEDIATA         │
│  ¿Enemigo fuerte en rango 3?        │
└─────────────────────────────────────┘
      Sí ↓                    No ↓
    ┌──────────┐         ┌──────────┐
    │ ¿Mi poder│         │ Evaluar  │
    │ < enemigo│         │ oportuni-│
    │ *1.2?    │         │ dades    │
    └──────────┘         └──────────┘
      Sí↓  No↓              ↓
    FUSIONAR  →       ┌──────────┐
                      │¿3+ recursos│
                      │ cerca sin │
                      │ proteger? │
                      └──────────┘
                        Sí↓  No↓
                      DIVIDIR  →
                               ┌──────────┐
                               │¿Puedo    │
                               │flanquear?│
                               └──────────┘
                                 Sí↓  No↓
                               DIVIDIR MANTENER
```

## FLUJO COMPLETO SIMPLIFICADO

```
CADA TURNO (ejecución paralela):

FLUJO A (ECONÓMICO):
  1. Identificar hexes sin controlar → enviar unidades
  2. Evaluar ciudades sin conexión Banca
  3. Construir caminos faltantes
  4. Producir caravanas/Columnas Suministro
  5. Proteger infraestructura económica
  6. Fundar nuevas ciudades (si oro disponible)
  7. Mejorar ciudades existentes
  8. Registrar métricas: %mapa, caravanas, oro/turno

FLUJO B (TÁCTICO-MILITAR):
  1. SI turno % 5 == 0 → Nivel estratégico (ruta victoria)
  2. SI turno % 2 == 0 → Nivel operacional (zonas)
  3. Generar acciones candidatas
  4. Validar viabilidad (tech + economía)
  5. Calcular peso final
  6. Aplicar jugadas tácticas
  7. Elegir acción mayor peso
  8. Verificar déficit regimientos
  9. Ejecutar acción
 10. Capa psicológica
 11. Registrar para aprendizaje

COORDINACIÓN:
  - Si infraestructura atacada → B defiende primero
  - Si oro < 1000 → ambos reducen gasto
  - Si capturamos ciudad → A conecta inmediatamente
  - Asignar unidades: rápidas (A), fuertes (B)
```

---

## 📋 RESUMEN EJECUTIVO

La IA opera con **DOS MOTORES PARALELOS**:

### Motor A: Económico (Dominio del Mapa)
- **Objetivo:** Controlar 100% del mapa, negar recursos al enemigo
- **Circuito oro:** Ciudad → Camino → Caravana → Banca → +Oro/turno
- **Protección:** Escoltas para caravanas, defensa de caminos
- **Expansión:** Siempre tener unidades capturando hexes neutrales
- **Nunca se detiene, incluso durante guerra total**

### Motor B: Táctico-Militar (Presión y Combate)
- **Objetivo:** Colapsar sistema enemigo, proteger economía propia
- **Estratégico (cada 5 turnos):** Elegir ruta victoria más corta
- **Operacional (cada 2 turnos):** Priorizar zonas del mapa
- **Táctico (cada turno):** Ejecutar jugadas específicas
- **Responde a amenazas, coordina con Motor A**

### Coordinación
- **Infraestructura atacada:** Motor B defiende con prioridad máxima
- **Ciudad capturada:** Motor A conecta inmediatamente a red comercial
- **Oro bajo:** Ambos reducen gasto coordinadamente
- **Unidades:** Rápidas (A - expansión), Fuertes (B - frente), Escolta (A - caravanas)

El resultado: una IA que **piensa en sistemas** (economía + guerra + logística = presión constante), donde:
- **La economía no se detiene** por la guerra
- **La guerra protege y habilita** la economía
- **Ambos flujos maximizan presión** sobre el enemigo simultáneamente

---

## 🧪 INVESTIGACIÓN COMO REQUISITO OPERACIONAL

La IA **no puede ejecutar** acciones que dependan de tecnologías no investigadas. La investigación es **paso previo obligatorio** que habilita unidades e infraestructura críticas (ej. artillería, fortalezas, caminos avanzados). Por tanto, la decisión táctica y económica siempre verifica **gates tecnológicos** antes de asignar pesos finales.

### 1) Validación de viabilidad tecnológica

Antes de puntuar una acción, se valida si la tecnología requerida está desbloqueada. Si no lo está, la acción se degrada o se redirige a investigación.

```
function esAccionViable(accion) {
  let techRequerida = accion.techRequerida;
  if (!techRequerida) return true;
  return tecnologiasInvestigadas.includes(techRequerida);
}

function evaluarAccion(accion) {
  if (!esAccionViable(accion)) {
    return { tipo: 'investigar', tech: accion.techRequerida, peso: 1400 };
  }
  return accion; // continúa evaluación normal
}
```

### 2) Factor de investigación en la utilidad global

Se introduce un factor de investigación como **limitador y acelerador**:

```
R = (techs_clave_desbloqueadas / techs_clave_totales)

U_total = wS*S + wE*E + wM*M + wT*T + wC*C + wR*R
```

Esto evita que la IA intente “forzar” tácticas inviables y empuja a desbloquear el set mínimo para su doctrina.

### 3) Priorización de investigación según economía

La investigación también depende de la capacidad real de **producir** lo investigado:

```
if (oro_proyectado_3T < costo_unidad_clave) {
  // no tiene sentido investigar artillería si no puedo producirla
  prioridad_investigacion_artilleria *= 0.4;
}

if (researchPoints > umbral && turno < 30) {
  prioridad_investigacion += 0.3; // ventana de ROI alto
}
```

### 4) Mapa rápido de dependencias críticas

| Unidad/Infraestructura | Tech requerida | Motivo |
|---|---|---|
| Artillería | SIEGE_CRAFT | Asedio, rompe fortalezas |
| Fortaleza | FORTIFICATIONS | Defensa profunda |
| Caminos | ENGINEERING | Logística + comercio |
| Atalaya | RECONNAISSANCE | Visión y control |
| Ciudad/Aldea | COLONY | Escala económica |

### 5) Regla de coherencia táctica

Si la IA decide un plan que exige una unidad/infrastructure no disponible, **el plan se convierte en una cadena**:

```
plan = [investigar_tech, construir_infra, producir_unidad, ejecutar_tactica]
```

Esto alinea investigación → economía → producción → táctica.

## 🎮 COMPORTAMIENTO RESULTANTE

La IA:
- Usa economía como arma militar
- Usa geografía como arma logística
- Mantiene presión constante
- Planea guerras por fases
- Engaña al jugador
- Sabe cuándo esperar y cuándo atacar

## 📌 DEFINICIÓN FINAL

Esta IA no juega turnos. Dirige una guerra sistémica continua hasta forzar el colapso del enemigo.

---

## 10) Adaptación por civilización (basada en bonos reales)
La IA **lee sus propios bonus** y ajusta tácticas:

- **Roma:** fortificación y control seguro; abusa de bonus defensa infantería (+20) en posiciones fortificadas.
- **Grecia:** infantería ligera en terreno favorable (+20 defensa + movimiento); evitar llanuras abiertas.
- **Cartago:** dominar agua y barcos; usar Pataches (+visión) para flanqueo naval; proteger rutas.
- **Egipto:** arqueros (+20 ataque +1 rango) en colinas/bosque para máximo daño.
- **Galia:** caballería pesada (+20 ataque) para flanqueos y golpes devastadores.
- **Germania:** infantería ligera (+20 defensa) en bosques para defensa impenetrable.
- **Britania:** arqueros defensivos (+20 defensa) en segunda línea; flota gana XP rápido.
- **Iberia:** buscar montañas; infantería ligera (+40 ataque) en terreno elevado es mortal.
- **Persia:** conservar unidades caras (sin upkeep oro); presión sostenida sin coste.
- **China:** arqueros + arcabuceros (+20 cada uno); línea de fuego devastadora.
- **Vikingos:** infantería ligera (+20 ataque +1 mov) para incursiones relámpago.
- **Mongol:** caballería ligera (+1 mov) y arqueros a caballo (+1 mov); hostigar y retirarse, nunca combate frontal.
- **Arábiga:** caballería ligera (+20 ataque) para saqueos y flanqueos en desierto/llanura.
- **Mameluca:** ejército caro sin upkeep; todas unidades élite, nunca cambio desfavorable.
- **Otomana:** asedio y artillería (+20 ataque); romper fortalezas desde distancia segura.
- **Maya:** arquería (+20 ataque) con XP rápida; veteranizar rápido para dominio.
- **ninguna:** comportamiento neutro.
- **Asiria:** artillería (+40 ataque) para asedios brutales; infantería pesada (+moral damage) para romper líneas.
- **Babilonia:** economía/tecnología primero (+25% research); luego unidades élite.
- **Japón:** defensa disciplinada (+5 iniciativa infantería); moral resistente (-25% pérdida); nunca huir.
- **Bárbaros:** hostigamiento básico.

**Táctica de terreno por civ:**
- **Iberia/Germania:** priorizar montañas/bosques (bonus defensa + bonus civ)
- **Galia/Mongolia:** llanuras abiertas (movilidad máxima)
- **Egipto/Maya:** colinas (altura + rango)
- **Cartago/Britania:** costa/agua (dominio naval)

**Táctica de retaguardia por civ:**
- **Vikingos:** infiltración rápida (infantería ligera +mov), destruir caminos y huir
- **Mongolia:** caravanas enemigas objetivo prioritario (caballería rápida)
- **Arábiga:** ataque relámpago en desierto, cortar rutas comerciales
- **Cartago:** bloqueo naval de puertos enemigos (cortar comercio marítimo)
- **Roma:** asegurar caminos capturados, construir fortificaciones en retaguardia enemiga

**Prioridad de investigación por civ:**
- **Grecia:** +20% research → priorizar Universidad early (max ROI)
- **China:** +1 research/ciudad → construir muchas ciudades, luego Bibliotecas
- **Egipto:** Bibliotecas -30% costo → construir en TODAS las ciudades (spam)
- **Roma:** Ingeniería primero (fortalezas + caminos mejorados)
- **Mongolia:** Crianza Caballos → Caballería Pesada (core strategy)
- **Persia:** Investigación balanceada (bonus +10% research + oro)
- **Babilonia:** Comienza con Escritura gratis → rush Universidad turno 10

**Táctica de fusión/división por civ:**
- **Roma:** fusión prioritaria (legiones masivas, +20 defensa infantería se multiplica en stacks)
- **Mongolia:** división extrema (caballería rápida dispersa, hostigamiento múltiple)
- **Grecia:** división táctica (falange necesita formación amplia para rodear)
- **Germania:** fusión en bosques (emboscada con fuerza concentrada)
- **Vikingos:** división para raids (múltiples ataques simultáneos en retaguardia)
- **Egipto:** fusión de arqueros (volley masivo desde colinas)
- **Cartago:** división naval (bloquear múltiples puertos simultáneamente)
- **Galia:** fusión de caballería en llanuras (carga masiva devastadora)
- **Persia:** balanceado (fusionar infantería pesada, dividir caballería ligera)
- **China:** división máxima (saturar mapa con muchas unidades pequeñas)

---

## 11) Presión constante (Factor Reto Real)

- **Economía de guerra:** no acumular oro salvo ahorro explícito.
- **Intercambio rentable:** sacrificar unidades baratas por piezas caras del rival.
- **Ataques de presión:** forzar errores del jugador humano.

---

## 12) Estrategia económica (proyección de oro)

### 12.1 Concepto: la IA debe "ver el futuro" (oro + territorio)

**Proyección económica:**
```
ORO_PROYECTADO_3T = oro_actual + (ingresos_por_turno × 3) - (upkeep × 3)
TERRITORIO_PROYECTADO = territorio_actual + expansion_esperada - territorio_perdido
```

**Alertas críticas:**
- Si `ORO_PROYECTADO_3T < 500`: crisis económica → conquistar ciudades enemigas (dan oro inmediato)
- Si `territorio_ratio < 0.5`: crisis territorial → ofensiva total con todas las unidades
- Si ambos críticos: **ataque suicida** → gastar todo en una ofensiva masiva (si voy a perder, que sea luchando)

### 12.2 Investigación como inversión económica

**Cálculo de ROI (Return on Investment) de investigación:**
```javascript
ROI_investigacion = (research_generado_total × valor_por_RP) / costo_construccion

Ejemplo: Biblioteca (costo 400 oro, +5 RP/turno, quedan 80 turnos)
ROI = (5 × 80 × 2) / 400 = 800 / 400 = 2.0 → RENTABLE (doble retorno)

Ejemplo: Universidad (costo 1200 oro, +15 RP/turno, quedan 80 turnos)
ROI = (15 × 80 × 2) / 1200 = 2400 / 1200 = 2.0 → RENTABLE
```

**Reglas:**
- Si `ROI > 2.0` y `oro > costo × 1.5` → CONSTRUIR
- Si `turno < 20` → priorizar investigación (más tiempo para amortizar)
- Si `turno > 70` → NO construir (poco tiempo restante)
- Si `civilización = Grecia/Egipto/China` → ROI aumenta +30%

### 12.3 Construcción de ciudades (fundación)

**Cuándo fundar ciudad:**
- Si controlo <3 ciudades → **prioridad ALTA** (necesito economía base)
- Si `ORO_PROYECTADO > 2000` → puedo permitirme el coste
- Si detecto zona con 3+ recursos cercanos → ubicación ideal

**Proceso:**
1. Crear Colono (oro 4000, comida 50)
2. Mover Colono a hex óptimo (plains/hills con recursos cercanos)
3. Fundar Aldea (oro 2000 adicional)
4. **Resultado:** +60 oro/turno base, +100 por cada recurso conectado

### 12.3 Construcción de ciudades (fundación)

**Cuándo fundar ciudad:**
- Si controlo <3 ciudades → **prioridad ALTA** (necesito economía base)
- Si `ORO_PROYECTADO > 2000` → puedo permitirme el coste
- Si detecto zona con 3+ recursos cercanos → ubicación ideal

**Proceso:**
1. Crear Colono (oro 4000, comida 50)
2. Mover Colono a hex óptimo (plains/hills con recursos cercanos)
3. Fundar Aldea (oro 2000 adicional)
4. **Resultado:** +60 oro/turno base, +100 por cada recurso conectado

**Cálculo de retorno:**
- Coste total: 6000 oro
- Ingreso: ~200 oro/turno (con 2 recursos)
- Recuperación: 30 turnos
- **Decisión:** si el juego durará >30 turnos, es rentable

### 12.4 Rutas comerciales y Banca

**Sistema de Banca (comercio):**
- Cada ciudad puede establecer 1 ruta comercial con la Banca
- **Requisito:** camino conectado hasta la capital o ciudad con Puerto
- **Ingreso:** +50 oro/turno por ruta activa

**Prioridad de la IA:**
1. Identificar ciudades sin ruta a Banca
2. Calcular camino más corto (tierra o agua)
3. Construir Caminos si faltan (coste: piedra 100, madera 100 por hex)
4. Si es costa: construir Puerto (oro 100, income +100)
5. Activar ruta comercial

**Ejemplo:**
```
Ciudad A (sin ruta) → 5 hexes hasta capital
Coste: 5 hex × 200 (piedra+madera) = 1000 recursos
Beneficio: +50 oro/turno
Recuperación: 20 turnos
```

### 12.4 Caravanas (Columna de Suministro)

**Uso estratégico:**
- **Coste:** oro 300, upkeep 20
- **Capacidad:** 400 de carga (comida, oro, recursos)
- **Función:** transportar recursos entre ciudades o al frente

**Cuándo crear caravana:**
- Si tengo ciudad rica en oro pero pobre en comida → caravana lleva comida
- Si ejército en el frente sufre atrición → caravana lleva suministros
- Si quiero vender recursos en Banca → caravana transporta

**Jugada "Convoy Protegido":**
- IA crea caravana + 2 unidades de escolta
- Mueve convoy hacia zona de interés
- Si caravana es atacada, escoltas interceptan

### 12.5 Mejora de ciudades (escalar economía)

**Jerarquía:**
- Aldea (oro 2000) → +60 oro/turno, límite 10 regimientos
- Ciudad (oro 5000) → +100 oro/turno, límite 20 regimientos
- Metrópoli (oro 10000) → +200 oro/turno, límite 40 regimientos

**Decisión de upgrade:**
```
Si (oro_actual > 5000 Y ingresos_totales > 300 Y aldea existe):
  Mejorar a Ciudad
  Razón: duplica capacidad militar + aumenta ingresos
```

**Prioridad:** ciudades en posiciones estratégicas (cerca de recursos, en frontera) se mejoran primero.

---

## 13) Adaptación económica por civilización

- **Cartago:** prioriza rutas comerciales ×3, construye Puertos antes que Fortalezas
- **Babilonia:** invierte en investigación primero, luego infraestructura
- **Roma:** construye ciudades agresivamente para sostener ejércitos grandes
- **Persia:** como no paga upkeep de oro, invierte todo en infraestructura
- **Mameluca:** como no paga upkeep, puede mantener ejército enorme sin ciudades

---

## 14) Integración rápida (resumen completo)

1) **Motor de Ambición:** elegir ruta más corta de victoria
2) **Proyección económica:** calcular oro en 3 turnos
3) **Construcción proactiva:** fundar ciudades si oro proyectado es positivo
4) **Rutas comerciales:** conectar todas las ciudades a Banca
5) **Caravanas:** transportar recursos críticos al frente
6) **Jugadas tácticas:** Martillo/Muralla/Saqueo según situación
7) **Sesgo civilización:** explotar bonos propios
8) **Presión constante:** gastar oro, no acumular

---

Si quieres ajustar cualquier regla o añadir más estrategias económicas, lo incorporo aquí mismo.