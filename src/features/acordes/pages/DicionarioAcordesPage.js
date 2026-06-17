import { filterChordsByName, getChordDictionary } from '../data/chordDictionary.js';

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

export function DicionarioAcordesPage() {
  const page = document.createElement('section');
  page.className = 'page chord-dictionary-page';

  const chords = getChordDictionary();

  page.innerHTML = `
    <header class="dashboard-header chord-dictionary-header">
      <div>
        <span class="dashboard-kicker">Violao</span>
        <h1>Dicionario de acordes</h1>
        <p>Digite o acorde desejado e escolha se quer visualizar posicoes com pestana ou sem pestana.</p>
      </div>
      <div class="dashboard-summary">
        <span><strong>${chords.length}</strong> posicoes</span>
      </div>
    </header>

    <section class="chord-dictionary-tools">
      <label>
        Buscar acorde
        <input data-field="search" type="search" placeholder="Ex: C, Am, F#7, Bbmaj7">
      </label>
      <label class="chord-barre-toggle">
        <input data-field="barre" type="checkbox">
        <span>Mostrar acordes com pestana</span>
      </label>
    </section>

    <section class="chord-dictionary-results" aria-live="polite"></section>
  `;

  const searchInput = page.querySelector('[data-field="search"]');
  const barreInput = page.querySelector('[data-field="barre"]');
  const results = page.querySelector('.chord-dictionary-results');

  function render() {
    const query = normalizeText(searchInput.value);
    const shouldShowBarre = barreInput.checked;
    const filtered = filterChordsByName(chords, query)
      .filter((chord) => hasBarre(chord) === shouldShowBarre)
      .sort(compareChordPosition)
      .slice(0, 96);

    if (!filtered.length) {
      results.replaceChildren(createEmptyState());
      return;
    }

    const list = document.createElement('div');
    list.className = 'chord-card-grid';
    filtered.forEach((chord) => list.append(createChordCard(chord)));
    results.replaceChildren(list);
  }

  searchInput.addEventListener('input', render);
  barreInput.addEventListener('change', render);

  render();
  return page;
}

function createChordCard(chord) {
  const article = document.createElement('article');
  article.className = 'chord-card';
  article.innerHTML = `
    <header>
      <div>
        <h2>${escapeHtml(chord.name)}</h2>
        <p>${escapeHtml(chord.quality)} - shape ${escapeHtml(chord.shape)}</p>
      </div>
      <span>${chord.baseFret > 1 ? `${chord.baseFret}a casa` : 'Casa 1'}</span>
    </header>
    ${createChordDiagram(chord)}
  `;

  return article;
}

function hasBarre(chord) {
  return createBarres(chord, chord.baseFret, 5).length > 0;
}

function compareChordPosition(a, b) {
  return getFirstPositiveFret(a) - getFirstPositiveFret(b)
    || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    || a.shape.localeCompare(b.shape, 'pt-BR', { sensitivity: 'base' });
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
  const barresData = createBarres(chord, minFret, fretCount);
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

function createBarres(chord, minFret, fretCount) {
  const groups = new Map();

  chord.frets.forEach((fret, stringIndex) => {
    const finger = chord.fingers[stringIndex];
    if (!finger || finger === 0 || fret < minFret || fret >= minFret + fretCount) return;

    const key = `${fret}-${finger}`;
    const group = groups.get(key) || { fret, finger: String(finger), strings: [] };
    group.strings.push(stringIndex);
    groups.set(key, group);
  });

  return [...groups.values()]
    .filter((group) => group.strings.length >= 2)
    .map((group) => ({
      fret: group.fret,
      finger: group.finger,
      startString: Math.min(...group.strings),
      endString: Math.max(...group.strings),
    }))
    .filter((barre) => barre.endString > barre.startString);
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

function createEmptyState() {
  const state = document.createElement('p');
  state.className = 'page-status';
  state.textContent = 'Nenhum acorde encontrado para esta busca.';
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
