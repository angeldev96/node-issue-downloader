# Deployment Guide

## Pre-Deployment Checklist

Before deploying to production, follow these steps:

### 1. Clean Downloads Folder

The `predeploy` script will automatically clean the downloads folder when you run deployment commands:

```bash
npm run predeploy
```

This ensures that:
- Old issue files are removed
- Fresh downloads will happen on the new deployment
- No stale files from previous versions

### 2. Environment Variables

Set the following environment variables in your deployment platform:

```bash
PORT=3000  # or your preferred port
NODE_ENV=production
```

### 3. Deployment Commands

#### For platforms like Heroku, Railway, Render, etc.:

The `predeploy` script will run automatically before `npm start`.

#### For manual deployment:

```bash
# Pull latest code
git pull origin main

# Clean old downloads
npm run clean

# Restart the server
pm2 restart issue-downloader
# or
systemctl restart issue-downloader
```

#### For Docker:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Clean downloads before starting
RUN npm run predeploy

EXPOSE 3000

CMD ["npm", "start"]
```

## Automatic Issue Detection

The system will automatically:

1. **Check every 6 hours** for new issues (00:00, 06:00, 12:00, 18:00)
2. **Compare** the latest issue number with the cached one
3. **Clean downloads** folder if a new issue is detected
4. **Download** the new current issue
5. **Update cache** with the new file

## Manual Force Update

To manually force a download of the current issue:

```bash
# Via API
curl http://localhost:3000/api/download/latest

# Via CLI
node app.js https://issuu.com/thebpview/docs/issue_305

# Clean and restart
npm run clean && npm start
```

## Monitoring

Check logs for automatic updates:

```bash
# View today's log
cat logs/download-$(date +%Y-%m-%d).log

# Monitor in real-time
tail -f logs/download-$(date +%Y-%m-%d).log
```

## Troubleshooting

### Issue still showing old number after deployment

1. Check the logs:
   ```bash
   cat logs/download-*.log | grep "New issue detected"
   ```

2. Manually clean and trigger download:
   ```bash
   npm run clean
   curl http://localhost:3000/api/download/latest
   ```

3. Verify cache metadata:
   ```bash
   cat cache/metadata.json
   ```

### Downloads folder not cleaning

1. Check permissions:
   ```bash
   ls -la downloads/
   ```

2. Manually run clean script:
   ```bash
   node scripts/clean-downloads.js
   ```

## Production Best Practices

1. **Use Process Manager**: Use PM2, systemd, or your platform's process manager
2. **Enable Logging**: Logs are saved to `logs/` directory
3. **Monitor Disk Space**: PDFs are ~200-300MB each
4. **Set Up Alerts**: Monitor for download failures
5. **Regular Backups**: Backup the cache folder if needed
