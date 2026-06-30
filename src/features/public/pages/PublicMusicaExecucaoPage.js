import { createPerformanceView } from '../../musicas/pages/MusicaExecucaoPage.js';
import { getPublicDashboardData, getPublicMusicaData } from '../../../services/publicInvitesService.js';

export async function PublicMusicaExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page public-access-page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const id = params.get('id');

  if (!token || !id) {
    status.className = 'page-status error';
    status.textContent = 'Convite ou musica nao informado.';
    return page;
  }

  try {
    const [{ data: musica, error }, { data: dashboardData, error: dashboardError }] = await Promise.all([
      getPublicMusicaData(token, id),
      getPublicDashboardData(token),
    ]);

    if (error) throw error;
    if (dashboardError) throw dashboardError;

    page.replaceChildren(createPerformanceView({
      musica,
      musicasAcervo: dashboardData?.musicas || [],
      returnTo: `/publico?token=${encodeURIComponent(token)}`,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}
