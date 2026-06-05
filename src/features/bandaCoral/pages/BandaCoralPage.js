import {
  createSessaoBanda,
  getSessaoBandaById,
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
  transposeKey,
} from '../../../utils/chordpro.js';

export async function BandaCoralPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page banda-coral-page';
  page.innerHTML = '<div class="page-status">Carregando Modo Banda/Coral...</div>';

  try {
    const [
      { data: sessoes, error: sessoesError },
      { data: repertorios, error: repertoriosError },
    ] = await Promise.all([
      listSessoesBanda(),
      listRepertorios(),
    ]);

    if (sessoesError) throw sessoesError;
    if (repertoriosError) throw repertoriosError;

    page.replaceChildren(createBandaCoralView({
      session,
      sessoes: sessoes || [],
      repertorios: repertorios || [],
    }));
  } catch (error) {
    page.innerHTML = `<div class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar o Modo Banda/Coral.')}</div>`;
  }

  return page;
}

function createBandaCoralView({ session, sessoes, repertorios }) {
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
      slot.replaceChildren(createLeaderMode({ sessoes, repertorios }));
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

function createLeaderMode({ sessoes, repertorios }) {
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

  sessionsSlot.replaceChildren(createSessionsList(sessoes, {
    emptyText: 'Nenhuma sessao ativa.',
    actionLabel: 'Abrir como lider',
    onSelect: async (sessao) => {
      await openLeaderSession(sessao.id, repertorios, livePanel);
    },
  }));

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
    await openLeaderSession(data.id, repertorios, livePanel);
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
      <button class="nav-button" type="button">${escapeHtml(options.actionLabel || 'Abrir')}</button>
    `;
    item.querySelector('button').addEventListener('click', () => {
      if (options.onSelect) options.onSelect(sessao);
    });
    list.append(item);
  });

  return list;
}

async function openLeaderSession(sessaoId, repertorios, slot) {
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
    participantes: participantesResult.data || [],
  }));
}

async function createLeaderControls({ sessao, repertorios, participantes }) {
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
    <p class="form-message" aria-live="polite"></p>
    <div class="banda-song-slot"></div>
  `;

  const repertorioSelect = wrapper.querySelector('[data-field="repertorio"]');
  const musicaSelect = wrapper.querySelector('[data-field="musica"]');
  const tomInput = wrapper.querySelector('[data-field="tom"]');
  const message = wrapper.querySelector('.form-message');
  const songSlot = wrapper.querySelector('.banda-song-slot');

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
      sessao: updated,
      repertorios,
      participantes,
    });
    wrapper.replaceWith(fresh);
  });

  musicaSelect.addEventListener('change', async () => {
    const selectedOption = musicaSelect.selectedOptions[0];
    const nextTom = selectedOption?.dataset.tom || '';
    tomInput.value = nextTom;
    await saveSession({
      musica_atual_id: musicaSelect.value || null,
      tom_atual: nextTom || null,
    });
    renderBandaSong(songSlot, findSelectedMusica(musicasAssociadas, musicaSelect.value), tomInput.value);
  });

  tomInput.addEventListener('change', async () => {
    await saveSession({
      tom_atual: tomInput.value.trim() || null,
    });
    renderBandaSong(songSlot, findSelectedMusica(musicasAssociadas, musicaSelect.value), tomInput.value);
  });

  renderBandaSong(songSlot, findSelectedMusica(musicasAssociadas, sessao.musica_atual_id), sessao.tom_atual);

  return wrapper;
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
  }, sessao.tom_atual);

  slot.replaceChildren(wrapper);
}

function renderBandaSong(slot, item, tomAtual) {
  const musica = item?.musicas || null;

  if (!musica) {
    slot.innerHTML = '<p class="page-status">Nenhuma musica selecionada pelo lider.</p>';
    return;
  }

  const originalKey = getField(musica, ['tom', 'key']);
  const currentKey = tomAtual || item.tom || originalKey;
  const semitones = getTransposeSemitones(originalKey, currentKey);
  const cifra = transposeCifraOriginal(getCifraExibicao(musica), semitones);

  slot.innerHTML = `
    <article class="banda-song-card">
      <header>
        <span>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</span>
        <strong>Tom: ${escapeHtml(currentKey || '-')}</strong>
      </header>
      <pre class="chordpro-view">${renderCifraOriginalForDisplayHtml(cifra)}</pre>
    </article>
  `;
}

function findSelectedMusica(items, musicaId) {
  return items.find((item) => item.musica_id === musicaId) || null;
}

function getAssocTom(item) {
  return item?.tom || item?.musicas?.tom || '';
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
