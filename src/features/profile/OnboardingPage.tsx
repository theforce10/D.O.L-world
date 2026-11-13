import { motion } from 'motion/react'
import { Navigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ErrorState, FullPageSpinner } from '@/components/ui/States'
import { BRAND } from '@/lib/brand'
import { safeNext } from '@/lib/navigation'
import { errorMessage } from '@/lib/utils'
import { rise } from '@/lib/motion'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { isProfileComplete, useProfile, useUpdateProfile } from './api'
import { AvatarUpload } from './AvatarUpload'
import { ProfileForm } from './ProfileForm'

export function OnboardingPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const askConsent = params.get('consent') !== 'later'
  const profile = useProfile()
  const update = useUpdateProfile()

  if (profile.isPending) return <FullPageSpinner label="Loading your profile" />
  if (profile.isError) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState message={errorMessage(profile.error)} onRetry={() => profile.refetch()} />
      </div>
    )
  }
  if (isProfileComplete(profile.data)) return <Navigate to={next} replace />

  const firstName = profile.data.full_name?.split(' ')[0]

  return (
    <AuthLayout
      title={firstName ? `Nice to meet you, ${firstName}!` : 'Nice to meet you!'}
      subtitle={`A few details so ${BRAND} knows who's here.`}
    >
      <motion.div variants={rise}>
        <AvatarUpload src={profile.data.avatar_url} name={profile.data.full_name} />
      </motion.div>
      <ProfileForm
        profile={profile.data}
        mode="onboarding"
        askConsent={askConsent}
        submitting={update.isPending}
        onSubmit={(values) =>
          update.mutate(values, {
            onSuccess: () => toast.success(`You're in! Welcome to ${BRAND} 🎉`),
            onError: (error) => toast.error(errorMessage(error, "Couldn't save your profile.")),
          })
        }
      />
    </AuthLayout>
  )
}
