import { getMusicaById } from '../../../services/musicasService.js';
import { extractLyricsFromCifraOriginal } from '../../../utils/chordpro.js';
import { downloadTextFile, slugifyFilename } from '../../../utils/download.js';

export async function MusicaLetraDetalhePage() {
  const page = document.createElement('section');
  page.className = 'page lyrics-page';
  page.innerHTML = '<div class="page-status">Carregando letra...</div>';

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

    page.replaceChildren(createLetraView(musica));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a letra.';
  }

  return page;
}

function createLetraView(musica) {
  const wrapper = document.createElement('article');
  wrapper.className = 'song-view lyrics-view';

  const title = getField(musica, ['titulo', 'nome', 'title']);
  const artist = getField(musica, ['artista', 'autor', 'artist']);
  const letra = extractLyricsFromCifraOriginal(getField(musica, ['cifra_original']));

  wrapper.innerHTML = `
    <a class="back-link" href="/musicas-letras">Voltar para musicas letras</a>
    <div class="page-actions">
      <button class="nav-button" type="button" data-action="print">Imprimir</button>
      <button class="nav-button" type="button" data-action="export">Exportar texto</button>
    </div>
    <header class="song-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(artist)}</p>
    </header>
    <pre class="lyrics-text">${escapeHtml(letra || 'Letra nao encontrada.')}</pre>
  `;

  wrapper.querySelector('[data-action="print"]').addEventListener('click', () => {
    window.print();
  });

  wrapper.querySelector('[data-action="export"]').addEventListener('click', () => {
    downloadTextFile({
      filename: `${slugifyFilename(title, 'musica-letra')}.txt`,
      content: `${title}\n${artist && artist !== '-' ? `${artist}\n` : ''}\n${letra}\n`,
    });
  });

  return wrapper;
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
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
