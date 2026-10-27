# Bhaskar Academic Website — v5 (Reviewing & Contact)

## Run locally
1. Open this folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. Changes to JSON/JS/CSS appear after saving and reloading.

## Edit contact details
Open `research_data.json`, locate `profile` at the beginning.
- `email`: professional address displayed in the Contact footer.
- `phone`: left empty (`""`), therefore hidden publicly; add a number later if desired.

## Edit peer reviewing
Open `review_service.json`:
- `reviewCountLabel`: user-reported `50+`; not an independently verified statistic.
- `featuredJournals`: nine curated research-relevant titles, only one MDPI journal (`Catalysts`).
- Other MDPI journals are intentionally excluded from the featured list.
- Individual manuscript reviews, invitation emails, and editorial correspondence are private.
- Do not describe this section as verified Web of Science reviews without independent verification.

This does not claim an editorial appointment, which is a separate role from manuscript reviewing.

## Edit publications, CV, and citations
- `research_data.json`: academic profile, research, publications, experience and CV link (`cvUrl`).
- `citations.json`: manually entered citation snapshots; the site does not automatically fetch new counts.
- `review_service.json`: selected peer-reviewing service.
- `style.css`: design.
- `app.js`, `citations.js`, `review_service.js`: rendering code.

No client-side editor can securely authenticate a site owner by itself. The Website Studio remains local-only.
