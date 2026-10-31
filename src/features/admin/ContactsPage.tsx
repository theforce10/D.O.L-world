import { AtSign, Download, Mail, Phone, Search, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { BRAND } from '@/lib/brand'
import { downloadCsv, slugify, toCsv, type CsvColumn } from '@/lib/csv'
import { formatPhone } from '@/lib/phone'
import type { Contact } from '@/lib/types'
import { cn, errorMessage } from '@/lib/utils'
import { useContacts } from './api'

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const csvColumns: CsvColumn<Contact>[] = [
  { header: 'Name', value: (c) => c.full_name },
  { header: 'Email', value: (c) => c.email },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Snapchat', value: (c) => c.snapchat },
  { header: 'Marketing consent', value: (c) => (c.marketing_consent ? 'yes' : 'no') },
  { header: 'Consent given at', value: (c) => c.consent_at },
  { header: 'Events attended', value: (c) => c.events_attended },
  { header: 'Songs', value: (c) => c.total_songs },
  { header: 'Last song at', value: (c) => c.last_song_at },
  { header: 'Joined', value: (c) => c.joined_at },
]

function matches(c: Contact, q: string): boolean {
  if (!q) return true
  return [c.full_name, c.email, c.phone, c.snapchat].some((v) => v?.toLowerCase().includes(q))
}

function ConsentBadge({ consent }: { consent: boolean }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
        consent ? 'bg-lime/15 text-lime' : 'bg-white/10 text-ink-subtle',
      )}
    >
      {consent ? 'Opted in' : 'No consent'}
    </span>
  )
}

const contactLink = 'inline-flex min-h-8 items-center gap-1.5 text-ink-muted hover:text-cyan-soft'

function ContactLinks({ c, className }: { c: Contact; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-0.5 text-sm', className)}>
      {c.phone && (
        <a href={`tel:${c.phone}`} className={contactLink}>
          <Phone aria-hidden className="size-3.5" /> {formatPhone(c.phone)}
        </a>
      )}
      {c.snapchat && (
        <a href={`https://www.snapchat.com/add/${c.snapchat}`} target="_blank" rel="noreferrer" className={contactLink}>
          <AtSign aria-hidden className="size-3.5" /> {c.snapchat}
        </a>
      )}
      {c.email && (
        <a href={`mailto:${c.email}`} className={cn(contactLink, 'min-w-0 max-w-full')}>
          <Mail aria-hidden className="size-3.5 shrink-0" /> <span className="truncate">{c.email}</span>
        </a>
      )}
    </div>
  )
}

export function ContactsPage() {
  const contacts = useContacts()
  const [search, setSearch] = useState('')
  const [consentOnly, setConsentOnly] = useState(true)
  const query = useDeferredValue(search.trim().toLowerCase())

  const all = useMemo(() => contacts.data ?? [], [contacts.data])
  const consented = useMemo(() => all.filter((c) => c.marketing_consent).length, [all])
  const visible = useMemo(() => all.filter((c) => (!consentOnly || c.marketing_consent) && matches(c, query)), [all, consentOnly, query])

  const exportCsv = () => {
    downloadCsv(`${slugify(BRAND)}-contacts${consentOnly ? '-opted-in' : ''}.csv`, toCsv(visible, csvColumns))
    toast.success(`Exported ${visible.length} ${visible.length === 1 ? 'contact' : 'contacts'}`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Contacts</h1>
          {contacts.data && (
            <p className="text-ink-muted">
              {all.length} {all.length === 1 ? 'person' : 'people'} · {consented} opted in to updates
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor="contact-search" className="sr-only">
            Search contacts
          </label>
          <Input
            id="contact-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="size-5" />}
            placeholder="Search name, email, phone, Snapchat…"
            className="min-h-11 py-2 sm:text-sm"
          />
        </div>
        <Checkbox
          id="consent-only"
          label="Opted in only"
          checked={consentOnly}
          onChange={(e) => setConsentOnly(e.target.checked)}
          className="items-center py-2.5 sm:shrink-0"
        />
        <Button variant="secondary" size="sm" disabled={visible.length === 0} onClick={exportCsv}>
          <Download aria-hidden className="size-4" /> Export CSV
        </Button>
      </div>
      <p className="text-sm text-ink-subtle">Only message people marked “Opted in”. Everyone else gave their details just for the queue.</p>

      {contacts.isPending ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : contacts.isError ? (
        <ErrorState message={errorMessage(contacts.error, "Couldn't load contacts.")} onRetry={() => contacts.refetch()} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="size-8" />} title={all.length === 0 ? 'No one has signed up yet' : 'Nothing matches'}>
            {all.length > 0 && <p>Try a different search{consentOnly ? ' or untick “Opted in only”' : ''}.</p>}
          </EmptyState>
        </Card>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {visible.map((c, i) => (
              <motion.li
                key={c.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
              >
                <Card className="space-y-2.5 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Avatar src={c.avatar_url} name={c.full_name} className="size-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{c.full_name ?? 'No name'}</p>
                      <p className="text-xs text-ink-subtle">
                        {c.total_songs} {c.total_songs === 1 ? 'song' : 'songs'} · {c.events_attended}{' '}
                        {c.events_attended === 1 ? 'event' : 'events'}
                      </p>
                    </div>
                    <ConsentBadge consent={c.marketing_consent} />
                  </div>
                  <ContactLinks c={c} />
                </Card>
              </motion.li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-night-800/70 shadow-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Contact
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Events
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Songs
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Consent
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.user_id} className="border-b border-white/5 align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={c.avatar_url} name={c.full_name} className="size-8 text-xs" />
                        <span className="font-semibold">{c.full_name ?? 'No name'}</span>
                      </div>
                    </td>
                    <td className="max-w-80 px-4 py-3">
                      <ContactLinks c={c} className="flex-col" />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.events_attended}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.total_songs}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{dateFormat.format(new Date(c.joined_at))}</td>
                    <td className="px-4 py-3">
                      <ConsentBadge consent={c.marketing_consent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
