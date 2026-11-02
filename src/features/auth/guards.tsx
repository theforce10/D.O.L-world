import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorState, FullPageSpinner } from '@/components/ui/States'
import { safeNext } from '@/lib/navigation'
import { errorMessage } from '@/lib/utils'
import { isProfileComplete, useProfile } from '@/features/profile/api'
import { useAuth } from './AuthProvider'

function useCurrentPath() {
  const location = useLocation()
  const [entry] = useState(location)
  return { entry, here: entry.pathname + entry.search, leaving: entry.pathname !== location.pathname }
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()
  const { here, leaving } = useCurrentPath()
  if (loading) return <FullPageSpinner />
  if (!session) return leaving ? null : <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />
  return children ?? <Outlet />
}

export function RequireProfile({ children }: { children?: ReactNode }) {
  const profile = useProfile()
  const { here, leaving } = useCurrentPath()
  if (profile.isPending) return <FullPageSpinner label="Loading your profile" />
  if (profile.isError) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState message={errorMessage(profile.error, "We couldn't load your profile.")} onRetry={() => profile.refetch()} />
      </div>
    )
  }
  if (!isProfileComplete(profile.data)) return leaving ? null : <Navigate to={`/onboarding?next=${encodeURIComponent(here)}`} replace />
  return children ?? <Outlet />
}

export function GuestOnly() {
  const { session, loading } = useAuth()
  const { entry, leaving } = useCurrentPath()
  if (loading) return <FullPageSpinner />
  if (session) return leaving ? null : <Navigate to={safeNext(new URLSearchParams(entry.search).get('next'))} replace />
  return <Outlet />
}
