export function AccessDeniedPage() {
  const page = document.createElement('section');
  page.className = 'page system-state-page';
  page.innerHTML = `
    <section class="system-state-card">
      <span>403</span>
      <h1>Acesso restrito</h1>
      <p>Seu perfil nao tem permissao para acessar esta pagina.</p>
      <a class="button-link secondary" href="/dashboard">Voltar para o painel</a>
    </section>
  `;

  return page;
}
