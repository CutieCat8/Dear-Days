
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "friendships": {
                  Row: {
                    "addressee_id": string,"created_at": string,"id": string,"requester_id": string,"responded_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_id": string,"created_at"?: string,"id"?: string,"requester_id": string,"responded_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "addressee_id"?: string,"created_at"?: string,"id"?: string,"requester_id"?: string,"responded_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"memories": {
                  Row: {
                    "author_id": string,"body": string,"cover_media_id": string | null,"created_at": string,"id": string,"memory_date": string,"mood": string | null,"period_label": string | null,"room_id": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"cover_media_id"?: string | null,"created_at"?: string,"id"?: string,"memory_date": string,"mood"?: string | null,"period_label"?: string | null,"room_id": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"cover_media_id"?: string | null,"created_at"?: string,"id"?: string,"memory_date"?: string,"mood"?: string | null,"period_label"?: string | null,"room_id"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memories_cover_fkey"
      columns: ["cover_media_id","id"]
isOneToOne: false
      referencedRelation: "memory_media"
      referencedColumns: ["id","memory_id"]
    },{
      foreignKeyName: "memories_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "room_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memories_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"memory_media": {
                  Row: {
                    "alt_text": string,"created_at": string,"id": string,"memory_id": string,"mime_type": string,"position": number,"size_bytes": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string,"created_at"?: string,"id"?: string,"memory_id": string,"mime_type": string,"position": number,"size_bytes": number,"storage_path": string
                  }
                  Update: {
                    "alt_text"?: string,"created_at"?: string,"id"?: string,"memory_id"?: string,"mime_type"?: string,"position"?: number,"size_bytes"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memory_media_memory_id_fkey"
      columns: ["memory_id"]
isOneToOne: false
      referencedRelation: "memories"
      referencedColumns: ["id"]
    }
                  ]
                },"memory_tags": {
                  Row: {
                    "memory_id": string,"room_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "memory_id": string,"room_id": string,"tag_id": string
                  }
                  Update: {
                    "memory_id"?: string,"room_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memory_tags_memory_fkey"
      columns: ["memory_id","room_id"]
isOneToOne: false
      referencedRelation: "memories"
      referencedColumns: ["id","room_id"]
    },{
      foreignKeyName: "memory_tags_tag_fkey"
      columns: ["tag_id","room_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id","room_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string,"display_name": string,"updated_at": string,"user_id": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name": string,"updated_at"?: string,"user_id": string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string,"display_name"?: string,"updated_at"?: string,"user_id"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"room_members": {
                  Row: {
                    "joined_at": string,"role": string,"room_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "joined_at"?: string,"role": string,"room_id": string,"user_id": string
                  }
                  Update: {
                    "joined_at"?: string,"role"?: string,"room_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "room_members_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "room_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "room_members_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"invite_code": string,"life_period": string,"name": string,"owner_id": string,"theme": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_code"?: string,"life_period": string,"name": string,"owner_id": string,"theme"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"invite_code"?: string,"life_period"?: string,"name"?: string,"owner_id"?: string,"theme"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"id": string,"label": string,"room_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"label": string,"room_id": string,"type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"label"?: string,"room_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tags_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "room_summaries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tags_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "room_summaries": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string | null,"invite_code": string | null,"life_period": string | null,"member_count": number | null,"name": string | null,"owner_id": string | null,"theme": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"description"?: string | null,"id"?: string | null,"invite_code"?: string | null,"life_period"?: string | null,"member_count"?: never,"name"?: string | null,"owner_id"?: string | null,"theme"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"description"?: string | null,"id"?: string | null,"invite_code"?: string | null,"life_period"?: string | null,"member_count"?: never,"name"?: string | null,"owner_id"?: string | null,"theme"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "create_room":
{ Args: { "p_description"?: string,"p_life_period": string,"p_name": string,"p_theme"?: string }; Returns: {
              "created_at": string,
"description": string | null,
"id": string,
"invite_code": string,
"life_period": string,
"name": string,
"owner_id": string,
"theme": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "rooms"
        isOneToOne: true
        isSetofReturn: false
      } },
"has_friendship_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_room_member":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"is_room_owner":
{ Args: { "p_room_id": string }; Returns: boolean
                           },
"join_room":
{ Args: { "p_invite_code": string }; Returns: string
                           },
"list_memory_ids":
{ Args: { "p_date_from"?: string,"p_date_to"?: string,"p_include_no_mood"?: boolean,"p_limit"?: number,"p_moods"?: (string)[],"p_offset"?: number,"p_period_label"?: string,"p_person_tag_ids"?: (string)[],"p_place_tag_ids"?: (string)[],"p_query"?: string,"p_room_id": string,"p_sort"?: string }; Returns: {
              "id": string,"total": number
            }[]
                           },
"memory_room_id":
{ Args: { "p_memory_id": string }; Returns: string
                           },
"remove_friendship":
{ Args: { "p_friendship_id": string }; Returns: string
                           },
"remove_room_member":
{ Args: { "p_room_id": string,"p_user_id": string }; Returns: string
                           },
"respond_friend_request":
{ Args: { "p_accept": boolean,"p_friendship_id": string }; Returns: string
                           },
"save_memory":
{ Args: { "p_input": Json,"p_memory_id": string,"p_room_id": string }; Returns: Json
                           },
"send_friend_request":
{ Args: { "p_username": string }; Returns: Json
                           },
"shares_room_with":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"try_uuid":
{ Args: { "p_text": string }; Returns: string
                           },
"unique_username":
{ Args: { "p_base": string }; Returns: string
                           },
"upsert_tags":
{ Args: { "p_room_id": string,"p_tags": Json }; Returns: {
              "created_at": string,
"id": string,
"label": string,
"room_id": string,
"type": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "tags"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
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
            
          }
        }
} as const
