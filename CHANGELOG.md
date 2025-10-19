# Changelog

## [1.1.0] - 2025-10-19

### Added
- **Current Issue Detection**: Automatically detects the latest issue from `https://thebpview.com/current-issue.php` by parsing the Issuu embed iframe
- **SHA256 Checksums**: All cached files now include SHA256 checksums in metadata for integrity verification
- **File Validation Tool**: New `tools/validate_pdf.js` script to verify cached PDF integrity
- **End-to-End Test**: New `tools/test_download.js` script for automated download and validation testing
- **NPM Scripts**: Added `npm run validate` and `npm test` commands for quick validation

### Fixed
- **Binary File Handling**: Fixed truncation issues by using proper Buffer handling in HTTP responses instead of string concatenation
- **Atomic File Writes**: Downloads now write to temporary files first, then atomically rename to prevent serving incomplete files
- **Issue Number Detection**: Fixed issue tracker to prioritize Issuu embed URL over other matches, ensuring correct issue is always downloaded

### Improved
- **Streaming Downloads**: API now serves files using `fs.createReadStream` with proper `Content-Length` headers
- **Response Headers**: Added `X-Content-Checksum` header to all file responses for client-side validation
- **Error Handling**: Enhanced error handling for stream errors during file serving
- **Download Process**: Improved download reliability with better error handling and file validation

### Changed
- `IssueTracker.getLatestIssueNumber()`: Now prioritizes thebpview.com current-issue page embed detection
- `CacheManager.cacheFile()`: Now computes and stores SHA256 checksum and file size in metadata
- `api.js`: File serving endpoints now use streams instead of `sendFile` for better control

## [1.0.0] - Initial Release

### Features
- Automatic Issuu document downloads
- Smart caching system
- RESTful API
- Scheduled weekly downloads
- Daily monitoring for new issues
- CLI interface
