'use client';

import { useEffect, useState } from 'react';
import { HardDrive, Trash2, RefreshCw, FileArchive, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatBytes } from '@/lib/utils';

export default function StoragePage() {
  const [quota, setQuota]   = useState<any>(null);
  const [files, setFiles]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [quotaRes, filesRes] = await Promise.all([
        api.get('/api/storage/quota'),
        api.get('/api/storage/files')
      ]);
      setQuota(quotaRes.data);
      setFiles(filesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number, fileName: string) {
    if (!confirm(`Remover o arquivo "${fileName}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/api/storage/files/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover arquivo');
    } finally {
      setDeleting(null);
    }
  }

  const usedPct = parseFloat(quota?.limits?.used_pct || '0');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Storage</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie seus arquivos de backup</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
          <RefreshCw className="w-4 h-4" />Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Card de quota */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Storage OCI Object Storage</p>
                  <p className="text-gray-500 text-xs">Plano: {quota?.plan?.name || 'Free'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  {formatBytes(quota?.usage?.totalMB || 0)}
                </p>
                <p className="text-gray-500 text-xs">
                  de {quota?.limits?.storage_gb}GB ({quota?.limits?.used_pct}% usado)
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  usedPct >= 90 ? 'bg-red-500' :
                  usedPct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{files.length} de {quota?.limits?.max_files} arquivo(s) usado(s)</span>
              <span>{formatBytes((quota?.limits?.storage_gb * 1024) - (quota?.usage?.totalMB || 0))} disponível</span>
            </div>

            {/* Alerta de limite */}
            {files.length >= quota?.limits?.max_files && (
              <div className="mt-4 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-400 text-sm">
                  Limite de arquivos atingido. Delete um arquivo para enviar um novo backup.
                </p>
              </div>
            )}

            {usedPct >= 90 && (
              <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">
                  Storage quase cheio ({quota?.limits?.used_pct}%). Considere fazer upgrade do plano.
                </p>
              </div>
            )}
          </div>

          {/* Lista de arquivos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-4">Arquivos de Backup</h2>

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <FileArchive className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhum arquivo de backup ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FileArchive className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-gray-500 text-xs">{formatBytes(file.file_size_mb)}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-500 text-xs">{formatDate(file.created_at)}</span>
                        {file.job_name && (
                          <>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-gray-500 text-xs">{file.job_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(file.id, file.file_name)}
                      disabled={deleting === file.id}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info do plano */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-3">Detalhes do Plano</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Plano atual</p>
                <p className="text-white font-medium">{quota?.plan?.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Storage total</p>
                <p className="text-white font-medium">{quota?.limits?.storage_gb} GB</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Máx. arquivos</p>
                <p className="text-white font-medium">{quota?.limits?.max_files}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Retenção</p>
                <p className="text-white font-medium">{quota?.plan?.backup_retention_days} dias</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
