import type { Database } from './database.types'

type PublicSchema = Database['public']

export type Profile = PublicSchema['Tables']['profiles']['Row']
export type EventRow = PublicSchema['Tables']['events']['Row']
export type SongRequest = PublicSchema['Tables']['song_requests']['Row']
export type RequestStatus = PublicSchema['Enums']['request_status']

// The generator marks every RPC column as non-null; these can legitimately be
// null (no request yet, nobody up next), so we widen them here.
type RawQueueStatus = PublicSchema['Functions']['get_queue_status']['Returns'][number]
export type QueueStatus = Omit<
  RawQueueStatus,
  'up_next_number' | 'my_request_id' | 'my_number' | 'my_status' | 'ahead_of_me'
> & {
  up_next_number: number | null
  my_request_id: string | null
  my_number: number | null
  my_status: RequestStatus | null
  ahead_of_me: number | null
}

type RawContact = PublicSchema['Functions']['admin_contacts']['Returns'][number]
export type Contact = {
  [K in keyof RawContact]: K extends 'user_id' | 'marketing_consent' | 'events_attended' | 'total_songs' | 'joined_at'
    ? RawContact[K]
    : RawContact[K] | null
}
