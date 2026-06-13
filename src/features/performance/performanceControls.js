import { fitPreformattedTextToWidth } from '../../utils/performanceFontFit.js';

export const MAX_PERFORMANCE_FONT_SIZE = 128;
export const MAX_AUTO_FIT_FONT_SIZE = 16;

export function createCapoOptions({ label = 'Capo' } = {}) {
  return Array.from({ length: 12 }, (_, index) => (
    `<option value="${index}">${index === 0 ? 'Sem capo' : `${label} ${index}`}</option>`
  )).join('');
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
    fitToWidth: fitFontToMobileWidth,
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
