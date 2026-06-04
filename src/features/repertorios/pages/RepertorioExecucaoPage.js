import {
  getRepertorioById,
  listMusicasDoRepertorio,
} from '../../../services/repertoriosService.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';
import { addRecentItem } from '../../../utils/recentItems.js';

export async function RepertorioExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const musicaId = params.get('musicaId');
  const returnTo = params.get('returnTo') || '/repertorios/detalhe';

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Repertorio nao informado.';
    return page;
  }

  try {
    const [{ data: repertorio, error: repertorioError }, { data: musicasAssociadas, error: musicasError }] = await Promise.all([
      getRepertorioById(id),
      listMusicasDoRepertorio(id),
    ]);

    if (repertorioError) throw repertorioError;
    if (musicasError) throw musicasError;

    addRecentItem({
      type: 'execucao',
      label: getField(repertorio, ['nome', 'titulo', 'name']),
      detail: formatDate(getField(repertorio, ['data', 'date'])),
      url: `/repertorios/execucao?id=${encodeURIComponent(id)}`,
    });

    page.replaceChildren(createPerformanceViewV2({
      repertorio,
      musicasAssociadas: normalizeOrder(musicasAssociadas || []),
      returnTo,
      initialMusicaId: musicaId,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function createPerformanceViewLegacy({ repertorio, musicasAssociadas, returnTo }) {
  const wrapper = document.createElement('article');
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <a class="back-link" href="${escapeHtml(getBackUrl(returnTo, repertorio.id))}">Voltar</a>
    <header class="performance-header">
      <h1>${escapeHtml(nome)}</h1>
      <p>${escapeHtml(data)}</p>
    </header>
    <div class="performance-toolbar">
      <button class="nav-button icon-button" type="button" data-action="theme" aria-label="Alternar tema" title="Alternar tema claro/escuro">☾</button>
      <label>
        A
        <input type="range" min="14" max="28" value="18" data-action="font-size">
      </label>
      <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">▶</button>
      <label>
        V
        <input type="range" min="1" max="8" value="3" data-action="speed">
      </label>
      <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior">‹</button>
      <span class="performance-position" data-role="song-position">1/1</span>
      <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica">›</button>
      <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">⛶</button>
      <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">🖨</button>
      <button class="nav-button icon-button" type="button" data-action="transpose-down" aria-label="Descer um semitom" title="Descer um semitom">-1</button>
      <span class="transpose-status" data-role="transpose-status">Original</span>
      <button class="nav-button icon-button" type="button" data-action="transpose-up" aria-label="Subir um semitom" title="Subir um semitom">+1</button>
      <label>
        Capo
        <select data-action="capo">
          ${createCapoOptionsV2()}
        </select>
      </label>
    </div>
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');

  if (!musicasAssociadas.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada a este repertorio.';
    list.append(empty);
    setupPerformanceControlsV2(wrapper);
    return wrapper;
  }

  musicasAssociadas.forEach((item, index) => {
    list.append(createSongBlockV2(item, index + 1, nome));
  });

  setupPerformanceControlsV2(wrapper);
  return wrapper;
}

function createSongBlockLegacy(item, number) {
  const musica = item.musicas || {};
  const musicaExcluida = isMusicaExcluida(item);
  const title = musicaExcluida ? getField(item, ['musica_titulo']) : getField(musica, ['titulo', 'nome', 'title']);
  const artist = musicaExcluida ? getField(item, ['musica_artista']) : getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(item, ['tom']) !== '-' ? getField(item, ['tom']) : getField(musica, ['tom', 'key']);
  const cifraOriginal = getCifraExibicao(musica);

  const block = document.createElement('section');
  block.className = musicaExcluida ? 'performance-song deleted-repertorio-song' : 'performance-song';
  block.id = `musica-${number}`;
  block.tabIndex = -1;
  block.innerHTML = `
    <header>
      <span>${number}</span>
      <div>
        <h2>${escapeHtml(musicaExcluida ? `${title} (excluida)` : title)}</h2>
        <p>${escapeHtml(artist)} - Tom: <span class="current-key" data-original-key="${escapeHtml(key)}">${escapeHtml(key)}</span></p>
      </div>
    </header>
    ${musicaExcluida
      ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
      : `<pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>`}
  `;

  return block;
}

function setupPerformanceControlsLegacy(wrapper) {
  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontSizeInput = wrapper.querySelector('[data-action="font-size"]');
  const autoscrollButton = wrapper.querySelector('[data-action="autoscroll"]');
  const speedInput = wrapper.querySelector('[data-action="speed"]');
  const previousSongButton = wrapper.querySelector('[data-action="previous-song"]');
  const nextSongButton = wrapper.querySelector('[data-action="next-song"]');
  const fullscreenButton = wrapper.querySelector('[data-action="fullscreen"]');
  const printButton = wrapper.querySelector('[data-action="print"]');
  const transposeDownButton = wrapper.querySelector('[data-action="transpose-down"]');
  const transposeUpButton = wrapper.querySelector('[data-action="transpose-up"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const songs = [...wrapper.querySelectorAll('.performance-song')];
  let scrollTimer = null;
  let currentSongIndex = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  const songSemitones = songs.map(() => 0);
  const songPosition = wrapper.querySelector('[data-role="song-position"]');

  const savedTheme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedFontSize = window.localStorage.getItem('masterCifras.performanceFontSize') || '18';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  fontSizeInput.value = savedFontSize;
  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, savedTheme);
  setPerformanceFontSize(wrapper, savedFontSize);
  renderCurrentSong();

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
      autoscrollButton.textContent = '▶';
      return;
    }

    autoscrollButton.textContent = 'Ⅱ';
    scrollTimer = window.setInterval(() => {
      window.scrollBy({ top: Number(speedInput.value), behavior: 'auto' });
    }, 80);
  });

  previousSongButton.disabled = songs.length <= 1;
  nextSongButton.disabled = songs.length <= 1;

  previousSongButton.addEventListener('click', () => {
    currentSongIndex = Math.max(0, currentSongIndex - 1);
    renderCurrentSong();
  });

  nextSongButton.addEventListener('click', () => {
    currentSongIndex = Math.min(songs.length - 1, currentSongIndex + 1);
    renderCurrentSong();
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
    fullscreenButton.textContent = document.fullscreenElement ? '↙' : '⛶';
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

  function renderCurrentSong() {
    renderPagedPerformance({
      songs,
      currentSongIndex,
      songSemitones,
      capo,
      status: transposeStatus,
      songPosition,
      previousSongButton,
      nextSongButton,
    });
  }
}

function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.textContent = theme === 'dark' ? '☀' : '◐';
}

function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
}

function renderPagedPerformance({
  songs,
  currentSongIndex,
  songSemitones,
  capo,
  status,
  songPosition,
  previousSongButton,
  nextSongButton,
}) {
  songs.forEach((song, index) => {
    const isActive = index === currentSongIndex;
    song.hidden = !isActive;

    if (!isActive) return;

    const semitones = songSemitones[index] || 0;
    const view = song.querySelector('.chordpro-view');
    const keyElement = song.querySelector('.current-key');
    if (!view || !keyElement) return;

    const displayedKey = transposeKey(keyElement?.dataset.originalKey || '-', semitones);
    const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);

    view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
    keyElement.textContent = displayedKey;
    status.textContent = formatTransposeStatus(semitones, capo);
  });

  if (songPosition) {
    songPosition.textContent = songs.length ? `${currentSongIndex + 1}/${songs.length}` : '0/0';
  }

  previousSongButton.disabled = currentSongIndex <= 0;
  nextSongButton.disabled = currentSongIndex >= songs.length - 1;
}

function isMusicaExcluida(item) {
  return Boolean(item?.musica_excluida_em || !item?.musica_id || !item?.musicas);
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

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function getBackUrl(returnTo, repertorioId) {
  if (returnTo === '/dashboard') {
    return returnTo;
  }

  return `/repertorios/detalhe?id=${encodeURIComponent(repertorioId)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createPerformanceViewV2({ repertorio, musicasAssociadas, returnTo, initialMusicaId }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view';
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <header class="performance-header">
      <h1>${escapeHtml(nome)}</h1>
      ${data !== '-' ? `<p>${escapeHtml(data)}</p>` : ''}
    </header>
    <div class="performance-toolbar">
      <a class="button-link secondary icon-action back-icon-action song-toolbar-back" href="${escapeHtml(getBackUrl(returnTo, repertorio.id))}" aria-label="Voltar" title="Voltar">&larr;</a>
      <button class="nav-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
      <span class="transpose-status" data-role="transpose-status">Tom</span>
      <button class="nav-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
      <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior">&lsaquo;</button>
      <span class="performance-position" data-role="song-position">1/1</span>
      <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica">&rsaquo;</button>
      <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">&#9974;</button>
      <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
      <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
      <button class="nav-button icon-button theme-toggle-button" type="button" data-action="theme" aria-label="Alternar tela clara e escura" title="Alternar tela clara e escura"></button>
      <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">&#9654;</button>
      <label>
        V
        <input type="range" min="1" max="8" value="3" data-action="speed">
      </label>
      <label>
        <select data-action="capo">
          ${createCapoOptionsV2()}
        </select>
      </label>
      <a class="button-link secondary toolbar-link" data-action="song-link" href="#" target="_blank" rel="noreferrer" hidden>Link</a>
      <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">&#128424;</button>
    </div>
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');

  if (!musicasAssociadas.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada a este repertorio.';
    list.append(empty);
    setupPerformanceControlsV2(wrapper, { initialMusicaId });
    return wrapper;
  }

  musicasAssociadas.forEach((item, index) => {
    list.append(createSongBlockV2(item, index + 1, nome));
  });

  setupPerformanceControlsV2(wrapper, { initialMusicaId });
  return wrapper;
}

function createSongBlockV2(item, number, repertorioTitle = '-') {
  const musica = item.musicas || {};
  const musicaExcluida = isMusicaExcluida(item);
  const title = musicaExcluida ? getField(item, ['musica_titulo']) : getField(musica, ['titulo', 'nome', 'title']);
  const key = getField(item, ['tom']) !== '-' ? getField(item, ['tom']) : getField(musica, ['tom', 'key']);
  const cifraOriginal = getCifraExibicao(musica);
  const link = musicaExcluida ? '-' : getField(musica, ['musica_link']);

  const block = document.createElement('section');
  block.className = musicaExcluida ? 'performance-song deleted-repertorio-song' : 'performance-song';
  block.id = `musica-${number}`;
  block.tabIndex = -1;
  block.dataset.link = link !== '-' ? link : '';
  block.dataset.musicaId = item.musica_id || '';
  block.innerHTML = `
    <header class="repertorio-song-title-bar">
      <h2>${escapeHtml(musicaExcluida ? `${title} (excluida)` : title)}</h2>
      <span class="title-separator" aria-hidden="true">/</span>
      <span class="repertorio-title-inline">${escapeHtml(repertorioTitle)}</span>
      <data class="current-key" data-original-key="${escapeHtml(key)}" hidden>${escapeHtml(key)}</data>
    </header>
    ${musicaExcluida
      ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
      : `<pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderCifraOriginalForDisplayHtml(cifraOriginal)}</pre>`}
  `;

  return block;
}

function setupPerformanceControlsV2(wrapper, options = {}) {
  const themeButton = wrapper.querySelector('[data-action="theme"]');
  const fontDownButton = wrapper.querySelector('[data-action="font-down"]');
  const fontUpButton = wrapper.querySelector('[data-action="font-up"]');
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
  const songs = [...wrapper.querySelectorAll('.performance-song')];
  let scrollTimer = null;
  const initialIndex = options.initialMusicaId
    ? songs.findIndex((song) => song.dataset.musicaId === options.initialMusicaId)
    : -1;
  let currentSongIndex = initialIndex >= 0 ? initialIndex : 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  const songSemitones = songs.map(() => 0);
  const songPosition = wrapper.querySelector('[data-role="song-position"]');

  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedFontSize = window.localStorage.getItem('masterCifras.performanceFontSize');
  let fontSize = Number(savedFontSize || 18);
  let fitFontToMobileWidth = !savedFontSize;
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceThemeV2(wrapper, themeButton, theme);
  setPerformanceFontSizeV2(wrapper, fontSize);
  renderCurrentSong();
  window.requestAnimationFrame(renderCurrentSong);
  window.setTimeout(renderCurrentSong, 0);

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceThemeV2(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(12, fontSize - 1);
    setPerformanceFontSizeV2(wrapper, fontSize);
    window.localStorage.setItem('masterCifras.performanceFontSize', String(fontSize));
    renderCurrentSong();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(30, fontSize + 1);
    setPerformanceFontSizeV2(wrapper, fontSize);
    window.localStorage.setItem('masterCifras.performanceFontSize', String(fontSize));
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

  previousSongButton.disabled = songs.length <= 1;
  nextSongButton.disabled = songs.length <= 1;

  previousSongButton.addEventListener('click', () => {
    goToSong(-1);
  });

  nextSongButton.addEventListener('click', () => {
    goToSong(1);
  });

  fullscreenButton.addEventListener('click', async () => {
    await togglePerformanceFullscreen();
  });

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
    renderCurrentSong();
  }

  async function togglePerformanceFullscreen() {
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

  function renderCurrentSong() {
    renderPagedPerformanceV2({
      wrapper,
      songs,
      currentSongIndex,
      songSemitones,
      capo,
      desiredFontSize: fontSize,
      fitFontToMobileWidth,
      status: transposeStatus,
      songPosition,
      previousSongButton,
      nextSongButton,
      linkButton,
    });
  }
}

function setPerformanceThemeV2(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.innerHTML = '<span class="theme-swatch" aria-hidden="true"></span>';
  button.setAttribute('aria-label', theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura');
  button.title = theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura';
}

function setPerformanceFontSizeV2(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
}

function renderPagedPerformanceV2({
  wrapper,
  songs,
  currentSongIndex,
  songSemitones,
  capo,
  desiredFontSize,
  fitFontToMobileWidth,
  status,
  songPosition,
  previousSongButton,
  nextSongButton,
  linkButton,
}) {
  songs.forEach((song, index) => {
    const isActive = index === currentSongIndex;
    song.hidden = !isActive;

    if (!isActive) return;

    const semitones = songSemitones[index] || 0;
    const view = song.querySelector('.chordpro-view');
    const keyElement = song.querySelector('.current-key');

    if (keyElement) {
      const displayedKey = transposeKey(keyElement.dataset.originalKey || '-', semitones);
      keyElement.textContent = displayedKey;
    }

    if (view) {
      const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
      view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
      fitCifraToWidth(wrapper, view, displayedCifra, desiredFontSize, fitFontToMobileWidth);
    }

    if (linkButton) {
      const link = song.dataset.link || '';
      linkButton.hidden = !link;
      linkButton.href = link || '#';
    }

    status.textContent = formatTransposeStatusV2(semitones, capo);
  });

  if (songPosition) {
    songPosition.textContent = songs.length ? `${currentSongIndex + 1}/${songs.length}` : '0/0';
  }

  previousSongButton.disabled = currentSongIndex <= 0;
  nextSongButton.disabled = currentSongIndex >= songs.length - 1;
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

    if (Math.abs(deltaY) > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (Math.abs(deltaX) >= 56) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
      return;
    }

    if (elapsed > 450 || Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      return;
    }

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
    const leftLimit = screenWidth * 0.28;
    const rightLimit = screenWidth * 0.72;

    if (event.clientX <= leftLimit) {
      onPrevious();
    } else if (event.clientX >= rightLimit) {
      onNext();
    }
  });

  wrapper.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
}

function createCapoOptionsV2() {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `Capo ${index}`}</option>`
  )).join('');
}

function formatTransposeStatusV2(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Tom'
    : `${semitones > 0 ? '+' : ''}${semitones}/2`;

  return capo > 0 ? `${transposeText} | Capo ${capo}` : transposeText;
}
