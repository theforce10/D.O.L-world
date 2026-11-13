import { BarChart3, Check, Eye, EyeOff, History, LogIn, MessageCircleQuestion, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppHeader } from '@/app/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Confetti } from '@/components/ui/Confetti'
import { ConnectionBadge } from '@/components/ui/ConnectionBadge'
import { EventHeading } from '@/components/ui/EventHeading'
import { Logo } from '@/components/ui/Logo'
import { Skeleton } from '@/components/ui/Skeleton'
import { rise, stagger } from '@/lib/motion'
import { errorMessage } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { AuthSheet } from '@/features/auth/AuthSheet'
import { LegalLinks } from '@/features/legal/LegalLinks'
import { ConnectBanner } from '@/features/connect/ConnectBanner'
import { useProfile } from '@/features/profile/api'
import {
  useAskQuestion,
  useCastVote,
  useCheckIn,
  useEventRecap,
  normalPolls,
  openTopicVote,
  useMyQuestions,
  useMyVote,
  usePolls,
  useSetDiscoverable,
  useTopics,
  type Poll,
  type Topic,
} from './api'
import { AskSheet } from './AskSheet'
import { BottomActionBar } from './BottomActionBar'
import { CatchUp } from './CatchUp'
import { CheckInSheet } from './CheckInSheet'
import { MyQuestions } from './MyQuestions'
import { PollCard } from './PollCard'
import { TopicStage } from './TopicStage'
import { useCatchUp } from './useCatchUp'
import { useMingleActions } from './useMingleActions'
import { useMingleRealtime } from './useMingleRealtime'

export interface MingleEvent {
  id: string
  name: string
  venue: string | null
  event_date: string | null
}

export function MingleHome({ event }: { event: MingleEvent }) {
  const { session } = useAuth()
  const { data: profile } = useProfile()
  const live = useMingleRealtime(event.id)
  const castVote = useCastVote()
  const [askOpen, setAskOpen] = useState(false)
  const ask = useAskQuestion(event.id)
  const myQuestions = useMyQuestions(event.id)
  const actions = useMingleActions(event.id, {
    vote: (payload) => {
      if (!payload?.pollId || !payload.optionId) return
      castVote.mutate(
        { pollId: payload.pollId, optionId: payload.optionId },
        {
          onSuccess: () => {
            toast.success('Vote saved')
            navigator.vibrate?.(15)
          },
          onError: (error) => toast.error(errorMessage(error, "Couldn't save your vote.")),
        },
      )
    },
    ask: () => setAskOpen(true),
  })
  const topics = useTopics(event.id)
  const polls = usePolls(event.id)
  const poll = currentPoll(normalPolls(polls.data), topics.data)
  const myVote = useMyVote(poll?.status === 'open' ? poll.id : undefined)
  const topicVote = openTopicVote(polls.data)
  const myTopicVote = useMyVote(topicVote?.id)
  const topicVoteWaiting = Boolean(topicVote) && myTopicVote.data == null
  const checkIn = useCheckIn(event.id)
  const [celebrate, setCelebrate] = useState(0)
  const [loginOnly, setLoginOnly] = useState(false)

  const firstName = profile?.full_name?.split(' ')[0]
  const checkedIn = actions.checkIn.data
  const started = (topics.data ?? []).filter((t) => t.status !== 'queued')
  const doneCount = started.filter((t) => t.status === 'done').length
  const catchUp = useCatchUp({
    eventId: event.id,
    doneCount,
    checkedInAt: checkedIn?.checked_in_at,
    firstTopicStartedAt: started[0]?.started_at,
  })
  const recap = useEventRecap(event.id, catchUp.visible)

  return (
    <>
      {session ? <AppHeader /> : <GuestHeader onLogIn={() => setLoginOnly(true)} />}
      <ConnectionBadge status={live} />
      <motion.main variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-xl space-y-5 px-4 pb-36 pt-5">
        {session && <ConnectBanner />}
        <motion.div variants={rise} className="space-y-1">
          {firstName && <p className="text-ink-muted">Hey {firstName} 👋</p>}
          <EventHeading
            name={event.name}
            venue={event.venue}
            eventDate={event.event_date}
            eyebrow={<p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-soft">Mix &amp; Mingle</p>}
          />
        </motion.div>

        <motion.div variants={rise}>
          <AnimatePresence initial={false}>
            {catchUp.visible && (
              <motion.div
                key="catch-up"
                className="mb-5"
                initial={{ opacity: 0, height: 0, scale: 0.96 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.96, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              >
                <CatchUp
                  topics={recap.data}
                  hasLiveTopic={started.some((t) => t.status === 'live')}
                  onDismiss={catchUp.dismiss}
                  onGoLive={() => {
                    catchUp.dismiss()
                    window.setTimeout(() => scrollToId('live-topic'), 250)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <TopicStage eventId={event.id} voteOpen={Boolean(topicVote)} />
        </motion.div>

        <AnimatePresence initial={false}>
          {topicVote && (
            <motion.div
              key={topicVote.id}
              id="topic-vote"
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <PollCard
                poll={topicVote}
                voting={castVote.isPending}
                onVote={(optionId) => actions.request('vote', { pollId: topicVote.id, optionId })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {poll && (
            <motion.div
              key={poll.id}
              id="live-poll"
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <PollCard
                poll={poll}
                voting={castVote.isPending}
                onVote={(optionId) => actions.request('vote', { pollId: poll.id, optionId })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {myQuestions.data && myQuestions.data.length > 0 && (
            <motion.div
              key="my-questions"
              id="my-questions"
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <MyQuestions questions={myQuestions.data} />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={rise} className="relative">
          {session && actions.checkIn.isPending ? (
            <Skeleton className="h-36 rounded-3xl" />
          ) : checkedIn ? (
            <CheckedInCard eventId={event.id} discoverable={checkedIn.discoverable} celebrate={celebrate} />
          ) : (
            <JoinCard onJoin={() => actions.request('check_in')} />
          )}
        </motion.div>

        <motion.div variants={rise}>
          <LegalLinks />
        </motion.div>
      </motion.main>

      <BottomActionBar
        actions={[
          {
            id: 'vote',
            label: 'Vote',
            Icon: BarChart3,
            disabled: !poll && !topicVote,
            attention: (poll?.status === 'open' && myVote.data == null) || topicVoteWaiting,
            onClick: () => scrollToId(topicVote && (topicVoteWaiting || !poll) ? 'topic-vote' : 'live-poll'),
          },
          { id: 'ask', label: 'Ask', Icon: MessageCircleQuestion, onClick: () => actions.request('ask') },
          {
            id: 'catch-up',
            label: 'Catch up',
            Icon: History,
            disabled: doneCount === 0,
            onClick: () => {
              catchUp.open()
              window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
            },
          },
        ]}
      />

      <AskSheet
        open={askOpen}
        onClose={() => setAskOpen(false)}
        sent={myQuestions.data?.length ?? 0}
        submitting={ask.isPending}
        onSubmit={(body, reset) =>
          ask.mutate(body, {
            onSuccess: () => {
              toast.success('Sent anonymously')
              navigator.vibrate?.(15)
              reset()
              setAskOpen(false)
              window.setTimeout(() => scrollToId('my-questions'), 350)
            },
            onError: (error) => toast.error(errorMessage(error, "Couldn't send your question.")),
          })
        }
      />

      <AuthSheet
        open={actions.sheet === 'auth' || (loginOnly && !session)}
        onClose={() => {
          setLoginOnly(false)
          actions.closeSheet()
        }}
        title={loginOnly ? 'Welcome back' : 'Join tonight'}
        description={
          loginOnly
            ? 'Log in to vote, ask and connect.'
            : 'Takes a few seconds. Then you can vote, ask the host anything and connect after.'
        }
        next="/"
      />

      <CheckInSheet
        open={actions.sheet === 'check_in'}
        onClose={actions.closeSheet}
        eventName={event.name}
        askConsent={!profile?.marketing_consent}
        submitting={checkIn.isPending}
        onSubmit={(values) =>
          checkIn.mutate(values, {
            onSuccess: () => {
              toast.success(`You're in! Welcome to ${event.name}`)
              navigator.vibrate?.([40, 60, 40])
              setCelebrate((n) => n + 1)
              actions.afterCheckIn()
            },
            onError: (error) => toast.error(errorMessage(error, "Couldn't check you in. Please try again.")),
          })
        }
      />
    </>
  )
}

function GuestHeader({ onLogIn }: { onLogIn: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-night-900/70 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Logo />
        <button
          type="button"
          onClick={onLogIn}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-semibold text-accent-soft hover:bg-white/5"
        >
          <LogIn aria-hidden className="size-4" /> Log in
        </button>
      </div>
    </header>
  )
}

function JoinCard({ onJoin }: { onJoin: () => void }) {
  const reduce = useReducedMotion()
  return (
    <Card className="relative overflow-hidden">
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/25 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="relative space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Here tonight?</h2>
          <p className="text-ink-muted">Join to vote in polls, ask the host anything anonymously, and connect with people after.</p>
        </div>
        <Button size="lg" fullWidth onClick={onJoin}>
          <Sparkles aria-hidden className="size-5" /> Join tonight
        </Button>
      </div>
    </Card>
  )
}

function CheckedInCard({ eventId, discoverable, celebrate }: { eventId: string; discoverable: boolean; celebrate: number }) {
  const setDiscoverable = useSetDiscoverable(eventId)

  const toggle = () =>
    setDiscoverable.mutate(!discoverable, {
      onSuccess: (row) => toast.success(row.discoverable ? 'People you meet tonight can find you in Connect' : 'Hidden from Connect'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't update that.")),
    })

  return (
    <Card className="relative overflow-visible">
      {celebrate > 0 && <Confetti key={celebrate} count={50} />}
      <div className="flex items-center gap-4">
        <motion.span
          key={celebrate}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-night-950 shadow-glow-accent"
        >
          <Check aria-hidden className="size-7" strokeWidth={3} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">You're checked in</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={String(discoverable)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm text-ink-muted"
            >
              {discoverable ? 'People you meet can find you in Connect.' : 'Hidden from Connect.'}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <Button variant="ghost" size="sm" fullWidth className="mt-3" loading={setDiscoverable.isPending} onClick={toggle}>
        {!setDiscoverable.isPending && (discoverable ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />)}
        {discoverable ? 'Hide me from Connect' : 'Let people find me in Connect'}
      </Button>
    </Card>
  )
}

/** The open poll, or the last closed one while its round is still on screen. */
function currentPoll(polls: Poll[] | undefined, topics: Topic[] | undefined): Poll | undefined {
  if (!polls) return undefined
  const open = polls.find((p) => p.status === 'open')
  if (open) return open
  const closed = polls.filter((p) => p.status === 'closed' && p.closed_at).sort((a, b) => b.closed_at!.localeCompare(a.closed_at!))[0]
  if (!closed) return undefined
  const live = topics?.find((t) => t.status === 'live')
  if (!live?.started_at) return closed
  return closed.topic_id === live.id || closed.closed_at! >= live.started_at ? closed : undefined
}

function scrollToId(id: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
