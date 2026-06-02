import { MusicaForm } from '../components/MusicaForm.js';
import { createMusica, listMusicas, updateMusica } from '../../../services/musicasService.js';
import { markSugestaoMusicaAprovada } from '../../../services/sugestoesMusicasService.js';
import { canEditContent } from '../../auth/roles.js';

export async function MusicasPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel);
  const page = document.createElement('section');
  page.className = 'page musicas-page';
  page.innerHTML = `
    <h1>Musicas Cifradas</h1>
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

    if (canEdit) {
      renderForm(formSlot, { musicas, pendingSugestao, session });
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
  const initialValues = selectedMusica || pendingSugestao || {};

  formSlot.replaceChildren(MusicaForm({
    initialValues: {
      titulo: initialValues.titulo || '',
      artista: initialValues.artista || '',
      tom: initialValues.tom || '',
      tags: initialValues.tags || '',
      musica_link: initialValues.musica_link || '',
      cifra_original: initialValues.cifra_original || '',
      cifra_chordpro: initialValues.cifra_chordpro || initialValues.chordpro || initialValues.conteudo_chordpro || '',
    },
    submitLabel: selectedMusica ? 'Salvar alteracoes' : 'Salvar musica',
    keepValuesAfterSubmit: Boolean(selectedMusica),
    onSubmit: async (musica) => {
      const result = selectedMusica
        ? await updateMusica(selectedMusica.id, musica)
        : await createMusica(musica);

      if (result.error) {
        throw result.error;
      }

      if (!selectedMusica) {
        if (pendingSugestao?.sugestao_id && result.data?.id) {
          const { error: sugestaoError } = await markSugestaoMusicaAprovada(pendingSugestao.sugestao_id, {
            musica_id: result.data.id,
            revisado_por: pendingSugestao.revisado_por || session?.user?.id,
          });

          if (sugestaoError) {
            throw sugestaoError;
          }

          clearPendingSugestaoMusica();
        }

        window.location.reload();
        return;
      }

      const index = musicas.findIndex((item) => item.id === selectedMusica.id);

      if (index >= 0) {
        musicas[index] = { ...musicas[index], ...musica };
      }
    },
  }));
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
      <label>
        Ordenar
        <select class="sort-select">
          <option value="titulo">Titulo</option>
          <option value="artista">Artista</option>
          <option value="recentes">Mais recentes</option>
        </select>
      </label>
    </div>
    <p class="list-summary"></p>
    <div class="table-slot search-results" hidden></div>
  `;

  const searchInput = wrapper.querySelector('.search-input');
  const sortSelect = wrapper.querySelector('.sort-select');
  const summary = wrapper.querySelector('.list-summary');
  const tableSlot = wrapper.querySelector('.table-slot');
  let isPointerInsideResults = false;

  function render() {
    const query = normalizeText(searchInput.value);
    const filtered = musicas
      .filter((musica) => matchesSearch(musica, query))
      .sort((a, b) => compareMusicas(a, b, sortSelect.value));

    summary.textContent = formatSummary(filtered.length, musicas.length);

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
  sortSelect.addEventListener('change', render);
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
      <td><a href="${escapeHtml(musicaUrl)}">${escapeHtml(title)}</a></td>
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

      if (event.target.closest('a')) return;
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

function compareMusicas(a, b, sortBy) {
  if (sortBy === 'recentes') {
    return compareText(getField(b, ['created_at']), getField(a, ['created_at']));
  }

  return compareText(
    getField(a, getSortFieldNames(sortBy)),
    getField(b, getSortFieldNames(sortBy)),
  );
}

function getSortFieldNames(sortBy) {
  const fields = {
    artista: ['artista', 'autor', 'artist'],
    titulo: ['titulo', 'nome', 'title'],
  };

  return fields[sortBy] || fields.titulo;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function formatSummary(filteredCount, totalCount) {
  if (filteredCount === totalCount) {
    return `${totalCount} musica${totalCount === 1 ? '' : 's'} cadastrada${totalCount === 1 ? '' : 's'}.`;
  }

  return `${filteredCount} de ${totalCount} musica${totalCount === 1 ? '' : 's'} encontrada${filteredCount === 1 ? '' : 's'}.`;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
