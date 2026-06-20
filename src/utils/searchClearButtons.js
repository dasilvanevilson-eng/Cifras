const SEARCH_CLEAR_READY = 'searchClearReady';

export function installSearchClearButtons(root = document) {
  if (!root?.querySelectorAll) return;

  const enhance = (input) => {
    if (input.dataset[SEARCH_CLEAR_READY] || input.disabled) return;

    const field = document.createElement('span');
    field.className = 'search-clear-field';
    input.before(field);
    field.append(input);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-clear-button';
    button.setAttribute('aria-label', `Limpar busca: ${getSearchLabel(input)}`);
    button.textContent = '×';
    field.append(button);

    const update = () => {
      const hasValue = Boolean(input.value);
      button.hidden = !hasValue;
      field.classList.toggle('has-value', hasValue);
    };

    button.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('search', { bubbles: true }));
      input.focus();
    });

    input.addEventListener('input', update);
    input.addEventListener('change', update);
    input.dataset[SEARCH_CLEAR_READY] = 'true';
    update();
  };

  const enhanceAll = (node = root) => {
    if (node.matches?.('input[type="search"]')) enhance(node);
    node.querySelectorAll?.('input[type="search"]').forEach(enhance);
  };

  enhanceAll();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) enhanceAll(node);
      });
    });
  });

  observer.observe(root, { childList: true, subtree: true });
}

function getSearchLabel(input) {
  return input.getAttribute('aria-label')
    || input.getAttribute('placeholder')
    || 'campo de busca';
}
