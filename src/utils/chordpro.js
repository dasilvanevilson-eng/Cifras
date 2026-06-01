export function convertToChordPro(input) {
  if (!input) return '';

  const lines = normalizeTabs(input).split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];

    if (isChordLine(line) && nextLine !== undefined && !isChordLine(nextLine)) {
      output.push(mergeChordLineWithLyrics(line, nextLine));
      index += 1;
      continue;
    }

    output.push(convertStandaloneChordLine(line));
  }

  return output.map((line) => uppercaseLyrics(line.trimEnd())).join('\n');
}

export function transposeChordPro(input, semitones) {
  if (!input || !Number(semitones)) return input || '';

  return String(input).replace(/\[([^\]]+)\]/g, (match, chord) => `[${transposeChord(chord, semitones)}]`);
}

export function transposeCifraOriginal(input, semitones) {
  if (!input || !Number(semitones)) return input || '';

  return normalizeTabs(input)
    .split('\n')
    .map((line) => (isChordLine(line) ? transposeChordLine(line, semitones) : line))
    .join('\n');
}

export function transposeKey(key, semitones) {
  if (!key || key === '-' || !Number(semitones)) return key || '-';
  return transposeChord(key, semitones);
}

export function convertCifraOriginalToNumbers(input, key) {
  if (!input || !key || key === '-') return input || '';

  const keyRoot = getChordRoot(key);

  if (!keyRoot) return input || '';

  return normalizeTabs(input)
    .split('\n')
    .map((line) => (isChordLine(line) ? convertChordLineToNumbers(line, keyRoot) : line))
    .join('\n');
}

export function extractLyricsFromCifraOriginal(input) {
  if (!input) return '';

  return normalizeTabs(input)
    .split('\n')
    .filter((line) => !isChordLine(line))
    .map((line) => line.replace(/\[[^\]]+\]/g, '').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mergeChordLineWithLyrics(chordLine, lyricLine) {
  const chords = findChords(chordLine);
  let result = lyricLine;
  let offset = 0;

  chords.forEach(({ chord, index }) => {
    const position = Math.min(index + offset, result.length);
    const tag = `[${chord}]`;
    result = `${result.slice(0, position)}${tag}${result.slice(position)}`;
    offset += tag.length;
  });

  return result;
}

function convertStandaloneChordLine(line) {
  if (!isChordLine(line)) {
    return line;
  }

  return findChords(line)
    .map(({ chord }) => `[${chord}]`)
    .join(' ');
}

function isChordLine(line) {
  const chords = findChords(line);

  if (!chords.length) {
    return false;
  }

  const onlyChordsAndSeparators = line
    .replace(CHORD_PATTERN, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim().length === 0;

  return onlyChordsAndSeparators;
}

function findChords(line) {
  return [...line.matchAll(CHORD_PATTERN)].map((match) => ({
    chord: match[0],
    index: match.index,
  }));
}

function transposeChordLine(line, semitones) {
  return line.replace(CHORD_PATTERN, (chord) => transposeChord(chord, semitones));
}

function transposeChord(chord, semitones) {
  return String(chord).replace(NOTE_PATTERN, (note) => transposeNote(note, semitones));
}

function convertChordLineToNumbers(line, keyRoot) {
  return line.replace(CHORD_PATTERN, (chord) => convertChordToNumber(chord, keyRoot));
}

function convertChordToNumber(chord, keyRoot) {
  const root = getChordRoot(chord);

  if (!root) return chord;

  const suffixStart = root.length;
  const slashIndex = chord.indexOf('/');
  const suffix = slashIndex >= 0 ? chord.slice(suffixStart, slashIndex) : chord.slice(suffixStart);
  const bass = slashIndex >= 0 ? chord.slice(slashIndex + 1) : '';
  const number = noteToNumber(root, keyRoot);
  const bassNumber = bass ? `/${noteToNumber(bass, keyRoot)}` : '';

  return `${number}${suffix}${bassNumber}`;
}

function getChordRoot(value) {
  const match = String(value || '').match(/^[A-G](?:#|b)?/);
  return match ? match[0] : '';
}

function noteToNumber(note, keyRoot) {
  const noteIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[note] || note);
  const keyIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[keyRoot] || keyRoot);

  if (noteIndex === -1 || keyIndex === -1) return note;

  return SEMITONE_TO_NUMBER[mod(noteIndex - keyIndex, NOTES_SHARP.length)];
}

function transposeNote(note, semitones) {
  const normalizedNote = FLAT_TO_SHARP[note] || note;
  const noteIndex = NOTES_SHARP.indexOf(normalizedNote);

  if (noteIndex === -1) {
    return note;
  }

  const transposedIndex = mod(noteIndex + Number(semitones), NOTES_SHARP.length);
  return NOTES_SHARP[transposedIndex];
}

function uppercaseLyrics(line) {
  return String(line).replace(/\[[^\]]+\]|[^\[]+/g, (part) => {
    if (part.startsWith('[')) {
      return part;
    }

    return part.toLocaleUpperCase('pt-BR');
  });
}

const CHORD_PATTERN = /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?(?:[0-9]{0,2})?(?:M)?(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?/g;
const CHORD_SEPARATOR_PATTERN = /[|:.,-]/g;
const NOTE_PATTERN = /[A-G](?:#|b)?/g;
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SEMITONE_TO_NUMBER = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'];
const FLAT_TO_SHARP = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

function mod(value, size) {
  return ((value % size) + size) % size;
}

function normalizeTabs(input) {
  return input.replaceAll('\t', '    ');
}
