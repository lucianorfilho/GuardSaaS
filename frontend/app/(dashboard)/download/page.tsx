'use client';

import { useEffect, useState } from 'react';
import { Download, Copy, Check, Terminal, Monitor, Server } from 'lucide-react';
import api from '@/lib/api';

export default function DownloadPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/servers').then(res => {
      setServers(res.data);
      if (res.data.length > 0) setSelectedServer(res.data[0]);
    });
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const token  = selectedServer?.agent_token || 'SEU_TOKEN_AQUI';

  const commands = {
    debian: `curl -fsSL ${apiUrl}/api/agent/download/linux-debian -o install.sh && bash install.sh --token ${token} --server ${apiUrl}`,
    redhat: `curl -fsSL ${apiUrl}/api/agent/download/linux-redhat -o install.sh && bash install.sh --token ${token} --server ${apiUrl}`,
    windows: `Invoke-WebRequest -Uri "${apiUrl}/api/agent/download/windows" -OutFile agent.ps1; .\\agent.ps1 -Token "${token}" -Server "${apiUrl}"`
  };

  const platforms = [
    {
      key: 'debian',
      icon: Terminal,
      title: 'Linux — Debian / Ubuntu',
      description: 'Ubuntu 20.04+, Debian 10+',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      command: commands.debian,
      downloadUrl: `${apiUrl}/api/agent/download/linux-debian`,
      filename: 'dbguard-agent-debian.sh'
    },
    {
      key: 'redhat',
      icon: Server,
      title: 'Linux — RedHat / CentOS / Rocky',
      description: 'RHEL 8+, CentOS 8+, Rocky Linux 8+',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      command: commands.redhat,
      downloadUrl: `${apiUrl}/api/agent/download/linux-redhat`,
      filename: 'dbguard-agent-redhat.sh'
    },
    {
      key: 'windows',
      icon: Monitor,
      title: 'Windows',
      description: 'Windows 10, 11, Server 2019+',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      command: commands.windows,
      downloadUrl: `${apiUrl}/api/agent/download/windows`,
      filename: 'dbguard-agent-windows.ps1'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Download do Agente</h1>
        <p className="text-gray-400 text-sm mt-1">
          Instale o agente DBGuard no servidor que deseja monitorar
        </p>
      </div>

      {/* Selecionar servidor */}
      {servers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Selecione o servidor para obter o token correto
          </label>
          <select
            value={selectedServer?.id || ''}
            onChange={e => setSelectedServer(servers.find(s => s.id === parseInt(e.target.value)))}
            className="w-full md:w-96 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
          >
            {servers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {servers.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-4 py-3 text-sm">
          ⚠️ Cadastre um servidor primeiro em <strong>Servidores</strong> para obter o token de instalação.
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Cadastre o servidor', desc: 'Adicione seu servidor na aba Servidores' },
            { step: '2', title: 'Baixe o agente', desc: 'Escolha a versão para seu sistema operacional' },
            { step: '3', title: 'Instale com 1 comando', desc: 'Execute o comando no seu servidor' },
            { step: '4', title: 'Backups automáticos', desc: 'O agente executará os backups agendados' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plataformas */}
      <div className="space-y-4">
        {platforms.map(platform => (
          <div key={platform.key} className={`bg-gray-900 border rounded-2xl p-5 ${platform.bg}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bg}`}>
                  <platform.icon className={`w-5 h-5 ${platform.color}`} />
                </div>
                <div>
                  <p className="text-white font-semibold">{platform.title}</p>
                  <p className="text-gray-500 text-xs">{platform.description}</p>
                </div>
              </div>
              <a href={platform.downloadUrl} download={platform.filename}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                <Download className="w-4 h-4" />
                Baixar
              </a>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">
                {platform.key === 'windows' ? 'Execute no PowerShell como Administrador:' : 'Execute no terminal como root:'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-green-400 bg-gray-950 rounded-lg px-4 py-3 overflow-x-auto whitespace-nowrap">
                  {platform.command}
                </code>
                <button
                  onClick={() => copy(platform.command, platform.key)}
                  className="p-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                >
                  {copied === platform.key
                    ? <Check className="w-4 h-4 text-green-400" />
                    : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Token atual */}
      {selectedServer && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-3">Token do servidor selecionado</h2>
          <p className="text-gray-400 text-xs mb-2">
            Este token identifica o servidor <strong className="text-white">{selectedServer.name}</strong> na plataforma. Não compartilhe.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-yellow-400 bg-gray-950 rounded-lg px-4 py-3 break-all">
              {selectedServer.agent_token}
            </code>
            <button
              onClick={() => copy(selectedServer.agent_token, 'token')}
              className="p-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
            >
              {copied === 'token' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
