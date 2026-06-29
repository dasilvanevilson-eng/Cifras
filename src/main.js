import './app/browserCompat.js';
import { startApp } from './app/startApp.js';
import './styles/global.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/offline-worker.js?v=3').then((registration) => registration.update()).catch(() => {}));
}

startApp().catch((error) => {
  const root = document.querySelector('#app');

  if (!root) {
    return;
  }

  const message = document.createElement('div');
  message.className = 'page';
  message.innerHTML = `
    <div class="page-status error">
      Nao foi possivel iniciar o Master Cifras neste navegador.
      Tente atualizar a pagina ou usar um navegador mais recente.
    </div>
  `;

  root.replaceChildren(message);
  console.error(error);
});
