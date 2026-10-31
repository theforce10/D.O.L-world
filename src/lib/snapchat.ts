// Mirrors the CHECK constraint on profiles.snapchat.
export const SNAPCHAT_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{1,13}[A-Za-z0-9]$/

/** Strips a leading "@", spaces, and lowercases (Snapchat usernames are case-insensitive). */
export function normalizeSnapchat(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase()
}
