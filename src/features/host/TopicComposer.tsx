import { zodResolver } from '@hookform/resolvers/zod'
import { ListPlus, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { errorMessage } from '@/lib/utils'
import { useAddTopics } from './api'
import { TimerChips } from './TimerChips'

const MAX_PROMPT = 300
const MAX_BULK = 50

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
}

const schema = z
  .object({
    mode: z.enum(['one', 'many']),
    text: z.string().trim().min(1, 'Write a prompt first'),
    duration_seconds: z.number().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'one' && v.text.length > MAX_PROMPT) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: `Keep it under ${MAX_PROMPT} characters` })
    }
    if (v.mode === 'many') {
      const lines = splitLines(v.text)
      if (lines.length > MAX_BULK) ctx.addIssue({ code: 'custom', path: ['text'], message: `Paste up to ${MAX_BULK} topics at a time` })
      const long = lines.findIndex((l) => l.length > MAX_PROMPT)
      if (long >= 0) ctx.addIssue({ code: 'custom', path: ['text'], message: `Line ${long + 1} is over ${MAX_PROMPT} characters` })
    }
  })
type Values = z.infer<typeof schema>

export function TopicComposer({ eventId }: { eventId: string }) {
  const add = useAddTopics(eventId)
  const [mode, setMode] = useState<Values['mode']>('one')
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { mode: 'one', text: '', duration_seconds: 600 } })
  const text = useWatch({ control, name: 'text' })
  const count = mode === 'many' ? splitLines(text ?? '').length : 0

  const switchMode = (next: Values['mode']) => {
    setMode(next)
    setValue('mode', next)
  }

  const submit = handleSubmit((values) => {
    const prompts = values.mode === 'one' ? [values.text] : splitLines(values.text)
    add.mutate(
      prompts.map((prompt) => ({ prompt, duration_seconds: values.duration_seconds })),
      {
        onSuccess: () => {
          toast.success(prompts.length === 1 ? 'Topic added' : `${prompts.length} topics added`)
          reset({ mode: values.mode, text: '', duration_seconds: values.duration_seconds })
        },
        onError: (error) => toast.error(errorMessage(error, "Couldn't add that.")),
      },
    )
  })

  return (
    <Card className="p-4 sm:p-5">
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Add topics</h2>
          <div role="tablist" aria-label="How to add" className="flex rounded-xl bg-night-800/70 p-1 text-sm font-semibold">
            {(['one', 'many'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className="relative min-h-11 rounded-lg px-3"
              >
                {mode === m && (
                  <motion.span
                    layoutId="composer-mode"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
                <span className={mode === m ? 'relative text-ink' : 'relative text-ink-muted'}>{m === 'one' ? 'One' : 'Paste a list'}</span>
              </button>
            ))}
          </div>
        </div>

        <Field
          id="topic-text"
          label={mode === 'one' ? 'Prompt' : 'One topic per line'}
          error={errors.text?.message}
          hint={mode === 'many' ? 'Bullets and numbers at the start of lines are removed.' : undefined}
        >
          <Textarea
            id="topic-text"
            rows={mode === 'one' ? 3 : 7}
            placeholder={
              mode === 'one'
                ? 'e.g. What’s a green flag you noticed too late?'
                : 'What’s a green flag you noticed too late?\nShould couples share passwords?\nFirst date: who pays?'
            }
            aria-invalid={!!errors.text}
            aria-describedby={describedBy('topic-text', { error: errors.text, hint: mode === 'many' })}
            {...register('text')}
          />
        </Field>

        <Controller
          control={control}
          name="duration_seconds"
          render={({ field }) => (
            <TimerChips value={field.value} onChange={field.onChange} label={mode === 'many' ? 'Timer for each' : 'Timer'} />
          )}
        />

        <Button type="submit" fullWidth loading={add.isPending}>
          {!add.isPending && (mode === 'one' ? <Plus aria-hidden className="size-5" /> : <ListPlus aria-hidden className="size-5" />)}
          {mode === 'one' ? (
            'Add topic'
          ) : (
            <>
              Add{' '}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  className="inline-block tabular-nums"
                >
                  {count}
                </motion.span>
              </AnimatePresence>{' '}
              {count === 1 ? 'topic' : 'topics'}
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
