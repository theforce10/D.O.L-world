import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { throttle } from '@/lib/throttle'
import { pollKeys, topicKeys } from '@/features/mingle/api'
import type { LiveStatus } from '@/features/mingle/useMingleRealtime'
import { hostKeys } from './api'

export function useHostRealtime(eventId: string | undefined): LiveStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')

  useEffect(() => {
    if (!eventId) return
    const refreshTopics = () => void queryClient.invalidateQueries({ queryKey: topicKeys.list(eventId) })
    const refreshEvent = () => {
      void queryClient.invalidateQueries({ queryKey: hostKeys.event(eventId) })
      void queryClient.invalidateQueries({ queryKey: hostKeys.questions(eventId) })
    }

    const refreshPolls = throttle(() => {
      void queryClient.invalidateQueries({ queryKey: pollKeys.list(eventId) })
      void queryClient.invalidateQueries({ queryKey: pollKeys.allResults })
    }, 1000)

    const channel = supabase
      .channel(`host:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `event_id=eq.${eventId}` }, refreshPolls)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'polls' }, refreshPolls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics', filter: `event_id=eq.${eventId}` }, refreshTopics)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, refreshEvent)
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live')
          refreshTopics()
          refreshEvent()
          refreshPolls()
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('reconnecting')
        }
      })

    return () => {
      refreshPolls.cancel()
      void supabase.removeChannel(channel)
    }
  }, [eventId, queryClient])

  return status
}
