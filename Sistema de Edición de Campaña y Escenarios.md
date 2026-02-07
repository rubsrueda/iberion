Documento de Alcance: Sistema de Edición de Escenarios y Campañas (IBERION)

Fecha: 06 de Febrero, 2026

1. Resumen Ejecutivo
El objetivo es implementar un "Modo Editor" que permita a los jugadores crear contenido personalizado (User Generated Content). 
El sistema se dividirá en dos módulos interconectados similares a los de Age of Empires II o Panzer General:
Editor de Escenarios: Para diseñar mapas, colocar unidades y definir condiciones de victoria.
Editor de Campañas: Para agrupar escenarios en una secuencia narrativa lógica.

2. Requerimientos Funcionales (El "Qué")

Módulo A: Editor de Escenarios

A.0 Especificar las propiededes de inicio del escenario (tener todas las de esacaramuza obligatorias para que sea natural la ejecución del turno)

A.1 Configuración Inicial del Mapa (Map Setup)
Al crear un nuevo escenario, el usuario debe poder definir:
Dimensiones: Selector de tamaño (ej. 12x15, 24x35, Personalizado).
Bioma Base: Definir el terreno por defecto (Llanura, Bosque, Montaña, Agua) que llenará la matriz board[][].
Generación Procedural (Opcional): Botón para "Generar Semilla" usando la lógica existente en boardManager.js como base inicial para luego editar.

A.2 Herramientas de Edición (Toolbox)
Una barra lateral o flotante con las siguientes herramientas:

Pincel de Terreno: Clic en un hexágono para cambiar su tipo (Montaña, Bosque, Agua, Llanura). Debe soportar "arrastrar" (mousedown + mousemove) para pintar rápido.

Colocación de Unidades:
Selector de Jugador (Jugador 1, Jugador 2, Jugador 3, Jugador 4, Banca/Bárbaros).
Lista de Unidades (basada en constants.js).
Clic para instanciar la unidad en el hexágono (units.push(...)).
Colocación de Estructuras: Ciudades, caminos, ruinas, fortificaciones...

Borrador: Eliminar unidades o estructuras del hexágono seleccionado.

A.3 Configuración de Jugadores (Player Data)
Un modal para editar gameState.playerResources iniciales:
Oro, Comida, Madera, Hierro, Puntos de Investigación, Puntos de Regimientos... iniciales.

Civilización predefinida (Iberia, Roma, etc.) o "A elegir por el jugador".
Tipo de controlador (Humano vs IA).

A.4 Guardado y Prueba
Guardar Escenario: Serializar el estado actual a un archivo JSON local o entrada en localStorage con el prefijo SCENARIO_.
Guardar el archivo en base de datos del servidor quedando disponible para el resto de jugadores.
Probar Escenario: Cargar inmediatamente el escenario en el motor de juego (currentPhase: "play") para testear.

Módulo B: Editor de Campañas

B.1 Estructura de Campaña
Interfaz para crear un objeto "Campaña" que contiene metadatos:
Nombre de la Campaña.
Descripción / Lore.
Autor.

B.2 Gestión de Escenarios
Lista de escenarios creados previamente (disponibles en local).
Funcionalidad para Añadir/Remover escenarios a la lista de campaña.
Funcionalidad para Ordenar la secuencia (Escenario 1 -> Escenario 2).

B.3 Exportación
Guardar el archivo de campaña completo (un JSON que contiene la metadata y los arrays de los escenarios).

3. Requerimientos Técnicos (El "Cómo")

3.1 Integración con Arquitectura Existente
El editor debe reutilizar el motor de renderizado actual para evitar duplicidad de código.
Renderizado: Usar renderBoardToDOM() existente. La diferencia es que en el state.js, debemos tener un flag isEditorMode = true.
Input: Modificar onHexClick(r, c) en main.js.
Si isEditorMode es true: No calcular movimiento ni ataque. En su lugar, ejecutar la herramienta seleccionada (ej. paintTerrain(r,c) o placeUnit(r,c)).

3.2 Estructuras de Datos (JSON Schemas)
Formato de Archivo de Escenario (.isc - Iberion Scenario):
code
JSON
{
  "meta": {
    "name": "La Batalla del Ebro",
    "author": "Player1",
    "created_at": 1707000000
  },
  "settings": {
    "dimensions": { "rows": 15, "cols": 20 },
    "maxPlayers": 2
  },
  "boardData": [
    // Representación comprimida de board[][]
    { "r": 0, "c": 0, "terrain": "mountain", "owner": null },
    { "r": 0, "c": 1, "terrain": "plains", "owner": 1, "structure": "city" }
  ],
  "unitsData": [
    // Array de unidades para inicializar
    { "type": "Legionarios", "player": 1, "r": 5, "c": 5, "isVeterans": true }
  ],
  "playerConfig": {
    "1": { "civilization": "Roma", "resources": { "oro": 1000 } },
    "2": { "civilization": "Iberia", "resources": { "oro": 800 } }
  }
}
Formato de Archivo de Campaña (.icp - Iberion Campaign):
code
JSON
{
  "campaignId": "uuid-v4",
  "title": "El Ascenso de Roma",
  "scenarios": [
    { "order": 1, "scenarioData": { ... } }, // Objeto escenario completo
    { "order": 2, "scenarioData": { ... } }
  ]
}

4. UI / UX Flow (Boceto Lógico)
Menú Principal: Nueva Area trasparente, Nuevo botón "Editores".
Submenú: "Crear Escenario" | "Crear Campaña".

Pantalla Editor Escenario:
Centro: Canvas del juego (el mapa).
Panel Inferior: (Como en el video) Pestañas: Mapa, Terreno, Unidades, Jugadores.
Panel Superior: Menú de Sistema (Guardar, Salir, Probar).

Lógica de Interacción:
Seleccionar herramienta "Montaña" -> Clic en hexágono (5,5) -> board[5][5].terrain cambia a "mountain" -> updateHex(5,5) repinta el hexágono.

5. Tareas de Desarrollo Sugeridas
Backend/Data:
Crear funciones exportScenarioToJSON() y importScenarioFromJSON() en saveLoad.js.
Asegurar que gameState puede inicializarse limpio desde estos JSONs.

UI Core:
Crear el layout del editor (Overlay HTML sobre el canvas).
Implementar el selector de herramientas (State del editor: currentTool).

Lógica de Pintado:
Adaptar onHexClick para modificar board[][] directamente sin reglas de juego (sin validar movimiento/coste).

Gestor de Campaña:
UI simple para listar y enlazar los JSONs generados.
6. Fuera de Alcance (V1)

Para mantener el desarrollo ágil, NO incluiremos en esta versión:
Triggers / Scripts complejos: (Ej: "Si la unidad X llega al punto Y, aparece un ejército"). 
El juego funciona con las mismas condiciones actuales de una partida tipo escaramuza.

Editor de Terreno 3D avanzado: Solo usaremos los sprites/assets existentes.

Cinemáticas: No habrá editor de escenas de video entre misiones.

Notas para el Programador
Revisa boardManager.js: La función de generación de mapa actual será tu mejor amiga para la opción "Crear mapa aleatorio" dentro del editor.
Cuidado con los IDs: Al colocar unidades en el editor, no les asignes IDs finales hasta que el escenario se cargue para jugar. Usa IDs temporales o genera los UUIDs al momento de guardar el archivo.
Persistencia: La integración será con Supabase (guardar en la nube para compartir con otros, y recuperar los avances) 