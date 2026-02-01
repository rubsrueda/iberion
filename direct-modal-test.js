// Test DIRECTO del modal
console.log('%c=== TEST DIRECTO DEL MODAL ===', 'background: #00f3ff; color: #000; padding: 10px; font-weight: bold;');

const modal = document.getElementById('ledgerModal');
console.log('1. Modal existe:', !!modal);
console.log('2. Display antes:', modal?.style.display);

// Simular lo que hace el botón
modal.style.display = 'flex';
modal.style.position = 'fixed';
modal.style.left = '0';
modal.style.top = '0';
modal.style.width = '100%';
modal.style.height = '100%';
modal.style.zIndex = '9999';
modal.style.justifyContent = 'center';
modal.style.alignItems = 'center';

console.log('3. Display después:', modal?.style.display);
console.log('4. Position después:', modal?.style.position);
console.log('%c✅ Modal debería estar VISIBLE ahora', 'color: #0f0; font-weight: bold;');

// Para cerrarlo:
// modal.style.display = 'none';
