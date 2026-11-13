import { AlarmClock, BarChart3, EyeOff, Expand, MessageCircleQuestion, MessagesSquare, Shrink, Vote } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useAccentMode } from '@/app/accentMode'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { CountdownRing } from '@/components/ui/CountdownRing'
import { BRAND } from '@/lib/brand'
import { absoluteUrl } from '@/lib/navigation'
import { useCountdown } from '@/lib/serverClock'
import { normalPolls, openTopicVote, usePollResults, usePolls, useTopics, type Poll, type Topic } from '@/features/mingle/api'
import { ResultBars } from '@/features/mingle/ResultBars'
import { useHostEvent, useHostQuestions, type HostQuestion } from '@/features/host/api'
import { useHostRealtime } from '@/features/host/useHostRealtime'

const spring = { type: 'spring' as const, stiffness: 140, damping: 20 }

export function ScreenPage() {
  const { eventId } = useParams()
  useAccentMode('mingle')
  useHostRealtime(eventId)
  const event = useHostEvent(eventId)
  const topics = useTopics(eventId)
  const polls = usePolls(eventId)
  const questions = useHostQuestions(eventId)

  const started = (topics.data ?? []).filter((t) => t.status !== 'queued')
  const live = started.find((t) => t.status === 'live')
  const topicVote = openTopicVote(polls.data)
  const pollsOnly = normalPolls(polls.data)
  // A running topic vote takes the poll slot: it only lasts a minute or two.
  const poll = topicVote ?? pollsOnly.find((p) => p.id === event.data?.screen_poll_id) ?? pollsOnly.find((p) => p.status === 'open')
  const question = questions.data?.find((q) => q.id === event.data?.screen_question_id && q.status !== 'hidden')
  const joinUrl = absoluteUrl('/')

  return (
    <div className="fixed inset-0 overflow-hidden bg-night-950 text-ink">
      <ScreenBackdrop />
      <FullscreenButton />
      <div className="relative grid h-full grid-cols-[1.15fr_1fr] gap-[3vw] p-[3vw]">
        <section className="flex min-h-0 flex-col">
          <header className="flex items-center gap-[1vw]">
            <span className="font-display text-[1.4vw] font-bold text-gradient">{BRAND}</span>
            <span className="text-[1.4vw] text-ink-subtle">·</span>
            <span className="truncate text-[1.4vw] font-semibold text-ink-muted">{event.data?.name}</span>
            <span className="ml-[0.6vw] inline-flex items-center gap-[0.5vw] rounded-full bg-accent/15 px-[0.9vw] py-[0.3vw] text-[0.9vw] font-bold uppercase tracking-wider text-accent-soft">
              <span className="size-[0.6vw] rounded-full bg-accent motion-safe:animate-pulse" /> Live
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col justify-center [perspective:1600px]">
            <AnimatePresence mode="wait">
              {live ? (
                <ScreenTopic key={live.id} topic={live} number={started.indexOf(live) + 1} />
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={spring}
                >
                  <p className="text-[1.6vw] font-semibold uppercase tracking-[0.25em] text-accent-soft">Mix &amp; Mingle</p>
                  <h1 className="mt-[1.5vh] text-balance font-display text-[5vw] font-extrabold leading-[1.05]">
                    {topicVote
                      ? 'You pick the next topic. Vote now!'
                      : started.length
                        ? 'Keep talking. Next topic soon.'
                        : `Welcome to ${event.data?.name ?? BRAND}`}
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-[1.6vw]">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.3 }}
              className="rounded-[1.2vw] bg-white p-[0.8vw] shadow-glow-accent"
            >
              <QRCodeSVG
                value={joinUrl}
                level="M"
                bgColor="#ffffff"
                fgColor="#09080b"
                className="block size-[9vw]"
                aria-label={`QR code for ${joinUrl}`}
              />
            </motion.div>
            <div>
              <p className="font-display text-[2.2vw] font-bold">Scan to vote</p>
              <p className="text-[1.3vw] text-ink-muted">{joinUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col justify-center gap-[2.4vh]">
          <AnimatePresence mode="popLayout">
            {poll ? (
              <ScreenPoll key={poll.id} poll={poll} dense={Boolean(question) || isWordy(poll)} />
            ) : question ? null : (
              <motion.div
                key="no-poll"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid place-items-center gap-[2vh] rounded-[2vw] border border-white/10 bg-white/[0.03] px-[3vw] py-[8vh] text-center"
              >
                <BarChart3 aria-hidden className="size-[5vw] text-accent/60" />
                <p className="text-[1.8vw] text-ink-muted">Live polls show up here</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {question && <ScreenQuestion key={question.id} question={question} compact={Boolean(poll)} />}
          </AnimatePresence>
        </section>
      </div>
    </div>
  )
}

function ScreenTopic({ topic, number }: { topic: Topic; number: number }) {
  const countdown = useCountdown(topic.started_at, topic.duration_seconds)
  const words = topic.prompt.split(/\s+/)
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -50, y: 80 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      exit={{ opacity: 0, rotateX: 40, y: -60 }}
      transition={spring}
      style={{ transformOrigin: '50% 0%' }}
    >
      <div className="flex items-center justify-between gap-[2vw]">
        <p className="inline-flex items-center gap-[0.6vw] rounded-full bg-accent/15 px-[1.2vw] py-[0.5vw] text-[1.3vw] font-bold uppercase tracking-wider text-accent-soft">
          <MessagesSquare aria-hidden className="size-[1.4vw]" /> Topic {number}
        </p>
        {countdown && <CountdownRing countdown={countdown} className="size-[8vw]" labelClassName="text-[1.8vw]" />}
      </div>
      <motion.h1
        className={`mt-[3vh] text-balance font-display font-extrabold leading-[1.08] ${topicSize(topic.prompt)}`}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="inline-block whitespace-pre"
            variants={{
              hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: spring },
            }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </motion.h1>
      <AnimatePresence>
        {countdown?.done && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-[3vh] inline-flex items-center gap-[1vw] text-[2vw] font-bold text-accent-soft"
          >
            <motion.span animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2 }}>
              <AlarmClock aria-hidden className="size-[2.4vw] text-accent" />
            </motion.span>
            Time's up — wrap it up
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ScreenPoll({ poll, dense }: { poll: Poll; dense: boolean }) {
  const results = usePollResults(poll.id)
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={spring}
      layout
      className={`min-h-0 overflow-hidden rounded-[2vw] border border-white/10 bg-night-900/70 shadow-card backdrop-blur-md ${dense ? 'p-[1.8vw]' : 'p-[2.4vw]'}`}
    >
      <div className="flex items-center justify-between gap-[1vw]">
        <p className="inline-flex items-center gap-[0.6vw] text-[1.2vw] font-bold uppercase tracking-wider text-accent-soft">
          {poll.kind === 'topic' ? <Vote aria-hidden className="size-[1.4vw]" /> : <BarChart3 aria-hidden className="size-[1.4vw]" />}{' '}
          {poll.status !== 'open' ? 'Final results' : poll.kind === 'topic' ? 'Vote for the next topic' : 'Live poll'}
        </p>
        <p className="text-[1.4vw] text-ink-muted">
          <AnimatedNumber value={poll.vote_count} className="font-display font-bold text-ink" /> {poll.vote_count === 1 ? 'vote' : 'votes'}
        </p>
      </div>
      <h2 className={`mt-[2vh] text-balance font-display font-bold leading-tight ${dense ? 'text-[1.7vw]' : 'text-[2.6vw]'}`}>
        {poll.question}
      </h2>
      <div className={dense ? 'mt-[2vh]' : 'mt-[3vh]'}>{results.data && <ResultBars results={results.data} size="xl" dense={dense} />}</div>
    </motion.div>
  )
}

/** Topic votes and polls with long options use the compact rows so every option fits. */
function isWordy(poll: Poll): boolean {
  return poll.kind === 'topic' || poll.options.some((o) => o.label.length > 60)
}

/** Long prompts shrink so they always fit on a 16:9 screen. */
function topicSize(prompt: string): string {
  if (prompt.length <= 70) return 'text-[4.4vw]'
  if (prompt.length <= 130) return 'text-[3.4vw]'
  if (prompt.length <= 200) return 'text-[2.8vw]'
  return 'text-[2.3vw]'
}

function ScreenQuestion({ question, compact }: { question: HostQuestion; compact: boolean }) {
  const long = question.body.length > 140
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 60, scale: 0.94, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: 40, scale: 0.96 }}
      transition={spring}
      className="relative shrink-0 overflow-hidden rounded-[2vw] bg-[linear-gradient(150deg,var(--color-accent-deep),var(--color-accent)_55%,var(--color-accent-soft))] p-[0.2vw] shadow-glow-accent"
    >
      <div className={`rounded-[1.8vw] bg-night-900/95 ${compact ? 'p-[1.6vw]' : 'p-[2.2vw]'}`}>
        <p className="flex items-center gap-[0.6vw] text-[1.2vw] font-bold uppercase tracking-wider text-accent-soft">
          <MessageCircleQuestion aria-hidden className="size-[1.4vw]" /> Question from the room
          <span className="ml-auto inline-flex items-center gap-[0.4vw] text-[1vw] font-semibold normal-case tracking-normal text-ink-subtle">
            <EyeOff aria-hidden className="size-[1vw]" /> Anonymous
          </span>
        </p>
        <p
          className={`mt-[1.6vh] text-balance font-display font-bold leading-snug ${
            compact ? (long ? 'text-[1.5vw]' : 'text-[1.9vw]') : long ? 'text-[2.2vw]' : 'text-[2.8vw]'
          }`}
        >
          “{question.body}”
        </p>
      </div>
    </motion.div>
  )
}

function ScreenBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute -left-[10vw] -top-[20vh] size-[60vw] rounded-full bg-accent/15 blur-[8vw]"
        animate={{ x: ['0%', '12%', '0%'], y: ['0%', '8%', '0%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-[30vh] -right-[10vw] size-[55vw] rounded-full bg-accent-deep/15 blur-[8vw]"
        animate={{ x: ['0%', '-10%', '0%'], y: ['0%', '-6%', '0%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

function FullscreenButton() {
  const [isFull, setIsFull] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement))
    let timer = window.setTimeout(() => setVisible(false), 3000)
    const onMove = () => {
      setVisible(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setVisible(false), 3000)
    }
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('mousemove', onMove)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('mousemove', onMove)
      window.clearTimeout(timer)
    }
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  return (
    <motion.button
      type="button"
      onClick={toggle}
      animate={{ opacity: visible ? 1 : 0 }}
      className="absolute right-[1.2vw] top-[1.2vw] z-10 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-night-900/80 px-4 text-sm font-semibold backdrop-blur"
      style={{ cursor: visible ? 'pointer' : 'none' }}
    >
      {isFull ? <Shrink aria-hidden className="size-4" /> : <Expand aria-hidden className="size-4" />}
      {isFull ? 'Exit full screen' : 'Full screen'}
    </motion.button>
  )
}
