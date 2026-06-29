'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', company: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('dbguard_token', res.data.token);
      localStorage.setItem('dbguard_user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/api/auth/register', form);
      setSuccess('Cadastro realizado! Aguarde a aprovação do administrador. Você receberá um email quando sua conta for aprovada.');
      setMode('login');
      setForm({ name: '', email: '', password: '', phone: '', company: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">DBGuard</h1>
          <p className="text-gray-400 mt-1">Gerenciamento de Backups na Nuvem</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
          <button
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Criar Conta
          </button>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {success}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-2.5 transition mt-2">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nome completo</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Seu nome" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="seu@email.com" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" required minLength={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Empresa</label>
                <input type="text" name="company" value={form.company} onChange={handleChange} placeholder="Nome da sua empresa"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Telefone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 00000-0000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-2.5 transition mt-2">
                {loading ? 'Cadastrando...' : 'Criar Conta Grátis'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Após o cadastro, aguarde a aprovação do administrador.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">DBGuard © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
