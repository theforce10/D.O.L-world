import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, MailCheck, User } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { describedBy } from '@/lib/a11y'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { safeNext } from '@/lib/navigation'
import { authErrorMessage, resendConfirmation, signUp } from './api'
import { rise } from '@/lib/motion'
import { AuthLayout, OrDivider } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { signupSchema, type SignupValues } from './schemas'

function CheckYourEmail({ email }: { email: string }) {
  const resend = useMutation({
    mutationFn: () => resendConfirmation(email),
    onSuccess: () => toast.success('Sent again. Check your inbox.'),
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a confirmation link to <strong className="text-ink">{email}</strong>. Tap it to finish signing up.
        </>
      }
    >
      <motion.div variants={rise} className="flex justify-center py-2">
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="grid size-20 place-items-center rounded-3xl bg-night-700 shadow-glow-gold"
        >
          <MailCheck aria-hidden className="size-10 text-gold" />
        </motion.div>
      </motion.div>
      <motion.p variants={rise} className="text-sm text-ink-muted">
        Can't find it? Check your spam folder. The link opens this app and signs you in.
      </motion.p>
      <motion.div variants={rise}>
        <Button variant="secondary" fullWidth loading={resend.isPending} onClick={() => resend.mutate()}>
          Resend email
        </Button>
      </motion.div>
    </AuthLayout>
  )
}

export function SignupPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const signup = useMutation({
    mutationFn: signUp,
    onSuccess: (signedIn, values) => {
      // If email confirmation is on there's no session yet; otherwise GuestOnly redirects automatically.
      if (!signedIn) setPendingEmail(values.email)
    },
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  if (pendingEmail) return <CheckYourEmail email={pendingEmail} />

  return (
    <AuthLayout
      title="Join the party"
      subtitle="Create your account, pick a song, get your number."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-semibold text-gold-soft underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <motion.div variants={rise}>
        <GoogleButton next={next} />
      </motion.div>
      <OrDivider />
      <motion.form variants={rise} noValidate onSubmit={handleSubmit((v) => signup.mutate(v))} className="space-y-4">
        <Field id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            icon={<User className="size-5" />}
            aria-invalid={!!errors.fullName}
            aria-describedby={describedBy('fullName', { error: errors.fullName })}
            {...register('fullName')}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={<Mail className="size-5" />}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email', { error: errors.email })}
            {...register('email')}
          />
        </Field>
        <Field id="password" label="Password" hint="At least 8 characters." error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={describedBy('password', { error: errors.password, hint: true })}
            {...register('password')}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={signup.isPending}>
          Create account
        </Button>
      </motion.form>
    </AuthLayout>
  )
}
