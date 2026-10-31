import { MicOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/ui/States'

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <EmptyState icon={<MicOff className="size-8" />} title="Wrong stage">
        <p>This page doesn't exist.</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-cyan-soft underline-offset-4 hover:underline">
          Back to the queue
        </Link>
      </EmptyState>
    </main>
  )
}
