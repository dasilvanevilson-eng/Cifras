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

    <label>
      Tipo
      <select name="tipo">
        ${createTipoOptions(initialValues.tipo || '')}
      </select>
    </label>

    <label>
      Horario
      <input name="horario" type="time" value="${escapeHtml(formatTimeValue(initialValues.horario || ''))}">
    </label>

    <label>
      Local
      <input name="local" type="text" value="${escapeHtml(initialValues.local || '')}">
    </label>

    <label>
      Responsavel
      <input name="responsavel" type="text" value="${escapeHtml(initialValues.responsavel || '')}">
    </label>

    <label>
      Observacoes
      <textarea name="observacoes" rows="4">${escapeHtml(initialValues.observacoes || '')}</textarea>
    </label>

    <button class="button" type="submit">${options.submitLabel || 'Salvar repertorio'}</button>
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
        nome: String(formData.get('nome') || '').trim(),
        data: String(formData.get('data') || '') || null,
        tipo: String(formData.get('tipo') || '').trim() || null,
        horario: String(formData.get('horario') || '') || null,
        local: String(formData.get('local') || '').trim() || null,
        responsavel: String(formData.get('responsavel') || '').trim() || null,
        observacoes: String(formData.get('observacoes') || '').trim() || null,
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

function createTipoOptions(currentValue) {
  const options = [
    ['', 'Selecione'],
    ['culto', 'Culto'],
    ['ensaio', 'Ensaio'],
    ['celula', 'Celula'],
    ['conferencia', 'Conferencia'],
    ['outro', 'Outro'],
  ];

  return options.map(([value, label]) => {
    const selected = value === currentValue ? ' selected' : '';
    return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
  }).join('');
}

function formatTimeValue(value) {
  return String(value || '').slice(0, 5);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
