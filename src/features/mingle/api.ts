import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'
import { profileKeys } from '@/features/profile/api'

export const mingleKeys = {
  checkIn: (eventId: string | undefined, userId: string | undefined) => ['mingle', 'check-in', eventId, userId] as const,
}

const CHECK_IN_SELECT = 'event_id, discoverable, checked_in_at'

export function useMyCheckIn(eventId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: mingleKeys.checkIn(eventId, user?.id),
    enabled: Boolean(eventId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_ins')
        .select(CHECK_IN_SELECT)
        .eq('event_id', eventId!)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export interface CheckInInput {
  discoverable: boolean
  marketingConsent: boolean
}

export function useCheckIn(eventId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ discoverable, marketingConsent }: CheckInInput) => {
      const { data, error } = await supabase
        .from('check_ins')
        .insert({ event_id: eventId!, discoverable, age_confirmed: true })
        .select(CHECK_IN_SELECT)
        .single()

      let checkIn = data
      if (error) {
        if (error.code !== '23505') throw error
        const existing = await supabase.from('check_ins').select(CHECK_IN_SELECT).eq('event_id', eventId!).eq('user_id', user!.id).single()
        if (existing.error) throw existing.error
        checkIn = existing.data
      }

      if (marketingConsent) {
        const consent = await supabase.from('profiles').update({ marketing_consent: true }).eq('id', user!.id).select('*').single()
        if (!consent.error) queryClient.setQueryData(profileKeys.detail(user!.id), consent.data)
      }
      return checkIn!
    },
    onSuccess: (checkIn) => queryClient.setQueryData(mingleKeys.checkIn(eventId, user?.id), checkIn),
  })
}

export function useSetDiscoverable(eventId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = mingleKeys.checkIn(eventId, user?.id)
  return useMutation({
    mutationFn: async (discoverable: boolean) => {
      const { data, error } = await supabase
        .from('check_ins')
        .update({ discoverable })
        .eq('event_id', eventId!)
        .eq('user_id', user!.id)
        .select(CHECK_IN_SELECT)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (checkIn) => queryClient.setQueryData(key, checkIn),
  })
}

export const topicKeys = {
  list: (eventId: string | undefined) => ['mingle', 'topics', eventId] as const,
}

export const TOPIC_SELECT = 'id, event_id, position, prompt, duration_seconds, status, started_at, ended_at, created_at'

/** Guests get live + done topics (RLS); admins also get the queued ones. Ordered as they run. */
export function useTopics(eventId: string | undefined) {
  return useQuery({
    queryKey: topicKeys.list(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(TOPIC_SELECT)
        .eq('event_id', eventId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export type Topic = NonNullable<ReturnType<typeof useTopics>['data']>[number]

export const pollKeys = {
  list: (eventId: string | undefined) => ['mingle', 'polls', eventId] as const,
  results: (pollId: string | undefined) => ['mingle', 'poll-results', pollId] as const,
  allResults: ['mingle', 'poll-results'] as const,
  myVote: (pollId: string | undefined, userId: string | undefined) => ['mingle', 'my-vote', pollId, userId] as const,
}

/** Guests get open + closed polls of the live event (RLS); admins also get drafts. Newest first. */
export function usePolls(eventId: string | undefined) {
  return useQuery({
    queryKey: pollKeys.list(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polls')
        .select(
          'id, event_id, kind, topic_id, question, status, opened_at, closed_at, vote_count, created_at, options:poll_options(id, label, position, topic_id)',
        )
        .eq('event_id', eventId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((p) => ({ ...p, options: [...p.options].sort((a, b) => a.position - b.position) }))
    },
  })
}

export type Poll = NonNullable<ReturnType<typeof usePolls>['data']>[number]

/** The open "pick the next topic" vote, if the host is running one. */
export function openTopicVote(polls: Poll[] | undefined): Poll | undefined {
  return polls?.find((p) => p.kind === 'topic' && p.status === 'open')
}

/** Normal polls only (topic votes are shown separately). */
export function normalPolls(polls: Poll[] | undefined): Poll[] {
  return (polls ?? []).filter((p) => p.kind === 'poll')
}

export interface PollResult {
  option_id: string
  label: string
  votes: number
  percent: number
}

export function usePollResults(pollId: string | undefined) {
  return useQuery({
    queryKey: pollKeys.results(pollId),
    enabled: Boolean(pollId),
    refetchInterval: 30_000,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<PollResult[]> => {
      const { data, error } = await supabase.rpc('poll_results', { p_poll_id: pollId! })
      if (error) throw error
      return data.map(({ option_id, label, votes, percent }) => ({ option_id, label, votes, percent }))
    },
  })
}

export function useMyVote(pollId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: pollKeys.myVote(pollId, user?.id),
    enabled: Boolean(pollId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId!)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data?.option_id ?? null
    },
  })
}

export function useCastVote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const { error } = await supabase.rpc('cast_vote', { p_poll_id: pollId, p_option_id: optionId })
      if (error) throw error
    },
    onSuccess: (_data, { pollId, optionId }) => {
      queryClient.setQueryData(pollKeys.myVote(pollId, user?.id), optionId)
      void queryClient.invalidateQueries({ queryKey: pollKeys.results(pollId) })
    },
  })
}

export const QUESTION_LIMIT = 5
export const QUESTION_MAX_LENGTH = 280

export const questionKeys = {
  mine: (eventId: string | undefined, userId: string | undefined) => ['mingle', 'my-questions', eventId, userId] as const,
}

const MY_QUESTION_SELECT = 'id, body, status, created_at'

export function useMyQuestions(eventId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: questionKeys.mine(eventId, user?.id),
    enabled: Boolean(eventId && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select(MY_QUESTION_SELECT)
        .eq('event_id', eventId!)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export type MyQuestion = NonNullable<ReturnType<typeof useMyQuestions>['data']>[number]

export function useAskQuestion(eventId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await supabase.from('questions').insert({ event_id: eventId!, body }).select(MY_QUESTION_SELECT).single()
      if (error) throw error
      return data
    },
    onSuccess: (question) =>
      queryClient.setQueryData<MyQuestion[]>(questionKeys.mine(eventId, user?.id), (rows) => [question, ...(rows ?? [])]),
  })
}

export interface RecapTopic {
  id: string
  prompt: string
  started_at: string | null
  ended_at: string | null
  polls: { id: string; question: string; results: PollResult[] }[]
  questions: string[]
}

export const recapKeys = {
  event: (eventId: string | undefined) => ['mingle', 'recap', eventId] as const,
}

export function useEventRecap(eventId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: recapKeys.event(eventId),
    enabled: Boolean(eventId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('event_recap', { p_event_id: eventId! })
      if (error) throw error
      return (data ?? []) as unknown as RecapTopic[]
    },
  })
}
