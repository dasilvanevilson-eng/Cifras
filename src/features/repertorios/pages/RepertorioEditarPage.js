import { RepertorioForm } from '../components/RepertorioForm.js';
import { listShareableProfiles } from '../../../services/profilesService.js';
import {
  getRepertorioById,
  listRepertorioCompartilhamentos,
  replaceRepertorioCompartilhamentos,
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
    const [
      { data: repertorio, error },
      { data: users, error: usersError },
      { data: compartilhamentos, error: compartilhamentosError },
    ] = await Promise.all([
      getRepertorioById(id),
      listShareableProfiles(),
      listRepertorioCompartilhamentos(id),
    ]);

    if (error) {
      throw error;
    }
    if (usersError) throw usersError;
    if (compartilhamentosError) throw compartilhamentosError;

    if (!canEditRepertorio(repertorio, compartilhamentos || [], session)) {
      status.className = 'page-status error';
      status.textContent = 'Seu usuario nao tem permissao para editar este repertorio.';
      return page;
    }

    page.replaceChildren(createEditView(id, repertorio, users || [], compartilhamentos || []));
  } catch (error) {
    status.className = 'page-status error';
    status.textContent = error.message || 'Nao foi possivel carregar o repertorio.';
  }

  return page;
}

function canEditRepertorio(repertorio, compartilhamentos, session = {}) {
  if (!canEditContent(session?.profile?.papel)) {
    return false;
  }

  if (session?.profile?.papel === 'admin') {
    return true;
  }

  if (repertorio?.criado_por && repertorio.criado_por === session?.user?.id) {
    return true;
  }

  if (!repertorio?.permite_edicao_compartilhada) {
    return false;
  }

  if (repertorio.visibilidade === 'publico') {
    return true;
  }

  if (repertorio.visibilidade === 'seletivo') {
    return compartilhamentos.some((item) => item.user_id === session?.user?.id);
  }

  return false;
}

function createEditView(id, repertorio, users, compartilhamentos) {
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
      visibilidade: repertorio.visibilidade || 'publico',
      permite_edicao_compartilhada: Boolean(repertorio.permite_edicao_compartilhada),
      compartilhado_com: compartilhamentos.map((item) => item.user_id),
    },
    users,
    submitLabel: 'Salvar alteracoes',
    keepValuesAfterSubmit: true,
    onSubmit: async (values) => {
      const { compartilhadoCom, ...repertorioValues } = values;
      const { error } = await updateRepertorio(id, repertorioValues);

      if (error) {
        throw error;
      }

      const { error: compartilhamentoError } = await replaceRepertorioCompartilhamentos(id, compartilhadoCom);

      if (compartilhamentoError) {
        throw compartilhamentoError;
      }

      window.location.href = `/repertorios/detalhe?id=${encodeURIComponent(id)}`;
    },
  }));

  return wrapper;
}
