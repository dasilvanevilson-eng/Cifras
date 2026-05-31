import { listMusicas } from '../../../services/musicasService.js';
import {
  addMusicaToRepertorio,
  getRepertorioById,
  listMusicasDoRepertorio,
  removeMusicaDoRepertorio,
  updateOrdemMusicaRepertorio,
} from '../../../services/repertoriosService.js';

export async function RepertorioDetalhePage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando repertorio...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Repertorio nao informado.';
    return page;
  }

  try {
    const [{ data: repertorio, error: repertorioError }, musicasAssociadas, { data: musicas, error: musicasError }] = await Promise.all([
      getRepertorioById(id),
      loadMusicasDoRepertorio(id),
      listMusicas(),
    ]);

    if (repertorioError) throw repertorioError;
    if (musicasError) throw musicasError;

    page.replaceChildren(createRepertorioView({
      repertorio,
      musicasAssociadas,
      musicas: musicas || [],
    }));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

async function loadMusicasDoRepertorio(repertorioId) {
  const { data, error } = await listMusicasDoRepertorio(repertorioId);

  if (error) {
    throw error;
  }

  return data || [];
}

function createRepertorioView({ repertorio, musicasAssociadas, musicas }) {
  const wrapper = document.createElement('section');
  const nome = getField(repertorio, ['nome', 'titulo', 'name']);
  const data = formatDate(getField(repertorio, ['data', 'date']));

  wrapper.innerHTML = `
    <a class="back-link" href="/repertorios">Voltar para repertorios</a>
    <div class="page-actions">
      <a class="button-link" href="/repertorios/execucao?id=${encodeURIComponent(repertorio.id)}">Modo execucao</a>
    </div>
    <header class="song-header">
      <h1>${escapeHtml(nome)}</h1>
      <p>Data: ${escapeHtml(data)}</p>
    </header>
    <div class="page-grid">
      <section>
        <h2>Adicionar musica</h2>
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Musicas do repertorio</h2>
        <div class="list-slot"></div>
      </section>
    </div>
  `;

  const formSlot = wrapper.querySelector('.form-slot');
  const listSlot = wrapper.querySelector('.list-slot');

  formSlot.append(createAddMusicaForm({
    repertorioId: repertorio.id,
    musicas,
    proximaOrdem: musicasAssociadas.length + 1,
  }));

  listSlot.append(createMusicasList(normalizeOrder(musicasAssociadas)));

  return wrapper;
}

function createAddMusicaForm({ repertorioId, musicas, proximaOrdem }) {
  const form = document.createElement('form');
  form.className = 'form';
  form.innerHTML = `
    <label>
      Musica
      <select name="musica_id" required>
        <option value="">Selecione uma musica</option>
      </select>
    </label>
    <button class="button" type="submit">Adicionar ao repertorio</button>
    <p class="form-message" aria-live="polite"></p>
  `;

  const select = form.querySelector('select');
  const message = form.querySelector('.form-message');
  const button = form.querySelector('button');

  musicas.forEach((musica) => {
    const option = document.createElement('option');
    option.value = musica.id;
    option.textContent = formatMusicaName(musica);
    select.append(option);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const musicaId = String(formData.get('musica_id') || '');

    button.disabled = true;
    message.className = 'form-message';
    message.textContent = 'Adicionando...';

    try {
      const { error } = await addMusicaToRepertorio(repertorioId, musicaId, proximaOrdem);

      if (error) {
        throw error;
      }

      window.location.reload();
    } catch (error) {
      message.className = 'form-message error';
      message.textContent = error.message || 'Nao foi possivel adicionar a musica.';
      button.disabled = false;
    }
  });

  return form;
}

function createMusicasList(items) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'page-status';
    empty.textContent = 'Nenhuma musica adicionada ainda.';
    return empty;
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Ordem</th>
        <th>Musica</th>
        <th>Tom</th>
        <th>Acoes</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  items.forEach((item, index) => {
    const musica = item.musicas || {};
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(item.ordem || '-')}</td>
      <td><a href="/musicas/detalhe?id=${encodeURIComponent(item.musica_id)}">${escapeHtml(formatMusicaName(musica))}</a></td>
      <td>${escapeHtml(getField(musica, ['tom', 'key']))}</td>
      <td></td>
    `;
    const actionsCell = row.querySelector('td:last-child');
    actionsCell.className = 'table-actions';
    actionsCell.append(createMoveButton('Subir', items, index, -1));
    actionsCell.append(createMoveButton('Descer', items, index, 1));
    actionsCell.append(createRemoveButton(item.id));
    body.append(row);
  });

  return table;
}

function normalizeOrder(items) {
  return [...items].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

function createMoveButton(label, items, index, direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-button';
  button.textContent = label;

  const targetIndex = index + direction;
  const canMove = targetIndex >= 0 && targetIndex < items.length;
  button.disabled = !canMove;

  button.addEventListener('click', async () => {
    if (!canMove) return;

    const current = items[index];
    const target = items[targetIndex];

    button.disabled = true;
    button.textContent = 'Salvando...';

    const [currentResult, targetResult] = await Promise.all([
      updateOrdemMusicaRepertorio(current.id, target.ordem),
      updateOrdemMusicaRepertorio(target.id, current.ordem),
    ]);

    const error = currentResult.error || targetResult.error;

    if (error) {
      button.disabled = false;
      button.textContent = label;
      window.alert(error.message || 'Nao foi possivel alterar a ordem.');
      return;
    }

    window.location.reload();
  });

  return button;
}

function createRemoveButton(associationId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button';
  button.textContent = 'Remover';

  button.addEventListener('click', async () => {
    const confirmed = window.confirm('Remover esta musica do repertorio?');
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Removendo...';

    const { error } = await removeMusicaDoRepertorio(associationId);

    if (error) {
      button.disabled = false;
      button.textContent = 'Remover';
      window.alert(error.message || 'Nao foi possivel remover a musica.');
      return;
    }

    window.location.reload();
  });

  return button;
}

function formatMusicaName(musica) {
  const titulo = getField(musica, ['titulo', 'nome', 'title']);
  const artista = getField(musica, ['artista', 'autor', 'artist']);
  return artista && artista !== '-' ? `${titulo} - ${artista}` : titulo;
}

function getField(record, names) {
  const fieldName = names.find((name) => record?.[name]);
  return fieldName ? String(record[fieldName]) : '-';
}

function formatDate(value) {
  if (!value || value === '-') return '-';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
