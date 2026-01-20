// adManager.js
console.log("adManager.js CARGADO - Sistema Google AdSense H5 listo.");

const AdManager = {
    isPremium: false, // Se actualizará al cargar perfil
    adBlockEnabled: false, // Detectar si el usuario tiene AdBlock

    init: function() {
        // Configuración inicial de Google
        if (typeof adConfig === 'function') {
            adConfig({
                preloadAdBreaks: 'on',
                sound: 'on', // El juego tiene sonido
                onReady: () => console.log("[Ads] API de Google lista."),
            });
        }
        
        // Verificar si el usuario es Premium
        if (PlayerDataManager.currentPlayer && PlayerDataManager.currentPlayer.is_premium) {
            this.isPremium = true;
            console.log("[Ads] Usuario Premium detectado. Anuncios desactivados.");
        }
    },

    /**
     * Muestra un anuncio Interstitial (Pantalla completa).
     * Úsalo al terminar una batalla o cambiar de pantalla.
     * @param {Function} onComplete - Callback cuando el anuncio termina o se salta.
     */
    showInterstitial: function(placementName, onComplete) {
        if (this.isPremium) {
            if (onComplete) onComplete();
            return;
        }

        console.log(`[Ads] Solicitando Interstitial: ${placementName}`);
        
        // Pausar audio del juego
        if (typeof AudioManager !== 'undefined') AudioManager.stopMusic();

        // Llamada a la API Real de Google
        if (typeof adBreak === 'function') {
            adBreak({
                type: 'next', // 'next' es para transiciones, 'start' para inicio
                name: placementName,
                beforeAd: () => { console.log("[Ads] Anuncio comenzando..."); },
                afterAd: () => { 
                    console.log("[Ads] Anuncio finalizado.");
                    if (typeof AudioManager !== 'undefined') AudioManager.playMusic('menu_theme');
                    if (onComplete) onComplete();
                },
                adBreakDone: (placementInfo) => {
                    console.log("[Ads] Resultado:", placementInfo.breakStatus); 
                    // breakStatus puede ser: 'viewed', 'dismissed', 'frequency_capped'
                }
            });
        } else {
                // MODO SIMULACIÓN PARA DESARROLLO (LOCALHOST)
                console.warn("[Ads] Google no disponible. Simulando anuncio local...");
                
                // Crear una pantalla negra falsa
                const mockAd = document.createElement('div');
                mockAd.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:99999; display:flex; justify-content:center; align-items:center; color:white; flex-direction:column;";
                mockAd.innerHTML = "<h1>ANUNCIO DE PRUEBA</h1><p>Cerrando en 3...</p>";
                document.body.appendChild(mockAd);

                // Cerrar a los 3 segundos
                setTimeout(() => {
                    mockAd.remove();
                    if (typeof AudioManager !== 'undefined') AudioManager.playMusic('menu_theme');
                    if (onComplete) onComplete();
                }, 3000);
            }
    },

    /**
     * Muestra un anuncio con Recompensa (Reward).
     * El jugador DEBE ver el anuncio completo para ganar.
     */
    showRewardedAd: function(onRewardGranted) {
        console.log("[Ads] Solicitando Anuncio Recompensado...");
        
        if (typeof AudioManager !== 'undefined') AudioManager.stopMusic();

        if (typeof adBreak === 'function') {
            adBreak({
                type: 'reward', 
                name: 'bonus_gems',
                beforeAd: () => { console.log("[Ads] Reward video start"); },
                afterAd: () => { 
                    if (typeof AudioManager !== 'undefined') AudioManager.playMusic('menu_theme');
                },
                beforeReward: (showAdFn) => {
                    // Aquí Google nos pregunta si queremos mostrarlo
                    showAdFn();
                },
                adViewed: () => {
                    console.log("[Ads] ¡Anuncio visto completo!");
                    if (onRewardGranted) onRewardGranted();
                },
                adDismissed: () => {
                    console.log("[Ads] El usuario cerró el anuncio antes de tiempo.");
                    if(typeof showToast === 'function') showToast("Debes ver el anuncio completo para recibir la recompensa.", "warning");
                },
                adBreakDone: (placementInfo) => {
                    // Fallback si no hay anuncios disponibles
                    if (placementInfo.breakStatus === 'notReady') {
                        if(typeof showToast === 'function') showToast("No hay anuncios disponibles ahora.", "info");
                    }
                }
            });
        } else {
            console.warn("[Ads] Google API no disponible.");
            if(typeof showToast === 'function') showToast("Error de conexión con el proveedor de anuncios.", "error");
        }
    }
};