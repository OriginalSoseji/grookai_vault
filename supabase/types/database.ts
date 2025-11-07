export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      listing_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          listing_id: string
          sort_order: number | null
          thumb_3x4_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          listing_id: string
          sort_order?: number | null
          thumb_3x4_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          listing_id?: string
          sort_order?: number | null
          thumb_3x4_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_wall_feed"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "wall_feed_v"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "wall_feed_view"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "wall_thumbs_3x4"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          card_print_id: string | null
          condition: string | null
          condition_tier: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          location_city: string | null
          location_country: string | null
          location_region: string | null
          note: string | null
          owner_id: string
          price_cents: number | null
          primary_image_url: string | null
          quantity: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          vault_item_id: string | null
          visibility: string | null
        }
        Insert: {
          card_print_id?: string | null
          condition?: string | null
          condition_tier?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          note?: string | null
          owner_id: string
          price_cents?: number | null
          primary_image_url?: string | null
          quantity?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vault_item_id?: string | null
          visibility?: string | null
        }
        Update: {
          card_print_id?: string | null
          condition?: string | null
          condition_tier?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location_city?: string | null
          location_country?: string | null
          location_region?: string | null
          note?: string | null
          owner_id?: string
          price_cents?: number | null
          primary_image_url?: string | null
          quantity?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vault_item_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          card_id: string
          condition: string | null
          condition_label: string | null
          created_at: string | null
          grade: string | null
          grade_label: string | null
          id: string
          qty: number
          user_id: string
        }
        Insert: {
          card_id: string
          condition?: string | null
          condition_label?: string | null
          created_at?: string | null
          grade?: string | null
          grade_label?: string | null
          id?: string
          qty?: number
          user_id: string
        }
        Update: {
          card_id?: string
          condition?: string | null
          condition_label?: string | null
          created_at?: string | null
          grade?: string | null
          grade_label?: string | null
          id?: string
          qty?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      card_prints_clean: {
        Row: {
          collector_number: string | null
          id: string | null
          image_alt_url: string | null
          image_url: string | null
          lang: string | null
          name: string | null
          name_display: string | null
          name_search: string | null
          set_code: string | null
        }
        Relationships: []
      }
      latest_card_prices_v: {
        Row: {
          card_id: string | null
          condition: string | null
          observed_at: string | null
          price_high: number | null
          price_low: number | null
          price_mid: number | null
          source: string | null
        }
        Relationships: []
      }
      sold_comps_v: {
        Row: {
          card_id: string | null
          sold_at: string | null
          sold_price: number | null
          source: string | null
          title: string | null
          url: string | null
        }
        Relationships: []
      }
      v_card_prints_search: {
        Row: {
          card_print_id: string | null
          collector_number: string | null
          image_alt_url: string | null
          image_url: string | null
          lang: string | null
          name_canonical: string | null
          name_search: string | null
          set_code: string | null
        }
        Relationships: []
      }
      v_card_search: {
        Row: {
          id: string | null
          image_best: string | null
          image_url: string | null
          latest_price: number | null
          latest_price_cents: number | null
          name: string | null
          name_lc: string | null
          number: string | null
          number_digits: string | null
          number_padded: string | null
          number_raw: string | null
          number_slashed: string | null
          rarity: string | null
          search_rank: number | null
          set_code: string | null
          thumb_url: string | null
        }
        Relationships: []
      }
      v_cards_search_v2: {
        Row: {
          id: string | null
          name: string | null
          name_norm: string | null
          number: string | null
          number_int: number | null
          rarity: string | null
          set_code: string | null
          subtypes: string[] | null
          supertype: string | null
          total_int: number | null
        }
        Relationships: []
      }
      v_wall_feed: {
        Row: {
          card_id: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          listing_id: string | null
          owner_id: string | null
          price_cents: number | null
          status: string | null
          thumb_url: string | null
          title: string | null
        }
        Relationships: []
      }
      wall_feed_v: {
        Row: {
          card_id: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          listing_id: string | null
          owner_id: string | null
          price_cents: number | null
          status: string | null
          thumb_url: string | null
          title: string | null
        }
        Relationships: []
      }
      wall_feed_view: {
        Row: {
          card_id: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          listing_id: string | null
          owner_id: string | null
          price_cents: number | null
          status: string | null
          thumb_url: string | null
          title: string | null
        }
        Relationships: []
      }
      wall_thumbs_3x4: {
        Row: {
          card_id: string | null
          condition: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          owner_id: string | null
          price_cents: number | null
          status: string | null
          thumb_url: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_uid: { Args: never; Returns: string }
      card_index_history: {
        Args: { _card_id: string; _condition: string; _limit: number }
        Returns: {
          observed_at: string
          price_mid: number
        }[]
      }
      fix_mojibake_common: { Args: { t: string }; Returns: string }
      fix_mojibake_more: { Args: { t: string }; Returns: string }
      gv_norm_name: { Args: { txt: string }; Returns: string }
      gv_num_int: { Args: { txt: string }; Returns: number }
      gv_total_int: { Args: { txt: string }; Returns: number }
      refresh_wall_thumbs_3x4: { Args: never; Returns: undefined }
      rpc_refresh_wall: { Args: never; Returns: string }
      search_cards_in_set: {
        Args: { limit?: number; q: string; set_code: string }
        Returns: {
          id: string | null
          name: string | null
          name_norm: string | null
          number: string | null
          number_int: number | null
          rarity: string | null
          set_code: string | null
          subtypes: string[] | null
          supertype: string | null
          total_int: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "v_cards_search_v2"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      squash_ws: { Args: { "": string }; Returns: string }
      strip_control: { Args: { "": string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      vault_add_item: {
        Args: {
          p_card_id: string
          p_condition?: string
          p_condition_label?: string
          p_grade?: string
          p_grade_label?: string
          p_qty?: number
          p_user_id: string
        }
        Returns: string
      }
      vault_post_to_wall: {
        Args: {
          condition?: string
          note?: string
          price_cents: number
          quantity: number
          use_vault_image?: boolean
          vault_item_id: string
        }
        Returns: string
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

