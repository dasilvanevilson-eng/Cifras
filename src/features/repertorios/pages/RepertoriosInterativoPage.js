import {
  getRepertorioById,
  listMusicasDoRepertorio,
  listRepertoriosComMusicas,
} from '../../../services/repertoriosService.js';
import {
  getCifraParaTransposicao,
  renderCifraOriginalForDisplayHtml,
} from '../../../utils/chordpro.js';

export async function RepertoriosInterativoPage() {
  const page = document.createElement('section');
  page.className = 'page repertorios-pdf-page repertorios-interativo-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Repert Interativo</h1>
        <p data-page-info>Gere um arquivo HTML com indice clicavel para execucao.</p>
      </div>
    </header>
    <section class="music-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando repertorios...</div>
      </div>
    </section>
  `;

  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  try {
    const { data, error } = await listRepertoriosComMusicas();
    if (error) throw error;

    const repertorios = data || [];
    if (!repertorios.length) {
      status.textContent = 'Nenhum repertorio cadastrado ainda.';
      return page;
    }

    listSlot.replaceChildren(createRepertoriosBrowser(repertorios));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar os repertorios.';
  }

  return page;
}

function createRepertoriosBrowser(repertorios) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser pdf-repertorios-browser';
  wrapper.innerHTML = `
    <div class="pdf-repertorios-searches">
      <label class="pdf-repertorio-search-field">
        Buscar repertorio
        <input class="search-input" type="search" placeholder="Nome ou data" autocomplete="off">
        <div class="pdf-search-results" data-role="repertorio-results" hidden></div>
      </label>
    </div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const results = wrapper.querySelector('[data-role="repertorio-results"]');

  function renderResults() {
    const query = normalizeText(searchInput.value);
    const filtered = repertorios
      .filter((repertorio) => matchesSearch(repertorio, query))
      .sort((a, b) => compareText(getField(a, ['nome', 'titulo', 'name']), getField(b, ['nome', 'titulo', 'name'])));

    results.innerHTML = filtered.length
      ? filtered.map((repertorio) => createSearchResult(repertorio)).join('')
      : '<p class="page-status">Nenhum repertorio encontrado.</p>';
    results.hidden = false;

    results.querySelectorAll('[data-action="generate-html"]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Gerando...';
        try {
          await generateInteractiveHtml(button.dataset.id);
          button.textContent = 'Arquivo gerado';
        } catch (error) {
          window.alert(error.message || 'Nao foi possivel gerar o HTML interativo.');
          button.disabled = false;
          button.textContent = button.dataset.originalLabel || 'Gerar HTML';
        }
      });
    });
  }

  searchInput.addEventListener('focus', renderResults);
  searchInput.addEventListener('input', renderResults);
  searchInput.closest('.pdf-repertorio-search-field').addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!wrapper.matches(':focus-within')) results.hidden = true;
    });
  });

  return wrapper;
}

function createSearchResult(repertorio) {
  const id = getField(repertorio, ['id']);
  const title = getField(repertorio, ['nome', 'titulo', 'name']);
  const total = Array.isArray(repertorio.repertorio_musicas) ? repertorio.repertorio_musicas.length : 0;
  const label = `Gerar HTML (${total})`;

  return `
    <article class="pdf-search-result-card">
      <button
        class="pdf-search-result-title"
        type="button"
        data-action="generate-html"
        data-id="${escapeHtml(id)}"
        data-original-label="${escapeHtml(label)}"
        aria-label="Gerar HTML interativo de ${escapeHtml(title)}"
      >${escapeHtml(title)}</button>
      <p class="list-summary">${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))} - ${total} musica${total === 1 ? '' : 's'}</p>
    </article>
  `;
}

async function generateInteractiveHtml(repertorioId) {
  const [{ data: repertorio, error: repertorioError }, { data: musicasAssociadas, error: musicasError }] = await Promise.all([
    getRepertorioById(repertorioId),
    listMusicasDoRepertorio(repertorioId),
  ]);

  if (repertorioError) throw repertorioError;
  if (musicasError) throw musicasError;

  const html = createInteractiveHtml({
    repertorio,
    musicasAssociadas: normalizeOrder(musicasAssociadas || []),
  });
  const filename = `repert-interativo-${slugifyFilename(getField(repertorio, ['nome', 'titulo', 'name']))}.html`;
  downloadTextFile(filename, html, 'text/html;charset=utf-8');
}

function createInteractiveHtml({ repertorio, musicasAssociadas }) {
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));
  const generatedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(nome)} - Repert Interativo</title>
  <style>
    :root { color-scheme: light; --ink: #17211f; --muted: #5a6763; --line: #d9e2de; --accent: #0f766e; --paper: #fbfdfc; --soft: #eef5f2; --chord: #b45309; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; color: var(--ink); background: var(--paper); font-family: Arial, Helvetica, sans-serif; }
    .topbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--line); background: rgba(251, 253, 252, .94); backdrop-filter: blur(10px); }
    .topbar strong { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .topbar a, button { border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--ink); min-height: 36px; padding: 0 12px; font: inherit; text-decoration: none; cursor: pointer; }
    .topbar a { display: inline-flex; align-items: center; }
    main { max-width: 980px; margin: 0 auto; padding: 28px 16px 80px; }
    h1 { margin: 0; font-size: 32px; line-height: 1.1; }
    .meta { color: var(--muted); }
    .summary { padding: 34px 0; border-bottom: 1px solid var(--line); }
    .summary h2 { margin: 0 0 16px; font-size: 26px; }
    .summary ol { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    .summary a { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--line); color: var(--ink); text-decoration: none; }
    .summary small { color: var(--muted); text-align: right; }
    .song { min-height: 100vh; padding: 34px 0 72px; border-bottom: 1px solid var(--line); }
    .song header { display: grid; gap: 12px; margin-bottom: 24px; }
    .song-number { color: var(--accent); font-weight: 700; }
    .song h2 { margin: 0; font-size: clamp(26px, 5vw, 46px); line-height: 1.05; }
    .song-meta { color: var(--muted); display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    pre { margin: 0; padding: 18px; overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; background: #fff; font: 21px/1.45 "Courier New", monospace; white-space: pre; }
    .chord-line { color: var(--chord); font-weight: 700; }
    .notice { padding: 14px; background: var(--soft); border: 1px solid var(--line); border-radius: 8px; color: var(--muted); }
    @media (max-width: 640px) { main { padding-inline: 12px; } pre { font-size: 17px; padding: 12px; } .topbar { align-items: stretch; } .topbar strong { max-width: 45vw; } }
    @media print { .topbar { display: none; } .song { min-height: auto; page-break-after: always; } pre { white-space: pre-wrap; } }
  </style>
</head>
<body>
  <nav class="topbar">
    <strong>${escapeHtml(nome)}</strong>
    <span>
      <a href="#indice">Indice</a>
      <button type="button" onclick="window.print()">Imprimir</button>
    </span>
  </nav>
  <main>
    <section class="summary" id="indice">
      <h1>Indice</h1>
      <p class="meta">${escapeHtml(data !== '-' ? data : 'Sequencia musical')} - ${musicasAssociadas.length} musica${musicasAssociadas.length === 1 ? '' : 's'} - Gerado em ${escapeHtml(generatedAt)}</p>
      <ol>
        ${musicasAssociadas.map((item, index) => createSummaryItem(item, index + 1)).join('')}
      </ol>
    </section>
    ${musicasAssociadas.length
      ? musicasAssociadas.map((item, index) => createSongSection(item, index + 1)).join('')
      : '<p class="notice">Nenhuma musica adicionada a este repertorio.</p>'}
  </main>
</body>
</html>`;
}

function createSummaryItem(item, number) {
  const momento = getSongMoment(item);
  return `
    <li>
      <a href="#musica-${number}">
        <span>${number}. ${escapeHtml(getSongTitle(item))}</span>
        ${momento ? `<small>${escapeHtml(momento)}</small>` : ''}
      </a>
    </li>
  `;
}

function createSongSection(item, number) {
  const deleted = isMusicaExcluida(item);
  const musica = item.musicas || {};
  const cifraOriginal = deleted ? '' : getCifraParaTransposicao(musica);
  const momento = getSongMoment(item);

  return `
    <section class="song${deleted ? ' deleted-repertorio-song' : ''}" id="musica-${number}">
      <header>
        <span class="song-number">${number}</span>
        <div>
          <h2>${escapeHtml(deleted ? `${getSongTitle(item)} (excluida)` : getSongTitle(item))}</h2>
          <p class="song-meta">
            <span>${escapeHtml(getSongArtist(item))}</span>
            ${momento ? `<span>${escapeHtml(momento)}</span>` : ''}
            <a href="#indice">Voltar ao indice</a>
          </p>
        </div>
      </header>
      ${deleted
        ? '<p class="notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
        : `<pre class="chordpro-view">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>`}
    </section>
  `;
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function getSongTitle(item) {
  return isMusicaExcluida(item)
    ? getField(item, ['musica_titulo'])
    : getField(item.musicas || {}, ['titulo', 'nome', 'title']);
}

function getSongArtist(item) {
  return isMusicaExcluida(item)
    ? getField(item, ['musica_artista'])
    : getField(item.musicas || {}, ['artista', 'autor', 'artist']);
}

function getSongMoment(item) {
  const momento = getField(item, ['observacao']);
  return momento !== '-' ? momento : '';
}

function isMusicaExcluida(item) {
  return Boolean(item?.musica_excluida_em || !item?.musica_id || !item?.musicas);
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function matchesSearch(repertorio, query) {
  if (!query) return true;
  return normalizeText([
    getField(repertorio, ['nome', 'titulo', 'name']),
    formatDate(getField(repertorio, ['data', 'date'])),
  ].join(' ')).includes(query);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function slugifyFilename(value) {
  const slug = String(value || 'repertorio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'repertorio';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
