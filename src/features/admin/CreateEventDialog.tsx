import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, MapPin, MessagesSquare, Mic, PartyPopper } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { errorMessage } from '@/lib/utils'
import { useCreateEvent } from './api'

const eventSchema = z.object({
  type: z.enum(['karaoke', 'mix_mingle']),
  name: z.string().trim().min(1, 'Give the event a name').max(120, 'Keep it under 120 characters'),
  venue: z.string().trim().max(120, 'Keep it under 120 characters'),
  event_date: z.string(),
  goLive: z.boolean(),
})
type EventValues = z.infer<typeof eventSchema>

const types = [
  { value: 'karaoke', mode: 'karaoke', label: 'Karaoke', body: 'Song queue with numbers', Icon: Mic },
  { value: 'mix_mingle', mode: 'mingle', label: 'Mix & Mingle', body: 'Topics, polls, questions, Connect', Icon: MessagesSquare },
] as const

export function CreateEventDialog({
  open,
  onClose,
  onCreated,
  hasLiveEvent,
}: {
  open: boolean
  onClose: () => void
  onCreated: (eventId: string) => void
  hasLiveEvent: boolean
}) {
  const create = useCreateEvent()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: 'karaoke', name: '', venue: '', event_date: '', goLive: !hasLiveEvent },
  })
  const type = useWatch({ control, name: 'type' })

  const close = () => {
    reset()
    onClose()
  }

  const submit = handleSubmit(({ goLive, ...input }) =>
    create.mutate(
      { input, goLive },
      {
        onSuccess: (id) => {
          toast.success(goLive ? `🎉 ${input.name} is live!` : `${input.name} created`)
          onCreated(id)
          close()
        },
        onError: (error) => toast.error(errorMessage(error, "Couldn't create the event.")),
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New event"
      description={
        type === 'karaoke' ? 'Queue numbers start again at #1 for every event.' : 'Guests check in, vote, ask questions and connect after.'
      }
    >
      <form noValidate onSubmit={submit} data-mode={type === 'karaoke' ? 'karaoke' : 'mingle'} className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {types.map(({ value, mode, label, body, Icon }) => (
              <label
                key={value}
                data-mode={mode}
                className="relative flex min-h-11 cursor-pointer flex-col gap-1 rounded-2xl border border-white/10 bg-night-800/60 p-3 transition-colors has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70"
              >
                <input type="radio" value={value} className="sr-only" {...register('type')} />
                {type === value && (
                  <motion.span
                    layoutId="event-type-glow"
                    aria-hidden
                    className="absolute inset-0 rounded-2xl bg-accent/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  />
                )}
                <Icon aria-hidden className="relative size-5 text-accent" />
                <span className="relative font-semibold">{label}</span>
                <span className="relative text-xs text-ink-muted">{body}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="event-name" label="Event name" error={errors.name?.message}>
          <Input
            id="event-name"
            autoComplete="off"
            icon={<PartyPopper className="size-5" />}
            placeholder={type === 'karaoke' ? 'e.g. DOL World Karaoke Night' : 'e.g. DOL World Mix & Mingle'}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy('event-name', { error: errors.name })}
            {...register('name')}
          />
        </Field>
        <Field id="event-venue" label="Venue" optional error={errors.venue?.message}>
          <Input
            id="event-venue"
            autoComplete="off"
            icon={<MapPin className="size-5" />}
            placeholder="e.g. Lagos"
            aria-invalid={!!errors.venue}
            aria-describedby={describedBy('event-venue', { error: errors.venue })}
            {...register('venue')}
          />
        </Field>
        <Field id="event-date" label="Date" optional>
          <Input id="event-date" type="date" icon={<CalendarDays className="size-5" />} {...register('event_date')} />
        </Field>
        <Checkbox
          id="event-go-live"
          label={
            hasLiveEvent
              ? 'Go live now (this ends the event that is live right now)'
              : type === 'karaoke'
                ? 'Go live now and start taking songs'
                : 'Go live now and open check-in'
          }
          {...register('goLive')}
        />
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create event
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
