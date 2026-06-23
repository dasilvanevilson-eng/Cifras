import { listRepertoriosComMusicas } from '../../../services/repertoriosService.js';
import { listMusicas } from '../../../services/musicasService.js';

const PDF_OPTIONS_STORAGE_KEY = 'pdf-repertorio-options';

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
    const [{ data, error }, { data: musicas, error: musicasError }] = await Promise.all([
      listRepertoriosComMusicas(),
      listMusicas(),
    ]);

    if (error) {
      throw error;
    }
    if (musicasError) throw musicasError;

    const repertorios = data || [];

    if (!repertorios.length) {
      status.textContent = 'Nenhum repertorio cadastrado ainda.';
      return page;
    }

    listSlot.replaceChildren(createRepertoriosBrowser(repertorios, musicas || []));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar os repertorios.';
  }

  return page;
}

function createRepertoriosBrowser(repertorios, musicas) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser pdf-repertorios-browser';
  wrapper.innerHTML = `
    <fieldset class="pdf-content-options">
      <legend>Conteudo do arquivo</legend>
      <label><input type="checkbox" data-content-option="cifras" checked> Texto cifrado</label>
      <label><input type="checkbox" data-content-option="letras"> Somente texto</label>
    </fieldset>
    <fieldset class="pdf-content-options pdf-file-options">
      <legend>Formato do arquivo</legend>
      <label><input type="checkbox" data-file-option="texto"> Gerar arquivo texto</label>
      <label><input type="checkbox" data-file-option="pdf" checked> Gerar arquivo PDF</label>
    </fieldset>
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
  const contentOptions = [...wrapper.querySelectorAll('[data-content-option]')];
  const fileOptions = [...wrapper.querySelectorAll('[data-file-option]')];
  const savedOptions = getSavedPdfOptions();
  let contentType = savedOptions.contentType;
  let fileType = savedOptions.fileType;

  contentOptions.forEach((option) => { option.checked = option.dataset.contentOption === contentType; });
  fileOptions.forEach((option) => { option.checked = option.dataset.fileOption === fileType; });

  contentOptions.forEach((option) => option.addEventListener('change', () => {
    if (!option.checked) {
      option.checked = true;
      return;
    }
    contentType = option.dataset.contentOption;
    contentOptions.forEach((otherOption) => {
      if (otherOption !== option) otherOption.checked = false;
    });
    savePdfOptions(contentType, fileType);
    if (!repertorioResults.hidden) renderRepertorioResults();
    if (!musicaResults.hidden) renderMusicResults();
  }));

  fileOptions.forEach((option) => option.addEventListener('change', () => {
    if (!option.checked) {
      option.checked = true;
      return;
    }
    fileType = option.dataset.fileOption;
    fileOptions.forEach((otherOption) => {
      if (otherOption !== option) otherOption.checked = false;
    });
    savePdfOptions(contentType, fileType);
    if (!repertorioResults.hidden) renderRepertorioResults();
    if (!musicaResults.hidden) renderMusicResults();
  }));

  function renderRepertorioResults() {
    const query = normalizeText(searchInput.value);
    const filtered = repertorios
      .filter((repertorio) => matchesSearch(repertorio, query))
      .sort((a, b) => compareRepertorios(a, b, 'nome'));
    renderPdfSearchResults(repertorioResults, filtered, 'Nenhum repertorio encontrado.', contentType, fileType);
  }

  function renderMusicResults() {
    const query = normalizeText(musicSearchInput.value);
    const matches = musicas.filter((musica) => matchesCatalogMusicSearch(musica, query)).sort((a, b) => compareText(getField(a, ['titulo', 'nome', 'title']), getField(b, ['titulo', 'nome', 'title'])));
    musicaResults.innerHTML = matches.length ? matches.map((musica) => createPdfSearchResult(getField(musica, ['id']), getField(musica, ['titulo', 'nome', 'title']), contentType, fileType, 'musica')).join('') : '<p class="page-status">Nenhuma musica encontrada no acervo.</p>';
    musicaResults.hidden = document.activeElement !== musicSearchInput;
    bindPdfActions(musicaResults);
  }

  searchInput.addEventListener('focus', renderRepertorioResults);
  searchInput.addEventListener('input', renderRepertorioResults);
  musicSearchInput.addEventListener('focus', renderMusicResults);
  musicSearchInput.addEventListener('input', renderMusicResults);
  closeResultsWhenFocusLeaves(searchInput.closest('.pdf-repertorio-search-field'), repertorioResults);
  closeResultsWhenFocusLeaves(musicSearchInput.closest('.pdf-repertorio-search-field'), musicaResults);

  return wrapper;
}

function closeResultsWhenFocusLeaves(field, results) {
  field.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!field.matches(':focus-within')) results.hidden = true;
    });
  });
}

function getSavedPdfOptions() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PDF_OPTIONS_STORAGE_KEY) || '{}');
    return {
      contentType: saved.contentType === 'letras' ? 'letras' : 'cifras',
      fileType: saved.fileType === 'texto' ? 'texto' : 'pdf',
    };
  } catch {
    return { contentType: 'cifras', fileType: 'pdf' };
  }
}

function savePdfOptions(contentType, fileType) {
  window.localStorage.setItem(PDF_OPTIONS_STORAGE_KEY, JSON.stringify({ contentType, fileType }));
}

function renderPdfSearchResults(slot, repertorios, emptyText, contentType, fileType) {
  slot.innerHTML = repertorios.length ? repertorios.map((repertorio) => createPdfSearchResult(getField(repertorio, ['id']), getField(repertorio, ['nome', 'titulo', 'name']), contentType, fileType)).join('') : `<p class="page-status">${emptyText}</p>`;
  slot.hidden = false;
  bindPdfActions(slot);
}

function createPdfSearchResult(id, title, contentType, fileType, target = 'repertorio') { return `<article class="pdf-search-result-card"><button class="pdf-search-result-title" type="button" data-action="open-pdf" data-id="${escapeHtml(id)}" data-content-type="${contentType}" data-file-type="${fileType}" data-target="${target}" aria-label="Abrir ${escapeHtml(title)}">${escapeHtml(title)}</button></article>`; }
function bindPdfActions(container) { container.querySelectorAll('[data-action="open-pdf"]').forEach((button) => button.addEventListener('click', () => openPdfPage(button.dataset.id, false, button.dataset.contentType, button.dataset.target, button.dataset.fileType))); }

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

async function openPdfPage(repertorioId, autoPrint, contentType = 'cifras', target = 'repertorio', fileType = 'pdf') {
  const order = target === 'musica' ? 'repertorio' : await chooseRepertorioOrder();
  if (!order) return;

  const params = new URLSearchParams({
    id: repertorioId,
    order,
    tipo: contentType === 'letras' ? 'letras' : 'cifras',
    formato: fileType === 'texto' ? 'texto' : 'pdf',
  });

  if (target === 'musica') {
    params.set('alvo', 'musica');
    params.set('semIndice', '1');
  }

  if (autoPrint) {
    params.set('autoPrint', '1');
  }

  window.location.href = `/repertorios-pdf/gerar?${params.toString()}`;
}

function chooseRepertorioOrder() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'pdf-order-modal';
    modal.innerHTML = `
      <div class="pdf-order-modal-backdrop" data-action="close"></div>
      <section class="pdf-order-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-order-title">
        <button class="pdf-order-modal-close" type="button" data-action="close" aria-label="Fechar">×</button>
        <p>Organizacao do arquivo</p>
        <h2 id="pdf-order-title">Como deseja ordenar as musicas?</h2>
        <div class="pdf-order-modal-actions">
          <button class="button-link secondary" type="button" data-order="repertorio">Manter ordem do repertorio</button>
          <button class="button" type="button" data-order="alfabetica">Ordenar por titulo (A–Z)</button>
        </div>
      </section>
    `;

    const close = (order = null) => {
      document.removeEventListener('keydown', onKeydown);
      modal.remove();
      resolve(order);
    };
    const onKeydown = (event) => { if (event.key === 'Escape') close(); };

    modal.addEventListener('click', (event) => {
      const button = event.target.closest('[data-order]');
      if (button) close(button.dataset.order);
      if (event.target.closest('[data-action="close"]')) close();
    });
    document.addEventListener('keydown', onKeydown);
    document.body.append(modal);
    modal.querySelector('[data-order="repertorio"]').focus();
  });
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

function matchesCatalogMusicSearch(musica, query) {
  if (!query) return true;
  return normalizeText([
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getField(musica, ['tags']),
  ].join(' ')).includes(query);
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
