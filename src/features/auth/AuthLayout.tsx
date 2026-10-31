import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { rise, stagger } from '@/lib/motion'
import { LegalLinks } from '@/features/legal/LegalLinks'

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="py-3">
        <Logo />
      </header>
      <div className="flex flex-1 flex-col justify-center py-6">
        <Card>
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={rise} className="space-y-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
              {subtitle && <p className="text-ink-muted">{subtitle}</p>}
            </motion.div>
            {children}
          </motion.div>
        </Card>
        {footer && <div className="mt-6 text-center text-ink-muted">{footer}</div>}
      </div>
      <LegalLinks />
    </main>
  )
}

export function OrDivider() {
  return (
    <motion.div variants={rise} className="flex items-center gap-3 text-sm text-ink-subtle">
      <span className="h-px flex-1 bg-white/10" />
      or
      <span className="h-px flex-1 bg-white/10" />
    </motion.div>
  )
}
