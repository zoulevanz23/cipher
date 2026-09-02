# 🔒 Cipher - Vulnerability Dependency Scanner

A comprehensive security tool for scanning dependency vulnerabilities across multiple ecosystems with real-time OSV API integration, modern web UI, and CLI support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-19.1+-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6.svg)](https://www.typescriptlang.org/)

## ✨ Features

### 🔍 Core Security Scanning
- **Multi-Ecosystem Support**: npm, pip, Go, Maven, NuGet, RubyGems, Cargo
- **Real-time Vulnerability Detection**: Queries OSV.dev, NVD, and GitHub Advisory Database
- **Severity Classification**: Critical, High, Medium, Low with CVSS scoring
- **Lock File Support**: package-lock.json, yarn.lock, pnpm-lock.yaml, requirements.txt, go.mod, Cargo.toml

### 📊 Advanced Analytics
- **Health Scoring**: 0-100 health scores with letter grades (A-F) per package
- **License Scanning**: MIT, GPL, Apache detection and compliance checking
- **Unmaintained Detection**: Flags packages with no updates in 2+ years
- **Dependency Tree Visualization**: Transitive dependency analysis
- **Vulnerability Aging**: Track how long vulnerabilities have existed

### 🛠️ Developer Tools
- **Fix Suggestions**: Automated version upgrade recommendations
- **Risk Classification**: Safe (patch), Low Risk (minor), Breaking (major) updates
- **SBOM Export**: SPDX 2.3 and CycloneDX 1.5 formats
- **Multiple Export Formats**: SARIF (GitHub code scanning), CSV, HTML reports
- **Monorepo Support**: Auto-detects pnpm workspaces, Lerna, Nx, Turbo

### 🌐 Integration & Automation
- **Web UI**: Modern cyber-aesthetic interface with dark/light mode
- **CLI Tool**: Rich terminal output with table, JSON, and summary formats
- **VS Code Extension**: Inline vulnerability diagnostics
- **CI/CD Integration**: GitHub Actions workflows with SARIF upload
- **PR Comments**: Post scan results as GitHub PR comments
- **Security News Feed**: Live advisory feed from GitHub Advisory Database

### 📈 Historical Tracking
- **Scan History**: SQLite-backed persistent scan history
- **Trend Analysis**: Vulnerability trends over time
- **Comparative Scans**: Compare current vs previous scans

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 20+
- Git

### Installation

#### Option 1: Install from PyPI
```bash
pip install cipher
```

#### Option 2: Install from Source
```bash
git clone https://github.com/zoulevanz23/cipher.git
cd cipher
pip install -r requirements.txt
```

### Web UI Usage

1. **Start the Backend**
```bash
cd cipher
python -m uvicorn vulnchecker.main:app --reload --host 0.0.0.0 --port 8000
```

2. **Start the Frontend**
```bash
cd cipher/frontend
npm install
npm run dev
```

3. **Open in Browser**
Navigate to `http://localhost:5173`

### CLI Usage

#### Basic Scan
```bash
# Scan current directory
cipher --path .

# Scan with lock file for exact versions
cipher --path . --lock-file

# Minimum severity threshold
cipher --path . --min-severity high
```

#### Output Formats
```bash
# Table output (default)
cipher --path . --format table

# JSON output
cipher --path . --format json -o results.json

# Summary only
cipher --path . --format summary
```

#### CI/CD Integration
```bash
# Fail on vulnerabilities
cipher --path . --fail-on high

# Exit with error code if critical vulnerabilities found
cipher --path . --fail-on critical
```

#### Ecosystem Support
```bash
# Python projects
cipher --path /path/to/python-project --ecosystem pip

# Go projects
cipher --path /path/to/go-project --ecosystem go

# Rust projects
cipher --path /path/to/rust-project --ecosystem cargo
```

## 📁 Project Structure

```
cipher/
├── vulnchecker/              # Python backend
│   ├── __init__.py
│   ├── main.py              # FastAPI server
│   ├── cli.py               # CLI interface
│   ├── scanner.py           # OSV API integration
│   ├── parser.py            # Dependency parsing
│   ├── fixer.py             # Fix suggestions
│   ├── export.py            # SBOM/Report generation
│   ├── health.py            # Health scoring
│   ├── license.py           # License detection
│   ├── history.py           # Scan history
│   ├── news.py              # Security news feed
│   └── ...
├── frontend/                 # React web UI
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/            # API client
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── vite.config.ts
├── vscode-vulnchecker/      # VS Code extension
│   ├── src/
│   │   └── extension.ts    # Extension logic
│   └── package.json
├── .github/workflows/       # CI/CD workflows
├── pyproject.toml          # Python project config
├── requirements.txt         # Python dependencies
└── README.md
```

## 🔧 Configuration

### Configuration File (.cipherrc)

Create a `.cipherrc` file in your project root:

```json
{
  "min_severity": "medium",
  "ignore": [
    "GHSA-xxxx-xxxx-xxxx"
  ],
  "ignore_until": {
    "GHSA-yyyy-yyyy-yyyy": "2024-12-31"
  },
  "ecosystem": "npm",
  "use_lock_file": true
}
```

### Environment Variables

```bash
# API server URL (for web UI)
CIPHER_SERVER_URL=http://localhost:8000

# GitHub token for PR comments
GITHUB_TOKEN=your_github_token

# Custom OSV API endpoint
OSV_API_URL=https://api.osv.dev/v1
```

## 🎨 Web UI Features

### Scanning Interface
- **Paste JSON**: Directly paste package.json content
- **Upload File**: Drag-and-drop dependency files
- **Try Example**: Test with sample vulnerable packages

### Results Dashboard
- **Severity Filtering**: Filter by Critical, High, Medium, Low
- **Sortable Results**: Sort by severity or package name
- **Detailed Views**: Click packages for full vulnerability details
- **Export Options**: One-click export to multiple formats

### Visual Analytics
- **Stats Cards**: Quick overview of scan results
- **Severity Charts**: Visual breakdown of vulnerability levels
- **Health Scores**: Package health indicators
- **Trend Analysis**: Historical vulnerability trends

## 🔌 VS Code Extension

### Installation
1. Open VS Code
2. Go to Extensions
3. Search for "Cipher Vulnerability Scanner"
4. Click Install

### Features
- **Inline Diagnostics**: Vulnerability warnings in package.json
- **Scan Command**: Right-click → "Scan for vulnerabilities"
- **Results Panel**: View detailed results in sidebar
- **Quick Fix**: Apply suggested fixes directly

### Commands
- `Cipher: Scan current file`
- `Cipher: Open results panel`
- `Cipher: Clear diagnostics`

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
  schedule:
    - cron: '0 9 * * 1'  # Weekly

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Cipher
        run: pip install cipher
      
      - name: Scan dependencies
        run: cipher --path . --format json --output results.json
      
      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: results.json
```

### Pre-commit Hook

```bash
# Install pre-commit
pip install pre-commit

# Add to .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: cipher-scan
        name: Cipher Security Scan
        entry: cipher --path . --fail-on high
        language: system
        files: package.json
```

## 📊 Export Formats

### SPDX SBOM
```bash
cipher --path . --export spdx -o sbom.spdx.json
```

### CycloneDX SBOM
```bash
cipher --path . --export cyclonedx -o sbom.json
```

### SARIF (GitHub Code Scanning)
```bash
cipher --path . --export sarif -o results.sarif
```

### CSV Report
```bash
cipher --path . --export csv -o report.csv
```

### HTML Report
```bash
cipher --path . --export html -o report.html
```

## 🛡️ Security Best Practices

### Regular Scanning
- **Weekly Scans**: Schedule automated scans in CI/CD
- **Pre-commit Hooks**: Catch vulnerabilities before commit
- **PR Integration**: Block merges with new vulnerabilities

### Dependency Management
- **Lock Files**: Always use lock files for exact versions
- **Automated Updates**: Use Dependabot or Renovate with Cipher
- **Review Updates**: Test major version updates carefully

### Incident Response
- **Prioritize Critical**: Address critical vulnerabilities immediately
- **Track Aging**: Monitor how long vulnerabilities remain unpatched
- **Document Fixes**: Keep records of security remediation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/zoulevanz23/cipher.git
cd cipher

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install

# Run development servers
# Terminal 1: Backend
cd ..
python -m uvicorn vulnchecker.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OSV.dev** - Open Source Vulnerabilities database
- **NVD** - National Vulnerability Database
- **GitHub Advisory Database** - Security advisories
- **FastAPI** - Modern Python web framework
- **React** - JavaScript library for building UIs
- **Vite** - Next generation frontend tooling

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/zoulevanz23/cipher/issues)
- **Documentation**: [Wiki](https://github.com/zoulevanz23/cipher/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/zoulevanz23/cipher/discussions)

## 🔗 Links

- **Repository**: [https://github.com/zoulevanz23/cipher](https://github.com/zoulevanz23/cipher)
- **PyPI**: [https://pypi.org/project/cipher/](https://pypi.org/project/cipher/)
- **VS Code Marketplace**: [Link to extension]
- **Documentation**: [Full Documentation](https://cipher.dev/docs)

---

Made with 🔒 by [zoulevanz23](https://github.com/zoulevanz23)
