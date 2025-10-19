#!/usr/bin/env node

/**
 * End-to-end test script for downloading and validating the latest issue
 * Usage: node tools/test_download.js [--port=3000]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '3000';
const BASE_URL = `http://localhost:${PORT}`;
const MAX_WAIT_MINUTES = 10;
const POLL_INTERVAL_MS = 15000; // 15 seconds

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checksumFile(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function magicHeaderMatches(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  return buf.toString('utf8').startsWith('%PDF');
}

async function main() {
  console.log('🧪 Starting end-to-end download test...\n');

  // Step 1: Get latest issue info
  console.log('📋 Step 1: Getting latest issue info...');
  const latestInfo = await request(`${BASE_URL}/api/latest`);
  console.log(`   Issue Number: ${latestInfo.issueNumber}`);
  console.log(`   Issue URL: ${latestInfo.issueUrl}`);
  console.log(`   Already Downloaded: ${latestInfo.isDownloaded}\n`);

  const issueNumber = latestInfo.issueNumber;

  // Step 2: Trigger download
  console.log('⬇️  Step 2: Triggering download...');
  const downloadResp = await request(`${BASE_URL}/api/download/latest`);
  console.log(`   Response: ${JSON.stringify(downloadResp)}\n`);

  // Step 3: Poll for completion
  console.log('⏳ Step 3: Polling for download completion...');
  const startTime = Date.now();
  const maxWaitMs = MAX_WAIT_MINUTES * 60 * 1000;
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;
    await sleep(POLL_INTERVAL_MS);

    const status = await request(`${BASE_URL}/api/status/${issueNumber}`);
    console.log(`   [${attempts}] Status: ${status.status}, Size: ${status.fileSizeMB || 'N/A'} MB`);

    if (status.status === 'cached' || status.status === 'completed') {
      console.log(`   ✅ Download completed!\n`);
      
      // Step 4: Validate the file
      console.log('🔍 Step 4: Validating downloaded file...');
      
      const cacheDir = path.join(__dirname, '..', 'cache');
      const metadataPath = path.join(cacheDir, 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        console.error('   ❌ metadata.json not found in cache');
        process.exit(1);
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const filePath = path.join(cacheDir, metadata.fileName);

      if (!fs.existsSync(filePath)) {
        console.error(`   ❌ File not found: ${filePath}`);
        process.exit(1);
      }

      const stats = fs.statSync(filePath);
      console.log(`   File: ${metadata.fileName}`);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);

      const matchesMagic = magicHeaderMatches(filePath);
      console.log(`   Magic header (%PDF): ${matchesMagic ? '✅' : '❌'}`);

      if (!matchesMagic) {
        console.error('   ❌ File does not start with %PDF - likely corrupted');
        process.exit(1);
      }

      const computed = checksumFile(filePath);
      console.log(`   SHA256: ${computed}`);

      if (metadata.checksum) {
        const matches = computed === metadata.checksum;
        console.log(`   Checksum matches metadata: ${matches ? '✅' : '❌'}`);
        if (!matches) {
          console.error('   ❌ Checksum mismatch!');
          process.exit(1);
        }
      } else {
        console.log('   ⚠️  No checksum in metadata to compare');
      }

      console.log('\n🎉 All validations passed!');
      process.exit(0);
    }

    if (status.status === 'not_found' && attempts > 2) {
      console.error('   ❌ File not found after multiple attempts');
      process.exit(1);
    }
  }

  console.error(`\n❌ Timeout: Download did not complete within ${MAX_WAIT_MINUTES} minutes`);
  process.exit(1);
}

main().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
