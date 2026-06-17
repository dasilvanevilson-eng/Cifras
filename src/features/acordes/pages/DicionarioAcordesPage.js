import { CHORD_QUALITIES, CHORD_ROOTS, getChordDictionary } from '../data/chordDictionary.js';

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
        <p>Busque acordes por nome, nota ou tipo e veja posicoes para tocar no violao.</p>
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
      <label>
        Nota
        <select data-field="root">
          <option value="">Todas</option>
          ${CHORD_ROOTS.map((root) => `<option value="${root}">${root}</option>`).join('')}
        </select>
      </label>
      <label>
        Tipo
        <select data-field="quality">
          <option value="">Todos</option>
          ${CHORD_QUALITIES.map((quality) => `<option value="${quality.suffix}">${escapeHtml(quality.label)}</option>`).join('')}
        </select>
      </label>
    </section>

    <section class="chord-dictionary-results" aria-live="polite"></section>
  `;

  const searchInput = page.querySelector('[data-field="search"]');
  const rootSelect = page.querySelector('[data-field="root"]');
  const qualitySelect = page.querySelector('[data-field="quality"]');
  const results = page.querySelector('.chord-dictionary-results');

  function render() {
    const query = normalizeText(searchInput.value);
    const selectedRoot = rootSelect.value;
    const selectedQuality = qualitySelect.value;
    const filtered = chords
      .filter((chord) => !selectedRoot || chord.root === selectedRoot)
      .filter((chord) => !selectedQuality || chord.suffix === selectedQuality)
      .filter((chord) => !query || chord.searchText.includes(query))
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
  rootSelect.addEventListener('change', render);
  qualitySelect.addEventListener('change', render);

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

function createChordDiagram(chord) {
  const minFret = chord.baseFret;
  const fretCount = 5;
  const cells = [];

  chord.frets.forEach((fret, stringIndex) => {
    const marker = fret === -1
      ? 'X'
      : fret === 0
        ? 'O'
        : '';

    cells.push(`
      <div class="chord-string-state" style="grid-column: ${stringIndex + 1};">${marker}</div>
    `);

    for (let offset = 0; offset < fretCount; offset += 1) {
      const currentFret = minFret + offset;
      const finger = chord.fingers[stringIndex] || '';
      const hasNote = fret === currentFret;
      cells.push(`
        <div class="chord-fret-cell" style="grid-column: ${stringIndex + 1}; grid-row: ${offset + 2};">
          ${hasNote ? `<span>${escapeHtml(finger || '')}</span>` : ''}
        </div>
      `);
    }
  });

  return `
    <div class="chord-diagram" aria-label="Diagrama do acorde ${escapeHtml(chord.name)}">
      <div class="chord-strings">${STRING_LABELS.map((label) => `<span>${label}</span>`).join('')}</div>
      <div class="chord-board">
        ${cells.join('')}
      </div>
      <div class="chord-fret-labels">
        ${Array.from({ length: fretCount }, (_, index) => `<span>${minFret + index}</span>`).join('')}
      </div>
    </div>
  `;
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
