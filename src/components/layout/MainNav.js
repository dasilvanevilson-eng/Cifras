export function MainNav(options = {}) {
  const nav = document.createElement('nav');
  nav.className = 'main-nav';
  nav.innerHTML = `
    <div class="main-nav-links"></div>
    <div class="main-nav-user"></div>
  `;

  const linksArea = nav.querySelector('.main-nav-links');
  const userArea = nav.querySelector('.main-nav-user');

  if (options.user) {
    const hasPendingSuggestions = Number(options.pendingSuggestionsCount || 0) > 0;
    linksArea.innerHTML = `
      <a href="/dashboard">Painel</a>
      <a href="/musicas">Musicas Cifradas</a>
      <a href="/musicas-letras">Musicas Letras</a>
      <a href="/sugestoes/enviar">Enviar musica</a>
      ${['admin', 'editor'].includes(options.profile?.papel) ? `<a class="${hasPendingSuggestions ? 'has-pending' : ''}" href="/sugestoes">Sugestoes</a>` : ''}
      <a href="/repertorios">Repertorios</a>
      <a href="/minha-conta">Minha conta</a>
      ${options.profile?.papel === 'admin' ? '<a href="/usuarios">Usuarios</a>' : ''}
    `;

    const userName = document.createElement('span');
    userName.className = 'user-email';
    userName.textContent = options.profile?.nome || options.user.email;

    const role = document.createElement('span');
    role.className = 'user-role';
    role.textContent = options.profile?.papel || 'musico';

    const logoutButton = document.createElement('button');
    logoutButton.className = 'nav-button';
    logoutButton.type = 'button';
    logoutButton.textContent = 'Sair';

    if (options.onLogout) {
      logoutButton.addEventListener('click', options.onLogout);
    }

    userArea.append(userName, role, logoutButton);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.textContent = 'Login';
    userArea.append(loginLink);
  }

  return nav;
}
