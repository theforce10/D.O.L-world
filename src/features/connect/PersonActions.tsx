import { zodResolver } from '@hookform/resolvers/zod'
import { Ban, Flag } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Input'
import { cn, errorMessage } from '@/lib/utils'
import { REPORT_REASONS, useBlockUser, useReportUser, type ReportReason } from './api'

interface PersonActionsProps {
  eventId: string
  person: { user_id: string; first_name: string } | null
  onClose: () => void
}

/** Block / Report sheet for one person. */
export function PersonActions({ eventId, person, onClose }: PersonActionsProps) {
  const [view, setView] = useState<'menu' | 'report' | 'block'>('menu')
  const close = () => {
    onClose()
    setView('menu')
  }

  return (
    <Dialog
      open={person !== null}
      onClose={close}
      title={
        view === 'report' ? `Report ${person?.first_name}` : view === 'block' ? `Block ${person?.first_name}?` : (person?.first_name ?? '')
      }
      description={
        view === 'block'
          ? "You'll disappear from each other's lists, and any match is undone. They aren't told."
          : view === 'report'
            ? 'Reports go to the DOL World team only. They aren’t told who reported them.'
            : undefined
      }
    >
      {person && view === 'menu' && (
        <div className="space-y-2">
          <Button variant="secondary" size="lg" fullWidth onClick={() => setView('report')}>
            <Flag aria-hidden className="size-5" /> Report
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={() => setView('block')}>
            <Ban aria-hidden className="size-5" /> Block
          </Button>
        </div>
      )}
      {person && view === 'block' && <BlockConfirm eventId={eventId} userId={person.user_id} onDone={close} />}
      {person && view === 'report' && <ReportForm eventId={eventId} userId={person.user_id} onDone={close} />}
    </Dialog>
  )
}

function BlockConfirm({ eventId, userId, onDone }: { eventId: string; userId: string; onDone: () => void }) {
  const block = useBlockUser(eventId)
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      <Button
        variant="danger"
        loading={block.isPending}
        onClick={() =>
          block.mutate(userId, {
            onSuccess: () => {
              toast('Blocked')
              onDone()
            },
            onError: (error) => toast.error(errorMessage(error, "Couldn't block.")),
          })
        }
      >
        <Ban aria-hidden className="size-4" /> Block
      </Button>
    </div>
  )
}

const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]], { message: 'Pick a reason' }),
  details: z.string().trim().max(1000, 'Keep it under 1000 characters'),
})
type ReportValues = z.infer<typeof reportSchema>

function ReportForm({ eventId, userId, onDone }: { eventId: string; userId: string; onDone: () => void }) {
  const report = useReportUser(eventId)
  const block = useBlockUser(eventId)
  const [alsoBlock, setAlsoBlock] = useState(true)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReportValues>({ resolver: zodResolver(reportSchema), defaultValues: { reason: undefined, details: '' } })
  const reason = useWatch({ control, name: 'reason' })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async ({ reason, details }) => {
        try {
          await report.mutateAsync({ userId, reason, details })
          if (alsoBlock) await block.mutateAsync(userId)
          toast.success('Thanks. The team will take a look.')
          onDone()
        } catch (error) {
          toast.error(errorMessage(error, "Couldn't send the report."))
        }
      })}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">What happened?</legend>
        {REPORT_REASONS.map((r) => (
          <label
            key={r.value}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70',
              reason === r.value ? 'border-accent bg-accent/10' : 'border-white/10 bg-night-800/60',
            )}
          >
            <input type="radio" value={r.value} className="size-4 accent-[var(--color-accent)]" {...register('reason')} />
            <span className="text-sm font-medium">{r.label}</span>
          </label>
        ))}
        {errors.reason && (
          <p role="alert" className="text-sm text-danger">
            {errors.reason.message}
          </p>
        )}
      </fieldset>
      <Field id="report-details" label="Anything else?" optional error={errors.details?.message}>
        <Textarea id="report-details" rows={3} {...register('details')} />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={alsoBlock}
          onChange={(e) => setAlsoBlock(e.target.checked)}
          className="size-5 accent-[var(--color-accent)]"
        />
        Also block them
      </label>
      <Button type="submit" variant="danger" size="lg" fullWidth loading={report.isPending || block.isPending}>
        <Flag aria-hidden className="size-5" /> Send report
      </Button>
    </form>
  )
}
