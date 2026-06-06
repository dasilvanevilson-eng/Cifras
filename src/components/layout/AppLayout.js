import { MainNav } from './MainNav.js';

export function AppLayout(content, options = {}) {
  const container = document.createElement('div');
  container.className = 'app-layout';

  if (!content.classList?.contains('login-page') && !content.classList?.contains('public-access-page')) {
    container.append(MainNav(options));
  }

  container.append(content);
  return container;
}
