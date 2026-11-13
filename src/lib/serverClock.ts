import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Milliseconds to add to Date.now() to get the database's clock. Fetched once per session. */
export function useServerClockOffset(): number {
  const { data } = useQuery({
    queryKey: ['server-clock-offset'],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const sentAt = Date.now()
      const { data, error } = await supabase.rpc('server_now')
      if (error) throw error
      const receivedAt = Date.now()
      return new Date(data).getTime() - (sentAt + receivedAt) / 2
    },
  })
  return data ?? 0
}

export interface Countdown {
  totalMs: number
  remainingMs: number
  done: boolean
}

/** Ticks a countdown from startedAt + durationSeconds using server time. Null when there's no timer. */
export function useCountdown(startedAt: string | null | undefined, durationSeconds: number | null | undefined): Countdown | null {
  const offset = useServerClockOffset()
  const [now, setNow] = useState(() => Date.now())
  const active = Boolean(startedAt && durationSeconds)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active])

  if (!startedAt || !durationSeconds) return null
  const totalMs = durationSeconds * 1000
  const endsAt = new Date(startedAt).getTime() + totalMs
  const remainingMs = Math.max(0, endsAt - (now + offset))
  return { totalMs, remainingMs, done: remainingMs === 0 }
}

export function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
