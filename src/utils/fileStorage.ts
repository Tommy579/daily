/**
 * Module de stockage local persistant pour documents et fichiers PDF (IndexedDB).
 * Permet de conserver des centaines de Mo de fichiers volumineux sans saturer
 * le quota de 5 Mo de localStorage, avec chargement instantané (0 ms).
 */

const DB_NAME = 'marges_documents_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDocDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB non disponible'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sauvegarde un Blob / File dans IndexedDB sous une ou plusieurs clés.
 */
export async function saveDocumentBlob(key: string, blob: Blob | File): Promise<void> {
  try {
    const db = await openDocDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key.toLowerCase());
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[DocStorage] Erreur sauvegarde IndexedDB:', err);
  }
}

/**
 * Récupère un Blob depuis IndexedDB.
 */
export async function getDocumentBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDocDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key.toLowerCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Recherche intelligente d'un document PDF selon plusieurs variantes de chemin et nom.
 */
export async function findDocumentBlob(
  userId: string | undefined,
  subject: string,
  folder: string,
  fileName: string
): Promise<Blob | null> {
  const cleanUser = userId || 'anon';
  const cleanSubject = subject.trim();
  const cleanFolder = folder.trim();
  const cleanFile = fileName.trim();

  const candidateKeys = [
    `doc:${cleanUser}:${cleanSubject}:${cleanFolder}:${cleanFile}`,
    `doc:${cleanUser}:${cleanSubject}:${cleanFile}`,
    `doc:${cleanUser}:${cleanFile}`,
    `doc:${cleanSubject}:${cleanFolder}:${cleanFile}`,
    `doc:${cleanSubject}:${cleanFile}`,
    `doc:${cleanFile}`,
    `${cleanSubject}/${cleanFolder}/${cleanFile}`,
    `${cleanSubject}/${cleanFile}`,
    cleanFile,
  ];

  for (const k of candidateKeys) {
    const blob = await getDocumentBlob(k);
    if (blob) return blob;
  }

  return null;
}

/**
 * Convertit un DataURL base64 (ex: data:application/pdf;base64,...) en un Blob natif.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Supprime un document d'IndexedDB.
 */
export async function deleteDocumentBlob(key: string): Promise<void> {
  try {
    const db = await openDocDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key.toLowerCase());
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[DocStorage] Erreur suppression:', err);
  }
}
