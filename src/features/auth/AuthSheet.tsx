import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, MailCheck, User } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { describedBy } from '@/lib/a11y'
import { authErrorMessage, signInWithPassword, signUp } from './api'
import { GoogleButton } from './GoogleButton'
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from './schemas'

type Mode = 'choose' | 'login' | 'create' | 'check-email'

interface AuthSheetProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  next: string
}

const swap = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
}

export function AuthSheet({ open, onClose, title, description, next }: AuthSheetProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [email, setEmail] = useState('')

  const close = () => {
    onClose()
    setMode('choose')
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={mode === 'check-email' ? 'Check your email' : title}
      description={mode === 'check-email' ? undefined : description}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'choose' && (
          <motion.div key="choose" {...swap} className="space-y-3">
            <GoogleButton next={next} variant="primary" />
            <Button variant="ghost" size="lg" fullWidth onClick={() => setMode('login')}>
              <Mail aria-hidden className="size-5" /> Use email instead
            </Button>
          </motion.div>
        )}
        {mode === 'login' && (
          <motion.div key="login" {...swap}>
            <EmailLogin onNew={() => setMode('create')} />
          </motion.div>
        )}
        {mode === 'create' && (
          <motion.div key="create" {...swap}>
            <EmailCreate
              onHaveAccount={() => setMode('login')}
              onNeedsConfirm={(address) => {
                setEmail(address)
                setMode('check-email')
              }}
            />
          </motion.div>
        )}
        {mode === 'check-email' && (
          <motion.div key="check" {...swap} className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="mx-auto grid size-20 place-items-center rounded-3xl bg-night-700 shadow-glow-accent"
            >
              <MailCheck aria-hidden className="size-10 text-accent" />
            </motion.div>
            <p className="text-ink-muted">
              We sent a link to <strong className="text-ink">{email}</strong>. Open it on this phone, then come back and tap the button
              again.
            </p>
            <Button variant="secondary" fullWidth onClick={close}>
              Got it
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  )
}

function EmailLogin({ onNew }: { onNew: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const login = useMutation({
    mutationFn: (values: LoginValues) => signInWithPassword(values.email, values.password),
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  return (
    <form noValidate onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4">
      <Field id="sheet-email" label="Email" error={errors.email?.message}>
        <Input
          id="sheet-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          icon={<Mail className="size-5" />}
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={describedBy('sheet-email', { error: errors.email })}
          {...register('email')}
        />
      </Field>
      <Field id="sheet-password" label="Password" error={errors.password?.message}>
        <PasswordInput
          id="sheet-password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={describedBy('sheet-password', { error: errors.password })}
          {...register('password')}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={login.isPending}>
        Log in and continue
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm">
        <button type="button" onClick={onNew} className="min-h-11 font-semibold text-accent-soft underline-offset-4 hover:underline">
          New here? Use your email
        </button>
        <Link to="/forgot-password" className="inline-flex min-h-11 items-center text-ink-muted underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  )
}

function EmailCreate({ onHaveAccount, onNeedsConfirm }: { onHaveAccount: () => void; onNeedsConfirm: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { fullName: '', email: '', password: '' } })

  const create = useMutation({
    mutationFn: signUp,
    onSuccess: (signedIn, values) => {
      if (!signedIn) onNeedsConfirm(values.email)
    },
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  return (
    <form noValidate onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
      <Field id="sheet-name" label="Your name" error={errors.fullName?.message}>
        <Input
          id="sheet-name"
          autoComplete="name"
          icon={<User className="size-5" />}
          aria-invalid={!!errors.fullName}
          aria-describedby={describedBy('sheet-name', { error: errors.fullName })}
          {...register('fullName')}
        />
      </Field>
      <Field id="sheet-new-email" label="Email" error={errors.email?.message}>
        <Input
          id="sheet-new-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          icon={<Mail className="size-5" />}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy('sheet-new-email', { error: errors.email })}
          {...register('email')}
        />
      </Field>
      <Field id="sheet-new-password" label="Choose a password" hint="At least 8 characters." error={errors.password?.message}>
        <PasswordInput
          id="sheet-new-password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={describedBy('sheet-new-password', { error: errors.password, hint: true })}
          {...register('password')}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={create.isPending}>
        Continue
      </Button>
      <button
        type="button"
        onClick={onHaveAccount}
        className="min-h-11 text-sm font-semibold text-accent-soft underline-offset-4 hover:underline"
      >
        I already have an account
      </button>
    </form>
  )
}
