 ESPECIFICACIÓN TÉCNICA: SISTEMA "CRÓNICAS Y REPLAY" (V 1.0)
1. RESUMEN DEL OBJETIVO
Desarrollar un sistema dual de registro de partida que permita:
Narrativa: Generar un log de texto enriquecido y filtrable (La Crónica).
Visual: Grabar la totalidad de la partida para su reproducción a alta velocidad (Timelapse/Replay).
Social: Generar un enlace único (Deep Link) para compartir la repetición con otros usuarios autenticados.
2. ARQUITECTURA DE DATOS (BACKEND)
No podemos guardar una "foto completa" del mapa en cada turno (sería demasiado pesado para la BD). Usaremos un sistema de Estado Inicial + Deltas (Cambios).
A. Estructura de Base de Datos (MongoDB/JSON)
Se requiere una nueva colección o tabla llamada game_replays.
Esquema del Objeto ReplayData:
code
JSON
{
  "match_id": "UUID_de_la_partida",
  "share_token": "a7b9c2...", // Token único para el link compartido
  "metadata": {
    "map_seed": "123456",      // Semilla para regenerar el terreno base
    "players": [               // Info estática de jugadores
      { "id": "p1", "name": "LordVader", "civ": "Imperio", "color": "#FF0000" },
      { "id": "p2", "name": "RebelScum", "civ": "Republica", "color": "#0000FF" }
    ],
    "winner_id": "p1",
    "total_turns": 40,
    "date_ended": "timestamp"
  },
  "timeline": [ // Array ordenado por turnos
    {
      "turn": 1,
      "events": [
        // Evento de Movimiento
        { "t": "MOVE", "u_id": "unit_55", "p": "p1", "from": [10,5], "to": [10,6] },
        // Evento de Construcción
        { "t": "BUILD", "loc": [5,5], "type": "city", "p": "p1" },
        // Evento de Batalla (Semántico para la crónica)
        { 
          "t": "BATTLE", 
          "atk_id": "unit_55", 
          "def_id": "unit_99", 
          "loc": [10,6], 
          "winner": "p1", 
          "details": { "casualities_atk": 10, "casualities_def": 100 } 
        }
      ]
    },
    // ... Turno 2, Turno 3, etc.
  ]
}
B. Optimización
Compresión: El JSON del timeline debe comprimirse (gzip o lz-string) antes de guardarse en la base de datos para minimizar costos de almacenamiento.
3. MOTOR DE LA CRÓNICA (TEXTO)
El sistema actual de logs planos debe reemplazarse por un Generador Semántico.
No guardes el texto "El jugador atacó". Guarda el objeto evento y genera el texto en el cliente.
Requerimiento:
En el menú "Códice de Batallas", el sistema leerá el timeline y transformará los eventos en texto según filtros:
Filtro "Grandes Hitos": Solo muestra Fundaciones de Ciudades, Maravillas y Fin de Partida.
Filtro "Militar": Muestra todas las Batallas y Bajas.
Filtro "Económico": Muestra tratos comerciales y edificios.
Ejemplo de Transformación (Frontend):
Input (JSON): { "t": "BATTLE", "loc": [12,4], "winner": "p1", "terrain": "sea" }
Output (Texto): "Turno 5: Gran victoria naval en las coordenadas 12:4. La flota del Jugador 1 dominó el mar."
4. MOTOR DE REPLAY (VISUAL)
Este es el núcleo de la solicitud. Se necesita un "Reproductor" que no ejecute la lógica del juego (no calcula daño), solo pinta lo que pasó.
Funcionalidad del Player
Carga: Al abrir el link, descarga el JSON y pinta el mapa base (usando map_seed).
Play/Pause: Botón para iniciar la animación.
Speed Control: Velocidad x1 (1 turno/seg), x2, x4.
Barra de Progreso (Scrubber): Permite saltar directamente al Turno 20.
Lógica de Pintado (Canvas/Render)
Interpolación: Las unidades no deben "teletransportarse". Si en el JSON se mueven de A a B, el replay debe animar el desplazamiento suavemente en X milisegundos.
Efectos:
Al ocurrir un evento BATTLE, mostrar un icono de espadas cruzadas "pop-up" sobre el hexágono por 1 segundo y luego desaparecer.
Al ocurrir un evento DEATH, la unidad se desvanece.
Niebla de Guerra:
Modo Espectador (Default): Todo el mapa visible.
Modo Jugador (Opcional): Ver solo lo que veía el Jugador A.
5. SISTEMA DE COMPARTIR (DEEP LINKING)
Flujo de Usuario
El jugador termina la partida o va al menú "Historial".
Abre el "Códice de Batallas".
Botón: "Generar Enlace de Replay".
El sistema genera una URL: https://iberion.game/replay?id=TOKEN_UNICO.
El jugador envía el link por WhatsApp/Discord.
Validación de Seguridad
Al hacer clic en el link, la WebApp verifica si hay una sesión activa (auth_token).
Si NO está logueado: Redirige al Login -> Luego vuelve al Replay.
Si ESTÁ logueado: Carga el visor de Replay.
Esto fomenta el crecimiento (Growth Hacking): para ver la batalla épica de tu amigo, tienes que tener cuenta en el juego.
6. INTERFAZ DE USUARIO (MOCKUP CONCEPTUAL)
Ubicación: Menú Principal -> Perfil -> Códice -> Seleccionar Partida.
Layout de la Pantalla de Replay:
code
Text
+-------------------------------------------------------+
|  [< Volver]   CRÓNICA DE IBERION: PARTIDA #4920       |
+-------------------------------------------------------+
|                                                       |
|  [                 ESCENARIO DEL MAPA               ] |
|  [     (Las unidades se mueven solas aquí)          ] |
|  [                                                  ] |
|                                                       |
+-------------------------------------------------------+
|  [⏮] [⏯ PLAY] [⏭]    Velocidad: [1x] [2x] [4x]      |
|  Barra de tiempo:  |========O================| T: 14  |
+-------------------------------------------------------+
|  LOG DE EVENTOS (Scrollable)                          |
|  > T13: Roma capturó la mina de oro.                  |
|  > T14: Batalla naval en el norte. Gana Imperio.      |
+-------------------------------------------------------+
|  [ BOTÓN: COPIAR ENLACE DE PARTIDA 🔗 ]               |
+-------------------------------------------------------+
7. TAREAS PARA EL PROGRAMADOR (CHECKLIST)

Backend: Crear Schema ReplayData y endpoint GET /api/replay/:id.

Game Loop: Modificar el TurnManager para que, al final de cada turno, pushee los eventos ocurridos al array timeline en memoria temporal.

Game Loop: Al finalizar partida, guardar el objeto completo en BD.

Frontend: Crear la clase ReplayRenderer.js. Debe ser una versión simplificada del BoardRenderer que acepte un estado forzado en lugar de lógica de juego.

UI: Maquetar el modal de Códice con las pestañas "Texto" y "Visual".
Nota para el desarrollador:
Lo más importante es desacoplar la lógica. El Replay no calcula si un ataque acierta o falla, el Replay solo recibe "Hubo ataque, ganó A" y lo dibuja. Esto evita desincronizaciones y bugs en la reproducción.