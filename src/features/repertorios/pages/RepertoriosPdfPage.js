import { listRepertorios } from '../../../services/repertoriosService.js';

export async function RepertoriosPdfPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>PDF Repertorio</h1>
    <section class="music-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando repertorios...</div>
      </div>
    </section>
  `;

  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  try {
    const { data, error } = await listRepertorios();

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
  wrapper.className = 'list-browser';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label>
        Buscar repertorio
        <input class="search-input" type="search" placeholder="Nome ou data">
      </label>
      <label>
        Ordenar
        <select class="sort-select">
          <option value="recentes">Mais recentes</option>
          <option value="nome">Nome</option>
          <option value="data">Data</option>
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
    const filtered = repertorios
      .filter((repertorio) => matchesSearch(repertorio, query))
      .sort((a, b) => compareRepertorios(a, b, sortSelect.value));

    summary.textContent = formatSummary(filtered.length, repertorios.length);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhum repertorio encontrado.';
      tableSlot.replaceChildren(empty);
      return;
    }

    tableSlot.replaceChildren(createRepertoriosTable(filtered));
  }

  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);
  render();

  return wrapper;
}

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
        <button class="button-link secondary" type="button" data-action="print" data-id="${escapeHtml(id)}">Imprimir/Gerar PDF</button>
      </td>
    `;

    row.querySelector('[data-action="print"]').addEventListener('click', () => {
      openPdfPage(id, false);
    });

    body.append(row);
  });

  return table;
}

function openPdfPage(repertorioId, autoPrint) {
  const order = window.confirm([
    'Deseja gerar em ordem alfabetica pelo titulo da musica?',
    '',
    'OK = ordem alfabetica',
    'Cancelar = ordem em que esta no repertorio',
  ].join('\n')) ? 'alfabetica' : 'repertorio';

  const params = new URLSearchParams({
    id: repertorioId,
    order,
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
