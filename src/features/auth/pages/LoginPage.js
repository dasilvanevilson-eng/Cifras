import { sendPasswordResetEmail, signInWithPassword } from '../../../services/authService.js';

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
      <button class="button-link secondary" type="button" data-action="forgot-password">Esqueci minha senha</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `;

  const form = page.querySelector('.login-form');
  const message = page.querySelector('.form-message');
  const button = page.querySelector('button[type="submit"]');
  const forgotButton = page.querySelector('[data-action="forgot-password"]');

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

  forgotButton.addEventListener('click', async () => {
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();

    if (!email) {
      message.className = 'form-message error';
      message.textContent = 'Informe seu e-mail para receber o link de recuperacao.';
      return;
    }

    forgotButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Enviando link de recuperacao...';

    try {
      const { error } = await sendPasswordResetEmail(email);

      if (error) {
        throw error;
      }

      message.className = 'form-message success';
      message.textContent = 'Se o e-mail estiver cadastrado, voce recebera um link para alterar a senha.';
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel enviar o link de recuperacao.';
    } finally {
      forgotButton.disabled = false;
    }
  });

  return page;
}
