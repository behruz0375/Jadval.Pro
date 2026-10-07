import type { StateStorage } from 'zustand/middleware'

const DB_NAME = 'jadvalpro-db'
const STORE = 'kv'

/** Saqlash xatosi haqida foydalanuvchini ogohlantirish (spam bo'lmasligi uchun 30s throttle) */
let lastWriteErrorAt = 0
async function reportWriteError() {
  const now = Date.now()
  if (now - lastWriteErrorAt < 30_000) return
  lastWriteErrorAt = now
  try {
    const { useToast } = await import('./toast')
    useToast.getState().error("Ma'lumotlarni saqlab bo'lmadi — disk to'la yoki brauzer xotirasi yopiq bo'lishi mumkin")
  } catch {
    /* toast ham ishlamasa — jim */
  }
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE)
    }
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    }
  })
}

/** Zustand persist uchun IndexedDB saqlash (localStorage 5MB chegarasidan xoli) */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await run<string | undefined>('readonly', (s) => s.get(name))
      return v ?? null
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await run('readwrite', (s) => s.put(value, name))
    } catch {
      void reportWriteError()
    }
  },
  removeItem: async (name) => {
    try {
      await run('readwrite', (s) => s.delete(name))
    } catch {
      /* ignore */
    }
  },
}
