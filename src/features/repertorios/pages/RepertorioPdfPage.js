import { jsPDF } from 'jspdf';
import {
  getRepertorioById,
  listMusicasDoRepertorio,
} from '../../../services/repertoriosService.js';
import {
  extractLyricsFromCifraOriginal,
  getCifraExibicao,
  renderCifraOriginalForDisplayHtml,
} from '../../../utils/chordpro.js';

export async function RepertorioPdfPage() {
  const page = document.createElement('section');
  page.className = 'page pdf-repertorio-page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const shouldAutoPrint = params.get('autoPrint') === '1';
  const order = params.get('order') === 'alfabetica' ? 'alfabetica' : 'repertorio';
  const contentType = params.get('tipo') === 'letras' ? 'letras' : 'cifras';

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
      contentType,
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function createPdfView({
  repertorio,
  musicasAssociadas,
  shouldAutoPrint = false,
  order = 'repertorio',
  contentType = 'cifras',
}) {
  const wrapper = document.createElement('article');
  wrapper.className = `pdf-repertorio ${contentType === 'letras' ? 'is-lyrics-only' : ''}`;

  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));
  const isLyricsOnly = contentType === 'letras';
  const contentLabel = isLyricsOnly ? 'Letras' : 'Musicas cifradas';
  const suggestedFilename = `repertorio-${isLyricsOnly ? 'letras-' : ''}${slugifyFilename(nome)}`;
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
          <dt>Conteudo</dt>
          <dd>${escapeHtml(contentLabel)}</dd>
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

    <nav class="pdf-summary" id="indice" aria-label="Sumario">
      <h2><a class="pdf-index-target" href="#indice" name="indice">Sumario</a></h2>
      <ol>
        ${musicasAssociadas.map((item, index) => createSummaryItem(item, index + 1)).join('')}
      </ol>
    </nav>

    <div class="pdf-song-list">
      ${musicasAssociadas.length
        ? musicasAssociadas.map((item, index) => createSongSection(item, index + 1, contentType)).join('')
        : '<p class="page-status">Nenhuma musica adicionada a este repertorio.</p>'}
    </div>
  `;

  wrapper.querySelector('[data-action="print"]').addEventListener('click', () => {
    window.print();
  });

  wrapper.querySelector('[data-action="generate-pdf"]').addEventListener('click', () => {
    generateCompatiblePdf({
      filename: suggestedFilename,
      repertorio,
      musicasAssociadas,
      order,
      contentType,
      contentLabel,
      generatedAt,
    });
  });

  if (shouldAutoPrint) {
    window.setTimeout(() => {
      generateCompatiblePdf({
        filename: suggestedFilename,
        repertorio,
        musicasAssociadas,
        order,
        contentType,
        contentLabel,
        generatedAt,
      });
    }, 250);
  }

  return wrapper;
}

function generateCompatiblePdf({
  filename,
  repertorio,
  musicasAssociadas,
  order,
  contentType,
  contentLabel,
  generatedAt,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const layout = createPdfLayout(doc);
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));
  const summaryPages = Math.max(1, Math.ceil(Math.max(musicasAssociadas.length, 1) / 28));
  const summaryStartPage = 2;
  const songPageByNumber = new Map();

  renderPdfCover(doc, layout, {
    nome,
    data,
    totalMusicas: musicasAssociadas.length,
    contentLabel,
    generatedAt,
    order,
  });

  for (let index = 0; index < summaryPages; index += 1) {
    doc.addPage();
  }

  musicasAssociadas.forEach((item, index) => {
    const number = index + 1;
    doc.addPage();
    songPageByNumber.set(number, doc.getNumberOfPages());
    renderPdfSongPage(doc, layout, {
      item,
      number,
      contentType,
      summaryPage: summaryStartPage,
    });
  });

  renderPdfSummary(doc, layout, {
    musicasAssociadas,
    songPageByNumber,
    summaryStartPage,
    summaryPages,
  });

  doc.setProperties({
    title: filename,
    subject: contentLabel,
    creator: 'Master Cifras',
  });
  doc.save(`${filename}.pdf`);
}

function createPdfLayout(doc) {
  return {
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    marginX: 48,
    marginTop: 52,
    marginBottom: 52,
  };
}

function renderPdfCover(doc, layout, { nome, data, totalMusicas, contentLabel, generatedAt, order }) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Repertorio', layout.marginX, 96);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(doc.splitTextToSize(nome, layout.pageWidth - layout.marginX * 2), layout.marginX, 136);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const details = [
    `Data: ${data}`,
    `Musicas: ${totalMusicas}`,
    `Conteudo: ${contentLabel}`,
    `Gerado em: ${generatedAt}`,
    `Ordem: ${order === 'alfabetica' ? 'Alfabetica' : 'Repertorio'}`,
  ];
  doc.text(details, layout.marginX, 250);
}

function renderPdfSummary(doc, layout, { musicasAssociadas, songPageByNumber, summaryStartPage, summaryPages }) {
  const itemsPerPage = 28;

  for (let pageIndex = 0; pageIndex < summaryPages; pageIndex += 1) {
    doc.setPage(summaryStartPage + pageIndex);
    renderPdfPageTitle(doc, layout, 'Sumario');

    const start = pageIndex * itemsPerPage;
    const pageItems = musicasAssociadas.slice(start, start + itemsPerPage);
    let y = 98;

    if (!pageItems.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text('Nenhuma musica adicionada a este repertorio.', layout.marginX, y);
      continue;
    }

    pageItems.forEach((item, index) => {
      const number = start + index + 1;
      const title = getSongTitle(item);
      const momento = getSongMoment(item);
      const deletedLabel = isMusicaExcluida(item) ? ' - excluida do acervo' : '';
      const text = `${number}. ${title}${deletedLabel}${momento ? ` - ${momento}` : ''}`;
      const targetPage = songPageByNumber.get(number);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(20, 72, 62);
      doc.textWithLink(text, layout.marginX, y, {
        pageNumber: targetPage,
        top: 0,
        zoom: 'FitH',
      });
      doc.setTextColor(0, 0, 0);
      y += 24;
    });
  }
}

function renderPdfSongPage(doc, layout, { item, number, contentType, summaryPage }) {
  const deleted = isMusicaExcluida(item);
  const title = getSongTitle(item);
  const artist = getSongArtist(item);
  const key = getSongKey(item);
  const link = getSongLink(item);
  const momento = getSongMoment(item);
  const content = deleted
    ? 'Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.'
    : getSongPrintableContent(item, contentType);
  const bodyFont = contentType === 'letras' ? 'helvetica' : 'courier';
  const bodyFontSize = contentType === 'letras' ? 12 : 10;
  const bodyLineHeight = contentType === 'letras' ? 16 : 13;
  const songTitle = `${number}. ${title}${deleted ? ' (excluida)' : ''}`;
  let y = renderPdfSongHeader(doc, layout, {
    songTitle,
    artist,
    key,
    momento,
    link,
    summaryPage,
  });

  doc.setFont(bodyFont, contentType === 'letras' ? 'normal' : 'bold');
  doc.setFontSize(bodyFontSize);

  const maxWidth = layout.pageWidth - layout.marginX * 2;
  const lines = String(content || '')
    .split('\n')
    .flatMap((line) => doc.splitTextToSize(line || ' ', maxWidth));

  lines.forEach((line) => {
    if (y > layout.pageHeight - layout.marginBottom) {
      doc.addPage();
      y = renderPdfSongHeader(doc, layout, {
        songTitle,
        summaryPage,
        isContinuation: true,
      });
      doc.setFont(bodyFont, contentType === 'letras' ? 'normal' : 'bold');
      doc.setFontSize(bodyFontSize);
    }

    doc.text(line, layout.marginX, y);
    y += bodyLineHeight;
  });
}

function renderPdfSongHeader(doc, layout, {
  songTitle,
  artist = '',
  key = '',
  momento = '',
  link = '',
  summaryPage,
  isContinuation = false,
}) {
  let y = layout.marginTop;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(songTitle, layout.pageWidth - (layout.marginX * 2) - 128);
  doc.text(titleLines, layout.marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 72, 62);
  doc.textWithLink('Voltar ao indice', layout.pageWidth - layout.marginX, y, {
    align: 'right',
    pageNumber: summaryPage,
    top: 0,
    zoom: 'FitH',
  });
  doc.setTextColor(0, 0, 0);
  y += (titleLines.length * 18) + 4;

  if (isContinuation) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Continuacao', layout.marginX, y);
    return y + 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${artist} - Tom: ${key}`, layout.marginX, y);
  y += 18;

  if (momento) {
    doc.text(`Momento: ${momento}`, layout.marginX, y);
    y += 18;
  }

  if (link) {
    doc.setTextColor(20, 72, 62);
    doc.textWithLink('Link da musica', layout.marginX, y, { url: link });
    doc.setTextColor(0, 0, 0);
    y += 20;
  }

  return y + 10;
}

function renderPdfPageTitle(doc, layout, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(title, layout.marginX, layout.marginTop);
}

function createSummaryItem(item, number) {
  const title = getSongTitle(item);
  const momento = getSongMoment(item);
  const deletedLabel = isMusicaExcluida(item) ? ' - excluida do acervo' : '';
  const targetId = getSongAnchorId(number);

  return `
    <li>
      <a href="#${targetId}">
        <span>${number}. ${escapeHtml(title)}${escapeHtml(deletedLabel)}</span>
        ${momento ? `<small>${escapeHtml(momento)}</small>` : ''}
      </a>
    </li>
  `;
}

function createSongSection(item, number, contentType = 'cifras') {
  const deleted = isMusicaExcluida(item);
  const title = getSongTitle(item);
  const artist = getSongArtist(item);
  const key = getSongKey(item);
  const link = getSongLink(item);
  const momento = getSongMoment(item);
  const content = deleted ? '' : getSongPrintableContent(item, contentType);
  const isLyricsOnly = contentType === 'letras';
  const targetId = getSongAnchorId(number);

  return `
    <section class="pdf-song ${deleted ? 'deleted-repertorio-song' : ''}" id="${targetId}">
      <a class="pdf-anchor" name="${targetId}" aria-hidden="true"></a>
      <header>
        <p>${number}</p>
        <div>
          <h2>${escapeHtml(deleted ? `${title} (excluida)` : title)}</h2>
          <span>${escapeHtml(artist)} - Tom: ${escapeHtml(key)}</span>
          ${momento ? `<small class="repertorio-song-moment">Momento: ${escapeHtml(momento)}</small>` : ''}
          ${link ? `<a class="pdf-index-link pdf-song-link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Link</a>` : ''}
          <a class="pdf-index-link" href="#indice">Voltar ao indice</a>
        </div>
      </header>
      ${deleted
        ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>'
        : `<pre class="${isLyricsOnly ? 'lyrics-view' : 'chordpro-view'}">${renderCifraOriginalForDisplayHtml(content)}</pre>`}
    </section>
  `;
}

function getSongAnchorId(number) {
  return `musica-${number}`;
}

function getSongPrintableContent(item, contentType) {
  const musica = item.musicas || {};

  if (contentType !== 'letras') {
    return getCifraExibicao(musica);
  }

  const source = musica.cifra_chordpro || getCifraExibicao(musica);
  return extractLyricsFromCifraOriginal(source) || 'Letra nao informada.';
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

function getSongMoment(item) {
  const momento = getField(item, ['observacao']);
  return momento !== '-' ? momento : '';
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
