import { RepertorioForm } from '../components/RepertorioForm.js';
import { getRepertorioById, updateRepertorio } from '../../../services/repertoriosService.js';
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

    page.replaceChildren(createEditView(id, repertorio));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
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
      tipo: repertorio.tipo || '',
      horario: repertorio.horario || '',
      local: repertorio.local || '',
      responsavel: repertorio.responsavel || '',
      observacoes: repertorio.observacoes || '',
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
