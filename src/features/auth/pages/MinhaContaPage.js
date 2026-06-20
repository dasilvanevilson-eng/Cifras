import { setupPasswordForm } from './AlterarSenhaPage.js';

export function MinhaContaPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page account-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Minha conta</h1>
        <p data-page-info>Dados do acesso atual e troca de senha.</p>
      </div>
    </header>
    <div class="account-layout">
      <section class="account-summary">
        <h2>Perfil</h2>
        <p><strong>E-mail</strong><span>${escapeHtml(session?.user?.email || '-')}</span></p>
        <p><strong>Nome</strong><span>${escapeHtml(session?.profile?.nome || '-')}</span></p>
        <p><strong>Papel</strong><span>${escapeHtml(session?.profile?.papel || 'musico')}</span></p>
      </section>
      <section class="account-password-panel">
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
      </section>
    </div>
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
