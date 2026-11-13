import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { queueKeys } from '@/features/queue/api'
import { throttle } from '@/lib/throttle'
import { pollKeys, recapKeys, topicKeys } from './api'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline'

export function useMingleRealtime(eventId: string | undefined): LiveStatus {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (!eventId) return
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: queueKeys.activeEvent })
      void queryClient.invalidateQueries({ queryKey: ['mingle'] })
    }

    let channel = supabase
      .channel(`mingle:${eventId}:${userId ?? 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void queryClient.invalidateQueries({ queryKey: queueKeys.activeEvent })
        // Question moderation bumps the event row; approved questions appear in the recap.
        void queryClient.invalidateQueries({ queryKey: recapKeys.event(eventId) })
      })
    // Every vote pings the poll row; refetch results at most every 1.5s so a burst of votes stays cheap.
    const refreshPolls = throttle(() => {
      void queryClient.invalidateQueries({ queryKey: pollKeys.list(eventId) })
      void queryClient.invalidateQueries({ queryKey: pollKeys.allResults })
      void queryClient.invalidateQueries({ queryKey: recapKeys.event(eventId) })
    }, 1500)
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'polls', filter: `event_id=eq.${eventId}` },
      refreshPolls,
    )
    // Realtime can't filter DELETE events, so listen to all poll deletes (rare: a host deleting a poll).
    channel = channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'polls' }, refreshPolls)
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'topics', filter: `event_id=eq.${eventId}` }, () => {
      void queryClient.invalidateQueries({ queryKey: topicKeys.list(eventId) })
      void queryClient.invalidateQueries({ queryKey: recapKeys.event(eventId) })
    })
    if (userId) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `user_id=eq.${userId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['mingle', 'my-questions'] }),
      )
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins', filter: `user_id=eq.${userId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['mingle', 'check-in'] }),
      )
    }
    channel.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        setStatus('live')
        refresh()
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setStatus('reconnecting')
      } else if (s === 'CLOSED') {
        setStatus('connecting')
      }
    })

    return () => {
      refreshPolls.cancel()
      void supabase.removeChannel(channel)
    }
  }, [eventId, userId, queryClient])

  return online ? status : 'offline'
}
