import { z } from 'zod'
import { toE164 } from '@/lib/phone'

export const SNAPCHAT_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,13}[A-Za-z0-9]$/

/** Optional Snapchat username. A leading @ is dropped; '' means none. */
export const snapchatField = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ''))
  .refine(
    (v) => v === '' || SNAPCHAT_PATTERN.test(v),
    'Use your Snapchat username: 3–15 letters, numbers, . _ or -, starting with a letter',
  )

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your name').max(120, 'That name is too long'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your phone number')
    .refine((v) => toE164(v) !== null, 'Enter a valid number, e.g. 0801 234 5678 or +44 7911 123456'),
  marketing_consent: z.boolean(),
  snapchat: snapchatField,
})

export const onboardingSchema = profileSchema.extend({
  marketing_consent: z.boolean().refine((v) => v, 'Please tick this box to continue'),
})

export type ProfileFormInput = z.input<typeof profileSchema>
export type ProfileFormValues = z.output<typeof profileSchema>
