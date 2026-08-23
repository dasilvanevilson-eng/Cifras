import { RepertorioForm } from '../components/RepertorioForm.js';
import {
  getRepertorioById,
  updateRepertorio,
} from '../../../services/repertoriosService.js';
import { canEditContent } from '../../auth/roles.js';

export async function RepertorioEditarPage({ session } = {}) {
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

  if (!canEditContent(session?.profile?.papel)) {
    status.className = 'page-status error';
    status.textContent = 'Seu perfil nao tem permissao para editar repertorios.';
    return page;
  }

  try {
    const { data: repertorio, error } = await getRepertorioById(id);

    if (error) {
      throw error;
    }

    if (!canEditRepertorio(repertorio, session)) {
      status.className = 'page-status error';
      status.textContent = 'Seu usuario nao tem permissao para editar este repertorio.';
      return page;
    }

    page.replaceChildren(createEditView(id, repertorio));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function canEditRepertorio(repertorio, session = {}) {
  if (!canEditContent(session?.profile?.papel)) {
    return false;
  }

  if (session?.profile?.papel === 'admin') {
    return true;
  }

  if (repertorio?.criado_por && repertorio.criado_por === session?.user?.id) {
    return true;
  }

  return false;
}

function createEditView(id, repertorio) {
  const wrapper = document.createElement('section');
  wrapper.innerHTML = `
    <a class="back-link" href="/repertorios/detalhe?id=${encodeURIComponent(id)}">Voltar para o repertorio</a>
    <h1>Editar repertorio</h1>
    <div class="form-slot"></div>
  `;

  const formSlot = wrapper.querySelector('.form-slot');
  formSlot.append(RepertorioForm({
    initialValues: {
      nome: repertorio.nome || '',
      data: repertorio.data || '',
    },
    submitLabel: 'Salvar alteracoes',
    keepValuesAfterSubmit: true,
    onSubmit: async (values) => {
      const { error } = await updateRepertorio(id, values);

      if (error) {
        throw error;
      }

      window.location.href = `/repertorios/detalhe?id=${encodeURIComponent(id)}`;
    },
  }));

  return wrapper;
}
