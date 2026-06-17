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
const GUITAR_STRING_NOTES = [ROOT_INDEX.E, ROOT_INDEX.A, ROOT_INDEX.D, ROOT_INDEX.G, ROOT_INDEX.B, ROOT_INDEX.E];
const MAX_FRET = 15;
const MAX_FRET_SPAN = 4;

export const CHORD_ROOTS = ROOTS.map((root) => root.name);

export const CHORD_QUALITIES = [
  { suffix: '', label: 'Maior', intervals: [0, 4, 7], required: [0, 4, 7], search: ['maior', 'major', 'maj'] },
  { suffix: 'm', label: 'Menor', intervals: [0, 3, 7], required: [0, 3, 7], search: ['menor', 'minor', 'min'] },
  { suffix: '5', label: 'Power chord', intervals: [0, 7], required: [0, 7], search: ['power', 'quinta'] },
  { suffix: '6', label: 'Sexta', intervals: [0, 4, 7, 9], required: [0, 4, 9], search: ['sexta'] },
  { suffix: 'm6', label: 'Menor sexta', intervals: [0, 3, 7, 9], required: [0, 3, 9], search: ['menor sexta'] },
  { suffix: '7', label: 'Setima', intervals: [0, 4, 7, 10], required: [0, 4, 10], search: ['setima', 'dominante'] },
  { suffix: 'maj7', label: 'Setima maior', intervals: [0, 4, 7, 11], required: [0, 4, 11], search: ['7m', 'major seventh'] },
  { suffix: 'm7', label: 'Menor setima', intervals: [0, 3, 7, 10], required: [0, 3, 10], search: ['menor setima'] },
  { suffix: 'mMaj7', label: 'Menor com setima maior', intervals: [0, 3, 7, 11], required: [0, 3, 11], search: ['menor maior'] },
  { suffix: 'sus2', label: 'Suspenso 2', intervals: [0, 2, 7], required: [0, 2, 7], search: ['suspenso 2'] },
  { suffix: 'sus4', label: 'Suspenso 4', intervals: [0, 5, 7], required: [0, 5, 7], search: ['suspenso 4'] },
  { suffix: '7sus4', label: 'Setima suspenso 4', intervals: [0, 5, 7, 10], required: [0, 5, 10], search: ['setima suspenso'] },
  { suffix: 'add9', label: 'Add9', intervals: [0, 2, 4, 7], required: [0, 2, 4], search: ['nona adicionada'] },
  { suffix: '9', label: 'Nona', intervals: [0, 2, 7], required: [0, 2, 7], search: ['nona'] },
  { suffix: 'm9', label: 'Menor nona', intervals: [0, 2, 3, 7, 10], required: [0, 2, 3, 10], search: ['menor nona'] },
  { suffix: 'maj9', label: 'Nona maior', intervals: [0, 2, 4, 7, 11], required: [0, 2, 4, 11], search: ['maior nona'] },
  { suffix: 'dim', label: 'Diminuto', intervals: [0, 3, 6], required: [0, 3, 6], search: ['diminuto'] },
  { suffix: 'dim7', label: 'Diminuto setima', intervals: [0, 3, 6, 9], required: [0, 3, 6, 9], search: ['diminuto setima'] },
  { suffix: 'm7b5', label: 'Meio diminuto', intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], search: ['meio diminuto'] },
  { suffix: 'aug', label: 'Aumentado', intervals: [0, 4, 8], required: [0, 4, 8], search: ['aumentado'] },
];

const QUALITY_MAP = new Map(CHORD_QUALITIES.map((quality) => [quality.suffix, quality]));

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
  const normalized = normalizeChordName(name);
  return filterChordsByName(getChordDictionary(), normalized);
}

export function findChordVoicings(name) {
  const parsed = parseChordName(name);
  if (!parsed) return [];

  return createChord(parsed.root, parsed.suffix);
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
  if (chordVoicingCache.has(cacheKey)) {
    return chordVoicingCache.get(cacheKey);
  }

  const quality = QUALITY_MAP.get(suffix);
  if (!quality) return [];

  const rootPitch = ROOT_INDEX[root];
  const chordPitchClasses = quality.intervals.map((interval) => normalizePitch(rootPitch + interval));
  const requiredPitchClasses = quality.required.map((interval) => normalizePitch(rootPitch + interval));
  const rootAliases = ROOTS.find((item) => item.name === root)?.aliases || [root];
  const name = `${root}${quality.suffix}`;

  const chords = generateVoicings(root, quality, chordPitchClasses, requiredPitchClasses)
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

function generateVoicings(root, quality, chordPitchClasses, requiredPitchClasses) {
  const allowed = new Set(chordPitchClasses);
  const stringOptions = GUITAR_STRING_NOTES.map((openPitch) => (
    [-1].concat(
      Array.from({ length: MAX_FRET + 1 }, (_, fret) => fret)
        .filter((fret) => allowed.has(normalizePitch(openPitch + fret)))
    )
  ));

  const results = [];
  const seen = new Set();

  function walk(stringIndex, frets) {
    if (stringIndex === stringOptions.length) {
      const voicing = normalizeVoicing(frets, chordPitchClasses, requiredPitchClasses, quality);
      if (!voicing) return;

      const key = voicing.frets.join(',');
      if (seen.has(key)) return;

      seen.add(key);
      results.push(voicing);
      return;
    }

    stringOptions[stringIndex].forEach((fret) => {
      const nextFrets = frets.concat(fret);
      if (canStillBePlayable(nextFrets)) {
        walk(stringIndex + 1, nextFrets);
      }
    });
  }

  walk(0, []);
  return results.sort(compareGeneratedVoicing);
}

function normalizeVoicing(frets, chordPitchClasses, requiredPitchClasses, quality) {
  const playedFrets = frets.filter((fret) => fret >= 0);
  const pressedFrets = frets.filter((fret) => fret > 0);
  const minPlayed = playedFrets.length;

  if (minPlayed < (quality.suffix === '5' ? 2 : 3)) return null;
  if (hasInternalMutedString(frets)) return null;
  if (!hasValidFretSpan(pressedFrets)) return null;
  if (new Set(pressedFrets).size > 4) return null;

  const playedPitchClasses = frets
    .map((fret, stringIndex) => (fret >= 0 ? normalizePitch(GUITAR_STRING_NOTES[stringIndex] + fret) : null))
    .filter((pitchClass) => pitchClass !== null);
  const playedSet = new Set(playedPitchClasses);

  if (!requiredPitchClasses.every((pitchClass) => playedSet.has(pitchClass))) return null;
  if (!playedPitchClasses.every((pitchClass) => chordPitchClasses.includes(pitchClass))) return null;

  const positiveFrets = frets.filter((fret) => fret > 0);
  const baseFret = positiveFrets.length ? Math.max(1, Math.min(...positiveFrets)) : 1;

  return {
    frets,
    fingers: assignFingers(frets),
    baseFret,
    firstFret: positiveFrets.length ? Math.min(...positiveFrets) : 0,
    lastFret: positiveFrets.length ? Math.max(...positiveFrets) : 0,
    playedStringCount: playedFrets.length,
  };
}

function canStillBePlayable(frets) {
  const pressedFrets = frets.filter((fret) => fret > 0);
  return hasValidFretSpan(pressedFrets) && new Set(pressedFrets).size <= 4;
}

function hasValidFretSpan(pressedFrets) {
  if (pressedFrets.length <= 1) return true;
  return Math.max(...pressedFrets) - Math.min(...pressedFrets) <= MAX_FRET_SPAN;
}

function hasInternalMutedString(frets) {
  const firstPlayed = frets.findIndex((fret) => fret >= 0);
  const lastPlayed = frets.findLastIndex((fret) => fret >= 0);
  if (firstPlayed === -1) return false;

  return frets.slice(firstPlayed, lastPlayed + 1).some((fret) => fret === -1);
}

function assignFingers(frets) {
  const fingers = Array(frets.length).fill(0);
  const positiveGroups = new Map();

  frets.forEach((fret, stringIndex) => {
    if (fret <= 0) return;

    const strings = positiveGroups.get(fret) || [];
    strings.push(stringIndex);
    positiveGroups.set(fret, strings);
  });

  const barreFrets = [...positiveGroups.entries()]
    .filter(([, strings]) => strings.length >= 2 && Math.max(...strings) - Math.min(...strings) === strings.length - 1)
    .map(([fret]) => fret)
    .sort((a, b) => a - b);

  const mainBarre = barreFrets[0] || null;
  if (mainBarre) {
    positiveGroups.get(mainBarre).forEach((stringIndex) => {
      fingers[stringIndex] = 1;
    });
  }

  const remainingFrets = [...positiveGroups.keys()]
    .filter((fret) => fret !== mainBarre)
    .sort((a, b) => a - b);

  remainingFrets.forEach((fret, index) => {
    const finger = Math.min(index + (mainBarre ? 2 : 1), 4);
    positiveGroups.get(fret).forEach((stringIndex) => {
      fingers[stringIndex] = finger;
    });
  });

  return fingers;
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

function compareGeneratedVoicing(a, b) {
  return a.firstFret - b.firstFret
    || a.lastFret - b.lastFret
    || b.playedStringCount - a.playedStringCount
    || a.frets.join(',').localeCompare(b.frets.join(','));
}

function normalizePitch(value) {
  return ((value % 12) + 12) % 12;
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
