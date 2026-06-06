import { createPerformanceViewV2 } from '../../repertorios/pages/RepertorioExecucaoPage.js';
import { getPublicRepertorioExecutionData } from '../../../services/publicInvitesService.js';

export async function PublicRepertorioExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page public-access-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const id = params.get('id');
  const musicaId = params.get('musicaId');

  if (!token || !id) {
    status.className = 'page-status error';
    status.textContent = 'Convite ou repertorio nao informado.';
    return page;
  }

  try {
    const { data, error } = await getPublicRepertorioExecutionData(token, id);

    if (error) throw error;

    page.replaceChildren(createPerformanceViewV2({
      repertorio: data.repertorio,
      musicasAssociadas: normalizeOrder(data.musicas || []),
      returnTo: `/publico?token=${encodeURIComponent(token)}`,
      initialMusicaId: musicaId,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}
