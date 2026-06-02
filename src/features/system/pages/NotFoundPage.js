export function NotFoundPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <div class="page-status error">
      Pagina nao encontrada.
      <p><a href="/dashboard">Voltar para o painel</a></p>
    </div>
  `;

  return page;
}
