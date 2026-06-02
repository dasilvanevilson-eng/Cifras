import { createSugestaoMusica, listMinhasSugestoes } from '../../../services/sugestoesMusicasService.js';

export async function EnviarSugestaoPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Enviar musica</h1>
    <div class="page-grid">
      <section>
        <h2>Nova sugestao</h2>
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Minhas sugestoes</h2>
        <div class="list-slot">
          <p class="page-status">Carregando sugestoes...</p>
        </div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');

  formSlot.append(createSugestaoForm(session, async () => {
    await refreshMinhasSugestoes(listSlot);
  }));

  try {
    await refreshMinhasSugestoes(listSlot);
  } catch (error) {
    listSlot.replaceChildren(createStatus(error.message || 'Nao foi possivel carregar suas sugestoes.', 'error'));
  }

  return page;
}

function createSugestaoForm(session, onSaved) {
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>
      Titulo
      <input name="titulo" type="text" required>
    </label>
    <label>
      Artista
      <input name="artista" type="text">
    </label>
    <label>
      Tom
      <input name="tom" type="text" placeholder="Ex: C, D, Em">
    </label>
    <label>
      Link
      <input name="musica_link" type="url" placeholder="https://...">
    </label>
    <label>
      Observacao
      <textarea name="observacao" rows="4"></textarea>
    </label>
    <label>
      Cifra original
      <textarea name="cifra_original" rows="12" required></textarea>
    </label>
    <button class="button" type="submit">Enviar sugestao</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const button = form.querySelector('button');
  const message = form.querySelector('.form-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Enviando...';

    const { data, error } = await createSugestaoMusica({
      ...getFormValues(form),
      enviado_por_nome: session?.profile?.nome || session?.user?.email || '',
      enviado_por_email: session?.user?.email || '',
      enviado_por_papel: session?.profile?.papel || 'musico',
    });

    if (error || !data) {
      button.disabled = false;
      message.className = 'form-message error';
      message.textContent = error?.message || 'Nao foi possivel enviar a sugestao.';
      return;
    }

    form.reset();
    button.disabled = false;
    message.className = 'form-message success';
    message.textContent = 'Sugestao enviada para revisao.';

    if (onSaved) {
      await onSaved();
    }
  });

  return form;
}

async function refreshMinhasSugestoes(slot) {
  const { data, error } = await listMinhasSugestoes();

  if (error) {
    throw error;
  }

  slot.replaceChildren(createSugestoesList(data || []));
}

function createSugestoesList(items) {
  if (!items.length) {
    return createStatus('Nenhuma sugestao enviada ainda.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'dashboard-list-item';
    article.innerHTML = `
      <div>
        <h3>${escapeHtml(item.titulo || '-')}</h3>
        <p>${escapeHtml([item.artista, `Status: ${formatStatus(item.status)}`].filter(Boolean).join(' - '))}</p>
        ${item.motivo_rejeicao ? `<p>${escapeHtml(item.motivo_rejeicao)}</p>` : ''}
      </div>
    `;
    list.append(article);
  });

  return list;
}

function getFormValues(form) {
  const formData = new FormData(form);

  return {
    titulo: String(formData.get('titulo') || '').trim(),
    artista: String(formData.get('artista') || '').trim(),
    tom: String(formData.get('tom') || '').trim(),
    musica_link: String(formData.get('musica_link') || '').trim(),
    observacao: String(formData.get('observacao') || '').trim(),
    cifra_original: String(formData.get('cifra_original') || '').trim(),
  };
}

function createStatus(text, type = '') {
  const status = document.createElement('p');
  status.className = `page-status${type ? ` ${type}` : ''}`;
  status.textContent = text;
  return status;
}

function formatStatus(status) {
  const labels = {
    pendente: 'Pendente',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
  };

  return labels[status] || status || '-';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
