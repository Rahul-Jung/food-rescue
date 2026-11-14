export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_recovery_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          id: number;
          used_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          id?: number;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          id?: number;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_recovery_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
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
      notifications: {
        Row: {
          body_key: string;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          read_at: string | null;
          title_key: string;
          type: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body_key: string;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          title_key: string;
          type: string;
          user_id: string;
        };
        Update: {
          body_key?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          read_at?: string | null;
          title_key?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      push_tokens: {
        Row: {
          created_at: string;
          expo_token: string;
          id: string;
          last_seen: string;
          platform: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expo_token: string;
          id?: string;
          last_seen?: string;
          platform: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expo_token?: string;
          id?: string;
          last_seen?: string;
          platform?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_hours: {
        Row: {
          closes: string;
          day_of_week: number;
          opens: string;
          vendor_id: string;
        };
        ComputedFields: never;
        Insert: {
          closes: string;
          day_of_week: number;
          opens: string;
          vendor_id: string;
        };
        Update: {
          closes?: string;
          day_of_week?: number;
          opens?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendor_hours_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vendor_hours_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors_public';
            referencedColumns: ['id'];
          },
        ];
      };
      vendors: {
        Row: {
          address: string | null;
          approved_at: string | null;
          area: string | null;
          commission_free_until: string | null;
          commission_rate_bp: number;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          landmark: string | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          owner_id: string;
          pan_doc_path: string | null;
          pan_vat_no: string | null;
          payout_account: Json | null;
          payout_method: Database['public']['Enums']['payout_method'] | null;
          pending_review: boolean;
          phone: string | null;
          reject_reason: string | null;
          status: Database['public']['Enums']['vendor_status'];
          strikes_30d: number;
          type: Database['public']['Enums']['vendor_type'];
          updated_at: string;
          lat: number | null;
          lng: number | null;
          vendor_missing_fields: string[] | null;
        };
        ComputedFields: 'lat' | 'lng' | 'vendor_missing_fields';
        Insert: {
          address?: string | null;
          approved_at?: string | null;
          area?: string | null;
          commission_free_until?: string | null;
          commission_rate_bp?: number;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          landmark?: string | null;
          location?: unknown;
          logo_url?: string | null;
          name?: string;
          owner_id: string;
          pan_doc_path?: string | null;
          pan_vat_no?: string | null;
          payout_account?: Json | null;
          payout_method?: Database['public']['Enums']['payout_method'] | null;
          pending_review?: boolean;
          phone?: string | null;
          reject_reason?: string | null;
          status?: Database['public']['Enums']['vendor_status'];
          strikes_30d?: number;
          type?: Database['public']['Enums']['vendor_type'];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          approved_at?: string | null;
          area?: string | null;
          commission_free_until?: string | null;
          commission_rate_bp?: number;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          landmark?: string | null;
          location?: unknown;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          pan_doc_path?: string | null;
          pan_vat_no?: string | null;
          payout_account?: Json | null;
          payout_method?: Database['public']['Enums']['payout_method'] | null;
          pending_review?: boolean;
          phone?: string | null;
          reject_reason?: string | null;
          status?: Database['public']['Enums']['vendor_status'];
          strikes_30d?: number;
          type?: Database['public']['Enums']['vendor_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vendors_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
      vendors_public: {
        Row: {
          area: string | null;
          description: string | null;
          id: string;
          landmark: string | null;
          lat: number | null;
          lng: number | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          phone: string | null;
          type: Database['public']['Enums']['vendor_type'];
        };
        ComputedFields: never;
        Insert: {
          area?: string | null;
          description?: string | null;
          id?: string | null;
          landmark?: string | null;
          lat?: never;
          lng?: never;
          location?: unknown;
          logo_url?: string | null;
          name?: string | null;
          phone?: string | null;
          type?: Database['public']['Enums']['vendor_type'] | null;
        };
        Update: {
          area?: string | null;
          description?: string | null;
          id?: string | null;
          landmark?: string | null;
          lat?: never;
          lng?: never;
          location?: unknown;
          logo_url?: string | null;
          name?: string | null;
          phone?: string | null;
          type?: Database['public']['Enums']['vendor_type'] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_approve_vendor: {
        Args: { p_vendor_id: string };
        Returns: {
          address: string | null;
          approved_at: string | null;
          area: string | null;
          commission_free_until: string | null;
          commission_rate_bp: number;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          landmark: string | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          owner_id: string;
          pan_doc_path: string | null;
          pan_vat_no: string | null;
          payout_account: Json | null;
          payout_method: Database['public']['Enums']['payout_method'] | null;
          pending_review: boolean;
          phone: string | null;
          reject_reason: string | null;
          status: Database['public']['Enums']['vendor_status'];
          strikes_30d: number;
          type: Database['public']['Enums']['vendor_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'vendors';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_generate_recovery_codes: { Args: Record<PropertyKey, never>; Returns: string[] };
      admin_log_login: { Args: { p_ip?: string; p_user_agent?: string }; Returns: undefined };
      admin_redeem_recovery_code: { Args: { p_code: string }; Returns: boolean };
      admin_reject_vendor: {
        Args: { p_reason: string; p_vendor_id: string };
        Returns: {
          address: string | null;
          approved_at: string | null;
          area: string | null;
          commission_free_until: string | null;
          commission_rate_bp: number;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          landmark: string | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          owner_id: string;
          pan_doc_path: string | null;
          pan_vat_no: string | null;
          payout_account: Json | null;
          payout_method: Database['public']['Enums']['payout_method'] | null;
          pending_review: boolean;
          phone: string | null;
          reject_reason: string | null;
          status: Database['public']['Enums']['vendor_status'];
          strikes_30d: number;
          type: Database['public']['Enums']['vendor_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'vendors';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_require: { Args: Record<PropertyKey, never>; Returns: string };
      admin_set_commission: {
        Args: { p_free_until: string; p_rate_bp: number; p_reason?: string; p_vendor_id: string };
        Returns: {
          address: string | null;
          approved_at: string | null;
          area: string | null;
          commission_free_until: string | null;
          commission_rate_bp: number;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          landmark: string | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          owner_id: string;
          pan_doc_path: string | null;
          pan_vat_no: string | null;
          payout_account: Json | null;
          payout_method: Database['public']['Enums']['payout_method'] | null;
          pending_review: boolean;
          phone: string | null;
          reject_reason: string | null;
          status: Database['public']['Enums']['vendor_status'];
          strikes_30d: number;
          type: Database['public']['Enums']['vendor_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'vendors';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_suspend_user: { Args: { p_reason: string; p_user_id: string }; Returns: undefined };
      app_setting: { Args: { p_key: string }; Returns: Json };
      app_setting_public_value: { Args: { p_key: string }; Returns: Json };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      is_valid_profile_name: { Args: { p_name: string }; Returns: boolean };
      jwt_is_active: { Args: Record<PropertyKey, never>; Returns: boolean };
      jwt_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      jwt_owns_pan_path: { Args: { p_name: string }; Returns: boolean };
      jwt_owns_vendor: { Args: { p_vendor_id: string }; Returns: boolean };
      lat: {
        Args: { '': Database['public']['Tables']['vendors']['Row'] };
        Returns: {
          error: true;
        } & 'the function public.lat with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache';
      };
      lng: {
        Args: { '': Database['public']['Tables']['vendors']['Row'] };
        Returns: {
          error: true;
        } & 'the function public.lng with parameter or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache';
      };
      now_npt: { Args: Record<PropertyKey, never>; Returns: string };
      otp_send_allowed: { Args: { p_phone: string }; Returns: boolean };
      recovery_code_hash: { Args: { p_code: string }; Returns: string };
      register_push_token: {
        Args: { p_expo_token: string; p_platform: string };
        Returns: undefined;
      };
      start_vendor_signup: { Args: Record<PropertyKey, never>; Returns: string };
      submit_vendor_application: {
        Args: Record<PropertyKey, never>;
        Returns: {
          address: string | null;
          approved_at: string | null;
          area: string | null;
          commission_free_until: string | null;
          commission_rate_bp: number;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          landmark: string | null;
          location: unknown;
          logo_url: string | null;
          name: string;
          owner_id: string;
          pan_doc_path: string | null;
          pan_vat_no: string | null;
          payout_account: Json | null;
          payout_method: Database['public']['Enums']['payout_method'] | null;
          pending_review: boolean;
          phone: string | null;
          reject_reason: string | null;
          status: Database['public']['Enums']['vendor_status'];
          strikes_30d: number;
          type: Database['public']['Enums']['vendor_type'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'vendors';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
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
      vendor_is_approved: { Args: { p_vendor_id: string }; Returns: boolean };
      vendor_missing_fields: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vendors']['Row'],
            Database['public']['Tables']['vendors']['ComputedFields']
          >;
        };
        Returns: string[];
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
