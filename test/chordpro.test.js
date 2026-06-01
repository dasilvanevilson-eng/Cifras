import assert from 'node:assert/strict';
import {
  convertCifraOriginalToNumbers,
  convertToChordPro,
  transposeCifraOriginal,
  transposeChordPro,
  transposeKey,
} from '../src/utils/chordpro.js';

const cifraOriginal = [
  'G  D/F#  Em7  C9',
  'Bb  F#m7  A7(9)  C7M',
].join('\n');

assert.equal(
  transposeCifraOriginal(cifraOriginal, 2),
  [
    'A  E/G#  F#m7  D9',
    'C  G#m7  B7(9)  D7M',
  ].join('\n'),
);

assert.equal(
  transposeCifraOriginal('C | G/B | Am7 | F', -2),
  'A# | F/A | Gm7 | D#',
);

assert.equal(
  transposeChordPro('[G]Te louvo [D/F#]Senhor [Em7]hoje', 2),
  '[A]Te louvo [E/G#]Senhor [F#m7]hoje',
);

assert.equal(transposeKey('D', -2), 'C');
assert.equal(transposeKey('Bb', 2), 'C');

assert.equal(
  convertToChordPro(['G      D/F#', 'Grande es Tu'].join('\n')),
  '[G]GRANDE [D/F#]ES TU',
);

assert.equal(
  convertToChordPro(['Am7', 'minha canção'].join('\n')),
  '[Am7]MINHA CANÇÃO',
);

assert.equal(
  convertCifraOriginalToNumbers('C  G/B  Am7  F', 'C'),
  '1  5/7  6m7  4',
);

assert.equal(
  convertCifraOriginalToNumbers('D  A/C#  Bm7  G', 'D'),
  '1  5/7  6m7  4',
);

console.log('chordpro tests passed');
