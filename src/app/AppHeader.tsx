import { LayoutDashboard } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from '@/components/ui/Logo'
import { useIsAdmin } from '@/features/admin/api'
import { useProfile } from '@/features/profile/api'

export function AppHeader() {
  const { data: profile } = useProfile()
  const { data: isAdmin } = useIsAdmin()

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-night-900/70 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Logo />
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-cyan-soft hover:bg-white/5"
            >
              <LayoutDashboard aria-hidden className="size-4" /> <span className="max-[399px]:sr-only">Admin</span>
            </Link>
          )}
          <motion.div whileTap={{ scale: 0.92 }}>
            <Link
              to="/profile"
              aria-label="Your profile"
              className="grid size-11 place-items-center rounded-full ring-1 ring-white/10 hover:ring-pink/60"
            >
              <Avatar src={profile?.avatar_url} name={profile?.full_name} className="size-9 text-sm" />
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  )
}
