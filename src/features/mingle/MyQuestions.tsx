import { CheckCheck, Clock, EyeOff, Megaphone } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Card } from '@/components/ui/Card'
import { cn, timeAgo } from '@/lib/utils'
import type { MyQuestion } from './api'

const statusMeta: Record<MyQuestion['status'], { label: string; Icon: typeof Clock; className: string }> = {
  pending: { label: 'Waiting', Icon: Clock, className: 'bg-white/10 text-ink-muted' },
  approved: { label: 'Host has it', Icon: Megaphone, className: 'bg-accent/15 text-accent-soft' },
  answered: { label: 'Answered', Icon: CheckCheck, className: 'bg-accent text-night-950' },
  hidden: { label: 'Not shown', Icon: EyeOff, className: 'bg-white/5 text-ink-subtle' },
}

export function MyQuestions({ questions }: { questions: MyQuestion[] }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-lg font-bold">My questions</h2>
      <p className="text-sm text-ink-muted">Only you can see this list.</p>
      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {questions.map((q) => {
            const meta = statusMeta[q.status]
            return (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="rounded-2xl border border-white/10 bg-night-900/60 p-3"
              >
                <p className="break-words">{q.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-subtle">{timeAgo(q.created_at)}</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={q.status}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', meta.className)}
                    >
                      <meta.Icon aria-hidden className="size-3" /> {meta.label}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </Card>
  )
}
