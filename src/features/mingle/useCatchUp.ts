import { useCallback, useEffect, useRef, useState } from 'react'

const AWAY_MS = 15 * 60_000
const lastSeenKey = (eventId: string) => `dol:last-seen:${eventId}`
const dismissedKey = (eventId: string) => `dol:catchup-dismissed:${eventId}`

function readTime(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeTime(key: string, value = Date.now()) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Storage blocked: the catch-up just won't auto-open next time.
  }
}

interface CatchUpInput {
  eventId: string
  doneCount: number
  checkedInAt: string | null | undefined
  firstTopicStartedAt: string | null | undefined
}

/**
 * Opens "What you missed" automatically for: a first visit once topics have finished,
 * coming back after 15+ minutes away (reload or returning to the tab), or checking in
 * after the first topic went live. Always openable by hand.
 */
export function useCatchUp({ eventId, doneCount, checkedInAt, firstTopicStartedAt }: CatchUpInput) {
  const [initial] = useState(() => {
    const now = Date.now()
    const lastSeen = readTime(lastSeenKey(eventId))
    return {
      firstVisit: lastSeen === null,
      away: lastSeen !== null && now - lastSeen > AWAY_MS,
      dismissedAt: readTime(dismissedKey(eventId)),
    }
  })
  const [dismissed, setDismissed] = useState(false)
  const [manual, setManual] = useState(false)
  const [returnedAfterAway, setReturnedAfterAway] = useState(false)
  const lastSeen = useRef(0)

  useEffect(() => {
    const beat = () => {
      lastSeen.current = Date.now()
      writeTime(lastSeenKey(eventId))
    }
    beat()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') beat()
    }, 60_000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') return beat()
      if (Date.now() - lastSeen.current > AWAY_MS) {
        setReturnedAfterAway(true)
        setDismissed(false)
      }
      beat()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [eventId])

  const latecomer = Boolean(
    checkedInAt &&
    firstTopicStartedAt &&
    checkedInAt > firstTopicStartedAt &&
    (!initial.dismissedAt || initial.dismissedAt < new Date(checkedInAt).getTime()),
  )
  const auto = doneCount > 0 && (initial.firstVisit || initial.away || returnedAfterAway || latecomer)

  const dismiss = useCallback(() => {
    writeTime(dismissedKey(eventId))
    setDismissed(true)
    setManual(false)
    setReturnedAfterAway(false)
  }, [eventId])

  const open = useCallback(() => {
    setManual(true)
    setDismissed(false)
  }, [])

  return { visible: doneCount > 0 && (manual || (auto && !dismissed)), open, dismiss }
}
