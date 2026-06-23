import { assertSupabaseConfig, supabase } from '../lib/supabase/client.js';

const BUCKET = 'image-link-assets';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

export async function uploadImageLinkFiles(files = [], { onProgress } = {}) {
  assertSupabaseConfig();
  const selectedFiles = [...files];
  if (!selectedFiles.length) return { data: null, error: new Error('Selecione ao menos uma imagem.') };
  if (selectedFiles.length > 10) return { data: null, error: new Error('Selecione no máximo 10 imagens por link.') };

  for (const file of selectedFiles) {
    if (!ALLOWED_TYPES.has(file.type)) return { data: null, error: new Error('Use imagens WebP, PNG ou JPG.') };
    if (file.size > MAX_FILE_SIZE) return { data: null, error: new Error('Cada imagem pode ter no máximo 5 MB.') };
  }
  if (selectedFiles.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) {
    return { data: null, error: new Error('O conjunto de imagens pode ter no máximo 20 MB.') };
  }

  const imageUrls = [];
  for (const [index, file] of selectedFiles.entries()) {
    onProgress?.(index + 1, selectedFiles.length, file.name);
    const extension = getExtension(file);
    const path = `${crypto.randomUUID()}/${String(index + 1).padStart(2, '0')}-${Date.now()}.${extension}`;
    try {
      const { error } = await withTimeout(supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      }), 60000);
      if (error) throw error;
      imageUrls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (error) {
      return { data: null, error: new Error(error.message || `Não foi possível enviar ${file.name}.`) };
    }
  }

  return { data: imageUrls, error: null };
}

export async function createImageLink({ title, expiresAt, maxUses, createdBy, imageUrls }) {
  assertSupabaseConfig();
  return supabase.from('image_links').insert({
    title,
    token: createToken(),
    image_urls: imageUrls,
    expires_at: expiresAt,
    max_uses: maxUses || null,
    created_by: createdBy,
  }).select().single();
}

export async function listImageLinks() {
  assertSupabaseConfig();
  return supabase.from('image_links').select('*').order('created_at', { ascending: false });
}

export async function revokeImageLink(id) {
  assertSupabaseConfig();
  return supabase.from('image_links').update({ revoked_at: new Date().toISOString() }).eq('id', id).select().single();
}

export async function getPublicImageLinkData(token) {
  assertSupabaseConfig();
  const { data, error } = await supabase.rpc('get_public_image_link_data', { p_token: token });
  if (error) return { data: null, error };
  if (!data?.valid) return { data: null, error: new Error('Este link expirou ou não está mais disponível.') };
  return { data: { title: data.title, images: data.images || [] }, error: null };
}

function getExtension(file) {
  const byName = file.name.split('.').pop()?.toLowerCase();
  return byName === 'jpeg' ? 'jpg' : byName || 'webp';
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function withTimeout(promise, milliseconds) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('O envio demorou mais de um minuto. Verifique a conexão e tente novamente.')), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}
