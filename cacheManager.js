const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Cache manager for downloaded files
 * Maintains only the latest available file and removes previous ones
 */
class CacheManager {
    constructor() {
        // Use /app/downloads directly if it exists (Railway), otherwise use local cache directory
        const fs = require('fs');
        this.cacheDir = fs.existsSync('/app/downloads') ? '/app/downloads' : 'cache';
        this.ensureCacheDir();
    }

    /**
     * Creates the cache directory if it doesn't exist
     */
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Saves a file to cache - SIMPLE VERSION
     * @param {string} sourceFilePath - Source file path
     * @param {number} issueNumber - Issue number
     * @returns {string} - Cached file path
     */
    cacheFile(sourceFilePath, issueNumber) {
        if (!fs.existsSync(sourceFilePath)) {
            throw new Error(`Source file does not exist: ${sourceFilePath}`);
        }

        // Always use the same filename for simplicity
        const cacheFileName = `latest_issue.pdf`;
        const cacheFilePath = path.join(this.cacheDir, cacheFileName);

        // Delete old file if exists
        if (fs.existsSync(cacheFilePath)) {
            fs.unlinkSync(cacheFilePath);
            console.log(`Old file deleted: ${cacheFilePath}`);
        }

        // Copy new file
        fs.copyFileSync(sourceFilePath, cacheFilePath);
        console.log(`✅ File saved: ${cacheFilePath}`);

        // Save simple metadata
        const stats = fs.statSync(cacheFilePath);
        this.saveMetadata(issueNumber, null, stats.size);
        
        return cacheFilePath;
    }

    /**
     * Saves metadata for the latest issue in cache
     * @param {number} issueNumber - Issue number
     */
    saveMetadata(issueNumber, checksum = null, fileSize = null) {
        const metadata = {
            issueNumber,
            cachedAt: new Date().toISOString(),
            fileName: `latest_issue.pdf`
        };

        if (checksum) metadata.checksum = checksum;
        if (fileSize !== null) metadata.fileSize = fileSize;

        fs.writeFileSync(
            path.join(this.cacheDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
    }

    /**
     * Gets metadata for the latest issue in cache
     * @returns {Object|null} - Metadata or null if no cache exists
     */
    getMetadata() {
        const metadataPath = path.join(this.cacheDir, 'metadata.json');
        
        if (!fs.existsSync(metadataPath)) {
            return null;
        }
        
        try {
            const data = fs.readFileSync(metadataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading cache metadata:', error);
            return null;
        }
    }

    /**
     * Checks if a specific issue is in cache
     * @param {number} issueNumber - Issue number to check
     * @returns {boolean} - true if in cache
     */
    isIssueInCache(issueNumber) {
        const metadata = this.getMetadata();
        return metadata !== null && metadata.issueNumber === issueNumber;
    }

    /**
     * Gets the cached file path - SIMPLE VERSION
     * @returns {string|null} - File path or null if doesn't exist
     */
    getCachedFilePath() {
        const filePath = path.join(this.cacheDir, 'latest_issue.pdf');
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        return filePath;
    }

    /**
     * Clears all files from cache except metadata.json and current issue
     * @param {number} currentIssueNumber - Current issue number to preserve
     */
    clearCache(currentIssueNumber = null) {
        if (!fs.existsSync(this.cacheDir)) {
            return;
        }
        
        const files = fs.readdirSync(this.cacheDir);
        const metadata = this.getMetadata();
        const currentFileName = metadata ? metadata.fileName : (currentIssueNumber ? `latest_issue_${currentIssueNumber}.pdf` : null);
        
        for (const file of files) {
            // Skip metadata.json, current latest file, and directories
            if (file === 'metadata.json' || file === currentFileName || file === 'logs' || file === 'cache' || file === 'lost+found') {
                continue;
            }
            
            const filePath = path.join(this.cacheDir, file);
            
            // Only delete files, not directories
            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    fs.unlinkSync(filePath);
                    console.log(`Old file removed from cache: ${filePath}`);
                }
            } catch (err) {
                console.error(`Error removing file ${filePath}:`, err.message);
            }
        }
    }

    /**
     * Checks if cache is up to date by comparing with issue number
     * @param {number} latestIssueNumber - Latest available issue number
     * @returns {boolean} - true if cache is up to date
     */
    isCacheUpToDate(latestIssueNumber) {
        const metadata = this.getMetadata();
        return metadata !== null && metadata.issueNumber >= latestIssueNumber;
    }
}

module.exports = CacheManager;
