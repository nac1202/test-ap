export interface ProjectSummary {
  total: number;
  normal: number;
  warning: number;
  delayed: number;
  due_soon: number;
}

export interface RecentProjectItem {
  id: number;
  name: string;
  status: string;
  progress_rate: number;
  deadline: string | null;
  viewed_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string | null;
  category: string;
  is_read: boolean;
  created_at: string;
}

export interface TaskItem {
  id: number;
  title: string;
  status: string;
  due_date: string | null;
}

export interface IntegrationsState {
  weather: boolean;
  hotbiz: boolean;
  slack: boolean;
  notepm: boolean;
  google_drive: boolean;
}

export interface DashboardData {
  generated_at: string;
  project_summary: ProjectSummary;
  recent_projects: RecentProjectItem[];
  notifications: NotificationItem[];
  tasks: TaskItem[];
  integrations: IntegrationsState;
}
