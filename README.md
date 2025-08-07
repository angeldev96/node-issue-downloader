# Issue Downloader 🔽

An Issuu document downloader developed in Node.js.

## ✨ Features

- 📄 Downloads individual Issuu documents as PDF
- 🚀 Simple command-line interface
- ⚡ Fast and efficient
- 🔄 Conversion progress monitoring
- 📁 Automatic organization into `downloads` folder
- 🛡️ Robust error handling

## 🚀 Installation

### Requirements
- Node.js 12.0.0 or higher

### Local Installation
```bash
# Clone or download the project
cd issue-downloader

# The script is ready to use, no additional dependencies required
```

## 📖 Usage

### Basic Command
```bash
node app.js <ISSUU_URL>
```

### Examples

#### Download Issue 296
```bash
node app.js https://issuu.com/thebpview/docs/issue_296
```

#### Download with Custom Name
```bash
node app.js https://issuu.com/thebpview/docs/issue_296 "The Boro Park View - Issue 296"
```

#### Use as Executable
```bash
# Make executable (one time only)
chmod +x app.js

# Run directly
./app.js https://issuu.com/thebpview/docs/issue_296
```

### Available npm Scripts
```bash
# Run with npm
npm start https://issuu.com/thebpview/docs/issue_296

# Run predefined test
npm test
```

## 📁 File Structure

```
issue-downloader/
├── app.js          # Main script
├── package.json    # Project configuration
├── README.md       # This file
└── downloads/      # Folder where PDFs are saved (automatically created)
```

## 🔧 How it Works

1. **URL Submission**: The script sends the Issuu document URL to the conversion API
2. **Processing**: The server converts the document to PDF
3. **Monitoring**: Conversion progress is checked every 10 seconds
4. **Download**: Once completed, the PDF is downloaded to the `downloads` folder
5. **Verification**: File size and integrity are confirmed

## 📋 Supported URL Formats

✅ **Valid URLs:**
- `https://issuu.com/user/docs/document`
- `https://www.issuu.com/user/docs/document`

❌ **Invalid URLs:**
- URLs not from issuu.com
- URLs with additional parameters

## 🎯 Example Output

```
🔽 Issuu Document Downloader
=====================================

📄 Document: issue 296
💾 Output File: downloads/issue 296.pdf
🔄 Starting conversion for: https://issuu.com/thebpview/docs/issue_296
📋 Server Response: { id: '68298', status: 'created', progress: 0 }
⏳ Waiting for processing (ID: 68298)...
📊 Status: processing - Progress: 45%
📊 Status: processing - Progress: 78%
📊 Status: succeeded - Progress: 100%
⬇️  Downloading PDF from: https://pdf.img2pdf.net/download/...
✅ Download complete!
📊 Size: 141.23 MB

🎉 Download successful! Check the "downloads" folder.
```

## 🛠️ Troubleshooting

### Error: "URL must be from issuu.com"
- Verify that the URL is correct and contains `issuu.com`

### Error: "Timeout"
- The document might be too large or the server is busy
- Try again later

### Error: "Conversion failed on server"
- The document might not be available for download
- Verify that the document is public



## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributions

Contributions are welcome! If you find any bugs or have ideas for improvements, feel free to create an issue or pull request.

---

**Enjoy downloading your Issuu documents! 🎉**