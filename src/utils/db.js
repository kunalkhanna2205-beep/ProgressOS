const DB_NAME = 'progressos_journal_db';
const STORE_NAME = 'entries';
const DB_VERSION = 1;

let dbPromise = null;

export function initDB() {
  if (typeof window !== 'undefined' && !window.indexedDB) return Promise.reject(new Error("IndexedDB unsupported"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => { dbPromise = null; reject(e.target.error); };
    });
  }
  return dbPromise;
}

export async function addEntry(entry) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = (e) => reject(tx.error);
  });
}

export async function getEntries() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    tx.oncomplete = () => {
      const entries = request.result || [];
      entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      resolve(entries);
    };
    tx.onerror = (e) => reject(tx.error);
  });
}

export async function deleteEntry(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(tx.error);
  });
}

export async function clearAllEntries() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(tx.error);
  });
}
