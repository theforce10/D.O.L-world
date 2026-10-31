import { z } from 'zod'

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use 72 characters or fewer')

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name').max(120, 'That name is too long'),
  email,
  password: newPassword,
})
export type SignupValues = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ['confirm'] })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
