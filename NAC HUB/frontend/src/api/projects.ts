import type {
  Project,
  ProjectDetail,
  ProjectListResponse,
  ProjectQueryParams,
  ProjectCreateParams,
  ProjectUpdateParams,
  ProjectMember,
  ProjectTimeline,
} from '../types/project';

const API_BASE = 'http://localhost:8000/api/v1/projects';

function getAuthHeaders(token?: string | null): Record<string, string> {
  const authToken = token || localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
          errorDetail = data.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', ');
        }
      }
    } catch {
      // Ignore JSON parse error
    }
    const error = new Error(errorDetail) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

export async function fetchProjects(
  params: ProjectQueryParams = {},
  token?: string | null
): Promise<ProjectListResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.producer_id) query.append('producer_id', params.producer_id.toString());
  if (params.search && params.search.trim()) query.append('search', params.search.trim());
  if (params.page) query.append('page', params.page.toString());
  if (params.size) query.append('size', params.size.toString());

  const url = `${API_BASE}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders(token) });
  return handleResponse<ProjectListResponse>(res);
}

export async function fetchProjectDetail(
  id: number | string,
  token?: string | null
): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE}/${id}`, { headers: getAuthHeaders(token) });
  return handleResponse<ProjectDetail>(res);
}

export async function createProject(
  data: ProjectCreateParams,
  token?: string | null
): Promise<Project> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(res);
}

export async function updateProject(
  id: number | string,
  data: ProjectUpdateParams,
  token?: string | null
): Promise<Project> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(res);
}

export async function deleteProject(
  id: number | string,
  token?: string | null
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ message: string }>(res);
}

export async function addProjectMember(
  projectId: number | string,
  userId: number,
  role: string = 'member',
  token?: string | null
): Promise<ProjectMember> {
  const res = await fetch(`${API_BASE}/${projectId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ user_id: userId, role }),
  });
  return handleResponse<ProjectMember>(res);
}

export async function removeProjectMember(
  projectId: number | string,
  userId: number,
  token?: string | null
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/${projectId}/members/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse<{ message: string }>(res);
}

export async function addProjectTimeline(
  projectId: number | string,
  eventType: string,
  content: string,
  token?: string | null
): Promise<ProjectTimeline> {
  const res = await fetch(`${API_BASE}/${projectId}/timelines`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ event_type: eventType, content }),
  });
  return handleResponse<ProjectTimeline>(res);
}
