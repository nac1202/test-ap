export type ProjectStatus = 'normal' | 'warning' | 'delayed';

export interface Producer {
  id: number;
  name: string;
  email: string;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  user_name: string | null;
  role: string;
  created_at: string | null;
}

export interface ProjectTimeline {
  id: number;
  project_id: number;
  user_id: number | null;
  user_name: string | null;
  event_type: string;
  content: string | null;
  created_at: string | null;
}

export interface Project {
  id: number;
  name: string;
  producer_id: number | null;
  producer_name: string | null;
  progress_rate: number;
  deadline: string | null;
  status: ProjectStatus | string;
  member_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  timelines: ProjectTimeline[];
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  size: number;
}

export interface ProjectCreateParams {
  name: string;
  producer_id?: number | null;
  progress_rate?: number;
  deadline?: string | null;
  status?: string;
  member_user_ids?: number[];
}

export interface ProjectUpdateParams {
  name?: string;
  producer_id?: number | null;
  progress_rate?: number;
  deadline?: string | null;
  status?: string;
}

export interface ProjectQueryParams {
  status?: string;
  producer_id?: number;
  search?: string;
  page?: number;
  size?: number;
}
