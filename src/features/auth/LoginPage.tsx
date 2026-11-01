import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { describedBy } from '@/lib/a11y'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { safeNext } from '@/lib/navigation'
import { authErrorMessage, signInWithPassword } from './api'
import { rise } from '@/lib/motion'
import { AuthLayout, OrDivider } from './AuthLayout'
import { GoogleButton } from './GoogleButton'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const nextQuery = params.get('next') ? `?next=${encodeURIComponent(next)}` : ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  // On success GuestOnly sees the new session and redirects to `next`.
  const login = useMutation({
    mutationFn: (values: LoginValues) => signInWithPassword(values.email, values.password),
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick your song and grab your number."
      footer={
        <>
          New here?{' '}
          <Link to={`/signup${nextQuery}`} className="font-semibold text-gold-soft underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <motion.div variants={rise}>
        <GoogleButton next={next} />
      </motion.div>
      <OrDivider />
      <motion.form variants={rise} noValidate onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4">
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
        <Field id="password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={describedBy('password', { error: errors.password })}
            {...register('password')}
          />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-sm font-medium text-gold-soft underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={login.isPending}>
          Log in
        </Button>
      </motion.form>
    </AuthLayout>
  )
}
