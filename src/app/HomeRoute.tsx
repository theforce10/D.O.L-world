import { FullPageSpinner } from '@/components/ui/States'
import { useAuth } from '@/features/auth/AuthProvider'
import { RequireProfile } from '@/features/auth/guards'
import { HomePage } from '@/features/queue/HomePage'
import { LandingPage } from '@/features/queue/LandingPage'

/** "/" is the landing page for visitors and the song picker for signed-in attendees. */
export function HomeRoute() {
  const { session, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!session) return <LandingPage />
  return (
    <RequireProfile>
      <HomePage />
    </RequireProfile>
  )
}
