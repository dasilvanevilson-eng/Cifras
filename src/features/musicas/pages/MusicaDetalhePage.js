import {
  deleteMusica,
  deleteMusicaComVinculos,
  getMusicaById,
  listRepertoriosComMusica,
} from '../../../services/musicasService.js';
import { updateTomMusicaRepertorio } from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { convertCifraOriginalToNumbers, getCifraExibicao, getTransposeSemitones, getVoiceLabelsFromMusica, renderCifraOriginalForDisplayHtml, renderMusicaCifraForDisplayHtml, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';
import { fitPreformattedTextToWidth } from '../../../utils/performanceFontFit.js';
import { addRecentItem } from '../../../utils/recentItems.js';

const MAX_REPERTORIO_SONG_FONT_SIZE = 128;
const MAX_REPERTORIO_SONG_AUTO_FIT_FONT_SIZE = 16;

export async function MusicaDetalhePage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const returnTo = params.get('returnTo') || '/musicas';
  const associationId = params.get('associationId');
  const repertorioTom = params.get('repertorioTom');

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

    addRecentItem({
      type: 'musica',
      label: getField(musica, ['titulo', 'nome', 'title']),
      detail: getField(musica, ['artista', 'autor', 'artist']),
      url: `/musicas/detalhe?id=${encodeURIComponent(id)}`,
    });

    page.replaceChildren(createMusicaView(musica, {
      canEdit: canEditContent(session?.profile?.papel) && !associationId,
      returnTo,
      associationId,
      repertorioTom,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createMusicaView(musica, options = {}) {
  const wrapper = document.createElement('article');
  const isRepertorioView = Boolean(options.associationId);
  wrapper.className = isRepertorioView ? 'song-view repertorio-song-view' : 'song-view';

  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const originalKey = getField(musica, ['tom', 'key']);
  const key = options.repertorioTom || originalKey;
  const tags = normalizeTags(getField(musica, ['tags']));
  const link = getField(musica, ['musica_link']);
  const cifraOriginal = getField(musica, ['cifra_original']);
  const cifraExibicao = getCifraExibicao(musica);

  wrapper.innerHTML = `
    ${isRepertorioView ? '' : `<a class="back-link" href="${escapeHtml(options.returnTo || '/musicas')}" data-action="back">Voltar</a>`}
    <div class="page-actions"></div>
    <header class="song-header">
      ${isRepertorioView ? '' : `
        <div class="song-title-row">
          <h1>${escapeHtml(title)}</h1>
        </div>
        <p>${escapeHtml(artist)} - Tom: <span class="current-key">${escapeHtml(key)}</span></p>
      `}
      ${!isRepertorioView && tags.length ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${!isRepertorioView && link && link !== '-' ? `<p><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Abrir link da musica</a></p>` : ''}
    </header>
    <div class="transpose-toolbar">
      ${isRepertorioView ? `<a class="button-link secondary icon-action back-icon-action song-toolbar-back" href="${escapeHtml(options.returnTo || '/musicas')}" data-action="back" aria-label="Sair" title="Sair">Sair</a>` : ''}
      ${isRepertorioView
        ? '<div class="key-stepper" role="group" aria-label="Ajuste de tom"><button class="nav-button" type="button" data-action="transpose-down">-1/2</button><span data-role="transpose-status">Tom</span><button class="nav-button" type="button" data-action="transpose-up">+1/2</button></div>'
        : '<button class="nav-button" type="button" data-action="transpose-down">-1 semitom</button><span data-role="transpose-status">Original</span><button class="nav-button" type="button" data-action="transpose-up">+1 semitom</button>'}
      ${isRepertorioView ? '' : '<button class="nav-button" type="button" data-action="transpose-reset">Original</button>'}
      ${isRepertorioView ? '' : '<button class="nav-button" type="button" data-action="numbers">Numeros</button>'}
      <button class="nav-button${isRepertorioView ? ' icon-button' : ''}" type="button" data-action="print" aria-label="Imprimir" title="Imprimir">${isRepertorioView ? '&#128424;' : 'Imprimir'}</button>
      ${isRepertorioView ? '<div class="font-stepper" role="group" aria-label="Tamanho da fonte"><button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button><button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button></div>' : ''}
      ${isRepertorioView ? '<button class="nav-button icon-button theme-toggle-button" type="button" data-action="theme" aria-label="Alternar tela clara e escura" title="Alternar tela clara e escura"></button>' : ''}
      <label>
        ${isRepertorioView ? '' : 'Capotraste'}
        <select data-action="capo">
          ${createCapoOptions({ useCapoLabel: isRepertorioView })}
        </select>
      </label>
      ${isRepertorioView && link && link !== '-' ? `<a class="button-link secondary toolbar-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Link</a>` : ''}
    </div>
    ${isRepertorioView ? `
      <div class="repertorio-song-title-bar">
        <h1>${escapeHtml(title)}</h1>
      </div>
    ` : ''}
    <pre class="chordpro-view">${renderMusicaCifraForDisplayHtml(musica, { cifra: cifraExibicao })}</pre>
  `;

  setupTransposeControls(wrapper, {
    cifraOriginal: cifraExibicao,
    voiceLabels: getVoiceLabelsFromMusica(musica),
    originalKey,
    key,
    associationId: options.associationId,
    useFractionStep: isRepertorioView,
    defaultStatusLabel: isRepertorioView ? 'Tom' : 'Original',
    returnTo: options.returnTo || '/musicas',
  });

  if (options.canEdit) {
    const actions = wrapper.querySelector('.page-actions');
    actions.innerHTML = `<a class="button-link" href="/musicas/editar?id=${encodeURIComponent(musica.id)}">Editar</a>`;
    actions.append(createDeleteButton(musica.id, title));
  }

  return wrapper;
}

function normalizeTags(value) {
  if (!value || value === '-') return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);

  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function setupTransposeControls(wrapper, { cifraOriginal, voiceLabels = {}, originalKey, key, associationId, useFractionStep, defaultStatusLabel, returnTo }) {
  if (associationId) {
    setupAutoHideToolbar(wrapper, { toolbarSelector: '.transpose-toolbar' });
  }

  const chordproView = wrapper.querySelector('.chordpro-view');
  const currentKey = wrapper.querySelector('.current-key');
  const status = wrapper.querySelector('[data-role="transpose-status"]');
  const backLink = wrapper.querySelector('[data-action="back"]');
  const downButton = wrapper.querySelector('[data-action="transpose-down"]');
  const upButton = wrapper.querySelector('[data-action="transpose-up"]');
  const resetButton = wrapper.querySelector('[data-action="transpose-reset"]');
  const numbersButton = wrapper.querySelector('[data-action="numbers"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const baseSemitones = getTransposeSemitones(originalKey, key);
  let semitones = baseSemitones;
  let capo = 0;
  let showNumbers = false;
  let fontSize = Number(window.localStorage.getItem('repertorioSongFontSize') || 18);
  let fitFontToWidth = Boolean(associationId);
  let isDark = window.localStorage.getItem('repertorioSongTheme') === 'dark';

  function applyDisplaySettings() {
    fontSize = Math.min(MAX_REPERTORIO_SONG_FONT_SIZE, Math.max(12, fontSize));
    wrapper.style.setProperty('--repertorio-song-font-size', `${fontSize}px`);
    wrapper.classList.toggle('is-dark', isDark);
    updateFontSizeStatus();

    if (themeButton) {
      themeButton.textContent = isDark ? 'Tela clara' : 'Tela escura';
      themeButton.setAttribute('aria-label', isDark ? 'Usar tela clara' : 'Usar tela escura');
      themeButton.title = isDark ? 'Usar tela clara' : 'Usar tela escura';
    }
  }

  function updateFontSizeStatus() {
    const fontSizeStatus = wrapper.querySelector('[data-role="font-size-status"]');
    if (!fontSizeStatus) return;

    fontSizeStatus.textContent = String(Math.round(Number(fontSize) || 0));
  }

  function updateFontSizeStatusValue(value) {
    const fontSizeStatus = wrapper.querySelector('[data-role="font-size-status"]');
    if (!fontSizeStatus) return;

    fontSizeStatus.textContent = String(Math.round(Number(value) || 0));
  }

  function fitRepertorioSongToWidth() {
    if (!associationId) return;

    if (!fitFontToWidth) {
      wrapper.style.setProperty('--repertorio-song-font-size', `${fontSize}px`);
      updateFontSizeStatusValue(fontSize);
      return;
    }

    fitPreformattedTextToWidth({
      wrapper,
      view: chordproView,
      desiredFontSize: fontSize,
      fitToWidth: fitFontToWidth,
      minFontSize: 12,
      maxFontSize: MAX_REPERTORIO_SONG_AUTO_FIT_FONT_SIZE,
      setFontSize: (value) => {
        wrapper.style.setProperty('--repertorio-song-font-size', `${value}px`);
        updateFontSizeStatusValue(value);
      },
    });
  }

  function render() {
    const displayedCifra = transposeCifraOriginal(cifraOriginal, semitones - capo);
    const displayedKey = transposeKey(originalKey, semitones);
    const displayHtml = showNumbers
      ? renderCifraOriginalForDisplayHtml(convertCifraOriginalToNumbers(displayedCifra, displayedKey), { voiceLabels })
      : renderCifraOriginalForDisplayHtml(displayedCifra, { voiceLabels });
    chordproView.innerHTML = displayHtml;
    if (currentKey) {
      currentKey.textContent = displayedKey;
    }
    status.textContent = formatTransposeStatus(semitones - baseSemitones, capo, useFractionStep, defaultStatusLabel);
    if (numbersButton) {
      numbersButton.textContent = showNumbers ? 'Cifras' : 'Numeros';
    }
    fitRepertorioSongToWidth();
  }

  downButton.addEventListener('click', () => {
    semitones -= 1;
    render();
  });

  upButton.addEventListener('click', () => {
    semitones += 1;
    render();
  });

  resetButton?.addEventListener('click', () => {
    semitones = 0;
    render();
  });

  numbersButton?.addEventListener('click', () => {
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

  fontDownButton?.addEventListener('click', () => {
    fitFontToWidth = false;
    fontSize -= 1;
    window.localStorage.setItem('repertorioSongFontSize', String(fontSize));
    applyDisplaySettings();
  });

  fontUpButton?.addEventListener('click', () => {
    fitFontToWidth = false;
    fontSize += 1;
    window.localStorage.setItem('repertorioSongFontSize', String(fontSize));
    applyDisplaySettings();
  });

  themeButton?.addEventListener('click', () => {
    isDark = !isDark;
    window.localStorage.setItem('repertorioSongTheme', isDark ? 'dark' : 'light');
    applyDisplaySettings();
  });

  window.addEventListener('resize', fitRepertorioSongToWidth);

  backLink.addEventListener('click', async (event) => {
    if (!associationId) return;

    event.preventDefault();

    const displayedKey = transposeKey(originalKey, semitones);

    if (displayedKey !== key) {
      const confirmed = window.confirm(`Salvar esta musica no repertorio no tom ${displayedKey}?`);

      if (confirmed) {
        const { error } = await updateTomMusicaRepertorio(associationId, displayedKey);

        if (error) {
          window.alert(error.message || 'Nao foi possivel salvar o tom no repertorio.');
          return;
        }
      }
    }

    window.location.href = returnTo;
  });

  applyDisplaySettings();
  render();
}

function createCapoOptions({ useCapoLabel = false } = {}) {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `${useCapoLabel ? 'Capo' : 'Casa'} ${index}`}</option>`
  )).join('');
}

function formatTransposeStatus(semitones, capo, useFractionStep = false, defaultStatusLabel = 'Original') {
  const transposeText = semitones === 0
    ? defaultStatusLabel
    : useFractionStep
      ? `${semitones > 0 ? '+' : ''}${semitones}/2`
      : `${semitones > 0 ? '+' : ''}${semitones}`;

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

    const confirmed = window.confirm(createDeleteConfirmationMessage(title, repertorios));
    if (!confirmed) {
      button.disabled = false;
      button.textContent = 'Excluir';
      return;
    }

    button.textContent = repertorios.length ? 'Removendo vinculos...' : 'Excluindo...';

    const { error } = repertorios.length
      ? await deleteMusicaComVinculos(musicaId)
      : await deleteMusica(musicaId);

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
