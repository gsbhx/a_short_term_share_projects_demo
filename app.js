const CASES = [
  {
    id: 'daily', date: '2026-09-28', shortDate: '09.28', month: 'SEP 2026',
    type: '每日涨停 · 炸板归因', title: 'A股活跃股票归因报告',
    file: 'A股_短线_每日涨停+炸板归因-案例.md',
    lead: '重度普跌下，追踪异动题材、涨停与触板未封个股的证据链。',
    tags: ['全市场普跌', '涨停 33 家', '机器人 / 先进封装'],
    metrics: [['下跌占比', '81.5%', '4,087 只下跌'], ['涨停', '33 家', '触板未封 15 家'], ['跌幅 ≤ −5%', '803 只', '研究股票池口径']],
    state: '全市场普跌（重度）', color: 'red',
    summary: '极度弱势的盘面里，报告拆解少数逆势题材与高股息容量资产的表现，并保留逐股证据链。',
    focus: '先进封装、人形机器人、绿色电力'
  },
  {
    id: 'shortterm', date: '2026-09-30', shortDate: '09.30', month: 'SEP 2026',
    type: '情绪周期 · 候选股 · 次日预案', title: 'A 股短线结构复盘',
    file: 'A股短线_情绪周期+候选股+次日预案-案例.md',
    lead: '把高低位分化、候选准入、诊断锚点与强中弱情景放进同一份短线复盘。',
    tags: ['ROTATION_MIXED', '高位强分歧', '低位修复'],
    metrics: [['非 ST 涨停', '52 家', '非 ST 炸板 12 家'], ['情绪阶段', 'MIXED', '高低位明显分化'], ['准入候选', '4 只', 'Stage-5 PASS 凭证']],
    state: '轮动分化 · MIXED', color: 'amber',
    summary: '短线投机与大盘风格分化，报告将交易候选与诊断锚点隔离，并记录次日可观察条件。',
    focus: '机器人、地产修复、医药与科技退潮'
  },
  {
    id: 'industry', date: '2026-10-09', shortDate: '10.09', month: 'OCT 2026',
    type: '活跃题材 · 产业生命力', title: 'A股活跃题材与产业生命力深度复盘',
    file: 'A股活跃题材与产业生命力深度复盘-案例.md',
    lead: '从市场事实与 Daily Heat 出发，交叉观察题材热度、产业阶段与长期跟踪价值。',
    tags: ['深 V 修复', '成交额 +12.17%', '出版 / 储能 / 金融科技'],
    metrics: [['全市场成交', '19,005.6 亿', '较前日 +12.17%'], ['非 ST 涨停', '69 家', '非 ST 跌停 8 家'], ['封板率', '83.13%', '非 ST 独立口径']],
    state: '探底回升 · 深 V', color: 'green',
    summary: '指数探底回升、成交放量，报告用热度与产业生命力四象限梳理活跃题材及长期跟踪线索。',
    focus: '现代出版、固态电池、金融科技'
  }
];

const state = { activeCase: null, docs: new Map(), view: 'overview', lastSearch: '' };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function inlineMarkdown(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safe = href.startsWith('https://') || href.startsWith('http://') || href.startsWith('#') || href.startsWith('/') ? href : '';
    return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  });
  return text;
}

function slugify(text, index) {
  const slug = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug || 'section'}-${index}`;
}

function lineId(line) { return `source-line-${line}`; }
function rowCells(row) { return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()); }
function isTableSeparator(line) { return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line); }
function isListLine(line) { return /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line); }
function isBlockStart(lines, index) {
  const line = lines[index];
  return !line.trim() || /^\s{0,3}#{1,6}\s/.test(line) || /^\s*```/.test(line) || /^\s*>/.test(line) || /^\s*(?:---+|\*\*\*+)\s*$/.test(line) || isListLine(line) || (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]));
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const output = [];
  const headings = [];
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) { i++; continue; }
    const startLine = i;
    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].replace(/\*\*/g, '').replace(/`/g, '');
      const id = slugify(title, i);
      headings.push({ level, title, id });
      output.push(`<h${level} id="${id}" data-line="${i}">${inlineMarkdown(heading[2])}</h${level}>`);
      i++; continue;
    }
    if (/^\s*```/.test(raw)) {
      const lang = trimmed.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      output.push(`<pre id="${lineId(startLine)}" data-line="${startLine}"><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(raw)) { output.push(`<hr data-line="${i}" />`); i++; continue; }
    if (/^\s*>/.test(raw)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      output.push(`<blockquote id="${lineId(startLine)}" data-line="${startLine}">${quote.map(part => `<p>${inlineMarkdown(part)}</p>`).join('')}</blockquote>`);
      continue;
    }
    if (raw.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const rows = [rowCells(raw)]; i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(rowCells(lines[i++]));
      const heads = rows.shift() || [];
      const headerHtml = heads.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join('');
      const bodyHtml = rows.map(row => `<tr>${heads.map((_, col) => `<td>${inlineMarkdown(row[col] ?? '')}</td>`).join('')}</tr>`).join('');
      output.push(`<div class="table-scroll" id="${lineId(startLine)}" data-line="${startLine}"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }
    if (isListLine(raw)) {
      const ordered = /^\s*\d+[.)]\s+/.test(raw);
      const items = [];
      while (i < lines.length && isListLine(lines[i]) && /^\s*\d+[.)]\s+/.test(lines[i]) === ordered) {
        items.push(lines[i].replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      output.push(`<${tag} id="${lineId(startLine)}" data-line="${startLine}">${items.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const paragraph = [raw.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) paragraph.push(lines[i++].trim());
    output.push(`<p id="${lineId(startLine)}" data-line="${startLine}">${paragraph.map(inlineMarkdown).join(' ')}</p>`);
  }
  return { html: output.join('\n'), headings };
}

async function loadCases() {
  const outcomes = await Promise.all(CASES.map(async item => {
    try {
      const response = await fetch(`/reports/${encodeURIComponent(item.file)}`);
      if (!response.ok) throw new Error('报告暂不可用');
      const markdown = await response.text();
      const rendered = renderMarkdown(markdown);
      state.docs.set(item.id, { markdown, ...rendered });
    } catch (error) {
      state.docs.set(item.id, { markdown: '', html: `<div class="empty-search">无法读取原文，请从项目根目录启动服务。</div>`, headings: [], error: error.message });
    }
  }));
  renderCaseNavigation();
  renderTimeline();
}

function renderCaseNavigation() {
  $('#case-nav').innerHTML = CASES.slice().reverse().map(item => `
    <button class="case-nav-item" data-open-case="${item.id}" type="button">
      <span class="case-nav-date">${item.shortDate}</span>
      <span class="case-nav-copy"><b>${escapeHtml(item.type)}</b><small>${escapeHtml(item.title)}</small></span>
    </button>`).join('');
}

function renderTimeline() {
  $('#timeline-list').innerHTML = CASES.slice().reverse().map(item => `
    <article class="timeline-card" tabindex="0" role="button" data-open-case="${item.id}" aria-label="打开 ${escapeHtml(item.title)}">
      <div class="timeline-date"><b>${item.shortDate}</b><small>${item.month}</small></div>
      <div class="timeline-main"><span class="timeline-type">${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></div>
      <div class="timeline-tags">${item.tags.map((tag, index) => `<span class="${item.color === 'red' && index === 0 ? 'signal-red' : item.color === 'green' && index === 0 ? 'signal-green' : ''}">${escapeHtml(tag)}</span>`).join('')}</div>
      <span class="timeline-arrow" aria-hidden="true">↗</span>
    </article>`).join('');
}

function setView(view) {
  state.view = view;
  $('#overview-view').classList.toggle('hidden', view !== 'overview' && view !== 'cases');
  $('#report-view').classList.toggle('hidden', view !== 'report');
  $('#search-view').classList.toggle('hidden', view !== 'search');
  $('#breadcrumb-current').textContent = view === 'report' ? '案例原文' : view === 'search' ? '全文搜索' : view === 'cases' ? '案例库' : '研究总览';
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === (view === 'cases' ? 'cases' : 'overview')));
  if (view !== 'search') $('#global-search').value = '';
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function openCase(id, line = null) {
  const item = CASES.find(entry => entry.id === id);
  if (!item) return;
  state.activeCase = id;
  const doc = state.docs.get(id);
  $('#report-eyebrow').innerHTML = `<span class="eyebrow-dot"></span> ${escapeHtml(item.type)} · ${item.shortDate}`;
  $('#report-title').textContent = item.title;
  $('#report-lead').textContent = item.lead;
  $('#report-meta').innerHTML = [`交易日 ${item.date}`, `案例主题 ${item.focus}`, `原文 ${item.file}`].map(value => `<span class="report-meta-chip">${escapeHtml(value)}</span>`).join('');
  $('#report-content').innerHTML = doc?.html || '<div class="empty-search">报告加载中…</div>';
  $('#outline-nav').innerHTML = (doc?.headings || []).filter((heading, index) => heading.level <= 3 && (heading.level <= 2 || index < 45)).map(heading => `<button class="outline-link ${heading.level === 3 ? 'sub' : ''}" type="button" data-anchor="${heading.id}">${escapeHtml(heading.title)}</button>`).join('');
  $$('.case-nav-item').forEach(button => button.classList.toggle('active', button.dataset.openCase === id));
  $('#download-report').onclick = () => downloadReport(item, doc?.markdown || '');
  setView('report');
  if (line !== null) requestAnimationFrame(() => {
    const anchor = $$('[data-line]', $('#report-content')).find(el => Number(el.dataset.line) >= line);
    (anchor || $('#report-content')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function downloadReport(item, markdown) {
  if (!markdown) return;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = item.file; link.click();
  URL.revokeObjectURL(link.href);
}

function searchReports(query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) { setView('overview'); return; }
  state.lastSearch = query.trim();
  setView('search');
  $('#search-summary').textContent = `在 ${CASES.length} 份案例原文中搜索“${state.lastSearch}”。`;
  const groups = [];
  for (const item of CASES.slice().reverse()) {
    const doc = state.docs.get(item.id);
    if (!doc?.markdown) continue;
    const lines = doc.markdown.split(/\r?\n/);
    const matches = [];
    let heading = item.title;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^#{1,6}\s+(.+)/);
      if (headingMatch) heading = headingMatch[1].replace(/\*\*/g, '').replace(/`/g, '');
      if (line.toLocaleLowerCase().includes(normalized)) {
        const snippet = line.replace(/^\s*(?:>|[-*+]\s+|\d+[.)]\s+)/, '').replace(/\|/g, ' · ').trim();
        if (snippet && matches.length < 5) matches.push({ line: i, heading, snippet });
      }
    }
    if (matches.length) groups.push({ item, matches });
  }
  const count = groups.reduce((total, group) => total + group.matches.length, 0);
  $('#search-summary').textContent = count ? `找到 ${count} 条匹配，分布在 ${groups.length} 份案例中。每份案例最多展示 5 条。` : `没有找到与“${state.lastSearch}”匹配的内容。`;
  if (!count) {
    $('#search-results').innerHTML = `<div class="empty-search">试试“机器人”“封板率”“候选池”或股票代码。</div>`;
    return;
  }
  $('#search-results').innerHTML = groups.map(({ item, matches }) => `
    <section class="search-result-group"><header class="search-group-head"><b>${escapeHtml(item.title)}</b><small>${item.shortDate} · ${matches.length} 条</small></header>
      ${matches.map(match => `<button class="search-hit" type="button" data-result-case="${item.id}" data-result-line="${match.line}"><strong>${escapeHtml(match.heading)}<span class="search-hit-line">第 ${match.line + 1} 行</span></strong><p>${highlight(match.snippet, state.lastSearch)}</p></button>`).join('')}
    </section>`).join('');
}

function highlight(text, query) {
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  if (!escapedQuery) return escaped;
  const index = escaped.toLocaleLowerCase().indexOf(escapedQuery.toLocaleLowerCase());
  if (index < 0) return escaped;
  return `${escaped.slice(0, index)}<mark>${escaped.slice(index, index + escapedQuery.length)}</mark>${escaped.slice(index + escapedQuery.length)}`;
}

function closeMobileNav() {
  $('#sidebar').classList.remove('open');
  $('#mobile-scrim').classList.remove('open');
}

document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { setView(viewButton.dataset.view); return; }
  const caseButton = event.target.closest('[data-open-case]');
  if (caseButton) { openCase(caseButton.dataset.openCase); return; }
  const anchorButton = event.target.closest('[data-anchor]');
  if (anchorButton) {
    const target = document.getElementById(anchorButton.dataset.anchor);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $$('.outline-link').forEach(link => link.classList.toggle('active', link === anchorButton));
    return;
  }
  const result = event.target.closest('[data-result-case]');
  if (result) { openCase(result.dataset.resultCase, Number(result.dataset.resultLine)); return; }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('.timeline-card')) openCase(event.target.dataset.openCase);
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#global-search').focus(); }
  if (event.key === 'Escape') { $('#global-search').value = ''; if (state.view === 'search') setView('overview'); closeMobileNav(); }
});

$('#global-search').addEventListener('input', event => {
  const value = event.target.value;
  if (value.trim().length >= 1) searchReports(value);
  else if (state.view === 'search') setView('overview');
});
$('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').classList.add('open'); });
$('#mobile-scrim').addEventListener('click', closeMobileNav);

loadCases();
