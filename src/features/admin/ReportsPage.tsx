import { CheckCircle2, Flag, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { cn, errorMessage } from '@/lib/utils'
import { REPORT_REASONS } from '@/features/connect/api'
import { useAdminReports, useResolveReport, type AdminReport } from './api'

const reasonLabel = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label])) as Record<AdminReport['reason'], string>
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function ReportsPage() {
  const reports = useAdminReports()
  const [showResolved, setShowResolved] = useState(false)
  const list = (reports.data ?? []).filter((r) => showResolved || !r.resolved_at)
  const open = (reports.data ?? []).filter((r) => !r.resolved_at).length

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-16 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Reports</h1>
          <p className="text-ink-muted">From Mix &amp; Mingle Connect. Only admins can see this page.</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="size-5 accent-[var(--color-accent)]"
          />
          Show resolved
        </label>
      </div>

      {reports.isPending ? (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-36 rounded-3xl" />
        </div>
      ) : reports.isError ? (
        <ErrorState message={errorMessage(reports.error, "Couldn't load reports.")} onRetry={() => reports.refetch()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={<Flag className="size-8" />} title={open === 0 ? 'No open reports' : 'Nothing to show'}>
            <p>When a guest reports someone in Connect, it shows up here.</p>
          </EmptyState>
        </Card>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
                <ReportCard report={r} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </main>
  )
}

function ReportCard({ report: r }: { report: AdminReport }) {
  const resolve = useResolveReport()
  return (
    <Card className={cn('space-y-3 p-4 sm:p-5', r.resolved_at && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-danger/15 px-2.5 py-0.5 font-semibold text-danger">{reasonLabel[r.reason]}</span>
        {r.reported_total > 1 && (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold">{r.reported_total} reports about this person</span>
        )}
        <span className="ml-auto text-ink-subtle">{dateTime.format(new Date(r.created_at))}</span>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Reported</dt>
          <dd className="font-semibold">{r.reported_name ?? 'Unknown'}</dd>
          <dd className="break-all text-ink-muted">{r.reported_email}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Reported by</dt>
          <dd className="font-semibold">{r.reporter_name ?? 'Deleted account'}</dd>
          <dd className="break-all text-ink-muted">{r.reporter_email}</dd>
        </div>
      </dl>
      {r.event_name && <p className="text-sm text-ink-muted">Event: {r.event_name}</p>}
      {r.details && <blockquote className="whitespace-pre-wrap rounded-2xl bg-white/5 p-3 text-sm">{r.details}</blockquote>}
      <Button
        size="sm"
        variant={r.resolved_at ? 'ghost' : 'secondary'}
        loading={resolve.isPending}
        onClick={() =>
          resolve.mutate(
            { id: r.id, resolved: !r.resolved_at },
            {
              onSuccess: () => toast(r.resolved_at ? 'Reopened' : 'Marked as resolved'),
              onError: (error) => toast.error(errorMessage(error, "Couldn't update the report.")),
            },
          )
        }
      >
        {!resolve.isPending &&
          (r.resolved_at ? <RotateCcw aria-hidden className="size-4" /> : <CheckCircle2 aria-hidden className="size-4" />)}
        {r.resolved_at ? 'Reopen' : 'Mark resolved'}
      </Button>
    </Card>
  )
}
