import { getMusicaById } from '../../../services/musicasService.js';
import { convertCifraOriginalToNumbers, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';

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

    if (error) {
      throw error;
    }

    page.replaceChildren(createPerformanceView({ musica, returnTo }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createPerformanceView({ musica, returnTo }) {
  const wrapper = document.createElement('article');
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(musica, ['tom', 'key']);
  const link = getField(musica, ['musica_link']);
  const cifraOriginal = getField(musica, ['cifra_original']);

  wrapper.innerHTML = `
    <a class="back-link" href="${escapeHtml(returnTo)}">Voltar</a>
    <header class="performance-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(artist)} - Tom: <span class="current-key" data-original-key="${escapeHtml(key)}">${escapeHtml(key)}</span></p>
      ${link && link !== '-' ? `<p><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Abrir link da musica</a></p>` : ''}
    </header>
    <div class="performance-toolbar">
      <button class="nav-button" type="button" data-action="theme">Tema escuro</button>
      <label>
        Fonte
        <input type="range" min="14" max="28" value="18" data-action="font-size">
      </label>
      <button class="nav-button" type="button" data-action="autoscroll">Iniciar rolagem</button>
      <label>
        Velocidade
        <input type="range" min="1" max="8" value="3" data-action="speed">
      </label>
      <button class="nav-button" type="button" data-action="fullscreen">Tela cheia</button>
      <button class="nav-button" type="button" data-action="print">Imprimir</button>
      <button class="nav-button" type="button" data-action="transpose-down">-1</button>
      <span class="transpose-status" data-role="transpose-status">Original</span>
      <button class="nav-button" type="button" data-action="transpose-up">+1</button>
      <button class="nav-button" type="button" data-action="transpose-reset">Original</button>
      <button class="nav-button" type="button" data-action="numbers">Numeros</button>
      <label>
        Capotraste
        <select data-action="capo">
          ${createCapoOptions()}
        </select>
      </label>
    </div>
    <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${escapeHtml(cifraOriginal)}</pre>
  `;

  setupPerformanceControls(wrapper);
  return wrapper;
}

function setupPerformanceControls(wrapper) {
  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontSizeInput = wrapper.querySelector('[data-action="font-size"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeResetButton = wrapper.querySelector('[data-action="transpose-reset"]');
  const numbersButton = wrapper.querySelector('[data-action="numbers"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  let scrollTimer = null;
  let semitones = 0;
  let showNumbers = false;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);

  const savedTheme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedFontSize = window.localStorage.getItem('masterCifras.performanceFontSize') || '18';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  fontSizeInput.value = savedFontSize;
  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, savedTheme);
  setPerformanceFontSize(wrapper, savedFontSize);
  renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);

  themeButton.addEventListener('click', () => {
    const nextTheme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, nextTheme);
    window.localStorage.setItem('masterCifras.performanceTheme', nextTheme);
  });

  fontSizeInput.addEventListener('input', () => {
    setPerformanceFontSize(wrapper, fontSizeInput.value);
    window.localStorage.setItem('masterCifras.performanceFontSize', fontSizeInput.value);
  });

  speedInput.addEventListener('input', () => {
    window.localStorage.setItem('masterCifras.performanceScrollSpeed', speedInput.value);
  });

  autoscrollButton.addEventListener('click', () => {
    if (scrollTimer) {
      window.clearInterval(scrollTimer);
      scrollTimer = null;
      autoscrollButton.textContent = 'Iniciar rolagem';
      return;
    }

    autoscrollButton.textContent = 'Pausar rolagem';
    scrollTimer = window.setInterval(() => {
      window.scrollBy({ top: Number(speedInput.value), behavior: 'auto' });
    }, 80);
  });

  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      window.alert('Nao foi possivel alternar tela cheia neste navegador.');
    }
  });

  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
  });

  printButton.addEventListener('click', () => {
    window.print();
  });

  transposeDownButton.addEventListener('click', () => {
    semitones -= 1;
    renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);
  });

  transposeUpButton.addEventListener('click', () => {
    semitones += 1;
    renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);
  });

  transposeResetButton.addEventListener('click', () => {
    semitones = 0;
    renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);
  });

  numbersButton.addEventListener('click', () => {
    showNumbers = !showNumbers;
    renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    window.localStorage.setItem('masterCifras.performanceCapo', String(capo));
    renderPerformance(wrapper, semitones, capo, showNumbers, transposeStatus, numbersButton);
  });
}

function renderPerformance(wrapper, semitones, capo, showNumbers, status, numbersButton) {
  const view = wrapper.querySelector('.chordpro-view');
  const key = wrapper.querySelector('.current-key');
  const displayedKey = transposeKey(key.dataset.originalKey || '-', semitones);
  const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);

  view.textContent = showNumbers ? convertCifraOriginalToNumbers(displayedCifra, displayedKey) : displayedCifra;
  key.textContent = displayedKey;
  status.textContent = formatTransposeStatus(semitones, capo);
  numbersButton.textContent = showNumbers ? 'Cifras' : 'Numeros';
}

function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.textContent = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
}

function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
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
