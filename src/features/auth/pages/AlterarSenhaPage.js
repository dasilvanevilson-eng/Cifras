import { updatePassword } from '../../../services/authService.js';
import { validatePassword } from '../../../utils/password.js';

export function AlterarSenhaPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Alterar senha</h1>
    ${session?.user ? '' : '<p class="page-status">Abra esta pagina pelo link enviado para o seu e-mail.</p>'}
    <form class="form password-form">
      <label>
        Nova senha
        <input name="password" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <label>
        Confirmar nova senha
        <input name="password_confirm" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <button class="button" type="submit">Salvar nova senha</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `;

  setupPasswordForm(page.querySelector('.password-form'), {
    successMessage: 'Senha alterada com sucesso.',
    redirectAfterSuccess: '/dashboard',
  });

  return page;
}

export function setupPasswordForm(form, options = {}) {
  const button = form.querySelector('button[type="submit"]');
  const message = form.querySelector('.form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const password = String(formData.get('password') || '');
    const passwordConfirm = String(formData.get('password_confirm') || '');

    const passwordError = validatePassword(password);

    if (passwordError) {
      message.className = 'form-message error';
      message.textContent = passwordError;
      return;
    }

    if (password !== passwordConfirm) {
      message.className = 'form-message error';
      message.textContent = 'As senhas informadas nao conferem.';
      return;
    }

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Salvando...';

    try {
      const { error } = await updatePassword(password);

      if (error) {
        throw error;
      }

      form.reset();
      message.className = 'form-message success';
      message.textContent = options.successMessage || 'Senha alterada com sucesso.';

      if (options.redirectAfterSuccess) {
        window.setTimeout(() => {
          window.location.href = options.redirectAfterSuccess;
        }, 900);
      }
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel alterar a senha.';
    } finally {
      button.disabled = false;
    }
  });
}
