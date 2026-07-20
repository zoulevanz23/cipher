import re


def _parse_version(v: str) -> tuple:
    parts = re.findall(r"\d+", v)
    return tuple(int(x) for x in parts) if parts else (0,)


def classify_upgrade(current: str, recommended: str) -> str:
    cur = _parse_version(current)
    rec = _parse_version(recommended)
    if not cur or not rec or cur == rec:
        return "same"
    if len(cur) >= 2 and len(rec) >= 2:
        if cur[0] == rec[0] and cur[1] == rec[1]:
            return "safe"
        if cur[0] == rec[0]:
            return "minor"
    if cur[0] < rec[0]:
        return "major"
    return "minor"


def upgrade_risk_label(classification: str) -> str:
    return {
        "same": "No Change",
        "safe": "Safe (Patch)",
        "minor": "Low Risk (Minor)",
        "major": "Breaking (Major)",
    }.get(classification, "Unknown")
