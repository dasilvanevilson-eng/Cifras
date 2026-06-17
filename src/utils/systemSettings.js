import { DEFAULT_SYSTEM_SETTINGS } from '../services/settingsService.js';

const MONO_FONT_STACKS = {
  ibm_plex_mono: "'IBM Plex Mono', 'Cascadia Mono', 'Segoe UI Mono', 'Courier New', monospace",
  ui_monospace: "ui-monospace, 'SFMono-Regular', 'Cascadia Mono', 'Segoe UI Mono', monospace",
  courier_prime: "'Courier Prime', 'Courier New', Courier, monospace",
  source_code: "'Source Code Pro', 'Cascadia Mono', 'Courier New', monospace",
  jetbrains_mono: "'JetBrains Mono', 'Cascadia Mono', 'Courier New', monospace",
};

const LIGHT_THEME_VARS = {
  '--color-bg': '#f1f5f2',
  '--color-bg-soft': '#e7eee9',
  '--color-surface': '#ffffff',
  '--color-surface-raised': '#f9fbf8',
  '--color-panel': '#101916',
  '--color-panel-soft': '#1f302a',
  '--color-border': '#c5d1c8',
  '--color-border-strong': '#8fa196',
  '--color-text': '#111a17',
  '--color-text-muted': '#43544d',
  '--color-primary-strong': '#084d43',
  '--color-primary-soft': '#dcefe8',
  '--color-accent-soft': '#fff2df',
  '--color-info': '#2458b8',
  '--color-success': '#166b3c',
  '--color-danger': '#a8322e',
  '--color-danger-soft': '#fff0ed',
};

const DARK_THEME_VARS = {
  '--color-bg': '#0b100e',
  '--color-bg-soft': '#111915',
  '--color-surface': '#18211d',
  '--color-surface-raised': '#202b25',
  '--color-panel': '#f4fbf7',
  '--color-panel-soft': '#d9e8df',
  '--color-border': '#46574e',
  '--color-border-strong': '#6f8278',
  '--color-text': '#f4fbf7',
  '--color-text-muted': '#c3d0c8',
  '--color-primary-strong': '#9de2d3',
  '--color-primary-soft': '#13392f',
  '--color-accent': '#ffb765',
  '--color-accent-soft': '#3e2815',
  '--color-info': '#9bbcff',
  '--color-success': '#8bd7a6',
  '--color-danger': '#ff9a91',
  '--color-danger-soft': '#411f1d',
};

export function applySystemSettings(settings = {}) {
  const nextSettings = {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
  };
  const root = document.documentElement;
  const themeMode = nextSettings.theme_mode || DEFAULT_SYSTEM_SETTINGS.theme_mode;

  root.dataset.theme = themeMode;
  root.dataset.effectiveTheme = resolveInterfaceTheme(themeMode);
  root.dataset.interfaceDensity = nextSettings.interface_density || DEFAULT_SYSTEM_SETTINGS.interface_density;
  root.style.setProperty('--color-primary', normalizeColor(nextSettings.primary_color, DEFAULT_SYSTEM_SETTINGS.primary_color));
  root.style.setProperty('--color-primary-strong', normalizeColor(nextSettings.primary_color, DEFAULT_SYSTEM_SETTINGS.primary_color));
  root.style.setProperty('--color-accent', normalizeColor(nextSettings.accent_color, DEFAULT_SYSTEM_SETTINGS.accent_color));
  root.style.setProperty('--chord-color', normalizeColor(nextSettings.chord_color, DEFAULT_SYSTEM_SETTINGS.chord_color));
  root.style.setProperty('--lyrics-execution-font', getMonospaceFontStack(nextSettings.chord_font_family));
  root.style.setProperty('--chords-execution-font', getMonospaceFontStack(nextSettings.chord_font_family));
  root.style.setProperty('--system-chord-font-size', `${normalizeNumber(nextSettings.chord_font_size, DEFAULT_SYSTEM_SETTINGS.chord_font_size, 14, 40)}px`);
  root.style.setProperty('--system-execution-font-size', `${normalizeNumber(nextSettings.execution_font_size, DEFAULT_SYSTEM_SETTINGS.execution_font_size, 18, 64)}px`);

  if (themeMode === 'light') {
    applyThemeVariables(root, LIGHT_THEME_VARS);
  } else if (themeMode === 'dark') {
    applyThemeVariables(root, DARK_THEME_VARS);
  } else {
    clearThemeVariables(root);
  }

  seedPerformanceDefaults(nextSettings);
}

export function getMonospaceFontStack(fontKey) {
  return MONO_FONT_STACKS[fontKey] || MONO_FONT_STACKS[DEFAULT_SYSTEM_SETTINGS.chord_font_family];
}

function applyThemeVariables(root, variables) {
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

function clearThemeVariables(root) {
  [...Object.keys(LIGHT_THEME_VARS), ...Object.keys(DARK_THEME_VARS)].forEach((key) => {
    root.style.removeProperty(key);
  });
}

function seedPerformanceDefaults(settings) {
  setLocalStorageDefault('masterCifras.performanceTheme', resolveExecutionTheme(settings.execution_theme));
  setLocalStorageDefault('masterCifras.performanceFontSize', String(normalizeNumber(settings.execution_font_size, DEFAULT_SYSTEM_SETTINGS.execution_font_size, 18, 64)));
  setLocalStorageDefault('masterCifras.performanceScrollSpeed', String(normalizeNumber(settings.execution_autoscroll_speed, DEFAULT_SYSTEM_SETTINGS.execution_autoscroll_speed, 1, 8)));
  setLocalStorageDefault('masterCifras.performanceTwoColumns', settings.execution_two_columns ? 'true' : 'false');
}

function setLocalStorageDefault(key, value) {
  try {
    if (!window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, value);
    }
  } catch (_error) {
    // Preferencias visuais continuam via CSS mesmo sem localStorage.
  }
}

function resolveExecutionTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveInterfaceTheme(theme) {
  if (theme === 'dark' || theme === 'light') return theme;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
