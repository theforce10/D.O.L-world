import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { describedBy } from '@/lib/a11y'
import { Input } from '@/components/ui/Input'
import { authErrorMessage, sendPasswordReset } from './api'
import { rise } from '@/lib/motion'
import { AuthLayout } from './AuthLayout'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas'

const backToLogin = (
  <Link to="/login" className="font-semibold text-cyan-soft underline-offset-4 hover:underline">
    Back to log in
  </Link>
)

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  const reset = useMutation({
    mutationFn: (values: ForgotPasswordValues) => sendPasswordReset(values.email),
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  if (reset.isSuccess) {
    // Same message whether or not the account exists, so emails can't be probed.
    return (
      <AuthLayout
        title="Check your email"
        subtitle={<>If an account exists for <strong className="text-ink">{getValues('email')}</strong>, a reset link is on its way.</>}
        footer={backToLogin}
      >
        <motion.div variants={rise} className="flex justify-center py-2">
          <motion.div
            initial={{ x: -40, opacity: 0, rotate: -15 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className="grid size-20 place-items-center rounded-3xl bg-night-700 shadow-glow-cyan"
          >
            <Send aria-hidden className="size-9 text-cyan" />
          </motion.div>
        </motion.div>
        <motion.p variants={rise} className="text-sm text-ink-muted">
          Open the link on this device. It expires after an hour.
        </motion.p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link." footer={backToLogin}>
      <motion.form variants={rise} noValidate onSubmit={handleSubmit((v) => reset.mutate(v))} className="space-y-4">
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={<Mail className="size-5" />}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy('email', { error: errors.email })}
            {...register('email')}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={reset.isPending}>
          Send reset link
        </Button>
      </motion.form>
    </AuthLayout>
  )
}
