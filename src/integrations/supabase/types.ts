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
      orders: {
        Row: {
          admin_notes: string
          contact_preference: Database["public"]["Enums"]["contact_pref"]
          created_at: string
          custom_description: string
          email: string
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          full_name: string
          id: string
          needed_date: string
          needed_time: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          product_id: string
          product_name: string
          quantity: number
          size_id: string | null
          size_name: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          updated_at: string
          user_id: string | null
          vase_added: boolean
          vase_price_cents: number
        }
        Insert: {
          admin_notes?: string
          contact_preference: Database["public"]["Enums"]["contact_pref"]
          created_at?: string
          custom_description?: string
          email: string
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          full_name: string
          id?: string
          needed_date: string
          needed_time: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          product_id: string
          product_name: string
          quantity?: number
          size_id?: string | null
          size_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          updated_at?: string
          user_id?: string | null
          vase_added?: boolean
          vase_price_cents?: number
        }
        Update: {
          admin_notes?: string
          contact_preference?: Database["public"]["Enums"]["contact_pref"]
          created_at?: string
          custom_description?: string
          email?: string
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          full_name?: string
          id?: string
          needed_date?: string
          needed_time?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size_id?: string | null
          size_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          updated_at?: string
          user_id?: string | null
          vase_added?: boolean
          vase_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_photos: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          id: string
          name: string
          price_delta_cents: number
          product_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          price_delta_cents?: number
          product_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          price_delta_cents?: number
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price_cents: number
          created_at: string
          description: string
          id: string
          is_featured: boolean
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_price_cents?: number
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_price_cents?: number
          created_at?: string
          description?: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          body: string
          created_at: string
          id: string
          order_id: string | null
          photo_path: string | null
          product_id: string
          rating: number
          reviewer_name: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string | null
          photo_path?: string | null
          product_id: string
          rating: number
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string | null
          photo_path?: string | null
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      contact_pref: "text" | "email"
      fulfillment_type: "pickup" | "delivery"
      order_status: "new" | "accepted" | "completed" | "cancelled" | "rejected"
      payment_method: "online" | "in_person"
      review_status: "pending" | "approved" | "hidden"
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
      app_role: ["admin", "user"],
      contact_pref: ["text", "email"],
      fulfillment_type: ["pickup", "delivery"],
      order_status: ["new", "accepted", "completed", "cancelled", "rejected"],
      payment_method: ["online", "in_person"],
      review_status: ["pending", "approved", "hidden"],
    },
  },
} as const
