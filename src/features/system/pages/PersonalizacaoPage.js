import { canManageUsers } from '../../auth/roles.js';
import {
  DEFAULT_SYSTEM_SETTINGS,
  listSystemSettings,
  saveSystemSettings,
  uploadLoginBackgroundImage,
} from '../../../services/settingsService.js';
import { applySystemSettings, getMonospaceFontStack } from '../../../utils/systemSettings.js';

export async function PersonalizacaoPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page personalizacao-page';

  if (!canManageUsers(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Apenas administradores podem personalizar o sistema.</div>';
    return page;
  }

  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Personalizacao</h1>
        <p data-page-info>Ajustes visuais da porta de entrada do sistema.</p>
      </div>
    </header>
    <section class="personalization-layout">
      <form class="form personalization-form">
        <fieldset>
          <legend>Identidade</legend>
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
          <label class="checkbox-label field-full">
            <input name="show_app_name_on_login" type="checkbox">
            <span>Mostrar nome do sistema na tela inicial</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>Tema</legend>
          <label>
            Tema do sistema
            <select name="theme_mode">
              <option value="auto">Automatico</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
          <label>
            Densidade visual
            <select name="interface_density">
              <option value="comfortable">Confortavel</option>
              <option value="compact">Compacta</option>
            </select>
          </label>
          <label>
            Cor principal
            <input name="primary_color" type="color">
          </label>
          <label>
            Cor de destaque
            <input name="accent_color" type="color">
          </label>
        </fieldset>
        <fieldset>
          <legend>Cifras</legend>
          <label>
            Cor dos acordes
            <input name="chord_color" type="color">
          </label>
          <label>
            Fonte monoespacada
            <select name="chord_font_family">
              <option value="ibm_plex_mono">IBM Plex Mono</option>
              <option value="ui_monospace">Mono do sistema</option>
              <option value="courier_prime">Courier Prime</option>
              <option value="source_code">Source Code Pro</option>
              <option value="jetbrains_mono">JetBrains Mono</option>
            </select>
          </label>
          <label>
            Tamanho padrao
            <input name="chord_font_size" type="number" min="14" max="40" step="1">
          </label>
        </fieldset>
        <fieldset>
          <legend>Modo execucao</legend>
          <label>
            Tema padrao
            <select name="execution_theme">
              <option value="auto">Automatico</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
          <label>
            Tamanho inicial da fonte
            <input name="execution_font_size" type="number" min="18" max="64" step="1">
          </label>
          <label>
            Velocidade da rolagem
            <input name="execution_autoscroll_speed" type="range" min="1" max="8" step="1">
          </label>
          <label class="checkbox-label field-full">
            <input name="execution_two_columns" type="checkbox">
            <span>Preferir duas colunas em telas grandes</span>
          </label>
        </fieldset>
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
        <div class="personalization-chord-preview">
          <span>Previa da cifra</span>
          <pre><span data-preview="chord">G      D/F#   Em</span>
Grandes coisas fez o Senhor
<span data-preview="chord">C      G/B    Am   D</span>
Por isso estamos alegres</pre>
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
    form.elements.theme_mode.value = nextSettings.theme_mode || DEFAULT_SYSTEM_SETTINGS.theme_mode;
    form.elements.interface_density.value = nextSettings.interface_density || DEFAULT_SYSTEM_SETTINGS.interface_density;
    form.elements.chord_color.value = nextSettings.chord_color || DEFAULT_SYSTEM_SETTINGS.chord_color;
    form.elements.chord_font_family.value = nextSettings.chord_font_family || DEFAULT_SYSTEM_SETTINGS.chord_font_family;
    form.elements.chord_font_size.value = Number(nextSettings.chord_font_size || DEFAULT_SYSTEM_SETTINGS.chord_font_size);
    form.elements.execution_theme.value = nextSettings.execution_theme || DEFAULT_SYSTEM_SETTINGS.execution_theme;
    form.elements.execution_font_size.value = Number(nextSettings.execution_font_size || DEFAULT_SYSTEM_SETTINGS.execution_font_size);
    form.elements.execution_autoscroll_speed.value = Number(nextSettings.execution_autoscroll_speed || DEFAULT_SYSTEM_SETTINGS.execution_autoscroll_speed);
    form.elements.execution_two_columns.checked = Boolean(nextSettings.execution_two_columns);
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
    applySystemSettings(settings);
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
    theme_mode: form.elements.theme_mode.value || DEFAULT_SYSTEM_SETTINGS.theme_mode,
    interface_density: form.elements.interface_density.value || DEFAULT_SYSTEM_SETTINGS.interface_density,
    chord_color: form.elements.chord_color.value || DEFAULT_SYSTEM_SETTINGS.chord_color,
    chord_font_family: form.elements.chord_font_family.value || DEFAULT_SYSTEM_SETTINGS.chord_font_family,
    chord_font_size: Number(form.elements.chord_font_size.value || DEFAULT_SYSTEM_SETTINGS.chord_font_size),
    execution_theme: form.elements.execution_theme.value || DEFAULT_SYSTEM_SETTINGS.execution_theme,
    execution_font_size: Number(form.elements.execution_font_size.value || DEFAULT_SYSTEM_SETTINGS.execution_font_size),
    execution_autoscroll_speed: Number(form.elements.execution_autoscroll_speed.value || DEFAULT_SYSTEM_SETTINGS.execution_autoscroll_speed),
    execution_two_columns: Boolean(form.elements.execution_two_columns.checked),
    show_app_name_on_login: Boolean(form.elements.show_app_name_on_login.checked),
  };
}

function renderPreview(page, settings) {
  const preview = page.querySelector('.personalization-preview-hero');
  const appName = page.querySelector('[data-preview="app_name"]');
  const subtitle = page.querySelector('[data-preview="login_subtitle"]');
  const chordPreview = page.querySelector('.personalization-chord-preview');

  preview.style.setProperty('--preview-background-image', `url('${settings.login_background_url.replaceAll('\\', '/')}')`);
  preview.style.setProperty('--preview-accent-color', settings.accent_color);
  chordPreview.style.setProperty('--preview-chord-color', settings.chord_color);
  chordPreview.style.setProperty('--preview-chord-font', getMonospaceFontStack(settings.chord_font_family));
  chordPreview.style.setProperty('--preview-chord-font-size', `${settings.chord_font_size}px`);
  appName.textContent = settings.show_app_name_on_login ? settings.app_name : '';
  subtitle.textContent = settings.login_subtitle || '';
}
