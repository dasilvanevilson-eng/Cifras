import { fitPreformattedTextToWidth } from '../../utils/performanceFontFit.js';

export const MAX_PERFORMANCE_FONT_SIZE = 128;
export const MAX_AUTO_FIT_FONT_SIZE = 16;

export function createCapoOptions({ label = 'Capo' } = {}) {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `${label} ${index}`}</option>`
  )).join('');
}

export function createPerformanceToolbar({
  backHref = '',
  showBack = Boolean(backHref),
  showSequence = false,
  sequencePosition = '1/1',
  previousDisabled = false,
  nextDisabled = false,
  linkHref = '',
  useDynamicSongLink = false,
} = {}) {
  const escapedLinkHref = escapeHtml(linkHref);

  return `
    <div class="performance-toolbar">
      ${showBack ? `<a class="button-link secondary icon-action back-icon-action song-toolbar-back" href="${escapeHtml(backHref)}" aria-label="Sair" title="Sair">Sair</a>` : ''}
      <div class="key-stepper" role="group" aria-label="Ajuste de tom">
        <button class="nav-button" type="button" data-action="transpose-down" aria-label="Descer meio tom" title="Descer meio tom">-1/2</button>
        <span class="transpose-status" data-role="transpose-status">Tom</span>
        <button class="nav-button" type="button" data-action="transpose-up" aria-label="Subir meio tom" title="Subir meio tom">+1/2</button>
      </div>
      ${showSequence ? `
        <div class="sequence-stepper" role="group" aria-label="Sequencia de exibicao">
          <button class="nav-button icon-button" type="button" data-action="previous-song" aria-label="Musica anterior" title="Musica anterior"${previousDisabled ? ' disabled' : ''}>&lsaquo;</button>
          <span class="performance-position" data-role="song-position">${escapeHtml(sequencePosition)}</span>
          <button class="nav-button icon-button" type="button" data-action="next-song" aria-label="Proxima musica" title="Proxima musica"${nextDisabled ? ' disabled' : ''}>&rsaquo;</button>
        </div>
      ` : ''}
      <button class="nav-button icon-button" type="button" data-action="fullscreen" aria-label="Tela cheia" title="Tela cheia">&#9974;</button>
      <div class="font-stepper" role="group" aria-label="Tamanho da fonte">
        <button class="nav-button" type="button" data-action="font-down" aria-label="Diminuir fonte">A-</button>
        <button class="nav-button" type="button" data-action="font-up" aria-label="Aumentar fonte">A+</button>
      </div>
      <button class="nav-button" type="button" data-action="two-columns" aria-label="Visualizacao em duas colunas" title="Visualizacao em duas colunas">2 col</button>
      <button class="nav-button icon-button theme-toggle-button" type="button" data-action="theme" aria-label="Alternar tela clara e escura" title="Alternar tela clara e escura"></button>
      <div class="scroll-stepper" role="group" aria-label="Rolagem automatica">
        <button class="nav-button icon-button" type="button" data-action="autoscroll" aria-label="Iniciar ou pausar rolagem" title="Rolagem automatica">&#9654;</button>
        <input type="range" min="1" max="8" value="3" data-action="speed" aria-label="Velocidade da rolagem">
      </div>
      <label>
        <select data-action="capo">
          ${createCapoOptions()}
        </select>
      </label>
      ${useDynamicSongLink ? createSongLinkAction() : createSongLinkAction(linkHref, escapedLinkHref)}
      <button class="nav-button icon-button" type="button" data-action="print" aria-label="Imprimir ou salvar em PDF" title="Imprimir ou salvar em PDF">&#128424;</button>
    </div>
  `;
}

function createSongLinkAction(linkHref = '', escapedLinkHref = '') {
  const hasLink = Boolean(String(linkHref || '').trim()) && linkHref !== '-';

  return `<a class="button-link secondary toolbar-link${hasLink ? '' : ' is-disabled'}"${hasLink ? ` href="${escapedLinkHref}" target="_blank" rel="noreferrer"` : ' aria-disabled="true" tabindex="-1" title="Link nao cadastrado"'} data-action="song-link">Link</a>`;
}

export function setPerformanceSongLinkState(linkElement, linkHref) {
  if (!linkElement) return;

  const href = String(linkHref || '').trim();
  const hasLink = Boolean(href) && href !== '-';

  linkElement.classList.toggle('is-disabled', !hasLink);
  linkElement.setAttribute('aria-disabled', String(!hasLink));

  if (hasLink) {
    linkElement.href = href;
    linkElement.target = '_blank';
    linkElement.rel = 'noreferrer';
    linkElement.removeAttribute('tabindex');
    linkElement.removeAttribute('title');
    return;
  }

  linkElement.removeAttribute('href');
  linkElement.setAttribute('tabindex', '-1');
  linkElement.title = 'Link nao cadastrado';
}

export function formatTransposeStatus(semitones, capo) {
  const transposeText = semitones === 0
    ? 'Tom'
    : `${semitones > 0 ? '+' : ''}${semitones}`;

  return capo > 0 ? `${transposeText} | Capo ${capo}` : transposeText;
}

export function setPerformanceTheme(wrapper, button, theme) {
  wrapper.classList.toggle('is-dark', theme === 'dark');
  button.textContent = theme === 'dark' ? 'Tela clara' : 'Tela escura';
  button.setAttribute('aria-label', theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura');
  button.title = theme === 'dark' ? 'Usar tela clara' : 'Usar tela escura';
}

export function setPerformanceFontSize(wrapper, value) {
  wrapper.style.setProperty('--performance-font-size', `${value}px`);
  updateFontSizeStatus(wrapper, value);
}

export function getCurrentPerformanceFontSize(wrapper, fallback) {
  const value = window.getComputedStyle(wrapper).getPropertyValue('--performance-font-size');
  return Number.parseFloat(value) || fallback;
}

export function updateFontSizeStatus(wrapper, value) {
  const status = wrapper.querySelector('[data-role="font-size-status"]');
  if (!status) return;

  status.textContent = String(Math.round(Number(value) || 0));
}

export function setTwoColumnView(wrapper, button, enabled) {
  wrapper.classList.toggle('is-two-columns', enabled);
  button.classList.toggle('is-active', enabled);
  button.textContent = enabled ? '1 col' : '2 col';
  button.title = enabled ? 'Visualizacao em uma coluna' : 'Visualizacao em duas colunas';
  button.setAttribute('aria-label', button.title);
  try {
    window.localStorage.setItem('masterCifras.performanceTwoColumns', enabled ? 'true' : 'false');
  } catch (_error) {
    // A preferencia visual continua na tela atual mesmo sem localStorage.
  }
}

export function getDefaultTwoColumnView() {
  try {
    return window.localStorage.getItem('masterCifras.performanceTwoColumns') === 'true';
  } catch (_error) {
    return false;
  }
}

export function fitCifraToWidth(wrapper, view, cifra, desiredFontSize, fitFontToMobileWidth) {
  if (!fitFontToMobileWidth) {
    setPerformanceFontSize(wrapper, desiredFontSize);
    return;
  }

  fitPreformattedTextToWidth({
    wrapper,
    view,
    desiredFontSize,
    fitToWidth: true,
    maxFontSize: MAX_AUTO_FIT_FONT_SIZE,
    setFontSize: (value) => setPerformanceFontSize(wrapper, value),
  });
}

export function setupDoubleTapFullscreen(wrapper, onToggleFullscreen) {
  setupSongGestureNavigation(wrapper, {
    onPrevious: () => {},
    onNext: () => {},
    onToggleFullscreen,
    enableSwipeNavigation: false,
    enableTapNavigation: false,
  });
}

export async function toggleInternalFullscreen(wrapper, button, onChange) {
  const updateFullscreenUi = () => {
    const isFullscreen = document.fullscreenElement === wrapper;
    wrapper.classList.toggle('is-fullscreen', isFullscreen);
    document.documentElement.classList.toggle('has-performance-fullscreen', isFullscreen);
    document.body?.classList.toggle('has-performance-fullscreen', isFullscreen);
    button.textContent = String.fromCharCode(9974);
    button.title = isFullscreen
      ? 'Para sair do modo tela cheia dar um duplo touch na musica'
      : 'Tela cheia';
    button.setAttribute('aria-label', button.title);

    if (typeof onChange === 'function') {
      window.requestAnimationFrame(onChange);
    }
  };

  if (!wrapper.performanceFullscreenChange) {
    wrapper.performanceFullscreenChange = updateFullscreenUi;
    document.addEventListener('fullscreenchange', wrapper.performanceFullscreenChange);
  }

  try {
    if (document.fullscreenElement === wrapper) {
      await document.exitFullscreen();
    } else if (!document.fullscreenElement) {
      await wrapper.requestFullscreen();
    }
    updateFullscreenUi();
  } catch (_error) {
    window.alert('Nao foi possivel alternar tela cheia neste navegador.');
  }
}

export function setupSongGestureNavigation(
  wrapper,
  {
    onPrevious,
    onNext,
    onToggleFullscreen,
    enableSwipeNavigation = true,
    enableTapNavigation = true,
  },
) {
  let pointerStart = null;
  let lastTap = null;

  wrapper.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.performance-toolbar, a, button, input, select, label')) {
      pointerStart = null;
      return;
    }

    pointerStart = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
    };
  });

  wrapper.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const elapsed = Date.now() - pointerStart.time;
    pointerStart = null;

    if (enableSwipeNavigation && Math.abs(deltaY) > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (enableSwipeNavigation && Math.abs(deltaX) >= 56) {
      if (deltaX < 0) {
        onNext();
      } else {
        onPrevious();
      }
      return;
    }

    if (elapsed > 450 || Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      return;
    }

    const now = Date.now();
    const isDoubleTap = lastTap
      && now - lastTap.time <= 340
      && Math.abs(event.clientX - lastTap.x) <= 44
      && Math.abs(event.clientY - lastTap.y) <= 44;

    if (isDoubleTap) {
      lastTap = null;
      onToggleFullscreen();
      return;
    }

    lastTap = {
      x: event.clientX,
      y: event.clientY,
      time: now,
    };

    if (!enableTapNavigation) return;

    const screenWidth = window.innerWidth || document.documentElement.clientWidth;
    const leftLimit = screenWidth * 0.28;
    const rightLimit = screenWidth * 0.72;

    if (event.clientX <= leftLimit) {
      onPrevious();
    } else if (event.clientX >= rightLimit) {
      onNext();
    }
  });

  wrapper.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
