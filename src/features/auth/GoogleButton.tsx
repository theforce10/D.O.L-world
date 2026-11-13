import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { authErrorMessage, signInWithGoogle } from './api'

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  )
}

export function GoogleButton({ next, variant = 'secondary' }: { next: string; variant?: 'primary' | 'secondary' }) {
  const google = useMutation({
    mutationFn: () => signInWithGoogle(next),
    onError: (error) => toast.error(authErrorMessage(error)),
  })

  return (
    <Button variant={variant} size="lg" fullWidth loading={google.isPending || google.isSuccess} onClick={() => google.mutate()}>
      {!(google.isPending || google.isSuccess) &&
        (variant === 'primary' ? (
          <span className="grid size-7 place-items-center rounded-full bg-white">
            <GoogleMark />
          </span>
        ) : (
          <GoogleMark />
        ))}
      Continue with Google
    </Button>
  )
}
