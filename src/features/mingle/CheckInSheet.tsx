import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog } from '@/components/ui/Dialog'
import { Toggle } from '@/components/ui/Toggle'
import { BRAND } from '@/lib/brand'

const checkInSchema = z.object({
  discoverable: z.boolean(),
  marketingConsent: z.boolean(),
})
type CheckInValues = z.infer<typeof checkInSchema>

interface CheckInSheetProps {
  open: boolean
  onClose: () => void
  eventName: string
  askConsent: boolean
  submitting: boolean
  onSubmit: (values: { discoverable: boolean; marketingConsent: boolean }) => void
}

export function CheckInSheet({ open, onClose, eventName, askConsent, submitting, onSubmit }: CheckInSheetProps) {
  const { register, control, handleSubmit } = useForm<CheckInValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: { discoverable: false, marketingConsent: false },
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Join ${eventName}`}
      description="One tap and you can vote, ask the host anything, and connect after."
    >
      <form
        noValidate
        onSubmit={handleSubmit(({ discoverable, marketingConsent }) =>
          onSubmit({ discoverable, marketingConsent: askConsent && marketingConsent }),
        )}
        className="space-y-3"
      >
        <Controller
          control={control}
          name="discoverable"
          render={({ field }) => (
            <Toggle
              id="check-in-discoverable"
              checked={field.value}
              onChange={field.onChange}
              label="Let people I meet tonight find me in Connect"
              description="Only your first name and photo. You can change this later."
            />
          )}
        />
        {askConsent && (
          <Checkbox id="check-in-consent" label={`Keep me posted on future ${BRAND} events`} {...register('marketingConsent')} />
        )}
        <div className="pt-2">
          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Join tonight
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
