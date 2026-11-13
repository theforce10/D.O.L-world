import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { profileKeys } from '@/features/profile/api'

export const connectKeys = {
  all: ['connect'] as const,
  events: (userId: string | undefined) => ['connect', 'events', userId] as const,
  candidates: (eventId: string | undefined) => ['connect', 'candidates', eventId] as const,
  matches: (eventId: string | undefined) => ['connect', 'matches', eventId] as const,
}

export function useMyConnectEvents() {
  const { user } = useAuth()
  return useQuery({
    queryKey: connectKeys.events(user?.id),
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_connect_events')
      if (error) throw error
      return data
    },
  })
}

export type ConnectEvent = NonNullable<ReturnType<typeof useMyConnectEvents>['data']>[number]

export function useConnectCandidates(eventId: string | undefined) {
  return useQuery({
    queryKey: connectKeys.candidates(eventId),
    enabled: Boolean(eventId),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('connect_candidates', { p_event_id: eventId! })
      if (error) throw error
      return data.map((c) => ({ ...c, avatar_url: c.avatar_url as string | null }))
    },
  })
}

export type Candidate = NonNullable<ReturnType<typeof useConnectCandidates>['data']>[number]

/** Polls: requests aren't readable by clients, so there's no realtime for a new match. */
export function useMyMatches(eventId: string | undefined) {
  return useQuery({
    queryKey: connectKeys.matches(eventId),
    enabled: Boolean(eventId),
    retry: false,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_matches', { p_event_id: eventId! })
      if (error) throw error
      return data.map((m) => ({ ...m, avatar_url: m.avatar_url as string | null, snapchat: m.snapchat as string | null }))
    },
  })
}

export type Match = NonNullable<ReturnType<typeof useMyMatches>['data']>[number]

function useConnectMutation<TVars, TResult = void>(eventId: string | undefined, mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: connectKeys.candidates(eventId) })
      void queryClient.invalidateQueries({ queryKey: connectKeys.matches(eventId) })
    },
  })
}

export function useRequestConnect(eventId: string | undefined) {
  return useConnectMutation(eventId, async (toUser: string) => {
    const { data, error } = await supabase.rpc('request_connect', { p_event_id: eventId!, p_to_user: toUser })
    if (error) throw error
    return data
  })
}

export function useWithdrawConnect(eventId: string | undefined) {
  return useConnectMutation(eventId, async (toUser: string) => {
    const { error } = await supabase.rpc('withdraw_connect', { p_event_id: eventId!, p_to_user: toUser })
    if (error) throw error
  })
}

export function useUnmatch(eventId: string | undefined) {
  return useConnectMutation(eventId, async (other: string) => {
    const { error } = await supabase.rpc('unmatch', { p_event_id: eventId!, p_other: other })
    if (error) throw error
  })
}

export function useBlockUser(eventId: string | undefined) {
  return useConnectMutation(eventId, async (userId: string) => {
    const { error } = await supabase.rpc('block_user', { p_user_id: userId })
    if (error) throw error
  })
}

export const REPORT_REASONS = [
  { value: 'inappropriate_behaviour', label: 'Inappropriate behaviour at the event' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'other', label: 'Other' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export function useReportUser(eventId: string | undefined) {
  return useMutation({
    mutationFn: async ({ userId, reason, details }: { userId: string; reason: ReportReason; details: string }) => {
      const { error } = await supabase.rpc('report_user', {
        p_event_id: eventId!,
        p_reported: userId,
        p_reason: reason,
        p_details: details || undefined,
      })
      if (error) throw error
    },
  })
}

export function useSaveSnapchat() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (snapchat: string) => {
      const { data, error } = await supabase.from('profiles').update({ snapchat }).eq('id', user!.id).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.detail(profile.id), profile),
  })
}

export function snapchatUrl(handle: string): string {
  return `https://www.snapchat.com/add/${encodeURIComponent(handle)}`
}
