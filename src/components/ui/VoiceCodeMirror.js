import { EditorState, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { EditorView, Decoration, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { isCifraOriginalChordLine } from '../../utils/chordpro.js';

const setVoiceMarks = StateEffect.define();
const voiceMarks = StateField.define({
  create: () => Decoration.none,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setVoiceMarks)) return createDecorations(transaction.state.doc, effect.value);
    }
    return value.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field),
});

function createDecorations(doc, marks) {
  const builder = new RangeSetBuilder();
  const docText = doc.toString();
  getMarkableVoiceDecorations(docText, marks).forEach((mark) => {
    builder.add(mark.start, mark.end, Decoration.mark({
      class: `voice-highlight voice-highlight-${mark.markerId}`,
    }));
  });
  return builder.finish();
}

function getMarkableVoiceDecorations(text, marks) {
  const value = String(text || '');
  const decorations = [];

  (marks || [])
    .filter((mark) => mark.start < mark.end)
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .forEach((mark) => {
      let lineStart = 0;

      value.split('\n').forEach((line) => {
        const lineEnd = lineStart + line.length;
        const start = Math.max(mark.start, lineStart);
        const end = Math.min(mark.end, lineEnd);

        if (start < end && isVoiceMarkableLine(line)) {
          decorations.push({ ...mark, start, end });
        }

        lineStart = lineEnd + 1;
      });
    });

  return decorations;
}

function isVoiceMarkableLine(line) {
  return Boolean(String(line || '').trim()) && !isCifraOriginalChordLine(line);
}

export function createVoiceCodeMirror({ parent, text, marks, onChange, onSelection, onScroll }) {
  let syncing = false;
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc: text, extensions: [history(), keymap.of([...defaultKeymap, ...historyKeymap]), voiceMarks, EditorView.lineWrapping, EditorView.updateListener.of((update) => {
      if (update.selectionSet && !syncing) onSelection?.(update.state.selection.main);
      if (update.docChanged && !syncing) onChange(update.state.doc.toString(), update.state.selection.main);
    })] }),
  });
  view.dispatch({ effects: setVoiceMarks.of(marks) });
  view.scrollDOM.addEventListener('scroll', () => {
    onScroll?.({
      top: view.scrollDOM.scrollTop,
      left: view.scrollDOM.scrollLeft,
    });
  });

  return {
    focus: () => view.focus(),
    syncScroll({ top = 0, left = 0 }) {
      if (view.scrollDOM.scrollTop !== top) view.scrollDOM.scrollTop = top;
      if (view.scrollDOM.scrollLeft !== left) view.scrollDOM.scrollLeft = left;
    },
    sync(nextText, nextMarks, selection = null) {
      const currentText = view.state.doc.toString();
      const textChanged = currentText !== nextText;
      const nextSelection = selection || view.state.selection.main;
      const selectionChanged = selection
        && (nextSelection.anchor !== view.state.selection.main.anchor || nextSelection.head !== view.state.selection.main.head);

      // Durante a digitacao o proprio CodeMirror ja aplicou a alteracao no
      // documento. Reaplicar o texto inteiro aqui recriava o viewport e fazia
      // a pagina saltar. Ainda despachamos as decoracoes para manter as vozes
      // atualizadas, mas so trocamos o documento quando ele veio de outra fonte.
      syncing = true;
      view.dispatch({
        ...(textChanged ? { changes: { from: 0, to: view.state.doc.length, insert: nextText } } : {}),
        ...(selectionChanged ? { selection: nextSelection } : {}),
        effects: setVoiceMarks.of(nextMarks),
      });
      syncing = false;
    },
  };
}
