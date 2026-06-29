'use client';

import { useEffect, useState } from 'react';
import { Users, RefreshCw, Shield } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, statusBg } from '@/lib/utils';

export default function AdminPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/api/clients');
      setClients(res.data);
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
          <h1 className="text-2xl font-bold text-white">Administração</h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de clientes e assinaturas</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-sm mb-2">Total de Clientes</p>
          <p className="text-3xl font-bold text-white">{clients.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-sm mb-2">Clientes Ativos</p>
          <p className="text-3xl font-bold text-green-400">
            {clients.filter(c => c.STATUS === 'active').length}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-sm mb-2">Com Plano Ativo</p>
          <p className="text-3xl font-bold text-blue-400">
            {clients.filter(c => c.PLAN_NAME).length}
          </p>
        </div>
      </div>

      {/* Tabela de clientes */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Clientes Cadastrados</h2>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente cadastrado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Cliente</th>
                  <th className="text-left pb-3 font-medium">Empresa</th>
                  <th className="text-left pb-3 font-medium">Plano</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clients.map((client: any) => (
                  <tr key={client.ID} className="hover:bg-gray-800/50 transition">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {client.NAME?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.NAME}</p>
                          <p className="text-gray-500 text-xs">{client.EMAIL}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-400">{client.COMPANY ?? '—'}</td>
                    <td className="py-3">
                      {client.PLAN_NAME ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {client.PLAN_NAME}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(client.STATUS?.toLowerCase())}`}>
                        {client.STATUS}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{formatDate(client.CREATED_AT)}</td>
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
