import { House, ListMusic, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/utils'
import { useProfile } from '@/features/profile/api'

const tabs = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/admin', label: 'Queue', icon: ListMusic, end: true },
  { to: '/admin/contacts', label: 'Contacts', icon: Users, end: false },
]

export function AdminLayout() {
  const { data: profile } = useProfile()

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-night-900/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
          <Logo compact />
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-gold-soft">Admin</span>
          <nav aria-label="Admin" className="ml-auto flex gap-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors',
                    isActive ? 'bg-white/10 text-ink' : 'text-ink-muted hover:text-ink',
                  )
                }
              >
                <Icon aria-hidden className="size-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
              </NavLink>
            ))}
          </nav>
          <NavLink
            to="/profile"
            aria-label="Your profile"
            className="grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-white/10 hover:ring-flame/60"
          >
            <Avatar src={profile?.avatar_url} name={profile?.full_name} className="size-9 text-sm" />
          </NavLink>
        </div>
      </header>
      <Outlet />
    </>
  )
}
