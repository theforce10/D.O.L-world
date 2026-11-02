import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, LogOut, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AppHeader } from '@/app/AppHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { errorMessage } from '@/lib/utils'
import { signOut } from '@/features/auth/api'
import { rise, stagger } from '@/lib/motion'
import { LegalLinks } from '@/features/legal/LegalLinks'
import { useProfile, useUpdateProfile } from './api'
import { AvatarUpload } from './AvatarUpload'
import { MySongs } from './MySongs'
import { ProfileForm } from './ProfileForm'

export function ProfilePage() {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const logout = useMutation({
    mutationFn: async () => {
      await navigate('/', { replace: true })
      await signOut()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (!profile) return null

  return (
    <>
      <AppHeader />
      <motion.main variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-16 pt-4">
        <motion.div variants={rise}>
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-ink-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-5" /> Back to the queue
          </Link>
        </motion.div>

        <motion.section variants={rise} aria-labelledby="profile-heading">
          <Card className="space-y-6">
            <div className="space-y-4">
              <h1 id="profile-heading" className="text-2xl font-bold">
                Your profile
              </h1>
              <AvatarUpload src={profile.avatar_url} name={profile.full_name} />
              {profile.email && (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Mail aria-hidden className="size-4" /> {profile.email}
                </p>
              )}
            </div>
            <ProfileForm
              key={profile.updated_at}
              profile={profile}
              mode="edit"
              submitting={update.isPending}
              onSubmit={(values) =>
                update.mutate(values, {
                  onSuccess: () => toast.success('Profile saved'),
                  onError: (error) => toast.error(errorMessage(error, "Couldn't save your profile.")),
                })
              }
            />
          </Card>
        </motion.section>

        <motion.section variants={rise} aria-labelledby="songs-heading">
          <Card className="space-y-4">
            <h2 id="songs-heading" className="text-xl font-bold">
              My songs
            </h2>
            <MySongs />
          </Card>
        </motion.section>

        <motion.div variants={rise}>
          <Button variant="danger" fullWidth loading={logout.isPending} onClick={() => logout.mutate()}>
            <LogOut aria-hidden className="size-5" /> Log out
          </Button>
        </motion.div>
        <LegalLinks />
      </motion.main>
    </>
  )
}
