import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { AlterarSenhaPage } from '../features/auth/pages/AlterarSenhaPage.js';
import { MinhaContaPage } from '../features/auth/pages/MinhaContaPage.js';
import { MusicaDetalhePage } from '../features/musicas/pages/MusicaDetalhePage.js';
import { MusicaEditarPage } from '../features/musicas/pages/MusicaEditarPage.js';
import { MusicaExecucaoPage } from '../features/musicas/pages/MusicaExecucaoPage.js';
import { MusicaLetraDetalhePage } from '../features/musicas/pages/MusicaLetraDetalhePage.js';
import { MusicasPage } from '../features/musicas/pages/MusicasPage.js';
import { MusicasLetrasPage } from '../features/musicas/pages/MusicasLetrasPage.js';
import { RepertorioDetalhePage } from '../features/repertorios/pages/RepertorioDetalhePage.js';
import { RepertorioEditarPage } from '../features/repertorios/pages/RepertorioEditarPage.js';
import { RepertorioExecucaoPage } from '../features/repertorios/pages/RepertorioExecucaoPage.js';
import { RepertorioPdfPage } from '../features/repertorios/pages/RepertorioPdfPage.js';
import { RepertoriosPage } from '../features/repertorios/pages/RepertoriosPage.js';
import { RepertoriosPdfPage } from '../features/repertorios/pages/RepertoriosPdfPage.js';
import { EnviarSugestaoPage } from '../features/sugestoes/pages/EnviarSugestaoPage.js';
import { SugestoesPage } from '../features/sugestoes/pages/SugestoesPage.js';
import { UsuariosPage } from '../features/usuarios/pages/UsuariosPage.js';
import { AccessDeniedPage } from '../features/system/pages/AccessDeniedPage.js';
import { NotFoundPage } from '../features/system/pages/NotFoundPage.js';
import { canManageUsers } from '../features/auth/roles.js';

const routes = {
  '/login': LoginPage,
  '/alterar-senha': AlterarSenhaPage,
  '/minha-conta': MinhaContaPage,
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
  '/repertorios-pdf': RepertoriosPdfPage,
  '/repertorios-pdf/gerar': RepertorioPdfPage,
  '/sugestoes/enviar': EnviarSugestaoPage,
  '/sugestoes': SugestoesPage,
  '/usuarios': UsuariosPage,
};

const publicRoutes = new Set(['/login', '/alterar-senha']);

const protectedRoutes = {
  '/usuarios': canManageUsers,
};

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

      if (session.user && path === '/dashboard') {
        window.history.replaceState(null, '', '/musicas');
      }

      const Page = routes[window.location.pathname];

      if (!Page) {
        return NotFoundPage({ session });
      }

      const canAccessRoute = protectedRoutes[window.location.pathname];

      if (canAccessRoute && !canAccessRoute(session.profile?.papel)) {
        return AccessDeniedPage({ session });
      }

      return Page({ session });
    },
  };
}
