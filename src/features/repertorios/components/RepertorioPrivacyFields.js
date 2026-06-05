export function RepertorioPrivacyFields(options = {}) {
  const users = options.users || [];
  const initialValues = options.initialValues || {};
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'repertorio-privacy-fields';
  fieldset.innerHTML = `
    <legend>Privacidade</legend>
    <label>
      Tipo de compartilhamento
      <select name="visibilidade">
        <option value="privado"${initialValues.visibilidade === 'privado' ? ' selected' : ''}>Privado</option>
        <option value="publico"${(initialValues.visibilidade || 'publico') === 'publico' ? ' selected' : ''}>Compartilhamento publico</option>
        <option value="seletivo"${initialValues.visibilidade === 'seletivo' ? ' selected' : ''}>Compartilhamento seletivo</option>
      </select>
    </label>
    <label class="checkbox-label">
      <input name="permite_edicao_compartilhada" type="checkbox"${initialValues.permite_edicao_compartilhada ? ' checked' : ''}>
      Permitir que outros usuarios autorizados facam alteracoes
    </label>
    <div class="selective-share-users" data-role="selective-users">
      <strong>Usuarios com acesso</strong>
      <div class="share-user-list">
        ${users.map((user) => createUserOption(user, initialValues.compartilhado_com || [])).join('')}
      </div>
    </div>
  `;

  const visibilitySelect = fieldset.querySelector('[name="visibilidade"]');

  function updateSelectiveUsersVisibility() {
    fieldset.querySelector('[data-role="selective-users"]').hidden = visibilitySelect.value !== 'seletivo';
  }

  visibilitySelect.addEventListener('change', updateSelectiveUsersVisibility);
  updateSelectiveUsersVisibility();

  return fieldset;
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
