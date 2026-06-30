import { getMusicaById, listMusicas } from '../../../services/musicasService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraParaTransposicao, normalizeCifraEditorState, renderMusicaCifraForDisplayHtml, renderVoiceLegendHtml, transposeCifraOriginal } from '../../../utils/chordpro.js';
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
  setupDoubleTapFullscreen,
  toggleInternalFullscreen,
} from '../../performance/performanceControls.js';

export async function MusicaExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const returnTo = params.get('returnTo') || '/musicas';

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Musica nao informada.';
    return page;
  }

  try {
    const [{ data: musica, error }, { data: musicasAcervo, error: musicasAcervoError }] = await Promise.all([
      getMusicaById(id),
      listMusicas(),
    ]);

    if (error) throw error;
    if (musicasAcervoError) throw musicasAcervoError;

    page.replaceChildren(createPerformanceView({
      musica,
      musicasAcervo: musicasAcervo || [],
      returnTo,
      initiallyExpandedToolbar: true,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

export function createPerformanceView({ musica, musicasAcervo = [], returnTo, initiallyExpandedToolbar = false }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view music-performance-stage';
  const { title, key, link, cifraOriginal } = getPerformanceSongData(musica);
  const voiceLegendHtml = renderPerformanceVoiceLegendHtml(cifraOriginal, musica);

  wrapper.innerHTML = `
    ${createPerformanceToolbar({
      backHref: returnTo,
      linkHref: link && link !== '-' ? link : '',
      showSongSearch: Boolean(musicasAcervo.length),
      showPrint: false,
    })}
    <section class="performance-song">
      <header class="repertorio-song-title-bar">
        <div class="performance-title-copy">
          <span class="performance-kicker">Execucao</span>
          <h2>${escapeHtml(title)}</h2>
          <div class="performance-title-voice-legend" data-role="performance-title-voice-legend">${voiceLegendHtml}</div>
        </div>
        <span class="performance-key-chip">${escapeHtml(key !== '-' ? key : 'Sem tom')}</span>
        <data class="current-key" data-original-key="${escapeHtml(key)}" hidden>${escapeHtml(key)}</data>
      </header>
      <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderMusicaCifraForDisplayHtml(musica, { cifra: cifraOriginal, includeVoiceLegend: false })}</pre>
    </section>
  `;

  setupPerformanceControls(wrapper, { musica, musicasAcervo, returnTo, initiallyExpandedToolbar });
  return wrapper;
}

function setupPerformanceControls(wrapper, {
  musica = {},
  musicasAcervo = [],
  returnTo = '/musicas',
  initiallyExpandedToolbar = false,
} = {}) {
  setupAutoHideToolbar(wrapper, { initiallyExpanded: initiallyExpandedToolbar });

  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
  const twoColumnsButton = wrapper.querySelector('[data-action="two-columns"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const songSearchButton = wrapper.querySelector('[data-action="song-search"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const view = wrapper.querySelector('.chordpro-view');
  const songPickerMenu = createAcervoSongPickerMenu(musicasAcervo);
  let scrollTimer = null;
  let semitones = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  let fontSize = Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32);
  let fitFontToMobileWidth = true;
  let twoColumns = getDefaultTwoColumnView();
  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';
  let currentMusica = musica;
  let songPickerAnchor = null;

  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, theme);
  setPerformanceFontSize(wrapper, fontSize);
  setTwoColumnView(wrapper, twoColumnsButton, twoColumns);
  renderPerformance();
  window.requestAnimationFrame(renderPerformance);
  setupSongPicker();

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(8, getCurrentPerformanceFontSize(wrapper, fontSize) - 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderPerformance();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(MAX_PERFORMANCE_FONT_SIZE, getCurrentPerformanceFontSize(wrapper, fontSize) + 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderPerformance();
  });

  twoColumnsButton.addEventListener('click', () => {
    twoColumns = !twoColumns;
    setTwoColumnView(wrapper, twoColumnsButton, twoColumns);
    renderPerformance();
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

  fullscreenButton.addEventListener('click', toggleFullscreen);

  printButton?.addEventListener('click', () => {
    window.print();
  });

  transposeDownButton.addEventListener('click', () => {
    semitones -= 1;
    renderPerformance();
  });

  transposeUpButton.addEventListener('click', () => {
    semitones += 1;
    renderPerformance();
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    window.localStorage.setItem('masterCifras.performanceCapo', String(capo));
    renderPerformance();
  });

  setupDoubleTapFullscreen(wrapper, toggleFullscreen);
  window.addEventListener('resize', renderPerformance);

  wrapper.updatePerformanceMusica = (nextMusica) => {
    const nextData = getPerformanceSongData(nextMusica);
    const title = wrapper.querySelector('.performance-song h2');
    const key = wrapper.querySelector('.current-key');
    const keyChip = wrapper.querySelector('.performance-key-chip');
    const link = wrapper.querySelector('.toolbar-link');
    const voiceLegend = wrapper.querySelector('[data-role="performance-title-voice-legend"]');

    if (title) title.textContent = nextData.title;
    if (keyChip) keyChip.textContent = nextData.key !== '-' ? nextData.key : 'Sem tom';
    if (key) {
      key.dataset.originalKey = nextData.key;
      key.textContent = nextData.key;
    }
    if (link) {
      setPerformanceSongLinkState(link, nextData.link);
    }
    if (voiceLegend) {
      voiceLegend.innerHTML = renderPerformanceVoiceLegendHtml(nextData.cifraOriginal, nextMusica);
    }

    view.dataset.originalCifra = nextData.cifraOriginal;
    currentMusica = nextMusica || {};
    semitones = 0;
    fitFontToMobileWidth = true;
    renderPerformance();
  };

  function setupSongPicker() {
    if (!songSearchButton || !songPickerMenu) return;

    wrapper.append(songPickerMenu);

    songSearchButton.setAttribute('aria-haspopup', 'menu');
    songSearchButton.setAttribute('aria-expanded', 'false');

    songSearchButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSongPicker(songSearchButton);
    });

    songPickerMenu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-musica-id]');
      if (!option) return;

      const nextMusica = musicasAcervo.find((item) => item.id === option.dataset.musicaId);
      if (!nextMusica) return;

      wrapper.updatePerformanceMusica(nextMusica);
      const nextUrl = `/musicas/execucao?id=${encodeURIComponent(nextMusica.id)}&returnTo=${encodeURIComponent(returnTo)}`;
      window.history.replaceState({}, '', nextUrl);
      closeSongPicker();
    });

    document.addEventListener('click', (event) => {
      if (songPickerMenu.hidden) return;
      if (event.target.closest('.repertorio-song-picker-menu, [data-action="song-search"]')) return;

      closeSongPicker();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || songPickerMenu.hidden) return;

      closeSongPicker();
      songPickerAnchor?.focus?.();
    });
  }

  function toggleSongPicker(anchor) {
    if (songPickerAnchor === anchor && !songPickerMenu.hidden) {
      closeSongPicker();
      return;
    }

    openSongPicker(anchor);
  }

  function openSongPicker(anchor) {
    songPickerAnchor = anchor;
    songPickerMenu.hidden = false;
    updateSongPickerActive();
    positionSongPicker(anchor);
    songSearchButton?.setAttribute('aria-expanded', 'true');
  }

  function closeSongPicker() {
    songPickerMenu.hidden = true;
    songPickerAnchor = null;
    songSearchButton?.setAttribute('aria-expanded', 'false');
  }

  function positionSongPicker(anchor) {
    const rect = anchor.getBoundingClientRect();
    const menuWidth = Math.min(340, Math.max(240, window.innerWidth - 24));
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.left + (rect.width / 2) - (menuWidth / 2)));
    const top = Math.min(window.innerHeight - 80, rect.bottom + 8);

    songPickerMenu.style.width = `${menuWidth}px`;
    songPickerMenu.style.left = `${left}px`;
    songPickerMenu.style.top = `${top}px`;
  }

  function updateSongPickerActive() {
    if (!songPickerMenu) return;

    songPickerMenu.querySelectorAll('[data-musica-id]').forEach((option) => {
      const isCurrent = option.dataset.musicaId === currentMusica?.id;
      option.classList.toggle('is-current', isCurrent);
      option.setAttribute('aria-current', isCurrent ? 'true' : 'false');
    });
  }

  function toggleFullscreen() {
    toggleInternalFullscreen(wrapper, fullscreenButton, renderPerformance);
  }

  function renderPerformance() {
    const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
    const voiceLegendHtml = renderPerformanceVoiceLegendHtml(displayedCifra, currentMusica);
    wrapper
      .querySelectorAll('[data-role="performance-title-voice-legend"]')
      .forEach((legend) => {
        legend.innerHTML = voiceLegendHtml;
      });
    view.innerHTML = renderMusicaCifraForDisplayHtml(currentMusica, { cifra: displayedCifra, includeVoiceLegend: false });
    fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
    transposeStatus.textContent = formatTransposeStatus(semitones, capo);
    updateSongPickerActive();
  }
}

function createAcervoSongPickerMenu(musicas = []) {
  const sortedMusicas = getMusicasSortedByTitle(musicas);

  if (!sortedMusicas.length) return null;

  const menu = document.createElement('div');
  menu.className = 'repertorio-song-picker-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Musicas do acervo');
  menu.hidden = true;

  sortedMusicas.forEach((musica, index) => {
    const title = getField(musica, ['titulo', 'nome', 'title']);
    const artist = getField(musica, ['artista', 'autor', 'artist']);
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'repertorio-song-picker-option';
    option.dataset.musicaId = musica.id || '';
    option.setAttribute('role', 'menuitem');
    option.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(artist !== '-' ? `${title} - ${artist}` : title)}</strong>
    `;
    menu.append(option);
  });

  return menu;
}

function getMusicasSortedByTitle(musicas = []) {
  return [...musicas].sort((a, b) => (
    getField(a, ['titulo', 'nome', 'title']).localeCompare(
      getField(b, ['titulo', 'nome', 'title']),
      'pt-BR',
      { sensitivity: 'base' },
    )
    || getField(a, ['artista', 'autor', 'artist']).localeCompare(
      getField(b, ['artista', 'autor', 'artist']),
      'pt-BR',
      { sensitivity: 'base' },
    )
  ));
}

function getPerformanceSongData(musica) {
  return {
    title: getField(musica, ['titulo', 'nome', 'title']),
    key: getField(musica, ['tom', 'key']),
    link: getField(musica, ['musica_link']),
    cifraOriginal: getCifraParaTransposicao(musica),
  };
}

function renderPerformanceVoiceLegendHtml(cifra, musica = {}) {
  const editorState = normalizeCifraEditorState(musica?.cifra_editor_state);
  const usedVoiceIds = editorState.voiceMarks?.length
    ? [...new Set(editorState.voiceMarks.map((mark) => mark.markerId).filter(Boolean))]
    : null;

  return renderVoiceLegendHtml(cifra, {
    voiceLabels: editorState.voiceLabels,
    usedVoiceIds,
  });
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
