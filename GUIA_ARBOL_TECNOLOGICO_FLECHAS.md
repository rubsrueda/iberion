# Guía Simple del Árbol Tecnológico (con flechas)

Objetivo: ver rápido cómo avanza el árbol y qué mecánica cambia cada investigación.

## 1) Mapa visual rápido (flujo con flechas)

### Núcleo inicial
ORGANIZATION
- Base de todo.

Desde aquí salen casi todas las ramas:

ORGANIZATION -> AGRICULTURE
ORGANIZATION -> ENGINEERING
ORGANIZATION -> MINING
ORGANIZATION -> DRILL_TACTICS
ORGANIZATION -> FLETCHING
ORGANIZATION -> ANIMAL_HUSBANDRY
ORGANIZATION -> RECONNAISSANCE
ORGANIZATION -> FORESTRY
ORGANIZATION -> MASONRY
ORGANIZATION -> SELECTIVE_BREEDING

### Rama Economía / Infraestructura
MINING -> PROSPECTING
MINING -> IRON_WORKING

ENGINEERING -> FORTIFICATIONS
ENGINEERING -> SIEGE_CRAFT
ENGINEERING -> NAVIGATION
ENGINEERING -> COLONY
ENGINEERING + PROSPECTING -> STATE_CENSUS
ENGINEERING + IRON_WORKING -> FORGE_STANDARDIZATION

FORGE_STANDARDIZATION + FORTIFICATIONS -> CENTRAL_EQUIPMENT_POOL

### Rama Militar
DRILL_TACTICS -> LEADERSHIP
DRILL_TACTICS -> MEDICINE
DRILL_TACTICS + ENGINEERING -> SIEGE_CRAFT

MEDICINE + IRON_WORKING -> GUNPOWDER
MEDICINE + FORTIFICATIONS -> INFRASTRUCTURE_LOGISTICS

ANIMAL_HUSBANDRY + IRON_WORKING -> STIRRUPS
STIRRUPS + FLETCHING -> MOUNTED_ARCHERY

LEADERSHIP + STATE_CENSUS -> CONTRACT_CODIFICATION

### Rama Naval
FORESTRY + ENGINEERING -> NAVIGATION

---

## 2) Impacto mecánico por tecnología (punto por punto)

### T0
- ORGANIZATION
  - Influye en: desbloqueo base de juego.
  - Efecto: habilita el arranque tecnológico y unidades básicas (Infantería Ligera, Columna de Suministro).

### T1
- AGRICULTURE
  - Influye en: reclutamiento temprano defensivo.
  - Efecto: desbloquea Pueblo.

- ENGINEERING
  - Influye en: movilidad estratégica y desarrollo.
  - Efecto: desbloquea Ingenieros y estructura Camino.

- MINING
  - Influye en: economía mineral.
  - Efecto: habilita progresión a Prospección y Herrería.

- DRILL_TACTICS
  - Influye en: potencia militar de línea.
  - Efecto: desbloquea Infantería Pesada y Cuartel General.

- LEADERSHIP
  - Influye en: capa de mando y sinergias de generales.
  - Efecto: habilita progresión doctrinal de mando.

- FLETCHING
  - Influye en: daño a distancia temprano.
  - Efecto: desbloquea Arqueros.

- ANIMAL_HUSBANDRY
  - Influye en: movilidad ofensiva.
  - Efecto: desbloquea Caballería Ligera.

- RECONNAISSANCE
  - Influye en: información táctica y control de visión.
  - Efecto: desbloquea Explorador y Atalaya.

- FORESTRY
  - Influye en: economía de madera.
  - Efecto: bonifica producción maderera y habilita rama naval.

- MASONRY
  - Influye en: economía de piedra.
  - Efecto: bonifica producción de piedra.

- SELECTIVE_BREEDING
  - Influye en: sostenimiento del ejército.
  - Efecto: bonifica producción de comida.

### T2
- PROSPECTING
  - Influye en: economía de oro.
  - Efecto: bonifica producción de oro.

- IRON_WORKING
  - Influye en: economía de hierro y escalado militar.
  - Efecto: bonifica hierro; prerequisito clave de Pólvora/Estribos/Forja.

- NAVIGATION
  - Influye en: proyección marítima.
  - Efecto: desbloquea Patache y Barco de Guerra.

- FORTIFICATIONS
  - Influye en: defensa territorial y nodos de soporte.
  - Efecto: desbloquea Fortaleza.

- MEDICINE
  - Influye en: transición a guerra de pólvora y resiliencia.
  - Efecto: desbloquea Hospital de Campaña; prerequisito de Logística de Infraestructura y Pólvora.

- SIEGE_CRAFT
  - Influye en: ruptura de posiciones fortificadas.
  - Efecto: desbloquea Artillería.

- STIRRUPS
  - Influye en: choque de caballería pesada.
  - Efecto: desbloquea Caballería Pesada.

### T3+
- GUNPOWDER
  - Influye en: pico ofensivo de media partida.
  - Efecto: desbloquea Arcabuceros.

- MOUNTED_ARCHERY
  - Influye en: hostigamiento móvil.
  - Efecto: desbloquea Arqueros a Caballo.

- COLONY
  - Influye en: crecimiento territorial y macroeconomía.
  - Efecto: desbloquea Colono y evolución urbana (Aldea/Ciudad/Metrópoli).

- STATE_CENSUS
  - Influye en: estabilidad económica y planeación.
  - Efecto mecánico:
    - Sin censo: el oro de ciudad fluctúa (0.5 a 1.0).
    - Con censo: desaparece la aleatoriedad y se muestra previsión exacta de oro T+1 en UI.

- FORGE_STANDARDIZATION
  - Influye en: logística de reemplazo.
  - Efecto mecánico: parte del prerequisito para activar refuerzo automático.

- CENTRAL_EQUIPMENT_POOL
  - Influye en: recuperación pasiva de divisiones.
  - Efecto mecánico (junto con Forja):
    - En fin de turno, si una unidad está a distancia <= 5 de Ciudad/Fortaleza propia y hay oro suficiente,
    - se paga oro y se recupera 20% de HP de un regimiento dañado.
    - visual: aparece una mini cruz verde sobre la unidad reforzada.

- CONTRACT_CODIFICATION
  - Influye en: disciplina, moral y coste estructural.
  - Efecto mecánico:
    - Eventos de lealtad cada 10 turnos de unidad (turnsActive).
    - Sin contratos: 70% evento negativo (bloqueo de movimiento o caída de moral).
    - Con contratos: 70% evento positivo (veteranía XP o recuperación de moral).
    - Aplica mejora global anti-corrupción en upkeep.

- INFRASTRUCTURE_LOGISTICS
  - Influye en: supervivencia post-combate.
  - Efecto mecánico:
    - Si un regimiento cae a 0 HP y hay Ciudad propia en radio 5: recupera 10%.
    - Si hay Fortaleza propia en radio 5: recupera 5%.

---

## 3) Lectura estratégica rápida: “desbloquear el mapa”

Para sentir que abres el mapa por capas:

- Capa 1 (movilidad y control): ENGINEERING -> FORTIFICATIONS -> COLONY
- Capa 2 (economía estable): MINING -> PROSPECTING -> STATE_CENSUS
- Capa 3 (presencia total): FORESTRY + ENGINEERING -> NAVIGATION
- Capa 4 (sostenimiento del frente): IRON_WORKING + ENGINEERING -> FORGE_STANDARDIZATION -> CENTRAL_EQUIPMENT_POOL
- Capa 5 (resiliencia militar): DRILL_TACTICS -> MEDICINE -> INFRASTRUCTURE_LOGISTICS

Con este orden, el jugador nota avance tangible en expansión, ingresos predecibles, alcance naval y recuperación del ejército.

---

## 4) Versión ultra resumida (1 página)

### Ruta recomendada en 5 pasos
1. ENGINEERING -> FORTIFICATIONS -> COLONY
2. MINING -> PROSPECTING -> STATE_CENSUS
3. FORESTRY + ENGINEERING -> NAVIGATION
4. IRON_WORKING + ENGINEERING -> FORGE_STANDARDIZATION -> CENTRAL_EQUIPMENT_POOL
5. DRILL_TACTICS -> MEDICINE -> INFRASTRUCTURE_LOGISTICS

### Qué desbloquea cada capa
- Capa 1 (mapa): más movilidad, más defensa, más expansión urbana.
- Capa 2 (economía): oro más fuerte y estable, con previsión T+1.
- Capa 3 (proyección): control del mar y alcance estratégico total.
- Capa 4 (sostenimiento): refuerzo automático del ejército cerca de infraestructura.
- Capa 5 (aguante): recuperación de bajas en combate y menor colapso del frente.

### Si quieres priorizar combate rápido
ORGANIZATION -> DRILL_TACTICS -> MEDICINE + IRON_WORKING -> GUNPOWDER

### Si quieres priorizar control del territorio
ORGANIZATION -> ENGINEERING -> FORTIFICATIONS -> COLONY

### Si quieres priorizar economía segura
ORGANIZATION -> MINING -> PROSPECTING -> STATE_CENSUS
