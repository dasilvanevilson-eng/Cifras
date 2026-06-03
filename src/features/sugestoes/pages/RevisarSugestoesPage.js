import {
  listSugestoesPendentes,
  rejectSugestaoMusica,
} from '../../../services/sugestoesMusicasService.js';
import { canEditContent } from '../../auth/roles.js';

export async function RevisarSugestoesPage({ session } = {}) {
  const page = document.createElement('section');
  page.className = 'page';

  if (!canEditContent(session?.profile?.papel)) {
    page.innerHTML = '<div class="page-status error">Seu perfil nao tem permissao para revisar sugestoes.</div>';
    return page;
  }

  page.innerHTML = `
    <h1>Sugestoes de musicas</h1>
    <div class="suggestions-review-grid">
      <section>
        <h2>Pendentes</h2>
        <div class="list-slot">
          <p class="page-status">Carregando sugestoes...</p>
        </div>
      </section>
      <section>
        <h2 data-role="review-title">Revisao</h2>
        <div class="review-slot">
          <p class="page-status">Selecione uma sugestao para revisar.</p>
        </div>
      </section>
    </div>
  `;

  const listSlot = page.querySelector('.list-slot');
  const reviewSlot = page.querySelector('.review-slot');
  const reviewTitle = page.querySelector('[data-role="review-title"]');
  let sugestoes = [];

  function renderList() {
    listSlot.replaceChildren(createSugestoesList(sugestoes, (sugestao) => {
      reviewTitle.textContent = 'Revisar sugestao';
      reviewSlot.replaceChildren(createReviewForm(sugestao, session, async () => {
        sugestoes = await loadPendentes();
        renderList();
        reviewTitle.textContent = 'Revisao';
        reviewSlot.replaceChildren(createStatus('Selecione uma sugestao para revisar.'));
      }));
    }));
  }

  try {
    sugestoes = await loadPendentes();
    renderList();
  } catch (error) {
    listSlot.replaceChildren(createStatus(error.message || 'Nao foi possivel carregar sugestoes.', 'error'));
  }

  return page;
}

async function loadPendentes() {
  const { data, error } = await listSugestoesPendentes();

  if (error) {
    throw error;
  }

  return data || [];
}

function createSugestoesList(items, onSelect) {
  if (!items.length) {
    return createStatus('Nenhuma sugestao pendente.');
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';

  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'user-search-item';
    button.innerHTML = `
      <strong>${escapeHtml(item.titulo || '-')}</strong>
      <span>${escapeHtml(formatTipoSugestao(item.tipo_sugestao))}</span>
      <span>${escapeHtml(item.artista || '-')}</span>
      <span>${escapeHtml(formatSender(item))}</span>
      <span>${escapeHtml(formatDate(item.created_at))}</span>
    `;
    button.addEventListener('click', () => onSelect(item));
    list.append(button);
  });

  return list;
}

function createReviewForm(sugestao, session, onFinished) {
  const form = document.createElement('form');
  form.className = 'form suggestion-review-form';
  form.innerHTML = `
    <fieldset class="suggestion-review-meta">
      <legend>Dados do envio</legend>
      <label>
        Tipo
        <input type="text" value="${escapeHtml(formatTipoSugestao(sugestao.tipo_sugestao))}" disabled>
      </label>
      <label>
        Enviado por
        <input type="text" value="${escapeHtml(formatSender(sugestao))}" disabled>
      </label>
      <label>
        Data do envio
        <input type="text" value="${escapeHtml(formatDate(sugestao.created_at))}" disabled>
      </label>
    </fieldset>
    <fieldset>
      <legend>Musica</legend>
    <label>
      Titulo
      <input name="titulo" type="text" value="${escapeHtml(sugestao.titulo || '')}" required>
    </label>
    <label>
      Artista
      <input name="artista" type="text" value="${escapeHtml(sugestao.artista || '')}">
    </label>
    <label>
      Tom
      <input name="tom" type="text" value="${escapeHtml(sugestao.tom || '')}">
    </label>
    <label>
      Link
      <input name="musica_link" type="url" value="${escapeHtml(sugestao.musica_link || '')}">
    </label>
    <label>
      Observacao da sugestao
      <textarea name="observacao" rows="4">${escapeHtml(sugestao.observacao || '')}</textarea>
    </label>
    <label>
      Cifra original
      <textarea name="cifra_original" rows="14" required>${escapeHtml(sugestao.cifra_original || '')}</textarea>
    </label>
    </fieldset>
    <fieldset>
      <legend>Revisao</legend>
    <label>
      Motivo de rejeicao
      <textarea name="motivo_rejeicao" rows="4"></textarea>
    </label>
    </fieldset>
    <div class="form-actions">
      <button class="button" type="submit" data-action="approve">Aprovar e cadastrar</button>
      <button class="danger-button" type="button" data-action="reject">Rejeitar</button>
    </div>
    <p class="form-message" aria-live="polite"></p>
  `;

  const approveButton = form.querySelector('[data-action="approve"]');
  const rejectButton = form.querySelector('[data-action="reject"]');
  const message = form.querySelector('.form-message');

  approveButton.textContent = sugestao.tipo_sugestao === 'ajuste'
    ? 'Aprovar ajuste'
    : 'Aprovar e cadastrar';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    approveButton.disabled = true;
    rejectButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Aprovando...';

    const values = getReviewValues(form);

    window.sessionStorage.setItem('masterCifras.pendingSugestaoMusica', JSON.stringify({
      sugestao_id: sugestao.id,
      revisado_por: session?.user?.id,
      tipo_sugestao: sugestao.tipo_sugestao || 'nova',
      musica_origem_id: sugestao.musica_origem_id || null,
      titulo: values.titulo,
      artista: values.artista,
      tom: values.tom,
      tags: '',
      musica_link: values.musica_link,
      cifra_original: values.cifra_original,
    }));

    message.className = 'form-message success';
    message.textContent = sugestao.tipo_sugestao === 'ajuste'
      ? 'Abrindo Cifras para aplicar ajuste...'
      : 'Abrindo Cifras para cadastro...';
    window.location.href = '/musicas';
  });

  rejectButton.addEventListener('click', async () => {
    const values = getReviewValues(form);

    if (!values.motivo_rejeicao) {
      message.className = 'form-message error';
      message.textContent = 'Informe o motivo da rejeicao.';
      return;
    }

    const confirmed = window.confirm('Rejeitar esta sugestao?');
    if (!confirmed) return;

    approveButton.disabled = true;
    rejectButton.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Rejeitando...';

    const { data, error } = await rejectSugestaoMusica(sugestao.id, {
      motivo_rejeicao: values.motivo_rejeicao,
      revisado_por: session?.user?.id,
    });

    if (error || !data) {
      approveButton.disabled = false;
      rejectButton.disabled = false;
      message.className = 'form-message error';
      message.textContent = error?.message || 'Nao foi possivel rejeitar a sugestao.';
      return;
    }

    message.className = 'form-message success';
    message.textContent = 'Sugestao rejeitada.';

    if (onFinished) {
      await onFinished();
    }
  });

  return form;
}

function getReviewValues(form) {
  const formData = new FormData(form);

  return {
    titulo: String(formData.get('titulo') || '').trim(),
    artista: String(formData.get('artista') || '').trim(),
    tom: String(formData.get('tom') || '').trim(),
    musica_link: String(formData.get('musica_link') || '').trim(),
    observacao: String(formData.get('observacao') || '').trim(),
    cifra_original: String(formData.get('cifra_original') || '').trim(),
    motivo_rejeicao: String(formData.get('motivo_rejeicao') || '').trim(),
  };
}

function createStatus(text, type = '') {
  const status = document.createElement('p');
  status.className = `page-status${type ? ` ${type}` : ''}`;
  status.textContent = text;
  return status;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
}

function formatSender(sugestao) {
  const name = sugestao.enviado_por_nome || 'Usuario';
  const email = sugestao.enviado_por_email ? ` - ${sugestao.enviado_por_email}` : '';
  const role = sugestao.enviado_por_papel ? ` (${sugestao.enviado_por_papel})` : '';
  return `${name}${email}${role}`;
}

function formatTipoSugestao(tipo) {
  return tipo === 'ajuste' ? 'Sugestao de ajuste de musica' : 'Sugestao de musica nova';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
