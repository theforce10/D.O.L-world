import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { profileKeys } from '@/features/profile/api'
import { queueKeys } from './api'

export function useQueueRealtime() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    const refreshQueue = () => {
      void queryClient.invalidateQueries({ queryKey: queueKeys.activeEvent })
      void queryClient.invalidateQueries({ queryKey: ['queue', 'status'] })
    }

    const channel = supabase
      .channel(`queue:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshQueue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `user_id=eq.${userId}` }, () => {
        refreshQueue()
        void queryClient.invalidateQueries({ queryKey: ['queue', 'mine'] })
        void queryClient.invalidateQueries({ queryKey: profileKeys.songs(userId) })
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refreshQueue()
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
