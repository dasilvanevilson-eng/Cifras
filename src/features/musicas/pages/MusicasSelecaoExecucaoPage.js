import { listMusicas } from '../../../services/musicasService.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';

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

    page.replaceChildren(createSelectionPerformanceView({ musicas, returnTo }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a selecao.';
  }

  return page;
}

function createSelectionPerformanceView({ musicas, returnTo }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view selection-performance-view';

  wrapper.innerHTML = `
    <header class="performance-header">
      <h1>Selecao de musicas</h1>
    </header>
    <div class="performance-toolbar">
      <a class="button-link secondary icon-action back-icon-action song-toolbar-back" href="${escapeHtml(returnTo)}" aria-label="Voltar" title="Voltar">&larr;</a>
      <button class="nav-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
      <span class="transpose-status" data-role="transpose-status">Tom</span>
      <button class="nav-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
      <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior">&lsaquo;</button>
      <span class="performance-position" data-role="song-position">1/${musicas.length}</span>
      <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica">&rsaquo;</button>
      <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">&#9974;</button>
      <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
      <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
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
      <a class="button-link secondary toolbar-link" data-action="song-link" href="#" target="_blank" rel="noreferrer" hidden>Link</a>
      <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">&#128424;</button>
    </div>
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');
  musicas.forEach((musica, index) => {
    list.append(createSongBlock(musica, index + 1, musicas.length));
  });

  setupSelectionPerformanceControls(wrapper);
  return wrapper;
}

function createSongBlock(musica, number, total) {
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const key = getField(musica, ['tom', 'key']);
  const cifraOriginal = getCifraExibicao(musica);
  const link = getField(musica, ['musica_link']);
  const block = document.createElement('section');
  block.className = 'performance-song';
  block.tabIndex = -1;
  block.dataset.link = link !== '-' ? link : '';
  block.innerHTML = `
    <header class="repertorio-song-title-bar">
      <span class="repertorio-current-song-title">${escapeHtml(title)}</span>
      <span class="title-separator" aria-hidden="true">/</span>
      <span class="repertorio-title-inline">Selecao ${number}/${total}</span>
      <data class="current-key" data-original-key="${escapeHtml(key)}" hidden>${escapeHtml(key)}</data>
    </header>
    <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>
  `;

  return block;
}

function setupSelectionPerformanceControls(wrapper) {
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
  let scrollTimer = null;
  let currentSongIndex = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  let fontSize = 18;
  let fitFontToMobileWidth = true;
  let twoColumns = false;

  speedInput.value = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, theme);
  setPerformanceFontSize(wrapper, fontSize);
  renderCurrentSong();
  window.requestAnimationFrame(renderCurrentSong);

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceTheme(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(12, fontSize - 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderCurrentSong();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(30, fontSize + 1);
    setPerformanceFontSize(wrapper, fontSize);
    renderCurrentSong();
  });

  twoColumnsButton.addEventListener('click', () => {
    twoColumns = !twoColumns;
    wrapper.classList.toggle('is-two-columns', twoColumns);
    twoColumnsButton.classList.toggle('is-active', twoColumns);
    twoColumnsButton.textContent = twoColumns ? '1 col' : '2 col';
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
  document.addEventListener('fullscreenchange', () => {
    const isPerformanceFullscreen = document.fullscreenElement === wrapper;
    wrapper.classList.toggle('is-fullscreen', isPerformanceFullscreen);
    fullscreenButton.textContent = String.fromCharCode(9974);
    fullscreenButton.title = isPerformanceFullscreen
      ? 'Toque no centro da musica para sair da tela cheia'
      : 'Tela cheia';
    window.requestAnimationFrame(renderCurrentSong);
  });

  printButton.addEventListener('click', () => {
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
    fontSize = 18;
    fitFontToMobileWidth = true;
    renderCurrentSong();
  }

  async function togglePerformanceFullscreen() {
    try {
      if (document.fullscreenElement === wrapper) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await wrapper.requestFullscreen();
      }
    } catch (_error) {
      window.alert('Nao foi possivel alternar tela cheia neste navegador.');
    }
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
        view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
        fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
      }

      if (linkButton) {
        const link = song.dataset.link || '';
        linkButton.hidden = !link;
        linkButton.href = link || '#';
      }

      transposeStatus.textContent = formatTransposeStatus(semitones, capo);
    });

    songPosition.textContent = `${currentSongIndex + 1}/${songs.length}`;
    previousSongButton.disabled = currentSongIndex <= 0;
    nextSongButton.disabled = currentSongIndex >= songs.length - 1;
  }
}

function setupSongGestureNavigation(wrapper, { onPrevious, onNext, onToggleFullscreen }) {
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

    if (Math.abs(deltaY) > 90 && Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (Math.abs(deltaX) >= 56) {
      if (deltaX < 0) onNext();
      else onPrevious();
      return;
    }

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

    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    if (event.clientX <= screenWidth * 0.28) onPrevious();
    if (event.clientX >= screenWidth * 0.72) onNext();
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
}

function fitCifraToWidth(wrapper, view, cifra, desiredFontSize, fitFontToMobileWidth) {
  if (!fitFontToMobileWidth || !window.matchMedia('(max-width: 760px)').matches) {
    wrapper.style.setProperty('--performance-font-size', `${desiredFontSize}px`);
    return;
  }

  const lines = String(cifra || '').split('\n');
  const longestLineLength = Math.max(1, ...lines.map((line) => line.length));
  const measuredWidth = view.clientWidth || wrapper.clientWidth || (window.innerWidth - 24);
  const availableWidth = Math.max(160, measuredWidth - 28);
  const fittedSize = Math.floor(availableWidth / (longestLineLength * 0.62));
  const fontSize = Math.max(10, Math.min(desiredFontSize, fittedSize || desiredFontSize));

  wrapper.style.setProperty('--performance-font-size', `${fontSize}px`);
}

function createCapoOptions() {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `Capo ${index}`}</option>`
  )).join('');
}

function formatTransposeStatus(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Tom'
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
