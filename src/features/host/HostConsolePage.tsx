import { ArrowLeft, BarChart3, CheckCheck, ChevronDown, CircleAlert, ListOrdered, MessageCircleQuestion, MonitorPlay } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useAccentMode } from '@/app/accentMode'
import { Card } from '@/components/ui/Card'
import { ConnectionBadge } from '@/components/ui/ConnectionBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { rise, stagger } from '@/lib/motion'
import { errorMessage } from '@/lib/utils'
import { normalPolls, openTopicVote, usePolls, useTopics, type Topic } from '@/features/mingle/api'
import { useHostEvent, useHostQuestions } from './api'
import { LiveTopicControl } from './LiveTopicControl'
import { PollList } from './PollList'
import { QuestionList } from './QuestionList'
import { TopicComposer } from './TopicComposer'
import { TopicQueue } from './TopicQueue'
import { useHostRealtime } from './useHostRealtime'
import { useNewQuestionAlert } from './useNewQuestionAlert'
import { WrapUpCard } from './WrapUpCard'

type Tab = 'topics' | 'polls' | 'questions'

const panel = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { type: 'spring' as const, stiffness: 380, damping: 34 },
}

const tabs = [
  { id: 'topics', label: 'Topics', Icon: ListOrdered },
  { id: 'polls', label: 'Polls', Icon: BarChart3 },
  { id: 'questions', label: 'Questions', Icon: MessageCircleQuestion },
] as const

function Tabs({
  tab,
  onChange,
  openPolls,
  newQuestions,
}: {
  tab: Tab
  onChange: (tab: Tab) => void
  openPolls: number
  newQuestions: number
}) {
  return (
    <div role="tablist" aria-label="Host tools" className="grid grid-cols-3 gap-1 rounded-2xl bg-night-800/90 p-1">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className="relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold"
        >
          {tab === id && (
            <motion.span
              layoutId="host-tab"
              className="absolute inset-0 rounded-xl bg-white/10"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            />
          )}
          <Icon
            aria-hidden
            className={tab === id ? 'relative size-4 text-accent max-[379px]:hidden' : 'relative size-4 text-ink-muted max-[379px]:hidden'}
          />
          <span className={tab === id ? 'relative text-ink' : 'relative text-ink-muted'}>{label}</span>
          {id === 'polls' && openPolls > 0 && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
              <span className="sr-only">A poll is live</span>
            </span>
          )}
          {id === 'questions' && newQuestions > 0 && (
            <motion.span
              key={newQuestions}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
              className="relative rounded-full bg-accent px-1.5 text-xs tabular-nums text-night-950"
            >
              {newQuestions}
              <span className="sr-only"> new</span>
            </motion.span>
          )}
        </button>
      ))}
    </div>
  )
}

export function HostConsolePage() {
  const { eventId } = useParams()
  useAccentMode('mingle')
  const live = useHostRealtime(eventId)
  const event = useHostEvent(eventId)
  const topics = useTopics(eventId)
  const polls = usePolls(eventId)
  const [params, setParams] = useSearchParams()
  const questions = useHostQuestions(eventId)
  useNewQuestionAlert(questions.data)
  const tabParam = params.get('tab')
  const tab: Tab = tabParam === 'polls' || tabParam === 'questions' ? tabParam : 'topics'
  const setTab = (next: Tab) =>
    setParams(
      (p) => {
        p.set('tab', next)
        return p
      },
      { replace: true },
    )

  if (event.isPending || topics.isPending) {
    return (
      <main className="mx-auto w-full max-w-xl space-y-4 px-4 pb-16 pt-5" aria-busy>
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </main>
    )
  }

  if (event.isError || topics.isError) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-5">
        <ErrorState
          message={errorMessage(event.error ?? topics.error, "Couldn't load the host console.")}
          onRetry={() => {
            void event.refetch()
            void topics.refetch()
          }}
        />
      </main>
    )
  }

  if (!event.data || event.data.type !== 'mix_mingle') {
    return (
      <main className="mx-auto w-full max-w-xl px-4 pt-5">
        <Card>
          <EmptyState icon={<CircleAlert className="size-8" />} title="Not a Mix & Mingle event">
            <p>The host console is for Mix &amp; Mingle events.</p>
            <Link
              to="/admin"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent-soft underline-offset-4 hover:underline"
            >
              Back to events
            </Link>
          </EmptyState>
        </Card>
      </main>
    )
  }

  const all = topics.data
  const started = all.filter((t) => t.status !== 'queued')
  const liveTopic = started.find((t) => t.status === 'live')
  const queued = all.filter((t) => t.status === 'queued')
  const done = started.filter((t) => t.status === 'done')
  const topicVote = openTopicVote(polls.data)
  const inVote = new Set(topicVote?.options.flatMap((o) => (o.topic_id ? [o.topic_id] : [])))
  const pollList = normalPolls(polls.data)

  return (
    <>
      <ConnectionBadge status={live} />
      <motion.main variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-xl space-y-5 px-4 pb-24 pt-4">
        <motion.div variants={rise} className="space-y-1">
          <Link
            to={`/admin?event=${event.data.id}`}
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4" /> Events
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-extrabold">{event.data.name}</h1>
            <a
              href={`/screen/${event.data.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-semibold text-ink hover:border-accent/60"
            >
              <MonitorPlay aria-hidden className="size-4" /> <span className="max-[359px]:sr-only">Big screen</span>
            </a>
          </div>
          {!event.data.is_active && !event.data.ended_at && (
            <p className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-ink-muted">
              <CircleAlert aria-hidden className="size-4 shrink-0 text-accent-soft" />
              This event isn't live, so guests can't see topics yet. Go live from the events page.
            </p>
          )}
        </motion.div>

        <motion.div variants={rise}>
          <LiveTopicControl
            eventId={event.data.id}
            live={liveTopic}
            queued={queued}
            number={liveTopic ? started.indexOf(liveTopic) + 1 : 0}
            topicVote={topicVote}
          />
        </motion.div>

        <motion.div
          variants={rise}
          className="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-20 -mx-4 bg-night-900/80 px-4 py-2 backdrop-blur-lg"
        >
          <Tabs
            tab={tab}
            onChange={setTab}
            openPolls={pollList.filter((p) => p.status === 'open').length}
            newQuestions={(questions.data ?? []).filter((q) => q.status === 'pending').length}
          />
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {tab === 'topics' ? (
            <motion.div key="topics" {...panel} className="space-y-5">
              <TopicQueue eventId={event.data.id} queued={queued} inVote={inVote} />
              <TopicComposer eventId={event.data.id} />
              {done.length > 0 && <DoneTopics topics={done} />}
            </motion.div>
          ) : tab === 'questions' ? (
            <motion.div key="questions" {...panel}>
              {questions.isPending ? (
                <Skeleton className="h-48 rounded-3xl" />
              ) : questions.isError ? (
                <ErrorState message={errorMessage(questions.error, "Couldn't load questions.")} onRetry={() => questions.refetch()} />
              ) : (
                <QuestionList eventId={event.data.id} questions={questions.data} screenQuestionId={event.data.screen_question_id} />
              )}
            </motion.div>
          ) : (
            <motion.div key="polls" {...panel}>
              {polls.isPending ? (
                <Skeleton className="h-48 rounded-3xl" />
              ) : polls.isError ? (
                <ErrorState message={errorMessage(polls.error, "Couldn't load polls.")} onRetry={() => polls.refetch()} />
              ) : (
                <PollList eventId={event.data.id} polls={pollList} topics={all} screenPollId={event.data.screen_poll_id} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={rise}>
          <WrapUpCard eventId={event.data.id} endedAt={event.data.ended_at} />
        </motion.div>
      </motion.main>
    </>
  )
}

function DoneTopics({ topics }: { topics: Topic[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="p-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left font-semibold sm:px-5"
      >
        <span className="inline-flex items-center gap-2">
          <CheckCheck aria-hidden className="size-5 text-accent-soft" /> Done ({topics.length})
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown aria-hidden className="size-5 text-ink-muted" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {topics.map((t, i) => (
              <li key={t.id} className="border-t border-white/5 px-4 py-3 text-sm text-ink-muted sm:px-5">
                <span className="mr-2 font-semibold text-ink-subtle">{i + 1}.</span>
                {t.prompt}
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </Card>
  )
}
