// IA_TACTICA.js
// Módulo táctico para IA en Archipiélago. No decide economía.

const IATactica = {
  detectarFrente(myPlayer, contactRange = 2) {
    console.log(`[IA_TACTICA] detectarFrente(${myPlayer}, contactRange=${contactRange}) INICIO`);
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const misUnidades = IASentidos.getUnits(myPlayer);
    const unidadesEnemigas = IASentidos.getUnits(enemyPlayer);
    const frente = [];

    for (const mi of misUnidades) {
      for (const en of unidadesEnemigas) {
        if (hexDistance(mi.r, mi.c, en.r, en.c) <= contactRange) {
          frente.push({ r: mi.r, c: mi.c, enemigo: { r: en.r, c: en.c } });
        }
      }
    }
    console.log(`[IA_TACTICA] Frente detectado: ${frente.length} puntos de contacto`);
    return frente;
  },

  detectarAmenazasSobreObjetivos(myPlayer, objetivos, threatRange = 3) {
    console.log(`[IA_TACTICA] detectarAmenazasSobreObjetivos(${myPlayer}, ${objetivos.length} objetivos, threatRange=${threatRange})`);
    const enemyPlayer = myPlayer === 1 ? 2 : 1;
    const amenazas = units.filter(u =>
      u.player === enemyPlayer &&
      u.currentHealth > 0 &&
      objetivos.some(o => hexDistance(u.r, u.c, o.r, o.c) <= threatRange)
    );
    console.log(`[IA_TACTICA] Amenazas detectadas: ${amenazas.length} unidades enemigas cerca de objetivos`);
    return amenazas;
  },

  evaluarDefensaHex(r, c) {
    const hex = board[r]?.[c];
    if (!hex) {
      console.log(`[IA_TACTICA] evaluarDefensaHex(${r},${c}): hex no existe`);
      return 0;
    }
    let score = 1.0;
    if (hex.terrain === 'hills') score += 0.3;
    if (hex.terrain === 'forest') score += 0.2;
    if (hex.terrain === 'mountains') score += 0.5;
    if (hex.structure === 'Fortaleza') score += 3.0;
    if (hex.structure === 'Muralla') score += 2.0;
    if (hex.structure === 'Campamento') score += 1.0;
    if (hex.isCity) score += 1.5;
    if (hex.isCapital) score += 2.0;
    console.log(`[IA_TACTICA] evaluarDefensaHex(${r},${c}): score=${score.toFixed(1)}, terrain=${hex.terrain}, structure=${hex.structure}`);
    return score;
  }
};

window.IATactica = IATactica;
