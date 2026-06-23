import { getChordDefinition } from './chordDictionary.js';

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const STANDARD_TUNING = [4, 9, 2, 7, 11, 4];
const INTERVALS_BY_SUFFIX = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], mMaj7: [0, 3, 7, 11],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], add9: [0, 2, 4, 7],
  9: [0, 2, 4, 7, 10], m9: [0, 2, 3, 7, 10], maj9: [0, 2, 4, 7, 11],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8],
};

export function generatePlayableChordVoicings(name, { startFret = 0, endFret = 4 } = {}) {
  const definition = getChordDefinition(name);
  if (!definition) return [];

  const rootIndex = CHROMATIC_NOTES.indexOf(definition.root);
  const chordIntervals = INTERVALS_BY_SUFFIX[definition.suffix] || [];
  const chordNotes = new Set(chordIntervals.map((interval) => (rootIndex + interval) % 12));
  const candidatesByString = STANDARD_TUNING.map((openNote, stringIndex) => getStringCandidates({
    openNote,
    stringIndex,
    chordNotes,
    startFret,
    endFret,
  }));
  const voicings = [];

  function visit(stringIndex, frets) {
    if (stringIndex === STANDARD_TUNING.length) {
      const voicing = createPlayableVoicing({
        frets,
        rootIndex,
        essentialNote: (rootIndex + getEssentialInterval(chordIntervals)) % 12,
        definition,
        startFret,
        endFret,
      });
      if (voicing) voicings.push(voicing);
      return;
    }

    for (const fret of candidatesByString[stringIndex]) {
      const nextFrets = [...frets, fret];
      if (!isStillReachable(nextFrets)) continue;
      visit(stringIndex + 1, nextFrets);
    }
  }

  visit(0, []);
  return removeDuplicateVoicings(voicings).sort(comparePlayableVoicings);
}

function getStringCandidates({ openNote, chordNotes, startFret, endFret }) {
  const candidates = [-1];
  const firstFret = startFret === 0 ? 0 : startFret;
  for (let fret = firstFret; fret <= endFret; fret += 1) {
    if (chordNotes.has((openNote + fret) % 12)) candidates.push(fret);
  }
  return candidates;
}

function isStillReachable(frets) {
  const pressedFrets = frets.filter((fret) => fret > 0);
  return !pressedFrets.length || Math.max(...pressedFrets) - Math.min(...pressedFrets) <= 4;
}

function createPlayableVoicing({ frets, rootIndex, essentialNote, definition, startFret, endFret }) {
  const sounding = frets.map((fret, index) => ({ fret, index })).filter(({ fret }) => fret >= 0);
  if (sounding.length < 3) return null;

  const pressedFrets = frets.filter((fret) => fret > 0);
  const firstFret = pressedFrets.length ? Math.min(...pressedFrets) : 0;
  const lastFret = pressedFrets.length ? Math.max(...pressedFrets) : 0;
  if (firstFret && lastFret - firstFret > 4) return null;

  const noteIndexes = sounding.map(({ fret, index }) => (STANDARD_TUNING[index] + fret) % 12);
  if (!noteIndexes.includes(rootIndex) || !noteIndexes.includes(essentialNote)) return null;
  if (new Set(noteIndexes).size < 2) return null;

  const lowestSounding = sounding[0];
  const lowestNote = (STANDARD_TUNING[lowestSounding.index] + lowestSounding.fret) % 12;
  const rootOrFifth = new Set([rootIndex, (rootIndex + 7) % 12]);
  if (!rootOrFifth.has(lowestNote)) return null;

  const barres = getBarres(frets);
  const fingers = assignFingers(frets, barres);
  const baseFret = frets.includes(0) || !pressedFrets.length ? 1 : firstFret;
  const name = `${definition.root}${definition.suffix}`;
  return {
    id: `generated-${name}-${startFret}-${endFret}-${frets.join('-')}`,
    name,
    quality: definition.quality,
    frets,
    fingers,
    barres,
    baseFret,
    firstFret,
    lastFret,
    playedStringCount: sounding.length,
    generated: true,
  };
}

function getEssentialInterval(intervals) {
  return intervals.find((interval) => [2, 3, 4, 5].includes(interval)) || 7;
}

function getBarres(frets) {
  if (frets.includes(0)) return [];
  const positiveFrets = frets.filter((fret) => fret > 0);
  if (!positiveFrets.length) return [];
  const baseFret = Math.min(...positiveFrets);
  const indexes = frets.map((fret, index) => (fret === baseFret ? index : -1)).filter((index) => index >= 0);
  if (indexes.length < 2) return [];
  const startString = Math.min(...indexes);
  const endString = Math.max(...indexes);
  const continuous = frets.slice(startString, endString + 1).every((fret) => fret >= baseFret);
  return continuous ? [{ fret: baseFret, finger: '1', startString, endString }] : [];
}

function assignFingers(frets, barres) {
  const fingers = Array(frets.length).fill(0);
  const barre = barres[0];
  if (barre) {
    for (let index = barre.startString; index <= barre.endString; index += 1) {
      if (frets[index] === barre.fret) fingers[index] = 1;
    }
  }
  let finger = barre ? 2 : 1;
  [...new Set(frets.filter((fret) => fret > 0 && fret !== barre?.fret))]
    .sort((a, b) => a - b)
    .forEach((fret) => {
      frets.forEach((value, index) => {
        if (value === fret) fingers[index] = Math.min(finger, 4);
      });
      finger += 1;
    });
  return fingers;
}

function removeDuplicateVoicings(voicings) {
  const unique = new Map();
  voicings.forEach((voicing) => unique.set(voicing.frets.join(','), voicing));
  return [...unique.values()];
}

function comparePlayableVoicings(a, b) {
  return a.firstFret - b.firstFret
    || a.lastFret - b.lastFret
    || b.playedStringCount - a.playedStringCount
    || a.frets.join(',').localeCompare(b.frets.join(','));
}
