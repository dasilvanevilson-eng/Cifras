import {
  getRepertorioById,
  listMusicasDoRepertorio,
} from '../../../services/repertoriosService.js';

export async function RepertorioExecucaoPage() {
  const page = document.createElement('section');
  page.className = 'performance-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Repertorio nao informado.';
    return page;
  }

  try {
    const [{ data: repertorio, error: repertorioError }, { data: musicasAssociadas, error: musicasError }] = await Promise.all([
      getRepertorioById(id),
      listMusicasDoRepertorio(id),
    ]);

    if (repertorioError) throw repertorioError;
    if (musicasError) throw musicasError;

    page.replaceChildren(createPerformanceView({
      repertorio,
      musicasAssociadas: normalizeOrder(musicasAssociadas || []),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function createPerformanceView({ repertorio, musicasAssociadas }) {
  const wrapper = document.createElement('article');
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <a class="back-link" href="/repertorios/detalhe?id=${encodeURIComponent(repertorio.id)}">Voltar para edicao</a>
    <header class="performance-header">
      <h1>${escapeHtml(nome)}</h1>
      <p>${escapeHtml(data)}</p>
    </header>
    <div class="performance-list"></div>
  `;

  const list = wrapper.querySelector('.performance-list');

  if (!musicasAssociadas.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada a este repertorio.';
    list.append(empty);
    return wrapper;
  }

  musicasAssociadas.forEach((item, index) => {
    list.append(createSongBlock(item, index + 1));
  });

  return wrapper;
}

function createSongBlock(item, number) {
  const musica = item.musicas || {};
  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(musica, ['tom', 'key']);
  const chordpro = getField(musica, ['cifra_chordpro', 'chordpro', 'conteudo_chordpro']);

  const block = document.createElement('section');
  block.className = 'performance-song';
  block.innerHTML = `
    <header>
      <span>${number}</span>
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(artist)} - Tom: ${escapeHtml(key)}</p>
      </div>
    </header>
    <pre class="chordpro-view">${escapeHtml(chordpro)}</pre>
  `;

  return block;
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
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
