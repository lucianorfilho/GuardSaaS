'use client';

import { useEffect, useState } from 'react';
import { Server, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, statusBg } from '@/lib/utils';

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/servers');
      setServers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servidores</h1>
          <p className="text-gray-400 text-sm mt-1">Máquinas monitoradas pelo agente DBGuard</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Cards de servidores */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500">
          <Server className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum servidor cadastrado</p>
          <p className="text-xs mt-1">Instale o agente DBGuard em seu servidor para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((srv: any) => (
            <div key={srv.ID} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{srv.NAME}</p>
                    <p className="text-gray-500 text-xs">{srv.HOSTNAME ?? srv.IP_ADDRESS ?? '—'}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(srv.STATUS?.toLowerCase())}`}>
                  {srv.STATUS}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sistema</span>
                  <span className="text-gray-300">{srv.OS_TYPE ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IP</span>
                  <span className="text-gray-300">{srv.IP_ADDRESS ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Agente</span>
                  <span className="text-gray-300">v{srv.AGENT_VERSION ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Último contato</span>
                  <span className="text-gray-300">{formatDate(srv.LAST_SEEN_AT)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
