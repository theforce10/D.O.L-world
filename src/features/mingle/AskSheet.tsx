import { zodResolver } from '@hookform/resolvers/zod'
import { EyeOff, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { cn } from '@/lib/utils'
import { QUESTION_LIMIT, QUESTION_MAX_LENGTH } from './api'

const askSchema = z.object({
  body: z.string().trim().min(1, 'Write your question first').max(QUESTION_MAX_LENGTH, `Keep it under ${QUESTION_MAX_LENGTH} characters`),
})
type AskValues = z.infer<typeof askSchema>

interface AskSheetProps {
  open: boolean
  onClose: () => void
  sent: number
  submitting: boolean
  onSubmit: (body: string, done: () => void) => void
}

export function AskSheet({ open, onClose, sent, submitting, onSubmit }: AskSheetProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AskValues>({ resolver: zodResolver(askSchema), defaultValues: { body: '' } })
  const body = useWatch({ control, name: 'body' }) ?? ''
  const left = QUESTION_LIMIT - sent

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ask anonymously"
      description={left > 0 ? `You can send ${left} more tonight.` : "You've used all your questions for tonight."}
    >
      <form noValidate onSubmit={handleSubmit((v) => onSubmit(v.body, () => reset()))} className="space-y-4">
        <Field id="ask-body" label="Your question" error={errors.body?.message}>
          <div className="relative">
            <Textarea
              id="ask-body"
              rows={4}
              maxLength={QUESTION_MAX_LENGTH + 20}
              placeholder="Ask the host anything…"
              className="pb-10"
              aria-invalid={!!errors.body}
              aria-describedby={describedBy('ask-body', { error: errors.body, hint: true })}
              {...register('body')}
            />
            <CharRing used={body.length} />
          </div>
        </Field>
        <p id="ask-body-hint" className="flex items-center gap-2 rounded-2xl bg-accent/10 px-3 py-2.5 text-sm text-ink">
          <EyeOff aria-hidden className="size-4 shrink-0 text-accent" />
          Your name is never shown to the host or the room.
        </p>
        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={left <= 0}>
          {!submitting && <Send aria-hidden className="size-5" />} Send anonymously
        </Button>
      </form>
    </Dialog>
  )
}

const R = 9
const C = 2 * Math.PI * R

function CharRing({ used }: { used: number }) {
  const left = QUESTION_MAX_LENGTH - used
  const near = left <= 20
  const over = left < 0
  return (
    <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-1.5" aria-live="polite">
      {near && (
        <motion.span
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn('text-xs font-semibold tabular-nums', over ? 'text-danger' : 'text-ink-muted')}
        >
          {left}
        </motion.span>
      )}
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={R} fill="none" strokeWidth="2.5" className="stroke-white/10" />
        <motion.circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          animate={{ strokeDashoffset: C * (1 - Math.min(used / QUESTION_MAX_LENGTH, 1)), scale: near ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className={over ? 'stroke-danger' : 'stroke-accent'}
        />
      </svg>
      <span className="sr-only">{`${Math.max(left, 0)} characters left`}</span>
    </div>
  )
}
