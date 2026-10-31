import { absoluteUrl } from '@/lib/navigation'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'

/** Supabase's auth errors, reworded for people at a karaoke night. */
export function authErrorMessage(error: unknown): string {
  const message = errorMessage(error)
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox (and spam).'
  if (/user already registered/i.test(message)) return 'An account with this email already exists. Try logging in.'
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  if (/should be different/i.test(message)) return 'Your new password must be different from the old one.'
  if (/provider is not enabled/i.test(message)) return 'Google sign-in is not set up yet. Use email and password for now.'
  if (/failed to fetch|network/i.test(message)) return 'Network problem. Check your connection and try again.'
  return message
}

export async function signInWithGoogle(next: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: absoluteUrl(next), queryParams: { prompt: 'select_account' } },
  })
  if (error) throw error
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Returns true if the user is signed in straight away, false if they must confirm their email first. */
export async function signUp({ fullName, email, password }: { fullName: string; email: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: absoluteUrl('/') },
  })
  if (error) throw error
  return Boolean(data.session)
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: absoluteUrl('/') } })
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: absoluteUrl('/reset-password') })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
