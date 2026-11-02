import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, RequestStatus } from '@/lib/types'
import { useAuth } from '@/features/auth/AuthProvider'

export const adminKeys = {
  isAdmin: (userId: string | undefined) => ['admin', 'is-admin', userId] as const,
  events: ['admin', 'events'] as const,
  queue: (eventId: string | undefined) => ['admin', 'queue', eventId] as const,
  contacts: ['admin', 'contacts'] as const,
}

const FALLBACK_POLL_MS = 30_000

export function useIsAdmin() {
  const { user } = useAuth()
  return useQuery({
    queryKey: adminKeys.isAdmin(user?.id),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_admin')
      if (error) throw error
      return data
    },
  })
}

export function useEvents() {
  return useQuery({
    queryKey: adminKeys.events,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, venue, event_date, is_active, last_queue_number, current_number, created_at')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type AdminEvent = NonNullable<ReturnType<typeof useEvents>['data']>[number]

export interface EventInput {
  name: string
  venue?: string
  event_date?: string
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, goLive }: { input: EventInput; goLive: boolean }) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: input.name,
          venue: input.venue || null,
          event_date: input.event_date || null,
        })
        .select('id')
        .single()
      if (error) throw error
      if (goLive) {
        const live = await supabase.rpc('set_active_event', { p_event_id: data.id })
        if (live.error) throw live.error
      }
      return data.id
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.events }),
  })
}

export function useSetActiveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string | null) => {
      const { error } = await supabase.rpc('set_active_event', { p_event_id: eventId as string })
      if (error) throw error
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.events })
      void queryClient.invalidateQueries({ queryKey: ['events', 'active'] })
    },
  })
}

const QUEUE_SELECT =
  'id, queue_number, song_title, artist, note, status, created_at, updated_at, user_id, profile:profiles(full_name, email, phone, avatar_url)'

export function useEventQueue(eventId: string | undefined) {
  return useQuery({
    queryKey: adminKeys.queue(eventId),
    enabled: Boolean(eventId),
    refetchInterval: FALLBACK_POLL_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_requests')
        .select(QUEUE_SELECT)
        .eq('event_id', eventId!)
        .order('queue_number', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export type QueueEntry = NonNullable<ReturnType<typeof useEventQueue>['data']>[number]

export function useUpdateStatus(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const key = adminKeys.queue(eventId)
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequestStatus }) => {
      const { error } = await supabase.from('song_requests').update({ status }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<QueueEntry[]>(key)
      queryClient.setQueryData<QueueEntry[]>(key, (rows) => rows?.map((r) => (r.id === id ? { ...r, status } : r)))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: adminKeys.events })
    },
  })
}

export function useCallNext(eventId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('call_next', { p_event_id: eventId! })
      if (error) throw error
      return data as number | null
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.queue(eventId) })
      void queryClient.invalidateQueries({ queryKey: adminKeys.events })
    },
  })
}

export function useContacts() {
  return useQuery({
    queryKey: adminKeys.contacts,
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.rpc('admin_contacts')
      if (error) throw error
      return data as Contact[]
    },
  })
}
