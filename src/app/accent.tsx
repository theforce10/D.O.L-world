import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { useActiveEvent } from '@/features/queue/api'
import { accentFor, SetAccentOverride, type AccentMode } from './accentMode'

type Surface = 'velvet' | 'midnight' | 'lagoon' | 'cosmos' | 'cocoa'

/** Browser chrome colour per surface (matches --color-night-900 for that surface in index.css). */
const SURFACE_THEME_COLOR: Record<Surface, string> = {
  velvet: '#180c24',
  midnight: '#0a1226',
  lagoon: '#071916',
  cosmos: '#110f2c',
  cocoa: '#1a120c',
}

/** Attendee front-door pages get the plum "velvet" surface. */
const VELVET_PATHS = new Set(['/', '/login', '/signup', '/forgot-password', '/reset-password', '/onboarding'])

/** Every area gets its own tinted surface instead of grey-black (see index.css). */
function surfaceFor(pathname: string): Surface {
  if (VELVET_PATHS.has(pathname)) return 'velvet'
  if (pathname.startsWith('/screen/') || /^\/admin\/events\/[^/]+\/host/.test(pathname)) return 'cosmos'
  if (pathname.startsWith('/admin')) return 'lagoon'
  if (pathname.startsWith('/profile') || pathname.startsWith('/connect')) return 'midnight'
  return 'cocoa'
}

/** Sets data-mode on <html> from the live event's type. Pages can override it with useAccentMode(). */
export function AccentModeProvider({ children }: { children: ReactNode }) {
  const event = useActiveEvent()
  const { pathname } = useLocation()
  const [override, setOverride] = useState<AccentMode | null>(null)
  const mode = override ?? accentFor(event.data?.type)
  const surface = surfaceFor(pathname)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = mode
    root.dataset.surface = surface
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SURFACE_THEME_COLOR[surface])
  }, [mode, surface])

  return <SetAccentOverride.Provider value={setOverride}>{children}</SetAccentOverride.Provider>
}
