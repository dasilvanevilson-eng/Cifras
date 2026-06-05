export function RepertorioPrivacyFields(options = {}) {
  const users = options.users || [];
  const initialValues = options.initialValues || {};
  const wrapper = document.createElement('section');
  wrapper.className = 'repertorio-privacy-wrapper';
  wrapper.innerHTML = `
    <button class="nav-button privacy-toggle-button" type="button" aria-expanded="false">Configurar privacidade</button>
    <fieldset class="repertorio-privacy-fields" hidden>
      <legend>Privacidade</legend>
      <label>
        Tipo de compartilhamento
        <select name="visibilidade">
          <option value="privado"${initialValues.visibilidade === 'privado' ? ' selected' : ''}>Privado</option>
          <option value="publico"${(initialValues.visibilidade || 'publico') === 'publico' ? ' selected' : ''}>Compartilhamento publico</option>
          <option value="seletivo"${initialValues.visibilidade === 'seletivo' ? ' selected' : ''}>Compartilhamento seletivo</option>
        </select>
      </label>
      <label class="checkbox-label shared-edit-option">
        <input name="permite_edicao_compartilhada" type="checkbox"${initialValues.permite_edicao_compartilhada ? ' checked' : ''}>
        <span>
          <strong>Autorizar alteracoes por outros usuarios</strong>
          <small>Quando marcado, usuarios autorizados por esta privacidade tambem poderao editar este repertorio.</small>
        </span>
      </label>
      <div class="selective-share-users" data-role="selective-users">
        <strong>Usuarios com acesso</strong>
        <div class="share-user-list">
          ${users.map((user) => createUserOption(user, initialValues.compartilhado_com || [])).join('')}
        </div>
      </div>
    </fieldset>
  `;

  const toggleButton = wrapper.querySelector('.privacy-toggle-button');
  const fieldset = wrapper.querySelector('.repertorio-privacy-fields');
  const visibilitySelect = wrapper.querySelector('[name="visibilidade"]');

  function closePrivacyPanel() {
    fieldset.hidden = true;
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.textContent = 'Configurar privacidade';
  }

  toggleButton.addEventListener('click', () => {
    const isOpening = fieldset.hidden;
    fieldset.hidden = !isOpening;
    toggleButton.setAttribute('aria-expanded', String(isOpening));
    toggleButton.textContent = isOpening ? 'Ocultar privacidade' : 'Configurar privacidade';
  });

  document.addEventListener('pointerdown', (event) => {
    if (fieldset.hidden || wrapper.contains(event.target)) return;

    closePrivacyPanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || fieldset.hidden) return;

    closePrivacyPanel();
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
