import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { pollKeys, topicKeys, type Topic } from '@/features/mingle/api'

export const hostKeys = {
  event: (eventId: string | undefined) => ['host', 'event', eventId] as const,
  questions: (eventId: string | undefined) => ['host', 'questions', eventId] as const,
}

export function useHostEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: hostKeys.event(eventId),
    enabled: Boolean(eventId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, venue, event_date, type, is_active, ended_at, screen_poll_id, screen_question_id, questions_rev')
        .eq('id', eventId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function useTopicMutation<TVars, TResult = void>(eventId: string | undefined, mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: topicKeys.list(eventId) }),
  })
}

export interface TopicInput {
  prompt: string
  duration_seconds: number | null
}

export function useAddTopics(eventId: string | undefined) {
  return useTopicMutation(eventId, async (topics: TopicInput[]) => {
    const { error } = await supabase.from('topics').insert(topics.map((t) => ({ ...t, event_id: eventId! })))
    if (error) throw error
  })
}

export function useUpdateTopic(eventId: string | undefined) {
  return useTopicMutation(eventId, async ({ id, ...changes }: TopicInput & { id: string }) => {
    const { error } = await supabase.from('topics').update(changes).eq('id', id)
    if (error) throw error
  })
}

export function useDeleteTopic(eventId: string | undefined) {
  return useTopicMutation(eventId, async (id: string) => {
    const { error } = await supabase.from('topics').delete().eq('id', id)
    if (error) throw error
  })
}

export function useAdvanceTopic(eventId: string | undefined) {
  return useTopicMutation(eventId, async () => {
    const { data, error } = await supabase.rpc('advance_topic', { p_event_id: eventId! })
    if (error) throw error
    return data as string | null
  })
}

export function useEndRound(eventId: string | undefined) {
  return useTopicMutation(eventId, async () => {
    const { error } = await supabase.rpc('end_round', { p_event_id: eventId! })
    if (error) throw error
  })
}

export function useExtendTopic(eventId: string | undefined) {
  return useTopicMutation(eventId, async (topicId: string) => {
    const { error } = await supabase.rpc('extend_topic', { p_topic_id: topicId, p_seconds: 120 })
    if (error) throw error
  })
}

export function useReorderTopics(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const key = topicKeys.list(eventId)
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.rpc('reorder_topics', { p_event_id: eventId!, p_topic_ids: ids })
      if (error) throw error
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Topic[]>(key)
      queryClient.setQueryData<Topic[]>(key, (rows) => {
        if (!rows) return rows
        const queued = new Map(rows.filter((r) => r.status === 'queued').map((r) => [r.id, r]))
        const started = rows.filter((r) => r.status !== 'queued')
        const base = started.reduce((max, r) => Math.max(max, r.position), 0)
        const reordered = ids.flatMap((id, i) => {
          const row = queued.get(id)
          return row ? [{ ...row, position: base + i + 1 }] : []
        })
        return [...started, ...reordered]
      })
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

function usePollMutation<TVars, TResult = void>(eventId: string | undefined, mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pollKeys.list(eventId) })
      void queryClient.invalidateQueries({ queryKey: hostKeys.event(eventId) })
    },
  })
}

export interface PollInput {
  question: string
  options: string[]
  topicId: string | null
}

export function useCreatePoll(eventId: string | undefined) {
  return usePollMutation(eventId, async ({ input, open }: { input: PollInput; open: boolean }) => {
    const { data, error } = await supabase.rpc('create_poll', {
      p_event_id: eventId!,
      p_question: input.question,
      p_options: input.options,
      p_topic_id: input.topicId ?? undefined,
    })
    if (error) throw error
    if (open) {
      const opened = await supabase.rpc('open_poll', { p_poll_id: data })
      if (opened.error) throw opened.error
    }
    return data
  })
}

export function useUpdatePoll(eventId: string | undefined) {
  return usePollMutation(eventId, async ({ id, input }: { id: string; input: PollInput }) => {
    const { error } = await supabase.rpc('update_poll', {
      p_poll_id: id,
      p_question: input.question,
      p_options: input.options,
      p_topic_id: input.topicId ?? undefined,
    })
    if (error) throw error
  })
}

export function useSetPollStatus(eventId: string | undefined) {
  return usePollMutation(eventId, async ({ id, open }: { id: string; open: boolean }) => {
    const { error } = await supabase.rpc(open ? 'open_poll' : 'close_poll', { p_poll_id: id })
    if (error) throw error
  })
}

export function useShowPollOnScreen(eventId: string | undefined) {
  return usePollMutation(eventId, async (pollId: string | null) => {
    const { error } = await supabase.rpc('show_poll_on_screen', { p_event_id: eventId!, p_poll_id: pollId as string })
    if (error) throw error
  })
}

export function useDeletePoll(eventId: string | undefined) {
  return usePollMutation(eventId, async (id: string) => {
    const { error } = await supabase.from('polls').delete().eq('id', id)
    if (error) throw error
  })
}

function useTopicVoteMutation<TVars>(eventId: string | undefined, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: topicKeys.list(eventId) })
      void queryClient.invalidateQueries({ queryKey: pollKeys.list(eventId) })
    },
  })
}

export function useStartTopicVote(eventId: string | undefined) {
  return useTopicVoteMutation(eventId, async (topicIds: string[]) => {
    const { error } = await supabase.rpc('start_topic_vote', { p_event_id: eventId!, p_topic_ids: topicIds })
    if (error) throw error
  })
}

export function useFinishTopicVote(eventId: string | undefined) {
  return useTopicVoteMutation(eventId, async ({ pollId, topicId }: { pollId: string; topicId: string }) => {
    const { error } = await supabase.rpc('finish_topic_vote', { p_poll_id: pollId, p_topic_id: topicId })
    if (error) throw error
  })
}

export function useCancelTopicVote(eventId: string | undefined) {
  return useTopicVoteMutation(eventId, async (pollId: string) => {
    const { error } = await supabase.rpc('cancel_topic_vote', { p_poll_id: pollId })
    if (error) throw error
  })
}

export function useHostQuestions(eventId: string | undefined) {
  return useQuery({
    queryKey: hostKeys.questions(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('host_questions', { p_event_id: eventId! })
      if (error) throw error
      return data.map((q) => ({ ...q, topic_id: q.topic_id as string | null, shown_on_screen_at: q.shown_on_screen_at as string | null }))
    },
  })
}

export type HostQuestion = NonNullable<ReturnType<typeof useHostQuestions>['data']>[number]
export type QuestionStatus = HostQuestion['status']

function useQuestionMutation<TVars, TResult = void>(eventId: string | undefined, mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: hostKeys.questions(eventId) })
      void queryClient.invalidateQueries({ queryKey: hostKeys.event(eventId) })
    },
  })
}

export function useModerateQuestion(eventId: string | undefined) {
  const queryClient = useQueryClient()
  const key = hostKeys.questions(eventId)
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuestionStatus }) => {
      const { error } = await supabase.rpc('moderate_question', { p_question_id: id, p_status: status })
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<HostQuestion[]>(key)
      queryClient.setQueryData<HostQuestion[]>(key, (rows) => rows?.map((q) => (q.id === id ? { ...q, status } : q)))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: hostKeys.event(eventId) })
    },
  })
}

export function useShowQuestionOnScreen(eventId: string | undefined) {
  return useQuestionMutation(eventId, async (questionId: string | null) => {
    const { error } = await supabase.rpc('show_question_on_screen', { p_event_id: eventId!, p_question_id: questionId as string })
    if (error) throw error
  })
}

export function useBanQuestionAuthor(eventId: string | undefined) {
  return useQuestionMutation(eventId, async (questionId: string) => {
    const { data, error } = await supabase.rpc('ban_question_author', { p_question_id: questionId })
    if (error) throw error
    return data
  })
}
