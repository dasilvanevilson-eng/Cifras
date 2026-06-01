import { RepertorioForm } from '../components/RepertorioForm.js';
import { createRepertorio, listRepertorios } from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

export async function RepertoriosPage({ session } = {}) {
  const canEdit = canEditContent(session?.profile?.papel);
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Repertorios</h1>
    <div class="page-grid">
      <section>
        <h2>Cadastrar repertorio</h2>
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Repertorios cadastrados</h2>
        <div class="list-slot">
          <div class="page-status">Carregando repertorios...</div>
        </div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  if (canEdit) {
    formSlot.append(RepertorioForm({
      onSubmit: async (repertorio) => {
        const { error } = await createRepertorio(repertorio);

        if (error) {
          throw error;
        }

        window.location.reload();
      },
    }));
  } else {
    formSlot.append(createReadOnlyNotice('Seu perfil pode visualizar repertorios, mas nao cadastrar ou editar.'));
  }

  try {
    const { data, error } = await listRepertorios();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      status.textContent = 'Nenhum repertorio cadastrado ainda.';
      return page;
    }

    listSlot.replaceChildren(createRepertoriosTable(data));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar os repertorios.';
  }

  return page;
}

function createReadOnlyNotice(text) {
  const notice = document.createElement('p');
  notice.className = 'page-status';
  notice.textContent = text;
  return notice;
}

function createRepertoriosTable(repertorios) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nome</th>
        <th>Data</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  repertorios.forEach((repertorio) => {
    const row = document.createElement('tr');
    const id = getField(repertorio, ['id']);
    const nome = getField(repertorio, ['nome', 'titulo', 'name']);

    row.innerHTML = `
      <td><a href="/repertorios/detalhe?id=${encodeURIComponent(id)}">${escapeHtml(nome)}</a></td>
      <td>${escapeHtml(formatDate(getField(repertorio, ['data', 'date'])))}</td>
    `;
    body.append(row);
  });

  return table;
}

function getField(record, names) {
  const fieldName = names.find((name) => record[name]);
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
