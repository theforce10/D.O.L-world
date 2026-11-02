import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js/max'

const DEFAULT_COUNTRY = 'NG'

function parse(input: string): PhoneNumber | undefined {
  let value = input.trim()
  if (!value) return undefined
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  const digits = value.replace(/\D/g, '')
  if (!value.startsWith('+') && digits.startsWith('234') && digits.length === 13) value = `+${digits}`
  return parsePhoneNumberFromString(value, DEFAULT_COUNTRY)
}

export function toE164(input: string): string | null {
  const phone = parse(input)
  return phone?.isValid() ? phone.number : null
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164
}
