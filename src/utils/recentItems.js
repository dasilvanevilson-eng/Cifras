const STORAGE_KEY = 'masterCifras.recentItems';
const MAX_ITEMS = 8;

export function addRecentItem(item) {
  const items = getRecentItems();
  const nextItems = [
    {
      ...item,
      accessedAt: new Date().toISOString(),
    },
    ...items.filter((current) => current.url !== item.url),
  ].slice(0, MAX_ITEMS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

export function getRecentItems() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (error) {
    return [];
  }
}
