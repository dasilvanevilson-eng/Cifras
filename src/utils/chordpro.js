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

  return output.map((line) => line.trimEnd()).join('\n');
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

function transposeChord(chord, semitones) {
  return String(chord).replace(NOTE_PATTERN, (note) => transposeNote(note, semitones));
}

function transposeChordLine(line, semitones) {
  return line.replace(CHORD_PATTERN, (chord) => transposeChord(chord, semitones));
}

function transposeNote(note, semitones) {
  const normalizedNote = note.replace('♭', 'b').replace('♯', '#');
  const noteIndex = NOTES_SHARP.indexOf(normalizedNote);

  if (noteIndex === -1) {
    return note;
  }

  const transposedIndex = mod(noteIndex + Number(semitones), NOTES_SHARP.length);
  return NOTES_SHARP[transposedIndex];
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

  const onlyChordsAndSpaces = line
    .replace(CHORD_PATTERN, '')
    .trim().length === 0;

  return onlyChordsAndSpaces;
}

function findChords(line) {
  return [...line.matchAll(CHORD_PATTERN)].map((match) => ({
    chord: match[0],
    index: match.index,
  }));
}

const CHORD_PATTERN = /[A-G][#b♭♯]?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-G][#b♭♯]?)?/g;
const NOTE_PATTERN = /[A-G][#b♭♯]?/g;
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function mod(value, size) {
  return ((value % size) + size) % size;
}

function normalizeTabs(input) {
  return input.replaceAll('\t', '    ');
}
