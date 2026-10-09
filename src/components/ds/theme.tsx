'use client'

import { useCallback, useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { IconButton } from './button'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

const read = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const write = (key: string, v: string) => { try { localStorage.setItem(key, v) } catch { /* storage bloccato */ } }

/** Tema (cipria/prugna) e SILENZIO, applicati come attributi su <html> */
export function useDsPrefs() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [quiet, setQuietState] = useState(false)

  useEffect(() => {
    const saved = read('ds-theme') as Theme | null
    const initial = saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setThemeState(initial)
    setQuietState(read('ds-quiet') === 'true')
  }, [])

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { document.documentElement.dataset.quiet = String(quiet) }, [quiet])

  const setTheme = useCallback((t: Theme) => { setThemeState(t); write('ds-theme', t) }, [])
  const setQuiet = useCallback((q: boolean) => { setQuietState(q); write('ds-quiet', String(q)) }, [])

  return { theme, setTheme, quiet, setQuiet }
}

/** Interruttore SILENZIO, ripreso dal sito: spegne animazioni, shader e suoni */
export function QuietSwitch({ quiet, onChange }: { quiet: boolean; onChange: (q: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={quiet}
      onClick={() => onChange(!quiet)}
      className={cn(
        'h-7 px-2.5 border text-[10px] font-semibold uppercase tracking-[0.24em] ds-anim transition-colors',
        quiet ? 'bg-ds-ink text-ds-bg border-ds-ink' : 'bg-transparent text-ds-muted border-ds-line hover:text-ds-text',
      )}
    >
      Silenzio
    </button>
  )
}

export function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const dark = theme === 'dark'
  return (
    <IconButton label={dark ? 'Passa al tema chiaro' : 'Passa al tema scuro'} size="sm" onClick={() => onChange(dark ? 'light' : 'dark')}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </IconButton>
  )
}
