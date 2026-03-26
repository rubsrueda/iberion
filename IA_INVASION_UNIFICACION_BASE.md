# IA Invasión Unificada

Documento base para sustituir la IA básica por un único motor de decisiones centrado en Invasión, reutilizable tanto para desarrollo de IA como para tutorial, validación de diseño y futura extracción de reglas a configuración externa.

## 1. Objetivo

La meta es eliminar la coexistencia de dos modelos mentales distintos:

- IA básica: resuelve acciones locales, reacciona tarde y suele mover por oportunidad inmediata.
- IA Invasión: piensa en supervivencia, economía, rutas, producción, expansión y sabotaje como un solo sistema.

La decisión estratégica es unificar el juego sobre un único motor:

- Un solo lenguaje de prioridades.
- Un solo sistema de objetivos.
- Un solo criterio de evaluación.
- Un solo modelo explicable para tutorial y depuración.

Este documento no propone tocar código todavía. Define la base conceptual que después debe reflejarse en el motor, la UI de depuración, el tutorial y la tabla de pesos configurable.

## 2. Resumen Ejecutivo

La IA unificada debe dejar de preguntarse solo “qué unidad muevo ahora” y empezar por “qué necesito para no perder y cómo gano por economía, red y puntos”.

La IA Invasión debe convertirse en el núcleo general porque ya se acerca más a ese enfoque:

- Gestiona imperio, no solo microtáctica.
- Combina producción, construcción, investigación y movimiento.
- Permite pensar en rutas, banca, caminos, fortalezas y presión territorial.
- Es más fácil de explicar al jugador y de enseñar en tutorial porque sigue prioridades reconocibles.

La IA básica debe considerarse legado. Puede mantenerse solo como referencia histórica/documental hasta completar la migración.

## 3. Comparativa: IA básica vs IA Invasión

## 3.1 IA básica

Patrón dominante:

- Toma decisiones de corto alcance.
- Evalúa amenazas y oportunidades locales.
- Funciona aceptablemente cuando el mapa y el objetivo son simples.
- Tiene tendencia a parecer errática cuando no existe una amenaza inmediata visible.

Limitaciones estructurales:

- No prioriza la economía como motor de victoria.
- No entiende la red logística como sistema principal.
- Puede mover unidades “porque sí” si no encuentra un objetivo fuerte.
- No separa claramente supervivencia, economía, sabotaje y conquista.
- Es difícil de enseñar en tutorial porque su lógica parece oportunista, no pedagógica.

Síntomas típicos:

- Unidades vagando sin propósito claro.
- Ataques prematuros contra objetivos poco rentables.
- Falta de construcción de caminos y caravanas sostenida.
- Escasa lectura del oro futuro.
- Mala capacidad para cortar el crecimiento rival antes de asediar ciudades.

## 3.2 IA Invasión

Patrón dominante:

- Evalúa el estado global del imperio.
- Puede enlazar producción, infraestructura y acción militar.
- Tiene una base mejor para planificar expansión y consolidación.
- Encaja mejor con una IA basada en misiones y prioridades.

Fortalezas para ser el motor único:

- Ya opera como gestor de turnos completo.
- Es compatible con protocolos de defensa, apertura y presión.
- Permite evolucionar hacia objetivos de valor en lugar de movimiento aleatorio.
- Su modelo se puede traducir a tutoriales, pesos y telemetría.

Riesgos a controlar:

- Si no se formalizan prioridades, puede seguir mezclando heurísticas dispersas.
- Si los pesos siguen embebidos en código, ajustar comportamiento seguirá siendo caro.
- Si no se hace visible la razón de cada acción, el tutorial no podrá explicar el sistema.

## 3.3 Decisión de diseño

La IA básica no debe mejorar ni ampliarse.

La ruta correcta es:

1. Convertir IA Invasión en el único marco de decisión.
2. Extraer prioridades y pesos a datos configurables.
3. Hacer que el tutorial lea ese mismo lenguaje de prioridades.
4. Hacer que la depuración muestre qué nodo y qué regla dispararon cada acción.

## 4. Principio Rector

La IA no debe mover unidades al azar. Debe operar sobre Nodos de Valor.

Un Nodo de Valor es cualquier objetivo del mapa que cambie la probabilidad de victoria en uno de estos ejes:

- Supervivencia.
- Economía.
- Sabotaje.
- Control territorial.
- Puntuación.
- Logística.

Cada turno, la IA debe responder en este orden:

1. ¿Cómo evito perder este turno o en los próximos pocos turnos?
2. ¿Qué acción mejora mi economía sostenida?
3. ¿Qué acción empeora la economía enemiga?
4. ¿Qué acción mejora mi marcador o bloquea el suyo?
5. Solo después, ¿qué ataque directo merece la pena?

## 5. Jerarquía de Prioridades

## 5.1 Prioridad 1: Supervivencia

Regla base:

- La IA debe mantener al menos una unidad viva en el mapa.

Regla crítica:

- La ciudad natal es el equivalente al rey en ajedrez.
- Si cae la ciudad natal, la partida está perdida o entra en estado crítico irreversible.

Consecuencias de diseño:

- Defender ciudad natal está por encima de expandir, sabotear o atacar.
- Si hay conflicto entre una acción rentable y la defensa de la ciudad natal, se defiende.
- Cambiar la ciudad capital, moverla a otra no amenazada.
- Gastar los recursos en crear, o bien unificar divisiones, para asegurar la defensa.
- Si solo queda una unidad, esa unidad deja de comportarse como atacante oportunista y pasa a protocolo de preservación.

Preguntas que debe hacerse el motor:

- ¿Tengo otra ciudad que convertir en capital, menos amenazada, para cambiar capital?
- ¿Tengo al menos una unidad segura tras esta acción?
- ¿Tengo Divisiones y regimientos que pueda unir para producir una división con regimientos que gane al enemigo que ataca capital?
- ¿Tengo recursos para producir una división con regimientos que gane al enemigo que ataca capital?
- ¿La ciudad natal puede ser alcanzada o aislada?
- ¿Necesito producir una unidad de emergencia en vez de atacar?

## 5.2 Prioridad 2: Economía

Regla base:

- Si el Oro es menor que el coste de producir una unidad útil, la IA debe priorizar restaurar su capacidad económica.

Objetivos económicos principales:

- Banca.
- Ciudades libres.
- Caminos.
- Caravanas.
- Conectividad entre ciudades propias.
- Eliminar conectividad entre ciudades enemigas con otras ciudades y la banca.
- Destruir divisiones enemigas donde se gane con seguridad.
- Aislar divisiones enemigas, que se queden sin comunicación (recursos) para destruirlas en el futuro.



Principio estratégico:

- El oro a largo plazo lo define la red, no el combate aislado.

Conducta esperada:

- Abrir rutas hacia Banca o ciudades libres.
- Construir caminos que sostengan caravanas.
- Asegurar continuidad entre núcleos propios.
- Defender caravanas si sostienen la economía del siguiente ciclo.
- Preferir asegurar ingreso antes que atacar una ciudad enemiga si el ataque no resuelve la partida.
- Buscar romper estos mismos puntos en el enemigo, que no construya caminos, destruirlos, destruir sus caravanas, que no obtengan ingresos.

## 5.3 Prioridad 3: Sabotaje

Regla base:

- Si el rival tiene una ruta comercial activa, la IA debe localizar el eslabón rompible más cercano y cortarlo.

Objetivos de sabotaje:

- Casillas de Camino críticas.
- Caravanas enemigas.
- Nodos que conectan Banca con ciudades.
- Enlaces entre ciudades del rival.

Principio estratégico:

- Cortar el flujo económico enemigo antes de atacar la capital puede ser más rentable que un asalto frontal.

Conducta esperada:

- Buscar el tramo más barato de romper.
- Priorizar interrupción de rutas de alto rendimiento.
- Mantener presión económica constante.
- Forzar al enemigo a gastar en reparar y defender en lugar de crecer.

## 5.4 Prioridad 4: Control territorial y puntuación

Una vez garantizadas supervivencia, economía y sabotaje:

- capturar ciudades,
- asegurar recursos,
- consolidar terreno,
- y subir el marcador por puntos

deben evaluarse con el mismo marco de Nodos de Valor.

La captura territorial deja de ser “avanzar por avanzar” y pasa a ser “tomar lo que mejora la red, el marcador o el bloqueo del rival”.

## 6. Sistema de Nodos de Valor

## 6.1 Tipos de nodo

El motor único debe reconocer como mínimo estos nodos:

- Ciudad natal propia.
- Última unidad propia segura.
- Ciudades propias conectadas o desconectadas.
- Banca.
- Ciudades libres.
- Caminos propios críticos.
- Caminos enemigos críticos.
- Caravanas propias.
- Caravanas enemigas.
- Recursos estratégicos.
- Ciudades enemigas.
- Cuellos de botella geográficos.

## 6.2 Atributos mínimos por nodo

Cada nodo debe poder evaluarse con una ficha homogénea:

- tipo_nodo
- propietario
- valor_base
- valor_economico
- valor_logistico
- valor_puntuacion
- valor_supervivencia
- valor_sabotaje
- distancia
- riesgo
- conectividad
- turnos_estimados_para_afectar

## 6.3 Pregunta central

La IA no debe elegir “mover unidad A a hexágono B” como primera decisión.

Debe elegir primero:

- qué nodo importa más este turno,
- por qué importa,
- y qué acción disponible produce más impacto sobre ese nodo.

## 7. Bucle de Decisión Deseado

El motor único debe entenderse así:

1. Leer estado global.
2. Identificar nodos de valor propios, neutrales y enemigos.
3. Asignar peso según modo de juego y estado actual.
4. Ordenar nodos por prioridad real.
5. Traducir cada nodo prioritario en misiones.
6. Asignar unidades, producción e infraestructura a esas misiones.
7. Ejecutar acciones.
8. Registrar motivo de cada decisión para depuración y tutorial.

Esto permite explicar la IA en frases comprensibles:

- Defiendo mi ciudad natal.
- Restauro oro construyendo ruta a la banca.
- Corto el camino enemigo para frenar su economía.
- Capturo esta ciudad porque ya aseguré mi red.

Insertar esta explicación de la IA en la Crónica y los eventos.

## 8. Modos de Juego y Comportamiento Esperado

La IA Invasión unificada debe adaptarse por pesos, no por motores distintos.

Eso implica:

- El modo cambia la importancia relativa de nodos y acciones.
- El motor sigue siendo el mismo.
- La explicación tutorial también sigue siendo la misma.

Ejemplo conceptual:

- En Invasión, ciudad natal y presión logística pesan más.
- En puntos, sube el peso de ciudad, tecnología, recursos y supervivencia sostenida.
- En tutorial, el motor puede ejecutarse en modo explicativo mostrando por qué elige cada nodo.

## 9. Criterio de Éxito de la Unificación

La IA unificada debe superar una prueba funcional simple:

- construir caminos,
- crear y sostener caravanas,
- producir oro,
- intentar cortarte el camino a la banca,
- intentar cortar la conexión entre tus ciudades,
- y solo después priorizar atacar tu ciudad,

salvo que exista una oportunidad inmediata de victoria o una amenaza crítica sobre su propia supervivencia.

Si en la práctica sigue lanzándose a la capital enemiga ignorando economía y red, la unificación no está lograda.

## 10. Tutorial y Explicabilidad

Este documento también debe servir al tutorial.

Por tanto, cada acción importante del motor debe poder resumirse con una etiqueta entendible:

- Defender ciudad natal.
- Mantener una unidad viva.
- Abrir ingreso de oro.
- Proteger ruta comercial.
- Sabotear ruta rival.
- Reconectar ciudades.
- Capturar recurso clave.
- Presionar ciudad enemiga.

El tutorial no debería enseñar “la IA hace trampas” ni “la IA mueve según una fórmula oculta”.

Debe enseñar:

- qué considera valioso,
- por qué protege unas cosas antes que otras,
- y cómo el jugador puede anticiparla o contrarrestarla.

## 11. Extracción de la Tabla de Reglas

## 11.1 Problema actual

Mientras los pesos estén hardcoded, cada ajuste exige tocar lógica de juego. Eso bloquea:

- balance rápido,
- pruebas A/B,
- depuración visible,
- tutorial dinámico,
- y ajuste por modo sin riesgo de regresión.

## 11.2 Objetivo

La tabla de reglas debe vivir en un archivo externo JSON o CSV.

Ese archivo debe definir, como mínimo:

- puntos_por_ciudad
- puntos_por_unidad_destruida
- puntos_por_tecnologia
- multiplicador_recurso_comida
- multiplicador_recurso_hierro
- multiplicador_recurso_oro

Y, por extensión natural, debería poder crecer para incluir:

- pesos por nodo,
- pesos por modo,
- multiplicadores por fase,
- umbrales de supervivencia,
- valor de cortar rutas,
- valor de proteger caravanas,
- y penalización por dejar desconectada la ciudad natal.

## 11.3 Requisitos funcionales del archivo de configuración

La configuración externa debe cumplir estas propiedades:

- legible por humano,
- editable sin recompilar todo el juego,
- recargable en runtime,
- visible desde herramientas de debug,
- reutilizable por la IA y por la UI del marcador,
- y compatible con tutorial o panel explicativo.

## 11.4 Ejemplo conceptual mínimo

```json
{
  "victoria_puntos": {
    "puntos_por_ciudad": 100,
    "puntos_por_unidad_destruida": 20,
    "puntos_por_tecnologia": 35,
    "multiplicador_recurso_comida": 0.5,
    "multiplicador_recurso_hierro": 0.8,
    "multiplicador_recurso_oro": 1.2
  }
}
```

Este ejemplo no fija formato definitivo. Solo define el tipo de desacoplamiento deseado.

## 11.5 Criterio de éxito para la tabla de reglas

Debe ser posible cambiar el valor de puntos_por_ciudad en ese archivo y observar cómo cambia el marcador J1/J2 en tiempo real, sin recompilar todo el juego.

Eso implica una consecuencia importante de arquitectura:

- la UI del marcador,
- la IA,
- y cualquier sistema de evaluación de victoria

deben leer la misma fuente de verdad.

## 12. Arquitectura Objetivo a Futuro

Sin entrar aún en implementación, la arquitectura deseada queda así:

### Capa 1: Estado del juego

- tablero
- unidades
- ciudades
- caravanas
- caminos
- banca
- recursos
- puntuación

### Capa 2: Lectura estratégica

- detector de nodos de valor
- detector de conectividad
- detector de rutas comerciales
- detector de amenazas críticas
- detector de oportunidades de sabotaje

### Capa 3: Tabla de reglas externa

- pesos de puntuación
- multiplicadores de recursos
- pesos por modo
- pesos por nodo
- umbrales de comportamiento

### Capa 4: Motor unificado IA Invasión

- priorización
- generación de misiones
- asignación de acciones
- justificación de decisiones

### Capa 5: Presentación

- marcador en tiempo real
- debug AI
- tutorial explicativo
- herramientas de balance

## 13. Decisiones de Diseño que Este Documento Fija

- La IA básica deja de ser el futuro del proyecto.
- IA Invasión se convierte en el marco único.
- La unidad de decisión no es la unidad militar aislada, sino el nodo de valor.
- Supervivencia y ciudad natal tienen prioridad absoluta.
- Economía basada en banca, caminos y caravanas antecede al asalto frontal.
- Sabotear la economía rival es una prioridad explícita.
- La tabla de reglas debe externalizarse.
- Tutorial, marcador e IA deben hablar el mismo idioma estratégico.

## 14. Preguntas que la Implementación Posterior Debe Resolver

- Cómo detectar de forma robusta una ruta comercial activa.
- Cómo medir el valor real de un camino concreto dentro de una red.
- Cómo ponderar distancia frente a impacto económico.
- Cómo representar la ciudad natal y su estado crítico de forma uniforme.
- Cómo exponer la razón de cada decisión sin ensuciar el flujo principal.
- Cómo recargar reglas en vivo sin romper una partida en curso.
- Cómo garantizar que el marcador y la IA usan la misma tabla sin divergencias.

## 15. Conclusión

La unificación no consiste en “mejorar movimientos”. Consiste en cambiar el centro de gravedad del sistema:

- de microacciones a prioridades globales,
- de heurísticas sueltas a nodos de valor,
- de constantes duras a reglas externas,
- y de una IA opaca a una IA explicable.

Si esta guía se sigue, la IA y el tutorial podrán compartir un mismo discurso:

- sobrevivir,
- construir economía,
- sabotear red rival,
- puntuar mejor,
- y atacar cuando el mapa ya favorece esa decisión.