const IaValidationTools = {
    capturarEstadoIA(playerNumber = 2) {
        return {
            turnNumber: gameState?.turnNumber ?? null,
            currentPlayer: gameState?.currentPlayer ?? null,
            playerType: gameState?.playerTypes?.[`player${playerNumber}`] ?? null,
            configVersion: AiGameplayManager?._config?.version ?? null,
            lastDecision: AiGameplayManager?._lastDecisionLog?.[playerNumber] ?? null,
            topNodes: (AiGameplayManager?._lastNodeList?.[playerNumber] || []).slice(0, 5).map((node) => ({
                tipo: node.tipo,
                r: node.r,
                c: node.c,
                razon_texto: node.razon_texto
            })),
            chronicleIaDecisions: typeof Chronicle !== 'undefined'
                ? Chronicle.getLogsByType('ia_decision').slice(-5)
                : []
        };
    },

    imprimirResumenIA(playerNumber = 2) {
        const snapshot = this.capturarEstadoIA(playerNumber);
        console.group(`[IA VALIDATION] Resumen J${playerNumber}`);
        console.log(snapshot);
        console.groupEnd();
        return snapshot;
    },

    verificarArtefactosBasicos(playerNumber = 2) {
        const result = {
            configCargada: !!AiGameplayManager?._config,
            nodosDisponibles: Array.isArray(AiGameplayManager?._lastNodeList?.[playerNumber]),
            decisionDisponible: !!AiGameplayManager?._lastDecisionLog?.[playerNumber],
            chronicleDisponible: typeof Chronicle !== 'undefined',
            logsIaMotorDisponibles: !!AiGameplayManager?._lastDecisionLog?.[playerNumber]?.razon_texto
        };

        console.table(result);
        return result;
    }
};

window.IaValidationTools = IaValidationTools;
console.log('[IaValidationTools] Utilidades de validación cargadas. Usa IaValidationTools.imprimirResumenIA()');