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
