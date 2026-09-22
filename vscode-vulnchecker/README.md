# VulnChecker VSCode Extension

A VSCode extension for checking dependency vulnerabilities in your projects.

## Features

- **Multi-ecosystem support**: npm, PyPI, Go, Cargo, RubyGems, Maven, NuGet
- **Real-time scanning**: Scan your dependencies for known vulnerabilities
- **Authentication**: Create an account for unlimited scans
- **Anonymous mode**: Limited scans without account (5 per day)
- **EPSS scores**: Exploit Prediction Scoring System integration
- **Fix suggestions**: Get automated fix suggestions for vulnerable packages
- **Export reports**: Generate SARIF, SPDX, CycloneDX, and CSV reports

## Installation

1. Install the extension from the VSCode Marketplace
2. Start the VulnChecker server: `python -m uvicorn vulnchecker.main:app --reload`
3. Configure the server URL in VSCode settings (default: `http://localhost:8000`)

## Usage

### Scanning Dependencies

1. Open a project with a package manifest (package.json, requirements.txt, etc.)
2. Right-click on the file and select "Scan for Vulnerabilities"
3. View results in the VulnChecker panel

### Authentication

1. Click the account icon in the status bar
2. Choose "Create Account" or "Sign In"
3. Enter your email and password
4. Get unlimited scans!

### Anonymous Mode

If you don't want to create an account, you can use anonymous mode with 5 scans per day.

## Configuration

- `vulnchecker.serverUrl`: The URL of the VulnChecker server (default: `http://localhost:8000`)
- `vulnchecker.ignorePackages`: List of packages to ignore during scans
- `vulnchecker.minSeverity`: Minimum severity to report (low, medium, high, critical)

## Commands

- `vulnchecker.scanFile`: Scan the current file for vulnerabilities
- `vulnchecker.scanProject`: Scan the entire project
- `vulnchecker.showAccount`: Show account information
- `vulnchecker.signIn`: Sign in to your account
- `vulnchecker.signOut`: Sign out of your account

## License

MIT
