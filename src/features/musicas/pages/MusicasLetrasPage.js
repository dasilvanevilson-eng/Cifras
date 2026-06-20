import { listMusicas } from '../../../services/musicasService.js';
import { listMusicasDoRepertorio, listRepertorios } from '../../../services/repertoriosService.js';
import { extractLyricsFromCifraOriginal, getCifraExibicao } from '../../../utils/chordpro.js';
import { downloadTextFile, slugifyFilename } from '../../../utils/download.js';

export async function MusicasLetrasPage() {
  const page = document.createElement('section');
  page.className = 'page letras-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Textos</h1>
        <p data-page-info>Consulta e exportacao de letras por musica ou repertorio.</p>
      </div>
    </header>
    <section class="text-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando musicas...</div>
      </div>
    </section>
  `;

  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  try {
    const [{ data: musicas, error: musicasError }, { data: repertorios, error: repertoriosError }] = await Promise.all([
      listMusicas(),
      listRepertorios(),
    ]);

    if (musicasError) {
      throw musicasError;
    }

    if (repertoriosError) {
      throw repertoriosError;
    }

    if (!musicas || musicas.length === 0) {
      status.textContent = 'Nenhuma musica cadastrada ainda.';
      return page;
    }

    const repertoriosComMusicas = await loadRepertoriosComMusicas(repertorios || []);
    const musicRepertorioMap = createMusicRepertorioMap(repertoriosComMusicas);

    listSlot.replaceChildren(createLetrasBrowser({
      musicas,
      repertoriosComMusicas,
      musicRepertorioMap,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as musicas.';
  }

  return page;
}

async function loadRepertoriosComMusicas(repertorios) {
  const results = await Promise.all(repertorios.map(async (repertorio) => {
    const { data, error } = await listMusicasDoRepertorio(getField(repertorio, ['id']));

    return {
      repertorio,
      musicasAssociadas: error ? [] : data || [],
    };
  }));

  return results;
}

function createMusicRepertorioMap(repertoriosComMusicas) {
  const map = new Map();

  repertoriosComMusicas.forEach(({ repertorio, musicasAssociadas }) => {
    const repertorioNome = getField(repertorio, ['nome', 'titulo', 'name']);

    musicasAssociadas.forEach((item) => {
      const musicaId = getField(item, ['musica_id']);

      if (!musicaId || musicaId === '-') return;

      const current = map.get(musicaId) || [];
      current.push(repertorioNome);
      map.set(musicaId, current);
    });
  });

  return map;
}

function createLetrasBrowser({ musicas, repertoriosComMusicas, musicRepertorioMap }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'lyrics-search-grid';
  wrapper.innerHTML = `
    <section class="dashboard-search-column lyrics-search-column" data-lyrics-column="musicas">
      <label class="dashboard-search">
        Buscar musica
        <input class="search-input" type="search" placeholder="Titulo, artista, repertorio ou trecho da letra">
      </label>
      <label class="lyrics-sort-control">
        Ordenar
        <select class="sort-select">
          <option value="titulo">Titulo</option>
          <option value="artista">Artista</option>
          <option value="recentes">Mais recentes</option>
        </select>
      </label>
    </section>
    <section class="dashboard-search-column lyrics-search-column" data-lyrics-column="repertorios">
      <label class="dashboard-search">
        Buscar repertorio
        <input class="repertorio-search-input" type="search" placeholder="Nome, data, musica ou artista">
      </label>
      <label class="lyrics-sort-control">
        Ordenar
        <select class="repertorio-sort-select">
          <option value="recentes">Mais recentes</option>
          <option value="nome">Nome</option>
          <option value="data">Data</option>
        </select>
      </label>
    </section>
    <div class="dashboard-list-slot dashboard-cascade-results lyrics-results" data-slot="musicas" hidden></div>
    <div class="dashboard-list-slot dashboard-cascade-results lyrics-results" data-slot="repertorios" hidden></div>
    <section class="lyrics-txt-editor" data-role="txt-editor" hidden>
      <header>
        <div>
          <h2 data-role="txt-editor-title">TXT</h2>
          <p>Ajuste o texto antes de salvar o arquivo.</p>
        </div>
        <button class="nav-button" type="button" data-action="close-txt-editor">Fechar</button>
      </header>
      <textarea data-field="txt-content" spellcheck="false"></textarea>
      <div class="lyrics-txt-editor-actions">
        <button class="button-link secondary" type="button" data-action="copy-txt">Copiar</button>
        <button class="button" type="button" data-action="save-txt">Salvar TXT</button>
      </div>
      <p class="form-message" data-role="txt-editor-message" aria-live="polite"></p>
    </section>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const sortSelect = wrapper.querySelector('.sort-select');
  const tableSlot = wrapper.querySelector('[data-slot="musicas"]');
  const repertorioSearchInput = wrapper.querySelector('.repertorio-search-input');
  const repertorioSortSelect = wrapper.querySelector('.repertorio-sort-select');
  const repertorioTableSlot = wrapper.querySelector('[data-slot="repertorios"]');
  const txtEditor = setupTxtEditor(wrapper);

  function renderMusicas() {
    const query = normalizeText(searchInput.value);
    const filtered = musicas
      .filter((musica) => matchesSearch(musica, query, musicRepertorioMap))
      .sort((a, b) => compareMusicas(a, b, sortSelect.value));

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhuma letra encontrada para esta busca.';
      tableSlot.replaceChildren(empty);
      return;
    }

    tableSlot.replaceChildren(createLetrasList(filtered, filtered.length, musicas.length, txtEditor.open));
  }

  function renderRepertorios() {
    const query = normalizeText(repertorioSearchInput.value);
    const filtered = repertoriosComMusicas
      .filter((entry) => matchesRepertorioSearch(entry, query))
      .sort((a, b) => compareRepertorios(a.repertorio, b.repertorio, repertorioSortSelect.value));

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhum repertorio encontrado para esta busca.';
      repertorioTableSlot.replaceChildren(empty);
      return;
    }

    repertorioTableSlot.replaceChildren(createRepertoriosList(filtered, filtered.length, repertoriosComMusicas.length, txtEditor.open));
  }

  searchInput.addEventListener('input', renderMusicas);
  sortSelect.addEventListener('change', renderMusicas);
  repertorioSearchInput.addEventListener('input', renderRepertorios);
  repertorioSortSelect.addEventListener('change', renderRepertorios);
  setupLyricsSearch({
    input: searchInput,
    slot: tableSlot,
    wrapper,
    render: renderMusicas,
  });
  setupLyricsSearch({
    input: repertorioSearchInput,
    slot: repertorioTableSlot,
    wrapper,
    render: renderRepertorios,
  });

  return wrapper;
}

function setupLyricsSearch({ input, slot, wrapper, render }) {
  let isFocused = false;

  function closeResults() {
    isFocused = false;
    slot.hidden = true;
    clearActiveLyricsColumn(wrapper);
  }

  input.addEventListener('input', () => {
    if (isFocused) render();
  });
  input.addEventListener('focus', () => {
    isFocused = true;
    setActiveLyricsColumn(input, wrapper);
    render();
    slot.hidden = false;
  });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (slot.contains(document.activeElement)) return;
      closeResults();
    }, 140);
  });
  document.addEventListener('pointerdown', (event) => {
    if (slot.hidden || input.contains(event.target) || slot.contains(event.target)) return;

    closeResults();
  });
}

function setActiveLyricsColumn(input, wrapper) {
  const activeColumn = input.closest('.lyrics-search-column');

  wrapper.querySelectorAll('.lyrics-search-column').forEach((column) => {
    column.classList.toggle('is-active-search', column === activeColumn);
    column.classList.toggle('is-inactive-search', column !== activeColumn);
  });
}

function clearActiveLyricsColumn(wrapper) {
  wrapper.querySelectorAll('.lyrics-search-column').forEach((column) => {
    column.classList.remove('is-active-search', 'is-inactive-search');
  });
}

function setupTxtEditor(wrapper) {
  const editor = wrapper.querySelector('[data-role="txt-editor"]');
  const title = wrapper.querySelector('[data-role="txt-editor-title"]');
  const textarea = wrapper.querySelector('[data-field="txt-content"]');
  const message = wrapper.querySelector('[data-role="txt-editor-message"]');
  const closeButton = wrapper.querySelector('[data-action="close-txt-editor"]');
  const copyButton = wrapper.querySelector('[data-action="copy-txt"]');
  const saveButton = wrapper.querySelector('[data-action="save-txt"]');
  let currentFilename = 'letras.txt';

  function open({ title: nextTitle, filename, content }) {
    currentFilename = filename || 'letras.txt';
    title.textContent = `TXT - ${nextTitle || currentFilename}`;
    textarea.value = content || '';
    message.textContent = '';
    message.className = 'form-message';
    editor.hidden = false;
    window.requestAnimationFrame(() => {
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      textarea.focus();
      textarea.setSelectionRange(0, 0);
    });
  }

  function close() {
    editor.hidden = true;
    message.textContent = '';
    message.className = 'form-message';
  }

  closeButton.addEventListener('click', close);

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      message.className = 'form-message success';
      message.textContent = 'Texto copiado.';
    } catch (error) {
      textarea.select();
      message.className = 'form-message error';
      message.textContent = 'Nao foi possivel copiar automaticamente.';
    }
  });

  saveButton.addEventListener('click', () => {
    downloadTextFile({
      filename: currentFilename,
      content: textarea.value.endsWith('\n') ? textarea.value : `${textarea.value}\n`,
    });
    message.className = 'form-message success';
    message.textContent = 'Arquivo TXT gerado.';
  });

  return { open, close };
}

function createLetrasList(musicas, filteredCount, totalCount, openTxtEditor) {
  const wrapper = document.createElement('section');
  wrapper.className = 'lyrics-results-panel';
  wrapper.innerHTML = `
    <p class="list-summary">${escapeHtml(formatSummary(filteredCount, totalCount))}</p>
    <div class="dashboard-list"></div>
  `;

  const list = wrapper.querySelector('.dashboard-list');

  musicas.forEach((musica) => {
    const id = getField(musica, ['id']);
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const artist = getField(musica, ['artista', 'autor', 'artist']);
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.tabIndex = 0;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(artist)}</p>
      </div>
      <div class="dashboard-item-actions">
        <button class="button-link secondary" type="button" data-action="export-txt">Gerar TXT</button>
      </div>
    `;

    item.querySelector('[data-action="export-txt"]').addEventListener('click', () => {
      openMusicaTxtEditor();
    });

    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      openMusicaTxtEditor();
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      openMusicaTxtEditor();
    });
    list.append(item);

    function openMusicaTxtEditor() {
      openTxtEditor({
        title,
        filename: `${slugifyFilename(title, 'musica-letra')}.txt`,
        content: createMusicaLyricsText(musica),
      });
    }
  });

  return wrapper;
}

function createMusicaLyricsText(musica = {}) {
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const letra = getLyricsFromMusica(musica);
  const lines = [
    title,
    artist !== '-' ? artist : '',
    '',
    letra || 'Letra nao encontrada.',
    '',
  ];

  return `${lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n')}\n`;
}

function createRepertoriosList(repertoriosComMusicas, filteredCount, totalCount, openTxtEditor) {
  const wrapper = document.createElement('section');
  wrapper.className = 'lyrics-results-panel';
  wrapper.innerHTML = `
    <p class="list-summary">${escapeHtml(formatRepertorioSummary(filteredCount, totalCount))}</p>
    <div class="dashboard-list"></div>
  `;

  const list = wrapper.querySelector('.dashboard-list');

  repertoriosComMusicas.forEach((entry) => {
    const { repertorio, musicasAssociadas } = entry;
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';

    item.innerHTML = `
      <div>
        <h3>${escapeHtml(nome)}</h3>
        <p>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))} - ${musicasAssociadas.length} musica${musicasAssociadas.length === 1 ? '' : 's'}</p>
      </div>
      <div class="dashboard-item-actions">
        <button class="button-link secondary" type="button" data-action="export-txt">Gerar TXT</button>
      </div>
    `;

    item.querySelector('[data-action="export-txt"]').addEventListener('click', () => {
      openTxtEditor({
        title: nome,
        filename: `${slugifyFilename(nome, 'repertorio-letras')}.txt`,
        content: createRepertorioLyricsText(entry),
      });
    });

    list.append(item);
  });

  return wrapper;
}

function matchesSearch(musica, query, musicRepertorioMap) {
  if (!query) return true;

  const musicaId = getField(musica, ['id']);
  const searchableText = [
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getField(musica, ['tags']),
    (musicRepertorioMap.get(String(musicaId)) || []).join(' '),
    getLyricsFromMusica(musica),
  ].join(' ');

  return normalizeText(searchableText).includes(query);
}

function matchesRepertorioSearch(entry, query) {
  if (!query) return true;

  const { repertorio, musicasAssociadas } = entry;
  const searchableText = [
    getField(repertorio, ['nome', 'titulo', 'name']),
    formatDate(getField(repertorio, ['data', 'date'])),
    ...musicasAssociadas.flatMap((item) => [
      getField(item.musicas || {}, ['titulo', 'nome', 'title']),
      getField(item.musicas || {}, ['artista', 'autor', 'artist']),
      getField(item, ['observacao']),
    ]),
  ].join(' ');

  return normalizeText(searchableText).includes(query);
}

function compareMusicas(a, b, sortBy) {
  if (sortBy === 'recentes') {
    return compareText(getField(b, ['created_at']), getField(a, ['created_at']));
  }

  return compareText(
    getField(a, getSortFieldNames(sortBy)),
    getField(b, getSortFieldNames(sortBy)),
  );
}

function getSortFieldNames(sortBy) {
  const fields = {
    artista: ['artista', 'autor', 'artist'],
    titulo: ['titulo', 'nome', 'title'],
  };

  return fields[sortBy] || fields.titulo;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
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

function formatSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    return `${totalCount} musica${totalCount === 1 ? '' : 's'} cadastrada${totalCount === 1 ? '' : 's'}.`;
  }

  return `${filteredCount} de ${totalCount} letra${totalCount === 1 ? '' : 's'} encontrada${filteredCount === 1 ? '' : 's'}.`;
}

function formatRepertorioSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    return `${totalCount} repertorio${totalCount === 1 ? '' : 's'} cadastrado${totalCount === 1 ? '' : 's'}.`;
  }

  return `${filteredCount} de ${totalCount} repertorio${totalCount === 1 ? '' : 's'} encontrado${filteredCount === 1 ? '' : 's'}.`;
}

function createRepertorioLyricsText({ repertorio, musicasAssociadas }) {
  const repertorioNome = getField(repertorio, ['nome', 'titulo', 'name']);
  const repertorioData = formatDate(getField(repertorio, ['data', 'date']));
  const lines = [
    repertorioNome,
    repertorioData !== '-' ? `Data: ${repertorioData}` : '',
    '',
    '========================================',
    '',
  ];

  musicasAssociadas.forEach((item, index) => {
    const musica = item.musicas || {};
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const artist = getField(musica, ['artista', 'autor', 'artist']);
    const momento = getField(item, ['observacao']);
    const letra = getLyricsFromMusica(musica);

    lines.push(`${index + 1}. ${title}`);

    if (artist !== '-') {
      lines.push(artist);
    }

    if (momento !== '-') {
      lines.push(`Momento: ${momento}`);
    }

    lines.push('', letra || 'Letra nao encontrada.', '', '----------------------------------------', '');
  });

  return `${lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n')}\n`;
}

function getLyricsFromMusica(musica = {}) {
  const source = musica.cifra_chordpro || getCifraExibicao(musica);
  return extractLyricsFromCifraOriginal(source);
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
  return fieldName ? record[fieldName] : '-';
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
