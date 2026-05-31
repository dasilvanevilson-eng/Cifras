export function MainNav(options = {}) {
  const nav = document.createElement('nav');
  nav.className = 'main-nav';
  nav.innerHTML = `
    <div class="main-nav-links">
      <a href="/musicas">Musicas</a>
      <a href="/repertorios">Repertorios</a>
    </div>
    <div class="main-nav-user"></div>
  `;

  const userArea = nav.querySelector('.main-nav-user');

  if (options.user) {
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
