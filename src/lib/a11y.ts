export function describedBy(id: string, { error, hint }: { error?: unknown; hint?: unknown }): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
