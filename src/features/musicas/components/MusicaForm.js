import { convertToChordPro } from '../../../utils/chordpro.js';

export function MusicaForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  const initialChordPro = initialValues.cifra_chordpro || convertToChordPro(initialValues.cifra_original || '');
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

    <div class="cifra-editor-grid">
      <label>
        Cifra original
        <textarea name="cifra_original" rows="14" required>${escapeHtml(initialValues.cifra_original || '')}</textarea>
      </label>

      <label>
        ChordPro interno
        <textarea name="cifra_chordpro" rows="14" required>${escapeHtml(initialChordPro)}</textarea>
      </label>
    </div>

    <button class="button" type="submit">${options.submitLabel || 'Salvar musica'}</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const message = form.querySelector('.form-message');
  const button = form.querySelector('button');
  const originalTextarea = form.querySelector('[name="cifra_original"]');
  const chordProTextarea = form.querySelector('[name="cifra_chordpro"]');
  const linkInput = form.querySelector('[name="musica_link"]');
  const linkAction = form.querySelector('.field-action-link');
  let chordProEditedManually = Boolean(initialValues.cifra_chordpro);

  updateLinkAction(linkInput, linkAction);

  originalTextarea.addEventListener('input', () => {
    if (chordProEditedManually) return;
    chordProTextarea.value = convertToChordPro(originalTextarea.value);
  });

  chordProTextarea.addEventListener('input', () => {
    chordProEditedManually = true;
  });

  linkInput.addEventListener('input', () => {
    updateLinkAction(linkInput, linkAction);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!options.onSubmit) return;

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    try {
      const formData = new FormData(form);
      await options.onSubmit({
        titulo: String(formData.get('titulo') || '').trim(),
        artista: String(formData.get('artista') || '').trim(),
        tom: String(formData.get('tom') || '').trim(),
        tags: String(formData.get('tags') || '').trim() || null,
        musica_link: String(formData.get('musica_link') || '').trim() || null,
        cifra_original: String(formData.get('cifra_original') || '').trim(),
        cifra_chordpro: String(formData.get('cifra_chordpro') || '').trim(),
      });

      if (!options.keepValuesAfterSubmit) {
        form.reset();
      }
      message.className = 'form-message success';
      message.textContent = 'Musica salva com sucesso.';
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel salvar a musica.';
    } finally {
      button.disabled = false;
    }
  });

  return form;
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
