export function RepertorioPrivacyFields(options = {}) {
  const users = options.users || [];
  const initialValues = options.initialValues || {};
  const sharedEditId = `shared-edit-${Math.random().toString(36).slice(2)}`;
  const wrapper = document.createElement('section');
  wrapper.className = 'repertorio-privacy-wrapper';
  wrapper.innerHTML = `
    <button class="nav-button privacy-toggle-button" type="button" aria-expanded="false">Privacidade</button>
    <div class="repertorio-privacy-modal" hidden>
      <button class="repertorio-privacy-backdrop" type="button" aria-label="Fechar privacidade"></button>
      <fieldset class="repertorio-privacy-fields" role="dialog" aria-modal="true" aria-label="Privacidade">
        <div class="repertorio-privacy-header">
          <legend>Privacidade</legend>
          <button class="nav-button privacy-close-button" type="button">Fechar</button>
        </div>
        <label>
          Tipo de compartilhamento
          <select name="visibilidade">
            <option value="privado"${initialValues.visibilidade === 'privado' ? ' selected' : ''}>Privado</option>
            <option value="publico"${(initialValues.visibilidade || 'publico') === 'publico' ? ' selected' : ''}>Compartilhamento publico</option>
            <option value="seletivo"${initialValues.visibilidade === 'seletivo' ? ' selected' : ''}>Compartilhamento seletivo</option>
          </select>
        </label>
        <div class="checkbox-label shared-edit-option">
          <input id="${sharedEditId}" name="permite_edicao_compartilhada" type="checkbox"${initialValues.permite_edicao_compartilhada ? ' checked' : ''}>
          <label for="${sharedEditId}">
            <strong>Autorizar alteracoes por outros usuarios</strong>
            <small>Quando marcado, usuarios autorizados por esta privacidade tambem poderao editar este repertorio.</small>
          </label>
        </div>
        <div class="selective-share-users" data-role="selective-users">
          <strong>Usuarios com acesso</strong>
          <div class="share-user-list">
            ${users.map((user) => createUserOption(user, initialValues.compartilhado_com || [])).join('')}
          </div>
        </div>
      </fieldset>
    </div>
  `;

  const toggleButton = wrapper.querySelector('.privacy-toggle-button');
  const closeButton = wrapper.querySelector('.privacy-close-button');
  const backdrop = wrapper.querySelector('.repertorio-privacy-backdrop');
  const modal = wrapper.querySelector('.repertorio-privacy-modal');
  const fieldset = wrapper.querySelector('.repertorio-privacy-fields');
  const visibilitySelect = wrapper.querySelector('[name="visibilidade"]');

  function closePrivacyPanel() {
    wrapper.classList.remove('is-privacy-open');
    document.body.classList.remove('has-privacy-modal-open');
    modal.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.textContent = 'Privacidade';
  }

  toggleButton.addEventListener('click', () => {
    const isOpening = modal.hidden;
    modal.hidden = !isOpening;
    wrapper.classList.toggle('is-privacy-open', isOpening);
    document.body.classList.toggle('has-privacy-modal-open', isOpening);
    toggleButton.setAttribute('aria-expanded', String(isOpening));
    toggleButton.textContent = 'Privacidade';
  });

  closeButton.addEventListener('click', closePrivacyPanel);
  backdrop.addEventListener('click', closePrivacyPanel);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || modal.hidden) return;

    closePrivacyPanel();
  });

  window.addEventListener('beforeunload', () => {
    document.body.classList.remove('has-privacy-modal-open');
  });

  function updateSelectiveUsersVisibility() {
    wrapper.querySelector('[data-role="selective-users"]').hidden = visibilitySelect.value !== 'seletivo';
  }

  visibilitySelect.addEventListener('change', updateSelectiveUsersVisibility);
  updateSelectiveUsersVisibility();

  return wrapper;
}

export function getRepertorioPrivacyValues(form) {
  const formData = new FormData(form);
  const visibilidade = String(formData.get('visibilidade') || 'publico');

  return {
    repertorio: {
      visibilidade,
      permite_edicao_compartilhada: formData.get('permite_edicao_compartilhada') === 'on',
    },
    compartilhadoCom: visibilidade === 'seletivo'
      ? formData.getAll('compartilhado_com').map((value) => String(value))
      : [],
  };
}

function createUserOption(user, selectedUserIds) {
  return `
    <label class="checkbox-label share-user-option">
      <input name="compartilhado_com" type="checkbox" value="${escapeHtml(user.id)}"${selectedUserIds.includes(user.id) ? ' checked' : ''}>
      <span>${escapeHtml(user.nome || 'Usuario')} <small>${escapeHtml(formatRole(user.papel))}</small></span>
    </label>
  `;
}

function formatRole(role) {
  const roles = {
    admin: 'Admin',
    editor: 'Editor',
    musico: 'Musico',
  };

  return roles[role] || role || '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
