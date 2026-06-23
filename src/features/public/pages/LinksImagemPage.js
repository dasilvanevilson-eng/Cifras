import { canManageUsers } from '../../auth/roles.js';
import {
  createImageLink,
  listImageLinks,
  revokeImageLink,
  uploadImageLinkFiles,
} from '../../../services/imageLinksService.js';

export async function LinksImagemPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page image-links-page';
  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem criar links de imagem.</div>';
    return page;
  }

  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Link Imagem</h1>
        <p data-page-info>Crie uma galeria temporária para compartilhar imagens em uma tela pública limpa.</p>
      </div>
    </header>
    <section class="image-links-layout">
      <form class="form image-link-form">
        <h2>Novo link de imagens</h2>
        <label>Nome do link<input name="title" maxlength="80" required placeholder="Ex.: Escala do culto"></label>
        <label class="image-link-file-field">
          Imagens
          <input name="images" type="file" accept="image/webp,image/png,image/jpeg" multiple required>
          <small>Recomendado: WebP para imagens leves. Use PNG para textos nítidos ou transparência. JPG também é aceito. Máximo: 5 MB por imagem e 20 MB no total.</small>
        </label>
        <div class="image-link-preview" data-role="preview" hidden></div>
        <label>Válido até<input name="expires_at" type="datetime-local" required></label>
        <label>Limite de acessos<input name="max_uses" type="number" min="1" step="1" placeholder="Sem limite"></label>
        <div class="form-actions field-full"><button class="button" type="submit">Criar link de imagens</button></div>
        <p class="form-message field-full" aria-live="polite"></p>
      </form>
      <section class="image-links-list-panel"><h2>Links criados</h2><div data-role="list"><p class="page-status">Carregando links...</p></div></section>
    </section>
  `;

  const form = page.querySelector('.image-link-form');
  const filesInput = form.elements.images;
  const preview = page.querySelector('[data-role="preview"]');
  const message = form.querySelector('.form-message');
  const submit = form.querySelector('button[type="submit"]');
  const list = page.querySelector('[data-role="list"]');
  form.elements.expires_at.value = getDefaultExpiresAt();

  filesInput.addEventListener('change', () => renderPreview(filesInput.files, preview));

  async function loadLinks() {
    const { data, error } = await listImageLinks();
    if (error) {
      list.innerHTML = `<p class="page-status error">${escapeHtml(error.message || 'Não foi possível carregar os links.')}</p>`;
      return;
    }
    list.replaceChildren(createLinksList(data || [], loadLinks));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const files = [...filesInput.files];
    submit.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Preparando envio...';
    const upload = await uploadImageLinkFiles(files, {
      onProgress: (current, total, fileName) => {
        message.textContent = `Enviando imagem ${current} de ${total}: ${fileName}`;
      },
    });
    if (upload.error) {
      submit.disabled = false;
      message.className = 'form-message error';
      message.textContent = upload.error.message;
      return;
    }

    message.textContent = 'Criando link...';
    const { data, error } = await createImageLink({
      title: form.elements.title.value.trim(),
      expiresAt: new Date(form.elements.expires_at.value).toISOString(),
      maxUses: Number(form.elements.max_uses.value) || null,
      createdBy: session.user?.id || null,
      imageUrls: upload.data,
    });
    submit.disabled = false;
    if (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Não foi possível criar o link.';
      return;
    }
    const url = getImageLinkUrl(data.token);
    await navigator.clipboard?.writeText(url);
    form.reset();
    preview.hidden = true;
    preview.replaceChildren();
    form.elements.expires_at.value = getDefaultExpiresAt();
    message.className = 'form-message success';
    message.textContent = 'Link criado e copiado para a área de transferência.';
    await loadLinks();
  });

  await loadLinks();
  return page;
}

function renderPreview(files, slot) {
  slot.replaceChildren();
  const selected = [...files].slice(0, 10);
  if (!selected.length) {
    slot.hidden = true;
    return;
  }
  selected.forEach((file) => {
    const figure = document.createElement('figure');
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    figure.append(image);
    slot.append(figure);
  });
  slot.hidden = false;
}

function createLinksList(links, onChange) {
  if (!links.length) return createStatus('Nenhum link de imagem criado ainda.');
  const wrapper = document.createElement('div');
  wrapper.className = 'image-links-list';
  links.forEach((link) => {
    const card = document.createElement('article');
    card.className = 'image-link-card';
    const revoked = Boolean(link.revoked_at);
    card.innerHTML = `
      <div><h3>${escapeHtml(link.title)}</h3><p>${Number(link.image_urls?.length || 0)} imagens · expira em ${formatDateTime(link.expires_at)}</p></div>
      <div class="image-link-card-actions">
        <button class="button-link secondary" type="button" data-action="copy">Copiar link</button>
        ${revoked ? '<span class="image-link-status">Revogado</span>' : '<button class="button-link danger" type="button" data-action="revoke">Revogar</button>'}
      </div>
    `;
    card.querySelector('[data-action="copy"]').addEventListener('click', () => navigator.clipboard?.writeText(getImageLinkUrl(link.token)));
    card.querySelector('[data-action="revoke"]')?.addEventListener('click', async () => {
      await revokeImageLink(link.id);
      onChange();
    });
    wrapper.append(card);
  });
  return wrapper;
}

function getImageLinkUrl(token) { return `${window.location.origin}/imagem?token=${encodeURIComponent(token)}`; }
function createStatus(text) { const p = document.createElement('p'); p.className = 'page-status'; p.textContent = text; return p; }
function getDefaultExpiresAt() { const date = new Date(Date.now() + 24 * 60 * 60 * 1000); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); }
function formatDateTime(value) { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
