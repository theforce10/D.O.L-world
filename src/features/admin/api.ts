import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, EventType, RequestStatus } from '@/lib/types'
import { useAuth } from '@/features/auth/AuthProvider'

export const adminKeys = {
  isAdmin: (userId: string | undefined) => ['admin', 'is-admin', userId] as const,
  events: ['admin', 'events'] as const,
  queue: (eventId: string | undefined) => ['admin', 'queue', eventId] as const,
  contacts: ['admin', 'contacts'] as const,
  stats: (eventId: string | undefined) => ['admin', 'event-stats', eventId] as const,
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
        .select('id, name, venue, event_date, type, ended_at, is_active, last_queue_number, current_number, created_at')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type AdminEvent = NonNullable<ReturnType<typeof useEvents>['data']>[number]

export interface EventInput {
  type: EventType
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
          type: input.type,
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

export function useEventStats(eventId: string | undefined) {
  return useQuery({
    queryKey: adminKeys.stats(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('event_stats', { p_event_id: eventId! })
      if (error) throw error
      return data[0] ?? { check_ins: 0, voters: 0, participation: 0, questions: 0, polls: 0, matches: 0 }
    },
  })
}

export function useAdminReports() {
  return useQuery({
    queryKey: ['admin', 'reports'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_reports')
      if (error) throw error
      return data.map((r) => ({
        ...r,
        details: r.details as string | null,
        resolved_at: r.resolved_at as string | null,
        event_name: r.event_name as string | null,
        reporter_name: r.reporter_name as string | null,
        reporter_email: r.reporter_email as string | null,
        reported_name: r.reported_name as string | null,
        reported_email: r.reported_email as string | null,
      }))
    },
  })
}

export type AdminReport = NonNullable<ReturnType<typeof useAdminReports>['data']>[number]

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.rpc('resolve_report', { p_report_id: id, p_resolved: resolved })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })
}

/** Mix & Mingle: closes check-in, topics and polls, and opens Connect for 72 hours. */
export function useEndEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('end_event', { p_event_id: eventId })
      if (error) throw error
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.events })
      void queryClient.invalidateQueries({ queryKey: ['events', 'active'] })
      void queryClient.invalidateQueries({ queryKey: ['host'] })
      void queryClient.invalidateQueries({ queryKey: ['mingle'] })
    },
  })
}
