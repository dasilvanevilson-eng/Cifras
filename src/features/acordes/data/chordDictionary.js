const ROOTS = [
  { name: 'C', aliases: ['C', 'Do'] },
  { name: 'C#', aliases: ['C#', 'Db', 'Do#', 'Reb'] },
  { name: 'D', aliases: ['D', 'Re'] },
  { name: 'D#', aliases: ['D#', 'Eb', 'Re#', 'Mib'] },
  { name: 'E', aliases: ['E', 'Mi'] },
  { name: 'F', aliases: ['F', 'Fa'] },
  { name: 'F#', aliases: ['F#', 'Gb', 'Fa#', 'Solb'] },
  { name: 'G', aliases: ['G', 'Sol'] },
  { name: 'G#', aliases: ['G#', 'Ab', 'Sol#', 'Lab'] },
  { name: 'A', aliases: ['A', 'La'] },
  { name: 'A#', aliases: ['A#', 'Bb', 'La#', 'Sib'] },
  { name: 'B', aliases: ['B', 'Si'] },
];

const ROOT_INDEX = Object.fromEntries(ROOTS.map((root, index) => [root.name, index]));
const MAX_FRET = 20;

export const CHORD_ROOTS = ROOTS.map((root) => root.name);

export const CHORD_QUALITIES = [
  { suffix: '', label: 'Maior', search: ['maior', 'major', 'maj'] },
  { suffix: 'm', label: 'Menor', search: ['menor', 'minor', 'min'] },
  { suffix: '5', label: 'Power chord', search: ['power', 'quinta'] },
  { suffix: '6', label: 'Sexta', search: ['sexta'] },
  { suffix: 'm6', label: 'Menor sexta', search: ['menor sexta'] },
  { suffix: '7', label: 'Setima', search: ['setima', 'dominante'] },
  { suffix: 'maj7', label: 'Setima maior', search: ['7m', 'major seventh'] },
  { suffix: 'm7', label: 'Menor setima', search: ['menor setima'] },
  { suffix: 'mMaj7', label: 'Menor com setima maior', search: ['menor maior'] },
  { suffix: 'sus2', label: 'Suspenso 2', search: ['suspenso 2'] },
  { suffix: 'sus4', label: 'Suspenso 4', search: ['suspenso 4', 'sus'] },
  { suffix: '7sus4', label: 'Setima suspenso 4', search: ['setima suspenso'] },
  { suffix: 'add9', label: 'Nona adicionada', search: ['nona adicionada'] },
  { suffix: '9', label: 'Nona adicionada', search: ['nona', 'add9'] },
  { suffix: 'm9', label: 'Menor nona', search: ['menor nona'] },
  { suffix: 'maj9', label: 'Nona maior', search: ['maior nona'] },
  { suffix: 'dim', label: 'Diminuto', search: ['diminuto'] },
  { suffix: 'dim7', label: 'Diminuto setima', search: ['diminuto setima'] },
  { suffix: 'm7b5', label: 'Meio diminuto', search: ['meio diminuto'] },
  { suffix: 'aug', label: 'Aumentado', search: ['aumentado'] },
];

const QUALITY_MAP = new Map(CHORD_QUALITIES.map((quality) => [quality.suffix, quality]));

const BASE_VOICINGS = {
  '': [
    { root: 'A', frets: [-1, 0, 2, 2, 2, 0] },
    { root: 'C', frets: [-1, 3, 2, 0, 1, 0] },
    { root: 'C', frets: [-1, 3, 2, 0, 1, 3] },
    { root: 'C', frets: [-1, 3, 2, 0, 5, 3] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 2] },
    { root: 'E', frets: [0, 2, 2, 1, 0, 0] },
    { root: 'F', frets: [1, 3, 3, 2, 1, 1] },
    { root: 'G', frets: [3, 2, 0, 0, 0, 3] },
    { root: 'G', frets: [3, 2, 0, 0, 3, 3] },
    { root: 'C', frets: [-1, 3, 5, 5, 5, -1] },
    { root: 'C', frets: [-1, 3, 5, 5, 5, 3] },
    { root: 'C', frets: [8, 7, 5, 5, 5, 8] },
    { root: 'C', frets: [8, 10, 10, 9, 8, 8] },
    { root: 'C', frets: [-1, 10, 10, 9, 8, 8] },
    { root: 'C', frets: [-1, 10, 10, 9, 8, -1] },
    { root: 'C', frets: [-1, -1, 10, 9, 8, 8] },
    { root: 'C', frets: [-1, -1, 10, 12, 13, 12] },
    { root: 'C', frets: [12, 15, 14, 12, 13, 12] },
    { root: 'C', frets: [-1, 15, 14, 12, 13, 12] },
    { root: 'C', frets: [-1, 15, 17, 17, 17, -1] },
    { root: 'C', frets: [-1, 15, 17, 17, 17, 15] },
    { root: 'C', frets: [20, 19, 17, 17, 17, 20] },
    { root: 'C', frets: [20, -1, 17, 17, 17, 20] },
  ],
  m: [
    { root: 'A', frets: [-1, 0, 2, 2, 1, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 1] },
    { root: 'E', frets: [0, 2, 2, 0, 0, 0] },
    { root: 'F', frets: [1, 3, 3, 1, 1, 1] },
  ],
  5: [
    { root: 'A', frets: [-1, 0, 2, 2, -1, -1] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, -1] },
    { root: 'E', frets: [0, 2, 2, -1, -1, -1] },
  ],
  6: [
    { root: 'A', frets: [-1, 0, 2, 2, 2, 2] },
    { root: 'C', frets: [-1, 3, 2, 2, 1, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 0, 2] },
    { root: 'E', frets: [0, 2, 2, 1, 2, 0] },
    { root: 'G', frets: [3, 2, 0, 0, 0, 0] },
  ],
  m6: [
    { root: 'A', frets: [-1, 0, 2, 2, 1, 2] },
    { root: 'D', frets: [-1, -1, 0, 2, 0, 1] },
    { root: 'E', frets: [0, 2, 2, 0, 2, 0] },
  ],
  7: [
    { root: 'A', frets: [-1, 0, 2, 0, 2, 0] },
    { root: 'B', frets: [-1, 2, 1, 2, 0, 2] },
    { root: 'C', frets: [-1, 3, 2, 3, 1, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 1, 2] },
    { root: 'E', frets: [0, 2, 0, 1, 0, 0] },
    { root: 'F', frets: [1, 3, 1, 2, 1, 1] },
    { root: 'G', frets: [3, 2, 0, 0, 0, 1] },
  ],
  maj7: [
    { root: 'A', frets: [-1, 0, 2, 1, 2, 0] },
    { root: 'C', frets: [-1, 3, 2, 0, 0, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 2, 2] },
    { root: 'E', frets: [0, 2, 1, 1, 0, 0] },
    { root: 'F', frets: [1, 3, 2, 2, 1, 1] },
    { root: 'G', frets: [3, 2, 0, 0, 0, 2] },
  ],
  m7: [
    { root: 'A', frets: [-1, 0, 2, 0, 1, 0] },
    { root: 'B', frets: [-1, 2, 4, 2, 3, 2] },
    { root: 'D', frets: [-1, -1, 0, 2, 1, 1] },
    { root: 'E', frets: [0, 2, 0, 0, 0, 0] },
    { root: 'F', frets: [1, 3, 1, 1, 1, 1] },
    { root: 'G', frets: [3, 5, 3, 3, 3, 3] },
  ],
  mMaj7: [
    { root: 'A', frets: [-1, 0, 2, 1, 1, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 2, 1] },
    { root: 'E', frets: [0, 2, 1, 0, 0, 0] },
  ],
  sus2: [
    { root: 'A', frets: [-1, 0, 2, 2, 0, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 0] },
    { root: 'E', frets: [0, 2, 4, 4, 0, 0] },
    { root: 'G', frets: [3, 0, 0, 0, 3, 3] },
  ],
  sus4: [
    { root: 'A', frets: [-1, 0, 2, 2, 3, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 3] },
    { root: 'E', frets: [0, 2, 2, 2, 0, 0] },
    { root: 'G', frets: [3, 3, 0, 0, 1, 3] },
  ],
  '7sus4': [
    { root: 'A', frets: [-1, 0, 2, 0, 3, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 1, 3] },
    { root: 'E', frets: [0, 2, 0, 2, 0, 0] },
    { root: 'G', frets: [3, 5, 3, 5, 3, 3] },
  ],
  add9: [
    { root: 'A', frets: [-1, 0, 2, 2, 0, 0] },
    { root: 'A', frets: [-1, 0, 2, 4, 2, 0] },
    { root: 'C', frets: [-1, 3, 2, 0, 3, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 0] },
    { root: 'E', frets: [0, 2, 4, 1, 0, 0] },
    { root: 'G', frets: [3, 0, 0, 0, 0, 3] },
  ],
  9: [
    { root: 'A', frets: [-1, 0, 2, 2, 0, 0] },
    { root: 'A', frets: [-1, 0, 2, 4, 2, 0] },
    { root: 'C', frets: [-1, 3, 2, 0, 3, 0] },
    { root: 'D', frets: [-1, -1, 0, 2, 3, 0] },
    { root: 'E', frets: [0, 2, 4, 1, 0, 0] },
    { root: 'G', frets: [3, 0, 0, 0, 0, 3] },
  ],
  m9: [
    { root: 'A', frets: [5, 7, 5, 5, 5, 7] },
    { root: 'C', frets: [-1, 3, 1, 3, 3, -1] },
    { root: 'D', frets: [-1, 5, 3, 5, 5, -1] },
    { root: 'E', frets: [-1, 7, 5, 7, 7, -1] },
    { root: 'G', frets: [3, 5, 3, 3, 3, 5] },
  ],
  maj9: [
    { root: 'A', frets: [-1, -1, 7, 6, 5, 4] },
    { root: 'D', frets: [-1, -1, 0, 2, 2, 0] },
    { root: 'E', frets: [0, 9, 9, 8, 0, 0] },
    { root: 'F', frets: [-1, -1, 3, 0, 1, 0] },
    { root: 'G', frets: [-1, -1, 5, 2, 3, 2] },
  ],
  dim: [
    { root: 'A', frets: [-1, 0, 1, 2, 1, -1] },
    { root: 'B', frets: [-1, 2, 3, 4, 3, -1] },
    { root: 'D', frets: [-1, -1, 0, 1, 3, 1] },
    { root: 'E', frets: [0, 1, 2, 0, 2, 0] },
  ],
  dim7: [
    { root: 'A', frets: [-1, 0, 1, 2, 1, 2] },
    { root: 'B', frets: [-1, 2, 3, 1, 3, -1] },
    { root: 'D', frets: [-1, -1, 0, 1, 0, 1] },
    { root: 'E', frets: [0, 1, 2, 0, 2, 0] },
  ],
  m7b5: [
    { root: 'A', frets: [-1, 0, 1, 0, 1, -1] },
    { root: 'B', frets: [-1, 2, 3, 2, 3, -1] },
    { root: 'D', frets: [-1, -1, 0, 1, 1, 1] },
    { root: 'E', frets: [0, 1, 0, 0, 3, 0] },
  ],
  aug: [
    { root: 'A', frets: [-1, 0, 3, 2, 2, 1] },
    { root: 'C', frets: [-1, 3, 2, 1, 1, 0] },
    { root: 'D', frets: [-1, -1, 0, 3, 3, 2] },
    { root: 'E', frets: [0, 3, 2, 1, 1, 0] },
  ],
};

let chordDictionaryCache = null;
const chordVoicingCache = new Map();

export function getChordDictionarySize() {
  return CHORD_ROOTS.length * CHORD_QUALITIES.length;
}

export function getChordDictionary() {
  if (!chordDictionaryCache) {
    chordDictionaryCache = CHORD_ROOTS.flatMap((root) => (
      CHORD_QUALITIES.flatMap((quality) => createChord(root, quality.suffix))
    ));
  }

  return chordDictionaryCache;
}

export function getChordByName(name) {
  return findChordVoicings(name);
}

export function findChordVoicings(name) {
  const parsed = parseChordName(name);
  if (!parsed) return [];

  return createChord(parsed.root, parsed.suffix);
}

export function getChordDefinition(name) {
  const parsed = parseChordName(name);
  if (!parsed) return null;

  return {
    ...parsed,
    quality: QUALITY_MAP.get(parsed.suffix)?.label || '',
  };
}

export function filterChordsByName(chords, name) {
  const normalized = normalizeChordName(name);
  if (!normalized) return chords;

  const exactMatches = chords.filter((chord) => chord.exactSearchTerms.includes(normalized));
  return exactMatches.length
    ? exactMatches
    : chords.filter((chord) => chord.nameSearchText.includes(normalized));
}

function parseChordName(name) {
  const normalized = normalizeChordName(name);
  if (!normalized) return null;

  const aliases = ROOTS.flatMap((root) => (
    root.aliases.map((alias) => ({
      root: root.name,
      alias,
      normalizedAlias: normalizeChordName(alias),
    }))
  )).sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length);

  for (const rootAlias of aliases) {
    for (const quality of CHORD_QUALITIES) {
      const candidate = normalizeChordName(`${rootAlias.alias}${quality.suffix}`);
      if (candidate === normalized) {
        return { root: rootAlias.root, suffix: quality.suffix };
      }
    }
  }

  return null;
}

function createChord(root, suffix) {
  const cacheKey = `${root}${suffix}`;
  if (chordVoicingCache.has(cacheKey)) return chordVoicingCache.get(cacheKey);

  const quality = QUALITY_MAP.get(suffix);
  const baseVoicings = BASE_VOICINGS[suffix] || [];
  if (!quality || !baseVoicings.length) return [];

  const rootAliases = ROOTS.find((item) => item.name === root)?.aliases || [root];
  const name = `${root}${quality.suffix}`;
  const seen = new Set();
  const chords = baseVoicings
    .map((voicing) => transposeVoicing(voicing, root))
    .filter(Boolean)
    .filter((voicing) => {
      const key = voicing.frets.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(compareVoicing)
    .map((voicing, index) => createChordRecord({
      root,
      quality,
      rootAliases,
      name,
      voicing,
      index,
    }));

  chordVoicingCache.set(cacheKey, chords);
  return chords;
}

function transposeVoicing(voicing, targetRoot) {
  const offset = (ROOT_INDEX[targetRoot] - ROOT_INDEX[voicing.root] + 12) % 12;
  const frets = voicing.frets.map((fret) => (fret < 0 ? -1 : fret + offset));
  if (frets.some((fret) => fret < -1 || fret > MAX_FRET)) return null;

  const positiveFrets = frets.filter((fret) => fret > 0);
  const barres = getBarres(frets);

  return {
    frets,
    fingers: assignFingers(frets, barres),
    barres,
    baseFret: frets.includes(0) || !positiveFrets.length ? 1 : Math.min(...positiveFrets),
    firstFret: positiveFrets.length ? Math.min(...positiveFrets) : 0,
    lastFret: positiveFrets.length ? Math.max(...positiveFrets) : 0,
    playedStringCount: frets.filter((fret) => fret >= 0).length,
  };
}

function assignFingers(frets, barres = []) {
  const fingers = Array(frets.length).fill(0);
  const positiveGroups = new Map();

  frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;

    const strings = positiveGroups.get(fret) || [];
    strings.push(stringIndex);
    positiveGroups.set(fret, strings);
  });

  const mainBarre = barres[0] || null;

  if (mainBarre) {
    for (let stringIndex = mainBarre.startString; stringIndex <= mainBarre.endString; stringIndex += 1) {
      if (frets[stringIndex] !== mainBarre.fret) continue;
      fingers[stringIndex] = 1;
    }
  }

  let nextFinger = mainBarre ? 2 : 1;
  [...positiveGroups.keys()]
    .filter((fret) => fret !== mainBarre?.fret)
    .sort((a, b) => a - b)
    .forEach((fret) => {
      positiveGroups.get(fret).forEach((stringIndex) => {
        fingers[stringIndex] = Math.min(nextFinger, 4);
        nextFinger += 1;
      });
    });

  return fingers;
}

function getBarres(frets) {
  const baseFret = getBaseFret(frets);
  const firstPlayed = frets.findIndex((fret) => fret >= 0);
  const lastPlayed = frets.findLastIndex((fret) => fret >= 0);
  if (frets.includes(0) || firstPlayed === -1) return [];

  const barreIndexes = [];
  for (let stringIndex = firstPlayed; stringIndex <= lastPlayed; stringIndex += 1) {
    if (frets[stringIndex] === baseFret) barreIndexes.push(stringIndex);
  }

  if (barreIndexes.length < 2) return [];

  const startString = Math.min(...barreIndexes);
  const endString = Math.max(...barreIndexes);
  const isContinuousBarre = frets
    .slice(startString, endString + 1)
    .every((fret) => fret >= baseFret);

  return isContinuousBarre ? [{ fret: baseFret, finger: '1', startString, endString }] : [];
}

function getBaseFret(frets) {
  const positiveFrets = frets.filter((fret) => fret > 0);
  return frets.includes(0) || !positiveFrets.length ? 1 : Math.min(...positiveFrets);
}

function createChordRecord({ root, quality, rootAliases, name, voicing, index }) {
  const shape = `posicao-${index + 1}`;

  return {
    id: `${name}-${voicing.frets.join('-')}`,
    name,
    root,
    suffix: quality.suffix,
    quality: quality.label,
    shape,
    rootString: null,
    frets: voicing.frets,
    fingers: voicing.fingers,
    barres: voicing.barres,
    baseFret: voicing.baseFret,
    firstFret: voicing.firstFret,
    lastFret: voicing.lastFret,
    playedStringCount: voicing.playedStringCount,
    searchText: normalizeChordName([
      name,
      root,
      ...rootAliases,
      ...rootAliases.map((alias) => `${alias}${quality.suffix}`),
      quality.label,
      quality.suffix,
      ...quality.search,
      shape,
    ].join(' ')),
    nameSearchText: normalizeChordName([
      name,
      ...rootAliases.map((alias) => `${alias}${quality.suffix}`),
    ].join(' ')),
    exactSearchTerms: [
      name,
      ...rootAliases.map((alias) => `${alias}${quality.suffix}`),
    ].map(normalizeChordName),
  };
}

function compareVoicing(a, b) {
  return a.firstFret - b.firstFret
    || a.lastFret - b.lastFret
    || b.playedStringCount - a.playedStringCount
    || a.frets.join(',').localeCompare(b.frets.join(','));
}

function normalizeChordName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .toLowerCase()
    .trim();
}
