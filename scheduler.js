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
        this.logDir = 'logs';
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
            const issueNumber = parseInt(latestIssueUrl.split('_').pop(), 10);
            
            this.logMessage(`Latest issue URL: ${latestIssueUrl}`);
            
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
                // Download the document
                this.logMessage(`Downloading issue ${issueNumber}...`);
                downloadSuccess = await this.downloader.downloadDocument(latestIssueUrl);
                
                if (downloadSuccess) {
                    this.logMessage(`Issue ${issueNumber} downloaded successfully.`);
                } else {
                    this.logMessage(`Error downloading issue ${issueNumber}.`);
                    return;
                }
            }
            
            // Save to cache if download was successful
            if (downloadSuccess) {
                try {
                    const cachedPath = this.cache.cacheFile(filePath, issueNumber);
                    this.logMessage(`Issue ${issueNumber} saved to cache: ${cachedPath}`);
                } catch (cacheError) {
                    this.logMessage(`Error saving to cache: ${cacheError.message}`);
                }
            }
        } catch (error) {
            this.logMessage(`Error in scheduled download: ${error.message}`);
        }
    }

    /**
     * Schedules weekly download for every Wednesday at 9:00 AM
     * and periodic checks every 6 hours for new issues
     */
    scheduleWeeklyDownload() {
        // Run every Wednesday at 9:00 AM
        cron.schedule('0 9 * * 3', async () => {
            await this.downloadLatestIssue();
        });
        
        // Check every 6 hours (00:00, 06:00, 12:00, 18:00) if there's a new issue available
        cron.schedule('0 */6 * * *', async () => {
            try {
                const latestIssueNumber = await this.tracker.getLatestIssueNumber();
                const metadata = this.cache.getMetadata();
                const cachedIssueNumber = metadata ? metadata.issueNumber : 0;
                
                if (latestIssueNumber > cachedIssueNumber) {
                    this.logMessage(`🆕 New issue detected! Latest: ${latestIssueNumber}, Cached: ${cachedIssueNumber}`);
                    this.logMessage(`Cleaning old downloads and updating to issue ${latestIssueNumber}...`);
                    await this.downloadLatestIssue();
                } else {
                    this.logMessage(`✅ Cache is up to date. Latest issue: ${latestIssueNumber}`);
                }
            } catch (error) {
                this.logMessage(`Error checking for updates: ${error.message}`);
            }
        });
        
        this.logMessage('📅 Weekly download scheduled for Wednesdays at 9:00 AM');
        this.logMessage('🔄 Automatic check scheduled every 6 hours for new issues');
    }

    /**
     * Runs an immediate download of the latest issue
     */
    async runImmediateDownload() {
        await this.downloadLatestIssue();
    }
}

module.exports = DownloadScheduler;
