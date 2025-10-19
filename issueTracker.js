const axios = require('axios');
const cheerio = require('cheerio');

class IssueTracker {
    constructor() {
        this.baseUrl = 'https://issuu.com/thebpview/docs';
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

                // Priority 1: Look for the Issuu embed iframe (most reliable source)
                let m = html.match(/e\.issuu\.com\/embed\.html\?d=issue[_-]?(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number found from Issuu embed: ${n}`);
                        return n;
                    }
                }

                // Priority 2: Try to find explicit issuu URL with issue number
                m = html.match(/issuu\.com\/thebpview\/docs\/issue[_-]?(\d+)/i);
                if (m && m[1]) {
                    const n = parseInt(m[1], 10);
                    if (!isNaN(n)) {
                        console.log(`Latest issue number found from thebpview.com docs link: ${n}`);
                        return n;
                    }
                }

                // Priority 3: Try to find patterns like "Issue 305" or "issue_305" in title/heading
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
}

module.exports = IssueTracker;
