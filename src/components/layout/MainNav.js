import { canViewModule } from '../../features/auth/permissions.js';

export function MainNav(options = {}) {
  document.body.classList.remove('has-touch-nav');

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
  const links = getVisibleLinks(options);

  if (options.user) {
    linksArea.innerHTML = createFlatNavLinks(links);
    nav.insertAdjacentHTML('beforeend', createMobileQuickNav(links));

    drawerUser.textContent = getFirstName(options.profile?.nome) || options.user.email;

    const logoutButton = document.createElement('button');
    logoutButton.className = 'nav-button main-menu-logout';
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

  openButton.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  drawer.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  openButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('pointerdown', (event) => {
    if (drawer.hidden) return;
    if (drawer.contains(event.target) || openButton.contains(event.target)) return;

    closeMenu();
  });
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

function getVisibleLinks(options = {}) {
  if (!options.user) return [];

  const hasPendingSuggestions = Number(options.pendingSuggestionsCount || 0) > 0;
  const links = [
    { href: '/dashboard', label: 'Painel', group: 'Uso', moduleKey: 'dashboard', match: ['/dashboard'] },
    { href: '/modo-offline', label: 'Modo Offline', group: 'Uso', moduleKey: 'modo_offline', match: ['/modo-offline'] },
    { href: '/agenda', label: 'Agenda', group: 'Uso', moduleKey: 'agenda', match: ['/agenda'] },
    { href: '/repertorios', label: 'Repertorios', group: 'Uso', moduleKey: 'repertorios', match: ['/repertorios', '/repertorios/detalhe', '/repertorios/editar', '/repertorios/execucao'] },
    { href: '/musicas', label: 'Cifras', group: 'Acervo', moduleKey: 'musicas', match: ['/musicas', '/musicas/detalhe', '/musicas/editar', '/musicas/execucao', '/musicas/selecao-execucao'] },
    { href: '/afinador', label: 'Afinador', group: 'Acervo', moduleKey: 'afinador', match: ['/afinador'] },
    {
      href: '/repertorios-pdf',
      label: 'Repertorio Listar',
      group: 'Acervo',
      moduleKey: 'pdf_repertorio',
      match: ['/repertorios-pdf', '/repertorios-pdf/gerar', '/repertorios-interativo', '/musicas-letras', '/musicas-letras/detalhe'],
    },
    { href: '/sugestoes', label: 'Sugestao', group: 'Acervo', moduleKey: 'sugestoes', match: ['/sugestoes', '/sugestoes/enviar'], className: hasPendingSuggestions ? 'has-pending' : '' },
    { href: '/minha-conta', label: 'Minha conta', group: 'Conta', moduleKey: 'minha_conta', match: ['/minha-conta'] },
    { href: '/usuarios', label: 'Usuarios', group: 'Administracao', moduleKey: 'usuarios', match: ['/usuarios'] },
    { href: '/permissoes', label: 'Permissoes', group: 'Administracao', moduleKey: 'permissoes', match: ['/permissoes'] },
    { href: '/personalizacao', label: 'Personalizacao', group: 'Administracao', moduleKey: 'personalizacao', match: ['/personalizacao'] },
    { href: '/convites-publicos', label: 'Convites publicos', group: 'Administracao', moduleKey: 'convites_publicos', match: ['/convites-publicos'] },
  ];

  return links
    .filter((link) => canViewModule({ profile: options.profile, permissions: options.permissions }, link.moduleKey))
    .sort((first, second) => first.label.localeCompare(second.label, 'pt-BR', { sensitivity: 'base' }));
}

function createNavLink(link) {
  const classes = [
    link.className || '',
    isActiveNavLink(link.match) ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  return `<a${classes ? ` class="${classes}"` : ''} href="${link.href}">${link.label}</a>`;
}

function createFlatNavLinks(links) {
  return links.map(createNavLink).join('');
}

function createMobileQuickNav(links) {
  const quickLinks = [
    { href: '/dashboard', label: 'Painel' },
    { href: '/repertorios', label: 'Repertorios' },
    { href: '/musicas', label: 'Cifras' },
  ]
    .map((item) => links.find((link) => link.href === item.href) || null)
    .filter(Boolean);

  if (!quickLinks.length) return '';

  return `
    <div class="mobile-quick-nav" aria-label="Navegacao rapida">
      ${quickLinks.map((link) => `<a class="${isActiveNavLink(link.match) ? 'is-active' : ''}" href="${link.href}">${link.label}</a>`).join('')}
    </div>
  `;
}

function isActiveNavLink(paths = []) {
  return paths.includes(window.location.pathname);
}

function getFirstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}
