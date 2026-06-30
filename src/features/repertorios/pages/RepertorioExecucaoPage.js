import {
  getRepertorioById,
  listMusicasDoRepertorio,
  updateTomMusicaRepertorio,
} from '../../../services/repertoriosService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraParaTransposicao, getTransposeSemitones, renderCifraOriginalForDisplayHtml, renderMusicaCifraForDisplayHtml, renderVoiceLegendHtml, transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';
import { addRecentItem } from '../../../utils/recentItems.js';
import {
  createCapoOptions as createPerformanceCapoOptions,
  createPerformanceToolbar,
  fitCifraToWidth as fitPerformanceCifraToWidth,
  formatTransposeStatus as formatPerformanceTransposeStatus,
  getCurrentPerformanceFontSize as getCurrentPerformanceFontSizeV2,
  getDefaultTwoColumnView,
  MAX_PERFORMANCE_FONT_SIZE,
  setPerformanceFontSize as setPerformanceFontSizeV2,
  setPerformanceSongLinkState,
  setPerformanceTheme as setPerformanceThemeV2,
  setTwoColumnView as setPerformanceTwoColumnView,
  setupSongGestureNavigation,
  toggleInternalFullscreen,
} from '../../performance/performanceControls.js';
import { createPerformanceSongBlock } from '../../performance/performanceSong.js';

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
        <input type="range" min="22" max="32" value="32" data-action="font-size">
      </label>
      <div class="scroll-stepper" role="group" aria-label="Rolagem automatica">
        <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">▶</button>
        <input type="range" min="1" max="8" value="3" data-action="speed" aria-label="Velocidade da rolagem">
      </div>
      <div class="sequence-stepper" role="group" aria-label="Sequencia de exibicao">
        <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior">‹</button>
        <span class="performance-position" data-role="song-position">1/1</span>
        <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica">›</button>
      </div>
      <button class="nav-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">Tela cheia</button>
      <div class="key-stepper" role="group" aria-label="Ajuste de tom">
        <button class="nav-button icon-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
        <span class="transpose-status" data-role="transpose-status">Tom</span>
        <button class="nav-button icon-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
      </div>
      <label>
        Capo
        <select data-action="capo">
          ${createPerformanceCapoOptions()}
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
  const cifraOriginal = getCifraParaTransposicao(musica);
  const momento = getField(item, ['observacao']);

  const block = document.createElement('section');
  block.className = musicaExcluida ? 'performance-song deleted-repertorio-song' : 'performance-song';
  block.id = `musica-${number}`;
  block.tabIndex = -1;
  block.cifraMusica = musicaExcluida ? null : musica;
  block.innerHTML = `
    <header>
      <span>${number}</span>
      <div>
        <h2>${escapeHtml(musicaExcluida ? `${title} (excluida)` : title)}</h2>
        <p>${escapeHtml(artist)} - Tom: <span class="current-key" data-original-key="${escapeHtml(key)}">${escapeHtml(key)}</span></p>
        ${momento !== '-' ? `<p class="repertorio-song-moment">Momento: ${escapeHtml(momento)}</p>` : ''}
      </div>
    </header>
    ${musicaExcluida
      ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
      : `<pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${renderMusicaCifraForDisplayHtml(musica, { cifra: cifraOriginal, includeVoiceLegend: false })}</pre>`}
  `;

  return block;
}

function setupPerformanceControlsLegacy(wrapper) {
  setupAutoHideToolbar(wrapper);

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
  const savedFontSize = String(Math.min(32, Math.max(22, Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32))));
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
    toggleInternalFullscreen(wrapper, fullscreenButton, renderCurrentSong);
  });

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

    view.innerHTML = renderMusicaCifraForDisplayHtml(song.cifraMusica || {}, {
      cifra: displayedCifra,
      includeVoiceLegend: false,
    });
    song
      .querySelectorAll('[data-role="performance-title-voice-legend"]')
      .forEach((voiceLegend) => {
        voiceLegend.innerHTML = renderVoiceLegendHtml(displayedCifra);
      });
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
    ? 'Tom'
    : `${semitones > 0 ? '+' : ''}${semitones}`;

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

export function createPerformanceViewV2({
  repertorio,
  musicasAssociadas,
  returnTo,
  initialMusicaId,
  initialRepertorioMusicaId,
  initialSongIndex,
  onSongChange,
}) {
  const wrapper = document.createElement('article');
  wrapper.className = 'repertorio-performance-view repertorio-song-view repertorio-set-stage';
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <header class="performance-header repertorio-stage-header">
      <div class="repertorio-stage-copy">
        <span class="repertorio-stage-kicker">Execucao de repertorio</span>
        <h1>${escapeHtml(nome)}</h1>
        <p>${data !== '-' ? escapeHtml(data) : 'Sequencia musical'}</p>
        <p class="repertorio-stage-current" data-role="stage-current-song"></p>
      </div>
      <div class="repertorio-stage-summary" aria-label="Progresso do repertorio">
        <span data-role="stage-song-picker">
          <strong data-role="stage-song-position">0/0</strong>
          musica atual
          <small>visualizar</small>
        </span>
      </div>
    </header>
    ${createPerformanceToolbar({
      backHref: getBackUrl(returnTo, repertorio.id),
      showSequence: true,
      useDynamicSongLink: true,
      showPrint: false,
    })}
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');

  if (!musicasAssociadas.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada a este repertorio.';
    list.append(empty);
    setupPerformanceControlsV2(wrapper, {
      initialMusicaId,
      initialRepertorioMusicaId,
      initialSongIndex,
      onSongChange,
    });
    return wrapper;
  }

  musicasAssociadas.forEach((item, index) => {
    list.append(createSongBlockV2(item, index + 1, nome));
  });

  setupPerformanceControlsV2(wrapper, {
    initialMusicaId,
    initialRepertorioMusicaId,
    initialSongIndex,
    onSongChange,
  });
  return wrapper;
}

function createSongBlockV2(item, number, repertorioTitle = '-') {
  const musica = item.musicas || {};
  const musicaExcluida = isMusicaExcluida(item);
  const title = musicaExcluida ? getField(item, ['musica_titulo']) : getField(musica, ['titulo', 'nome', 'title']);
  const originalKey = musicaExcluida ? getField(item, ['musica_tom_original']) : getField(musica, ['tom', 'key']);
  const repertorioKey = getField(item, ['tom']) !== '-' ? getField(item, ['tom']) : originalKey;
  const baseSemitones = getTransposeSemitones(originalKey, repertorioKey);
  const cifraOriginal = getCifraParaTransposicao(musica);
  const link = musicaExcluida ? '-' : getField(musica, ['musica_link']);
  const momento = getField(item, ['observacao']);
  const subtitleParts = [
    repertorioTitle,
    momento !== '-' ? { text: momento, className: 'repertorio-song-moment-inline' } : '',
  ];

  return createPerformanceSongBlock({
    title: musicaExcluida ? `${title} (excluida)` : title,
    subtitleParts,
    originalKey,
    currentKey: repertorioKey,
    baseSemitones,
    cifra: cifraOriginal,
    musica,
    link,
    musicaId: item.musica_id || '',
    repertorioMusicaId: item.id || '',
    id: `musica-${number}`,
    className: musicaExcluida ? 'performance-song deleted-repertorio-song' : 'performance-song',
    deletedNotice: musicaExcluida
      ? 'Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.'
      : '',
  });
}

function setupPerformanceControlsV2(wrapper, options = {}) {
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
  const songs = [...wrapper.querySelectorAll('.performance-song')];
  let scrollTimer = null;
  const initialIndex = getInitialSongIndex(songs, options);
  let currentSongIndex = initialIndex >= 0 ? initialIndex : 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);
  const songSemitones = songs.map(() => 0);
  let saveTomQueue = Promise.resolve();
  const songPosition = wrapper.querySelector('[data-role="song-position"]');
  const stageSongPosition = wrapper.querySelector('[data-role="stage-song-position"]');
  const stageSongPicker = wrapper.querySelector('[data-role="stage-song-picker"]');
  const songPickerMenu = createSongPickerMenu(songs);
  let songPickerAnchor = null;

  let theme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  let fontSize = Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32);
  let fitFontToMobileWidth = true;
  let twoColumns = getDefaultTwoColumnView();
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceThemeV2(wrapper, themeButton, theme);
  setPerformanceFontSizeV2(wrapper, fontSize);
  setPerformanceTwoColumnView(wrapper, twoColumnsButton, twoColumns);
  renderCurrentSong();
  window.requestAnimationFrame(renderCurrentSong);
  window.setTimeout(renderCurrentSong, 0);
  setupSongPicker();

  themeButton.addEventListener('click', () => {
    theme = wrapper.classList.contains('is-dark') ? 'light' : 'dark';
    setPerformanceThemeV2(wrapper, themeButton, theme);
    window.localStorage.setItem('masterCifras.performanceTheme', theme);
  });

  fontDownButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.max(8, getCurrentPerformanceFontSizeV2(wrapper, fontSize) - 1);
    setPerformanceFontSizeV2(wrapper, fontSize);
    renderCurrentSong();
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToMobileWidth = false;
    fontSize = Math.min(MAX_PERFORMANCE_FONT_SIZE, getCurrentPerformanceFontSizeV2(wrapper, fontSize) + 1);
    setPerformanceFontSizeV2(wrapper, fontSize);
    renderCurrentSong();
  });

  twoColumnsButton.addEventListener('click', () => {
    twoColumns = !twoColumns;
    setPerformanceTwoColumnView(wrapper, twoColumnsButton, twoColumns);
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

  fullscreenButton.addEventListener('click', togglePerformanceFullscreen);

  printButton?.addEventListener('click', () => {
    window.print();
  });

  transposeDownButton.addEventListener('click', () => {
    songSemitones[currentSongIndex] -= 1;
    renderCurrentSong();
    saveCurrentSongKey();
  });

  transposeUpButton.addEventListener('click', () => {
    songSemitones[currentSongIndex] += 1;
    renderCurrentSong();
    saveCurrentSongKey();
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
    selectSong(Math.min(songs.length - 1, Math.max(0, currentSongIndex + direction)));
  }

  function selectSong(nextSongIndex) {
    if (nextSongIndex === currentSongIndex || nextSongIndex < 0 || nextSongIndex >= songs.length) return;

    currentSongIndex = nextSongIndex;
    fontSize = Number(window.localStorage.getItem('masterCifras.performanceFontSize') || 32);
    fitFontToMobileWidth = true;
    renderCurrentSong();
    notifySongChange();
  }

  function setupSongPicker() {
    if (!songs.length || !songPickerMenu) return;

    wrapper.append(songPickerMenu);
    setupSongPickerAnchor(songPosition);
    setupSongPickerAnchor(stageSongPicker);

    songPickerMenu.addEventListener('click', (event) => {
      const option = event.target.closest('[data-song-index]');
      if (!option) return;

      selectSong(Number(option.dataset.songIndex));
      closeSongPicker();
    });

    document.addEventListener('click', (event) => {
      if (songPickerMenu.hidden) return;
      if (event.target.closest('.repertorio-song-picker-menu, [data-role="song-position"], [data-role="stage-song-picker"]')) return;

      closeSongPicker();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || songPickerMenu.hidden) return;

      closeSongPicker();
      songPickerAnchor?.focus?.();
    });
  }

  function setupSongPickerAnchor(anchor) {
    if (!anchor) return;

    anchor.classList.add('repertorio-song-picker-anchor');
    anchor.setAttribute('role', 'button');
    anchor.setAttribute('tabindex', '0');
    anchor.setAttribute('aria-haspopup', 'menu');
    anchor.setAttribute('aria-expanded', 'false');
    anchor.title = 'Escolher musica do repertorio';

    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSongPicker(anchor);
    });

    anchor.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    anchor.addEventListener('pointerup', (event) => {
      event.stopPropagation();
    });

    anchor.addEventListener('keydown', (event) => {
      if (!['Enter', ' ', 'ArrowDown'].includes(event.key)) return;

      event.preventDefault();
      toggleSongPicker(anchor);
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
    songPosition?.setAttribute('aria-expanded', String(anchor === songPosition));
    stageSongPicker?.setAttribute('aria-expanded', String(anchor === stageSongPicker));
  }

  function closeSongPicker() {
    songPickerMenu.hidden = true;
    songPickerAnchor = null;
    songPosition?.setAttribute('aria-expanded', 'false');
    stageSongPicker?.setAttribute('aria-expanded', 'false');
  }

  function positionSongPicker(anchor) {
    const rect = anchor.getBoundingClientRect();
    const menuWidth = Math.min(300, Math.max(220, window.innerWidth - 24));
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.left + (rect.width / 2) - (menuWidth / 2)));
    const top = Math.min(window.innerHeight - 80, rect.bottom + 8);

    songPickerMenu.style.width = `${menuWidth}px`;
    songPickerMenu.style.left = `${left}px`;
    songPickerMenu.style.top = `${top}px`;
  }

  function updateSongPickerActive() {
    if (!songPickerMenu) return;

    songPickerMenu.querySelectorAll('[data-song-index]').forEach((option) => {
      const isCurrent = Number(option.dataset.songIndex) === currentSongIndex;
      option.classList.toggle('is-current', isCurrent);
      option.setAttribute('aria-current', isCurrent ? 'true' : 'false');
    });
  }

  function togglePerformanceFullscreen() {
    toggleInternalFullscreen(wrapper, fullscreenButton, renderCurrentSong);
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
    updateSongPickerActive();
  }

  function notifySongChange() {
    const song = songs[currentSongIndex];
    if (!song || typeof options.onSongChange !== 'function') return;

    options.onSongChange({
      musicaId: song.dataset.musicaId || null,
      repertorioMusicaId: song.dataset.repertorioMusicaId || null,
      currentSongIndex,
      transposeSemitones: songSemitones[currentSongIndex] || 0,
      capo,
    });
  }

  function saveCurrentSongKey() {
    const song = songs[currentSongIndex];
    const associationId = song?.dataset.repertorioMusicaId;
    const key = song?.querySelector('.current-key')?.textContent?.trim();

    if (!associationId || !key || key === '-') return;

    saveTomQueue = saveTomQueue
      .catch(() => undefined)
      .then(async () => {
        const { error } = await updateTomMusicaRepertorio(associationId, key);

        if (error) {
          throw error;
        }
      })
      .catch((error) => {
        window.alert(error.message || 'Nao foi possivel salvar o tom desta musica no repertorio.');
      });
  }
}

function createSongPickerMenu(songs = []) {
  if (!songs.length) return null;

  const menu = document.createElement('div');
  menu.className = 'repertorio-song-picker-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Musicas do repertorio');
  menu.hidden = true;

  songs.forEach((song, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'repertorio-song-picker-option';
    option.dataset.songIndex = String(index);
    option.setAttribute('role', 'menuitem');
    option.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(getSongTitle(song))}</strong>
    `;
    menu.append(option);
  });

  return menu;
}

function getSongTitle(song) {
  return song?.querySelector('.repertorio-current-song-title')?.textContent?.trim() || 'Musica sem titulo';
}

function getInitialSongIndex(songs, options = {}) {
  if (options.initialRepertorioMusicaId) {
    const index = songs.findIndex((song) => song.dataset.repertorioMusicaId === options.initialRepertorioMusicaId);
    if (index >= 0) return index;
  }

  if (options.initialMusicaId) {
    const index = songs.findIndex((song) => song.dataset.musicaId === options.initialMusicaId);
    if (index >= 0) return index;
  }

  if (Number.isInteger(options.initialSongIndex) && options.initialSongIndex >= 0 && options.initialSongIndex < songs.length) {
    return options.initialSongIndex;
  }

  return -1;
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
    const baseSemitones = Number(keyElement?.dataset.baseSemitones || 0);
    const totalSemitones = baseSemitones + semitones;

    if (keyElement) {
      const displayedKey = transposeKey(keyElement.dataset.originalKey || '-', totalSemitones);
      keyElement.textContent = displayedKey;
    }

    if (view) {
      const displayedCifra = transposeCifraOriginal(view.dataset.originalCifra || '', totalSemitones - capo);
      view.innerHTML = renderMusicaCifraForDisplayHtml(song.cifraMusica || {}, {
        cifra: displayedCifra,
        includeVoiceLegend: false,
      });
      song
        .querySelectorAll('[data-role="performance-title-voice-legend"]')
        .forEach((voiceLegend) => {
          voiceLegend.innerHTML = renderVoiceLegendHtml(displayedCifra);
        });
      fitPerformanceCifraToWidth(wrapper, view, displayedCifra, desiredFontSize, fitFontToMobileWidth);
    }

    if (linkButton) {
      setPerformanceSongLinkState(linkButton, song.dataset.link);
    }

    status.textContent = formatPerformanceTransposeStatus(semitones, capo);
  });

  if (songPosition) {
    songPosition.textContent = songs.length ? `${currentSongIndex + 1}/${songs.length}` : '0/0';
  }

  const stageSongPosition = wrapper.querySelector('[data-role="stage-song-position"]');
  if (stageSongPosition) {
    stageSongPosition.textContent = songs.length ? `${currentSongIndex + 1}/${songs.length}` : '0/0';
  }

  const stageCurrentSong = wrapper.querySelector('[data-role="stage-current-song"]');
  if (stageCurrentSong) {
    const currentSongTitle = songs[currentSongIndex]?.querySelector('.repertorio-current-song-title')?.textContent || '';
    stageCurrentSong.textContent = currentSongTitle ? `Agora: ${currentSongTitle}` : '';
  }

  wrapper.style.setProperty(
    '--repertorio-progress',
    songs.length ? `${((currentSongIndex + 1) / songs.length) * 100}%` : '0%',
  );

  previousSongButton.disabled = currentSongIndex <= 0;
  nextSongButton.disabled = currentSongIndex >= songs.length - 1;
}
