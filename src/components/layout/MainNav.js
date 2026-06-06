import { canViewModule } from '../../features/auth/permissions.js';

export function MainNav(options = {}) {
  const nav = document.createElement('nav');
  nav.className = 'main-nav';
  nav.innerHTML = `
    <div class="main-nav-links"></div>
  `;

  const linksArea = nav.querySelector('.main-nav-links');

  if (options.user) {
    const hasPendingSuggestions = Number(options.pendingSuggestionsCount || 0) > 0;
    const links = [
      { href: '/dashboard', label: 'Painel', moduleKey: 'dashboard', match: ['/dashboard'] },
      { href: '/banda-coral', label: 'Modo Banda/Coral', moduleKey: 'banda_coral', match: ['/banda-coral'] },
      { href: '/musicas', label: 'Cifras', moduleKey: 'musicas', match: ['/musicas', '/musicas/detalhe', '/musicas/editar', '/musicas/execucao', '/musicas/selecao-execucao'] },
      { href: '/musicas-letras', label: 'Letras', moduleKey: 'letras', match: ['/musicas-letras', '/musicas-letras/detalhe'] },
      { href: '/repertorios', label: 'Repertorios', moduleKey: 'repertorios', match: ['/repertorios', '/repertorios/detalhe', '/repertorios/editar', '/repertorios/execucao'] },
      { href: '/repertorios-pdf', label: 'PDF Repertorio', moduleKey: 'pdf_repertorio', match: ['/repertorios-pdf', '/repertorios-pdf/gerar'] },
      { href: '/sugestoes', label: 'Sugestao', moduleKey: 'sugestoes', match: ['/sugestoes', '/sugestoes/enviar'], className: hasPendingSuggestions ? 'has-pending' : '' },
      { href: '/minha-conta', label: 'Minha conta', moduleKey: 'minha_conta', match: ['/minha-conta'] },
      ...(options.profile?.papel === 'admin'
        ? [
          { href: '/usuarios', label: 'Usuarios', moduleKey: 'usuarios', match: ['/usuarios'] },
          { href: '/permissoes', label: 'Permissoes', moduleKey: 'permissoes', match: ['/permissoes'] },
        ]
        : []),
    ].filter((link) => canViewModule({ profile: options.profile, permissions: options.permissions }, link.moduleKey));

    linksArea.innerHTML = `
      ${links.map(createNavLink).join('')}
    `;

    const userName = document.createElement('span');
    userName.className = 'user-email nav-user-name';
    userName.textContent = getFirstName(options.profile?.nome) || options.user.email;

    const logoutButton = document.createElement('button');
    logoutButton.className = 'nav-button';
    logoutButton.type = 'button';
    logoutButton.textContent = 'Sair';

    if (options.onLogout) {
      logoutButton.addEventListener('click', options.onLogout);
    }

    linksArea.append(userName, logoutButton);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.textContent = 'Login';
    linksArea.append(loginLink);
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

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}
