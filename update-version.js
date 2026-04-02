#!/usr/bin/env node
/**
 * update-version.js - Script para actualizar la versión del juego
 * 
 * Uso: node update-version.js "Descripción del cambio"
 * Ejemplo: node update-version.js "Se resuelve problema de intercambio con la banca 4:1"
 */

const fs = require('fs');
const path = require('path');

// Obtener descripción del cambio desde argumentos
const changeDescription = process.argv.slice(2).join(' ');

if (!changeDescription) {
    console.error('❌ Error: Debes proporcionar una descripción del cambio');
    console.log('Uso: node update-version.js "Descripción del cambio"');
    process.exit(1);
}

// Leer versión actual desde version.js
const versionFilePath = path.join(__dirname, 'version.js');
let versionContent = fs.readFileSync(versionFilePath, 'utf8');

// Extraer versión actual
const versionMatch = versionContent.match(/current:\s*"(\d+\.\d+)"/);
if (!versionMatch) {
    console.error('❌ Error: No se pudo encontrar la versión actual');
    process.exit(1);
}

const currentVersion = versionMatch[1];
const [major, minor] = currentVersion.split('.');
const newMinor = (parseInt(minor) + 1).toString().padStart(3, '0');
const newVersion = `${major}.${newMinor}`;

console.log(`📦 Versión actual: V${currentVersion}`);
console.log(`📦 Nueva versión: V${newVersion}`);

// Actualizar version.js
versionContent = versionContent.replace(
    /current:\s*"(\d+\.\d+)"/,
    `current: "${newVersion}"`
);
fs.writeFileSync(versionFilePath, versionContent, 'utf8');
console.log('✅ version.js actualizado');

// Actualizar index.html
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');
indexContent = indexContent.replace(
    /<div class="version-watermark" id="version-display">v[^<]*<\/div>/,
    `<div class="version-watermark" id="version-display">v${newVersion}</div>`
);

indexContent = indexContent.replace(
    /<script src="version\.js\?v=[^"]*"><\/script>/,
    `<script src="version.js?v=${newVersion}"></script>`
);
fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('✅ index.html actualizado');

// Actualizar CHANGELOG.md
const changelogPath = path.join(__dirname, 'CHANGELOG.md');
let changelogContent = fs.readFileSync(changelogPath, 'utf8');

// Buscar la posición para insertar el nuevo cambio (después del título)
const insertPosition = changelogContent.indexOf('---');
const date = new Date().toISOString().split('T')[0];
const newEntry = `\n## V${newVersion} - ${date}\n${changeDescription}\n`;

if (insertPosition !== -1) {
    changelogContent = 
        changelogContent.slice(0, insertPosition) +
        newEntry +
        changelogContent.slice(insertPosition);
} else {
    // Si no hay separador, añadir al final
    changelogContent += newEntry;
}

fs.writeFileSync(changelogPath, changelogContent, 'utf8');
console.log('✅ CHANGELOG.md actualizado');

console.log(`\n🎉 ¡Versión actualizada exitosamente a V${newVersion}!`);
console.log(`📝 Cambio registrado: ${changeDescription}`);
