import json
import time
from pathlib import Path

CACHE_DIR = Path.home() / ".vulnchecker" / "cache"
DEFAULT_TTL = 24 * 3600


def _safe_key(key: str) -> str:
    return "".join(c if (c.isalnum() or c in "._-") else "_" for c in key)


def _cache_file(kind: str, key: str) -> Path:
    return CACHE_DIR / kind / f"{_safe_key(key)}.json"


def get_cache(kind: str, key: str, ttl: int = DEFAULT_TTL):
    """Return cached value or None. Raises nothing; never blocks a scan."""
    try:
        path = _cache_file(kind, key)
        if path.exists():
            payload = json.loads(path.read_text(encoding="utf-8"))
            if payload.get("_ts", 0) + ttl > time.time():
                return payload.get("value")
    except Exception:
        pass
    return None


def set_cache(kind: str, key: str, value) -> None:
    """Persist a value. Silently ignored on filesystem errors."""
    try:
        path = _cache_file(kind, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"_ts": time.time(), "value": value}
        path.write_text(json.dumps(payload), encoding="utf-8")
    except Exception:
        pass


def clear_cache(kind: str | None = None) -> int:
    """Delete cache entries; counts removed files. kind=None clears all."""
    removed = 0
    try:
        base = CACHE_DIR if kind is None else CACHE_DIR / kind
        if base.exists():
            for p in base.rglob("*.json"):
                try:
                    p.unlink()
                    removed += 1
                except OSError:
                    pass
    except Exception:
        pass
    return removed
