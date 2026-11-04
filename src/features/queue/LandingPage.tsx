import { Hash, ListMusic, Mic } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Logo } from '@/components/ui/Logo'
import { BRAND } from '@/lib/brand'
import { rise, stagger } from '@/lib/motion'
import { LegalLinks } from '@/features/legal/LegalLinks'
import { AnimatedMic } from './AnimatedMic'

const steps = [
  { Icon: ListMusic, title: 'Pick your song', body: 'Tell us the track and the artist.' },
  { Icon: Hash, title: 'Get your number', body: 'Numbers go out in the order songs come in.' },
  { Icon: Mic, title: 'Take the stage', body: "We'll ping you when you're up next." },
]

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-2">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-gold-soft hover:text-gold">
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex min-h-11 items-center rounded-xl bg-[linear-gradient(110deg,var(--color-flame),var(--color-ember))] px-4 font-semibold text-night-950 hover:brightness-110"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center"
      >
        <AnimatedMic />
        <motion.h1 variants={rise} className="text-balance text-4xl font-extrabold leading-tight sm:text-6xl">
          It's <span className="text-gradient">karaoke night</span> at {BRAND}
        </motion.h1>
        <motion.p variants={rise} className="max-w-md text-balance text-lg text-ink-muted">
          Grab your spot in the queue in under a minute. No paper, no shouting over the music.
        </motion.p>
        <motion.div variants={rise} className="flex w-full max-w-sm flex-col gap-3">
          <motion.div whileTap={{ scale: 0.96 }}>
            <Link
              to="/signup"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,var(--color-flame),var(--color-ember))] px-7 text-lg font-semibold text-night-950 shadow-glow-flame hover:brightness-110"
            >
              <Mic aria-hidden className="size-5" /> Sign up to get my number
            </Link>
          </motion.div>
          <Link
            to="/login"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-white/15 font-semibold text-ink hover:border-gold/60"
          >
            I already have an account · Log in
          </Link>
        </motion.div>

        <motion.ol variants={stagger} className="mt-6 grid w-full gap-3 text-left sm:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <motion.li
              key={title}
              variants={rise}
              className="flex gap-3 rounded-2xl border border-white/10 bg-night-800/60 p-4 sm:flex-col"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-night-700 text-gold">
                <Icon aria-hidden className="size-5" />
              </span>
              <div>
                <p className="font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </p>
                <p className="text-sm text-ink-muted">{body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </motion.section>
      <LegalLinks />
    </main>
  )
}
