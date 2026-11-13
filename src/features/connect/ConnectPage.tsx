import { Check, Copy, EllipsisVertical, ExternalLink, Eye, HeartHandshake, Lock, UserRoundX, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { AppHeader } from '@/app/AppHeader'
import { useAccentMode } from '@/app/accentMode'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { rise, stagger } from '@/lib/motion'
import { cn, errorMessage } from '@/lib/utils'
import { useMyCheckIn, useSetDiscoverable } from '@/features/mingle/api'
import { useProfile } from '@/features/profile/api'
import {
  snapchatUrl,
  useConnectCandidates,
  useMyConnectEvents,
  useMyMatches,
  useRequestConnect,
  useUnmatch,
  useWithdrawConnect,
  type Candidate,
  type Match,
} from './api'
import { MatchCelebration } from './MatchCelebration'
import { PersonActions } from './PersonActions'
import { SnapchatPrompt } from './SnapchatPrompt'

type Tab = 'people' | 'matches'

function closesIn(iso: string): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000))
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  return hours <= 1 ? 'under an hour' : `${hours}h`
}

/** Celebrates matches that appear while the page is open (including the other person's tap, via polling). */
function useNewMatches(matches: Match[] | undefined, onNew: (m: Match) => void) {
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!matches) return
    if (seen.current) {
      const fresh = matches.find((m) => !seen.current!.has(m.user_id))
      if (fresh) onNew(fresh)
    }
    seen.current = new Set(matches.map((m) => m.user_id))
  }, [matches, onNew])
}

export function ConnectPage() {
  const { eventId } = useParams()
  useAccentMode('mingle')
  const { data: profile } = useProfile()
  const events = useMyConnectEvents()
  const event = events.data?.find((e) => e.event_id === eventId)
  const candidates = useConnectCandidates(eventId)
  const matches = useMyMatches(eventId)
  const checkIn = useMyCheckIn(eventId)
  const setDiscoverable = useSetDiscoverable(eventId)
  const request = useRequestConnect(eventId)
  const withdraw = useWithdrawConnect(eventId)

  const [tab, setTab] = useState<Tab>('people')
  const [celebrate, setCelebrate] = useState<Match | Candidate | null>(null)
  const [needsSnapchat, setNeedsSnapchat] = useState<Candidate | null>(null)
  const [actionsFor, setActionsFor] = useState<{ user_id: string; first_name: string } | null>(null)

  const onNewMatch = useCallback((m: Match) => {
    setCelebrate(m)
    toast.success("It's a match", { description: `You and ${m.first_name} can now see each other's Snapchat.` })
  }, [setCelebrate])
  useNewMatches(matches.data, onNewMatch)

  const connect = (person: Candidate) => {
    if (!profile?.snapchat) return setNeedsSnapchat(person)
    request.mutate(person.user_id, {
      onSuccess: (matched) => {
        if (!matched) {
          toast('Request sent', { description: `If ${person.first_name} wants to connect too, you'll both see it here.` })
          navigator.vibrate?.(15)
        }
      },
      onError: (error) => toast.error(errorMessage(error, "Couldn't send that.")),
    })
  }

  const closed = candidates.isError && /closed/i.test(errorMessage(candidates.error))
  const matchCount = matches.data?.length ?? 0

  return (
    <>
      <AppHeader />
      <motion.main variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-xl space-y-5 px-4 pb-16 pt-5">
        <motion.header variants={rise} className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-accent-soft">
            <HeartHandshake aria-hidden className="size-4" /> Connect
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{event?.name ?? 'Mix & Mingle'}</h1>
          <p className="text-ink-muted">
            {event
              ? `Tap “I'd like to connect” on anyone you clicked with. If they do too, you'll both see each other's Snapchat. Closes in ${closesIn(event.closes_at)}.`
              : closed
                ? 'Connect has closed for this event. Your matches are still here.'
                : 'Say who you clicked with. Only mutual matches are revealed.'}
          </p>
        </motion.header>

        {checkIn.data && !checkIn.data.discoverable && !closed && (
          <motion.div variants={rise}>
            <Card className="flex flex-col gap-3 border-accent/40 p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm">
                <strong>You're hidden.</strong> People can't find you, so they can't match with you.
              </p>
              <Button
                size="sm"
                loading={setDiscoverable.isPending}
                onClick={() =>
                  setDiscoverable.mutate(true, {
                    onSuccess: () => toast.success('People from tonight can now find you'),
                    onError: (error) => toast.error(errorMessage(error, "Couldn't update that.")),
                  })
                }
              >
                <Eye aria-hidden className="size-4" /> Let people find me
              </Button>
            </Card>
          </motion.div>
        )}

        <motion.div variants={rise} role="tablist" aria-label="Connect" className="grid grid-cols-2 gap-1 rounded-2xl bg-night-800/80 p-1">
          {(['people', 'matches'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="relative flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
            >
              {tab === id && (
                <motion.span
                  layoutId="connect-tab"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <span className={cn('relative', tab === id ? 'text-ink' : 'text-ink-muted')}>{id === 'people' ? 'People' : 'Matches'}</span>
              {id === 'matches' && matchCount > 0 && (
                <motion.span
                  key={matchCount}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  className="relative rounded-full bg-accent px-1.5 text-xs tabular-nums text-night-950"
                >
                  {matchCount}
                </motion.span>
              )}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === 'people' ? (
            <motion.section key="people" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              {candidates.isPending ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-52 rounded-3xl" />
                  ))}
                </div>
              ) : candidates.isError ? (
                <Card>
                  {closed ? (
                    <EmptyState icon={<Lock className="size-8" />} title="Connect has closed">
                      <p>It stays open for 72 hours after the event ends.</p>
                    </EmptyState>
                  ) : (
                    <ErrorState message={errorMessage(candidates.error, "Couldn't load Connect.")} onRetry={() => candidates.refetch()} />
                  )}
                </Card>
              ) : candidates.data.length === 0 ? (
                <Card>
                  <EmptyState icon={<Users className="size-8" />} title="Nobody here yet">
                    <p>People appear here once they choose to be findable. Check back later.</p>
                  </EmptyState>
                </Card>
              ) : (
                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                  className="grid grid-cols-2 gap-3"
                >
                  {candidates.data.map((c) => (
                    <motion.li key={c.user_id} layout variants={{ hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } }}>
                      <CandidateCard
                        person={c}
                        busy={
                          (request.isPending && request.variables === c.user_id) || (withdraw.isPending && withdraw.variables === c.user_id)
                        }
                        onConnect={() => connect(c)}
                        onWithdraw={() =>
                          withdraw.mutate(c.user_id, {
                            onSuccess: () => toast('Request withdrawn'),
                            onError: (error) => toast.error(errorMessage(error, "Couldn't withdraw.")),
                          })
                        }
                        onMatched={() => setTab('matches')}
                        onMore={() => setActionsFor(c)}
                      />
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </motion.section>
          ) : (
            <motion.section key="matches" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <MatchesList eventId={eventId!} matches={matches.data} loading={matches.isPending} onMore={setActionsFor} />
            </motion.section>
          )}
        </AnimatePresence>

        <motion.p variants={rise} className="text-center text-sm text-ink-subtle">
          Requests are private. Nobody is told you asked unless they asked you too.
        </motion.p>
        <motion.div variants={rise} className="text-center">
          <Link
            to="/profile"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-soft underline-offset-4 hover:underline"
          >
            {profile?.snapchat ? `Your Snapchat: @${profile.snapchat} · change` : 'Add your Snapchat'}
          </Link>
        </motion.div>
      </motion.main>

      <SnapchatPrompt
        open={needsSnapchat !== null}
        onClose={() => setNeedsSnapchat(null)}
        onSaved={() => {
          const person = needsSnapchat
          setNeedsSnapchat(null)
          if (person)
            request.mutate(person.user_id, {
              onSuccess: (matched) => !matched && toast('Request sent'),
              onError: (error) => toast.error(errorMessage(error, "Couldn't send that.")),
            })
        }}
      />
      <PersonActions eventId={eventId!} person={actionsFor} onClose={() => setActionsFor(null)} />
      <MatchCelebration
        match={celebrate}
        me={profile}
        onClose={() => {
          setCelebrate(null)
          setTab('matches')
        }}
      />
    </>
  )
}

interface CandidateCardProps {
  person: Candidate
  busy: boolean
  onConnect: () => void
  onWithdraw: () => void
  onMatched: () => void
  onMore: () => void
}

function CandidateCard({ person, busy, onConnect, onWithdraw, onMatched, onMore }: CandidateCardProps) {
  return (
    <div
      className={cn(
        'relative flex h-full flex-col items-center gap-3 rounded-3xl border bg-night-800/70 p-4 pt-6 text-center shadow-card transition-colors',
        person.matched ? 'border-accent/60' : person.requested ? 'border-accent/30' : 'border-white/10',
      )}
    >
      <button
        type="button"
        onClick={onMore}
        aria-label={`More options for ${person.first_name}`}
        className="absolute right-1 top-1 grid size-11 place-items-center rounded-full text-ink-subtle hover:bg-white/10 hover:text-ink"
      >
        <EllipsisVertical aria-hidden className="size-5" />
      </button>
      <motion.div animate={person.requested ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
        <Avatar src={person.avatar_url} name={person.first_name} className="size-20 text-2xl" />
      </motion.div>
      <p className="w-full truncate text-lg font-bold">{person.first_name}</p>
      <div className="mt-auto w-full">
        <AnimatePresence mode="wait" initial={false}>
          {person.matched ? (
            <motion.div key="matched" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Button size="sm" fullWidth onClick={onMatched}>
                <HeartHandshake aria-hidden className="size-4" /> Matched
              </Button>
            </motion.div>
          ) : person.requested ? (
            <motion.div key="requested" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-1">
              <p className="inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
                <Check aria-hidden className="size-4" /> Requested
              </p>
              <button
                type="button"
                onClick={onWithdraw}
                disabled={busy}
                className="block min-h-11 w-full text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
              >
                Withdraw
              </button>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Button size="sm" fullWidth loading={busy} onClick={onConnect} className="text-xs sm:text-sm">
                I'd like to connect
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MatchesList({
  eventId,
  matches,
  loading,
  onMore,
}: {
  eventId: string
  matches: Match[] | undefined
  loading: boolean
  onMore: (m: Match) => void
}) {
  const unmatch = useUnmatch(eventId)
  const [confirm, setConfirm] = useState<Match | null>(null)

  if (loading) return <Skeleton className="h-32 rounded-3xl" />
  if (!matches || matches.length === 0)
    return (
      <Card>
        <EmptyState icon={<HeartHandshake className="size-8" />} title="No matches yet">
          <p>When someone you asked asks you too, they'll show up here with their Snapchat.</p>
        </EmptyState>
      </Card>
    )

  return (
    <>
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {matches.map((m) => (
            <motion.li
              key={m.user_id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <Card className="space-y-4 border-accent/40 p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={m.avatar_url} name={m.first_name} className="size-14 text-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{m.first_name}</p>
                    <p className="truncate font-display text-accent-soft">
                      {m.snapchat ? `@${m.snapchat}` : 'Hasn’t added a Snapchat yet'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMore(m)}
                    aria-label={`More options for ${m.first_name}`}
                    className="grid size-11 place-items-center rounded-full text-ink-subtle hover:bg-white/10 hover:text-ink"
                  >
                    <EllipsisVertical aria-hidden className="size-5" />
                  </button>
                </div>
                {m.snapchat && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(m.snapchat!)
                          .then(() => toast.success('Copied'))
                          .catch(() => toast.error("Couldn't copy. Long-press the name instead."))
                      }
                    >
                      <Copy aria-hidden className="size-4" /> Copy
                    </Button>
                    <a
                      href={snapchatUrl(m.snapchat)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(110deg,var(--color-accent),var(--color-accent-soft))] px-3.5 text-sm font-semibold text-night-950 shadow-glow-accent transition-[filter,transform] hover:brightness-110 active:scale-95"
                    >
                      <ExternalLink aria-hidden className="size-4" /> Open in Snapchat
                    </a>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setConfirm(m)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-subtle hover:text-danger"
                >
                  <UserRoundX aria-hidden className="size-4" /> Unmatch
                </button>
              </Card>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={`Unmatch ${confirm?.first_name}?`}
        description="You'll both stop seeing each other's Snapchat here."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={unmatch.isPending}
            onClick={() =>
              unmatch.mutate(confirm!.user_id, {
                onSuccess: () => {
                  toast('Unmatched')
                  setConfirm(null)
                },
                onError: (error) => toast.error(errorMessage(error, "Couldn't unmatch.")),
              })
            }
          >
            Unmatch
          </Button>
        </div>
      </Dialog>
    </>
  )
}
