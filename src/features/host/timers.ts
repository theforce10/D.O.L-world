export const TIMER_PRESETS = [
  { label: 'No timer', seconds: null },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
] as const

export function timerLabel(seconds: number | null): string {
  if (!seconds) return 'No timer'
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
