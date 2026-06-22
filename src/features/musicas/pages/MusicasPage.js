import { MusicaForm } from '../components/MusicaForm.js';
import {
  createMusica,
  deleteMusica,
  deleteMusicaComVinculos,
  listMusicas,
  listRepertoriosComMusica,
  updateMusica,
} from '../../../services/musicasService.js';
import { markSugestaoMusicaAprovada } from '../../../services/sugestoesMusicasService.js';
import { canEditContent } from '../../auth/roles.js';
import { hasPermission } from '../../auth/permissions.js';

export async function MusicasPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel) && hasPermission(session, 'musicas', 'can_edit');
  const page = document.createElement('section');
  page.className = `page musicas-page${canEdit ? ' can-edit-music' : ' read-only-music'}`;
  page.innerHTML = `
    <header class="musicas-header musicas-hero">
      <div class="musicas-hero-copy">
        <h1>Cifras <span class="musicas-summary" data-page-info-accessory aria-live="polite"><span><strong data-count="musicas">0</strong> musicas</span></span></h1>
        <p data-page-info>${canEdit ? 'Cadastre, revise, encontre e execute musicas do acervo.' : 'Busque e execute as musicas disponiveis para o seu acesso.'}</p>
      </div>
    </header>
    <section class="music-search-panel music-library-panel">
      <div class="music-library-heading">
        <div>
          <h2>Buscar ou criar cifra</h2>
          <p data-section-info>${canEdit ? 'Pesquise pelo titulo para encontrar uma cifra existente e edita-la. Quando nao houver resultado, o mesmo fluxo permite iniciar um novo cadastro no acervo.' : 'Pesquise por titulo, artista, tag ou trecho da letra para localizar e executar as cifras liberadas para o seu acesso.'}</p>
        </div>
        <span class="music-library-mode">${canEdit ? 'Modo edicao consulta alteracao exclusao' : 'Modo execucao'}</span>
      </div>
      <div class="list-slot">
        <div class="page-status">Carregando musicas...</div>
      </div>
    </section>
    <div class="page-grid musicas-content-grid">
      <section class="music-editor-panel music-editor-stage">
        <div class="form-slot"></div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');
  const musicasCount = page.querySelector('[data-count="musicas"]');
  let pendingNewMusicaTitle = '';

  try {
    const { data, error } = await listMusicas();

    if (error) {
      throw error;
    }

    const musicas = data || [];
    musicasCount.textContent = String(musicas.length);
    const pendingSugestao = canEdit ? readPendingSugestaoMusica() : null;
    const pendingSugestaoMusica = pendingSugestao?.tipo_sugestao === 'ajuste'
      ? musicas.find((musica) => musica.id === pendingSugestao.musica_origem_id)
      : null;

    if (canEdit) {
      renderForm(formSlot, {
        musicas,
        selectedMusica: pendingSugestaoMusica || null,
        pendingSugestao,
        session,
        hideTitleField: true,
      });
    } else {
      formSlot.append(createReadOnlyNotice(
        'No momento seu acesso e restrito nesta opcao.',
        [
          'Incluir novas cifras;',
          'Editar cifras cadastradas;',
          'Alterar e salvar tom da musica.',
        ],
      ));
    }

    if (!musicas.length && !canEdit) {
      status.textContent = 'Nenhuma musica cadastrada ainda.';
      return page;
    }

    listSlot.replaceChildren(createMusicasBrowser(musicas, {
      canEdit,
      onCreateDraft: (title) => {
        pendingNewMusicaTitle = title.trim();
        clearPendingSugestaoMusica();
        renderForm(formSlot, {
          musicas,
          initialTitle: pendingNewMusicaTitle,
          session,
          hideTitleField: true,
        });
      },
      onSelect: (musica) => {
        pendingNewMusicaTitle = '';
        clearPendingSugestaoMusica();
        renderForm(formSlot, { musicas, selectedMusica: musica, session, hideTitleField: true });
        window.scrollTo({ top: formSlot.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
      },
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as musicas.';
  }

  return page;
}

function renderForm(formSlot, { musicas, selectedMusica = null, pendingSugestao = null, initialTitle = '', session = {}, hideTitleField = false }) {
  const initialValues = pendingSugestao || selectedMusica || {};
  const reviewerName = getReviewerName(session);

  formSlot.replaceChildren(MusicaForm({
    initialValues: {
      titulo: initialValues.titulo || initialTitle || '',
      artista: initialValues.artista || '',
      tom: initialValues.tom || '',
      tags: initialValues.tags || '',
      musica_link: initialValues.musica_link || '',
      colaborador_nome: initialValues.colaborador_nome || '',
      revisado_por_nome: selectedMusica?.revisado_por_nome || pendingSugestao?.revisado_por_nome || reviewerName,
      cifra_original: initialValues.cifra_original || '',
      cifra_chordpro: initialValues.cifra_chordpro || initialValues.chordpro || initialValues.conteudo_chordpro || '',
      cifra_exibicao: initialValues.cifra_exibicao || '',
      cifra_editor_state: initialValues.cifra_editor_state || null,
    },
    submitLabel: selectedMusica ? 'Salvar alteracoes' : 'Salvar musica',
    canDelete: Boolean(selectedMusica),
    hideTitleField,
    onClear: () => {
      clearPendingSugestaoMusica();
      renderForm(formSlot, { musicas, session, hideTitleField });
    },
    onDelete: selectedMusica
      ? async () => {
        const deleted = await deleteSelectedMusica(selectedMusica);

        if (!deleted) {
          return false;
        }

        removeMusicaFromList(musicas, selectedMusica.id);
        renderForm(formSlot, { musicas, session, hideTitleField });
        return true;
      }
      : null,
    onSubmit: async (musica) => {
      const result = selectedMusica
        ? await updateMusica(selectedMusica.id, musica)
        : await createMusica(musica);

      if (result.error) {
        throw result.error;
      }

      if (pendingSugestao?.sugestao_id) {
        const { error: sugestaoError } = await markSugestaoMusicaAprovada(pendingSugestao.sugestao_id, {
          musica_id: result.data?.id || selectedMusica?.id,
          revisado_por: pendingSugestao.revisado_por || session?.user?.id,
        });

        if (sugestaoError) {
          throw sugestaoError;
        }

        clearPendingSugestaoMusica();
      }

      window.location.href = '/musicas';
      return;
    },
  }));
}

function getReviewerName(session = {}) {
  return session?.profile?.nome || session?.user?.email || 'Usuario';
}

async function deleteSelectedMusica(musica) {
  const musicaId = musica?.id;
  const title = getField(musica, ['titulo', 'nome', 'title']);

  if (!musicaId) {
    throw new Error('Musica nao informada para exclusao.');
  }

  const { data: vinculos, error: vinculosError } = await listRepertoriosComMusica(musicaId);

  if (vinculosError) {
    throw vinculosError;
  }

  const repertorios = await loadRepertoriosAfetados(vinculos || []);
  const confirmed = window.confirm(createDeleteConfirmationMessage(title, repertorios));

  if (!confirmed) {
    return false;
  }

  const { error } = repertorios.length
    ? await deleteMusicaComVinculos(musicaId)
    : await deleteMusica(musicaId);

  if (error) {
    throw new Error(getDeleteErrorMessage(error));
  }

  return true;
}

async function loadRepertoriosAfetados(vinculos) {
  return vinculos
    .map((vinculo) => vinculo.repertorios)
    .filter(Boolean)
    .map((repertorio) => ({
      id: repertorio.id,
      nome: getField(repertorio, ['nome', 'titulo', 'name']),
      data: formatDate(getField(repertorio, ['data', 'date'])),
    }));
}

function createDeleteConfirmationMessage(title, repertorios) {
  if (!repertorios.length) {
    return `Excluir a musica "${title}"? Esta acao nao pode ser desfeita.`;
  }

  const repertoriosList = repertorios
    .map((repertorio) => {
      const data = repertorio.data !== '-' ? ` (${repertorio.data})` : '';
      return `- ${repertorio.nome}${data}`;
    })
    .join('\n');

  return [
    `A musica "${title}" faz parte de um ou mais repertorios.`,
    'Ao confirmar, ela sera excluida do acervo, mas continuara visivel nos repertorios abaixo como "musica excluida".',
    'Depois, ela podera ser removida manualmente de cada repertorio pelo botao de remover.',
    '',
    'Repertorios vinculados:',
    '',
    repertoriosList,
    '',
    'Confirma a exclusao?',
  ].join('\n');
}

function getDeleteErrorMessage(error) {
  if (error?.code === '23503') {
    return 'Esta musica ainda esta vinculada a um ou mais repertorios. Tente novamente ou remova manualmente antes de excluir.';
  }

  return error?.message || 'Nao foi possivel excluir a musica.';
}

function removeMusicaFromList(musicas, musicaId) {
  const index = musicas.findIndex((item) => item.id === musicaId);

  if (index >= 0) {
    musicas.splice(index, 1);
  }
}

function readPendingSugestaoMusica() {
  try {
    const value = window.sessionStorage.getItem('masterCifras.pendingSugestaoMusica');
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

function clearPendingSugestaoMusica() {
  window.sessionStorage.removeItem('masterCifras.pendingSugestaoMusica');
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

function createMusicasBrowser(musicas, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser musicas-browser';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label class="music-library-search">
        <span>${options.canEdit ? 'Titulo da cifra' : 'Buscar no acervo'}</span>
        <input class="search-input" type="search" placeholder="${options.canEdit ? 'Digite o titulo da cifra' : 'Titulo, artista ou trecho da cifra'}">
      </label>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;
  let currentResults = [];
  let createDraftTimer = null;
  let lastDraftTitle = '';

  function getSearchValue() {
    return searchInput.value.trim();
  }

  function findExactMusica(value) {
    const query = normalizeText(value);
    if (!query) return null;

    return musicas.find((musica) => normalizeText(getField(musica, ['titulo', 'nome', 'title'])) === query) || null;
  }

  function scheduleCreateDraft() {
    if (!options.onCreateDraft) return;

    window.clearTimeout(createDraftTimer);
    createDraftTimer = window.setTimeout(() => {
      const value = getSearchValue();
      const exactMatch = findExactMusica(value);

      if (!value || exactMatch || normalizeText(value) === normalizeText(lastDraftTitle)) return;

      lastDraftTitle = value;
      options.onCreateDraft(value);
    }, 220);
  }

  function render() {
    const query = normalizeText(searchInput.value);
    currentResults = musicas
      .filter((musica) => matchesSearch(musica, query))
      .sort((a, b) => compareText(getField(a, ['titulo', 'nome', 'title']), getField(b, ['titulo', 'nome', 'title'])));

    if (!currentResults.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = options.canEdit
        ? 'Nenhuma cifra encontrada. O formulario abaixo sera preparado para incluir este titulo.'
        : 'Nenhuma musica encontrada para esta busca.';
      tableSlot.replaceChildren(empty);
      return;
    }

    tableSlot.replaceChildren(createMusicasTable(currentResults, {
      ...options,
      onSelect: (musica) => {
        window.clearTimeout(createDraftTimer);
        lastDraftTitle = '';
        searchInput.value = getField(musica, ['titulo', 'nome', 'title']);
        tableSlot.hidden = true;

        if (options.onSelect) {
          options.onSelect(musica);
        }
      },
    }));
  }

  searchInput.addEventListener('input', () => {
    render();
    tableSlot.hidden = false;
    scheduleCreateDraft();
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
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();

    if (currentResults.length) {
      const exactMatch = findExactMusica(getSearchValue());
      const selectedMusica = exactMatch || currentResults[0];
      window.clearTimeout(createDraftTimer);
      lastDraftTitle = '';
      searchInput.value = getField(selectedMusica, ['titulo', 'nome', 'title']);
      tableSlot.hidden = true;
      options.onSelect?.(selectedMusica);
      return;
    }

    if (options.onCreateDraft && getSearchValue()) {
      window.clearTimeout(createDraftTimer);
      lastDraftTitle = getSearchValue();
      options.onCreateDraft(getSearchValue());
      tableSlot.hidden = true;
    }
  });
  render();

  return wrapper;
}

function createMusicasTable(musicas, options = {}) {
  const list = document.createElement('div');
  list.className = 'musicas-results-list';

  musicas.forEach((musica) => {
    const id = getField(musica, ['id']);
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const artist = getField(musica, ['artista', 'autor', 'artist']);
    const key = getField(musica, ['tom', 'key']);
    const tags = formatTags(getField(musica, ['tags']));
    const readOnlyUrl = getReadOnlyMusicaUrl(id);
    const card = document.createElement('article');
    card.tabIndex = 0;
    card.className = 'musica-result-card';

    card.innerHTML = `
      <div class="musica-result-main">
        <span class="musica-result-type">Cifra</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(artist)}</p>
      </div>
      <div class="musica-result-meta" aria-label="Informacoes da musica">
        <span>${escapeHtml(key !== '-' ? key : 'Sem tom')}</span>
        <small>${escapeHtml(tags)}</small>
      </div>
      <div class="musica-result-actions">
        <a class="button-link secondary" href="${escapeHtml(readOnlyUrl)}">Executar</a>
        ${options.canEdit ? '<button class="nav-button" type="button" data-action="select-music">Editar</button>' : ''}
      </div>
    `;
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;

      if (options.canEdit && options.onSelect) {
        event.preventDefault();
        options.onSelect(musica);
        return;
      }

      window.location.href = readOnlyUrl;
    });
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      if (event.target.closest('a, button')) return;

      if (options.canEdit && options.onSelect) {
        options.onSelect(musica);
        return;
      }

      window.location.href = readOnlyUrl;
    });
    card.querySelector('[data-action="select-music"]')?.addEventListener('click', () => {
      if (options.onSelect) {
        options.onSelect(musica);
      }
    });
    list.append(card);
  });

  return list;
}

function getReadOnlyMusicaUrl(id) {
  const params = new URLSearchParams({
    id: String(id),
    returnTo: '/musicas',
  });

  return `/musicas/execucao?${params.toString()}`;
}

function matchesSearch(musica, query) {
  if (!query) return true;

  const searchableText = [
    getField(musica, ['titulo', 'nome', 'title']),
    getField(musica, ['artista', 'autor', 'artist']),
    getField(musica, ['tags']),
    getField(musica, ['musica_link']),
    getField(musica, ['cifra_original']),
    getField(musica, ['cifra_chordpro', 'chordpro', 'conteudo_chordpro']),
  ].join(' ');

  return normalizeText(searchableText).includes(query);
}

function formatTags(value) {
  if (!value || value === '-') return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
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
  return fieldName ? record[fieldName] : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = String(value).split('-');
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
