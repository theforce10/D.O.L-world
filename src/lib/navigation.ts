export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}

export function absoluteUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}
