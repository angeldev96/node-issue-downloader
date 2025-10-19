#!/usr/bin/env node

/**
 * Clean downloads folder
 * Used before deployment to ensure fresh downloads
 */

const fs = require('fs');
const path = require('path');

const downloadsDir = path.join(__dirname, '..', 'downloads');

function cleanDownloads() {
    console.log('🧹 Cleaning downloads folder...');
    
    if (!fs.existsSync(downloadsDir)) {
        console.log('✅ Downloads folder does not exist, nothing to clean');
        return;
    }

    const files = fs.readdirSync(downloadsDir);
    let deletedCount = 0;

    for (const file of files) {
        if (file === '.gitkeep') continue; // Preserve .gitkeep if exists
        
        const filePath = path.join(downloadsDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                fs.unlinkSync(filePath);
                console.log(`   Deleted: ${file}`);
                deletedCount++;
            }
        } catch (err) {
            console.error(`   Error deleting ${file}:`, err.message);
        }
    }

    console.log(`✅ Cleaned ${deletedCount} file(s) from downloads folder`);
}

if (require.main === module) {
    cleanDownloads();
}

module.exports = cleanDownloads;
