import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { BRAND, CONTACT_EMAIL } from '@/lib/brand'
import { rise, stagger } from '@/lib/motion'
import { LegalLinks } from './LegalLinks'

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between gap-3 py-3">
        <Logo />
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm text-ink-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" /> Back
        </Link>
      </header>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 pt-4">
        <motion.div variants={rise} className="space-y-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="text-sm text-ink-subtle">
            {BRAND} · Last updated {updated}
          </p>
        </motion.div>
        <motion.div variants={rise}>
          <Card className="space-y-6 text-ink-muted [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </Card>
        </motion.div>
        <LegalLinks />
      </motion.div>
    </main>
  )
}

/** "email us at x" when a contact email is configured, otherwise a neutral fallback. */
export function ContactLine() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-gold-soft underline-offset-4 hover:underline">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span>the event organisers</span>
  )
}
