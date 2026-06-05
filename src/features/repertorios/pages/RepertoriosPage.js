import { RepertorioPrivacyFields, getRepertorioPrivacyValues } from '../components/RepertorioPrivacyFields.js';
import { listMusicas } from '../../../services/musicasService.js';
import { listShareableProfiles } from '../../../services/profilesService.js';
import { createRepertorioComMusicas, listRepertorios } from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

export async function RepertoriosPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel);
  const page = document.createElement('section');
  page.className = 'page repertorios-page';
  page.innerHTML = `
    <section class="repertorios-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando repertorios...</div>
      </div>
    </section>
    <section class="repertorios-form-panel">
      <div class="form-slot"></div>
    </section>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  if (canEdit) {
    formSlot.append(await createNewRepertorioForm());
  } else {
    formSlot.append(createReadOnlyNotice(
      'No momento seu acesso e restrito nesta opcao.',
      [
        'Consultar todos os repertorios;',
        'Incluir e editar novos repertorios;',
        'Alterar facilmente a sequencia das musicas;',
        'Usar os controles de execucao para ajustar tom, fonte, tema, capo e rolagem automatica.',
        'Definir regras de privacidade do repertorio criado;',
        'Consultar historico de alteracoes.',
      ],
    ));
  }

  try {
    const { data, error } = await listRepertorios();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      listSlot.replaceChildren(createRepertoriosBrowser([]));
      return page;
    }

    listSlot.replaceChildren(createRepertoriosBrowser(data));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar os repertorios.';
  }

  return page;
}

async function createNewRepertorioForm() {
  const wrapper = document.createElement('section');
  wrapper.className = 'new-repertorio-panel';
  wrapper.innerHTML = '<p class="page-status">Carregando musicas...</p>';

  const [
    { data: musicas, error },
    { data: users, error: usersError },
  ] = await Promise.all([
    listMusicas(),
    listShareableProfiles(),
  ]);

  if (error) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Nao foi possivel carregar as musicas.')}</p>`;
    return wrapper;
  }
  if (usersError) {
    wrapper.innerHTML = `<p class="page-status error">${escapeHtml(usersError.message || 'Nao foi possivel carregar os usuarios.')}</p>`;
    return wrapper;
  }

  wrapper.replaceChildren(createNewRepertorioComposer(musicas || [], users || []));
  return wrapper;
}

function createNewRepertorioComposer(musicas, users) {
  const form = document.createElement('form');
  form.className = 'form new-repertorio-form';
  form.innerHTML = `
    <section class="repertorio-form-section repertorio-basic-fields">
      <h2>Novo repertorio</h2>
      <div class="repertorio-title-date-grid">
        <label>
          Nome
          <input name="nome" type="text" required>
        </label>

        <label>
          Data
          <input name="data" type="date">
        </label>
      </div>
      <label class="repertorio-song-search-field">
        Buscar musica
        <input class="song-search-input" type="search" placeholder="Buscar por musica ou artista" autocomplete="off">
      </label>
    </section>

    <section class="repertorio-form-section repertorio-music-fields">
      <h2>Musicas</h2>
      <div class="song-search-results" hidden></div>
      <div class="selected-repertorio-songs"></div>
    </section>

    <div class="repertorio-save-bar">
      <button class="button" type="submit" disabled>Salvar repertorio</button>
      <p class="form-message" aria-live="polite"></p>
    </div>
  `;

  const nomeInput = form.querySelector('[name="nome"]');
  form.querySelector('.repertorio-music-fields h2').after(RepertorioPrivacyFields({
    users,
    initialValues: {
      visibilidade: 'publico',
      permite_edicao_compartilhada: false,
    },
  }));
  const searchInput = form.querySelector('.song-search-input');
  const resultsSlot = form.querySelector('.song-search-results');
  const selectedSlot = form.querySelector('.selected-repertorio-songs');
  const submitButton = form.querySelector('button[type="submit"]');
  const message = form.querySelector('.form-message');
  const selectedMusicas = [];
  const sortedMusicas = sortMusicasByName(musicas);
  let isPointerInsideResults = false;

  function updateSubmitState() {
    submitButton.disabled = !nomeInput.value.trim() || selectedMusicas.length === 0;
  }

  function renderResults() {
    const query = normalizeText(searchInput.value);
    const selectedIds = new Set(selectedMusicas.map((musica) => musica.id));
    const filtered = sortedMusicas
      .filter((musica) => !selectedIds.has(musica.id))
      .filter((musica) => matchesMusicaSearch(musica, query))
      .slice(0, 60);

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = selectedMusicas.length === musicas.length
        ? 'Todas as musicas ja foram incluidas.'
        : 'Nenhuma musica encontrada.';
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
        selectedMusicas.push(musica);
        searchInput.value = '';
        message.textContent = '';
        message.className = 'form-message';
        renderSelected();
        renderResults();
        resultsSlot.hidden = false;
        searchInput.focus();
        updateSubmitState();
      });

      list.append(item);
    });

    resultsSlot.replaceChildren(list);
  }

  function renderSelected() {
    if (!selectedMusicas.length) {
      selectedSlot.innerHTML = '<p class="page-status">Inclua pelo menos uma musica antes de salvar.</p>';
      return;
    }

    const list = document.createElement('div');
    list.className = 'selected-repertorio-song-list';

    selectedMusicas.forEach((musica, index) => {
      const row = document.createElement('article');
      row.className = 'selected-repertorio-song';
      row.innerHTML = `
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(formatMusicaName(musica))}</strong>
          <small>Tom: ${escapeHtml(getField(musica, ['tom', 'key']))}</small>
        </div>
        <button class="danger-button icon-button" type="button" aria-label="Remover musica">&#128465;</button>
      `;

      row.querySelector('button').addEventListener('click', () => {
        selectedMusicas.splice(index, 1);
        renderSelected();
        renderResults();
        updateSubmitState();
      });

      list.append(row);
    });

    selectedSlot.replaceChildren(list);
  }

  nomeInput.addEventListener('input', updateSubmitState);

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!nomeInput.value.trim()) {
      message.className = 'form-message error';
      message.textContent = 'Informe o nome do repertorio.';
      nomeInput.focus();
      return;
    }

    if (!selectedMusicas.length) {
      message.className = 'form-message error';
      message.textContent = 'Inclua pelo menos uma musica antes de salvar o repertorio.';
      searchInput.focus();
      return;
    }

    submitButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    const formData = new FormData(form);
    const privacyValues = getRepertorioPrivacyValues(form);
    if (privacyValues.repertorio.visibilidade === 'seletivo' && !privacyValues.compartilhadoCom.length) {
      message.className = 'form-message error';
      message.textContent = 'Selecione pelo menos um usuario para o compartilhamento seletivo.';
      updateSubmitState();
      return;
    }

    const { error: saveError } = await createRepertorioComMusicas({
      nome: String(formData.get('nome') || '').trim(),
      data: String(formData.get('data') || '') || null,
      ...privacyValues.repertorio,
    }, selectedMusicas, privacyValues.compartilhadoCom);

    if (saveError) {
      message.className = 'form-message error';
      message.textContent = saveError.message || 'Nao foi possivel salvar o repertorio.';
      updateSubmitState();
      return;
    }

    message.className = 'form-message success';
    message.textContent = 'Repertorio salvo com sucesso.';
    window.location.reload();
  });

  renderSelected();
  renderResults();
  updateSubmitState();

  return form;
}

function createReadOnlyNotice(text, items = []) {
  const notice = document.createElement('section');
  notice.className = 'page-status role-notice';
  notice.innerHTML = `
    <p>${escapeHtml(text)}</p>
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
  return notice;
}

function sortMusicasByName(musicas) {
  return [...musicas].sort((a, b) => (
    formatMusicaName(a).localeCompare(formatMusicaName(b), 'pt-BR', { sensitivity: 'base' })
  ));
}

function matchesMusicaSearch(musica, query) {
  if (!query) return true;

  return normalizeText([
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getField(musica, ['tags']),
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

function createRepertoriosBrowser(repertorios) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser repertorios-browser';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label>
        Buscar repertorio
        <input class="search-input" type="search" placeholder="Nome ou data">
      </label>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];

  function render() {
    const query = normalizeText(searchInput.value);
    currentResults = repertorios
      .filter((repertorio) => matchesRepertorioSearch(repertorio, query))
      .sort((a, b) => compareText(
        getField(a, ['nome', 'titulo', 'name']),
        getField(b, ['nome', 'titulo', 'name']),
      ));

    if (!repertorios.length) {
      tableSlot.replaceChildren(createStatus('Nenhum repertorio cadastrado ainda.'));
      return;
    }

    if (!currentResults.length) {
      tableSlot.replaceChildren(createStatus('Nenhum repertorio encontrado para esta busca.'));
      return;
    }

    tableSlot.replaceChildren(createRepertoriosTable(currentResults));
  }

  searchInput.addEventListener('input', () => {
    render();
    tableSlot.hidden = false;
  });

  searchInput.addEventListener('focus', () => {
    render();
    tableSlot.hidden = false;
  });

  searchInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      if (!isPointerInsideResults) {
        tableSlot.hidden = true;
      }
    }, 120);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !currentResults.length) return;

    event.preventDefault();
    window.location.href = getRepertorioUrl(currentResults[0]);
  });

  tableSlot.addEventListener('mouseenter', () => {
    isPointerInsideResults = true;
    tableSlot.hidden = false;
  });

  tableSlot.addEventListener('mouseleave', () => {
    isPointerInsideResults = false;

    if (document.activeElement !== searchInput) {
      tableSlot.hidden = true;
    }
  });

  render();
  return wrapper;
}

function createStatus(text) {
  const status = document.createElement('p');
  status.className = 'page-status';
  status.textContent = text;
  return status;
}

function matchesRepertorioSearch(repertorio, query) {
  if (!query) return true;

  return normalizeText([
    getField(repertorio, ['nome', 'titulo', 'name']),
    formatDate(getField(repertorio, ['data', 'date'])),
  ].join(' ')).includes(query);
}

function createRepertoriosTable(repertorios) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nome</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  repertorios.forEach((repertorio) => {
    const row = document.createElement('tr');
    const id = getField(repertorio, ['id']);
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);

    row.innerHTML = `
      <td><a href="${escapeHtml(getRepertorioUrl(repertorio))}">${escapeHtml(nome)}</a></td>
      <td>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</td>
    `;
    body.append(row);
  });

  return table;
}

function getRepertorioUrl(repertorio) {
  return `/repertorios/detalhe?id=${encodeURIComponent(getField(repertorio, ['id']))}`;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function getField(record, names) {
  const fieldName = names.find((name) => record[name]);
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
