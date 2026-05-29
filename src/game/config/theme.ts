export type ThemeMode = 'dark' | 'light'

export interface Theme {
  mode: ThemeMode
  bg: number      // Phaser hex (background)
  fg: number      // Phaser hex (foreground)
  fgCss: string   // CSS color string
  bgCss: string
}

export const THEMES: Record<ThemeMode, Theme> = {
  dark:  { mode: 'dark',  bg: 0x000000, fg: 0xffffff, fgCss: '#ffffff', bgCss: '#000000' },
  light: { mode: 'light', bg: 0xffffff, fg: 0x000000, fgCss: '#000000', bgCss: '#ffffff' },
}

const STORAGE_KEY = 'bookhive-theme'

export function loadTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  return THEMES[saved ?? 'dark']
}

export function toggleTheme(current: ThemeMode): Theme {
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, next)
  return THEMES[next]
}
