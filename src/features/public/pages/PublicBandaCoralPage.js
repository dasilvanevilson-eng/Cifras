import { createPerformanceView as createMusicaPerformanceView } from '../../musicas/pages/MusicaExecucaoPage.js';
import { createPerformanceViewV2 as createRepertorioPerformanceView } from '../../repertorios/pages/RepertorioExecucaoPage.js';
import {
  claimPublicBandaCoralLeader,
  getPublicBandaCoralPresence,
  getPublicBandaCoralData,
  getPublicBandaCoralState,
  heartbeatPublicBandaCoralLeader,
  releasePublicBandaCoralLeader,
  updatePublicBandaCoralState,
} from '../../../services/publicInvitesService.js';

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
      initialState: data.state || {},
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

function createPublicBandaView({ token, invite, initialState, musicas, repertorios, repertorioMusicas }) {
  const wrapper = document.createElement('section');
  const returnTo = `/publico/banda-coral?token=${encodeURIComponent(token)}`;
  const allowedMode = invite.access_mode || 'ambos';
  const musicasRepertorio = getUniqueRepertorioMusicas(repertorioMusicas);
  const clientId = getPublicBandaClientId();
  let currentMode = 'integrante';
  let memberFollowingLeader = currentMode === 'integrante';
  let memberMirrorTimer = null;
  let leaderHeartbeatTimer = null;
  let leaderPresenceTimer = null;
  let lastMirroredStateKey = '';
  let leaderPresence = { active: false, client_id: null };

  wrapper.className = 'public-banda-shell';
  wrapper.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>${escapeHtml(invite.title || 'Modo Banda/Coral')}</h1>
        <p>Acesso publico temporario para busca e execucao.</p>
      </div>
      <div class="banda-mode-switch public-banda-mode-switch">
        <button class="nav-button" type="button" data-mode="lider">Lider</button>
        <button class="nav-button" type="button" data-mode="integrante">Integrante</button>
      </div>
    </header>
    <section class="public-banda-statusbar" data-role="session-status">
      <div>
        <span class="public-banda-mode-pill" data-role="current-mode-label">Integrante</span>
        <strong data-role="session-status-text">Aguardando Lider</strong>
      </div>
      <div class="public-banda-status-actions">
        <button class="nav-button" type="button" data-action="toggle-member-follow">Desconectar do lider</button>
        <button class="nav-button" type="button" data-action="release-leader">Desconectar lider</button>
      </div>
    </section>
    <section class="public-banda-grid">
      <section class="dashboard-search-column" data-public-banda-column="repertorios">
        <div class="public-banda-search-action">
          <label class="dashboard-search">
            Buscar repertorio
            <input data-action="search-repertorio" type="search" placeholder="Nome ou data">
          </label>
          <button class="nav-button public-banda-play-button" type="button" data-action="execute-selected-repertorio" aria-label="Executar repertorio" title="Executar repertorio" disabled>&#9654;</button>
        </div>
        <div class="public-banda-cascade-results" data-role="repertorios-results" hidden></div>
      </section>
      <section class="dashboard-search-column" data-public-banda-column="musicas">
        <label class="dashboard-search">
          Buscar musica repertorio
          <input data-action="search-musica-repertorio" type="search" placeholder="Titulo ou artista">
        </label>
        <div class="public-banda-cascade-results" data-role="musicas-repertorio-results" hidden></div>
      </section>
      <section class="dashboard-search-column" data-public-banda-column="acervo">
        <label class="dashboard-search">
          Buscar musica acervo
          <input data-action="search-musica-acervo" type="search" placeholder="Titulo ou artista">
        </label>
        <div class="public-banda-cascade-results" data-role="musicas-acervo-results" hidden></div>
      </section>
    </section>
    <section class="public-banda-execution" data-role="execution-slot" hidden>
      <div data-role="execution-content"></div>
    </section>
  `;

  const modeButtons = wrapper.querySelectorAll('[data-mode]');
  const repertorioMusicSearch = wrapper.querySelector('[data-action="search-musica-repertorio"]');
  const acervoMusicSearch = wrapper.querySelector('[data-action="search-musica-acervo"]');
  const repertorioSearch = wrapper.querySelector('[data-action="search-repertorio"]');
  const musicasRepertorioSlot = wrapper.querySelector('[data-role="musicas-repertorio-results"]');
  const musicasAcervoSlot = wrapper.querySelector('[data-role="musicas-acervo-results"]');
  const repertoriosSlot = wrapper.querySelector('[data-role="repertorios-results"]');
  const executionSlot = wrapper.querySelector('[data-role="execution-slot"]');
  const executionContent = wrapper.querySelector('[data-role="execution-content"]');
  const currentModeLabel = wrapper.querySelector('[data-role="current-mode-label"]');
  const sessionStatusText = wrapper.querySelector('[data-role="session-status-text"]');
  const memberFollowButton = wrapper.querySelector('[data-action="toggle-member-follow"]');
  const releaseLeaderButton = wrapper.querySelector('[data-action="release-leader"]');
  const executeSelectedRepertorioButton = wrapper.querySelector('[data-action="execute-selected-repertorio"]');
  let activeCascade = null;
  let currentExecutionState = null;
  let publicAutoscrollTimer = null;
  let selectedRepertorio = null;

  async function setMode(mode, options = {}) {
    if (mode === 'lider' && !options.skipClaim) {
      const claimed = await claimLeaderRole();
      if (!claimed) {
        if (leaderPresence.active && leaderPresence.client_id !== clientId) {
          window.alert('Ja existe um lider conectado neste convite.');
        }
        mode = 'integrante';
      }
    }

    const wasMemberMode = currentMode === 'integrante';
    const wasLeaderMode = currentMode === 'lider';
    if (wasLeaderMode && mode !== 'lider' && !options.skipRelease) {
      await releaseLeaderRole();
    }

    currentMode = mode;
    if (mode === 'integrante' && !wasMemberMode) {
      memberFollowingLeader = options.followLeader ?? true;
    }
    if (mode !== 'integrante') {
      memberFollowingLeader = false;
    }
    modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mode === mode);
    });
    wrapper.classList.toggle('is-member-mode', mode === 'integrante');
    wrapper.classList.toggle('is-leader-mode', mode === 'lider');
    updateMemberMirrorUi();
    updateLeaderPresenceUi();
    refreshExecutionControlsForMode();
    stopMemberMirror();
    stopLeaderHeartbeat();

    if (mode === 'integrante' && memberFollowingLeader) {
      startMemberMirror();
    }

    if (mode === 'lider') {
      startLeaderHeartbeat();
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  memberFollowButton.addEventListener('click', () => {
    if (currentMode !== 'integrante') return;

    const willDisconnectFromLeader = memberFollowingLeader;
    memberFollowingLeader = !memberFollowingLeader;
    lastMirroredStateKey = '';
    stopMemberMirror();

    if (willDisconnectFromLeader) {
      closeExecutionLayer();
    }

    updateMemberMirrorUi();

    if (memberFollowingLeader) {
      startMemberMirror();
    }
  });

  releaseLeaderButton.addEventListener('click', async () => {
    await releaseLeaderRole();
    await refreshLeaderPresence();
    await setMode('integrante', { skipClaim: true, skipRelease: true, followLeader: false });
  });

  async function executeMusica(musica, options = {}) {
    if (activeCascade) hideCascade(activeCascade);
    stopPublicAutoscroll();
    executionContent.replaceChildren(createMusicaPerformanceView({ musica, returnTo }));
    refreshExecutionControlsForMode();
    openExecutionLayer();
    currentExecutionState = normalizeState({
      itemType: 'musica',
      musicaId: musica.id,
      transposeSemitones: options.state?.transpose_semitones || 0,
      capo: options.state?.capo ?? getCurrentCapo(),
    });
    applyPerformanceState(currentExecutionState);

    if (!options.mirrored && currentMode === 'lider') {
      await publishLeaderState(currentExecutionState);
    }
  }

  async function executeRepertorio(repertorio, options = {}) {
    if (activeCascade) hideCascade(activeCascade);
    stopPublicAutoscroll();
    const musicasAssociadas = repertorioMusicas.filter((item) => item.repertorio_id === repertorio.id);
    executionContent.replaceChildren(createRepertorioPerformanceView({
      repertorio,
      musicasAssociadas,
      returnTo,
      initialRepertorioMusicaId: options.state?.repertorio_musica_id || options.repertorioMusicaId,
      initialMusicaId: options.state?.musica_id,
      initialSongIndex: Number.isInteger(options.state?.current_song_index)
        ? options.state.current_song_index
        : options.currentSongIndex,
      onSongChange: handleRepertorioSongChange,
    }));
    refreshExecutionControlsForMode();
    openExecutionLayer();
    currentExecutionState = normalizeState({
      itemType: 'repertorio',
      repertorioId: repertorio.id,
      repertorioMusicaId: options.state?.repertorio_musica_id
        || options.repertorioMusicaId
        || musicasAssociadas[0]?.id
        || null,
      currentSongIndex: Number.isInteger(options.state?.current_song_index)
        ? options.state.current_song_index
        : Number(options.currentSongIndex || 0),
      transposeSemitones: options.state?.transpose_semitones || 0,
      capo: options.state?.capo ?? getCurrentCapo(),
    });
    applyPerformanceState(currentExecutionState);

    if (!options.mirrored && currentMode === 'lider') {
      await publishLeaderState(currentExecutionState);
    }
  }

  async function handleRepertorioSongChange(songState) {
    if (currentMode !== 'lider' || !currentExecutionState || currentExecutionState.itemType !== 'repertorio') {
      return;
    }

    currentExecutionState = normalizeState({
      ...currentExecutionState,
      musicaId: songState.musicaId,
      repertorioMusicaId: songState.repertorioMusicaId,
      currentSongIndex: songState.currentSongIndex,
      transposeSemitones: songState.transposeSemitones,
      capo: songState.capo,
    });
    await publishLeaderState(currentExecutionState);
  }

  function openExecutionLayer() {
    executionSlot.hidden = false;
    document.body.classList.add('has-banda-stage-open');
  }

  function closeExecutionLayer() {
    stopPublicAutoscroll();
    executionSlot.hidden = true;
    executionContent.replaceChildren();
    currentExecutionState = null;
    document.body.classList.remove('has-banda-stage-open');
  }

  function stopPublicAutoscroll() {
    if (!publicAutoscrollTimer) return;

    window.clearInterval(publicAutoscrollTimer);
    publicAutoscrollTimer = null;
    executionContent
      .querySelectorAll('[data-action="autoscroll"]')
      .forEach((button) => {
        button.innerHTML = '&#9654;';
      });
  }

  function togglePublicAutoscroll(button) {
    if (publicAutoscrollTimer) {
      stopPublicAutoscroll();
      return;
    }

    button.textContent = '||';
    publicAutoscrollTimer = window.setInterval(() => {
      const speedInput = executionContent.querySelector('[data-action="speed"]');
      executionSlot.scrollBy({
        top: Number(speedInput?.value || 3) * 0.7,
        behavior: 'auto',
      });
    }, 80);
  }

  function refreshExecutionControlsForMode() {
    executionContent
      .querySelectorAll('[data-action="transpose-down"], [data-action="transpose-up"]')
      .forEach((control) => {
        control.dataset.memberRestrictedConfig = 'true';
      });

    executionContent.querySelectorAll('[data-action="capo"]').forEach((control) => {
      control.dataset.memberRestrictedConfig = 'true';
      const controlWrapper = control.closest('label');
      if (controlWrapper) {
        controlWrapper.dataset.memberRestrictedConfig = 'true';
      }
    });
  }

  function updateMemberMirrorUi() {
    const isMemberMode = currentMode === 'integrante';

    wrapper.classList.toggle('is-member-following', isMemberMode && memberFollowingLeader);
    updateStatusBarUi();
  }

  executionContent.addEventListener('click', (event) => {
    if (currentMode !== 'integrante' || !memberFollowingLeader || !event.isTrusted) return;
    if (!event.target.closest('[data-member-restricted-config="true"]')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  executionContent.addEventListener('change', (event) => {
    if (currentMode !== 'integrante' || !memberFollowingLeader || !event.isTrusted) return;
    if (!event.target.closest('[data-member-restricted-config="true"]')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  executionContent.addEventListener('click', (event) => {
    const autoscrollButton = event.target.closest('[data-action="autoscroll"]');
    if (autoscrollButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      togglePublicAutoscroll(autoscrollButton);
    }
  }, true);

  executionContent.addEventListener('click', (event) => {
    const backLink = event.target.closest('.song-toolbar-back');
    if (backLink) {
      event.preventDefault();
      closeExecutionLayer();
      return;
    }

    if (currentMode !== 'lider' || !currentExecutionState) return;

    if (event.target.closest('[data-action="transpose-down"]')) {
      currentExecutionState.transposeSemitones -= 1;
      publishLeaderState(currentExecutionState);
      return;
    }

    if (event.target.closest('[data-action="transpose-up"]')) {
      currentExecutionState.transposeSemitones += 1;
      publishLeaderState(currentExecutionState);
    }
  });

  executionContent.addEventListener('change', (event) => {
    if (currentMode !== 'lider' || !currentExecutionState) return;
    if (!event.target.matches('[data-action="capo"]')) return;

    currentExecutionState.capo = Number(event.target.value || 0);
    publishLeaderState(currentExecutionState);
  });

  async function publishLeaderState(state) {
    const { data, error } = await updatePublicBandaCoralState(token, state);

    if (error || !data?.valid) {
      window.alert(error?.message || 'Nao foi possivel espelhar a execucao para os integrantes.');
    }
  }

  async function claimLeaderRole() {
    const { data, error } = await claimPublicBandaCoralLeader(token, clientId);
    if (error || !data?.valid || !data?.is_leader) {
      await refreshLeaderPresence();
      return false;
    }

    leaderPresence = data.leader || { active: true, client_id: clientId };
    updateLeaderPresenceUi();
    return true;
  }

  async function releaseLeaderRole() {
    stopLeaderHeartbeat();
    await releasePublicBandaCoralLeader(token, clientId);
    leaderPresence = { active: false, client_id: null };
    updateLeaderPresenceUi();
  }

  function startLeaderHeartbeat() {
    heartbeatLeaderRole();
    leaderHeartbeatTimer = window.setInterval(heartbeatLeaderRole, 15000);
  }

  function stopLeaderHeartbeat() {
    if (leaderHeartbeatTimer) {
      window.clearInterval(leaderHeartbeatTimer);
      leaderHeartbeatTimer = null;
    }
  }

  async function heartbeatLeaderRole() {
    const { data } = await heartbeatPublicBandaCoralLeader(token, clientId);
    if (data?.leader) {
      leaderPresence = data.leader;
      updateLeaderPresenceUi();
    }
  }

  function startMemberMirror() {
    syncMemberMirror();
    memberMirrorTimer = window.setInterval(syncMemberMirror, 1800);
  }

  async function syncMemberMirror() {
    if (!leaderPresence.active) {
      lastMirroredStateKey = '';
      closeExecutionLayer();
      return;
    }

    try {
      const { data } = await getPublicBandaCoralState(token);
      if (data?.valid) {
        mirrorLeaderState(data.state || {});
      }
    } catch {
      lastMirroredStateKey = '';
      closeExecutionLayer();
    }
  }

  function stopMemberMirror() {
    if (memberMirrorTimer) {
      window.clearInterval(memberMirrorTimer);
      memberMirrorTimer = null;
    }
  }

  async function refreshLeaderPresence() {
    const { data } = await getPublicBandaCoralPresence(token);
    if (data?.valid) {
      leaderPresence = data.leader || { active: false, client_id: null };
      updateLeaderPresenceUi();
      updateMemberMirrorUi();
    }
  }

  function startLeaderPresencePolling() {
    refreshLeaderPresence();
    leaderPresenceTimer = window.setInterval(async () => {
      await refreshLeaderPresence();
      if (currentMode === 'integrante') {
        updateLeaderPresenceUi();
      }
    }, 5000);
  }

  function updateLeaderPresenceUi() {
    const leaderButton = wrapper.querySelector('[data-mode="lider"]');
    const memberButton = wrapper.querySelector('[data-mode="integrante"]');
    const leaderIsThisClient = leaderPresence.client_id === clientId;
    const leaderAvailable = allowedMode !== 'integrante' && (!leaderPresence.active || leaderIsThisClient);
    const memberAvailable = allowedMode !== 'lider'
      || !leaderPresence.active
      || (leaderPresence.active && !leaderIsThisClient);

    if (leaderButton) {
      leaderButton.hidden = !leaderAvailable;
    }
    if (memberButton) {
      memberButton.hidden = !memberAvailable;
      memberButton.textContent = currentMode === 'lider' ? 'Desconectar Lider' : 'Integrante';
      memberButton.title = currentMode === 'lider' ? 'Desconectar Lider' : 'Entrar como integrante';
      memberButton.setAttribute('aria-label', memberButton.title);
    }
    updateStatusBarUi();
  }

  function updateStatusBarUi() {
    const isLeaderMode = currentMode === 'lider';
    const isMemberFollowing = currentMode === 'integrante' && memberFollowingLeader;

    if (currentModeLabel) {
      currentModeLabel.textContent = isLeaderMode
        ? 'Lider'
        : (isMemberFollowing ? 'Integrante conectado' : 'Integrante desconectado');
    }

    if (sessionStatusText) {
      sessionStatusText.textContent = isLeaderMode
        ? 'Voce esta como lider nesta sessao.'
        : (isMemberFollowing
          ? (leaderPresence.active ? 'Lider conectado' : 'Aguardando Lider')
          : 'Buscas e execucoes ficam apenas neste dispositivo.');
    }

    if (memberFollowButton) {
      memberFollowButton.hidden = currentMode !== 'integrante';
      memberFollowButton.textContent = memberFollowingLeader
        ? 'Desconectar do lider'
        : 'Reconectar ao lider';
    }

    if (releaseLeaderButton) {
      releaseLeaderButton.hidden = !isLeaderMode;
    }
  }

  function mirrorLeaderState(state) {
    const stateKey = getStateKey(state);
    if (!stateKey) {
      lastMirroredStateKey = '';
      closeExecutionLayer();
      return;
    }

    if (stateKey === lastMirroredStateKey) return;

    lastMirroredStateKey = stateKey;

    if (state.item_type === 'musica') {
      const musica = musicas.find((item) => item.id === state.musica_id);
      if (musica) {
        executeMusica(musica, { mirrored: true, state });
      }
      return;
    }

    if (state.item_type === 'repertorio') {
      const repertorio = repertorios.find((item) => item.id === state.repertorio_id);
      if (repertorio) {
        executeRepertorio(repertorio, { mirrored: true, state });
      }
    }
  }

  function getCurrentCapo() {
    const capoSelect = executionContent.querySelector('[data-action="capo"]');
    return Number(capoSelect?.value || 0);
  }

  function applyPerformanceState(state) {
    window.requestAnimationFrame(() => {
      const capoSelect = executionContent.querySelector('[data-action="capo"]');

      if (capoSelect && String(capoSelect.value) !== String(state.capo || 0)) {
        capoSelect.value = String(state.capo || 0);
        capoSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const semitones = Number(state.transposeSemitones || 0);
      const action = semitones > 0 ? 'transpose-up' : 'transpose-down';
      const button = executionContent.querySelector(`[data-action="${action}"]`);

      for (let index = 0; button && index < Math.abs(semitones); index += 1) {
        button.click();
      }
    });
  }

  function renderMusicasRepertorio() {
    const query = normalizeText(repertorioMusicSearch.value);
    const results = query
      ? musicasRepertorio.filter((musica) => matchesMusicaSearch(musica, query))
      : musicasRepertorio;

    musicasRepertorioSlot.replaceChildren(createResultList(results, {
      emptyText: 'Nenhuma musica encontrada.',
      getTitle: (musica) => getField(musica, ['titulo', 'nome', 'title']),
      getSubtitle: (musica) => getField(musica, ['artista', 'artist']),
      onExecute: executeMusica,
    }));
    showCascade(musicasRepertorioSlot);
  }

  function renderMusicasAcervo() {
    const query = normalizeText(acervoMusicSearch.value);
    const results = query
      ? musicas.filter((musica) => matchesMusicaSearch(musica, query))
      : musicas;

    musicasAcervoSlot.replaceChildren(createResultList(results, {
      emptyText: 'Nenhuma musica encontrada.',
      getTitle: (musica) => getField(musica, ['titulo', 'nome', 'title']),
      getSubtitle: (musica) => getField(musica, ['artista', 'artist']),
      onExecute: executeMusica,
    }));
    showCascade(musicasAcervoSlot);
  }

  function renderRepertorios() {
    const query = normalizeText(repertorioSearch.value);
    if (selectedRepertorio && query !== normalizeText(formatRepertorioSearchLabel(selectedRepertorio))) {
      setSelectedRepertorio(null);
    }

    const results = query
      ? repertorios.filter((repertorio) => normalizeText(`${getField(repertorio, ['nome', 'titulo', 'name'])} ${getField(repertorio, ['data', 'date'])}`).includes(query))
      : repertorios;

    repertoriosSlot.replaceChildren(createResultList(results, {
      emptyText: 'Nenhum repertorio liberado neste convite.',
      getTitle: (repertorio) => getField(repertorio, ['nome', 'titulo', 'name']),
      getSubtitle: (repertorio) => formatDate(getField(repertorio, ['data', 'date'])),
      onExecute: selectRepertorio,
    }));
    showCascade(repertoriosSlot);
  }

  function selectRepertorio(repertorio) {
    setSelectedRepertorio(repertorio);
    hideCascade(repertoriosSlot);
  }

  function setSelectedRepertorio(repertorio) {
    selectedRepertorio = repertorio;

    if (selectedRepertorio) {
      repertorioSearch.value = formatRepertorioSearchLabel(selectedRepertorio);
    }

    executeSelectedRepertorioButton.disabled = !selectedRepertorio;
  }

  repertorioMusicSearch.addEventListener('input', renderMusicasRepertorio);
  repertorioMusicSearch.addEventListener('focus', renderMusicasRepertorio);
  acervoMusicSearch.addEventListener('input', renderMusicasAcervo);
  acervoMusicSearch.addEventListener('focus', renderMusicasAcervo);
  repertorioSearch.addEventListener('input', renderRepertorios);
  repertorioSearch.addEventListener('focus', renderRepertorios);
  executeSelectedRepertorioButton.addEventListener('click', () => {
    if (!selectedRepertorio) return;
    executeRepertorio(selectedRepertorio);
  });

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

  startLeaderPresencePolling();
  refreshLeaderPresence().then(() => {
    const leaderIsThisClient = leaderPresence.client_id === clientId;
    const shouldResumeAsLeader = allowedMode !== 'integrante' && leaderPresence.active && leaderIsThisClient;
    setMode(shouldResumeAsLeader ? 'lider' : 'integrante', {
      skipClaim: !shouldResumeAsLeader,
      skipRelease: true,
    });
  });
  hideCascade(musicasRepertorioSlot);
  hideCascade(musicasAcervoSlot);
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

function getUniqueRepertorioMusicas(repertorioMusicas) {
  const unique = new Map();

  repertorioMusicas.forEach((item) => {
    const musica = item?.musicas;
    const id = musica?.id || item?.musica_id;
    if (!id || !musica || unique.has(id)) return;
    unique.set(id, musica);
  });

  return [...unique.values()];
}

function matchesMusicaSearch(musica, normalizedQuery) {
  return normalizeText(`${getField(musica, ['titulo', 'nome', 'title'])} ${getField(musica, ['artista', 'artist'])}`).includes(normalizedQuery);
}

function normalizeState(state) {
  return {
    itemType: state.itemType,
    musicaId: state.musicaId || null,
    repertorioId: state.repertorioId || null,
    repertorioMusicaId: state.repertorioMusicaId || null,
    currentSongIndex: Number(state.currentSongIndex || 0),
    transposeSemitones: Number(state.transposeSemitones || 0),
    capo: Number(state.capo || 0),
  };
}

function getStateKey(state) {
  if (!state?.item_type) return '';
  const toneKey = `${state.transpose_semitones || 0}:${state.capo || 0}:${state.updated_at || ''}`;
  if (state.item_type === 'musica' && state.musica_id) return `musica:${state.musica_id}:${toneKey}`;
  if (state.item_type === 'repertorio' && state.repertorio_id) {
    return `repertorio:${state.repertorio_id}:${state.repertorio_musica_id || ''}:${state.current_song_index || 0}:${toneKey}`;
  }
  return '';
}

function getPublicBandaClientId() {
  const storageKey = 'masterCifras.publicBandaClientId';
  const storedId = window.sessionStorage.getItem(storageKey);

  if (storedId) {
    return storedId;
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : createFallbackClientId();
  window.sessionStorage.setItem(storageKey, id);
  return id;
}

function createFallbackClientId() {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function formatRepertorioSearchLabel(repertorio) {
  const title = getField(repertorio, ['nome', 'titulo', 'name']);
  const date = formatDate(getField(repertorio, ['data', 'date']));

  return date && date !== '-' ? `${title} - ${date}` : title;
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
