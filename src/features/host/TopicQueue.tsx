import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronUp, GripVertical, ListOrdered, Pencil, Timer, Trash2, Vote } from 'lucide-react'
import { AnimatePresence, Reorder, useDragControls } from 'motion/react'
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Textarea } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/States'
import { describedBy } from '@/lib/a11y'
import { errorMessage } from '@/lib/utils'
import type { Topic } from '@/features/mingle/api'
import { useDeleteTopic, useReorderTopics, useUpdateTopic } from './api'
import { TimerChips } from './TimerChips'
import { timerLabel } from './timers'

export function TopicQueue({ eventId, queued, inVote }: { eventId: string; queued: Topic[]; inVote: Set<string> }) {
  const reorder = useReorderTopics(eventId)
  const remove = useDeleteTopic(eventId)
  const [editing, setEditing] = useState<Topic | null>(null)
  // Only set while a drag is in progress; otherwise the cache (updated optimistically) is the order.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)

  const serverOrder = queued.map((t) => t.id)
  const order = dragOrder ?? serverOrder
  const byId = new Map(queued.map((t) => [t.id, t]))
  const items = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))

  const save = (ids: string[]) => {
    if (ids.join() === serverOrder.join()) return
    reorder.mutate(ids, { onError: (error) => toast.error(errorMessage(error, "Couldn't save the new order.")) })
  }

  const move = (index: number, by: -1 | 1) => {
    const next = [...serverOrder]
    const [id] = next.splice(index, 1)
    next.splice(index + by, 0, id!)
    save(next)
  }

  const deleteTopic = (topic: Topic) =>
    remove.mutate(topic.id, {
      onSuccess: () => toast('Topic deleted', { description: topic.prompt }),
      onError: (error) => toast.error(errorMessage(error, "Couldn't delete that topic.")),
    })

  return (
    <section aria-labelledby="queue-heading" className="space-y-3">
      <h2 id="queue-heading" className="flex items-center gap-2 text-lg font-bold">
        Up next <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-xs font-semibold text-ink-muted">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<ListOrdered className="size-8" />} title="No topics lined up">
            <p>Add a topic below, or paste a whole list.</p>
          </EmptyState>
        </Card>
      ) : (
        <Reorder.Group axis="y" values={order} onReorder={setDragOrder} className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((topic, index) => (
              <QueueItem
                key={topic.id}
                topic={topic}
                index={index}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onDragStart={() => setDragOrder(serverOrder)}
                onDragEnd={() => {
                  save(order)
                  setDragOrder(null)
                }}
                onMove={(by) => move(index, by)}
                onEdit={() => setEditing(topic)}
                onDelete={() => deleteTopic(topic)}
                deleting={remove.isPending && remove.variables === topic.id}
                inVote={inVote.has(topic.id)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      <EditTopicDialog eventId={eventId} topic={editing} onClose={() => setEditing(null)} />
    </section>
  )
}

interface QueueItemProps {
  topic: Topic
  index: number
  isFirst: boolean
  isLast: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (by: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
  inVote: boolean
}

function QueueItem({ topic, index, isFirst, isLast, onDragStart, onDragEnd, onMove, onEdit, onDelete, deleting, inVote }: QueueItemProps) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={topic.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
      whileDrag={{ scale: 1.03, boxShadow: '0 20px 40px -12px rgb(0 0 0 / 0.7)', zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="relative list-none rounded-2xl border border-white/10 bg-night-800/90"
    >
      <div className="flex items-stretch gap-1 p-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
          className="grid w-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-ink-subtle hover:bg-white/5 active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1 py-2">
          <p className="text-xs font-semibold text-ink-subtle">
            #{index + 1}
            <span className="ml-2 inline-flex items-center gap-1">
              <Timer aria-hidden className="size-3" /> {timerLabel(topic.duration_seconds)}
            </span>
            {inVote && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-accent-soft">
                <Vote aria-hidden className="size-3" /> In the vote
              </span>
            )}
          </p>
          <p className="mt-0.5 break-words font-medium">{topic.prompt}</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-0.5 self-center">
          <IconButton label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>
            <ChevronUp className="size-5" />
          </IconButton>
          <IconButton label="Edit" onClick={onEdit}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Move down" disabled={isLast} onClick={() => onMove(1)}>
            <ChevronDown className="size-5" />
          </IconButton>
          <IconButton label={inVote ? 'In the vote, can’t delete' : 'Delete'} danger disabled={deleting || inVote} onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </Reorder.Item>
  )
}

function IconButton({
  label,
  children,
  danger,
  ...props
}: { label: string; children: ReactNode; danger?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid size-11 place-items-center rounded-xl text-ink-muted transition-[color,background-color,transform] hover:bg-white/5 active:scale-90 disabled:opacity-30 ${danger ? 'hover:text-danger' : 'hover:text-ink'}`}
      {...props}
    >
      <span aria-hidden>{children}</span>
    </button>
  )
}

const editSchema = z.object({
  prompt: z.string().trim().min(1, 'Write a prompt').max(300, 'Keep it under 300 characters'),
  duration_seconds: z.number().nullable(),
})
type EditValues = z.infer<typeof editSchema>

function EditTopicDialog({ eventId, topic, onClose }: { eventId: string; topic: Topic | null; onClose: () => void }) {
  return (
    <Dialog open={topic !== null} onClose={onClose} title="Edit topic">
      {topic && <EditTopicForm key={topic.id} eventId={eventId} topic={topic} onDone={onClose} />}
    </Dialog>
  )
}

function EditTopicForm({ eventId, topic, onDone }: { eventId: string; topic: Topic; onDone: () => void }) {
  const update = useUpdateTopic(eventId)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { prompt: topic.prompt, duration_seconds: topic.duration_seconds },
  })

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        update.mutate(
          { id: topic.id, ...values },
          {
            onSuccess: () => {
              toast.success('Topic saved')
              onDone()
            },
            onError: (error) => toast.error(errorMessage(error, "Couldn't save that.")),
          },
        ),
      )}
    >
      <Field id="edit-prompt" label="Prompt" error={errors.prompt?.message}>
        <Textarea
          id="edit-prompt"
          rows={4}
          aria-invalid={!!errors.prompt}
          aria-describedby={describedBy('edit-prompt', { error: errors.prompt })}
          {...register('prompt')}
        />
      </Field>
      <Controller
        control={control}
        name="duration_seconds"
        render={({ field }) => <TimerChips value={field.value} onChange={field.onChange} />}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save
        </Button>
      </div>
    </form>
  )
}
