export function RepertorioForm(options = {}) {
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>
      Nome
      <input name="nome" type="text" required>
    </label>

    <label>
      Data
      <input name="data" type="date">
    </label>

    <button class="button" type="submit">Salvar repertorio</button>
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
      });

      form.reset();
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
