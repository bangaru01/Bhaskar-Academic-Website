// Peer Review & Scholarly Service
// Data are self-reported. Selected venues are not an exhaustive list.
// Do not expose confidential manuscript titles or individual reports.
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("#review-stats");
  if (!container) return;

  try {
    const response = await fetch("./review_service.json", { cache: "no-store" });
    if (!response.ok) throw new Error("review_service.json could not be loaded");
    const data = await response.json();

    const journals = Array.isArray(data.featuredJournals)
      ? data.featuredJournals.filter(name => typeof name === "string" && name.trim())
      : [];

    const buildMetric = (title, value, detail, isFocus = false) => {
      const card = document.createElement("article");
      card.className = "review-card";
      const heading = document.createElement("div");
      heading.className = "eyebrow";
      heading.textContent = title;
      const number = document.createElement("p");
      number.className = isFocus ? "review-focus" : "review-value";
      number.textContent = value;
      const note = document.createElement("p");
      note.className = "review-description";
      note.textContent = detail;
      card.append(heading, number, note);
      return card;
    };

    container.replaceChildren(
      buildMetric("MANUSCRIPTS REVIEWED", data.reviewCountLabel || "—", "Self-reported overall total"),
      buildMetric("FEATURED JOURNALS", String(journals.length), "Selected research-relevant titles"),
      buildMetric("REVIEWING FOCUS", "Computational chemistry & catalysis", "Reaction mechanisms and related fields", true)
    );

    const list = document.querySelector("#review-journals");
    if (list) {
      list.replaceChildren();
      for (const name of journals) {
        const tag = document.createElement("span");
        tag.className = "review-tag";
        tag.textContent = name;
        list.append(tag);
      }
    }

    const about = document.querySelector("#review-about");
    if (about) {
      about.textContent = data.journalSelectionNote ||
        "Selected journals are chosen for relevance to computational chemistry.";
    }

    const status = document.querySelector("#review-status");
    if (status) {
      status.textContent =
        "50+ manuscript reviews (self-reported, across a broader group of journals). " +
        "Individual verification remains pending; confidential manuscripts are not disclosed.";
    }

    const wos = document.querySelector("#review-wos-link");
    const orcid = document.querySelector("#review-orcid-link");
    if (wos && typeof data.webOfScienceProfileUrl === "string" &&
        data.webOfScienceProfileUrl.startsWith("https://")) {
      wos.href = data.webOfScienceProfileUrl;
    }
    if (orcid && typeof data.orcidUrl === "string" &&
        data.orcidUrl.startsWith("https://")) {
      orcid.href = data.orcidUrl;
    }
  } catch (error) {
    console.error("Peer-review data error:", error);
    const status = document.querySelector("#review-status");
    if (status) {
      status.textContent =
        "Reviewer data could not be loaded. Open through Live Server and check review_service.json.";
    }
  }
});
