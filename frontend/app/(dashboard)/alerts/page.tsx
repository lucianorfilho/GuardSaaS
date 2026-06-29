'use client';

import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, statusBg } from '@/lib/utils';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.SEVERITY?.toLowerCase() === filter);

  const filters = [
    { key: 'all',      label: 'Todos' },
    { key: 'critical', label: 'Crítico' },
    { key: 'error',    label: 'Erro' },
    { key: 'warning',  label: 'Aviso' },
    { key: 'info',     label: 'Info' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas</h1>
          <p className="text-gray-400 text-sm mt-1">Notificações e eventos do sistema</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum alerta encontrado</p>
          </div>
        ) : (
          filtered.map((alert: any) => (
            <div key={alert.ID} className={`flex items-start gap-4 p-4 hover:bg-gray-800/30 transition ${alert.IS_READ === 0 ? 'bg-blue-500/5' : ''}`}>
              <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                alert.SEVERITY === 'critical' ? 'bg-red-500' :
                alert.SEVERITY === 'error'    ? 'bg-red-400' :
                alert.SEVERITY === 'warning'  ? 'bg-yellow-400' : 'bg-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(alert.SEVERITY?.toLowerCase())}`}>
                    {alert.SEVERITY}
                  </span>
                  {alert.SERVER_NAME && <span className="text-gray-500 text-xs">{alert.SERVER_NAME}</span>}
                  {alert.IS_READ === 0 && <span className="text-xs text-blue-400 font-medium">Novo</span>}
                </div>
                <p className="text-gray-200 text-sm">{alert.MESSAGE}</p>
                <p className="text-gray-500 text-xs mt-1">{formatDate(alert.CREATED_AT)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
