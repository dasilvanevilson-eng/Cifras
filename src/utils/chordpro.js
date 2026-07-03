export function convertToChordPro(input) {
  if (!input) return '';

  const lines = normalizeTabs(input).split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const label = getChordSectionLabel(line);

    if (isVoiceDirectiveLine(line)) {
      output.push(normalizeVoiceDirective(line));
      continue;
    }

    if (label && nextLine !== undefined && isChordLine(nextLine)) {
      output.push(`[*${label}]`);
      output.push(convertStandaloneChordLine(nextLine, { includeLabel: false }));
      index += 1;
      continue;
    }

    if (isChordLine(line) && nextLine !== undefined && !isChordLine(nextLine)) {
      output.push(mergeChordLineWithLyrics(line, nextLine));
      index += 1;
      continue;
    }

    output.push(convertStandaloneChordLine(line));
  }

  return output.map((line) => normalizeChordProLine(line.trimEnd())).join('\n');
}

export function transposeChordPro(input, semitones) {
  if (!input || !Number(semitones)) return input || '';

  return String(input).replace(/\[([^\]]+)\]/g, (match, chord) => `[${transposeChord(chord, semitones)}]`);
}

export function normalizeChordProLyrics(input) {
  if (!input) return '';

  return String(input)
    .split('\n')
    .map(normalizeChordProLine)
    .join('\n');
}

export function renderChordProForDisplay(input, options = {}) {
  if (!input) return '';

  const lines = [];

  String(input)
    .split('\n')
    .forEach((line) => {
      if (isVoiceDirectiveLine(line)) {
        if (options.keepVoiceDirectives) {
          lines.push(normalizeVoiceDirective(line));
        }

        return;
      }

      if (isVoiceLabelDirectiveLine(line)) {
        if (options.keepVoiceDirectives) {
          lines.push(normalizeVoiceLabelDirective(line));
        }

        return;
      }

      const renderedLine = renderChordProLineForDisplay(line);
      lines.push(options.keepVoiceDirectives ? normalizeVoiceDirectives(renderedLine) : stripVoiceDirectives(renderedLine));
    });

  return lines.join('\n');
}

export function renderCifraOriginalForDisplayHtml(input, options = {}) {
  if (!input) return '';

  let activeVoice = '';
  const usedVoices = new Set();
  const voiceLabels = { ...getVoiceLabels(input), ...(options.voiceLabels || {}) };

  const lines = normalizeTabs(String(input))
    .split('\n')
    .reduce((output, line) => {
      const directive = parseVoiceDirective(line);

      if (directive) {
        activeVoice = directive.closing ? '' : directive.id;
        if (activeVoice) {
          usedVoices.add(activeVoice);
        }
        return output;
      }

      if (parseVoiceLabelDirective(line)) {
        return output;
      }

      const plainLine = stripVoiceDirectives(line);
      const isChordLine = isDisplayChordLine(plainLine);
      const renderedLine = isChordLine
        ? `<span class="chord-line">${escapeHtml(plainLine)}</span>`
        : renderVoiceHighlightedLine(line, activeVoice, usedVoices);

      output.push(renderedLine);
      return output;
    }, [])

  if (usedVoices.size && options.includeVoiceLegend !== false) {
    lines.push('');
    lines.push(`<span class="voice-legend">${[...usedVoices].map((voiceId) => (
      `<span class="voice-legend-item voice-highlight-${escapeHtml(voiceId)}">${escapeHtml(getVoiceLabel(voiceId, voiceLabels))}</span>`
    )).join(' ')}</span>`);
  }

  return lines.join('\n');
}

export function renderMusicaCifraForDisplayHtml(musica = {}, options = {}) {
  const editorState = normalizeCifraEditorState(musica.cifra_editor_state);
  const voiceLabels = {
    ...getVoiceLabelsFromMusica(musica),
    ...(options.voiceLabels || {}),
  };

  if (hasCifraEditorStateContent(editorState)) {
    return renderCifraEditorStateForDisplayHtml(editorState, {
      ...options,
      voiceLabels,
    });
  }

  const cifra = options.cifra ?? getCifraExibicao(musica);
  return renderCifraOriginalForDisplayHtml(cifra, {
    ...options,
    voiceLabels,
  });
}

export function renderCifraOriginalPreviewHtml(input) {
  return renderCifraOriginalForDisplayHtml(renderChordProForDisplay(convertToChordPro(input || ''), {
    keepVoiceDirectives: true,
  }));
}

export function createCifraExibicao(input) {
  return renderChordProForDisplay(convertToChordPro(input || ''), {
    keepVoiceDirectives: true,
  });
}

export function getCifraExibicao(record = {}) {
  const editorState = normalizeCifraEditorState(record.cifra_editor_state);

  if (hasCifraEditorStateContent(editorState)) {
    return createCifraExibicaoFromCifraEditorState(editorState);
  }

  if (record.cifra_exibicao) {
    return String(record.cifra_exibicao);
  }

  if (record.cifra_chordpro) {
    return renderChordProForDisplay(record.cifra_chordpro, {
      keepVoiceDirectives: true,
    });
  }

  return createCifraExibicao(record.cifra_original || '');
}

export function getCifraParaTransposicao(record = {}) {
  const editorState = normalizeCifraEditorState(record.cifra_editor_state);

  if (hasCifraEditorStateContent(editorState)) {
    return uppercaseCifraOriginalLyrics(editorState.text);
  }

  if (record.cifra_chordpro) {
    return String(record.cifra_chordpro);
  }

  return getCifraExibicao(record);
}

function hasCifraEditorStateContent(state) {
  return Boolean(state?.text || state?.voiceMarks?.length);
}

function uppercaseCifraOriginalLyrics(input) {
  return normalizeTabs(input)
    .split('\n')
    .map((line) => {
      const plainLine = stripVoiceDirectives(line);
      if (isVoiceDirectiveLine(line) || parseVoiceLabelDirective(line) || isDisplayChordLine(plainLine)) {
        return line;
      }

      return String(line).toLocaleUpperCase('pt-BR');
    })
    .join('\n');
}

export function createCifraEditorStateFromRecord(record = {}) {
  const existingState = normalizeCifraEditorState(record.cifra_editor_state);

  if (existingState.text || existingState.voiceMarks.length) {
    return existingState;
  }

  const chordPro = normalizeChordProLyrics(record.cifra_chordpro
    || record.chordpro
    || record.conteudo_chordpro
    || convertToChordPro(record.cifra_original || ''));

  if (!chordPro) {
    return normalizeCifraEditorState({
      text: record.cifra_original || '',
      voiceLabels: getDefaultVoiceLabels(),
      voiceMarks: [],
    });
  }

  return createCifraEditorStateFromChordPro(chordPro);
}

export function createCifraEditorStateFromChordPro(chordPro) {
  const displayText = renderChordProForDisplay(chordPro, {
    keepVoiceDirectives: true,
  });
  const inlineMarkedText = normalizeVoiceBlocksToInlineForEditor(displayText);

  return normalizeCifraEditorState({
    text: stripVoiceDirectives(inlineMarkedText),
    voiceLabels: getVoiceLabels(chordPro),
    voiceMarks: getVoiceRangesFromMarkedText(inlineMarkedText),
  });
}

export function normalizeCifraEditorState(state = {}) {
  const value = typeof state === 'string' ? parseJsonSafely(state) : state;
  const text = String(value?.text || '');
  const textLength = text.length;
  const voiceLabels = {
    ...getDefaultVoiceLabels(),
    ...(value?.voiceLabels || value?.voice_labels || {}),
  };
  const voiceMarks = Array.isArray(value?.voiceMarks || value?.voice_marks)
    ? (value.voiceMarks || value.voice_marks)
      .map((mark) => ({
        start: clampInteger(mark.start, 0, textLength),
        end: clampInteger(mark.end, 0, textLength),
        markerId: String(mark.markerId || mark.marker_id || mark.voice || '').trim().toLowerCase(),
      }))
      .filter((mark) => mark.markerId && mark.start < mark.end)
      .sort((a, b) => a.start - b.start || a.end - b.end)
    : [];

  return {
    version: 1,
    text,
    voiceLabels,
    voiceMarks,
  };
}

export function createChordProFromCifraEditorState(state = {}) {
  const normalizedState = normalizeCifraEditorState(state);
  const chordPro = convertToChordPro(normalizedState.text);
  const chordProVoiceMarks = mapVoiceRangesToChordProText(
    normalizedState.text,
    chordPro,
    normalizedState.voiceMarks,
  );
  const markedChordPro = applyVoiceRangesToText(chordPro, chordProVoiceMarks);

  return applyVoiceLabelsToChordPro(
    markedChordPro,
    normalizedState.voiceLabels,
  );
}

export function createCifraExibicaoFromCifraEditorState(state = {}) {
  const normalizedState = normalizeCifraEditorState(state);

  return renderChordProForDisplay(createChordProFromCifraEditorState(normalizedState), {
    keepVoiceDirectives: true,
  });
}

export function renderCifraEditorStateForDisplayHtml(state = {}, options = {}) {
  const normalizedState = normalizeCifraEditorState(state);
  const chordProText = getChordProTextForEditorStateRender(options.cifra);

  if (chordProText) {
    if (hasInlineVoiceDirective(chordProText)) {
      const markedDisplayText = renderChordProForDisplay(chordProText, {
        keepVoiceDirectives: true,
      });

      return renderCifraOriginalForDisplayHtml(markedDisplayText, {
        ...options,
        voiceLabels: {
          ...normalizedState.voiceLabels,
          ...(options.voiceLabels || {}),
        },
      });
    }

    const chordProVoiceMarks = mapVoiceRangesToChordProText(
      normalizedState.text,
      chordProText,
      normalizedState.voiceMarks,
    );
    const markedChordProText = applyVoiceRangesToText(chordProText, chordProVoiceMarks);
    const markedDisplayText = renderChordProForDisplay(markedChordProText, {
      keepVoiceDirectives: true,
    });

    return renderCifraOriginalForDisplayHtml(markedDisplayText, {
      ...options,
      voiceLabels: {
        ...normalizedState.voiceLabels,
        ...(options.voiceLabels || {}),
      },
    });
  }

  const displayText = getDisplayTextForEditorStateRender(normalizedState, options.cifra);

  if (hasInlineVoiceDirective(displayText)) {
    return renderCifraOriginalForDisplayHtml(displayText, {
      ...options,
      voiceLabels: {
        ...normalizedState.voiceLabels,
        ...(options.voiceLabels || {}),
      },
    });
  }

  const displayVoiceMarks = mapVoiceRangesToDisplayText(
    normalizedState.text,
    displayText,
    normalizedState.voiceMarks,
  );
  const markedDisplayText = applyVoiceRangesToText(displayText, displayVoiceMarks);

  return renderCifraOriginalForDisplayHtml(markedDisplayText, {
    ...options,
    voiceLabels: {
      ...normalizedState.voiceLabels,
      ...(options.voiceLabels || {}),
    },
  });
}

function getChordProTextForEditorStateRender(cifra) {
  if (cifra === undefined || cifra === null) {
    return '';
  }

  const value = String(cifra);
  if (!hasChordProChords(value)) {
    return '';
  }

  return removeVoiceLabelDirectiveLines(value);
}

function getDisplayTextForEditorStateRender(state, cifra) {
  if (cifra === undefined || cifra === null) {
    return createCifraExibicaoFromCifraEditorState(state);
  }

  const value = String(cifra);
  const displayText = hasChordProChords(value)
    ? renderChordProForDisplay(value, { keepVoiceDirectives: true })
    : value;

  return removeVoiceLabelDirectiveLines(displayText);
}

function removeVoiceLabelDirectiveLines(value) {
  return String(value || '')
    .split('\n')
    .filter((line) => !parseVoiceLabelDirective(line))
    .join('\n');
}

export function renderChordProEditorHtmlFromCifraEditorState(state = {}) {
  const normalizedState = normalizeCifraEditorState(state);
  const chordPro = createChordProFromCifraEditorState(normalizedState);

  return renderChordProSourceHtml(chordPro);
}

export function transposeCifraOriginal(input, semitones) {
  if (!input) return '';

  const cifra = normalizeTabs(input);

  if (hasChordProChords(cifra)) {
    return renderChordProForDisplay(transposeChordPro(cifra, semitones), {
      keepVoiceDirectives: true,
    });
  }

  if (!Number(semitones)) return cifra;

  return cifra
    .split('\n')
    .map((line) => (isChordLine(line) ? transposeChordLine(line, semitones) : line))
    .join('\n');
}

export function transposeKey(key, semitones) {
  if (!key || key === '-' || !Number(semitones)) return key || '-';
  return transposeChord(key, semitones);
}

export function getTransposeSemitones(fromKey, toKey) {
  const fromRoot = getChordRoot(fromKey);
  const toRoot = getChordRoot(toKey);
  const fromIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[fromRoot] || fromRoot);
  const toIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[toRoot] || toRoot);

  if (fromIndex === -1 || toIndex === -1) return 0;

  const distance = mod(toIndex - fromIndex, NOTES_SHARP.length);
  return distance > 6 ? distance - NOTES_SHARP.length : distance;
}

export function convertCifraOriginalToNumbers(input, key) {
  if (!input || !key || key === '-') return input || '';

  const keyRoot = getChordRoot(key);

  if (!keyRoot) return input || '';

  return normalizeTabs(input)
    .split('\n')
    .map((line) => (isChordLine(line) ? convertChordLineToNumbers(line, keyRoot) : line))
    .join('\n');
}

export function extractLyricsFromCifraOriginal(input) {
  if (!input) return '';

  return normalizeTabs(input)
    .split('\n')
    .map(cleanLyricsLine)
    .filter((line) => line !== null)
    .filter((line) => !isChordLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isCifraOriginalChordLine(line) {
  return isChordLine(line);
}

function cleanLyricsLine(line) {
  const value = String(line || '');
  const cleaned = stripVoiceDirectives(value)
    .replace(/\[[^\]]+\]/g, '')
    .trimEnd();

  if (value.trim() && !cleaned.trim()) return null;

  return cleaned;
}

export function getDefaultVoiceLabels() {
  return { ...VOICE_LABELS };
}

export function getVoiceLabels(input) {
  const labels = getDefaultVoiceLabels();

  String(input || '').split('\n').forEach((line) => {
    const directive = parseVoiceLabelDirective(line);

    if (directive) {
      labels[directive.id] = directive.label;
    }
  });

  return labels;
}

export function getVoiceLabelsFromMusica(musica = {}) {
  return {
    ...getDefaultVoiceLabels(),
    ...getCustomVoiceLabels(getVoiceLabels(musica.cifra_chordpro || '')),
    ...getCustomVoiceLabels(getVoiceLabels(musica.cifra_exibicao || '')),
    ...getCustomVoiceLabels(getRawEditorStateVoiceLabels(musica.cifra_editor_state)),
  };
}

function getRawEditorStateVoiceLabels(state = {}) {
  const value = typeof state === 'string' ? parseJsonSafely(state) : state;
  return value?.voiceLabels || value?.voice_labels || {};
}

function getCustomVoiceLabels(labels = {}) {
  return Object.fromEntries(Object.entries(labels)
    .map(([id, label]) => [String(id || '').trim().toLowerCase(), String(label || '').trim()])
    .filter(([id, label]) => id && label && label !== VOICE_LABELS[id]));
}

export function getUsedVoiceIds(input) {
  const usedVoices = new Set();

  String(input || '').replace(/\{voice\s*:\s*([a-z0-9_-]+)\}/gi, (match, voiceId) => {
    usedVoices.add(voiceId.toLowerCase());
    return match;
  });

  return [...usedVoices];
}

export function renderVoiceLegendHtml(input, options = {}) {
  const usedVoices = options.usedVoiceIds || getUsedVoiceIds(input);
  const labels = { ...getVoiceLabels(input), ...(options.voiceLabels || {}) };

  if (!usedVoices.length) return '';

  return `<span class="voice-legend">${usedVoices.map((voiceId) => (
    `<span class="voice-legend-item voice-highlight-${escapeHtml(voiceId)}">${escapeHtml(getVoiceLabel(voiceId, labels))}</span>`
  )).join(' ')}</span>`;
}

export function applyVoiceLabelsToChordPro(chordPro, voiceLabels = {}) {
  const cleanChordPro = String(chordPro || '')
    .split('\n')
    .filter((line) => !parseVoiceLabelDirective(line))
    .join('\n')
    .trim();
  const labelLines = Object.entries(voiceLabels)
    .map(([id, label]) => [String(id || '').trim().toLowerCase(), String(label || '').trim()])
    .filter(([id, label]) => id && label && label !== VOICE_LABELS[id])
    .map(([id, label]) => `{voice-label: ${id}=${label}}`);

  return [...labelLines, cleanChordPro].filter(Boolean).join('\n');
}

function mergeChordLineWithLyrics(chordLine, lyricLine) {
  const parsed = parseChordLine(chordLine);
  const chords = findChords(parsed.chordText);

  if (parsed.label) {
    let labeledResult = lyricLine;
    chords.forEach(({ chord, index }) => {
      const position = getSourceIndexForVisiblePosition(labeledResult, index);
      const tag = `[${chord}]`;
      labeledResult = `${labeledResult.slice(0, position)}${tag}${labeledResult.slice(position)}`;
    });
    return `[*${parsed.label}]\n${labeledResult}`;
  }

  const visibleLyric = stripVoiceDirectives(lyricLine);
  const lyricEnd = visibleLyric.trimEnd().length;
  const lastWordMatch = visibleLyric.slice(0, lyricEnd).match(/\S+$/);
  const finalZoneStart = lastWordMatch ? lyricEnd - lastWordMatch[0].length : lyricEnd;
  let result = lyricLine;
  let finalZoneInlineUsed = false;
  const trailingChords = [];

  chords.forEach(({ chord, index }) => {
    const isFinalZone = index >= finalZoneStart;
    const canStayInline = index < lyricEnd && (!isFinalZone || !finalZoneInlineUsed);

    if (!canStayInline) {
      trailingChords.push({ chord, index });
      return;
    }

    const position = getSourceIndexForVisiblePosition(result, index);
    const tag = `[${chord}]`;
    result = `${result.slice(0, position)}${tag}${result.slice(position)}`;
    if (isFinalZone) finalZoneInlineUsed = true;
  });

  if (trailingChords.length) {
    result = appendTrailingChordsAtOriginalPositions(result, trailingChords);
  }

  return result;
}

function appendTrailingChordsAtOriginalPositions(line, trailingChords) {
  let result = String(line || '').trimEnd();
  let visibleLength = getVisibleTextLength(result);
  let chordLineEnd = getChordLineEndPosition(result);

  trailingChords.forEach(({ chord, index }) => {
    const position = Math.max(index, chordLineEnd + 1);
    const spaces = Math.max(0, position - visibleLength);
    result = `${result}${' '.repeat(spaces)}[${chord}]`;
    visibleLength = position;
    chordLineEnd = Math.max(chordLineEnd, position + chord.length);
  });

  return result;
}

function getChordLineEndPosition(value) {
  const source = String(value || '');
  let chordLineEnd = 0;
  let visiblePosition = 0;
  let index = 0;

  while (index < source.length) {
    if (source[index] === '[') {
      const endIndex = source.indexOf(']', index);
      if (endIndex > index) {
        const chord = source.slice(index + 1, endIndex);
        chordLineEnd = Math.max(chordLineEnd, visiblePosition + chord.length);
        index = endIndex + 1;
        continue;
      }
    }

    if (source[index] === '{') {
      const endIndex = source.indexOf('}', index);
      const token = endIndex > index ? source.slice(index, endIndex + 1) : '';
      if (/^\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}$/i.test(token)) {
        index = endIndex + 1;
        continue;
      }
    }

    visiblePosition += 1;
    index += 1;
  }

  return chordLineEnd;
}

function getVisibleTextLength(value) {
  const source = String(value || '');
  let length = 0;
  let index = 0;

  while (index < source.length) {
    if (source[index] === '[') {
      const endIndex = source.indexOf(']', index);
      if (endIndex > index) {
        index = endIndex + 1;
        continue;
      }
    }

    if (source[index] === '{') {
      const endIndex = source.indexOf('}', index);
      const token = endIndex > index ? source.slice(index, endIndex + 1) : '';
      if (/^\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}$/i.test(token)) {
        index = endIndex + 1;
        continue;
      }
    }

    length += 1;
    index += 1;
  }

  return length;
}

function getSourceIndexForVisiblePosition(value, visiblePosition) {
  const source = String(value || '');
  let visibleIndex = 0;
  let index = 0;

  while (index < source.length) {
    if (source[index] === '[') {
      const endIndex = source.indexOf(']', index);
      if (endIndex > index) {
        index = endIndex + 1;
        continue;
      }
    }

    if (source[index] === '{') {
      const endIndex = source.indexOf('}', index);
      const token = endIndex > index ? source.slice(index, endIndex + 1) : '';
      if (/^\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}$/i.test(token)) {
        index = endIndex + 1;
        continue;
      }
    }

    if (visibleIndex >= visiblePosition) {
      return index;
    }

    visibleIndex += 1;
    index += 1;
  }

  return source.length;
}

function renderChordProLineForDisplay(line) {
  if (isChordOnlyChordProLine(line)) {
    return renderChordOnlyChordProLine(line);
  }

  const chordLine = [];
  const lyricLine = [];
  let lyricPosition = 0;
  let index = 0;

  while (index < line.length) {
    if (line[index] === '[') {
      const endIndex = line.indexOf(']', index);

      if (endIndex > index) {
        writeAt(chordLine, lyricPosition, line.slice(index + 1, endIndex));
        index = endIndex + 1;
        continue;
      }
    }

    if (line[index] === '{') {
      const endIndex = line.indexOf('}', index);
      const token = endIndex > index ? line.slice(index, endIndex + 1) : '';

      if (/^\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}$/i.test(token)) {
        lyricLine.push(token);
        index = endIndex + 1;
        continue;
      }
    }

    lyricLine.push(line[index]);
    lyricPosition += 1;
    index += 1;
  }

  const chords = chordLine.join('').trimEnd();
  const lyrics = lyricLine.join('').trimEnd();

  if (!chords) return lyrics;
  if (!lyrics) return chords;

  return `${chords}\n${lyrics}`;
}

function renderChordOnlyChordProLine(line) {
  return String(line || '')
    .replace(/\[([^\]]+)\]/g, (match, chord) => chord)
    .trimEnd();
}

function isChordOnlyChordProLine(line) {
  const value = String(line || '');

  if (!/\[[^\]]+\]/.test(value)) return false;

  return value
    .replace(/\[[^\]]+\]/g, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim().length === 0;
}

function writeAt(target, position, value) {
  while (target.length < position) {
    target.push(' ');
  }

  if (target.slice(position, position + value.length).some((char) => char && char !== ' ')) {
    position = target.join('').trimEnd().length + 2;

    while (target.length < position) {
      target.push(' ');
    }
  }

  [...value].forEach((char, index) => {
    target[position + index] = char;
  });
}

function convertStandaloneChordLine(line, options = {}) {
  if (!isChordLine(line)) {
    return line;
  }

  const parsed = parseChordLine(line);
  const chords = findChords(parsed.chordText)
    .map(({ chord }) => `[${chord}]`)
    .join(' ');

  return parsed.label && options.includeLabel !== false ? `[*${parsed.label}]\n${chords}` : chords;
}

function isChordLine(line) {
  const parsed = parseChordLine(line);
  const chords = findChords(parsed.chordText);

  if (!chords.length) {
    return false;
  }

  return isOnlyChordsAndSeparators(parsed.chordText);
}

function isDisplayChordLine(line) {
  return isChordLine(line) || isCompactChordLine(line) || isNumberChordLine(line);
}

function isCompactChordLine(line) {
  const parsed = parseChordLine(line);
  const chordText = String(parsed.chordText || '');

  if (![...chordText.matchAll(COMPACT_CHORD_PATTERN)].length) return false;

  const remainingText = chordText
    .replace(COMPACT_CHORD_PATTERN, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim();

  return !remainingText;
}

function isNumberChordLine(line) {
  const value = String(line || '').trim();

  if (!value) return false;

  return /^[#b]?\d(?:m|maj|min|dim|aug|sus|add|M|[-+#b/()\d\s|:.,;])*$/.test(value)
    && /\d/.test(value);
}

function findChords(line) {
  return [...line.matchAll(CHORD_PATTERN)].map((match) => ({
    chord: match[0],
    index: match.index,
  }));
}

function transposeChordLine(line, semitones) {
  return line.replace(CHORD_PATTERN, (chord) => transposeChord(chord, semitones));
}

function hasChordProChords(input) {
  return /\[(?:[A-G](?:#|b)?|\*)/.test(input);
}

function transposeChord(chord, semitones) {
  if (String(chord).startsWith('*')) return chord;

  return String(chord).replace(NOTE_PATTERN, (note) => transposeNote(note, semitones));
}

function convertChordLineToNumbers(line, keyRoot) {
  return line.replace(CHORD_PATTERN, (chord) => convertChordToNumber(chord, keyRoot));
}

function convertChordToNumber(chord, keyRoot) {
  const root = getChordRoot(chord);

  if (!root) return chord;

  const suffixStart = root.length;
  const slashIndex = chord.indexOf('/');
  const suffix = slashIndex >= 0 ? chord.slice(suffixStart, slashIndex) : chord.slice(suffixStart);
  const bass = slashIndex >= 0 ? chord.slice(slashIndex + 1) : '';
  const number = noteToNumber(root, keyRoot);
  const bassNumber = bass ? `/${noteToNumber(bass, keyRoot)}` : '';

  return `${number}${suffix}${bassNumber}`;
}

function getChordRoot(value) {
  const match = String(value || '').match(/^[A-G](?:#|b)?/);
  return match ? match[0] : '';
}

function parseChordLine(line) {
  const value = String(line || '');
  const introChordLine = parseSectionChordLine(value, /^(intro|introdu[cç][aã]o)\b\s*:?\s*(.*)$/i);

  if (introChordLine) {
    return introChordLine;
  }

  const soloChordLine = parseSectionChordLine(value, /^(solo)\b\s*:?\s*(.*)$/i);

  if (soloChordLine) {
    return soloChordLine;
  }

  const match = value.match(/^\s*([A-Za-zÀ-ÿ0-9ªº ._-]{2,30}:)\s+(.*)$/);

  if (!match) {
    return { label: '', chordText: value };
  }

  const [, label, chordText] = match;

  if (!findChords(chordText).length) {
    return { label: '', chordText: value };
  }

  return { label: formatChordLineLabel(label), chordText };
}

function noteToNumber(note, keyRoot) {
  const noteIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[note] || note);
  const keyIndex = NOTES_SHARP.indexOf(FLAT_TO_SHARP[keyRoot] || keyRoot);

  if (noteIndex === -1 || keyIndex === -1) return note;

  return SEMITONE_TO_NUMBER[mod(noteIndex - keyIndex, NOTES_SHARP.length)];
}

function transposeNote(note, semitones) {
  const normalizedNote = FLAT_TO_SHARP[note] || note;
  const noteIndex = NOTES_SHARP.indexOf(normalizedNote);

  if (noteIndex === -1) {
    return note;
  }

  const transposedIndex = mod(noteIndex + Number(semitones), NOTES_SHARP.length);
  return NOTES_SHARP[transposedIndex];
}

function uppercaseChordProLyrics(line) {
  return String(line).replace(/\[[^\]]+\]|\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}|[^\[{]+/gi, (part) => {
    if (part.startsWith('[') || part.startsWith('{')) {
      return part;
    }

    return part.toLocaleUpperCase('pt-BR');
  });
}

function normalizeChordProLine(line) {
  if (isVoiceLabelDirectiveLine(line)) return normalizeVoiceLabelDirective(line);
  return isVoiceDirectiveLine(line) ? normalizeVoiceDirective(line) : normalizeVoiceDirectives(uppercaseChordProLyrics(line));
}

function isVoiceDirectiveLine(line) {
  return Boolean(parseVoiceDirective(line));
}

function normalizeVoiceDirective(line) {
  const directive = parseVoiceDirective(line);

  if (!directive) return String(line || '');
  if (directive.closing) return '{/voice}';

  return `{voice: ${directive.id}}`;
}

function normalizeVoiceDirectives(value) {
  return String(value || '').replace(/\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/gi, (match) => {
    const directive = parseVoiceDirective(match);

    if (!directive) return match;
    return directive.closing ? '{/voice}' : `{voice: ${directive.id}}`;
  });
}

function normalizeVoiceLabelDirective(line) {
  const directive = parseVoiceLabelDirective(line);

  if (!directive) return String(line || '');
  return `{voice-label: ${directive.id}=${directive.label}}`;
}

function stripVoiceDirectives(value) {
  return String(value || '')
    .replace(/\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/gi, '')
    .replace(/\{voice-label\s*:\s*[a-z0-9_-]+\s*=[^}]*\}/gi, '');
}

function normalizeVoiceBlocksToInlineForEditor(markedText) {
  const output = [];
  let activeMarker = '';

  String(markedText || '').split('\n').forEach((line) => {
    const openingMatch = line.trim().match(/^\{voice\s*:\s*([a-z0-9_-]+)\}$/i);

    if (openingMatch) {
      activeMarker = openingMatch[1].toLowerCase();
      return;
    }

    if (/^\{\/voice\}$/i.test(line.trim())) {
      activeMarker = '';
      return;
    }

    if (parseVoiceLabelDirective(line)) {
      return;
    }

    output.push(activeMarker && !isDisplayChordLine(stripVoiceDirectives(line)) && String(line || '').trim()
      ? `{voice: ${activeMarker}}${line}{/voice}`
      : line);
  });

  return output.join('\n');
}

function getVoiceRangesFromMarkedText(markedText) {
  const ranges = [];
  let cleanOffset = 0;
  let activeMarker = '';
  let activeStart = 0;
  const tokenPattern = /\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/gi;
  let sourceIndex = 0;

  String(markedText || '').replace(tokenPattern, (token, tokenIndex) => {
    cleanOffset += tokenIndex - sourceIndex;
    closeActiveRange();

    const openingMatch = token.match(/^\{voice\s*:\s*([a-z0-9_-]+)\}$/i);
    if (openingMatch) {
      activeMarker = openingMatch[1].toLowerCase();
      activeStart = cleanOffset;
    }

    sourceIndex = tokenIndex + token.length;
    return token;
  });

  cleanOffset += String(markedText || '').length - sourceIndex;
  closeActiveRange();
  return ranges;

  function closeActiveRange() {
    if (activeMarker && activeStart < cleanOffset) {
      ranges.push({ start: activeStart, end: cleanOffset, markerId: activeMarker });
    }
    activeMarker = '';
  }
}

function applyVoiceRangesToText(text, ranges) {
  const value = String(text || '');
  const inserts = [];

  ranges.forEach((range) => {
    const start = clampInteger(range.start, 0, value.length);
    const end = clampInteger(range.end, 0, value.length);
    const markerId = String(range.markerId || range.marker_id || range.voice || '').trim().toLowerCase();

    if (!markerId || start >= end) return;

    getVoiceRangeLineFragments(value, start, end, markerId).forEach((fragment) => {
      inserts.push({ index: fragment.start, text: `{voice: ${fragment.markerId}}` });
      inserts.push({ index: fragment.end, text: '{/voice}' });
    });
  });

  inserts.sort((a, b) => b.index - a.index || (a.text.startsWith('{/') ? 1 : -1));

  return inserts.reduce((result, insert) => (
    `${result.slice(0, insert.index)}${insert.text}${result.slice(insert.index)}`
  ), value);
}

function getVoiceRangeLineFragments(value, start, end, markerId) {
  const fragments = [];
  let cursor = start;

  while (cursor < end) {
    const nextLineBreak = value.indexOf('\n', cursor);
    const fragmentEnd = nextLineBreak === -1 || nextLineBreak >= end
      ? end
      : nextLineBreak;

    if (cursor < fragmentEnd) {
      fragments.push({
        start: cursor,
        end: fragmentEnd,
        markerId,
      });
    }

    cursor = fragmentEnd;
    if (value[cursor] === '\n') {
      cursor += 1;
    }
  }

  return fragments;
}

function mapVoiceRangesToDisplayText(sourceText, displayText, ranges) {
  const source = String(sourceText || '');
  const display = String(displayText || '');
  const sourceLines = source.split('\n');
  const displayLines = display.split('\n');
  const sourceLineStarts = getLineStartOffsets(source);
  const displayLineStarts = getLineStartOffsets(display);

  return ranges
    .map((range) => {
      const markerId = String(range.markerId || range.marker_id || range.voice || '').trim().toLowerCase();
      if (!markerId) return null;

      const sourceStart = clampInteger(range.start, 0, source.length);
      const sourceEnd = clampInteger(range.end, 0, source.length);
      if (sourceStart >= sourceEnd) return null;

      const start = mapSourceOffsetToDisplayOffset(sourceStart);
      const end = mapSourceOffsetToDisplayOffset(sourceEnd);
      return start < end ? { start, end, markerId } : null;
    })
    .filter(Boolean);

  function mapSourceOffsetToDisplayOffset(offset) {
    const position = getLineColumnForOffset(sourceLineStarts, source, offset);
    const sourceLine = sourceLines[position.line] || '';
    const displayLine = displayLines[position.line] || '';
    const displayLineStart = displayLineStarts[position.line] ?? display.length;
    const column = position.column >= sourceLine.length
      ? displayLine.length
      : Math.min(position.column, displayLine.length);

    return Math.min(display.length, displayLineStart + column);
  }
}

function mapVoiceRangesToChordProText(sourceText, chordProText, ranges) {
  const source = normalizeTabs(String(sourceText || ''));
  const chordPro = String(chordProText || '');
  const sourceLines = source.split('\n');
  const chordProLines = chordPro.split('\n');
  const sourceLineStarts = getLineStartOffsets(source);
  const chordProLineStarts = getLineStartOffsets(chordPro);
  const sourceToChordProLine = getSourceToChordProLineMap(sourceLines);

  return ranges
    .flatMap((range) => {
      const markerId = String(range.markerId || range.marker_id || range.voice || '').trim().toLowerCase();
      if (!markerId) return [];

      const sourceStart = clampInteger(range.start, 0, source.length);
      const sourceEnd = clampInteger(range.end, 0, source.length);
      if (sourceStart >= sourceEnd) return [];

      return getVoiceRangeLineFragments(source, sourceStart, sourceEnd, markerId)
        .map((fragment) => mapSourceFragmentToChordProRange(fragment))
        .filter(Boolean);
    });

  function mapSourceFragmentToChordProRange(fragment) {
    const startPosition = getLineColumnForOffset(sourceLineStarts, source, fragment.start);
    const endPosition = getLineColumnForOffset(sourceLineStarts, source, fragment.end);
    const sourceLine = sourceLines[startPosition.line] || '';

    if (isChordLine(sourceLine)) return null;

    const chordProLineIndex = sourceToChordProLine[startPosition.line];
    if (chordProLineIndex === undefined) return null;

    const chordProLine = chordProLines[chordProLineIndex] || '';
    const chordProLineStart = chordProLineStarts[chordProLineIndex] ?? chordPro.length;
    const lineStart = getChordProLineOffsetForVisibleColumn(chordProLine, startPosition.column);
    const lineEnd = getChordProLineOffsetForVisibleColumn(chordProLine, endPosition.column);
    const start = chordProLineStart + lineStart;
    const end = chordProLineStart + lineEnd;

    return start < end ? { start, end, markerId: fragment.markerId } : null;
  }
}

function getSourceToChordProLineMap(sourceLines) {
  const map = [];
  let outputLine = 0;

  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];
    const nextLine = sourceLines[index + 1];
    const label = getChordSectionLabel(line);

    if (isVoiceDirectiveLine(line)) {
      map[index] = outputLine;
      outputLine += 1;
      continue;
    }

    if (label && nextLine !== undefined && isChordLine(nextLine)) {
      map[index] = outputLine;
      map[index + 1] = outputLine + 1;
      outputLine += 2;
      index += 1;
      continue;
    }

    if (isChordLine(line) && nextLine !== undefined && !isChordLine(nextLine)) {
      map[index] = outputLine;
      map[index + 1] = outputLine;
      outputLine += 1;
      index += 1;
      continue;
    }

    map[index] = outputLine;
    outputLine += 1;
  }

  return map;
}

function getChordProLineOffsetForVisibleColumn(line, column) {
  const value = String(line || '');
  let visibleColumn = 0;
  let index = 0;

  while (index < value.length) {
    if (value[index] === '[') {
      const endIndex = value.indexOf(']', index);
      if (endIndex > index) {
        index = endIndex + 1;
        continue;
      }
    }

    if (visibleColumn >= column) {
      return index;
    }

    visibleColumn += 1;
    index += 1;
  }

  return value.length;
}

function renderChordProSourceHtml(value, ranges = []) {
  const source = String(value || '');
  const normalizedRanges = ranges
    .map((range) => ({
      start: clampInteger(range.start, 0, source.length),
      end: clampInteger(range.end, 0, source.length),
      markerId: String(range.markerId || range.marker_id || range.voice || '').trim().toLowerCase(),
    }))
    .filter((range) => range.markerId && range.start < range.end);
  const output = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] === '[') {
      const endIndex = source.indexOf(']', index);
      if (endIndex > index) {
        output.push(`<span class="chord-token">${escapeHtml(source.slice(index, endIndex + 1))}</span>`);
        index = endIndex + 1;
        continue;
      }
    }

    const voiceId = getVoiceIdAtOffset(normalizedRanges, index);
    let endIndex = index + 1;

    while (
      endIndex < source.length
      && source[endIndex] !== '['
      && getVoiceIdAtOffset(normalizedRanges, endIndex) === voiceId
    ) {
      endIndex += 1;
    }

    const text = escapeHtml(source.slice(index, endIndex));
    output.push(voiceId
      ? `<span class="voice-highlight voice-highlight-${escapeHtml(voiceId)}" style="${getVoiceHighlightInlineStyle(voiceId)}">${text}</span>`
      : text);
    index = endIndex;
  }

  return output.join('');
}

function getVoiceIdAtOffset(ranges, offset) {
  return ranges.find((range) => range.start <= offset && offset < range.end)?.markerId || '';
}

function getLineStartOffsets(value) {
  const starts = [0];

  String(value || '').replace(/\n/g, (match, index) => {
    starts.push(index + 1);
    return match;
  });

  return starts;
}

function getLineColumnForOffset(lineStarts, value, offset) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const line = Math.max(0, high);
  const lineEnd = String(value || '').indexOf('\n', lineStarts[line]);
  const maxColumn = (lineEnd === -1 ? String(value || '').length : lineEnd) - lineStarts[line];

  return {
    line,
    column: Math.min(Math.max(0, offset - lineStarts[line]), maxColumn),
  };
}

function parseJsonSafely(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function clampInteger(value, min, max) {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function hasInlineVoiceDirective(line) {
  return /\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/i.test(String(line || ''))
    && !isVoiceDirectiveLine(line);
}

function renderVoiceHighlightedLine(line, activeVoice, usedVoices) {
  const output = [];
  let currentVoice = activeVoice || '';
  let index = 0;
  const value = String(line || '');
  const directivePattern = /\{\/?voice(?:\s*:\s*[a-z0-9_-]+)?\}/gi;

  value.replace(directivePattern, (match, offset) => {
    output.push(renderVoiceTextSegment(value.slice(index, offset), currentVoice));

    const directive = parseVoiceDirective(match);
    currentVoice = directive?.closing ? '' : directive?.id || currentVoice;
    if (currentVoice) {
      usedVoices.add(currentVoice);
    }

    index = offset + match.length;
    return match;
  });

  output.push(renderVoiceTextSegment(value.slice(index), currentVoice));
  return output.join('');
}

function renderVoiceTextSegment(text, voiceId) {
  if (!text) return '';

  const escapedText = escapeHtml(text);
  return voiceId
    ? `<span class="voice-highlight voice-highlight-${escapeHtml(voiceId)}" style="${getVoiceHighlightInlineStyle(voiceId)}">${escapedText}</span>`
    : escapedText;
}

function getVoiceHighlightInlineStyle(voiceId) {
  const color = VOICE_COLORS[voiceId] || VOICE_COLORS.voz_principal;
  return `color: inherit; -webkit-text-fill-color: inherit; background: ${hexToRgba(color, 0.22)}; font-weight: inherit;`;
}

function parseVoiceDirective(line) {
  const value = String(line || '').trim();

  if (/^\{\/(?:voice|part)\}$/i.test(value)) {
    return { closing: true, id: '' };
  }

  const openingMatch = value.match(/^\{(?:voice|part)\s*:\s*([a-z0-9_-]+)\}$/i);

  if (!openingMatch) return null;

  return { closing: false, id: openingMatch[1].toLowerCase() };
}

function isVoiceLabelDirectiveLine(line) {
  return Boolean(parseVoiceLabelDirective(line));
}

function parseVoiceLabelDirective(line) {
  const match = String(line || '').trim().match(/^\{voice-label\s*:\s*([a-z0-9_-]+)\s*=\s*([^}]*)\}$/i);

  if (!match) return null;

  return {
    id: match[1].toLowerCase(),
    label: match[2].trim(),
  };
}

function getVoiceLabel(voiceId, labels = VOICE_LABELS) {
  return labels[voiceId] || VOICE_LABELS[voiceId] || voiceId.replaceAll('_', ' ');
}

function isOnlyChordsAndSeparators(value) {
  return String(value || '')
    .replace(CHORD_PATTERN, '')
    .replace(CHORD_SEPARATOR_PATTERN, '')
    .trim().length === 0;
}

function getChordSectionLabel(line) {
  const match = String(line || '').match(/^\s*(intro|introdu[cç][aã]o|solo)\s*:?\s*$/i);
  return match ? formatChordLineLabel(match[1]) : '';
}

function parseSectionChordLine(line, pattern) {
  const match = String(line || '').trim().match(pattern);

  if (!match) return null;

  const [, label, chordText] = match;
  return parseKeywordChordText(label, chordText);
}

function parseKeywordChordText(label, text) {
  const value = String(text || '');
  const chords = findChords(value);

  if (!chords.length) return null;

  if (isOnlyChordsAndSeparators(value)) {
    return { label: formatChordLineLabel(label), chordText: value };
  }

  const extraLabel = value
    .replace(CHORD_PATTERN, ' ')
    .replace(CHORD_SEPARATOR_PATTERN, ' ')
    .replace(/\b\d+\s*x\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const chordText = chords.map(({ chord }) => chord).join(' ');

  const fullLabel = [label, extraLabel]
    .map((part) => String(part || '').trim().replace(/:$/, ''))
    .filter(Boolean)
    .join(' ');

  return { label: formatChordLineLabel(fullLabel), chordText };
}

function formatChordLineLabel(label) {
  const trimmed = String(label || '').trim().replace(/:$/, '');
  return trimmed ? `${trimmed}:` : '';
}

const CHORD_PATTERN = /(?<![A-Za-zÀ-ÿ])(?:[A-G](?:#|b)?(?:(?:m(?![a-z])|maj|min|dim|aug|sus|add|M|º|°|ø|Δ|\+|-|[#b]?\d{1,2}|\([^)]*\)))*(?:\/(?:[A-G](?:#|b)?|[#b]?\d{1,2}))*)(?![A-Za-zÀ-ÿ])/g;
const COMPACT_CHORD_PATTERN = /(?:[A-G](?:#|b)?(?:(?:m(?![a-z])|maj|min|dim|aug|sus|add|M|º|°|ø|Δ|\+|-|[#b]?\d{1,2}|\([^)]*\)))*(?:\/(?:[A-G](?:#|b)?|[#b]?\d{1,2}))*)/g;
const CHORD_SEPARATOR_PATTERN = /[|:.,;()\[\]{}-]/g;
const NOTE_PATTERN = /[A-G](?:#|b)?/g;
const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SEMITONE_TO_NUMBER = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7'];
const FLAT_TO_SHARP = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};
const VOICE_LABELS = {
  voz_principal: 'Voz principal',
  segunda_voz: 'Segunda voz',
  terca_voz: 'Terceira voz',
  todos: 'Todos',
  solo: 'Solo',
};
const VOICE_COLORS = {
  voz_principal: '#0f5fbd',
  segunda_voz: '#087a3f',
  terca_voz: '#8a5a00',
  todos: '#7c3aed',
  solo: '#c2410c',
};

function mod(value, size) {
  return ((value % size) + size) % size;
}

function normalizeTabs(input) {
  return input.replaceAll('\t', '    ');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function hexToRgba(color, alpha) {
  const match = String(color || '').trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return color;

  const channels = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16));
  return `rgba(${channels.join(', ')}, ${alpha})`;
}
