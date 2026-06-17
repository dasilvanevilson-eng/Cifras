import { LoginPage } from '../features/auth/pages/LoginPage.js';
import { AlterarSenhaPage } from '../features/auth/pages/AlterarSenhaPage.js';
import { MinhaContaPage } from '../features/auth/pages/MinhaContaPage.js';
import { MusicaDetalhePage } from '../features/musicas/pages/MusicaDetalhePage.js';
import { MusicaEditarPage } from '../features/musicas/pages/MusicaEditarPage.js';
import { MusicaExecucaoPage } from '../features/musicas/pages/MusicaExecucaoPage.js';
import { MusicasSelecaoExecucaoPage } from '../features/musicas/pages/MusicasSelecaoExecucaoPage.js';
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
import { PermissoesPage } from '../features/usuarios/pages/PermissoesPage.js';
import { PersonalizacaoPage } from '../features/system/pages/PersonalizacaoPage.js';
import { ConvitesPublicosPage } from '../features/public/pages/ConvitesPublicosPage.js';
import { PublicDashboardPage } from '../features/public/pages/PublicDashboardPage.js';
import { PublicBandaCoralPage } from '../features/public/pages/PublicBandaCoralPage.js';
import { PublicLetrasRepertorioPage } from '../features/public/pages/PublicLetrasRepertorioPage.js';
import { PublicMusicaExecucaoPage } from '../features/public/pages/PublicMusicaExecucaoPage.js';
import { PublicRepertorioExecucaoPage } from '../features/public/pages/PublicRepertorioExecucaoPage.js';
import { AccessDeniedPage } from '../features/system/pages/AccessDeniedPage.js';
import { NotFoundPage } from '../features/system/pages/NotFoundPage.js';
import { canManageUsers } from '../features/auth/roles.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.js';
import { BandaCoralPage } from '../features/bandaCoral/pages/BandaCoralPage.js';
import { DicionarioAcordesPage } from '../features/acordes/pages/DicionarioAcordesPage.js';
import { getFirstVisibleMenuRoute } from '../features/auth/permissions.js';

const routes = {
  '/dashboard': DashboardPage,
  '/banda-coral': BandaCoralPage,
  '/acordes': DicionarioAcordesPage,
  '/login': LoginPage,
  '/alterar-senha': AlterarSenhaPage,
  '/minha-conta': MinhaContaPage,
  '/musicas': MusicasPage,
  '/musicas/detalhe': MusicaDetalhePage,
  '/musicas/editar': MusicaEditarPage,
  '/musicas/execucao': MusicaExecucaoPage,
  '/musicas/selecao-execucao': MusicasSelecaoExecucaoPage,
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
  '/permissoes': PermissoesPage,
  '/personalizacao': PersonalizacaoPage,
  '/convites-publicos': ConvitesPublicosPage,
  '/publico': PublicDashboardPage,
  '/publico/banda-coral': PublicBandaCoralPage,
  '/publico/letras': PublicLetrasRepertorioPage,
  '/publico/musicas/execucao': PublicMusicaExecucaoPage,
  '/publico/repertorios/execucao': PublicRepertorioExecucaoPage,
};

const publicRoutes = new Set([
  '/login',
  '/alterar-senha',
  '/publico',
  '/publico/banda-coral',
  '/publico/letras',
  '/publico/musicas/execucao',
  '/publico/repertorios/execucao',
]);

const protectedRoutes = {
  '/usuarios': canManageUsers,
  '/permissoes': canManageUsers,
  '/personalizacao': canManageUsers,
  '/convites-publicos': canManageUsers,
};

export function createRouter() {
  return {
    async currentPage(session = {}) {
      const path = window.location.pathname;
      const isPublicRoute = publicRoutes.has(path);

      if (!session.user && path === '/') {
        window.history.replaceState(null, '', '/login');
        return LoginPage({ session });
      }

      if (!session.user && !isPublicRoute) {
        window.history.replaceState(null, '', '/login');
        return LoginPage({ session });
      }

      if (session.user && (path === '/' || path === '/login')) {
        window.history.replaceState(null, '', getFirstVisibleMenuRoute(session));
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
