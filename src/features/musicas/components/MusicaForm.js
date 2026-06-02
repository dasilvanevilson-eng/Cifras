import { convertToChordPro, normalizeChordProLyrics, renderChordProForDisplay, renderCifraOriginalForDisplayHtml } from '../../../utils/chordpro.js';

export function MusicaForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  const initialChordPro = getInitialChordPro(initialValues);
  form.className = 'form musica-form';
  form.innerHTML = `
    <label>
      Titulo
      <input name="titulo" type="text" required value="${escapeHtml(initialValues.titulo || '')}">
    </label>

    <label>
      Artista
      <input name="artista" type="text" value="${escapeHtml(initialValues.artista || '')}">
    </label>

    <label>
      Tom
      <input name="tom" type="text" placeholder="Ex: C, D, Em" value="${escapeHtml(initialValues.tom || '')}">
    </label>

    <label>
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

    <div class="music-form-actions">
      <button class="button-link secondary preview-toggle" type="button">Pre-visualizacao</button>
      <button class="button-link secondary" type="button" data-action="clear">Limpar tela</button>
      ${options.canDelete ? '<button class="danger-button" type="button" data-action="delete">Excluir</button>' : ''}
      <button class="button" type="submit">${options.submitLabel || 'Salvar musica'}</button>
    </div>

    <div class="cifra-editor-grid">
      <label>
        Cifra original
        <textarea name="cifra_original" rows="14" required>${escapeHtml(initialValues.cifra_original || '')}</textarea>
      </label>

      <label>
        ChordPro interno
        <textarea class="chordpro-source" name="cifra_chordpro">${escapeHtml(initialChordPro)}</textarea>
        <div class="chordpro-editor" contenteditable="true" role="textbox" aria-label="ChordPro interno" spellcheck="false"></div>
      </label>
    </div>

    <section class="song-preview" hidden>
      <header class="song-header">
        <h2 data-preview="titulo"></h2>
        <p data-preview="meta"></p>
      </header>
      <pre class="chordpro-view" data-preview="cifra"></pre>
    </section>

    <p class="form-message" aria-live="polite"></p>
  `;

  const message = form.querySelector('.form-message');
  const button = form.querySelector('button[type="submit"]');
  const clearButton = form.querySelector('[data-action="clear"]');
  const deleteButton = form.querySelector('[data-action="delete"]');
  const originalTextarea = form.querySelector('[name="cifra_original"]');
  const chordProTextarea = form.querySelector('[name="cifra_chordpro"]');
  const chordProEditor = form.querySelector('.chordpro-editor');
  const cifraEditorGrid = form.querySelector('.cifra-editor-grid');
  const linkInput = form.querySelector('[name="musica_link"]');
  const linkAction = form.querySelector('.field-action-link');
  const previewToggle = form.querySelector('.preview-toggle');
  const previewPanel = form.querySelector('.song-preview');

  updateLinkAction(linkInput, linkAction);
  renderChordProEditor(chordProEditor, chordProTextarea.value);
  setupResponsiveCifraEditor(cifraEditorGrid);

  originalTextarea.addEventListener('input', () => {
    const nextAutoChordPro = convertToChordPro(originalTextarea.value);
    setChordProValue(chordProTextarea, chordProEditor, nextAutoChordPro);

    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel);
    }
  });

  chordProEditor.addEventListener('focus', () => {
    chordProEditor.textContent = chordProTextarea.value;
  });

  chordProEditor.addEventListener('input', () => {
    chordProTextarea.value = getEditableText(chordProEditor);
    originalTextarea.value = renderChordProForDisplay(chordProTextarea.value);

    if (!previewPanel.hidden) {
      updatePreview(form, previewPanel);
    }
  });

  chordProEditor.addEventListener('blur', () => {
    const normalizedChordPro = normalizeChordProLyrics(chordProTextarea.value);
    setChordProValue(chordProTextarea, chordProEditor, normalizedChordPro);
    originalTextarea.value = renderChordProForDisplay(normalizedChordPro);
  });

  linkInput.addEventListener('input', () => {
    updateLinkAction(linkInput, linkAction);
  });

  clearButton.addEventListener('click', () => {
    if (options.onClear) {
      options.onClear();
      return;
    }

    clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle);
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

  previewToggle.addEventListener('click', () => {
    const shouldShow = previewPanel.hidden;
    previewPanel.hidden = !shouldShow;
    previewToggle.textContent = shouldShow ? 'Ocultar pre-visualizacao' : 'Pre-visualizacao';

    if (shouldShow) {
      updatePreview(form, previewPanel);
    }
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
      await options.onSubmit(getFormValues(form));

      if (!options.keepValuesAfterSubmit) {
        clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle);
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

function clearForm(form, chordProTextarea, chordProEditor, previewPanel, previewToggle) {
  form.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
  setChordProValue(chordProTextarea, chordProEditor, '');
  previewPanel.hidden = true;
  previewToggle.textContent = 'Pre-visualizacao';
  updateLinkAction(form.querySelector('[name="musica_link"]'), form.querySelector('.field-action-link'));
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
    cifra_original: String(formData.get('cifra_original') || '').trim(),
    cifra_chordpro: normalizeChordProLyrics(String(formData.get('cifra_chordpro') || '').trim()),
    cifra_exibicao: renderChordProForDisplay(normalizeChordProLyrics(String(formData.get('cifra_chordpro') || '').trim())),
  };
}

function getInitialChordPro(initialValues) {
  return normalizeChordProLyrics(initialValues.cifra_chordpro
    || initialValues.chordpro
    || initialValues.conteudo_chordpro
    || convertToChordPro(initialValues.cifra_original || ''));
}

function updatePreview(form, previewPanel) {
  const values = getFormValues(form);
  const title = values.titulo || 'Musica sem titulo';
  const artist = values.artista || '-';
  const key = values.tom || '-';

  previewPanel.querySelector('[data-preview="titulo"]').textContent = title;
  previewPanel.querySelector('[data-preview="meta"]').textContent = `${artist} - Tom: ${key}`;
  const renderedCifra = renderChordProForDisplay(values.cifra_chordpro)
    || 'A conversao ChordPro aparecera aqui.';
  previewPanel.querySelector('[data-preview="cifra"]').innerHTML = renderCifraOriginalForDisplayHtml(renderedCifra);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
