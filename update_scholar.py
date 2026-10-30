"""Update the website's Google Scholar snapshot via the private SerpApi key.

New Google Scholar journal papers are automatically merged into research_data.json.
Existing curated entries are preserved; duplicates and theses are skipped.
The photo and PhD thesis have their own separate presentation on the website.
"""

import datetime as dt
import json
import hashlib
import re
import unicodedata
from difflib import SequenceMatcher
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




def normalize_title(title):
    # Case-, accent-, punctuation-insensitive comparison to protect curated entries.
    title = unicodedata.normalize("NFKD", str(title or "")).casefold()
    title = "".join(c for c in title if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+", title))


def matching_title(a, b):
    a, b = normalize_title(a), normalize_title(b)
    if not a or not b:
        return False
    if a == b:
        return True
    # Avoid adding variant punctuation / Greek symbol renderings as duplicates.
    ratio = SequenceMatcher(None, a, b).ratio()
    left, right = set(a.split()), set(b.split())
    token_overlap = len(left & right) / max(1, len(left | right))
    return ratio >= 0.92 or (ratio >= 0.83 and token_overlap >= 0.72)


def is_thesis(article):
    title = normalize_title(article.get("title"))
    publication = normalize_title(article.get("publication"))
    text = " ".join([title, publication])
    if any(word in text for word in (
        "phd thesis", "ph d thesis", "doctoral thesis", "dissertation",
        "doctoral dissertation", "phd dissertation", "masters thesis",
    )):
        return True
    # Explicit title of this researcher's IIT Bombay dissertation.
    return matching_title(title, "Computational Studies on Asymmetric Dual Chiral Catalysis")


def merge_scholar_papers(articles):
    path = ROOT / "research_data.json"
    data = load_json(path)
    if not isinstance(data, dict) or not isinstance(data.get("publications"), list):
        raise RuntimeError("Existing research_data.json publications list missing")
    publications = data["publications"]
    existing_titles = [p.get("title", "") for p in publications]
    added = []
    for article in articles:
        if not isinstance(article, dict) or is_thesis(article):
            continue
        title = str(article.get("title") or "").strip()
        year = str(article.get("year") or "").strip()
        if len(normalize_title(title)) < 12 or not re.fullmatch(r"(?:19|20)\d{2}", year):
            continue
        if any(matching_title(title, old) for old in existing_titles):
            continue
        identifier = str(article.get("citation_id") or article.get("link") or title)
        paper_id = "scholar-" + hashlib.sha256(identifier.encode()).hexdigest()[:12]
        if any(pub.get("id") == paper_id for pub in publications):
            continue
        link = str(article.get("link") or "").strip()
        if not link.startswith("https://"):
            link = "https://scholar.google.com/citations?user=" + AUTHOR_ID
        pub = {
            "id": paper_id,
            "year": year,
            "title": title,
            "journal": str(article.get("publication") or "").strip(),
            "journalAbbr": "",
            "authors": str(article.get("authors") or "").strip(),
            "authorsACS": "",
            "doi": "",
            "volume": "",
            "issue": "",
            "pages": "",
            "group": "scholar-auto",
            "sub": "Research area pending classification",
            "abstract": "Metadata automatically imported from Google Scholar; full citation details pending verification.",
            "skills": [],
            "status": "Scholar-listed",
            "autoImported": True,
            "scholarLink": link,
            "scholarCitationId": str(article.get("citation_id") or ""),
        }
        publications.append(pub)
        existing_titles.append(title)
        added.append(title)
    if added:
        save_json(path, data)
    print(f"Automatic Scholar additions: {len(added)}; current publication records: {len(publications)}")
    for title in added:
        print("Added: " + title[:120])
    return added

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

    # Preserve Scholar IDs and add genuinely new non-thesis papers to the
    # public bibliography even if they already existed in an older baseline.
    newly_added = merge_scholar_papers(articles)

    # The monitor is an audit trail, not an approval queue.
    monitor_path = ROOT / "scholar_monitor.json"
    monitor = load_json(monitor_path)
    records = [record_from_article(a) for a in articles]
    records = [record for record in records if record]
    if monitor is None:
        monitor = {
            "description": "Google Scholar checks and automatic website additions",
            "seen_ids": [r["id"] for r in records],
            "discovered_records": [],
        }
        print(f"Scholar baseline created for {len(records)} entries")
    else:
        seen = set(monitor.get("seen_ids", []))
        pending = monitor.get("discovered_records", monitor.get("pending_review", []))
        pending_ids = {r.get("id") for r in pending}
        for record in records:
            if record["id"] not in seen:
                # Additions go directly to Publications; keep an audit log.
                if record["id"] not in pending_ids:
                    pending.append(record)
                seen.add(record["id"])
        monitor["seen_ids"] = sorted(seen)
        monitor["discovered_records"] = pending
        monitor.pop("pending_review", None)
        print(f"New Scholar records logged: {len(pending)}")

    monitor["description"] = "Automatic website additions from the Google Scholar author profile"
    monitor["last_checked"] = today
    monitor["auto_added_titles"] = newly_added
    save_json(citation_path, citation_data)
    save_json(monitor_path, monitor)
    print(f"Google Scholar citations: {scholar['citations']}; h-index: {scholar['hIndex']}")


if __name__ == "__main__":
    update_from_data(fetch_scholar())
