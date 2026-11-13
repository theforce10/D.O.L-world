import { zodResolver } from '@hookform/resolvers/zod'
import { AtSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { describedBy } from '@/lib/a11y'
import { errorMessage } from '@/lib/utils'
import { snapchatField } from '@/features/profile/schemas'
import { useSaveSnapchat } from './api'

const schema = z.object({ snapchat: snapchatField.refine((v) => v !== '', 'Enter your Snapchat username') })
type Values = z.input<typeof schema>

export function SnapchatPrompt({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const save = useSaveSnapchat()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { snapchat: '' } })

  return (
    <Dialog open={open} onClose={onClose} title="Add your Snapchat" description="So people you match with can find you.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(({ snapchat }) =>
          save.mutate(snapchat, {
            onSuccess: () => {
              toast.success('Snapchat saved')
              onSaved()
            },
            onError: (error) => toast.error(errorMessage(error, "Couldn't save that.")),
          }),
        )}
      >
        <Field id="connect-snapchat" label="Snapchat username" error={errors.snapchat?.message} hint="Only your matches will ever see it.">
          <Input
            id="connect-snapchat"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            icon={<AtSign className="size-5" />}
            placeholder="yourname"
            aria-invalid={!!errors.snapchat}
            aria-describedby={describedBy('connect-snapchat', { error: errors.snapchat, hint: true })}
            {...register('snapchat')}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={save.isPending}>
          Save and connect
        </Button>
      </form>
    </Dialog>
  )
}
