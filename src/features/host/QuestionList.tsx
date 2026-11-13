import { Ban, Check, CheckCheck, Eye, EyeOff, Flag, MessageCircleQuestion, MonitorPlay, MonitorX, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/States'
import { cn, errorMessage, timeAgo } from '@/lib/utils'
import { useBanQuestionAuthor, useModerateQuestion, useShowQuestionOnScreen, type HostQuestion, type QuestionStatus } from './api'

const filters: { id: QuestionStatus; label: string }[] = [
  { id: 'pending', label: 'New' },
  { id: 'approved', label: 'Approved' },
  { id: 'answered', label: 'Answered' },
  { id: 'hidden', label: 'Hidden' },
]

const emptyCopy: Record<QuestionStatus, string> = {
  pending: 'New questions from guests land here. Nobody, including you, can see who sent them.',
  approved: 'Approve a question to line it up.',
  answered: 'Questions you mark as answered move here.',
  hidden: 'Hidden questions are never shown to the room.',
}

interface QuestionListProps {
  eventId: string
  questions: HostQuestion[]
  screenQuestionId: string | null
}

export function QuestionList({ eventId, questions, screenQuestionId }: QuestionListProps) {
  const [filter, setFilter] = useState<QuestionStatus>('pending')
  const [banning, setBanning] = useState<HostQuestion | null>(null)
  const ban = useBanQuestionAuthor(eventId)

  const counts = Object.fromEntries(filters.map((f) => [f.id, questions.filter((q) => q.status === f.id).length])) as Record<
    QuestionStatus,
    number
  >
  // Oldest first for new questions, so the host works through them in order.
  const visible = questions
    .filter((q) => q.status === filter)
    .sort((a, b) => (filter === 'pending' ? a.created_at.localeCompare(b.created_at) : 0))

  return (
    <section aria-labelledby="questions-heading" className="space-y-3">
      <h2 id="questions-heading" className="text-lg font-bold">
        Questions
      </h2>
      <div role="tablist" aria-label="Filter questions" className="grid grid-cols-2 gap-1 rounded-2xl bg-night-800/70 p-1 min-[420px]:flex">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className="relative flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-sm font-semibold"
          >
            {filter === f.id && (
              <motion.span
                layoutId="question-filter"
                className="absolute inset-0 rounded-xl bg-white/10"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className={cn('relative', filter === f.id ? 'text-ink' : 'text-ink-muted')}>{f.label}</span>
            {counts[f.id] > 0 && (
              <span
                className={cn(
                  'relative rounded-full px-1.5 text-xs tabular-nums',
                  f.id === 'pending' ? 'bg-accent text-night-950' : 'bg-white/10 text-ink-muted',
                )}
              >
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageCircleQuestion className="size-8" />}
            title={filter === 'pending' ? 'No new questions' : `Nothing ${filters.find((f) => f.id === filter)!.label.toLowerCase()}`}
          >
            <p>{emptyCopy[filter]}</p>
          </EmptyState>
        </Card>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((q) => (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <QuestionCard eventId={eventId} question={q} onScreen={q.id === screenQuestionId} onBan={() => setBanning(q)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Dialog
        open={banning !== null}
        onClose={() => setBanning(null)}
        title="Stop this person asking?"
        description="Hides every question they've sent and stops them sending more. You still won't see who it was."
      >
        {banning && <blockquote className="mb-4 rounded-2xl bg-white/5 p-3 text-sm text-ink-muted">“{banning.body}”</blockquote>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setBanning(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={ban.isPending}
            onClick={() =>
              ban.mutate(banning!.id, {
                onSuccess: (hidden) => {
                  toast.success(`Done. ${hidden} ${hidden === 1 ? 'question' : 'questions'} hidden.`)
                  setBanning(null)
                },
                onError: (error) => toast.error(errorMessage(error, "Couldn't do that.")),
              })
            }
          >
            <Ban aria-hidden className="size-4" /> Stop them asking
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

function QuestionCard({
  eventId,
  question: q,
  onScreen,
  onBan,
}: {
  eventId: string
  question: HostQuestion
  onScreen: boolean
  onBan: () => void
}) {
  const moderate = useModerateQuestion(eventId)
  const show = useShowQuestionOnScreen(eventId)

  const setStatus = (status: QuestionStatus, message: string) =>
    moderate.mutate(
      { id: q.id, status },
      { onSuccess: () => toast(message), onError: (error) => toast.error(errorMessage(error, "Couldn't update the question.")) },
    )

  const toggleScreen = () =>
    show.mutate(onScreen ? null : q.id, {
      onSuccess: () => toast.success(onScreen ? 'Removed from the screen' : 'Showing on the screen'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't update the screen.")),
    })

  return (
    <Card
      className={cn(
        'space-y-3 p-4',
        q.flagged && q.status !== 'hidden' && 'border-danger/40',
        onScreen && 'border-accent/60 shadow-glow-accent',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ink-subtle">{timeAgo(q.created_at)}</span>
        {q.flagged && (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 font-semibold text-danger">
            <Flag aria-hidden className="size-3" /> Check the wording
          </span>
        )}
        {onScreen && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-bold text-accent-soft"
          >
            <MonitorPlay aria-hidden className="size-3" /> On screen
          </motion.span>
        )}
      </div>
      <p className="break-words text-lg font-medium leading-snug">{q.body}</p>
      <div className="flex flex-wrap gap-2">
        {q.status === 'pending' && (
          <Button size="sm" onClick={() => setStatus('approved', 'Approved')}>
            <Check aria-hidden className="size-4" /> Approve
          </Button>
        )}
        {q.status === 'approved' && (
          <Button size="sm" onClick={() => setStatus('answered', 'Marked as answered')}>
            <CheckCheck aria-hidden className="size-4" /> Answered
          </Button>
        )}
        {q.status !== 'hidden' && (
          <Button size="sm" variant="secondary" loading={show.isPending} onClick={toggleScreen}>
            {!show.isPending && (onScreen ? <MonitorX aria-hidden className="size-4" /> : <MonitorPlay aria-hidden className="size-4" />)}
            {onScreen ? 'Off screen' : 'Show on screen'}
          </Button>
        )}
        {q.status === 'hidden' ? (
          <Button size="sm" variant="secondary" onClick={() => setStatus('pending', 'Moved back to new')}>
            <RotateCcw aria-hidden className="size-4" /> Restore
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setStatus('hidden', 'Hidden')}>
            <EyeOff aria-hidden className="size-4" /> Hide
          </Button>
        )}
        {q.status === 'answered' && (
          <Button size="sm" variant="ghost" onClick={() => setStatus('approved', 'Moved back to approved')}>
            <Eye aria-hidden className="size-4" /> Reopen
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-ink-subtle hover:text-danger"
          aria-label="Stop this person asking"
          onClick={onBan}
        >
          <Ban aria-hidden className="size-4" />
        </Button>
      </div>
    </Card>
  )
}
