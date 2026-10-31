import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, MapPin, PartyPopper } from 'lucide-react'
import { useForm } from 'react-hook-form'
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
  name: z.string().trim().min(1, 'Give the event a name').max(120, 'Keep it under 120 characters'),
  venue: z.string().trim().max(120, 'Keep it under 120 characters'),
  event_date: z.string(),
  goLive: z.boolean(),
})
type EventValues = z.infer<typeof eventSchema>

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
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { name: '', venue: '', event_date: '', goLive: !hasLiveEvent },
  })

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
    <Dialog open={open} onClose={close} title="New event" description="Queue numbers start again at #1 for every event.">
      <form noValidate onSubmit={submit} className="space-y-4">
        <Field id="event-name" label="Event name" error={errors.name?.message}>
          <Input
            id="event-name"
            autoComplete="off"
            icon={<PartyPopper className="size-5" />}
            placeholder="e.g. D.O.L World Karaoke Night"
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
          label={hasLiveEvent ? 'Go live now (this ends the event that is live right now)' : 'Go live now and start taking songs'}
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
