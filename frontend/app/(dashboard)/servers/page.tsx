'use client';

import { useEffect, useState } from 'react';
import { Server, RefreshCw, Plus, Trash2, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, statusBg } from '@/lib/utils';

const OS_OPTIONS = [
  { value: 'linux-debian',  label: '🐧 Linux — Debian/Ubuntu' },
  { value: 'linux-redhat',  label: '🎩 Linux — RedHat/CentOS/Rocky' },
  { value: 'windows',       label: '🪟 Windows' },
];

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', hostname: '', ip_address: '', os_type: 'linux-debian' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/servers', form);
      setForm({ name: '', hostname: '', ip_address: '', os_type: 'linux-debian' });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar servidor');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover este servidor?')) return;
    try {
      await api.delete(`/api/servers/${id}`);
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  function copyToken(token: string, id: number) {
    navigator.clipboard.writeText(token);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function getInstallCommand(server: any) {
    const token = server.agent_token;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (server.os_type === 'windows') {
      return `Invoke-WebRequest -Uri "${apiUrl}/agent/download/windows" -OutFile dbguard-agent.exe; .\\dbguard-agent.exe --token ${token} --server ${apiUrl}`;
    }
    return `curl -fsSL ${apiUrl}/agent/install.sh | bash -s -- --token ${token} --server ${apiUrl}`;
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servidores</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie os servidores monitorados pelo agente DBGuard</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition">
            <Plus className="w-4 h-4" />
            Novo Servidor
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Cadastrar Novo Servidor</h2>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nome do servidor *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ex: Servidor Principal" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Sistema Operacional *</label>
              <select value={form.os_type} onChange={e => setForm({...form, os_type: e.target.value})} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                {OS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Hostname</label>
              <input value={form.hostname} onChange={e => setForm({...form, hostname: e.target.value})}
                placeholder="Ex: srv-principal.empresa.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Endereço IP</label>
              <input value={form.ip_address} onChange={e => setForm({...form, ip_address: e.target.value})}
                placeholder="Ex: 192.168.1.100"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
                {saving ? 'Cadastrando...' : 'Cadastrar Servidor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de servidores */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500">
          <Server className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum servidor cadastrado</p>
          <p className="text-xs mt-1">Clique em "Novo Servidor" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((srv: any) => (
            <div key={srv.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Server className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{srv.name}</p>
                    <p className="text-gray-500 text-xs">{srv.hostname || srv.ip_address || 'Sem endereço configurado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg(srv.status?.toLowerCase())}`}>
                    {srv.status}
                  </span>
                  <button onClick={() => handleDelete(srv.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Sistema</p>
                  <p className="text-gray-300">{OS_OPTIONS.find(o => o.value === srv.os_type)?.label || srv.os_type}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">IP</p>
                  <p className="text-gray-300">{srv.ip_address || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Agente</p>
                  <p className="text-gray-300">v{srv.agent_version || 'não instalado'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Último contato</p>
                  <p className="text-gray-300">{srv.last_seen_at ? formatDate(srv.last_seen_at) : '—'}</p>
                </div>
              </div>

              {/* Token e comando de instalação */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-400 font-medium">Token do Agente</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-400 bg-gray-950 rounded-lg px-3 py-2 truncate">
                    {srv.agent_token}
                  </code>
                  <button onClick={() => copyToken(srv.agent_token, srv.id)}
                    className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition flex-shrink-0">
                    {copied === srv.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-xs text-gray-400 font-medium">Comando de instalação do agente</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-blue-400 bg-gray-950 rounded-lg px-3 py-2 truncate">
                    {getInstallCommand(srv)}
                  </code>
                  <button onClick={() => copyToken(getInstallCommand(srv), srv.id + 1000)}
                    className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition flex-shrink-0">
                    {copied === srv.id + 1000 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
