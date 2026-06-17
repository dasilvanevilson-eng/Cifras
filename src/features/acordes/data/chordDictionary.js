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
  { suffix: 'sus4', label: 'Suspenso 4', search: ['suspenso 4'] },
  { suffix: '7sus4', label: 'Setima suspenso 4', search: ['setima suspenso'] },
  { suffix: 'add9', label: 'Add9', search: ['nona adicionada'] },
  { suffix: '9', label: 'Nona', search: ['nona'] },
  { suffix: 'm9', label: 'Menor nona', search: ['menor nona'] },
  { suffix: 'maj9', label: 'Nona maior', search: ['maior nona'] },
  { suffix: 'dim', label: 'Diminuto', search: ['diminuto'] },
  { suffix: 'dim7', label: 'Diminuto setima', search: ['diminuto setima'] },
  { suffix: 'm7b5', label: 'Meio diminuto', search: ['meio diminuto'] },
  { suffix: 'aug', label: 'Aumentado', search: ['aumentado'] },
];

const QUALITY_MAP = new Map(CHORD_QUALITIES.map((quality) => [quality.suffix, quality]));

const STRING_ROOTS = {
  6: ROOT_INDEX.E,
  5: ROOT_INDEX.A,
  4: ROOT_INDEX.D,
};

const TEMPLATES = {
  '': [
    { shape: 'E', rootString: 6, frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
    { shape: 'A', rootString: 5, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
    { shape: 'D', rootString: 4, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 1, 2, 4, 3] },
  ],
  m: [
    { shape: 'Em', rootString: 6, frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
    { shape: 'Am', rootString: 5, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
    { shape: 'Dm', rootString: 4, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 1, 3, 4, 2] },
  ],
  5: [
    { shape: 'E5', rootString: 6, frets: [0, 2, 2, -1, -1, -1], fingers: [1, 3, 4, 0, 0, 0] },
    { shape: 'A5', rootString: 5, frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 1, 3, 4, 0, 0] },
  ],
  6: [
    { shape: 'E6', rootString: 6, frets: [0, 2, 2, 1, 2, 0], fingers: [1, 3, 4, 2, 3, 1] },
    { shape: 'A6', rootString: 5, frets: [-1, 0, 2, 2, 2, 2], fingers: [0, 1, 2, 3, 4, 4] },
  ],
  m6: [
    { shape: 'Em6', rootString: 6, frets: [0, 2, 2, 0, 2, 0], fingers: [1, 3, 4, 1, 3, 1] },
    { shape: 'Am6', rootString: 5, frets: [-1, 0, 2, 2, 1, 2], fingers: [0, 1, 3, 4, 2, 3] },
  ],
  7: [
    { shape: 'E7', rootString: 6, frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
    { shape: 'A7', rootString: 5, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
    { shape: 'D7', rootString: 4, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4] },
  ],
  maj7: [
    { shape: 'Emaj7', rootString: 6, frets: [0, 2, 1, 1, 0, 0], fingers: [1, 4, 2, 3, 1, 1] },
    { shape: 'Amaj7', rootString: 5, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
    { shape: 'Dmaj7', rootString: 4, frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 1, 2, 3, 4] },
  ],
  m7: [
    { shape: 'Em7', rootString: 6, frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
    { shape: 'Am7', rootString: 5, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
    { shape: 'Dm7', rootString: 4, frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 1, 3, 2, 2] },
  ],
  mMaj7: [
    { shape: 'EmMaj7', rootString: 6, frets: [0, 2, 1, 0, 0, 0], fingers: [1, 3, 2, 1, 1, 1] },
    { shape: 'AmMaj7', rootString: 5, frets: [-1, 0, 2, 1, 1, 0], fingers: [0, 1, 3, 2, 2, 1] },
  ],
  sus2: [
    { shape: 'Esus2', rootString: 6, frets: [0, 2, 4, 4, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
    { shape: 'Asus2', rootString: 5, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 1, 1] },
    { shape: 'Dsus2', rootString: 4, frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 1] },
  ],
  sus4: [
    { shape: 'Esus4', rootString: 6, frets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
    { shape: 'Asus4', rootString: 5, frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
    { shape: 'Dsus4', rootString: 4, frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 1, 2, 3, 4] },
  ],
  '7sus4': [
    { shape: 'E7sus4', rootString: 6, frets: [0, 2, 0, 2, 0, 0], fingers: [1, 3, 1, 4, 1, 1] },
    { shape: 'A7sus4', rootString: 5, frets: [-1, 0, 2, 0, 3, 0], fingers: [0, 1, 3, 1, 4, 1] },
  ],
  add9: [
    { shape: 'Eadd9', rootString: 6, frets: [0, 2, 4, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
    { shape: 'Aadd9', rootString: 5, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 1, 1] },
  ],
  9: [
    { shape: 'E9', rootString: 6, frets: [0, 2, 0, 1, 0, 2], fingers: [1, 3, 1, 2, 1, 4] },
    { shape: 'A9', rootString: 5, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 1, 1] },
  ],
  m9: [
    { shape: 'Em9', rootString: 6, frets: [0, 2, 0, 0, 0, 2], fingers: [1, 3, 1, 1, 1, 4] },
    { shape: 'Am9', rootString: 5, frets: [-1, 0, 2, 0, 0, 0], fingers: [0, 1, 3, 1, 1, 1] },
  ],
  maj9: [
    { shape: 'Emaj9', rootString: 6, frets: [0, 2, 1, 1, 0, 2], fingers: [1, 3, 2, 2, 1, 4] },
    { shape: 'Amaj9', rootString: 5, frets: [-1, 0, 2, 1, 0, 0], fingers: [0, 1, 3, 2, 1, 1] },
  ],
  dim: [
    { shape: 'Edim', rootString: 6, frets: [0, 1, 2, 0, 2, 0], fingers: [1, 2, 3, 1, 4, 1] },
    { shape: 'Adim', rootString: 5, frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 1, 2, 4, 3, 0] },
  ],
  dim7: [
    { shape: 'Edim7', rootString: 6, frets: [0, 1, 2, 0, 2, 0], fingers: [1, 2, 3, 1, 4, 1] },
    { shape: 'Adim7', rootString: 5, frets: [-1, 0, 1, 2, 1, 2], fingers: [0, 1, 2, 3, 2, 4] },
  ],
  m7b5: [
    { shape: 'Em7b5', rootString: 6, frets: [0, 1, 0, 0, 3, 0], fingers: [1, 2, 1, 1, 4, 1] },
    { shape: 'Am7b5', rootString: 5, frets: [-1, 0, 1, 0, 1, -1], fingers: [0, 1, 2, 1, 3, 0] },
  ],
  aug: [
    { shape: 'Eaug', rootString: 6, frets: [0, 3, 2, 1, 1, 0], fingers: [1, 4, 3, 2, 2, 1] },
    { shape: 'Aaug', rootString: 5, frets: [-1, 0, 3, 2, 2, 1], fingers: [0, 1, 4, 3, 3, 2] },
  ],
};

export function getChordDictionary() {
  return CHORD_ROOTS.flatMap((root) => (
    CHORD_QUALITIES.flatMap((quality) => createChord(root, quality.suffix))
  ));
}

export function getChordByName(name) {
  const normalized = normalizeChordName(name);
  return getChordDictionary().filter((chord) => chord.nameSearchText.includes(normalized));
}

function createChord(root, suffix) {
  const quality = QUALITY_MAP.get(suffix);
  const templates = TEMPLATES[suffix] || [];

  return templates
    .map((template) => transposeTemplate(root, quality, template))
    .filter((chord) => Math.max(...chord.frets.filter((fret) => fret > 0)) <= 15);
}

function transposeTemplate(root, quality, template) {
  const rootFret = getRootFret(root, template.rootString);
  const frets = template.frets.map((fret) => (fret < 0 ? -1 : fret + rootFret));
  const positiveFrets = frets.filter((fret) => fret > 0);
  const baseFret = positiveFrets.length ? Math.max(1, Math.min(...positiveFrets)) : 1;
  const rootAliases = ROOTS.find((item) => item.name === root)?.aliases || [root];
  const name = `${root}${quality.suffix}`;

  return {
    id: `${name}-${template.shape}-${template.rootString}-${baseFret}`,
    name,
    root,
    suffix: quality.suffix,
    quality: quality.label,
    shape: template.shape,
    rootString: template.rootString,
    frets,
    fingers: template.fingers,
    baseFret,
    searchText: normalizeChordName([
      name,
      root,
      ...rootAliases,
      ...rootAliases.map((alias) => `${alias}${quality.suffix}`),
      quality.label,
      quality.suffix,
      ...quality.search,
      template.shape,
    ].join(' ')),
    nameSearchText: normalizeChordName([
      name,
      ...rootAliases.map((alias) => `${alias}${quality.suffix}`),
    ].join(' ')),
  };
}

function getRootFret(root, stringNumber) {
  const stringRoot = STRING_ROOTS[stringNumber];
  const target = ROOT_INDEX[root];
  return (target - stringRoot + 12) % 12;
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
