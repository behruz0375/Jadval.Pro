/**
 * Doimiy saqlash (Persistent Storage) — brauzer ma'lumotni joy tanqisligida
 * avtomatik o'chirib yubormasligini so'raydi. IndexedDB'dagi ma'lumot:
 *  - telefon/kompyuter o'chib-yoqilsa ham saqlanadi ✅
 *  - brauzer yopilsa ham saqlanadi ✅
 *  - foydalanuvchi SAYT MA'LUMOTLARINI QO'LDA tozalasa — baribir o'chadi (brauzer cheklovi).
 *    Bunga qarshi yagona yo'l: .jadval faylga saqlash yoki .exe (Tauri) versiyasi.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!('storage' in navigator) || !navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/** Saqlash hajmi holati (ixtiyoriy — diagnostika uchun) */
export async function storageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean }> {
  const out = { usage: 0, quota: 0, persisted: false }
  try {
    const est = await navigator.storage?.estimate?.()
    out.usage = est?.usage ?? 0
    out.quota = est?.quota ?? 0
    out.persisted = (await navigator.storage?.persisted?.()) ?? false
  } catch {
    /* ignore */
  }
  return out
}
