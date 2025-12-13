const axios = require('axios');
const cheerio = require('cheerio');

class IssueTracker {
    constructor() {
        this.baseUrl = 'https://issuu.com/thebpview/docs';
        this.latestPubluuUrl = null; // Will be set if latest issue is on Publuu
    }

    /**
     * Gets the latest available issue number
     * @returns {Promise<number>} The latest issue number
     */
    async getLatestIssueNumber() {
        try {
            // First try thebpview.com current issue page which usually points to latest
            try {
                const resp = await axios.get('https://www.thebpview.com/current-issue.php');
                const html = resp.data || '';

                // Priority 1: Look for Publuu iframe (NEW - current platform since issue 310+)
                let m = html.match(/publuu\.com\/flip-book\/(\d+)\/(\d+)/i);
                if (m && m[2]) {
                    // Also check for issue number in page title
                    const titleMatch = html.match(/<p[^>]*class="title"[^>]*>Issue\s+(\d+)/i);
                    if (titleMatch && titleMatch[1]) {
                        const n = parseInt(titleMatch[1], 10);
                        if (!isNaN(n)) {
                            console.log(`Latest issue number found from Publuu embed: ${n}`);
                            // Store the publuu ID for later download
                            this.latestPubluuUrl = `https://publuu.com/flip-book/${m[1]}/${m[2]}`;
                            return n;
                        }
                    }
                }

                // Priority 2: Look for the Issuu embed iframe (for older issues)
                m = html.match(/e\.issuu\.com\/embed\.html\?d=issue[_-]?(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number found from Issuu embed: ${n}`);
                        this.latestPubluuUrl = null; // Reset publuu URL
                        return n;
                    }
                }

                // Priority 3: Try to find explicit issuu URL with issue number
                m = html.match(/issuu\.com\/thebpview\/docs\/issue[_-]?(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number found from thebpview.com docs link: ${n}`);
                        this.latestPubluuUrl = null;
                        return n;
                    }
                }

                // Priority 4: Try to find patterns like "Issue 313" in title/heading
                m = html.match(/<p[^>]*class="title"[^>]*>Issue\s+(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number inferred from title: ${n}`);
                        return n;
                    }
                }

                // Fallback: any occurrence of Issue followed by number
                m = html.match(/Issue\s+(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number inferred from current-issue.php: ${n}`);
                        return n;
                    }
                }
            } catch (innerErr) {
                console.warn('Could not use thebpview current-issue page:', innerErr.message);
                // fallthrough to previous scraping method
            }

            // Fallback: Get the main publisher page on issuu and scrape for highest Issue N
            const response = await axios.get('https://issuu.com/thebpview');
            const html = response.data;
            const $ = cheerio.load(html);

            // Search for issue links and extract the highest number
            let highestIssue = 0;

            // Search for elements containing "Issue" followed by a number
            $('a').each((i, element) => {
                const text = $(element).text().trim();
                const match = text.match(/Issue\s+(\d+)/i);
                if (match && match[1]) {
                    const issueNumber = parseInt(match[1], 10);
                    if (issueNumber > highestIssue) {
                        highestIssue = issueNumber;
                    }
                }
            });

            if (highestIssue === 0) {
                throw new Error('No issue numbers found');
            }

            console.log(`Latest issue number found: ${highestIssue}`);
            return highestIssue;
        } catch (error) {
            console.error('Error getting latest issue number:', error.message);
            throw error;
        }
    }

    /**
     * Builds the URL for a specific issue number
     * @param {number} issueNumber - The issue number
     * @returns {string} The complete issue URL
     */
    getIssueUrl(issueNumber) {
        // If we detected a Publuu URL for this issue, return it
        if (this.latestPubluuUrl) {
            return this.latestPubluuUrl;
        }
        // Otherwise use Issuu (for older issues)
        return `${this.baseUrl}/issue_${issueNumber}`;
    }

    /**
     * Gets the URL of the latest available issue
     * @returns {Promise<string>} The latest issue URL
     */
    async getLatestIssueUrl() {
        const latestNumber = await this.getLatestIssueNumber();
        return this.getIssueUrl(latestNumber);
    }

    /**
     * Checks if a given issue URL is from Publuu (new platform)
     * @param {string} url - The issue URL
     * @returns {boolean} True if it's a Publuu URL
     */
    isPubluuUrl(url) {
        return url && url.includes('publuu.com');
    }

    /**
     * Downloads a PDF from Publuu by clicking the download button on thebpview.com
     * @param {string} publuuUrl - The Publuu flip-book URL (not used, we go to thebpview.com)
     * @param {string} outputPath - Where to save the PDF
     * @returns {Promise<boolean>} Success status
     */
    async downloadFromPubluu(publuuUrl, outputPath) {
        const puppeteer = require('puppeteer');
        const fs = require('fs');
        const path = require('path');
        
        let browser;
        try {
            // We go to the thebpview.com page, not the Publuu URL
            const pageUrl = 'https://thebpview.com/current-issue.php';
            console.log(`📥 Downloading from thebpview.com...`);
            console.log(`🌐 Launching browser...`);
            
            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Launch browser
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            
            // Set download behavior
            const client = await page.target().createCDPSession();
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: dir
            });
            
            console.log(`🔗 Navigating to: ${pageUrl}`);
            
            // Navigate to the thebpview page
            await page.goto(pageUrl, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });
            
            // Wait for the iframe and content to load
            console.log(`⏳ Waiting for page to load...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log(`🔍 Looking for download button...`);
            
            // Try to find the download button - it might be in an iframe
            let clicked = false;
            
            // First try in main page
            const downloadButtonSelectors = [
                'button.Book__download',
                'button[name="Download"]',
                'button[aria-label="Download"]',
                'button[title="Download"]',
                '.Book__download'
            ];
            
            for (const selector of downloadButtonSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        console.log(`✅ Found download button in main page: ${selector}`);
                        await button.click();
                        console.log(`🖱️  Clicked download button`);
                        clicked = true;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
            
            // If not found in main page, try in iframe
            if (!clicked) {
                console.log(`🔍 Checking iframes...`);
                const frames = page.frames();
                
                for (const frame of frames) {
                    for (const selector of downloadButtonSelectors) {
                        try {
                            const button = await frame.$(selector);
                            if (button) {
                                console.log(`✅ Found download button in iframe: ${selector}`);
                                await button.click();
                                console.log(`🖱️  Clicked download button`);
                                clicked = true;
                                break;
                            }
                        } catch (err) {
                            continue;
                        }
                    }
                    if (clicked) break;
                }
            }
            
            if (!clicked) {
                throw new Error('Could not find download button on page');
            }
            
            // Wait for download to start and complete with polling
            console.log(`⏳ Waiting for download to complete (this may take several minutes)...`);
            
            let pdfFiles = [];
            const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
            const startTime = Date.now();
            const checkInterval = 5000; // Check every 5 seconds
            
            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
                try {
                    const files = fs.readdirSync(dir);
                    pdfFiles = files.filter(f => f.endsWith('.pdf') && !f.includes('.crdownload') && !f.includes('.tmp'));
                    
                    if (pdfFiles.length > 0) {
                        // Check if file size is stable (not still downloading)
                        const newestPdf = pdfFiles[0];
                        const pdfPath = path.join(dir, newestPdf);
                        const size1 = fs.statSync(pdfPath).size;
                        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const size2 = fs.statSync(pdfPath).size;
                        
                        if (size1 === size2 && size1 > 0) {
                            console.log(`✅ Download complete! File size: ${(size1 / 1024 / 1024).toFixed(2)} MB`);
                            break;
                        } else {
                            console.log(`⏳ Still downloading... Current size: ${(size2 / 1024 / 1024).toFixed(2)} MB`);
                        }
                    }
                } catch (err) {
                    // Continue waiting
                    console.log(`⏳ Waiting for file to appear...`);
                }
            }
            
            if (pdfFiles.length === 0) {
                throw new Error('Download did not complete within 5 minutes');
            }
            
            // Get the downloaded file (should be the newest PDF)
            const downloadedFile = pdfFiles.sort((a, b) => {
                const statA = fs.statSync(path.join(dir, a));
                const statB = fs.statSync(path.join(dir, b));
                return statB.mtimeMs - statA.mtimeMs;
            })[0];
            
            const downloadedPath = path.join(dir, downloadedFile);
            
            // Rename to expected output path if different
            if (downloadedPath !== outputPath) {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                fs.renameSync(downloadedPath, outputPath);
            }
            
            const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
            console.log(`✅ Successfully downloaded from thebpview.com: ${outputPath} (${fileSize} MB)`);
            
            await browser.close();
            return true;
            
        } catch (error) {
            console.error(`❌ Error downloading from thebpview.com: ${error.message}`);
            if (browser) {
                await browser.close();
            }
            return false;
        }
    }
}

module.exports = IssueTracker;
