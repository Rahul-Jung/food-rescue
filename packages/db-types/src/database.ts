export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: 'app_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          at: string;
          before: Json | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          ip: unknown;
          user_agent: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: number;
          ip?: unknown;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          at?: string;
          before?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: number;
          ip?: unknown;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      otp_sends: {
        Row: {
          created_at: string;
          id: number;
          phone: string;
          sent_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: number;
          phone: string;
          sent_at?: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          phone?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          devanagari_digits: boolean;
          email: string | null;
          full_name: string | null;
          id: string;
          locale: string;
          marketing_pushes: boolean;
          phone: string | null;
          pickup_reminders: boolean;
          radius_m: number;
          role: Database['public']['Enums']['app_role'];
          status: Database['public']['Enums']['account_status'];
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          devanagari_digits?: boolean;
          email?: string | null;
          full_name?: string | null;
          id: string;
          locale?: string;
          marketing_pushes?: boolean;
          phone?: string | null;
          pickup_reminders?: boolean;
          radius_m?: number;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['account_status'];
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          devanagari_digits?: boolean;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          locale?: string;
          marketing_pushes?: boolean;
          phone?: string | null;
          pickup_reminders?: boolean;
          radius_m?: number;
          role?: Database['public']['Enums']['app_role'];
          status?: Database['public']['Enums']['account_status'];
        };
        Relationships: [];
      };
    };
    Views: {
      app_settings_public: {
        Row: {
          key: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key?: string | null;
          value?: Json | null;
        };
        Update: {
          key?: string | null;
          value?: Json | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      app_setting: { Args: { p_key: string }; Returns: Json };
      app_setting_public_value: { Args: { p_key: string }; Returns: Json };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      is_valid_profile_name: { Args: { p_name: string }; Returns: boolean };
      jwt_is_active: { Args: Record<PropertyKey, never>; Returns: boolean };
      jwt_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      now_npt: { Args: Record<PropertyKey, never>; Returns: string };
      otp_send_allowed: { Args: { p_phone: string }; Returns: boolean };
      update_my_profile: {
        Args: {
          p_devanagari_digits?: boolean;
          p_full_name?: string;
          p_locale?: string;
          p_marketing_pushes?: boolean;
          p_pickup_reminders?: boolean;
          p_radius_m?: number;
        };
        Returns: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          devanagari_digits: boolean;
          email: string | null;
          full_name: string | null;
          id: string;
          locale: string;
          marketing_pushes: boolean;
          phone: string | null;
          pickup_reminders: boolean;
          radius_m: number;
          role: Database['public']['Enums']['app_role'];
          status: Database['public']['Enums']['account_status'];
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      account_status: 'active' | 'suspended' | 'deleted';
      app_role: 'customer' | 'vendor' | 'admin';
      food_type: 'veg' | 'non_veg' | 'vegan';
      ledger_bucket: 'pending' | 'available' | 'paid_out';
      ledger_type: 'sale' | 'commission' | 'refund' | 'payout' | 'adjustment';
      offer_kind: 'surplus' | 'happy_hour';
      offer_status: 'draft' | 'live' | 'sold_out' | 'expired' | 'deactivated' | 'deleted';
      order_status:
        | 'pending_payment'
        | 'paid'
        | 'collected'
        | 'no_show'
        | 'cancelled_by_customer'
        | 'cancelled_by_vendor'
        | 'refunded'
        | 'expired_hold';
      pay_provider: 'esewa' | 'khalti';
      payment_status: 'initiated' | 'verified' | 'failed' | 'refunded' | 'partially_refunded';
      payout_method: 'bank' | 'esewa' | 'khalti';
      refund_status: 'requested' | 'done' | 'failed';
      vendor_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'suspended';
      vendor_type: 'restaurant' | 'grocery' | 'bakery' | 'cafe' | 'hotel' | 'other';
      withdrawal_status: 'requested' | 'approved' | 'rejected' | 'paid';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_status: ['active', 'suspended', 'deleted'],
      app_role: ['customer', 'vendor', 'admin'],
      food_type: ['veg', 'non_veg', 'vegan'],
      ledger_bucket: ['pending', 'available', 'paid_out'],
      ledger_type: ['sale', 'commission', 'refund', 'payout', 'adjustment'],
      offer_kind: ['surplus', 'happy_hour'],
      offer_status: ['draft', 'live', 'sold_out', 'expired', 'deactivated', 'deleted'],
      order_status: [
        'pending_payment',
        'paid',
        'collected',
        'no_show',
        'cancelled_by_customer',
        'cancelled_by_vendor',
        'refunded',
        'expired_hold',
      ],
      pay_provider: ['esewa', 'khalti'],
      payment_status: ['initiated', 'verified', 'failed', 'refunded', 'partially_refunded'],
      payout_method: ['bank', 'esewa', 'khalti'],
      refund_status: ['requested', 'done', 'failed'],
      vendor_status: ['draft', 'submitted', 'approved', 'rejected', 'suspended'],
      vendor_type: ['restaurant', 'grocery', 'bakery', 'cafe', 'hotel', 'other'],
      withdrawal_status: ['requested', 'approved', 'rejected', 'paid'],
    },
  },
} as const;
