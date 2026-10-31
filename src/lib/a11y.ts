/** aria-describedby for a control rendered inside <Field id={id}>: points at the error, else the hint. */
export function describedBy(id: string, { error, hint }: { error?: unknown; hint?: unknown }): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
