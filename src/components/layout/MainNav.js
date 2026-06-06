import { canViewModule } from '../../features/auth/permissions.js';

export function MainNav(options = {}) {
  const nav = document.createElement('nav');
  nav.className = 'main-nav';
  nav.innerHTML = `
    <a class="main-nav-brand" href="/">Master Cifras</a>
    <button class="main-menu-button" type="button" data-action="open-main-menu" aria-label="Abrir menu" aria-expanded="false">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
    <div class="main-menu-backdrop" data-role="main-menu-backdrop" hidden></div>
    <aside class="main-menu-drawer" data-role="main-menu-drawer" aria-label="Menu principal" hidden>
      <header class="main-menu-header">
        <div>
          <strong>Master Cifras</strong>
          <span data-role="drawer-user"></span>
        </div>
        <button class="main-menu-close" type="button" data-action="close-main-menu" aria-label="Fechar menu">&times;</button>
      </header>
      <div class="main-nav-links"></div>
    </aside>
  `;

  const linksArea = nav.querySelector('.main-nav-links');
  const openButton = nav.querySelector('[data-action="open-main-menu"]');
  const closeButton = nav.querySelector('[data-action="close-main-menu"]');
  const backdrop = nav.querySelector('[data-role="main-menu-backdrop"]');
  const drawer = nav.querySelector('[data-role="main-menu-drawer"]');
  const drawerUser = nav.querySelector('[data-role="drawer-user"]');

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
          { href: '/personalizacao', label: 'Personalizacao', moduleKey: 'personalizacao', match: ['/personalizacao'] },
        ]
        : []),
    ].filter((link) => canViewModule({ profile: options.profile, permissions: options.permissions }, link.moduleKey));

    linksArea.innerHTML = `
      ${links.map(createNavLink).join('')}
    `;

    drawerUser.textContent = getFirstName(options.profile?.nome) || options.user.email;

    const logoutButton = document.createElement('button');
    logoutButton.className = 'nav-button';
    logoutButton.type = 'button';
    logoutButton.textContent = 'Sair';

    if (options.onLogout) {
      logoutButton.addEventListener('click', options.onLogout);
    }

    linksArea.append(logoutButton);
  } else {
    const loginLink = document.createElement('a');
    loginLink.href = '/login';
    loginLink.textContent = 'Login';
    linksArea.append(loginLink);
  }

  function openMenu() {
    backdrop.hidden = false;
    drawer.hidden = false;
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('has-main-menu-open');
    window.requestAnimationFrame(() => {
      nav.classList.add('is-menu-open');
      drawer.querySelector('a, button')?.focus();
    });
  }

  function closeMenu() {
    nav.classList.remove('is-menu-open');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('has-main-menu-open');
    backdrop.hidden = true;
    drawer.hidden = true;
    openButton.focus();
  }

  openButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  linksArea.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
  nav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) {
      closeMenu();
    }
  });

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
