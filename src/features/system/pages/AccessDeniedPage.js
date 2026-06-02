export function AccessDeniedPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <div class="page-status error">
      Seu perfil nao tem permissao para acessar esta pagina.
      <p><a href="/dashboard">Voltar para o painel</a></p>
    </div>
  `;

  return page;
}
