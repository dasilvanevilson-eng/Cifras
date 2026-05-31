import { MainNav } from './MainNav.js';

export function AppLayout(content, options = {}) {
  const container = document.createElement('div');
  container.className = 'app-layout';
  container.append(MainNav(options), content);
  return container;
}
