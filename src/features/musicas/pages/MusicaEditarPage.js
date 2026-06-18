import { MusicaForm } from '../components/MusicaForm.js';
import { getMusicaById, updateMusica } from '../../../services/musicasService.js';
import { canEditContent } from '../../auth/roles.js';

export async function MusicaEditarPage({ session } = {}) {
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

  if (!canEditContent(session?.profile?.papel)) {
    status.className = 'page-status error';
    status.textContent = 'Seu perfil nao tem permissao para editar musicas.';
    return page;
  }

  try {
    const { data: musica, error } = await getMusicaById(id);

    if (error) {
      throw error;
    }

    page.replaceChildren(createEditView(id, musica, session));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar a musica.';
  }

  return page;
}

function createEditView(id, musica, session = {}) {
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
      tags: musica.tags || '',
      musica_link: musica.musica_link || '',
      colaborador_nome: musica.colaborador_nome || '',
      revisado_por_nome: musica.revisado_por_nome || getReviewerName(session),
      cifra_original: musica.cifra_original || '',
      cifra_chordpro: musica.cifra_chordpro || musica.chordpro || musica.conteudo_chordpro || '',
      cifra_editor_state: musica.cifra_editor_state || null,
    },
    submitLabel: 'Salvar alteracoes',
    keepValuesAfterSubmit: true,
    onSubmit: async (values) => {
      const { error } = await updateMusica(id, {
        ...values,
        revisado_por_nome: getReviewerName(session),
      });

      if (error) {
        throw error;
      }

      window.location.href = `/musicas/detalhe?id=${encodeURIComponent(id)}`;
    },
  }));

  return wrapper;
}

function getReviewerName(session = {}) {
  return session?.profile?.nome || session?.user?.email || 'Usuario';
}
