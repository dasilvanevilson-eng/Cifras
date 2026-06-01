import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.js';
import { MusicaDetalhePage } from '../features/musicas/pages/MusicaDetalhePage.js';
import { MusicaEditarPage } from '../features/musicas/pages/MusicaEditarPage.js';
import { MusicaExecucaoPage } from '../features/musicas/pages/MusicaExecucaoPage.js';
import { MusicaLetraDetalhePage } from '../features/musicas/pages/MusicaLetraDetalhePage.js';
import { MusicasPage } from '../features/musicas/pages/MusicasPage.js';
import { MusicasLetrasPage } from '../features/musicas/pages/MusicasLetrasPage.js';
import { RepertorioDetalhePage } from '../features/repertorios/pages/RepertorioDetalhePage.js';
import { RepertorioEditarPage } from '../features/repertorios/pages/RepertorioEditarPage.js';
import { RepertorioExecucaoPage } from '../features/repertorios/pages/RepertorioExecucaoPage.js';
import { RepertoriosPage } from '../features/repertorios/pages/RepertoriosPage.js';

const routes = {
  '/login': LoginPage,
  '/dashboard': DashboardPage,
  '/musicas': MusicasPage,
  '/musicas/detalhe': MusicaDetalhePage,
  '/musicas/editar': MusicaEditarPage,
  '/musicas/execucao': MusicaExecucaoPage,
  '/musicas-letras': MusicasLetrasPage,
  '/musicas-letras/detalhe': MusicaLetraDetalhePage,
  '/repertorios': RepertoriosPage,
  '/repertorios/detalhe': RepertorioDetalhePage,
  '/repertorios/editar': RepertorioEditarPage,
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
        window.history.replaceState(null, '', '/dashboard');
      }

      const Page = routes[window.location.pathname] || DashboardPage;
      return Page({ session });
    },
  };
}
