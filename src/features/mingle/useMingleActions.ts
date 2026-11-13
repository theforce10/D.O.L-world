import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthProvider'
import { clearPendingAction, readPendingAction, savePendingAction, type PendingActionKind } from '@/features/auth/pendingAction'
import { isProfileComplete, useProfile } from '@/features/profile/api'
import { useMyCheckIn } from './api'

export type MingleSheet = 'auth' | 'check_in' | null

type Handlers = Partial<Record<Exclude<PendingActionKind, 'check_in'>, (payload?: Record<string, string>) => void>>

export const ONBOARDING_FROM_MINGLE = '/onboarding?next=%2F&consent=later'

/**
 * Guests can look at everything, but voting, asking, connecting and checking in need an account,
 * a complete profile and (except check-in itself) a check-in. This walks them through whichever
 * step is missing, then finishes what they tapped. Survives the Google redirect via sessionStorage.
 */
export function useMingleActions(eventId: string | undefined, handlers: Handlers) {
  const { session } = useAuth()
  const profile = useProfile()
  const checkIn = useMyCheckIn(eventId)
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<MingleSheet>(null)

  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  const signedIn = Boolean(session)
  const profileReady = profile.isSuccess
  const complete = isProfileComplete(profile.data)
  const checkInReady = checkIn.isSuccess
  const checkedIn = Boolean(checkIn.data)

  const advance = useCallback(
    (kind: PendingActionKind, payload?: Record<string, string>, fromResume = false) => {
      if (!eventId) return
      if (!signedIn) {
        savePendingAction({ kind, eventId, payload })
        setSheet('auth')
        return
      }
      if (!profileReady || !checkInReady) return
      if (!complete) {
        savePendingAction({ kind, eventId, payload })
        navigate(ONBOARDING_FROM_MINGLE)
        return
      }
      if (!checkedIn) {
        if (kind === 'check_in') clearPendingAction()
        else savePendingAction({ kind, eventId, payload })
        setSheet('check_in')
        return
      }
      clearPendingAction()
      if (kind !== 'check_in') handlersRef.current[kind]?.(payload)
      else if (!fromResume) setSheet(null)
    },
    [eventId, signedIn, profileReady, checkInReady, complete, checkedIn, navigate],
  )

  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !eventId || !signedIn || !profileReady || !checkInReady) return
    resumed.current = true
    const pending = readPendingAction()
    if (!pending) return
    if (pending.eventId !== eventId) {
      clearPendingAction()
      return
    }
    advance(pending.kind, pending.payload, true)
  }, [eventId, signedIn, profileReady, checkInReady, advance])

  const closeSheet = useCallback(() => {
    clearPendingAction()
    setSheet(null)
  }, [])

  /** Call after a successful check-in: finishes the vote/ask/connect that led here, if any. */
  const afterCheckIn = useCallback(() => {
    setSheet(null)
    const pending = readPendingAction()
    clearPendingAction()
    if (pending && pending.kind !== 'check_in' && pending.eventId === eventId) handlersRef.current[pending.kind]?.(pending.payload)
  }, [eventId])

  return { sheet: sheet === 'auth' && signedIn ? null : sheet, closeSheet, request: advance, afterCheckIn, checkIn }
}
