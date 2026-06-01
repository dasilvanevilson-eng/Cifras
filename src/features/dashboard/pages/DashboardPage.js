import { listMusicas } from '../../../services/musicasService.js';
import { listRepertorios } from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

export async function DashboardPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page dashboard-page';
  page.innerHTML = '<div class="page-status">Carregando painel...</div>';

  const status = page.querySelector('.page-status');

  try {
    const [{ data: musicas, error: musicasError }, { data: repertorios, error: repertoriosError }] = await Promise.all([
      listMusicas(),
      listRepertorios(),
    ]);

    if (musicasError) throw musicasError;
    if (repertoriosError) throw repertoriosError;

    page.replaceChildren(createDashboardView({
      musicas: musicas || [],
      repertorios: repertorios || [],
      canEdit: canEditContent(session?.profile?.papel),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o painel.';
  }

  return page;
}

function createDashboardView({ musicas, repertorios, canEdit }) {
  const wrapper = document.createElement('section');
  const proximosRepertorios = getProximosRepertorios(repertorios).slice(0, 5);
  const musicasRecentes = getMusicasRecentes(musicas).slice(0, 5);

  wrapper.innerHTML = `
    <header class="dashboard-header">
      <h1>Painel</h1>
      <div class="dashboard-actions">
        ${canEdit ? '<a class="button-link" href="/musicas">Nova musica cifrada</a>' : ''}
        <a class="button-link secondary" href="/musicas-letras">Consultar letras</a>
        <a class="button-link secondary" href="/repertorios">Repertorios</a>
      </div>
    </header>
    <section class="summary-grid">
      ${createSummaryCard('Musicas cifradas', musicas.length)}
      ${createSummaryCard('Repertorios', repertorios.length)}
      ${createSummaryCard('Proximos repertorios', getProximosRepertorios(repertorios).length)}
    </section>
    <div class="dashboard-grid">
      <section>
        <h2>Repertorios proximos</h2>
        <div class="dashboard-list-slot" data-slot="repertorios"></div>
      </section>
      <section>
        <h2>Musicas recentes</h2>
        <div class="dashboard-list-slot" data-slot="musicas"></div>
      </section>
    </div>
  `;

  wrapper.querySelector('[data-slot="repertorios"]').append(createRepertoriosList(proximosRepertorios));
  wrapper.querySelector('[data-slot="musicas"]').append(createMusicasList(musicasRecentes));

  return wrapper;
}

function createSummaryCard(label, value) {
  return `
    <article class="summary-card">
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `;
}

function createRepertoriosList(repertorios) {
  if (!repertorios.length) {
    return createEmptyState('Nenhum repertorio futuro encontrado.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  repertorios.forEach((repertorio) => {
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(getField(repertorio, ['nome', 'titulo', 'name']))}</h3>
        <p>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</p>
      </div>
      <div class="dashboard-item-actions">
        <a href="/repertorios/detalhe?id=${encodeURIComponent(repertorio.id)}">Abrir</a>
        <a href="/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}">Executar</a>
      </div>
    `;
    list.append(item);
  });

  return list;
}

function createMusicasList(musicas) {
  if (!musicas.length) {
    return createEmptyState('Nenhuma musica cadastrada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  musicas.forEach((musica) => {
    const item = document.createElement('article');
    item.className = 'dashboard-list-item';
    item.innerHTML = `
      <div>
        <h3>${escapeHtml(getField(musica, ['titulo', 'nome', 'title']))}</h3>
        <p>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</p>
      </div>
      <div class="dashboard-item-actions">
        <a href="/musicas/detalhe?id=${encodeURIComponent(musica.id)}">Cifra</a>
        <a href="/musicas-letras/detalhe?id=${encodeURIComponent(musica.id)}">Letra</a>
      </div>
    `;
    list.append(item);
  });

  return list;
}

function createEmptyState(text) {
  const empty = document.createElement('p');
  empty.className = 'page-status';
  empty.textContent = text;
  return empty;
}

function getProximosRepertorios(repertorios) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return repertorios
    .filter((repertorio) => {
      const value = getField(repertorio, ['data', 'date']);
      if (!value || value === '-') return false;
      return new Date(`${value}T00:00:00`) >= today;
    })
    .sort((a, b) => compareText(getField(a, ['data', 'date']), getField(b, ['data', 'date'])));
}

function getMusicasRecentes(musicas) {
  return [...musicas].sort((a, b) => compareText(getField(b, ['created_at']), getField(a, ['created_at'])));
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
