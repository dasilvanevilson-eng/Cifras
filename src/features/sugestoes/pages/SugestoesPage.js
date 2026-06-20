import { canEditContent } from '../../auth/roles.js';
import { EnviarSugestaoPage } from './EnviarSugestaoPage.js';
import { RevisarSugestoesPage } from './RevisarSugestoesPage.js';

export async function SugestoesPage({ session } = {}) {
  if (!canEditContent(session?.profile?.papel)) {
    return EnviarSugestaoPage({ session });
  }

  const page = document.createElement('section');
  page.className = 'page sugestoes-page suggestions-hub-page';
  page.innerHTML = `
    <header class="dashboard-header">
      <div>
        <h1>Sugestoes</h1>
        <p data-page-info>Envie musicas, acompanhe seus pedidos e revise contribuicoes da equipe.</p>
      </div>
      <div class="tabs suggestions-tabs" role="tablist">
        <button class="nav-button is-active" type="button" data-tab="enviar">Enviar musica</button>
        <button class="nav-button" type="button" data-tab="revisar">Revisar sugestoes</button>
      </div>
    </header>
    <div class="tab-panel" data-panel="enviar"></div>
    <div class="tab-panel" data-panel="revisar" hidden></div>
  `;

  const enviarPanel = page.querySelector('[data-panel="enviar"]');
  const revisarPanel = page.querySelector('[data-panel="revisar"]');
  const buttons = [...page.querySelectorAll('[data-tab]')];

  const [enviarPage, revisarPage] = await Promise.all([
    EnviarSugestaoPage({ session }),
    RevisarSugestoesPage({ session }),
  ]);

  removeFirstHeading(enviarPage);
  removeFirstHeading(revisarPage);
  enviarPanel.append(enviarPage);
  revisarPanel.append(revisarPage);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = button.dataset.tab;

      buttons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });

      enviarPanel.hidden = selected !== 'enviar';
      revisarPanel.hidden = selected !== 'revisar';
    });
  });

  return page;
}

function removeFirstHeading(section) {
  const header = section.querySelector('.dashboard-header');
  if (header) {
    header.remove();
    return;
  }

  const heading = section.querySelector('h1');

  if (heading) {
    heading.remove();
  }
}
