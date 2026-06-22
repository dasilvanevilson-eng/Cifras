import { listMusicas } from './musicasService.js';
import { listMusicasDoRepertorio, listRepertorios } from './repertoriosService.js';

const DATABASE_NAME = 'master-cifras-offline';
const STORE_NAME = 'library-snapshots';

export async function syncOfflineLibrary(userId) {
  const [{ data: musicas, error: musicasError }, { data: repertorios, error: repertoriosError }] = await Promise.all([
    listMusicas(),
    listRepertorios(),
  ]);
  if (musicasError) throw musicasError;
  if (repertoriosError) throw repertoriosError;

  const associations = await Promise.all((repertorios || []).map(async (repertorio) => {
    const { data, error } = await listMusicasDoRepertorio(repertorio.id);
    if (error) throw error;
    return [repertorio.id, data || []];
  }));

  const snapshot = {
    userId,
    musicas: musicas || [],
    repertorios: repertorios || [],
    associacoes: Object.fromEntries(associations),
    syncedAt: new Date().toISOString(),
  };
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function getOfflineLibrary(userId) {
  if (!userId || !('indexedDB' in window)) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export function isOfflineMode() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function saveSnapshot(snapshot) {
  if (!('indexedDB' in window)) {
    throw new Error('Este navegador nao oferece armazenamento local para o Modo Offline.');
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(snapshot);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
