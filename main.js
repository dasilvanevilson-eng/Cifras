const menuSection = document.getElementById('menuSection');
const editorSection = document.getElementById('editorSection');
const repertoireSection = document.getElementById('repertoireSection');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const menuActions = document.getElementById('menuActions');
const openEditorMenuBtn = document.getElementById('openEditorMenuBtn');
const openRepertoireMenuBtn = document.getElementById('openRepertoireMenuBtn');
const backToMenuFromEditor = document.getElementById('backToMenuFromEditor');
const backToMenuFromRepertoire = document.getElementById('backToMenuFromRepertoire');

const musicaTitulo = document.getElementById('musicaTitulo');
const musicaTags = document.getElementById('musicaTags');
const inputText = document.getElementById('inputText');
const outputChordPro = document.getElementById('outputChordPro');
const previewModal = document.getElementById('previewModal');
const previewMusica = document.getElementById('previewMusica');
const carregarJSONBtn = document.getElementById('carregarJSONBtn');
const deleteSongBtn = document.getElementById('deleteSongBtn');
const previewBtn = document.getElementById('previewBtn');
const clearEditorBtn = document.getElementById('clearEditorBtn');
const transposeEditorDownBtn = document.getElementById('transposeEditorDownBtn');
const transposeEditorUpBtn = document.getElementById('transposeEditorUpBtn');
const salvarJSONBtn = document.getElementById('salvarJSONBtn');
const songSearchModal = document.getElementById('searchModal');
const songSearchInput = document.getElementById('songSearchInput');
const clearSongSearchBtn = document.getElementById('clearSongSearchBtn');
const songSearchSuggestions = document.getElementById('songSearchSuggestions');
const closeSearchModalBtn = document.getElementById('closeSearchModalBtn');

const refreshRepertoireListBtn = document.getElementById('refreshRepertoireListBtn');
const catalogMomentInput = document.getElementById('catalogMomentInput');
const clearCatalogMomentBtn = document.getElementById('clearCatalogMomentBtn');
const repertoireCatalogSearchInput = document.getElementById('repertoireCatalogSearchInput');
const clearRepertoireCatalogSearchBtn = document.getElementById('clearRepertoireCatalogSearchBtn');
const repertoireBuilder = document.querySelector('.repertoire-builder');
const repertoireSearchWrap = document.querySelector('.repertoire-search-wrap');
const repertoireSongList = document.getElementById('repertoireSongList');
const repertoireList = document.getElementById('repertoireList');
const repertoireLibrary = document.getElementById('repertoireLibrary');
const closeFullscreenBtn = document.getElementById('closeFullscreenBtn');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenTitle = document.getElementById('fullscreenTitle');
const fullscreenViewerText = document.getElementById('fullscreenViewerText');
const fullscreenPrevSongBtn = document.getElementById('fullscreenPrevSongBtn');
const fullscreenNextSongBtn = document.getElementById('fullscreenNextSongBtn');
const fullscreenTransposeDownBtn = document.getElementById('fullscreenTransposeDownBtn');
const fullscreenTransposeUpBtn = document.getElementById('fullscreenTransposeUpBtn');
const fullscreenToggleThemeBtn = document.getElementById('fullscreenToggleThemeBtn');
const fullscreenToggleScrollBtn = document.getElementById('fullscreenToggleScrollBtn');
const fullscreenScrollSpeedInput = document.getElementById('fullscreenScrollSpeed');

let currentSongData = null;
let currentSongIndex = null;
let currentTransposition = 0;
let scrollInterval = null;
let currentTheme = 'dark';
let storedSongsCache = [];
let searchSongsCache = [];
let repertoireItems = [];
let repertoireNames = [];
let activeRepertoireQueue = [];
let activeRepertoirePosition = -1;
let activeRepertoireItemIndex = null;
let draggedRepertoireIndex = null;
let isEditingRepertoire = false;
let isRepertoireSearchOpen = false;
let isSyncingEditorFields = false;
let pendingApprovedRepertoireName = '';

const STORAGE_FILE_NAME = 'Musicas_Json.json';
const REPERTOIRE_FILE_NAME = 'Repertorios_Json.json';
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';
const API_PATHS = {
  songs: '/api/songs',
  repertoire: '/api/repertoire',
};

function showSection(section) {
  menuSection.classList.add('hidden');
  editorSection.classList.add('hidden');
  repertoireSection.classList.add('hidden');
  closeMainMenu();

  if (section === 'menu') {
    menuSection.classList.remove('hidden');
  } else if (section === 'editor') {
    editorSection.classList.remove('hidden');
  } else if (section === 'repertoire') {
    repertoireSection.classList.remove('hidden');
  }
}

function closeMainMenu() {
  menuActions.classList.add('hidden');
  document.body.classList.remove('main-menu-open');
  menuToggleBtn.setAttribute('aria-expanded', 'false');
}

function toggleMainMenu() {
  const isOpen = menuActions.classList.toggle('hidden') === false;
  document.body.classList.toggle('main-menu-open', isOpen);
  menuToggleBtn.setAttribute('aria-expanded', String(isOpen));
}

function closeMainMenuOnOutsideClick(event) {
  if (menuActions.classList.contains('hidden')) return;
  if (event.target.closest('.menu-actions-wrap')) return;
  closeMainMenu();
}

function openEditor() {
  showSection('editor');
  processarParaChordPro();
}

async function openRepertoire() {
  showSection('repertoire');
  await refreshSongList();
  await loadRepertoire();
}

function escapeHtml(texto) {
  return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(texto) {
  return escapeHtml(texto).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isChordLine(line) {
  if (line.trim() === '') {
    return false;
  }

  const words = line.replace(/\t/g, '    ').trim().split(/\s+/);
  const chordRegex = /^[A-G](#|b)?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:M|m|maj|min|dim|aug|sus|add|°|º)?[0-9]*(?:\([^\)]*\))?(?:\/[A-G](#|b)?)?$/i;
  return words.every((word) => chordRegex.test(word));
}

function mergeChordsAndLyrics(chordLine, lyricLine) {
  chordLine = chordLine.replace(/\t/g, '    ');
  lyricLine = lyricLine.replace(/\t/g, '    ');
  let merged = '';
  let lastPos = 0;
  const re = /\S+/g;
  let match;

  while ((match = re.exec(chordLine)) !== null) {
    const pos = match.index;
    const chord = match[0];
    merged += lyricLine.substring(lastPos, pos);
    merged += `[${chord}]`;
    lastPos = pos;
  }

  merged += lyricLine.substring(lastPos);
  return merged;
}

function formatChordLine(line) {
  const re = /\S+/g;
  let result = '';
  let match;
  const FIXED_GAP = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';

  while ((match = re.exec(line)) !== null) {
    result += `[${match[0]}]` + FIXED_GAP;
  }

  return result.trimEnd();
}

function getChordProTitle(text) {
  const match = String(text || '').match(/^\s*\{\s*title\s*:\s*([^}]+)\}\s*$/im);
  return match ? match[1].trim() : '';
}

function removeChordProTitle(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => !/^\s*\{\s*title\s*:/i.test(line.trim()))
    .join('\n')
    .replace(/^(?:\r?\n)+/, '');
}

function convertChordProToPlainText(text) {
  const lines = removeChordProTitle(text).split('\n');
  const output = [];

  for (const line of lines) {
    if (line.trim() === '') {
      output.push('');
      continue;
    }

    const chordLine = [];
    const lyricLine = [];
    let i = 0;

    while (i < line.length) {
      if (line[i] === '[') {
        const endBracket = line.indexOf(']', i + 1);
        if (endBracket === -1) {
          lyricLine.push(line[i]);
          i += 1;
          continue;
        }

        const chord = line.slice(i + 1, endBracket);
        const pos = lyricLine.length;
        while (chordLine.length < pos) chordLine.push(' ');
        for (let j = 0; j < chord.length; j += 1) {
          chordLine[pos + j] = chord[j];
        }
        i = endBracket + 1;
      } else {
        lyricLine.push(line[i]);
        if (chordLine.length <= lyricLine.length - 1) {
          chordLine[lyricLine.length - 1] = chordLine[lyricLine.length - 1] || ' ';
        }
        i += 1;
      }
    }

    const chords = chordLine.join('').trimEnd();
    const lyrics = lyricLine.join('').trimEnd();
    if (chords) output.push(chords);
    output.push(lyrics);
  }

  return output.join('\n').replace(/\n+$/, '');
}

function processarParaChordPro() {
  if (isSyncingEditorFields) return;

  const texto = inputText.value;
  const linhas = texto.split('\n');
  const resultado = [];

  for (let i = 0; i < linhas.length; i += 1) {
    const linhaAtual = linhas[i];
    const proximaLinha = linhas[i + 1] || '';

    if (isChordLineAuto(linhaAtual) && !isChordLineAuto(proximaLinha) && proximaLinha.trim() !== '') {
      resultado.push(insertChordsInLine(linhaAtual, proximaLinha.toUpperCase()));
      i += 1;
    } else {
      resultado.push(isChordLineAuto(linhaAtual) ? convertChordTokensInLine(linhaAtual) : linhaAtual.toUpperCase());
    }
  }

  isSyncingEditorFields = true;
  outputChordPro.value = resultado.join('\n');
  isSyncingEditorFields = false;
  atualizarPreview();
}

function processarParaTextoNormal() {
  if (isSyncingEditorFields) return;

  const title = getChordProTitle(outputChordPro.value);
  const chordProWithoutTitle = removeChordProTitle(outputChordPro.value);
  const plainText = convertChordProToPlainText(chordProWithoutTitle);

  isSyncingEditorFields = true;
  if (title) {
    musicaTitulo.value = title;
  }
  if (outputChordPro.value !== chordProWithoutTitle) {
    outputChordPro.value = chordProWithoutTitle;
  }
  inputText.value = plainText;
  isSyncingEditorFields = false;
  atualizarPreview();
}

function atualizarPreview() {
  const chordPro = removeChordProTitle(outputChordPro.value);
  const linhas = chordPro.split('\n');
  let htmlFinal = '';

  linhas.forEach((linha) => {
    if (linha.startsWith('{title:')) {
      return;
    }

    if (linha.trim() === '') {
      htmlFinal += '<div class="linha-vazia"></div>';
      return;
    }

    const regex = /\[([^\]]+)\]/g;
    let ultimoIndice = 0;
    let match;
    let lineHtml = '';

    while ((match = regex.exec(linha)) !== null) {
      const acorde = match[1];
      const textoAntes = linha.substring(ultimoIndice, match.index);
      lineHtml += escapeHtml(textoAntes);
      ultimoIndice = regex.lastIndex;
      const nextChordIndex = linha.indexOf('[', ultimoIndice);
      const lyricEnd = nextChordIndex === -1 ? linha.length : nextChordIndex;
      const lyricPart = linha.substring(ultimoIndice, lyricEnd);
      lineHtml += `<span class="preview-chord-word"><span class="preview-chord">${escapeHtml(acorde)}</span><span>${escapeHtml(lyricPart || '\u00A0')}</span></span>`;
      ultimoIndice = lyricEnd;
    }

    lineHtml += escapeHtml(linha.substring(ultimoIndice));
    htmlFinal += `<div class="bloco-musica">${lineHtml}</div>`;
  });

  previewMusica.innerHTML = htmlFinal;
}

function togglePreview() {
  previewModal.classList.toggle('hidden');
  updateOverlayLock();
}

function fecharPreview(event) {
  if (event.target.id === 'previewModal') {
    togglePreview();
  }
}

async function readStorageSongs() {
  return requestJson(API_PATHS.songs, null, 'Não foi possível carregar o arquivo de músicas pelo backend.');
}

async function writeStorageSongs(songs) {
  await requestJson(API_PATHS.songs, null, 'Não foi possível salvar o arquivo de músicas pelo backend.', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(songs),
  });
}

async function requestJson(path, fallback, errorMessage, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      ...options,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `${response.status} ${response.statusText}`);
    }
    return response.status === 204 ? null : response.json();
  } catch (error) {
    if (fallback !== null) return fallback;
    throw new Error(`${errorMessage} ${error.message || ''}`.trim());
  }
}

async function salvarJSON() {
  const titulo = musicaTitulo.value.trim();
  const cifraOriginal = inputText.value.trim();
  const chordPro = outputChordPro.value.trim();

  if (!titulo) {
    alert('Informe o título da música antes de salvar.');
    musicaTitulo.focus();
    return;
  }

  if (!cifraOriginal && !chordPro) {
    alert('Cole a cifra ou preencha o texto em formato ChordPro antes de salvar.');
    inputText.focus();
    return;
  }

  const dados = {
    titulo,
    tags: musicaTags.value.trim(),
    cifraOriginal: inputText.value,
    chordPro: outputChordPro.value,
  };

  try {
    const songs = await readStorageSongs();
    const duplicateTitle = songs.some((song, index) => (
      index !== currentSongIndex &&
      normalizeSearchText(getSongTitle(song)) === normalizeSearchText(titulo)
    ));

    if (duplicateTitle) {
      alert('Já existe uma música cadastrada com esse título.');
      musicaTitulo.focus();
      return;
    }

    let action = 'adicionada';

    if (currentSongIndex !== null && currentSongIndex >= 0 && currentSongIndex < songs.length) {
      songs[currentSongIndex] = dados;
      action = 'atualizada';
    } else {
      songs.push(dados);
      currentSongIndex = songs.length - 1;
    }

    await writeStorageSongs(songs);

    alert(`Música ${action} em ${STORAGE_FILE_NAME}.`);
    clearEditorData();
    await refreshSongList();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar no arquivo existente.');
  }
}

function clearEditorData() {
  currentSongData = null;
  currentSongIndex = null;
  musicaTitulo.value = '';
  musicaTags.value = '';
  inputText.value = '';
  outputChordPro.value = '';
  processarParaChordPro();
}

function clearEditorFields() {
  const hasContent = musicaTitulo.value.trim() ||
    musicaTags.value.trim() ||
    inputText.value.trim() ||
    outputChordPro.value.trim();

  if (hasContent && !window.confirm('Limpar todos os campos do editor?')) return;
  clearEditorData();
  musicaTitulo.focus();
}

function transposeEditorSong(steps) {
  if (!inputText.value.trim() && !outputChordPro.value.trim()) {
    alert('Cole a cifra ou preencha o texto em formato ChordPro para transpor.');
    inputText.focus();
    return;
  }

  if (!outputChordPro.value.trim()) {
    processarParaChordPro();
  }

  isSyncingEditorFields = true;
  outputChordPro.value = transposeChordProText(outputChordPro.value, steps);
  isSyncingEditorFields = false;
  processarParaTextoNormal();
}

async function deleteSong() {
  if (currentSongIndex === null) {
    alert('Nenhuma música carregada para excluir.');
    return;
  }

  const confirmed = window.confirm('Tem certeza que deseja excluir esta música do arquivo?');
  if (!confirmed) return;

  try {
    const songs = await readStorageSongs();
    if (currentSongIndex < 0 || currentSongIndex >= songs.length) {
      alert('Índice de música inválido. Atualize a lista e tente novamente.');
      return;
    }

    songs.splice(currentSongIndex, 1);
    await writeStorageSongs(songs);

    clearEditorData();
    await refreshSongList();
    alert('Música excluída com sucesso.');
  } catch (err) {
    console.error(err);
    alert('Erro ao excluir a música.');
  }
}

async function findSongByTitle(title) {
  const songs = await readStorageSongs();
  if (!title) return null;
  const normalized = title.trim().toLowerCase();
  return songs.find((song) => (song.titulo || '').trim().toLowerCase() === normalized || (song.titulo || '').trim().toLowerCase().includes(normalized));
}

function filterSearchSongs(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return searchSongsCache.filter((song) => {
    const title = (song.titulo || '').toLowerCase();
    const tags = Array.isArray(song.tags) ? song.tags.join(' ').toLowerCase() : (song.tags || '').toLowerCase();
    return title.includes(normalized) || tags.includes(normalized);
  });
}

function renderSearchSuggestions(query) {
  const matches = filterSearchSongs(query).slice(0, 8);
  if (!matches.length) {
    songSearchSuggestions.innerHTML = '<div class="search-suggestion-item">Nenhuma música encontrada.</div>';
    songSearchSuggestions.classList.remove('hidden');
    return;
  }

  songSearchSuggestions.innerHTML = matches.map((song) => {
    const label = escapeHtml(song.titulo || 'Sem título');
    const tags = escapeHtml(Array.isArray(song.tags) ? song.tags.join(', ') : (song.tags || ''));
    return `<div class="search-suggestion-item" data-index="${song.__index}"><strong>${label}</strong><span>${tags}</span></div>`;
  }).join('');
  songSearchSuggestions.classList.remove('hidden');
}

async function openSearchModal() {
  try {
    searchSongsCache = (await readStorageSongs()).map((song, index) => ({ ...song, __index: index }));
    if (!searchSongsCache.length) {
      alert(`Nenhuma música encontrada em ${STORAGE_FILE_NAME}.`);
      return;
    }
    songSearchInput.value = '';
    songSearchSuggestions.innerHTML = '';
    songSearchSuggestions.classList.add('hidden');
    songSearchModal.classList.remove('hidden');
    updateOverlayLock();
    songSearchInput.focus();
  } catch (error) {
    console.error(error);
    alert('Não foi possível abrir a busca.');
  }
}

function closeSearchModal() {
  songSearchModal.classList.add('hidden');
  updateOverlayLock();
}

function fecharSearchModal(event) {
  if (event.target.id === 'searchModal') {
    closeSearchModal();
  }
}

function selectSearchSong(index) {
  const selected = searchSongsCache.find((song) => song.__index === Number(index));
  if (!selected) return;
  musicaTitulo.value = selected.titulo || '';
  musicaTags.value = selected.tags || '';
  inputText.value = selected.cifraOriginal || convertChordProToPlainText(getSongChordPro(selected));
  loadSongData(selected, selected.__index);
  processarParaChordPro();
  closeSearchModal();
}

async function carregarJSON() {
  await openSearchModal();
}

function formatTitleForFilename(title) {
  const safe = title.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  return safe === '' ? 'musica' : safe;
}

function normalizeLine(line) {
  return line.replace(/\t/g, '    ');
}

function parseChordPositions(line) {
  const normalized = normalizeLine(line);
  const regex = /([A-G](?:#|b)?(?:(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:M|m|maj|min|dim|aug|sus|add|°|º)?[0-9]*(?:\([^\)]*\))?|\+)?(?:\/[A-G](?:#|b)?)?)(?=[^A-Za-z0-9#b\/()]|$)/gi;
  const positions = [];
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    positions.push({ index: match.index, chord: match[1] });
  }

  return positions;
}

function isChordToken(token) {
  const chord = token.trim();
  if (!chord) return false;
  const stripped = chord.replace(/[.,;:!?]+$/u, '');
  const chordRegex = /^[A-G](#|b)?(?:(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:M|m|maj|min|dim|aug|sus|add|°|º)?[0-9]*(?:\([^\)]*\))?|\+)?(\/[A-G](#|b)?)?$/i;
  return chordRegex.test(stripped);
}

function isChordLineAuto(line) {
  const normalized = normalizeLine(line);
  const text = normalized.trim();
  if (!text) return false;
  return text.split(/\s+/).every((token) => isChordToken(token));
}

function convertChordTokensInLine(line) {
  const tokens = line.split(/(\s+)/);
  return tokens
    .map((token) => {
      if (/^\s+$/u.test(token)) return token;
      if (isChordToken(token)) {
        const suffix = token.match(/[.,;:!?]+$/u)?.[0] || '';
        const core = token.replace(/[.,;:!?]+$/u, '');
        return `[${core}]${suffix}`;
      }
      return token;
    })
    .join('');
}

function insertChordsInLine(chordLine, lyricLine) {
  const normalizedChordLine = normalizeLine(chordLine);
  const normalizedLyricLine = normalizeLine(lyricLine);
  const positions = parseChordPositions(normalizedChordLine);
  if (!positions.length) return normalizedLyricLine;
  const output = [...normalizedLyricLine];

  positions.slice().sort((a, b) => b.index - a.index).forEach(({ index, chord }) => {
    const insertPos = Math.min(index, output.length);
    while (output.length < index) {
      output.push(' ');
    }
    const chordText = `[${chord}]`;
    output.splice(insertPos, 0, ...chordText);
  });

  return output.join('');
}

function convertToChordPro(text) {
  const lines = text.split('\n');
  const result = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (isChordLineAuto(line) && i + 1 < lines.length && !isChordLineAuto(lines[i + 1])) {
      result.push(insertChordsInLine(line, lines[i + 1]));
      i += 1;
    } else {
      result.push(isChordLineAuto(line) ? convertChordTokensInLine(line) : convertChordTokensInLine(line));
    }
  }

  return result.join('\n');
}

function transposeChord(chord, steps) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const altNotes = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
  const normalize = (note) => altNotes[note] || note;
  const formatNote = (index, preferFlat) => {
    const sharp = notes[(index + 12) % 12];
    const flatMap = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
    return preferFlat && flatMap[sharp] ? flatMap[sharp] : sharp;
  };

  const transposeRoot = (root) => {
    const preferFlat = root.includes('b');
    const normalized = normalize(root);
    const idx = notes.indexOf(normalized);
    if (idx === -1) return root;
    return formatNote(idx + steps, preferFlat);
  };

  return chord.replace(/(^[A-G](?:#|b)?)(.*)$/i, (match, root, rest) => {
    const slashMatch = rest.match(/(.*)\/(\s*([A-G](?:#|b)?))(.*)$/i);
    if (slashMatch) {
      const prefix = slashMatch[1];
      const bass = slashMatch[3];
      const suffix = slashMatch[4] || '';
      return `${transposeRoot(root)}${prefix}/${transposeRoot(bass)}${suffix}`;
    }
    return `${transposeRoot(root)}${rest}`;
  });
}

function transposeChordProText(text, steps) {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, steps)}]`);
}

function getSongTitle(songData) {
  return songData?.titulo || songData?.title || 'Sem título';
}

function getSongTags(songData) {
  const tags = songData?.tags || '';
  return Array.isArray(tags) ? tags.join(', ') : tags;
}

function getSongChordPro(songData) {
  return songData?.chordPro || songData?.chordpro || '';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compareByTitle(a, b) {
  return getSongTitle(a).localeCompare(getSongTitle(b), 'pt-BR', { sensitivity: 'base' });
}

function songMatchesCatalogSearch(song, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const title = normalizeSearchText(getSongTitle(song));
  const tags = normalizeSearchText(getSongTags(song));
  return title.includes(normalizedQuery) || tags.includes(normalizedQuery);
}

function getSongByRepertoireItem(item) {
  return storedSongsCache.find((song) => song.__index === item.songIndex) ||
    storedSongsCache.find((song) => normalizeSearchText(getSongTitle(song)) === normalizeSearchText(item.title));
}

function getRepertoireName(item) {
  return item?.repertoire || item?.moment || 'Repertório geral';
}

function getExistingRepertoireName(name) {
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return '';
  const foundName = getAllRepertoireNames().find((repertoire) => normalizeSearchText(repertoire) === normalizedName);
  return foundName || '';
}

function getAllRepertoireNames() {
  const names = [];
  repertoireNames.forEach((name) => {
    if (name && !names.some((existing) => normalizeSearchText(existing) === normalizeSearchText(name))) {
      names.push(name);
    }
  });
  repertoireItems.forEach((item) => {
    const name = getRepertoireName(item);
    if (!names.some((existing) => normalizeSearchText(existing) === normalizeSearchText(name))) {
      names.push(name);
    }
  });
  return names.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function normalizeRepertoireData(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      names: data.map((item) => getRepertoireName(item)),
    };
  }

  if (Array.isArray(data?.items)) {
    return {
      items: data.items,
      names: Array.isArray(data.names) ? data.names : data.items.map((item) => getRepertoireName(item)),
    };
  }

  if (Array.isArray(data?.repertorios)) {
    const items = [];
    const names = [];
    data.repertorios.forEach((group) => {
      const repertoire = group?.nome || group?.name || group?.repertoire || '';
      if (!repertoire) return;
      names.push(repertoire);
      const songs = Array.isArray(group.musicas) ? group.musicas : [];
      songs.forEach((song) => {
        items.push({
          repertoire,
          title: song.title || song.titulo || '',
          tags: song.tags || [],
          songIndex: song.songIndex ?? song.indiceMusica ?? null,
          transposition: Number(song.transposition ?? song.transposicao ?? 0),
          note: song.note || song.observacao || '',
        });
      });
    });
    return { items, names };
  }

  return { items: [], names: [] };
}

function buildRepertoireFileData() {
  return {
    repertorios: getAllRepertoireNames().map((name) => ({
      nome: name,
      musicas: repertoireItems
        .filter((item) => normalizeSearchText(getRepertoireName(item)) === normalizeSearchText(name))
        .map((item) => ({
          title: item.title || '',
          tags: item.tags || [],
          songIndex: item.songIndex ?? null,
          transposition: Number(item.transposition || 0),
          note: item.note || '',
        })),
    })),
  };
}

function selectRepertoire(name) {
  catalogMomentInput.value = name;
  isRepertoireSearchOpen = true;
  renderRepertoireLibrary();
  renderRepertoire();
}

function editRepertoire(name) {
  isEditingRepertoire = true;
  selectRepertoire(name);
}

function createRepertoire() {
  const name = catalogMomentInput.value.trim();
  if (!name) {
    alert('Digite o nome do repertório.');
    return;
  }

  const existing = getExistingRepertoireName(name);
  if (existing) {
    selectRepertoire(existing);
    isEditingRepertoire = true;
    renderRepertoire();
    return;
  }

  selectRepertoire(name);
  isEditingRepertoire = true;
  renderRepertoire();
}

function askCreateTypedRepertoire() {
  const name = catalogMomentInput.value.trim();
  if (!name || getExistingRepertoireName(name)) return;
  if (normalizeSearchText(pendingApprovedRepertoireName) === normalizeSearchText(name)) return;

  const cursorPosition = catalogMomentInput.selectionStart ?? name.length;
  const confirmed = window.confirm(`O repertório "${name}" ainda não existe. Deseja criar um novo repertório?`);
  if (confirmed) {
    pendingApprovedRepertoireName = name;
    createRepertoire();
    return;
  }

  window.setTimeout(() => {
    catalogMomentInput.focus();
    catalogMomentInput.setSelectionRange(cursorPosition, cursorPosition);
  }, 0);
}

function openSongFromCatalog(song) {
  activeRepertoireQueue = [];
  activeRepertoirePosition = -1;
  activeRepertoireItemIndex = null;
  fullscreenPrevSongBtn.classList.add('hidden');
  fullscreenNextSongBtn.classList.add('hidden');
  loadSongData(song, song.__index);
  openFullscreenViewer();
}

function getRepertoireItemsByName(name) {
  return repertoireItems.filter((item) => normalizeSearchText(getRepertoireName(item)) === normalizeSearchText(name));
}

function openRepertoireSequence(name, startIndex = 0) {
  const items = getRepertoireItemsByName(name);
  const queue = items.map((item) => ({
    item,
    itemIndex: repertoireItems.indexOf(item),
    song: getSongByRepertoireItem(item),
  })).filter((entry) => entry.song);
  if (!queue.length) {
    alert('Este repertório ainda não tem músicas disponíveis.');
    return;
  }

  activeRepertoireQueue = queue;
  activeRepertoirePosition = Math.min(Math.max(startIndex, 0), queue.length - 1);
  fullscreenPrevSongBtn.classList.remove('hidden');
  fullscreenNextSongBtn.classList.remove('hidden');
  loadActiveRepertoireEntry();
  openFullscreenViewer();
}

function loadActiveRepertoireEntry() {
  const entry = activeRepertoireQueue[activeRepertoirePosition];
  if (!entry) return;
  activeRepertoireItemIndex = entry.itemIndex;
  loadSongData(entry.song, entry.song.__index);
  currentTransposition = Number(entry.item?.transposition || 0);
  renderSongViewer();
}

function showRepertoireSong(offset) {
  if (!activeRepertoireQueue.length) return;
  activeRepertoirePosition += offset;
  if (activeRepertoirePosition < 0) activeRepertoirePosition = activeRepertoireQueue.length - 1;
  if (activeRepertoirePosition >= activeRepertoireQueue.length) activeRepertoirePosition = 0;
  loadActiveRepertoireEntry();
}

async function readBundledRepertoire() {
  const data = await requestJson(API_PATHS.repertoire, null, 'Não foi possível carregar o arquivo de repertórios pelo backend.');
  return normalizeRepertoireData(data);
}

async function readRepertoireFile() {
  return readBundledRepertoire();
}

async function writeRepertoireFile() {
  await requestJson(API_PATHS.repertoire, null, 'Não foi possível salvar o arquivo de repertórios pelo backend.', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(buildRepertoireFileData()),
  });
}

async function loadRepertoire() {
  try {
    const data = await readRepertoireFile();
    repertoireItems = Array.isArray(data.items) ? data.items : [];
    repertoireNames = Array.isArray(data.names) ? data.names : [];
  } catch (error) {
    console.error(error);
    repertoireItems = [];
    repertoireNames = [];
  }
  renderRepertoireLibrary();
  renderRepertoire();
}

async function saveRepertoire() {
  repertoireNames = getAllRepertoireNames();
  try {
    await writeRepertoireFile();
  } catch (error) {
    console.error(error);
    alert(`Não foi possível salvar o repertório em ${REPERTOIRE_FILE_NAME}.`);
  }
}

async function saveActiveRepertoireTransposition() {
  if (activeRepertoireItemIndex === null) return;
  const item = repertoireItems[activeRepertoireItemIndex];
  if (!item) return;
  item.transposition = currentTransposition;
  await saveRepertoire();
  renderRepertoire();
}

async function deleteRepertoireByName(name) {
  const normalizedName = normalizeSearchText(name);
  if (!normalizedName) return;
  repertoireItems = repertoireItems.filter((item) => normalizeSearchText(getRepertoireName(item)) !== normalizedName);
  repertoireNames = repertoireNames.filter((entry) => normalizeSearchText(entry) !== normalizedName);
  await saveRepertoire();
}

async function addSongToRepertoire(song) {
  isEditingRepertoire = true;
  const typedRepertoire = catalogMomentInput.value.trim() || 'Repertório geral';
  const existingRepertoire = getExistingRepertoireName(typedRepertoire);
  const repertoire = existingRepertoire || typedRepertoire;

  if (!existingRepertoire) {
    const alreadyApproved = normalizeSearchText(pendingApprovedRepertoireName) === normalizeSearchText(repertoire);
    const confirmed = alreadyApproved || window.confirm(`O repertório "${repertoire}" ainda não existe. Deseja criar um novo repertório?`);
    if (!confirmed) return;
  }

  catalogMomentInput.value = repertoire;
  pendingApprovedRepertoireName = '';
  if (!repertoireNames.some((name) => normalizeSearchText(name) === normalizeSearchText(repertoire))) {
    repertoireNames.push(repertoire);
  }
  const title = getSongTitle(song);
  const exists = repertoireItems.some((item) => normalizeSearchText(getRepertoireName(item)) === normalizeSearchText(repertoire) && normalizeSearchText(item.title) === normalizeSearchText(title));
  if (exists) return;

  repertoireItems.push({
    repertoire,
    title,
    tags: getSongTags(song),
    songIndex: song.__index,
    transposition: 0,
    note: '',
  });
  await saveRepertoire();
  renderRepertoireLibrary();
  renderRepertoire();
}

function renderRepertoireLibrary() {
  if (!repertoireLibrary) return;

  const query = normalizeSearchText(catalogMomentInput.value);
  if (!query && !isRepertoireSearchOpen) {
    repertoireLibrary.innerHTML = '';
    return;
  }

  const names = getAllRepertoireNames().filter((name) => !query || normalizeSearchText(name).includes(query));

  if (!names.length) {
    repertoireLibrary.innerHTML = '';
    return;
  }

  const selected = getExistingRepertoireName(catalogMomentInput.value);
  repertoireLibrary.innerHTML = names.map((name) => `
    <div class="repertoire-library-item ${normalizeSearchText(name) === normalizeSearchText(selected) ? 'active-repertoire' : ''}">
      <button type="button" data-action="edit-repertoire" data-repertoire-name="${escapeAttribute(name)}">${escapeHtml(name)}</button>
      <button type="button" class="repertoire-run-btn" data-action="run-repertoire" data-repertoire-name="${escapeAttribute(name)}" aria-label="Executar ${escapeAttribute(name)}">▶</button>
    </div>
  `).join('');
}

function renderRepertoire() {
  if (!repertoireList) return;

  if (!catalogMomentInput.value.trim()) {
    repertoireList.innerHTML = '';
    return;
  }

  if (!repertoireItems.length) {
    repertoireList.innerHTML = '';
    return;
  }

  const selectedRepertoire = getExistingRepertoireName(catalogMomentInput.value);
  if (!selectedRepertoire) {
    repertoireList.innerHTML = '';
    return;
  }

  if (selectedRepertoire && !isEditingRepertoire) {
    repertoireList.innerHTML = '';
    return;
  }

  const visibleItems = selectedRepertoire
    ? repertoireItems.filter((item) => normalizeSearchText(getRepertoireName(item)) === normalizeSearchText(selectedRepertoire))
    : repertoireItems;

  if (!visibleItems.length) {
    repertoireList.innerHTML = '';
    return;
  }

  const groups = visibleItems.reduce((acc, item) => {
    const index = repertoireItems.indexOf(item);
    const repertoireName = getRepertoireName(item);
    if (!acc[repertoireName]) acc[repertoireName] = [];
    acc[repertoireName].push({ ...item, index });
    return acc;
  }, {});

  repertoireList.innerHTML = Object.entries(groups).map(([repertoire, items]) => `
    <section class="repertoire-group">
      <h4>${escapeHtml(repertoire)}</h4>
      ${items.map((item) => `
        <div class="repertoire-item" draggable="true" data-index="${item.index}">
          <button type="button" data-action="open-repertoire" data-index="${item.index}">${escapeHtml(item.title)}${Number(item.transposition || 0) ? ` (${Number(item.transposition) > 0 ? '+' : ''}${Number(item.transposition)})` : ''}</button>
          <input class="repertoire-note-input" type="text" data-action="update-note" data-index="${item.index}" value="${escapeAttribute(item.note || '')}" placeholder="Observação" aria-label="Observação para ${escapeAttribute(item.title)}" />
          <button type="button" class="remove-repertoire-btn" data-action="remove-repertoire" data-index="${item.index}">-</button>
        </div>
      `).join('')}
    </section>
  `).join('');
}

function renderSongList(targetList, songs, includeRepertoireButton) {
  if (!songs.length) {
    targetList.innerHTML = '<li>Nenhuma música encontrada.</li>';
    return;
  }

  const shouldShowRepertoireButton = includeRepertoireButton && !isRepertoireMusicSearchFocused();
  const sortedSongs = [...songs].sort(compareByTitle);

  targetList.innerHTML = '';
  sortedSongs.forEach((song) => {
    const item = document.createElement('li');
    const title = document.createElement('span');
    title.textContent = getSongTitle(song);
    item.append(title);

    if (shouldShowRepertoireButton) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'add-repertoire-btn';
      addButton.textContent = '+';
      addButton.setAttribute('aria-label', 'Adicionar ao repertório');
      addButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        await addSongToRepertoire(song);
      });
      item.append(addButton);
    }

    item.addEventListener('click', () => {
      document.querySelectorAll('.song-list li').forEach((el) => el.classList.remove('active-song'));
      item.classList.add('active-song');
      openSongFromCatalog(song);
    });
    targetList.appendChild(item);
  });
}

function filterRepertoireCatalogSongs() {
  const query = repertoireCatalogSearchInput.value;
  renderSongList(repertoireSongList, storedSongsCache.filter((song) => songMatchesCatalogSearch(song, query)), true);
}

function isRepertoireMusicSearchFocused() {
  return document.activeElement === repertoireCatalogSearchInput;
}

function clearRepertoireSearch() {
  if (!catalogMomentInput.value) return;
  catalogMomentInput.value = '';
  isRepertoireSearchOpen = false;
  isEditingRepertoire = false;
  renderRepertoireLibrary();
  renderRepertoire();
}

function clearMusicSearch() {
  if (!repertoireCatalogSearchInput.value) return;
  repertoireCatalogSearchInput.value = '';
  filterRepertoireCatalogSongs();
}

function updateRepertoireSearchLayout(activeInput = null) {
  const hasRepertoireQuery = catalogMomentInput.value.trim() !== '';
  const hasMusicQuery = repertoireCatalogSearchInput.value.trim() !== '';
  repertoireBuilder.classList.toggle('is-repertoire-active', activeInput === catalogMomentInput && hasRepertoireQuery);
  repertoireBuilder.classList.toggle('is-music-active', activeInput === repertoireCatalogSearchInput && hasMusicQuery);
}

function renderChordAboveLyrics(text) {
  const lines = text.split('\n');
  const output = [];

  for (const line of lines) {
    if (/^\{\s*title:/i.test(line.trim())) {
      continue;
    }

    if (line.trim() === '') {
      output.push('', '');
      continue;
    }

    const chordLine = [];
    const lyricLine = [];
    let i = 0;

    while (i < line.length) {
      if (line[i] === '[') {
        const endBracket = line.indexOf(']', i + 1);
        if (endBracket === -1) {
          if (lyricLine.length >= chordLine.length) chordLine.push(' ');
          lyricLine.push(line[i]);
          i += 1;
          continue;
        }
        const chord = line.slice(i + 1, endBracket);
        const pos = lyricLine.length;
        while (chordLine.length < pos) chordLine.push(' ');
        for (let j = 0; j < chord.length; j += 1) {
          chordLine[pos + j] = chord[j];
        }
        i = endBracket + 1;
      } else {
        lyricLine.push(line[i]);
        if (chordLine.length <= lyricLine.length - 1) {
          chordLine[lyricLine.length - 1] = chordLine[lyricLine.length - 1] || ' ';
        }
        i += 1;
      }
    }

    while (chordLine.length < lyricLine.length) chordLine.push(' ');
    const chordHtml = chordLine.join('').replace(/([^\s]+)/g, '<span class="chord-span">$1</span>');
    output.push(chordHtml, escapeHtml(lyricLine.join('')));
  }

  return output.join('<br>');
}

function renderSongViewer() {
  if (!currentSongData) {
    fullscreenTitle.textContent = 'Visualização em tela inteira';
    fullscreenViewerText.innerHTML = '';
    return;
  }

  const transposed = transposeChordProText(currentSongData.chordpro || '', currentTransposition);
  const rendered = renderChordAboveLyrics(transposed);
  const activeNote = activeRepertoireItemIndex !== null ? (repertoireItems[activeRepertoireItemIndex]?.note || '').trim() : '';
  fullscreenTitle.textContent = `${currentSongData.title || 'Sem título'}${activeNote ? ` - ${activeNote}` : ''}`;
  fullscreenViewerText.innerHTML = rendered;
}

function updateScrollButton() {
  const label = scrollInterval ? 'Parar rolagem' : 'Iniciar rolagem';
  fullscreenToggleScrollBtn.textContent = scrollInterval ? 'Ⅱ' : '▶';
  fullscreenToggleScrollBtn.setAttribute('aria-label', label);
  fullscreenToggleScrollBtn.title = label;
}

function startAutoScroll() {
  stopAutoScroll();
  const speedValue = Number(fullscreenScrollSpeedInput.value);
  if (speedValue <= Number(fullscreenScrollSpeedInput.min || 1)) {
    updateScrollButton();
    return;
  }
  const intervalMs = Math.max(90, 900 / speedValue);
  scrollInterval = window.setInterval(() => {
    fullscreenViewerText.scrollBy({ top: 1, left: 0, behavior: 'auto' });
  }, intervalMs);
  updateScrollButton();
}

function stopAutoScroll() {
  if (scrollInterval) {
    window.clearInterval(scrollInterval);
    scrollInterval = null;
  }
  updateScrollButton();
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light', currentTheme === 'light');
  updateThemeButtons();
}

function updateThemeButtons() {
  const label = currentTheme === 'light' ? 'Modo Escuro' : 'Modo Claro';
  fullscreenToggleThemeBtn.textContent = currentTheme === 'light' ? '◑' : '●';
  fullscreenToggleThemeBtn.setAttribute('aria-label', label);
  fullscreenToggleThemeBtn.title = label;
}

function openFullscreenViewer() {
  fullscreenOverlay.classList.remove('hidden');
  updateOverlayLock();
}

function closeFullscreenViewer() {
  fullscreenOverlay.classList.add('hidden');
  activeRepertoireItemIndex = null;
  updateOverlayLock();
}

function updateOverlayLock() {
  const hasOpenOverlay = !previewModal.classList.contains('hidden') ||
    !songSearchModal.classList.contains('hidden') ||
    !fullscreenOverlay.classList.contains('hidden');
  document.body.classList.toggle('overlay-open', hasOpenOverlay);
}

async function loadSongList() {
  repertoireSongList.innerHTML = '<li>Carregando...</li>';

  try {
    const songs = await readStorageSongs();
    storedSongsCache = songs.map((song, index) => ({ ...song, __index: index }));

    if (!storedSongsCache.length) {
      repertoireSongList.innerHTML = `<li>Nenhuma música encontrada em ${STORAGE_FILE_NAME}.</li>`;
      return;
    }

    filterRepertoireCatalogSongs();
  } catch (error) {
    repertoireSongList.innerHTML = `<li>Não foi possível abrir ${STORAGE_FILE_NAME}. Verifique a configuração da API.</li>`;
    storedSongsCache = [];
  }
}

async function readBundledSongs() {
  return readStorageSongs();
}

function loadSongData(songData, index = null) {
  currentSongData = {
    ...songData,
    title: getSongTitle(songData),
    tags: Array.isArray(songData.tags) ? songData.tags : (songData.tags ? [songData.tags] : []),
    chordpro: getSongChordPro(songData),
  };
  currentSongIndex = index;
  currentTransposition = 0;
  renderSongViewer();
}

async function refreshSongList() {
  await loadSongList();
}

function transposeChordProText(text, steps) {
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChord(chord, steps)}]`);
}

function loadTheme() {
  currentTheme = 'dark';
  document.body.classList.toggle('light', currentTheme === 'light');
  updateThemeButtons();
}

menuToggleBtn.addEventListener('click', toggleMainMenu);
document.addEventListener('click', closeMainMenuOnOutsideClick);
openEditorMenuBtn.addEventListener('click', openEditor);
openRepertoireMenuBtn.addEventListener('click', openRepertoire);
backToMenuFromEditor.addEventListener('click', () => showSection('menu'));
backToMenuFromRepertoire.addEventListener('click', () => showSection('menu'));
inputText.addEventListener('input', processarParaChordPro);
musicaTitulo.addEventListener('input', processarParaChordPro);
outputChordPro.addEventListener('input', processarParaTextoNormal);
carregarJSONBtn.addEventListener('click', carregarJSON);
deleteSongBtn.addEventListener('click', deleteSong);
previewBtn.addEventListener('click', togglePreview);
clearEditorBtn.addEventListener('click', clearEditorFields);
transposeEditorDownBtn.addEventListener('click', () => transposeEditorSong(-1));
transposeEditorUpBtn.addEventListener('click', () => transposeEditorSong(1));
salvarJSONBtn.addEventListener('click', salvarJSON);
searchSongsCache = [];

songSearchInput.addEventListener('input', (event) => {
  renderSearchSuggestions(event.target.value);
});
clearSongSearchBtn.addEventListener('click', () => {
  songSearchInput.value = '';
  songSearchSuggestions.innerHTML = '';
  songSearchSuggestions.classList.add('hidden');
  songSearchInput.focus();
});

songSearchSuggestions.addEventListener('click', (event) => {
  const item = event.target.closest('.search-suggestion-item');
  if (!item) return;
  selectSearchSong(item.dataset.index || '');
});

closeSearchModalBtn.addEventListener('click', closeSearchModal);
songSearchModal.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSearchModal();
  }
});

repertoireCatalogSearchInput.addEventListener('input', () => {
  updateRepertoireSearchLayout(repertoireCatalogSearchInput);
  filterRepertoireCatalogSongs();
});
repertoireCatalogSearchInput.addEventListener('focus', () => {
  clearRepertoireSearch();
  updateRepertoireSearchLayout(repertoireCatalogSearchInput);
  filterRepertoireCatalogSongs();
});
repertoireCatalogSearchInput.addEventListener('blur', () => {
  filterRepertoireCatalogSongs();
});
clearRepertoireCatalogSearchBtn.addEventListener('click', () => {
  repertoireCatalogSearchInput.value = '';
  updateRepertoireSearchLayout();
  filterRepertoireCatalogSongs();
  repertoireCatalogSearchInput.focus();
});
catalogMomentInput.addEventListener('input', () => {
  isRepertoireSearchOpen = true;
  updateRepertoireSearchLayout(catalogMomentInput);
  renderRepertoireLibrary();
  renderRepertoire();
});
catalogMomentInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  askCreateTypedRepertoire();
});
catalogMomentInput.addEventListener('change', askCreateTypedRepertoire);
clearCatalogMomentBtn.addEventListener('mousedown', (event) => {
  event.preventDefault();
});
clearCatalogMomentBtn.addEventListener('click', () => {
  catalogMomentInput.value = '';
  isRepertoireSearchOpen = false;
  isEditingRepertoire = false;
  updateRepertoireSearchLayout();
  renderRepertoireLibrary();
  renderRepertoire();
  catalogMomentInput.blur();
});
catalogMomentInput.addEventListener('focus', () => {
  clearMusicSearch();
  isRepertoireSearchOpen = true;
  updateRepertoireSearchLayout(catalogMomentInput);
  renderRepertoireLibrary();
});
catalogMomentInput.addEventListener('mouseenter', () => {
  isRepertoireSearchOpen = true;
  renderRepertoireLibrary();
});
repertoireSearchWrap.addEventListener('mouseleave', () => {
  isRepertoireSearchOpen = false;
  renderRepertoireLibrary();
});
repertoireLibrary.addEventListener('mousedown', (event) => {
  event.preventDefault();
});
catalogMomentInput.addEventListener('blur', () => {
  window.setTimeout(() => {
    if (!repertoireSearchWrap.matches(':hover') && document.activeElement !== catalogMomentInput) {
      isRepertoireSearchOpen = false;
      renderRepertoireLibrary();
    }
  }, 150);
});
repertoireLibrary.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action][data-repertoire-name]');
  if (!button) return;
  const name = button.dataset.repertoireName;
  if (button.dataset.action === 'run-repertoire') {
    selectRepertoire(name);
    openRepertoireSequence(name);
    return;
  }
  editRepertoire(name);
});
repertoireList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (button.dataset.action === 'remove-repertoire') {
    isEditingRepertoire = true;
    const removedItem = repertoireItems[index];
    const repertoireName = getRepertoireName(removedItem);
    repertoireItems.splice(index, 1);
    const hasRemainingItems = getRepertoireItemsByName(repertoireName).length > 0;
    if (!hasRemainingItems) {
      await deleteRepertoireByName(repertoireName);
      catalogMomentInput.value = '';
      isEditingRepertoire = false;
    } else {
      await saveRepertoire();
    }
    renderRepertoireLibrary();
    renderRepertoire();
    return;
  }

  const item = repertoireItems[index];
  const repertoireName = getRepertoireName(item);
  const sequenceIndex = getRepertoireItemsByName(repertoireName).findIndex((entry) => entry === item);
  openRepertoireSequence(repertoireName, sequenceIndex);
});
repertoireList.addEventListener('input', async (event) => {
  const input = event.target.closest('input[data-action="update-note"]');
  if (!input) return;
  const index = Number(input.dataset.index);
  if (!repertoireItems[index]) return;
  repertoireItems[index].note = input.value;
  await saveRepertoire();
});
repertoireList.addEventListener('dragstart', (event) => {
  const item = event.target.closest('.repertoire-item');
  if (!item) return;
  draggedRepertoireIndex = Number(item.dataset.index);
  item.classList.add('dragging');
});
repertoireList.addEventListener('dragend', (event) => {
  event.target.closest('.repertoire-item')?.classList.remove('dragging');
  draggedRepertoireIndex = null;
});
repertoireList.addEventListener('dragover', (event) => {
  if (draggedRepertoireIndex === null) return;
  event.preventDefault();
});
repertoireList.addEventListener('drop', async (event) => {
  const target = event.target.closest('.repertoire-item');
  if (!target || draggedRepertoireIndex === null) return;
  event.preventDefault();

  const targetIndex = Number(target.dataset.index);
  if (targetIndex === draggedRepertoireIndex) return;

  const draggedItem = repertoireItems[draggedRepertoireIndex];
  const targetItem = repertoireItems[targetIndex];
  if (normalizeSearchText(getRepertoireName(draggedItem)) !== normalizeSearchText(getRepertoireName(targetItem))) return;

  repertoireItems.splice(draggedRepertoireIndex, 1);
  isEditingRepertoire = true;
  const insertIndex = repertoireItems.indexOf(targetItem);
  repertoireItems.splice(insertIndex, 0, draggedItem);
  await saveRepertoire();
  renderRepertoire();
});
refreshRepertoireListBtn.addEventListener('click', async () => {
  await refreshSongList();
  await loadRepertoire();
});
fullscreenTransposeDownBtn.addEventListener('click', () => {
  currentTransposition -= 1;
  renderSongViewer();
  saveActiveRepertoireTransposition();
});
fullscreenTransposeUpBtn.addEventListener('click', () => {
  currentTransposition += 1;
  renderSongViewer();
  saveActiveRepertoireTransposition();
});
fullscreenToggleThemeBtn.addEventListener('click', toggleTheme);
fullscreenPrevSongBtn.addEventListener('click', () => showRepertoireSong(-1));
fullscreenNextSongBtn.addEventListener('click', () => showRepertoireSong(1));
fullscreenToggleScrollBtn.addEventListener('click', () => {
  if (scrollInterval) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
});
closeFullscreenBtn.addEventListener('click', closeFullscreenViewer);
fullscreenScrollSpeedInput.addEventListener('input', () => {
  if (scrollInterval) {
    startAutoScroll();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  showSection('menu');
  loadTheme();
  await loadRepertoire();
});
