import { createDashboardView } from '../../dashboard/pages/DashboardPage.js';
import {
  getPublicDashboardData,
  listPublicRepertorioMusicas,
} from '../../../services/publicInvitesService.js';

export async function PublicDashboardPage() {
  const page = document.createElement('section');
  page.className = 'page dashboard-page public-access-page';
  page.innerHTML = '<div class="page-status">Carregando convite publico...</div>';

  const status = page.querySelector('.page-status');
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    status.className = 'page-status error';
    status.textContent = 'Convite nao informado.';
    return page;
  }

  try {
    const { data, error } = await getPublicDashboardData(token);

    if (error) throw error;

    if (!data?.valid) {
      status.className = 'page-status error';
      status.textContent = 'Este convite expirou ou nao esta mais disponivel.';
      return page;
    }

    page.replaceChildren(createDashboardView({
      musicas: data.musicas || [],
      repertorios: data.repertorios || [],
      publicMode: true,
      publicToken: token,
      inviteTitle: data.invite?.title,
      listMusicasDoRepertorioFn: (repertorioId) => listPublicRepertorioMusicas(token, repertorioId),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o convite publico.';
  }

  return page;
}
