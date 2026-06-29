export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'client';
  company?: string;
  phone?: string;
  status: string;
}

export interface Server {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  os_type: string;
  status: 'online' | 'offline' | 'error';
  agent_version: string;
  last_seen_at: string;
}

export interface BackupJob {
  id: number;
  job_name: string;
  backup_type: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  file_name: string;
  file_size_mb: number;
  started_at: string;
  finished_at: string;
  error_message?: string;
  server_name: string;
}

export interface Alert {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  is_read: number;
  created_at: string;
  server_name?: string;
}

export interface DashboardSummary {
  servers: { total: number; online: number };
  jobs: { total: number; success: number; failed: number };
  alerts: { total: number; unread: number };
  storageUsedMB: number;
}
