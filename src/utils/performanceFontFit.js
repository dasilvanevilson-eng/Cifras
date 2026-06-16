const DEFAULT_MIN_FONT_SIZE = 4;
const DEFAULT_MAX_FONT_SIZE = 128;
const FIT_PRECISION = 0.1;
const RENDER_FIT_ITERATIONS = 10;
const WIDTH_USAGE_RATIO = 1;

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

    const refinedFontSize = refineFontSizeToRenderedWidth({
      view,
      setFontSize,
      initialFontSize: fittedFontSize,
      minFontSize,
      maxFontSize,
    });
    setFontSize(refinedFontSize);
  };

  window.requestAnimationFrame(applyFit);
  document.fonts?.ready?.then(applyFit).catch(() => {});
}

function getFittedFontSize(view, requestedFontSize, minFontSize, maxFontSize) {
  const style = window.getComputedStyle(view);
  const horizontalPadding = getHorizontalPadding(style);
  const availableWidth = getAvailableTextWidth(view, horizontalPadding);
  const widestLineWidth = measureWidestLine(view, style, requestedFontSize);

  if (!widestLineWidth) {
    return requestedFontSize;
  }

  return clampFontSize(
    Math.round(requestedFontSize * (availableWidth / widestLineWidth) * WIDTH_USAGE_RATIO),
    minFontSize,
    maxFontSize,
  );
}

function refineFontSizeToRenderedWidth({ view, setFontSize, initialFontSize, minFontSize, maxFontSize }) {
  let low = minFontSize;
  let high = Math.min(initialFontSize, maxFontSize);
  let best = minFontSize;

  if (fitsRenderedWidth(view, setFontSize, initialFontSize)) {
    low = initialFontSize;
    best = initialFontSize;
  } else {
    high = initialFontSize;
  }

  for (let index = 0; index < RENDER_FIT_ITERATIONS; index += 1) {
    const nextFontSize = (low + high) / 2;

    if (fitsRenderedWidth(view, setFontSize, nextFontSize)) {
      best = nextFontSize;
      low = nextFontSize;
    } else {
      high = nextFontSize;
    }
  }

  return roundFontSize(best);
}

function fitsRenderedWidth(view, setFontSize, value) {
  setFontSize(roundFontSize(value));
  view.getBoundingClientRect();
  const horizontalPadding = getHorizontalPadding(window.getComputedStyle(view));
  const availableWidth = getAvailableTextWidth(view, horizontalPadding);
  const renderedWidth = Math.max(0, view.scrollWidth - horizontalPadding);

  return renderedWidth <= availableWidth + 1;
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

function getAvailableTextWidth(view, horizontalPadding) {
  const parentWidth = view.parentElement?.getBoundingClientRect().width || 0;
  const viewWidth = view.getBoundingClientRect().width || 0;
  const viewportWidth = window.visualViewport?.width || window.innerWidth || 0;
  const widths = [parentWidth, viewWidth, viewportWidth].filter((value) => value > 0);
  const outerWidth = widths.length ? Math.min(...widths) : 1;

  return Math.max(1, outerWidth - horizontalPadding - 2);
}

function clampFontSize(value, minFontSize, maxFontSize) {
  return Math.max(minFontSize, Math.min(maxFontSize, Number(value) || minFontSize));
}

function roundFontSize(value) {
  return Math.round(Number(value) / FIT_PRECISION) * FIT_PRECISION;
}
