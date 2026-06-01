import { listMusicas } from '../../../services/musicasService.js';
import { listRepertorios } from '../../../services/repertoriosService.js';

export async function DashboardPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page dashboard-page';
  page.innerHTML = '<div class="page-status">Carregando painel...</div>';

  const status = page.querySelector('.page-status');

  try {
    const [{ data: musicas, error: musicasError }, { data: repertorios, error: repertoriosError }] = await Promise.all([
      listMusicas(),
      listRepertorios(),
    ]);

    if (musicasError) throw musicasError;
    if (repertoriosError) throw repertoriosError;

    page.replaceChildren(createDashboardView({
      musicas: musicas || [],
      repertorios: repertorios || [],
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o painel.';
  }

  return page;
}

function createDashboardView({ musicas, repertorios }) {
  const wrapper = document.createElement('section');
  const proximosRepertorios = getProximosRepertorios(repertorios).slice(0, 5);
  const musicasRecentes = getMusicasRecentes(musicas).slice(0, 5);

  wrapper.innerHTML = `
    <header class="dashboard-header">
      <h1>Painel</h1>
    </header>
    <div class="dashboard-grid">
      <section>
        <h2>Repertorios</h2>
        <label class="dashboard-search">
          Buscar
          <input type="search" data-search="repertorios" placeholder="Nome ou data">
        </label>
        <div class="dashboard-list-slot" data-slot="repertorios"></div>
      </section>
      <section>
        <h2>Musicas</h2>
        <label class="dashboard-search">
          Buscar
          <input type="search" data-search="musicas" placeholder="Titulo ou artista">
        </label>
        <div class="dashboard-list-slot" data-slot="musicas"></div>
      </section>
    </div>
  `;

  setupDashboardSearch({
    input: wrapper.querySelector('[data-search="repertorios"]'),
    slot: wrapper.querySelector('[data-slot="repertorios"]'),
    items: proximosRepertorios,
    render: createRepertoriosList,
    getUrl: getRepertorioUrl,
  });
  setupDashboardSearch({
    input: wrapper.querySelector('[data-search="musicas"]'),
    slot: wrapper.querySelector('[data-slot="musicas"]'),
    items: musicasRecentes,
    render: createMusicasList,
    getUrl: getMusicaUrl,
  });

  return wrapper;
}

function setupDashboardSearch({ input, slot, items, render, getUrl }) {
  let currentItems = items;

  function update() {
    const query = normalizeText(input.value);
    currentItems = query
      ? items.filter((item) => normalizeText([
        getField(item, ['nome', 'titulo', 'name', 'title']),
        getField(item, ['artista', 'autor', 'artist']),
        getField(item, ['tags']),
        formatDate(getField(item, ['data', 'date'])),
      ].join(' ')).includes(query))
      : items;

    slot.replaceChildren(render(currentItems));
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !currentItems.length) return;

    event.preventDefault();
    window.location.href = getUrl(currentItems[0]);
  });
  update();
}

function createRepertoriosList(repertorios) {
  if (!repertorios.length) {
    return createEmptyState('Nenhum repertorio futuro encontrado.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  repertorios.forEach((repertorio) => {
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.tabIndex = 0;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</h3>
        <p>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</p>
      </div>
      <div class="dashboard-item-actions">
        <a href="${escapeHtml(getRepertorioUrl(repertorio))}">Visualizar</a>
      </div>
    `;
    item.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      window.location.href = getRepertorioUrl(repertorio);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      window.location.href = getRepertorioUrl(repertorio);
    });
    list.append(item);
  });

  return list;
}

function createMusicasList(musicas) {
  if (!musicas.length) {
    return createEmptyState('Nenhuma musica cadastrada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  musicas.forEach((musica) => {
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.tabIndex = 0;
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</h3>
        <p>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</p>
      </div>
      <div class="dashboard-item-actions">
        <a href="${escapeHtml(getMusicaUrl(musica))}">Visualizar</a>
      </div>
    `;
    item.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      window.location.href = getMusicaUrl(musica);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      window.location.href = getMusicaUrl(musica);
    });
    list.append(item);
  });

  return list;
}

function createEmptyState(text) {
  const empty = document.createElement('p');
  empty.className = 'page-status';
  empty.textContent = text;
  return empty;
}

function getRepertorioUrl(repertorio) {
  return `/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}&returnTo=/dashboard`;
}

function getMusicaUrl(musica) {
  return `/musicas/execucao?id=${encodeURIComponent(musica.id)}&returnTo=/dashboard`;
}

function getProximosRepertorios(repertorios) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return repertorios
    .filter((repertorio) => {
      const value = getField(repertorio, ['data', 'date']);
      if (!value || value === '-') return false;
      return new Date(`${value}T00:00:00`) >= today;
    })
    .sort((a, b) => compareText(getField(a, ['data', 'date']), getField(b, ['data', 'date'])));
}

function getMusicasRecentes(musicas) {
  return [...musicas].sort((a, b) => compareText(getField(b, ['created_at']), getField(a, ['created_at'])));
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
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
  const [year, month, day] = value.split('-');
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
