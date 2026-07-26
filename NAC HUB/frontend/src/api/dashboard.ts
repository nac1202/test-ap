import type { DashboardData } from '../types/dashboard';

const API_BASE = 'http://localhost:8000/api/v1';

function getAuthHeaders(token?: string | null): Record<string, string> {
  const authToken = token || localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

export async function fetchDashboardData(token?: string | null): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const message = errorData.detail || 'ダッシュボードデータの取得に失敗しました。';
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<DashboardData>;
}
