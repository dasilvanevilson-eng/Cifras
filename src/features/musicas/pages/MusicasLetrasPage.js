import { listMusicas } from '../../../services/musicasService.js';
import { extractLyricsFromCifraOriginal } from '../../../utils/chordpro.js';

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
    const { data, error } = await listMusicas();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      status.textContent = 'Nenhuma musica cadastrada ainda.';
      return page;
    }

    listSlot.replaceChildren(createLetrasBrowser(data));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as musicas.';
  }

  return page;
}

function createLetrasBrowser(musicas) {
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
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const sortSelect = wrapper.querySelector('.sort-select');
  const summary = wrapper.querySelector('.list-summary');
  const tableSlot = wrapper.querySelector('.table-slot');

  function render() {
    const query = normalizeText(searchInput.value);
    const filtered = musicas
      .filter((musica) => matchesSearch(musica, query))
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

  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);
  render();

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

function matchesSearch(musica, query) {
  if (!query) return true;

  const searchableText = [
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getField(musica, ['tags']),
    extractLyricsFromCifraOriginal(getField(musica, ['cifra_original'])),
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

function formatSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    return `${totalCount} musica${totalCount === 1 ? '' : 's'} cadastrada${totalCount === 1 ? '' : 's'}.`;
  }

  return `${filteredCount} de ${totalCount} letra${totalCount === 1 ? '' : 's'} encontrada${filteredCount === 1 ? '' : 's'}.`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
