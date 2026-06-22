import { createPerformanceView } from '../../musicas/pages/MusicaExecucaoPage.js';
import { createPerformanceViewV2 } from '../../repertorios/pages/RepertorioExecucaoPage.js';
import { getOfflineLibrary, isOfflineMode, syncOfflineLibrary } from '../../../services/offlineLibraryService.js';

export async function ModoOfflinePage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page offline-page';
  const userId = session?.user?.id;
  let snapshot = await getOfflineLibrary(userId);

  page.innerHTML = `
    <header class="offline-hero">
      <div><span class="offline-kicker">Biblioteca local</span><h1>Modo Offline</h1><p>Baixe o acervo para pesquisar e executar musicas e repertorios mesmo sem internet.</p></div>
      <span class="offline-status ${isOfflineMode() ? 'is-offline' : 'is-online'}" data-role="connection-status"></span>
    </header>
    <section class="offline-panel">
      <div class="offline-summary" data-role="summary"></div>
      <div class="offline-actions"><button class="button" type="button" data-action="sync" ${isOfflineMode() ? 'disabled' : ''}>${snapshot ? 'Atualizar conteudo offline' : 'Disponibilizar offline'}</button><span data-role="message" aria-live="polite"></span></div>
    </section>
    <section class="offline-library" data-role="library" hidden>
      <div class="offline-search"><label>Buscar no acervo salvo<input type="search" data-role="search" placeholder="Musica, artista, repertorio ou tema"></label></div>
      <div class="offline-results" data-role="results"></div>
    </section>
    <section class="offline-execution" data-role="execution"></section>
  `;

  const status = page.querySelector('[data-role="connection-status"]');
  const summary = page.querySelector('[data-role="summary"]');
  const message = page.querySelector('[data-role="message"]');
  const library = page.querySelector('[data-role="library"]');
  const results = page.querySelector('[data-role="results"]');
  const execution = page.querySelector('[data-role="execution"]');
  const syncButton = page.querySelector('[data-action="sync"]');

  const updateConnection = () => {
    const offline = isOfflineMode();
    status.className = `offline-status ${offline ? 'is-offline' : 'is-online'}`;
    status.textContent = offline ? 'Modo offline ativo' : 'Conectado';
    syncButton.disabled = offline;
  };
  const render = () => {
    if (!snapshot) {
      summary.innerHTML = '<strong>Nenhum conteudo preparado neste dispositivo.</strong><span>Conecte-se e escolha “Disponibilizar offline” para baixar somente musicas e repertorios de leitura.</span>';
      library.hidden = true;
      return;
    }
    const time = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(snapshot.syncedAt));
    summary.innerHTML = `<strong>${snapshot.musicas.length} musicas e ${snapshot.repertorios.length} repertorios prontos para uso.</strong><span>Ultima sincronizacao: ${time}</span>`;
    library.hidden = false;
    renderResults(page.querySelector('[data-role="search"]').value);
  };
  const renderResults = (query = '') => {
    const term = normalize(query);
    const musicas = snapshot.musicas.filter((item) => normalize(`${item.titulo || item.nome || ''} ${item.artista || ''} ${item.tags || ''}`).includes(term));
    const repertorios = snapshot.repertorios.filter((item) => normalize(`${item.nome || item.titulo || ''} ${item.data || ''}`).includes(term));
    results.innerHTML = `${createResultGroup('Musicas', musicas, 'musica')}${createResultGroup('Repertorios', repertorios, 'repertorio')}`;
    results.querySelectorAll('[data-offline-item]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.offlineItem;
      const id = button.dataset.id;
      execution.replaceChildren();
      if (type === 'musica') execution.append(createPerformanceView({ musica: snapshot.musicas.find((item) => item.id === id), returnTo: '/modo-offline', initiallyExpandedToolbar: true }));
      if (type === 'repertorio') execution.append(createPerformanceViewV2({ repertorio: snapshot.repertorios.find((item) => item.id === id), musicasAssociadas: snapshot.associacoes[id] || [], returnTo: '/modo-offline' }));
      execution.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  };
  page.querySelector('[data-role="search"]').addEventListener('input', (event) => renderResults(event.target.value));
  syncButton.addEventListener('click', async () => {
    syncButton.disabled = true;
    message.textContent = 'Sincronizando biblioteca local...';
    try { snapshot = await syncOfflineLibrary(userId); message.textContent = 'Conteudo offline atualizado.'; render(); } catch (error) { message.textContent = error.message || 'Nao foi possivel preparar o modo offline.'; } finally { updateConnection(); }
  });
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  updateConnection();
  render();
  return page;
}

function createResultGroup(title, items, type) {
  return `<section><h2>${title}</h2>${items.length ? `<div class="offline-result-list">${items.map((item) => `<button type="button" data-offline-item="${type}" data-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.titulo || item.nome || '')}</strong><span>${escapeHtml(type === 'musica' ? (item.artista || 'Sem artista') : (item.data || 'Sem data'))}</span></button>`).join('')}</div>` : '<p>Nenhum resultado.</p>'}</section>`;
}
function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
