import { listMusicas } from '../../../services/musicasService.js';
import { listMusicasDoRepertorio, listRepertorios } from '../../../services/repertoriosService.js';
import { extractLyricsFromCifraOriginal, getCifraExibicao } from '../../../utils/chordpro.js';
import { downloadTextFile, slugifyFilename } from '../../../utils/download.js';

export async function MusicasLetrasPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Musicas Letras</h1>
    <section>
      <h2>Consultar letras</h2>
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
  wrapper.className = 'list-browser';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label>
        Buscar
        <input class="search-input" type="search" placeholder="Titulo, artista ou trecho da letra">
      </label>
      <label>
        Ordenar
        <select class="sort-select">
          <option value="titulo">Titulo</option>
          <option value="artista">Artista</option>
          <option value="recentes">Mais recentes</option>
        </select>
      </label>
    </div>
    <p class="list-summary"></p>
    <div class="table-slot"></div>
    <section class="lyrics-repertorio-panel">
      <h2>Repertorios</h2>
      <div class="list-toolbar">
        <label>
          Buscar repertorio
          <input class="repertorio-search-input" type="search" placeholder="Nome, data, musica ou artista">
        </label>
        <label>
          Ordenar
          <select class="repertorio-sort-select">
            <option value="recentes">Mais recentes</option>
            <option value="nome">Nome</option>
            <option value="data">Data</option>
          </select>
        </label>
      </div>
      <p class="repertorio-list-summary"></p>
      <div class="repertorio-table-slot"></div>
    </section>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const sortSelect = wrapper.querySelector('.sort-select');
  const summary = wrapper.querySelector('.list-summary');
  const tableSlot = wrapper.querySelector('.table-slot');
  const repertorioSearchInput = wrapper.querySelector('.repertorio-search-input');
  const repertorioSortSelect = wrapper.querySelector('.repertorio-sort-select');
  const repertorioSummary = wrapper.querySelector('.repertorio-list-summary');
  const repertorioTableSlot = wrapper.querySelector('.repertorio-table-slot');

  function renderMusicas() {
    const query = normalizeText(searchInput.value);
    const filtered = musicas
      .filter((musica) => matchesSearch(musica, query, musicRepertorioMap))
      .sort((a, b) => compareMusicas(a, b, sortSelect.value));

    summary.textContent = formatSummary(filtered.length, musicas.length);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhuma letra encontrada para esta busca.';
      tableSlot.replaceChildren(empty);
      return;
    }

    tableSlot.replaceChildren(createLetrasTable(filtered));
  }

  function renderRepertorios() {
    const query = normalizeText(repertorioSearchInput.value);
    const filtered = repertoriosComMusicas
      .filter((entry) => matchesRepertorioSearch(entry, query))
      .sort((a, b) => compareRepertorios(a.repertorio, b.repertorio, repertorioSortSelect.value));

    repertorioSummary.textContent = formatRepertorioSummary(filtered.length, repertoriosComMusicas.length);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhum repertorio encontrado para esta busca.';
      repertorioTableSlot.replaceChildren(empty);
      return;
    }

    repertorioTableSlot.replaceChildren(createRepertoriosTable(filtered));
  }

  searchInput.addEventListener('input', renderMusicas);
  sortSelect.addEventListener('change', renderMusicas);
  repertorioSearchInput.addEventListener('input', renderRepertorios);
  repertorioSortSelect.addEventListener('change', renderRepertorios);
  renderMusicas();
  renderRepertorios();

  return wrapper;
}

function createLetrasTable(musicas) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Titulo</th>
        <th>Artista</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  musicas.forEach((musica) => {
    const row = document.createElement('tr');
    const id = getField(musica, ['id']);
    const title = getField(musica, ['titulo', 'nome', 'title']);

    row.innerHTML = `
      <td><a href="/musicas-letras/detalhe?id=${encodeURIComponent(id)}">${escapeHtml(title)}</a></td>
      <td>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</td>
    `;
    body.append(row);
  });

  return table;
}

function createRepertoriosTable(repertoriosComMusicas) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Repertorio</th>
        <th>Data</th>
        <th>Musicas</th>
        <th>Acoes</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  repertoriosComMusicas.forEach((entry) => {
    const { repertorio, musicasAssociadas } = entry;
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${escapeHtml(nome)}</td>
      <td>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</td>
      <td>${musicasAssociadas.length}</td>
      <td class="table-actions">
        <button class="button-link secondary" type="button" data-action="export-txt">Gerar TXT</button>
      </td>
    `;

    row.querySelector('[data-action="export-txt"]').addEventListener('click', () => {
      downloadTextFile({
        filename: `${slugifyFilename(nome, 'repertorio-letras')}.txt`,
        content: createRepertorioLyricsText(entry),
      });
    });

    body.append(row);
  });

  return table;
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
