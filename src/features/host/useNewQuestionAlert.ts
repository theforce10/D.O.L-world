import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { HostQuestion } from './api'

/** Toasts once per new question, after the first load. */
export function useNewQuestionAlert(questions: HostQuestion[] | undefined) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!questions) return
    const ids = new Set(questions.map((q) => q.id))
    if (seen.current) {
      const fresh = questions.filter((q) => !seen.current!.has(q.id) && q.status === 'pending')
      if (fresh.length) {
        toast(fresh.length === 1 ? 'New question' : `${fresh.length} new questions`, { description: fresh[0]!.body })
        navigator.vibrate?.(20)
      }
    }
    seen.current = ids
  }, [questions])
}
