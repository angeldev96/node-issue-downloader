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
            // Get the main publisher page
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
