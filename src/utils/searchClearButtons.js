const SEARCH_CLEAR_READY = 'searchClearReady';
const RECENT_ITEMS_KEY = 'master-cifras:recent-items';
let recentItemsListenerInstalled = false;

export function installSearchClearButtons(root = document) {
  if (!root?.querySelectorAll) return;
  installRecentItemsListener();

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
    const history = document.createElement('div');
    history.className = 'search-history-menu';
    history.hidden = true;
    field.append(history);
    const historyKey = `master-cifras:search:${input.dataset.searchHistoryKey || input.dataset.search || input.dataset.action || input.name || input.placeholder || 'default'}`;

    const readHistory = () => {
      try { return JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch { return []; }
    };
    const saveSearch = (value) => {
      const query = String(value || '').trim();
      if (!query) return;
      const items = [query, ...readHistory().filter((item) => item !== query)].slice(0, 8);
      localStorage.setItem(historyKey, JSON.stringify(items));
    };
    const showHistory = () => {
      const items = readRecentItems();
      history.replaceChildren();
      if (!items.length || input.value) { history.hidden = true; return; }
      const title = document.createElement('span');
      title.className = 'search-history-title'; title.textContent = 'Buscas recentes'; history.append(title);
      items.forEach((item) => {
        const itemButton = document.createElement('button');
        itemButton.type = 'button'; itemButton.textContent = item.title;
        itemButton.addEventListener('mousedown', (event) => event.preventDefault());
        itemButton.addEventListener('click', () => { window.location.href = item.href; });
        history.append(itemButton);
      });
      history.hidden = false;
    };

    const update = () => {
      const hasValue = Boolean(input.value);
      button.hidden = !hasValue;
      field.classList.toggle('has-value', hasValue);
      if (hasValue) history.hidden = true;
    };

    button.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('search', { bubbles: true }));
      input.focus();
    });

    input.addEventListener('input', update);
    input.addEventListener('change', update);
    input.addEventListener('focus', showHistory);
    input.addEventListener('blur', () => window.setTimeout(() => { history.hidden = true; }, 120));
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') saveSearch(input.value); });
    input.addEventListener('change', () => saveSearch(input.value));
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

function installRecentItemsListener() {
  if (recentItemsListenerInstalled) return;
  recentItemsListenerInstalled = true;
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || !link.href.startsWith(window.location.origin)) return;
    const title = String(link.textContent || '').trim();
    if (!title || title.length < 2) return;
    const item = { title, href: link.href };
    const items = [item, ...readRecentItems().filter((entry) => entry.href !== item.href)].slice(0, 8);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items));
  }, true);
}

function readRecentItems() {
  try {
    const items = JSON.parse(localStorage.getItem(RECENT_ITEMS_KEY) || '[]');
    return Array.isArray(items) ? items.filter((item) => item?.title && item?.href) : [];
  } catch { return []; }
}

export function recordRecentItem(page) {
  if (!/\/(musicas|repertorios)\/(detalhe|execucao)/.test(window.location.pathname)) return;
  const title = String(page?.querySelector('h1, h2')?.textContent || '').trim();
  if (!title) return;
  const item = { title, href: window.location.href };
  const items = [item, ...readRecentItems().filter((entry) => entry.href !== item.href)].slice(0, 8);
  localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(items));
}

function getSearchLabel(input) {
  return input.getAttribute('aria-label')
    || input.getAttribute('placeholder')
    || 'campo de busca';
}
