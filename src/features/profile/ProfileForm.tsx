import { zodResolver } from '@hookform/resolvers/zod'
import { Phone, User } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { describedBy } from '@/lib/a11y'
import { Input } from '@/components/ui/Input'
import { BRAND } from '@/lib/brand'
import { formatPhone, toE164 } from '@/lib/phone'
import type { Profile } from '@/lib/types'
import { rise, stagger } from '@/lib/motion'
import { onboardingSchema, profileSchema, type ProfileFormInput, type ProfileFormValues } from './schemas'

interface ProfileFormProps {
  profile: Profile
  mode: 'onboarding' | 'edit'
  submitting: boolean
  onSubmit: (values: ProfileFormValues & { phone: string }) => void
}

export function ProfileForm({ profile, mode, submitting, onSubmit }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(mode === 'onboarding' ? onboardingSchema : profileSchema),
    mode: 'onTouched',
    defaultValues: {
      full_name: profile.full_name ?? '',
      phone: profile.phone ? formatPhone(profile.phone) : '',
      // Unchecked by default at onboarding, as required.
      marketing_consent: mode === 'onboarding' ? false : profile.marketing_consent,
    },
  })

  const phone = useWatch({ control, name: 'phone' })
  const phonePreview = phone ? toE164(phone) : null

  return (
    <motion.form
      variants={stagger}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit({ ...values, phone: toE164(values.phone)! }))}
      className="space-y-5"
    >
      <motion.div variants={rise}>
        <Field id="full_name" label="Full name" error={errors.full_name?.message}>
          <Input
            id="full_name"
            autoComplete="name"
            icon={<User className="size-5" />}
            placeholder="Ada Okafor"
            aria-invalid={!!errors.full_name}
            aria-describedby={describedBy('full_name', { error: errors.full_name })}
            {...register('full_name')}
          />
        </Field>
      </motion.div>

      <motion.div variants={rise}>
        <Field
          id="phone"
          label="Phone number"
          error={errors.phone?.message}
          hint={
            phonePreview ? (
              <>
                We'll save it as <span className="font-medium text-ink">{formatPhone(phonePreview)}</span>
              </>
            ) : (
              'Nigerian numbers can start with 0. Others need a + and country code.'
            )
          }
        >
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            icon={<Phone className="size-5" />}
            placeholder="0801 234 5678"
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy('phone', { error: errors.phone, hint: true })}
            {...register('phone')}
          />
        </Field>
      </motion.div>

      <motion.div variants={rise} className="space-y-1.5">
        <Checkbox
          id="marketing_consent"
          aria-invalid={!!errors.marketing_consent}
          aria-describedby={describedBy('marketing_consent', { error: errors.marketing_consent })}
          label={
            <>
              I agree that {BRAND} may contact me about future events and promotions. {/* New tab so a half-filled form isn't lost. */}
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gold-soft underline-offset-4 hover:underline"
              >
                How we use your details
              </a>
              {mode === 'edit' && <span className="mt-1 block text-ink-muted">Untick any time to stop hearing from us.</span>}
            </>
          }
          {...register('marketing_consent')}
        />
        {errors.marketing_consent && (
          <p id="marketing_consent-error" role="alert" className="text-sm text-danger">
            {errors.marketing_consent.message}
          </p>
        )}
      </motion.div>

      {/* Sticky on phones so the button is always reachable above the keyboard. */}
      <motion.div
        variants={rise}
        className="sticky bottom-0 -mx-5 bg-gradient-to-t from-night-800 via-night-800/95 to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:bg-none sm:p-0"
      >
        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={mode === 'edit' && !isDirty}>
          {mode === 'onboarding' ? "Let's go 🎤" : 'Save changes'}
        </Button>
      </motion.div>
    </motion.form>
  )
}
