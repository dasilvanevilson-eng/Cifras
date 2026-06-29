import {
  applyVoiceLabelsToChordPro,
  createChordProFromCifraEditorState,
  createCifraEditorStateFromChordPro,
  createCifraEditorStateFromRecord,
  createCifraExibicaoFromCifraEditorState,
  convertToChordPro,
  getDefaultVoiceLabels,
  getVoiceLabels,
  isCifraOriginalChordLine,
  normalizeCifraEditorState,
  normalizeChordProLyrics,
  renderCifraOriginalForDisplayHtml,
  renderChordProForDisplay,
  renderChordProEditorHtmlFromCifraEditorState,
  renderVoiceLegendHtml,
  transposeChordPro,
  transposeKey,
} from '../../../utils/chordpro.js';
import { createPerformanceView } from '../pages/MusicaExecucaoPage.js';
import { createVoiceCodeMirror } from '../../../components/ui/VoiceCodeMirror.js';

export function MusicaForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  const initialEditorState = createCifraEditorStateFromRecord(initialValues);
  const initialChordPro = createChordProFromCifraEditorState(initialEditorState);
  const hideTitleField = Boolean(options.hideTitleField);
  const titleValue = initialValues.titulo || '';
  form.className = `form musica-form${hideTitleField ? ' is-title-unified' : ''}`;
  form.innerHTML = `
    ${hideTitleField ? `
      <input name="titulo" type="hidden" required value="${escapeHtml(titleValue)}">
      ${titleValue ? `<p class="musica-current-title">${escapeHtml(`Titulo: ${titleValue}`)}</p>` : ''}
    ` : `
      <label>
        Titulo
        <input name="titulo" type="text" required value="${escapeHtml(titleValue)}">
      </label>
    `}

    <div class="musica-form-pair musica-form-artist-tags">
      <label class="field-artist">
        Artista
        <input name="artista" type="text" value="${escapeHtml(initialValues.artista || '')}">
      </label>

      <label class="field-tags">
        Tags
        <input name="tags" type="text" placeholder="Ex: adoracao, ceia, abertura" value="${escapeHtml(formatTagsInput(initialValues.tags || ''))}">
      </label>
    </div>

    <div class="musica-form-pair musica-form-key-link">
      <label class="field-tom">
        Tom
        <input name="tom" type="text" placeholder="Ex: C, D, Em" value="${escapeHtml(initialValues.tom || '')}">
      </label>

      <label class="field-link">
        Link
        <span class="field-with-action">
          <input name="musica_link" type="url" placeholder="https://..." value="${escapeHtml(initialValues.musica_link || '')}">
          <a class="field-action-link" href="#" target="_blank" rel="noreferrer" hidden>Abrir</a>
        </span>
      </label>
    </div>

    <div class="musica-form-pair musica-form-contributors">
      <label class="field-collaborator">
        Colaborador
        <input name="colaborador_nome" type="text" value="${escapeHtml(initialValues.colaborador_nome || '')}">
      </label>

      <label class="field-reviewer">
        Revisor
        <input name="revisado_por_nome" type="text" value="${escapeHtml(initialValues.revisado_por_nome || '')}">
      </label>
    </div>

    <div class="music-form-actions">
      <button class="button-link secondary preview-toggle" type="button">Pre-visualizacao</button>
      <button class="button-link secondary" type="button" data-action="clear">Limpar tela</button>
      ${options.canDelete ? '<button class="danger-button" type="button" data-action="delete">Excluir</button>' : ''}
      <div class="music-form-control-row">
        <span class="inline-transpose-controls" aria-label="Transposicao de tom">
          <button class="nav-button" type="button" data-action="transpose-form-down" aria-label="Descer meio tom">-1/2</button>
          <span data-role="form-transpose-status">Tom</span>
          <button class="nav-button" type="button" data-action="transpose-form-up" aria-label="Subir meio tom">+1/2</button>
        </span>
        <div class="voice-marker-toolbar" aria-label="Marcacoes de vozes">
          <button class="voice-marker-toggle" type="button" data-action="toggle-voice-markers" aria-expanded="false">
            Destacar texto
          </button>
          <div class="voice-marker-options" data-role="voice-marker-options" hidden>
            ${VOICE_MARKERS.map((marker) => `
              <button class="voice-marker-button ${escapeHtml(marker.className)}" type="button" data-voice-marker="${escapeHtml(marker.id)}">
                ${escapeHtml(marker.label)}
              </button>
            `).join('')}
            <button class="voice-marker-button" type="button" data-action="unmark-voice">Desmarcar linha</button>
            <button class="voice-marker-button" type="button" data-action="clear-voice-markers">Limpar destaques</button>
            <details class="voice-label-settings">
              <summary>Nomes da legenda</summary>
              <div class="voice-label-grid">
                ${VOICE_MARKERS.map((marker) => `
                  <label>
                    ${escapeHtml(marker.label)}
                    <input name="voice_label_${escapeHtml(marker.id)}" type="text" value="${escapeHtml(getInitialVoiceLabels(initialChordPro)[marker.id] || marker.label)}">
                  </label>
                `).join('')}
              </div>
            </details>
          </div>
        </div>
        <button class="button" type="submit">${options.submitLabel || 'Salvar musica'}</button>
      </div>
    </div>

    <div class="cifra-editor-grid">
      <label>
        Cifra original
        <div class="voice-editor-legend" data-role="original-voice-legend"></div>
        <div class="cifra-original-editor-shell">
          <div class="cifra-original-codemirror" aria-label="Cifra original"></div>
          <pre class="cifra-original-editor" aria-hidden="true" hidden></pre>
          <textarea class="cifra-original-source" name="cifra_original" rows="14" required spellcheck="false" wrap="off">${escapeHtml(initialEditorState.text)}</textarea>
        </div>
      </label>

      <label>
        ChordPro interno
        <textarea class="chordpro-source" name="cifra_chordpro">${escapeHtml(initialChordPro)}</textarea>
        <textarea class="cifra-editor-state-source" name="cifra_editor_state" hidden>${escapeHtml(JSON.stringify(initialEditorState))}</textarea>
        <div class="chordpro-editor" contenteditable="true" role="textbox" aria-label="ChordPro interno" spellcheck="false"></div>
        <div class="voice-editor-legend" data-role="chordpro-voice-legend"></div>
      </label>
    </div>

    <section class="song-preview song-view" hidden></section>

    <p class="form-message" aria-live="polite"></p>
  `;

  const message = form.querySelector('.form-message');
  const button = form.querySelector('button[type="submit"]');
  const clearButton = form.querySelector('[data-action="clear"]');
  const deleteButton = form.querySelector('[data-action="delete"]');
  const transposeFormDownButton = form.querySelector('[data-action="transpose-form-down"]');
  const transposeFormUpButton = form.querySelector('[data-action="transpose-form-up"]');
  const formTransposeStatus = form.querySelector('[data-role="form-transpose-status"]');
  const originalTextarea = form.querySelector('[name="cifra_original"]');
  const originalEditor = form.querySelector('.cifra-original-editor');
  const originalCodeMirrorHost = form.querySelector('.cifra-original-codemirror');
  const chordProTextarea = form.querySelector('[name="cifra_chordpro"]');
  const editorStateTextarea = form.querySelector('[name="cifra_editor_state"]');
  const chordProEditor = form.querySelector('.chordpro-editor');
  const voiceLegendSlots = form.querySelectorAll('.voice-editor-legend');
  const voiceLabelInputs = form.querySelectorAll('[name^="voice_label_"]');
  const tomInput = form.querySelector('[name="tom"]');
  const cifraEditorGrid = form.querySelector('.cifra-editor-grid');
  const linkInput = form.querySelector('[name="musica_link"]');
  const linkAction = form.querySelector('.field-action-link');
  const previewToggle = form.querySelector('.preview-toggle');
  const previewPanel = form.querySelector('.song-preview');
  const voiceMarkerToggle = form.querySelector('[data-action="toggle-voice-markers"]');
  const voiceMarkerOptions = form.querySelector('[data-role="voice-marker-options"]');
  const voiceMarkerButtons = form.querySelectorAll('[data-voice-marker]');
  const unmarkVoiceButton = form.querySelector('[data-action="unmark-voice"]');
  const clearVoiceMarkersButton = form.querySelector('[data-action="clear-voice-markers"]');
  const formTransposeState = {
    semitones: 0,
  };
  let editorState = normalizeCifraEditorState(initialEditorState);
  let pendingOriginalEditorInput = null;
  const voiceCodeMirror = createVoiceCodeMirror({
    parent: originalCodeMirrorHost,
    text: editorState.text,
    marks: editorState.voiceMarks,
    onChange: (text, selection) => {
      originalTextarea.value = text;
      originalTextarea.setSelectionRange(selection.from, selection.to);
      originalTextarea.dispatchEvent(new Event('input'));
    },
    onSelection: (selection) => originalTextarea.setSelectionRange(selection.from, selection.to),
    onScroll: ({ top, left }) => syncEditorScroll(chordProEditor, { top, left }),
  });
  originalCodeMirrorHost.voiceCodeMirror = voiceCodeMirror;

  updateLinkAction(linkInput, linkAction);
  syncVoiceMarkerButtonLabels(form);
  renderChordProEditor(chordProEditor, chordProTextarea.value, editorState);
  renderOriginalEditor(originalEditor, chordProTextarea.value);
  updateVoiceLegends(form, voiceLegendSlots, chordProTextarea.value, editorState);
  setupResponsiveCifraEditor(cifraEditorGrid);

  voiceMarkerToggle.addEventListener('click', () => {
    const isOpen = voiceMarkerOptions.hidden;
    voiceMarkerOptions.hidden = !isOpen;
    voiceMarkerToggle.setAttribute('aria-expanded', String(isOpen));
  });

  originalTextarea.addEventListener('beforeinput', (event) => {
    pendingOriginalEditorInput = null;

    if (!['insertParagraph', 'insertLineBreak'].includes(event.inputType)) {
      return;
    }

    const selectionOffsets = getEditorSelectionOffsets(originalTextarea);
    const activeVoiceRange = getVoiceRangeAtOffset(editorState.voiceMarks, selectionOffsets.start);

    if (!activeVoiceRange) {
      return;
    }

    pendingOriginalEditorInput = {
      type: event.inputType,
      offset: selectionOffsets.start,
      range: { ...activeVoiceRange },
    };
  });

  originalTextarea.addEventListener('input', () => {
    const selectionOffsets = getEditorSelectionOffsets(originalTextarea);
    const previousOriginal = editorState.text;
    const nextOriginal = originalTextarea.value;
    const previousVoiceMarks = editorState.voiceMarks;
    const transformedVoiceMarks = transformVoiceRangesForTextChange(previousOriginal, nextOriginal, previousVoiceMarks)
      .filter((range) => range.start < range.end);
    editorState = normalizeCifraEditorState({
      ...editorState,
      text: nextOriginal,
      voiceLabels: getVoiceLabelValues(form),
      voiceMarks: ensurePendingLineBreakKeepsVoiceRange({
        previousText: previousOriginal,
        nextText: nextOriginal,
        previousRanges: previousVoiceMarks,
        nextRanges: transformedVoiceMarks,
        pendingInput: pendingOriginalEditorInput,
      }),
    });
    pendingOriginalEditorInput = null;
    syncEditorStateOutputs({
      editorState,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      editorStateTextarea,
      chordProEditor,
      previewPanel,
      form,
      restoreSelection: selectionOffsets,
    });
  });

  originalTextarea.addEventListener('scroll', () => {
    syncOriginalEditorScroll(originalTextarea, originalEditor);
  });

  chordProEditor.addEventListener('scroll', () => {
    voiceCodeMirror.syncScroll({
      top: chordProEditor.scrollTop,
      left: chordProEditor.scrollLeft,
    });
  });

  voiceLabelInputs.forEach((input) => {
    input.addEventListener('input', () => {
      editorState = normalizeCifraEditorState({
        ...editorState,
        voiceLabels: getVoiceLabelValues(form),
      });
      syncEditorStateOutputs({
        editorState,
        originalTextarea,
        originalEditor,
        chordProTextarea,
        editorStateTextarea,
        chordProEditor,
        previewPanel,
        form,
      });
      syncVoiceMarkerButtonLabels(form);

      if (!previewPanel.hidden) {
        updatePreview(form, previewPanel, editorState);
      }
    });
  });

  voiceMarkerButtons.forEach((voiceMarkerButton) => {
    voiceMarkerButton.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    voiceMarkerButton.addEventListener('click', () => {
      updateVoiceMarkedChordPro({
        editorState,
        originalEditor,
        originalTextarea,
        chordProTextarea,
        editorStateTextarea,
        chordProEditor,
        markerId: voiceMarkerButton.dataset.voiceMarker,
        mode: 'selection',
        previewPanel,
        form,
      });
      editorState = normalizeCifraEditorState(JSON.parse(editorStateTextarea.value || '{}'));

      originalTextarea.focus();
    });
  });

  unmarkVoiceButton.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });

  unmarkVoiceButton.addEventListener('click', () => {
    updateVoiceMarkedChordPro({
      editorState,
      originalEditor,
      originalTextarea,
      chordProTextarea,
      editorStateTextarea,
      chordProEditor,
      markerId: '',
      mode: 'line',
      previewPanel,
      form,
    });
    editorState = normalizeCifraEditorState(JSON.parse(editorStateTextarea.value || '{}'));
    originalTextarea.focus();
  });

  clearVoiceMarkersButton.addEventListener('click', () => {
    editorState = normalizeCifraEditorState({
      ...editorState,
      voiceLabels: getVoiceLabelValues(form),
      voiceMarks: [],
    });
    syncEditorStateOutputs({
      editorState,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      editorStateTextarea,
      chordProEditor,
      previewPanel,
      form,
    });
    originalTextarea.focus();
  });

  chordProEditor.addEventListener('focus', () => {
    chordProEditor.textContent = chordProTextarea.value;
  });

  chordProEditor.addEventListener('input', () => {
    chordProTextarea.value = getEditableText(chordProEditor);
    editorState = normalizeCifraEditorState(createCifraEditorStateFromChordPro(chordProTextarea.value));
    originalTextarea.value = editorState.text;
    editorStateTextarea.value = JSON.stringify(editorState);
    voiceCodeMirror.sync(editorState.text, editorState.voiceMarks);
    renderOriginalEditor(originalEditor, chordProTextarea.value);
    syncVoiceLabelInputs(form, chordProTextarea.value);
    updateVoiceLegends(form, voiceLegendSlots, chordProTextarea.value, editorState);

    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel, editorState);
    }
  });

  chordProEditor.addEventListener('blur', () => {
    const normalizedChordPro = normalizeChordProLyrics(chordProTextarea.value);
    editorState = normalizeCifraEditorState(createCifraEditorStateFromChordPro(normalizedChordPro));
    const nextChordPro = createChordProFromCifraEditorState(editorState);
    setChordProValue(chordProTextarea, chordProEditor, nextChordPro, editorState);
    originalTextarea.value = editorState.text;
    editorStateTextarea.value = JSON.stringify(editorState);
    voiceCodeMirror.sync(editorState.text, editorState.voiceMarks);
    renderOriginalEditor(originalEditor, nextChordPro);
    syncVoiceLabelInputs(form, nextChordPro);
    updateVoiceLegends(form, voiceLegendSlots, chordProTextarea.value, editorState);
  });

  linkInput.addEventListener('input', () => {
    updateLinkAction(linkInput, linkAction);
  });

  clearButton.addEventListener('click', () => {
    if (options.onClear) {
      options.onClear();
      return;
    }

    editorState = normalizeCifraEditorState();
    clearForm(form, chordProTextarea, editorStateTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState);
  });

  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      if (!options.onDelete) return;

      deleteButton.disabled = true;
      message.className = 'form-message';
      message.textContent = 'Excluindo...';

      try {
        const deleted = await options.onDelete();

        if (deleted === false) {
          message.textContent = '';
          deleteButton.disabled = false;
        }
      } catch (error) {
        message.className = 'form-message error';
        message.textContent = error.message || 'Nao foi possivel excluir a musica.';
        deleteButton.disabled = false;
      }
    });
  }

  transposeFormDownButton.addEventListener('click', () => {
    editorState = transposeFormFields({
      semitones: -1,
      editorState,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      editorStateTextarea,
      chordProEditor,
      tomInput,
      previewPanel,
      form,
    });
    updateFormTransposeStatus(formTransposeStatus, formTransposeState, -1);
  });

  transposeFormUpButton.addEventListener('click', () => {
    editorState = transposeFormFields({
      semitones: 1,
      editorState,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      editorStateTextarea,
      chordProEditor,
      tomInput,
      previewPanel,
      form,
    });
    updateFormTransposeStatus(formTransposeStatus, formTransposeState, 1);
  });

  previewToggle.addEventListener('click', () => {
    openPreview(form, previewPanel, previewToggle, editorState);
  });

  previewPanel.addEventListener('click', (event) => {
    const backAction = event.target.closest('.song-toolbar-back');
    if (!backAction) return;

    event.preventDefault();
    closePreview(form, previewPanel, previewToggle);
  });

  form.addEventListener('input', () => {
    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel, editorState);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!options.onSubmit) return;

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    try {
      const values = getFormValues(form, editorState);
      if (!values.titulo) {
        throw new Error('Digite o titulo da cifra no campo de busca acima.');
      }

      await options.onSubmit(values);

      if (!options.keepValuesAfterSubmit) {
        editorState = normalizeCifraEditorState();
        clearForm(form, chordProTextarea, editorStateTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState);
      }
      message.className = 'form-message success';
      message.textContent = 'Musica salva com sucesso.';

      if (options.onSaved) {
        options.onSaved();
      }
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel salvar a musica.';
    } finally {
      button.disabled = false;
    }
  });

  return form;
}

function syncChordProFromOriginal({
  originalTextarea,
  originalEditor,
  chordProTextarea,
  chordProEditor,
  previewPanel,
  form,
  previousOriginal = '',
  restoreSelection = null,
}) {
  const previousMarkedText = normalizeVoiceBlocksToInline(renderChordProForDisplay(chordProTextarea.value, {
    keepVoiceDirectives: true,
  }));
  const previousRanges = getVoiceRangesFromMarkedText(previousMarkedText);
  const nextRanges = transformVoiceRangesForTextChange(previousOriginal, originalTextarea.value, previousRanges)
    .filter((range) => range.start < range.end);
  const markedOriginal = applyVoiceRangesToText(originalTextarea.value, nextRanges);
  const nextAutoChordPro = applyVoiceLabelsToChordPro(
    convertToChordPro(markedOriginal),
    getVoiceLabelValues(form),
  );
  setChordProValue(chordProTextarea, chordProEditor, nextAutoChordPro, normalizeCifraEditorState({
    text: originalTextarea.value,
    voiceLabels: getVoiceLabelValues(form),
    voiceMarks: nextRanges,
  }));
  renderOriginalEditor(originalEditor, nextAutoChordPro, {
    restoreSelection,
  });
  updateVoiceLegends(form, form.querySelectorAll('.voice-editor-legend'), nextAutoChordPro, normalizeCifraEditorState({
    text: originalTextarea.value,
    voiceLabels: getVoiceLabelValues(form),
    voiceMarks: nextRanges,
  }));

  if (!previewPanel.hidden) {
    updatePreview(form, previewPanel);
  }
}

function renderOriginalEditor(editor, chordProValue, options = {}) {
  if (!editor) return;

  const scrollTop = editor.scrollTop;
  const scrollLeft = editor.scrollLeft;
  const form = editor.closest('.musica-form');
  const sourceTextarea = form?.querySelector('[name="cifra_original"]');
  const stateTextarea = form?.querySelector('[name="cifra_editor_state"]');
  const editorState = normalizeCifraEditorState(stateTextarea?.value || {});
  const displayValue = sourceTextarea
    ? applyVoiceRangesToText(sourceTextarea.value, editorState.voiceMarks)
    : renderChordProForDisplay(chordProValue, { keepVoiceDirectives: true });

  editor.innerHTML = renderCifraOriginalForDisplayHtml(displayValue, {
    includeVoiceLegend: false,
  }) || '<br>';
  editor.scrollTop = scrollTop;
  editor.scrollLeft = scrollLeft;
}

function syncOriginalEditorScroll(textarea, editor) {
  if (!textarea || !editor) return;

  editor.scrollTop = textarea.scrollTop;
  editor.scrollLeft = textarea.scrollLeft;
}

function syncEditorScroll(editor, { top, left }) {
  if (!editor) return;

  if (editor.scrollTop !== top) editor.scrollTop = top;
  if (editor.scrollLeft !== left) editor.scrollLeft = left;
}

function updateVoiceMarkedChordPro({
  editorState,
  originalEditor,
  originalTextarea,
  chordProTextarea,
  editorStateTextarea,
  chordProEditor,
  markerId,
  mode,
  previewPanel,
  form,
}) {
  if (!originalEditor || !originalTextarea) return;

  const cleanText = originalTextarea.value || '';
  const selectionOffsets = getEditorSelectionOffsets(originalTextarea);
  const targetRanges = mode === 'line'
    ? getMarkableRangesForCursorLine(cleanText, selectionOffsets.start)
    : getMarkableRangesForSelection(cleanText, selectionOffsets);

  if (!targetRanges.length) return;

  const nextEditorState = normalizeCifraEditorState({
    ...editorState,
    text: cleanText,
    voiceLabels: getVoiceLabelValues(form),
    voiceMarks: replaceVoiceRanges(editorState.voiceMarks, targetRanges, markerId),
  });

  syncEditorStateOutputs({
    editorState: nextEditorState,
    originalTextarea,
    originalEditor,
    chordProTextarea,
    editorStateTextarea,
    chordProEditor,
    previewPanel,
    form,
  });
}

function syncEditorStateOutputs({
  editorState,
  originalTextarea,
  originalEditor,
  chordProTextarea,
  editorStateTextarea,
  chordProEditor,
  previewPanel,
  form,
  restoreSelection = null,
}) {
  const normalizedState = normalizeCifraEditorState(editorState);
  const nextChordPro = createChordProFromCifraEditorState(normalizedState);

  originalTextarea.value = normalizedState.text;
  if (editorStateTextarea) {
    editorStateTextarea.value = JSON.stringify(normalizedState);
  }
  setChordProValue(chordProTextarea, chordProEditor, nextChordPro, normalizedState);
  const codeMirror = originalEditor?.closest('.musica-form')?.querySelector('.cifra-original-codemirror')?.voiceCodeMirror;
  codeMirror?.sync(normalizedState.text, normalizedState.voiceMarks, restoreSelection ? { anchor: restoreSelection.start, head: restoreSelection.end } : null);
  renderOriginalEditor(originalEditor, nextChordPro, {
    restoreSelection,
  });
  syncOriginalEditorScroll(originalTextarea, originalEditor);
  if (restoreSelection) {
    restoreEditorSelection(originalTextarea, restoreSelection);
  }
  updateVoiceLegends(form, form.querySelectorAll('.voice-editor-legend'), nextChordPro, normalizedState);

  if (!previewPanel.hidden) {
    updatePreview(form, previewPanel, normalizedState);
  }
}

function updateVoiceLegends(form, slots, chordProValue, editorState = null) {
  const normalizedState = normalizeCifraEditorState(editorState || {});
  const usedVoiceIds = normalizedState.voiceMarks?.length
    ? [...new Set(normalizedState.voiceMarks.map((mark) => mark.markerId).filter(Boolean))]
    : null;
  const legendHtml = renderVoiceLegendHtml(chordProValue, {
    voiceLabels: getVoiceLabelValues(form),
    usedVoiceIds,
  });

  slots.forEach((slot) => {
    slot.innerHTML = legendHtml;
    slot.hidden = !legendHtml;
  });
}

function getVoiceLabelValues(form) {
  const labels = getDefaultVoiceLabels();

  VOICE_MARKERS.forEach((marker) => {
    const input = form.querySelector(`[name="voice_label_${marker.id}"]`);
    const value = String(input?.value || '').trim();
    labels[marker.id] = value || marker.label;
  });

  return labels;
}

function syncVoiceMarkerButtonLabels(form) {
  VOICE_MARKERS.forEach((marker) => {
    const button = form.querySelector(`[data-voice-marker="${marker.id}"]`);
    const input = form.querySelector(`[name="voice_label_${marker.id}"]`);
    const label = String(input?.value || '').trim() || marker.label;

    if (button) {
      button.textContent = label;
      button.title = marker.label === label ? marker.label : `${marker.label}: ${label}`;
      button.setAttribute('aria-label', `Marcar ${label}`);
    }
  });
}

function getInitialVoiceLabels(chordProValue) {
  return {
    ...getDefaultVoiceLabels(),
    ...getVoiceLabels(chordProValue),
  };
}

function syncVoiceLabelInputs(form, chordProValue) {
  const labels = getInitialVoiceLabels(chordProValue);

  VOICE_MARKERS.forEach((marker) => {
    const input = form.querySelector(`[name="voice_label_${marker.id}"]`);
    if (input && document.activeElement !== input) {
      input.value = labels[marker.id] || marker.label;
    }
  });
}

function getEditorSelectionOffsets(editor) {
  if (editor && typeof editor.selectionStart === 'number' && typeof editor.selectionEnd === 'number') {
    return {
      start: Math.min(editor.selectionStart, editor.selectionEnd),
      end: Math.max(editor.selectionStart, editor.selectionEnd),
    };
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
    const textLength = getEditableText(editor).length;
    return { start: textLength, end: textLength };
  }

  const range = selection.getRangeAt(0);
  const startRange = range.cloneRange();
  startRange.selectNodeContents(editor);
  startRange.setEnd(range.startContainer, range.startOffset);

  const endRange = range.cloneRange();
  endRange.selectNodeContents(editor);
  endRange.setEnd(range.endContainer, range.endOffset);

  const start = startRange.toString().length;
  const end = endRange.toString().length;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function restoreEditorSelection(editor, offsets) {
  if (!editor || !offsets) return;

  if (typeof editor.setSelectionRange === 'function') {
    const textLength = String(editor.value || '').length;
    const start = Math.max(0, Math.min(textLength, offsets.start));
    const end = Math.max(0, Math.min(textLength, offsets.end));
    editor.setSelectionRange(start, end);
    return;
  }

  const selection = window.getSelection();
  if (!selection) return;

  const startPosition = getTextNodePositionAtOffset(editor, offsets.start);
  const endPosition = getTextNodePositionAtOffset(editor, offsets.end);

  if (!startPosition || !endPosition) return;

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getTextNodePositionAtOffset(root, targetOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let node = walker.nextNode();
  let lastTextNode = null;

  while (node) {
    const nextOffset = currentOffset + node.textContent.length;
    lastTextNode = node;

    if (targetOffset <= nextOffset) {
      return {
        node,
        offset: Math.max(0, Math.min(node.textContent.length, targetOffset - currentOffset)),
      };
    }

    currentOffset = nextOffset;
    node = walker.nextNode();
  }

  if (lastTextNode) {
    return {
      node: lastTextNode,
      offset: lastTextNode.textContent.length,
    };
  }

  const emptyTextNode = document.createTextNode('');
  root.append(emptyTextNode);
  return {
    node: emptyTextNode,
    offset: 0,
  };
}

function isVoiceMarkableLine(line) {
  return Boolean(String(line || '').trim()) && !isCifraOriginalChordLine(line);
}

function getMarkableRangesForSelection(text, selectionOffsets) {
  const start = Math.min(selectionOffsets.start, selectionOffsets.end);
  const end = Math.max(selectionOffsets.start, selectionOffsets.end);

  if (start === end) return [];

  return getMarkableRangesInInterval(text, start, end);
}

function getMarkableRangesForCursorLine(text, cursorOffset) {
  const lineStart = String(text || '').lastIndexOf('\n', Math.max(0, cursorOffset - 1)) + 1;
  const nextLineBreak = String(text || '').indexOf('\n', cursorOffset);
  const lineEnd = nextLineBreak === -1 ? String(text || '').length : nextLineBreak;

  return getMarkableRangesInInterval(text, lineStart, lineEnd);
}

function getMarkableRangesInInterval(text, start, end) {
  const value = String(text || '');
  const ranges = [];
  let lineStart = 0;

  value.split('\n').forEach((line) => {
    const lineEnd = lineStart + line.length;
    const rangeStart = Math.max(start, lineStart);
    const rangeEnd = Math.min(end, lineEnd);

    if (rangeStart < rangeEnd && isVoiceMarkableLine(line)) {
      ranges.push({
        start: trimRangeStart(value, rangeStart, rangeEnd),
        end: trimRangeEnd(value, rangeStart, rangeEnd),
      });
    }

    lineStart = lineEnd + 1;
  });

  return ranges.filter((range) => range.start < range.end);
}

function trimRangeStart(value, start, end) {
  let nextStart = start;

  while (nextStart < end && /\s/.test(value[nextStart])) {
    nextStart += 1;
  }

  return nextStart;
}

function trimRangeEnd(value, start, end) {
  let nextEnd = end;

  while (nextEnd > start && /\s/.test(value[nextEnd - 1])) {
    nextEnd -= 1;
  }

  return nextEnd;
}

function normalizeVoiceBlocksToInline(markedText) {
  const output = [];
  let activeMarker = '';

  String(markedText || '').split('\n').forEach((line) => {
    const openingMatch = line.trim().match(/^\{voice\s*:\s*([a-z0-9_-]+)\}$/i);

    if (openingMatch) {
      activeMarker = openingMatch[1].toLowerCase();
      return;
    }

    if (/^\{\/voice\}$/i.test(line.trim())) {
      activeMarker = '';
      return;
    }

    output.push(activeMarker && isVoiceMarkableLine(line)
      ? `{voice: ${activeMarker}}${line}{/voice}`
      : line);
  });

  return output.join('\n');
}

function getVoiceRangesFromMarkedText(markedText) {
  const ranges = [];
  let cleanOffset = 0;
  let activeMarker = '';
  let activeStart = 0;
  const tokenPattern = /\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/gi;
  let sourceIndex = 0;

  String(markedText || '').replace(tokenPattern, (token, tokenIndex) => {
    cleanOffset += tokenIndex - sourceIndex;
    closeActiveRange();

    const openingMatch = token.match(/^\{voice\s*:\s*([a-z0-9_-]+)\}$/i);
    if (openingMatch) {
      activeMarker = openingMatch[1].toLowerCase();
      activeStart = cleanOffset;
    }

    sourceIndex = tokenIndex + token.length;
    return token;
  });

  cleanOffset += String(markedText || '').length - sourceIndex;
  closeActiveRange();
  return ranges;

  function closeActiveRange() {
    if (activeMarker && activeStart < cleanOffset) {
      ranges.push({ start: activeStart, end: cleanOffset, markerId: activeMarker });
    }
    activeMarker = '';
  }
}

function replaceVoiceRanges(existingRanges, targetRanges, markerId) {
  const nextRanges = [];

  existingRanges.forEach((range) => {
    let fragments = [{ ...range }];

    targetRanges.forEach((target) => {
      fragments = fragments.flatMap((fragment) => subtractRange(fragment, target));
    });

    nextRanges.push(...fragments);
  });

  if (markerId) {
    targetRanges.forEach((range) => {
      nextRanges.push({ ...range, markerId });
    });
  }

  return nextRanges
    .filter((range) => range.start < range.end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function transformVoiceRangesForTextChange(previousText, nextText, ranges) {
  if (!ranges.length || previousText === nextText) {
    return ranges;
  }

  const previousValue = String(previousText || '');
  const nextValue = String(nextText || '');
  let prefixLength = 0;
  const prefixLimit = Math.min(previousValue.length, nextValue.length);

  while (
    prefixLength < prefixLimit
    && previousValue[prefixLength] === nextValue[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const previousSuffixLimit = previousValue.length - prefixLength;
  const nextSuffixLimit = nextValue.length - prefixLength;

  while (
    suffixLength < previousSuffixLimit
    && suffixLength < nextSuffixLimit
    && previousValue[previousValue.length - 1 - suffixLength] === nextValue[nextValue.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const previousChangeEnd = previousValue.length - suffixLength;
  const nextChangeEnd = nextValue.length - suffixLength;
  const delta = nextChangeEnd - previousChangeEnd;

  return ranges.map((range) => {
    if (range.end <= prefixLength) {
      return range;
    }

    if (range.start >= previousChangeEnd) {
      return {
        ...range,
        start: Math.max(0, range.start + delta),
        end: Math.max(0, range.end + delta),
      };
    }

    const nextStart = range.start < prefixLength
      ? range.start
      : Math.min(nextChangeEnd, nextValue.length);
    const nextEnd = range.end > previousChangeEnd
      ? Math.max(nextStart, Math.min(nextValue.length, range.end + delta))
      : Math.max(nextStart, Math.min(prefixLength, range.end));

    return {
      ...range,
      start: nextStart,
      end: nextEnd,
    };
  });
}

function getVoiceRangeAtOffset(ranges, offset) {
  return ranges.find((range) => range.start < offset && range.end > offset)
    || ranges.find((range) => range.start <= offset && range.end >= offset)
    || null;
}

function ensurePendingLineBreakKeepsVoiceRange({
  previousText,
  nextText,
  previousRanges,
  nextRanges,
  pendingInput,
}) {
  if (!pendingInput || !['insertParagraph', 'insertLineBreak'].includes(pendingInput.type)) {
    return nextRanges;
  }

  const previousRange = pendingInput.range;

  if (!previousRange?.markerId) {
    return nextRanges;
  }

  const change = getSingleTextChange(previousText, nextText);
  const insertedText = String(nextText || '').slice(change.nextStart, change.nextEnd);

  if (!insertedText.includes('\n')) {
    return nextRanges;
  }

  const transformedRange = transformVoiceRangesForTextChange(previousText, nextText, [previousRange])[0];

  if (!transformedRange || transformedRange.start >= transformedRange.end) {
    return nextRanges;
  }

  const rangesWithoutReplacedVoice = nextRanges.filter((range) => !rangesOverlap(range, transformedRange)
    || range.markerId !== previousRange.markerId);

  return [
    ...rangesWithoutReplacedVoice,
    {
      ...transformedRange,
      markerId: previousRange.markerId,
    },
  ]
    .filter((range) => range.start < range.end)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function getSingleTextChange(previousText, nextText) {
  const previousValue = String(previousText || '');
  const nextValue = String(nextText || '');
  let prefixLength = 0;
  const prefixLimit = Math.min(previousValue.length, nextValue.length);

  while (
    prefixLength < prefixLimit
    && previousValue[prefixLength] === nextValue[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const previousSuffixLimit = previousValue.length - prefixLength;
  const nextSuffixLimit = nextValue.length - prefixLength;

  while (
    suffixLength < previousSuffixLimit
    && suffixLength < nextSuffixLimit
    && previousValue[previousValue.length - 1 - suffixLength] === nextValue[nextValue.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    previousStart: prefixLength,
    previousEnd: previousValue.length - suffixLength,
    nextStart: prefixLength,
    nextEnd: nextValue.length - suffixLength,
  };
}

function rangesOverlap(firstRange, secondRange) {
  return firstRange.start < secondRange.end && firstRange.end > secondRange.start;
}

function subtractRange(range, target) {
  if (target.end <= range.start || target.start >= range.end) {
    return [range];
  }

  return [
    { ...range, end: Math.max(range.start, target.start) },
    { ...range, start: Math.min(range.end, target.end) },
  ].filter((fragment) => fragment.start < fragment.end);
}

function applyVoiceRangesToText(text, ranges) {
  const value = String(text || '');
  const inserts = [];

  ranges.forEach((range) => {
    getVoiceRangeLineFragments(value, range.start, range.end, range.markerId).forEach((fragment) => {
      inserts.push({ index: fragment.start, text: `{voice: ${fragment.markerId}}` });
      inserts.push({ index: fragment.end, text: '{/voice}' });
    });
  });

  inserts.sort((a, b) => b.index - a.index || (a.text.startsWith('{/') ? 1 : -1));

  return inserts.reduce((result, insert) => (
    `${result.slice(0, insert.index)}${insert.text}${result.slice(insert.index)}`
  ), value);
}

function getVoiceRangeLineFragments(value, start, end, markerId) {
  const fragments = [];
  let cursor = start;

  while (cursor < end) {
    const nextLineBreak = value.indexOf('\n', cursor);
    const fragmentEnd = nextLineBreak === -1 || nextLineBreak >= end
      ? end
      : nextLineBreak;

    if (cursor < fragmentEnd) {
      fragments.push({
        start: cursor,
        end: fragmentEnd,
        markerId,
      });
    }

    cursor = fragmentEnd;
    if (value[cursor] === '\n') {
      cursor += 1;
    }
  }

  return fragments;
}

function clearForm(form, chordProTextarea, editorStateTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState = null) {
  form.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
  if (editorStateTextarea) {
    editorStateTextarea.value = JSON.stringify(normalizeCifraEditorState());
  }
  setChordProValue(chordProTextarea, chordProEditor, '');
  renderOriginalEditor(form.querySelector('.cifra-original-editor'), '');
  const formTransposeStatus = form.querySelector('[data-role="form-transpose-status"]');
  if (formTransposeStatus) {
    if (formTransposeState) {
      formTransposeState.semitones = 0;
    }
    renderFormTransposeStatus(formTransposeStatus, 0);
  }
  previewPanel.hidden = true;
  form.classList.remove('is-previewing');
  previewToggle.textContent = 'Pre-visualizacao';
  updateLinkAction(form.querySelector('[name="musica_link"]'), form.querySelector('.field-action-link'));
}

function transposeFormFields({
  semitones,
  editorState,
  originalTextarea,
  originalEditor,
  chordProTextarea,
  editorStateTextarea,
  chordProEditor,
  tomInput,
  previewPanel,
  form,
}) {
  const transposedChordPro = transposeChordPro(chordProTextarea.value, semitones);
  const nextEditorState = normalizeCifraEditorState({
    ...createCifraEditorStateFromChordPro(transposedChordPro),
    voiceLabels: getVoiceLabelValues(form),
  });

  const currentTom = String(tomInput.value || '').trim();
  if (currentTom) {
    tomInput.value = transposeKey(currentTom, semitones);
  }

  syncEditorStateOutputs({
    editorState: nextEditorState,
    originalTextarea,
    originalEditor,
    chordProTextarea,
    editorStateTextarea,
    chordProEditor,
    previewPanel,
    form,
  });

  return nextEditorState;
}

function updateFormTransposeStatus(status, formTransposeState, delta) {
  formTransposeState.semitones += delta;
  renderFormTransposeStatus(status, formTransposeState.semitones);
}

function renderFormTransposeStatus(status, semitones) {
  status.textContent = semitones === 0
    ? 'Tom'
    : formatTransposeStatus(semitones);
}

function openPreview(form, previewPanel, previewToggle, editorState = null) {
  previewPanel.hidden = false;
  form.classList.add('is-previewing');
  previewToggle.textContent = 'Pre-visualizacao';
  updatePreview(form, previewPanel, editorState);
  previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePreview(form, previewPanel, previewToggle) {
  previewPanel.hidden = true;
  form.classList.remove('is-previewing');
  previewToggle.textContent = 'Pre-visualizacao';
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupResponsiveCifraEditor(container) {
  if (!container) return;

  function updateLayout() {
    const canShowSideBySide = container.clientWidth >= 760;
    container.classList.toggle('can-show-side-by-side', canShowSideBySide);
  }

  window.requestAnimationFrame(updateLayout);
  window.setTimeout(updateLayout, 0);
  window.setTimeout(updateLayout, 120);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);
  }

  window.addEventListener('resize', updateLayout);
}

function getFormValues(form, editorState = null) {
  const formData = new FormData(form);
  const normalizedEditorState = normalizeCifraEditorState(editorState || formData.get('cifra_editor_state'));
  const normalizedChordPro = createChordProFromCifraEditorState(normalizedEditorState).trim();

  return {
    titulo: String(formData.get('titulo') || '').trim(),
    artista: String(formData.get('artista') || '').trim(),
    tom: String(formData.get('tom') || '').trim(),
    tags: String(formData.get('tags') || '').trim() || null,
    musica_link: String(formData.get('musica_link') || '').trim() || null,
    colaborador_nome: String(formData.get('colaborador_nome') || '').trim() || null,
    revisado_por_nome: String(formData.get('revisado_por_nome') || '').trim() || null,
    cifra_editor_state: normalizedEditorState,
    cifra_original: normalizedEditorState.text.trim(),
    cifra_chordpro: normalizedChordPro,
    cifra_exibicao: createCifraExibicaoFromCifraEditorState(normalizedEditorState),
  };
}

function getInitialChordPro(initialValues) {
  return normalizeChordProLyrics(initialValues.cifra_chordpro
    || initialValues.chordpro
    || initialValues.conteudo_chordpro
    || convertToChordPro(initialValues.cifra_original || ''));
}

function getInitialOriginalText(initialValues, initialChordPro) {
  if (initialChordPro) {
    return renderChordProForDisplay(initialChordPro);
  }

  return renderChordProForDisplay(convertToChordPro(initialValues.cifra_original || ''));
}

function updatePreview(form, previewPanel, editorState = null) {
  const musica = getPreviewMusica(form, editorState);
  const performanceView = previewPanel.querySelector('.repertorio-performance-view');

  if (performanceView) {
    performanceView.updatePerformanceMusica?.(musica);
    return;
  }

  previewPanel.replaceChildren(createPerformanceView({
    musica,
    returnTo: '#',
    initiallyExpandedToolbar: true,
  }));
}

function getPreviewMusica(form, editorState = null) {
  const values = getFormValues(form, editorState);
  const renderedCifra = renderChordProForDisplay(values.cifra_chordpro, {
    keepVoiceDirectives: true,
  })
    || 'A conversao ChordPro aparecera aqui.';

  return {
    ...values,
    titulo: values.titulo || 'Musica sem titulo',
    cifra_exibicao: renderedCifra,
  };
}

function formatTransposeStatus(semitones) {
  if (semitones === 0) return 'Tom';

  return `${semitones > 0 ? '+' : ''}${semitones}`;
}

function setChordProValue(source, editor, value, editorState = null) {
  source.value = value;
  renderChordProEditor(editor, value, editorState);
}

function renderChordProEditor(editor, value, editorState = null) {
  const normalizedState = normalizeCifraEditorState(editorState || {});

  if (normalizedState.text && normalizedState.voiceMarks.length) {
    editor.innerHTML = renderChordProEditorHtmlFromCifraEditorState(normalizedState);
    return;
  }

  editor.innerHTML = escapeHtml(value || '')
    .replace(/\[([^\]]+)\]/g, (match, chord) => (
      isChordToken(chord) ? `<span class="chord-token">${match}</span>` : match
    ));
}

function getEditableText(element) {
  return String(element.innerText || '')
    .replace(/\n\n$/g, '\n')
    .replace(/\u00a0/g, ' ');
}

function isChordToken(value) {
  return /^[A-G](?:#|b)?/.test(String(value || ''));
}

function updateLinkAction(input, action) {
  const value = String(input.value || '').trim();
  const isValidLink = /^https?:\/\//i.test(value);

  action.hidden = !isValidLink;
  action.href = isValidLink ? value : '#';
}

function formatTagsInput(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value || '');
}

const VOICE_MARKERS = [
  { id: 'voz_principal', label: 'Voz principal', className: 'voice-marker-primary' },
  { id: 'segunda_voz', label: 'Segunda voz', className: 'voice-marker-secondary' },
  { id: 'terca_voz', label: 'Terceira voz', className: 'voice-marker-tertiary' },
  { id: 'todos', label: 'Todos', className: 'voice-marker-all' },
  { id: 'solo', label: 'Solo', className: 'voice-marker-solo' },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
