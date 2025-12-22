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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_audit_log: {
        Row: {
          action: string
          attendance_record_id: string | null
          created_at: string
          id: string
          marked_by: string
          new_status: string | null
          previous_status: string | null
          reason: string
          session_id: string
          student_id: string
        }
        Insert: {
          action: string
          attendance_record_id?: string | null
          created_at?: string
          id?: string
          marked_by: string
          new_status?: string | null
          previous_status?: string | null
          reason: string
          session_id: string
          student_id: string
        }
        Update: {
          action?: string
          attendance_record_id?: string | null
          created_at?: string
          id?: string
          marked_by?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_audit_log_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string
          id: string
          late_submission: boolean
          manual_reason: string | null
          method_used: string
          session_id: string
          status: string
          student_id: string
          timestamp: string
          verification_score: number | null
        }
        Insert: {
          class_id: string
          id?: string
          late_submission?: boolean
          manual_reason?: string | null
          method_used: string
          session_id: string
          status?: string
          student_id: string
          timestamp?: string
          verification_score?: number | null
        }
        Update: {
          class_id?: string
          id?: string
          late_submission?: boolean
          manual_reason?: string | null
          method_used?: string
          session_id?: string
          status?: string
          student_id?: string
          timestamp?: string
          verification_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          attendance_window_minutes: number
          class_id: string
          closed_reason: string | null
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_active: boolean
          session_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          attendance_window_minutes?: number
          class_id: string
          closed_reason?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          session_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          attendance_window_minutes?: number
          class_id?: string
          closed_reason?: string | null
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          session_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_synced_events: {
        Row: {
          created_at: string
          google_event_id: string
          id: string
          schedule_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_event_id: string
          id?: string
          schedule_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_event_id?: string
          id?: string
          schedule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_synced_events_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          id: string
          refresh_token: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          class_id: string
          created_at: string
          day: string
          end_time: string
          id: string
          original_schedule_id: string | null
          rescheduled_to_id: string | null
          start_time: string
          status: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          class_id: string
          created_at?: string
          day: string
          end_time: string
          id?: string
          original_schedule_id?: string | null
          rescheduled_to_id?: string | null
          start_time: string
          status?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          class_id?: string
          created_at?: string
          day?: string
          end_time?: string
          id?: string
          original_schedule_id?: string | null
          rescheduled_to_id?: string | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_original_schedule_id_fkey"
            columns: ["original_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_rescheduled_to_id_fkey"
            columns: ["rescheduled_to_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string
          department: string
          id: string
          join_code: string
          latitude: number | null
          longitude: number | null
          professor_id: string
          proximity_radius_meters: number | null
          room: string
          semester: string
          subject: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department: string
          id?: string
          join_code: string
          latitude?: number | null
          longitude?: number | null
          professor_id: string
          proximity_radius_meters?: number | null
          room: string
          semester: string
          subject: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string
          id?: string
          join_code?: string
          latitude?: number | null
          longitude?: number | null
          professor_id?: string
          proximity_radius_meters?: number | null
          room?: string
          semester?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          head_of_department: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          head_of_department?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      face_embeddings: {
        Row: {
          embedding: string
          id: string
          registered_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          embedding: string
          id?: string
          registered_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          embedding?: string
          id?: string
          registered_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          id: string
          name: string
          photo_url: string | null
          roll_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          id?: string
          name: string
          photo_url?: string | null
          roll_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          roll_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_secrets: {
        Row: {
          created_at: string
          id: string
          qr_secret: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          qr_secret: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          qr_secret?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_secrets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_images: {
        Row: {
          captured_at: string
          created_at: string
          id: string
          image_data: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          id?: string
          image_data: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          id?: string
          image_data?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_images_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_join_code: { Args: never; Returns: string }
      get_student_by_email: { Args: { _email: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_enrolled_in_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      is_student: { Args: { _user_id: string }; Returns: boolean }
      join_class_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "student" | "professor" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "professor", "admin"],
    },
  },
} as const
