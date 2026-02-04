// Script para verificar rápidamente que el Cuaderno funciona
// Ejecuta esto en consola

0 && console.log('%c=== PRUEBA RÁPIDA DEL CUADERNO ===', 'background: #00f3ff; color: #000; padding: 10px; font-weight: bold;');

// 1. Ver si el modal existe
const modal = document.getElementById('ledgerModal');
0 && console.log('1. Modal HTML existe:', !!modal);
0 && console.log('   Display actual:', modal?.style.display);
0 && console.log('   Z-index:', modal?.style.zIndex);

// 2. Ver si LedgerUI está inicializado
0 && console.log('2. LedgerUI.modalElement:', !!LedgerUI?.modalElement);
0 && console.log('   LedgerUI.isVisible:', LedgerUI?.isVisible);

// 3. Intentar abrir manualmente
0 && console.log('3. Intentando abrir...');
LedgerManager.open();

// 4. Verificar después
setTimeout(() => {
    0 && console.log('   Después de abrir:');
    0 && console.log('   Display del modal:', modal?.style.display);
    0 && console.log('   LedgerUI.isVisible:', LedgerUI?.isVisible);
    0 && console.log('   LedgerManager.isOpen:', LedgerManager?.isOpen);
}, 100);
