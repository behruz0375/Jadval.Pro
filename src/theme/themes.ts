export interface ThemeDef {
  id: string
  label: string
  dark?: boolean
}

export const THEMES: ThemeDef[] = [
  { id: 'softgray', label: 'JadvalPro (asosiy)' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark', dark: true },
  { id: 'midnight', label: 'Midnight', dark: true },
  { id: 'blue', label: 'Blue' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'violet', label: 'Violet' },
  { id: 'contrast', label: 'Contrast' },
]

export const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200]
