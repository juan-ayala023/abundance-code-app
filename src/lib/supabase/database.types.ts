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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_activations: {
        Row: {
          content: Json
          created_at: string
          day_number: number
          id: string
          portal_id: string
          read_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string
          day_number: number
          id?: string
          portal_id: string
          read_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          day_number?: number
          id?: string
          portal_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_activations_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string
          has_access: boolean | null
          id: string
          last_checked_at: string | null
          last_event_at: string | null
          plan: string | null
          source: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email: string
          has_access?: boolean | null
          id?: string
          last_checked_at?: string | null
          last_event_at?: string | null
          plan?: string | null
          source?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string
          has_access?: boolean | null
          id?: string
          last_checked_at?: string | null
          last_event_at?: string | null
          plan?: string | null
          source?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      guidance_queries: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          model: string | null
          portal_id: string
          question: string
          tokens: number | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          model?: string | null
          portal_id: string
          question: string
          tokens?: number | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          model?: string | null
          portal_id?: string
          question?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guidance_queries_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portals: {
        Row: {
          base_reading: Json | null
          base_reading_at: string | null
          birth_city: string | null
          birth_country: string | null
          birth_date: string | null
          birth_time: string | null
          chart: Json | null
          chart_computed_at: string | null
          chart_reading: Json | null
          chart_reading_at: string | null
          chart_version: string | null
          created_at: string
          full_name: string | null
          id: string
          lat: number | null
          lng: number | null
          time_unknown: boolean
          tz: string | null
          updated_at: string
          user_id: string
          utm: Json | null
        }
        Insert: {
          base_reading?: Json | null
          base_reading_at?: string | null
          birth_city?: string | null
          birth_country?: string | null
          birth_date?: string | null
          birth_time?: string | null
          chart?: Json | null
          chart_computed_at?: string | null
          chart_reading?: Json | null
          chart_reading_at?: string | null
          chart_version?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          time_unknown?: boolean
          tz?: string | null
          updated_at?: string
          user_id: string
          utm?: Json | null
        }
        Update: {
          base_reading?: Json | null
          base_reading_at?: string | null
          birth_city?: string | null
          birth_country?: string | null
          birth_date?: string | null
          birth_time?: string | null
          chart?: Json | null
          chart_computed_at?: string | null
          chart_reading?: Json | null
          chart_reading_at?: string | null
          chart_version?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          time_unknown?: boolean
          tz?: string | null
          updated_at?: string
          user_id?: string
          utm?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_landing_entitlement: {
        Args: {
          p_checked_at: string
          p_current_period_end: string
          p_email: string
          p_has_access: boolean
          p_plan: string
          p_source: string
          p_status: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          current_period_end: string | null
          email: string
          has_access: boolean | null
          id: string
          last_checked_at: string | null
          last_event_at: string | null
          plan: string | null
          source: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apply_stripe_entitlement: {
        Args: {
          p_current_period_end: string
          p_email: string
          p_event_at: string
          p_plan: string
          p_status: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
        }
        Returns: undefined
      }
      claim_entitlement: {
        Args: never
        Returns: {
          created_at: string
          current_period_end: string | null
          email: string
          has_access: boolean | null
          id: string
          last_checked_at: string | null
          last_event_at: string | null
          plan: string | null
          source: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: false
          isSetofReturn: true
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
