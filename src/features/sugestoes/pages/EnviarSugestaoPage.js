import { createSugestaoMusica, listMinhasSugestoes } from '../../../services/sugestoesMusicasService.js';
import { listMusicas } from '../../../services/musicasService.js';

export async function EnviarSugestaoPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page sugestoes-page suggestion-send-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Enviar musica</h1>
        <p data-page-info>Compartilhe uma nova cifra ou proponha ajustes em uma musica existente.</p>
      </div>
    </header>
    <div class="page-grid">
      <section class="suggestion-panel suggestion-form-panel">
        <h2>Nova sugestao</h2>
        <div class="form-slot"></div>
      </section>
      <section class="suggestion-panel suggestion-list-panel">
        <h2>Minhas sugestoes</h2>
        <div class="list-slot">
          <p class="page-status">Carregando sugestoes...</p>
        </div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  let musicas = [];

  try {
    const { data, error } = await listMusicas();

    if (error) {
      throw error;
    }

    musicas = data || [];
  } catch (_error) {
    musicas = [];
  }

  formSlot.append(createSugestaoForm(session, musicas, async () => {
    await refreshMinhasSugestoes(listSlot);
  }));

  try {
    await refreshMinhasSugestoes(listSlot);
  } catch (error) {
    listSlot.replaceChildren(createStatus(error.message || 'Nao foi possivel carregar suas sugestoes.', 'error'));
  }

  return page;
}

function createSugestaoForm(session, musicas, onSaved) {
  const form = document.createElement('form');
  form.className = 'form suggestion-send-form';
  form.innerHTML = `
    <div class="suggestion-song-search">
      <label>
        Buscar musica para ajuste
        <input class="song-search-input" type="search" placeholder="Digite o titulo da musica existente" autocomplete="off">
      </label>
      <div class="song-search-results" hidden></div>
      <p class="page-status" data-role="suggestion-type">Sugestao de musica nova.</p>
      <button class="button-link secondary" type="button" data-action="clear-selected-song" hidden>Limpar musica selecionada</button>
    </div>
    <input name="tipo_sugestao" type="hidden" value="nova">
    <input name="musica_origem_id" type="hidden">
    <label>
      Titulo
      <input name="titulo" type="text" required>
    </label>
    <label>
      Artista
      <input name="artista" type="text">
    </label>
    <label>
      Tom
      <input name="tom" type="text" placeholder="Ex: C, D, Em">
    </label>
    <label>
      Link
      <input name="musica_link" type="url" placeholder="https://...">
    </label>
    <label>
      Observacao
      <textarea name="observacao" rows="4"></textarea>
    </label>
    <label>
      Cifra original
      <textarea name="cifra_original" rows="12" required></textarea>
    </label>
    <button class="button" type="submit">Enviar sugestao</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const button = form.querySelector('button');
  const submitButton = form.querySelector('button[type="submit"]');
  const clearSelectedButton = form.querySelector('[data-action="clear-selected-song"]');
  const searchInput = form.querySelector('.song-search-input');
  const resultsSlot = form.querySelector('.song-search-results');
  const suggestionType = form.querySelector('[data-role="suggestion-type"]');
  const message = form.querySelector('.form-message');
  const tipoInput = form.querySelector('[name="tipo_sugestao"]');
  const musicaOrigemInput = form.querySelector('[name="musica_origem_id"]');
  let isPointerInsideResults = false;

  function renderResults() {
    const query = normalizeText(searchInput.value);
    const filtered = sortMusicasByTitle(musicas)
      .filter((musica) => matchesMusicaSearch(musica, query))
      .slice(0, 40);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhuma musica encontrada.';
      resultsSlot.replaceChildren(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'song-search-list';

    filtered.forEach((musica) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'song-search-item';
      item.innerHTML = `
        <strong>${escapeHtml(formatMusicaName(musica))}</strong>
        <span>Tom: ${escapeHtml(getField(musica, ['tom', 'key']))}</span>
      `;

      item.addEventListener('click', () => {
        loadMusicaForAdjustment(form, musica);
        resultsSlot.hidden = true;
      });

      list.append(item);
    });

    resultsSlot.replaceChildren(list);
  }

  searchInput.addEventListener('input', () => {
    renderResults();
    resultsSlot.hidden = false;
  });

  searchInput.addEventListener('focus', () => {
    renderResults();
    resultsSlot.hidden = false;
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (!isPointerInsideResults) {
        resultsSlot.hidden = true;
      }
    }, 120);
  });

  resultsSlot.addEventListener('mouseenter', () => {
    isPointerInsideResults = true;
    resultsSlot.hidden = false;
  });

  resultsSlot.addEventListener('mouseleave', () => {
    isPointerInsideResults = false;

    if (document.activeElement !== searchInput) {
      resultsSlot.hidden = true;
    }
  });

  clearSelectedButton.addEventListener('click', () => {
    tipoInput.value = 'nova';
    musicaOrigemInput.value = '';
    searchInput.value = '';
    suggestionType.textContent = 'Sugestao de musica nova.';
    clearSelectedButton.hidden = true;
    form.querySelectorAll('input:not([type="hidden"]):not(.song-search-input), textarea').forEach((field) => {
      field.value = '';
    });
  });

  renderResults();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Enviando...';

    const { data, error } = await createSugestaoMusica({
      ...getFormValues(form),
      enviado_por_nome: session?.profile?.nome || session?.user?.email || '',
      enviado_por_email: session?.user?.email || '',
      enviado_por_papel: session?.profile?.papel || 'musico',
    });

    if (error || !data) {
      submitButton.disabled = false;
      message.className = 'form-message error';
      message.textContent = error?.message || 'Nao foi possivel enviar a sugestao.';
      return;
    }

    form.reset();
    tipoInput.value = 'nova';
    musicaOrigemInput.value = '';
    suggestionType.textContent = 'Sugestao de musica nova.';
    clearSelectedButton.hidden = true;
    submitButton.disabled = false;
    message.className = 'form-message success';
    message.textContent = data.tipo_sugestao === 'ajuste'
      ? 'Sugestao de ajuste enviada para revisao.'
      : 'Sugestao enviada para revisao.';

    if (onSaved) {
      await onSaved();
    }
  });

  return form;
}

async function refreshMinhasSugestoes(slot) {
  const { data, error } = await listMinhasSugestoes();

  if (error) {
    throw error;
  }

  slot.replaceChildren(createSugestoesList(data || []));
}

function createSugestoesList(items) {
  if (!items.length) {
    return createStatus('Nenhuma sugestao enviada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'dashboard-list-item';
    article.innerHTML = `
      <div>
        <h3>${escapeHtml(item.titulo || '-')}</h3>
        <p>${escapeHtml([formatTipoSugestao(item.tipo_sugestao), item.artista, `Status: ${formatStatus(item.status)}`].filter(Boolean).join(' - '))}</p>
        ${item.motivo_rejeicao ? `<p>${escapeHtml(item.motivo_rejeicao)}</p>` : ''}
      </div>
    `;
    list.append(article);
  });

  return list;
}

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    titulo: String(formData.get('titulo') || '').trim(),
    artista: String(formData.get('artista') || '').trim(),
    tom: String(formData.get('tom') || '').trim(),
    musica_link: String(formData.get('musica_link') || '').trim(),
    observacao: String(formData.get('observacao') || '').trim(),
    cifra_original: String(formData.get('cifra_original') || '').trim(),
    tipo_sugestao: String(formData.get('tipo_sugestao') || 'nova'),
    musica_origem_id: String(formData.get('musica_origem_id') || '').trim() || null,
  };
}

function loadMusicaForAdjustment(form, musica) {
  form.querySelector('[name="tipo_sugestao"]').value = 'ajuste';
  form.querySelector('[name="musica_origem_id"]').value = musica.id;
  form.querySelector('[name="titulo"]').value = getField(musica, ['titulo', 'nome', 'title']) !== '-' ? getField(musica, ['titulo', 'nome', 'title']) : '';
  form.querySelector('[name="artista"]').value = getField(musica, ['artista', 'autor', 'artist']) !== '-' ? getField(musica, ['artista', 'autor', 'artist']) : '';
  form.querySelector('[name="tom"]').value = getField(musica, ['tom', 'key']) !== '-' ? getField(musica, ['tom', 'key']) : '';
  form.querySelector('[name="musica_link"]').value = getField(musica, ['musica_link']) !== '-' ? getField(musica, ['musica_link']) : '';
  form.querySelector('[name="cifra_original"]').value = getField(musica, ['cifra_original']) !== '-' ? getField(musica, ['cifra_original']) : '';
  form.querySelector('.song-search-input').value = formatMusicaName(musica);
  form.querySelector('[data-role="suggestion-type"]').textContent = 'Sugestao de ajuste de musica.';
  form.querySelector('[data-action="clear-selected-song"]').hidden = false;
}

function createStatus(text, type = '') {
  const status = document.createElement('p');
  status.className = `page-status${type ? ` ${type}` : ''}`;
  status.textContent = text;
  return status;
}

function formatStatus(status) {
  const labels = {
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
  };

  return labels[status] || status || '-';
}

function formatTipoSugestao(tipo) {
  return tipo === 'ajuste' ? 'Ajuste de musica' : 'Musica nova';
}

function sortMusicasByTitle(musicas) {
  return [...musicas].sort((a, b) => (
    getField(a, ['titulo', 'nome', 'title']).localeCompare(getField(b, ['titulo', 'nome', 'title']), 'pt-BR', { sensitivity: 'base' })
  ));
}

function matchesMusicaSearch(musica, query) {
  if (!query) return true;

  return normalizeText([
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
  ].join(' ')).includes(query);
}

function formatMusicaName(musica) {
  const titulo = getField(musica, ['titulo', 'nome', 'title']);
  const artista = getField(musica, ['artista', 'autor', 'artist']);
  return artista && artista !== '-' ? `${titulo} - ${artista}` : titulo;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
