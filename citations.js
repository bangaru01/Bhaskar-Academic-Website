// Citation data is a dated snapshot, not an automatic live feed.
// To update counts, edit citations.json; automatic vendor API retrieval is separate.
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('#citation-cards');
  if (!grid) return;

  try {
    const response = await fetch('./citations.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load citations.json');
    const data = await response.json();
    const sources = [
      ['Google Scholar', data.googleScholar],
      ['Scopus', data.scopus],
      ['Web of Science', data.webOfScience]
    ];

    grid.replaceChildren();
    for (const [source, stats] of sources) {
      const card = document.createElement('article');
      card.className = 'impact-card';
      const eyebrow = document.createElement('div');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = source;

      const count = document.createElement('div');
      count.className = 'metric-num';
      count.textContent = typeof stats?.citations === 'number'
        ? stats.citations.toLocaleString('en-US') : '—';
      const label = document.createElement('div');
      label.className = 'metric-label';
      label.textContent = stats?.citations == null ? 'Metrics not yet verified' : 'Total citations';

      const metrics = document.createElement('div');
      metrics.className = 'metric-facts';
      const parts = [];
      if (stats?.hIndex != null) parts.push(`h-index ${stats.hIndex}`);
      if (source === 'Google Scholar' && stats?.profileEntries != null) {
        const excludeThesis = stats.profileEntries - (stats.thesisEntries ?? 0);
        parts.push(`Scholar entries ${excludeThesis}`);
        if (stats.hIndexSince2021 != null) parts.push(`h-index since 2021 ${stats.hIndexSince2021}`);
      }
      if (source === 'Scopus' && stats?.documents != null) {
        parts.push(`${stats.documents} indexed documents`);
      }
      metrics.textContent = parts.join(' · ') || 'Information pending';

      const footer = document.createElement('div');
      footer.className = 'metric-footer';
      const update = document.createElement('span');
      update.className = 'verified-date';
      update.textContent = stats?.updated ? `Last verified ${stats.updated}` : 'No verified snapshot';
      footer.append(update);
      if (typeof stats?.url === 'string' && stats.url.startsWith('https://')) {
        const link = document.createElement('a');
        link.className = 'mini-link';
        link.textContent = source === 'Web of Science' ? 'Search researcher ↗' : 'Open profile ↗';
        link.href = stats.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        footer.append(link);
      }
      card.append(eyebrow, count, label, metrics, footer);
      grid.append(card);
    }
  } catch (error) {
    console.error('Citation dashboard error:', error);
    grid.textContent = 'Citation snapshots could not be loaded. Please run the site with Live Server.';
  }
});
