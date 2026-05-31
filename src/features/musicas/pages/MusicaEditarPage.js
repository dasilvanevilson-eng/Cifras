import { MusicaForm } from '../components/MusicaForm.js';
import { getMusicaById, updateMusica } from '../../../services/musicasService.js';
import { convertToChordPro } from '../../../utils/chordpro.js';

export async function MusicaEditarPage() {
  const page = document.createElement('section');
  page.className = 'page';
  page.innerHTML = '<div class="page-status">Carregando musica...</div>';

  const status = page.querySelector('.page-status');
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    status.className = 'page-status error';
    status.textContent = 'Musica nao informada.';
    return page;
  }

  try {
    const { data: musica, error } = await getMusicaById(id);

    if (error) {
      throw error;
    }

    page.replaceChildren(createEditView(id, musica));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createEditView(id, musica) {
  const wrapper = document.createElement('section');
  wrapper.innerHTML = `
    <a class="back-link" href="/musicas/detalhe?id=${encodeURIComponent(id)}">Voltar para a musica</a>
    <h1>Editar musica</h1>
    <div class="form-slot"></div>
  `;

  const formSlot = wrapper.querySelector('.form-slot');
  formSlot.append(MusicaForm({
    initialValues: {
      titulo: musica.titulo || '',
      artista: musica.artista || '',
      tom: musica.tom || '',
      cifra_original: musica.cifra_original || '',
    },
    submitLabel: 'Salvar alteracoes',
    keepValuesAfterSubmit: true,
    onSubmit: async (values) => {
      const payload = {
        ...values,
        cifra_chordpro: convertToChordPro(values.cifra_original),
      };

      const { error } = await updateMusica(id, payload);

      if (error) {
        throw error;
      }

      window.location.href = `/musicas/detalhe?id=${encodeURIComponent(id)}`;
    },
  }));

  return wrapper;
}
