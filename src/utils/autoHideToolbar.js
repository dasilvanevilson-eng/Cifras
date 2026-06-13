const TOOLBAR_IDLE_DELAY = 10000;

export function setupAutoHideToolbar(wrapper, {
  toolbarSelector = '.performance-toolbar, .transpose-toolbar',
  delay = TOOLBAR_IDLE_DELAY,
} = {}) {
  const toolbar = wrapper?.querySelector(toolbarSelector);
  if (!wrapper || !toolbar) return;

  let timer = null;
  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'toolbar-hamburger-toggle';
  toggleButton.setAttribute('aria-label', 'Mostrar barra de ferramentas');
  toggleButton.title = 'Mostrar barra de ferramentas';
  toggleButton.innerHTML = '<span></span><span></span><span></span>';

  wrapper.classList.add('has-auto-toolbar');
  toolbar.after(toggleButton);

  function scheduleCollapse() {
    window.clearTimeout(timer);
    timer = window.setTimeout(collapseToolbar, delay);
  }

  function collapseToolbar() {
    wrapper.classList.add('is-toolbar-collapsed');
    toggleButton.setAttribute('aria-expanded', 'false');
  }

  function expandToolbar() {
    wrapper.classList.remove('is-toolbar-collapsed');
    toggleButton.setAttribute('aria-expanded', 'true');
    scheduleCollapse();
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    expandToolbar();
  });

  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focusin', 'scroll'].forEach((eventName) => {
    wrapper.addEventListener(eventName, expandToolbar, { passive: true, capture: eventName === 'scroll' });
  });

  scheduleCollapse();
}
