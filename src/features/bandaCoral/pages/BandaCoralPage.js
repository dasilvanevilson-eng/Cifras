import {
  createSessaoBanda,
  getSessaoBandaById,
  listMusicasAvulsasBanda,
  listMusicasSessaoRepertorio,
  listParticipantesSessaoBanda,
  listSessoesBanda,
  subscribeSessaoBanda,
  updateSeguirLider,
  updateSessaoBanda,
  upsertSessaoBandaParticipante,
} from '../../../services/bandaCoralService.js';
import { listRepertorios } from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';
import {
  getCifraExibicao,
  getTransposeSemitones,
  renderCifraOriginalForDisplayHtml,
  transposeCifraOriginal,
} from '../../../utils/chordpro.js';

export async function BandaCoralPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page banda-coral-page';
  page.innerHTML = '<div class="page-status">Carregando Modo Banda/Coral...</div>';

  try {
    const [
      { data: sessoes, error: sessoesError },
      { data: repertorios, error: repertoriosError },
      { data: musicasAvulsas, error: musicasError },
    ] = await Promise.all([
      listSessoesBanda(),
      listRepertorios(),
      listMusicasAvulsasBanda(),
    ]);

    if (sessoesError) throw sessoesError;
    if (repertoriosError) throw repertoriosError;
    if (musicasError) throw musicasError;

    page.replaceChildren(createBandaCoralView({
      session,
      sessoes: sessoes || [],
      repertorios: repertorios || [],
      musicasAvulsas: musicasAvulsas || [],
    }));
  } catch (error) {
    page.innerHTML = `<div class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar o Modo Banda/Coral.')}</div>`;
  }

  return page;
}

function createBandaCoralView({ session, sessoes, repertorios, musicasAvulsas }) {
  const wrapper = document.createElement('section');
  const canLead = canEditContent(session?.profile?.papel);

  wrapper.innerHTML = `
    <header class="banda-coral-header">
      <h1>Modo Banda/Coral</h1>
    </header>
    <div class="banda-mode-switch">
      <button class="nav-button" type="button" data-mode="lider"${canLead ? '' : ' disabled'}>Entrar como Lider</button>
      <button class="nav-button" type="button" data-mode="integrante">Entrar como Integrante</button>
    </div>
    ${canLead ? '' : '<p class="page-status">Seu perfil pode acompanhar como integrante. Apenas administradores e editores comandam sessoes.</p>'}
    <div class="banda-coral-slot"></div>
  `;

  const slot = wrapper.querySelector('.banda-coral-slot');
  const leaderButton = wrapper.querySelector('[data-mode="lider"]');
  const memberButton = wrapper.querySelector('[data-mode="integrante"]');

  function setMode(mode) {
    leaderButton.classList.toggle('is-active', mode === 'lider');
    memberButton.classList.toggle('is-active', mode === 'integrante');

    if (mode === 'lider') {
      slot.replaceChildren(createLeaderMode({ sessoes, repertorios, musicasAvulsas }));
      return;
    }

    slot.replaceChildren(createMemberMode({ sessoes }));
  }

  if (canLead) {
    leaderButton.addEventListener('click', () => setMode('lider'));
  }
  memberButton.addEventListener('click', () => setMode('integrante'));

  setMode(canLead ? 'lider' : 'integrante');

  return wrapper;
}

function createLeaderMode({ sessoes, repertorios, musicasAvulsas }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'banda-mode-panel';
  wrapper.innerHTML = `
    <section class="banda-create-panel">
      <h2>Sessao ao vivo</h2>
      <form class="form banda-session-form">
        <label>
          Nome da sessao
          <input name="nome" type="text" required placeholder="Ex: Ensaio de hoje">
        </label>
        <label>
          Repertorio
          <select name="repertorio_id">
            <option value="">Sem repertorio definido</option>
            ${repertorios.map((repertorio) => (
              `<option value="${escapeHtml(repertorio.id)}">${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</option>`
            )).join('')}
          </select>
        </label>
        <button class="button" type="submit">Criar sessao</button>
        <p class="form-message" aria-live="polite"></p>
      </form>
      <div class="banda-active-sessions"></div>
    </section>
    <section class="banda-live-panel">
      <p class="page-status">Crie ou abra uma sessao para comandar.</p>
    </section>
  `;

  const form = wrapper.querySelector('.banda-session-form');
  const message = form.querySelector('.form-message');
  const sessionsSlot = wrapper.querySelector('.banda-active-sessions');
  const livePanel = wrapper.querySelector('.banda-live-panel');
  let activeSessions = [...sessoes];

  function renderSessionsList() {
    sessionsSlot.replaceChildren(createSessionsList(activeSessions, {
      emptyText: 'Nenhuma sessao ativa.',
      actionLabel: 'Abrir',
      canDelete: true,
      onSelect: async (sessao) => {
        await openLeaderSession(sessao.id, repertorios, musicasAvulsas, livePanel);
      },
      onDelete: async (sessao) => {
        if (!window.confirm(`Excluir o ensaio "${sessao.nome || 'Sessao'}"?`)) return;

        const { error } = await updateSessaoBanda(sessao.id, { ativa: false });

        if (error) {
          window.alert(error.message || 'Nao foi possivel excluir o ensaio.');
          return;
        }

        activeSessions = activeSessions.filter((item) => item.id !== sessao.id);
        renderSessionsList();
        livePanel.innerHTML = '<p class="page-status">Ensaio excluido.</p>';
      },
    }));
  }

  renderSessionsList();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.className = 'form-message';
    message.textContent = 'Criando sessao...';

    const formData = new FormData(form);
    const { data, error } = await createSessaoBanda({
      nome: String(formData.get('nome') || '').trim(),
      repertorio_id: String(formData.get('repertorio_id') || '') || null,
    });

    if (error || !data) {
      message.className = 'form-message error';
      message.textContent = error?.message || 'Nao foi possivel criar a sessao.';
      return;
    }

    message.className = 'form-message success';
    message.textContent = 'Sessao criada.';
    activeSessions = [hydrateSessaoRepertorio(data, repertorios), ...activeSessions];
    renderSessionsList();
    await openLeaderSession(data.id, repertorios, musicasAvulsas, livePanel);
  });

  return wrapper;
}

function createMemberMode({ sessoes }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'banda-mode-panel';
  wrapper.innerHTML = `
    <section class="banda-create-panel">
      <h2>Sessoes ativas</h2>
      <div class="banda-active-sessions"></div>
    </section>
    <section class="banda-live-panel">
      <p class="page-status">Escolha uma sessao para acompanhar.</p>
    </section>
  `;

  const sessionsSlot = wrapper.querySelector('.banda-active-sessions');
  const livePanel = wrapper.querySelector('.banda-live-panel');

  sessionsSlot.replaceChildren(createSessionsList(sessoes, {
    emptyText: 'Nenhuma sessao ativa no momento.',
    actionLabel: 'Entrar',
    onSelect: async (sessao) => {
      await openMemberSession(sessao.id, livePanel);
    },
  }));

  return wrapper;
}

function createSessionsList(sessoes, options = {}) {
  if (!sessoes.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = options.emptyText || 'Nenhuma sessao encontrada.';
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'banda-session-list';

  sessoes.forEach((sessao) => {
    const item = document.createElement('article');
    item.className = 'banda-session-item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(sessao.nome || 'Sessao')}</strong>
        <span>${escapeHtml(sessao.repertorios?.nome || 'Sem repertorio')}</span>
      </div>
      <div class="banda-session-actions">
        <button class="nav-button" type="button" data-action="open-session">${escapeHtml(options.actionLabel || 'Abrir')}</button>
        ${options.canDelete ? '<button class="danger-button" type="button" data-action="delete-session">Excluir</button>' : ''}
      </div>
    `;
    item.querySelector('[data-action="open-session"]').addEventListener('click', () => {
      if (options.onSelect) options.onSelect(sessao);
    });
    item.querySelector('[data-action="delete-session"]')?.addEventListener('click', () => {
      if (options.onDelete) options.onDelete(sessao);
    });
    list.append(item);
  });

  return list;
}

async function openLeaderSession(sessaoId, repertorios, musicasAvulsas, slot) {
  document.body.classList.remove('has-banda-stage-open');
  slot.innerHTML = '<p class="page-status">Abrindo sessao...</p>';
  const { error: participantError } = await upsertSessaoBandaParticipante(sessaoId, 'lider');

  if (participantError) {
    slot.innerHTML = `<p class="page-status error">${escapeHtml(participantError.message || 'Nao foi possivel entrar como lider.')}</p>`;
    return;
  }

  const [{ data: sessao, error }, participantesResult] = await Promise.all([
    getSessaoBandaById(sessaoId),
    listParticipantesSessaoBanda(sessaoId),
  ]);

  if (error || !sessao) {
    slot.innerHTML = `<p class="page-status error">${escapeHtml(error?.message || 'Nao foi possivel abrir a sessao.')}</p>`;
    return;
  }

  slot.replaceChildren(await createLeaderControls({
    sessao,
    repertorios,
    musicasAvulsas,
    participantes: participantesResult.data || [],
  }));
}

async function createLeaderControls({ sessao, repertorios, musicasAvulsas, participantes }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'banda-live-card';
  const musicasResult = await listMusicasSessaoRepertorio(sessao.repertorio_id);
  const musicasAssociadas = musicasResult.data || [];

  wrapper.innerHTML = `
    <div class="banda-live-header">
      <div>
        <h2>${escapeHtml(sessao.nome || 'Sessao')}</h2>
        <p>${participantes.length} participante${participantes.length === 1 ? '' : 's'} conectado${participantes.length === 1 ? '' : 's'}</p>
      </div>
      <span class="banda-live-role">Lider</span>
    </div>
    <div class="banda-control-grid">
      <label>
        Repertorio
        <select data-field="repertorio">
          <option value="">Sem repertorio</option>
          ${repertorios.map((repertorio) => (
            `<option value="${escapeHtml(repertorio.id)}"${repertorio.id === sessao.repertorio_id ? ' selected' : ''}>${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</option>`
          )).join('')}
        </select>
      </label>
      <label>
        Musica
        <select data-field="musica">
          <option value="">Selecione</option>
          ${musicasAssociadas.map((item) => (
            `<option value="${escapeHtml(item.musica_id)}" data-tom="${escapeHtml(getAssocTom(item))}"${item.musica_id === sessao.musica_atual_id ? ' selected' : ''}>${escapeHtml(getField(item.musicas || {}, ['titulo', 'nome', 'title']))}</option>`
          )).join('')}
        </select>
      </label>
      <label>
        Tom
        <input data-field="tom" type="text" value="${escapeHtml(sessao.tom_atual || '')}" placeholder="Tom atual">
      </label>
    </div>
    <div class="banda-standalone-search">
      <label>
        Buscar musica avulsa
        <input data-field="musica-avulsa-search" type="search" placeholder="Digite o titulo ou artista">
      </label>
      <div class="banda-standalone-results" aria-live="polite"></div>
    </div>
    <p class="form-message" aria-live="polite"></p>
    <div class="banda-stage-layer" hidden>
      <div class="banda-stage-actions">
        <button class="nav-button" type="button" data-action="close-stage">Sair da execucao</button>
      </div>
      <div class="banda-song-slot"></div>
    </div>
  `;

  const repertorioSelect = wrapper.querySelector('[data-field="repertorio"]');
  const musicaSelect = wrapper.querySelector('[data-field="musica"]');
  const tomInput = wrapper.querySelector('[data-field="tom"]');
  const avulsaSearch = wrapper.querySelector('[data-field="musica-avulsa-search"]');
  const avulsaResults = wrapper.querySelector('.banda-standalone-results');
  const message = wrapper.querySelector('.form-message');
  const stageLayer = wrapper.querySelector('.banda-stage-layer');
  const songSlot = wrapper.querySelector('.banda-song-slot');
  let currentItem = getCurrentSessionItem(sessao, musicasAssociadas);
  const repertorioTitle = getField(sessao.repertorios || {}, ['nome', 'titulo', 'name']) || 'Repertorio';

  async function saveSession(values) {
    message.className = 'form-message';
    message.textContent = 'Sincronizando...';
    const { data, error } = await updateSessaoBanda(sessao.id, values);

    if (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel sincronizar.';
      return null;
    }

    message.className = 'form-message success';
    message.textContent = 'Sincronizado.';
    Object.assign(sessao, data);
    return data;
  }

  repertorioSelect.addEventListener('change', async () => {
    const updated = await saveSession({
      repertorio_id: repertorioSelect.value || null,
      musica_atual_id: null,
      tom_atual: null,
    });

    if (!updated) return;

    const fresh = await createLeaderControls({
      sessao: hydrateSessaoRepertorio(updated, repertorios),
      repertorios,
      musicasAvulsas,
      participantes,
    });
    wrapper.replaceWith(fresh);
  });

  musicaSelect.addEventListener('change', async () => {
    await selectRepertorioItem(findSelectedMusica(musicasAssociadas, musicaSelect.value));
  });

  async function selectRepertorioItem(item) {
    if (!item) {
      await saveSession({
        musica_atual_id: null,
        tom_atual: null,
      });
      currentItem = null;
      musicaSelect.value = '';
      tomInput.value = '';
      renderCurrentBandaSong();
      return;
    }

    const nextTom = getAssocTom(item);
    tomInput.value = nextTom;
    musicaSelect.value = item.musica_id || '';
    await saveSession({
      musica_atual_id: item.musica_id || null,
      tom_atual: nextTom || null,
    });
    currentItem = item;
    renderCurrentBandaSong();
  }

  function renderCurrentBandaSong() {
    renderBandaSong(songSlot, currentItem, tomInput.value, {
      playlist: musicasAssociadas,
      repertorioTitle,
      onSelectItem: selectRepertorioItem,
    });
    openStageIfHasSong();
  }

  function openStageIfHasSong() {
    if (!currentItem?.musicas) return;
    stageLayer.hidden = false;
    document.body.classList.add('has-banda-stage-open');
  }

  function closeStage() {
    stageLayer.hidden = true;
    document.body.classList.remove('has-banda-stage-open');
  }

  wrapper.querySelector('[data-action="close-stage"]').addEventListener('click', closeStage);

  function renderAvulsas(query = '') {
    const term = normalizeText(query);

    if (!term) {
      avulsaResults.innerHTML = '<p class="page-status">Busque uma musica para executar fora do repertorio.</p>';
      return;
    }

    const results = musicasAvulsas
      .filter((musica) => normalizeText(`${getField(musica, ['titulo', 'nome', 'title'])} ${getField(musica, ['artista', 'artist'])}`).includes(term))
      .slice(0, 20);

    if (!results.length) {
      avulsaResults.innerHTML = '<p class="page-status">Nenhuma musica encontrada.</p>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'banda-standalone-list';

    results.forEach((musica) => {
      const button = document.createElement('button');
      button.className = 'banda-standalone-item';
      button.type = 'button';
      button.innerHTML = `
        <span>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</span>
        <small>${escapeHtml(getField(musica, ['artista', 'artist']) || 'Musica avulsa')}</small>
      `;
      button.addEventListener('click', async () => {
        const nextTom = getField(musica, ['tom', 'key']);
        tomInput.value = nextTom;
        musicaSelect.value = '';
        const updated = await saveSession({
          musica_atual_id: musica.id,
          tom_atual: nextTom || null,
        });

        if (!updated) return;

        avulsaSearch.value = '';
        avulsaResults.innerHTML = '<p class="page-status success">Musica avulsa em execucao.</p>';
        currentItem = createSongItem(musica, nextTom);
        renderBandaSong(songSlot, currentItem, nextTom, {
          repertorioTitle: 'Musica avulsa',
        });
        openStageIfHasSong();
      });
      list.append(button);
    });

    avulsaResults.replaceChildren(list);
  }

  avulsaSearch.addEventListener('input', () => renderAvulsas(avulsaSearch.value));
  avulsaSearch.addEventListener('focus', () => renderAvulsas(avulsaSearch.value));

  tomInput.addEventListener('change', async () => {
    await saveSession({
      tom_atual: tomInput.value.trim() || null,
    });
    renderCurrentBandaSong();
  });

  renderAvulsas('');
  if (currentItem?.musicas) {
    renderCurrentBandaSong();
  } else {
    songSlot.innerHTML = '<p class="page-status">Selecione uma musica para iniciar a execucao.</p>';
  }

  return wrapper;
}

function hydrateSessaoRepertorio(sessao, repertorios) {
  if (!sessao?.repertorio_id) {
    return {
      ...sessao,
      repertorios: null,
    };
  }

  return {
    ...sessao,
    repertorios: sessao.repertorios || repertorios.find((repertorio) => repertorio.id === sessao.repertorio_id) || null,
  };
}

async function openMemberSession(sessaoId, slot) {
  slot.innerHTML = '<p class="page-status">Entrando na sessao...</p>';
  const { data: participante, error: participantError } = await upsertSessaoBandaParticipante(sessaoId, 'integrante', true);

  if (participantError || !participante) {
    slot.innerHTML = `<p class="page-status error">${escapeHtml(participantError?.message || 'Nao foi possivel entrar na sessao.')}</p>`;
    return;
  }

  const { data: sessao, error } = await getSessaoBandaById(sessaoId);

  if (error || !sessao) {
    slot.innerHTML = `<p class="page-status error">${escapeHtml(error?.message || 'Nao foi possivel carregar a sessao.')}</p>`;
    return;
  }

  const unsubscribe = subscribeSessaoBanda(sessaoId, async () => {
    const followToggle = slot.querySelector('[data-action="seguir-lider"]');
    if (followToggle && !followToggle.checked) return;

    const { data: updated } = await getSessaoBandaById(sessaoId);
    if (updated) {
      await renderMemberLive(slot, updated, participante, unsubscribe);
    }
  });

  await renderMemberLive(slot, sessao, participante, unsubscribe);
}

async function renderMemberLive(slot, sessao, participante, unsubscribe = null) {
  const previousToggle = slot.querySelector('[data-action="seguir-lider"]');
  const shouldFollow = previousToggle ? previousToggle.checked : Boolean(participante.seguir_lider);
  const wrapper = document.createElement('section');
  wrapper.className = 'banda-live-card';
  wrapper.innerHTML = `
    <div class="banda-live-header">
      <div>
        <h2>${escapeHtml(sessao.nome || 'Sessao')}</h2>
        <p>${escapeHtml(sessao.repertorios?.nome || 'Sem repertorio')}</p>
      </div>
      <span class="banda-live-role">Integrante</span>
    </div>
    <label class="checkbox-label banda-follow-toggle">
      <input type="checkbox" data-action="seguir-lider"${shouldFollow ? ' checked' : ''}>
      <span>Seguir lider</span>
    </label>
    <div class="banda-song-slot"></div>
  `;

  const toggle = wrapper.querySelector('[data-action="seguir-lider"]');
  toggle.addEventListener('change', async () => {
    await updateSeguirLider(participante.id, toggle.checked);

    if (toggle.checked) {
      const { data: updated } = await getSessaoBandaById(sessao.id);
      if (updated) {
        await renderMemberLive(slot, updated, { ...participante, seguir_lider: true }, unsubscribe);
      }
    }
  });

  renderBandaSong(wrapper.querySelector('.banda-song-slot'), {
    musicas: sessao.musicas,
    musica_id: sessao.musica_atual_id,
    tom: sessao.tom_atual,
  }, sessao.tom_atual, {
    repertorioTitle: sessao.repertorios?.nome || 'Sessao',
  });

  slot.replaceChildren(wrapper);
}

function renderBandaSong(slot, item, tomAtual, options = {}) {
  const musica = item?.musicas || null;

  if (!musica) {
    slot.innerHTML = '<p class="page-status">Nenhuma musica selecionada pelo lider.</p>';
    return;
  }

  const originalKey = getField(musica, ['tom', 'key']);
  const currentKey = tomAtual || item.tom || originalKey;
  const semitones = getTransposeSemitones(originalKey, currentKey);
  const cifraOriginal = getCifraExibicao(musica);
  const cifraAtual = transposeCifraOriginal(cifraOriginal, semitones);
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const link = getField(musica, ['musica_link']);
  const playlist = options.playlist || [];
  const currentIndex = item?.musica_id
    ? playlist.findIndex((playlistItem) => playlistItem.musica_id === item.musica_id)
    : -1;
  const hasPlaylistNavigation = playlist.length > 1 && currentIndex >= 0;
  const repertorioTitle = options.repertorioTitle || 'Sessao';

  slot.innerHTML = `
    <article class="repertorio-performance-view repertorio-song-view banda-performance-view">
      <div class="performance-toolbar">
        <button class="nav-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
        <span class="transpose-status" data-role="transpose-status">Tom</span>
        <button class="nav-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
        <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior"${hasPlaylistNavigation ? '' : ' disabled'}>&lsaquo;</button>
        <span class="performance-position" data-role="song-position">${hasPlaylistNavigation ? `${currentIndex + 1}/${playlist.length}` : '1/1'}</span>
        <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica"${hasPlaylistNavigation ? '' : ' disabled'}>&rsaquo;</button>
        <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">&#9974;</button>
        <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
        <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
        <button class="nav-button" type="button" data-action="two-columns" aria-label="Visualizacao em duas colunas" title="Visualizacao em duas colunas">2 col</button>
        <button class="nav-button icon-button theme-toggle-button" type="button" data-action="theme" aria-label="Alternar tela clara e escura" title="Alternar tela clara e escura"></button>
        <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">&#9654;</button>
        <label>
          V
          <input type="range" min="1" max="8" value="3" data-action="speed">
        </label>
        <label>
          <select data-action="capo">
            ${createCapoOptions()}
          </select>
        </label>
        ${link && link !== '-' ? `<a class="button-link secondary toolbar-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Link</a>` : ''}
        <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">&#128424;</button>
      </div>
      <section class="performance-song">
        <header class="repertorio-song-title-bar">
          <span class="repertorio-current-song-title">${escapeHtml(title)}</span>
          <span class="title-separator" aria-hidden="true">/</span>
          <span class="repertorio-title-inline">${escapeHtml(repertorioTitle)}</span>
          <data class="current-key" data-original-key="${escapeHtml(currentKey || '')}" hidden>${escapeHtml(currentKey || '-')}</data>
        </header>
        <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraAtual)}">${renderCifraOriginalForDisplayHtml(cifraAtual)}</pre>
      </section>
    </article>
  `;

  setupPerformanceControls(slot.querySelector('.banda-performance-view'), {
    canNavigate: hasPlaylistNavigation,
    onPrevious: () => {
      if (!options.onSelectItem || !hasPlaylistNavigation) return;
      const previousIndex = Math.max(0, currentIndex - 1);
      options.onSelectItem(playlist[previousIndex]);
    },
    onNext: () => {
      if (!options.onSelectItem || !hasPlaylistNavigation) return;
      const nextIndex = Math.min(playlist.length - 1, currentIndex + 1);
      options.onSelectItem(playlist[nextIndex]);
    },
  });
}

function findSelectedMusica(items, musicaId) {
  return items.find((item) => item.musica_id === musicaId) || null;
}

function getCurrentSessionItem(sessao, items) {
  return findSelectedMusica(items, sessao.musica_atual_id)
    || (sessao.musicas ? createSongItem(sessao.musicas, sessao.tom_atual) : null);
}

function createSongItem(musica, tom = '') {
  return {
    musica_id: musica?.id,
    musicas: musica,
    tom,
  };
}

function setupPerformanceControls(wrapper, options = {}) {
  if (!wrapper) return;

  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
  const twoColumnsButton = wrapper.querySelector('[data-action="two-columns"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const previousSongButton = wrapper.querySelector('[data-action="previous-song"]');
  const nextSongButton = wrapper.querySelector('[data-action="next-song"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const view = wrapper.querySelector('.chordpro-view');
  let scrollTimer = null;
  let semitones = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  let fontSize = 18;
  let fitFontToMobileWidth = true;
  let twoColumns = false;
  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, theme);
  setPerformanceFontSize(wrapper, fontSize);
  renderPerformance();
  window.requestAnimationFrame(renderPerformance);

  if (previousSongButton && nextSongButton) {
    previousSongButton.addEventListener('click', () => {
      if (options.onPrevious) options.onPrevious();
    });
    nextSongButton.addEventListener('click', () => {
      if (options.onNext) options.onNext();
    });
  }

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(12, fontSize - 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderPerformance();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(30, fontSize + 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderPerformance();
  });

  twoColumnsButton.addEventListener('click', () => {
    twoColumns = !twoColumns;
    setTwoColumnView(wrapper, twoColumnsButton, twoColumns);
    renderPerformance();
  });

  speedInput.addEventListener('input', () => {
    window.localStorage.setItem('masterCifras.performanceScrollSpeed', speedInput.value);
  });

  autoscrollButton.addEventListener('click', () => {
    if (scrollTimer) {
      window.clearInterval(scrollTimer);
      scrollTimer = null;
      autoscrollButton.innerHTML = '&#9654;';
      return;
    }

    autoscrollButton.textContent = '||';
    scrollTimer = window.setInterval(() => {
      window.scrollBy({ top: Number(speedInput.value) * 0.7, behavior: 'auto' });
    }, 80);
  });

  fullscreenButton.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = document.fullscreenElement === wrapper;
    wrapper.classList.toggle('is-fullscreen', isFullscreen);
    fullscreenButton.textContent = String.fromCharCode(9974);
    fullscreenButton.title = isFullscreen ? 'Dois toques na musica para sair da tela cheia' : 'Tela cheia';
    window.requestAnimationFrame(renderPerformance);
  });

  printButton.addEventListener('click', () => {
    window.print();
  });

  transposeDownButton.addEventListener('click', () => {
    semitones -= 1;
    renderPerformance();
  });

  transposeUpButton.addEventListener('click', () => {
    semitones += 1;
    renderPerformance();
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    window.localStorage.setItem('masterCifras.performanceCapo', String(capo));
    renderPerformance();
  });

  setupSongGestureNavigation(wrapper, {
    onPrevious: () => {
      if (options.canNavigate && options.onPrevious) options.onPrevious();
    },
    onNext: () => {
      if (options.canNavigate && options.onNext) options.onNext();
    },
    onToggleFullscreen: toggleFullscreen,
  });
  window.addEventListener('resize', renderPerformance);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === wrapper) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await wrapper.requestFullscreen();
      }
    } catch (error) {
      window.alert('Nao foi possivel alternar tela cheia neste navegador.');
    }
  }

  function renderPerformance() {
    const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
    view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
    fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
    transposeStatus.textContent = formatTransposeStatus(semitones, capo);
  }
}

function setupSongGestureNavigation(wrapper, { onPrevious, onNext, onToggleFullscreen }) {
  let pointerStart = null;
  let lastTap = null;

  wrapper.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.performance-toolbar, a, button, input, select, label')) {
      pointerStart = null;
      return;
    }

    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
  });

  wrapper.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const elapsed = Date.now() - pointerStart.time;
    pointerStart = null;

    if (Math.abs(deltaY) > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) >= 56) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
      return;
    }

    if (elapsed > 450 || Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) return;

    const now = Date.now();
    const isDoubleTap = lastTap
      && now - lastTap.time <= 340
      && Math.abs(event.clientX - lastTap.x) <= 44
      && Math.abs(event.clientY - lastTap.y) <= 44;

    if (isDoubleTap) {
      lastTap = null;
      onToggleFullscreen();
      return;
    }

    lastTap = {
      x: event.clientX,
      y: event.clientY,
      time: now,
    };

    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    const leftLimit = screenWidth * 0.28;
    const rightLimit = screenWidth * 0.72;

    if (event.clientX <= leftLimit) {
      onPrevious();
    } else if (event.clientX >= rightLimit) {
      onNext();
    }
  });

  wrapper.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
}

function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.innerHTML = '<span class="theme-swatch" aria-hidden="true"></span>';
  button.setAttribute('aria-label', theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura');
  button.title = theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura';
}

function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
}

function setTwoColumnView(wrapper, button, enabled) {
  wrapper.classList.toggle('is-two-columns', enabled);
  button.classList.toggle('is-active', enabled);
  button.textContent = enabled ? '1 col' : '2 col';
  button.title = enabled ? 'Visualizacao em uma coluna' : 'Visualizacao em duas colunas';
  button.setAttribute('aria-label', button.title);
}

function fitCifraToWidth(wrapper, view, cifra, desiredFontSize, fitFontToMobileWidth) {
  if (!fitFontToMobileWidth || !window.matchMedia('(max-width: 760px)').matches) {
    wrapper.style.setProperty('--performance-font-size', `${desiredFontSize}px`);
    return;
  }

  const lines = String(cifra || '').split('\n');
  const longestLineLength = Math.max(1, ...lines.map((line) => line.length));
  const measuredWidth = view.clientWidth || wrapper.clientWidth || (window.innerWidth - 24);
  const availableWidth = Math.max(160, measuredWidth - 28);
  const fittedSize = Math.floor(availableWidth / (longestLineLength * 0.62));
  const fontSize = Math.max(10, Math.min(desiredFontSize, fittedSize || desiredFontSize));

  wrapper.style.setProperty('--performance-font-size', `${fontSize}px`);
}

function createCapoOptions() {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `Capo ${index}`}</option>`
  )).join('');
}

function formatTransposeStatus(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Tom'
    : `${semitones > 0 ? '+' : ''}${semitones} semitom${Math.abs(semitones) === 1 ? '' : 's'}`;

  return capo > 0 ? `${transposeText} | Capo ${capo}` : transposeText;
}

function getAssocTom(item) {
  return item?.tom || item?.musicas?.tom || '';
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
