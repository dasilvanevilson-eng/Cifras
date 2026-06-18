let isInstalled = false;
let apiReadyPromise = null;

export function installYoutubeFloatingPlayer() {
  if (isInstalled) return;
  isInstalled = true;

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const opened = openYoutubeFloatingPlayer(link.href, {
      title: link.textContent?.trim() || 'Video da musica',
    });
    if (!opened) return;

    event.preventDefault();
  });
}

export function openYoutubeFloatingPlayer(value, options = {}) {
  const videoId = getYoutubeVideoId(value);
  const embedUrl = getYoutubeEmbedUrl(value, {
    enableJsApi: true,
    autoplay: true,
  });
  if (!embedUrl) return false;

  const playerView = getOrCreateYoutubePlayer();
  playerView.play({
    link: value,
    title: options.title || 'Video da musica',
    videoId,
    embedUrl,
  });
  return true;
}

export function isYoutubeUrl(value) {
  return Boolean(getYoutubeEmbedUrl(value));
}

function getOrCreateYoutubePlayer() {
  const existing = document.querySelector('[data-youtube-player-modal]');
  if (existing?.youtubePlayerController) return existing.youtubePlayerController;

  const panel = document.createElement('section');
  panel.className = 'public-lyrics-video-player youtube-floating-player';
  panel.dataset.youtubePlayerModal = 'true';
  panel.setAttribute('aria-label', 'Video');
  panel.hidden = true;
  panel.innerHTML = `
    <div class="public-lyrics-video-dragbar" data-action="drag-youtube-player">
      <span data-role="video-drag-title">Video da musica</span>
      <button class="nav-button" type="button" data-action="minimize-youtube-player">Minimizar</button>
    </div>
    <div class="public-lyrics-video-frame" data-youtube-player-frame></div>
    <div class="public-lyrics-video-controls" aria-label="Controles do video">
      <label class="public-lyrics-loop-toggle">
        <input type="checkbox" data-action="toggle-youtube-loop" checked>
        Execucao em Loop
      </label>
      <button class="nav-button" type="button" data-action="pause-youtube-player">Pausar</button>
      <button class="nav-button" type="button" data-action="stop-youtube-player">Parar</button>
      <span data-role="video-status">Nenhum video em execucao</span>
    </div>
  `;

  document.body.append(panel);

  const frameSlot = panel.querySelector('[data-youtube-player-frame]');
  const titleSlot = panel.querySelector('[data-role="video-drag-title"]');
  const status = panel.querySelector('[data-role="video-status"]');
  const dragbar = panel.querySelector('[data-action="drag-youtube-player"]');
  const minimizeButton = panel.querySelector('[data-action="minimize-youtube-player"]');
  const pauseButton = panel.querySelector('[data-action="pause-youtube-player"]');
  const stopButton = panel.querySelector('[data-action="stop-youtube-player"]');
  const loopInput = panel.querySelector('[data-action="toggle-youtube-loop"]');
  let player = null;
  let currentVideo = null;
  let playerElementId = `youtube-floating-player-${Date.now()}`;
  let isPaused = false;
  let hasManualPosition = false;

  function play(video) {
    currentVideo = video;
    isPaused = false;
    panel.hidden = false;
    panel.classList.remove('is-minimized');
    minimizeButton.textContent = 'Minimizar';
    pauseButton.textContent = 'Pausar';
    titleSlot.textContent = video.title;
    status.textContent = video.title;
    setInitialPosition();
    loadVideo();
  }

  function loadVideo() {
    if (!currentVideo) return;

    player?.destroy?.();
    player = null;
    playerElementId = `youtube-floating-player-${Date.now()}`;
    frameSlot.innerHTML = `<div id="${playerElementId}"></div>`;

    loadYoutubeIframeApi().then(() => {
      player = new window.YT.Player(playerElementId, {
        videoId: currentVideo.videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED && loopInput.checked) {
              player.seekTo?.(0);
              player.playVideo?.();
            }
          },
        },
      });
    }).catch(() => {
      const fallbackUrl = getYoutubeEmbedUrl(currentVideo.link, {
        autoplay: true,
        loop: loopInput.checked,
      });
      frameSlot.innerHTML = `
        <iframe
          title="Execucao do video"
          src="${escapeHtml(fallbackUrl || currentVideo.embedUrl)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      `;
    });
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

  function stop() {
    player?.stopVideo?.();
    player?.destroy?.();
    player = null;
    currentVideo = null;
    isPaused = false;
    frameSlot.innerHTML = '';
    status.textContent = 'Nenhum video em execucao';
    panel.hidden = true;
    panel.classList.remove('is-minimized');
    minimizeButton.textContent = 'Minimizar';
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

  function startDrag(event, { restoreOnStart = true } = {}) {
    if (event.target.closest('button')) return;

    event.preventDefault();
    if (restoreOnStart) {
      restoreFromMinimized();
    }
    hasManualPosition = true;
    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const initialX = event.clientX;
    const initialY = event.clientY;
    let hasMoved = false;
    panel.setPointerCapture?.(event.pointerId);

    function move(pointerEvent) {
      if (Math.abs(pointerEvent.clientX - initialX) > 4 || Math.abs(pointerEvent.clientY - initialY) > 4) {
        hasMoved = true;
      }
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
      if (!restoreOnStart && !hasMoved) {
        restoreFromMinimized();
      }
    }

    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  }

  minimizeButton.addEventListener('click', toggleMinimize);
  frameSlot.addEventListener('pointerdown', (event) => {
    if (!panel.classList.contains('is-minimized')) return;
    startDrag(event, { restoreOnStart: false });
  });
  pauseButton.addEventListener('click', togglePause);
  stopButton.addEventListener('click', stop);
  dragbar.addEventListener('pointerdown', startDrag);
  loopInput.addEventListener('change', () => {
    if (!currentVideo || player) return;
    loadVideo();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    stop();
  });

  panel.youtubePlayerController = { play, stop };
  return panel.youtubePlayerController;
}

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

export function getYoutubeEmbedUrl(value, options = {}) {
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
    embed.searchParams.set('autoplay', options.autoplay === false ? '0' : '1');
    if (options.loop) {
      embed.searchParams.set('loop', '1');
      embed.searchParams.set('playlist', videoId);
    }
    if (options.enableJsApi) {
      embed.searchParams.set('enablejsapi', '1');
      embed.searchParams.set('origin', window.location.origin);
    }
    return embed.toString();
  } catch {
    return '';
  }
}

export function getYoutubeVideoId(value) {
  if (!value || !/^https?:\/\//i.test(value)) return '';

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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
