import { getMusicaById } from '../../../services/musicasService.js';

export async function MusicaDetalhePage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Musica nao informada.';
    return page;
  }

  try {
    const { data: musica, error } = await getMusicaById(id);

    if (error) {
      throw error;
    }

    page.replaceChildren(createMusicaView(musica));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createMusicaView(musica) {
  const wrapper = document.createElement('article');
  wrapper.className = 'song-view';

  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const key = getField(musica, ['tom', 'key']);
  const chordpro = getField(musica, ['cifra_chordpro', 'chordpro', 'conteudo_chordpro']);

  wrapper.innerHTML = `
    <a class="back-link" href="/musicas">Voltar para musicas</a>
    <div class="page-actions">
      <a class="button-link" href="/musicas/editar?id=${encodeURIComponent(musica.id)}">Editar</a>
    </div>
    <header class="song-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(artist)} - Tom: ${escapeHtml(key)}</p>
    </header>
    <pre class="chordpro-view">${escapeHtml(chordpro)}</pre>
  `;

  return wrapper;
}

function getField(record, names) {
  const fieldName = names.find((name) => record[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
