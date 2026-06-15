import { getMusicaById } from '../../../services/musicasService.js';
import { setupAutoHideToolbar } from '../../../utils/autoHideToolbar.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml, transposeCifraOriginal } from '../../../utils/chordpro.js';
import {
  createPerformanceToolbar,
  fitCifraToWidth,
  formatTransposeStatus,
  getCurrentPerformanceFontSize,
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
  wrapper.className = 'repertorio-performance-view repertorio-song-view';
  const { title, key, link, cifraOriginal } = getPerformanceSongData(musica);

  wrapper.innerHTML = `
    ${createPerformanceToolbar({
      backHref: returnTo,
      linkHref: link && link !== '-' ? link : '',
    })}
    <section class="performance-song">
      <header class="repertorio-song-title-bar">
        <h2>${escapeHtml(title)}</h2>
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
    if (twoColumns) {
      const wrappedCifra = renderTwoColumnChordText(displayedCifra, view);
      view.classList.add('is-experimental-two-column');
      view.textContent = wrappedCifra;
      setPerformanceFontSize(wrapper, fontSize);
    } else {
      view.classList.remove('is-experimental-two-column');
      view.innerHTML = renderCifraOriginalForDisplayHtml(displayedCifra);
      fitCifraToWidth(wrapper, view, displayedCifra, fontSize, fitFontToMobileWidth);
    }
    transposeStatus.textContent = formatTransposeStatus(semitones, capo);
  }
}

function renderTwoColumnChordText(cifra, view) {
  const maxChars = getTwoColumnLineCapacity(view);
  const lines = String(cifra || '').split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] || '';
    const nextLine = lines[index + 1] || '';

    if (isChordOnlyLine(line) && nextLine && !isChordOnlyLine(nextLine)) {
      output.push(...wrapChordLyricPair(line, nextLine, maxChars));
      index += 1;
      continue;
    }

    if (line.length > maxChars && !isChordOnlyLine(line)) {
      output.push(...wrapTextLine(line, maxChars).map((segment) => segment.text.trimEnd()));
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

function wrapChordLyricPair(chordLine, lyricLine, maxChars) {
  const chords = getChordPositions(chordLine);
  const segments = wrapTextLine(lyricLine, maxChars);
  const output = [];

  segments.forEach((segment, segmentIndex) => {
    const isLastSegment = segmentIndex === segments.length - 1;
    const segmentChords = chords
      .filter(({ position }) => (
        position >= segment.start
        && (position < segment.end || (isLastSegment && position >= segment.start))
      ))
      .map(({ chord, position }) => ({
        chord,
        position: Math.max(0, Math.min(segment.text.length, position - segment.start)),
      }));

    const renderedChordLine = renderPositionedChordLine(segmentChords, segment.text.length);
    if (renderedChordLine.trim()) {
      output.push(renderedChordLine);
    }
    output.push(segment.text.trimEnd());
  });

  return output;
}

function wrapTextLine(line, maxChars) {
  const value = String(line || '');
  if (!value || value.length <= maxChars) {
    return [{ text: value, start: 0, end: value.length }];
  }

  const segments = [];
  let start = 0;

  while (start < value.length) {
    const limit = Math.min(value.length, start + maxChars);
    let end = limit;

    if (limit < value.length) {
      const minBreak = start + Math.max(10, Math.floor(maxChars * 0.55));
      const breakAt = value.lastIndexOf(' ', limit);
      if (breakAt >= minBreak) {
        end = breakAt + 1;
      }
    }

    segments.push({
      text: value.slice(start, end),
      start,
      end,
    });
    start = end;
  }

  return segments;
}

function renderPositionedChordLine(chords, lyricLength) {
  const cells = Array.from({ length: Math.max(lyricLength, 1) }, () => ' ');

  chords.forEach(({ chord, position }) => {
    let cursor = Math.max(0, Math.floor(position));
    while (cursor < cells.length && cells[cursor] !== ' ') {
      cursor += 1;
    }

    [...chord].forEach((char, offset) => {
      cells[cursor + offset] = char;
    });
  });

  return cells.join('').trimEnd();
}

function getChordPositions(line) {
  return [...String(line || '').matchAll(/\S+/g)]
    .filter((match) => isChordToken(match[0]))
    .map((match) => ({
      chord: match[0],
      position: match.index || 0,
    }));
}

function getTwoColumnLineCapacity(view) {
  const style = window.getComputedStyle(view);
  const padding = Number.parseFloat(style.paddingLeft || '0') + Number.parseFloat(style.paddingRight || '0');
  const columnGap = Number.parseFloat(style.columnGap || '28') || 28;
  const availableWidth = Math.max(120, view.clientWidth - padding);
  const columnWidth = Math.max(80, (availableWidth - columnGap) / 2);
  const charWidth = measureMonoCharWidth(style);

  return Math.max(18, Math.floor(columnWidth / charWidth));
}

function measureMonoCharWidth(style) {
  const canvas = measureMonoCharWidth.canvas || document.createElement('canvas');
  measureMonoCharWidth.canvas = canvas;
  const context = canvas.getContext('2d');

  if (!context) return Number.parseFloat(style.fontSize || '16') * 0.62;

  context.font = [
    style.fontStyle || 'normal',
    style.fontVariant || 'normal',
    style.fontWeight || '400',
    style.fontSize || '16px',
    style.fontFamily || 'monospace',
  ].join(' ');

  return Math.max(1, context.measureText('M').width);
}

function isChordOnlyLine(line) {
  const tokens = String(line || '').trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isChordToken);
}

function isChordToken(value) {
  return /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?$/i.test(String(value || ''));
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
