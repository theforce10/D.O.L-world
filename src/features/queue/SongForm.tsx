import { zodResolver } from '@hookform/resolvers/zod'
import { Disc3, MessageSquareText, Mic2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { rise, stagger } from '@/lib/motion'
import type { SongInput } from './api'

const songSchema = z.object({
  song_title: z.string().trim().min(1, 'Which song are you singing?').max(150, 'Keep it under 150 characters'),
  artist: z.string().trim().min(1, 'Who sings it originally?').max(150, 'Keep it under 150 characters'),
  note: z.string().trim().max(300, 'Keep notes under 300 characters'),
})
type SongValues = z.infer<typeof songSchema>

export function SongForm({ submitting, onSubmit }: { submitting: boolean; onSubmit: (values: SongInput) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SongValues>({ resolver: zodResolver(songSchema), defaultValues: { song_title: '', artist: '', note: '' } })

  return (
    <Card className="relative overflow-hidden">
      {/* Slow-spinning record in the corner for a bit of stage flavour. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 text-night-600"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        <Disc3 className="size-40" strokeWidth={1} />
      </motion.div>

      <motion.form variants={stagger} initial="hidden" animate="show" noValidate onSubmit={handleSubmit(onSubmit)} className="relative space-y-5">
        <motion.div variants={rise} className="space-y-1">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Pick your <span className="text-gradient">song</span>
          </h2>
          <p className="text-ink-muted">Your number is locked in the moment you submit.</p>
        </motion.div>

        <motion.div variants={rise}>
          <Field id="song_title" label="Song title" error={errors.song_title?.message}>
            <Input
              id="song_title"
              autoComplete="off"
              icon={<Mic2 className="size-5" />}
              placeholder="e.g. Essence"
              aria-invalid={!!errors.song_title}
              aria-describedby={describedBy('song_title', { error: errors.song_title })}
              {...register('song_title')}
            />
          </Field>
        </motion.div>

        <motion.div variants={rise}>
          <Field id="artist" label="Artist" error={errors.artist?.message}>
            <Input
              id="artist"
              autoComplete="off"
              icon={<Sparkles className="size-5" />}
              placeholder="e.g. Wizkid ft. Tems"
              aria-invalid={!!errors.artist}
              aria-describedby={describedBy('artist', { error: errors.artist })}
              {...register('artist')}
            />
          </Field>
        </motion.div>

        <motion.div variants={rise}>
          <Field id="note" label="Note for the host" optional hint="Duet partner, key change, shout-out…" error={errors.note?.message}>
            <div className="relative">
              <MessageSquareText aria-hidden className="pointer-events-none absolute left-4 top-3.5 size-5 text-ink-subtle" />
              <Textarea
                id="note"
                rows={2}
                className="pl-11"
                aria-invalid={!!errors.note}
                aria-describedby={describedBy('note', { error: errors.note, hint: true })}
                {...register('note')}
              />
            </div>
          </Field>
        </motion.div>

        {/* Sticky on phones so the button is always within thumb reach. */}
        <motion.div
          variants={rise}
          className="sticky bottom-0 -mx-5 bg-gradient-to-t from-night-800 via-night-800/95 to-transparent px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:static sm:mx-0 sm:bg-none sm:p-0"
        >
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? 'Getting your number…' : 'Get my number 🎤'}
          </Button>
        </motion.div>
      </motion.form>
    </Card>
  )
}
