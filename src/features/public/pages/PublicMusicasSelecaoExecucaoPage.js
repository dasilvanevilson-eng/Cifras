import { createSelectionPerformanceView } from '../../musicas/pages/MusicasSelecaoExecucaoPage.js';
import { getPublicMusicaData } from '../../../services/publicInvitesService.js';

export async function PublicMusicasSelecaoExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page public-access-page';
  page.innerHTML = '<div class="page-status">Carregando selecao...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const ids = String(params.get('ids') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const initialMusicaId = params.get('musicaId') || '';
  const returnTo = params.get('returnTo') || `/publico?token=${encodeURIComponent(token)}`;

  if (!token || ids.length < 2) {
    status.className = 'page-status error';
    status.textContent = 'Selecione pelo menos duas musicas para executar a selecao.';
    return page;
  }

  try {
    const results = await Promise.all(ids.map((id) => getPublicMusicaData(token, id)));
    const error = results.find((result) => result.error)?.error;
    if (error) throw error;

    const musicas = results.map((result) => result.data).filter(Boolean);
    if (musicas.length < 2) {
      throw new Error('Nao foi possivel encontrar as musicas selecionadas.');
    }

    page.replaceChildren(createSelectionPerformanceView({ musicas, returnTo, initialMusicaId }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a selecao.';
  }

  return page;
}
