// 管理画面 共通型定義

export interface AdminUserResponse {
  id: number;
  company_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: number;
  role_name: string | null;
  status: string;
  must_change_password: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUserCreateResponse extends AdminUserResponse {
  initial_password: string;
}

export interface AdminUserListResponse {
  total: number;
  page: number;
  size: number;
  items: AdminUserResponse[];
}

export interface AdminUserCreateParams {
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  status?: string;
}

export interface AdminUserUpdateParams {
  first_name?: string;
  last_name?: string;
  role_id?: number;
  status?: string;
}

export interface AdminRoleResponse {
  id: number;
  name: string;
  permissions: Record<string, unknown> | null;
  user_count: number;
  is_system: boolean;
}

export interface AdminRoleUpdateParams {
  name?: string;
  permissions?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_email: string | null;
  user_display_name: string | null;
  action: string;
  details_summary: string;
  display_details?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  size: number;
  items: AuditLogEntry[];
}

export interface AuditLogQueryParams {
  search?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
}

// ──────────────── システム設定 ────────────────

export interface SystemVersionInfo {
  version: string;
  build_number: string;
  updated_at: string;
}

export interface SystemSettingsResponse {
  company_name: string;
  system_name: string;
  theme_color: string;
  timezone: string;
  notice_display_count: number;
  maintenance_mode: boolean;
  version_info: SystemVersionInfo;
}

export interface SystemSettingsUpdateParams {
  company_name: string;
  system_name: string;
  theme_color: string;
  timezone: string;
  notice_display_count: number;
  maintenance_mode: boolean;
}

export interface PublicSystemSettingsResponse {
  company_name: string;
  system_name: string;
  theme_color: string;
  timezone: string;
  maintenance_mode: boolean;
  version_info: SystemVersionInfo;
}

// ──────────────── プラグイン管理 ────────────────

export type PluginStatus =
  | 'not_configured'
  | 'configured'
  | 'needs_credentials'
  | 'not_implemented'
  | 'disabled'
  | 'error'
  | 'connected'
  | 'connection_error';

export interface PluginItemResponse {
  plugin_key: string;
  display_name: string;
  category: string;
  description: string;
  is_enabled: boolean;
  status: PluginStatus;
  status_label: string;
  settings: Record<string, unknown>;
  last_tested_at: string | null;
  last_validation_result: string | null;
  connected: boolean;
  // NotePM など実API連携プラグイン用（トークンの値は返らない。設定済みかの真偽のみ）
  credentials_configured?: boolean | null;
  allowed_note_count?: number | null;
  allowed_note_names?: string[];
  warnings?: string[];
}

export interface PluginListResponse {
  total: number;
  items: PluginItemResponse[];
}

export interface PluginSettingsUpdateParams {
  settings: Record<string, unknown>;
}

export interface PluginValidationResponse {
  success: boolean;
  status: PluginStatus;
  status_label: string;
  message: string;
  tested_at: string;
  warnings?: string[];
}

// NotePM 参照許可ノート選択（管理者専用画面でのみ使用）
export interface NotePMNoteItem {
  note_code: string;
  name: string;
  description: string;
  scope_label: string;
  allowed: boolean;
}

export interface NotePMNotesResponse {
  total: number;
  items: NotePMNoteItem[];
  allowed_count: number;
  max_allowed: number;
}

