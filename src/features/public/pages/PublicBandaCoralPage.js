import { createPerformanceView as createMusicaPerformanceView } from '../../musicas/pages/MusicaExecucaoPage.js';
import { createPerformanceViewV2 as createRepertorioPerformanceView } from '../../repertorios/pages/RepertorioExecucaoPage.js';
import { getCurrentUser, signInWithPassword } from '../../../services/authService.js';
import {
  claimPublicBandaCoralLeader,
  clearPublicBandaCoralState,
  getPublicBandaCoralPresence,
  getPublicBandaCoralData,
  getPublicBandaCoralState,
  releasePublicBandaCoralLeader,
  updatePublicBandaCoralState,
} from '../../../services/publicInvitesService.js';

export async function PublicBandaCoralPage({ session = {} } = {}) {
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
      currentUser: session.user || null,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o convite publico.';
  }

  return page;
}

function createPublicBandaView({ token, invite, initialState, musicas, repertorios, repertorioMusicas, currentUser }) {
  const wrapper = document.createElement('section');
  const returnTo = `/publico/banda-coral?token=${encodeURIComponent(token)}`;
  const allowedMode = invite.access_mode || 'ambos';
  const allowAcervo = invite.allow_acervo !== false;
  const musicasRepertorio = getUniqueRepertorioMusicas(repertorioMusicas);
  const clientId = getPublicBandaClientId();
  let currentMode = 'integrante';
  let memberFollowingLeader = currentMode === 'integrante';
  let memberMirrorTimer = null;
  let leaderPresenceTimer = null;
  let leaderStatusTimer = null;
  let lastMirroredStateKey = '';
  let leaderPresence = { active: false, client_id: null, user_id: null, name: '' };
  let leaderUser = currentUser || null;
  let leaderAuthenticatedForRoom = hasPublicBandaLeaderAuth(token, leaderUser);
  let hasObservedLeaderPresence = false;

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
        <button class="nav-button" type="button" data-action="toggle-member-follow" hidden>Desconectar do Lider</button>
      </div>
    </header>
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
        <div class="public-banda-search-action">
          <label class="dashboard-search">
            Buscar musica repertorio
            <input data-action="search-musica-repertorio" type="search" placeholder="Titulo ou artista">
          </label>
          <button class="nav-button public-banda-play-button" type="button" data-action="execute-temp-repertorio" aria-label="Executar lista provisoria" title="Executar lista provisoria" disabled>&#9654;</button>
        </div>
        <div class="public-banda-cascade-results" data-role="musicas-repertorio-results" hidden></div>
        <div class="public-banda-selected-list" data-role="selected-repertorio-musicas" hidden></div>
      </section>
      <section class="dashboard-search-column" data-public-banda-column="acervo">
        <div class="public-banda-search-action">
          <label class="dashboard-search">
            Buscar musica acervo
            <input data-action="search-musica-acervo" type="search" placeholder="Titulo ou artista">
          </label>
          <button class="nav-button public-banda-play-button" type="button" data-action="execute-temp-acervo" aria-label="Executar lista provisoria do acervo" title="Executar lista provisoria do acervo" disabled>&#9654;</button>
        </div>
        <div class="public-banda-cascade-results" data-role="musicas-acervo-results" hidden></div>
        <div class="public-banda-selected-list" data-role="selected-acervo-musicas" hidden></div>
      </section>
    </section>
    <section class="public-banda-execution" data-role="execution-slot" hidden>
      <div data-role="execution-content"></div>
    </section>
    <div class="public-banda-leader-status" data-role="leader-status" hidden></div>
    <div class="public-banda-login-backdrop" data-role="leader-login-modal" hidden>
      <div class="public-banda-login-modal" role="dialog" aria-modal="true" aria-labelledby="public-banda-login-title">
        <button class="login-modal-close" type="button" data-action="close-leader-login" aria-label="Fechar login">&times;</button>
        <h2 id="public-banda-login-title">Entrar como Lider</h2>
        <form class="form public-banda-login-form">
          <label data-role="leader-login-email-field">
            E-mail
            <input name="email" type="email" autocomplete="email" required>
          </label>
          <label>
            Senha
            <input name="password" type="password" autocomplete="current-password" required>
          </label>
          <button class="button" type="submit">Entrar como Lider</button>
          <p class="form-message" aria-live="polite"></p>
        </form>
      </div>
    </div>
  `;

  const modeButtons = wrapper.querySelectorAll('[data-mode]');
  const memberFollowButton = wrapper.querySelector('[data-action="toggle-member-follow"]');
  const acervoColumn = wrapper.querySelector('[data-public-banda-column="acervo"]');
  const repertorioMusicSearch = wrapper.querySelector('[data-action="search-musica-repertorio"]');
  const acervoMusicSearch = wrapper.querySelector('[data-action="search-musica-acervo"]');
  const repertorioSearch = wrapper.querySelector('[data-action="search-repertorio"]');
  const musicasRepertorioSlot = wrapper.querySelector('[data-role="musicas-repertorio-results"]');
  const musicasAcervoSlot = wrapper.querySelector('[data-role="musicas-acervo-results"]');
  const selectedRepertorioMusicasSlot = wrapper.querySelector('[data-role="selected-repertorio-musicas"]');
  const selectedAcervoMusicasSlot = wrapper.querySelector('[data-role="selected-acervo-musicas"]');
  const repertoriosSlot = wrapper.querySelector('[data-role="repertorios-results"]');
  const executionSlot = wrapper.querySelector('[data-role="execution-slot"]');
  const executionContent = wrapper.querySelector('[data-role="execution-content"]');
  const leaderStatus = wrapper.querySelector('[data-role="leader-status"]');
  const leaderLoginModal = wrapper.querySelector('[data-role="leader-login-modal"]');
  const leaderLoginForm = wrapper.querySelector('.public-banda-login-form');
  const leaderLoginEmailField = wrapper.querySelector('[data-role="leader-login-email-field"]');
  const leaderLoginEmail = wrapper.querySelector('.public-banda-login-form input[name="email"]');
  const leaderLoginPassword = wrapper.querySelector('.public-banda-login-form input[name="password"]');
  const leaderLoginMessage = wrapper.querySelector('.public-banda-login-form .form-message');
  const leaderLoginSubmitButton = wrapper.querySelector('.public-banda-login-form button[type="submit"]');
  const executeSelectedRepertorioButton = wrapper.querySelector('[data-action="execute-selected-repertorio"]');
  const executeTempRepertorioButton = wrapper.querySelector('[data-action="execute-temp-repertorio"]');
  const executeTempAcervoButton = wrapper.querySelector('[data-action="execute-temp-acervo"]');
  let activeCascade = null;
  let currentExecutionState = null;
  let publicAutoscrollTimer = null;
  let selectedRepertorio = null;
  let tempRepertorioMusicas = [];
  let tempAcervoMusicas = [];
  let currentTempExecutionType = null;
  let keepCascadeOpenOnFocusout = false;

  if (acervoColumn) {
    acervoColumn.hidden = !allowAcervo;
  }

  async function setMode(mode, options = {}) {
    if (mode === 'lider' && !options.skipCredentialPrompt) {
      openLeaderLogin();
      return;
    }

    if (mode === 'lider' && !options.skipClaim) {
      const claimed = await claimLeaderRole();
      if (!claimed) {
        if (leaderPresence.active && leaderPresence.client_id !== clientId) {
          window.alert('Ja existe um lider conectado neste convite.');
        }
        mode = 'integrante';
      }
    }

    const wasLeaderMode = currentMode === 'lider';
    if (wasLeaderMode && mode !== 'lider' && !options.skipRelease) {
      await releaseLeaderRole();
    }

    currentMode = mode;
    if (mode === 'integrante') {
      memberFollowingLeader = true;
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

    if (mode === 'integrante' && memberFollowingLeader) {
      startMemberMirror();
    }
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  memberFollowButton?.addEventListener('click', () => {
    toggleMemberLeaderConnection();
  });

  wrapper.querySelector('[data-action="close-leader-login"]')?.addEventListener('click', closeLeaderLogin);
  leaderLoginModal?.addEventListener('click', (event) => {
    if (event.target === leaderLoginModal) {
      closeLeaderLogin();
    }
  });
  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && leaderLoginModal && !leaderLoginModal.hidden) {
      closeLeaderLogin();
    }
  });
  leaderLoginForm?.addEventListener('submit', handleLeaderLoginSubmit);

  async function executeMusica(musica, options = {}) {
    if (currentMode === 'integrante' && memberFollowingLeader && !options.mirrored) return;

    if (activeCascade) hideCascade(activeCascade);
    stopPublicAutoscroll();
    currentTempExecutionType = null;
    executionContent.replaceChildren(createMusicaPerformanceView({ musica, returnTo }));
    refreshExecutionControlsForMode();
    resetMemberLeaderLockedControls();
    openExecutionLayer();
    currentExecutionState = normalizeState({
      itemType: 'musica',
      musicaId: musica.id,
      transposeSemitones: options.state?.transpose_semitones || 0,
    });
    applyPerformanceState(currentExecutionState);

    if (!options.mirrored && currentMode === 'lider') {
      await publishLeaderState(currentExecutionState);
    }
  }

  async function executeRepertorio(repertorio, options = {}) {
    if (currentMode === 'integrante' && memberFollowingLeader && !options.mirrored) return;

    if (activeCascade) hideCascade(activeCascade);
    stopPublicAutoscroll();
    currentTempExecutionType = null;
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
    resetMemberLeaderLockedControls();
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
    });
    applyPerformanceState(currentExecutionState);

    if (!options.mirrored && currentMode === 'lider') {
      await publishLeaderState(currentExecutionState);
    }
  }

  async function executeTempRepertorio() {
    if (currentMode === 'integrante' && memberFollowingLeader) return;
    if (!selectedRepertorio || !tempRepertorioMusicas.length) return;
    executeTempMusicList({
      type: 'repertorio',
      repertorio: {
        ...selectedRepertorio,
        id: `temp-${selectedRepertorio.id}`,
        nome: `${getField(selectedRepertorio, ['nome', 'titulo', 'name'])} - lista provisoria`,
      },
      musicasAssociadas: tempRepertorioMusicas,
    });
  }

  async function executeTempAcervo() {
    if (currentMode === 'integrante' && memberFollowingLeader) return;
    if (!tempAcervoMusicas.length) return;
    executeTempMusicList({
      type: 'acervo',
      repertorio: {
        id: 'temp-acervo',
        nome: 'Lista provisoria do acervo',
      },
      musicasAssociadas: tempAcervoMusicas.map((musica) => ({
        id: `temp-acervo-${musica.id}`,
        musica_id: musica.id,
        tom: getField(musica, ['tom', 'key']),
        observacao: '',
        musicas: musica,
      })),
    });
  }

  function executeTempMusicList({ type, repertorio, musicasAssociadas }) {
    if (currentMode === 'integrante' && memberFollowingLeader) return;

    if (activeCascade) hideCascade(activeCascade);
    stopPublicAutoscroll();
    currentTempExecutionType = type;

    executionContent.replaceChildren(createRepertorioPerformanceView({
      repertorio,
      musicasAssociadas: musicasAssociadas.map((item, index) => ({
        ...item,
        ordem: index + 1,
      })),
      returnTo,
    }));
    refreshExecutionControlsForMode();
    openExecutionLayer();
    currentExecutionState = null;
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
    });
    await publishLeaderState(currentExecutionState);
  }

  function openExecutionLayer() {
    executionSlot.hidden = false;
    document.body.classList.add('has-banda-stage-open');
  }

  async function closeExecutionLayer(options = {}) {
    const shouldClearLeaderState = options.clearLeaderState === true;

    stopPublicAutoscroll();
    executionSlot.hidden = true;
    executionContent.replaceChildren();
    currentExecutionState = null;
    clearCurrentTempExecution();
    document.body.classList.remove('has-banda-stage-open');

    if (shouldClearLeaderState || currentMode === 'lider') {
      await clearLeaderState();
    }
  }

  function clearCurrentTempExecution() {
    if (currentTempExecutionType === 'repertorio') {
      tempRepertorioMusicas = [];
      updateTempRepertorioButton();
      renderSelectedMusicasList(selectedRepertorioMusicasSlot, []);
    }

    if (currentTempExecutionType === 'acervo') {
      tempAcervoMusicas = [];
      updateTempAcervoButton();
      renderSelectedMusicasList(selectedAcervoMusicasSlot, []);
    }

    currentTempExecutionType = null;
    updateSelectedListsVisibility();
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
      .querySelectorAll('[data-action="transpose-down"], [data-action="transpose-up"], [data-action="previous-song"], [data-action="next-song"], [data-action="capo"]')
      .forEach((control) => {
        control.dataset.memberRestrictedConfig = 'true';
      });
  }

  function resetMemberLeaderLockedControls() {
    if (currentMode !== 'integrante' || !memberFollowingLeader) return;

    const capoSelect = executionContent.querySelector('[data-action="capo"]');
    if (capoSelect && capoSelect.value !== '0') {
      capoSelect.value = '0';
      capoSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateMemberMirrorUi() {
    const isMemberMode = currentMode === 'integrante';

    wrapper.classList.toggle('is-member-following', isMemberMode && memberFollowingLeader);

    if (!memberFollowButton) return;

    const leaderIsThisClient = isCurrentLeader();
    const canFollowLeader = isMemberMode && leaderPresence.active && !leaderIsThisClient;
    memberFollowButton.hidden = !canFollowLeader;
    memberFollowButton.disabled = false;
    memberFollowButton.textContent = memberFollowingLeader ? 'Desconectar do Lider' : 'Conectar ao Lider';
    memberFollowButton.title = memberFollowButton.textContent;
    memberFollowButton.setAttribute('aria-label', memberFollowButton.title);
  }

  async function toggleMemberLeaderConnection() {
    if (currentMode !== 'integrante') return;

    if (memberFollowingLeader) {
      memberFollowingLeader = false;
      lastMirroredStateKey = '';
      stopMemberMirror();
      await closeExecutionLayer({ clearLeaderState: false });
      updateMemberMirrorUi();
      return;
    }

    await refreshLeaderPresence();
    if (!leaderPresence.active || isCurrentLeader()) {
      window.alert('Nenhum lider conectado neste convite.');
      updateMemberMirrorUi();
      return;
    }

    memberFollowingLeader = true;
    updateMemberMirrorUi();
    startMemberMirror();
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

  executionContent.addEventListener('pointerup', (event) => {
    if (currentMode !== 'integrante' || !memberFollowingLeader || !event.isTrusted) return;
    if (event.target.closest('.performance-toolbar, a, button, input, select, label')) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  executionContent.addEventListener('click', async (event) => {
    const backLink = event.target.closest('.song-toolbar-back');
    if (backLink) {
      event.preventDefault();
      if (currentMode === 'integrante' && memberFollowingLeader) {
        memberFollowingLeader = false;
        lastMirroredStateKey = '';
        stopMemberMirror();
        await closeExecutionLayer({ clearLeaderState: false });
        updateMemberMirrorUi();
        return;
      }

      await closeExecutionLayer();
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

  async function publishLeaderState(state) {
    const { data, error } = await updatePublicBandaCoralState(token, state);

    if (error || !data?.valid) {
      window.alert(error?.message || 'Nao foi possivel espelhar a execucao para os integrantes.');
    }
  }

  async function clearLeaderState() {
    if (currentMode !== 'lider') return;

    const { error } = await clearPublicBandaCoralState(token, clientId);
    if (error) {
      console.warn('Nao foi possivel limpar a execucao para os integrantes.', error);
    }
  }

  async function claimLeaderRole() {
    const { data, error } = await claimPublicBandaCoralLeader(token, clientId);
    if (error || !data?.valid || !data?.is_leader) {
      if (data?.reason === 'auth_required') {
        leaderUser = null;
        openLeaderLogin();
        return false;
      }
      await refreshLeaderPresence();
      return false;
    }

    leaderPresence = data.leader || { active: true, client_id: clientId, user_id: leaderUser?.id || null, name: '' };
    updateLeaderPresenceUi();
    return true;
  }

  async function releaseLeaderRole() {
    await releasePublicBandaCoralLeader(token, clientId);
    forgetPublicBandaLeaderAuth(token);
    leaderAuthenticatedForRoom = false;
    leaderPresence = { active: false, client_id: null, user_id: null, name: '' };
    updateLeaderPresenceUi();
  }

  function openLeaderLogin() {
    if (!leaderLoginModal) return;

    const loggedEmail = String(leaderUser?.email || '').trim();
    if (leaderLoginEmailField) {
      leaderLoginEmailField.hidden = Boolean(loggedEmail);
    }
    if (leaderLoginEmail) {
      leaderLoginEmail.value = loggedEmail;
      leaderLoginEmail.required = !loggedEmail;
    }
    if (leaderLoginPassword) {
      leaderLoginPassword.value = '';
    }
    leaderLoginMessage.textContent = '';
    leaderLoginMessage.className = 'form-message';
    leaderLoginModal.hidden = false;
    window.requestAnimationFrame(() => {
      leaderLoginModal.classList.add('is-open');
      (loggedEmail ? leaderLoginPassword : leaderLoginEmail)?.focus();
    });
  }

  function closeLeaderLogin() {
    if (!leaderLoginModal) return;

    leaderLoginModal.classList.remove('is-open');
    leaderLoginModal.hidden = true;
  }

  async function handleLeaderLoginSubmit(event) {
    event.preventDefault();

    const formData = new FormData(leaderLoginForm);
    const email = String(leaderUser?.email || formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    leaderLoginSubmitButton.disabled = true;
    leaderLoginMessage.className = 'form-message';
    leaderLoginMessage.textContent = 'Entrando...';

    try {
      const { data, error } = await signInWithPassword(email, password);

      if (error) {
        throw error;
      }

      leaderUser = data?.user || await getCurrentUser();
      const claimed = await claimLeaderRole();
      if (!claimed) {
        throw new Error('Nao foi possivel assumir a lideranca deste convite.');
      }

      rememberPublicBandaLeaderAuth(token, leaderUser);
      leaderAuthenticatedForRoom = true;
      closeLeaderLogin();
      await setMode('lider', {
        skipClaim: true,
        skipCredentialPrompt: true,
      });
    } catch (error) {
      leaderLoginMessage.className = 'form-message error';
      leaderLoginMessage.textContent = error.message || 'Nao foi possivel fazer login.';
    } finally {
      leaderLoginSubmitButton.disabled = false;
    }
  }

  function startMemberMirror() {
    syncMemberMirror();
    memberMirrorTimer = window.setInterval(syncMemberMirror, 1800);
  }

  async function syncMemberMirror() {
    if (!leaderPresence.active) {
      lastMirroredStateKey = '';
      return;
    }

    try {
      const { data } = await getPublicBandaCoralState(token);
      if (data?.valid) {
        mirrorLeaderState(data.state || {});
      }
    } catch {
      lastMirroredStateKey = '';
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
      const wasLeaderActive = Boolean(leaderPresence.active);
      leaderPresence = data.leader || { active: false, client_id: null, user_id: null, name: '' };
      const isLeaderActive = Boolean(leaderPresence.active);

      if (hasObservedLeaderPresence && wasLeaderActive !== isLeaderActive && currentMode === 'integrante') {
        showLeaderStatus(isLeaderActive ? `${formatLeaderName(leaderPresence)} conectado como lider` : 'Lider desconectado');
      }

      hasObservedLeaderPresence = true;
      updateLeaderPresenceUi();
      updateMemberMirrorUi();
    }
  }

  function showLeaderStatus(message) {
    if (!leaderStatus) return;

    window.clearTimeout(leaderStatusTimer);
    leaderStatus.textContent = message;
    leaderStatus.hidden = false;
    leaderStatus.classList.add('is-visible');

    leaderStatusTimer = window.setTimeout(() => {
      leaderStatus.classList.remove('is-visible');
      leaderStatus.hidden = true;
    }, 2800);
  }

  function formatLeaderName(leader) {
    const name = String(leader?.name || '').trim();
    return name && normalizeText(name) !== 'lider' ? name : 'Usuario';
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
    const leaderIsThisClient = isCurrentLeader();
    const leaderAvailable = allowedMode !== 'integrante' && (!leaderPresence.active || leaderIsThisClient);
    const memberAvailable = allowedMode !== 'lider'
      || !leaderPresence.active
      || (leaderPresence.active && !leaderIsThisClient);

    if (leaderButton) {
      leaderButton.hidden = !leaderAvailable;
      leaderButton.textContent = currentMode === 'lider' ? 'Voce e o lider' : 'Lider';
      leaderButton.title = currentMode === 'lider' ? 'Voce e o lider' : 'Entrar como lider';
      leaderButton.setAttribute('aria-label', leaderButton.title);
    }
    if (memberButton) {
      memberButton.hidden = !memberAvailable;
      memberButton.textContent = currentMode === 'lider' ? 'Desconectar Lider' : 'Integrante';
      memberButton.title = currentMode === 'lider' ? 'Desconectar Lider' : 'Entrar como integrante';
      memberButton.setAttribute('aria-label', memberButton.title);
    }
  }

  function isCurrentLeader() {
    return Boolean(leaderPresence.active && (
      (leaderPresence.user_id && leaderUser?.id === leaderPresence.user_id)
      || (!leaderPresence.user_id && leaderPresence.client_id === clientId)
    ));
  }

  function mirrorLeaderState(state) {
    const stateKey = getStateKey(state);
    if (!stateKey) {
      lastMirroredStateKey = '';
      const hasRenderedExecution = executionContent.childElementCount > 0;
      if (currentMode === 'integrante' && !hasRenderedExecution) {
        closeExecutionLayer({ clearLeaderState: false });
      }
      return;
    }

    if (stateKey === lastMirroredStateKey) return;

    lastMirroredStateKey = stateKey;

    if (state.item_type === 'musica') {
      const musica = musicas.find((item) => item.id === state.musica_id)
        || musicasRepertorio.find((item) => item.id === state.musica_id);
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

  function applyPerformanceState(state) {
    window.requestAnimationFrame(() => {
      const semitones = Number(state.transposeSemitones || 0);
      const action = semitones > 0 ? 'transpose-up' : 'transpose-down';
      const button = executionContent.querySelector(`[data-action="${action}"]`);

      for (let index = 0; button && index < Math.abs(semitones); index += 1) {
        button.click();
      }
    });
  }

  function renderMusicasRepertorio() {
    if (!selectedRepertorio) {
      hideCascade(musicasRepertorioSlot);
      musicasRepertorioSlot.replaceChildren();
      return;
    }

    const query = normalizeText(repertorioMusicSearch.value);
    const musicasDoRepertorioSelecionado = repertorioMusicas
      .filter((item) => item.repertorio_id === selectedRepertorio.id && item?.musicas);
    const results = query
      ? musicasDoRepertorioSelecionado.filter((item) => matchesMusicaSearch(item.musicas, query))
      : musicasDoRepertorioSelecionado;

    musicasRepertorioSlot.replaceChildren(createRepertorioMusicResultList(results, {
      emptyText: 'Nenhuma musica encontrada.',
      onExecute: (item) => executeMusica(item.musicas),
      onToggle: toggleTempRepertorioMusica,
      isAdded: (item) => tempRepertorioMusicas.some((selected) => selected.id === item.id),
    }));
    showCascade(musicasRepertorioSlot);
  }

  function renderMusicasAcervo() {
    if (!allowAcervo) {
      hideCascade(musicasAcervoSlot);
      musicasAcervoSlot.replaceChildren();
      return;
    }

    const query = normalizeText(acervoMusicSearch.value);
    const results = query
      ? musicas.filter((musica) => matchesMusicaSearch(musica, query))
      : musicas;

    musicasAcervoSlot.replaceChildren(createRepertorioMusicResultList(results, {
      emptyText: 'Nenhuma musica encontrada.',
      getMusica: (musica) => musica,
      onExecute: executeMusica,
      onToggle: toggleTempAcervoMusica,
      isAdded: (musica) => tempAcervoMusicas.some((selected) => selected.id === musica.id),
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
    repertorioMusicSearch.value = '';
    tempRepertorioMusicas = [];
    updateTempRepertorioButton();
    renderSelectedMusicasList(selectedRepertorioMusicasSlot, []);
    updateSelectedListsVisibility();
    hideCascade(musicasRepertorioSlot);
    musicasRepertorioSlot.replaceChildren();

    if (selectedRepertorio) {
      repertorioSearch.value = formatRepertorioSearchLabel(selectedRepertorio);
    }

    executeSelectedRepertorioButton.disabled = !selectedRepertorio;
  }

  function toggleTempRepertorioMusica(item) {
    keepCascadeOpenOnFocusout = true;
    tempRepertorioMusicas = toggleListItem(tempRepertorioMusicas, item);
    updateTempRepertorioButton();
    renderSelectedMusicasList(selectedRepertorioMusicasSlot, tempRepertorioMusicas);
    updateSelectedListsVisibility();
    renderMusicasRepertorio();
    window.requestAnimationFrame(() => {
      repertorioMusicSearch.focus({ preventScroll: true });
      showCascade(musicasRepertorioSlot);
    });
  }

  function toggleTempAcervoMusica(musica) {
    keepCascadeOpenOnFocusout = true;
    tempAcervoMusicas = toggleListItem(tempAcervoMusicas, musica);
    updateTempAcervoButton();
    renderSelectedMusicasList(selectedAcervoMusicasSlot, tempAcervoMusicas);
    updateSelectedListsVisibility();
    renderMusicasAcervo();
    window.requestAnimationFrame(() => {
      acervoMusicSearch.focus({ preventScroll: true });
      showCascade(musicasAcervoSlot);
    });
  }

  function toggleListItem(items, item) {
    return items.some((selected) => selected.id === item.id)
      ? items.filter((selected) => selected.id !== item.id)
      : [...items, item];
  }

  function updateTempRepertorioButton() {
    executeTempRepertorioButton.disabled = !selectedRepertorio || !tempRepertorioMusicas.length;
    executeTempRepertorioButton.title = tempRepertorioMusicas.length
      ? `Executar lista provisoria (${tempRepertorioMusicas.length})`
      : 'Executar lista provisoria';
    executeTempRepertorioButton.setAttribute('aria-label', executeTempRepertorioButton.title);
  }

  function updateTempAcervoButton() {
    executeTempAcervoButton.disabled = !tempAcervoMusicas.length;
    executeTempAcervoButton.title = tempAcervoMusicas.length
      ? `Executar lista provisoria do acervo (${tempAcervoMusicas.length})`
      : 'Executar lista provisoria do acervo';
    executeTempAcervoButton.setAttribute('aria-label', executeTempAcervoButton.title);
  }

  repertorioMusicSearch.addEventListener('input', renderMusicasRepertorio);
  repertorioMusicSearch.addEventListener('focus', () => {
    repertorioMusicSearch.value = '';
    renderMusicasRepertorio();
  });
  acervoMusicSearch.addEventListener('input', renderMusicasAcervo);
  acervoMusicSearch.addEventListener('focus', () => {
    acervoMusicSearch.value = '';
    renderMusicasAcervo();
  });
  repertorioSearch.addEventListener('input', renderRepertorios);
  repertorioSearch.addEventListener('focus', () => {
    repertorioSearch.value = '';
    renderRepertorios();
  });
  executeSelectedRepertorioButton.addEventListener('click', () => {
    if (!selectedRepertorio) return;
    executeRepertorio(selectedRepertorio);
  });
  executeTempRepertorioButton.addEventListener('click', executeTempRepertorio);
  executeTempAcervoButton.addEventListener('click', executeTempAcervo);

  wrapper.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (keepCascadeOpenOnFocusout) {
        keepCascadeOpenOnFocusout = false;
        return;
      }

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
    leaderAuthenticatedForRoom = hasPublicBandaLeaderAuth(token, leaderUser);
    const initialMode = isCurrentLeader() && leaderAuthenticatedForRoom
      ? 'lider'
      : 'integrante';

    setMode(initialMode, {
      skipClaim: true,
      skipRelease: true,
      skipCredentialPrompt: true,
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
    updateSelectedListsVisibility();
  }

  function hideCascade(slot) {
    slot.hidden = true;
    if (activeCascade === slot) {
      activeCascade = null;
    }
    updateSelectedListsVisibility();
  }

  function updateSelectedListsVisibility() {
    if (selectedRepertorioMusicasSlot) {
      selectedRepertorioMusicasSlot.hidden = activeCascade === musicasRepertorioSlot
        || !tempRepertorioMusicas.length;
    }

    if (selectedAcervoMusicasSlot) {
      selectedAcervoMusicasSlot.hidden = activeCascade === musicasAcervoSlot
        || !tempAcervoMusicas.length;
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
  };
}

function getStateKey(state) {
  if (state?.is_stage_active !== true) return '';
  if (!state?.item_type) return '';
  const toneKey = `${state.transpose_semitones || 0}:${state.updated_at || ''}`;
  if (state.item_type === 'musica' && state.musica_id) return `musica:${state.musica_id}:${toneKey}`;
  if (state.item_type === 'repertorio' && state.repertorio_id) {
    return `repertorio:${state.repertorio_id}:${state.repertorio_musica_id || ''}:${state.current_song_index || 0}:${toneKey}`;
  }
  return '';
}

function getPublicBandaClientId() {
  const storageKey = 'masterCifras.publicBandaClientId';
  const storedId = window.localStorage.getItem(storageKey);

  if (storedId) {
    return storedId;
  }

  const legacySessionId = window.sessionStorage.getItem(storageKey);
  if (legacySessionId) {
    window.localStorage.setItem(storageKey, legacySessionId);
    return legacySessionId;
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : createFallbackClientId();
  window.localStorage.setItem(storageKey, id);
  return id;
}

function getPublicBandaLeaderAuthKey(token) {
  return `masterCifras.publicBandaLeaderAuth.${token}`;
}

function hasPublicBandaLeaderAuth(token, user) {
  if (!user?.id) return false;

  try {
    return window.sessionStorage.getItem(getPublicBandaLeaderAuthKey(token)) === user.id;
  } catch (_error) {
    return false;
  }
}

function rememberPublicBandaLeaderAuth(token, user) {
  if (!user?.id) return;

  try {
    window.sessionStorage.setItem(getPublicBandaLeaderAuthKey(token), user.id);
  } catch (_error) {
    // Ignora indisponibilidade de storage; a lideranca no banco continua valida.
  }
}

function forgetPublicBandaLeaderAuth(token) {
  try {
    window.sessionStorage.removeItem(getPublicBandaLeaderAuthKey(token));
  } catch (_error) {
    // Ignora indisponibilidade de storage.
  }
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

function createRepertorioMusicResultList(items, options) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = options.emptyText;
    return empty;
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list public-banda-results';

  items.forEach((item) => {
    const musica = options.getMusica ? options.getMusica(item) : (item.musicas || {});
    const row = document.createElement('div');
    row.className = 'public-banda-result-row';

    const titleButton = document.createElement('button');
    titleButton.className = 'dashboard-list-item public-banda-result-item public-banda-song-title-button';
    titleButton.type = 'button';
    titleButton.innerHTML = `
      <div>
        <h3>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']) || '-')}</h3>
        <p>${escapeHtml(getField(musica, ['artista', 'artist']))}</p>
      </div>
    `;
    titleButton.addEventListener('click', () => options.onExecute(item));

    const addButton = document.createElement('button');
    addButton.className = 'nav-button public-banda-add-temp-button';
    addButton.type = 'button';
    const added = Boolean(options.isAdded?.(item));
    addButton.classList.toggle('is-selected', added);
    addButton.textContent = added ? '✓' : '+';
    addButton.title = added ? 'Remover da lista provisoria' : 'Adicionar a lista provisoria';
    addButton.setAttribute('aria-label', addButton.title);
    addButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    addButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      options.onToggle(item);
    });

    row.append(titleButton, addButton);
    list.append(row);
  });

  return list;
}

function renderSelectedMusicasList(slot, items) {
  if (!slot) return;

  slot.replaceChildren();
  if (!items.length) {
    slot.hidden = true;
    return;
  }

  const list = document.createElement('ol');
  list.className = 'public-banda-selected-items';

  items.forEach((item) => {
    const musica = item.musicas || item;
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const artist = getField(musica, ['artista', 'artist']);
    const row = document.createElement('li');
    row.innerHTML = `
      <span>${escapeHtml(title || '-')}</span>
      ${artist ? `<small>${escapeHtml(artist)}</small>` : ''}
    `;
    list.append(row);
  });

  slot.append(list);
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
