import { getPublicLetrasRepertorioData } from '../../../services/publicInvitesService.js';
import { extractLyricsFromCifraOriginal, getCifraExibicao, renderCifraOriginalForDisplayHtml } from '../../../utils/chordpro.js';
import { fitPreformattedTextToWidth } from '../../../utils/performanceFontFit.js';
import { isYoutubeUrl, openYoutubeFloatingPlayer } from '../../../utils/youtubePlayer.js';

const PUBLIC_LYRICS_FONT_STORAGE_KEY = 'masterCifras.publicLyricsFontSize';
const PUBLIC_LYRICS_MAX_FONT_SIZE = 128;
const PUBLIC_LYRICS_MAX_AUTO_FIT_FONT_SIZE = 32;
const PUBLIC_LYRICS_MIN_FONT_SIZE = 8;

export async function PublicLetrasRepertorioPage() {
  const page = document.createElement('section');
  page.className = 'page public-access-page public-lyrics-page';
  page.innerHTML = '<div class="page-status">Carregando letras...</div>';

  const status = page.querySelector('.page-status');
  const token = new URLSearchParams(window.location.search).get('token');

  if (!token) {
    status.className = 'page-status error';
    status.textContent = 'Convite nao informado.';
    return page;
  }

  try {
    const { data, error } = await getPublicLetrasRepertorioData(token);

    if (error) throw error;

    page.replaceChildren(createPublicLyricsView({
      invite: data.invite,
      repertorio: data.repertorio,
      musicasAssociadas: normalizeOrder(data.musicas || []),
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as letras.';
  }

  return page;
}

function createPublicLyricsView({ invite, repertorio, musicasAssociadas }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'public-lyrics-shell';

  const repertorioNome = getField(repertorio, ['nome', 'titulo', 'name']);

  wrapper.innerHTML = `
    <header class="dashboard-header public-lyrics-header">
      <div>
        <h1>${escapeHtml(repertorioNome)}</h1>
        <p class="public-lyrics-invite-title">${escapeHtml(invite?.title || 'Modo Letras')}</p>
      </div>
    </header>
    <section class="public-lyrics-song-list" aria-label="Musicas do repertorio" aria-live="polite"></section>
  `;

  const listSlot = wrapper.querySelector('.public-lyrics-song-list');

  if (!musicasAssociadas.length) {
    listSlot.innerHTML = '<p class="page-status">Nenhuma musica adicionada a este repertorio.</p>';
    return wrapper;
  }

  const state = {
    selectedId: null,
    contentMode: getInviteContentMode(invite),
  };

  function render() {
    listSlot.replaceChildren(createSongList(musicasAssociadas, state, {
      onSelect: (item) => {
        state.selectedId = item.id;
        render();
      },
      onClose: () => {
        state.selectedId = null;
        render();
      },
    }));
  }

  render();
  return wrapper;
}

function createSongList(items, state, { onSelect, onClose }) {
  const list = document.createElement('div');
  list.className = 'public-lyrics-list';

  items.forEach((item, index) => {
    const songRow = createSongRow(item, index, state, { onSelect, onClose });
    list.append(songRow);

    if (item.id === state.selectedId) {
      const detail = createSongDetail(item, state.contentMode);
      list.append(detail);
    }
  });

  return list;
}

function createSongRow(item, index, state, { onSelect, onClose }) {
  const song = item.musicas || {};
  const title = getSongTitle(item);
  const momento = getField(item, ['observacao']);
  const link = getSongLink(item);
  const isSelected = item.id === state.selectedId;
  const row = document.createElement('article');
  row.className = `public-lyrics-list-item${isSelected ? ' is-selected' : ''}${isDeletedSong(item) ? ' is-deleted' : ''}`;
  const youtubeLink = isYoutubeUrl(link);
  const actions = [
    youtubeLink ? '<button class="nav-button public-lyrics-play" type="button" data-action="play-song" aria-label="Executar link da musica" title="Executar link da musica">&#9658;</button>' : '',
    isSelected ? '<button class="nav-button public-lyrics-close" type="button" data-action="close-detail" aria-label="Fechar exibicao" title="Fechar exibicao">Fechar</button>' : '',
  ].filter(Boolean).join('');

  row.innerHTML = `
    <button class="public-lyrics-select" type="button" data-action="select-song">
      <span class="public-lyrics-song-number">${index + 1}</span>
      <span>
        <strong>${escapeHtml(title)}</strong>
        ${momento !== '-' ? `<small class="repertorio-song-moment public-lyrics-song-moment">${escapeHtml(momento)}</small>` : ''}
      </span>
    </button>
    ${actions ? `<div class="public-lyrics-row-actions">${actions}</div>` : ''}
  `;

  row.querySelector('[data-action="select-song"]').addEventListener('click', () => {
    onSelect(item);
  });

  row.querySelector('[data-action="play-song"]')?.addEventListener('click', () => {
    openYoutubeFloatingPlayer(link);
    onSelect(item);
  });

  row.querySelector('[data-action="close-detail"]')?.addEventListener('click', () => {
    onClose();
  });

  if (!song.id && isDeletedSong(item)) {
    row.title = 'Musica excluida do acervo';
  }

  return row;
}

function createSongDetail(item, contentMode = 'lyrics_only') {
  const detail = document.createElement('article');
  detail.className = 'public-lyrics-detail-inner';
  detail.dataset.expandedSong = 'true';

  const content = getContentFromItem(item, contentMode);
  const isFullCifra = contentMode === 'full_cifra';

  detail.innerHTML = `
    ${isDeletedSong(item) ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>' : ''}
    <div class="public-lyrics-font-toolbar" role="group" aria-label="Tamanho da fonte">
      <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
      <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
    </div>
    <pre class="${isFullCifra ? 'chordpro-view' : 'lyrics-text public-lyrics-text'}">${isFullCifra ? renderCifraOriginalForDisplayHtml(content || 'Cifra nao encontrada.') : escapeHtml(content || 'Letra nao encontrada.')}</pre>
  `;

  setupPublicLyricsFontControls(detail);
  return detail;
}

function setupPublicLyricsFontControls(detail) {
  const view = detail.querySelector('.lyrics-text, .chordpro-view');
  const fontDownButton = detail.querySelector('[data-action="font-down"]');
  const fontUpButton = detail.querySelector('[data-action="font-up"]');

  if (!view || !fontDownButton || !fontUpButton) return;

  let fontSize = Number(window.localStorage.getItem(PUBLIC_LYRICS_FONT_STORAGE_KEY) || 32);
  let fitFontToWidth = true;

  function setFontSize(value) {
    const nextValue = Math.max(PUBLIC_LYRICS_MIN_FONT_SIZE, Math.min(PUBLIC_LYRICS_MAX_FONT_SIZE, Number(value) || 32));
    detail.style.setProperty('--public-lyrics-font-size', `${nextValue}px`);
  }

  function renderFontSize() {
    fitPreformattedTextToWidth({
      wrapper: detail,
      view,
      desiredFontSize: fontSize,
      fitToWidth: fitFontToWidth,
      maxFontSize: PUBLIC_LYRICS_MAX_AUTO_FIT_FONT_SIZE,
      minFontSize: PUBLIC_LYRICS_MIN_FONT_SIZE,
      setFontSize,
    });
  }

  fontDownButton.addEventListener('click', () => {
    fitFontToWidth = false;
    fontSize = Math.max(PUBLIC_LYRICS_MIN_FONT_SIZE, getCurrentPublicLyricsFontSize(detail, fontSize) - 1);
    window.localStorage.setItem(PUBLIC_LYRICS_FONT_STORAGE_KEY, String(fontSize));
    setFontSize(fontSize);
  });

  fontUpButton.addEventListener('click', () => {
    fitFontToWidth = false;
    fontSize = Math.min(PUBLIC_LYRICS_MAX_FONT_SIZE, getCurrentPublicLyricsFontSize(detail, fontSize) + 1);
    window.localStorage.setItem(PUBLIC_LYRICS_FONT_STORAGE_KEY, String(fontSize));
    setFontSize(fontSize);
  });

  window.addEventListener('resize', () => {
    if (fitFontToWidth) renderFontSize();
  }, { passive: true });

  renderFontSize();
}

function getCurrentPublicLyricsFontSize(detail, fallback) {
  const value = window.getComputedStyle(detail).getPropertyValue('--public-lyrics-font-size');
  return Number.parseFloat(value) || fallback;
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function getSongTitle(item) {
  if (isDeletedSong(item)) return getField(item, ['musica_titulo']);
  return getField(item.musicas || {}, ['titulo', 'nome', 'title']);
}

function getSongLink(item) {
  if (isDeletedSong(item)) return '';
  const link = getField(item.musicas || {}, ['musica_link']);
  return link !== '-' ? link : '';
}

function getContentFromItem(item = {}, contentMode = 'lyrics_only') {
  if (isDeletedSong(item)) return '';
  const musica = item.musicas || {};
  const cifra = getCifraExibicao(musica);

  if (contentMode === 'full_cifra') {
    return cifra;
  }

  const source = musica.cifra_chordpro || cifra;
  return extractLyricsFromCifraOriginal(source);
}

function getInviteContentMode(invite = {}) {
  const metadata = invite?.metadata && typeof invite.metadata === 'object' ? invite.metadata : {};
  return metadata.letras_content_mode === 'full_cifra' ? 'full_cifra' : 'lyrics_only';
}

function isDeletedSong(item = {}) {
  return Boolean(item.musica_excluida_em || !item.musicas?.id);
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
