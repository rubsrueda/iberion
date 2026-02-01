// Test de diagnóstico del DOM y del modal
console.log('%c=== DIAGNÓSTICO COMPLETO DEL MODAL ===', 'background: #f00; color: #fff; padding: 10px; font-weight: bold; font-size: 14px;');

console.log('\n1. ESTADO DEL DOCUMENTO');
console.log('   document.readyState:', document.readyState);
console.log('   document.body existe:', !!document.body);

console.log('\n2. BÚSQUEDA DEL MODAL');
const modal = document.getElementById('ledgerModal');
console.log('   getElementById("ledgerModal"):', modal);
console.log('   Modal es null:', modal === null);
console.log('   Modal existe:', !!modal);

console.log('\n3. BÚSQUEDA ALTERNATIVA');
const allModals = document.querySelectorAll('[id*="Modal"]');
console.log('   Elementos con "Modal" en id:', allModals.length);
allModals.forEach((m, i) => {
    console.log(`     [${i}] id="${m.id}" - tag=${m.tagName} - visible=${window.getComputedStyle(m).display}`);
});

console.log('\n4. BÚSQUEDA DE CUALQUIER LEDGER');
const ledgerElements = document.querySelectorAll('[id*="ledger"],[class*="ledger"]');
console.log('   Elementos con "ledger":', ledgerElements.length);
ledgerElements.forEach((el, i) => {
    console.log(`     [${i}] id="${el.id}" class="${el.className}" tag=${el.tagName}`);
});

console.log('\n5. SI ENCONTRÉ EL MODAL, VER PROPIEDADES');
if (modal) {
    const computed = window.getComputedStyle(modal);
    console.log('   display (inline):', modal.style.display);
    console.log('   display (computed):', computed.display);
    console.log('   position (inline):', modal.style.position);
    console.log('   position (computed):', computed.position);
    console.log('   visibility:', computed.visibility);
    console.log('   opacity:', computed.opacity);
    console.log('   zIndex (inline):', modal.style.zIndex);
    console.log('   zIndex (computed):', computed.zIndex);
    console.log('   width:', computed.width);
    console.log('   height:', computed.height);
    console.log('   overflow:', computed.overflow);
    console.log('   Clases:', modal.className);
    console.log('   Padres:', modal.parentElement.id || modal.parentElement.tagName);
}

console.log('\n6. INTENTO DE APERTURA');
if (modal) {
    console.log('   Antes: display =', modal.style.display);
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    console.log('   Después: display =', modal.style.display);
    console.log('   Después: position =', modal.style.position);
    console.log('   ✅ Si ves el modal ahora, el problema es que algo lo está ocultando después');
    console.log('   Para cerrar: modal.style.display = "none"');
} else {
    console.error('   ❌ MODAL NO EXISTE. El problema es que el modal no está en el HTML.');
}

console.log('\n7. VERIFICACIÓN DE SCRIPTS');
console.log('   LedgerManager existe:', typeof LedgerManager !== 'undefined');
console.log('   LedgerUI existe:', typeof LedgerUI !== 'undefined');
console.log('   LedgerIntegration existe:', typeof LedgerIntegration !== 'undefined');
