import {
  convertToChordPro,
  normalizeChordProLyrics,
  renderCifraOriginalForDisplayHtml,
  renderChordProForDisplay,
  transposeCifraOriginal,
  transposeKey,
} from '../../../utils/chordpro.js';
import { createPerformanceView } from '../pages/MusicaExecucaoPage.js';

export function MusicaForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  const initialChordPro = getInitialChordPro(initialValues);
  const hideTitleField = Boolean(options.hideTitleField);
  const titleValue = initialValues.titulo || '';
  form.className = `form musica-form${hideTitleField ? ' is-title-unified' : ''}`;
  form.innerHTML = `
    ${hideTitleField ? `
      <input name="titulo" type="hidden" required value="${escapeHtml(titleValue)}">
      <p class="musica-current-title">${escapeHtml(titleValue ? `Titulo: ${titleValue}` : 'Digite um titulo no campo acima para iniciar.')}</p>
    ` : `
      <label>
        Titulo
        <input name="titulo" type="text" required value="${escapeHtml(titleValue)}">
      </label>
    `}

    <label>
      Artista
      <input name="artista" type="text" value="${escapeHtml(initialValues.artista || '')}">
    </label>

    <label class="field-tom">
      Tom
      <input name="tom" type="text" placeholder="Ex: C, D, Em" value="${escapeHtml(initialValues.tom || '')}">
    </label>

    <label class="field-tags">
      Tags
      <input name="tags" type="text" placeholder="Ex: adoracao, ceia, abertura" value="${escapeHtml(formatTagsInput(initialValues.tags || ''))}">
    </label>

    <label>
      Link
      <span class="field-with-action">
        <input name="musica_link" type="url" placeholder="https://..." value="${escapeHtml(initialValues.musica_link || '')}">
        <a class="field-action-link" href="#" target="_blank" rel="noreferrer" hidden>Abrir</a>
      </span>
    </label>

    <label class="field-collaborator">
      Colaborador
      <input name="colaborador_nome" type="text" value="${escapeHtml(initialValues.colaborador_nome || '')}">
    </label>

    <label class="field-reviewer">
      Revisor
      <input name="revisado_por_nome" type="text" value="${escapeHtml(initialValues.revisado_por_nome || '')}" readonly>
    </label>

    <div class="music-form-actions">
      <button class="button-link secondary preview-toggle" type="button">Pre-visualizacao</button>
      <button class="button-link secondary" type="button" data-action="clear">Limpar tela</button>
      <span class="inline-transpose-controls" aria-label="Transposicao de tom">
        <button class="nav-button" type="button" data-action="transpose-form-down" aria-label="Descer meio tom">-1/2</button>
        <span data-role="form-transpose-status">Tom</span>
        <button class="nav-button" type="button" data-action="transpose-form-up" aria-label="Subir meio tom">+1/2</button>
      </span>
      ${options.canDelete ? '<button class="danger-button" type="button" data-action="delete">Excluir</button>' : ''}
      <button class="button" type="submit">${options.submitLabel || 'Salvar musica'}</button>
    </div>

    <div class="voice-marker-toolbar" aria-label="Marcacoes de vozes">
      <span>Destacar selecao</span>
      ${VOICE_MARKERS.map((marker) => `
        <button class="voice-marker-button ${escapeHtml(marker.className)}" type="button" data-voice-marker="${escapeHtml(marker.id)}">
          ${escapeHtml(marker.label)}
        </button>
      `).join('')}
    </div>

    <div class="cifra-editor-grid">
      <label>
        Cifra original
        <textarea class="cifra-original-source" name="cifra_original" rows="14" required>${escapeHtml(getInitialOriginalText(initialValues, initialChordPro))}</textarea>
        <div class="cifra-original-editor" contenteditable="true" role="textbox" aria-label="Cifra original" spellcheck="false"></div>
      </label>

      <label>
        ChordPro interno
        <textarea class="chordpro-source" name="cifra_chordpro">${escapeHtml(initialChordPro)}</textarea>
        <div class="chordpro-editor" contenteditable="true" role="textbox" aria-label="ChordPro interno" spellcheck="false"></div>
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
  const chordProTextarea = form.querySelector('[name="cifra_chordpro"]');
  const chordProEditor = form.querySelector('.chordpro-editor');
  const tomInput = form.querySelector('[name="tom"]');
  const cifraEditorGrid = form.querySelector('.cifra-editor-grid');
  const linkInput = form.querySelector('[name="musica_link"]');
  const linkAction = form.querySelector('.field-action-link');
  const previewToggle = form.querySelector('.preview-toggle');
  const previewPanel = form.querySelector('.song-preview');
  const voiceMarkerButtons = form.querySelectorAll('[data-voice-marker]');
  const formTransposeState = {
    semitones: 0,
  };

  updateLinkAction(linkInput, linkAction);
  renderChordProEditor(chordProEditor, chordProTextarea.value);
  renderOriginalEditor(originalEditor, chordProTextarea.value);
  setupResponsiveCifraEditor(cifraEditorGrid);

  originalEditor.addEventListener('input', () => {
    originalTextarea.value = getEditableText(originalEditor);
    syncChordProFromOriginal({
      originalTextarea,
      originalEditor,
      chordProTextarea,
      chordProEditor,
      previewPanel,
      form,
    });
  });

  voiceMarkerButtons.forEach((voiceMarkerButton) => {
    voiceMarkerButton.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    voiceMarkerButton.addEventListener('click', () => {
      const markedOriginal = createVoiceMarkedTextFromSelection(
        originalEditor,
        originalTextarea,
        voiceMarkerButton.dataset.voiceMarker,
        chordProTextarea.value,
      );

      if (markedOriginal) {
        setChordProValue(chordProTextarea, chordProEditor, convertToChordPro(markedOriginal));
        originalTextarea.value = renderChordProForDisplay(chordProTextarea.value);
        renderOriginalEditor(originalEditor, chordProTextarea.value);

        if (!previewPanel.hidden) {
          updatePreview(form, previewPanel);
        }
      }

      originalEditor.focus();
    });
  });

  chordProEditor.addEventListener('focus', () => {
    chordProEditor.textContent = chordProTextarea.value;
  });

  chordProEditor.addEventListener('input', () => {
    chordProTextarea.value = getEditableText(chordProEditor);
    originalTextarea.value = renderChordProForDisplay(chordProTextarea.value);
    renderOriginalEditor(originalEditor, chordProTextarea.value);

    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel);
    }
  });

  chordProEditor.addEventListener('blur', () => {
    const normalizedChordPro = normalizeChordProLyrics(chordProTextarea.value);
    setChordProValue(chordProTextarea, chordProEditor, normalizedChordPro);
    originalTextarea.value = renderChordProForDisplay(normalizedChordPro);
    renderOriginalEditor(originalEditor, normalizedChordPro);
  });

  linkInput.addEventListener('input', () => {
    updateLinkAction(linkInput, linkAction);
  });

  clearButton.addEventListener('click', () => {
    if (options.onClear) {
      options.onClear();
      return;
    }

    clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState);
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
    transposeFormFields({
      semitones: -1,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      chordProEditor,
      tomInput,
      previewPanel,
      form,
    });
    updateFormTransposeStatus(formTransposeStatus, formTransposeState, -1);
  });

  transposeFormUpButton.addEventListener('click', () => {
    transposeFormFields({
      semitones: 1,
      originalTextarea,
      originalEditor,
      chordProTextarea,
      chordProEditor,
      tomInput,
      previewPanel,
      form,
    });
    updateFormTransposeStatus(formTransposeStatus, formTransposeState, 1);
  });

  previewToggle.addEventListener('click', () => {
    openPreview(form, previewPanel, previewToggle);
  });

  previewPanel.addEventListener('click', (event) => {
    const backAction = event.target.closest('.song-toolbar-back');
    if (!backAction) return;

    event.preventDefault();
    closePreview(form, previewPanel, previewToggle);
  });

  form.addEventListener('input', () => {
    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!options.onSubmit) return;

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    try {
      const values = getFormValues(form);
      if (!values.titulo) {
        throw new Error('Digite o titulo da cifra no campo de busca acima.');
      }

      await options.onSubmit(values);

      if (!options.keepValuesAfterSubmit) {
        clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState);
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
}) {
  const nextAutoChordPro = convertToChordPro(originalTextarea.value);
  setChordProValue(chordProTextarea, chordProEditor, nextAutoChordPro);
  renderOriginalEditor(originalEditor, nextAutoChordPro);

  if (!previewPanel.hidden) {
    updatePreview(form, previewPanel);
  }
}

function renderOriginalEditor(editor, chordProValue) {
  if (!editor) return;

  const displayValue = renderChordProForDisplay(chordProValue, {
    keepVoiceDirectives: true,
  });
  editor.innerHTML = renderCifraOriginalForDisplayHtml(displayValue, {
    includeVoiceLegend: false,
  });
}

function createVoiceMarkedTextFromSelection(editor, textarea, markerId, currentChordPro = '') {
  if (!editor || !textarea || !markerId) return '';

  const value = textarea.value || '';
  const selectionOffsets = getEditorSelectionOffsets(editor);
  const selectionStart = selectionOffsets.start;
  const selectionEnd = selectionOffsets.end;
  const effectiveSelectionEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
    ? selectionEnd - 1
    : selectionEnd;
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = value.indexOf('\n', effectiveSelectionEnd);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const selectedText = value.slice(lineStart, lineEnd);

  if (!selectedText.trim()) return '';

  const selectionStartLine = getLineIndexAt(value, lineStart);
  const selectionEndLine = selectionStartLine + selectedText.split('\n').length - 1;
  const existingMarkers = getVoiceMarkersByDisplayLine(currentChordPro);
  const wrappedText = createVoiceMarkedText(value, (lineIndex) => (
    lineIndex >= selectionStartLine && lineIndex <= selectionEndLine
      ? markerId
      : existingMarkers.get(lineIndex)
  ));

  return wrappedText;
}

function getEditorSelectionOffsets(editor) {
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

function createVoiceMarkedText(value, getMarkerForLine) {
  const output = [];
  let activeMarker = '';

  String(value || '').split('\n').forEach((line, lineIndex) => {
    const marker = getMarkerForLine(lineIndex) || '';

    if (activeMarker && marker !== activeMarker) {
      output.push('{/voice}');
      activeMarker = '';
    }

    if (marker && marker !== activeMarker) {
      output.push(`{voice: ${marker}}`);
      activeMarker = marker;
    }

    output.push(line);
  });

  if (activeMarker) {
    output.push('{/voice}');
  }

  return output.join('\n');
}

function getVoiceMarkersByDisplayLine(chordProValue) {
  const markers = new Map();
  const displayValue = renderChordProForDisplay(chordProValue, {
    keepVoiceDirectives: true,
  });
  let activeMarker = '';
  let displayLineIndex = 0;

  displayValue.split('\n').forEach((line) => {
    const openingMatch = String(line || '').trim().match(/^\{voice\s*:\s*([a-z0-9_-]+)\}$/i);

    if (openingMatch) {
      activeMarker = openingMatch[1].toLowerCase();
      return;
    }

    if (/^\{\/voice\}$/i.test(String(line || '').trim())) {
      activeMarker = '';
      return;
    }

    if (activeMarker) {
      markers.set(displayLineIndex, activeMarker);
    }

    displayLineIndex += 1;
  });

  return markers;
}

function getLineIndexAt(value, index) {
  return String(value || '').slice(0, index).split('\n').length - 1;
}

function clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle, formTransposeState = null) {
  form.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
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
  originalTextarea,
  originalEditor,
  chordProTextarea,
  chordProEditor,
  tomInput,
  previewPanel,
  form,
}) {
  originalTextarea.value = transposeCifraOriginal(originalTextarea.value, semitones);

  const currentTom = String(tomInput.value || '').trim();
  if (currentTom) {
    tomInput.value = transposeKey(currentTom, semitones);
  }

  setChordProValue(chordProTextarea, chordProEditor, convertToChordPro(originalTextarea.value));
  renderOriginalEditor(originalEditor, chordProTextarea.value);

  if (!previewPanel.hidden) {
    updatePreview(form, previewPanel);
  }
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

function openPreview(form, previewPanel, previewToggle) {
  previewPanel.hidden = false;
  form.classList.add('is-previewing');
  previewToggle.textContent = 'Pre-visualizacao';
  updatePreview(form, previewPanel);
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

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    titulo: String(formData.get('titulo') || '').trim(),
    artista: String(formData.get('artista') || '').trim(),
    tom: String(formData.get('tom') || '').trim(),
    tags: String(formData.get('tags') || '').trim() || null,
    musica_link: String(formData.get('musica_link') || '').trim() || null,
    colaborador_nome: String(formData.get('colaborador_nome') || '').trim() || null,
    revisado_por_nome: String(formData.get('revisado_por_nome') || '').trim() || null,
    cifra_original: renderChordProForDisplay(normalizeChordProLyrics(String(formData.get('cifra_chordpro') || '').trim())).trim(),
    cifra_chordpro: normalizeChordProLyrics(String(formData.get('cifra_chordpro') || '').trim()),
    cifra_exibicao: renderChordProForDisplay(normalizeChordProLyrics(String(formData.get('cifra_chordpro') || '').trim()), {
      keepVoiceDirectives: true,
    }),
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

function updatePreview(form, previewPanel) {
  const musica = getPreviewMusica(form);
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

function getPreviewMusica(form) {
  const values = getFormValues(form);
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

function setChordProValue(source, editor, value) {
  source.value = value;
  renderChordProEditor(editor, value);
}

function renderChordProEditor(editor, value) {
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
