import { canManageUsers } from '../../auth/roles.js';
import {
  DEFAULT_SYSTEM_SETTINGS,
  listSystemSettings,
  saveSystemSettings,
  uploadLoginBackgroundImage,
} from '../../../services/settingsService.js';

export async function PersonalizacaoPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page personalizacao-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem personalizar o sistema.</div>';
    return page;
  }

  page.innerHTML = `
    <h1>Personalizacao</h1>
    <section class="personalization-layout">
      <form class="form personalization-form">
        <label>
          Nome do sistema
          <input name="app_name" type="text" maxlength="80" required>
        </label>
        <label>
          Subtitulo da tela inicial
          <input name="login_subtitle" type="text" maxlength="140" placeholder="Opcional">
        </label>
        <label class="field-full personalization-file-field">
          Imagem de fundo do login
          <input name="login_background_file" type="file" accept="image/jpeg" hidden>
          <input name="login_background_url" type="hidden">
          <button class="button-link secondary" type="button" data-action="select-background-image">Buscar imagem .jpg no seu dispositivo</button>
          <small data-role="background-file-status">Imagem atual mantida.</small>
        </label>
        <label>
          Cor principal
          <input name="primary_color" type="color">
        </label>
        <label>
          Cor de destaque
          <input name="accent_color" type="color">
        </label>
        <label class="checkbox-label field-full">
          <input name="show_app_name_on_login" type="checkbox">
          <span>Mostrar nome do sistema na tela inicial</span>
        </label>
        <div class="form-actions field-full">
          <button class="button" type="submit">Salvar personalizacao</button>
          <button class="button-link secondary" type="button" data-action="restore-defaults">Restaurar padrao</button>
        </div>
        <p class="form-message field-full" aria-live="polite"></p>
      </form>
      <aside class="personalization-preview" aria-label="Previa da tela inicial">
        <div class="personalization-preview-hero">
          <div>
            <strong data-preview="app_name"></strong>
            <span data-preview="login_subtitle"></span>
            <button type="button">Entrar</button>
          </div>
        </div>
      </aside>
    </section>
  `;

  const form = page.querySelector('.personalization-form');
  const message = page.querySelector('.form-message');
  const restoreButton = page.querySelector('[data-action="restore-defaults"]');
  const selectBackgroundButton = page.querySelector('[data-action="select-background-image"]');
  const fileStatus = page.querySelector('[data-role="background-file-status"]');
  let settings = { ...DEFAULT_SYSTEM_SETTINGS };
  let selectedBackgroundFile = null;
  let selectedBackgroundPreviewUrl = '';

  function fillForm(nextSettings) {
    form.elements.app_name.value = nextSettings.app_name || DEFAULT_SYSTEM_SETTINGS.app_name;
    form.elements.login_subtitle.value = nextSettings.login_subtitle || '';
    form.elements.login_background_url.value = nextSettings.login_background_url || DEFAULT_SYSTEM_SETTINGS.login_background_url;
    form.elements.login_background_file.value = '';
    form.elements.primary_color.value = nextSettings.primary_color || DEFAULT_SYSTEM_SETTINGS.primary_color;
    form.elements.accent_color.value = nextSettings.accent_color || DEFAULT_SYSTEM_SETTINGS.accent_color;
    form.elements.show_app_name_on_login.checked = Boolean(nextSettings.show_app_name_on_login);
    selectedBackgroundFile = null;
    revokeBackgroundPreviewUrl();
    fileStatus.textContent = nextSettings.login_background_url ? 'Imagem atual mantida.' : 'Nenhuma imagem configurada.';
    renderPreview(page, readSettingsFromForm(form));
  }

  form.addEventListener('input', () => {
    renderPreview(page, readSettingsFromForm(form));
  });

  selectBackgroundButton.addEventListener('click', () => {
    form.elements.login_background_file.click();
  });

  form.elements.login_background_file.addEventListener('change', () => {
    selectedBackgroundFile = form.elements.login_background_file.files?.[0] || null;
    revokeBackgroundPreviewUrl();

    if (!selectedBackgroundFile) {
      fileStatus.textContent = 'Imagem atual mantida.';
      renderPreview(page, readSettingsFromForm(form));
      return;
    }

    selectedBackgroundPreviewUrl = URL.createObjectURL(selectedBackgroundFile);
    fileStatus.textContent = selectedBackgroundFile.name;
    renderPreview(page, {
      ...readSettingsFromForm(form),
      login_background_url: selectedBackgroundPreviewUrl,
    });
  });

  restoreButton.addEventListener('click', () => {
    settings = { ...DEFAULT_SYSTEM_SETTINGS };
    fillForm(settings);
    message.className = 'form-message field-full';
    message.textContent = 'Padrao restaurado na tela. Salve para aplicar.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const nextSettings = readSettingsFromForm(form);

    button.disabled = true;
    message.className = 'form-message field-full';
    message.textContent = 'Salvando personalizacao...';

    if (selectedBackgroundFile) {
      message.textContent = 'Enviando imagem...';
      const { data: uploadedUrl, error: uploadError } = await uploadLoginBackgroundImage(selectedBackgroundFile);

      if (uploadError) {
        button.disabled = false;
        message.className = 'form-message error field-full';
        message.textContent = uploadError.message || 'Nao foi possivel enviar a imagem.';
        return;
      }

      nextSettings.login_background_url = uploadedUrl;
      form.elements.login_background_url.value = uploadedUrl;
      message.textContent = 'Salvando personalizacao...';
    }

    const { error } = await saveSystemSettings(nextSettings);

    button.disabled = false;

    if (error) {
      message.className = 'form-message error field-full';
      message.textContent = error.message || 'Nao foi possivel salvar a personalizacao.';
      return;
    }

    settings = nextSettings;
    selectedBackgroundFile = null;
    revokeBackgroundPreviewUrl();
    form.elements.login_background_file.value = '';
    fileStatus.textContent = 'Imagem atual mantida.';
    message.className = 'form-message success field-full';
    message.textContent = 'Personalizacao salva com sucesso.';
  });

  try {
    const { data, error } = await listSystemSettings();

    if (error) throw error;

    settings = {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...(data || {}),
    };
  } catch (_error) {
    settings = { ...DEFAULT_SYSTEM_SETTINGS };
    message.className = 'form-message error field-full';
    message.textContent = 'Usando configuracoes padrao. Aplique a migration de personalizacao para salvar no banco.';
  }

  fillForm(settings);

  return page;

  function revokeBackgroundPreviewUrl() {
    if (selectedBackgroundPreviewUrl) {
      URL.revokeObjectURL(selectedBackgroundPreviewUrl);
      selectedBackgroundPreviewUrl = '';
    }
  }
}

function readSettingsFromForm(form) {
  return {
    app_name: String(form.elements.app_name.value || '').trim() || DEFAULT_SYSTEM_SETTINGS.app_name,
    login_subtitle: String(form.elements.login_subtitle.value || '').trim(),
    login_background_url: String(form.elements.login_background_url.value || '').trim() || DEFAULT_SYSTEM_SETTINGS.login_background_url,
    primary_color: form.elements.primary_color.value || DEFAULT_SYSTEM_SETTINGS.primary_color,
    accent_color: form.elements.accent_color.value || DEFAULT_SYSTEM_SETTINGS.accent_color,
    show_app_name_on_login: Boolean(form.elements.show_app_name_on_login.checked),
  };
}

function renderPreview(page, settings) {
  const preview = page.querySelector('.personalization-preview-hero');
  const appName = page.querySelector('[data-preview="app_name"]');
  const subtitle = page.querySelector('[data-preview="login_subtitle"]');

  preview.style.setProperty('--preview-background-image', `url('${settings.login_background_url.replaceAll('\\', '/')}')`);
  preview.style.setProperty('--preview-accent-color', settings.accent_color);
  appName.textContent = settings.show_app_name_on_login ? settings.app_name : '';
  subtitle.textContent = settings.login_subtitle || '';
}
