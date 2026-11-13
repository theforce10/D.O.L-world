
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked": string,"blocker": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked": string,"blocker": string,"created_at"?: string
                  }
                  Update: {
                    "blocked"?: string,"blocker"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_fkey"
      columns: ["blocked"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_fkey"
      columns: ["blocker"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"check_ins": {
                  Row: {
                    "age_confirmed": boolean,"checked_in_at": string,"discoverable": boolean,"event_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_confirmed": boolean,"checked_in_at"?: string,"discoverable"?: boolean,"event_id": string,"user_id"?: string
                  }
                  Update: {
                    "age_confirmed"?: boolean,"checked_in_at"?: string,"discoverable"?: boolean,"event_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "check_ins_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_ins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"connect_requests": {
                  Row: {
                    "created_at": string,"event_id": string,"from_user": string,"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"from_user": string,"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"from_user"?: string,"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "connect_requests_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connect_requests_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "connect_requests_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"current_number": number,"ended_at": string | null,"event_date": string | null,"id": string,"is_active": boolean,"last_queue_number": number,"name": string,"questions_rev": number,"screen_poll_id": string | null,"screen_question_id": string | null,"type": Database["public"]['Enums']["event_type"],"updated_at": string,"venue": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_number"?: number,"ended_at"?: string | null,"event_date"?: string | null,"id"?: string,"is_active"?: boolean,"last_queue_number"?: number,"name": string,"questions_rev"?: number,"screen_poll_id"?: string | null,"screen_question_id"?: string | null,"type"?: Database["public"]['Enums']["event_type"],"updated_at"?: string,"venue"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"current_number"?: number,"ended_at"?: string | null,"event_date"?: string | null,"id"?: string,"is_active"?: boolean,"last_queue_number"?: number,"name"?: string,"questions_rev"?: number,"screen_poll_id"?: string | null,"screen_question_id"?: string | null,"type"?: Database["public"]['Enums']["event_type"],"updated_at"?: string,"venue"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_screen_poll_id_fkey"
      columns: ["screen_poll_id"]
isOneToOne: false
      referencedRelation: "polls"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_screen_question_id_fkey"
      columns: ["screen_question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"poll_options": {
                  Row: {
                    "id": string,"label": string,"poll_id": string,"position": number,"topic_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"label": string,"poll_id": string,"position": number,"topic_id"?: string | null
                  }
                  Update: {
                    "id"?: string,"label"?: string,"poll_id"?: string,"position"?: number,"topic_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "poll_options_poll_id_fkey"
      columns: ["poll_id"]
isOneToOne: false
      referencedRelation: "polls"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_options_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"poll_votes": {
                  Row: {
                    "created_at": string,"option_id": string,"poll_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"option_id": string,"poll_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"option_id"?: string,"poll_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "poll_votes_option_id_fkey"
      columns: ["option_id"]
isOneToOne: false
      referencedRelation: "poll_options"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_votes_poll_id_fkey"
      columns: ["poll_id"]
isOneToOne: false
      referencedRelation: "polls"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "poll_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"polls": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"event_id": string,"id": string,"kind": Database["public"]['Enums']["poll_kind"],"opened_at": string | null,"question": string,"status": Database["public"]['Enums']["poll_status"],"topic_id": string | null,"updated_at": string,"vote_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"event_id": string,"id"?: string,"kind"?: Database["public"]['Enums']["poll_kind"],"opened_at"?: string | null,"question": string,"status"?: Database["public"]['Enums']["poll_status"],"topic_id"?: string | null,"updated_at"?: string,"vote_count"?: number
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"event_id"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["poll_kind"],"opened_at"?: string | null,"question"?: string,"status"?: Database["public"]['Enums']["poll_status"],"topic_id"?: string | null,"updated_at"?: string,"vote_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "polls_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "polls_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"consent_at": string | null,"created_at": string,"email": string | null,"full_name": string | null,"id": string,"marketing_consent": boolean,"phone": string | null,"questions_banned": boolean,"snapchat": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"marketing_consent"?: boolean,"phone"?: string | null,"questions_banned"?: boolean,"snapchat"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"consent_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"marketing_consent"?: boolean,"phone"?: string | null,"questions_banned"?: boolean,"snapchat"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "body": string,"created_at": string,"event_id": string,"flagged": boolean,"id": string,"shown_on_screen_at": string | null,"status": Database["public"]['Enums']["question_status"],"topic_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"event_id": string,"flagged"?: boolean,"id"?: string,"shown_on_screen_at"?: string | null,"status"?: Database["public"]['Enums']["question_status"],"topic_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"event_id"?: string,"flagged"?: boolean,"id"?: string,"shown_on_screen_at"?: string | null,"status"?: Database["public"]['Enums']["question_status"],"topic_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"event_id": string | null,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reported": string,"reporter": string | null,"resolved_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"event_id"?: string | null,"id"?: string,"reason": Database["public"]['Enums']["report_reason"],"reported": string,"reporter"?: string | null,"resolved_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"event_id"?: string | null,"id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reported"?: string,"reporter"?: string | null,"resolved_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_fkey"
      columns: ["reported"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_fkey"
      columns: ["reporter"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"song_requests": {
                  Row: {
                    "artist": string,"created_at": string,"event_id": string,"id": string,"note": string | null,"queue_number": number,"song_title": string,"status": Database["public"]['Enums']["request_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "artist": string,"created_at"?: string,"event_id": string,"id"?: string,"note"?: string | null,"queue_number": number,"song_title": string,"status"?: Database["public"]['Enums']["request_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "artist"?: string,"created_at"?: string,"event_id"?: string,"id"?: string,"note"?: string | null,"queue_number"?: number,"song_title"?: string,"status"?: Database["public"]['Enums']["request_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "song_requests_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "created_at": string,"duration_seconds": number | null,"ended_at": string | null,"event_id": string,"id": string,"position": number,"prompt": string,"started_at": string | null,"status": Database["public"]['Enums']["topic_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_seconds"?: number | null,"ended_at"?: string | null,"event_id": string,"id"?: string,"position"?: number,"prompt": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["topic_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"duration_seconds"?: number | null,"ended_at"?: string | null,"event_id"?: string,"id"?: string,"position"?: number,"prompt"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["topic_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_contacts":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string,"consent_at": string,"email": string,"events_attended": number,"full_name": string,"joined_at": string,"karaoke_events": number,"last_check_in_at": string,"last_song_at": string,"marketing_consent": boolean,"mingle_events": number,"phone": string,"total_songs": number,"user_id": string
            }[]
                           },
"admin_reports":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"details": string,"event_name": string,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reported_email": string,"reported_id": string,"reported_name": string,"reported_total": number,"reporter_email": string,"reporter_name": string,"resolved_at": string
            }[]
                           },
"advance_topic":
{ Args: { "p_event_id": string }; Returns: string
                           },
"assert_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"assert_can_connect":
{ Args: { "p_event_id": string }; Returns: string
                           },
"ban_question_author":
{ Args: { "p_question_id": string }; Returns: number
                           },
"block_user":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"call_next":
{ Args: { "p_event_id": string }; Returns: number
                           },
"cancel_topic_vote":
{ Args: { "p_poll_id": string }; Returns: undefined
                           },
"cast_vote":
{ Args: { "p_option_id": string,"p_poll_id": string }; Returns: undefined
                           },
"clean_poll_options":
{ Args: { "p_options": (string)[] }; Returns: (string)[]
                           },
"close_poll":
{ Args: { "p_poll_id": string }; Returns: undefined
                           },
"connect_candidates":
{ Args: { "p_event_id": string }; Returns: {
              "avatar_url": string,"first_name": string,"matched": boolean,"requested": boolean,"user_id": string
            }[]
                           },
"connect_window_open":
{ Args: { "p_event_id": string }; Returns: boolean
                           },
"create_poll":
{ Args: { "p_event_id": string,"p_options": (string)[],"p_question": string,"p_topic_id"?: string }; Returns: string
                           },
"end_event":
{ Args: { "p_event_id": string }; Returns: string
                           },
"end_round":
{ Args: { "p_event_id": string }; Returns: undefined
                           },
"event_recap":
{ Args: { "p_event_id": string }; Returns: Json
                           },
"event_stats":
{ Args: { "p_event_id": string }; Returns: {
              "check_ins": number,"matches": number,"participation": number,"polls": number,"questions": number,"voters": number
            }[]
                           },
"extend_topic":
{ Args: { "p_seconds"?: number,"p_topic_id": string }; Returns: undefined
                           },
"finish_topic_vote":
{ Args: { "p_poll_id": string,"p_topic_id": string }; Returns: undefined
                           },
"get_queue_status":
{ Args: { "p_event_id": string }; Returns: {
              "ahead_of_me": number,"current_number": number,"event_id": string,"my_number": number,"my_request_id": string,"my_status": Database["public"]['Enums']["request_status"],"total_waiting": number,"up_next_number": number
            }[]
                           },
"host_questions":
{ Args: { "p_event_id": string }; Returns: {
              "body": string,"created_at": string,"flagged": boolean,"id": string,"shown_on_screen_at": string,"status": Database["public"]['Enums']["question_status"],"topic_id": string
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "p_a": string,"p_b": string }; Returns: boolean
                           },
"moderate_question":
{ Args: { "p_question_id": string,"p_status": Database["public"]['Enums']["question_status"] }; Returns: undefined
                           },
"my_connect_events":
{ Args: Record<PropertyKey, never>; Returns: {
              "closes_at": string,"ended_at": string,"event_id": string,"name": string
            }[]
                           },
"my_matches":
{ Args: { "p_event_id": string }; Returns: {
              "avatar_url": string,"first_name": string,"matched_at": string,"snapchat": string,"user_id": string
            }[]
                           },
"open_poll":
{ Args: { "p_poll_id": string }; Returns: undefined
                           },
"poll_results":
{ Args: { "p_poll_id": string }; Returns: {
              "label": string,"option_id": string,"option_position": number,"percent": number,"votes": number
            }[]
                           },
"question_needs_review":
{ Args: { "p_body": string }; Returns: boolean
                           },
"reorder_topics":
{ Args: { "p_event_id": string,"p_topic_ids": (string)[] }; Returns: undefined
                           },
"report_user":
{ Args: { "p_details"?: string,"p_event_id": string,"p_reason": Database["public"]['Enums']["report_reason"],"p_reported": string }; Returns: undefined
                           },
"request_connect":
{ Args: { "p_event_id": string,"p_to_user": string }; Returns: boolean
                           },
"resolve_report":
{ Args: { "p_report_id": string,"p_resolved": boolean }; Returns: undefined
                           },
"server_now":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_active_event":
{ Args: { "p_event_id": string }; Returns: undefined
                           },
"show_poll_on_screen":
{ Args: { "p_event_id": string,"p_poll_id": string }; Returns: undefined
                           },
"show_question_on_screen":
{ Args: { "p_event_id": string,"p_question_id": string }; Returns: undefined
                           },
"start_topic_vote":
{ Args: { "p_event_id": string,"p_topic_ids": (string)[] }; Returns: string
                           },
"unmatch":
{ Args: { "p_event_id": string,"p_other": string }; Returns: undefined
                           },
"update_poll":
{ Args: { "p_options": (string)[],"p_poll_id": string,"p_question": string,"p_topic_id"?: string }; Returns: undefined
                           },
"withdraw_connect":
{ Args: { "p_event_id": string,"p_to_user": string }; Returns: undefined
                           }
          }
          Enums: {
            "event_type": "karaoke"|"mix_mingle","poll_kind": "poll"|"topic","poll_status": "draft"|"open"|"closed","question_status": "pending"|"approved"|"answered"|"hidden","report_reason": "inappropriate_behaviour"|"harassment"|"fake_profile"|"other","request_status": "waiting"|"up_next"|"singing"|"sung"|"skipped","topic_status": "queued"|"live"|"done"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "event_type": ["karaoke", "mix_mingle"],"poll_kind": ["poll", "topic"],"poll_status": ["draft", "open", "closed"],"question_status": ["pending", "approved", "answered", "hidden"],"report_reason": ["inappropriate_behaviour", "harassment", "fake_profile", "other"],"request_status": ["waiting", "up_next", "singing", "sung", "skipped"],"topic_status": ["queued", "live", "done"]
          }
        }
} as const
