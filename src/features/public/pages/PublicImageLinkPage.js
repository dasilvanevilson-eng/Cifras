import { getPublicImageLinkData } from '../../../services/imageLinksService.js';

export async function PublicImageLinkPage() {
  const page = document.createElement('section');
  page.className = 'public-image-link-page';
  page.innerHTML = '<p class="page-status">Carregando imagens...</p>';
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (!token) {
    page.innerHTML = '<p class="page-status error">Link não informado.</p>';
    return page;
  }
  const { data, error } = await getPublicImageLinkData(token);
  if (error) {
    page.innerHTML = `<p class="page-status error">${escapeHtml(error.message)}</p>`;
    return page;
  }
  page.replaceChildren(createImageGallery(data));
  return page;
}

function createImageGallery({ title, images }) {
  const wrapper = document.createElement('article');
  wrapper.className = 'public-image-gallery';
  let index = 0;
  const hasNavigation = images.length > 1;
  wrapper.innerHTML = `
    <header><div><h1>${escapeHtml(title)}</h1></div>${hasNavigation ? '<p data-role="position"></p>' : ''}</header>
    <div class="public-image-stage"><img data-role="image" alt="Imagem compartilhada"></div>
    ${hasNavigation ? '<footer><button class="nav-button" type="button" data-action="previous">Anterior</button><button class="nav-button" type="button" data-action="next">Próxima</button></footer>' : ''}
  `;
  const image = wrapper.querySelector('[data-role="image"]');
  const position = wrapper.querySelector('[data-role="position"]');
  const previous = wrapper.querySelector('[data-action="previous"]');
  const next = wrapper.querySelector('[data-action="next"]');
  function render() {
    image.src = images[index];
    image.alt = `${title} · imagem ${index + 1}`;
    if (position) position.textContent = `${index + 1} de ${images.length}`;
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === images.length - 1;
  }
  previous?.addEventListener('click', () => { index = Math.max(0, index - 1); render(); });
  next?.addEventListener('click', () => { index = Math.min(images.length - 1, index + 1); render(); });
  wrapper.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') previous?.click(); if (event.key === 'ArrowRight') next?.click(); });
  wrapper.tabIndex = 0;
  render();
  return wrapper;
}

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
