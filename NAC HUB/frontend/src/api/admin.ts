// 管理画面 共通APIクライアント

import type {
  AdminUserListResponse,
  AdminUserResponse,
  AdminUserCreateResponse,
  AdminUserCreateParams,
  AdminUserUpdateParams,
  AdminRoleResponse,
  AdminRoleUpdateParams,
  AuditLogListResponse,
  AuditLogQueryParams,
  SystemSettingsResponse,
  SystemSettingsUpdateParams,
  PublicSystemSettingsResponse,
} from '../types/admin';

const API_BASE = 'http://localhost:8000/api/v1/admin';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) {
        if (typeof data.detail === 'string') {
          errorDetail = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorDetail = data.detail
            .map((e: { msg?: string }) => e.msg || JSON.stringify(e))
            .join(', ');
        }
      }
    } catch {
      // ignore JSON parse error
    }
    const error = new Error(errorDetail) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

// ──────────────── Users ────────────────

export async function fetchAdminUsers(params: {
  search?: string;
  role_id?: number;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<AdminUserListResponse> {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.append('search', params.search.trim());
  if (params.role_id != null) q.append('role_id', params.role_id.toString());
  if (params.status && params.status !== 'all') q.append('status', params.status);
  if (params.page) q.append('page', params.page.toString());
  if (params.size) q.append('size', params.size.toString());
  const url = `${API_BASE}/users${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse<AdminUserListResponse>(res);
}

export async function fetchAdminUser(id: number): Promise<AdminUserResponse> {
  const res = await fetch(`${API_BASE}/users/${id}`, { headers: getAuthHeaders() });
  return handleResponse<AdminUserResponse>(res);
}

export async function createAdminUser(
  data: AdminUserCreateParams
): Promise<AdminUserCreateResponse> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUserCreateResponse>(res);
}

export async function updateAdminUser(
  id: number,
  data: AdminUserUpdateParams
): Promise<AdminUserResponse> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminUserResponse>(res);
}

// ──────────────── Roles ────────────────

export async function fetchAdminRoles(): Promise<AdminRoleResponse[]> {
  const res = await fetch(`${API_BASE}/roles`, { headers: getAuthHeaders() });
  return handleResponse<AdminRoleResponse[]>(res);
}

export async function updateAdminRole(
  id: number,
  data: AdminRoleUpdateParams
): Promise<AdminRoleResponse> {
  const res = await fetch(`${API_BASE}/roles/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminRoleResponse>(res);
}

// ──────────────── Audit Logs ────────────────

export async function fetchAuditLogs(
  params: AuditLogQueryParams = {}
): Promise<AuditLogListResponse> {
  const q = new URLSearchParams();
  if (params.search?.trim()) q.append('search', params.search.trim());
  if (params.action) q.append('action', params.action);
  if (params.date_from) q.append('date_from', params.date_from);
  if (params.date_to) q.append('date_to', params.date_to);
  if (params.page) q.append('page', params.page.toString());
  if (params.size) q.append('size', params.size.toString());
  const url = `${API_BASE}/audit-logs${q.toString() ? `?${q.toString()}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return handleResponse<AuditLogListResponse>(res);
}

export async function fetchAuditActions(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/audit-logs/actions`, { headers: getAuthHeaders() });
  return handleResponse<string[]>(res);
}

// ──────────────── System Settings ────────────────

export async function fetchSystemSettings(): Promise<SystemSettingsResponse> {
  const res = await fetch(`${API_BASE}/system-settings`, { headers: getAuthHeaders() });
  return handleResponse<SystemSettingsResponse>(res);
}

export async function updateSystemSettings(
  data: SystemSettingsUpdateParams
): Promise<SystemSettingsResponse> {
  const res = await fetch(`${API_BASE}/system-settings`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SystemSettingsResponse>(res);
}

export async function fetchPublicSystemSettings(): Promise<PublicSystemSettingsResponse> {
  const res = await fetch('http://localhost:8000/api/v1/system-settings/public');
  return handleResponse<PublicSystemSettingsResponse>(res);
}

// ──────────────── Plugins ────────────────

import type {
  PluginListResponse,
  PluginItemResponse,
  PluginSettingsUpdateParams,
  PluginValidationResponse,
} from '../types/admin';

export async function fetchPlugins(): Promise<PluginListResponse> {
  const res = await fetch(`${API_BASE}/plugins`, { headers: getAuthHeaders() });
  return handleResponse<PluginListResponse>(res);
}

export async function fetchPlugin(pluginKey: string): Promise<PluginItemResponse> {
  const res = await fetch(`${API_BASE}/plugins/${pluginKey}`, { headers: getAuthHeaders() });
  return handleResponse<PluginItemResponse>(res);
}

export async function updatePluginSettings(
  pluginKey: string,
  data: PluginSettingsUpdateParams
): Promise<PluginItemResponse> {
  const res = await fetch(`${API_BASE}/plugins/${pluginKey}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<PluginItemResponse>(res);
}

export async function validatePluginSettings(
  pluginKey: string
): Promise<PluginValidationResponse> {
  const res = await fetch(`${API_BASE}/plugins/${pluginKey}/validate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<PluginValidationResponse>(res);
}

export async function enablePlugin(pluginKey: string): Promise<PluginItemResponse> {
  const res = await fetch(`${API_BASE}/plugins/${pluginKey}/enable`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<PluginItemResponse>(res);
}

export async function disablePlugin(pluginKey: string): Promise<PluginItemResponse> {
  const res = await fetch(`${API_BASE}/plugins/${pluginKey}/disable`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<PluginItemResponse>(res);
}

