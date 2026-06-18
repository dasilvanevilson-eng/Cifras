import { getPublicLetrasRepertorioData } from '../../../services/publicInvitesService.js';
import { extractLyricsFromCifraOriginal, getCifraExibicao, renderCifraOriginalForDisplayHtml } from '../../../utils/chordpro.js';
import { fitPreformattedTextToWidth } from '../../../utils/performanceFontFit.js';
import { getYoutubeEmbedUrl, isYoutubeUrl } from '../../../utils/youtubePlayer.js';

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
    <section class="public-lyrics-video-player" data-role="public-lyrics-video-player" hidden>
      <div class="public-lyrics-video-dragbar" data-action="drag-video-player">
        <span data-role="video-drag-title">Playlist de videos</span>
        <button class="nav-button" type="button" data-action="minimize-video">Minimizar</button>
      </div>
      <div class="public-lyrics-video-frame" data-role="video-frame"></div>
      <div class="public-lyrics-video-controls" aria-label="Controles da playlist">
        <label class="public-lyrics-loop-toggle">
          <input type="checkbox" data-action="toggle-loop">
          Execucao em Loop
        </label>
        <button class="nav-button" type="button" data-action="previous-video">Anterior</button>
        <button class="nav-button" type="button" data-action="pause-video">Pausar</button>
        <button class="nav-button" type="button" data-action="stop-video">Parar</button>
        <button class="nav-button" type="button" data-action="next-video">Proximo</button>
        <span data-role="video-status">Nenhum video em execucao</span>
      </div>
    </section>
  `;

  const listSlot = wrapper.querySelector('.public-lyrics-song-list');
  let state = null;
  const playlistPlayer = setupPublicLyricsPlaylistPlayer(wrapper, {
    onStop: () => {
      if (!state) return;
      state.playlistIds.clear();
      render();
    },
  });

  if (!musicasAssociadas.length) {
    listSlot.innerHTML = '<p class="page-status">Nenhuma musica adicionada a este repertorio.</p>';
    return wrapper;
  }

  state = {
    selectedId: null,
    contentMode: getInviteContentMode(invite),
    playlistIds: getInitialPlaylistIds(musicasAssociadas),
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
      onTogglePlaylist: (item, checked) => {
        if (checked) {
          state.playlistIds.add(item.id);
        } else {
          state.playlistIds.delete(item.id);
        }
        render();
      },
      onPlayPlaylist: (item) => {
        state.playlistIds.add(item.id);
        playlistPlayer.play(getPlaylistItems(musicasAssociadas, state.playlistIds), item.id);
        state.selectedId = item.id;
        render();
      },
    }));
  }

  render();
  return wrapper;
}

function createSongList(items, state, { onSelect, onClose, onTogglePlaylist, onPlayPlaylist }) {
  const list = document.createElement('div');
  list.className = 'public-lyrics-list';

  items.forEach((item, index) => {
    const songRow = createSongRow(item, index, state, {
      onSelect,
      onClose,
      onTogglePlaylist,
      onPlayPlaylist,
    });
    list.append(songRow);

    if (item.id === state.selectedId) {
      const detail = createSongDetail(item, state.contentMode);
      list.append(detail);
    }
  });

  return list;
}

function createSongRow(item, index, state, { onSelect, onClose, onTogglePlaylist, onPlayPlaylist }) {
  const song = item.musicas || {};
  const title = getSongTitle(item);
  const momento = getField(item, ['observacao']);
  const link = getSongLink(item);
  const isSelected = item.id === state.selectedId;
  const row = document.createElement('article');
  row.className = `public-lyrics-list-item${isSelected ? ' is-selected' : ''}${isDeletedSong(item) ? ' is-deleted' : ''}`;
  const youtubeLink = isYoutubeUrl(link);
  const actions = [
    youtubeLink ? `
      <label class="public-lyrics-video-choice" title="Incluir na playlist">
        <input type="checkbox" data-action="toggle-playlist" ${state.playlistIds.has(item.id) ? 'checked' : ''}>
        Playlist
      </label>
      <button class="nav-button public-lyrics-play" type="button" data-action="play-song" aria-label="Executar playlist a partir desta musica" title="Executar playlist a partir desta musica">&#9658;</button>
    ` : '',
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
    onPlayPlaylist(item);
    onSelect(item);
  });

  row.querySelector('[data-action="toggle-playlist"]')?.addEventListener('change', (event) => {
    onTogglePlaylist(item, event.currentTarget.checked);
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

function setupPublicLyricsPlaylistPlayer(wrapper, options = {}) {
  const panel = wrapper.querySelector('[data-role="public-lyrics-video-player"]');
  const frameSlot = wrapper.querySelector('[data-role="video-frame"]');
  const status = wrapper.querySelector('[data-role="video-status"]');
  const dragbar = wrapper.querySelector('[data-action="drag-video-player"]');
  const loopInput = wrapper.querySelector('[data-action="toggle-loop"]');
  const pauseButton = wrapper.querySelector('[data-action="pause-video"]');
  const minimizeButton = wrapper.querySelector('[data-action="minimize-video"]');
  let player = null;
  let playerElementId = `public-lyrics-youtube-${Date.now()}`;
  let playlist = [];
  let currentIndex = -1;
  let isPaused = false;
  let apiReadyPromise = null;
  let hasManualPosition = false;

  function play(items, startId = null) {
    playlist = items.filter((item) => isYoutubeUrl(item.link));
    if (!playlist.length) return;

    const requestedIndex = playlist.findIndex((item) => item.id === startId);
    currentIndex = requestedIndex >= 0 ? requestedIndex : 0;
    panel.hidden = false;
    panel.classList.remove('is-minimized');
    minimizeButton.textContent = 'Minimizar';
    setInitialPosition();
    isPaused = false;
    pauseButton.textContent = 'Pausar';
    loadCurrentVideo();
  }

  function loadCurrentVideo() {
    const current = playlist[currentIndex];
    if (!current) {
      stop();
      return;
    }

    status.textContent = `${currentIndex + 1}/${playlist.length} - ${current.title}`;
    const embedUrl = getYoutubeEmbedUrl(current.link, {
      enableJsApi: true,
      autoplay: true,
    });

    if (!embedUrl) {
      playNext();
      return;
    }

    playerElementId = `public-lyrics-youtube-${Date.now()}`;
    frameSlot.innerHTML = `<div id="${playerElementId}"></div>`;

    loadYoutubeIframeApi().then(() => {
      player = new window.YT.Player(playerElementId, {
        videoId: getYoutubeVideoId(current.link),
        playerVars: {
          autoplay: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              playNextAfterEnd();
            }
          },
        },
      });
    }).catch(() => {
      frameSlot.innerHTML = `
        <iframe
          title="Execucao do video"
          src="${escapeHtml(embedUrl)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      `;
    });
  }

  function playNextAfterEnd() {
    if (currentIndex < playlist.length - 1) {
      currentIndex += 1;
      loadCurrentVideo();
      return;
    }

    if (loopInput.checked) {
      currentIndex = 0;
      loadCurrentVideo();
      return;
    }

    stop({ clearSelection: true });
  }

  function playNext() {
    if (!playlist.length) return;
    currentIndex = currentIndex < playlist.length - 1
      ? currentIndex + 1
      : 0;
    isPaused = false;
    pauseButton.textContent = 'Pausar';
    loadCurrentVideo();
  }

  function playPrevious() {
    if (!playlist.length) return;
    currentIndex = currentIndex > 0
      ? currentIndex - 1
      : playlist.length - 1;
    isPaused = false;
    pauseButton.textContent = 'Pausar';
    loadCurrentVideo();
  }

  function togglePause() {
    if (!player) return;

    if (isPaused) {
      player.playVideo?.();
      pauseButton.textContent = 'Pausar';
      isPaused = false;
      return;
    }

    player.pauseVideo?.();
    pauseButton.textContent = 'Continuar';
    isPaused = true;
  }

  function stop({ clearSelection = true } = {}) {
    player?.stopVideo?.();
    player?.destroy?.();
    player = null;
    playlist = [];
    currentIndex = -1;
    frameSlot.innerHTML = '';
    status.textContent = 'Nenhum video em execucao';
    panel.hidden = true;
    panel.classList.remove('is-minimized');
    minimizeButton.textContent = 'Minimizar';
    if (clearSelection) {
      options.onStop?.();
    }
  }

  function setInitialPosition() {
    if (hasManualPosition) return;

    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = 'max(10px, env(safe-area-inset-right))';
    panel.style.bottom = 'max(10px, env(safe-area-inset-bottom))';
  }

  function toggleMinimize() {
    const minimized = !panel.classList.contains('is-minimized');
    panel.classList.toggle('is-minimized', minimized);
    minimizeButton.textContent = minimized ? 'Restaurar' : 'Minimizar';
  }

  function restoreFromMinimized() {
    if (!panel.classList.contains('is-minimized')) return;
    panel.classList.remove('is-minimized');
    minimizeButton.textContent = 'Minimizar';
  }

  function startDrag(event) {
    if (event.target.closest('button')) return;

    event.preventDefault();
    restoreFromMinimized();
    hasManualPosition = true;
    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    panel.setPointerCapture?.(event.pointerId);

    function move(pointerEvent) {
      const maxLeft = window.innerWidth - panel.offsetWidth - 8;
      const maxTop = window.innerHeight - panel.offsetHeight - 8;
      const nextLeft = Math.max(8, Math.min(maxLeft, pointerEvent.clientX - offsetX));
      const nextTop = Math.max(8, Math.min(maxTop, pointerEvent.clientY - offsetY));
      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }

    function endDrag() {
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerup', endDrag);
      panel.removeEventListener('pointercancel', endDrag);
    }

    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  }

  wrapper.querySelector('[data-action="next-video"]').addEventListener('click', playNext);
  wrapper.querySelector('[data-action="previous-video"]').addEventListener('click', playPrevious);
  wrapper.querySelector('[data-action="pause-video"]').addEventListener('click', togglePause);
  wrapper.querySelector('[data-action="stop-video"]').addEventListener('click', () => stop({ clearSelection: true }));
  minimizeButton.addEventListener('click', toggleMinimize);
  frameSlot.addEventListener('click', restoreFromMinimized);
  dragbar.addEventListener('pointerdown', startDrag);

  function loadYoutubeIframeApi() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiReadyPromise) return apiReadyPromise;

    apiReadyPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = reject;
        document.head.append(script);
      }

      window.setTimeout(() => {
        if (!window.YT?.Player) reject(new Error('YouTube API indisponivel.'));
      }, 6000);
    });

    return apiReadyPromise;
  }

  return { play, stop };
}

function getInitialPlaylistIds(items) {
  return new Set();
}

function getPlaylistItems(items, playlistIds) {
  return items
    .filter((item) => playlistIds.has(item.id) && isYoutubeUrl(getSongLink(item)))
    .map((item) => ({
      id: item.id,
      title: getSongTitle(item),
      link: getSongLink(item),
    }));
}

function getYoutubeVideoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/').filter(Boolean)[1] || '';
      }
    }
  } catch {
    return '';
  }

  return '';
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
