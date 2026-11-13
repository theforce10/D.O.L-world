import { CalendarDays, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

interface EventHeadingProps {
  name: string
  venue: string | null
  eventDate: string | null
  eyebrow?: ReactNode
}

export function EventHeading({ name, venue, eventDate, eyebrow }: EventHeadingProps) {
  return (
    <>
      {eyebrow}
      <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold sm:text-3xl">
        {name}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wider text-accent-soft">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </h1>
      {(venue || eventDate) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          {venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4" /> {venue}
            </span>
          )}
          {eventDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden className="size-4" /> {dateFormat.format(new Date(`${eventDate}T00:00:00`))}
            </span>
          )}
        </p>
      )}
    </>
  )
}
