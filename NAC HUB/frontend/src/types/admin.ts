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

