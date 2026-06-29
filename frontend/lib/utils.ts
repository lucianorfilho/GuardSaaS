import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(mb: any): string {
  const n = parseFloat(mb) || 0;
  if (n < 1024) return `${n.toFixed(1)} MB`;
  return `${(n / 1024).toFixed(2)} GB`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    success: 'text-green-400',
    online:  'text-green-400',
    failed:  'text-red-400',
    error:   'text-red-400',
    running: 'text-blue-400',
    pending: 'text-yellow-400',
    offline: 'text-gray-400',
    cancelled: 'text-gray-400',
  };
  return map[status] ?? 'text-gray-400';
}

export function statusBg(status: string): string {
  const map: Record<string, string> = {
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
    online:  'bg-green-500/10 text-green-400 border border-green-500/20',
    failed:  'bg-red-500/10 text-red-400 border border-red-500/20',
    error:   'bg-red-500/10 text-red-400 border border-red-500/20',
    running: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    offline: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    cancelled: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };
  return map[status] ?? 'bg-gray-500/10 text-gray-400';
}
