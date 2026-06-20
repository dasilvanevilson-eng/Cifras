import assert from 'node:assert/strict';
import {
  applyVoiceLabelsToChordPro,
  createChordProFromCifraEditorState,
  convertCifraOriginalToNumbers,
  convertToChordPro,
  createCifraEditorStateFromChordPro,
  createCifraEditorStateFromRecord,
  createCifraExibicaoFromCifraEditorState,
  extractLyricsFromCifraOriginal,
  createCifraExibicao,
  getCifraExibicao,
  getTransposeSemitones,
  getVoiceLabelsFromMusica,
  normalizeChordProLyrics,
  renderChordProForDisplay,
  renderCifraOriginalForDisplayHtml,
  renderCifraOriginalPreviewHtml,
  renderMusicaCifraForDisplayHtml,
  renderVoiceLegendHtml,
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
    'A  E/G#  F#m7 D9',
    'C   G#m7  B7(9)  D7M',
  ].join('\n'),
);

assert.equal(
  transposeCifraOriginal('C | G/B | Am7 | F', -2),
  'A#| F/A | Gm7 | D#',
);

assert.equal(
  transposeCifraOriginal('C     Bb', 1),
  'C#    B',
);

assert.equal(
  transposeCifraOriginal('Bb     C', 1),
  'B      C#',
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
  convertToChordPro(['{voice: segunda_voz}', 'G      D/F#', 'Grande es Tu', '{/voice}'].join('\n')),
  ['{voice: segunda_voz}', '[G]GRANDE [D/F#]ES TU', '{/voice}'].join('\n'),
);

assert.equal(
  convertToChordPro(['G      D/F#', 'Grande {voice: voz_principal}es{/voice} Tu'].join('\n')),
  '[G]GRANDE {voice: voz_principal}[D/F#]ES{/voice} TU',
);

assert.equal(
  renderChordProForDisplay('[G]GRANDE [D/F#]ES TU'),
  ['G      D/F#', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  renderChordProForDisplay(['{voice-label: voz_principal=Joao}', '{voice: voz_principal}', '[G]GRANDE ES TU', '{/voice}'].join('\n')),
  ['G', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  renderChordProForDisplay(['{voice: segunda_voz}', '[G]GRANDE [D/F#]ES TU', '{/voice}'].join('\n')),
  ['G      D/F#', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  renderChordProForDisplay(['{voice: segunda_voz}', '[G]GRANDE [D/F#]ES TU', '{/voice}'].join('\n'), {
    keepVoiceDirectives: true,
  }),
  ['{voice: segunda_voz}', 'G      D/F#', 'GRANDE ES TU', '{/voice}'].join('\n'),
);

assert.equal(
  renderChordProForDisplay('[G]GRANDE {voice: voz_principal}[D/F#]ES{/voice} TU', {
    keepVoiceDirectives: true,
  }),
  ['G      D/F#', 'GRANDE {voice: voz_principal}ES{/voice} TU'].join('\n'),
);

assert.equal(
  renderChordProForDisplay('[*Solo:]\n[G] [D] [Em] [C]'),
  ['*Solo:', 'G  D  Em  C'].join('\n'),
);

assert.equal(
  renderChordProForDisplay('GRANDE ES TU [G][D/F#][Em]'),
  ['             G  D/F#  Em', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  renderCifraOriginalForDisplayHtml(['G  D/F#  Em', 'Grande es Tu'].join('\n')),
  ['<span class="chord-line">G  D/F#  Em</span>', 'Grande es Tu'].join('\n'),
);

assert.equal(
  renderCifraOriginalForDisplayHtml(['{voice: segunda_voz}', 'G  D/F#  Em', 'Grande es Tu', '{/voice}'].join('\n')),
  [
    '<span class="chord-line">G  D/F#  Em</span>',
    '<span class="voice-highlight voice-highlight-segunda_voz">Grande es Tu</span>',
    '',
    '<span class="voice-legend"><span class="voice-legend-item voice-highlight-segunda_voz">Segunda voz</span></span>',
  ].join('\n'),
);

assert.equal(
  renderCifraOriginalForDisplayHtml('A ALEGRIA ESTA {voice: voz_principal}NO CORACAO{/voice}, DE QUEM CANTA'),
  [
    'A ALEGRIA ESTA <span class="voice-highlight voice-highlight-voz_principal">NO CORACAO</span>, DE QUEM CANTA',
    '',
    '<span class="voice-legend"><span class="voice-legend-item voice-highlight-voz_principal">Voz principal</span></span>',
  ].join('\n'),
);

assert.equal(
  renderVoiceLegendHtml(['{voice-label: voz_principal=Joao}', 'A {voice: voz_principal}ALEGRIA{/voice}'].join('\n')),
  '<span class="voice-legend"><span class="voice-legend-item voice-highlight-voz_principal">Joao</span></span>',
);

assert.equal(
  applyVoiceLabelsToChordPro('{voice: voz_principal}\n[G]GRANDE ES TU\n{/voice}', { voz_principal: 'Joao' }),
  '{voice-label: voz_principal=Joao}\n{voice: voz_principal}\n[G]GRANDE ES TU\n{/voice}',
);

const editorState = createCifraEditorStateFromChordPro([
  '{voice-label: voz_principal=Joao}',
  '[G]A ALEGRIA {voice: voz_principal}[D/F#]ESTA{/voice} NO CORACAO',
].join('\n'));

assert.deepEqual(
  {
    text: editorState.text,
    voiceMarks: editorState.voiceMarks,
    voiceLabel: editorState.voiceLabels.voz_principal,
  },
  {
    text: ['G         D/F#', 'A ALEGRIA ESTA NO CORACAO'].join('\n'),
    voiceMarks: [{ start: 25, end: 29, markerId: 'voz_principal' }],
    voiceLabel: 'Joao',
  },
);

assert.equal(
  createChordProFromCifraEditorState(editorState),
  [
    '{voice-label: voz_principal=Joao}',
    '[G]A ALEGRIA {voice: voz_principal}[D/F#]ESTA{/voice} NO CORACAO',
  ].join('\n'),
);

assert.equal(
  createChordProFromCifraEditorState({
    text: 'A ALEGRIA ESTA\nNO CORACAO',
    voiceLabels: { voz_principal: 'Joao' },
    voiceMarks: [{ start: 0, end: 26, markerId: 'voz_principal' }],
  }),
  [
    '{voice-label: voz_principal=Joao}',
    '{voice: voz_principal}A ALEGRIA ESTA{/voice}',
    '{voice: voz_principal}NO CORACAO{/voice}',
  ].join('\n'),
);

assert.equal(
  createCifraExibicaoFromCifraEditorState(editorState),
  ['{voice-label: voz_principal=Joao}', 'G         D/F#', 'A ALEGRIA {voice: voz_principal}ESTA{/voice} NO CORACAO'].join('\n'),
);

assert.equal(
  createCifraEditorStateFromRecord({
    cifra_editor_state: {
      text: 'G\nA ALEGRIA',
      voiceMarks: [{ start: 2, end: 11, markerId: 'todos' }],
    },
    cifra_chordpro: '[C]IGNORAR',
  }).text,
  'G\nA ALEGRIA',
);

assert.equal(
  renderCifraOriginalPreviewHtml(['G      D/F#', 'Grande es Tu'].join('\n')),
  ['<span class="chord-line">G      D/F#</span>', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  createCifraExibicao(['G      D/F#', 'Grande es Tu'].join('\n')),
  ['G      D/F#', 'GRANDE ES TU'].join('\n'),
);

assert.equal(
  getCifraExibicao({ cifra_exibicao: 'C\nJA SALVA' }),
  'C\nJA SALVA',
);

assert.equal(
  getCifraExibicao({
    cifra_exibicao: '{voice: voz_principal}A ALEGRIA{/voice}',
    cifra_editor_state: {
      text: 'A ALEGRIA',
      voiceLabels: { voz_principal: 'Maria' },
      voiceMarks: [{ start: 0, end: 9, markerId: 'voz_principal' }],
    },
  }),
  '{voice-label: voz_principal=Maria}\n{voice: voz_principal}A ALEGRIA{/voice}',
);

assert.equal(
  getVoiceLabelsFromMusica({
    cifra_editor_state: {
      text: 'A ALEGRIA',
      voiceLabels: { voz_principal: 'Maria' },
      voiceMarks: [{ start: 0, end: 9, markerId: 'voz_principal' }],
    },
  }).voz_principal,
  'Maria',
);

assert.equal(
  getVoiceLabelsFromMusica({
    cifra_chordpro: '{voice-label: voz_principal=Maria}\n{voice: voz_principal}A ALEGRIA{/voice}',
    cifra_editor_state: {
      text: 'A ALEGRIA',
      voiceLabels: { voz_principal: 'Voz principal' },
      voiceMarks: [{ start: 0, end: 9, markerId: 'voz_principal' }],
    },
  }).voz_principal,
  'Maria',
);

assert.equal(
  renderMusicaCifraForDisplayHtml({
    cifra_editor_state: {
      text: 'A ALEGRIA',
      voiceLabels: { voz_principal: 'Maria' },
      voiceMarks: [{ start: 0, end: 9, markerId: 'voz_principal' }],
    },
  }).includes('>Maria</span>'),
  true,
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
  convertToChordPro('Solo final Bb  C  Dm7'),
  ['[*Solo final:]', '[Bb] [C] [Dm7]'].join('\n'),
);

assert.equal(
  convertToChordPro('SOLO - Bb  C  Dm7'),
  ['[*SOLO:]', '[Bb] [C] [Dm7]'].join('\n'),
);

assert.equal(
  convertToChordPro('Solo 2 Bb  C  Dm7'),
  ['[*Solo 2:]', '[Bb] [C] [Dm7]'].join('\n'),
);

assert.equal(
  convertToChordPro('Solo guitarra Bb  C  Dm7  2x'),
  ['[*Solo guitarra:]', '[Bb] [C] [Dm7]'].join('\n'),
);

assert.equal(
  convertToChordPro('Solo final: Bb  C  Dm7  bis'),
  ['[*Solo final bis:]', '[Bb] [C] [Dm7]'].join('\n'),
);

assert.equal(
  convertToChordPro('Intro violao G  D  Em'),
  ['[*Intro violao:]', '[G] [D] [Em]'].join('\n'),
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

assert.equal(
  extractLyricsFromCifraOriginal([
    '{voice-label: voz_principal=Joao}',
    '[G]A ALEGRIA {voice: voz_principal}ESTA NO CORACAO{/voice}',
    '{voice: segunda_voz}',
    '[D/F#]DE QUEM CANTA',
    '{/voice}',
  ].join('\n')),
  ['A ALEGRIA ESTA NO CORACAO', 'DE QUEM CANTA'].join('\n'),
);

console.log('chordpro tests passed');
