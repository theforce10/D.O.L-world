// "max" metadata validates real number ranges per country, not just length.
import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js/max'

const DEFAULT_COUNTRY = 'NG'

function parse(input: string): PhoneNumber | undefined {
  let value = input.trim()
  if (!value) return undefined
  // "00…" international prefix → "+…"
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  // "2348012345678" (country code without "+")
  const digits = value.replace(/\D/g, '')
  if (!value.startsWith('+') && digits.startsWith('234') && digits.length === 13) value = `+${digits}`
  return parsePhoneNumberFromString(value, DEFAULT_COUNTRY)
}

/**
 * Accepts Nigerian local formats (0801 234 5678, 801 234 5678, 2348012345678)
 * and any international number with a "+" prefix. Returns E.164 or null.
 */
export function toE164(input: string): string | null {
  const phone = parse(input)
  return phone?.isValid() ? phone.number : null
}

/** Human-friendly display of a stored E.164 number, e.g. "+234 801 234 5678". */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}
