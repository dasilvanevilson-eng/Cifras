import {
  countMusicasNoRepertorio,
  deleteMusica,
  deleteRepertorios,
  getMusicaById,
  listRepertoriosComMusica,
  removeMusicaDeTodosRepertorios,
} from '../../../services/musicasService.js';
import { canEditContent } from '../../auth/roles.js';
import { convertCifraOriginalToNumbers, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';

export async function MusicaDetalhePage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Musica nao informada.';
    return page;
  }

  try {
    const { data: musica, error } = await getMusicaById(id);

    if (error) {
      throw error;
    }

    page.replaceChildren(createMusicaView(musica, {
      canEdit: canEditContent(session?.profile?.papel),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createMusicaView(musica, options = {}) {
  const wrapper = document.createElement('article');
  wrapper.className = 'song-view';

  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(musica, ['tom', 'key']);
  const cifraOriginal = getField(musica, ['cifra_original']);

  wrapper.innerHTML = `
    <a class="back-link" href="/musicas">Voltar para musicas</a>
    <div class="page-actions"></div>
    <header class="song-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(artist)} - Tom: <span class="current-key">${escapeHtml(key)}</span></p>
    </header>
    <div class="transpose-toolbar">
      <button class="nav-button" type="button" data-action="transpose-down">-1 semitom</button>
      <span data-role="transpose-status">Original</span>
      <button class="nav-button" type="button" data-action="transpose-up">+1 semitom</button>
      <button class="nav-button" type="button" data-action="transpose-reset">Original</button>
      <button class="nav-button" type="button" data-action="numbers">Numeros</button>
      <button class="nav-button" type="button" data-action="print">Imprimir</button>
      <label>
        Capotraste
        <select data-action="capo">
          ${createCapoOptions()}
        </select>
      </label>
    </div>
    <pre class="chordpro-view">${escapeHtml(cifraOriginal)}</pre>
  `;

  setupTransposeControls(wrapper, { cifraOriginal, key });

  if (options.canEdit) {
    const actions = wrapper.querySelector('.page-actions');
    actions.innerHTML = `<a class="button-link" href="/musicas/editar?id=${encodeURIComponent(musica.id)}">Editar</a>`;
    actions.append(createDeleteButton(musica.id, title));
  }

  return wrapper;
}

function setupTransposeControls(wrapper, { cifraOriginal, key }) {
  const chordproView = wrapper.querySelector('.chordpro-view');
  const currentKey = wrapper.querySelector('.current-key');
  const status = wrapper.querySelector('[data-role="transpose-status"]');
  const downButton = wrapper.querySelector('[data-action="transpose-down"]');
  const upButton = wrapper.querySelector('[data-action="transpose-up"]');
  const resetButton = wrapper.querySelector('[data-action="transpose-reset"]');
  const numbersButton = wrapper.querySelector('[data-action="numbers"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  let semitones = 0;
  let capo = 0;
  let showNumbers = false;

  function render() {
    const displayedCifra = transposeCifraOriginal(cifraOriginal, semitones - capo);
    const displayedKey = transposeKey(key, semitones);
    chordproView.textContent = showNumbers ? convertCifraOriginalToNumbers(displayedCifra, displayedKey) : displayedCifra;
    currentKey.textContent = displayedKey;
    status.textContent = formatTransposeStatus(semitones, capo);
    numbersButton.textContent = showNumbers ? 'Cifras' : 'Numeros';
  }

  downButton.addEventListener('click', () => {
    semitones -= 1;
    render();
  });

  upButton.addEventListener('click', () => {
    semitones += 1;
    render();
  });

  resetButton.addEventListener('click', () => {
    semitones = 0;
    render();
  });

  numbersButton.addEventListener('click', () => {
    showNumbers = !showNumbers;
    render();
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    render();
  });

  printButton.addEventListener('click', () => {
    window.print();
  });
}

function createCapoOptions() {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `Casa ${index}`}</option>`
  )).join('');
}

function formatTransposeStatus(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Original'
    : `${semitones > 0 ? '+' : ''}${semitones} semitom${Math.abs(semitones) === 1 ? '' : 's'}`;

  return capo > 0 ? `${transposeText} | Capo ${capo}` : transposeText;
}

function createDeleteButton(musicaId, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button';
  button.textContent = 'Excluir';

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Verificando...';

    const { data: vinculos, error: vinculosError } = await listRepertoriosComMusica(musicaId);

    if (vinculosError) {
      button.disabled = false;
      button.textContent = 'Excluir';
      window.alert(vinculosError.message || 'Nao foi possivel verificar se a musica esta em repertorios.');
      return;
    }

    let repertorios = [];

    try {
      repertorios = await loadRepertoriosAfetados(vinculos || []);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Excluir';
      window.alert(error.message || 'Nao foi possivel verificar se algum repertorio ficara vazio.');
      return;
    }

    const repertoriosParaExcluir = repertorios.filter((repertorio) => repertorio.ficaraVazio);
    const confirmed = window.confirm(createDeleteConfirmationMessage(title, repertorios));
    if (!confirmed) {
      button.disabled = false;
      button.textContent = 'Excluir';
      return;
    }

    button.textContent = repertorios.length ? 'Removendo vinculos...' : 'Excluindo...';

    if (repertorios.length) {
      const { error: removeError } = await removeMusicaDeTodosRepertorios(musicaId);

      if (removeError) {
        button.disabled = false;
        button.textContent = 'Excluir';
        window.alert(removeError.message || 'Nao foi possivel remover a musica dos repertorios.');
        return;
      }
    }

    if (repertoriosParaExcluir.length) {
      button.textContent = 'Excluindo repertorios vazios...';

      const { error: repertoriosError } = await deleteRepertorios(repertoriosParaExcluir.map((repertorio) => repertorio.id));

      if (repertoriosError) {
        button.disabled = false;
        button.textContent = 'Excluir';
        window.alert(repertoriosError.message || 'A musica foi removida dos repertorios, mas nao foi possivel excluir repertorios vazios.');
        return;
      }
    }

    button.textContent = 'Excluindo...';

    const { error } = await deleteMusica(musicaId);

    if (error) {
      button.disabled = false;
      button.textContent = 'Excluir';
      window.alert(getDeleteErrorMessage(error));
      return;
    }

    window.location.href = '/musicas';
  });

  return button;
}

async function loadRepertoriosAfetados(vinculos) {
  const repertorios = vinculos
    .map((vinculo) => vinculo.repertorios)
    .filter(Boolean)
    .map((repertorio) => ({
      id: repertorio.id,
      nome: getField(repertorio, ['nome', 'titulo', 'name']),
      data: formatDate(getField(repertorio, ['data', 'date'])),
    }));

  const repertoriosComContagem = await Promise.all(repertorios.map(async (repertorio) => {
    const { count, error } = await countMusicasNoRepertorio(repertorio.id);

    if (error) {
      throw error;
    }

    return {
      ...repertorio,
      totalMusicas: Number(count || 0),
      ficaraVazio: Number(count || 0) <= 1,
    };
  }));

  return repertoriosComContagem;
}

function createDeleteConfirmationMessage(title, repertorios) {
  if (!repertorios.length) {
    return `Excluir a musica "${title}"? Esta acao nao pode ser desfeita.`;
  }

  const repertoriosList = repertorios
    .map((repertorio) => {
      const data = repertorio.data !== '-' ? ` (${repertorio.data})` : '';
      const vazio = repertorio.ficaraVazio ? ' - sera excluido porque ficara sem musicas' : '';
      return `- ${repertorio.nome}${data}${vazio}`;
    })
    .join('\n');

  return [
    `A musica "${title}" esta presente nos seguintes repertorios:`,
    '',
    repertoriosList,
    '',
    'Se confirmar, a musica sera removida desses repertorios e excluida definitivamente.',
    'Repertorios que ficarem sem nenhuma musica tambem serao excluidos.',
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
