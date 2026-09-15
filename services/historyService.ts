import { HistoryItem } from '../types';

const DB_NAME = 'kotha_voice_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Don't store audioBuffer in IndexedDB (Blob is serializable and lightweight)
      const storableItem: any = {
        id: item.id,
        timestamp: item.timestamp,
        text: item.text,
        language: item.language,
        voiceCharacter: item.voiceCharacter,
        tone: item.tone,
        emotion: item.emotion,
        speed: item.speed,
        bgmTrack: item.bgmTrack,
        duration: item.duration,
        audioBlob: item.audioBlob,
      };

      const request = store.put(storableItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save to history DB:', err);
  }
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      // Read in reverse chronological order (newest first)
      const request = index.openCursor(null, 'prev');
      const items: HistoryItem[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to load history from DB:', err);
    return [];
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to delete history item:', err);
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}
