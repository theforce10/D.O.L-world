import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { QueueStatus } from '@/lib/types'
import { useAuth } from '@/features/auth/AuthProvider'
import { profileKeys } from '@/features/profile/api'

export const queueKeys = {
  activeEvent: ['events', 'active'] as const,
  status: (eventId: string | undefined) => ['queue', 'status', eventId] as const,
  mine: (eventId: string | undefined, userId: string | undefined) => ['queue', 'mine', eventId, userId] as const,
}

// Realtime is the main update channel; polling is a safety net for phones that
// drop the websocket when the screen locks.
const FALLBACK_POLL_MS = 30_000

export function useActiveEvent() {
  return useQuery({
    queryKey: queueKeys.activeEvent,
    refetchInterval: FALLBACK_POLL_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, venue, event_date, current_number')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Now singing / my number / how many ahead. Numbers and counts only (see get_queue_status). */
export function useQueueStatus(eventId: string | undefined) {
  return useQuery({
    queryKey: queueKeys.status(eventId),
    enabled: Boolean(eventId),
    refetchInterval: FALLBACK_POLL_MS,
    queryFn: async (): Promise<QueueStatus | null> => {
      const { data, error } = await supabase.rpc('get_queue_status', { p_event_id: eventId! })
      if (error) throw error
      return (data[0] as QueueStatus | undefined) ?? null
    },
  })
}

/** The signed-in user's song for this event that's still in play (waiting / up next / on stage). */
export function useMyActiveRequest(eventId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: queueKeys.mine(eventId, user?.id),
    enabled: Boolean(eventId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('song_requests')
        .select('id, song_title, artist, note, queue_number, status, created_at')
        .eq('event_id', eventId!)
        .eq('user_id', user!.id)
        .in('status', ['waiting', 'up_next', 'singing'])
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

type SongRequestInsert = Database['public']['Tables']['song_requests']['Insert']

/**
 * The only columns clients are granted INSERT on. user_id, queue_number and status
 * are required by the generated Insert type but are always set by the
 * assign_queue_number() trigger, so the client must not (and cannot) send them.
 */
type ClientSongInsert = Pick<SongRequestInsert, 'event_id' | 'song_title' | 'artist' | 'note'>

export interface SongInput {
  song_title: string
  artist: string
  note?: string
}

export function useSubmitSong(eventId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SongInput) => {
      // Only these four columns are insertable; the database assigns queue_number,
      // status and user_id in a BEFORE INSERT trigger.
      const { data, error } = await supabase
        .from('song_requests')
        .insert({
          event_id: eventId!,
          song_title: input.song_title,
          artist: input.artist,
          note: input.note || null,
        } satisfies ClientSongInsert as SongRequestInsert)
        .select('id, song_title, artist, note, queue_number, status, created_at')
        .single()
      if (error) {
        if (error.code === '23505') throw new Error('You already have a song in the queue for this event.')
        throw error
      }
      return data
    },
    onSuccess: (request) => {
      queryClient.setQueryData(queueKeys.mine(eventId, user?.id), request)
      void queryClient.invalidateQueries({ queryKey: queueKeys.status(eventId) })
      void queryClient.invalidateQueries({ queryKey: profileKeys.songs(user?.id) })
    },
  })
}
