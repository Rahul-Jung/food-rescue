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
      deal_schedules: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_time: string;
          id: string;
          offer_id: string;
          start_time: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_time: string;
          id?: string;
          offer_id: string;
          start_time: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          id?: string;
          offer_id?: string;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'deal_schedules_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
        ];
      };
      featured_slots: {
        Row: {
          amount_paid: number;
          created_at: string;
          created_by: string | null;
          ended: boolean;
          ends_at: string;
          id: string;
          note: string | null;
          starts_at: string;
          updated_at: string;
          vendor_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_paid?: number;
          created_at?: string;
          created_by?: string | null;
          ended?: boolean;
          ends_at: string;
          id?: string;
          note?: string | null;
          starts_at: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          amount_paid?: number;
          created_at?: string;
          created_by?: string | null;
          ended?: boolean;
          ends_at?: string;
          id?: string;
          note?: string | null;
          starts_at?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'featured_slots_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_slots_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'featured_slots_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors_public';
            referencedColumns: ['id'];
          },
        ];
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
      offer_images: {
        Row: {
          created_at: string;
          id: string;
          offer_id: string;
          path: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          offer_id: string;
          path: string;
          position: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          offer_id?: string;
          path?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'offer_images_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
        ];
      };
      offers: {
        Row: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
          check_can_go_live: undefined | null;
        };
        ComputedFields: 'check_can_go_live';
        Insert: {
          created_at?: string;
          deal_discount_pct?: number | null;
          description?: string | null;
          discount_pct?: never;
          expires_at?: string | null;
          food_type?: Database['public']['Enums']['food_type'] | null;
          id?: string;
          ingredients?: string | null;
          location?: unknown;
          offer_kind?: Database['public']['Enums']['offer_kind'];
          original_price?: number | null;
          pickup_end?: string | null;
          pickup_start?: string | null;
          price?: number | null;
          quantity_reserved?: number;
          quantity_total?: number | null;
          search_tsv?: never;
          status?: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne?: string | null;
          updated_at?: string;
          vendor_id: string;
          version?: number;
          weight_g?: number | null;
        };
        Update: {
          created_at?: string;
          deal_discount_pct?: number | null;
          description?: string | null;
          discount_pct?: never;
          expires_at?: string | null;
          food_type?: Database['public']['Enums']['food_type'] | null;
          id?: string;
          ingredients?: string | null;
          location?: unknown;
          offer_kind?: Database['public']['Enums']['offer_kind'];
          original_price?: number | null;
          pickup_end?: string | null;
          pickup_start?: string | null;
          price?: number | null;
          quantity_reserved?: number;
          quantity_total?: number | null;
          search_tsv?: never;
          status?: Database['public']['Enums']['offer_status'];
          title?: string;
          title_ne?: string | null;
          updated_at?: string;
          vendor_id?: string;
          version?: number;
          weight_g?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'offers_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'offers_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors_public';
            referencedColumns: ['id'];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          at: string;
          created_at: string;
          from_status: Database['public']['Enums']['order_status'] | null;
          id: number;
          order_id: string;
          reason: string | null;
          to_status: Database['public']['Enums']['order_status'];
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          at?: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['order_status'] | null;
          id?: number;
          order_id: string;
          reason?: string | null;
          to_status: Database['public']['Enums']['order_status'];
        };
        Update: {
          actor_id?: string | null;
          at?: string;
          created_at?: string;
          from_status?: Database['public']['Enums']['order_status'] | null;
          id?: number;
          order_id?: string;
          reason?: string | null;
          to_status?: Database['public']['Enums']['order_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'vendor_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string | null;
          code_attempts: number;
          code_locked_until: string | null;
          collected_at: string | null;
          commission_rate_bp: number;
          created_at: string;
          customer_id: string;
          hold_expires_at: string | null;
          id: string;
          offer_id: string;
          paid_at: string | null;
          payment_mode: string;
          quantity: number;
          status: Database['public']['Enums']['order_status'];
          total: number;
          unit_price: number;
          updated_at: string;
          vendor_id: string;
        };
        ComputedFields: never;
        Insert: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string | null;
          code_attempts?: number;
          code_locked_until?: string | null;
          collected_at?: string | null;
          commission_rate_bp: number;
          created_at?: string;
          customer_id: string;
          hold_expires_at?: string | null;
          id?: string;
          offer_id: string;
          paid_at?: string | null;
          payment_mode?: string;
          quantity: number;
          status?: Database['public']['Enums']['order_status'];
          total: number;
          unit_price: number;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          code?: string | null;
          code_attempts?: number;
          code_locked_until?: string | null;
          collected_at?: string | null;
          commission_rate_bp?: number;
          created_at?: string;
          customer_id?: string;
          hold_expires_at?: string | null;
          id?: string;
          offer_id?: string;
          paid_at?: string | null;
          payment_mode?: string;
          quantity?: number;
          status?: Database['public']['Enums']['order_status'];
          total?: number;
          unit_price?: number;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_cancelled_by_fkey';
            columns: ['cancelled_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors_public';
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
          vendor_public_json: Json | null;
        };
        ComputedFields: 'lat' | 'lng' | 'vendor_missing_fields' | 'vendor_public_json';
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
      waitlist: {
        Row: {
          area: string | null;
          contact: string;
          created_at: string;
          id: string;
          point: unknown;
        };
        ComputedFields: never;
        Insert: {
          area?: string | null;
          contact: string;
          created_at?: string;
          id?: string;
          point?: unknown;
        };
        Update: {
          area?: string | null;
          contact?: string;
          created_at?: string;
          id?: string;
          point?: unknown;
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
      vendor_orders: {
        Row: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          code: string | null;
          collected_at: string | null;
          commission_rate_bp: number;
          created_at: string;
          customer_name: string | null;
          hold_expires_at: string | null;
          id: string;
          offer_id: string;
          offer_title: string;
          paid_at: string | null;
          payment_mode: string;
          pickup_end: string | null;
          pickup_start: string | null;
          quantity: number;
          status: Database['public']['Enums']['order_status'];
          total: number;
          unit_price: number;
          updated_at: string;
          vendor_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: 'orders_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors_public';
            referencedColumns: ['id'];
          },
        ];
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
      admin_set_featured: {
        Args: {
          p_amount_paid: number;
          p_ends_at: string;
          p_note?: string;
          p_slot_id?: string;
          p_starts_at: string;
          p_vendor_id: string;
        };
        Returns: {
          amount_paid: number;
          created_at: string;
          created_by: string | null;
          ended: boolean;
          ends_at: string;
          id: string;
          note: string | null;
          starts_at: string;
          updated_at: string;
          vendor_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'featured_slots';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_suspend_user: { Args: { p_reason: string; p_user_id: string }; Returns: undefined };
      app_setting: { Args: { p_key: string }; Returns: Json };
      app_setting_public_value: { Args: { p_key: string }; Returns: Json };
      caller_offer: {
        Args: { p_offer_id: string };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      caller_vendor: {
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
      check_can_go_live: {
        Args: {
          o: Omit<
            Database['public']['Tables']['offers']['Row'],
            Database['public']['Tables']['offers']['ComputedFields']
          >;
        };
        Returns: undefined;
      };
      check_surplus_times: {
        Args: { p_end: string; p_expires: string; p_start: string };
        Returns: undefined;
      };
      clone_offer: {
        Args: {
          p_expires_at?: string;
          p_offer_id: string;
          p_pickup_end: string;
          p_pickup_start: string;
        };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      confirm_offer_images: {
        Args: { p_offer_id: string; p_positions: number[] };
        Returns: {
          created_at: string;
          id: string;
          offer_id: string;
          path: string;
          position: number;
        }[];
        SetofOptions: {
          from: '*';
          to: 'offer_images';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_offer: {
        Args: { p_offer: Json };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_order_hold: {
        Args: { p_customer_id: string; p_offer_id: string; p_quantity: number };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string | null;
          code_attempts: number;
          code_locked_until: string | null;
          collected_at: string | null;
          commission_rate_bp: number;
          created_at: string;
          customer_id: string;
          hold_expires_at: string | null;
          id: string;
          offer_id: string;
          paid_at: string | null;
          payment_mode: string;
          quantity: number;
          status: Database['public']['Enums']['order_status'];
          total: number;
          unit_price: number;
          updated_at: string;
          vendor_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      deal_live_until: { Args: { p_at?: string; p_offer_id: string }; Returns: string };
      deal_next_start: { Args: { p_at?: string; p_offer_id: string }; Returns: string };
      expire_featured: { Args: Record<PropertyKey, never>; Returns: number };
      expire_offers: { Args: Record<PropertyKey, never>; Returns: Json };
      generate_pickup_code: { Args: { p_vendor_id: string }; Returns: string };
      is_deal_live: { Args: { p_at?: string; p_offer_id: string }; Returns: boolean };
      is_valid_profile_name: { Args: { p_name: string }; Returns: boolean };
      join_waitlist: {
        Args: { p_area?: string; p_contact: string; p_lat?: number; p_lng?: number };
        Returns: string;
      };
      jsonb_text: { Args: { k: string; p: Json }; Returns: string };
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
      nearby_offers: {
        Args: {
          p_food_type?: Database['public']['Enums']['food_type'];
          p_kind?: Database['public']['Enums']['offer_kind'];
          p_lat: number;
          p_lng: number;
          p_page?: number;
          p_pickup_after?: string;
          p_price_max?: number;
          p_price_min?: number;
          p_q?: string;
          p_radius_m?: number;
          p_sort?: string;
          p_vendor_type?: Database['public']['Enums']['vendor_type'];
        };
        Returns: {
          deal_live: boolean;
          discount_pct: number;
          distance_m: number;
          expires_at: string;
          food_type: Database['public']['Enums']['food_type'];
          id: string;
          is_featured: boolean;
          lat: number;
          lng: number;
          next_start: string;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number;
          pickup_end: string;
          pickup_start: string;
          price: number;
          quantity_left: number;
          title: string;
          title_ne: string;
          vendor_id: string;
          vendor_name: string;
          vendor_type: Database['public']['Enums']['vendor_type'];
        }[];
      };
      now_npt: { Args: Record<PropertyKey, never>; Returns: string };
      offer_detail: { Args: { p_offer_id: string }; Returns: Json };
      offer_open_orders: { Args: { p_offer_id: string }; Returns: number };
      offer_public_json: {
        Args: {
          o: Omit<
            Database['public']['Tables']['offers']['Row'],
            Database['public']['Tables']['offers']['ComputedFields']
          >;
          p_at: string;
        };
        Returns: Json;
      };
      offer_visible_to_customers: { Args: { p_offer_id: string }; Returns: boolean };
      order_has_verified_payment: { Args: { p_order_id: string }; Returns: boolean };
      order_move_allowed: {
        Args: {
          p_from: Database['public']['Enums']['order_status'];
          p_to: Database['public']['Enums']['order_status'];
        };
        Returns: boolean;
      };
      order_visible_to: { Args: { p_order_id: string }; Returns: boolean };
      otp_send_allowed: { Args: { p_phone: string }; Returns: boolean };
      raise_offer_check: { Args: { p_constraint: string }; Returns: undefined };
      recovery_code_hash: { Args: { p_code: string }; Returns: string };
      register_push_token: {
        Args: { p_expo_token: string; p_platform: string };
        Returns: undefined;
      };
      release_holds: { Args: Record<PropertyKey, never>; Returns: number };
      search_query: { Args: { p_q: string }; Returns: unknown };
      set_offer_status: {
        Args: { p_offer_id: string; p_status: Database['public']['Enums']['offer_status'] };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      short_name: { Args: { p_full_name: string }; Returns: string };
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
      transition_order: {
        Args: {
          p_actor_id?: string;
          p_order_id: string;
          p_reason?: string;
          p_to_status: Database['public']['Enums']['order_status'];
        };
        Returns: {
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          code: string | null;
          code_attempts: number;
          code_locked_until: string | null;
          collected_at: string | null;
          commission_rate_bp: number;
          created_at: string;
          customer_id: string;
          hold_expires_at: string | null;
          id: string;
          offer_id: string;
          paid_at: string | null;
          payment_mode: string;
          quantity: number;
          status: Database['public']['Enums']['order_status'];
          total: number;
          unit_price: number;
          updated_at: string;
          vendor_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
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
      update_offer: {
        Args: { p_changes: Json; p_offer_id: string; p_version: number };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_deal: {
        Args: { p_deal: Json; p_offer_id: string; p_schedules: Json; p_version?: number };
        Returns: {
          created_at: string;
          deal_discount_pct: number | null;
          description: string | null;
          discount_pct: number | null;
          expires_at: string | null;
          food_type: Database['public']['Enums']['food_type'] | null;
          id: string;
          ingredients: string | null;
          location: unknown;
          offer_kind: Database['public']['Enums']['offer_kind'];
          original_price: number | null;
          pickup_end: string | null;
          pickup_start: string | null;
          price: number | null;
          quantity_reserved: number;
          quantity_total: number | null;
          search_tsv: unknown;
          status: Database['public']['Enums']['offer_status'];
          title: string;
          title_ne: string | null;
          updated_at: string;
          vendor_id: string;
          version: number;
          weight_g: number | null;
        };
        SetofOptions: {
          from: '*';
          to: 'offers';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      vendor_dashboard: { Args: Record<PropertyKey, never>; Returns: Json };
      vendor_is_approved: { Args: { p_vendor_id: string }; Returns: boolean };
      vendor_is_featured: { Args: { p_at?: string; p_vendor_id: string }; Returns: boolean };
      vendor_missing_fields: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vendors']['Row'],
            Database['public']['Tables']['vendors']['ComputedFields']
          >;
        };
        Returns: string[];
      };
      vendor_page: { Args: { p_vendor_id: string }; Returns: Json };
      vendor_public_json: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vendors']['Row'],
            Database['public']['Tables']['vendors']['ComputedFields']
          >;
        };
        Returns: Json;
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
