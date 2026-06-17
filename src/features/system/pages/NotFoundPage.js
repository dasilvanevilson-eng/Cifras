export function NotFoundPage() {
  const page = document.createElement('section');
  page.className = 'page system-state-page';
  page.innerHTML = `
    <section class="system-state-card">
      <span>404</span>
      <h1>Pagina nao encontrada</h1>
      <p>O caminho informado nao corresponde a uma tela disponivel.</p>
      <a class="button-link secondary" href="/dashboard">Voltar para o painel</a>
    </section>
  `;

  return page;
}
