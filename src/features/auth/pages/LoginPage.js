import { signInWithPassword } from '../../../services/authService.js';

export function LoginPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Login</h1>
    <form class="form login-form">
      <label>
        E-mail
        <input name="email" type="email" autocomplete="email" required>
      </label>

      <label>
        Senha
        <input name="password" type="password" autocomplete="current-password" required>
      </label>

      <button class="button" type="submit">Entrar</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `;

  const form = page.querySelector('.login-form');
  const message = page.querySelector('.form-message');
  const button = page.querySelector('button');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Entrando...';

    try {
      const { error } = await signInWithPassword(email, password);

      if (error) {
        throw error;
      }

      message.className = 'form-message success';
      message.textContent = 'Login realizado com sucesso.';
      window.location.href = '/dashboard';
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel fazer login.';
    } finally {
      button.disabled = false;
    }
  });

  return page;
}
