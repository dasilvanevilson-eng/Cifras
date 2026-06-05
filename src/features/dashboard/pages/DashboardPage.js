import { listMusicas } from '../../../services/musicasService.js';
import { listMusicasDoRepertorio, listRepertorios } from '../../../services/repertoriosService.js';

export async function DashboardPage() {
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
  const repertoriosOrdenados = getRepertoriosOrdenados(repertorios);
  const musicasOrdenadas = getMusicasOrdenadas(musicas);
  const musicasSelecionadas = [];

  wrapper.innerHTML = `
    <header class="dashboard-header">
      <h1>Painel</h1>
    </header>
    <div class="dashboard-grid">
      <section class="dashboard-search-column" data-dashboard-column="repertorios">
        <label class="dashboard-search">
          Buscar repertorio
          <input type="search" data-search="repertorios" placeholder="Nome ou data">
        </label>
      </section>
      <section class="dashboard-search-column" data-dashboard-column="musicas">
        <label class="dashboard-search">
          Buscar musica
          <input type="search" data-search="musicas" placeholder="Titulo ou artista">
        </label>
        <div class="dashboard-selection-slot" data-slot="musicas-selecionadas"></div>
      </section>
      <div class="dashboard-list-slot dashboard-cascade-results" data-slot="repertorios" hidden></div>
      <div class="dashboard-selected-slot" data-slot="repertorio-musicas"></div>
      <div class="dashboard-list-slot dashboard-cascade-results" data-slot="musicas" hidden></div>
    </div>
  `;

  setupDashboardSearch({
    input: wrapper.querySelector('[data-search="repertorios"]'),
    slot: wrapper.querySelector('[data-slot="repertorios"]'),
    items: repertoriosOrdenados,
    render: createRepertoriosList,
    getUrl: getRepertorioUrl,
    renderContext: {
      musicasSlot: wrapper.querySelector('[data-slot="repertorio-musicas"]'),
      wrapper,
    },
  });

  setupDashboardSearch({
    input: wrapper.querySelector('[data-search="musicas"]'),
    slot: wrapper.querySelector('[data-slot="musicas"]'),
    items: musicasOrdenadas,
    render: createMusicasList,
    getUrl: getMusicaUrl,
    renderContext: {
      wrapper,
      selectionSlot: wrapper.querySelector('[data-slot="musicas-selecionadas"]'),
      selectedMusicas: musicasSelecionadas,
    },
  });

  renderSelectedMusicasActions({
    slot: wrapper.querySelector('[data-slot="musicas-selecionadas"]'),
    selectedMusicas: musicasSelecionadas,
  });

  return wrapper;
}

function setupDashboardSearch({ input, slot, items, render, getUrl, renderContext = {} }) {
  let currentItems = items;
  let isFocused = false;

  function update() {
    const query = normalizeText(input.value);
    const filteredItems = query
      ? items.filter((item) => normalizeText([
        getField(item, ['nome', 'titulo', 'name', 'title']),
        getField(item, ['artista', 'autor', 'artist']),
        getField(item, ['tags']),
        formatDate(getField(item, ['data', 'date'])),
      ].join(' ')).includes(query))
      : items;

    currentItems = filteredItems;
    slot.replaceChildren(render(currentItems, renderContext));
    slot.hidden = false;
  }

  input.addEventListener('input', () => {
    if (isFocused) update();
  });
  input.addEventListener('focus', () => {
    isFocused = true;
    setActiveDashboardColumn(input, renderContext.wrapper);
    update();
  });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (slot.contains(document.activeElement)) return;
      isFocused = false;
      slot.hidden = true;
      clearActiveDashboardColumn(renderContext.wrapper);
    }, 140);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !currentItems.length) return;

    event.preventDefault();
    window.location.href = getUrl(currentItems[0]);
  });
}

function setActiveDashboardColumn(input, wrapper) {
  if (!wrapper) return;

  const activeColumn = input.closest('.dashboard-search-column');
  wrapper.querySelectorAll('.dashboard-search-column').forEach((column) => {
    column.classList.toggle('is-active-search', column === activeColumn);
    column.classList.toggle('is-inactive-search', column !== activeColumn);

    if (column !== activeColumn) {
      const results = column.querySelector('.dashboard-cascade-results');
      if (results) results.hidden = true;
    }
  });
}

function clearActiveDashboardColumn(wrapper) {
  if (!wrapper) return;

  wrapper.querySelectorAll('.dashboard-search-column').forEach((column) => {
    column.classList.remove('is-active-search', 'is-inactive-search');
  });
}

function createRepertoriosList(repertorios, { musicasSlot } = {}) {
  if (!repertorios.length) {
    return createEmptyState('Nenhum repertorio encontrado.');
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
        <a class="button-link secondary" href="${escapeHtml(getRepertorioUrl(repertorio))}">Executar</a>
        <button class="nav-button" type="button" data-action="show-repertorio-songs">Musicas</button>
      </div>
    `;

    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      window.location.href = getRepertorioUrl(repertorio);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      window.location.href = getRepertorioUrl(repertorio);
    });

    item.querySelector('[data-action="show-repertorio-songs"]').addEventListener('click', async () => {
      if (!musicasSlot) return;

      musicasSlot.innerHTML = '<p class="page-status">Carregando musicas do repertorio...</p>';
      const { data, error } = await listMusicasDoRepertorio(repertorio.id);

      if (error) {
        musicasSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as musicas do repertorio.')}</p>`;
        return;
      }

      musicasSlot.replaceChildren(createRepertorioMusicasList(repertorio, data || []));
    });

    list.append(item);
  });

  return list;
}

function createRepertorioMusicasList(repertorio, musicasAssociadas) {
  const wrapper = document.createElement('section');
  wrapper.className = 'dashboard-selected-panel';

  const musicasAtivas = musicasAssociadas.filter((item) => item.musica_id && item.musicas);
  const repertorioNome = getField(repertorio, ['nome', 'titulo', 'name']);

  if (!musicasAtivas.length) {
    wrapper.innerHTML = `
      <h3>${escapeHtml(repertorioNome)}</h3>
      <p class="page-status">Nenhuma musica ativa neste repertorio.</p>
    `;
    return wrapper;
  }

  wrapper.innerHTML = `
    <div class="dashboard-selected-header">
      <h3>${escapeHtml(repertorioNome)}</h3>
      <a class="button-link secondary" href="${escapeHtml(getRepertorioUrl(repertorio))}">Executar repertorio</a>
    </div>
    <div class="dashboard-mini-list"></div>
  `;

  const list = wrapper.querySelector('.dashboard-mini-list');

  musicasAtivas.forEach((item) => {
    const musica = item.musicas || {};
    const row = document.createElement('article');
    row.className = 'dashboard-mini-item';
    row.innerHTML = `
      <div>
        <h4>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</h4>
        <p>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</p>
      </div>
      <a class="button-link secondary" href="${escapeHtml(getRepertorioMusicaUrl(repertorio, item))}">Executar</a>
    `;
    list.append(row);
  });

  return wrapper;
}

function createMusicasList(musicas, context = {}) {
  if (!musicas.length) {
    return createEmptyState('Nenhuma musica cadastrada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  musicas.forEach((musica) => {
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.tabIndex = 0;
    const isSelected = isMusicaSelected(context.selectedMusicas, musica.id);
    item.classList.toggle('is-selected', isSelected);
    item.innerHTML = `
      <div>
        <h3 class="dashboard-song-title">
          <span>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</span>
          <button class="dashboard-select-song" type="button" data-action="toggle-song-selection" aria-label="${isSelected ? 'Remover musica da selecao' : 'Adicionar musica a selecao'}" title="${isSelected ? 'Remover da selecao' : 'Adicionar a selecao'}">${isSelected ? '&#10003;' : '+'}</button>
        </h3>
        <p>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</p>
      </div>
      <div class="dashboard-item-actions">
        <a class="button-link secondary" href="${escapeHtml(getMusicaUrl(musica))}">Executar</a>
      </div>
    `;
    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      window.location.href = getMusicaUrl(musica);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.target.closest('a, button')) return;
      window.location.href = getMusicaUrl(musica);
    });
    item.querySelector('[data-action="toggle-song-selection"]').addEventListener('click', () => {
      toggleMusicaSelection(context.selectedMusicas, musica);
      renderSelectedMusicasActions(context);
      item.classList.toggle('is-selected', isMusicaSelected(context.selectedMusicas, musica.id));
      const button = item.querySelector('[data-action="toggle-song-selection"]');
      const selected = isMusicaSelected(context.selectedMusicas, musica.id);
      button.innerHTML = selected ? '&#10003;' : '+';
      button.title = selected ? 'Remover da selecao' : 'Adicionar a selecao';
      button.setAttribute('aria-label', selected ? 'Remover musica da selecao' : 'Adicionar musica a selecao');
    });
    list.append(item);
  });

  return list;
}

function toggleMusicaSelection(selectedMusicas = [], musica) {
  const selectedIndex = selectedMusicas.findIndex((item) => item.id === musica.id);

  if (selectedIndex >= 0) {
    selectedMusicas.splice(selectedIndex, 1);
    return;
  }

  selectedMusicas.push(musica);
}

function isMusicaSelected(selectedMusicas = [], musicaId) {
  return selectedMusicas.some((item) => item.id === musicaId);
}

function renderSelectedMusicasActions({ slot, selectedMusicas = [] } = {}) {
  if (!slot) return;

  if (!selectedMusicas.length) {
    slot.replaceChildren();
    return;
  }

  const panel = document.createElement('section');
  panel.className = 'dashboard-selection-panel';
  panel.innerHTML = `
    <div class="dashboard-selection-header">
      <strong>${selectedMusicas.length} musica${selectedMusicas.length === 1 ? '' : 's'} selecionada${selectedMusicas.length === 1 ? '' : 's'}</strong>
      <div class="dashboard-selection-actions">
        ${selectedMusicas.length >= 2 ? '<a class="button-link" data-action="execute-selection" href="#">Execucao da selecao</a>' : ''}
        <button class="nav-button" type="button" data-action="clear-selection">Limpar selecao</button>
      </div>
    </div>
    <div class="dashboard-selected-songs"></div>
  `;

  const list = panel.querySelector('.dashboard-selected-songs');
  selectedMusicas.forEach((musica) => {
    const chip = document.createElement('span');
    chip.className = 'dashboard-selected-song';
    chip.textContent = getField(musica, ['titulo', 'nome', 'title']);
    list.append(chip);
  });

  const executeLink = panel.querySelector('[data-action="execute-selection"]');
  if (executeLink) {
    executeLink.href = getSelecaoExecucaoUrl(selectedMusicas);
  }

  panel.querySelector('[data-action="clear-selection"]').addEventListener('click', () => {
    selectedMusicas.splice(0, selectedMusicas.length);
    renderSelectedMusicasActions({ slot, selectedMusicas });
    document.querySelectorAll('[data-action="toggle-song-selection"]').forEach((button) => {
      button.innerHTML = '+';
      button.title = 'Adicionar a selecao';
      button.setAttribute('aria-label', 'Adicionar musica a selecao');
      button.closest('.dashboard-list-item')?.classList.remove('is-selected');
    });
  });

  slot.replaceChildren(panel);
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

function getSelecaoExecucaoUrl(musicas) {
  const ids = musicas.map((musica) => musica.id).filter(Boolean).join(',');
  return `/musicas/selecao-execucao?ids=${encodeURIComponent(ids)}&returnTo=/dashboard`;
}

function getRepertorioMusicaUrl(repertorio, item) {
  return `/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}&musicaId=${encodeURIComponent(item.musica_id)}&returnTo=/dashboard`;
}

function getRepertoriosOrdenados(repertorios) {
  return [...repertorios]
    .sort((a, b) => compareText(
      getField(b, ['created_at', 'criado_em', 'data', 'date']),
      getField(a, ['created_at', 'criado_em', 'data', 'date']),
    ));
}

function getMusicasOrdenadas(musicas) {
  return [...musicas].sort((a, b) => compareText(
    getField(a, ['titulo', 'nome', 'title']),
    getField(b, ['titulo', 'nome', 'title']),
  ));
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
