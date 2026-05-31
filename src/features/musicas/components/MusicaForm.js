export function MusicaForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  form.className = 'form';
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
      Cifra original
      <textarea name="cifra_original" rows="12" required>${escapeHtml(initialValues.cifra_original || '')}</textarea>
    </label>

    <button class="button" type="submit">${options.submitLabel || 'Salvar musica'}</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const message = form.querySelector('.form-message');
  const button = form.querySelector('button');

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
        cifra_original: String(formData.get('cifra_original') || '').trim(),
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
