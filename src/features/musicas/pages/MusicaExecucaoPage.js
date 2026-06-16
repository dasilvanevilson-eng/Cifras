import { getMusicaById } from '../../../services/musicasService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml, transposeCifraOriginal } from '../../../utils/chordpro.js';
import {
  createPerformanceToolbar,
  fitCifraToWidth,
  formatTransposeStatus,
  MAX_PERFORMANCE_FONT_SIZE,
  setPerformanceFontSize,
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
    const { data: musica, error } = await getMusicaById(id);

    if (error) throw error;

    page.replaceChildren(createPerformanceView({ musica, returnTo, initiallyExpandedToolbar: true }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

export function createPerformanceView({ musica, returnTo, initiallyExpandedToolbar = false }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view music-performance-stage';
  const { title, key, link, cifraOriginal } = getPerformanceSongData(musica);

  wrapper.innerHTML = `
    ${createPerformanceToolbar({
      backHref: returnTo,
      linkHref: link && link !== '-' ? link : '',
    })}
    <section class="performance-song">
      <header class="repertorio-song-title-bar">
        <div class="performance-title-copy">
          <span class="performance-kicker">Execucao</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <span class="performance-key-chip">${escapeHtml(key !== '-' ? key : 'Sem tom')}</span>
        <data class="current-key" data-original-key="${escapeHtml(key)}" hidden>${escapeHtml(key)}</data>
      </header>
      <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>
    </section>
  `;

  setupPerformanceControls(wrapper, { initiallyExpandedToolbar });
  return wrapper;
}

function setupPerformanceControls(wrapper, { initiallyExpandedToolbar = false } = {}) {
  setupAutoHideToolbar(wrapper, { initiallyExpanded: initiallyExpandedToolbar });

  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
  const twoColumnsButton = wrapper.querySelector('[data-action="two-columns"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const view = wrapper.querySelector('.chordpro-view');
  let scrollTimer = null;
  let semitones = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  let fontSize = 32;
  let fitFontToMobileWidth = true;
  let twoColumns = false;
  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, theme);
  setPerformanceFontSize(wrapper, fontSize);
  renderPerformance();
  window.requestAnimationFrame(renderPerformance);

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(8, fontSize - 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderPerformance();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(MAX_PERFORMANCE_FONT_SIZE, fontSize + 1);
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

  printButton.addEventListener('click', () => {
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
    const link = wrapper.querySelector('.toolbar-link');

    if (title) title.textContent = nextData.title;
    if (key) {
      key.dataset.originalKey = nextData.key;
      key.textContent = nextData.key;
    }
    if (link) {
      const hasLink = nextData.link && nextData.link !== '-';
      link.hidden = !hasLink;
      link.href = hasLink ? nextData.link : '#';
    }

    view.dataset.originalCifra = nextData.cifraOriginal;
    semitones = 0;
    fitFontToMobileWidth = true;
    renderPerformance();
  };

  function toggleFullscreen() {
    toggleInternalFullscreen(wrapper, fullscreenButton, renderPerformance);
  }

  function renderPerformance() {
    const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
    view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
    fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
    transposeStatus.textContent = formatTransposeStatus(semitones, capo);
  }
}

function getPerformanceSongData(musica) {
  return {
    title: getField(musica, ['titulo', 'nome', 'title']),
    key: getField(musica, ['tom', 'key']),
    link: getField(musica, ['musica_link']),
    cifraOriginal: getCifraExibicao(musica),
  };
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
