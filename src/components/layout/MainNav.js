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
    linksArea.innerHTML = `
      <a href="/dashboard">Painel</a>
      <a href="/musicas">Musicas Cifradas</a>
      <a href="/musicas-letras">Musicas Letras</a>
      <a href="/repertorios">Repertorios</a>
    `;

    const email = document.createElement('span');
    email.className = 'user-email';
    email.textContent = options.user.email;

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

    userArea.append(email, role, logoutButton);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.textContent = 'Login';
    userArea.append(loginLink);
  }

  return nav;
}
