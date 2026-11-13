export type PendingActionKind = 'check_in' | 'vote' | 'ask' | 'connect'

export interface PendingAction {
  kind: PendingActionKind
  eventId: string
  payload?: Record<string, string>
  savedAt: number
}

const KEY = 'dol:pending-action'
const MAX_AGE_MS = 30 * 60_000

export function savePendingAction(action: Omit<PendingAction, 'savedAt'>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...action, savedAt: Date.now() }))
  } catch {
    // Private mode or storage blocked: the guest just taps the button again after signing in.
  }
}

export function readPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const action = JSON.parse(raw) as PendingAction
    if (typeof action?.kind !== 'string' || typeof action.eventId !== 'string' || Date.now() - action.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return action
  } catch {
    return null
  }
}

export function clearPendingAction() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
