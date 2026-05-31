import { MusicaForm } from '../components/MusicaForm.js';
import { createMusica, listMusicas } from '../../../services/musicasService.js';
import { convertToChordPro } from '../../../utils/chordpro.js';

export async function MusicasPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = `
    <h1>Musicas</h1>
    <div class="page-grid">
      <section>
        <h2>Cadastrar musica</h2>
        <div class="form-slot"></div>
      </section>
      <section>
        <h2>Musicas cadastradas</h2>
        <div class="list-slot">
          <div class="page-status">Carregando musicas...</div>
        </div>
      </section>
    </div>
  `;

  const formSlot = page.querySelector('.form-slot');
  const listSlot = page.querySelector('.list-slot');
  const status = page.querySelector('.page-status');

  formSlot.append(MusicaForm({
    onSubmit: async (musica) => {
      const payload = {
        ...musica,
        cifra_chordpro: convertToChordPro(musica.cifra_original),
      };

      const { error } = await createMusica(payload);

      if (error) {
        throw error;
      }

      window.location.reload();
    },
  }));

  try {
    const { data, error } = await listMusicas();

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      status.textContent = 'Nenhuma musica cadastrada ainda.';
      return page;
    }

    listSlot.replaceChildren(createMusicasTable(data));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar as musicas.';
  }

  return page;
}

function createMusicasTable(musicas) {
  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Titulo</th>
        <th>Artista</th>
        <th>Tom</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector('tbody');

  musicas.forEach((musica) => {
    const row = document.createElement('tr');
    const id = getField(musica, ['id']);
    const title = getField(musica, ['titulo', 'nome', 'title']);

    row.innerHTML = `
      <td><a href="/musicas/detalhe?id=${encodeURIComponent(id)}">${escapeHtml(title)}</a></td>
      <td>${escapeHtml(getField(musica, ['artista', 'autor', 'artist']))}</td>
      <td>${escapeHtml(getField(musica, ['tom', 'key']))}</td>
    `;
    body.append(row);
  });

  return table;
}

function getField(record, names) {
  const fieldName = names.find((name) => record[name]);
  return fieldName ? record[fieldName] : '-';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
