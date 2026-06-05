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

export async function MusicasPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel);
  const page = document.createElement('section');
  page.className = 'page musicas-page';
  page.innerHTML = `
    <section class="music-search-panel">
      <div class="list-slot">
        <div class="page-status">Carregando musicas...</div>
      </div>
    </section>
    <div class="page-grid">
      <section>
        <div class="form-slot"></div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  try {
    const { data, error } = await listMusicas();

    if (error) {
      throw error;
    }

    const musicas = data || [];
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
      });
    } else {
      formSlot.append(createReadOnlyNotice('Seu perfil pode visualizar musicas cifradas, mas nao cadastrar ou editar.'));
    }

    if (!musicas.length) {
      status.textContent = 'Nenhuma musica cadastrada ainda.';
      return page;
    }

    listSlot.replaceChildren(createMusicasBrowser(musicas, {
      canEdit,
      onSelect: (musica) => {
        clearPendingSugestaoMusica();
        renderForm(formSlot, { musicas, selectedMusica: musica, session });
        window.scrollTo({ top: formSlot.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
      },
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as musicas.';
  }

  return page;
}

function renderForm(formSlot, { musicas, selectedMusica = null, pendingSugestao = null, session = {} }) {
  const initialValues = pendingSugestao || selectedMusica || {};

  formSlot.replaceChildren(MusicaForm({
    initialValues: {
      titulo: initialValues.titulo || '',
      artista: initialValues.artista || '',
      tom: initialValues.tom || '',
      tags: initialValues.tags || '',
      musica_link: initialValues.musica_link || '',
      cifra_original: initialValues.cifra_original || '',
      cifra_chordpro: initialValues.cifra_chordpro || initialValues.chordpro || initialValues.conteudo_chordpro || '',
      cifra_exibicao: initialValues.cifra_exibicao || '',
    },
    submitLabel: selectedMusica ? 'Salvar alteracoes' : 'Salvar musica',
    canDelete: Boolean(selectedMusica),
    onClear: () => {
      clearPendingSugestaoMusica();
      renderForm(formSlot, { musicas, session });
    },
    onDelete: selectedMusica
      ? async () => {
        const deleted = await deleteSelectedMusica(selectedMusica);

        if (!deleted) {
          return false;
        }

        removeMusicaFromList(musicas, selectedMusica.id);
        renderForm(formSlot, { musicas, session });
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

function createReadOnlyNotice(text) {
  const notice = document.createElement('p');
  notice.className = 'page-status';
  notice.textContent = text;
  return notice;
}

function createMusicasBrowser(musicas, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-browser';
  wrapper.innerHTML = `
    <div class="list-toolbar">
      <label>
        Buscar
        <input class="search-input" type="search" placeholder="Titulo, artista ou trecho da cifra">
      </label>
    </div>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;

  function render() {
    const query = normalizeText(searchInput.value);
    const filtered = musicas
      .filter((musica) => matchesSearch(musica, query))
      .sort((a, b) => compareText(getField(a, ['titulo', 'nome', 'title']), getField(b, ['titulo', 'nome', 'title'])));

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'page-status';
      empty.textContent = 'Nenhuma musica encontrada para esta busca.';
      tableSlot.replaceChildren(empty);
      return;
    }

    tableSlot.replaceChildren(createMusicasTable(filtered, {
      ...options,
      onSelect: (musica) => {
        searchInput.value = getField(musica, ['titulo', 'nome', 'title']);
        tableSlot.hidden = true;

        if (options.onSelect) {
          options.onSelect(musica);
        }
      },
    }));
  }

  searchInput.addEventListener('input', render);
  searchInput.addEventListener('focus', () => {
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
  render();

  return wrapper;
}

function createMusicasTable(musicas, options = {}) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Titulo</th>
        <th>Artista</th>
        <th>Tom</th>
        <th>Tags</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  musicas.forEach((musica) => {
    const row = document.createElement('tr');
    const id = getField(musica, ['id']);
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const musicaUrl = `/musicas/detalhe?id=${encodeURIComponent(id)}`;

    row.innerHTML = `
      <td>${options.canEdit ? escapeHtml(title) : `<a href="${escapeHtml(musicaUrl)}">${escapeHtml(title)}</a>`}</td>
      <td>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</td>
      <td>${escapeHtml(getField(musica, ['tom', 'key']))}</td>
      <td>${escapeHtml(formatTags(getField(musica, ['tags'])))}</td>
    `;
    row.tabIndex = 0;
    row.className = 'clickable-row';
    row.addEventListener('click', (event) => {
      if (options.canEdit && options.onSelect) {
        event.preventDefault();
        options.onSelect(musica);
        return;
      }

      window.location.href = musicaUrl;
    });
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      if (options.canEdit && options.onSelect) {
        options.onSelect(musica);
        return;
      }

      window.location.href = musicaUrl;
    });
    body.append(row);
  });

  return table;
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
