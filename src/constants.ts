export const APP_NAME = 'JadvalPro'
export const APP_VERSION = '2026.1.0'
export const FILE_EXT = '.jadval'
export const FILE_VERSION = 1

/**
 * Public deploy rejimi — brauzerda ochilgan sayt (onrender.com, vercel, va h.k.).
 * TRUE bo'lsa:
 *   - Admin o'zini birinchi marta "Setup" qila olmaydi (backend login talab qilinadi)
 *   - Zavuch o'zini birinchi marta "Setup" qila olmaydi (admin yaratadi)
 *   - "Adminga Telegramda yozing" tugmasi ko'proq joyda ko'rinadi
 * FALSE (default) bo'lsa — Tauri desktop ilovasi uchun odatiy flow (lokal setup).
 */
export const IS_PUBLIC_DEPLOY = String(import.meta.env.VITE_PUBLIC_DEPLOY || '').toLowerCase() === 'true'

/** Hafta kunlari (standart 6 kunlik) */
export const DAYS_UZ = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba']
export const DAYS_SHORT = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']

/** Maksimal darslar soni (navbat gridi uchun) */
export const MAX_LESSONS = 16

/** Standart dars davomiyligi va tanaffus (daqiqa) */
export const DEFAULT_LESSON_MIN = 45
export const DEFAULT_BREAK_MIN = 5
