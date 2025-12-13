#!/usr/bin/env node

/**
 * Script de Verificación Rápida
 * Verifica que el sistema está funcionando correctamente
 */

const IssueTracker = require('../issueTracker');
const CacheManager = require('../cacheManager');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificación del Sistema de Issues\n');
console.log('='.repeat(50));

async function verificar() {
    try {
        // 1. Verificar detección del último issue
        console.log('\n1️⃣  Verificando detección del último issue...');
        const tracker = new IssueTracker();
        const latestIssueNumber = await tracker.getLatestIssueNumber();
        const latestIssueUrl = tracker.getIssueUrl(latestIssueNumber);
        
        console.log(`   ✅ Último issue detectado: ${latestIssueNumber}`);
        console.log(`   📎 URL: ${latestIssueUrl}`);
        
        // 2. Verificar estado del cache
        console.log('\n2️⃣  Verificando estado del cache...');
        const cache = new CacheManager();
        const metadata = cache.getMetadata();
        
        if (metadata) {
            console.log(`   ✅ Cache existe`);
            console.log(`   📄 Issue en cache: ${metadata.issueNumber}`);
            console.log(`   📅 Cacheado: ${new Date(metadata.cachedAt).toLocaleString('es-ES')}`);
            
            if (metadata.checksum) {
                console.log(`   🔒 Checksum: ${metadata.checksum.substring(0, 16)}...`);
            }
            
            if (metadata.fileSize) {
                console.log(`   📦 Tamaño: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);
            }
            
            // Verificar si el archivo existe
            const cachedFilePath = cache.getCachedFilePath();
            if (cachedFilePath && fs.existsSync(cachedFilePath)) {
                console.log(`   ✅ Archivo de cache existe: ${path.basename(cachedFilePath)}`);
            } else {
                console.log(`   ⚠️  Archivo de cache no encontrado`);
            }
            
            // Comparar con el último issue
            if (metadata.issueNumber === latestIssueNumber) {
                console.log(`   ✅ Cache está ACTUALIZADO`);
            } else if (metadata.issueNumber < latestIssueNumber) {
                console.log(`   ⚠️  Cache está DESACTUALIZADO`);
                console.log(`   📥 Se necesita descargar issue ${latestIssueNumber}`);
            }
        } else {
            console.log(`   ⚠️  No hay cache disponible`);
            console.log(`   📥 Se necesita descargar issue ${latestIssueNumber}`);
        }
        
        // 3. Verificar estructura de directorios
        console.log('\n3️⃣  Verificando estructura de directorios...');
        const dirs = ['cache', 'downloads', 'logs'];
        
        for (const dir of dirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(f => f !== '.gitkeep');
                console.log(`   ✅ ${dir}/ existe (${files.length} archivo${files.length !== 1 ? 's' : ''})`);
            } else {
                console.log(`   ⚠️  ${dir}/ no existe`);
            }
        }
        
        // 4. Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN:');
        console.log('='.repeat(50));
        console.log(`Último issue disponible: ${latestIssueNumber}`);
        console.log(`Issue en cache: ${metadata ? metadata.issueNumber : 'ninguno'}`);
        console.log(`Estado: ${metadata && metadata.issueNumber === latestIssueNumber ? '✅ ACTUALIZADO' : '⚠️ NECESITA ACTUALIZACIÓN'}`);
        console.log('='.repeat(50));
        
        console.log('\n💡 Comandos útiles:');
        console.log('   npm start              - Iniciar el servidor');
        console.log('   npm run download-latest - Descargar último issue');
        console.log('   npm run validate       - Validar PDF en cache');
        console.log('   npm test               - Test completo E2E');
        
    } catch (error) {
        console.error('\n❌ Error durante la verificación:', error.message);
        process.exit(1);
    }
}

verificar();
