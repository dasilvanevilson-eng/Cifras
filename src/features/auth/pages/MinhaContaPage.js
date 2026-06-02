import { setupPasswordForm } from './AlterarSenhaPage.js';

export function MinhaContaPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Minha conta</h1>
    <section class="account-summary">
      <p><strong>E-mail:</strong> ${escapeHtml(session?.user?.email || '-')}</p>
      <p><strong>Nome:</strong> ${escapeHtml(session?.profile?.nome || '-')}</p>
      <p><strong>Papel:</strong> ${escapeHtml(session?.profile?.papel || 'musico')}</p>
    </section>
    <h2>Alterar senha</h2>
    <form class="form password-form">
      <label>
        Nova senha
        <input name="password" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <label>
        Confirmar nova senha
        <input name="password_confirm" type="password" autocomplete="new-password" minlength="6" required>
      </label>
      <button class="button" type="submit">Alterar senha</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  `;

  setupPasswordForm(page.querySelector('.password-form'), {
    successMessage: 'Senha alterada com sucesso.',
  });

  return page;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
