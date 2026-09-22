# Changelog

All notable changes to the "vulnchecker" extension will be documented in this file.

## [Unreleased]

### Added
- JWT authentication system
- User account management
- Anonymous user support with credit limits
- EPSS score integration
- Cache system for API responses
- Account view panel
- Code actions for vulnerability fixes
- Hover provider for package information
- Tree view for vulnerabilities

### Changed
- Updated scan endpoints to require authentication
- Added rate limiting for API calls
- Improved error handling

## [1.0.0] - 2026-09-16

### Added
- Initial release
- Basic vulnerability scanning
- Support for npm, pypi, go, cargo, rubygems, maven, nuget
- Package.json and lock file parsing
- OSV API integration
