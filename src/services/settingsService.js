import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

export const DEFAULT_SYSTEM_SETTINGS = {
  app_name: 'Master Cifras',
  login_subtitle: '',
  login_background_url: '/assets/login-background.jpg',
  primary_color: '#1d4f45',
  accent_color: '#c8792b',
  show_app_name_on_login: true,
};

export async function getPublicSystemSettings() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from('system_settings')
    .select('key,value')
    .eq('is_public', true);

  if (error) {
    return { data: { ...DEFAULT_SYSTEM_SETTINGS }, error };
  }

  return { data: normalizeSettings(data), error: null };
}

export async function listSystemSettings() {
  assertSupabaseConfig();

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  return { data: normalizeSettings(data), error: null };
}

export async function saveSystemSettings(settings) {
  assertSupabaseConfig();

  const rows = Object.entries({
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
  }).map(([key, value]) => ({
    key,
    value,
    category: getSettingCategory(key),
    label: getSettingLabel(key),
    description: getSettingDescription(key),
    is_public: true,
  }));

  return supabase
    .from('system_settings')
    .upsert(rows, { onConflict: 'key' })
    .select();
}

export async function uploadLoginBackgroundImage(file) {
  assertSupabaseConfig();

  if (!file) {
    return { data: null, error: new Error('Imagem nao informada.') };
  }

  if (file.type !== 'image/jpeg') {
    return { data: null, error: new Error('Selecione uma imagem .jpg.') };
  }

  const extension = getFileExtension(file.name, file.type);
  const fileName = `login-background-${Date.now()}.${extension}`;
  const filePath = `login/${fileName}`;
  const { error } = await supabase.storage
    .from('system-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    return { data: null, error };
  }

  const { data } = supabase.storage
    .from('system-assets')
    .getPublicUrl(filePath);

  return { data: data.publicUrl, error: null };
}

function normalizeSettings(rows = []) {
  return rows.reduce((settings, row) => ({
    ...settings,
    [row.key]: row.value,
  }), { ...DEFAULT_SYSTEM_SETTINGS });
}

function getSettingCategory(key) {
  return key.includes('color') ? 'theme' : 'login';
}

function getSettingLabel(key) {
  const labels = {
    app_name: 'Nome do sistema',
    login_subtitle: 'Subtitulo do login',
    login_background_url: 'Imagem de fundo do login',
    primary_color: 'Cor principal',
    accent_color: 'Cor de destaque',
    show_app_name_on_login: 'Mostrar nome no login',
  };

  return labels[key] || key;
}

function getSettingDescription(key) {
  const descriptions = {
    app_name: 'Nome exibido na tela inicial e em areas do sistema.',
    login_subtitle: 'Texto curto opcional abaixo do nome do sistema.',
    login_background_url: 'URL publica ou caminho local da imagem de fundo.',
    primary_color: 'Cor principal para futuras personalizacoes visuais.',
    accent_color: 'Cor de destaque para futuras personalizacoes visuais.',
    show_app_name_on_login: 'Controla se o nome do sistema aparece sobre a tela inicial.',
  };

  return descriptions[key] || '';
}

function getFileExtension(fileName, mimeType) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  const mimeExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return mimeExtensions[mimeType] || 'jpg';
}
