import { FullPageSpinner } from '@/components/ui/States'
import { useAuth } from '@/features/auth/AuthProvider'
import { RequireProfile } from '@/features/auth/guards'
import { MingleHome } from '@/features/mingle/MingleHome'
import { useActiveEvent } from '@/features/queue/api'
import { HomePage } from '@/features/queue/HomePage'
import { LandingPage } from '@/features/queue/LandingPage'

export function HomeRoute() {
  const { session, loading } = useAuth()
  const event = useActiveEvent()
  if (loading || event.isPending) return <FullPageSpinner />
  if (event.data?.type === 'mix_mingle') return <MingleHome key={event.data.id} event={event.data} />
  if (!session) return <LandingPage live={event.data?.type === 'karaoke'} />
  return (
    <RequireProfile>
      <HomePage />
    </RequireProfile>
  )
}
