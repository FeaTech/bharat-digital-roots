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
  public: {
    Tables: {
      admin_assignments: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "geographic_units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          address: string | null
          country: string | null
          created_at: string
          district: string | null
          email: string
          id: string
          message: string
          name: string
          state: string | null
          town: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email: string
          id?: string
          message: string
          name: string
          state?: string | null
          town?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          state?: string | null
          town?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      geographic_units: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["caucus_level"]
          name: string
          parent_id: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["caucus_level"]
          name: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["caucus_level"]
          name?: string
          parent_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geographic_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "geographic_units"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string
          alt_email: string | null
          alt_mobile: string | null
          amount_inr: number
          branch_unit_id: string | null
          country: string
          created_at: string
          district: string
          email: string
          expires_at: string | null
          full_name: string
          id: string
          joined_at: string
          member_code: string
          mobile: string
          parent_name: string | null
          plan_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          state: string
          status: string
          town: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          alt_email?: string | null
          alt_mobile?: string | null
          amount_inr?: number
          branch_unit_id?: string | null
          country: string
          created_at?: string
          district: string
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          joined_at?: string
          member_code: string
          mobile: string
          parent_name?: string | null
          plan_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state: string
          status?: string
          town: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          alt_email?: string | null
          alt_mobile?: string | null
          amount_inr?: number
          branch_unit_id?: string | null
          country?: string
          created_at?: string
          district?: string
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          joined_at?: string
          member_code?: string
          mobile?: string
          parent_name?: string | null
          plan_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          state?: string
          status?: string
          town?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_unit_id_fkey"
            columns: ["branch_unit_id"]
            isOneToOne: false
            referencedRelation: "geographic_units"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_collaborators: {
        Row: {
          created_at: string
          permission: string
          policy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permission?: string
          policy_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          permission?: string
          policy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_collaborators_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_location: string | null
          event_starts_at: string | null
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          event_location?: string | null
          event_starts_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["post_kind"]
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_location?: string | null
          event_starts_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "geographic_units"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_senate_president: { Args: never; Returns: undefined }
      generate_member_code: { Args: { _plan: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_senate: { Args: { _uid: string }; Returns: boolean }
      is_senate_president: { Args: { _uid: string }; Returns: boolean }
      senate_president_exists: { Args: never; Returns: boolean }
      unit_ancestors: {
        Args: { _unit_id: string }
        Returns: {
          id: string
        }[]
      }
      unit_descendants: {
        Args: { _unit_id: string }
        Returns: {
          id: string
        }[]
      }
      user_admin_units: {
        Args: { _uid: string }
        Returns: {
          id: string
        }[]
      }
      user_member_unit: { Args: { _uid: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "member"
        | "senate_president"
        | "senate_member"
        | "continent_admin"
        | "country_admin"
        | "zone_admin"
        | "state_admin"
        | "district_admin"
        | "branch_admin"
      caucus_level:
        | "continent"
        | "country"
        | "zone"
        | "state"
        | "district"
        | "branch"
      post_kind: "event" | "news" | "announcement" | "policy"
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
      app_role: [
        "admin",
        "member",
        "senate_president",
        "senate_member",
        "continent_admin",
        "country_admin",
        "zone_admin",
        "state_admin",
        "district_admin",
        "branch_admin",
      ],
      caucus_level: [
        "continent",
        "country",
        "zone",
        "state",
        "district",
        "branch",
      ],
      post_kind: ["event", "news", "announcement", "policy"],
    },
  },
} as const
