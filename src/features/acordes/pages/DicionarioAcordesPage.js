import {
  CHORD_QUALITIES,
  CHORD_ROOTS,
  findChordVoicings,
  getChordDictionarySize,
} from '../data/chordDictionary.js';
import { generatePlayableChordVoicings } from '../data/playableChordVoicings.js';

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

export function DicionarioAcordesPage() {
  const page = document.createElement('section');
  page.className = 'page chord-dictionary-page';

  const chordTypeCount = getChordDictionarySize();

  page.innerHTML = `
    <header class="dashboard-header chord-dictionary-header">
      <div>
        <span class="dashboard-kicker">Violao</span>
        <h1>Dicionario de acordes</h1>
        <p data-page-info>Digite o acorde desejado para ver formatos praticos no braco do violao.</p>
      </div>
      <div class="dashboard-summary">
        <span><strong>${chordTypeCount}</strong> acordes</span>
      </div>
    </header>

    <section class="chord-dictionary-tools">
      <div class="chord-search-field">
        <label>
          Buscar acorde
          <input data-field="search" type="search" inputmode="text" autocomplete="off" placeholder="Ex: C, Am, F#7, Bbmaj7" aria-describedby="chord-search-help">
        </label>
        <button class="nav-button chord-clear-search" type="button" data-action="clear-search" hidden aria-label="Limpar busca" title="Limpar busca">&times;</button>
      </div>
      <label>
        Exibição
        <select data-field="mode">
          <option value="recommended">Formas recomendadas</option>
          <option value="playable">Explorar posições tocáveis</option>
        </select>
      </label>
      <label class="chord-barre-toggle">
        <input data-field="with-barre" type="checkbox" checked>
        <span>Com pestanas</span>
      </label>
      <label class="chord-barre-toggle">
        <input data-field="without-barre" type="checkbox" checked>
        <span>Sem pestanas</span>
      </label>
      <p id="chord-search-help" class="chord-search-help">Toque em uma nota para preencher a busca; use m, 7, maj7, sus4 e outros sufixos.</p>
      <div class="chord-root-shortcuts" aria-label="Atalhos de notas">
        ${CHORD_ROOTS.map((root) => `<button class="chord-root-button" type="button" data-root="${escapeHtml(root)}">${escapeHtml(root)}</button>`).join('')}
      </div>
      <div class="chord-quality-shortcuts" aria-label="Atalhos de tipos de acorde">
        ${CHORD_QUALITIES.slice(0, 8).map((quality) => `<button class="chord-quality-button" type="button" data-quality="${escapeHtml(quality.suffix)}">${escapeHtml(quality.suffix || 'Maior')}</button>`).join('')}
      </div>
    </section>

    <section class="chord-dictionary-results" aria-live="polite"></section>
  `;

  const searchInput = page.querySelector('[data-field="search"]');
  const withBarreInput = page.querySelector('[data-field="with-barre"]');
  const withoutBarreInput = page.querySelector('[data-field="without-barre"]');
  const modeInput = page.querySelector('[data-field="mode"]');
  const clearButton = page.querySelector('[data-action="clear-search"]');
  const results = page.querySelector('.chord-dictionary-results');
  let explorerObserver = null;

  function render() {
    const query = normalizeText(searchInput.value);
    clearButton.hidden = !query;
    page.querySelectorAll('[data-root]').forEach((button) => {
      button.classList.toggle('is-active', getChordRoot(query) === button.dataset.root);
    });
    if (!query) {
      results.replaceChildren(createChordDiscoveryState());
      return;
    }

    const shouldIncludeBarre = withBarreInput.checked;
    const shouldIncludeNoBarre = withoutBarreInput.checked;
    if (modeInput.value === 'playable') {
      renderPlayableExplorer(query, { shouldIncludeBarre, shouldIncludeNoBarre });
      return;
    }
    explorerObserver?.disconnect();
    const filtered = findChordVoicings(query)
      .filter((chord) => (hasBarre(chord) ? shouldIncludeBarre : shouldIncludeNoBarre))
      .filter((chord) => !hasRepeatedFourthFinger(chord))
      .sort(compareChordPosition);

    if (!filtered.length) {
      results.replaceChildren(createEmptyState('Nenhum acorde encontrado para esta busca.'));
      return;
    }

    const fragment = document.createDocumentFragment();
    fragment.append(createChordResultSummary(query, filtered));
    const list = document.createElement('div');
    list.className = 'chord-card-grid';
    filtered.forEach((chord) => list.append(createChordCard(chord)));
    fragment.append(list);
    results.replaceChildren(fragment);
  }

  searchInput.addEventListener('input', render);
  [withBarreInput, withoutBarreInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (!withBarreInput.checked && !withoutBarreInput.checked) input.checked = true;
      render();
    });
  });
  modeInput.addEventListener('change', render);
  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    render();
  });
  page.querySelectorAll('[data-root]').forEach((button) => {
    button.addEventListener('click', () => {
      const currentSuffix = getChordSuffix(searchInput.value);
      searchInput.value = `${button.dataset.root}${currentSuffix}`;
      searchInput.focus();
      render();
    });
  });
  page.querySelectorAll('[data-quality]').forEach((button) => {
    button.addEventListener('click', () => {
      const root = getChordRoot(searchInput.value) || 'C';
      searchInput.value = `${root}${button.dataset.quality}`;
      searchInput.focus();
      render();
    });
  });

  render();
  return page;

  function renderPlayableExplorer(query, { shouldIncludeBarre, shouldIncludeNoBarre }) {
    explorerObserver?.disconnect();
    const shell = document.createElement('section');
    shell.className = 'chord-explorer';
    shell.innerHTML = `
      <div class="chord-result-summary">
        <div>
          <span class="dashboard-kicker">Explorador de posições tocáveis</span>
          <h2>${escapeHtml(formatChordQuery(query))}</h2>
        </div>
        <p>As posições são calculadas por região do braço. Apenas combinações tocáveis são exibidas.</p>
      </div>
      <div class="chord-explorer-regions"></div>
      <div class="chord-explorer-loader" aria-live="polite">Carregando próximas posições...</div>
    `;
    const regions = shell.querySelector('.chord-explorer-regions');
    const loader = shell.querySelector('.chord-explorer-loader');
    let nextFret = 0;

    function loadNextRegion() {
      if (nextFret > 20) {
        loader.textContent = 'Você chegou ao fim do braço mapeado.';
        explorerObserver?.disconnect();
        return;
      }

      const startFret = nextFret;
      const endFret = Math.min(startFret + 4, 20);
      const voicings = generatePlayableChordVoicings(query, { startFret, endFret })
        .filter((chord) => (hasBarre(chord) ? shouldIncludeBarre : shouldIncludeNoBarre))
        .filter((chord) => !hasRepeatedFourthFinger(chord));
      nextFret = endFret + 1;

      if (voicings.length) regions.append(createExplorerRegion(startFret, endFret, voicings));
      if (nextFret > 20) {
        loader.textContent = 'Você chegou ao fim do braço mapeado.';
        explorerObserver?.disconnect();
      } else {
        loader.textContent = 'Role para carregar as próximas posições tocáveis.';
      }
    }

    results.replaceChildren(shell);
    loadNextRegion();

    if ('IntersectionObserver' in window) {
      explorerObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadNextRegion();
      }, { rootMargin: '420px 0px' });
      explorerObserver.observe(loader);
    } else {
      loader.addEventListener('click', loadNextRegion);
      loader.title = 'Toque para carregar mais posições';
    }
  }
}

function createChordCard(chord) {
  const article = document.createElement('article');
  article.className = 'chord-card';
  article.innerHTML = `
    <header>
      <div>
        <h2>${escapeHtml(chord.name)}</h2>
        <p>${escapeHtml(chord.quality)} · ${getBarreLabel(chord)}</p>
      </div>
      <span>${getPositionLabel(chord)}</span>
    </header>
    ${createChordDiagram(chord)}
    <footer class="chord-card-meta">
      <span>${getDifficultyLabel(chord)}</span>
      <span>${chord.playedStringCount}/6 cordas</span>
    </footer>
  `;

  return article;
}

function createExplorerRegion(startFret, endFret, chords) {
  const region = document.createElement('section');
  region.className = 'chord-explorer-region';
  region.innerHTML = `
    <header><h3>${startFret === 0 ? 'Região aberta · casas 0 a 4' : `Casas ${startFret} a ${endFret}`}</h3><span>${chords.length} formas tocáveis</span></header>
    <div class="chord-card-grid"></div>
  `;
  const grid = region.querySelector('.chord-card-grid');
  chords.forEach((chord) => grid.append(createChordCard(chord)));
  return region;
}

function getBarreLabel(chord) {
  return hasBarre(chord) ? 'com pestana' : 'sem pestana';
}

function getPositionLabel(chord) {
  return chord.baseFret > 1 ? `${chord.baseFret}a casa` : 'Forma aberta';
}

function getDifficultyLabel(chord) {
  if (hasBarre(chord)) return 'Pestana';
  if ((chord.lastFret || 0) - (chord.firstFret || 0) >= 4) return 'Alongamento';
  return 'Confortável';
}

function createChordResultSummary(query, chords) {
  const summary = document.createElement('section');
  summary.className = 'chord-result-summary';
  summary.innerHTML = `
    <div>
      <span class="dashboard-kicker">Acorde pesquisado</span>
      <h2>${escapeHtml(formatChordQuery(query))}</h2>
    </div>
    <p><strong>${chords.length}</strong> ${chords.length === 1 ? 'posição encontrada' : 'posições encontradas'} em todo o braço.</p>
  `;
  return summary;
}

function createChordDiscoveryState() {
  const state = document.createElement('section');
  state.className = 'chord-discovery-state';
  state.innerHTML = `
    <span class="dashboard-kicker">Comece por aqui</span>
    <h2>Encontre uma forma que caiba na sua mão e na música.</h2>
    <p>Pesquise um acorde ou escolha uma nota acima. Depois, compare as formas abertas, as pestanas e as posições altas no braço.</p>
  `;
  return state;
}

function getChordRoot(value) {
  const match = String(value || '').trim().match(/^[A-Ga-g](?:#|b)?/);
  return match ? match[0].replace(/^./, (letter) => letter.toUpperCase()) : '';
}

function getChordSuffix(value) {
  const root = getChordRoot(value);
  return root ? String(value).trim().slice(root.length) : '';
}

function formatChordQuery(query) {
  const root = getChordRoot(query);
  return root ? `${root}${getChordSuffix(query)}` : query;
}

function hasBarre(chord) {
  return getVisibleBarres(chord, chord.baseFret, 5).length > 0;
}

function hasRepeatedFourthFinger(chord) {
  return chord.fingers.filter((finger) => Number(finger) === 4).length > 1;
}

function compareChordPosition(a, b) {
  return getFirstPositiveFret(a) - getFirstPositiveFret(b)
    || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    || (a.lastFret || 0) - (b.lastFret || 0)
    || (b.playedStringCount || 0) - (a.playedStringCount || 0)
    || a.id.localeCompare(b.id, 'pt-BR', { sensitivity: 'base' });
}

function getFirstPositiveFret(chord) {
  const frets = chord.frets.filter((fret) => fret > 0);
  return frets.length ? Math.min(...frets) : 0;
}

function createChordDiagram(chord) {
  const minFret = chord.baseFret;
  const fretCount = 5;
  const board = createChordBoard(chord, minFret, fretCount);

  return `
    <div class="chord-diagram" aria-label="Diagrama do acorde ${escapeHtml(chord.name)}">
      <div class="chord-strings">${STRING_LABELS.map((label) => `<span>${label}</span>`).join('')}</div>
      ${board}
      <div class="chord-fret-labels">
        ${Array.from({ length: fretCount }, (_, index) => `<span>${minFret + index}</span>`).join('')}
      </div>
    </div>
  `;
}

function createChordBoard(chord, minFret, fretCount) {
  const barresData = getVisibleBarres(chord, minFret, fretCount);
  const stringStates = chord.frets.map((fret, stringIndex) => {
    const marker = fret === -1 ? 'X' : fret === 0 ? 'O' : '';
    return `<span class="chord-string-state" style="left: ${getStringPosition(stringIndex)}%;">${marker}</span>`;
  }).join('');

  const strings = STRING_LABELS.map((_, stringIndex) => (
    `<span class="chord-string-line" style="left: ${getStringPosition(stringIndex)}%;"></span>`
  )).join('');

  const frets = Array.from({ length: fretCount + 1 }, (_, index) => (
    `<span class="chord-fret-line${index === 0 ? ' is-nut' : ''}" style="top: ${getFretLinePosition(index, fretCount)}%;"></span>`
  )).join('');

  const barres = barresData.map((barre) => `
    <span
      class="chord-barre"
      style="
        left: ${getStringPosition(barre.startString)}%;
        width: ${getStringPosition(barre.endString) - getStringPosition(barre.startString)}%;
        top: ${getFretNotePosition(barre.fret - minFret, fretCount)}%;
      "
    >${escapeHtml(barre.finger)}</span>
  `).join('');

  const notes = chord.frets.map((fret, stringIndex) => {
    if (fret < minFret || fret >= minFret + fretCount) return '';

    const finger = chord.fingers[stringIndex] || '';
    const barre = barresData.find((item) => (
      item.fret === fret
      && item.finger === finger
      && stringIndex >= item.startString
      && stringIndex <= item.endString
    ));

    if (barre) return '';

    return `
      <span
        class="chord-note"
        style="left: ${getStringPosition(stringIndex)}%; top: ${getFretNotePosition(fret - minFret, fretCount)}%;"
      >${escapeHtml(finger)}</span>
    `;
  }).join('');

  return `
    <div class="chord-board">
      <div class="chord-string-states">${stringStates}</div>
      <div class="chord-fret-area">
        ${strings}
        ${frets}
        ${barres}
        ${notes}
      </div>
    </div>
  `;
}

function getVisibleBarres(chord, minFret, fretCount) {
  return (chord.barres || []).filter((barre) => (
    barre.fret >= minFret
    && barre.fret < minFret + fretCount
    && barre.endString > barre.startString
  ));
}

function getStringPosition(stringIndex) {
  return (stringIndex / (STRING_LABELS.length - 1)) * 100;
}

function getFretLinePosition(lineIndex, fretCount) {
  return (lineIndex / fretCount) * 100;
}

function getFretNotePosition(fretOffset, fretCount) {
  return ((fretOffset + 0.5) / fretCount) * 100;
}

function createEmptyState(message) {
  const state = document.createElement('p');
  state.className = 'page-status';
  state.textContent = message;
  return state;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
