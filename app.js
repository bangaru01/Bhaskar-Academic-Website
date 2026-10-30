(async function () {
      'use strict';

      // All website research records live in one readable JSON file.
      const response = await fetch('./research_data.json', {
        cache: 'no-store'
      });

      if (!response.ok) {
        document.body.insertAdjacentHTML(
          'afterbegin',
          '<p style="padding:20px;color:#8b2d2d">Could not load research_data.json. Open this website using Live Server in VS Code.</p>'
        );
        throw new Error('Could not load research_data.json');
      }

      const SEED = await response.json();
      const clone = o => JSON.parse(JSON.stringify(o));
      // JSON on disk remains authoritative after every Live Server refresh.
      // Website Studio changes are drafts until you export the edited JSON.
      let data = clone(SEED);
      let activeGroup = 'dual', activeSub = 'All', pubFilter = 'All', pubSearch = '', studioTab = 'profile', selectedProject = 'new', selectedPublication = 'new';
      const $ = sel => document.querySelector(sel);
      const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      const attr = esc;
      const category = id => id === 'scholar-auto' ? { id, name: 'Google Scholar (new addition)', code: '', subs: [], summary: '' } : data.categories.find(c => c.id === id) || data.categories[0] || { id: 'other', name: 'Other', code: '00', subs: [], summary: '' };
      const norm = v => Array.isArray(v) ? v : [];
      const statusClass = s => s === 'Published' ? 'published' : s === 'Ongoing' ? 'ongoing' : 'development';
      const save = () => {
        $('#saved-state').textContent = '● Draft — export JSON to keep';
      };
      const asDoi = s => /^[\w.()/:;-]+$/i.test(s || '') ? 'https://doi.org/' + s : '';
      function profileRender() {
        const p = data.profile || {};
        $('#brand-name').textContent = p.name || 'Research portfolio';
        $('#hero-eyebrow').textContent = p.eyebrow || '';
        $('#hero-title').textContent = p.headline || '';
        $('#hero-summary').textContent = p.summary || '';
        $('#hero-institution').textContent = p.institution || '';
        $('#footer-name').textContent = p.name || '';
        $('#footer-role').textContent = [p.role, p.institution]
          .filter(Boolean).join(' · ');
        document.title = `${p.name || 'Research portfolio'} | Computational Chemistry`;

        // Professional email and optional phone, both sourced from research_data.json.
        const email = typeof p.email === 'string' ? p.email.trim() : '';
        const emailRow = $('#contact-email-row');
        const emailLink = $('#contact-email');
        if (emailRow && emailLink) {
          const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          emailRow.hidden = !validEmail;
          if (validEmail) {
            emailLink.textContent = email;
            emailLink.href = `mailto:${email}`;
          }
        }

        const phone = typeof p.phone === 'string' ? p.phone.trim() : '';
        const phoneRow = $('#contact-phone-row');
        const phoneLink = $('#contact-phone');
        if (phoneRow && phoneLink) {
          phoneRow.hidden = !phone;
          if (phone) {
            phoneLink.textContent = phone;
            phoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
          }
        }

        const links = [
          ['ORCID', p.orcid],
          ['GitHub', p.github],
          ['LinkedIn', p.linkedin]
        ];
        $('#footer-links').innerHTML = links
          .filter(([, url]) => typeof url === 'string' && url.startsWith('https://'))
          .map(([name, url]) => `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`)
          .join('');

        $('#cv-action').innerHTML = p.cvUrl
          ? `<a href="${attr(p.cvUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-dark">View CV ↗</a>`
          : '<a class="btn btn-secondary" href="#experience">View academic experience ↗</a>';
        $('#cv-copy').textContent = p.cvUrl
          ? 'Review the complete curriculum vitae and academic record.'
          : 'My academic record is summarized above. The full downloadable CV will be added after the final PDF is uploaded.';

      }

      function focusRender() {
        // Feature a few entry points; the full taxonomy remains under Research.
        const featured = ['dual', 'ch', 'radical'];
        $('#focus-grid').innerHTML = featured
          .map(id => data.categories.find(category => category.id === id))
          .filter(Boolean)
          .map(c => `
            <button type="button" class="focus-card" data-category="${attr(c.id)}"
                    aria-label="Explore ${attr(c.name)}">
              <div class="top">
                <span class="num">${esc(c.code)} / FEATURED RESEARCH</span>
                <span class="arrow" aria-hidden="true">↗</span>
              </div>
              <div><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p></div>
              <span class="focus-cta">Explore this research area</span>
            </button>
          `).join('');
      }

      function researchRender() { if (!data.categories.length) { $('#research-sidebar').innerHTML = ''; $('#project-list').innerHTML = 'No categories yet'; return } if (!data.categories.some(c => c.id === activeGroup)) activeGroup = data.categories[0].id; let cat = category(activeGroup); $('#research-sidebar').innerHTML = data.categories.map(c => `<button type="button" class="research-group ${c.id === activeGroup ? 'active' : ''}" data-category="${attr(c.id)}"><span class="group-num">${esc(c.code)}</span><span>${esc(c.name)}</span></button>`).join(''); $('#research-heading').innerHTML = `<h3>${esc(cat.name)}</h3><p>${esc(cat.summary)}</p>`; $('#research-subnav').innerHTML = ['All', ...norm(cat.subs)].map(s => `<button type="button" class="subtab ${activeSub === s ? 'active' : ''}" data-sub="${attr(s)}">${esc(s)}</button>`).join(''); const papers = new Map(data.publications.map(p => [p.id, p])); const ps = data.projects.filter(p => p.group === activeGroup && (activeSub === 'All' || p.sub === activeSub)); $('#project-list').innerHTML = ps.length ? ps.map(p => { let pub = papers.get(p.publicationId), url = pub ? asDoi(pub.doi) : p.link; return `<article class="project-card"><div class="card-meta"><span class="status ${statusClass(p.status)}">${esc(p.status || 'Project')}</span><small class="muted">${esc(p.year || '')}</small></div><h4>${esc(p.title)}</h4><p>${esc(p.summary)}</p><div class="tagline">${norm(p.methods).slice(0, 4).map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>${url ? `<a class="card-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">${pub ? 'Read publication' : 'View project'} ↗</a>` : ''}</article>` }).join('') : `<div class="empty" style="grid-column:1/-1">No projects are assigned to this subcategory yet. Use <b>Edit Website → Projects</b> to add one.</div>` }
      function pubRender() {
  // 1. Build the research-category filter.
  const options = [
    '<option value="All">All research areas</option>',
    ...data.categories.map(c => `
      <option value="${attr(c.id)}"
        ${pubFilter === c.id ? 'selected' : ''}>
        ${esc(c.name)}
      </option>
    `)
  ];
  $('#pub-group').innerHTML = options.join('');
  $('#pub-search').value = pubSearch;

  // 2. Use abbreviated journal names in ACS-style references.
  const abbreviations = {
    'Journal of the American Chemical Society': 'J. Am. Chem. Soc.',
    'The Journal of Organic Chemistry': 'J. Org. Chem.',
    'Journal of Organic Chemistry': 'J. Org. Chem.',
    'Organic Letters': 'Org. Lett.',
    'ACS Catalysis': 'ACS Catal.',
    'Chemical Science': 'Chem. Sci.',
    'Chemistry – A European Journal': 'Chem. Eur. J.',
    'Organometallics': 'Organometallics',
    'Proceedings of the National Academy of Sciences': 'Proc. Natl. Acad. Sci. U.S.A.',
    'Journal of Materials Chemistry A': 'J. Mater. Chem. A',
    'Chemical Engineering Journal': 'Chem. Eng. J.',
    'Journal of Computational Chemistry': 'J. Comput. Chem.'
  };

  // 3. Search and sort articles, newest first.
  const publications = data.publications
    .filter(p => {
      const matchesCategory =
        pubFilter === 'All' || p.group === pubFilter;
      const text = [
        p.title, p.authors, p.authorsACS, p.journal,
        p.abstract, p.year, ...norm(p.skills)
      ].join(' ').toLowerCase();
      return matchesCategory &&
        text.includes(pubSearch.toLowerCase());
    })
    .sort((a, b) => Number(b.year) - Number(a.year));

  const autoCount = data.publications.filter(p => p.autoImported).length;
  const curatedCount = data.publications.length - autoCount;
  $('#pub-count').textContent = autoCount
    ? `${publications.length} of ${data.publications.length} records (${curatedCount} curated; ${autoCount} Scholar additions)`
    : `${publications.length} of ${data.publications.length} journal articles`;

  // 4. Format the journal citation only with known bibliographic fields.
  function formatCitation(p) {
    const journal = p.journalAbbr ||
      abbreviations[p.journal] || p.journal || '';

    const parts = [];
    if (p.year) parts.push(`<b>${esc(p.year)}</b>`);

    if (p.volume) {
      let volume = `<i>${esc(p.volume)}</i>`;
      if (p.issue) volume += ` (${esc(p.issue)})`;
      parts.push(volume);
    }

    if (p.pages) parts.push(esc(p.pages));
    if (p.articleNumber && !p.pages) {
      parts.push(esc(p.articleNumber));
    }

    const numbers = parts.join(', ');
    return `<i>${esc(journal)}</i>${numbers ? ' ' + numbers : ''}.`;
  }

  // 5. Produce every publication card with the same accessible layout.
  if (!publications.length) {
    $('#pub-list').innerHTML =
      '<div class="empty">No matching articles. Clear the search.</div>';
    return;
  }

  $('#pub-list').innerHTML = publications.map(p => {
    const doiUrl = asDoi(p.doi);
    const scholarUrl = /^https:\/\//.test(p.scholarLink || '') ? p.scholarLink : '';
    const authors = p.authorsACS || p.authors ||
      'Author list pending verification';
    const researchArea = category(p.group).name;

    const tags = norm(p.skills).map(skill =>
      `<span class="tag">${esc(skill)}</span>`
    ).join('');

    return `
      <article class="pub-row">
        <div class="pub-year">${esc(p.year)}</div>

        <div class="pub-content">
          <div class="pub-title">${esc(p.title)}</div>
          <div class="pub-authors">${esc(authors)}</div>
          <div class="pub-journal">${formatCitation(p)}</div>
          <div class="pub-topic">
            ${esc(researchArea)} / ${esc(p.sub || '')}
          </div>

          <details class="pub-details">
            <summary>Research summary & methods</summary>
            <p class="pub-abstract">${esc(p.abstract || 'Summary pending editorial review.')}</p>
            <div class="tagline">${tags}</div>
          </details>

          <div class="pub-actions">
            ${doiUrl ? `
              <a href="${attr(doiUrl)}"
                 target="_blank"
                 rel="noopener noreferrer">
                Journal / DOI ↗
              </a>
            ` : ''}

            ${p.autoImported && scholarUrl ? `<a href="${attr(scholarUrl)}" target="_blank" rel="noopener noreferrer">Google Scholar record ↗</a>` : ''}
            ${p.autoImported ? '<span class="tag">Auto-added · Citation metadata pending</span>' : `<button type="button"
                    data-category="${attr(p.group)}"
                    data-go-research="1">Related projects ↗</button>`}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

      function skillsRender() {
        // Link only explicitly tagged methods to the papers that list them.
        $('#skills-grid').innerHTML = data.skills.map(group => {
          const tags = norm(group.items).map(skill => {
            const matches = data.publications.filter(p =>
              norm(p.skills).some(item => item.toLowerCase() === skill.toLowerCase())
            ).length;
            if (!matches) return `<span class="tag">${esc(skill)}</span>`;
            return `<button type="button" class="tag skill-find"
                      data-skill="${attr(skill)}"
                      aria-label="View ${matches} publications tagged ${attr(skill)}"
                      title="${matches} related publications">${esc(skill)} ↗</button>`;
          }).join('');
          return `<article class="skill-box">
                    <h3>${esc(group.group)}</h3><div>${tags}</div>
                  </article>`;
        }).join('');
      }

      function timelineRender() { $('#timeline').innerHTML = data.experience.filter(x => x.showOnWebsite !== false).map(x => `<article class="time-card"><div class="years">${esc(x.years)}</div><h3>${esc(x.role)}</h3><div class="place">${esc(x.place)}</div><p>${esc(x.details)}</p></article>`).join('') }
      function customRender() { $('#user-css').textContent = data.customCss || ''; $('#custom-block').innerHTML = data.customHtml || '' }

      function impactRender() {
        const p = data.profile || {};
        const profiles = [
          ['Google Scholar', 'Publications & citation history', p.scholar],
          ['ORCID', '0000-0003-1618-0707', p.orcid],
          ['Scopus', 'Author ID: 57034214700', p.scopus],
          ['Web of Science', 'Researcher search (profile pending verification)', p.webOfScience],
          ['LinkedIn', 'Professional experience', p.linkedin],
          ['GitHub', 'Scientific code & research tools', p.github]
        ];
        $('#profile-link-grid').innerHTML = profiles
          .filter(([, , url]) => typeof url === 'string' && /^https:\/\//.test(url))
          .map(([name, description, url]) => `
            <a class="profile-link-card" href="${attr(url)}" target="_blank"
               rel="noopener noreferrer" aria-label="Visit ${attr(name)} profile">
              <small>${esc(name)}</small>
              <strong>${esc(description)}</strong>
              <span>Visit profile ↗</span>
            </a>
          `).join('');
        $('#quick-paper-count').textContent = `${data.publications.length} publication records`;
        $('#quick-project-count').textContent = `${data.projects.length} research records`;
      }

      function renderAll() { profileRender(); focusRender(); researchRender(); pubRender(); skillsRender(); timelineRender(); customRender(); impactRender(); $('#current-year').textContent = new Date().getFullYear() }
      function selectGroup(id, sub = 'All') { activeGroup = id; activeSub = sub; researchRender(); document.getElementById('research').scrollIntoView({ behavior: 'smooth' }) }
      // public-site controls
      $('#focus-grid').addEventListener('click', e => { let b = e.target.closest('[data-category]'); if (b) selectGroup(b.dataset.category) });
      $('#research-sidebar').addEventListener('click', e => { let b = e.target.closest('[data-category]'); if (b) { activeGroup = b.dataset.category; activeSub = 'All'; researchRender() } });
      $('#research-subnav').addEventListener('click', e => { let b = e.target.closest('[data-sub]'); if (b) { activeSub = b.dataset.sub; researchRender() } });
      $('#pub-search').addEventListener('input', e => { pubSearch = e.target.value; pubRender(); $('#pub-search').focus(); $('#pub-search').setSelectionRange(pubSearch.length, pubSearch.length) });
      $('#pub-group').addEventListener('change', e => { pubFilter = e.target.value; pubRender() });
      $('#pub-list').addEventListener('click', e => { let b = e.target.closest('[data-go-research]'); if (b) selectGroup(b.dataset.category) });
      $('#skills-grid').addEventListener('click', e => {
        const item = e.target.closest('[data-skill]');
        if (!item) return;
        pubFilter = 'All';
        pubSearch = item.dataset.skill;
        pubRender();
        $('#publications').scrollIntoView({ behavior: 'smooth' });
      });
      document.addEventListener('click', e => { if (e.target.id === 'cv-add') { openStudio(); setTab('profile') } });
      function openStudio() { document.body.classList.add('editing'); $('#open-studio').textContent = '✎ Editing'; setTab(studioTab) }
      function closeStudio() { document.body.classList.remove('editing'); $('#open-studio').innerHTML = '✎ &nbsp; Edit Website' }
      $('#open-studio').addEventListener('click', () => document.body.classList.contains('editing') ? closeStudio() : openStudio()); $('#close-studio').addEventListener('click', closeStudio);
      function setTab(tab) { studioTab = tab; document.querySelectorAll('.studio-tab').forEach(b => b.classList.toggle('active', b.dataset.studio === tab)); renderStudio() }
      document.querySelector('.studio-tabs').addEventListener('click', e => { let b = e.target.closest('[data-studio]'); if (b) setTab(b.dataset.studio) });
      const formField = (label, key, value, area = false) => `<div class="field"><label>${esc(label)}</label>${area ? `<textarea data-profile="${attr(key)}">${esc(value)}</textarea>` : `<input data-profile="${attr(key)}" value="${attr(value)}"/>`}</div>`;
      function groupSelect(current, field = 'project-group') { return `<select id="${field}">${data.categories.map(c => `<option value="${attr(c.id)}" ${c.id === current ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` }
      function subSelect(group, current) { return `<select id="project-sub">${norm(category(group).subs).map(s => `<option value="${attr(s)}" ${current === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>` }
      function renderStudio() {
        let area = $('#studio-content'); if (studioTab === 'profile') { let p = data.profile; area.innerHTML = `<h4>Profile & homepage</h4><p class="hint">Edit these fields. The public homepage will change instantly as you type.</p>${formField('Full name', 'name', p.name)}${formField('Professional role', 'role', p.role)}${formField('Institution / location', 'institution', p.institution)}${formField('Homepage headline', 'headline', p.headline, true)}${formField('Introduction', 'summary', p.summary, true)}${formField('Header overline', 'eyebrow', p.eyebrow)}${formField('Contact email', 'email', p.email || '')}${formField('Phone number (optional; hidden if empty)', 'phone', p.phone || '')}${formField('ORCID URL', 'orcid', p.orcid)}${formField('Scopus URL', 'scopus', p.scopus || '')}${formField('Web of Science URL', 'webOfScience', p.webOfScience || '')}${formField('LinkedIn URL', 'linkedin', p.linkedin || '')}${formField('GitHub URL', 'github', p.github)}${formField('Google Scholar URL', 'scholar', p.scholar || '')}${formField('CV PDF URL (or relative file path)', 'cvUrl', p.cvUrl)}<div class="studio-note">Tip: upload your final CV as <code>cv.pdf</code> beside this HTML and enter <code>cv.pdf</code> here.</div>`; return }
        if (studioTab === 'projects') { let p = data.projects.find(x => x.id === selectedProject) || { id: '', title: '', group: data.categories[0]?.id || '', sub: data.categories[0]?.subs[0] || '', status: 'Ongoing', year: '2026', summary: '', methods: [], publicationId: '', link: '' }; let pubOpts = ['<option value="">None / unpublished</option>', ...data.publications.map(u => `<option value="${attr(u.id)}" ${u.id === p.publicationId ? 'selected' : ''}>${esc(u.year + ' · ' + u.title.substring(0, 46))}</option>`)].join(''); area.innerHTML = `<h4>Manage research projects</h4><p class="hint">Create, modify or remove projects. Each project appears automatically in its research category.</p><div class="field"><label>SELECT PROJECT</label><select id="project-picker"><option value="new" ${selectedProject === 'new' ? 'selected' : ''}>+ New research project</option>${data.projects.map(x => `<option value="${attr(x.id)}" ${x.id === selectedProject ? 'selected' : ''}>${esc(x.title.substring(0, 52))}</option>`).join('')}</select></div><div class="field"><label>PROJECT TITLE</label><input id="project-title" value="${attr(p.title)}"/></div><div class="field"><label>RESEARCH THEME</label>${groupSelect(p.group)}</div><div class="field"><label>SUBCATEGORY</label>${subSelect(p.group, p.sub)}</div><div class="field"><label>STATUS</label><select id="project-status">${['Published', 'Ongoing', 'In development', 'Research direction'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field"><label>YEAR</label><input id="project-year" value="${attr(p.year)}"/></div><div class="field"><label>ABSTRACT / SHORT SUMMARY</label><textarea id="project-summary">${esc(p.summary)}</textarea></div><div class="field"><label>METHODS / SOFTWARE (comma-separated)</label><input id="project-methods" value="${attr(norm(p.methods).join(', '))}"/></div><div class="field"><label>LINKED JOURNAL ARTICLE</label><select id="project-pub">${pubOpts}</select></div><div class="field"><label>OPTIONAL PROJECT URL</label><input id="project-link" value="${attr(p.link || '')}"/></div><div class="studio-actions"><button class="btn btn-dark" id="save-project">Save project</button>${p.id ? '<button class="btn btn-secondary" id="delete-project">Delete project</button>' : ''}</div><div class="studio-toast" id="studio-message"></div>`; return }
        if (studioTab === 'publications') { let p = data.publications.find(x => x.id === selectedPublication) || { id: '', title: '', year: '2026', journal: '', authors: '', doi: '', group: data.categories[0]?.id || '', sub: data.categories[0]?.subs[0] || '', abstract: '', skills: [] }; area.innerHTML = `<h4>Manage publications</h4><p class="hint">Add verified journal details and DOI. Related project links update when they reference this publication.</p><div class="field"><label>SELECT PUBLICATION</label><select id="pub-picker"><option value="new" ${selectedPublication === 'new' ? 'selected' : ''}>+ New publication</option>${data.publications.map(x => `<option value="${attr(x.id)}" ${x.id === selectedPublication ? 'selected' : ''}>${esc(x.year + ' · ' + x.title.substring(0, 40))}</option>`).join('')}</select></div><div class="field"><label>PUBLICATION TITLE</label><input id="pub-title-input" value="${attr(p.title)}"/></div><div class="field"><label>YEAR</label><input id="pub-year-input" value="${attr(p.year)}"/></div><div class="field"><label>JOURNAL</label><input id="pub-journal-input" value="${attr(p.journal)}"/></div><div class="field"><label>AUTHORS</label><input id="pub-authors-input" value="${attr(p.authors)}"/></div><div class="field"><label>AUTHORS — ACS FORMAT (optional)</label><input id="pub-authors-acs-input" value="${attr(p.authorsACS || '')}"/></div><div class="field"><label>JOURNAL ABBREVIATION (ACS)</label><input id="pub-journal-abbr-input" value="${attr(p.journalAbbr || '')}"/></div><div class="field"><label>VOLUME</label><input id="pub-volume-input" value="${attr(p.volume || '')}"/></div><div class="field"><label>ISSUE (optional)</label><input id="pub-issue-input" value="${attr(p.issue || '')}"/></div><div class="field"><label>PAGES OR ARTICLE NUMBER</label><input id="pub-pages-input" value="${attr(p.pages || '')}"/></div><div class="field"><label>DOI (without https://doi.org/)</label><input id="pub-doi-input" value="${attr(p.doi)}"/></div><div class="field"><label>PRIMARY RESEARCH THEME</label>${groupSelect(p.group, 'pub-category')}</div><div class="field"><label>SUBCATEGORY</label><select id="pub-sub">${norm(category(p.group).subs).map(s => `<option ${s === p.sub ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label>ABSTRACT / SUMMARY</label><textarea id="pub-abstract-input">${esc(p.abstract)}</textarea></div><div class="field"><label>RESEARCH SKILLS (comma-separated)</label><input id="pub-skills-input" value="${attr(norm(p.skills).join(', '))}"/></div><div class="studio-actions"><button class="btn btn-dark" id="save-publication">Save publication</button>${p.id ? '<button class="btn btn-secondary" id="delete-publication">Delete publication</button>' : ''}</div><div class="studio-toast" id="studio-message"></div>`; return }
        if (studioTab === 'code') { area.innerHTML = `<h4>Edit website source</h4><p class="hint">Advanced editing: change CSS or insert your own HTML directly into the CV section. Results appear immediately on the webpage.</p><div class="field"><label>LIVE CUSTOM CSS</label><textarea class="code-editor" id="custom-css" spellcheck="false" placeholder="/* Example: */&#10;.hero { background: #183b53; }">${esc(data.customCss || '')}</textarea></div><div class="field"><label>LIVE CUSTOM HTML</label><textarea class="code-editor" id="custom-html" spellcheck="false" placeholder="<div class=&quot;skill-box&quot;>My additional content</div>">${esc(data.customHtml || '')}</textarea></div><div class="studio-note">Custom HTML/JavaScript is for trusted code only. Do not paste code from unknown websites.</div><h4 style="margin-top:25px">Edit the complete research database</h4><p class="hint">JSON source includes research categories, publications, software skills, positions and project links. Modify it then click Apply.</p><div class="field"><label>FULL DATA (JSON)</label><textarea class="code-editor json-editor" id="json-source" spellcheck="false">${esc(JSON.stringify(data, null, 2))}</textarea></div><div class="studio-actions"><button class="btn btn-dark" id="apply-json">Apply JSON changes</button></div><div class="studio-toast" id="studio-message"></div>`; return }
        area.innerHTML = `<h4>Save and publish your work</h4><p class="hint">The source is organized into index.html, style.css, app.js, research_data.json and citation files.</p><div class="studio-note">Download the edited JSON and replace research_data.json in your website folder. Reload the site through Live Server. Then commit your source files to GitHub when you want to publish changes.</div><div class="studio-actions"><button class="btn btn-dark" id="download-site-secondary">↓ Export edited JSON</button><button class="btn btn-secondary" id="download-data">↓ Export data JSON</button><button class="btn btn-secondary" id="reset-site">Reset demo to original</button></div><div class="field"><label>IMPORT A PREVIOUS JSON DATA FILE</label><input type="file" accept="application/json,.json" id="import-data"/></div><div class="studio-toast" id="studio-message"></div>`;
      }
      function updateSubs(targetId, group) { let select = $('#' + targetId); if (select) select.innerHTML = norm(category(group).subs).map(s => `<option>${esc(s)}</option>`).join('') }
      $('#studio-content').addEventListener('input', e => {
        let target = e.target;
        if (target.dataset.profile) { data.profile[target.dataset.profile] = target.value; save(); profileRender(); impactRender() }
        if (target.id === 'custom-css') { data.customCss = target.value; save(); $('#user-css').textContent = target.value }
        if (target.id === 'custom-html') { data.customHtml = target.value; save(); $('#custom-block').innerHTML = target.value }
      });
      $('#studio-content').addEventListener('change', async e => {
        let t = e.target;
        if (t.id === 'project-picker') { selectedProject = t.value; renderStudio() }
        if (t.id === 'pub-picker') { selectedPublication = t.value; renderStudio() }
        if (t.id === 'project-group') updateSubs('project-sub', t.value);
        if (t.id === 'pub-category') updateSubs('pub-sub', t.value);
        if (t.id === 'import-data' && t.files?.[0]) { try { let imported = JSON.parse(await t.files[0].text()); if (!imported.profile || !Array.isArray(imported.projects) || !Array.isArray(imported.publications) || !Array.isArray(imported.categories)) throw Error('Missing required site fields'); data = imported; selectedProject = 'new'; selectedPublication = 'new'; save(); renderAll(); renderStudio() } catch (err) { alert('Import error: ' + err.message) } }
      });
      const val = id => ($('#' + id)?.value || '').trim();
      const list = s => s.split(',').map(x => x.trim()).filter(Boolean);
      $('#studio-content').addEventListener('click', e => {
        const id = e.target.id;
        if (id === 'save-project') { let title = val('project-title'); if (!title) { alert('Project title is required'); return } let obj = { id: selectedProject === 'new' ? 'project-' + Date.now() : selectedProject, title, group: val('project-group'), sub: val('project-sub'), status: val('project-status'), year: val('project-year'), summary: val('project-summary'), methods: list(val('project-methods')), publicationId: val('project-pub'), link: val('project-link') }; let idx = data.projects.findIndex(x => x.id === obj.id); if (idx >= 0) data.projects[idx] = obj; else data.projects.unshift(obj); selectedProject = obj.id; save(); renderAll(); renderStudio(); $('#studio-message').textContent = 'Draft updated. Export research_data.json to keep this change.' }
        if (id === 'delete-project') { if (!confirm('Delete this project?')) return; data.projects = data.projects.filter(x => x.id !== selectedProject); selectedProject = 'new'; save(); renderAll(); renderStudio() }
        if (id === 'save-publication') { let title = val('pub-title-input'); if (!title) { alert('Publication title is required'); return } let obj = { id: selectedPublication === 'new' ? 'pub-' + Date.now() : selectedPublication, title, year: val('pub-year-input'), journal: val('pub-journal-input'), authors: val('pub-authors-input'), authorsACS: val('pub-authors-acs-input'), journalAbbr: val('pub-journal-abbr-input'), volume: val('pub-volume-input'), issue: val('pub-issue-input'), pages: val('pub-pages-input'), doi: val('pub-doi-input'), group: val('pub-category'), sub: val('pub-sub'), abstract: val('pub-abstract-input'), skills: list(val('pub-skills-input')) }; let idx = data.publications.findIndex(x => x.id === obj.id); if (idx >= 0) data.publications[idx] = obj; else data.publications.unshift(obj); selectedPublication = obj.id; save(); renderAll(); renderStudio(); $('#studio-message').textContent = 'Draft updated. Export research_data.json to keep this change.' }
        if (id === 'delete-publication') { if (!confirm('Delete this publication?')) return; data.publications = data.publications.filter(x => x.id !== selectedPublication); data.projects.forEach(p => { if (p.publicationId === selectedPublication) p.publicationId = '' }); selectedPublication = 'new'; save(); renderAll(); renderStudio() }
        if (id === 'apply-json') { try { let obj = JSON.parse($('#json-source').value); if (!obj.profile || !Array.isArray(obj.projects) || !Array.isArray(obj.publications) || !Array.isArray(obj.categories) || !Array.isArray(obj.skills) || !Array.isArray(obj.experience)) throw Error('Missing profile, categories, projects, publications, skills or experience'); data = obj; save(); renderAll(); renderStudio(); $('#studio-message').textContent = 'Draft applied. Export research_data.json to save the change.' } catch (err) { $('#studio-message').textContent = 'JSON error: ' + err.message } }
        if (id === 'download-site-secondary') downloadSite(); if (id === 'download-data') downloadBlob(JSON.stringify(data, null, 2), 'portfolio-data.json', 'application/json');
        if (id === 'reset-site') { if (!confirm('Discard unsaved preview changes and reload the original JSON?')) return; data = clone(SEED);  activeGroup = 'dual'; activeSub = 'All'; selectedProject = 'new'; selectedPublication = 'new'; renderAll(); renderStudio() }
      });
      function downloadBlob(body, name, mime) { let blob = new Blob([body], { type: mime + ';charset=utf-8' }); let url = URL.createObjectURL(blob); let a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 250) }
      function downloadSite() {
        // Download the edited research records. Replace research_data.json
        // in the project folder if you want to keep these Studio changes.
        downloadBlob(
          JSON.stringify(data, null, 2),
          'research_data.json',
          'application/json'
        );
      }
      $('#download-site').addEventListener('click', downloadSite);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeStudio() });
      // Never expose this unauthenticated editor on a publicly hosted website.
      const localHosts = ['localhost', '127.0.0.1', ''];
      if (!localHosts.includes(window.location.hostname)) {
        const trigger = $('#open-studio');
        const studio = $('#studio-panel');
        if (trigger) trigger.hidden = true;
        if (studio) studio.hidden = true;
      }


      // Thesis and optional photo: read from a separate, editable JSON file.
      // The thesis is NOT counted among journal publications.
      async function renderAcademicExtras() {
        let config;
        try {
          const res = await fetch('./academic_extras.json', { cache: 'no-store' });
          if (!res.ok) return;
          config = await res.json();
        } catch (err) { console.warn('Optional academic extras unavailable', err); return; }
        const style = document.createElement('style');
        style.textContent = `
          .academic-thesis { max-width:900px; border:1px solid var(--line); border-radius:16px; padding:22px 24px; background:var(--paper); }
          .academic-thesis h3 { margin:6px 0 9px; font-size:20px; }
          .academic-thesis p { color:var(--muted); margin:6px 0 12px; }
          .academic-thesis a { color:var(--green); text-decoration:underline; font-weight:750; }
          /* Photo gallery: discreet, collapsed by default, at the end of Contact. */
          .academic-photo-gallery { margin-top:20px; padding-top:12px; max-width:300px; border-top:1px solid rgba(255,255,255,.12); }
          .academic-photo-gallery summary { display:inline-block; color:#c0d7cb; font-size:12px; font-weight:500; text-decoration:underline; text-underline-offset:3px; cursor:pointer; list-style:none; }
          .academic-photo-gallery summary::-webkit-details-marker { display:none; }
          .academic-photo-gallery summary::after { content:' ▾'; }
          .academic-photo-gallery[open] summary::after { content:' ▴'; }
          .academic-photo-gallery summary:focus-visible { outline:2px solid #d6eea6; outline-offset:4px; }
          .academic-photo-gallery figure { margin:14px 0 0; padding:8px; background:#f5f8f3; border-radius:12px; }
          .academic-photo-gallery img { display:block; width:100%; height:auto; max-height:360px; object-fit:contain; border-radius:8px; }
          .academic-photo-gallery figcaption { color:#526b60; font-size:11px; padding:7px 4px 3px; }
        `;
        document.head.appendChild(style);
        const thesis = config.thesis || {};
        const publicationsSection = document.querySelector('#publications');
        if (publicationsSection && thesis.title && !document.querySelector('#doctoral-thesis')) {
          // Separate, full-width academic section: NOT part of Publications.
          const section = document.createElement('section');
          section.className = 'section';
          section.id = 'doctoral-thesis';

          const container = document.createElement('div');
          container.className = 'container';

          const head = document.createElement('div');
          head.className = 'section-head';
          const headText = document.createElement('div');
          const eyebrow = document.createElement('div');
          eyebrow.className = 'eyebrow';
          eyebrow.textContent = 'DOCTORAL RESEARCH';
          const sectionHeading = document.createElement('h2');
          sectionHeading.textContent = 'Ph.D. thesis.';
          const description = document.createElement('p');
          description.className = 'section-sub';
          description.textContent = 'Doctoral research at the Indian Institute of Technology Bombay.';
          headText.append(eyebrow, sectionHeading, description);
          head.append(headText);

          const card = document.createElement('article');
          card.className = 'academic-thesis';
          card.id = 'academic-thesis';
          const title = document.createElement('h3');
          title.textContent = thesis.title;
          const meta = document.createElement('p');
          meta.textContent = `Ph.D. Thesis · ${thesis.institution || 'IIT Bombay'} · ${thesis.year || '2019'}`;
          card.append(title, meta);

          if (thesis.libraryUrl && /^https:\/\//.test(thesis.libraryUrl)) {
            const link = document.createElement('a');
            link.href = thesis.libraryUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'IIT Bombay Thesis Library / ETD ↗';
            card.append(link);
            const note = document.createElement('p');
            note.style.fontSize = '12px';
            note.textContent = 'This opens the institutional thesis portal, not a verified direct thesis record.';
            card.append(note);
          }

          container.append(head, card);
          section.append(container);
          publicationsSection.insertAdjacentElement('afterend', section);
        }
        // Photo is never shown on the homepage. Visitors may choose to open
        // the discreet Photo gallery near the bottom of the Contact footer.
        const photo = config.photo || {};
        if (photo.url && /^(https:\/\/|[\w.\/-]+\.(jpg|jpeg|png|webp))$/i.test(photo.url)) {
          const contact = document.querySelector('#contact .container');
          const bottom = contact?.querySelector('.footer-bottom');
          if (bottom && !document.querySelector('#academic-photo-gallery')) {
            const gallery = document.createElement('details');
            gallery.id = 'academic-photo-gallery';
            gallery.className = 'academic-photo-gallery';
            const toggle = document.createElement('summary');
            toggle.textContent = 'Photo gallery';
            toggle.setAttribute('aria-label', 'Show or hide profile photograph');
            const frame = document.createElement('figure');
            const img = document.createElement('img');
            img.src = photo.url;
            img.alt = photo.alt || 'Portrait';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.addEventListener('error', () => gallery.remove(), { once: true });
            frame.append(img);
            if (photo.caption) {
              const caption = document.createElement('figcaption');
              caption.textContent = photo.caption;
              frame.append(caption);
            }
            gallery.append(toggle, frame);
            bottom.before(gallery);
          }
        }
      }
      renderAll();
      void renderAcademicExtras();
    })();
