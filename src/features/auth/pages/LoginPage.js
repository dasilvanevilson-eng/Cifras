import { sendPasswordResetEmail, signInWithPassword } from '../../../services/authService.js';

export function LoginPage() {
  const page = document.createElement('section');
  page.className = 'login-page';
  page.innerHTML = `
    <div class="login-hero" style="--login-background-image: url('/assets/login-background.jpg')" aria-label="Tela inicial do Master Cifras">
      <div class="login-entry-panel">
        <span class="login-app-name">Master Cifras</span>
        <button class="login-entry-button" type="button" data-action="open-login">Entrar</button>
      </div>
      <div class="login-modal-backdrop" data-role="login-modal" hidden>
        <div class="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <button class="login-modal-close" type="button" data-action="close-login" aria-label="Fechar login">&times;</button>
          <h1 id="login-title">Entrar</h1>
          <form class="form login-form">
            <label>
              E-mail
              <input name="email" type="email" autocomplete="email" required>
            </label>

            <label>
              Senha
              <input name="password" type="password" autocomplete="current-password" required>
            </label>

            <button class="button" type="submit">Acessar sistema</button>
            <button class="button-link secondary" type="button" data-action="forgot-password">Esqueci minha senha</button>
            <p class="form-message" aria-live="polite"></p>
          </form>
        </div>
      </div>
    </div>
  `;

  const form = page.querySelector('.login-form');
  const modal = page.querySelector('[data-role="login-modal"]');
  const openButton = page.querySelector('[data-action="open-login"]');
  const closeButton = page.querySelector('[data-action="close-login"]');
  const emailInput = page.querySelector('input[name="email"]');
  const message = page.querySelector('.form-message');
  const button = page.querySelector('button[type="submit"]');
  const forgotButton = page.querySelector('[data-action="forgot-password"]');

  function openLogin() {
    modal.hidden = false;
    window.requestAnimationFrame(() => {
      modal.classList.add('is-open');
      emailInput.focus();
    });
  }

  function closeLogin() {
    modal.classList.remove('is-open');
    modal.hidden = true;
    openButton.focus();
  }

  openButton.addEventListener('click', openLogin);
  closeButton.addEventListener('click', closeLogin);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeLogin();
    }
  });
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeLogin();
    }
  });

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
      window.location.href = '/';
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
