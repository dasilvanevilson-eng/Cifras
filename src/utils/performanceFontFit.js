const DEFAULT_MIN_FONT_SIZE = 8;
const DEFAULT_MAX_FONT_SIZE = 64;
const WIDTH_USAGE_RATIO = 0.985;

export function fitPreformattedTextToWidth({
  wrapper,
  view,
  desiredFontSize,
  fitToWidth = true,
  setFontSize,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
  maxFontSize = DEFAULT_MAX_FONT_SIZE,
}) {
  if (!wrapper || !view || typeof setFontSize !== 'function') return;

  const requestedFontSize = clampFontSize(desiredFontSize, minFontSize, maxFontSize);
  setFontSize(requestedFontSize);

  if (!fitToWidth) return;

  const applyFit = () => {
    setFontSize(requestedFontSize);
    view.getBoundingClientRect();

    const fittedFontSize = getFittedFontSize(view, requestedFontSize, minFontSize, maxFontSize);
    setFontSize(fittedFontSize);
    view.getBoundingClientRect();

    if (view.scrollWidth > view.clientWidth + 1 && fittedFontSize > minFontSize) {
      const retryFontSize = Math.max(
        minFontSize,
        Math.floor(fittedFontSize * (view.clientWidth / view.scrollWidth) * 0.98),
      );
      setFontSize(retryFontSize);
    }
  };

  window.requestAnimationFrame(applyFit);
  document.fonts?.ready?.then(applyFit).catch(() => {});
}

function getFittedFontSize(view, requestedFontSize, minFontSize, maxFontSize) {
  const style = window.getComputedStyle(view);
  const horizontalPadding = getHorizontalPadding(style);
  const availableWidth = Math.max(
    120,
    (view.clientWidth || view.parentElement?.clientWidth || window.innerWidth || 120) - horizontalPadding,
  );
  const widestLineWidth = measureWidestLine(view, style, requestedFontSize);

  if (!widestLineWidth) {
    return requestedFontSize;
  }

  return clampFontSize(
    Math.floor(requestedFontSize * (availableWidth / widestLineWidth) * WIDTH_USAGE_RATIO),
    minFontSize,
    maxFontSize,
  );
}

function measureWidestLine(view, style, fontSize) {
  const canvas = measureWidestLine.canvas || document.createElement('canvas');
  measureWidestLine.canvas = canvas;

  const context = canvas.getContext('2d');
  if (!context) return Math.max(0, (view.scrollWidth || 0) - getHorizontalPadding(style));

  context.font = [
    style.fontStyle || 'normal',
    style.fontVariant || 'normal',
    style.fontWeight || '400',
    `${fontSize}px`,
    style.fontFamily || 'monospace',
  ].join(' ');

  return String(view.textContent || '')
    .split('\n')
    .reduce((widest, line) => Math.max(widest, context.measureText(line.replaceAll('\t', '    ')).width), 0);
}

function getHorizontalPadding(style) {
  return parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0');
}

function clampFontSize(value, minFontSize, maxFontSize) {
  return Math.max(minFontSize, Math.min(maxFontSize, Number(value) || minFontSize));
}
