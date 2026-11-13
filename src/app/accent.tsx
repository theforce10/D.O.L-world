import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useActiveEvent } from '@/features/queue/api'
import { accentFor, SetAccentOverride, type AccentMode } from './accentMode'

const THEME_COLOR: Record<AccentMode, string> = { karaoke: '#14110a', mingle: '#160b0b', neutral: '#0e0d11' }
const VELVET_THEME_COLOR = '#180c24'

/** Attendee front-door pages get the plum "velvet" surface instead of grey-black (see index.css). */
const VELVET_PATHS = new Set(['/', '/login', '/signup', '/forgot-password', '/reset-password', '/onboarding'])

/** Sets data-mode on <html> from the live event's type. Pages can override it with useAccentMode(). */
export function AccentModeProvider({ children }: { children: ReactNode }) {
  const event = useActiveEvent()
  const { pathname } = useLocation()
  const [override, setOverride] = useState<AccentMode | null>(null)
  const mode = override ?? accentFor(event.data?.type)
  const velvet = VELVET_PATHS.has(pathname)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = mode
    if (velvet) root.dataset.surface = 'velvet'
    else delete root.dataset.surface
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', velvet ? VELVET_THEME_COLOR : THEME_COLOR[mode])
  }, [mode, velvet])

  return <SetAccentOverride.Provider value={setOverride}>{children}</SetAccentOverride.Provider>
}
