import { Camera } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { errorMessage } from '@/lib/utils'
import { useUploadAvatar } from './api'

export function AvatarUpload({ src, name }: { src: string | null; name: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={src} name={name} className="size-20 text-2xl ring-2 ring-pink/50 ring-offset-2 ring-offset-night-800" />
        {upload.isPending && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-night-950/70">
            <Spinner className="text-ink" label="Uploading photo" />
          </span>
        )}
      </div>
      <div className="space-y-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-ink hover:border-cyan/60 disabled:opacity-50"
        >
          <Camera aria-hidden className="size-4" />
          {src ? 'Change photo' : 'Add a photo'}
        </motion.button>
        <p className="text-xs text-ink-subtle">Optional · JPG, PNG or WebP</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload profile photo"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          upload.mutate(file, {
            onSuccess: () => toast.success('Looking good! Photo updated.'),
            onError: (error) => toast.error(errorMessage(error, "Couldn't upload that photo.")),
          })
        }}
      />
    </div>
  )
}
