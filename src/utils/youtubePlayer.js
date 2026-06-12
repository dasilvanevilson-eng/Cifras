let isInstalled = false;

export function installYoutubeFloatingPlayer() {
  if (isInstalled) return;
  isInstalled = true;

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;

    const opened = openYoutubeFloatingPlayer(link.href);
    if (!opened) return;

    event.preventDefault();
  });
}

export function openYoutubeFloatingPlayer(value) {
  const embedUrl = getYoutubeEmbedUrl(value);
  if (!embedUrl) return false;

  const modal = getOrCreateYoutubeModal();
  const frameSlot = modal.querySelector('[data-youtube-player-frame]');

  frameSlot.innerHTML = `
    <iframe
      title="Execucao do video"
      src="${escapeHtml(embedUrl)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
    ></iframe>
  `;

  modal.hidden = false;
  document.body.classList.add('has-youtube-modal');
  modal.querySelector('[data-action="close-youtube-player"]')?.focus();
  return true;
}

export function isYoutubeUrl(value) {
  return Boolean(getYoutubeEmbedUrl(value));
}

function getOrCreateYoutubeModal() {
  const existing = document.querySelector('[data-youtube-player-modal]');
  if (existing) return existing;

  const modal = document.createElement('div');
  modal.className = 'youtube-player-modal';
  modal.dataset.youtubePlayerModal = 'true';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="youtube-player-backdrop" data-action="close-youtube-player"></div>
    <section class="youtube-player-dialog" role="dialog" aria-modal="true" aria-label="Video">
      <header class="youtube-player-header">
        <button class="nav-button youtube-player-close" type="button" data-action="close-youtube-player">Fechar</button>
      </header>
      <div class="youtube-player-frame" data-youtube-player-frame></div>
    </section>
  `;

  modal.addEventListener('click', (event) => {
    if (!event.target.closest('[data-action="close-youtube-player"]')) return;
    closeYoutubeModal(modal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || modal.hidden) return;
    closeYoutubeModal(modal);
  });

  document.body.append(modal);
  return modal;
}

function closeYoutubeModal(modal) {
  modal.hidden = true;
  modal.querySelector('[data-youtube-player-frame]').innerHTML = '';
  document.body.classList.remove('has-youtube-modal');
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
    embed.searchParams.set('autoplay', '1');
    return embed.toString();
  } catch {
    return '';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
