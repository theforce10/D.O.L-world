import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Radio, Save, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { errorMessage } from '@/lib/utils'
import type { Poll, Topic } from '@/features/mingle/api'
import { useCreatePoll, useUpdatePoll, type PollInput } from './api'

const pollSchema = z
  .object({
    question: z.string().trim().min(1, 'Ask a question').max(200, 'Keep it under 200 characters'),
    options: z.array(z.object({ label: z.string().trim().max(80, 'Keep options under 80 characters') })),
    attach: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const labels = v.options.map((o) => o.label).filter(Boolean)
    if (labels.length < 2) ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least 2 options' })
    if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) {
      ctx.addIssue({ code: 'custom', path: ['options'], message: 'Each option must be different' })
    }
  })
type PollValues = z.infer<typeof pollSchema>

interface PollComposerProps {
  eventId: string
  open: boolean
  onClose: () => void
  liveTopic: Topic | undefined
  /** A draft to edit; omit to create a new poll. */
  poll?: Poll
}

export function PollComposer({ eventId, open, onClose, liveTopic, poll }: PollComposerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={poll ? 'Edit poll' : 'New poll'}
      description="2 to 6 options. Guests vote from their phones."
    >
      <PollForm key={poll?.id ?? 'new'} eventId={eventId} poll={poll} liveTopic={liveTopic} onDone={onClose} />
    </Dialog>
  )
}

function PollForm({
  eventId,
  poll,
  liveTopic,
  onDone,
}: {
  eventId: string
  poll?: Poll
  liveTopic: Topic | undefined
  onDone: () => void
}) {
  const create = useCreatePoll(eventId)
  const update = useUpdatePoll(eventId)
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PollValues>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      question: poll?.question ?? '',
      options: poll ? poll.options.map((o) => ({ label: o.label })) : [{ label: '' }, { label: '' }],
      attach: poll ? poll.topic_id !== null : Boolean(liveTopic),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })

  const toInput = (v: PollValues): PollInput => ({
    question: v.question,
    options: v.options.map((o) => o.label).filter(Boolean),
    topicId: v.attach ? (poll?.topic_id ?? liveTopic?.id ?? null) : null,
  })

  const save = (openNow: boolean) =>
    handleSubmit((values) => {
      const input = toInput(values)
      const done = {
        onSuccess: () => {
          toast.success(openNow ? 'Poll is live' : poll ? 'Poll saved' : 'Poll saved as draft')
          onDone()
        },
        onError: (error: unknown) => toast.error(errorMessage(error, "Couldn't save the poll.")),
      }
      if (poll) update.mutate({ id: poll.id, input }, done)
      else create.mutate({ input, open: openNow }, done)
    })

  const yesNo = () => reset({ ...getValues(), options: [{ label: 'Yes' }, { label: 'No' }] })
  const busy = create.isPending || update.isPending
  const optionsError = (errors.options as { message?: string } | undefined)?.message ?? errors.options?.root?.message

  return (
    <form noValidate onSubmit={save(false)} className="space-y-4">
      <Field id="poll-question" label="Question" error={errors.question?.message}>
        <Textarea
          id="poll-question"
          rows={2}
          placeholder="e.g. Is it ever OK to check your partner's phone?"
          aria-invalid={!!errors.question}
          aria-describedby={describedBy('poll-question', { error: errors.question })}
          {...register('question')}
        />
      </Field>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">Options</legend>
          <button
            type="button"
            onClick={yesNo}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-accent-soft hover:bg-white/5"
          >
            Yes / No
          </button>
        </div>
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {fields.map((field, i) => (
              <motion.li
                key={field.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2"
              >
                <Input
                  aria-label={`Option ${i + 1}`}
                  placeholder={`Option ${i + 1}`}
                  aria-invalid={!!errors.options?.[i]?.label}
                  {...register(`options.${i}.label`)}
                />
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={fields.length <= 2}
                  onClick={() => remove(i)}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-white/5 hover:text-danger disabled:opacity-30"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {optionsError && (
          <p role="alert" className="text-sm text-danger">
            {optionsError}
          </p>
        )}
        {fields.length < 6 && (
          <Button variant="ghost" size="sm" onClick={() => append({ label: '' })}>
            <Plus aria-hidden className="size-4" /> Add option
          </Button>
        )}
      </fieldset>

      {(liveTopic || poll?.topic_id) && (
        <Checkbox
          id="poll-attach"
          label={poll?.topic_id ? 'Linked to its topic (shows in the catch-up)' : `Link to the live topic: “${liveTopic!.prompt}”`}
          {...register('attach')}
        />
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" variant="secondary" loading={busy && !create.variables?.open}>
          <Save aria-hidden className="size-4" /> {poll ? 'Save' : 'Save draft'}
        </Button>
        {!poll && (
          <Button loading={busy && create.variables?.open} onClick={save(true)}>
            <Radio aria-hidden className="size-4" /> Open now
          </Button>
        )}
      </div>
    </form>
  )
}
