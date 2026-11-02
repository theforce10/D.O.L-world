import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
}

export function Dialog({ open, onClose, ...rest }: DialogProps) {
  return createPortal(<AnimatePresence>{open && <DialogPanel onClose={onClose} {...rest} />}</AnimatePresence>, document.body)
}

function DialogPanel({ onClose, title, description, children }: Omit<DialogProps, 'open'>) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    ;(first ?? panelRef.current)?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night-950/80 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-night-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card focus:outline-none sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <button
          type="button"
          data-close
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
        <h2 id={titleId} className="pr-10 text-xl font-bold">
          {title}
        </h2>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
        <div className="mt-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}
