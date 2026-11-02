import { Outlet } from 'react-router'
import { ErrorState, FullPageSpinner } from '@/components/ui/States'
import { errorMessage } from '@/lib/utils'
import { NotFoundPage } from '@/app/NotFoundPage'
import { useIsAdmin } from './api'

export function RequireAdmin() {
  const isAdmin = useIsAdmin()
  if (isAdmin.isPending) return <FullPageSpinner label="Checking access" />
  if (isAdmin.isError) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState message={errorMessage(isAdmin.error, "We couldn't check your access.")} onRetry={() => isAdmin.refetch()} />
      </div>
    )
  }
  if (!isAdmin.data) return <NotFoundPage />
  return <Outlet />
}
