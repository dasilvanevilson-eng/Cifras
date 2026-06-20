export function installPageInfoDialogs(page) {
  const descriptions = page.querySelectorAll('[data-page-info]');

  descriptions.forEach((description, index) => {
    const header = description.closest('header');
    const title = header?.querySelector('h1');
    if (!title || title.querySelector('.page-info-button')) return;

    const titleText = title.textContent.trim() || 'Informacao';
    const descriptionText = description.textContent.trim();
    if (!descriptionText) return;

    const titleId = `page-info-title-${index}`;
    const button = document.createElement('button');
    button.className = 'page-info-button';
    button.type = 'button';
    button.setAttribute('aria-label', `Mais informacoes sobre ${titleText}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.title = 'Mais informacoes';
    button.textContent = 'i';
    title.classList.add('page-info-title');
    title.append(' ', button);
    description.hidden = true;

    const modal = document.createElement('div');
    modal.className = 'page-info-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="page-info-backdrop" data-action="close-page-info"></div>
      <section class="page-info-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <button class="page-info-close" type="button" data-action="close-page-info" aria-label="Fechar">&times;</button>
        <h2 id="${titleId}"></h2>
        <p></p>
      </section>
    `;
    modal.querySelector('h2').textContent = titleText;
    modal.querySelector('p').textContent = descriptionText;
    page.append(modal);

    const closeModal = () => {
      modal.hidden = true;
      button.focus();
    };
    button.addEventListener('click', () => {
      modal.hidden = false;
      modal.querySelector('.page-info-close').focus();
    });
    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="close-page-info"]')) closeModal();
    });
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  });
}
