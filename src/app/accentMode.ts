import { createContext, useContext, useEffect } from 'react'
import type { EventType } from '@/lib/types'

/** karaoke = yellow, mingle = red, neutral = ivory (no live event). See the data-mode blocks in index.css. */
export type AccentMode = 'karaoke' | 'mingle' | 'neutral'

export function accentFor(type: EventType | null | undefined): AccentMode {
  if (type === 'karaoke') return 'karaoke'
  if (type === 'mix_mingle') return 'mingle'
  return 'neutral'
}

export const SetAccentOverride = createContext<(mode: AccentMode | null) => void>(() => {})

/** Force the accent while this component is mounted, e.g. an admin page showing a specific event. */
export function useAccentMode(mode: AccentMode | undefined) {
  const set = useContext(SetAccentOverride)
  useEffect(() => {
    if (!mode) return
    set(mode)
    return () => set(null)
  }, [mode, set])
}
