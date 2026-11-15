// The app's language choice, copied into IndexedDB for the service worker, which can't read
// localStorage (ADR 0006). Both sides treat a failure as "no choice": the worker then falls back
// to the device's language.
import type { Lang } from './dates'

const DB = 'swim-meet'
const STORE = 'settings'
const KEY = 'lang'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function saveLang(lang: Lang): Promise<void> {
  await run('readwrite', (store) => store.put(lang, KEY))
}

/** The stored choice, unchecked: the reader decides what counts as a language. */
export function readLang(): Promise<unknown> {
  return run('readonly', (store) => store.get(KEY))
}
