import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { describedBy } from '@/lib/a11y'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { FullPageSpinner } from '@/components/ui/States'
import { authErrorMessage, updatePassword } from './api'
import { rise } from '@/lib/motion'
import { AuthLayout } from './AuthLayout'
import { useAuth } from './AuthProvider'
import { resetPasswordSchema, type ResetPasswordValues } from './schemas'

/** Supabase puts link errors (expired, already used) in the URL hash. */
function readLinkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const description = hash.get('error_description') ?? query.get('error_description')
  return description ? description.replace(/\+/g, ' ') : null
}

export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [linkError] = useState(readLinkError)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirm: '' } })

  const update = useMutation({
    mutationFn: (values: ResetPasswordValues) => updatePassword(values.password),
    onSuccess: () => {
      toast.success('Password updated. You are signed in.')
      navigate('/', { replace: true })
    },
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  if (loading) return <FullPageSpinner />

  if (!session) {
    return (
      <AuthLayout
        title="This link has expired"
        subtitle={linkError ?? 'Reset links work once and expire after an hour. Request a new one below.'}
      >
        <motion.div variants={rise}>
          <Link
            to="/forgot-password"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(110deg,var(--color-pink),var(--color-violet))] px-7 text-lg font-semibold text-night-950 shadow-glow-pink"
          >
            Send a new link
          </Link>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it something you'll remember at the venue.">
      <motion.form variants={rise} noValidate onSubmit={handleSubmit((v) => update.mutate(v))} className="space-y-4">
        <Field id="password" label="New password" hint="At least 8 characters." error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            autoFocus
            aria-invalid={!!errors.password}
            aria-describedby={describedBy('password', { error: errors.password, hint: true })}
            {...register('password')}
          />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm?.message}>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            aria-describedby={describedBy('confirm', { error: errors.confirm })}
            {...register('confirm')}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={update.isPending}>
          Update password
        </Button>
      </motion.form>
    </AuthLayout>
  )
}
