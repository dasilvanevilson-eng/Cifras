import { getPublicLetrasRepertorioData } from '../../../services/publicInvitesService.js';
import { extractLyricsFromCifraOriginal, getCifraExibicao } from '../../../utils/chordpro.js';

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
  const firstSong = musicasAssociadas.find((item) => !isDeletedSong(item)) || musicasAssociadas[0] || null;

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
    selectedId: firstSong?.id || musicasAssociadas[0].id,
    autoplay: false,
  };

  function render() {
    listSlot.replaceChildren(createSongList(musicasAssociadas, state, {
      onSelect: (item, options = {}) => {
        state.selectedId = item.id;
        state.autoplay = Boolean(options.autoplay);
        render();
      },
      onClose: () => {
        state.selectedId = null;
        state.autoplay = false;
        render();
      },
    }));

    if (state.autoplay) {
      state.autoplay = false;
      listSlot.querySelector('[data-expanded-song="true"] [data-action="load-player"]')?.click();
    }
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
      const detail = createSongDetail(item);
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
  const actions = [
    link ? '<button class="nav-button public-lyrics-play" type="button" data-action="play-song" aria-label="Executar link da musica" title="Executar link da musica">&#9658;</button>' : '',
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
    onSelect(item, { autoplay: true });
  });

  row.querySelector('[data-action="close-detail"]')?.addEventListener('click', () => {
    onClose();
  });

  if (!song.id && isDeletedSong(item)) {
    row.title = 'Musica excluida do acervo';
  }

  return row;
}

function createSongDetail(item) {
  const detail = document.createElement('article');
  detail.className = 'public-lyrics-detail-inner';
  detail.dataset.expandedSong = 'true';

  const title = getSongTitle(item);
  const link = getSongLink(item);
  const embedUrl = getYoutubeEmbedUrl(link);
  const lyrics = getLyricsFromItem(item);

  detail.innerHTML = `
    <button type="button" data-action="load-player" hidden></button>
    <div class="public-lyrics-player" hidden></div>
    ${isDeletedSong(item) ? '<p class="deleted-song-notice">Esta musica foi excluida do acervo e permanece neste repertorio apenas como referencia.</p>' : ''}
    <pre class="lyrics-text public-lyrics-text">${escapeHtml(lyrics || 'Letra nao encontrada.')}</pre>
  `;

  detail.querySelector('[data-action="load-player"]')?.addEventListener('click', () => {
    const player = detail.querySelector('.public-lyrics-player');

    if (!embedUrl) {
      player.hidden = false;
      player.innerHTML = '<p class="page-status error">Este link nao pode ser executado dentro do sistema.</p>';
      return;
    }

    player.hidden = false;
    player.innerHTML = `
      <iframe
        title="Execucao de ${escapeHtml(title)}"
        src="${escapeHtml(embedUrl)}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    `;
  });

  return detail;
}

function getYoutubeEmbedUrl(value) {
  if (!value || !/^https?:\/\//i.test(value)) return '';

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      } else if (url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] || '';
      } else if (url.pathname.startsWith('/shorts/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }

    if (!/^[\w-]{6,}$/.test(videoId)) return '';

    const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
    embed.searchParams.set('rel', '0');
    return embed.toString();
  } catch {
    return '';
  }
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

function getLyricsFromItem(item = {}) {
  if (isDeletedSong(item)) return '';
  const musica = item.musicas || {};
  const source = musica.cifra_chordpro || getCifraExibicao(musica);
  return extractLyricsFromCifraOriginal(source);
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
