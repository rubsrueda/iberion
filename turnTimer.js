// turnTimer.js
console.log("turnTimer.js CARGADO - Gestor de tiempo por turno listo.");

const TurnTimerManager = {
    timerInterval: null,
    remainingSeconds: 0,
    
    // Elementos del DOM que usaremos
    displayElement: null,
    valueElement: null,

    // Inicializa el manager (se llamará una vez al cargar el juego)
    init: function() {
        this.displayElement = document.getElementById('turnTimerDisplay');
        this.valueElement = document.getElementById('turnTimerValue');

        if (!this.displayElement || !this.valueElement) {
            console.error("TurnTimerManager: No se encontraron los elementos del DOM #turnTimerDisplay o #turnTimerValue.");
        }
    },

    /**
     * Inicia la cuenta atrás para un turno.
     * @param {number} totalSeconds - La duración total del turno en segundos.
     */
    start: function(totalSeconds) {
        // Si no hay límite de tiempo (Infinity), no hacemos nada.
        if (!isFinite(totalSeconds)) {
            console.log("[TIMER] Turno sin límite de tiempo.");
            return;
        }

        console.log(`[TIMER] Iniciando temporizador de ${totalSeconds} segundos.`);
        
        // Detener cualquier temporizador anterior por seguridad
        this.stop();

        this.remainingSeconds = totalSeconds;
        this._updateDisplay();
        
        // Mostrar el contador
        if (this.displayElement) {
            this.displayElement.style.display = 'flex';
        }
        
        // Iniciar el intervalo que se ejecutará cada segundo
        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            this._updateDisplay();
            
            // Comprobar si se ha acabado el tiempo
            if (this.remainingSeconds <= 0) {
                console.log("[TIMER] ¡Tiempo agotado! Forzando fin de turno.");
                this.stop();
                
                // Llamar a la función global para terminar el turno
                if (typeof handleEndTurn === 'function') {
                    handleEndTurn();
                } else {
                    console.error("TurnTimerManager: La función handleEndTurn() no está disponible para forzar el fin de turno.");
                }
            }
        }, 1000);
    },
    
    /**
     * Detiene la cuenta atrás actual y oculta el display.
     */
    stop: function() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log("[TIMER] Temporizador detenido.");
        }
        
        // Ocultar el contador y resetear estilos
        if (this.displayElement) {
            this.displayElement.style.display = 'none';
            this.displayElement.classList.remove('low-time', 'critical-time');
        }
    },

    /**
     * (Función interna) Actualiza el texto del contador en el HTML.
     */
    _updateDisplay: function() {
        if (!this.valueElement || !this.displayElement) return;

        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        
        // Formatear para que siempre tenga dos dígitos (ej: 03:09)
        this.valueElement.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Actualizar el estilo visual si queda poco tiempo
        if (this.remainingSeconds <= 10) {
            this.displayElement.classList.add('critical-time');
            this.displayElement.classList.remove('low-time');
        } else if (this.remainingSeconds <= 30) {
            this.displayElement.classList.add('low-time');
            this.displayElement.classList.remove('critical-time');
        } else {
            this.displayElement.classList.remove('low-time', 'critical-time');
        }
    }
};

// Auto-inicializar el manager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    TurnTimerManager.init();
});