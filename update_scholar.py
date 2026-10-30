"""Update the website's Google Scholar snapshot via the private SerpApi key.

The published bibliography is never edited by this script. Newly appearing
Google Scholar entries are recorded for manual review in scholar_monitor.json.
"""

import datetime as dt
import json
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
AUTHOR_ID = "sAuzLkEAAAAJ"


def load_json(path, fallback=None):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path, obj):
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def fetch_scholar():
    key = os.environ.get("SERPAPI_KEY", "")
    if not key:
        raise RuntimeError("SERPAPI_KEY is missing from GitHub Actions secrets")

    query = urllib.parse.urlencode({
        "engine": "google_scholar_author",
        "author_id": AUTHOR_ID,
        "hl": "en",
        "num": 100,
        "sort": "pubdate",
        "api_key": key,
    })
    request = urllib.request.Request(
        "https://serpapi.com/search.json?" + query,
        headers={"Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # Do not echo the URL: it contains the private API key.
        raise RuntimeError(f"SerpApi request failed (HTTP {exc.code})") from None
    except urllib.error.URLError:
        raise RuntimeError("SerpApi could not be reached") from None


def record_from_article(article):
    identifier = article.get("citation_id") or article.get("link")
    if not identifier:
        return None
    return {
        "id": identifier,
        "title": article.get("title", ""),
        "year": article.get("year", ""),
        "authors": article.get("authors", ""),
        "publication": article.get("publication", ""),
        "link": article.get("link", ""),
    }


def update_from_data(payload):
    if payload.get("error"):
        raise RuntimeError("SerpApi returned an error; existing data preserved")

    cited_by = payload.get("cited_by") or {}
    table = cited_by.get("table") or []
    citations = next(
        (row["citations"] for row in table if "citations" in row), None
    )
    h_index = next(
        (row["h_index"] for row in table if "h_index" in row), None
    )
    i10_index = next(
        (row["i10_index"] for row in table if "i10_index" in row), None
    )
    if not isinstance(citations, dict) or not isinstance(citations.get("all"), int):
        raise RuntimeError("No valid Google Scholar citation count; no files changed")
    if not isinstance(h_index, dict) or not isinstance(h_index.get("all"), int):
        raise RuntimeError("No valid Google Scholar h-index; no files changed")
    if not isinstance(i10_index, dict) or not isinstance(i10_index.get("all"), int):
        raise RuntimeError("No valid Google Scholar i10-index; no files changed")

    articles = payload.get("articles")
    if not isinstance(articles, list) or not articles:
        raise RuntimeError("No Google Scholar article list; no files changed")
    if len(articles) >= 100:
        raise RuntimeError("More than 100 articles may exist; pagination needed")

    citation_path = ROOT / "citations.json"
    citation_data = load_json(citation_path)
    if not isinstance(citation_data, dict) or "googleScholar" not in citation_data:
        raise RuntimeError("Existing citations.json not found; no files changed")

    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    scholar = citation_data["googleScholar"]
    scholar.update({
        "citations": citations["all"],
        "hIndex": h_index["all"],
        "i10Index": i10_index["all"],
        "profileEntries": len(articles),
        # Keep the thesis exclusion set by the researcher (typically one).
        "hIndexSince2021": h_index.get("since_2021"),
        "citationsSince2021": citations.get("since_2021"),
        "i10IndexSince2021": i10_index.get("since_2021"),
        "updated": today,
        "source": "Google Scholar author profile via SerpApi (automated snapshot)",
    })

    # Establish a baseline on the first run; on later runs flag newly found
    # entries without adding them to the curated website bibliography.
    monitor_path = ROOT / "scholar_monitor.json"
    monitor = load_json(monitor_path)
    records = [record_from_article(a) for a in articles]
    records = [record for record in records if record]
    if monitor is None:
        monitor = {
            "description": "Google Scholar additions for manual review only",
            "seen_ids": [r["id"] for r in records],
            "pending_review": [],
        }
        print(f"Scholar baseline created for {len(records)} entries")
    else:
        seen = set(monitor.get("seen_ids", []))
        pending = monitor.get("pending_review", [])
        pending_ids = {r.get("id") for r in pending}
        for record in records:
            if record["id"] not in seen:
                if record["id"] not in pending_ids:
                    pending.append(record)
                seen.add(record["id"])
        monitor["seen_ids"] = sorted(seen)
        monitor["pending_review"] = pending
        print(f"Total publication candidates pending review: {len(pending)}")

    monitor["last_checked"] = today
    save_json(citation_path, citation_data)
    save_json(monitor_path, monitor)
    print(f"Google Scholar citations: {scholar['citations']}; h-index: {scholar['hIndex']}")


if __name__ == "__main__":
    update_from_data(fetch_scholar())
