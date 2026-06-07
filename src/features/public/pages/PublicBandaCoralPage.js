import { createPerformanceView as createMusicaPerformanceView } from '../../musicas/pages/MusicaExecucaoPage.js';
import { createPerformanceViewV2 as createRepertorioPerformanceView } from '../../repertorios/pages/RepertorioExecucaoPage.js';
import { getPublicBandaCoralData } from '../../../services/publicInvitesService.js';

export async function PublicBandaCoralPage() {
  const page = document.createElement('section');
  page.className = 'page public-access-page public-banda-page';
  page.innerHTML = '<div class="page-status">Carregando convite publico...</div>';

  const status = page.querySelector('.page-status');
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    status.className = 'page-status error';
    status.textContent = 'Convite nao informado.';
    return page;
  }

  try {
    const { data, error } = await getPublicBandaCoralData(token);

    if (error) throw error;

    if (!data?.valid) {
      status.className = 'page-status error';
      status.textContent = 'Este convite expirou ou nao esta mais disponivel.';
      return page;
    }

    page.replaceChildren(createPublicBandaView({
      token,
      invite: data.invite || {},
      musicas: data.musicas || [],
      repertorios: data.repertorios || [],
      repertorioMusicas: data.repertorio_musicas || [],
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o convite publico.';
  }

  return page;
}

function createPublicBandaView({ token, invite, musicas, repertorios, repertorioMusicas }) {
  const wrapper = document.createElement('section');
  const returnTo = `/publico/banda-coral?token=${encodeURIComponent(token)}`;
  const allowedMode = invite.access_mode || 'ambos';
  let currentMode = allowedMode === 'integrante' ? 'integrante' : 'lider';

  wrapper.className = 'public-banda-shell';
  wrapper.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>${escapeHtml(invite.title || 'Modo Banda/Coral')}</h1>
        <p>Acesso publico temporario para busca e execucao.</p>
      </div>
      <div class="banda-mode-switch public-banda-mode-switch">
        ${allowedMode !== 'integrante' ? '<button class="nav-button" type="button" data-mode="lider">Lider</button>' : ''}
        ${allowedMode !== 'lider' ? '<button class="nav-button" type="button" data-mode="integrante">Integrante</button>' : ''}
      </div>
    </header>
    <section class="public-banda-grid">
      <section class="dashboard-search-column" data-public-banda-column="musicas">
        <h2>Musicas</h2>
        <label class="dashboard-search">
          Buscar musica
          <input data-action="search-musica" type="search" placeholder="Titulo ou artista">
        </label>
        <div class="public-banda-cascade-results" data-role="musicas-results" hidden></div>
      </section>
      <section class="dashboard-search-column" data-public-banda-column="repertorios">
        <h2>Repertorios liberados</h2>
        <label class="dashboard-search">
          Buscar repertorio
          <input data-action="search-repertorio" type="search" placeholder="Nome ou data">
        </label>
        <div class="public-banda-cascade-results" data-role="repertorios-results" hidden></div>
      </section>
    </section>
    <section class="public-banda-execution" data-role="execution-slot">
      <p class="page-status">Selecione uma musica ou repertorio para executar como ${escapeHtml(formatMode(currentMode))}.</p>
    </section>
  `;

  const modeButtons = wrapper.querySelectorAll('[data-mode]');
  const musicSearch = wrapper.querySelector('[data-action="search-musica"]');
  const repertorioSearch = wrapper.querySelector('[data-action="search-repertorio"]');
  const musicasSlot = wrapper.querySelector('[data-role="musicas-results"]');
  const repertoriosSlot = wrapper.querySelector('[data-role="repertorios-results"]');
  const executionSlot = wrapper.querySelector('[data-role="execution-slot"]');
  let activeCascade = null;

  function setMode(mode) {
    currentMode = mode;
    modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  function executeMusica(musica) {
    hideCascade(musicasSlot);
    executionSlot.replaceChildren(createMusicaPerformanceView({ musica, returnTo }));
    executionSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function executeRepertorio(repertorio) {
    hideCascade(repertoriosSlot);
    const musicasAssociadas = repertorioMusicas.filter((item) => item.repertorio_id === repertorio.id);
    executionSlot.replaceChildren(createRepertorioPerformanceView({
      repertorio,
      musicasAssociadas,
      returnTo,
    }));
    executionSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderMusicas() {
    const query = normalizeText(musicSearch.value);
    const results = (query
      ? musicas.filter((musica) => normalizeText(`${getField(musica, ['titulo', 'nome', 'title'])} ${getField(musica, ['artista', 'artist'])}`).includes(query))
      : musicas.slice(0, 10)).slice(0, 30);

    musicasSlot.replaceChildren(createResultList(results, {
      emptyText: 'Nenhuma musica encontrada.',
      getTitle: (musica) => getField(musica, ['titulo', 'nome', 'title']),
      getSubtitle: (musica) => getField(musica, ['artista', 'artist']),
      onExecute: executeMusica,
    }));
    showCascade(musicasSlot);
  }

  function renderRepertorios() {
    const query = normalizeText(repertorioSearch.value);
    const results = query
      ? repertorios.filter((repertorio) => normalizeText(`${getField(repertorio, ['nome', 'titulo', 'name'])} ${getField(repertorio, ['data', 'date'])}`).includes(query))
      : repertorios;

    repertoriosSlot.replaceChildren(createResultList(results, {
      emptyText: 'Nenhum repertorio liberado neste convite.',
      getTitle: (repertorio) => getField(repertorio, ['nome', 'titulo', 'name']),
      getSubtitle: (repertorio) => formatDate(getField(repertorio, ['data', 'date'])),
      onExecute: executeRepertorio,
    }));
    showCascade(repertoriosSlot);
  }

  musicSearch.addEventListener('input', renderMusicas);
  musicSearch.addEventListener('focus', renderMusicas);
  repertorioSearch.addEventListener('input', renderRepertorios);
  repertorioSearch.addEventListener('focus', renderRepertorios);

  wrapper.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (wrapper.contains(document.activeElement)
        && document.activeElement?.closest('.public-banda-cascade-results')) {
        return;
      }

      if (activeCascade && !document.activeElement?.closest('.public-banda-shell')) {
        hideCascade(activeCascade);
      }
    }, 120);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!activeCascade) return;
    if (event.target.closest('.public-banda-cascade-results, .dashboard-search')) return;
    hideCascade(activeCascade);
  });

  setMode(currentMode);
  hideCascade(musicasSlot);
  hideCascade(repertoriosSlot);

  return wrapper;

  function showCascade(slot) {
    if (activeCascade && activeCascade !== slot) {
      hideCascade(activeCascade);
    }

    slot.hidden = false;
    activeCascade = slot;
  }

  function hideCascade(slot) {
    slot.hidden = true;
    if (activeCascade === slot) {
      activeCascade = null;
    }
  }
}

function createResultList(items, options) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = options.emptyText;
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list public-banda-results';

  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'dashboard-list-item public-banda-result-item';
    button.type = 'button';
    const subtitle = options.getSubtitle(item);
    button.innerHTML = `
      <div>
        <h3>${escapeHtml(options.getTitle(item) || '-')}</h3>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
      </div>
    `;
    button.addEventListener('click', () => options.onExecute(item));
    list.append(button);
  });

  return list;
}

function formatMode(mode) {
  return mode === 'lider' ? 'lider' : 'integrante';
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  } catch (_error) {
    return String(value);
  }
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
  return fieldName ? String(record[fieldName]) : '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
