from pathlib import Path

ECOSYSTEM_CHECKS: list[tuple[str, list[str]]] = [
    ("npm", ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]),
    ("pypi", ["requirements.txt", "Pipfile", "Pipfile.lock", "setup.py", "setup.cfg"]),
    ("go", ["go.mod", "go.sum"]),
    ("maven", ["pom.xml", "build.gradle", "build.gradle.kts"]),
    ("nuget", ["packages.config", "*.csproj"]),
    ("rubygems", ["Gemfile", "Gemfile.lock"]),
    ("cargo", ["Cargo.toml", "Cargo.lock"]),
]

PRIORITY = ["npm", "pypi", "go", "maven", "nuget", "rubygems", "cargo"]

MANIFEST_MAP: dict[str, list[tuple[str, str]]] = {
    "npm": [
        ("package-lock.json", "package-lock.json"),
        ("yarn.lock", "yarn.lock"),
        ("pnpm-lock.yaml", "pnpm-lock.yaml"),
        ("package.json", "package.json"),
    ],
    "pypi": [
        ("requirements.txt", "requirements.txt"),
        ("Pipfile.lock", "Pipfile.lock"),
        ("Pipfile", "Pipfile"),
        ("pyproject.toml", "pyproject.toml"),
    ],
    "go": [("go.mod", "go.mod")],
    "maven": [("pom.xml", "pom.xml")],
    "nuget": [("packages.config", "packages.config")],
    "rubygems": [("Gemfile.lock", "Gemfile.lock"), ("Gemfile", "Gemfile")],
    "cargo": [("Cargo.toml", "Cargo.toml")],
}


def detect_ecosystems(project_path: Path) -> list[str]:
    detected: list[str] = []
    for ecosystem, files in ECOSYSTEM_CHECKS:
        for f in files:
            if f.startswith("*"):
                pattern = f.lstrip("*")
                if list(project_path.glob(pattern)):
                    detected.append(ecosystem)
                    break
            elif (project_path / f).exists():
                detected.append(ecosystem)
                break
    return sorted(detected, key=lambda e: PRIORITY.index(e) if e in PRIORITY else 99)


def find_manifest_files(project_path: Path, ecosystem: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for filename, label in MANIFEST_MAP.get(ecosystem, []):
        path = project_path / filename
        if path.exists():
            found.append((label, path.read_text(encoding="utf-8")))
    return found
