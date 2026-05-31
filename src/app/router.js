import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { MusicaDetalhePage } from '../features/musicas/pages/MusicaDetalhePage.js';
import { MusicaEditarPage } from '../features/musicas/pages/MusicaEditarPage.js';
import { MusicasPage } from '../features/musicas/pages/MusicasPage.js';
import { RepertorioDetalhePage } from '../features/repertorios/pages/RepertorioDetalhePage.js';
import { RepertorioExecucaoPage } from '../features/repertorios/pages/RepertorioExecucaoPage.js';
import { RepertoriosPage } from '../features/repertorios/pages/RepertoriosPage.js';

const routes = {
  '/login': LoginPage,
  '/musicas': MusicasPage,
  '/musicas/detalhe': MusicaDetalhePage,
  '/musicas/editar': MusicaEditarPage,
  '/repertorios': RepertoriosPage,
  '/repertorios/detalhe': RepertorioDetalhePage,
  '/repertorios/execucao': RepertorioExecucaoPage,
};

const publicRoutes = new Set(['/login']);

export function createRouter() {
  return {
    async currentPage(session = {}) {
      const path = window.location.pathname;
      const isPublicRoute = publicRoutes.has(path);

      if (!session.user && !isPublicRoute) {
        window.history.replaceState(null, '', '/login');
        return LoginPage({ session });
      }

      if (session.user && path === '/login') {
        window.history.replaceState(null, '', '/musicas');
      }

      const Page = routes[window.location.pathname] || MusicasPage;
      return Page({ session });
    },
  };
}
