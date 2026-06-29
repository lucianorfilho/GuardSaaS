'use client';

import { useEffect, useState } from 'react';
import { Server, HardDrive, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, chartRes, jobsRes] = await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/dashboard/chart'),
          api.get('/api/backups'),
        ]);
        setSummary(sumRes.data);
        setChart(chartRes.data.map((d: any) => ({
          day: new Date(d.DAY).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          Sucesso: d.SUCCESS,
          Falha: d.FAILED,
        })));
        setRecentJobs(jobsRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      success:   'bg-green-500/10 text-green-400 border border-green-500/20',
      failed:    'bg-red-500/10 text-red-400 border border-red-500/20',
      running:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      pending:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
    };
    return map[status] ?? 'bg-gray-500/10 text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Visão geral dos seus backups</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Server}       label="Servidores"          value={summary?.servers?.total ?? 0}   sub={`${summary?.servers?.online ?? 0} online`}          color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={CheckCircle}  label="Backups com Sucesso" value={summary?.jobs?.success ?? 0}    sub={`de ${summary?.jobs?.total ?? 0} total`}             color="bg-green-500/10 text-green-400" />
        <StatCard icon={XCircle}      label="Backups com Falha"   value={summary?.jobs?.failed ?? 0}     sub="últimos registros"                                   color="bg-red-500/10 text-red-400" />
        <StatCard icon={HardDrive}    label="Storage Utilizado"   value={formatBytes(summary?.storageUsedMB ?? 0)} sub="total enviado"                             color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Backups — Últimos 30 dias</h2>
        {chart.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Nenhum dado disponível ainda</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="Sucesso" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Falha"   stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Últimos Backups</h2>
        {recentJobs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhum backup registrado ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Job</th>
                  <th className="text-left pb-3 font-medium">Servidor</th>
                  <th className="text-left pb-3 font-medium">Tipo</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Tamanho</th>
                  <th className="text-left pb-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-800/50 transition">
                    <td className="py-3 text-white font-medium">{job.job_name}</td>
                    <td className="py-3 text-gray-400">{job.server_name ?? '—'}</td>
                    <td className="py-3 text-gray-400 capitalize">{job.backup_type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(job.status?.toLowerCase())}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{job.file_size_mb ? formatBytes(job.file_size_mb) : '—'}</td>
                    <td className="py-3 text-gray-400">{formatDate(job.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
