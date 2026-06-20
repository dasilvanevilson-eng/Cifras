import { renderCifraOriginalForDisplayHtml, renderVoiceLegendHtml } from '../../utils/chordpro.js';

export function createPerformanceSongBlock({
  title,
  subtitleParts = [],
  originalKey = '',
  currentKey = originalKey,
  baseSemitones,
  cifra = '',
  link = '',
  musicaId = '',
  repertorioMusicaId = '',
  id = '',
  className = 'performance-song',
  deletedNotice = '',
} = {}) {
  const block = document.createElement('section');
  block.className = className;
  block.tabIndex = -1;

  if (id) block.id = id;
  if (link && link !== '-') block.dataset.link = link;
  if (musicaId) block.dataset.musicaId = musicaId;
  if (repertorioMusicaId) block.dataset.repertorioMusicaId = repertorioMusicaId;

  const baseSemitonesAttribute = Number.isFinite(baseSemitones)
    ? ` data-base-semitones="${baseSemitones}"`
    : '';

  block.innerHTML = `
    <header class="repertorio-song-title-bar">
      <span class="repertorio-current-song-title">${escapeHtml(title)}</span>
      ${subtitleParts.filter(Boolean).map((part) => (
        `<span class="title-separator" aria-hidden="true">/</span><span class="${escapeHtml(getSubtitleClassName(part))}">${escapeHtml(getSubtitleText(part))}</span>`
      )).join('')}
      <data class="current-key" data-original-key="${escapeHtml(originalKey)}"${baseSemitonesAttribute} hidden>${escapeHtml(currentKey || '-')}</data>
    </header>
    ${deletedNotice
      ? `<p class="deleted-song-notice">${escapeHtml(deletedNotice)}</p>`
      : `<div class="performance-voice-legend" data-role="performance-voice-legend">${renderVoiceLegendHtml(cifra)}</div>
      <pre class="chordpro-view" data-original-cifra="${escapeHtml(cifra)}">${renderCifraOriginalForDisplayHtml(cifra)}</pre>`}
  `;

  return block;
}

function getSubtitleText(part) {
  return typeof part === 'object' && part !== null ? part.text : part;
}

function getSubtitleClassName(part) {
  return typeof part === 'object' && part !== null && part.className
    ? part.className
    : 'repertorio-title-inline';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
