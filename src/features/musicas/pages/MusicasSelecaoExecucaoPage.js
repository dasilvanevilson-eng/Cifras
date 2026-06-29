import { listMusicas } from '../../../services/musicasService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraExibicao, renderMusicaCifraForDisplayHtml, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';
import {
  createPerformanceToolbar,
  fitCifraToWidth,
  formatTransposeStatus,
  getCurrentPerformanceFontSize,
  getDefaultTwoColumnView,
  MAX_PERFORMANCE_FONT_SIZE,
  setPerformanceFontSize,
  setPerformanceSongLinkState,
  setPerformanceTheme,
  setTwoColumnView,
  setupSongGestureNavigation,
  toggleInternalFullscreen,
} from '../../performance/performanceControls.js';
import { createPerformanceSongBlock } from '../../performance/performanceSong.js';

export async function MusicasSelecaoExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page';
  page.innerHTML = '<div class="page-status">Carregando selecao...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const ids = String(params.get('ids') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const initialMusicaId = params.get('musicaId') || '';
  const returnTo = params.get('returnTo') || '/dashboard';

  if (ids.length < 2) {
    status.className = 'page-status error';
    status.textContent = 'Selecione pelo menos duas musicas para executar a selecao.';
    return page;
  }

  try {
    const { data, error } = await listMusicas();

    if (error) throw error;

    const musicasById = new Map((data || []).map((musica) => [musica.id, musica]));
    const musicas = ids.map((id) => musicasById.get(id)).filter(Boolean);

    if (musicas.length < 2) {
      throw new Error('Nao foi possivel encontrar as musicas selecionadas.');
    }

    page.replaceChildren(createSelectionPerformanceView({ musicas, returnTo, initialMusicaId }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a selecao.';
  }

  return page;
}

function createSelectionPerformanceView({ musicas, returnTo, initialMusicaId }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view selection-performance-view';

  wrapper.innerHTML = `
    <header class="performance-header">
      <h1>Selecao de musicas</h1>
    </header>
    ${createPerformanceToolbar({
      backHref: returnTo,
      showSequence: true,
      sequencePosition: `1/${musicas.length}`,
      useDynamicSongLink: true,
      showPrint: false,
    })}
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');
  musicas.forEach((musica, index) => {
    list.append(createSelectionSongBlock(musica, index + 1, musicas.length));
  });

  setupSelectionPerformanceControls(wrapper, { initialMusicaId });
  return wrapper;
}

function createSelectionSongBlock(musica, number, total) {
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const key = getField(musica, ['tom', 'key']);
  const cifraOriginal = getCifraExibicao(musica);
  const link = getField(musica, ['musica_link']);

  return createPerformanceSongBlock({
    title,
    subtitleParts: [`Selecao ${number}/${total}`],
    originalKey: key,
    currentKey: key,
    cifra: cifraOriginal,
    musica,
    link,
    musicaId: musica.id || '',
  });
}

function setupSelectionPerformanceControls(wrapper, options = {}) {
  setupAutoHideToolbar(wrapper);

  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
  const twoColumnsButton = wrapper.querySelector('[data-action="two-columns"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const previousSongButton = wrapper.querySelector('[data-action="previous-song"]');
  const nextSongButton = wrapper.querySelector('[data-action="next-song"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const linkButton = wrapper.querySelector('[data-action="song-link"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const songPosition = wrapper.querySelector('[data-role="song-position"]');
  const songs = [...wrapper.querySelectorAll('.performance-song')];
  const songSemitones = songs.map(() => 0);
  const initialIndex = options.initialMusicaId
    ? songs.findIndex((song) => song.dataset.musicaId === options.initialMusicaId)
    : -1;
  let scrollTimer = null;
  let currentSongIndex = initialIndex >= 0 ? initialIndex : 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  let fontSize = Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32);
  let fitFontToMobileWidth = true;
  let twoColumns = getDefaultTwoColumnView();

  speedInput.value = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, theme);
  setPerformanceFontSize(wrapper, fontSize);
  setTwoColumnView(wrapper, twoColumnsButton, twoColumns);
  renderCurrentSong();
  window.requestAnimationFrame(renderCurrentSong);

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(8, getCurrentPerformanceFontSize(wrapper, fontSize) - 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderCurrentSong();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(MAX_PERFORMANCE_FONT_SIZE, getCurrentPerformanceFontSize(wrapper, fontSize) + 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderCurrentSong();
  });

  twoColumnsButton.addEventListener('click', () => {
    twoColumns = !twoColumns;
    setTwoColumnView(wrapper, twoColumnsButton, twoColumns);
    renderCurrentSong();
  });

  speedInput.addEventListener('input', () => {
    window.localStorage.setItem('masterCifras.performanceScrollSpeed', speedInput.value);
  });

  autoscrollButton.addEventListener('click', () => {
    if (scrollTimer) {
      window.clearInterval(scrollTimer);
      scrollTimer = null;
      autoscrollButton.innerHTML = '&#9654;';
      return;
    }

    autoscrollButton.textContent = '||';
    scrollTimer = window.setInterval(() => {
      window.scrollBy({ top: Number(speedInput.value) * 0.7, behavior: 'auto' });
    }, 80);
  });

  previousSongButton.addEventListener('click', () => goToSong(-1));
  nextSongButton.addEventListener('click', () => goToSong(1));

  fullscreenButton.addEventListener('click', togglePerformanceFullscreen);

  printButton?.addEventListener('click', () => {
    window.print();
  });

  transposeDownButton.addEventListener('click', () => {
    songSemitones[currentSongIndex] -= 1;
    renderCurrentSong();
  });

  transposeUpButton.addEventListener('click', () => {
    songSemitones[currentSongIndex] += 1;
    renderCurrentSong();
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    window.localStorage.setItem('masterCifras.performanceCapo', String(capo));
    renderCurrentSong();
  });

  setupSongGestureNavigation(wrapper, {
    onPrevious: () => goToSong(-1),
    onNext: () => goToSong(1),
    onToggleFullscreen: togglePerformanceFullscreen,
  });

  window.addEventListener('resize', renderCurrentSong);

  function goToSong(direction) {
    currentSongIndex = Math.min(songs.length - 1, Math.max(0, currentSongIndex + direction));
    fontSize = Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32);
    fitFontToMobileWidth = true;
    renderCurrentSong();
  }

  function togglePerformanceFullscreen() {
    toggleInternalFullscreen(wrapper, fullscreenButton, renderCurrentSong);
  }

  function renderCurrentSong() {
    songs.forEach((song, index) => {
      const isActive = index === currentSongIndex;
      song.hidden = !isActive;
      if (!isActive) return;

      const semitones = songSemitones[index] || 0;
      const view = song.querySelector('.chordpro-view');
      const keyElement = song.querySelector('.current-key');

      if (keyElement) {
        keyElement.textContent = transposeKey(keyElement.dataset.originalKey || '-', semitones);
      }

      if (view) {
        const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
        view.innerHTML = renderMusicaCifraForDisplayHtml(song.cifraMusica || {}, {
          cifra: displayedCifra,
          includeVoiceLegend: false,
        });
        fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
      }

      if (linkButton) {
        setPerformanceSongLinkState(linkButton, song.dataset.link);
      }

      transposeStatus.textContent = formatTransposeStatus(semitones, capo);
    });

    songPosition.textContent = `${currentSongIndex + 1}/${songs.length}`;
    previousSongButton.disabled = currentSongIndex <= 0;
    nextSongButton.disabled = currentSongIndex >= songs.length - 1;
  }
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}
