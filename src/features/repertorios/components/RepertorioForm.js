import { RepertorioPrivacyFields, getRepertorioPrivacyValues } from './RepertorioPrivacyFields.js';

export function RepertorioForm(options = {}) {
  const form = document.createElement('form');
  const initialValues = options.initialValues || {};
  form.className = 'form';
  form.innerHTML = `
    <label>
      Nome
      <input name="nome" type="text" required value="${escapeHtml(initialValues.nome || '')}">
    </label>

    <label>
      Data
      <input name="data" type="date" value="${escapeHtml(initialValues.data || '')}">
    </label>

    <button class="button" type="submit">${options.submitLabel || 'Salvar repertorio'}</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  if (options.showPrivacyFields !== false) {
    form.querySelector('button').before(RepertorioPrivacyFields({
      users: options.users || [],
      initialValues,
    }));
  }

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
      const privacyValues = getRepertorioPrivacyValues(form);
      if (privacyValues.repertorio.visibilidade === 'seletivo' && !privacyValues.compartilhadoCom.length) {
        throw new Error('Selecione pelo menos um usuario para o compartilhamento seletivo.');
      }

      await options.onSubmit({
        nome: String(formData.get('nome') || '').trim(),
        data: String(formData.get('data') || '') || null,
        ...privacyValues.repertorio,
        compartilhadoCom: privacyValues.compartilhadoCom,
      });

      if (!options.keepValuesAfterSubmit) {
        form.reset();
      }
      message.className = 'form-message success';
      message.textContent = 'Repertorio salvo com sucesso.';
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel salvar o repertorio.';
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
