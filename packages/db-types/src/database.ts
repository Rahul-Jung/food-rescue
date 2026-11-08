export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          created_at?: string;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          created_at?: string;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [];
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
    };
    Views: {
      app_settings_public: {
        Row: {
          key: string | null;
          value: Json | null;
        };
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
      now_npt: { Args: never; Returns: string };
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
