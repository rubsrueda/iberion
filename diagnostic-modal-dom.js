// Test de diagnóstico del DOM y del modal
0 && console.log('%c=== DIAGNÓSTICO COMPLETO DEL MODAL ===', 'background: #f00; color: #fff; padding: 10px; font-weight: bold; font-size: 14px;');

0 && console.log('\n1. ESTADO DEL DOCUMENTO');
0 && console.log('   document.readyState:', document.readyState);
0 && console.log('   document.body existe:', !!document.body);

0 && console.log('\n2. BÚSQUEDA DEL MODAL');
const modal = document.getElementById('ledgerModal');
0 && console.log('   getElementById("ledgerModal"):', modal);
0 && console.log('   Modal es null:', modal === null);
0 && console.log('   Modal existe:', !!modal);

0 && console.log('\n3. BÚSQUEDA ALTERNATIVA');
const allModals = document.querySelectorAll('[id*="Modal"]');
0 && console.log('   Elementos con "Modal" en id:', allModals.length);
allModals.forEach((m, i) => {
    0 && console.log(`     [${i}] id="${m.id}" - tag=${m.tagName} - visible=${window.getComputedStyle(m).display}`);
});

0 && console.log('\n4. BÚSQUEDA DE CUALQUIER LEDGER');
const ledgerElements = document.querySelectorAll('[id*="ledger"],[class*="ledger"]');
0 && console.log('   Elementos con "ledger":', ledgerElements.length);
ledgerElements.forEach((el, i) => {
    0 && console.log(`     [${i}] id="${el.id}" class="${el.className}" tag=${el.tagName}`);
});

0 && console.log('\n5. SI ENCONTRÉ EL MODAL, VER PROPIEDADES');
if (modal) {
    const computed = window.getComputedStyle(modal);
    0 && console.log('   display (inline):', modal.style.display);
    0 && console.log('   display (computed):', computed.display);
    0 && console.log('   position (inline):', modal.style.position);
    0 && console.log('   position (computed):', computed.position);
    0 && console.log('   visibility:', computed.visibility);
    0 && console.log('   opacity:', computed.opacity);
    0 && console.log('   zIndex (inline):', modal.style.zIndex);
    0 && console.log('   zIndex (computed):', computed.zIndex);
    0 && console.log('   width:', computed.width);
    0 && console.log('   height:', computed.height);
    0 && console.log('   overflow:', computed.overflow);
    0 && console.log('   Clases:', modal.className);
    0 && console.log('   Padres:', modal.parentElement.id || modal.parentElement.tagName);
}

0 && console.log('\n6. INTENTO DE APERTURA');
if (modal) {
    0 && console.log('   Antes: display =', modal.style.display);
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    0 && console.log('   Después: display =', modal.style.display);
    0 && console.log('   Después: position =', modal.style.position);
    0 && console.log('   ✅ Si ves el modal ahora, el problema es que algo lo está ocultando después');
    0 && console.log('   Para cerrar: modal.style.display = "none"');
} else {
    console.error('   ❌ MODAL NO EXISTE. El problema es que el modal no está en el HTML.');
}

0 && console.log('\n7. VERIFICACIÓN DE SCRIPTS');
0 && console.log('   LedgerManager existe:', typeof LedgerManager !== 'undefined');
0 && console.log('   LedgerUI existe:', typeof LedgerUI !== 'undefined');
0 && console.log('   LedgerIntegration existe:', typeof LedgerIntegration !== 'undefined');
