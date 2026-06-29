'use client';

import { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const FREQ_LABEL: Record<string, string> = {
  daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal'
};

const WEEKDAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    server_id: '',
    name: '',
    source_path: '',
    destination: 'local',
    frequency: 'daily',
    weekday: '1',
    monthday: '1',
    hour: '2',
    minute: '0',
    retention_days: '30',
  });

  async function load() {
    setLoading(true);
    try {
      const [schedRes, srvRes] = await Promise.all([
        api.get('/api/schedules'),
        api.get('/api/servers'),
      ]);
      setSchedules(schedRes.data);
      setServers(srvRes.data);
      if (srvRes.data.length > 0) setForm(f => ({ ...f, server_id: srvRes.data[0].id }));
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
      await api.post('/api/schedules', {
        ...form,
        server_id: parseInt(form.server_id),
        hour: parseInt(form.hour),
        minute: parseInt(form.minute),
        retention_days: parseInt(form.retention_days),
        weekday: form.frequency === 'weekly' ? parseInt(form.weekday) : null,
        monthday: form.frequency === 'monthly' ? parseInt(form.monthday) : null,
      });
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar agendamento');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      await api.patch(`/api/schedules/${id}/toggle`);
      await load();
    } catch (err) { console.error(err); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover este agendamento?')) return;
    try {
      await api.delete(`/api/schedules/${id}`);
      await load();
    } catch (err) { console.error(err); }
  }

  function scheduleDescription(sc: any) {
    const time = `${String(sc.hour).padStart(2,'0')}:${String(sc.minute).padStart(2,'0')}`;
    if (sc.frequency === 'daily') return `Todo dia às ${time}`;
    if (sc.frequency === 'weekly') return `Toda ${WEEKDAYS[sc.weekday]} às ${time}`;
    if (sc.frequency === 'monthly') return `Todo dia ${sc.monthday} do mês às ${time}`;
    return time;
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agendamentos</h1>
          <p className="text-gray-400 text-sm mt-1">Configure quando e o que fazer backup</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button onClick={() => setShowForm(!showForm)} disabled={servers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {servers.length === 0 && !loading && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-4 py-3 text-sm">
          ⚠️ Cadastre pelo menos um servidor antes de criar agendamentos.
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Novo Agendamento de Backup</h2>
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nome do agendamento *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ex: Backup diário documentos" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Servidor *</label>
                <select value={form.server_id} onChange={e => setForm({...form, server_id: e.target.value})} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                  {servers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1.5">Diretório a fazer backup *</label>
                <input value={form.source_path} onChange={e => setForm({...form, source_path: e.target.value})}
                  placeholder="Ex: /var/www/html  ou  C:\Sites\projeto" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Frequência *</label>
                <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Destino *</label>
                <select value={form.destination} onChange={e => setForm({...form, destination: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                  <option value="local">☁️ Storage gratuito DBGuard (10GB)</option>
                  <option value="s3">🪣 Amazon S3</option>
                  <option value="backblaze">💾 Backblaze B2</option>
                  <option value="wasabi">🌊 Wasabi</option>
                </select>
              </div>

              {form.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Dia da semana</label>
                  <select value={form.weekday} onChange={e => setForm({...form, weekday: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              {form.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Dia do mês</label>
                  <select value={form.monthday} onChange={e => setForm({...form, monthday: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                    {Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>Dia {d}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Horário de execução *</label>
                <div className="flex gap-2">
                  <select value={form.hour} onChange={e => setForm({...form, hour: e.target.value})}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                    {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{String(i).padStart(2,'0')}h</option>)}
                  </select>
                  <select value={form.minute} onChange={e => setForm({...form, minute: e.target.value})}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                    {[0,15,30,45].map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}min</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Retenção (dias)</label>
                <select value={form.retention_days} onChange={e => setForm({...form, retention_days: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition">
                  <option value="7">7 dias</option>
                  <option value="15">15 dias</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
                {saving ? 'Salvando...' : 'Criar Agendamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500">
          <Clock className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum agendamento criado</p>
          <p className="text-xs mt-1">Crie seu primeiro agendamento de backup</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
          {schedules.map((sc: any) => (
            <div key={sc.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition">
              <div className={`w-2 h-10 rounded-full flex-shrink-0 ${sc.is_active ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-medium">{sc.name}</p>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {FREQ_LABEL[sc.frequency]}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {sc.retention_days}d retenção
                  </span>
                </div>
                <p className="text-gray-400 text-sm truncate">{sc.source_path}</p>
                <p className="text-gray-500 text-xs mt-0.5">{scheduleDescription(sc)} • {sc.server_name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggle(sc.id)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg transition">
                  {sc.is_active
                    ? <ToggleRight className="w-6 h-6 text-green-400" />
                    : <ToggleLeft className="w-6 h-6 text-gray-500" />}
                </button>
                <button onClick={() => handleDelete(sc.id)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
