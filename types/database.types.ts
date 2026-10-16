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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          date: string
          employee_id: string
          id: string
          marked_at: string
          note: string | null
          overtime_hours: number
          shift: string
          status: string
        }
        Insert: {
          date: string
          employee_id: string
          id?: string
          marked_at?: string
          note?: string | null
          overtime_hours?: number
          shift: string
          status: string
        }
        Update: {
          date?: string
          employee_id?: string
          id?: string
          marked_at?: string
          note?: string | null
          overtime_hours?: number
          shift?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string
          daily_wage: number
          employee_code: string
          full_name: string
          id: string
          night_wage: number | null
          phone: string | null
          photo_path: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          daily_wage?: number
          employee_code?: string
          full_name: string
          id?: string
          night_wage?: number | null
          phone?: string | null
          photo_path?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          daily_wage?: number
          employee_code?: string
          full_name?: string
          id?: string
          night_wage?: number | null
          phone?: string | null
          photo_path?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employment_periods: {
        Row: {
          created_at: string
          employee_id: string
          exit_date: string | null
          exit_description: string | null
          id: string
          join_date: string
          join_description: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          exit_date?: string | null
          exit_description?: string | null
          id?: string
          join_date: string
          join_description?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          exit_date?: string | null
          exit_description?: string | null
          id?: string
          join_date?: string
          join_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_summary: {
        Args: { p_employee_ids?: string[]; p_end: string; p_start: string }
        Returns: {
          absent_shifts: number
          daily_wage: number
          days_worked: number
          employee_code: string
          employee_id: string
          full_name: string
          leave_days: number
          leave_shifts: number
          night_shifts: number
          night_wage: number
          payable: number
          role: string
          shift1_present: number
          shift2_present: number
          status: string
        }[]
      }
      create_employee: {
        Args: {
          p_address: string
          p_daily_wage: number
          p_full_name: string
          p_join_date: string
          p_join_description: string
          p_night_wage?: number
          p_phone: string
          p_role: string
        }
        Returns: string
      }
      daily_attendance_counts: {
        Args: { p_end: string; p_start: string }
        Returns: {
          absent: number
          active: number
          day: string
          leave: number
          night: number
          shift1_present: number
          shift2_present: number
        }[]
      }
      employees_active_on: {
        Args: { p_date: string }
        Returns: {
          address: string | null
          created_at: string
          daily_wage: number
          employee_code: string
          full_name: string
          id: string
          night_wage: number | null
          phone: string | null
          photo_path: string | null
          role: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "employees"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      exit_employee: {
        Args: {
          p_employee_id: string
          p_exit_date: string
          p_exit_description: string
        }
        Returns: undefined
      }
      headcount_trend: {
        Args: { p_months?: number; p_until?: string }
        Returns: {
          exited: number
          headcount: number
          joined: number
          month: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      next_employee_code: { Args: never; Returns: string }
      rejoin_employee: {
        Args: {
          p_employee_id: string
          p_join_date: string
          p_join_description: string
        }
        Returns: undefined
      }
      update_employment_period: {
        Args: {
          p_exit_date: string
          p_exit_description: string
          p_join_date: string
          p_join_description: string
          p_period_id: string
        }
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
