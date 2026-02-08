// debugConsole.js(20250827)
// Lógica para la consola de depuración en pantalla (Versión Clásica).

let consoleElement;
let consoleOutput;
let consoleInput;
// floatingConsoleBtn ahora se obtendrá del DOM en lugar de crearse aquí.
let floatingConsoleBtn; // Declaramos la variable para usarla después

const DEBUG_MODE = true; 

// En scripts clásicos, no se usa 'import'.
// Se asume que 'Cheats' y 'logMessage' (de utils.js) son variables globales.

/**
 * Inicializa la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function initDebugConsole() {
    if (!DEBUG_MODE) {
        // Si el modo debug está desactivado, no hacemos nada y no inicializamos el botón.
        // Asegurarse de que el botón estático en el HTML también esté oculto en este caso
        // Esto se manejaría mejor con CSS o con JS si DEBUG_MODE es false.
        // Por ahora, confiamos en que el CSS por defecto lo oculte si no tiene estilos flotantes
        // o si tu CSS tiene una regla que lo oculte globalmente si DEBUG_MODE está false.
        // O podrías añadir una línea aquí para ocultarlo:
        // const btn = document.getElementById('floatingConsoleBtn'); if(btn) btn.style.display = 'none';
        return;
    }

    // NO NECESITAMOS ENCONTRAR gameContainer para inyectar el botón si ya está en HTML
    // const gameContainer = document.querySelector('.game-container');
    // if (!gameContainer) {
    //     console.error("DEBUG CONSOLE: CRÍTICO: 'game-container' no encontrado. No se puede inyectar el botón de la consola. El juego no está en la fase adecuada o el HTML ha cambiado.");
    //     // Si el botón estático existe, al menos intentar configurarlo
    // }
    // console.log("DEBUG CONSOLE: 'game-container' encontrado. Procediendo a crear botón."); 

    // --- ¡CAMBIO CLAVE AQUÍ! ---
    // En lugar de crear un nuevo botón, obtenemos el botón que ya existe en index.html
    floatingConsoleBtn = document.getElementById('floatingConsoleBtn');

    if (!floatingConsoleBtn) {
        console.error("DEBUG CONSOLE: CRÍTICO: El botón de consola estático con ID 'floatingConsoleBtn' no fue encontrado en el HTML. La consola de depuración no se inicializará completamente.");
        // Si el botón no existe, no podemos añadirle listeners, etc.
        return;
    }


    // --- ¡ELIMINAMOS O COMENTAMOS ESTAS LÍNEAS QUE CREABAN Y ESTILIZABAN EL BOTÓN DINÁMICAMENTE! ---
    // const floatingConsoleBtn = document.createElement('button'); // ELIMINAR
    // floatingConsoleBtn.id = 'floatingConsoleBtn'; // ELIMINAR (ya tiene ID en HTML)
    // floatingConsoleBtn.classList.add('floating-btn', 'force-console-button'); // ELIMINAR (CSS gestiona clases)
    // floatingConsoleBtn.textContent = 'CMD'; // ELIMINAR (Texto 'C' ya está en HTML)
    
    // ELIMINAR TODAS LAS LÍNEAS CON floatingConsoleBtn.style.setProperty(...) !important ---
    // floatingConsoleBtn.style.setProperty('position', 'fixed', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('top', '15px', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('left', '80px', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('width', '50px', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('height', '50px', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('font-size', '16px', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('border-radius', '50%', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('background-color', 'rgba(255, 0, 0, 0.9)', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('color', 'white', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('box-shadow', '0 0 10px 5px rgba(255, 255, 0, 0.8)', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('z-index', '999999999', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('display', 'flex', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('justify-content', 'center', 'important'); // ELIMINAR
    // floatingConsoleBtn.style.setProperty('align-items', 'center', 'important'); // ELIMINAR
    // --- FIN DE LÍNEAS ELIMINADAS ---

    // NO NECESITAMOS INSERTAR EL BOTÓN SI YA ESTÁ EN HTML
    // const floatingMenuBtn = document.getElementById('floatingMenuBtn'); // ELIMINAR
    // if (floatingMenuBtn && floatingMenuBtn.parentElement === gameContainer) { // ELIMINAR
    //     gameContainer.insertBefore(floatingConsoleBtn, floatingMenuBtn.nextSibling); // ELIMINAR
    //     console.log("DEBUG CONSOLE: Botón de consola inyectado después de floatingMenuBtn."); // ELIMINAR
    // } else { // ELIMINAR
    //     gameContainer.appendChild(floatingConsoleBtn); // ELIMINAR
    //     console.log("DEBUG CONSOLE: Botón de consola inyectado al final del game-container."); // ELIMINAR
    // }
    
    // Ahora, obtenemos las referencias a los elementos internos de la consola principal (HTML)
    consoleElement = document.getElementById('debug-console');
    consoleOutput = document.getElementById('console-output');
    consoleInput = document.getElementById('console-input');

    if (!consoleElement || !consoleOutput || !consoleInput) {
        console.error("DEBUG CONSOLE: CRÍTICO: Los elementos internos de la consola (output/input/contenedor) no fueron encontrados. La consola no funcionará.");
        return; // Salir si los elementos internos no se encuentran
    }

    // Listener para el botón de la consola (ahora usando el botón estático encontrado)
    // Asegurarse de que floatingConsoleBtn fue encontrado antes de añadir el listener
    if(floatingConsoleBtn) {
         floatingConsoleBtn.addEventListener('click', () => {
            toggleConsole();
        });
    } else {
        console.warn("DEBUG CONSOLE: No se pudo añadir listener al botón de consola porque no se encontró.");
    }


    // Listener para el atajo de teclado '`'
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === 'Dead') { // 'Dead' para algunos teclados con tilde
            e.preventDefault(); // Evita que se escriba el caracter
            toggleConsole();    // Alterna la visibilidad de nuestra consola
        }
    });

    // Listener para procesar el comando al presionar Enter en el input
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = consoleInput.value.trim();
            if (command) {
                logToConsole(`> ${command}`, 'command'); 
                processCommand(command);
                consoleInput.value = ''; 
            }
        }
    });

    logToConsole("Consola de Depuración inicializada. Pulsa 'C' (Botón) o '`' para alternar visibilidad.", 'info');
}

/**
 * Alterna la visibilidad de la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function toggleConsole() {
    if (!consoleElement) return;
    consoleElement.style.display = consoleElement.style.display === 'none' ? 'flex' : 'none';
    if (consoleElement.style.display === 'flex') {
        consoleInput.focus(); 
    }
}

/**
 * Añade un mensaje al historial de la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function logToConsole(message, type = 'info') {
    if (!consoleOutput) return;

    const entry = document.createElement('div');
    entry.textContent = message;
    entry.classList.add(`console-${type}`); 
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

/**
 * Procesa una cadena de comando introducida en la consola.
 * Asume que 'Cheats' es un objeto global definido por cheats.js.
 */
function processCommand(commandString) {
    const parts = commandString.split(' ').map(p => p.trim());
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (typeof Cheats !== 'undefined' && Cheats.hasOwnProperty(commandName) && typeof Cheats[commandName] === 'function') {
        try {
            Cheats[commandName](...args);
            logToConsole(`Comando '${commandName}' ejecutado.`, 'success');
        } catch (error) {
            logToConsole(`Error al ejecutar '${commandName}': ${error.message}`, 'error');
            console.error(error); 
        }
    } else {
        logToConsole(`Comando desconocido o Cheats no definido: ${commandName}`, 'error');
    }
}

// Asegúrate de que initDebugConsole() se llama en algún momento,
// probablemente al inicio de tu juego o cuando se inicializa la interfaz.
// Si ya tienes una llamada a initDebugConsole() en main.js o gameFlow.js, no necesitas añadirla aquí.