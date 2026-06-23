import { listRepertoriosComMusicas } from '../../../services/repertoriosService.js';

export async function RepertoriosPdfPage() {
  const page = document.createElement('section');
  page.className = 'page repertorios-pdf-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>PDF Repertorio</h1>
        <p data-page-info>Gere arquivos do repertorio com cifras ou somente letras.</p>
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

    if (error) {
      throw error;
    }

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
      <label class="pdf-repertorio-search-field">
        Buscar musica
        <input class="music-search-input" type="search" placeholder="Titulo, artista ou tags" autocomplete="off">
        <div class="pdf-search-results" data-role="musica-results" hidden></div>
      </label>
    </div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const musicSearchInput = wrapper.querySelector('.music-search-input');
  const repertorioResults = wrapper.querySelector('[data-role="repertorio-results"]');
  const musicaResults = wrapper.querySelector('[data-role="musica-results"]');

  function renderRepertorioResults() {
    const query = normalizeText(searchInput.value);
    const filtered = repertorios
      .filter((repertorio) => matchesSearch(repertorio, query))
      .sort((a, b) => compareRepertorios(a, b, 'nome'));
    renderPdfSearchResults(repertorioResults, filtered, 'Nenhum repertorio encontrado.');
  }

  function renderMusicResults() {
    const query = normalizeText(musicSearchInput.value);
    const matches = repertorios.flatMap((repertorio) => (repertorio.repertorio_musicas || [])
      .filter((item) => matchesMusicSearch({ repertorio_musicas: [item] }, query))
      .map((item) => ({ repertorio, musica: item.musicas || {} })));
    const unique = matches.filter((item, index, items) => items.findIndex((candidate) => candidate.repertorio.id === item.repertorio.id && candidate.musica.id === item.musica.id) === index);
    musicaResults.innerHTML = unique.length ? unique.slice(0, 12).map(({ repertorio, musica }) => `<article class="pdf-search-result-card"><strong>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</strong><span>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))} · ${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</span>${createPdfActions(getField(repertorio, ['id']))}</article>`).join('') : '<p class="page-status">Nenhuma musica encontrada.</p>';
    musicaResults.hidden = document.activeElement !== musicSearchInput;
    bindPdfActions(musicaResults);
  }

  searchInput.addEventListener('focus', renderRepertorioResults);
  searchInput.addEventListener('input', renderRepertorioResults);
  musicSearchInput.addEventListener('focus', renderMusicResults);
  musicSearchInput.addEventListener('input', renderMusicResults);
  document.addEventListener('pointerdown', (event) => { if (!searchInput.closest('.pdf-repertorio-search-field').contains(event.target)) repertorioResults.hidden = true; if (!musicSearchInput.closest('.pdf-repertorio-search-field').contains(event.target)) musicaResults.hidden = true; });

  return wrapper;
}

function renderPdfSearchResults(slot, repertorios, emptyText) {
  slot.innerHTML = repertorios.length ? repertorios.slice(0, 12).map((repertorio) => `<article class="pdf-search-result-card"><strong>${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</strong><span>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</span>${createPdfActions(getField(repertorio, ['id']))}</article>`).join('') : `<p class="page-status">${emptyText}</p>`;
  slot.hidden = false;
  bindPdfActions(slot);
}

function createPdfActions(id) { return `<div><button class="button-link secondary" type="button" data-action="print-cifras" data-id="${escapeHtml(id)}">Cifradas</button><button class="button-link secondary" type="button" data-action="print-letras" data-id="${escapeHtml(id)}">Letras</button></div>`; }
function bindPdfActions(container) { container.querySelectorAll('[data-action="print-cifras"]').forEach((button) => button.addEventListener('click', () => openPdfPage(button.dataset.id, false, 'cifras'))); container.querySelectorAll('[data-action="print-letras"]').forEach((button) => button.addEventListener('click', () => openPdfPage(button.dataset.id, false, 'letras'))); }

function createRepertoriosTable(repertorios) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nome</th>
        <th>Data</th>
        <th>Acoes</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  repertorios.forEach((repertorio) => {
    const id = getField(repertorio, ['id']);
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(nome)}</td>
      <td>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</td>
      <td class="table-actions">
        <button class="button-link secondary" type="button" data-action="print-cifras" data-id="${escapeHtml(id)}">Cifradas</button>
        <button class="button-link secondary" type="button" data-action="print-letras" data-id="${escapeHtml(id)}">Letras</button>
      </td>
    `;

    row.querySelector('[data-action="print-cifras"]').addEventListener('click', () => {
      openPdfPage(id, false, 'cifras');
    });

    row.querySelector('[data-action="print-letras"]').addEventListener('click', () => {
      openPdfPage(id, false, 'letras');
    });

    body.append(row);
  });

  return table;
}

function openPdfPage(repertorioId, autoPrint, contentType = 'cifras') {
  const order = window.confirm([
    'Deseja gerar em ordem alfabetica pelo titulo da musica?',
    '',
    'OK = ordem alfabetica',
    'Cancelar = ordem em que esta no repertorio',
  ].join('\n')) ? 'alfabetica' : 'repertorio';

  const params = new URLSearchParams({
    id: repertorioId,
    order,
    tipo: contentType === 'letras' ? 'letras' : 'cifras',
  });

  if (autoPrint) {
    params.set('autoPrint', '1');
  }

  window.location.href = `/repertorios-pdf/gerar?${params.toString()}`;
}

function matchesSearch(repertorio, query) {
  if (!query) return true;

  return normalizeText([
    getField(repertorio, ['nome', 'titulo', 'name']),
    formatDate(getField(repertorio, ['data', 'date'])),
  ].join(' ')).includes(query);
}

function matchesMusicSearch(repertorio, query) {
  if (!query) return true;

  return (repertorio.repertorio_musicas || []).some((item) => normalizeText([
    getField(item.musicas || {}, ['titulo', 'nome', 'title']),
    getField(item.musicas || {}, ['artista', 'autor', 'artist']),
    getField(item.musicas || {}, ['tags']),
  ].join(' ')).includes(query));
}

function compareRepertorios(a, b, sortBy) {
  if (sortBy === 'nome') {
    return compareText(getField(a, ['nome', 'titulo', 'name']), getField(b, ['nome', 'titulo', 'name']));
  }

  if (sortBy === 'data') {
    return compareText(getField(b, ['data', 'date']), getField(a, ['data', 'date']));
  }

  return compareText(getField(b, ['created_at']), getField(a, ['created_at']));
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function formatSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    return `${totalCount} repertorio${totalCount === 1 ? '' : 's'} cadastrado${totalCount === 1 ? '' : 's'}.`;
  }

  return `${filteredCount} de ${totalCount} repertorio${totalCount === 1 ? '' : 's'} encontrado${filteredCount === 1 ? '' : 's'}.`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
