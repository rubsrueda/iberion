// Script para verificar rápidamente que el Cuaderno funciona
// Ejecuta esto en consola

console.log('%c=== PRUEBA RÁPIDA DEL CUADERNO ===', 'background: #00f3ff; color: #000; padding: 10px; font-weight: bold;');

// 1. Ver si el modal existe
const modal = document.getElementById('ledgerModal');
console.log('1. Modal HTML existe:', !!modal);
console.log('   Display actual:', modal?.style.display);
console.log('   Z-index:', modal?.style.zIndex);

// 2. Ver si LedgerUI está inicializado
console.log('2. LedgerUI.modalElement:', !!LedgerUI?.modalElement);
console.log('   LedgerUI.isVisible:', LedgerUI?.isVisible);

// 3. Intentar abrir manualmente
console.log('3. Intentando abrir...');
LedgerManager.open();

// 4. Verificar después
setTimeout(() => {
    console.log('   Después de abrir:');
    console.log('   Display del modal:', modal?.style.display);
    console.log('   LedgerUI.isVisible:', LedgerUI?.isVisible);
    console.log('   LedgerManager.isOpen:', LedgerManager?.isOpen);
}, 100);
