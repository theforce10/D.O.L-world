import { z } from 'zod'
import { toE164 } from '@/lib/phone'
import { normalizeSnapchat, SNAPCHAT_PATTERN } from '@/lib/snapchat'

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your name').max(120, 'That name is too long'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your phone number')
    .refine((v) => toE164(v) !== null, 'Enter a valid number, e.g. 0801 234 5678 or +44 7911 123456'),
  snapchat: z
    .string()
    .transform(normalizeSnapchat)
    .pipe(
      z
        .string()
        .min(1, 'Enter your Snapchat username')
        .min(3, 'Snapchat usernames are 3–15 characters')
        .max(15, 'Snapchat usernames are 3–15 characters')
        .regex(SNAPCHAT_PATTERN, 'Use letters, numbers, ".", "_" or "-", starting with a letter'),
    ),
  marketing_consent: z.boolean(),
})

// Consent is required to finish onboarding (it can be withdrawn later on /profile).
export const onboardingSchema = profileSchema.extend({
  marketing_consent: z.boolean().refine((v) => v, 'Please tick this box to continue'),
})

export type ProfileFormInput = z.input<typeof profileSchema>
export type ProfileFormValues = z.output<typeof profileSchema>
