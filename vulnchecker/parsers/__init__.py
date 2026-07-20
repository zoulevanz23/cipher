from .base import parse_npm, parse_pypi, parse_go, parse_maven, parse_nuget, parse_rubygems, parse_cargo

PARSERS: dict[str, callable] = {
    "npm": parse_npm,
    "pypi": parse_pypi,
    "go": parse_go,
    "maven": parse_maven,
    "nuget": parse_nuget,
    "rubygems": parse_rubygems,
    "cargo": parse_cargo,
}


def parse_ecosystem(ecosystem: str, contents: list[tuple[str, str]]) -> list:
    parser = PARSERS.get(ecosystem)
    if not parser:
        return []
    all_packages = []
    for file_type, content in contents:
        all_packages.extend(parser(content, file_type))
    return all_packages


__all__ = ["PARSERS", "parse_ecosystem", "parse_npm", "parse_pypi", "parse_go", "parse_maven", "parse_nuget", "parse_rubygems", "parse_cargo"]
