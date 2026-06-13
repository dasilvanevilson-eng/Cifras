import { getMusicaById } from '../../../services/musicasService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml, transposeCifraOriginal } from '../../../utils/chordpro.js';
import { fitPreformattedTextToWidth } from '../../../utils/performanceFontFit.js';

const MAX_PERFORMANCE_FONT_SIZE = 128;
const MAX_AUTO_FIT_FONT_SIZE = 16;

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

    page.replaceChildren(createPerformanceView({ musica, returnTo }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

export function createPerformanceView({ musica, returnTo }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view';
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const key = getField(musica, ['tom', 'key']);
  const link = getField(musica, ['musica_link']);
  const cifraOriginal = getCifraExibicao(musica);

  wrapper.innerHTML = `
    <div class="performance-toolbar">
      <a class="button-link secondary icon-action back-icon-action song-toolbar-back" href="${escapeHtml(returnTo)}" aria-label="Sair" title="Sair">Sair</a>
      <button class="nav-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
      <span class="transpose-status" data-role="transpose-status">Tom</span>
      <button class="nav-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
      <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">&#9974;</button>
      <div class="font-stepper" role="group" aria-label="Tamanho da fonte">
        <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
        <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
      </div>
      <button class="nav-button" type="button" data-action="two-columns" aria-label="Visualizacao em duas colunas" title="Visualizacao em duas colunas">2 col</button>
      <button class="nav-button icon-button theme-toggle-button" type="button" data-action="theme" aria-label="Alternar tela clara e escura" title="Alternar tela clara e escura"></button>
      <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">&#9654;</button>
      <label>
        V
        <input type="range" min="1" max="8" value="3" data-action="speed">
      </label>
      <label>
        <select data-action="capo">
          ${createCapoOptions()}
        </select>
      </label>
      ${link && link !== '-' ? `<a class="button-link secondary toolbar-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Link</a>` : ''}
      <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">&#128424;</button>
    </div>
    <section class="performance-song">
      <header class="repertorio-song-title-bar">
        <h2>${escapeHtml(title)}</h2>
        <data class="current-key" data-original-key="${escapeHtml(key)}" hidden>${escapeHtml(key)}</data>
      </header>
      <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>
    </section>
  `;

  setupPerformanceControls(wrapper);
  return wrapper;
}

function setupPerformanceControls(wrapper) {
  setupAutoHideToolbar(wrapper);

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

  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = document.fullscreenElement === wrapper;
    wrapper.classList.toggle('is-fullscreen', isFullscreen);
    fullscreenButton.textContent = String.fromCharCode(9974);
    fullscreenButton.title = isFullscreen ? 'Dois toques na musica para sair da tela cheia' : 'Tela cheia';
    window.requestAnimationFrame(renderPerformance);
  });

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

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === wrapper) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await wrapper.requestFullscreen();
      }
    } catch (error) {
      window.alert('Nao foi possivel alternar tela cheia neste navegador.');
    }
  }

  function renderPerformance() {
    const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
    view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
    fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
    transposeStatus.textContent = formatTransposeStatus(semitones, capo);
  }
}

function setupDoubleTapFullscreen(wrapper, onToggleFullscreen) {
  let pointerStart = null;
  let lastTap = null;

  wrapper.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.performance-toolbar, a, button, input, select, label')) {
      pointerStart = null;
      return;
    }

    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
  });

  wrapper.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const elapsed = Date.now() - pointerStart.time;
    pointerStart = null;

    if (elapsed > 450 || Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) return;

    const now = Date.now();
    const isDoubleTap = lastTap
      && now - lastTap.time <= 340
      && Math.abs(event.clientX - lastTap.x) <= 44
      && Math.abs(event.clientY - lastTap.y) <= 44;

    if (isDoubleTap) {
      lastTap = null;
      onToggleFullscreen();
      return;
    }

    lastTap = {
      x: event.clientX,
      y: event.clientY,
      time: now,
    };
  });

  wrapper.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
}

function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.innerHTML = '<span class="theme-swatch" aria-hidden="true"></span>';
  button.setAttribute('aria-label', theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura');
  button.title = theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura';
}

function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
  updateFontSizeStatus(wrapper, value);
}

function getCurrentPerformanceFontSize(wrapper, fallback) {
  const value = window.getComputedStyle(wrapper).getPropertyValue('--performance-font-size');
  return Number.parseFloat(value) || fallback;
}

function updateFontSizeStatus(wrapper, value) {
  const status = wrapper.querySelector('[data-role="font-size-status"]');
  if (!status) return;

  status.textContent = String(Math.round(Number(value) || 0));
}

function setTwoColumnView(wrapper, button, enabled) {
  wrapper.classList.toggle('is-two-columns', enabled);
  button.classList.toggle('is-active', enabled);
  button.textContent = enabled ? '1 col' : '2 col';
  button.title = enabled ? 'Visualizacao em uma coluna' : 'Visualizacao em duas colunas';
  button.setAttribute('aria-label', button.title);
}

function fitCifraToWidth(wrapper, view, cifra, desiredFontSize, fitFontToMobileWidth) {
  if (!fitFontToMobileWidth) {
    setPerformanceFontSize(wrapper, desiredFontSize);
    return;
  }

  fitPreformattedTextToWidth({
    wrapper,
    view,
    desiredFontSize,
    fitToWidth: fitFontToMobileWidth,
    maxFontSize: MAX_AUTO_FIT_FONT_SIZE,
    setFontSize: (value) => setPerformanceFontSize(wrapper, value),
  });
}

function createCapoOptions() {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `Capo ${index}`}</option>`
  )).join('');
}

function formatTransposeStatus(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Tom'
    : `${semitones > 0 ? '+' : ''}${semitones}`;

  return capo > 0 ? `${transposeText} | Capo ${capo}` : transposeText;
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
