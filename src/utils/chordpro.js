export function convertToChordPro(input) {
  if (!input) return '';

  const lines = normalizeTabs(input).split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const label = getChordSectionLabel(line);

    if (label && nextLine !== undefined && isChordLine(nextLine)) {
      output.push(`[*${label}]`);
      output.push(convertStandaloneChordLine(nextLine, { includeLabel: false }));
      index += 1;
      continue;
    }

    if (isChordLine(line) && nextLine !== undefined && !isChordLine(nextLine)) {
      output.push(mergeChordLineWithLyrics(line, nextLine));
      index += 1;
      continue;
    }

    output.push(convertStandaloneChordLine(line));
  }

  return output.map((line) => uppercaseChordProLyrics(line.trimEnd())).join('\n');
}

export function transposeChordPro(input, semitones) {
  if (!input || !Number(semitones)) return input || '';

  return String(input).replace(/\[([^\]]+)\]/g, (match, chord) => `[${transposeChord(chord, semitones)}]`);
}

export function normalizeChordProLyrics(input) {
  if (!input) return '';

  return String(input)
    .split('\n')
    .map(uppercaseChordProLyrics)
    .join('\n');
}

export function renderChordProForDisplay(input) {
  if (!input) return '';

  return String(input)
    .split('\n')
    .map(renderChordProLineForDisplay)
    .join('\n');
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

export function getTransposeSemitones(fromKey, toKey) {
  const fromRoot = getChordRoot(fromKey);
  const toRoot = getChordRoot(toKey);
  const fromIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[fromRoot] || fromRoot);
  const toIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[toRoot] || toRoot);

  if (fromIndex === -1 || toIndex === -1) return 0;

  const distance = mod(toIndex - fromIndex, NOTES_SHARP.length);
  return distance > 6 ? distance - NOTES_SHARP.length : distance;
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
  const parsed = parseChordLine(chordLine);
  const chords = findChords(parsed.chordText);
  let result = lyricLine;
  let offset = 0;

  chords.forEach(({ chord, index }) => {
    const position = Math.min(index + offset, result.length);
    const tag = `[${chord}]`;
    result = `${result.slice(0, position)}${tag}${result.slice(position)}`;
    offset += tag.length;
  });

  return parsed.label ? `[*${parsed.label}]\n${result}` : result;
}

function renderChordProLineForDisplay(line) {
  if (isChordOnlyChordProLine(line)) {
    return [...line.matchAll(/\[([^\]]+)\]/g)]
      .map((match) => match[1])
      .join('  ');
  }

  const chordLine = [];
  const lyricLine = [];
  let lyricPosition = 0;
  let index = 0;

  while (index < line.length) {
    if (line[index] === '[') {
      const endIndex = line.indexOf(']', index);

      if (endIndex > index) {
        writeAt(chordLine, lyricPosition, line.slice(index + 1, endIndex));
        index = endIndex + 1;
        continue;
      }
    }

    lyricLine.push(line[index]);
    lyricPosition += 1;
    index += 1;
  }

  const chords = chordLine.join('').trimEnd();
  const lyrics = lyricLine.join('').trimEnd();

  if (!chords) return lyrics;
  if (!lyrics) return chords;

  return `${chords}\n${lyrics}`;
}

function isChordOnlyChordProLine(line) {
  const value = String(line || '');

  if (!/\[[^\]]+\]/.test(value)) return false;

  return value
    .replace(/\[[^\]]+\]/g, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim().length === 0;
}

function writeAt(target, position, value) {
  while (target.length < position) {
    target.push(' ');
  }

  [...value].forEach((char, index) => {
    target[position + index] = char;
  });
}

function convertStandaloneChordLine(line, options = {}) {
  if (!isChordLine(line)) {
    return line;
  }

  const parsed = parseChordLine(line);
  const chords = findChords(parsed.chordText)
    .map(({ chord }) => `[${chord}]`)
    .join(' ');

  return parsed.label && options.includeLabel !== false ? `[*${parsed.label}]\n${chords}` : chords;
}

function isChordLine(line) {
  const parsed = parseChordLine(line);
  const chords = findChords(parsed.chordText);

  if (!chords.length) {
    return false;
  }

  return isOnlyChordsAndSeparators(parsed.chordText);
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
  if (String(chord).startsWith('*')) return chord;

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

function parseChordLine(line) {
  const value = String(line || '');
  const introChordLine = parseSectionChordLine(value, /^(intro|introdu[cç][aã]o)\b\s*:?\s*(.*)$/i);

  if (introChordLine) {
    return introChordLine;
  }

  const soloChordLine = parseSectionChordLine(value, /^(solo)\b\s*:?\s*(.*)$/i);

  if (soloChordLine) {
    return soloChordLine;
  }

  const match = value.match(/^\s*([A-Za-zÀ-ÿ0-9ªº ._-]{2,30}:)\s+(.*)$/);

  if (!match) {
    return { label: '', chordText: value };
  }

  const [, label, chordText] = match;

  if (!findChords(chordText).length) {
    return { label: '', chordText: value };
  }

  return { label: formatChordLineLabel(label), chordText };
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

function uppercaseChordProLyrics(line) {
  return String(line).replace(/\[[^\]]+\]|[^\[]+/g, (part) => {
    if (part.startsWith('[')) {
      return part;
    }

    return part.toLocaleUpperCase('pt-BR');
  });
}

function isOnlyChordsAndSeparators(value) {
  return String(value || '')
    .replace(CHORD_PATTERN, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim().length === 0;
}

function getChordSectionLabel(line) {
  const match = String(line || '').match(/^\s*(intro|introdu[cç][aã]o|solo)\s*:?\s*$/i);
  return match ? formatChordLineLabel(match[1]) : '';
}

function parseSectionChordLine(line, pattern) {
  const match = String(line || '').trim().match(pattern);

  if (!match) return null;

  const [, label, chordText] = match;
  return parseKeywordChordText(label, chordText);
}

function parseKeywordChordText(label, text) {
  const value = String(text || '');
  const chords = findChords(value);

  if (!chords.length) return null;

  if (isOnlyChordsAndSeparators(value)) {
    return { label: formatChordLineLabel(label), chordText: value };
  }

  const extraLabel = value
    .replace(CHORD_PATTERN, ' ')
    .replace(CHORD_SEPARATOR_PATTERN, ' ')
    .replace(/\b\d+\s*x\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const chordText = chords.map(({ chord }) => chord).join(' ');

  const fullLabel = [label, extraLabel]
    .map((part) => String(part || '').trim().replace(/:$/, ''))
    .filter(Boolean)
    .join(' ');

  return { label: formatChordLineLabel(fullLabel), chordText };
}

function formatChordLineLabel(label) {
  const trimmed = String(label || '').trim().replace(/:$/, '');
  return trimmed ? `${trimmed}:` : '';
}

const CHORD_PATTERN = /(?<![A-Za-zÀ-ÿ])(?:[A-G](?:#|b)?(?:(?:m(?![a-z])|maj|min|dim|aug|sus|add|M|º|°|ø|Δ|\+|-|[#b]?\d{1,2}|\([^)]*\)))*(?:\/(?:[A-G](?:#|b)?|[#b]?\d{1,2}))*)(?![A-Za-zÀ-ÿ])/g;
const CHORD_SEPARATOR_PATTERN = /[|:.,;()\[\]{}-]/g;
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
