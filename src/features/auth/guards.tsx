import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { ErrorState, FullPageSpinner } from '@/components/ui/States'
import { safeNext } from '@/lib/navigation'
import { errorMessage } from '@/lib/utils'
import { isProfileComplete, useProfile } from '@/features/profile/api'
import { useAuth } from './AuthProvider'


function useCurrentPath() {
  const location = useLocation()
  const [path] = useState(location.pathname + location.search)
  return path
}

/** Signed-in users only; everyone else goes to /login and comes back afterwards. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()
  const here = useCurrentPath()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />
  return children ?? <Outlet />
}

/** Signed-in users with a finished profile only; otherwise forced through /onboarding first. */
export function RequireProfile({ children }: { children?: ReactNode }) {
  const profile = useProfile()
  const here = useCurrentPath()
  if (profile.isPending) return <FullPageSpinner label="Loading your profile" />
  if (profile.isError) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState message={errorMessage(profile.error, "We couldn't load your profile.")} onRetry={() => profile.refetch()} />
      </div>
    )
  }
  if (!isProfileComplete(profile.data)) return <Navigate to={`/onboarding?next=${encodeURIComponent(here)}`} replace />
  return children ?? <Outlet />
}

/** Login/sign-up pages: bounce signed-in users to where they were going. */
export function GuestOnly() {
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to={safeNext(params.get('next'))} replace />
  return <Outlet />
}
