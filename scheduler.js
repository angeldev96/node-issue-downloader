const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const IssuuDownloader = require('./app');
const IssueTracker = require('./issueTracker');
const CacheManager = require('./cacheManager');

class DownloadScheduler {
    constructor() {
        this.downloader = new IssuuDownloader();
        this.tracker = new IssueTracker();
        this.cache = new CacheManager();
        // Use /app/downloads if it exists (Railway), otherwise use local logs directory
        const fs = require('fs');
        this.logDir = fs.existsSync('/app/downloads') ? '/app/downloads' : 'logs';
        this.ensureLogDir();
    }

    /**
     * Creates the logs directory if it doesn't exist
     */
    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Logs a message to the log file
     * @param {string} message - The message to log
     */
    logMessage(message) {
        const date = new Date();
        const logFile = path.join(this.logDir, `download-${date.toISOString().split('T')[0]}.log`);
        const logEntry = `[${date.toISOString()}] ${message}\n`;
        
        fs.appendFileSync(logFile, logEntry);
        console.log(message);
    }

    /**
     * Cleans downloads folder to remove old issues
     */
    cleanDownloads() {
        try {
            const downloadsDir = this.downloader.outputDir;
            if (!fs.existsSync(downloadsDir)) {
                return;
            }

            const files = fs.readdirSync(downloadsDir);
            let deletedCount = 0;

            for (const file of files) {
                if (file === '.gitkeep') continue;
                
                const filePath = path.join(downloadsDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isFile()) {
                        fs.unlinkSync(filePath);
                        this.logMessage(`Deleted old file: ${file}`);
                        deletedCount++;
                    }
                } catch (err) {
                    this.logMessage(`Error deleting ${file}: ${err.message}`);
                }
            }

            if (deletedCount > 0) {
                this.logMessage(`Cleaned ${deletedCount} file(s) from downloads folder`);
            }
        } catch (error) {
            this.logMessage(`Error cleaning downloads: ${error.message}`);
        }
    }

    /**
     * Downloads the latest available issue and saves it to cache
     */
    async downloadLatestIssue() {
        try {
            this.logMessage('Starting scheduled download of latest issue...');
            
            // Get the latest issue URL
            const latestIssueUrl = await this.tracker.getLatestIssueUrl();
            const issueNumber = await this.tracker.getLatestIssueNumber();
            
            this.logMessage(`Latest issue URL: ${latestIssueUrl}`);
            this.logMessage(`Issue number: ${issueNumber}`);
            
            // Check if already in cache
            if (this.cache.isIssueInCache(issueNumber)) {
                this.logMessage(`Issue ${issueNumber} is already in cache.`);
                return;
            }
            
            // New issue detected - clean old downloads
            this.logMessage(`New issue ${issueNumber} detected. Cleaning old downloads...`);
            this.cleanDownloads();
            
            // Check if file already exists in downloads
            const fileName = `issue ${issueNumber}.pdf`;
            const filePath = path.join(this.downloader.outputDir, fileName);
            
            let downloadSuccess = false;
            
            if (fs.existsSync(filePath)) {
                this.logMessage(`Issue ${issueNumber} has already been downloaded previously.`);
                downloadSuccess = true;
            } else {
                // Check if this is a Publuu URL (new platform) or Issuu (old platform)
                if (this.tracker.isPubluuUrl(latestIssueUrl)) {
                    this.logMessage(`Downloading issue ${issueNumber} from Publuu...`);
                    downloadSuccess = await this.tracker.downloadFromPubluu(latestIssueUrl, filePath);
                } else {
                    // Use the old Issuu downloader
                    this.logMessage(`Downloading issue ${issueNumber} from Issuu...`);
                    downloadSuccess = await this.downloader.downloadDocument(latestIssueUrl);
                }
                
                if (downloadSuccess) {
                    this.logMessage(`Issue ${issueNumber} downloaded successfully.`);
                } else {
                    this.logMessage(`Error downloading issue ${issueNumber}.`);
                    return;
                }
            }
            
            // Save to cache if download was successful AND file exists
            if (downloadSuccess && fs.existsSync(filePath)) {
                try {
                    this.logMessage(`Verifying file before caching: ${filePath}`);
                    const stats = fs.statSync(filePath);
                    this.logMessage(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                    
                    const cachedPath = this.cache.cacheFile(filePath, issueNumber);
                    this.logMessage(`Issue ${issueNumber} saved to cache: ${cachedPath}`);
                } catch (cacheError) {
                    this.logMessage(`Error saving to cache: ${cacheError.message}`);
                    console.error('Cache error stack:', cacheError.stack);
                }
            } else if (downloadSuccess && !fs.existsSync(filePath)) {
                this.logMessage(`Warning: Download reported success but file not found: ${filePath}`);
            }
        } catch (error) {
            this.logMessage(`Error in scheduled download: ${error.message}`);
        }
    }

    /**
     * Schedules daily checks and automatic downloads when new issues are detected
     * This ensures we always have the latest issue cached
     */
    scheduleWeeklyDownload() {
        // Check DAILY at 10:00 AM if there's a new issue available
        cron.schedule('0 10 * * *', async () => {
            this.logMessage('🔍 Running daily check for new issues...');
            try {
                const latestIssueNumber = await this.tracker.getLatestIssueNumber();
                const metadata = this.cache.getMetadata();
                const cachedIssueNumber = metadata ? metadata.issueNumber : 0;
                
                if (latestIssueNumber > cachedIssueNumber) {
                    this.logMessage(`🆕 New issue detected! Latest: ${latestIssueNumber}, Cached: ${cachedIssueNumber}`);
                    this.logMessage(`Downloading and caching new issue ${latestIssueNumber}...`);
                    await this.downloadLatestIssue();
                } else {
                    this.logMessage(`✅ Cache is up to date. Latest issue: ${latestIssueNumber}`);
                }
            } catch (error) {
                this.logMessage(`❌ Error checking for updates: ${error.message}`);
            }
        });
        
        // Additional check every 6 hours for redundancy
        cron.schedule('0 */6 * * *', async () => {
            try {
                const latestIssueNumber = await this.tracker.getLatestIssueNumber();
                const metadata = this.cache.getMetadata();
                const cachedIssueNumber = metadata ? metadata.issueNumber : 0;
                
                if (latestIssueNumber > cachedIssueNumber) {
                    this.logMessage(`🆕 New issue detected during 6-hour check! Latest: ${latestIssueNumber}, Cached: ${cachedIssueNumber}`);
                    this.logMessage(`Downloading and caching new issue ${latestIssueNumber}...`);
                    await this.downloadLatestIssue();
                }
            } catch (error) {
                this.logMessage(`Error in 6-hour check: ${error.message}`);
            }
        });
        
        // Also run check immediately on startup to ensure we have the latest
        this.logMessage('🚀 Running initial check for latest issue...');
        setTimeout(async () => {
            try {
                const latestIssueNumber = await this.tracker.getLatestIssueNumber();
                const metadata = this.cache.getMetadata();
                const cachedIssueNumber = metadata ? metadata.issueNumber : 0;
                
                if (latestIssueNumber > cachedIssueNumber) {
                    this.logMessage(`🆕 New issue found on startup! Latest: ${latestIssueNumber}, Cached: ${cachedIssueNumber || 'none'}`);
                    await this.downloadLatestIssue();
                } else {
                    this.logMessage(`✅ Cache is already up to date with issue ${latestIssueNumber}`);
                }
            } catch (error) {
                this.logMessage(`Error in startup check: ${error.message}`);
            }
        }, 5000); // Wait 5 seconds after startup
        
        this.logMessage('📅 Daily check scheduled for 10:00 AM every day');
        this.logMessage('🔄 Additional checks every 6 hours for new issues');
        this.logMessage('✨ Startup check will run in 5 seconds');
    }

    /**
     * Runs an immediate download of the latest issue
     */
    async runImmediateDownload() {
        await this.downloadLatestIssue();
    }
}

module.exports = DownloadScheduler;
