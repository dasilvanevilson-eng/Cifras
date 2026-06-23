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

export function createDashboardView({
  musicas,
  repertorios,
  publicMode = false,
  publicToken = '',
  inviteTitle = '',
  listMusicasDoRepertorioFn = listMusicasDoRepertorio,
} = {}) {
  const wrapper = document.createElement('section');
  wrapper.className = `dashboard-shell${publicMode ? ' public-dashboard-shell' : ''}`;
  const repertoriosOrdenados = getRepertoriosOrdenados(repertorios);
  const musicasOrdenadas = getMusicasOrdenadas(musicas);
  const musicasSelecionadas = [];

  wrapper.innerHTML = `
    <header class="dashboard-header dashboard-hero">
      <div class="dashboard-hero-copy">
        <h1>${publicMode ? 'Painel publico' : 'Inicio'}</h1>
        <p data-page-info>${escapeHtml(publicMode ? (inviteTitle || 'Consulta temporaria de repertorios e musicas.') : 'Busque repertorios, abra cifras e continue rapidamente o que precisa tocar.')}</p>
      </div>
      <div class="dashboard-hero-ambient" aria-hidden="true"></div>
    </header>
    <section class="dashboard-workspace dashboard-home-panel">
      <div class="dashboard-panel-heading">
        <div>
          <h2>Buscar e executar</h2>
          <p data-section-info>Use os campos de busca para localizar repertorios ou cifras do acervo. Ao abrir um repertorio, voce tambem pode acessar e executar as musicas que fazem parte dele.</p>
        </div>
      </div>
      <div class="dashboard-grid">
        <section class="dashboard-search-column" data-dashboard-column="repertorios">
          <label class="dashboard-search">
            Buscar repertorio
            <input type="search" data-search="repertorios" placeholder="Nome, data ou tema">
          </label>
          <div class="dashboard-list-slot dashboard-cascade-results" data-slot="repertorios" hidden></div>
        </section>
        <section class="dashboard-search-column" data-dashboard-column="musicas">
          <label class="dashboard-search">
            Buscar musicas acervo
            <input type="search" data-search="musicas" placeholder="Titulo, artista ou tags">
          </label>
        </section>
        <div class="dashboard-list-slot dashboard-cascade-results" data-slot="musicas" hidden></div>
        <div class="dashboard-selected-slot" data-slot="repertorio-musicas"></div>
      </div>
    </section>
    ${createDashboardQuickActions(publicMode)}
    <footer class="dashboard-test-notice">
      Este sistema esta em fase de teste/implementacao e podem ocorrer instabilidades no uso.
    </footer>
  `;

  setupDashboardSearch({
    input: wrapper.querySelector('[data-search="repertorios"]'),
    slot: wrapper.querySelector('[data-slot="repertorios"]'),
    items: repertoriosOrdenados,
    render: createRepertoriosList,
    getUrl: publicMode ? (repertorio) => getPublicRepertorioUrl(repertorio, publicToken) : getRepertorioUrl,
    renderContext: {
      musicasSlot: wrapper.querySelector('[data-slot="repertorio-musicas"]'),
      wrapper,
      publicMode,
      publicToken,
      listMusicasDoRepertorioFn,
    },
  });

  const musicasSearchContext = {
    wrapper,
    searchInput: wrapper.querySelector('[data-search="musicas"]'),
    selectedMusicas: musicasSelecionadas,
    onSelectionChange: null,
    onKeepSearchOpen: null,
    publicMode,
    publicToken,
  };
  const musicasSearch = setupDashboardSearch({
    input: wrapper.querySelector('[data-search="musicas"]'),
    slot: wrapper.querySelector('[data-slot="musicas"]'),
    items: musicasOrdenadas,
    render: createMusicasList,
    getUrl: publicMode ? (musica) => getPublicMusicaUrl(musica, publicToken) : getMusicaUrl,
    renderContext: musicasSearchContext,
  });
  musicasSearchContext.onSelectionChange = musicasSearch.update;
  musicasSearchContext.onKeepSearchOpen = musicasSearch.keepResultsOpen;

  return wrapper;
}

function createDashboardQuickActions(publicMode = false) {
  if (publicMode) return '';

  const actions = [
    {
      label: 'Cifras',
      description: 'Cadastrar, buscar e revisar musicas.',
      icon: '♪',
      href: '/musicas',
      tone: 'primary',
    },
    {
      label: 'Repertorios',
      description: 'Montar listas para execucao.',
      icon: '≡',
      href: '/repertorios',
      tone: 'secondary',
    },
    {
      label: 'Banda/Coral',
      description: 'Abrir a area de palco compartilhado.',
      icon: '◉',
      href: '/banda-coral',
      tone: 'accent',
    },
    {
      label: 'Letras',
      description: 'Consultar letras sem foco em cifra.',
      icon: 'Aa',
      href: '/musicas-letras',
      tone: 'neutral',
    },
  ];

  return `
    <section class="dashboard-quick-actions" aria-label="Acoes rapidas">
      ${actions.map((action) => `
        <a class="dashboard-action-card dashboard-action-card--${action.tone}" href="${action.href}">
          <span class="dashboard-action-icon" aria-hidden="true">${action.icon}</span>
          <span class="dashboard-action-copy"><strong>${action.label}</strong><small>${action.description}</small></span>
        </a>
      `).join('')}
    </section>
  `;
}

function setupDashboardSearch({ input, slot, items, render, getUrl, renderContext = {} }) {
  let currentItems = items;
  let keepResultsOpenWithoutFocus = false;

  function closeResults() {
    slot.hidden = true;
    keepResultsOpenWithoutFocus = false;
  }

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

  function openResults() {
    keepResultsOpenWithoutFocus = false;
    setActiveDashboardColumn(input, renderContext.wrapper);
    update();
  }

  function keepResultsOpen() {
    keepResultsOpenWithoutFocus = true;
    update();
  }

  input.addEventListener('input', update);
  input.addEventListener('focus', openResults);
  input.addEventListener('search', () => {
    if (!input.value) openResults();
  });

  input.closest('.dashboard-search-column').addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!input.closest('.dashboard-search-column').matches(':focus-within') && !keepResultsOpenWithoutFocus) closeResults();
    });
  });
  document.addEventListener('focusin', (event) => {
    if (slot.hidden) return;
    const searchColumn = input.closest('.dashboard-search-column');
    if (!searchColumn.contains(event.target) && !slot.contains(event.target)) closeResults();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !currentItems.length) return;

    event.preventDefault();
    if (getUrl) {
      window.location.href = getUrl(currentItems[0]);
    }
  });

  return { update, closeResults, keepResultsOpen };
}

function setActiveDashboardColumn(input, wrapper) {
  if (!wrapper) return;

  const activeColumn = input.closest('.dashboard-search-column');
  wrapper.querySelectorAll('.dashboard-search-column').forEach((column) => {
    if (column !== activeColumn) {
      const results = column.querySelector('.dashboard-cascade-results')
        || wrapper.querySelector(`.dashboard-cascade-results[data-slot="${column.dataset.dashboardColumn}"]`);
      if (results) results.hidden = true;
    }
  });
}

function clearActiveDashboardColumn(wrapper) {
  // The cascades now keep both search fields at a stable width. This function
  // remains as a no-op for existing selection flows that call it.
}

function createRepertoriosList(repertorios, {
  musicasSlot,
  wrapper,
  publicMode = false,
  publicToken = '',
  listMusicasDoRepertorioFn = listMusicasDoRepertorio,
} = {}) {
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
        <a class="button-link secondary" href="${escapeHtml(publicMode ? getPublicRepertorioUrl(repertorio, publicToken) : getRepertorioUrl(repertorio))}">Executar</a>
        <button class="nav-button" type="button" data-action="show-repertorio-songs">Musicas</button>
      </div>
    `;

    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      window.location.href = publicMode ? getPublicRepertorioUrl(repertorio, publicToken) : getRepertorioUrl(repertorio);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      window.location.href = publicMode ? getPublicRepertorioUrl(repertorio, publicToken) : getRepertorioUrl(repertorio);
    });

    item.querySelector('[data-action="show-repertorio-songs"]').addEventListener('click', async () => {
      if (!musicasSlot) return;

      const resultsSlot = wrapper?.querySelector('[data-slot="repertorios"]');
      if (resultsSlot) {
        resultsSlot.hidden = true;
      }
      clearActiveDashboardColumn(wrapper);
      musicasSlot.innerHTML = '<p class="page-status">Carregando musicas do repertorio...</p>';
      const { data, error } = await listMusicasDoRepertorioFn(repertorio.id);

      if (error) {
        musicasSlot.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as musicas do repertorio.')}</p>`;
        return;
      }

      musicasSlot.replaceChildren(createRepertorioMusicasList(repertorio, data || [], { publicMode, publicToken }));
    });

    list.append(item);
  });

  return list;
}

function createRepertorioMusicasList(repertorio, musicasAssociadas, { publicMode = false, publicToken = '' } = {}) {
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
      <a class="button-link secondary" href="${escapeHtml(publicMode ? getPublicRepertorioUrl(repertorio, publicToken) : getRepertorioUrl(repertorio))}">Executar repertorio</a>
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
        <h4 class="dashboard-mini-song-title">
          <span>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</span>
          ${item.observacao ? `<small>${escapeHtml(item.observacao)}</small>` : ''}
        </h4>
      </div>
      <a class="button-link secondary" href="${escapeHtml(publicMode ? getPublicRepertorioMusicaUrl(repertorio, item, publicToken) : getRepertorioMusicaUrl(repertorio, item))}">Executar</a>
    `;
    list.append(row);
  });

  return wrapper;
}

function createMusicasList(musicas, context = {}) {
  const orderedMusicas = orderMusicasForDashboardSearch(musicas, context.selectedMusicas)
    .filter((musica) => musica?.id);

  if (!orderedMusicas.length) {
    return createEmptyState('Nenhuma musica cadastrada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';
  const selectedCount = (context.selectedMusicas || []).length;

  orderedMusicas.forEach((musica, index) => {
    if (!context.publicMode && selectedCount >= 2 && index === selectedCount) {
      const action = document.createElement('div');
      action.className = 'dashboard-selection-execution';
      action.innerHTML = `<a class="button" href="${escapeHtml(getSelecaoExecucaoUrl(context.selectedMusicas))}">Executar selecionadas (${selectedCount})</a>`;
      list.append(action);
    }

    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.tabIndex = 0;
    const isSelected = isMusicaSelected(context.selectedMusicas, musica.id);
    item.classList.toggle('is-selected', isSelected);
    item.innerHTML = `
      <div>
        <h3 class="dashboard-song-title">
          <span>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</span>
          ${context.publicMode ? '' : `<button class="dashboard-select-song" type="button" data-action="toggle-song-selection" aria-label="${isSelected ? 'Remover musica da selecao' : 'Adicionar musica a selecao'}" title="${isSelected ? 'Remover da selecao' : 'Adicionar a selecao'}">${isSelected ? '&#10003;' : '+'}</button>`}
        </h3>
      </div>
      <div class="dashboard-item-actions">
        <a class="button-link secondary" data-action="execute-song" href="${escapeHtml(context.publicMode ? getPublicMusicaUrl(musica, context.publicToken) : getMusicaUrl(musica))}">Executar</a>
      </div>
    `;
    item.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      window.location.href = context.publicMode ? getPublicMusicaUrl(musica, context.publicToken) : getMusicaUrl(musica);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.target.closest('a, button')) return;
      window.location.href = context.publicMode ? getPublicMusicaUrl(musica, context.publicToken) : getMusicaUrl(musica);
    });
    item.querySelector('[data-action="toggle-song-selection"]')?.addEventListener('click', () => {
      toggleMusicaSelection(context.selectedMusicas, musica);
      if (context.onSelectionChange) {
        context.onSelectionChange();
        context.onKeepSearchOpen?.();
        return;
      }

      updateSelectionButtonState(item, context.selectedMusicas, musica.id);
    });
    item.querySelector('[data-action="execute-song"]')?.addEventListener('click', (event) => {
      if ((context.selectedMusicas || []).length < 2 || !isMusicaSelected(context.selectedMusicas, musica.id)) {
        return;
      }

      event.preventDefault();
      window.location.href = getSelecaoExecucaoUrl(context.selectedMusicas);
    });
    list.append(item);
  });

  if (!context.publicMode && selectedCount >= 2 && selectedCount === orderedMusicas.length) {
    const action = document.createElement('div');
    action.className = 'dashboard-selection-execution';
    action.innerHTML = `<a class="button" href="${escapeHtml(getSelecaoExecucaoUrl(context.selectedMusicas))}">Executar selecionadas (${selectedCount})</a>`;
    list.append(action);
  }

  return list;
}

function updateSelectionButtonState(item, selectedMusicas, musicaId) {
  item.classList.toggle('is-selected', isMusicaSelected(selectedMusicas, musicaId));
  const button = item.querySelector('[data-action="toggle-song-selection"]');
  const selected = isMusicaSelected(selectedMusicas, musicaId);
  button.innerHTML = selected ? '&#10003;' : '+';
  button.title = selected ? 'Remover da selecao' : 'Adicionar a selecao';
  button.setAttribute('aria-label', selected ? 'Remover musica da selecao' : 'Adicionar musica a selecao');
}

function orderMusicasForDashboardSearch(musicas = [], selectedMusicas = []) {
  const musicasById = new Map();

  [...selectedMusicas, ...musicas].forEach((musica) => {
    if (musica?.id) {
      musicasById.set(musica.id, musica);
    }
  });

  return [...musicasById.values()].sort((a, b) => {
    const aSelected = isMusicaSelected(selectedMusicas, a.id);
    const bSelected = isMusicaSelected(selectedMusicas, b.id);

    if (aSelected !== bSelected) {
      return aSelected ? -1 : 1;
    }

    return compareText(
      getField(a, ['titulo', 'nome', 'title']),
      getField(b, ['titulo', 'nome', 'title']),
    );
  });
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
  if (!musica?.id) return '/dashboard';
  return `/musicas/execucao?id=${encodeURIComponent(musica.id)}&returnTo=/dashboard`;
}

function getSelecaoExecucaoUrl(musicas) {
  const ids = musicas.map((musica) => musica.id).filter(Boolean).join(',');
  return `/musicas/selecao-execucao?ids=${encodeURIComponent(ids)}&returnTo=/dashboard`;
}

function getRepertorioMusicaUrl(repertorio, item) {
  return `/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}&musicaId=${encodeURIComponent(item.musica_id)}&returnTo=/dashboard`;
}

function getPublicRepertorioUrl(repertorio, token) {
  return `/publico/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}&token=${encodeURIComponent(token)}`;
}

function getPublicMusicaUrl(musica, token) {
  if (!musica?.id) return token ? `/publico/dashboard?token=${encodeURIComponent(token)}` : '/dashboard';
  return `/publico/musicas/execucao?id=${encodeURIComponent(musica.id)}&token=${encodeURIComponent(token)}`;
}

function getPublicRepertorioMusicaUrl(repertorio, item, token) {
  return `/publico/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}&musicaId=${encodeURIComponent(item.musica_id)}&token=${encodeURIComponent(token)}`;
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
