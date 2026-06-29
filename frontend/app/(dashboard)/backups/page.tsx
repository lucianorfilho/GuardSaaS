'use client';

import { useEffect, useState } from 'react';
import { Archive, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { BackupJob } from '@/types';
import { formatBytes, formatDate, statusBg } from '@/lib/utils';

export default function BackupsPage() {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/backups');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status?.toLowerCase() === filter);

  const filters = [
    { key: 'all',     label: 'Todos' },
    { key: 'success', label: 'Sucesso' },
    { key: 'failed',  label: 'Falha' },
    { key: 'running', label: 'Executando' },
    { key: 'pending', label: 'Pendente' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Backups</h1>
          <p className="text-gray-400 text-sm mt-1">Histórico completo de jobs de backup</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Archive className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum backup encontrado</p>
          </div>
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
                  <th className="text-left pb-3 font-medium">Início</th>
                  <th className="text-left pb-3 font-medium">Fim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((job: any) => (
                  <tr key={job.ID} className="hover:bg-gray-800/50 transition">
                    <td className="py-3">
                      <p className="text-white font-medium">{job.job_name}</p>
                      {job.file_name && (
                        <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{job.file_name}</p>
                      )}
                    </td>
                    <td className="py-3 text-gray-400">{job.server_name ?? '—'}</td>
                    <td className="py-3 text-gray-400 capitalize">{job.backup_type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(job.status?.toLowerCase())}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {job.file_size_mb ? formatBytes(job.file_size_mb) : '—'}
                    </td>
                    <td className="py-3 text-gray-400">{formatDate(job.started_at)}</td>
                    <td className="py-3 text-gray-400">{formatDate(job.finished_at)}</td>
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
