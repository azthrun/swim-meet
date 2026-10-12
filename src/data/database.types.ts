export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      age_groups: {
        Row: {
          code: string
          max_age: number
          min_age: number
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          max_age: number
          min_age: number
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          max_age?: number
          min_age?: number
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      entries: {
        Row: {
          course_code: string
          created_at: string
          created_by: string | null
          event_id: number
          event_number: number | null
          heat: number | null
          id: string
          lane: number | null
          meet_id: string
          notes: string | null
          round_code: string
          seed_time_cs: number | null
          swim_date: string
          swimmer_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_code: string
          created_at?: string
          created_by?: string | null
          event_id: number
          event_number?: number | null
          heat?: number | null
          id?: string
          lane?: number | null
          meet_id: string
          notes?: string | null
          round_code?: string
          seed_time_cs?: number | null
          swim_date: string
          swimmer_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string
          created_by?: string | null
          event_id?: number
          event_number?: number | null
          heat?: number | null
          id?: string
          lane?: number | null
          meet_id?: string
          notes?: string | null
          round_code?: string
          seed_time_cs?: number | null
          swim_date?: string
          swimmer_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_event_id_course_code_fkey"
            columns: ["event_id", "course_code"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "course_code"]
          },
          {
            foreignKeyName: "entries_meet_id_course_code_fkey"
            columns: ["meet_id", "course_code"]
            isOneToOne: false
            referencedRelation: "meets"
            referencedColumns: ["id", "course_code"]
          },
          {
            foreignKeyName: "entries_round_code_fkey"
            columns: ["round_code"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "entries_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_code: string
          distance: number
          id: number
          stroke_code: string
        }
        Insert: {
          course_code: string
          distance: number
          id?: never
          stroke_code: string
        }
        Update: {
          course_code?: string
          distance?: number
          id?: never
          stroke_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "events_stroke_code_fkey"
            columns: ["stroke_code"]
            isOneToOne: false
            referencedRelation: "strokes"
            referencedColumns: ["code"]
          },
        ]
      }
      genders: {
        Row: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      meets: {
        Row: {
          course_code: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          location: string | null
          name: string
          name_zh: string | null
          notes: string | null
          results_url: string | null
          start_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_code: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          location?: string | null
          name: string
          name_zh?: string | null
          notes?: string | null
          results_url?: string | null
          start_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          location?: string | null
          name?: string
          name_zh?: string | null
          notes?: string | null
          results_url?: string | null
          start_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meets_course_code_fkey"
            columns: ["course_code"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["code"]
          },
        ]
      }
      motivational_standards: {
        Row: {
          age_group_code: string
          event_id: number
          gender_code: string
          level_code: string
          time_cs: number
        }
        Insert: {
          age_group_code: string
          event_id: number
          gender_code: string
          level_code: string
          time_cs: number
        }
        Update: {
          age_group_code?: string
          event_id?: number
          gender_code?: string
          level_code?: string
          time_cs?: number
        }
        Relationships: [
          {
            foreignKeyName: "motivational_standards_age_group_code_fkey"
            columns: ["age_group_code"]
            isOneToOne: false
            referencedRelation: "age_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "motivational_standards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motivational_standards_gender_code_fkey"
            columns: ["gender_code"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "motivational_standards_level_code_fkey"
            columns: ["level_code"]
            isOneToOne: false
            referencedRelation: "standard_levels"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      result_statuses: {
        Row: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string
          created_by: string | null
          entry_id: string
          live_time_cs: number | null
          notes: string | null
          official_imported_at: string | null
          official_source: string | null
          official_time_cs: number | null
          status_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_id: string
          live_time_cs?: number | null
          notes?: string | null
          official_imported_at?: string | null
          official_source?: string | null
          official_time_cs?: number | null
          status_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_id?: string
          live_time_cs?: number | null
          notes?: string | null
          official_imported_at?: string | null
          official_source?: string | null
          official_time_cs?: number | null
          status_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "personal_bests"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "results_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "result_statuses"
            referencedColumns: ["code"]
          },
        ]
      }
      rounds: {
        Row: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      standard_levels: {
        Row: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      strokes: {
        Row: {
          code: string
          is_relay: boolean
          name_en: string
          name_zh: string
          sort_order: number
        }
        Insert: {
          code: string
          is_relay?: boolean
          name_en: string
          name_zh: string
          sort_order: number
        }
        Update: {
          code?: string
          is_relay?: boolean
          name_en?: string
          name_zh?: string
          sort_order?: number
        }
        Relationships: []
      }
      swimmer_editors: {
        Row: {
          created_at: string
          created_by: string | null
          swimmer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          swimmer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          swimmer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swimmer_editors_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
        ]
      }
      swimmer_private: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          gender_code: string | null
          swimmer_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          gender_code?: string | null
          swimmer_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          gender_code?: string | null
          swimmer_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swimmer_private_gender_code_fkey"
            columns: ["gender_code"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "swimmer_private_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: true
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
        ]
      }
      swimmers: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          display_name_zh: string | null
          id: string
          owner_id: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          display_name_zh?: string | null
          id?: string
          owner_id?: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          display_name_zh?: string | null
          id?: string
          owner_id?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      personal_bests: {
        Row: {
          entry_id: string | null
          event_id: number | null
          meet_id: string | null
          swim_date: string | null
          swimmer_id: string | null
          time_cs: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_swimmer_id_fkey"
            columns: ["swimmer_id"]
            isOneToOne: false
            referencedRelation: "swimmers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      share_swimmer: {
        Args: { p_email: string; p_swimmer_id: string }
        Returns: boolean
      }
      unshare_swimmer: {
        Args: { p_swimmer_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
