import asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx

GITHUB_ADVISORIES_API = "https://api.github.com/advisories"
CACHE: list[dict] = []
CACHE_TIME: Optional[datetime] = None
CACHE_TTL_SECONDS = 300


async def fetch_news(limit: int = 5) -> list[dict]:
    global CACHE, CACHE_TIME

    now = datetime.now(timezone.utc)
    if CACHE_TIME and (now - CACHE_TIME).total_seconds() < CACHE_TTL_SECONDS:
        return CACHE[:limit]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                GITHUB_ADVISORIES_API,
                params={"per_page": 20, "type": "reviewed"},
                headers={"Accept": "application/vnd.github+json"},
                timeout=15,
            )
        if resp.status_code == 200:
            items = resp.json()
            entries = []
            for item in items:
                gh_id = item.get("ghsa_id", "")
                summary = item.get("summary", "")
                severity = item.get("severity", "unknown")
                published = item.get("published_at", "")[:10]
                url = item.get("html_url", "")
                entries.append({
                    "id": gh_id,
                    "summary": summary,
                    "severity": severity.upper(),
                    "published": published,
                    "url": url,
                })
            CACHE = entries
            CACHE_TIME = now
            return entries[:limit]
    except Exception:
        pass

    return CACHE[:limit] if CACHE else []
