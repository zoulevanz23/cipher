# Cipher — Dependency Vulnerability Scanner

## Overview

Cipher is a full-stack web application + CLI tool that scans npm/javasScript project dependencies against the Open Source Vulnerabilities (OSV) database and returns severity-graded vulnerability reports. It parses `package.json`, `package-lock.json`, and `yarn.lock` files, queries the OSV API in real time, and displays results in a modern cyber-aesthetic web UI or a terminal-based rich CLI.

**Creator:** Josh Ivan Sartin  
**License:** MIT — 2026  
**Repository:** `https://github.com/bamwinbam-cloud/vulnchecker`

---

## Project Structure

```
vuln-checker/
├── .gitignore                          # Git exclusion rules
├── pyproject.toml                      # Python project metadata & dependencies
├── requirements.txt                    # pip-installable Python deps
├── prompt.md                           # This file — full app documentation
│
├── backend/
│   ├── __init__.py                     # Package marker
│   ├── parser.py                       # Parses package.json / lock files into Package objects
│   ├── scanner.py                      # Queries OSV API with concurrent requests
│   ├── main.py                         # FastAPI REST server (API endpoints)
│   └── cli.py                          # Click-based CLI tool with Rich output
│
└── frontend/
    ├── index.html                      # Vite entry HTML (loads React app)
    ├── package.json                    # Node dependencies (React, Vite, Tailwind, dropzone)
    ├── vite.config.ts                  # Vite config (React plugin, Tailwind, API proxy)
    ├── tsconfig.json                   # TypeScript strict config
    ├── public/
    │   └── favicon.svg                 # Eye icon favicon (neon green)
    └── src/
        ├── main.tsx                    # React root — renders <App /> into #root
        ├── index.css                   # Tailwind imports, theme variables, custom animations
        ├── vite-env.d.ts               # Vite client type declarations
        ├── App.tsx                     # Root component — orchestrates all sub-components
        ├── types/
        │   └── index.ts                # TypeScript interfaces for the entire data model
        ├── api/
        │   └── client.ts               # HTTP client — calls backend /api/scan & /api/health
        └── components/
            ├── Navbar.tsx              # Top navigation bar with logo, ./about, OSV link, ONLINE badge
            ├── Hero.tsx                # Landing hero section with glitch title, typewriter, binary anims
            ├── ScanForm.tsx            # Tabbed input: paste JSON, upload/drag file, or try example
            ├── StatsCards.tsx          # 4 summary cards: packages scanned, vulnerable, total vulns, severity breakdown
            ├── ResultsDashboard.tsx    # Filterable/sortable list of scanned packages with severity badges
            ├── VulnDetail.tsx          # Modal overlay showing full vulnerability details per package
            ├── About.tsx               # Modal overlay with creator, data sources, tech stack info
            └── Footer.tsx              # Footer with version, about link, creator credit, API attribution
```

---

## Backend — Detailed File Descriptions

### `backend/parser.py`

**Purpose:** Reads raw file content (JSON or yarn.lock format) and extracts a list of `Package` objects with clean, queryable version strings.

**Classes:**

- **`Package`** (dataclass)
  - `name: str` — package name (e.g., `"lodash"`)
  - `version: str` — cleaned semver version (e.g., `"4.17.20"`)
  - `type: str` — `"dependency"` or `"devDependency"`

**Functions:**

| Function | Input | Output | Logic |
|---|---|---|---|
| `clean_version(raw)` | `str` like `"^4.17.20"` | `"4.17.20"` | Strips `^`, `~`, `||` ranges, `-pre` suffixes, non-numeric chars |
| `parse_package_json(content)` | Raw `package.json` string | `list[Package]` | Parses JSON, iterates `dependencies` and `devDependencies`, calls `clean_version` |
| `parse_package_lock(content)` | Raw `package-lock.json` string | `list[Package]` | Parses `packages` object, deduplicates by name, extracts resolved versions |
| `parse_yarn_lock(content)` | Raw `yarn.lock` string | `list[Package]` | Regex-based parser — matches `"name@version":` blocks, extracts version strings, deduplicates |
| `parse_dependencies(...)` | Optional package_json_str, lock_file_str, lock_file_type | `list[Package]` | **Dispatcher** — if lock file provided, routes to appropriate lock parser; otherwise parses package_json |

**Key design decisions:**
- Lock files take priority over `package.json` because they contain exact resolved versions (more accurate for vulnerability queries)
- Deduplication (`seen` set) prevents duplicate entries when the same package appears multiple times in a lock file
- `clean_version` aggressively normalizes semver ranges into concrete versions for the API query

---

### `backend/scanner.py`

**Purpose:** Takes a list of `Package` objects, queries the OSV API (`api.osv.dev/v1/query`) concurrently, and returns structured `ScanResult` objects with all vulnerability details.

**Constants:**

| Constant | Value | Purpose |
|---|---|---|
| `OSV_API` | `"https://api.osv.dev/v1"` | Base URL for the OSV REST API |
| `RETRY_DELAY` | `1.0` | Seconds to wait between retry attempts |
| `MAX_RETRIES` | `3` | Max number of HTTP retries per package |
| `MAX_CONCURRENT` | `20` | Max simultaneous API requests (semaphore limit) |

**Classes:**

- **`Vulnerability`** (dataclass)
  - `id: str` — OSV ID (e.g., `"GHSA-35jh-r3h4-6jhm"`)
  - `summary: str` — Human-readable description
  - `aliases: list[str]` — CVE IDs (e.g., `"CVE-2021-23337"`)
  - `severity: str` — One of `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`
  - `published: str` — ISO 8601 publish date
  - `modified: str` — ISO 8601 last modified date
  - `affected_versions: list[str]` — Version ranges where the vuln applies
  - `references: list[dict]` — List of `{type, url}` reference objects

- **`ScanResult`** (dataclass)
  - `package: Package` — The package that was scanned
  - `vulnerabilities: list[Vulnerability]` — All found vulns for this package
  - `max_severity` (property) — Returns the highest severity across all vulns (or `"NONE"`)

**Functions:**

| Function | Input | Output | Logic |
|---|---|---|---|
| `_parse_severity(osv_entry)` | OSV API response dict | `str` severity | Checks `database_specific.severity` first, then falls back to CVSS score threshold: ≥9.0→CRITICAL, ≥7.0→HIGH, ≥4.0→MEDIUM, >0→LOW |
| `_parse_osv_entry(osv_entry)` | OSV API response dict | `Vulnerability` | Extracts all fields including affected version ranges from `affected[].ranges[].events` |
| `query_package(client, sem, package)` | HTTPX client, semaphore, Package | `ScanResult` | Builds OSV query body, POSTs to `/v1/query`, retries on 429/network errors |
| `scan(packages)` | `list[Package]` | `list[ScanResult]` | Creates semaphore-limited concurrent tasks, gathers all results |

**Key design decisions:**
- Uses `asyncio.Semaphore(20)` to limit concurrent requests — prevents overwhelming the OSV API or hitting rate limits
- Retries up to 3 times with exponential backoff on HTTP 429 (rate limit) or network errors
- The batch endpoint (`/v1/querybatch`) was tested but returns only `id`/`modified` fields (no severity/summary) — single queries are used instead for full data
- Severity is inferred both from `database_specific.severity` (GitHub/GHSA style) and from CVSS v3 score thresholds

---

### `backend/main.py`

**Purpose:** FastAPI web server that exposes REST endpoints. Receives scan requests from the frontend, delegates to parser + scanner, and returns structured JSON responses.

**Endpoints:**

| Method | Path | Input | Output | Description |
|---|---|---|---|---|
| GET | `/api/health` | — | `{status, version}` | Health check — confirms server is running |
| POST | `/api/scan` | `ScanRequest` body | `ScanResponse` | Main scan endpoint — full flow |
| POST | `/api/scan/file` | — | `501` | Not yet implemented — placeholder |

**Request Model (`ScanRequest`):**
```json
{
  "package_json": "{...package.json content...}",
  "lock_file": "...optional lock file content...",
  "lock_file_type": "package-lock.json | yarn.lock",
  "min_severity": "low | medium | high | critical"
}
```

**Response Model (`ScanResponse`):**
```json
{
  "summary": {
    "total_packages": 10,
    "vulnerable_packages": 3,
    "total_vulnerabilities": 7,
    "severity_breakdown": {
      "critical": 0, "high": 2, "medium": 4, "low": 1
    }
  },
  "results": [
    {
      "package": { "name": "lodash", "version": "4.17.20", "type": "dependency" },
      "vulnerabilities": [
        {
          "id": "GHSA-35jh-r3h4-6jhm",
          "summary": "Command Injection in lodash",
          "aliases": ["CVE-2021-23337"],
          "severity": "HIGH",
          "published": "2021-05-06T16:05:51Z",
          "affected_versions": ["introduced: 0", "fixed: 4.17.21"],
          "references": [{"type": "ADVISORY", "url": "..."}]
        }
      ],
      "max_severity": "HIGH",
      "vulnerable": true
    }
  ]
}
```

**Logic flow:**
1. Receives `POST /api/scan` with JSON body
2. Parses `package_json` string via `parse_dependencies()`
3. Validates JSON format (catches `json.JSONDecodeError` → 400)
4. Filters vulnerabilities below `min_severity` threshold
5. Calls `scan(packages)` → async OSV queries
6. Aggregates severity breakdown counts
7. Returns structured JSON response

**Configuration:**
- CORS middleware allows all origins (`*`) for development
- Uses Pydantic v2 for request/response validation
- No database — stateless, ephemeral per request

---

### `backend/cli.py`

**Purpose:** Command-line interface for scanning without the web UI. Uses `click` for argument parsing and `rich` for beautiful terminal output.

**Usage:**
```bash
python -m backend.cli --path ./my-project
python -m backend.cli --path . --lock-file --min-severity high --format json -o results.json
python -m backend.cli --path . --fail-on high
```

**CLI Arguments:**

| Flag | Default | Choices | Description |
|---|---|---|---|
| `--path` / `-p` | `"."` | — | Project directory containing `package.json` |
| `--lock-file` | `false` | — | Use lock file for exact resolved versions |
| `--format` / `-f` | `"table"` | table, json, summary | Output format |
| `--output` / `-o` | — | — | Write JSON output to file path |
| `--min-severity` | `"low"` | critical, high, medium, low | Minimum severity to report |
| `--fail-on` | `"none"` | none, any, critical, high, medium | Exit with code 1 if condition met (CI integration) |

**Output formats:**
- **table** — Rich `Table` with columns: Package, Version, Vulnerabilities, Max Severity, Type — plus `Panel` detail cards for each vuln
- **json** — Full JSON dump with summary + results (same schema as API response)
- **summary** — Single `Panel` showing packages scanned, vulnerable count, severity breakdown

**CI integration:** The `--fail-on` flag exits non-zero when vulnerabilities meeting the threshold are found — designed for use in CI pipelines, pre-commit hooks, or deployment gates.

---

## Frontend — Detailed File Descriptions

### `frontend/src/main.tsx`

**Purpose:** React entry point. Mounts the `<App />` component into `#root` with `StrictMode` enabled. Imports the global CSS.

### `frontend/src/App.tsx`

**Purpose:** Root component — manages global state and orchestrates all sub-components.

**State:**
- `scanResult: ScanResponse | null` — Results from the most recent scan
- `loading: boolean` — Whether a scan is in progress
- `error: string | null` — Error message to display
- `showAbout: boolean` — Whether the About modal is open

**Component tree (when idle):**
```
<App>
  <Navbar onAbout={...} />
  <Hero />
  <ScanForm onResult={...} onLoading={...} onError={...} hasResult={false} />
  <Footer onAbout={...} />
</App>
```

**Component tree (after scan):**
```
<App>
  <Navbar onAbout={...} />
  <ScanForm ... hasResult={true} />
  <StatsCards summary={...} />
  <ResultsDashboard results={...} />
  <Footer onAbout={...} />
  {showAbout && <About onClose={...} />}
</App>
```

**Loading state:** Shows a dual-ring animated spinner with terminal-style messages (`$ scanning dependencies...` / `[querying osv.dev...]`)

**Error state:** Shows a red `[ERROR]` banner with the error message

---

### `frontend/src/index.css`

**Purpose:** Global styles — Tailwind v4 import, custom theme variables, and all CSS animations.

**Custom Theme Colors (Tailwind v4 `@theme`):**

| Variable | Hex | Usage |
|---|---|---|
| `--color-surface` | `#0f0f12` | Deepest background — cards, containers |
| `--color-surface-2` | `#18181d` | Secondary surface — inputs, dropdowns |
| `--color-border` | `#2a2a2e` | Default borders on cards, inputs |
| `--color-accent` | `#00ff41` | Primary neon green — buttons, highlights, links |
| `--color-critical` | `#ff4757` | Red — CRITICAL severity |
| `--color-high` | `#ff6348` | Orange — HIGH severity |
| `--color-medium` | `#ffa502` | Amber/yellow — MEDIUM severity |
| `--color-low` | `#2ed573` | Green — LOW severity |

**Custom Utility Classes:**

| Class | Effect |
|---|---|
| `.glass` | Frosted glass background (`rgba(15,15,18,0.85)` + `backdrop-blur(20px)` + subtle border) |
| `.scan-gradient` | Animated diagonal gradient (`#00ff41 → #00cc88 → #00ff41`) that shifts smoothly |
| `.glitch-wrapper` | Text glitch effect — red (`#ff0040`) and cyan (`#00ccff`) pseudo-element offsets with `clip-path` slices. Animation triggers a 0.5s burst every 5 seconds |
| `.scanline-overlay` | Fixed position CRT scanline (2px tall, 6s cycle) — adds retro-tech feel |
| `.hex-grid` | Subtle grid pattern overlay (40px spacing, 3% opacity) on the hero background |
| `.typewrite` | Typewriter text that reveals characters from left to right (2s, steps) |
| `.matrix-char` | Falling binary characters — animate from top to bottom (3s cycle) |
| `.tech-border` | Animated glowing underline on package rows — scans a neon gradient horizontally (3s cycle) |
| `.animate-blink` | Terminal cursor blink (1s step-end) |
| `.animate-pulse-glow` | Pulsing box-shadow glow on accent-colored elements |
| `.animate-slide-up` | Entry animation — elements slide up with fade (0.5s ease-out) |
| `.animate-slide-up-delay-1` through `-4` | Staggered delay variants for list items |

**Key design decisions:**
- All animations are CSS-only (no JS libraries) — lightweight and performant
- Dark theme is hard-coded in the `@theme` block — no light mode toggle
- The glitch effect uses `pointer-events: none` on pseudo-elements so it never blocks interactions
- Scanline overlay is `fixed` with `z-index: 9999` — always on top but nearly transparent

---

### `frontend/src/types/index.ts`

**Purpose:** Single source of truth for all TypeScript interfaces shared across the frontend.

```typescript
Package          — name, version, type
Vulnerability    — id, summary, aliases, severity, published, affected_versions, references
Severity         — "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
ScanResult       — package, vulnerabilities[], max_severity, vulnerable
ScanResponse     — summary {total_packages, vulnerable_packages, total_vulnerabilities, severity_breakdown}, results[]
ScanRequest      — package_json, lock_file?, lock_file_type?, min_severity?
```

**Design:** All types map 1:1 with the backend API response schema — no transformation needed.

---

### `frontend/src/api/client.ts`

**Purpose:** HTTP client that communicates with the FastAPI backend.

**Functions:**

| Function | Method | URL | Input | Output |
|---|---|---|---|---|
| `scanDependencies(req)` | POST | `/api/scan` | `ScanRequest` | `ScanResponse` |
| `healthCheck()` | GET | `/api/health` | — | `{status, version}` |

**Error handling:** On non-OK responses, attempts to parse `err.detail` from the JSON body, falls back to HTTP status text.

**Vite proxy:** In development, Vite proxies `/api/*` to `http://localhost:8000` (configured in `vite.config.ts`). In production, the FastAPI server would serve the built frontend static files.

---

### `frontend/src/components/Navbar.tsx`

**Props:** `onAbout: () => void`

**Structure (left → right):**
1. **Logo** — Eye SVG icon inside a `.scan-gradient` rounded box (neon green gradient)
2. **Title** — `$ Cipher` with the name in accent green
3. **Right links:**
   - `./about` button — triggers the About modal
   - `osv.dev` — external link to OSV database
   - `ONLINE` badge — pulsing green dot with `ONLINE` text, border, and accent styling

**States:**
- Normal: sticky top-0, glass blur background, border-bottom
- No special scroll/active states — always visible

---

### `frontend/src/components/Hero.tsx`

**Purpose:** Landing hero section shown before any scan is performed. Sets the visual tone of the app.

**Layout (top to bottom):**
1. **Background** — `.hex-grid` pattern overlay, two large blurred accent circles, falling binary sequences (`01101110 01110000 01101101` / `01110011 01100001 01100110 01100101`) on desktop
2. **Status badge** — `SYSTEM ONLINE — OSV DATABASE CONNECTED` with pulsing green dot
3. **Command line** — `$ ./scan --dependencies` in monospace gray
4. **Title** — Glitched "YOUR DEPENDENCIES" (neon gradient text + `.glitch-wrapper` red/cyan offset animation) + "EXPOSED OR SECURE?" in white
5. **Typewriter** — `$ scanning package.json against 300k+ vulnerabilities...` with blinking cursor
6. **Description** — Comment-style (`//`) explanation of what the app does
7. **Feature tags** — Row of terminal-style badges: `> NO_API_KEY`, `> NPM_ECOSYSTEM`, `> REALTIME_OSV`, `> LOCK_FILE_SUPPORT`

**Transitions:** The feature tags animate in with staggered `.slide-up` delays.

---

### `frontend/src/components/ScanForm.tsx`

**Props:**
- `onResult: (res: ScanResponse | null) => void`
- `onLoading: (v: boolean) => void`
- `onError: (err: string | null) => void`
- `hasResult?: boolean`

**Purpose:** Three-tab interface for providing dependency data to scan.

**State:**
- `jsonInput: string` — Raw package.json content
- `lockInput: string` — Raw lock file content
- `lockType: string` — File type identifier (`"package-lock.json"` or `"yarn.lock"`)
- `tab: "paste" | "upload" | "example"` — Active input tab
- `loadedFile: string | null` — Name of last loaded file (for feedback)

**Tabs:**

| Tab | UI | Behavior |
|---|---|---|
| **Paste JSON** | Multi-line textarea (monospace, dark, 48 rows) | User types or pastes JSON directly. Shows `loaded: filename` indicator if a file was previously uploaded |
| **Upload File** | Dropzone area with drag-and-drop + click-to-browse | Uses `react-dropzone` (v14) with `accept: undefined` (accepts all files). Validates `.json` vs `.lock` by extension. On successful JSON load, auto-switches to "Paste JSON" tab so user sees content immediately. Shows loaded filename + "view →" button. Click handler uses `open()` from dropzone |
| **Try Example** | Read-only pre block showing a sample `package.json` (react, lodash, axios, express, jsonwebtoken, typescript, webpack) | Pre-fills `jsonInput` on scan via the `EXAMPLE_PACKAGE_JSON` constant |

**Scan button:**
- `> EXECUTE VULNERABILITY SCAN` — Full-width, `.scan-gradient` animated background
- Disabled (opacity 30%) when content is empty
- Shows `hover:shadow-accent/25` glow on hover
- Calls `scanDependencies()` API client, chains callbacks

**Reset:** When `hasResult` is true, a "← New scan" button appears in the header — clears all state.

**Data flow:**
1. User provides package.json (paste, upload, or example)
2. Click scan → POST `/api/scan` → receive `ScanResponse`
3. `onResult()` passes data up to `App.tsx`
4. `App.tsx` renders `StatsCards` + `ResultsDashboard`

---

### `frontend/src/components/StatsCards.tsx`

**Props:** `summary: ScanResponse["summary"]`

**Purpose:** Four-card grid showing aggregate statistics from the scan.

**Cards (2×2 grid, 4 columns on desktop):**

| Card | Data | Conditional Styling |
|---|---|---|
| **Packages Scanned** | `summary.total_packages` | Always neutral — accent SVG icon |
| **Vulnerable Packages** | `summary.vulnerable_packages` | Turns red (bg + border + text) when > 0, shows warning triangle icon vs checkmark |
| **Total Vulnerabilities** | `summary.total_vulnerabilities` | Same conditional red styling as vulnerable packages |
| **Severity Breakdown** | (inline) Critical / High / Medium / Low counts | Each row uses the severity color class directly |

**Animation:** The entire grid has `.animate-slide-up` for a cascading entry.

---

### `frontend/src/components/ResultsDashboard.tsx`

**Props:** `results: ScanResult[]`

**Purpose:** Filterable, sortable list of all scanned packages with severity badges.

**State:**
- `selectedResult: ScanResult | null` — When set, opens the VulnDetail modal
- `severityFilter: Severity | "ALL"` — Dropdown filter
- `sortBy: "severity" | "name"` — Toggle between severity descending / alphabetical

**UI elements:**
1. **Header** — `$ X packages with vulnerabilities` (or `All packages are safe — [OK]`) + filter dropdown + sort button
2. **Package rows** — Each row is a clickable `<button>` with:
   - Initial letter avatar (rounded square, dark surface)
   - Package name + version (monospace version)
   - Severity badge (color-coded: CRITICAL/HIGH/MEDIUM/LOW/SAFE)
   - Vulnerability count
   - Chevron arrow indicator
   - `.tech-border` animated underline on hover
3. **Filter dropdown** — All severities / Critical / High / Medium / Low
4. **Sort toggle** — Sort by severity / Sort by name

**States:**
- **Has results:** Shows rows with staggered `.slide-up` animation
- **No matching filter:** Centered text "No results match the current filter."
- **Row click:** Opens VulnDetail modal for that package

**PackageRow component:**
- Severity badges use a lookup table with classes per severity level
- `SAFE` badge is green (`bg-emerald-500/10 text-emerald-400`)
- Hover: border transitions to accent, background gets subtle tint

---

### `frontend/src/components/VulnDetail.tsx`

**Props:**
- `result: ScanResult` — The package + its vulnerabilities to display
- `onClose: () => void` — Close handler

**Purpose:** Full-screen modal overlay (with backdrop blur) showing detailed vulnerability information for one package.

**Layout:**

1. **Header:** Package name (bold) + version + type (e.g., `4.17.20 · dependency`), close button
2. **No vulns state:** Green checkmark circle + "No known vulnerabilities" / "This package version appears to be safe."
3. **Vulns list:** Each vuln in a color-coded card:
   - **Severity badge** — Top-right, color matches severity level
   - **OSV ID** — Monospace font (e.g., `GHSA-35jh-r3h4-6jhm`)
   - **CVE Aliases** — Gray subtitle under ID
   - **Summary** — Human-readable description
   - **Published date** — Formatted via `toLocaleDateString` (e.g., "May 6, 2021")
   - **References** — Up to 3 reference links, monospace, accent colored, truncated with ellipsis

**Severity card colors:**

| Severity | Border | Background |
|---|---|---|
| CRITICAL | `border-critical/30` | `bg-critical/5` |
| HIGH | `border-high/30` | `bg-high/5` |
| MEDIUM | `border-medium/30` | `bg-medium/5` |
| LOW | `border-low/30` | `bg-low/5` |
| UNKNOWN | `border-gray-500/30` | `bg-gray-500/5` |

---

### `frontend/src/components/About.tsx`

**Props:** `onClose: () => void`

**Purpose:** Modal overlay presenting the application's creator, data sources, and tech stack.

**Sections:**

1. **Header** — Eye logo (same as Navbar), `About Cipher`, version `v0.1.0`
2. **// Creator** — Avatar initial "J" in gradient circle, name "Josh Ivan Sartin", title "Software Engineer", description of the app's mission
3. **// Data Source** — Three items with `>` prefix:
   - **OSV.dev** — Open Source Vulnerabilities database
   - **NVD** — National Vulnerability Database (U.S. government)
   - **GitHub Advisory Database** — Security advisories on GitHub
4. **// Tech Stack** — 2-column grid:
   - Backend: Python + FastAPI
   - Frontend: React + Vite + Tailwind
   - Scanner: OSV API + httpx
   - CLI: Python + Click + Rich
5. **Footer** — `MIT License · 2026` in tiny monospace

---

### `frontend/src/components/Footer.tsx`

**Props:** `onAbout: () => void`

**Content (left → right on desktop, stacked on mobile):**
- `$ ./cipher --version v0.1.0`
- `./about` (button) | `crafted by Josh Ivan Sartin` | `data: OSV / NVD` (links)

**Links:** OSV.dev and NVD open in new tabs with `noopener noreferrer`
**Interaction:** `./about` button opens the About modal. Creator name has a subtle hover-to-accent transition.

---

## Design System

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Surface (deep) | `#0f0f12` | Body, card backgrounds, containers |
| Surface (mid) | `#18181d` | Inputs, dropdowns, secondary containers |
| Border | `#2a2a2e` | Default borders on all components |
| Accent | `#00ff41` | Neon green — CTAs, links, highlights, badges |
| Critical | `#ff4757` | Red — Critical severity vulns |
| High | `#ff6348` | Orange — High severity vulns |
| Medium | `#ffa502` | Amber — Medium severity vulns |
| Low | `#2ed573` | Green — Low severity vulns |
| Glitch red | `#ff0040` | Pseudo-element offset in glitch animation |
| Glitch cyan | `#00ccff` | Pseudo-element offset in glitch animation |
| Text | `#ffffff` → `#9ca3af` → `#6b7280` | Primary → secondary → tertiary text |

### Typography

- **Headings:** `Inter` (sans-serif), 800 weight for titles, 600-700 for cards
- **Body:** `Inter` (sans-serif), 400-500 weight
- **Code/data:** `JetBrains Mono` (monospace), 400-500 weight — used for versions, commands, IDs, tags
- **Font loading:** Preconnected to Google Fonts in `index.html`

### Spacing & Layout

- Max container width: `max-w-7xl` (80rem / 1280px)
- Standard padding: `px-4 sm:px-6 lg:px-8`
- Card rounded corners: `rounded-xl` (12px), `rounded-2xl` (16px)
- Gap system: Tailwind default spacing scale (4px base)
- Navbar height: `h-16` (64px)
- Footer padding: `py-5`

### Animation Inventory

| Animation | Trigger | Duration | Description |
|---|---|---|---|
| `gradient-shift` | Always on | 4s infinite | Background position slides left-right on `.scan-gradient` |
| `glitch-offset` | Every 5s | ~0.5s burst | Red/cyan text offset with clip-path slices |
| `slide-up` | Component mount | 0.5s ease-out | Fade + translateY(20px → 0) |
| `scanline` | Always on | 6s linear | 2px horizontal bar scans down the screen |
| `pulse-glow` | Always on | 3s ease-in-out | Box shadow opacity oscillates |
| `blink` | Always on | 1s step-end | Terminal cursor visibility toggle |
| `typewrite` | Page load | 2s steps(40) | Text reveals left to right (one-time) |
| `matrix-fall` | Always on | 3s linear | Binary chars fall vertically (repeating) |
| `border-scan` | Always on | 3s linear | Neon line sweeps horizontally under elements |

---

## Data Flow Summary

```
User Input (paste/upload/example)
        │
        ▼
ScanForm.tsx ──► api/client.ts ──► POST /api/scan
                                        │
                                        ▼
                                backend/main.py
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                    parser.py                   scanner.py
                    (parse JSON)                 (OSV API)
                          │                           │
                          └─────────────┬─────────────┘
                                        ▼
                                ScanResponse JSON
                                        │
                                        ▼
                                App.tsx (state)
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                  StatsCards.tsx              ResultsDashboard.tsx
                  (aggregate stats)            (package list)
                                                  │
                                                  ▼
                                            VulnDetail.tsx
                                            (vuln details modal)
```

---

## Running the Application

**Prerequisites:** Python 3.10+, Node.js 20+

### Backend (API server)
```bash
cd vuln-checker
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend (dev server)
```bash
cd vuln-checker/frontend
npm install
npm run dev
```
Open `http://localhost:5173` in the browser. The Vite dev server proxies `/api/*` to the backend.

### CLI (standalone, no browser needed)
```bash
cd vuln-checker
python -m backend.cli --path /path/to/project --lock-file
python -m backend.cli --path /path/to/project --min-severity high --fail-on any
```

### Production Build
```bash
cd vuln-checker/frontend
npm run build          # Produces frontend/dist/
```
Configure FastAPI to serve the `dist/` folder as static files.

---

## Future Enhancements

- **Transitive dependency scanning** — drill into nested dependencies via lock file tree
- **Multiple ecosystem support** — extend parser to handle `pip`, `NuGet`, `Maven`, `Go` via OSV's existing ecosystems
- **Continuous monitoring** — GitHub Actions integration, scheduled scans, Slack/email notifications
- **Container scanning** — parse `Dockerfile` to check base images
- **HTML report export** — generate a self-contained vulnerability report page
- **Authentication** — user accounts, project dashboard, scan history
