export function setupAutoHideToolbar(wrapper, {
  toolbarSelector = '.performance-toolbar, .transpose-toolbar',
  initiallyExpanded = false,
} = {}) {
  const toolbar = wrapper?.querySelector(toolbarSelector);
  if (!wrapper || !toolbar) return;

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'toolbar-hamburger-toggle';
  toggleButton.setAttribute('aria-label', 'Mostrar barra de ferramentas');
  toggleButton.title = 'Mostrar barra de ferramentas';
  toggleButton.innerHTML = '<span></span><span></span><span></span>';

  wrapper.classList.add('has-auto-toolbar');
  wrapper.classList.add('is-toolbar-collapsed');
  toolbar.after(toggleButton);

  function collapseToolbar() {
    wrapper.classList.add('is-toolbar-collapsed');
    toggleButton.setAttribute('aria-expanded', 'false');
    toggleButton.setAttribute('aria-label', 'Mostrar barra de ferramentas');
    toggleButton.title = 'Mostrar barra de ferramentas';
  }

  function expandToolbar() {
    wrapper.classList.remove('is-toolbar-collapsed');
    toggleButton.setAttribute('aria-expanded', 'true');
    toggleButton.setAttribute('aria-label', 'Ocultar barra de ferramentas');
    toggleButton.title = 'Ocultar barra de ferramentas';
  }

  const exitButton = toolbar.querySelector('.song-toolbar-back');
  if (exitButton) {
    const exitControl = document.createElement('div');
    exitControl.className = 'toolbar-exit-split';

    const collapseButton = document.createElement('button');
    collapseButton.type = 'button';
    collapseButton.className = 'nav-button icon-button toolbar-exit-collapse';
    collapseButton.innerHTML = '&#9662;';
    collapseButton.setAttribute('aria-label', 'Recolher menu');
    collapseButton.title = 'Recolher menu';
    collapseButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      collapseToolbar();
    });

    exitButton.before(exitControl);
    exitControl.append(exitButton, collapseButton);
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (wrapper.classList.contains('is-toolbar-collapsed')) {
      expandToolbar();
    } else {
      collapseToolbar();
    }
  });

  if (initiallyExpanded) {
    expandToolbar();
  } else {
    collapseToolbar();
  }
}
