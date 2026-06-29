'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Building, Server, Archive, Clock } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatBytes, statusBg } from '@/lib/utils';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/api/clients/${id}`);
      setClient(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function approve() {
    setActing(true);
    try {
      await api.post(`/api/clients/${id}/approve`);
      await load();
    } finally { setActing(false); }
  }

  async function suspend() {
    setActing(true);
    try {
      await api.post(`/api/clients/${id}/suspend`);
      await load();
    } finally { setActing(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="text-center text-gray-500 py-20">Cliente não encontrado</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          <p className="text-gray-400 text-sm">Detalhes do cliente</p>
        </div>
        <div className="flex gap-2">
          {client.status === 'inactive' && (
            <button onClick={approve} disabled={acting}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
              {acting ? '...' : 'Aprovar'}
            </button>
          )}
          {client.status === 'active' && (
            <button onClick={suspend} disabled={acting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
              {acting ? '...' : 'Suspender'}
            </button>
          )}
          {client.status === 'suspended' && (
            <button onClick={approve} disabled={acting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
              {acting ? '...' : 'Reativar'}
            </button>
          )}
        </div>
      </div>

      {/* Informações do cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Informações de Contato</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <a href={`mailto:${client.email}`} className="text-white hover:text-blue-400 transition text-sm">
                  {client.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Telefone</p>
                <a href={`tel:${client.phone}`} className="text-white hover:text-green-400 transition text-sm">
                  {client.phone || '—'}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Building className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Empresa</p>
                <p className="text-white text-sm">{client.company || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Status da Conta</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                client.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                client.status === 'inactive' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {client.status === 'active' ? 'Ativo' : client.status === 'inactive' ? 'Pendente' : 'Suspenso'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Plano</span>
              <span className="text-white">{client.plan_name || 'Gratuito'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cadastrado em</span>
              <span className="text-white">{formatDate(client.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Servidores</span>
              <span className="text-white">{client.servers?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Agendamentos ativos</span>
              <span className="text-white">{client.schedules?.filter((s: any) => s.is_active).length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Servidores */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          Servidores ({client.servers?.length ?? 0})
        </h2>
        {client.servers?.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum servidor cadastrado</p>
        ) : (
          <div className="space-y-2">
            {client.servers?.map((srv: any) => (
              <div key={srv.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{srv.name}</p>
                  <p className="text-gray-500 text-xs">{srv.ip_address || srv.hostname || '—'} • {srv.os_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(srv.status)}`}>
                  {srv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agendamentos */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          Agendamentos ({client.schedules?.length ?? 0})
        </h2>
        {client.schedules?.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum agendamento criado</p>
        ) : (
          <div className="space-y-2">
            {client.schedules?.map((sc: any) => (
              <div key={sc.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{sc.name}</p>
                  <p className="text-gray-500 text-xs truncate max-w-xs">{sc.source_path}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{String(sc.hour).padStart(2,'0')}:{String(sc.minute).padStart(2,'0')}</span>
                  <span className={`w-2 h-2 rounded-full ${sc.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Últimos backups */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Archive className="w-4 h-4 text-green-400" />
          Últimos Backups
        </h2>
        {client.backups?.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum backup realizado ainda</p>
        ) : (
          <div className="space-y-2">
            {client.backups?.map((bk: any) => (
              <div key={bk.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">{bk.job_name}</p>
                  <p className="text-gray-500 text-xs">{bk.server_name} • {formatDate(bk.started_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {bk.file_size_mb && <span className="text-xs text-gray-400">{formatBytes(bk.file_size_mb)}</span>}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(bk.status)}`}>
                    {bk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
