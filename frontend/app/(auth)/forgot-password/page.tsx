'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/password/forgot', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao processar solicitação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 011.52 0C14.51 3.81 17 5 19 5a1 1 0 011 1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">DBGuard</h1>
          <p className="text-gray-400 mt-1">Recuperação de senha</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">Email enviado!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Se o email <strong className="text-white">{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha em alguns minutos.
              </p>
              <p className="text-gray-500 text-xs mb-6">Verifique também a caixa de spam.</p>
              <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm transition">
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Esqueceu sua senha?</h2>
              <p className="text-gray-400 text-sm mb-6">
                Digite seu email cadastrado e enviaremos um link para criar uma nova senha.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-2.5 transition">
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>

              <div className="text-center mt-4">
                <Link href="/login" className="text-gray-500 hover:text-gray-400 text-sm transition">
                  ← Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
