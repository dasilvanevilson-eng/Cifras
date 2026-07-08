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
import { LinksImagemPage } from '../features/public/pages/LinksImagemPage.js';
import { PublicDashboardPage } from '../features/public/pages/PublicDashboardPage.js';
import { PublicBandaCoralPage } from '../features/public/pages/PublicBandaCoralPage.js';
import { PublicLetrasRepertorioPage } from '../features/public/pages/PublicLetrasRepertorioPage.js';
import { PublicMusicaExecucaoPage } from '../features/public/pages/PublicMusicaExecucaoPage.js';
import { PublicRepertorioExecucaoPage } from '../features/public/pages/PublicRepertorioExecucaoPage.js';
import { PublicImageLinkPage } from '../features/public/pages/PublicImageLinkPage.js';
import { AccessDeniedPage } from '../features/system/pages/AccessDeniedPage.js';
import { ModoOfflinePage } from '../features/offline/pages/ModoOfflinePage.js';
import { AgendaPage } from '../features/agenda/pages/AgendaPage.js';
import { NotFoundPage } from '../features/system/pages/NotFoundPage.js';
import { canManageUsers } from '../features/auth/roles.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.js';
import { BandaCoralPage } from '../features/bandaCoral/pages/BandaCoralPage.js';
import { DicionarioAcordesPage } from '../features/acordes/pages/DicionarioAcordesPage.js';
import { AfinadorPage } from '../features/afinador/pages/AfinadorPage.js';
import { canViewModule, getFirstVisibleMenuRoute } from '../features/auth/permissions.js';
import { installPageInfoDialogs } from '../utils/pageInfoDialog.js';
import { installSearchClearButtons } from '../utils/searchClearButtons.js';

const routes = {
  '/dashboard': DashboardPage,
  '/modo-offline': ModoOfflinePage,
  '/agenda': AgendaPage,
  '/banda-coral': BandaCoralPage,
  '/acordes': DicionarioAcordesPage,
  '/afinador': AfinadorPage,
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
  '/links-imagem': LinksImagemPage,
  '/publico': PublicDashboardPage,
  '/publico/banda-coral': PublicBandaCoralPage,
  '/publico/letras': PublicLetrasRepertorioPage,
  '/publico/musicas/execucao': PublicMusicaExecucaoPage,
  '/publico/repertorios/execucao': PublicRepertorioExecucaoPage,
  '/imagem': PublicImageLinkPage,
};

const publicRoutes = new Set([
  '/login',
  '/alterar-senha',
  '/publico',
  '/publico/banda-coral',
  '/publico/letras',
  '/publico/musicas/execucao',
  '/publico/repertorios/execucao',
  '/imagem',
]);

const protectedRoutes = {
  '/usuarios': (session) => canManageUsers(session.profile?.papel),
  '/permissoes': (session) => canManageUsers(session.profile?.papel),
  '/personalizacao': (session) => canManageUsers(session.profile?.papel),
  '/convites-publicos': (session) => canViewModule(session, 'convites_publicos'),
  '/links-imagem': (session) => canManageUsers(session.profile?.papel),
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

      if (canAccessRoute && !canAccessRoute(session)) {
        return AccessDeniedPage({ session });
      }

      if (window.location.pathname === '/modo-offline' && !canViewModule(session, 'modo_offline')) {
        return AccessDeniedPage({ session });
      }
      if (window.location.pathname === '/agenda' && !canViewModule(session, 'agenda')) {
        return AccessDeniedPage({ session });
      }

      const page = await Page({ session });
      installPageInfoDialogs(page);
      installSearchClearButtons(page);
      return page;
    },
  };
}
