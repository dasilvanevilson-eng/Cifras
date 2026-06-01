import assert from 'node:assert/strict';
import {
  convertCifraOriginalToNumbers,
  convertToChordPro,
  extractLyricsFromCifraOriginal,
  getTransposeSemitones,
  normalizeChordProLyrics,
  renderChordProForDisplay,
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
assert.equal(getTransposeSemitones('D', 'C'), -2);
assert.equal(getTransposeSemitones('C', 'D'), 2);

assert.equal(
  convertToChordPro(['G      D/F#', 'Grande es Tu'].join('\n')),
  '[G]GRANDE [D/F#]ES TU',
);

assert.equal(
  renderChordProForDisplay('[G]GRANDE [D/F#]ES TU'),
  ['G      D/F#', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  normalizeChordProLyrics('[G]Grande [D/F#]es Tu'),
  '[G]GRANDE [D/F#]ES TU',
);

assert.equal(
  convertToChordPro(['Intro: Bbº  F#m7(b5)  C7M(9)  G4/7  A/C#', 'Grande es Tu'].join('\n')),
  ['[*Intro:]', '[Bbº]GRAND[F#m7(b5)]E ES TU[C7M(9)][G4/7][A/C#]'].join('\n'),
);

assert.equal(
  convertToChordPro('Ponte: Eadd9  Dsus4/F#  G#dim7'),
  ['[*Ponte:]', '[Eadd9] [Dsus4/F#] [G#dim7]'].join('\n'),
);

assert.equal(
  convertToChordPro('Intro G  D  Em  C'),
  ['[*Intro:]', '[G] [D] [Em] [C]'].join('\n'),
);

assert.equal(
  convertToChordPro('Introdução A  B  C#  D'),
  ['[*Introdução:]', '[A] [B] [C#] [D]'].join('\n'),
);

assert.equal(
  convertToChordPro('Solo: Bb  C  Dm7  F/A'),
  ['[*Solo:]', '[Bb] [C] [Dm7] [F/A]'].join('\n'),
);

assert.equal(
  convertToChordPro(['Solo', 'G  D/F#  Em'].join('\n')),
  ['[*Solo:]', '[G] [D/F#] [Em]'].join('\n'),
);

assert.equal(
  convertToChordPro('Solo:Bb  C  Dm7'),
  ['[*Solo:]', '[Bb] [C] [Dm7]'].join('\n'),
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

assert.equal(
  extractLyricsFromCifraOriginal(['G      D/F#', 'Grande es Tu', '', 'Em7   C9', 'Santo Senhor'].join('\n')),
  ['Grande es Tu', '', 'Santo Senhor'].join('\n'),
);

console.log('chordpro tests passed');
