// Generated Supabase types (scripts/gen-types.sh). Do not edit database.ts by hand.
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './database';

import type { Database } from './database';

export type AppSettingRow = Database['public']['Tables']['app_settings']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];
export type OrderStatusEnum = Database['public']['Enums']['order_status'];
