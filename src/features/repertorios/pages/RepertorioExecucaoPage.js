import {
  getRepertorioById,
  listMusicasDoRepertorio,
} from '../../../services/repertoriosService.js';
import { transposeCifraOriginal, transposeKey } from '../../../utils/chordpro.js';

export async function RepertorioExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

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

    page.replaceChildren(createPerformanceView({
      repertorio,
      musicasAssociadas: normalizeOrder(musicasAssociadas || []),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function createPerformanceView({ repertorio, musicasAssociadas }) {
  const wrapper = document.createElement('article');
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <a class="back-link" href="/repertorios/detalhe?id=${encodeURIComponent(repertorio.id)}">Voltar para edicao</a>
    <header class="performance-header">
      <h1>${escapeHtml(nome)}</h1>
      <p>${escapeHtml(data)}</p>
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
      <button class="nav-button" type="button" data-action="previous-song">Anterior</button>
      <button class="nav-button" type="button" data-action="next-song">Proxima</button>
      <button class="nav-button" type="button" data-action="fullscreen">Tela cheia</button>
      <button class="nav-button" type="button" data-action="print">Imprimir</button>
      <button class="nav-button" type="button" data-action="transpose-down">-1</button>
      <span class="transpose-status" data-role="transpose-status">Original</span>
      <button class="nav-button" type="button" data-action="transpose-up">+1</button>
      <button class="nav-button" type="button" data-action="transpose-reset">Original</button>
      <label>
        Capotraste
        <select data-action="capo">
          ${createCapoOptions()}
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
    setupPerformanceControls(wrapper);
    return wrapper;
  }

  musicasAssociadas.forEach((item, index) => {
    list.append(createSongBlock(item, index + 1));
  });

  setupPerformanceControls(wrapper);
  return wrapper;
}

function createSongBlock(item, number) {
  const musica = item.musicas || {};
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(musica, ['tom', 'key']);
  const cifraOriginal = getField(musica, ['cifra_original']);

  const block = document.createElement('section');
  block.className = 'performance-song';
  block.id = `musica-${number}`;
  block.tabIndex = -1;
  block.innerHTML = `
    <header>
      <span>${number}</span>
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(artist)} - Tom: <span class="current-key" data-original-key="${escapeHtml(key)}">${escapeHtml(key)}</span></p>
      </div>
    </header>
    <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifraOriginal)}">${escapeHtml(cifraOriginal)}</pre>
  `;

  return block;
}

function setupPerformanceControls(wrapper) {
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
  const transposeResetButton = wrapper.querySelector('[data-action="transpose-reset"]');
  const transposeStatus = wrapper.querySelector('[data-role="transpose-status"]');
  const capoSelect = wrapper.querySelector('[data-action="capo"]');
  const songs = [...wrapper.querySelectorAll('.performance-song')];
  let scrollTimer = null;
  let currentSongIndex = 0;
  let semitones = 0;
  let capo = Number(window.localStorage.getItem('masterCifras.performanceCapo') || 0);

  const savedTheme = window.localStorage.getItem('masterCifras.performanceTheme') || 'light';
  const savedFontSize = window.localStorage.getItem('masterCifras.performanceFontSize') || '18';
  const savedSpeed = window.localStorage.getItem('masterCifras.performanceScrollSpeed') || '3';

  fontSizeInput.value = savedFontSize;
  speedInput.value = savedSpeed;
  capoSelect.value = String(capo);
  setPerformanceTheme(wrapper, themeButton, savedTheme);
  setPerformanceFontSize(wrapper, savedFontSize);
  renderTransposedPerformance(wrapper, semitones, capo, transposeStatus);

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

  previousSongButton.disabled = songs.length <= 1;
  nextSongButton.disabled = songs.length <= 1;

  previousSongButton.addEventListener('click', () => {
    currentSongIndex = Math.max(0, getCurrentSongIndex(songs) - 1);
    scrollToSong(songs, currentSongIndex);
  });

  nextSongButton.addEventListener('click', () => {
    currentSongIndex = Math.min(songs.length - 1, getCurrentSongIndex(songs) + 1);
    scrollToSong(songs, currentSongIndex);
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
    renderTransposedPerformance(wrapper, semitones, capo, transposeStatus);
  });

  transposeUpButton.addEventListener('click', () => {
    semitones += 1;
    renderTransposedPerformance(wrapper, semitones, capo, transposeStatus);
  });

  transposeResetButton.addEventListener('click', () => {
    semitones = 0;
    renderTransposedPerformance(wrapper, semitones, capo, transposeStatus);
  });

  capoSelect.addEventListener('change', () => {
    capo = Number(capoSelect.value || 0);
    window.localStorage.setItem('masterCifras.performanceCapo', String(capo));
    renderTransposedPerformance(wrapper, semitones, capo, transposeStatus);
  });
}

function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.textContent = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
}

function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
}

function getCurrentSongIndex(songs) {
  if (!songs.length) return 0;

  const toolbarOffset = 96;

  for (let index = songs.length - 1; index >= 0; index -= 1) {
    if (songs[index].getBoundingClientRect().top <= toolbarOffset) {
      return index;
    }
  }

  return 0;
}

function scrollToSong(songs, index) {
  const song = songs[index];

  if (!song) return;

  song.scrollIntoView({ behavior: 'smooth', block: 'start' });
  song.focus({ preventScroll: true });
}

function renderTransposedPerformance(wrapper, semitones, capo, status) {
  wrapper.querySelectorAll('.chordpro-view').forEach((view) => {
    view.textContent = transposeCifraOriginal(view.dataset.originalCifra || '', semitones - capo);
  });

  wrapper.querySelectorAll('.current-key').forEach((key) => {
    key.textContent = transposeKey(key.dataset.originalKey || '-', semitones);
  });

  status.textContent = formatTransposeStatus(semitones, capo);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
