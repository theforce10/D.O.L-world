import { Flag, HeartHandshake } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { errorMessage } from '@/lib/utils'
import { useEndEvent } from '@/features/admin/api'

const dateTime = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

export function WrapUpCard({ eventId, endedAt }: { eventId: string; endedAt: string | null }) {
  const end = useEndEvent()
  const [confirm, setConfirm] = useState(false)

  if (endedAt) {
    const closes = new Date(new Date(endedAt).getTime() + 72 * 3_600_000)
    return (
      <Card className="flex items-center gap-3 p-4">
        <HeartHandshake aria-hidden className="size-6 shrink-0 text-accent" />
        <p className="text-sm text-ink-muted">
          <strong className="text-ink">Event ended.</strong> Connect is open for guests until {dateTime.format(closes)}.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-3 p-4 sm:p-5">
      <h2 className="text-lg font-bold">Wrap up</h2>
      <p className="text-sm text-ink-muted">
        When the night's over, end the event. Check-in closes, the live topic and poll finish, and Connect opens for 72 hours.
      </p>
      <Button variant="danger" fullWidth onClick={() => setConfirm(true)}>
        <Flag aria-hidden className="size-4" /> End event
      </Button>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="End the event?"
        description="Guests can't check in, vote or ask any more. Connect opens straight away and stays open for 72 hours. Going live again later re-opens the event and closes Connect."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(false)}>
            Not yet
          </Button>
          <Button
            variant="danger"
            loading={end.isPending}
            onClick={() =>
              end.mutate(eventId, {
                onSuccess: () => {
                  toast.success('Event ended. Connect is open.')
                  setConfirm(false)
                },
                onError: (error) => toast.error(errorMessage(error, "Couldn't end the event.")),
              })
            }
          >
            End event
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
