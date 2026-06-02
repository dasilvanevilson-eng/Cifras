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
    const links = [
      { href: '/dashboard', label: 'Painel', match: ['/dashboard'] },
      { href: '/musicas', label: 'Musicas Cifradas', match: ['/musicas', '/musicas/detalhe', '/musicas/editar', '/musicas/execucao'] },
      { href: '/musicas-letras', label: 'Musicas Letras', match: ['/musicas-letras', '/musicas-letras/detalhe'] },
      { href: '/sugestoes/enviar', label: 'Enviar musica', match: ['/sugestoes/enviar'] },
      ...(['admin', 'editor'].includes(options.profile?.papel)
        ? [{ href: '/sugestoes', label: 'Sugestoes', match: ['/sugestoes'], className: hasPendingSuggestions ? 'has-pending' : '' }]
        : []),
      { href: '/repertorios', label: 'Repertorios', match: ['/repertorios', '/repertorios/detalhe', '/repertorios/editar', '/repertorios/execucao'] },
      { href: '/repertorios-pdf', label: 'PDF Repertorio', match: ['/repertorios-pdf', '/repertorios-pdf/gerar'] },
      { href: '/minha-conta', label: 'Minha conta', match: ['/minha-conta'] },
      ...(options.profile?.papel === 'admin'
        ? [{ href: '/usuarios', label: 'Usuarios', match: ['/usuarios'] }]
        : []),
    ];

    linksArea.innerHTML = `
      ${links.map(createNavLink).join('')}
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

function createNavLink(link) {
  const classes = [
    link.className || '',
    isActiveNavLink(link.match) ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  return `<a${classes ? ` class="${classes}"` : ''} href="${link.href}">${link.label}</a>`;
}

function isActiveNavLink(paths = []) {
  return paths.includes(window.location.pathname);
}
