import {
  getRepertorioById,
  listMusicasDoRepertorio,
} from '../../../services/repertoriosService.js';
import { getCifraExibicao, renderCifraOriginalForDisplayHtml } from '../../../utils/chordpro.js';

export async function RepertorioPdfPage() {
  const page = document.createElement('section');
  page.className = 'page pdf-repertorio-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const shouldAutoPrint = params.get('autoPrint') === '1';
  const order = params.get('order') === 'alfabetica' ? 'alfabetica' : 'repertorio';

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

    page.replaceChildren(createPdfView({
      repertorio,
      musicasAssociadas: orderMusicas(musicasAssociadas || [], order),
      shouldAutoPrint,
      order,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function createPdfView({ repertorio, musicasAssociadas, shouldAutoPrint = false, order = 'repertorio' }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'pdf-repertorio';

  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));
  const suggestedFilename = `repertorio-${slugifyFilename(nome)}`;
  const originalTitle = document.title;
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());

  wrapper.innerHTML = `
    <div class="pdf-toolbar">
      <a class="button-link secondary" href="/repertorios-pdf">Voltar</a>
      <button class="button-link secondary" type="button" data-action="print">Imprimir</button>
      <button class="button" type="button" data-action="generate-pdf">Gerar PDF</button>
    </div>

    <section class="pdf-cover">
      <p>Repertorio</p>
      <h1>${escapeHtml(nome)}</h1>
      <dl>
        <div>
          <dt>Data</dt>
          <dd>${escapeHtml(data)}</dd>
        </div>
        <div>
          <dt>Musicas</dt>
          <dd>${musicasAssociadas.length}</dd>
        </div>
        <div>
          <dt>Gerado em</dt>
          <dd>${escapeHtml(generatedAt)}</dd>
        </div>
        <div>
          <dt>Ordem</dt>
          <dd>${order === 'alfabetica' ? 'Alfabetica' : 'Repertorio'}</dd>
        </div>
      </dl>
    </section>

    <nav class="pdf-summary" aria-label="Sumario">
      <h2 id="indice">Sumario</h2>
      <ol>
        ${musicasAssociadas.map((item, index) => createSummaryItem(item, index + 1)).join('')}
      </ol>
    </nav>

    <div class="pdf-song-list">
      ${musicasAssociadas.length
        ? musicasAssociadas.map((item, index) => createSongSection(item, index + 1)).join('')
        : '<p class="page-status">Nenhuma musica adicionada a este repertorio.</p>'}
    </div>
  `;

  wrapper.querySelector('[data-action="print"]').addEventListener('click', () => {
    window.print();
  });

  wrapper.querySelector('[data-action="generate-pdf"]').addEventListener('click', () => {
    printWithSuggestedFilename(suggestedFilename, originalTitle);
  });

  if (shouldAutoPrint) {
    window.setTimeout(() => {
      printWithSuggestedFilename(suggestedFilename, originalTitle);
    }, 250);
  }

  return wrapper;
}

function printWithSuggestedFilename(filename, originalTitle) {
  document.title = filename;
  window.print();

  window.setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}

function createSummaryItem(item, number) {
  const title = getSongTitle(item);
  const deletedLabel = isMusicaExcluida(item) ? ' - excluida do acervo' : '';

  return `
    <li>
      <a href="#musica-${number}">
        <span>${number}. ${escapeHtml(title)}${escapeHtml(deletedLabel)}</span>
      </a>
    </li>
  `;
}

function createSongSection(item, number) {
  const deleted = isMusicaExcluida(item);
  const title = getSongTitle(item);
  const artist = getSongArtist(item);
  const key = getSongKey(item);
  const link = getSongLink(item);
  const cifra = deleted ? '' : getCifraExibicao(item.musicas || {});

  return `
    <section class="pdf-song ${deleted ? 'deleted-repertorio-song' : ''}" id="musica-${number}">
      <header>
        <p>${number}</p>
        <div>
          <h2>${escapeHtml(deleted ? `${title} (excluida)` : title)}</h2>
          <span>${escapeHtml(artist)} - Tom: ${escapeHtml(key)}</span>
          ${link ? `<a class="pdf-index-link pdf-song-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Link</a>` : ''}
          <a class="pdf-index-link" href="#indice">Voltar ao indice</a>
        </div>
      </header>
      ${deleted
        ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
        : `<pre class="chordpro-view">${renderCifraOriginalForDisplayHtml(cifra)}</pre>`}
    </section>
  `;
}

function getSongTitle(item) {
  return isMusicaExcluida(item)
    ? getField(item, ['musica_titulo'])
    : getField(item.musicas || {}, ['titulo', 'nome', 'title']);
}

function getSongArtist(item) {
  return isMusicaExcluida(item)
    ? getField(item, ['musica_artista'])
    : getField(item.musicas || {}, ['artista', 'autor', 'artist']);
}

function getSongKey(item) {
  const musica = item.musicas || {};
  return getField(item, ['tom']) !== '-'
    ? getField(item, ['tom'])
    : getField(musica, ['tom', 'key']);
}

function getSongLink(item) {
  if (isMusicaExcluida(item)) return '';

  const link = getField(item.musicas || {}, ['musica_link']);
  return link !== '-' ? link : '';
}

function isMusicaExcluida(item) {
  return Boolean(item?.musica_excluida_em || !item?.musica_id || !item?.musicas);
}

function orderMusicas(items, order) {
  const normalized = [...items];

  if (order === 'alfabetica') {
    return normalized.sort((a, b) => (
      getSongTitle(a).localeCompare(getSongTitle(b), 'pt-BR', { sensitivity: 'base' })
    ));
  }

  return normalized.sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function slugifyFilename(value) {
  const slug = String(value || 'repertorio')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'repertorio';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
