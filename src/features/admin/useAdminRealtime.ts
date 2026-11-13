import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { SongRequest } from '@/lib/types'
import { adminKeys } from './api'

export function useAdminRealtime(eventId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!eventId) return

    const refreshQueue = () => void queryClient.invalidateQueries({ queryKey: adminKeys.queue(eventId) })
    const refreshEvents = () => void queryClient.invalidateQueries({ queryKey: adminKeys.events })

    const channel = supabase
      .channel(`admin:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'song_requests',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as SongRequest
          toast(`🎶 New song: #${row.queue_number}`, {
            description: `${row.song_title} · ${row.artist}`,
          })
          refreshQueue()
          refreshEvents()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'song_requests',
          filter: `event_id=eq.${eventId}`,
        },
        refreshQueue,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshEvents)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'check_ins', filter: `event_id=eq.${eventId}` }, () =>
        queryClient.invalidateQueries({ queryKey: adminKeys.stats(eventId) }),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refreshQueue()
          refreshEvents()
          void queryClient.invalidateQueries({ queryKey: adminKeys.stats(eventId) })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, queryClient])
}
