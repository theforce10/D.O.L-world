import { FullPageSpinner } from '@/components/ui/States'
import { useAuth } from '@/features/auth/AuthProvider'
import { RequireProfile } from '@/features/auth/guards'
import { HomePage } from '@/features/queue/HomePage'
import { LandingPage } from '@/features/queue/LandingPage'

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
