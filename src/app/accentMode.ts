import { createContext, useContext, useEffect } from 'react'
import type { EventType } from '@/lib/types'

export type AccentMode = 'karaoke' | 'mingle' | 'neutral'

export function accentFor(type: EventType | null | undefined): AccentMode {
  if (type === 'karaoke') return 'karaoke'
  if (type === 'mix_mingle') return 'mingle'
  return 'neutral'
}

export const SetAccentOverride = createContext<(mode: AccentMode | null) => void>(() => {})

export function useAccentMode(mode: AccentMode | undefined) {
  const set = useContext(SetAccentOverride)
  useEffect(() => {
    if (!mode) return
    set(mode)
    return () => set(null)
  }, [mode, set])
}
